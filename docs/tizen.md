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

## Lokal prüfen und vorbereiten

Node.js 18+ und Python 3.9+:

```sh
npm run test:tizen
node --check platforms/tizen/js/app.js
npm run build:tizen
```

`dist/tizen/` enthält ausschließlich die App, Lizenztexte und das gemeinsame
Icon. Das ist **noch kein installierbares, signiertes WGT**. Zertifikate und
lokale SDK-Dateien gehören nicht ins Repository.

## Auf dem eigenen TV installieren

Benötigt Samsung Tizen Studio mit TV-Erweiterung und Samsung Certificate
Extension sowie ein Samsung-Zertifikatsprofil mit der DUID des Testfernsehers.
Auf diesem Entwicklungsrechner sind `tizen` und `sdb` derzeit nicht im PATH.

1. Am TV den Entwicklermodus aktivieren, die IP des Entwicklungsrechners
   eintragen und den TV nach Samsung-Anleitung neu starten. TV und Rechner
   müssen sich erreichen können.
2. Mit dem TV verbinden und den Zielnamen ermitteln:

   ```sh
   sdb connect TV_IP:26101
   tizen list target
   ```

3. Samsung-Zertifikatsprofil erstellen und die Installation für den TV erlauben.
   `dist/tizen` als bestehendes Web-App-Projekt in Tizen Studio verwenden oder
   mit der CLI bauen und mit dem eigenen Profil signieren:

   ```sh
   tizen build-web -- dist/tizen
   tizen package -t wgt -s DEIN_PROFIL -- dist/tizen/.buildResult
   tizen install -n FreeVideowall.wgt -t DEIN_TV -- dist/tizen/.buildResult
   tizen run -p FreeVidWal.Player -t DEIN_TV
   ```

   Beim Installieren `FreeVideowall.wgt` durch den tatsächlich erzeugten
   Paketdateinamen ersetzen. Diese Schritte wurden hier mangels SDK/TV nicht
   ausgeführt. SDK-Oberflächen nur in einer Offstage-Sitzung öffnen.

4. Einen vom TV lesbaren USB-Stick mit `playlist.m3u`, einem kurzen H.264/AAC-
   MP4 und einem JPG vorbereiten. Beide Dateien über relative Pfade referenzieren.
   Für Videoblenden auf dem Rechner mit installiertem FFmpeg vorbereiten:

   ```sh
   python3 scripts/prepare_usb.py /Volumes/DEIN_STICK/playlist.m3u
   ```

   Das Skript legt die Hilfsbilder neben die Videos auf den Stick. Bilder
   benötigen keine Vorbereitung.

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
