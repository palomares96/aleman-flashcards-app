# Android releases with Codemagic

The repository contains two workflows in `codemagic.yaml`:

- `android-check`: runs on pushes to `main` or manually. Installs locked dependencies, runs frontend/Functions lint and all tests, builds Vite assets, syncs Capacitor, and compiles an **unsigned** AAB. This artifact is for build verification and cannot be uploaded to Google Play.
- `android-alpha`: runs manually or on an `android-v*` tag. Performs the same checks, signs with the existing upload key, increments the highest Google Play version code, verifies the certificate, and publishes to the existing closed-test **Alpha** track. Google review and device updates can take additional time.

Both use Node 22 and Java 21 on a Mac mini M2. Do not run concurrent release builds: both could read the same latest Play version code. Retry the losing build if Google rejects a duplicate version. The visible version name is maintained in `android/app/build.gradle`.

## One-time setup

1. Add `palomares96/aleman-flashcards-app` to the existing Codemagic GitHub installation and add it as an Android application in Codemagic.
2. Under account/team settings → Code signing identities → Android keystores, upload the **existing** Flashcards upload keystore. Reference: `aleman_upload`; alias: `aleman-key`. Enter its original keystore and key passwords directly in Codemagic. Never commit the key or passwords.
3. The expected upload certificate SHA-256 is `CB:10:AA:7E:BD:2D:AF:C1:09:62:84:D1:03:04:4F:F0:0E:E5:C3:29:82:8B:28:BF:9E:0F:19:8C:4F:39:F6:EC`. The workflow fails before publishing if a different app's key is selected. If the original key is unavailable, complete Google's upload-key reset procedure before changing this fingerprint.
4. In this app's environment variables, create group `aleman_google_play` with secret `GOOGLE_PLAY_SERVICE_ACCOUNT_CREDENTIALS` containing a Google Play service-account JSON key. Grant that account only the app access and testing-release permissions required for `com.aleman.flashcards`; no account-wide admin or financial access is needed. Enable the Google Play Android Developer API in its Cloud project.
5. Run `android-check` to verify cloud compilation, then `android-alpha` to publish. The app already has an initial Play release, so a first manual upload is not needed.

Firebase client configuration is already tracked in `.env` and `android/app/google-services.json`. These are client identifiers, not administrative credentials. Native release builds explicitly disable emulator mode. The workflow rebuilds bundled assets from source; it does not reuse a developer's `dist` directory.

This pipeline publishes the Android client only. Firebase Functions, rules, and indexes have their own coordinated deployment procedure; a backend change must be deployed before publishing a client that requires it. The September 2026 backend rollout is already complete. Do not revert the restrictive identity/friendship rules to accommodate old clients.

Official references: [Android signing](https://docs.codemagic.io/yaml-code-signing/signing-android/), [Google Play publishing](https://docs.codemagic.io/yaml-publishing/google-play/), [workflow triggers](https://docs.codemagic.io/yaml-running-builds/starting-builds-automatically/).
