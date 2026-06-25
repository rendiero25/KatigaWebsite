import { Trash2 } from 'lucide-react';
import type { CartItem } from '../types/ecommerce';
import api from '../services/api';

interface Props {
  item: CartItem;
  selected: boolean;
  onToggle: () => void;
  onQtyChange: (qty: number) => void;
  onRemove: () => void;
}

const fmt = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);

export default function CartItemCard({ item, selected, onToggle, onQtyChange, onRemove }: Props) {
  return (
    <div
      className={`bg-white rounded-xl p-4 flex gap-3 items-start transition-all duration-150 ${
        selected
          ? 'border-2 border-primary/60 shadow-[0_0_0_3px_rgba(79,104,175,0.08)]'
          : 'border border-[#E8E8E5]'
      }`}
    >
      <input
        type="checkbox"
        checked={selected}
        onChange={onToggle}
        className="mt-1 w-4 h-4 accent-primary shrink-0 cursor-pointer"
      />

      <div className="w-[72px] h-[72px] rounded-lg overflow-hidden bg-[#F7F7F5] shrink-0">
        <img
          src={api.getImageUrl(item.image)}
          alt={item.name}
          className="w-full h-full object-cover"
        />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-[#1F1F1F] leading-snug mb-1 line-clamp-2">{item.name}</p>
        {item.variantName && (
          <p className="text-xs text-[#9A9A9A] mb-1">{item.variantName}</p>
        )}
        {item.discountPercent !== undefined && item.originalPrice !== undefined && (
          <div className="flex items-center gap-1.5 mb-1">
            <span className="text-[11px] font-bold text-red-500 bg-red-50 rounded px-1.5 py-0.5">
              {item.discountPercent}% OFF
            </span>
            <span className="text-xs text-[#9A9A9A] line-through">{fmt(item.originalPrice)}</span>
          </div>
        )}
        <p className="text-sm font-bold text-primary">{fmt(item.priceNumeric)}</p>
      </div>

      <div className="flex flex-col items-end gap-2.5 shrink-0">
        <button
          onClick={onRemove}
          className="p-1 rounded-md text-[#C0C0BC] hover:text-red-500 hover:bg-red-50 transition-colors"
          aria-label="Hapus dari keranjang"
        >
          <Trash2 className="size-3.5" />
        </button>

        <div className="flex items-center gap-0 border border-[#E8E8E5] rounded-lg overflow-hidden">
          <button
            onClick={() => onQtyChange(item.quantity - 1)}
            className="w-7 h-7 flex items-center justify-center text-[#4A4A4A] hover:bg-[#F7F7F5] transition-colors text-base font-medium"
          >
            −
          </button>
          <span className="w-7 h-7 flex items-center justify-center text-sm font-semibold text-[#1F1F1F] border-x border-[#E8E8E5] tabular-nums">
            {item.quantity}
          </span>
          <button
            onClick={() => onQtyChange(item.quantity + 1)}
            className="w-7 h-7 flex items-center justify-center text-[#4A4A4A] hover:bg-[#F7F7F5] transition-colors text-base font-medium"
          >
            +
          </button>
        </div>

        <p className="text-xs font-semibold text-[#4A4A4A] tabular-nums">{fmt(item.priceNumeric * item.quantity)}</p>
      </div>
    </div>
  );
}
