import Clutter from 'gi://Clutter';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import Shell from 'gi://Shell';
import St from 'gi://St';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';
import {AppMenu} from 'resource:///org/gnome/shell/ui/appMenu.js';
import * as SystemActions from 'resource:///org/gnome/shell/misc/systemActions.js';
import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';

export default class MacPanel extends Extension {
 enable() {
  this._saved=[];
  for (const actor of [Main.panel.statusArea.activities,Main.panel.statusArea.appMenu]) {
   if (actor) {this._saved.push([actor,actor.visible]); actor.hide();}
  }
  this._apple=new PanelMenu.Button(0,'Menu do sistema');
  this._apple.add_child(new St.Icon({gicon:Gio.icon_new_for_string(`${this.path}/assets/apple.svg`),style_class:'mac-panel-apple',icon_size:24}));
  const menu=this._apple.menu;
  menu.actor.add_style_class_name('mac-system-menu');
  const action=(label,fn)=>menu.addAction(label,()=>{
   menu.close(0);
   GLib.idle_add(GLib.PRIORITY_DEFAULT_IDLE,()=>{
    try {fn();} catch(e){console.error(e);Main.notify('Menu do sistema','Não foi possível abrir esta opção.');}
    return GLib.SOURCE_REMOVE;
   });
  });
  action('Sobre este computador',()=>this._launch(['gnome-control-center','info-overview']));
  action('Ajustes do Sistema…',()=>this._launch(['gnome-control-center']));
  menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
  action('Aplicativos',()=>{Main.overview.showApps();});
  action('Buscar…',()=>this._launch(['@@HOME@@/.local/bin/spotlight']));
  action('Arquivos recentes',()=>this._launch(['nautilus','recent:///']));
  menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
  action('Monitor do sistema',()=>this._launch(['gnome-system-monitor']));
  action('Bloquear tela',()=>SystemActions.getDefault().activateLockScreen());
  action('Encerrar sessão…',()=>SystemActions.getDefault().activateLogout());
  action('Suspender',()=>SystemActions.getDefault().activateSuspend());
  action('Reiniciar…',()=>SystemActions.getDefault().activateRestart());
  action('Desligar…',()=>SystemActions.getDefault().activatePowerOff());
  Main.panel.addToStatusArea('mac-system-menu',this._apple,0,'left');

  this._appButton=new PanelMenu.Button(0,'Aplicativo ativo');
  this._label=new St.Label({text:'Mesa',y_align:Clutter.ActorAlign.CENTER,style_class:'mac-panel-app-name'});
  this._appButton.add_child(this._label);
  this._appButton.setMenu(new AppMenu(this._appButton,St.Side.TOP,{showSingleWindows:true}));
  Main.panel.addToStatusArea('mac-active-app',this._appButton,1,'left');
  this._tracker=Shell.WindowTracker.get_default();
  this._focusSignal=this._tracker.connect('notify::focus-app',()=>this._syncApp());
  this._overviewSignal=Main.overview.connect('showing',()=>this._syncApp());
  this._hiddenSignal=Main.overview.connect('hidden',()=>this._syncApp());
  this._syncApp();

  this._clock=Main.panel.statusArea.dateMenu.container;
  this._clockParent=this._clock.get_parent();
  this._clockIndex=this._clockParent.get_children().indexOf(this._clock);
  this._clockParent.remove_child(this._clock);
  Main.panel._rightBox.add_child(this._clock);
  this._modeSignal=Main.sessionMode.connect('updated',()=>this._syncMode());
  this._syncMode();
 }
 _syncMode() {
  const locked=Main.sessionMode.isLocked;
  this._apple.visible=!locked;
  this._appButton.visible=!locked;
  if(locked) {this._apple.menu.close(0);this._appButton.menu.close(0);}
  const target=locked?this._clockParent:Main.panel._rightBox;
  if(this._clock.get_parent()!==target) {
   this._clock.get_parent()?.remove_child(this._clock);
   if(locked)target.insert_child_at_index(this._clock,Math.min(this._clockIndex,target.get_n_children()));
   else target.add_child(this._clock);
  }
 }
 _launch(argv) {Gio.Subprocess.new(argv,Gio.SubprocessFlags.NONE);}
 _syncApp() {
  const app=Main.overview.visible?null:this._tracker.focus_app;
  this._label.text=app?.get_name()??'Mesa';
  this._appButton.menu.setApp(app);
  this._appButton.reactive=Boolean(app);
  this._appButton.can_focus=Boolean(app);
 }
 disable() {
  if(this._modeSignal)Main.sessionMode.disconnect(this._modeSignal);
  this._modeSignal=0;
  for(const button of [this._apple,this._appButton]) {
   if(button?.menu) {
    button.menu.close(0);
    Main.panel.menuManager.removeMenu(button.menu);
    Main.layoutManager.untrackChrome(button.menu.actor);
    button.menu.actor.get_parent()?.remove_child(button.menu.actor);
   }
  }
  if(this._focusSignal)this._tracker.disconnect(this._focusSignal);
  if(this._overviewSignal)Main.overview.disconnect(this._overviewSignal);
  if(this._hiddenSignal)Main.overview.disconnect(this._hiddenSignal);
  this._focusSignal=this._overviewSignal=this._hiddenSignal=0;
  if(this._clock&&this._clockParent) {
   this._clock.get_parent()?.remove_child(this._clock);
   this._clockParent.insert_child_at_index(this._clock,Math.min(this._clockIndex,this._clockParent.get_n_children()));
  }
  this._clock=this._clockParent=null;
  this._appButton?.destroy();this._appButton=null;
  this._apple?.destroy();this._apple=null;
  for(const [actor,visible] of this._saved??[])actor.visible=visible;
  this._saved=[];
 }
}
