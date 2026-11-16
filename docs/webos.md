# LG/webOS private USB player

Work takes place on `feature/lg-webos` in a separate worktree. This is a
rooted-TV Homebrew prototype, not a Content Store app. It does not change Home,
ATLauncher, rooting or firmware.

## Build and tests

```sh
npm run test:webos
python3 -m unittest discover -s tests -p 'test_build_webos.py'
npm run build:webos
python3 scripts/probe_webos_usb.py --host TV_IP
```

The build uses Python's standard library to create a standard webOS IPK with a
web app and a JS service. It needs no SDK or signing certificate. Output:
`dist/de.gammaproduction.freevideowall_0.1.0_all.ipk`.

The seventeen Node tests cover mounted-volume filtering, AppleDouble exclusion,
path/symlink confinement, HTTP byte ranges, unplug/replug invalidation, decoder
repeat, duplicate end events, stale/background callbacks, decoded-frame reveal,
and direct fades to running video.
Two Python integration tests build and inspect the real IPK, verify version
consistency and reproducibility, reject invalid versions, and check that source
metadata remains unchanged.

## Tag builds and GitHub releases

The `Release preview` workflow builds the LG Homebrew IPK alongside the Roku
ZIP for a pushed `vMAJOR.MINOR.PATCH` tag containing the webOS source. The tag
must still match the repository's Roku manifest and root `package.json`, as
required by the existing release checks. The LG build takes its version from
that tag; app metadata, service metadata, package control and runtime diagnostic
version all agree without modifying the tagged source files.

The prerelease includes `de.gammaproduction.freevideowall_<version>_all.ipk`
and its SHA-256 entry in `SHA256SUMS`. Release notes identify the IPK as requiring
a rooted LG TV, Homebrew Channel and service elevation. This does not submit
the app to LG Content Store or the Homebrew Channel catalog.

Branch checks also run the LG tests and upload a `free-videowall-lg-homebrew`
Actions artifact. To rehearse a tagged release, dispatch `Release preview` for
an existing tag containing this change and leave `publish` disabled. Old tags
without webOS source continue to build only their existing Roku assets.
Existing GitHub releases and their files are preserved.

To build a particular package version locally:

```sh
python3 scripts/build_webos.py --version 1.0.16 --output-dir dist/lg-homebrew
```

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
use a local copy of the Samsung prototype's pure playlist parser and an
adapted LG still-frame transition module (no Samsung changes). Positive
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

## Mixed-video transition correction

The LG player waits for `requestVideoFrameCallback` and a rendering opportunity
before uncovering the next video. A parallel fallback checks positive playback time with decoded data, including
engines which expose frame callbacks but never call them (observed on this LG). Incoming videos are revealed directly, without a frozen
start-image layer while the video advances beneath it.

An outgoing video still needs a matching `.end.jpg` to cover decoder reset.
Run `python3 scripts/prepare_usb.py /path/to/USB/autostart.m3u` after adding or
changing videos. The tested stick initially had an end frame for its static-logo
clip only; the colour-rotation clip had none. A video-plane canvas probe on this
LG returned black pixels, so automatic canvas capture is not used as a fallback.
Prepared end frames reflect the file end; shortened `EXTINF` videos still need
an end image matching the chosen cut point.

Testbuild 0.1.1 was installed and its JS sources compared with the local build.
Live event recording covered both directions of the two-video playlist: the
outgoing 1280-wide end image remained visible during decoder reset; fading began
only after positive playback progress and lasted 1.5 seconds. Playback continued
without a status message or stuck cover. Visual confirmation of black-free
transitions is still pending; event recording cannot prove the physical display.

A subsequent owner report confirmed that 0.1.1 still flashed black. A 16 ms
DOM/decoder trace then found a concrete gap: after decoder reset (`readyState:0`),
the outgoing DOM image was still unloaded (`naturalWidth:0`) for about 57 ms.
The detached image preload did not prevent a second request for the visible
image. Testbuild 0.1.2 waits for the actual cover element's load event before
showing it, gives it a paint opportunity, and only then resets the decoder.
The original 0.1.1 event trace was insufficient evidence of a painted cover.

The owner confirmed PNG-to-video working on 0.1.2, but video-to-PNG still
flashed black. Testbuild 0.1.3 retains the paused video decoder/buffer when
entering an image instead of clearing its source and calling `load()`. The PNG
has an opaque black background and receives two animation frames after loading
before the outgoing end image fades. A later video or backgrounding still
releases/reopens the decoder. A regression test checks retained decoder state,
image paint ordering and cleanup on backgrounding. Visible acceptance is pending.

Live 0.1.3 recording observed the return fade with the PNG loaded at 1920 pixels,
the video source retained at its 30-second end, and decoder readyState remaining
4. The next PNG-to-video transition also completed with a loaded cover. Physical
black-flash acceptance still requires the owner; this trace is not a screen capture.

Testbuild 0.1.4 changes video-to-image transitions to a live overlap: the following
PNG is preloaded invisibly in its actual slide element. During the outgoing
video's final fade interval (28.5–30 seconds for a 30-second clip with 1.5-second
fade), the PNG fades in over the still-running video. The effective end respects
both the actual video duration and a shorter positive EXTINF limit. Only at that
end is the video paused; the PNG then receives its full configured hold time.
Hidden/stale callbacks cancel the overlap. A missing PNG preload falls back to
the safe post-end transition. Video-to-video transitions retain the still-frame
path. This implements the owner's requested visible overlap instead of fading
between the nearly identical video end frame and the PNG after video end.

The owner subsequently confirmed the 0.1.3 return no longer flashes black, but
found the post-end fade invisible. A direct end-JPEG/PNG comparison found only
0.29–0.44 mean channel levels of difference out of 255: the colour-rotation video
returns to the original PNG's appearance at its end. The owner requested the
0.1.4 live overlap during the final 1.5 seconds instead.

The owner accepted the timing of the 0.1.4 live overlap, but reported a white
brightness increase during the blend. Testbuild 0.1.5 adds a complementary
video-opacity fade from one to zero while the PNG fades from zero to one,
using the same remaining-video duration. This is a device compositing test;
physical brightness acceptance is pending. The hardware plane's visual mixing
cannot be established from DOM opacity alone.

The owner reported dimming with 0.1.5 complementary opacities. Testbuild 0.1.6
uses `mix-blend-mode: plus-lighter` on the PNG during the live overlap and an
isolated body compositing group. Source-over with both layers fading attenuates
the video twice; additive premultiplied contributions avoid that arithmetic dip.
The LG Chrome 120 engine reports support for plus-lighter and isolation. The
blend mode returns to normal at completion or stop. Hardware-plane brightness
and playback acceptance remain pending on the physical TV.
Reference: https://drafts.fxtf.org/compositing-2/#plus-lighter

### Temporary overscan correction (rooted LG, 0.1.7)

The tested LG's video scaler cropped 48 horizontal and 27 vertical pixels from
1080p video (1824x1026 source window), enlarging the logo relative to the PNG.
The actual PNG and all 900 video frames have matching logo bounds. With Just
Scan enabled, the scaler uses the entire 1920x1080 source at x0/y0.

The elevated USB service now temporarily enables Just Scan for the active DTV
video context, journaling its previous value in
`/var/lib/freevideowall/overscan.json`. It restores that value on app hide/exit.
The app renews a 35-second lease through its existing five-second USB poll; a
missing client expires the lease. Restore failures retain the journal and retry.
Service restart also attempts journal recovery. An already enabled setting is
left enabled, and a later independent change to off/auto is preserved. HDMI
contexts are excluded. This uses private rooted-TV APIs, not a portable webOS
app preference. A service crash/power loss may delay restoration until service
restart. The one-off HDMI2/FHD adjustment made during diagnosis is separate.

0.1.7 also replaces the additive two-layer fade experiment with ordinary
source-over: the video stays opaque while the PNG fades in during its final
1.5 seconds. This avoids multiplying the video contribution twice. The isolated
blend group is removed. The hardware video buffer is still retained through
image handoff. Physical brightness acceptance remains open.

Validation: 25 webOS tests and two packaging tests pass. Installed 0.1.7
reported active USB video playback. The service saved previous Just Scan=off;
after closing the app, its journal was cleared and the TV setting read back off.

Live follow-up on 0.1.7 identified Free Videowall as the active video client:
full source 1920x1080 at x0/y0, overscan N, Just Scan on. Closing via
`applicationManager/closeByAppId` restored off and removed the journal. A live
computed-style trace recorded video opacity 1 throughout the outgoing overlap,
PNG opacity rising from 0, and normal blend mode; the image then held with the
decoder paused. These are runtime checks, not physical-screen brightness proof.
