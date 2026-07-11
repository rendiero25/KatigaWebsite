# Catalog PDF Link Design

## Goal

Make the `Unduh Katalog` control on the Katalog page open the bundled KumaKuma catalog PDF in a new browser tab.

## Design

- Replace the JavaScript-driven download button with a semantic animated anchor.
- Link directly to `/Catalogue-KumaKuma.pdf`, which Vite serves from `client/public`.
- Open the document with `target="_blank"` and protect the opener context with `rel="noopener noreferrer"`.
- Preserve the existing button appearance, hover animation, tap animation, icon, and label.
- Remove the CMS file URL dependency, disabled state, and unavailable message for this control because the bundled PDF is always its source.
- Keep CMS catalog data in use for the title, description, background image, and card image.

## Error Handling

The link uses a static public asset and requires no client-side fetch or runtime error state. If the asset is absent from a deployment, the server will return its normal not-found response.

## Verification

- Confirm `client/public/Catalogue-KumaKuma.pdf` exists.
- Run `cd client && npx tsc -b`.
- Run `cd client && npm run lint`.
- Confirm the rendered link points to `/Catalogue-KumaKuma.pdf`, opens a new tab, and includes `noopener noreferrer`.
