import Clutter from 'gi://Clutter';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import GObject from 'gi://GObject';
import Pango from 'gi://Pango';
import Shell from 'gi://Shell';
import St from 'gi://St';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as SystemActions from 'resource:///org/gnome/shell/misc/systemActions.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';
import * as Slider from 'resource:///org/gnome/shell/ui/slider.js';
import {PopupAnimation} from 'resource:///org/gnome/shell/ui/boxpointer.js';
import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';

const clamp = value => Math.max(0, Math.min(1, Number(value) || 0));
const Center = GObject.registerClass(class Center extends PanelMenu.Button {
    _init(iconPath) {
        super._init(0.0, 'Central de Controle');
        this._connections = [];
        this._shutdownId = global.connect('shutdown', () => this._cleanup());
        this.connect('destroy', () => this._cleanup());
        this._notifySettings = new Gio.Settings({schema_id: 'org.gnome.desktop.notifications'});
        this._interfaceSettings = new Gio.Settings({schema_id: 'org.gnome.desktop.interface'});
        this._colorSettings = new Gio.Settings({schema_id: 'org.gnome.settings-daemon.plugins.color'});
        this.add_child(new St.Icon({gicon: Gio.icon_new_for_string(iconPath), style_class: 'system-status-icon'}));
        this.menu.box.add_style_class_name('fcc-popup');
        this.menu.box.name = 'fcc-popup-content';
        this.menu.actor.add_style_class_name('fcc-popup-frame');
        const item = new PopupMenu.PopupBaseMenuItem({reactive: false, can_focus: false, style_class: 'fcc-wrapper'});
        const shell = new St.Widget({name: 'cc5-root', layout_manager: new Clutter.BinLayout(), style_class: 'cc5-shell', x_expand: true});
        const glass = new St.Widget({style_class: 'cc5-glass', x_expand: true, y_expand: true});
        this._blur = new Shell.BlurEffect({brightness: 0.80, radius: 32, mode: Shell.BlurMode.BACKGROUND});
        glass.add_effect(this._blur);
        this._glass = glass; this._shell = shell;
        shell.add_child(glass);
        const content = new St.BoxLayout({vertical: true, style_class: 'cc5-content', x_expand: true});
        shell.add_child(content);
        const outer = new St.BoxLayout({vertical: true, style_class: 'cc5-layout'});
        outer.add_child(shell); item.add_child(outer);
        this.menu.addMenuItem(item);
        this._assetsPath = Gio.File.new_for_path(iconPath).get_parent().get_path();
        this._alignmentChecks = [];
        const top = new St.BoxLayout({style_class: 'cc5-top'}); content.add_child(top);
        const network = new St.BoxLayout({vertical: true, style_class: 'cc5-network'}); top.add_child(network);
        const right = new St.BoxLayout({vertical: true, style_class: 'cc5-right'}); top.add_child(right);
        this._wifi = this._connectionRow('wifi', 'Wi-Fi', 'Desativado', () => this._toggleWifi());
        this._bluetooth = this._connectionRow('bluetooth', 'Bluetooth', 'Desativado', () => this._toggleBluetooth());
        this._send = this._connectionRow('localsend', 'LocalSend', 'Enviar arquivos', () => this._launch([GLib.get_home_dir() + '/.local/share/localsend-native/localsend_app']));
        for (const row of [this._wifi, this._bluetooth, this._send]) network.add_child(row.button);
        this._send.circle.add_style_class_name('cc5-localsend-disc');
        this._wifi.button.connect('button-press-event', (_actor,event) => {
            if(event.get_button()===3){this._settings('wifi');return Clutter.EVENT_STOP;} return Clutter.EVENT_PROPAGATE;
        });
        this._bluetooth.button.connect('button-press-event', (_actor,event) => {
            if(event.get_button()===3){this._settings('bluetooth');return Clutter.EVENT_STOP;} return Clutter.EVENT_PROPAGATE;
        });
        this._focus = this._focusCard(); right.add_child(this._focus.button);
        const views = new St.BoxLayout({style_class: 'cc5-views'}); right.add_child(views);
        views.add_child(this._smallTile('windows','Janelas',()=>{this.menu.close();Main.overview.toggle();}));
        views.add_child(this._smallTile('display','Tela',()=>this._settings('display')));

        this._media = new St.BoxLayout({vertical:true,style_class:'cc5-media'}); content.add_child(this._media);
        const mediaHeader = new St.BoxLayout({style_class:'cc5-media-header'});this._media.add_child(mediaHeader);
        this._cover = new St.Icon({gicon:this._gicon('music'),icon_size:36,x_align:Clutter.ActorAlign.CENTER,y_align:Clutter.ActorAlign.CENTER});
        const cover = new St.Bin({style_class:'cc5-cover',child:this._cover});mediaHeader.add_child(cover);
        this._alignmentChecks.push([this._cover,cover]);
        const text = new St.BoxLayout({vertical:true,style_class:'cc5-media-text',x_expand:true,y_align:Clutter.ActorAlign.CENTER});
        this._title=this._label('Sem reprodução','cc5-track');this._artist=this._label('Abra seu player','cc5-artist');
        text.add_child(this._title);text.add_child(this._artist);mediaHeader.add_child(text);
        const playback=new St.BoxLayout({style_class:'cc5-playback',x_align:Clutter.ActorAlign.CENTER});this._media.add_child(playback);
        this._previous=this._iconButton('previous','Anterior',()=>this._player?.previous(),'cc5-media-button',23);
        this._play=this._iconButton('play','Reproduzir ou pausar',()=>this._player?.playPause(),'cc5-media-button',27);
        this._next=this._iconButton('next','Próxima',()=>this._player?.next(),'cc5-media-button',23);
        for(const button of [this._previous,this._play,this._next])playback.add_child(button);

        const quick=Main.panel.statusArea.quickSettings;
        const sliders=new St.BoxLayout({vertical:true,style_class:'cc5-sliders'});content.add_child(sliders);
        sliders.add_child(this._sliderCard('Brilho','sun',quick?._brightness?.quickSettingsItems?.[0]));
        sliders.add_child(this._sliderCard('Som','speaker',quick?._volumeOutput?._output));
        const shortcuts=new St.BoxLayout({style_class:'cc5-shortcuts'});sliders.add_child(shortcuts);
        this._appearance=this._iconButton('sun','Luz noturna · botão direito para ajustar',()=>{
            this._colorSettings.set_boolean('night-light-enabled',!this._colorSettings.get_boolean('night-light-enabled'));this._sync();
        },'cc5-shortcut',27);
        this._appearance.connect('button-press-event',(_actor,event)=>{
            if(event.get_button()===3){this._settings('display');return Clutter.EVENT_STOP;}return Clutter.EVENT_PROPAGATE;
        });
        shortcuts.add_child(this._appearance);
        shortcuts.add_child(this._iconButton('calculator','Calculadora',()=>this._launch(['gnome-calculator']),'cc5-shortcut',26));
        shortcuts.add_child(this._iconButton('camera','Captura de tela',()=>{this.menu.close();Main.screenshotUI.open();},'cc5-shortcut',26));
        shortcuts.add_child(this._iconButton('settings','Configurações',()=>this._launch(['gnome-control-center']),'cc5-shortcut',27));

        const footer=new St.BoxLayout({name:'cc5-footer',style_class:'cc5-footer'});outer.add_child(footer);
        footer.add_child(new St.Widget({x_expand:true}));
        footer.add_child(this._iconButton('more','Controles nativos do GNOME',()=>{this.menu.close();this._openNative?.();},'cc5-footer-button',23));
        footer.add_child(this._iconButton('lock','Bloquear tela',()=>{this.menu.close();Main.screenShield.lock(true);},'cc5-footer-button',23));
        this._powerOptions=new St.BoxLayout({name:'cc5-power-menu',vertical:true,visible:false});outer.insert_child_at_index(this._powerOptions,1);
        footer.add_child(this._iconButton('power','Opções de sessão e energia',()=>{
            this._powerOptions.visible=!this._powerOptions.visible;shell.visible=!this._powerOptions.visible;
        },'cc5-footer-button',25));
        for (const [label, action] of [
            ['Encerrar sessão…', () => SystemActions.getDefault().activateLogout()],
            ['Suspender', () => SystemActions.getDefault().activateSuspend()],
            ['Reiniciar…', () => SystemActions.getDefault().activateRestart()],
            ['Desligar…', () => SystemActions.getDefault().activatePowerOff()],
        ]) {
            const button = new St.Button({label, style_class: 'cc5-power-option', can_focus: true, x_expand: true});
            button.connect('clicked', () => {
                this.menu.close(PopupAnimation.NONE);
                this._powerOptions.hide(); shell.show();
                GLib.idle_add(GLib.PRIORITY_DEFAULT_IDLE, () => {
                    try { action(); }
                    catch (error) { console.error(error); Main.notify('Sessão e energia', 'Não foi possível executar a ação. Verifique se o sistema está respondendo.'); }
                    return GLib.SOURCE_REMOVE;
                });
            });
            this._powerOptions.add_child(button);
        }
        this._connect(this._colorSettings, 'changed::night-light-enabled', () => this._sync());
        this._connect(this._notifySettings, 'changed::show-banners', () => this._sync());
        this._connect(this._interfaceSettings, 'changed::color-scheme', () => this._sync());
        this.menu.connect('open-state-changed', (_menu, open) => { if (open) { this._sync(); this._ensureBackdrop(); } });
        this._timer = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, 1, () => {
            if (this.menu.isOpen) this._sync();
            return GLib.SOURCE_CONTINUE;
        });
        this._sync();
    }

    async _ensureBackdrop() {
        if (this._disposed || this._backdrop || this._installingBackdrop) return;
        const bms = global.blur_my_shell;
        if (!bms?._effects_manager || !bms?._pipelines_manager) return;
        this._installingBackdrop = true;
        try {
            const uri = Gio.File.new_for_path(`${bms.path}/render/dynamic_surface.js`).get_uri();
            const [{DynamicPipeline}, {EffectsManager}, {PipelinesManager}, {Connections}, {Settings}, {KEYS}] = await Promise.all([
                import(uri), import(`${bms.dir.get_uri()}/pipelines/effects_manager.js`),
                import(`${bms.dir.get_uri()}/pipelines/pipelines_manager.js`),
                import(`${bms.dir.get_uri()}/conveniences/connections.js`),
                import(`${bms.dir.get_uri()}/settings/settings.js`),
                import(`${bms.dir.get_uri()}/settings/keys.js`),
            ]);
            if (this._disposed || global.blur_my_shell !== bms) return;
            // Own these resources: disabling Blur My Shell must not dispose our effects.
            this._blurConnections = new Connections();
            this._blurSettings = new Settings(KEYS, bms.getSettings());
            this._blurEffects = new EffectsManager(this._blurConnections);
            this._blurPipelines = new PipelinesManager(this._blurSettings);
            this._backdrop = new DynamicPipeline(this._blurEffects, this._blurPipelines,
                'pipeline_default', {corner_radius: 26});
            this._backdrop.attach_to_container(this._shell, 'fcc-frosted-backdrop').opacity = 180;
            this._glass.remove_effect(this._blur);
        } catch (error) {
            this._backdrop?.destroy(); this._backdrop = null;
            console.warn(`Frosted Control Center: backdrop fallback: ${error.message}`);
        } finally { this._installingBackdrop = false; }
    }

    _label(text, style) {
        const label = new St.Label({text, style_class: style, x_expand: true});
        label.clutter_text.ellipsize = Pango.EllipsizeMode.END;
        return label;
    }
    _gicon(name) { return Gio.icon_new_for_string(`${this._assetsPath}/${name}.svg`); }
    _icon(name,size=24) {
        return new St.Icon({gicon:this._gicon(name),icon_size:size,
            x_align:Clutter.ActorAlign.CENTER,y_align:Clutter.ActorAlign.CENTER,
            x_expand:false,y_expand:false,reactive:false});
    }
    _disc(name,size=23) {
        const icon=this._icon(name,size);
        const disc=new St.Bin({style_class:'cc5-disc',child:icon,y_align:Clutter.ActorAlign.CENTER});
        this._alignmentChecks.push([icon,disc]);return {disc,icon};
    }
    _connectionRow(name,title,subtitle,callback) {
        const button=new St.Button({style_class:'cc5-connection',can_focus:true,reactive:true,x_expand:true,accessible_name:title});
        const row=new St.BoxLayout({style_class:'cc5-connection-content',x_expand:true,y_align:Clutter.ActorAlign.CENTER});
        const {disc,icon}=this._disc(name);row.add_child(disc);
        const labels=new St.BoxLayout({vertical:true,x_expand:true,y_align:Clutter.ActorAlign.CENTER,style_class:'cc5-row-labels'});
        const heading=this._label(title,'cc5-row-title');const detail=this._label(subtitle,'cc5-row-subtitle');
        labels.add_child(heading);labels.add_child(detail);row.add_child(labels);
        button.set_child(row);button.connect('clicked',callback);return {button,icon,circle:disc,heading,detail};
    }
    _focusCard() {
        const button=new St.Button({style_class:'cc5-focus',can_focus:true,x_expand:true,accessible_name:'Foco'});
        const row=new St.BoxLayout({style_class:'cc5-focus-content',x_align:Clutter.ActorAlign.CENTER,y_align:Clutter.ActorAlign.CENTER});
        const {disc,icon}=this._disc('moon',26);disc.add_style_class_name('cc5-focus-disc');row.add_child(disc);
        const heading=new St.Label({text:'Foco',style_class:'cc5-focus-label',y_align:Clutter.ActorAlign.CENTER});row.add_child(heading);
        button.set_child(row);button.connect('clicked',()=>{
            this._notifySettings.set_boolean('show-banners',!this._notifySettings.get_boolean('show-banners'));this._sync();
        });
        // Retain state text for accessibility without adding a subtitle absent in the reference.
        const detail={text:''};return {button,icon,heading,detail};
    }
    _smallTile(name,title,callback) {
        const button=new St.Button({style_class:'cc5-small',can_focus:true,accessible_name:title});
        const stack=new St.BoxLayout({vertical:true,style_class:'cc5-small-content',x_align:Clutter.ActorAlign.CENTER,y_align:Clutter.ActorAlign.CENTER});
        const icon=this._icon(name,28);stack.add_child(icon);
        stack.add_child(new St.Label({text:title,style_class:'cc5-small-label',x_align:Clutter.ActorAlign.CENTER}));
        button.set_child(stack);button.connect('clicked',callback);
        this._alignmentChecks.push([icon,button,'horizontal']);return button;
    }
    _iconButton(name,title,callback,style,size=24) {
        const button=new St.Button({style_class:style,can_focus:true,reactive:true,accessible_name:title});
        const icon=this._icon(name,size);button.set_child(icon);button.connect('clicked',callback);
        if(name==='more')button.add_style_class_name('cc5-more');
        button._glyph=icon;this._alignmentChecks.push([icon,button]);return button;
    }
    _connect(object, signal, callback) {
        const id = object.connect(signal, callback); this._connections.push([object, id]); return id;
    }
    _sliderCard(title,name,source) {
        const card=new St.BoxLayout({vertical:true,style_class:'cc5-slider-card'});
        card.add_child(new St.Label({text:title,style_class:'cc5-slider-label'}));
        const pill=new St.Widget({layout_manager:new Clutter.BinLayout(),style_class:'cc5-pill',x_expand:true});
        const slider=new Slider.Slider(0);slider.x_expand=true;slider.accessible_name=title;slider.add_style_class_name('cc5-slider');
        const volume=title==='Som';if(volume)slider.add_style_class_name('cc5-volume');pill.add_child(slider);
        const overlay=new St.BoxLayout({x_expand:true,y_expand:true,reactive:false,style_class:'cc5-slider-overlay'});
        const icon=this._icon(name,19);icon.add_style_class_name('cc5-slider-glyph');overlay.add_child(icon);pill.add_child(overlay);card.add_child(pill);
        const syncIcon=()=>{
            icon.gicon=this._gicon(!volume && slider.value>0.12 ? 'sun-dark' : name);
        };slider.connect('notify::value',syncIcon);syncIcon();card._fccSlider=slider;
        const original=source?.slider;
        if(original){
            let updating=false;
            const refresh=()=>{updating=true;slider.value=clamp(original.value);updating=false;
                slider.reactive=source.visible;slider.can_focus=source.visible;card.opacity=source.visible?255:115;};
            refresh();this._connect(original,'notify::value',refresh);this._connect(source,'notify::visible',refresh);
            slider.connect('notify::value',()=>{if(!updating)original.value=clamp(slider.value);});
        }else{slider.reactive=false;slider.can_focus=false;card.opacity=115;slider.accessible_name=`${title}: indisponível`;}
        return card;
    }
    _active(actor, value) { if (value) actor.add_style_pseudo_class('active'); else actor.remove_style_pseudo_class('active'); }
    _settings(panel) { this._launch(['gnome-control-center', panel]); }
    _launch(argv) {
        this.menu.close();
        try { Gio.Subprocess.new(argv, Gio.SubprocessFlags.NONE); }
        catch (error) { Main.notify('Central de Controle', `Não foi possível abrir: ${argv[0]}`); console.error(error); }
    }
    _toggleWifi() {
        const toggle = Main.panel.statusArea.quickSettings?._network?._wirelessToggle;
        if (toggle) { toggle.emit('clicked', 1); this._sync(); }
        else this._settings('wifi');
    }
    _toggleBluetooth() {
        const toggle = Main.panel.statusArea.quickSettings?._bluetooth?.quickSettingsItems?.[0];
        if (toggle) { toggle.emit('clicked', 1); this._sync(); }
        else this._settings('bluetooth');
    }
    _sync() {
        const quick = Main.panel.statusArea.quickSettings;
        const wifi = quick?._network?._wirelessToggle;
        this._wifi.detail.text = wifi?.subtitle || (wifi?.checked ? 'Conectado' : 'Desativado');
        this._active(this._wifi.button, Boolean(wifi?.checked));
        this._wifi.button.accessible_name = `Wi-Fi: ${this._wifi.detail.text}`;
        this._wifi.icon.gicon = this._gicon('wifi');
        const bluetooth = quick?._bluetooth?.quickSettingsItems?.[0];
        this._active(this._bluetooth.button, Boolean(bluetooth?.checked));
        this._bluetooth.detail.text = bluetooth?.subtitle || (bluetooth?.checked ? 'Ativado' : 'Desativado');
        this._bluetooth.button.accessible_name = `Bluetooth: ${this._bluetooth.detail.text}`;
        const focus = !this._notifySettings.get_boolean('show-banners');
        this._active(this._focus.button, focus); this._focus.detail.text = focus ? 'Ativado' : 'Desativado';
        this._focus.button.accessible_name = `Foco: ${this._focus.detail.text}`;
        this._active(this._appearance, this._colorSettings.get_boolean('night-light-enabled'));
        this._syncMedia();
    }
    _syncMedia() {
        const section = Main.panel.statusArea.dateMenu?._messageList?._mediaSection;
        const players = [...(section?._players?.values() ?? [])];
        const player = players.find(p => p.status === 'Playing') || players[0] || null;
        this._player = player;
        this._title.text = player?.trackTitle || 'Sem reprodução';
        this._artist.text = player?.trackArtists?.join(', ') || (player ? 'Player de mídia' : 'Abra seu player');
        this._play._glyph.gicon = this._gicon(player?.status === 'Playing' ? 'pause' : 'play');
        this._play.reactive = Boolean(player);
        this._previous.reactive = Boolean(player?.canGoPrevious);
        this._next.reactive = Boolean(player?.canGoNext);
        const art = player?.trackCoverUrl || '';
        if (this._art !== art) {
            this._art = art;
            try {
                this._cover.gicon = art ? Gio.Icon.new_for_string(art) : null;
                if (!art) this._cover.gicon = this._gicon('music');
            } catch { this._cover.gicon = this._gicon('music'); }
        }
    }
    _cleanup() {
        if (this._disposed) return;
        this._disposed = true;
        if (this._shutdownId) { global.disconnect(this._shutdownId); this._shutdownId = 0; }
        this._backdrop?.destroy(); this._backdrop = null;
        this._blurEffects?.destroy_all(); this._blurEffects = null;
        this._blurPipelines?.destroy(); this._blurPipelines = null;
        this._blurSettings?.disconnect_all_settings(); this._blurSettings = null;
        this._blurConnections?.disconnect_all(); this._blurConnections = null;
        if (this._timer) { GLib.source_remove(this._timer); this._timer = 0; }
        for (const [object, id] of this._connections ?? []) {
            try { if (GObject.signal_handler_is_connected(object, id)) object.disconnect(id); }
            catch { /* actor already destroyed */ }
        }
        this._connections = [];
    }
    destroy() { this._cleanup(); super.destroy(); }
});

export default class FrostedControlCenter extends Extension {
    enable() {
        this._attempts = 0;
        const ready = () => {
            const quick = Main.panel.statusArea.quickSettings;
            return Boolean(quick?._brightness?.quickSettingsItems?.[0]?.slider && quick?._volumeOutput?._output?.slider);
        };
        if (ready()) this._install();
        else this._wait = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 100, () => {
            if (!ready() && ++this._attempts < 100) return GLib.SOURCE_CONTINUE;
            this._wait = 0; this._install(); return GLib.SOURCE_REMOVE;
        });
    }
    _install() {
        this._button = new Center(`${this.path}/assets/control-center-symbolic.svg`);
        Main.panel.addToStatusArea(this.uuid, this._button, 0, 'right');
        // The existing status indicators remain available as a native fallback.
        // Hide only the duplicate control-center glyph inserted by Minimal Status.
        this._duplicates = [];
        const quick = Main.panel.statusArea.quickSettings;
        this._quick = quick;
        const box = Main.panel._rightBox;
        if (quick.container.get_parent() === box)
            box.set_child_above_sibling(this._button.container, quick.container);
        this._button._openNative = () => { this._nativeRequested = true; quick.menu.open(PopupAnimation.NONE); };
        this._nativeOpen = quick.menu.connect('open-state-changed', (_menu, open) => {
            if (!open) return;
            if (this._nativeRequested) { this._nativeRequested = false; return; }
            quick.menu.close(PopupAnimation.NONE); this._button.menu.open(PopupAnimation.NONE);
        });
        this._capture = quick.connect('captured-event', (_actor, event) => {
            const type = event.type();
            if (type === Clutter.EventType.BUTTON_PRESS && event.get_button() === 1) {
                quick.menu.close(); this._button.menu.toggle(); return Clutter.EVENT_STOP;
            }
            if (type === Clutter.EventType.BUTTON_RELEASE && event.get_button() === 1)
                return Clutter.EVENT_STOP;
            if (type === Clutter.EventType.KEY_PRESS && [Clutter.KEY_space, Clutter.KEY_Return].includes(event.get_key_symbol())) {
                quick.menu.close(); this._button.menu.toggle(); return Clutter.EVENT_STOP;
            }
            return Clutter.EVENT_PROPAGATE;
        });
        for (const actor of quick?._indicators?.get_children() ?? []) {
            if (actor instanceof St.Icon && actor.icon_name === 'preferences-system-symbolic') {
                this._duplicates.push([actor, actor.visible]); actor.hide();
            }
        }
    }
    disable() {
        if (this._wait) { GLib.source_remove(this._wait); this._wait = 0; }
        if (this._nativeOpen) { this._quick.menu.disconnect(this._nativeOpen); this._nativeOpen = 0; }
        this._nativeRequested = false;
        if (this._capture) { this._quick.disconnect(this._capture); this._capture = 0; }
        this._quick = null;
        this._button?.destroy(); this._button = null;
        for (const [actor, visible] of this._duplicates ?? []) { try { actor.visible = visible; } catch { /* stale actor */ } }
        this._duplicates = [];
    }
}
