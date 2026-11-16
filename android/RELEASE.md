# Android release

`node scripts/build-android.mjs --setup` installs the official command-line SDK and
Gradle into ignored local tools, generates an ignored upload key once, and builds
a signed Android App Bundle and installable release APK from this native Trusted Web Activity shell. Later runs
reuse the tools/key. It requests Android SDK 37 and targets API 37; no native analytics,
advertising SDK or duplicate web framework is bundled. The website runs in the user's
verified browser, with the same responsive reader and authentication controls.

Outputs are `android/app/build/outputs/bundle/release/app-release.aab` for Play
Console and `android/app/build/outputs/apk/release/app-release.apk` for direct
installation. The shell launches the deployed HTTPS origin; installing it before
deploying this portal will open whatever the public domain currently serves.

Deploy the HTTPS website before distributing the app. `/.well-known/assetlinks.json`
must list the SHA-256 certificate of the key that signs the installed app. The build
script writes the local upload certificate fingerprint into the ignored deployment
environment. When using Google Play App Signing, replace/add it with the **app signing
certificate** from Play Console, then recreate the frontend container. Upload signing
and Play's distribution signing are separate; a made-up fingerprint cannot verify a TWA.

Keep `.local/android-upload` backed up privately. Never regenerate the upload key
for an existing release without arranging key rotation in Play Console. Increment
`--version-code` for each upload. The Play account owner must complete app signing,
store listing, content rating, Data safety, privacy URL and any account-specific
testing/review requirements. These external Play Console steps are not performed by
this repository or claimed as already approved.
