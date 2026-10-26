import Clutter from 'gi://Clutter';
import GLib from 'gi://GLib';
import GObject from 'gi://GObject';
import Gio from 'gi://Gio';
import Shell from 'gi://Shell';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';

export default class DockHoverLift extends Extension {
    enable() {
        this._records = new Map(); this._boxes = new Set(); this._boxSignals = new Map(); this._pending = 0;
        this._dead = false;
        this._animationSettings = new Gio.Settings({schema_id: 'org.gnome.desktop.interface'});
        this._motion = global.stage.connect('captured-event', (_actor, event) => {
            if ([Clutter.EventType.MOTION, Clutter.EventType.LEAVE].includes(event.type())) this._schedule();
            return Clutter.EVENT_PROPAGATE;
        });
        this._loadDock();
        this._scanTimer = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, 1, () => {
            this._scan(); return GLib.SOURCE_CONTINUE;
        });
    }
    async _loadDock() {
        const info = Main.extensionManager.lookup('dash-to-dock@micxgx.gmail.com');
        if (!info) return;
        try {
            const module = await import(`${info.dir.get_uri()}/extension.js`);
            if (!this._dead) { this._module = module; this._scan(); }
        } catch (error) { console.warn(`Dock Hover Lift: ${error.message}`); }
    }
    _scan() {
        if (this._dead) return;
        if (!this._module) { this._loadDock(); return; }
        const docks = this._module.dockManager?._allDocks ?? [];
        for (const dock of docks) {
            const box = dock.dash?._box;
            if (!box) continue;
            if (!this._boxes.has(box)) {
                this._boxes.add(box); box.add_style_class_name('dock-hover-lift-space');
                const id = box.connect('destroy', () => { this._boxes?.delete(box); this._boxSignals?.delete(box); });
                this._boxSignals.set(box, id);
            }
            const children = box.get_children();
            for (const item of children) {
                const downloads = item.child?.app?.get_id() === 'dock-downloads.desktop';
                if (downloads) item.add_style_class_name('mac-dock-files-divider');
                else item.remove_style_class_name('mac-dock-files-divider');
            }
            for (const [index, item] of children.entries()) {
                const button = item.child;
                const visual = button?.icon?.icon;
                if (!visual || !(visual instanceof Clutter.Actor) || this._records.has(button)) continue;
                const [px, py] = visual.get_pivot_point();
                const record = {button, visual, box, index,
                    sx: visual.scale_x, sy: visual.scale_y, ty: visual.translation_y,
                    px, py, hover: 0, focus: 0, destroy: 0};
                visual.set_pivot_point(0.5, 1.0);
                record.hover = button.connect('notify::hover', () => this._schedule());
                record.focus = button.connect('notify::has-key-focus', () => this._schedule());
                record.destroy = button.connect('destroy', () => {
                    if (record.appSignal && GObject.signal_handler_is_connected(record.app, record.appSignal)) record.app.disconnect(record.appSignal);
                    this._records?.delete(button); this._schedule();
                });
                record.app = button.app;
                record.startAt = 0;
                record.appSignal = record.app?.connect('notify::state', () => {
                    record.startAt = record.app.state === Shell.AppState.STARTING ? GLib.get_monotonic_time() : 0;
                    this._schedule();
                    if (record.startAt && !this._bounceTimer) this._bounceTimer = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 33, () => {
                        this._schedule();
                        const now = GLib.get_monotonic_time();
                        if ([...this._records.values()].some(r => r.startAt && now-r.startAt < 4000000)) return GLib.SOURCE_CONTINUE;
                        this._bounceTimer = 0; return GLib.SOURCE_REMOVE;
                    });
                });
                this._records.set(button, record);
            }
            // Existing actors can change index when favorites or running apps change.
            for (const record of this._records.values()) {
                if (record.box === box) record.index = children.indexOf(record.button.get_parent());
            }
        }
    }
    _schedule() {
        if (this._dead || this._pending) return;
        this._pending = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 16, () => {
            this._pending = 0; this._updateTargets(); return GLib.SOURCE_REMOVE;
        });
    }
    _updateTargets() {
        const records = [...this._records.values()];
        const [pointerX] = global.get_pointer();
        const animate = this._animationSettings.get_boolean('enable-animations');
        const now = GLib.get_monotonic_time();
        for (const record of records) {
            const same = records.filter(r => r.box === record.box);
            const hovered = same.some(r => r.button.hover);
            const focused = same.find(r => r.button.has_key_focus());
            const [x] = record.button.get_transformed_position();
            const [width] = record.button.get_transformed_size();
            const center = x + width/2;
            let targetX = pointerX;
            if (!hovered && focused) {
                const [fx] = focused.button.get_transformed_position();
                const [fw] = focused.button.get_transformed_size();
                targetX = fx+fw/2;
            }
            const distance = Math.abs(center-targetX)/Math.max(width,1);
            const weight = animate && (hovered || focused) && distance < 4
                ? Math.exp(-0.5 * (distance/1.15)**2) : 0;
            const age = (now-record.startAt)/1000000;
            const bounce = animate && record.startAt && age < 4 && record.app.state === Shell.AppState.STARTING
                ? 9 * Math.abs(Math.sin(Math.PI*age/0.6)) : 0;
            const scale = 1+0.26*weight;
            record.visual.ease({scale_x: record.sx*scale, scale_y: record.sy*scale,
                translation_y: record.ty-5*weight-bounce, duration: animate ? 70 : 0,
                mode: Clutter.AnimationMode.EASE_OUT_QUAD});
        }
    }
    disable() {
        this._dead = true;
        if (this._motion) global.stage.disconnect(this._motion);
        if (this._bounceTimer) GLib.source_remove(this._bounceTimer);
        this._motion = this._bounceTimer = 0;
        if (this._scanTimer) GLib.source_remove(this._scanTimer);
        if (this._pending) GLib.source_remove(this._pending);
        this._scanTimer = this._pending = 0;
        for (const record of this._records?.values() ?? []) {
            if (record.appSignal && GObject.signal_handler_is_connected(record.app, record.appSignal)) record.app.disconnect(record.appSignal);
            for (const id of [record.hover, record.focus, record.destroy])
                if (GObject.signal_handler_is_connected(record.button, id)) record.button.disconnect(id);
            for (const name of ['scale-x', 'scale-y', 'translation-y']) record.visual.remove_transition(name);
            record.visual.scale_x = record.sx; record.visual.scale_y = record.sy;
            record.visual.translation_y = record.ty;
            record.visual.set_pivot_point(record.px, record.py);
        }
        this._records?.clear();
        for (const box of this._boxes ?? []) {
            const id = this._boxSignals.get(box);
            if (id && GObject.signal_handler_is_connected(box, id)) box.disconnect(id);
            for (const item of box.get_children()) item.remove_style_class_name('mac-dock-files-divider');
            box.remove_style_class_name('dock-hover-lift-space');
        }
        this._boxSignals?.clear();
        this._boxes?.clear(); this._module = null;
    }
}
