# Interconsulting Instagram Posts — Design Specification

## Scope

Create two publish-ready Instagram portrait posts at a 3:4 aspect ratio for `@interconsulting.id`, following the supplied Interconsulting references.

## Approved Visual Direction

Use an editorial business-photography direction with Indonesian professionals. Each post uses a full-frame, title-relevant photograph rather than a plain color background. Apply a warm beige-to-charcoal overlay only to preserve the existing feed tone and ensure text readability.

## Post 1

Headline, rendered in uppercase:

`KALAU ANDA LIBUR 30 HARI, BISNIS TETAP JALAN?`

Image concept: an Indonesian business owner is absent from the primary workspace while a professional team continues operating calmly and systematically. The scene should communicate that the company runs through systems rather than depending on one person.

## Post 2

Headline, rendered in uppercase:

`BISNIS ANDA SEDANG BERTUMBUH... ATAU HANYA SEMAKIN SIBUK?`

Image concept: Indonesian professionals in an active business environment with laptops, reports, and team discussion. The composition should contrast high activity with measured, sustainable growth.

## Deterministic Brand Layers

- Use the user-supplied Interconsulting logo file as-is, including the symbol, `INTERCONSULTING`, and `FINANCIAL CONSULTING`.
- Place the complete logo at the upper left, consistent with the supplied references.
- Render the headline in bold white uppercase sans-serif type in the lower portion of the image.
- Place `@interconsulting.id` at the lower left, matching the references.
- Keep all copy, logo placement, dimensions, and safe zones outside ImageGen so they remain exact.

## Generated Photography Layer

- ImageGen produces photography only.
- No generated text, logos, charts, UI, numbers, or watermarks.
- Reserve clear negative space in the upper-left logo area and lower-left headline/handle area.
- Use natural editorial lighting, realistic Indonesian professional subjects, and premium corporate photography.

## Output

- Two final fixed-size PNG files at 1080 × 1440 pixels.
- Separate generated background layers and final composites.
- Validate exact text, logo integrity, handle placement, contrast, dimensions, and crop before handoff.

## Source Provenance

- Brand references and logo: supplied by the user.
- Photography layers: generated with ImageGen.
- Text, logo, overlays, sizing, and final composition: deterministic local rendering.
