# CWS Submission Checklist

## Before Upload

1. **Bump version** in `manifest.json` — already at 2.1.0
2. **Run tests**: `npm test` (all 23 should pass)
3. **Package extension**: `cd scripts && bash package.sh`

## On the Chrome Web Store Dashboard

### Required Info
- **Description**: "Replace browser error pages with Star Wars prequel memes."
- **Category**: Fun / Entertainment

### Privacy
- **No user data collected.** The extension only caches HTTP status codes locally in `chrome.storage.session` (ephemeral, cleared on browser restart). No data is sent to any server.
- **No analytics, no external requests, no user tracking.**
- Set "This extension does not collect or use your personal data" in the dashboard.

### Host Permissions Justification
- The extension requests `http://*/*` and `https://*/*` to detect error pages on any domain. This is required because error pages can appear on any site. The extension does not read or modify page content except to overlay an image on error responses (3xx/4xx/5xx).

### Store Assets
- **Screenshots**: Use images from `img/screenshot_*.png` (available for 308, 400, 403, 404, 417, 500, 503)
- **Small promo tile**: Can reuse `img/icon128.png`
- **Large promo tile**: Create a 920x680 image (the `img/screenshot_*.png` files can work after cropping)

### Submission Flow
1. Go to https://chrome.google.com/webstore/devconsole
2. Click your PrequelErrorCodes listing
3. Click "Upload updated package"
4. Select the generated `prequel-error-codes.zip`
5. Verify the new version number appears
6. Submit for review
7. Review typically takes 1-3 business days

## Post-Submission
- If rejected, check the reviewer's note. The most common issue is permission scope — you may need to narrow `host_permissions` or switch to optional permissions (`optional_host_permissions`).
