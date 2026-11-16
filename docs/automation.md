# Release automation / Veröffentlichung automatisieren

## English

### LG Homebrew tag build

Tags containing the webOS player now also run its tests and build an LG IPK
using the tag version. The same GitHub prerelease and `SHA256SUMS` include this
artifact. A rooted LG TV, Homebrew Channel and service elevation are required;
this is not an LG Content Store release or a Homebrew catalog submission.
See [webOS build and installation](webos.md#tag-builds-and-github-releases).
Branch CI uploads an IPK artifact too. No TV connection or signing secrets are
needed for these builds.

### Available now: GitHub preview releases

Push a version tag matching both `manifest` and `package.json`, for example `v1.0.7`. The **Release preview** workflow installs locked dependencies, checks BrightScript, tests the playlist parser, builds the public ZIP, verifies version/assets/license/private-frame exclusion and publishes a GitHub **prerelease** with SHA-256 checksum.

After successful release checks, the same workflow deploys the EN/DE website from that tag to [GitHub Pages](https://videowall.gh.gammaproduction.de/). The release also includes `store-assets.zip` with EN/DE listing text and public artwork. Branch pushes and dry runs do not deploy the website.

No developer password, private media, signing key or Roku account is needed for this workflow. Existing releases are preserved. Pull requests never publish releases.

To test without publishing: Actions → Release preview → Run workflow → choose an existing tag → leave **publish** off. This produces a build artifact only. A green workflow verifies preparation; it is not Store approval or a TV visual test.

### Samsung preview artifact

Tags containing `platforms/tizen/config.xml` additionally run the Samsung player
and public-package tests, build with the Tizen SDK 10 Docker image, and attach
`free-videowall-tizen-unsigned.wgt` to both the Actions artifact and GitHub
prerelease. `SHA256SUMS` includes the WGT. Older tags without Samsung source
retain the Roku-only behavior. No certificates or signing secrets enter CI.
The public-package check rejects device signatures, unexpected files and stale
source. Existing releases are preserved; this does not add assets retroactively.

The WGT is **unsigned and not directly installable**. Extract it into an empty
directory and sign/package that directory with your own Samsung certificate
profile for the target TV; see [Tizen setup](tizen.md). It is not Samsung Store
approval. The Tizen package version comes from `platforms/tizen/config.xml` and
is independent of the project tag's Roku/package.json version. Tags must contain
this workflow change for automatic publishing. This does not merge a feature
branch or create a tag automatically.

### Roku Beta automation: account setup required

Roku's early-adopter App Manager API documents beta package uploads and beta publishing using signed JWTs. Availability must be confirmed in your Developer Dashboard: **Account → API access**. It is limited to beta channels; it is not a documented production Store-publish API.

Before wiring this up, we need the beta Channel ID, access to API key creation and a private API signing key. Do not paste private keys into an issue or commit them. Store CI credentials as GitHub Actions secrets. The App Manager API key is separate from the device's developer password and the app's package-signing password. Its documented lifetime is 90 days, so key renewal is part of the setup.

A Store package normally needs to be generated on a linked, online Roku development device, using a persistent signing key. A GitHub-hosted runner cannot directly reach a TV on a private home LAN. Device packaging needs a local step or a configured local runner; no local runner or Roku Beta upload is configured yet.

Public Store release still needs the Developer Dashboard, applicable tests and Roku review. The screensaver/autoplay policy questions in [publishing](publishing.md) remain open.

Sources: [Roku packaging](https://developer.roku.com/dev/docs/packaging-channels), [app publishing](https://developer.roku.com/dev/docs/channel-publishing-guide), [early-adopter App Manager API](https://roku-sdk-docs.s3.amazonaws.com/early-adopter-docs/App%20Manager%20API/App%20Manager%20API.pdf).

## Deutsch

### LG-Homebrew-Build bei Tags

Tags mit dem webOS-Player bauen zusätzlich das LG-IPK mit der Tag-Version und
führen die LG-Tests aus. IPK und SHA-256-Prüfsumme landen im selben GitHub-Release.
Die Installation benötigt einen gerooteten LG, Homebrew Channel und die
Diensterhöhung; eine Einreichung bei LG oder im Homebrew-Katalog erfolgt nicht.
Auch Branch-CI liefert ein IPK-Artefakt. Details: [webOS](webos.md#tag-builds-and-github-releases).

### Bereits eingerichtet: GitHub-Vorschau

Ein Versions-Tag wie `v1.0.7`, passend zu Manifest und `package.json`, startet **Release preview**: Compilerprüfung, Playlist-Tests, öffentlicher Build, Versions-/Paketprüfung und GitHub-Vorschau mit Prüfsumme. Vorhandene Releases bleiben erhalten. Pull Requests veröffentlichen nichts.

Nach erfolgreicher Paketveröffentlichung wird die EN/DE-Website vom selben Tag auf [GitHub Pages](https://videowall.gh.gammaproduction.de/) veröffentlicht. `store-assets.zip` enthält die Storetexte und öffentlichen Grafiken. Branch-Pushes und Trockenläufe veröffentlichen die Website nicht.

Ohne Veröffentlichung testen: Actions → Release preview → Run workflow → bestehenden Tag wählen → **publish** ausgeschaltet lassen. Ergebnis ist ein Build-Artefakt. Roku-Zugangsdaten sind dafür nicht erforderlich.

### Samsung-Artefakt

Tags mit `platforms/tizen/config.xml` erzeugen zusätzlich
`free-videowall-tizen-unsigned.wgt`: Player-Tests, öffentliche Paketprüfung und
Build im Tizen-SDK-10-Container. Das WGT landet im Actions-Artefakt und im
GitHub-Prerelease, inklusive Eintrag in `SHA256SUMS`. Ältere Tags ohne
Samsung-Code bleiben bei Roku. CI benötigt keine Zertifikate oder privaten
Schlüssel; Paketsignaturen, fremde Dateien und veraltete Quellen werden abgelehnt.
Bestehende Releases werden nicht verändert oder nachträglich ergänzt.

Das WGT ist **unsigniert und nicht direkt installierbar**. In ein leeres
Verzeichnis entpacken und mit dem eigenen Samsung-Zertifikatsprofil für den
Ziel-TV signieren/paketieren; siehe [Tizen-Anleitung](tizen.md). Es ist keine
Samsung-Store-Freigabe. Die Tizen-Paketversion aus `config.xml` ist unabhängig
von der Roku-/Projektversion des Tags. Der Tag muss den geänderten Workflow
enthalten; Feature-Branches werden nicht automatisch gemergt oder getaggt.

### Roku-Beta: Kontozugang noch offen

Rokus App Manager API beschreibt automatisierte Beta-Uploads und Beta-Veröffentlichungen. Zuerst muss **Account → API access** im Entwicklerkonto verfügbar sein. Danach brauchen wir Beta-Channel-ID und API-Schlüssel; private Schlüssel werden als GitHub-Secrets hinterlegt, nicht ins Repo oder in öffentliche Issues. Gerätepasswort, Paketsignatur und API-Schlüssel sind drei verschiedene Zugangsdaten. Laut Dokumentation laufen API-Schlüssel nach 90 Tagen ab.

Die Paketsignierung erfolgt auf einem verknüpften, online erreichbaren Roku mit dauerhaftem Signaturschlüssel. Dafür benötigen wir einen lokalen Schritt oder einen lokalen Runner; ein GitHub-Cloud-Runner erreicht den TV im Heimnetz nicht direkt. Lokaler Runner und Roku-Beta-Upload sind noch nicht eingerichtet.

Für den öffentlichen Store bleiben Dashboard-Einreichung, erforderliche Prüfungen und Rokus Freigabe nötig. Eine Store-Publish-API ist durch die verlinkte Beta-Dokumentation nicht belegt. Die offenen Autoplay-/Bildschirmschonerpunkte gelten weiterhin.
