<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/0b350c81-98ca-41de-97e9-ee7ef857209a

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Versions and rollback

Stable versions use [Semantic Versioning](https://semver.org/) and are recorded in
[CHANGELOG.md](CHANGELOG.md). Each stable release is also marked by a Git tag
such as `v0.1.0`.

To return to a previous stable version, check out its tag locally or ask the
project maintainer to restore that version. Do not edit a release tag after it
has been published; publish a new version instead.
