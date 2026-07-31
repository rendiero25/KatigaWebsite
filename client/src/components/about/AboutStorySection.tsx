interface Props {
  history?: string;
}

export default function AboutStorySection({ history }: Props) {
  if (!history) return null;

  return (
    <section className="py-16 bg-white">
      <div className="container mx-auto px-4 sm:px-10 lg:px-20 xl:px-30">
        <div className="max-w-3xl mx-auto text-center">
          <span className="uppercase tracking-[0.18em] text-[13px] text-[#6F6F71] mb-4 block">
            Cerita Kami
          </span>
          <p className="text-sm text-[#6F6F71] leading-relaxed">{history}</p>
        </div>
      </div>
    </section>
  );
}
