# Samsung/Tizen: erster Gerätetest

Experimenteller USB-Player auf Branch `feature/samsung-tizen`. Kein Store-Release
und noch nicht auf einem Samsung-TV geprüft. Roku bleibt unverändert; sein Build
nimmt das Verzeichnis `platforms/` nicht auf.

## Umfang

- Sucht gemountete `removable_*`-USB-Speicher, bevorzugt `playlist.m3u`,
  sonst die alphabetisch erste nutzbare M3U/M3U8 im Hauptverzeichnis.
- Liest UTF-8, relative Dateipfade und `#EXTINF`. Bilder: JPG/JPEG/PNG;
  Videos: MP4/M4V/MOV/MKV/TS, abhängig vom TV-Decoder.
- Spielt Bilder und Videos nacheinander in Endlosschleife; lädt die Playlist
  pro Runde neu. Nicht nutzbare Dateien werden übersprungen.
- Ohne Playlist neuer Versuch nach fünf Sekunden. USB-Wechsel lösen eine neue
  Suche aus. Fehler erscheinen als kurze Diagnose auf dem Bildschirm und in der Konsole.
- Zurück beendet; Play/Pause steuert Videos. Beim Wechsel in den Hintergrund
  wird geschlossen, beim Zurückkehren beginnt die Playlist von vorn.
- Versucht den Bildschirmschoner während der App-Laufzeit auszuschalten.

Weiche Übergänge: Bilder werden überblendet; Videos nutzen dieselben
`.start.jpg`- und `.end.jpg`-Dateien wie Roku. Die ausgehende Dauer kommt aus
`#EXT-X-FADE` (Standard 1,5 Sekunden, 0 schaltet die Blende ab).
Das Endbild bleibt während USB-Suche und Laden des nächsten Mediums sichtbar.
Das nächste Video läuft bereits unter der Standbildblende. Es gibt keine
Überblendung zweier bewegter Videos oder der Tonspuren. Bei Bildern beginnt die
Anzeigedauer nach der eingehenden Blende; bei Videos zählt die Wiedergabezeit
bereits während der Blende. Ein fehlendes Endbild führt zum direkten Wechsel;
bei fehlendem Startbild wird zum laufenden Video geblendet. Schwarzphasen sind
in diesen Rückfällen möglich. Vorladen der Hilfsbilder hat zwei Sekunden Timeout.

Noch offen: Spulen, USB-/Einschalt-Autostart, Kioskmodus und Store-Freigabe.
Es gibt keine Netzwerk-Medienquelle und keine Schreibzugriffe auf den Stick.
Im Prototyp werden absolute Pfade sowie `..` abgelehnt; übliche relative Pfade
wie `videos/test.mp4` funktionieren. Das ist enger als der Roku-Parser.

## Im Docker-Container bauen

Auf dem Host werden Docker und Python 3.9+ für den Aufruf benötigt; das SDK
wird ausschließlich im Container installiert. Node.js 18+ ist nur für lokale
Tests nötig. Auf Apple Silicon wird `linux/amd64` emuliert.

```sh
npm run build:tizen-image
npm run build:tizen
npm run test:tizen
```

`tools/tizen/Dockerfile` ist die Tizen-SDK-10-Variante unseres Forks von
[vitalets/docker-tizen-webos-sdk](https://github.com/gamma/docker-tizen-webos-sdk/tree/48662ef).
Das bisherige kombinierte Image verwendet Studio 5.5 und benötigt ein separates
LG-Archiv. Die neue Variante enthält nur Tizen und keine Beispielzertifikate.
Beim Image-Build wird die SDK-Lizenz durch `--accept-license` angenommen.

`build:tizen` führt Dateivorbereitung, `tizen build-web` und das Packen im
Container aus. Ergebnis: `dist/free-videowall-tizen-unsigned.wgt` und
`dist/tizen/.buildResult/`. Das WGT ist **unsigniert**, noch nicht installierbar.
`npm run stage:tizen` bereitet bei Bedarf nur die Dateien vor.

Die Docker-Aufrufe verwenden BuildKit. Ausschließlich für den hier vorhandenen
HTTP-Loopback-Daemon `127.0.0.1:4243` entfernt der Wrapper widersprüchliche
TLS-Umgebungsvariablen für den Kindprozess. Andere Docker-Verbindungen behalten
ihre TLS-Konfiguration.

## TV-Verbindung und Signieren

CLI-Aufrufe laufen ebenfalls im Container:

```sh
python3 scripts/tizen_docker.py cli -- sdb version
python3 scripts/tizen_docker.py cli -- bash -ec 'sdb connect 192.168.177.137:26101; sdb devices'
```

Die IP ist die aktuelle Adresse des Test-TVs und kann sich ändern. Für jeden
kurzlebigen Container die SDB-Verbindung neu aufbauen. Der TV muss im
Entwicklermodus sein und die aktuelle LAN-IP des Macs als Host-IP kennen.
Docker muss vom Container aus das TV-Netz erreichen können.

Für die Installation ein Samsung-Zertifikatsprofil mit der DUID des TVs erstellen
und die Installation für dieses Gerät erlauben. Zertifikate und Passwörter
gehören weder in Git noch in das Image. Das Docker-Volume
`free-videowall-tizen-data` erhält Profile zwischen Container-Aufrufen.
Private Zertifikatsdateien können über `TIZEN_CERT_DIR` schreibgeschützt unter
`/certs` eingebunden werden; das Profil muss diese Containerpfade verwenden.

```sh
TIZEN_CERT_DIR=/absoluter/pfad/zu/deinen/zertifikaten \
  python3 scripts/tizen_docker.py cli -- tizen package -t wgt -s DEIN_PROFIL -- dist/tizen/.buildResult
```

Das ist der Signieraufruf für ein bereits eingerichtetes Profil; er erstellt kein
Samsung-Zertifikat. Erst das signierte WGT kann auf dem TV installiert werden.
Installation und App-Start sind getrennte Schritte nach erfolgreicher Signierung.
GUI-Werkzeuge für Konto/Zertifikate nur gemäß den aktiven Offstage-Regeln öffnen.

Für Videoblenden auf dem Rechner mit FFmpeg vorbereiten:

```sh
python3 scripts/prepare_usb.py /Volumes/DEIN_STICK/playlist.m3u
```

## Verifizierter Stand (14. November 2026)

- SDK-10-Image unter Docker auf Apple Silicon mit AMD64-Emulation gebaut;
  `sdb 4.2.36`, `Tizen CLI 2.5.25`.
- `npm run build:tizen-image` und `npm run build:tizen` erfolgreich.
- Unsigned WGT auf ZIP-Integrität, Konfiguration und erforderliche Assets geprüft.
- SDB verbindet aus dem Container zu `192.168.177.137:26101` und erkennt
  `GU55DU7170UXZG`; Gerätefähigkeiten konnten gelesen werden.
- Elf Headless-Tests der Samsung-Playerlogik bestanden.
- Noch nicht geprüft: Samsung-Signierung, Installation und sichtbare Wiedergabe.

## Abnahme am Gerät

TV-Modell, Baujahr, Firmware und Testergebnis festhalten:

- USB wird gefunden; JPG und MP4 erscheinen im richtigen Seitenverhältnis.
- Mindestens drei Schleifen, Zeitbegrenzung eines Videos und Bilddauer prüfen.
- Bild/Bild, Bild/Video, Video/Bild und Video/Video einschließlich letzter/erster
  Eintrag prüfen. Der alte Frame muss beim Laden des nächsten Mediums sichtbar
  bleiben; besonders AVPlay-Layer-Reihenfolge und Schwarzphasen beobachten.
- `#EXT-X-FADE:0` und eine andere Blenddauer testen; Hilfsbilder entfernen und
  den Rückfall prüfen. Sichtbare Parität mit Roku ist noch am Gerät abzunehmen.
- Datei mit Leerzeichen/Umlaut sowie einen Unterordner testen.
- Fehlendes Medium, nicht abspielbares Video und ungültige Playlist testen.
- USB abziehen/wieder einstecken; App soll erneut eine Playlist finden.
- Playlist ändern und nächste Schleife prüfen.
- Play/Pause, Zurück, Home und erneutes Öffnen prüfen.
- Längerer Lauf: Bildschirmschoner und TV-Abschalttimer getrennt beobachten.

Headless-Tests prüfen Parser und Ablauf mit API-Doubles. Sie beweisen weder
USB-Berechtigungen noch AVPlay-/Bildwiedergabe auf einem echten TV.

## Plattformdokumentation

- [USB-Speicher](https://developer.samsung.com/smarttv/develop/guides/data-handling/handling-usb-storages.html)
- [AVPlay](https://developer.samsung.com/smarttv/develop/guides/multimedia/media-playback/using-avplay.html)
- [TV-App-Konfiguration](https://developer.samsung.com/smarttv/develop/guides/fundamentals/configuring-tv-applications.html)
