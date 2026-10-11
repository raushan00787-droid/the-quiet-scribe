# The Quiet Scribe app MVP

A separate, static-first Progressive Web App (PWA) prototype in `/app`. It does not replace the existing website root.

## MVP features
- Writer's Room, Thinker's Room, and Reader's Room
- Create, edit, and delete writing
- Search notes within the selected room
- Local browser storage (localStorage)
- Export notes as a JSON backup
- Responsive layout for mobile and desktop
- Web app manifest and service worker for installation/offline shell

## Try it
Serve this directory over HTTPS or localhost. Opening `index.html` directly as a file will not enable service-worker installation. On a deployed preview, open the `/app/` path and use the browser's install option if available.

## Important limitations
- Writing is stored only in that browser/device. It does not sync between devices.
- Exported JSON files can contain private writing. Store them carefully.
- The service worker caches the app shell; test offline behavior on actual devices before calling it production-ready.
- This is the first MVP branch, not a release of the live website.

## Next steps
1. Test create/edit/delete/search/export on desktop and Android.
2. Validate offline behavior and storage edge cases.
3. Add import/restore and accessibility checks.
4. Decide whether to wrap the PWA with Capacitor for an Android APK or prepare a Play Store release.
