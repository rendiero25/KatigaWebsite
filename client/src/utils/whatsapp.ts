// Used when the CMS has no number yet, so WhatsApp links never render dead.
export const FALLBACK_WHATSAPP = '+62 821-7402-8363';

// wa.me needs a bare international number: +62 821-7402-8363 -> 6282174028363.
export function toWaNumber(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.startsWith('62')) return digits;
  if (digits.startsWith('0')) return `62${digits.slice(1)}`;
  return digits;
}
