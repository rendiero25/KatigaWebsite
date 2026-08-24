import type { ReactNode } from 'react';

import api from '../services/api';

interface Props {
  image?: string;
  alt?: string;
  children?: ReactNode;
  className?: string;
  /** Keeps the image boxed to the page container at every breakpoint instead of going full-bleed from xl up. */
  boxed?: boolean;
}

const HEIGHT = 'h-[320px] md:h-[440px]';

export default function ResponsiveBanner({ image, alt = '', children, className = '', boxed = false }: Props) {
  return (
    <section className={`relative ${HEIGHT} overflow-hidden bg-[#F9F7F2] ${className}`}>
      {image && (
        <div
          className={
            boxed
              ? 'container mx-auto h-full px-4 sm:px-10 lg:px-20 xl:px-30'
              : 'container mx-auto h-full px-4 sm:px-10 lg:px-20 xl:px-0 xl:max-w-none'
          }
        >
          <img
            src={api.getImageUrl(image)}
            alt={alt}
            className={`w-full h-full object-contain ${boxed ? '' : 'xl:object-cover'}`}
          />
        </div>
      )}
      {children}
    </section>
  );
}
