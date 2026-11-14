# Playlist reference

## English

- UTF-8 M3U or M3U8 file in the USB root. M3U8 means a local file list here, not HLS.
- Prefer `playlist.m3u`. Otherwise, use the alphabetically first usable M3U/M3U8 on the first usable external volume. Existing `autostart.m3u` files work.
- Relative paths can point into folders. Root paths and Roku `ext1:/...` paths work in the player; use relative paths for the preparation helper.
- Blank lines and comments are ignored. Missing or unsupported files are skipped. URLs and Windows drive-letter paths are not played.
- Video containers: MP4, M4V, MOV, MKV, TS. Codec support depends on the device.
- Images: JPG, JPEG, PNG.
- `#EXTINF:-1,Title`: play a whole video. Positive seconds limit a video or set an image's display time. Images default to 10 seconds. Image display time includes the incoming blend.
- `#EXT-X-FADE:1.5`: outgoing picture blend in seconds, 0–10. Default 1.5; resets for each entry. `0` requests a cut.
- Video helper images: append `.start.jpg` and `.end.jpg` to the full video filename. Generate with `scripts/prepare_usb.py`. Images use themselves as transition frames.
- The app blends still frames, not two moving videos. Incoming video playback advances underneath the blend. Audio is not crossfaded.
- The helper currently extracts the actual file's end frame even if EXTINF limits playback earlier. Use full-video entries for a matching end frame.
- The app reloads the playlist after each full loop. A broken playlist retries after five seconds; playback failures skip to the next entry.

## Deutsch

- UTF-8-Datei mit Endung M3U oder M3U8 im Hauptverzeichnis des Sticks. M3U8 ist hier eine lokale Dateiliste, kein HLS.
- `playlist.m3u` wird bevorzugt. Sonst die alphabetisch erste nutzbare M3U/M3U8 auf dem ersten nutzbaren USB-Volume. `autostart.m3u` funktioniert ebenfalls.
- Relative Pfade dürfen in Unterordner zeigen. Der Player versteht auch Pfade ab Stick-Hauptverzeichnis und `ext1:/...`; für das Hilfsprogramm relative Pfade verwenden.
- Leerzeilen und Kommentare werden ignoriert. Fehlende oder unbekannte Dateien werden übersprungen. Keine Netzwerk-URLs oder Windows-Laufwerksbuchstaben.
- Videocontainer: MP4, M4V, MOV, MKV, TS. Codecs hängen vom Gerät ab.
- Bilder: JPG, JPEG, PNG.
- `#EXTINF:-1,Titel`: ganzes Video. Positive Sekunden begrenzen ein Video oder setzen die Bild-Anzeigedauer. Bilder ohne Angabe: 10 Sekunden. Die eingehende Blende zählt zur Bild-Anzeigedauer.
- `#EXT-X-FADE:1.5`: ausgehende Bildblende in Sekunden, 0–10. Standard 1,5; gilt für jeweils einen Eintrag. `0` bedeutet Schnitt.
- Video-Hilfsbilder: `.start.jpg` und `.end.jpg` an den vollständigen Videodateinamen anhängen. `scripts/prepare_usb.py` erzeugt sie. Bilder dienen selbst als Blendenbilder.
- Standbilder werden überblendet, keine zwei bewegten Videos. Das nächste Video läuft währenddessen darunter weiter. Keine Tonüberblendung.
- Das Hilfsprogramm extrahiert momentan das tatsächliche Dateiende, auch wenn EXTINF die Wiedergabe früher begrenzt. Für ein passendes Endbild vollständige Videos abspielen.
- Nach jeder Runde wird die Playlist neu geladen. Bei einer unbrauchbaren Liste wartet die App fünf Sekunden; Wiedergabefehler überspringen den Eintrag.

## Video → picture → video / Video → Bild → Video

The app already supports an ordinary picture between videos. Example / Die App unterstützt ein normales Zwischenbild zwischen Videos. Beispiel:

```m3u
#EXTM3U
#EXTINF:-1,Welcome
videos/welcome.mp4
#EXTINF:8,Interlude
#EXT-X-FADE:1.5
pictures/interlude.jpg
#EXTINF:-1,Our story
videos/story.mp4
```

The picture is shown for eight seconds (including its incoming blend). The playlist loops from the last entry to the first. A picture interlude is not an automatically captured video frame. On its own, it does not guarantee black-free transitions: without an outgoing video end frame, the video-to-picture boundary can still leave a gap. For the existing prepared-frame blend, generate `.start.jpg` and `.end.jpg` files using `scripts/prepare_usb.py`. Images need no extra frame files. Audio is not crossfaded.

Das Bild wird acht Sekunden gezeigt (einschließlich der eingehenden Blende). Nach dem letzten Eintrag folgt wieder der erste. Das Zwischenbild ist kein automatisch aufgenommenes Videoframe. Es garantiert allein keine Übergänge ohne Schwarz: Ohne Endbild des ausgehenden Videos kann beim Wechsel zum Bild eine Lücke bleiben. Für die bestehende Blendentechnik mit `scripts/prepare_usb.py` die Dateien `.start.jpg` und `.end.jpg` erzeugen. Bilder benötigen keine zusätzlichen Hilfsbilder. Keine Tonüberblendung.

### Visual workshop / Visuelle Werkstatt

[English editor](https://videowall.gh.gammaproduction.de/editor.html) · [Deutscher Editor](https://videowall.gh.gammaproduction.de/de/editor.html)

- Paste an M3U or one filename per line. On Windows, use **Copy as path**; on macOS, **Option+Cmd+C** copies pathnames. Normal file-copy clipboard contents vary by browser and OS.
- For full computer paths, specify the stick root (e.g. `E:` or `/Volumes/USB`). Check that the result matches the actual USB folders.
- Choose the USB root folder to preserve subfolder paths. Selecting or dropping individual files supplies names only, so those files must be in the USB root. Folder import sorts media filenames; it does not import an existing playlist or add helper frame images.
- Move entries up/down, edit paths, picture durations/video limits and outgoing blend times. Download `playlist.m3u` into the USB root. It replaces your existing playlist only when you save/copy it there yourself.
- The preview uses generated placeholders; unlimited videos are assigned an illustrative eight seconds. It does not validate codecs, file existence or seamless transitions on your device. It does not generate video frame images.
- Media contents are neither read nor uploaded. M3U files are read as local text. No persistent storage: download before closing.

Dateinamen/M3U einfügen, mit Pfeilen sortieren, Bilddauer und Blenden anpassen und `playlist.m3u` herunterladen. Windows: **Als Pfad kopieren**; macOS: **Option+Cmd+C**. Normales Kopieren von Dateien funktioniert nicht in jedem Browser gleich. Bei Rechnerpfaden das USB-Hauptverzeichnis angeben; für Unterordner das Hauptverzeichnis des Sticks auswählen. Einzeldatei-Auswahl/Drag-and-drop liefert nur Namen. Die Vorschau zeigt Platzhalter und angenommene Videolaufzeiten, prüft keine echten Dateien oder TV-Kompatibilität und erzeugt keine Videoframes. Medien werden nicht gelesen oder hochgeladen. Vor dem Schließen herunterladen; es wird nichts dauerhaft gespeichert.

### Drag & drop / Ordner ablegen

The easiest import: drag the USB root folder into the workshop drop area. It recursively collects media filenames, retaining subfolders and omitting the outer folder name. If you drag a subfolder such as `videos` instead, uncheck **Dropped folder is the USB root** to retain `videos/` in the paths. Multiple dropped folders use the same setting. Individual files supply names only. Folder drops add entries and ignore existing playlists and helper frame images; drop an M3U separately to import its order and timing. Supported browsers use the File and Directory Entries API; the folder picker remains available as a fallback. Large/unreadable folders fail without a partial import (limit: 10,000 entries). No media contents are read or uploaded.

Am einfachsten: USB-Hauptordner in die Werkstatt ziehen. Die Seite durchsucht Unterordner und entfernt den äußeren Ordnernamen. Beim Ablegen eines Unterordners wie `videos` das Häkchen **Abgelegter Ordner ist das USB-Hauptverzeichnis** entfernen, damit `videos/` erhalten bleibt. Die Einstellung gilt auch für mehrere abgelegte Ordner. Einzeldateien liefern nur Namen. Ordner ergänzen Medien, ignorieren vorhandene M3U und Hilfsbilder; für Reihenfolge und Zeiten eine M3U separat ablegen. Falls der Browser Ordner-Drop nicht unterstützt, Ordnerauswahl verwenden. Unlesbare/zu große Ordner werden ohne Teilimport abgebrochen (maximal 10.000 Einträge). Keine Medieninhalte werden gelesen oder hochgeladen.

### Add entries manually / Einträge manuell ergänzen

At the end of the visual playlist, **Add another entry** appends a USB-relative video or picture path. An optional title, duration and outgoing blend can be set. Empty duration means a full video or a ten-second picture. Positive seconds limit a video or set picture duration; −1 means a full video. The same file may appear more than once. New entries can be reordered or removed like imported ones. Adding an entry does not copy the media: the referenced file must already exist on the USB stick.

Am Ende der visuellen Liste hängt **Weiteren Eintrag hinzufügen** ein Video oder Bild per USB-relativem Dateipfad an. Titel, Dauer und Blende sind einstellbar. Leere Dauer bedeutet ganzes Video oder zehn Sekunden Bild. Positive Sekunden setzen Videolimit/Bilddauer, −1 spielt das ganze Video. Dieselbe Datei darf mehrfach vorkommen. Neue Einträge lassen sich wie importierte sortieren und entfernen. Die Medien werden nicht mitkopiert; die Datei muss auf dem Stick vorhanden sein.
