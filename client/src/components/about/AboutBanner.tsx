import api from '../../services/api';

interface Props {
  image?: string;
  quote?: string;
  label?: string;
}

export default function AboutBanner({ image, quote, label }: Props) {
  return (
    <section className="h-[440px] relative overflow-hidden bg-[#F9F7F2]">
      {image ? (
        <img
          src={api.getImageUrl(image)}
          alt={label || quote || ''}
          className="absolute inset-0 w-full h-full object-cover"
        />
      ) : null}

      {quote ? (
        <div className="absolute inset-0 bg-black/30 flex flex-col items-center justify-center text-center px-4">
          {label ? (
            <span className="uppercase tracking-[0.18em] text-[13px] text-white/80 mb-4">
              {label}
            </span>
          ) : null}
          <p className="text-xl md:text-2xl text-white max-w-3xl">{quote}</p>
        </div>
      ) : null}
    </section>
  );
}
