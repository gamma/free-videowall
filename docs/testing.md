# Test status / Teststand

## Automated

GitHub Actions runs the BrightScript compiler, playlist parser tests and the public ZIP build. Parser checks cover UTF-8 BOM/CRLF, comments, paths, missing files, video/image entries, EXTINF duration and outgoing fade settings. Tests execute in an off-device interpreter; they do not validate Roku's rendering or decoder behavior.

Artwork 1.0.6 was checked locally for all six target dimensions, manifest references, ZIP inclusion and package size. The public ZIP excludes private frame images. No additional API image generation is needed to build the project.

## Device acceptance / Prüfung am TV

Use a real USB drive and record the Roku model and OS. The following are manual checks, not completed automated tests:

| Check / Prüfung | Expected / Erwartung |
| --- | --- |
| Launch / Start | Title card, then automatic USB playback; no menu |
| Single video / Einzelvideo | At least three loops, 1.5 s still-frame blend, no black flash |
| Mixed playlist / Gemischte Liste | Video → image → video; image duration and relative subfolder paths respected |
| Back / Zurück | Leaves app and returns to Roku Home |
| Play / Wiedergabe | Pauses/resumes video without app menus |
| Seek / Springen | Forward/rewind/replay work; check start/end bounds and paused playback |
| Options / Optionen | Roku owns its system options; app does not consume the key |
| Missing stick / Ohne Stick | No crash; playback starts after inserting a usable stick |
| Stick removal / Stick entfernen | No crash or tight retry loop; replacement stick can recover |
| Broken media / Defekte Datei | Skip failing media; wait between repeated failures |
| Unattended / Dauerbetrieb | Run beyond screensaver timeout and for several hours with video and pictures |
| Sleep/restart / Neustart | Record actual behavior; no claim of guaranteed power-on autostart |

The development preview's USB-video playback and still-frame blend path have been observed in device logs. The user reported that the blend worked but appeared to go through black; version 1.0.4 added an opaque incoming start image to address that. The complete table, the new launch artwork and remote behavior have not been visually accepted yet. Network key injection was rejected by the test Roku with HTTP 403.

## Store

Before submission, run the current Roku Static Analysis and applicable App Behavior Analysis tests, and resolve the policy points in [publishing](publishing.md). Passing CI does not mean Roku certification.

## Deutsch

Die automatischen Prüfungen testen Code und Playlist-Verarbeitung, nicht das Bild am TV. Für eine Veröffentlichung müssen die obigen Geräteprüfungen tatsächlich durchgeführt werden. Ergebnisse mit Modell, Betriebssystem und Version festhalten. Insbesondere Blenden, Fernbedienung, USB-Wechsel und Dauerbetrieb bleiben eigene Prüfungen. Eine grüne GitHub-Prüfung ist keine Roku-Zertifizierung.
