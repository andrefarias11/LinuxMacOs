import GLib from 'gi://GLib';
import Clutter from 'gi://Clutter';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';
export default class MacRefinements extends Extension {
 enable() {
  this._banner=Main.messageTray._bannerBin;
  this._bannerAlign=this._banner.x_align;
  this._banner.x_align=Clutter.ActorAlign.END;
  this._banner.add_style_class_name('mac-notification-banner');
  this._label=Main.panel.statusArea.dateMenu._clockDisplay;
  this._tick=()=>{
   if(Main.sessionMode.isLocked)return;
   const d=GLib.DateTime.new_now_local();
   const days=['seg','ter','qua','qui','sex','sáb','dom'];
   const months=['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
   const text=`${days[d.get_day_of_week()-1]} ${d.get_day_of_month()} ${months[d.get_month()-1]} ${d.format('%H:%M')}`;
   if(this._label.text!==text)this._label.set_text(text);
  };
  this._signal=this._label.connect('notify::text',()=>this._tick());
  this._timer=GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT,15,()=>{this._tick();return GLib.SOURCE_CONTINUE;});
  this._tick();
 }
 disable() {
  this._banner.x_align=this._bannerAlign;
  this._banner.remove_style_class_name('mac-notification-banner');
  this._banner=null;
  if(this._timer)GLib.Source.remove(this._timer);
  if(this._signal)this._label.disconnect(this._signal);
  this._timer=this._signal=0;
  this._label.set_text(Main.panel.statusArea.dateMenu._clock.clock);
  this._label=null;
 }
}
