import api from '../services/api';

interface InstagramPost {
  image: string;
  link: string;
}

interface Props {
  posts?: InstagramPost[];
}

// TODO(cms): sumber data IG (token Basic Display atau upload manual) menyusul
export default function InstagramSection({ posts }: Props) {
  const placeholders = Array.from({ length: 6 });

  return (
    <section className="pt-10 pb-20 bg-white">
      <div className="container mx-auto px-4 sm:px-10 lg:px-20 xl:px-30">
        <h2 className="text-center text-2xl md:text-3xl mb-12">Ikuti Kami di Instagram</h2>

        <div className="grid grid-cols-3 md:grid-cols-6 gap-1">
          {posts && posts.length > 0
            ? posts.map((post, index) => (
                <a
                  key={`${post.link}-${index}`}
                  href={post.link}
                  target="_blank"
                  rel="noreferrer"
                  className="aspect-square bg-[#F9F7F2] overflow-hidden block group"
                >
                  <img
                    src={api.getImageUrl(post.image)}
                    alt="Instagram post"
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-700"
                  />
                </a>
              ))
            : placeholders.map((_, index) => (
                <div key={index} className="aspect-square bg-[#F9F7F2]" />
              ))}
        </div>
      </div>
    </section>
  );
}
