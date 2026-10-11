# Android app packaging (Trusted Web Activity)

This wraps the existing Quiet Scribe PWA. It does **not** replace the website, rooms, or saved-writing logic.

## Fixed app identity

- App name: `The Quiet Scribe`
- Android package ID: `studio.quietscribe.app`
- PWA: https://the-quiet-scribe.pages.dev/
- Web manifest: https://the-quiet-scribe.pages.dev/manifest.webmanifest
- Bubblewrap configuration: `android/twa-manifest.json`
- Build workflow: `.github/workflows/android-twa.yml`

Keep the package ID unchanged after the first store release. Changing it later creates a different Android app.

## Automated test build

The GitHub Actions workflow builds the Android project on a hosted runner. It runs when the Android TWA configuration or workflow changes, or can be started from the repository's **Actions → Quiet Scribe Android TWA → Run workflow** page.

When no persistent signing-key secrets are configured, the workflow creates a temporary signing key and uploads an installable **test APK** as the `quiet-scribe-test-apk` artifact. The artifact is retained for 14 days. Download it from the successful workflow run's **Artifacts** section.

This test APK is **not a Play Store release**. The signing key is temporary, so future builds will not be able to update that installation. Without a matching Digital Asset Links file, Chrome may show browser UI around the website.

## Setting up a persistent release key

Never place a keystore or signing passwords in the repository or chat. For repeatable releases, create and safely back up a release keystore, then set these GitHub Actions repository secrets under **Settings → Secrets and variables → Actions**:

- `ANDROID_KEYSTORE_BASE64`: the keystore file encoded as one Base64 string
- `ANDROID_KEYSTORE_PASSWORD`: the keystore password
- `ANDROID_KEY_PASSWORD`: the key password

The configured key must contain an alias named `android`, matching `android/twa-manifest.json`. The workflow uses this persistent key for signed APK/AAB builds and prepares a Digital Asset Links file. Only use this release path after confirming the signing certificate is the certificate Android will use to verify the installed app, especially when Google Play App Signing is enabled.

## Domain verification

A Trusted Web Activity needs Digital Asset Links to open in verified fullscreen mode:

`https://the-quiet-scribe.pages.dev/.well-known/assetlinks.json`

The JSON must contain the exact package ID and the SHA-256 fingerprint of the certificate Android uses for the installed app. Do not publish a placeholder or a test-key fingerprint for a store release.

## Release checklist

- [ ] Build and install the test APK on an Android device.
- [ ] Verify the PWA loads, saved writing remains intact, and offline behavior works as expected.
- [ ] Back up the persistent release keystore securely.
- [ ] Confirm the actual app-signing certificate and generate the matching Digital Asset Links file.
- [ ] Verify the deployed `/.well-known/assetlinks.json` URL.
- [ ] Build the signed AAB and test it through an internal testing track before any public release.
- [ ] Complete the app-store account and listing requirements.

The web app remains the source of truth; the Android package is a wrapper around it.
