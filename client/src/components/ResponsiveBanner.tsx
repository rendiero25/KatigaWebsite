import type { ReactNode } from 'react';

import api from '../services/api';

interface Props {
  image?: string;
  alt?: string;
  children?: ReactNode;
  className?: string;
}

const PLACEHOLDER_HEIGHT = 'h-[320px] md:h-[440px]';

// Every public banner reads the same way: edge to edge at all widths, with the
// height following the image's own ratio below xl and settling into a fixed
// 440px band from xl up. Overlay content is positioned by the caller.
export default function ResponsiveBanner({ image, alt = '', children, className = '' }: Props) {
  return (
    <section className={`relative overflow-hidden bg-[#F9F7F2] xl:h-[440px] ${className}`}>
      {image && (
        <img
          src={api.getImageUrl(image)}
          alt={alt}
          className="block w-full h-auto xl:h-full xl:object-cover"
        />
      )}
      {!image && !children && <div className={PLACEHOLDER_HEIGHT} />}
      {children}
    </section>
  );
}
