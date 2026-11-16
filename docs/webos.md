# LG/webOS private USB player

Work takes place on `feature/lg-webos` in a separate worktree. This is a
rooted-TV Homebrew prototype, not a Content Store app. It does not change Home,
ATLauncher, rooting or firmware.

## Build and tests

```sh
npm run test:webos
npm run build:webos
python3 scripts/probe_webos_usb.py --host TV_IP
```

The build uses Python's standard library to create a standard webOS IPK with a
web app and a JS service. It needs no SDK or signing certificate. Output:
`dist/de.gammaproduction.freevideowall_0.1.0_all.ipk`.

The seven Node tests cover mounted-volume filtering, AppleDouble exclusion,
path/symlink confinement, HTTP byte ranges, unplug/replug invalidation, decoder
repeat, duplicate end events, and stale/background callbacks.

## Install on a rooted TV

Use the TV's current IP and existing SSH pairing. Commands below affect only
Free Videowall. Route installation/launch commands through Offstage where the
workspace GUI policy requires it. `ssh -tt` matters: on the tested firmware,
`luna-send` exits without a reply when stdin is closed.

```sh
scp -O dist/de.gammaproduction.freevideowall_0.1.0_all.ipk root@TV_IP:/tmp/freevideowall.ipk
ssh -tt root@TV_IP 'luna-send -w 15000 -i luna://com.webos.appInstallService/dev/install '\''{"id":"de.gammaproduction.freevideowall","ipkUrl":"/tmp/freevideowall.ipk","subscribe":true}'\'''
```

Wait for `"state":"installed"`. A timeout after that subscription response is
expected. The Homebrew Channel's existing elevation tool is needed for USB
access outside the ordinary app jail:

```sh
ssh -tt root@TV_IP '/media/developer/apps/usr/palm/services/org.webosbrew.hbchannel.service/elevate-service de.gammaproduction.freevideowall.usb'
ssh -tt root@TV_IP 'luna-send -w 5000 -n 1 luna://com.webos.applicationManager/launch '\''{"id":"de.gammaproduction.freevideowall"}'\'''
```

Elevation may need repeating after reinstall. No boot hook is installed by
this prototype. The owner confirms playback after restarting the TV on the
tested setup. The USB service is activated on demand through Luna, holds a
renewable activity while the foreground player is polling, and can exit after
the app stops renewing it.

## USB and playback

Put a UTF-8 `autostart.m3u` or `playlist.m3u` in the stick's root. Media paths are
relative to that directory. Other root M3Us are fallback candidates. Dot files
(including macOS `._*.m3u`) are skipped. A playlist is limited to 1 MiB.
Network URLs, absolute paths, parent traversal and symlinks outside the selected
USB root are rejected. The service has no write or shell-execution API.

A read-only HTTP server bound to `127.0.0.1` serves only media referenced by the
selected playlist and optional `.start.jpg` / `.end.jpg` sidecars. Random token
URLs are handed to the app over Luna. Byte-range support lets the TV decoder
seek/read locally. The stick and TV are sufficient; the development computer
is not a playback server.

The UI is a full-screen HTML5 video/image loop with no menu or controls. A
single full-length video uses the decoder's native `loop` mode. Multiple items
reuse the Samsung prototype's pure playlist parser and still-frame transition
module (copies in this platform directory; no Samsung changes). Positive
`EXTINF` durations can shorten videos. Images default to 10 seconds. Polling
rescans the USB every five seconds; returning from background triggers a fresh
scan. Back closes the app.

## Device evidence, 16 November 2026

- Rooted LG at `192.168.177.28`, webOS `10.3.2`, Node `16.20.2`.
- `/dev/sda1` mounted as exFAT at `/tmp/usb/sda/sda1`.
- Actual root playlist `autostart.m3u` read successfully (91 bytes), referencing
  `Jojo Physio Logo - 1920x1080 - 30s.mp4` and its `.end.jpg` sidecar.
- IPK installation reported `state: installed`; service elevation and on-demand
  Luna scan succeeded. App launch reported success.
- Live debugger: one item, duration 30, `paused:false`, `readyState:4`,
  `loop:true`, no media error, no status overlay. Playback time advanced and
  crossed from 19.759 seconds to 0 at a loop boundary while remaining active.
- The owner confirms visible playback and no black flash at the loop boundary.
  The owner also confirms that the launcher icon works and that unplugging and
  reconnecting the USB stick works with the app running.
- The owner confirms playback after restarting the TV.
- Mixed images/videos remain unverified. A long-duration test is deferred by
  the owner; it is not a condition for this prototype commit.
- The ATLauncher app-list helper was not running after boot, so the installed
  app was initially absent from its stale cache. Starting the helper refreshed
  the app list and copied the correct Free Videowall icon. The helper lifecycle
  correction belongs to the separate ATLauncher repository.
