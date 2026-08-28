import { FaWhatsapp } from 'react-icons/fa';

import { useContactInfo } from '../hooks/useApi';

import { FALLBACK_WHATSAPP, toWaNumber } from '../utils/whatsapp';

interface ContactInfo {
  whatsapp?: string;
}

export default function WhatsAppFab() {
  const { data } = useContactInfo();
  const number = toWaNumber((data as ContactInfo | null)?.whatsapp || FALLBACK_WHATSAPP);

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
