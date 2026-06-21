import { useState, useEffect } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import AdminLayout from '../../components/AdminLayout';
import api from '../../services/api';

interface Promotion {
  _id: string;
  name: string;
  bannerImage: string;
  startDate: string;
  endDate: string;
  discountPercent: number;
  isVisible: boolean;
  displayOrder: number;
}

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });

interface SortableItemProps {
  promo: Promotion;
  onToggle: (id: string) => void;
}

function SortableItem({ promo, onToggle }: SortableItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: promo._id });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
      }}
      className="flex items-center gap-4 p-4 bg-white border border-gray-200 rounded-xl mb-3 shadow-sm"
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 shrink-0"
        aria-label="Drag to reorder"
      >
        <GripVertical className="size-5" />
      </button>

      <div className="w-20 h-14 rounded-lg overflow-hidden bg-gray-100 shrink-0">
        {promo.bannerImage ? (
          <img src={api.getImageUrl(promo.bannerImage)} alt={promo.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-indigo-100 to-blue-100" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-900 truncate">{promo.name}</p>
        <p className="text-xs text-gray-500 mt-0.5">
          {formatDate(promo.startDate)} – {formatDate(promo.endDate)} &bull; {promo.discountPercent}% off
        </p>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={() => onToggle(promo._id)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            promo.isVisible ? 'bg-indigo-600' : 'bg-gray-300'
          }`}
          aria-label={promo.isVisible ? 'Sembunyikan' : 'Tampilkan'}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              promo.isVisible ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
        <span className="text-xs text-gray-500 w-20">
          {promo.isVisible ? 'Ditampilkan' : 'Tersembunyi'}
        </span>
      </div>
    </div>
  );
}

export default function PromosiTampilan() {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    api.getPromotions()
      .then((data: Promotion[]) =>
        setPromotions([...data].sort((a, b) => a.displayOrder - b.displayOrder))
      )
      .finally(() => setLoading(false));
  }, []);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setPromotions(prev => {
      const oldIdx = prev.findIndex(p => p._id === String(active.id));
      const newIdx = prev.findIndex(p => p._id === String(over.id));
      return arrayMove(prev, oldIdx, newIdx);
    });
    setSaved(false);
  };

  const handleToggle = async (id: string) => {
    const data = await api.togglePromotion(id);
    setPromotions(prev => prev.map(p => p._id === id ? { ...p, isVisible: data.isVisible } : p));
  };

  const handleSaveOrder = async () => {
    setSaving(true);
    try {
      const order = promotions.map((p, idx) => ({ id: p._id, displayOrder: idx }));
      await api.reorderPromotions(order);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout title="Tampilan Promosi">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Tampilan Promosi</h2>
          <p className="text-sm text-gray-500 mt-1">
            Drag untuk atur urutan. Toggle untuk show/hide di halaman home.
          </p>
        </div>
        <button
          onClick={handleSaveOrder}
          disabled={saving}
          className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition"
        >
          {saving ? 'Menyimpan...' : saved ? '✓ Tersimpan' : 'Simpan Urutan'}
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-20 bg-gray-200 rounded-xl animate-pulse" />)}
        </div>
      ) : promotions.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          Belum ada promosi. Buat dulu di halaman Kelola Promosi.
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={promotions.map(p => p._id)} strategy={verticalListSortingStrategy}>
            {promotions.map(promo => (
              <SortableItem key={promo._id} promo={promo} onToggle={handleToggle} />
            ))}
          </SortableContext>
        </DndContext>
      )}
    </AdminLayout>
  );
}
