# Detection Upload Extension

MV3 scaffold for a cross-browser media forensics extension.

## Run

This repository has no build step. Load the folder directly as an unpacked extension.

### Chrome or Chromium

1. Open `chrome://extensions`.
2. Turn on Developer mode.
3. Click Load unpacked and select this repository folder.
4. Open the extension popup from the toolbar icon.

### Firefox

1. Open `about:debugging#/runtime/this-firefox`.
2. Click Load Temporary Add-on.
3. Select `manifest.json` from this repository.
4. Open the extension popup from the toolbar area.

## Test

Use a local page with visible tab metadata and try the popup flow end to end.

1. Open a page with a title and some media content.
2. Open the extension popup and confirm the URL, title, and timestamp fields populate.
3. Click Start capture and confirm the status changes in the popup.
4. Check the background service worker and page console for any runtime errors.
5. If you have a backend wired up, verify the multipart upload receives the `media` blob and `metadata` payload.

## Layout

- `manifest.json` declares the extension surface for Chrome and Firefox.
- `popup/` contains the Cyber-Forensics UI shell.
- `scripts/background.js` hosts the service worker message router and upload stubs.
- `offscreen/` contains the isolated DOM-dependent recording helper.

## Notes

The current code is a working scaffold with stubbed capture and delivery flows. Update the API endpoint and token source before shipping it against a real backend.
