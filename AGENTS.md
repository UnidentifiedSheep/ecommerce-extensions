# Extensions

- Browser extensions live in `extensions/<name>/`; keep collectors self-contained for `chrome.scripting.executeScript`.
- Do not introduce backend access, credentials, automatic page collection, or persistent site permissions without an explicit request.
- Keep user-facing text in RU/EN/TR in the extension's messages module.
- Do not commit supplier page snapshots, account information, generated ZIPs, or dependency directories.
- Run `npm run check` after changes. Native Node tests and ZIP building need Node 22+, no npm dependencies.
- Use pull requests for changes after the initial repository migration; do not merge without the user's instruction.
- Bump `extensions/supplier-import/manifest.json` for a new release. A push changing it on `main` runs the release workflow.
- Keep the download asset name `supplier-import-extension.zip` stable. The frontend uses the latest-release URL.
- Never change the stable Firefox `gecko.id` after the first signed release. Firefox releases are unlisted AMO-signed XPI files; never rename an unsigned ZIP to XPI for installation.
- Keep AMO credentials only in repository Actions secrets (`AMO_JWT_ISSUER`, `AMO_JWT_SECRET`). `npm ci` installs the pinned release/lint tooling; native tests/build still need no installed dependencies.
- JSON formats are documented in `docs/json-contract.md`; coordinate breaking format changes with the frontend.
