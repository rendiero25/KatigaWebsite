# Auth Website Link Design

## Goal

Add an obvious route back to the public website from the customer login and registration pages.

## Design

- Add a React Router `Link` to both `Masuk.tsx` and `Daftar.tsx`.
- Use the label `Kembali ke Website` and a small external-direction arrow icon.
- Route the link to `/` without reloading the application.
- Position it at the upper-right of the form panel on desktop and mobile.
- Use neutral text with a brand-color hover state so the link remains secondary to the authentication form.
- Preserve the existing authentication flow, API behavior, animations, and responsive two-column layout.

## Accessibility and Responsiveness

- Keep the full descriptive label visible instead of relying on an icon alone.
- Provide a visible keyboard focus state.
- Give the form panel enough top spacing so the link cannot overlap the heading on narrow screens.

## Verification

- Run `cd client && npx tsc -b`.
- Run `cd client && npm run lint`.
- Confirm `/masuk` and `/daftar` display the link in the upper-right and that selecting it navigates to `/`.
