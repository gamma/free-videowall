# Release automation / Veröffentlichung automatisieren

## English

### Available now: GitHub preview releases

Push a version tag matching both `manifest` and `package.json`, for example `v1.0.7`. The **Release preview** workflow installs locked dependencies, checks BrightScript, tests the playlist parser, builds the public ZIP, verifies version/assets/license/private-frame exclusion and publishes a GitHub **prerelease** with SHA-256 checksum.

No developer password, private media, signing key or Roku account is needed for this workflow. Existing releases are preserved. Pull requests never publish releases.

To test without publishing: Actions → Release preview → Run workflow → choose an existing tag → leave **publish** off. This produces a build artifact only. A green workflow verifies preparation; it is not Store approval or a TV visual test.

### Roku Beta automation: account setup required

Roku's early-adopter App Manager API documents beta package uploads and beta publishing using signed JWTs. Availability must be confirmed in your Developer Dashboard: **Account → API access**. It is limited to beta channels; it is not a documented production Store-publish API.

Before wiring this up, we need the beta Channel ID, access to API key creation and a private API signing key. Do not paste private keys into an issue or commit them. Store CI credentials as GitHub Actions secrets. The App Manager API key is separate from the device's developer password and the app's package-signing password. Its documented lifetime is 90 days, so key renewal is part of the setup.

A Store package normally needs to be generated on a linked, online Roku development device, using a persistent signing key. A GitHub-hosted runner cannot directly reach a TV on a private home LAN. Device packaging needs a local step or a configured local runner; no local runner or Roku Beta upload is configured yet.

Public Store release still needs the Developer Dashboard, applicable tests and Roku review. The screensaver/autoplay policy questions in [publishing](publishing.md) remain open.

Sources: [Roku packaging](https://developer.roku.com/dev/docs/packaging-channels), [app publishing](https://developer.roku.com/dev/docs/channel-publishing-guide), [early-adopter App Manager API](https://roku-sdk-docs.s3.amazonaws.com/early-adopter-docs/App%20Manager%20API/App%20Manager%20API.pdf).

## Deutsch

### Bereits eingerichtet: GitHub-Vorschau

Ein Versions-Tag wie `v1.0.7`, passend zu Manifest und `package.json`, startet **Release preview**: Compilerprüfung, Playlist-Tests, öffentlicher Build, Versions-/Paketprüfung und GitHub-Vorschau mit Prüfsumme. Vorhandene Releases bleiben erhalten. Pull Requests veröffentlichen nichts.

Ohne Veröffentlichung testen: Actions → Release preview → Run workflow → bestehenden Tag wählen → **publish** ausgeschaltet lassen. Ergebnis ist ein Build-Artefakt. Roku-Zugangsdaten sind dafür nicht erforderlich.

### Roku-Beta: Kontozugang noch offen

Rokus App Manager API beschreibt automatisierte Beta-Uploads und Beta-Veröffentlichungen. Zuerst muss **Account → API access** im Entwicklerkonto verfügbar sein. Danach brauchen wir Beta-Channel-ID und API-Schlüssel; private Schlüssel werden als GitHub-Secrets hinterlegt, nicht ins Repo oder in öffentliche Issues. Gerätepasswort, Paketsignatur und API-Schlüssel sind drei verschiedene Zugangsdaten. Laut Dokumentation laufen API-Schlüssel nach 90 Tagen ab.

Die Paketsignierung erfolgt auf einem verknüpften, online erreichbaren Roku mit dauerhaftem Signaturschlüssel. Dafür benötigen wir einen lokalen Schritt oder einen lokalen Runner; ein GitHub-Cloud-Runner erreicht den TV im Heimnetz nicht direkt. Lokaler Runner und Roku-Beta-Upload sind noch nicht eingerichtet.

Für den öffentlichen Store bleiben Dashboard-Einreichung, erforderliche Prüfungen und Rokus Freigabe nötig. Eine Store-Publish-API ist durch die verlinkte Beta-Dokumentation nicht belegt. Die offenen Autoplay-/Bildschirmschonerpunkte gelten weiterhin.
