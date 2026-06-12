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
    <div className={`bg-white border border-gray-100 rounded-2xl p-4 flex gap-3 items-start transition-shadow ${selected ? 'ring-2 ring-primary/40' : ''}`}>
      <input
        type="checkbox"
        checked={selected}
        onChange={onToggle}
        className="mt-1 w-4 h-4 accent-primary shrink-0 cursor-pointer"
      />
      <img
        src={api.getImageUrl(item.image)}
        alt={item.name}
        className="w-20 h-20 object-cover rounded-xl shrink-0"
      />
      <div className="flex-1 min-w-0">
        <p className="font-bold text-black text-base leading-tight mb-1 truncate">{item.name}</p>
        {item.discountPercent !== undefined && item.originalPrice !== undefined && (
          <div className="flex flex-wrap items-center gap-1.5 mb-1">
            <span className="text-xs font-bold text-white bg-red-500 rounded-full px-2 py-0.5">
              {item.discountPercent}% OFF
            </span>
            <span className="text-sm text-black/40 line-through">{fmt(item.originalPrice)}</span>
          </div>
        )}
        <p className="text-primary font-semibold text-sm">{fmt(item.priceNumeric)}</p>
      </div>
      <div className="flex flex-col items-end gap-2 shrink-0">
        <button
          onClick={onRemove}
          className="text-xs text-red-500 hover:text-red-700 transition"
        >
          Hapus
        </button>
        <div className="flex items-center gap-1.5 border border-gray-200 rounded-full px-2.5 py-1">
          <button
            onClick={() => onQtyChange(item.quantity - 1)}
            className="w-5 h-5 flex items-center justify-center text-black font-bold text-base leading-none"
          >
            −
          </button>
          <span className="text-sm font-medium w-5 text-center tabular-nums">{item.quantity}</span>
          <button
            onClick={() => onQtyChange(item.quantity + 1)}
            className="w-5 h-5 flex items-center justify-center text-black font-bold text-base leading-none"
          >
            +
          </button>
        </div>
        <p className="text-xs text-black/60 tabular-nums">{fmt(item.priceNumeric * item.quantity)}</p>
      </div>
    </div>
  );
}
