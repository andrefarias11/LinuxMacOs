import St from 'gi://St';
import GLib from 'gi://GLib';
import Gio from 'gi://Gio';
import Clutter from 'gi://Clutter';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';
export default class QuickNoteCorner extends Extension {
 enable() {
  this._timer = 0; this._corners = [];
  this._monitorSignal = Main.layoutManager.connect('monitors-changed', () => this._build());
  this._build();
 }
 _clear() {
  if (this._timer) { GLib.source_remove(this._timer); this._timer = 0; }
  for (const actor of this._corners) { Main.layoutManager.removeChrome(actor); actor.destroy(); }
  this._corners = [];
 }
 _build() {
  this._clear();
  for (const monitor of Main.layoutManager.monitors) {
   const actor = new St.Widget({reactive: true, track_hover: true, width: 3, height: 3});
   actor.set_position(monitor.x + monitor.width - 3, monitor.y + monitor.height - 3);
   Main.layoutManager.addChrome(actor, {affectsInputRegion: true});
   actor.connect('enter-event', () => {
    if (this._timer) GLib.source_remove(this._timer);
    this._timer = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 650, () => {
     this._timer = 0;
     if (actor.hover && !Main.sessionMode.isLocked) Gio.Subprocess.new(['@@HOME@@/.local/bin/notas-rapidas'], Gio.SubprocessFlags.NONE);
     return GLib.SOURCE_REMOVE;
    });
    return Clutter.EVENT_PROPAGATE;
   });
   actor.connect('leave-event', () => { if (this._timer) { GLib.source_remove(this._timer); this._timer = 0; } return Clutter.EVENT_PROPAGATE; });
   this._corners.push(actor);
  }
 }
 disable() { if (this._monitorSignal) Main.layoutManager.disconnect(this._monitorSignal); this._clear(); }
}
