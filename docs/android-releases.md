# Android releases with Codemagic

The repository contains three workflows in `codemagic.yaml`:

- `android-check`: runs on pushes to `main` or manually. Installs locked dependencies, runs frontend/Functions lint and all tests, builds Vite assets, syncs Capacitor, and compiles an **unsigned** AAB. This artifact is for build verification and cannot be uploaded to Google Play.
- `android-alpha`: runs manually or on an `android-v*` tag. Performs the same checks, signs with the configured upload key, increments the highest Google Play version code, verifies the certificate, and publishes to the existing closed-test **Alpha** track. Google review and device updates can take additional time.
- `android-signed-check`: manual verification of the same signing, Play access, tests and release bundle as `android-alpha`, with no publishing step. Use this to validate credentials while an upload-key reset is pending.

All use Node 22 and Java 21 on a Mac mini M2. Do not run concurrent publishing builds: both could read the same latest Play version code. Retry the losing build if Google rejects a duplicate version. The visible version name is maintained in `android/app/build.gradle`.

Android compiles and targets API 36 (Android 16), as required for Google Play updates from 31 August 2026. The build uses Capacitor 8's documented AGP 8.13.0 / Gradle 8.14.3 toolchain and AndroidX versions. See [Google Play target API requirements](https://support.google.com/googleplay/android-developer/answer/11926878) and the [Capacitor 8 migration guide](https://capacitorjs.com/docs/updating/8-0).

## One-time setup

1. Add `palomares96/aleman-flashcards-app` to the existing Codemagic GitHub installation and add it as an Android application in Codemagic.
2. Under account/team settings → Code signing identities → Android keystores, upload the Flashcards upload keystore. Reference: `aleman_upload`; alias: `aleman-key`. Enter its keystore and key passwords directly in Codemagic. Never commit the key or passwords.
3. The expected upload certificate SHA-256 is `A3:82:9F:74:6E:D4:54:5F:86:86:57:DE:7F:16:80:97:7A:D8:6E:09:BF:0E:DF:EC:63:60:22:33:1E:19:2A:B5`. The workflow fails before publishing if a different app's key is selected. This replacement key was prepared after the original keystore password was lost. **Before the first release with it, confirm Google Play has approved and activated the upload-key reset requested on 23 September 2026.** A successful `android-signed-check` only validates signing and API access; it does not establish that Play accepts the replacement certificate yet.
4. In this app's environment variables, create group `aleman_google_play` with secret `GOOGLE_PLAY_SERVICE_ACCOUNT_CREDENTIALS` containing a Google Play service-account JSON key. Grant that account only the app access and testing-release permissions required for `com.aleman.flashcards`; no account-wide admin or financial access is needed. Enable the Google Play Android Developer API in its Cloud project.
5. Run `android-check` to verify cloud compilation, then `android-alpha` to publish. The app already has an initial Play release, so a first manual upload is not needed.

Firebase client configuration is already tracked in `.env` and `android/app/google-services.json`. These are client identifiers, not administrative credentials. Native release builds explicitly disable emulator mode. The workflow rebuilds bundled assets from source; it does not reuse a developer's `dist` directory.

This pipeline publishes the Android client only. Firebase Functions, rules, and indexes have their own coordinated deployment procedure; a backend change must be deployed before publishing a client that requires it. The September 2026 backend rollout is already complete. Do not revert the restrictive identity/friendship rules to accommodate old clients.

Official references: [Android signing](https://docs.codemagic.io/yaml-code-signing/signing-android/), [Google Play publishing](https://docs.codemagic.io/yaml-publishing/google-play/), [workflow triggers](https://docs.codemagic.io/yaml-running-builds/starting-builds-automatically/).
