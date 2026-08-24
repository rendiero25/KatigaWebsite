import ResponsiveBanner from '../ResponsiveBanner';

interface Props {
  image?: string;
  quote?: string;
  label?: string;
  boxed?: boolean;
}

export default function AboutBanner({ image, quote, label, boxed }: Props) {
  if (!image && !quote) {
    return null;
  }

  return (
    <ResponsiveBanner image={image} alt={label || quote || ''} boxed={boxed}>
      {quote && (
        <div
          className={`absolute inset-0 flex flex-col items-center justify-center text-center px-4 ${
            image ? 'bg-black/30' : ''
          }`}
        >
          {label && (
            <span
              className={`uppercase tracking-[0.18em] text-[13px] mb-4 ${
                image ? 'text-white/80' : 'text-[#6F6F71]'
              }`}
            >
              {label}
            </span>
          )}
          <p
            className={`text-xl md:text-2xl max-w-3xl ${image ? 'text-white' : 'text-[#1E1E1E]'}`}
          >
            {quote}
          </p>
        </div>
      )}
    </ResponsiveBanner>
  );
}
