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
