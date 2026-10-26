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
        const shell = new St.Widget({name: 'fcc-graphite', layout_manager: new Clutter.BinLayout(), style_class: 'fcc-shell', x_expand: true});
        const glass = new St.Widget({style_class: 'fcc-glass', x_expand: true, y_expand: true});
        this._blur = new Shell.BlurEffect({brightness: 0.80, radius: 32, mode: Shell.BlurMode.BACKGROUND});
        glass.add_effect(this._blur);
        this._glass = glass; this._shell = shell;
        shell.add_child(glass);
        const content = new St.BoxLayout({vertical: true, style_class: 'fcc-content', x_expand: true});
        shell.add_child(content);
        const outer = new St.BoxLayout({vertical: true, style_class: 'fcc-layout'});
        outer.add_child(shell); item.add_child(outer);
        this.menu.addMenuItem(item);
        const top = new St.BoxLayout({style_class: 'fcc-top'});
        content.add_child(top);
        const left = new St.BoxLayout({vertical: true, style_class: 'fcc-left'});
        const right = new St.BoxLayout({vertical: true, style_class: 'fcc-right'});
        top.add_child(left); top.add_child(right);

        const module = new St.BoxLayout({vertical: true, style_class: 'fcc-connectivity'});
        left.add_child(module);
        this._wifi = this._connectionRow('network-wireless-symbolic', 'Wi-Fi', 'Verificando…', () => this._toggleWifi());
        module.add_child(this._wifi.button);
        this._wifi.button.connect('button-press-event', (_actor, event) => {
            if (event.get_button() === 3) { this._settings('wifi'); return Clutter.EVENT_STOP; }
            return Clutter.EVENT_PROPAGATE;
        });
        this._bluetooth = this._connectionRow('bluetooth-active-symbolic', 'Bluetooth', 'Desativado', () => this._toggleBluetooth());
        module.add_child(this._bluetooth.button);
        this._bluetooth.button.connect('button-press-event', (_actor, event) => {
            if (event.get_button() === 3) { this._settings('bluetooth'); return Clutter.EVENT_STOP; }
            return Clutter.EVENT_PROPAGATE;
        });
        this._send = this._connectionRow('document-send-symbolic', 'LocalSend', 'Enviar arquivos', () => this._launch([GLib.get_home_dir() + '/.local/share/localsend-native/localsend_app']));
        module.add_child(this._send.button);
        this._send.circle.add_style_class_name('fcc-send-brand');
        const sendIcon = Gio.File.new_for_path(GLib.get_home_dir() + '/.local/share/localsend-native/data/flutter_assets/assets/img/logo-128.png');
        if (sendIcon.query_exists(null)) this._send.icon.gicon = Gio.icon_new_for_string(sendIcon.get_path());
        this._focus = this._tile('weather-clear-night-symbolic', 'Foco', '', () => {
            this._notifySettings.set_boolean('show-banners', !this._notifySettings.get_boolean('show-banners')); this._sync();
        });
        this._focus.button.add_style_class_name('fcc-focus');
        this._focus.button.child.vertical = false;
        this._focus.button.child.x_align = Clutter.ActorAlign.START;
        right.add_child(this._focus.button);
        const views = new St.BoxLayout({style_class: 'fcc-views'}); right.add_child(views);
        views.add_child(this._smallTile('window-new-symbolic', 'Janelas', () => { this.menu.close(); Main.overview.toggle(); }));
        views.add_child(this._smallTile('video-display-symbolic', 'Tela', () => this._settings('display')));

        this._media = new St.BoxLayout({vertical: true, style_class: 'fcc-media'});
        const mediaHeader = new St.BoxLayout({style_class: 'fcc-media-header'});
        this._media.add_child(mediaHeader);
        this._cover = new St.Icon({icon_name: 'audio-x-generic-symbolic', icon_size: 36, style_class: 'fcc-cover', y_align: Clutter.ActorAlign.CENTER});
        const coverTile = new St.Bin({style_class: 'fcc-cover-tile', child: this._cover});
        mediaHeader.add_child(coverTile);
        const mediaText = new St.BoxLayout({vertical: true, style_class: 'fcc-media-text', x_expand: true, y_align: Clutter.ActorAlign.CENTER});
        this._title = this._label('Sem reprodução', 'fcc-track');
        this._artist = this._label('Abra seu player', 'fcc-artist');
        mediaText.add_child(this._title); mediaText.add_child(this._artist); mediaHeader.add_child(mediaText);
        const playback = new St.BoxLayout({style_class: 'fcc-playback', x_align: Clutter.ActorAlign.CENTER});
        this._media.add_child(playback);
        this._previous = this._mediaButton('media-skip-backward-symbolic', 'Anterior', () => this._player?.previous());
        this._play = this._mediaButton('media-playback-start-symbolic', 'Reproduzir ou pausar', () => this._player?.playPause());
        this._next = this._mediaButton('media-skip-forward-symbolic', 'Próxima', () => this._player?.next());
        for (const child of [this._previous, this._play, this._next]) playback.add_child(child);
        this._play.add_style_class_name('fcc-play-main');
        content.add_child(this._media);

        const quick = Main.panel.statusArea.quickSettings;
        const sliders = new St.BoxLayout({vertical: true, style_class: 'fcc-sliders-module'});
        content.add_child(sliders);
        sliders.add_child(this._sliderCard('Brilho', 'display-brightness-symbolic', quick?._brightness?.quickSettingsItems?.[0]));
        sliders.add_child(this._sliderCard('Som', 'audio-volume-high-symbolic', quick?._volumeOutput?._output));
        const shortcuts = new St.BoxLayout({style_class: 'fcc-shortcuts'}); sliders.add_child(shortcuts);
        this._appearance = this._circle('night-light-symbolic', 'Luz noturna · botão direito para ajustar o horário', () => {
            const enabled = this._colorSettings.get_boolean('night-light-enabled');
            this._colorSettings.set_boolean('night-light-enabled', !enabled);
            this._sync();
        });
        this._appearance.connect('button-press-event', (_actor, event) => {
            if (event.get_button() === 3) { this._settings('display'); return Clutter.EVENT_STOP; }
            return Clutter.EVENT_PROPAGATE;
        });
        shortcuts.add_child(this._appearance);
        shortcuts.add_child(this._circle('accessories-calculator-symbolic', 'Calculadora', () => this._launch(['gnome-calculator'])));
        shortcuts.add_child(this._circle('camera-photo-symbolic', 'Captura de tela', () => { this.menu.close(); Main.screenshotUI.open(); }));
        shortcuts.add_child(this._circle('emblem-system-symbolic', 'Configurações do sistema', () => this._launch(['gnome-control-center'])));
        const footer = new St.BoxLayout({name: 'fcc-footer', style_class: 'fcc-footer'}); outer.add_child(footer);
        footer.add_child(new St.Widget({x_expand: true}));
        const lock = this._mediaButton('system-lock-screen-symbolic', 'Bloquear tela', () => { this.menu.close(); Main.screenShield.lock(true); });
        footer.add_child(this._mediaButton('view-more-horizontal-symbolic', 'Abrir os controles nativos do GNOME', () => {
            this.menu.close(); this._openNative?.();
        }));
        footer.add_child(lock);
        this._powerOptions = new St.BoxLayout({name: 'fcc-power-menu', vertical: true, style_class: 'fcc-power-options', visible: false});
        footer.add_child(this._mediaButton('system-shutdown-symbolic', 'Sessão e energia: encerrar sessão, suspender, reiniciar ou desligar', () => {
            this._powerOptions.visible = !this._powerOptions.visible;
            shell.visible = !this._powerOptions.visible;
        }));
        outer.insert_child_at_index(this._powerOptions, 1);
        for (const [label, action] of [
            ['Encerrar sessão…', () => SystemActions.getDefault().activateLogout()],
            ['Suspender', () => SystemActions.getDefault().activateSuspend()],
            ['Reiniciar…', () => SystemActions.getDefault().activateRestart()],
            ['Desligar…', () => SystemActions.getDefault().activatePowerOff()],
        ]) {
            const button = new St.Button({label, style_class: 'fcc-power-option', can_focus: true, x_expand: true});
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
    _tile(iconName, title, subtitle, callback) {
        const button = new St.Button({style_class: 'fcc-tile', can_focus: true, reactive: true, x_expand: true, accessible_name: title});
        const row = new St.BoxLayout({style_class: 'fcc-tile-row'});
        const icon = new St.Icon({icon_name: iconName, icon_size: 20, style_class: 'fcc-tile-icon'});
        row.add_child(icon);
        const labels = new St.BoxLayout({vertical: true, y_align: Clutter.ActorAlign.CENTER, x_expand: true});
        const heading = this._label(title, 'fcc-tile-title');
        const detail = this._label(subtitle, 'fcc-tile-subtitle');
        labels.add_child(heading); labels.add_child(detail); row.add_child(labels);
        button.set_child(row); button.connect('clicked', callback);
        return {button, icon, heading, detail};
    }
    _connectionRow(iconName, title, subtitle, callback) {
        const row = this._tile(iconName, title, subtitle, callback);
        row.button.set_style_class_name('fcc-connection-row');
        const children = row.button.child;
        children.remove_child(row.icon);
        const circle = new St.Bin({style_class: 'fcc-connection-icon', child: row.icon, y_align: Clutter.ActorAlign.CENTER});
        children.insert_child_at_index(circle, 0);
        row.circle = circle;
        return row;
    }
    _smallTile(iconName, title, callback) {
        const button = new St.Button({style_class: 'fcc-small-tile', can_focus: true, accessible_name: title, x_expand: true});
        const box = new St.BoxLayout({vertical: true, x_align: Clutter.ActorAlign.CENTER, y_align: Clutter.ActorAlign.CENTER, style_class: 'fcc-small-content'});
        box.add_child(new St.Icon({icon_name: iconName, icon_size: 20}));
        box.add_child(new St.Label({text: title, style_class: 'fcc-small-label'}));
        button.set_child(box); button.connect('clicked', callback);
        return button;
    }
    _circle(iconName, tooltip, callback) {
        const button = new St.Button({style_class: 'fcc-circle', reactive: true, can_focus: true, accessible_name: tooltip});
        button.set_child(new St.Icon({icon_name: iconName, icon_size: 22}));
        button.connect('clicked', callback); return button;
    }
    _mediaButton(iconName, tooltip, callback) {
        const button = new St.Button({style_class: 'fcc-media-button', can_focus: true, reactive: true, accessible_name: tooltip});
        button.set_child(new St.Icon({icon_name: iconName, icon_size: 17}));
        button.connect('clicked', callback); return button;
    }
    _connect(object, signal, callback) {
        const id = object.connect(signal, callback); this._connections.push([object, id]); return id;
    }
    _sliderCard(title, iconName, source) {
        const card = new St.BoxLayout({vertical: true, style_class: 'fcc-slider-card'});
        const heading = new St.BoxLayout({style_class: 'fcc-slider-heading'});
        heading.add_child(new St.Label({text: title, style_class: 'fcc-slider-title', x_expand: true}));
        card.add_child(heading);
        const pill = new St.Widget({layout_manager: new Clutter.BinLayout(), style_class: 'fcc-slider-pill', x_expand: true});
        const slider = new Slider.Slider(0); slider.x_expand = true; slider.accessible_name = title;
        slider.add_style_class_name('fcc-slider');
        if (title === 'Som') { slider.add_style_class_name('fcc-slider-volume'); card.add_style_class_name('fcc-volume-card'); }
        pill.add_child(slider);
        const icon = new St.Icon({icon_name: iconName, icon_size: 16, style_class: 'fcc-slider-icon', reactive: false,
            x_align: Clutter.ActorAlign.START, y_align: Clutter.ActorAlign.CENTER});
        const overlay = new St.BoxLayout({x_expand: true, y_expand: true, reactive: false});
        overlay.add_child(icon); pill.add_child(overlay); card.add_child(pill);
        const syncIcon = () => {
            // Keep the glyph readable on both the white fill and the dark track.
            if (title !== 'Som' && slider.value >= 0.13) icon.add_style_class_name('on-fill');
            else icon.remove_style_class_name('on-fill');
        };
        slider.connect('notify::value', syncIcon); syncIcon();
        card._fccSlider = slider;
        const original = source?.slider;
        if (original) {
            let updating = false;
            const refresh = () => {
                updating = true; slider.value = clamp(original.value); updating = false;
                slider.reactive = source.visible;
                card.opacity = source.visible ? 255 : 115;
            };
            refresh();
            this._connect(original, 'notify::value', refresh);
            this._connect(source, 'notify::visible', refresh);
            slider.connect('notify::value', () => {
                if (!updating) original.value = clamp(slider.value);
            });
        } else { slider.reactive = false; card.opacity = 115; slider.accessible_name = `${title}: indisponível`; }
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
        this._wifi.icon.icon_name = wifi?.icon_name || 'network-wireless-symbolic';
        const bluetooth = quick?._bluetooth?.quickSettingsItems?.[0];
        this._active(this._bluetooth.button, Boolean(bluetooth?.checked));
        this._bluetooth.detail.text = bluetooth?.subtitle || (bluetooth?.checked ? 'Ativado' : 'Desativado');
        this._bluetooth.button.accessible_name = `Bluetooth: ${this._bluetooth.detail.text}`;
        const focus = !this._notifySettings.get_boolean('show-banners');
        this._active(this._focus.button, focus); this._focus.detail.text = focus ? 'Ativado' : 'Desativado';
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
        this._play.child.icon_name = player?.status === 'Playing' ? 'media-playback-pause-symbolic' : 'media-playback-start-symbolic';
        this._play.reactive = Boolean(player);
        this._previous.reactive = Boolean(player?.canGoPrevious);
        this._next.reactive = Boolean(player?.canGoNext);
        const art = player?.trackCoverUrl || '';
        if (this._art !== art) {
            this._art = art;
            try {
                this._cover.gicon = art ? Gio.Icon.new_for_string(art) : null;
                if (!art) this._cover.icon_name = 'audio-x-generic-symbolic';
            } catch { this._cover.icon_name = 'audio-x-generic-symbolic'; }
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
