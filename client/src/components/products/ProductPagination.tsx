import { FiChevronLeft, FiChevronRight } from "react-icons/fi";

interface Props {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

function getPageNumbers(currentPage: number, totalPages: number): (number | "...")[] {
  if (totalPages <= 5) return Array.from({ length: totalPages }, (_, i) => i + 1);
  if (currentPage <= 3) return [1, 2, 3, 4, "...", totalPages];
  if (currentPage >= totalPages - 2) {
    return [1, "...", totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
  }
  return [1, "...", currentPage - 1, currentPage, currentPage + 1, "...", totalPages];
}

export default function ProductPagination({ currentPage, totalPages, onPageChange }: Props) {
  if (totalPages <= 1) return null;

  const pageNumbers = getPageNumbers(currentPage, totalPages);

  return (
    <nav aria-label="Paginasi produk" className="flex items-center justify-center gap-4 mt-16">
      <button
        type="button"
        aria-label="Halaman sebelumnya"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="cursor-pointer text-[#6F6F71] hover:text-[#1E1E1E] disabled:opacity-40 disabled:cursor-not-allowed transition"
      >
        <FiChevronLeft className="w-4 h-4" />
      </button>

      {pageNumbers.map((page, i) =>
        page === "..." ? (
          <span key={`ellipsis-${i}`} className="text-[13px] text-[#6F6F71] select-none">
            ...
          </span>
        ) : (
          <button
            key={page}
            type="button"
            aria-current={currentPage === page ? "page" : undefined}
            onClick={() => onPageChange(page)}
            className={`cursor-pointer text-[13px] transition ${
              currentPage === page
                ? "text-[#1E1E1E] border-b border-[#1E1E1E]"
                : "text-[#6F6F71] hover:text-[#1E1E1E]"
            }`}
          >
            {page}
          </button>
        )
      )}

      <button
        type="button"
        aria-label="Halaman berikutnya"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="cursor-pointer text-[#6F6F71] hover:text-[#1E1E1E] disabled:opacity-40 disabled:cursor-not-allowed transition"
      >
        <FiChevronRight className="w-4 h-4" />
      </button>
    </nav>
  );
}
