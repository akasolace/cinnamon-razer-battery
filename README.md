# cinnamon-razer-battery

Native Cinnamon panel applet for Linux Mint 22.3 / Cinnamon 6.6. Reads battery
levels through the existing OpenRazer Python API, without root privileges,
driver changes, device writes, or an extra tray application.

## Features

- Theme battery icon and percentages in horizontal or vertical panels.
- Automatic refresh every 60 seconds, plus **Refresh now** in the click menu.
- All battery-capable OpenRazer devices, in stable name/serial order. Multiple
  percentages appear as `100% / 55%`; the tooltip and menu identify each device.
- Icon uses the lowest available battery; a charging emblem means at least one
  readable device reports charging. Each device's menu row shows its own status.
- Unknown charging status is explicit. Failed reads show unavailable; absent
  devices disappear on the next poll. No stale battery values are retained.
- Asynchronous helper with a 15-second timeout and cleanup on applet removal.

## Prerequisites

An already functioning OpenRazer installation and user daemon, including the
`openrazer.client` Python package accessible to `/usr/bin/python3` (normally
`python3-openrazer`). Use your distribution’s trusted package repositories and package manager
for available OpenRazer packages. The applet requires an existing working
OpenRazer setup if those packages are unavailable in your distribution. This applet does not install or modify drivers.

Check from a terminal in your desktop session:

```sh
/usr/bin/python3 -c 'from openrazer.client import DeviceManager; print([(d.name, d.battery_level) for d in DeviceManager().devices if d.has("battery")])'
```

## Installation

Clone or download this repository, then run from its root, as your normal user:

```sh
mkdir -p "$HOME/.local/share/cinnamon/applets"
cp -r files/razer-battery@akasolace "$HOME/.local/share/cinnamon/applets/"
```

Open **System Settings → Applets → Manage**, locate **Razer Battery**, and add
it to the panel with the **+** button. If it does not appear, log out and back
in to refresh Cinnamon's applet discovery. No `sudo` is needed.

## Configuration and updates

All battery-capable devices are shown automatically; there are no required
settings. The interpreter is `/usr/bin/python3` to use the distribution's
OpenRazer and D-Bus packages. Refresh is fixed at 60 seconds. Move the applet
using Cinnamon's panel edit mode. Charging support depends on what OpenRazer
and the device firmware expose.

For an update, remove the applet from the panel, repeat the copy command with
the new files, and add it again (log out and back in if old code remains loaded).

## Removal

Remove **Razer Battery** from the panel using its right-click menu, then:

```sh
rm -r "$HOME/.local/share/cinnamon/applets/razer-battery@akasolace"
```

This removes only the applet; OpenRazer remains installed.

## Troubleshooting

Run `/usr/bin/python3 files/razer-battery@akasolace/battery.py` from the repository
root in your desktop terminal. It returns JSON with device readings or a
human-readable error. An unavailable daemon, missing Python API, or missing
session bus produces `—` in the panel. Sleeping or disconnected devices may
remain listed by OpenRazer with an unavailable reading. A device or daemon
that reports a cached value cannot be distinguished from a live reading by
this read-only applet. Queries retry automatically.

## Tests and verification

```sh
python3 -m unittest discover -s tests -v
node --check files/razer-battery@akasolace/applet.js
node tests/test-applet.js
```

Python tests use fake devices; JavaScript tests use Cinnamon API doubles.
Neither needs OpenRazer or a running Cinnamon session. GitHub Actions runs these
checks on pushes and pull requests.

Verified during development on Cinnamon 6.6.9: the installed OpenRazer API
returned **100%** and **not charging** for a Basilisk V3 Pro 35K (Wireless).
The helper's real-device snapshot is also checked separately. Automated checks
cover invalid and missing readings, unsupported charging, multiple devices,
query overlap, timeouts, and removal cleanup.

The user has confirmed successful operation in a live panel, and the included
screenshot shows the running applet. Vertical-panel layout, 60-second refresh
over time, physical charging and unplug/reconnect transitions, and multiple
physical devices have not yet been verified. Treat version 1.0.0 as an initial release;
unit tests do not establish those desktop/hardware behaviors.

## Development

The installable applet is `files/razer-battery@akasolace`. `applet.js` uses native
Cinnamon APIs; `battery.py` makes a fresh DeviceManager on each query to rediscover
devices. It only reads name, serial, battery and charging properties. Serial
numbers are used internally for ordering, are never written to disk, and are
included in the diagnostic JSON; redact them before sharing diagnostics.

API references: [Cinnamon applet tutorial](https://github.com/linuxmint/cinnamon/blob/master/docs/reference/cinnamon-tutorials/write-applet.xml)
and [OpenRazer Python client](https://github.com/openrazer/openrazer/tree/master/pylib/openrazer/client).

MIT licensed. This is an independent project, unaffiliated with Razer or Linux Mint.

## Cinnamon Spices submission

`SPICES.md` is the distribution-specific README. `info.json`, `screenshot.png`,
and the bundled icon and translation template support upstream submission.
Export a fresh package into a Cinnamon Spices checkout with:

```sh
python3 tools/export-spice.py /path/to/cinnamon-spices-applets
cd /path/to/cinnamon-spices-applets
./validate-spice razer-battery@akasolace
```

The export refuses to overwrite an existing applet directory. Regenerate the
translation template with `xgettext` for both `applet.js` and `battery.py`.
