# Roku Store publishing status

## English

The GitHub source and sideload ZIP are a development preview. They are not an approved Roku Store release. A ZIP on GitHub is not a Store installation.

The route to a regular installation is:

1. Use the owner's Roku developer account and create an App/Utility, without monetization.
2. Create the required signing key and signed Roku package on a developer-enabled device. Keep the key and credentials private for future updates.
3. Prepare English/German names and descriptions, neutral artwork, screenshots, support contact, privacy-policy URL and terms URL. Draft copy: [store listing](store-listing.md). Project privacy information: [privacy](privacy.md); software terms: [Apache-2.0](../LICENSE). These are inputs, not a completed Dashboard submission.
4. Use a beta app for device testing, then submit a public app with the signed package, Static Analysis and applicable App Behavior Analysis tests.
5. Complete Roku review before advertising a Store installation link.

Before submission, resolve these current implementation conflicts with Roku or adapt the Store build:

- Back-to-exit and playback keys are implemented; Options is passed to Roku and the video receives focus. Confirm this behavior on the device, including after images and paused playback. No custom controls or menus are added.
- The preview suppresses the screensaver continuously. Review Roku's screensaver policy, especially for images and idle states; do not assume this behavior will be approved.
- The preview starts playback immediately. Respect the device's autoplay accessibility preference or obtain confirmation of applicability to this USB utility.
- Agree a usable USB test procedure with Roku, check required media/utility exemptions, provide appropriate launch/error feedback, and test the mixed image/video playlist on more devices. USB support is device-specific.
- Improve preparation: the video blend currently needs FFmpeg-generated sidecar images. That is a real extra user step, not a one-click consumer setup.

No Store application or beta has been submitted by this repository setup. The running local prototype is not changed to meet certification without testing.

Official sources, checked 2026-11-14:

- [App publishing](https://developer.roku.com/dev/docs/channel-publishing-guide)
- [Certification criteria, especially 4.4–4.8](https://developer.roku.com/dev/docs/certification)
- [Autoplay policy](https://developer.roku.com/dev/docs/autoplay)
- [Packaging apps](https://developer.roku.com/dev/docs/packaging-channels)

## Deutsch

Quellcode und Installations-ZIP auf GitHub sind eine Entwicklungsversion, noch keine freigegebene Store-App. Ein GitHub-ZIP ersetzt keine Store-Installation.

Für eine normale Installation brauchen wir dein Roku-Entwicklerkonto, eine App als kostenloses App/Utility, einen privaten Signaturschlüssel und ein signiertes Paket. Hinzu kommen EN/DE-Beschreibungen, neutrale Grafiken, Screenshots, Support-Kontakt sowie Datenschutz- und Nutzungsbedingungen-URLs. Dann Beta-Gerätetests, die vorgeschriebenen Analyseprüfungen und Roku-Freigabe für die öffentliche App.

Vorher müssen wir Zurück-/Options-Taste, Autoplay-Einstellung und die dauerhafte Bildschirmschonersperre mit den Store-Regeln in Einklang bringen. Außerdem: USB-Testverfahren für die Prüfung klären, gemischte Bilder/Videos auf weiteren Geräten testen und die Vorbereitung der Blendenbilder vereinfachen. Das benötigte FFmpeg-Hilfsprogramm ist derzeit ein zusätzlicher Nutzerschritt.

Eine Store- oder Beta-Einreichung wurde noch nicht vorgenommen. Die laufende lokale App wurde hierfür nicht umgestellt. Die oben verlinkten offiziellen Roku-Seiten beschreiben den aktuellen Prozess.

Release preparation is automated; see [automation](automation.md). / Die Release-Vorbereitung ist automatisiert; siehe [Automatisierung](automation.md#deutsch).
