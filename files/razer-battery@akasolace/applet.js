const Applet = imports.ui.applet;
const Mainloop = imports.mainloop;
const PopupMenu = imports.ui.popupMenu;
const Gio = imports.gi.Gio;
const GLib = imports.gi.GLib;

class RazerBatteryApplet extends Applet.TextIconApplet {
    constructor(metadata, orientation, panelHeight, instanceId) {
        super(orientation, panelHeight, instanceId);
        this.setAllowedLayout(Applet.AllowedLayout.BOTH);
        this._path = GLib.build_filenamev([metadata.path, 'battery.py']);
        this._removed = false;
        this._process = null;
        this._timeout = 0;
        this.menuManager = new PopupMenu.PopupMenuManager(this);
        this.menu = new Applet.AppletPopupMenu(this, orientation);
        this.menuManager.addMenu(this.menu);
        this._render({devices: [], error: 'Reading OpenRazer…'});
        this._refresh();
        this._timer = Mainloop.timeout_add_seconds(60, () => {
            this._refresh();
            return true;
        });
    }

    _refresh() {
        if (this._removed || this._process) return;
        try {
            const process = Gio.Subprocess.new(['/usr/bin/python3', this._path],
                Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_PIPE);
            this._process = process;
            let timedOut = false;
            this._timeout = Mainloop.timeout_add_seconds(15, () => {
                this._timeout = 0;
                timedOut = true;
                process.force_exit();
                return false;
            });
            process.communicate_utf8_async(null, null, (source, result) => {
                if (this._timeout) Mainloop.source_remove(this._timeout);
                this._timeout = 0;
                this._process = null;
                try {
                    const [ok, stdout] = source.communicate_utf8_finish(result);
                    if (this._removed) return;
                    if (timedOut || !ok || !source.get_successful())
                        throw new Error('OpenRazer query failed or timed out.');
                    const data = JSON.parse(stdout);
                    if (!Array.isArray(data.devices)) throw new Error('Invalid OpenRazer response.');
                    this._render(data);
                } catch (error) {
                    if (!this._removed) this._render({devices: [], error: String(error.message)});
                }
            });
        } catch (error) {
            this._render({devices: [], error: 'Cannot start battery helper: ' + error.message});
        }
    }

    _render(data) {
        const readable = data.devices.filter(d => Number.isInteger(d.battery) && d.battery >= 0 && d.battery <= 100);
        const lowest = readable.length ? Math.min(...readable.map(d => d.battery)) : null;
        const charging = readable.some(d => d.charging === true);
        let icon = 'battery-missing-symbolic';
        if (lowest !== null) {
            const state = lowest <= 10 ? 'caution' : lowest <= 30 ? 'low' : lowest <= 70 ? 'good' : 'full';
            icon = 'battery-' + state + (charging ? '-charging' : '') + '-symbolic';
        }
        this.set_applet_icon_symbolic_name(icon);
        this.set_applet_label(readable.length ? readable.map(d => d.battery + '%').join(' / ') : '—');
        const lines = data.devices.map(d => d.name + ': ' +
            (d.battery === null ? 'Unavailable' : d.battery + '%' +
                (d.charging === true ? ' (charging)' : d.charging === false ? '' : ' (charging status unknown)')));
        this.set_applet_tooltip(lines.join('\n') || data.error || 'No battery-capable Razer devices connected.');
        this.menu.removeAll();
        const status = lines.length ? lines : [data.error || 'No battery-capable Razer devices connected.'];
        for (const line of status) {
            const item = new PopupMenu.PopupMenuItem(line);
            item.setSensitive(false);
            this.menu.addMenuItem(item);
        }
        this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
        const refresh = new PopupMenu.PopupMenuItem('Refresh now');
        refresh.connect('activate', () => this._refresh());
        this.menu.addMenuItem(refresh);
    }

    on_applet_clicked() { this.menu.toggle(); }

    on_applet_removed_from_panel() {
        this._removed = true;
        if (this._timer) Mainloop.source_remove(this._timer);
        if (this._timeout) Mainloop.source_remove(this._timeout);
        this._timer = 0;
        this._timeout = 0;
        if (this._process) this._process.force_exit();
        this.menu.destroy();
    }
}

function main(metadata, orientation, panelHeight, instanceId) {
    return new RazerBatteryApplet(metadata, orientation, panelHeight, instanceId);
}
