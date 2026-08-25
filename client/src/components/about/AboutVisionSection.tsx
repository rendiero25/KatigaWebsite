import api from '../../services/api';

interface Props {
  title?: string;
  content?: string;
  backgroundImage?: string;
}

// Renders the panel only. AboutUs pairs it with AboutValuesSection in one grid
// row, so the section wrapper and container live there.
export default function AboutVisionSection({ title, content, backgroundImage }: Props) {
  if (!content) return null;

  const onPanel = Boolean(backgroundImage);

  return (
    <div className="relative flex h-full items-center overflow-hidden rounded-md md:min-h-[400px]">
      {backgroundImage && (
        <img
          src={api.getImageUrl(backgroundImage)}
          alt=""
          aria-hidden="true"
          loading="lazy"
          decoding="async"
          className="absolute inset-0 w-full h-full object-cover"
        />
      )}

      <div className="relative w-full px-6 py-14 md:px-10">
        <span
          className={`uppercase tracking-[0.18em] text-[13px] mb-8 block text-center ${
            onPanel ? 'text-white/80' : 'text-[#6F6F71]'
          }`}
        >
          {title || 'Vision'}
        </span>

        {/* Not a heading: the copy carries its own emphasis caps, which the
            global uppercase rule on h1-h6 would flatten. */}
        <p
          className={`mx-auto max-w-xl text-center text-xl md:text-2xl leading-relaxed text-balance ${
            onPanel ? 'text-white' : 'text-[#1E1E1E]'
          }`}
        >
          {content}
        </p>
      </div>
    </div>
  );
}
