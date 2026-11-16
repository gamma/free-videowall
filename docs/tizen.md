# Samsung/Tizen: erster Gerätetest

Experimenteller USB-Player auf Branch `feature/samsung-tizen`. Kein Store-Release.
Auf einem Samsung-TV installiert; USB-Videowiedergabe und Wiederaufnahme nach
dem USB-Browser sind am Gerät bestätigt. Sichtbare Übergänge bleiben ungeprüft. Roku bleibt unverändert; sein Build
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

## USB-Stick im laufenden Betrieb einstecken

Samsung kann beim Einstecken seinen eigenen USB-Browser öffnen und die App in
den Hintergrund setzen. Den USB-Browser mit **Zurück** schließen und zur App
zurückkehren. Die App sucht dann die Playlist erneut und beginnt die Wiedergabe;
Beenden und Neustarten der App sind dafür nicht erforderlich.
Zurück **innerhalb von Free Videowall** beendet hingegen die App.

## GitHub-Release-Artefakt

Der Tag-Workflow stellt `free-videowall-tizen-unsigned.wgt` und dessen
SHA-256-Prüfsumme bereit, wenn der Tag diese Samsung-Version und den erweiterten
Release-Workflow enthält. Das öffentliche WGT enthält keine gerätespezifischen
Signaturen. Es muss vor Installation für den Ziel-TV signiert werden:

```sh
unzip free-videowall-tizen-unsigned.wgt -d samsung-preview
# Im SDK, mit einem bereits eingerichteten eigenen Samsung-Zertifikatsprofil:
tizen package -t wgt -s DEIN_PROFIL -- samsung-preview
```

Das ist ein Entwicklerartefakt, keine Store-Freigabe. Dein Profil muss für den
Ziel-TV eingerichtet sein. Details zu Tag, Trockenlauf und Versionsschema:
[Release-Automation](automation.md#samsung-artefakt).

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

### Samsung-Zertifikate ohne lokales SDK

Ein optionales, dauerhaft laufendes Begleitimage enthält Node.js, D-Bus,
GNOME Keyring und Samsungs offiziellen Zertifikatsmanager. Die Samsung-Werkzeuge
sind auf Commit `431ae2b47684016748330eac2ba4eb4167ad4319` aus
[Samsung/tizen-agent-skills](https://github.com/Samsung/tizen-agent-skills/tree/431ae2b47684016748330eac2ba4eb4167ad4319)
festgelegt. Es wird kein Browser gestartet; die CLI gibt die Login-URL aus.

```sh
python3 scripts/tizen_certificates.py image
python3 scripts/tizen_certificates.py start
python3 scripts/tizen_certificates.py login
```

Die ausgegebene Samsung-URL innerhalb von fünf Minuten im eigenen Browser
öffnen. Der Callback wird automatisch über `localhost:4794` weitergeleitet;
die Antwort-URL enthält Zugangsdaten und gehört nicht in Chat oder Logs.
Der Port ist ausschließlich an Host-Loopback gebunden. Das CLI verwendet
standardmäßig das neue Profil `FreeVideowallSamsung`; vorhandene lokale
Tizen-Zertifikate werden dadurch nicht ersetzt.

Nach erfolgreicher Anmeldung diese Schritte im eigenen Terminal ausführen:

```sh
# Beim ersten Mal ein eigenes Passwort für den verschlüsselten Keyring wählen.
python3 scripts/tizen_certificates.py unlock
# Den gewünschten Autorennamen als --identity angeben.
python3 scripts/tizen_certificates.py author --identity 'Gamma Production'
python3 scripts/tizen_certificates.py distributor --tv 192.168.177.137
python3 scripts/tizen_certificates.py profile
```

`unlock`, `author` und `distributor` lesen Passwörter verdeckt im Terminal;
es gibt keine Passwortargumente oder Passwortdateien. Beim Autor- und
Distributorzertifikat kann dasselbe Zertifikatspasswort verwendet werden.
Beide Zertifikatspasswörter werden über Samsungs Passwortspeicher im
verschlüsselten GNOME Keyring gespeichert. Das Keyring-Passwort aufbewahren:
Nach einem Containerneustart erneut `unlock` aufrufen. Ein falsches Passwort
erfordert gegebenenfalls `stop`, `start` und einen erneuten Unlock-Versuch.

Das vorhandene Datenvolume enthält Zertifikate, Profile und den von Samsungs
CLI mit Dateimodus `0600` gespeicherten OAuth-Token. Der verschlüsselte Keyring
liegt getrennt im Volume `free-videowall-tizen-keyring`. Weder Volume wird ins
Image oder in Git übernommen. Die Container bleiben über Agent-Sessions hinweg
erhalten; es gibt keinen automatischen Start beim Login. `status` prüft den
Container und listet Profile, `stop` beendet ihn ohne die Volumes zu löschen.
Keinen weiteren CLI-Container gleichzeitig schreibend am Profil arbeiten lassen.

Nach dem Anlegen des Samsung-Profils aus demselben, entsperrten Container signieren:

```sh
docker exec free-videowall-tizen-certificates \
  tizen package -t wgt -s FreeVideowallSamsung -- dist/tizen/.buildResult
```

Das signierte Paket liegt unter `dist/tizen/.buildResult/Free Videowall.wgt`.
Vor der Installation unter einem Dateinamen **ohne Leerzeichen** kopieren:

```sh
cp 'dist/tizen/.buildResult/Free Videowall.wgt' dist/free-videowall-tizen.wgt
```

Der Tizen-Installer scheiterte im Gerätetest mit dem automatisch erzeugten
Dateinamen mit Leerzeichen; der gleiche signierte Build unter dem Namen oben
wurde erfolgreich installiert. Installation und Start erfolgen im Container:

```sh
docker exec free-videowall-tizen-certificates \
  /home/developer/tizen-studio/tools/tizen-core/tz install \
  -p /workspace/dist/free-videowall-tizen.wgt \
  -e 192.168.177.137:26101
docker exec free-videowall-tizen-certificates \
  /home/developer/tizen-studio/tools/tizen-core/tz run \
  -p FreeVidWal -e 192.168.177.137:26101
```

`tz run -p` erwartet hier die Paket-ID `FreeVidWal`, nicht die
App-ID `FreeVidWal.Player`. Bei einem neuen Container zuvor wieder
`sdb connect 192.168.177.137:26101` ausführen.

Der Integrationstest verwendet ausschließlich eigene temporäre Testdaten und
räumt seinen Testcontainer sowie sein Testvolume wieder auf:

```sh
python3 scripts/test_tizen_certificates.py
```

Für Videoblenden auf dem Rechner mit FFmpeg vorbereiten:

```sh
python3 scripts/prepare_usb.py /Volumes/DEIN_STICK/playlist.m3u
```

## Verifizierter Stand (16. November 2026)

- SDK-10-Image unter Docker auf Apple Silicon mit AMD64-Emulation gebaut;
  `sdb 4.2.36`, `Tizen CLI 2.5.25`.
- `npm run build:tizen-image` und `npm run build:tizen` erfolgreich.
- Unsigned WGT auf ZIP-Integrität, Konfiguration und erforderliche Assets geprüft.
- SDB verbindet aus dem Container zu `192.168.177.137:26101` und erkennt
  `GU55DU7170UXZG`; Gerätefähigkeiten konnten gelesen werden.
- Build und WGT-Integrität erneut vollständig im SDK-Container geprüft.
- Elf Headless-Tests der Samsung-Playerlogik auch unter Linux/AMD64 im
  SDK-Container mit ergänztem Node.js 22 bestanden. Das reguläre SDK-Image
  enthält noch kein Node.js; für diese Prüfung wurde lokal ein separates
  `free-videowall/tizen-check:10.0` aus dem SDK-Image und dem Node-Binary von
  `node:22-bookworm-slim` gebaut.
- Samsungs offizieller `cert-manager-cli.js` aus `tizen-agent-skills` erkennt
  im Prüfcontainer SDK und Datenvolume, listet Profile und liest die DUID des
  angeschlossenen TVs erfolgreich aus. Zusätzlich zur älteren `tizen`-CLI ist `tz 10.0.2` vorhanden.
- Das optionale Zertifikatsimage ergänzt den fehlenden Secret Service und
  einen Callback-Proxy. Host-zu-Container-Loopback und der offizielle
  Samsung-Passwortspeicher wurden mit wegwerfbaren Testdaten geprüft;
  der verschlüsselte Keyring überlebt den Ersatz des Containers.
- Samsung-Autor- und Distributorzertifikate im aktiven Profil
  `FreeVideowallSamsung` vorhanden. Signierung erfolgreich; ZIP-Integrität und
  die 17 Dateireferenzen beider Paketsignaturen geprüft.
- Signiertes Paket auf `GU55DU7170UXZG` unter `192.168.177.137:26101`
  erfolgreich installiert und gestartet. USB-M3U und referenzierte MP4 werden
  gelesen; Videowiedergabe am Bildschirm bestätigt. Nach Stickwechsel und
  Schließen des Samsung-USB-Browsers mit Zurück startet die Wiedergabe ohne
  App-Neustart erneut.
  Eine Kopie des signierten Pakets liegt unter `dist/free-videowall-tizen.wgt`.
- Lokaler Stand: 16 Headless-Tests und SDK-Build erfolgreich. Zusätzliche
  USB-Fehlertexte und ein geänderter Übergangsablauf sind in Version 0.1.1 enthalten.
  Der Übergang hält das Endbild über zwei Renderzyklen vor dem Decoderwechsel
  und blendet erst bei positiver Wiedergabezeit aus. Zusätzlich hält AVPlay
  den Displaypuffer per Video Still Mode; normale Schleifen zeigen keine
  Suchmeldung. Der temporäre Still-Mode-Test beseitigte laut Nutzer die
  vollständige Schwarzphase. Nach Unterdrücken der Suchmeldung bestätigt der
  Nutzer auch die Schleife ohne erkennbaren schwarzen Balken. Das bestätigt
  den temporären Einzelvideo-Test, noch keine gemischten Übergänge.
  Signiertes WGT als Version 0.1.1 dauerhaft installiert. Nach frischem Start
  meldet die App 0.1.1 und PLAYING; beide Änderungen sind im geladenen Source
  vorhanden, ohne die temporären Test-Patches. Ein kompletter 30-Sekunden-Loop
  bestätigt PLAYING nach dem Wechsel, ein gehaltenes 1280-Pixel-Endbild und
  keine sichtbare Suchmeldung laut DOM-Protokoll. Anschließend normal gestartet.
- Noch nicht geprüft: gemischte Bild-/Videoplaylists, sichtbare Übergänge,
  weitere Modellgruppen und Dauerbetrieb.

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
