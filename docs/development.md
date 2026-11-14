# Development

Python 3.9+ builds the ZIP. Node.js 22+ runs the BrightScript compiler check and playlist tests. FFmpeg is only needed when preparing USB transition images.

```sh
npm ci
npm run check
npm test
python3 scripts/build.py
python3 scripts/deploy.py --host YOUR_ROKU_IP
```

The default ZIP contains the public app artwork, but no user media or private frame images. Local files in `images/endframes/` are ignored by Git. For a private device-specific build only, pass `--include-local-frames` to the build or deploy helper. Never attach that ZIP to a public release.

Deployment asks for the device's developer password, or reads `ROKU_PASSWORD` from the environment. It installs and launches the app; installation replaces the existing sideloaded channel. It stores the installer response in ignored `dist/`. Roku developer-console output is available on device TCP port 8085.

`source/playlist.brs` parses USB playlists in a Task; the SceneGraph scene plays videos and images, holds prepared end frames and animates the picture blend. `scripts/prepare_usb.py` produces image sidecars on the stick. The app still needs real-device visual checks; passing the parser/compiler does not verify transitions or idle behavior on a TV.

See [publishing](publishing.md) before preparing a Store build. No Gradle build is used here.

## Deutsch

Die ZIP wird mit Python 3.9+ gebaut. Node.js 22+ führt Compilerprüfung und Playlist-Tests aus. FFmpeg wird nur für die Blendenbilder auf dem Stick gebraucht. Die Befehle oben gelten für beide Sprachen.

Der Standard-Build enthält keine Medien oder privaten Blendenbilder. Dateien in `images/endframes/` bleiben lokal. `--include-local-frames` ist nur für private Gerätepakete; solche ZIPs nicht öffentlich hochladen.

Das Deployment fragt das Entwicklerpasswort ab oder liest `ROKU_PASSWORD`. Es ersetzt die vorhandene Entwickler-App und startet die neue Fassung. Compiler- und Parserprüfungen ersetzen keine Sichtprüfung am TV.

## Artwork

The title card was generated with the imagegen CLI fallback using `gpt-image-2`. The full prompt is in [artwork-prompt.txt](artwork-prompt.txt); the original 2048×1152 PNG is in `output/imagegen/title-screen.png`. Public launch screens and app tiles are checked in under `images/branding/`. To regenerate their sizes without another API call:

```
uv run --with pillow python scripts/prepare_artwork.py
```

The launch screen appears only at app startup, with a 750 ms minimum; it does not appear between playlist entries.
