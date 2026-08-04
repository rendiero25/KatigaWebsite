import { useState } from 'react';
import { FiChevronDown, FiSearch, FiX } from 'react-icons/fi';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// Named type exports (not components) so Products.tsx can `import type` the filter contract.
export type SortKey = 'newest' | 'price-asc' | 'price-desc' | 'az' | 'za';

export interface FilterOption {
  value: string;
  label: string;
}

interface Props {
  sort: SortKey;
  onSortChange: (value: SortKey) => void;
  categories: FilterOption[];
  activeCategory: string;
  onCategoryChange: (value: string) => void;
  search: string;
  onSearchChange: (value: string) => void;
  resultCount: number;
  onClearAll: () => void;
}

const SORT_OPTIONS: FilterOption[] = [
  { value: 'newest', label: 'Terbaru' },
  { value: 'price-asc', label: 'Harga Terendah' },
  { value: 'price-desc', label: 'Harga Tertinggi' },
  { value: 'az', label: 'A-Z' },
  { value: 'za', label: 'Z-A' },
];

const triggerClass =
  'flex items-center gap-1.5 uppercase tracking-[0.12em] text-[13px] text-[#6F6F71] hover:text-[#1E1E1E] transition-colors cursor-pointer focus:outline-none';

const dropdownContentClass = 'rounded-none p-1 min-w-44 shadow-none ring-1 ring-[#E9E9EA]';

function labelOf(options: FilterOption[], value: string): string | undefined {
  return options.find((option) => option.value === value)?.label;
}

interface SearchFieldProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

function SearchField({ value, onChange, className = '' }: SearchFieldProps) {
  return (
    <div className={`relative flex items-center ${className}`}>
      <FiSearch className="pointer-events-none absolute left-3 w-4 h-4 text-[#6F6F71]" />
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Cari produk"
        aria-label="Cari produk"
        className="w-full border border-[#E9E9EA] bg-white py-2.5 pl-9 pr-9 text-[13px] text-[#1E1E1E] placeholder:text-[#6F6F71] focus:border-[#1E1E1E] focus:outline-none"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label="Hapus pencarian"
          className="absolute right-2 p-1 text-[#6F6F71] hover:text-[#1E1E1E] cursor-pointer"
        >
          <FiX className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}

export default function ProductFilterBar({
  sort,
  onSortChange,
  categories,
  activeCategory,
  onCategoryChange,
  search,
  onSearchChange,
  resultCount,
  onClearAll,
}: Props) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isMobileSortOpen, setIsMobileSortOpen] = useState(false);

  const chips: { key: string; label: string; onRemove: () => void }[] = [];
  if (activeCategory) {
    chips.push({
      key: `category:${activeCategory}`,
      label: labelOf(categories, activeCategory) ?? activeCategory,
      onRemove: () => onCategoryChange(''),
    });
  }
  if (search.trim()) {
    chips.push({
      key: `search:${search}`,
      label: `"${search.trim()}"`,
      onRemove: () => onSearchChange(''),
    });
  }

  return (
    <div className="sticky top-20 z-30 bg-white border-y border-[#E9E9EA]">
      <div className="container mx-auto px-4 sm:px-10 lg:px-20 xl:px-30">
        {/* Desktop bar */}
        <div className="hidden md:flex items-center justify-between gap-8 py-4">
          <div className="flex items-center gap-8">
            <DropdownMenu>
              <DropdownMenuTrigger className={triggerClass}>
                URUTKAN
                <FiChevronDown className="w-3.5 h-3.5" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className={dropdownContentClass}>
                <DropdownMenuRadioGroup
                  value={sort}
                  onValueChange={(value) => onSortChange(value as SortKey)}
                >
                  {SORT_OPTIONS.map((option) => (
                    <DropdownMenuRadioItem
                      key={option.value}
                      value={option.value}
                      className="rounded-none uppercase tracking-[0.08em] text-[12px] text-[#1E1E1E]"
                    >
                      {option.label}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger className={triggerClass}>
                KATEGORI
                <FiChevronDown className="w-3.5 h-3.5" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className={dropdownContentClass}>
                <DropdownMenuRadioGroup
                  value={activeCategory}
                  onValueChange={(value) => onCategoryChange(value)}
                >
                  <DropdownMenuRadioItem
                    value=""
                    className="rounded-none uppercase tracking-[0.08em] text-[12px] text-[#1E1E1E]"
                  >
                    Semua
                  </DropdownMenuRadioItem>
                  {categories.map((option) => (
                    <DropdownMenuRadioItem
                      key={option.value}
                      value={option.value}
                      className="rounded-none uppercase tracking-[0.08em] text-[12px] text-[#1E1E1E]"
                    >
                      {option.label}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>

            <SearchField value={search} onChange={onSearchChange} className="w-64" />
          </div>

          <span className="shrink-0 uppercase tracking-[0.12em] text-[13px] text-[#6F6F71]">
            {resultCount} PRODUK
          </span>
        </div>

        {/* Mobile bar */}
        <div className="md:hidden flex flex-col gap-3 py-3">
          <SearchField value={search} onChange={onSearchChange} />

          <div className="flex items-center gap-3">
            <DropdownMenu open={isMobileSortOpen} onOpenChange={setIsMobileSortOpen}>
              <DropdownMenuTrigger className="flex-1 flex items-center justify-center gap-1.5 border border-[#E9E9EA] py-2.5 uppercase tracking-[0.18em] text-[13px] text-[#1E1E1E] cursor-pointer focus:outline-none">
                URUTKAN
                <FiChevronDown className="w-3.5 h-3.5" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className={dropdownContentClass}>
                <DropdownMenuRadioGroup
                  value={sort}
                  onValueChange={(value) => onSortChange(value as SortKey)}
                >
                  {SORT_OPTIONS.map((option) => (
                    <DropdownMenuRadioItem
                      key={option.value}
                      value={option.value}
                      className="rounded-none uppercase tracking-[0.08em] text-[12px] text-[#1E1E1E]"
                    >
                      {option.label}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>

            <button
              type="button"
              onClick={() => setIsDrawerOpen(true)}
              className="flex-1 flex items-center justify-center gap-1.5 border border-[#E9E9EA] py-2.5 uppercase tracking-[0.18em] text-[13px] text-[#1E1E1E] cursor-pointer"
            >
              KATEGORI
            </button>
          </div>
        </div>

        <p className="md:hidden pb-3 uppercase tracking-[0.12em] text-[12px] text-[#6F6F71]">
          {resultCount} PRODUK
        </p>

        {/* Active filter chips */}
        {chips.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 pb-4">
            {chips.map((chip) => (
              <span
                key={chip.key}
                className="flex items-center gap-1.5 border border-[#E9E9EA] text-[11px] px-3 py-1 uppercase text-[#1E1E1E]"
              >
                {chip.label}
                <button
                  type="button"
                  onClick={chip.onRemove}
                  aria-label={`Hapus filter ${chip.label}`}
                  className="cursor-pointer text-[#6F6F71] hover:text-[#1E1E1E]"
                >
                  <FiX className="w-3 h-3" />
                </button>
              </span>
            ))}
            {chips.length > 1 && (
              <button
                type="button"
                onClick={onClearAll}
                className="uppercase tracking-[0.12em] text-[11px] text-[#6F6F71] hover:text-[#1E1E1E] underline underline-offset-2 cursor-pointer"
              >
                HAPUS SEMUA
              </button>
            )}
          </div>
        )}
      </div>

      {/* Mobile category drawer */}
      <div
        className={`md:hidden fixed inset-0 z-50 transition-opacity duration-300 ${
          isDrawerOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className="absolute inset-0 bg-black/20" onClick={() => setIsDrawerOpen(false)} />
        <div
          className={`absolute inset-y-0 right-0 w-[85%] max-w-sm bg-white flex flex-col transition-transform duration-300 ${
            isDrawerOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          <div className="flex items-center justify-between h-16 px-5 border-b border-[#E9E9EA] shrink-0">
            <span className="uppercase tracking-[0.12em] text-[13px] text-[#1E1E1E]">Kategori</span>
            <button
              type="button"
              onClick={() => setIsDrawerOpen(false)}
              aria-label="Tutup filter"
              className="text-xl text-[#1E1E1E] cursor-pointer"
            >
              <FiX />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-6">
            <div className="flex flex-col gap-3">
              <label className="flex items-center gap-2.5 text-[13px] uppercase tracking-[0.08em] text-[#1E1E1E]">
                <input
                  type="radio"
                  name="mobile-category"
                  checked={activeCategory === ''}
                  onChange={() => onCategoryChange('')}
                />
                Semua
              </label>
              {categories.map((option) => (
                <label
                  key={option.value}
                  className="flex items-center gap-2.5 text-[13px] uppercase tracking-[0.08em] text-[#1E1E1E]"
                >
                  <input
                    type="radio"
                    name="mobile-category"
                    checked={activeCategory === option.value}
                    onChange={() => onCategoryChange(option.value)}
                  />
                  {option.label}
                </label>
              ))}
            </div>
          </div>

          <div className="shrink-0 px-5 py-5 border-t border-[#E9E9EA]">
            <button
              type="button"
              onClick={() => setIsDrawerOpen(false)}
              className="w-full bg-[#4F68AF] text-white uppercase tracking-[0.18em] text-[13px] py-3.5 hover:bg-[#2B3A67] transition-colors cursor-pointer"
            >
              TERAPKAN
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
