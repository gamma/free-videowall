# Install / Installieren

## English

This is a development preview, not a Roku Store app yet. You need a Roku with a working USB port and USB media support, and a computer on the same local network.

1. Download `free-videowall.zip` from [Releases](https://github.com/gamma/free-roku-videowall/releases), or [build it](development.md). Keep the ZIP intact.
2. On the Roku remote press **Home three times, Up twice, Right, Left, Right, Left, Right**.
3. Enable the Development Application Installer, read the terms and set a password. The device restarts.
4. Open the Roku's IP address in your computer's browser. Sign in as `rokudev` with the password you just set.
5. Upload the ZIP and select **Install**. The app starts.
6. Prepare your USB stick as described in the [README](../README.md). Insert it and open the app.

**Roku permits only one sideloaded app at a time. Installing this preview replaces any existing sideloaded app.** It does not remove ordinary Store apps. Do not share your developer password or expose the installer to the internet.

If the screen stays black, check that the playlist is in the USB root, has real `.m3u` or `.m3u8` extension, and references files that exist. Try one H.264 MP4 first. The app silently retries every five seconds.

Official instructions: [Roku developer setup](https://developer.roku.com/dev/docs/developer-setup).

## Deutsch

Dies ist eine Entwicklungsversion, noch keine Roku-Store-App. Du brauchst einen Roku mit funktionierendem USB-Anschluss und USB-Medienunterstützung sowie einen Rechner im selben lokalen Netzwerk.

1. `free-videowall.zip` unter [Releases](https://github.com/gamma/free-roku-videowall/releases) herunterladen oder [selbst bauen](development.md). Nicht entpacken.
2. Auf der Roku-Fernbedienung **Home dreimal, Hoch zweimal, Rechts, Links, Rechts, Links, Rechts** drücken.
3. Development Application Installer aktivieren, Bedingungen lesen und Passwort setzen. Das Gerät startet neu.
4. Die IP-Adresse des Roku im Browser am Rechner öffnen. Benutzer `rokudev`, dazu das gerade gesetzte Passwort.
5. ZIP hochladen und **Install** auswählen. Die App startet.
6. USB-Stick wie in der [Anleitung](../README.de.md) vorbereiten, einstecken und App öffnen.

**Roku erlaubt nur eine gleichzeitig installierte Entwickler-App. Diese Vorschau ersetzt eine vorhandene Entwickler-App.** Normale Store-Apps bleiben erhalten. Entwicklerpasswort nicht weitergeben und den Installer nicht ins Internet freigeben.

Bleibt der Bildschirm schwarz: Playlist im Hauptverzeichnis? Endung wirklich `.m3u` oder `.m3u8`? Stimmen Dateinamen und Pfade? Zunächst ein einzelnes H.264-MP4 testen. Die App versucht es alle fünf Sekunden erneut.

Offiziell: [Roku-Entwicklermodus](https://developer.roku.com/dev/docs/developer-setup).
