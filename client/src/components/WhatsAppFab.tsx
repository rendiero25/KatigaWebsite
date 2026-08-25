import { FaWhatsapp } from 'react-icons/fa';

import { useContactInfo } from '../hooks/useApi';

interface ContactInfo {
  whatsapp?: string;
}

// Used when the CMS has no number yet, so the button never renders a dead link.
const FALLBACK_NUMBER = '0821-2233-8226';

// wa.me needs a bare international number: 0821-2233-8226 -> 6282122338226.
const toWaNumber = (raw: string) => {
  const digits = raw.replace(/\D/g, '');
  if (digits.startsWith('62')) return digits;
  if (digits.startsWith('0')) return `62${digits.slice(1)}`;
  return digits;
};

export default function WhatsAppFab() {
  const { data } = useContactInfo();
  const number = toWaNumber((data as ContactInfo | null)?.whatsapp || FALLBACK_NUMBER);

  if (!number) return null;

  return (
    <a
      href={`https://wa.me/${number}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Hubungi kami lewat WhatsApp"
      className="fixed bottom-5 right-5 z-40 flex h-14 w-14 items-center justify-center bg-[#25D366] text-white shadow-sm transition-colors hover:bg-[#1DA851] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#25D366]"
    >
      <FaWhatsapp className="h-7 w-7" />
    </a>
  );
}
