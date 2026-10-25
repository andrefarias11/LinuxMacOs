import St from 'gi://St';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';
export default class MinimalStatus extends Extension {
 enable() {
  const quick = Main.panel.statusArea.quickSettings;
  this._calendarHidden = [];
  const dateMenu = Main.panel.statusArea.dateMenu;
  for (const actor of [dateMenu?._clocksItem, dateMenu?._weatherItem]) {
   if (!actor) continue;
   const visible = actor.visible;
   const signal = actor.connect('notify::visible', () => { if (actor.visible) actor.hide(); });
   this._calendarHidden.push({actor, visible, signal}); actor.hide();
  }
  this._hidden = [];
  for (const actor of [quick._brightness, quick._volumeOutput]) {
   if (!actor) continue;
   const visible = actor.visible;
   const signal = actor.connect('notify::visible', () => { if (actor.visible) actor.hide(); });
   this._hidden.push({actor, visible, signal}); actor.hide();
  }
  this._icon = new St.Icon({icon_name: 'preferences-system-symbolic', style_class: 'system-status-icon'});
  quick._indicators.add_child(this._icon);
 }
 disable() {
  for (const {actor, visible, signal} of this._calendarHidden ?? []) { actor.disconnect(signal); actor.visible = visible; }
  this._calendarHidden = [];
  this._icon?.destroy(); this._icon = null;
  for (const {actor, visible, signal} of this._hidden ?? []) { actor.disconnect(signal); actor.visible = visible; }
  this._hidden = [];
 }
}
