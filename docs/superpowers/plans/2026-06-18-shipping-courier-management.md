# Shipping Courier Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add admin-controlled courier visibility for Biteship checkout rates while keeping price and ETA live from Biteship.

**Architecture:** Keep Biteship as provider adapter and add one singleton `ShippingSettings` config layer for business control. Backend filters live Biteship results before returning them to checkout; frontend distinguishes provider-empty, admin-filtered, and request-error states. Admin gets one new `Pengiriman` page under `Sistem` to toggle couriers and edit the empty-state message.

**Tech Stack:** Express + Mongoose (backend), React + TypeScript + Tailwind (frontend), Biteship API, existing custom hooks in `client/src/hooks/useApi.ts`

**Validation:** This repo has no automated test suite. Use backend module-load smoke checks, `cd client && npx tsc --noEmit`, `cd client && npm run lint`, and manual browser verification in local dev.

---

## File Structure

- `config/shippingCouriers.js`
  - Shared courier catalog and stable courier code order
- `models/ShippingSettings.js`
  - Singleton Mongo model for enabled couriers + filtered-out empty-state message
- `services/shippingSettingsService.js`
  - Shared normalization and get-or-create logic so both shipping routes use one source
- `routes/shippingSettingsRoutes.js`
  - Admin GET/PUT endpoint for shipping settings
- `services/biteshipService.js`
  - Provider adapter only; builds Biteship payload and returns normalized provider data
- `routes/shippingRoutes.js`
  - Customer-facing area search + structured shipping rates response
- `client/src/types/ecommerce.ts`
  - Shipping settings and structured shipping response types
- `client/src/services/api.ts`
  - Shipping settings admin methods + typed shipping rates call
- `client/src/hooks/useApi.ts`
  - `useShippingSettings()` hook for admin page
- `client/src/components/ShippingSelector.tsx`
  - Checkout UI for rate loading, empty, filtered, and error states
- `client/src/pages/admin/ShippingSettings.tsx`
  - New admin UI for toggling couriers
- `client/src/components/AdminLayout.tsx`
  - Add `Pengiriman` nav item under `Sistem`
- `client/src/App.tsx`
  - Register `/admin/shipping` route

---

## Task 1: Add backend shipping settings foundation

**Files:**
- Create: `config/shippingCouriers.js`
- Create: `models/ShippingSettings.js`
- Create: `services/shippingSettingsService.js`
- Create: `routes/shippingSettingsRoutes.js`
- Modify: `server.js`

- [ ] **Step 1: Create shared courier catalog**

Create `config/shippingCouriers.js`:

```js
const SUPPORTED_COURIERS = [
  { code: 'jne', label: 'JNE' },
  { code: 'jnt', label: 'J&T Express' },
  { code: 'sicepat', label: 'SiCepat' },
  { code: 'anteraja', label: 'AnterAja' },
  { code: 'pos', label: 'POS Indonesia' },
];

const SUPPORTED_COURIER_CODES = SUPPORTED_COURIERS.map((courier) => courier.code);

module.exports = { SUPPORTED_COURIERS, SUPPORTED_COURIER_CODES };
```

- [ ] **Step 2: Create singleton shipping settings model**

Create `models/ShippingSettings.js`:

```js
const mongoose = require('mongoose');
const { SUPPORTED_COURIER_CODES } = require('../config/shippingCouriers');

const DEFAULT_EMPTY_STATE_MESSAGE = 'Metode pengiriman sedang tidak tersedia untuk alamat ini.';

const shippingSettingsSchema = new mongoose.Schema({
  enabledCouriers: {
    type: [String],
    default: () => [...SUPPORTED_COURIER_CODES],
  },
  emptyStateMessage: {
    type: String,
    default: DEFAULT_EMPTY_STATE_MESSAGE,
    trim: true,
  },
}, { timestamps: true });

module.exports = mongoose.model('ShippingSettings', shippingSettingsSchema);
```

- [ ] **Step 3: Create shared shipping settings service**

Create `services/shippingSettingsService.js`:

```js
const ShippingSettings = require('../models/ShippingSettings');
const { SUPPORTED_COURIERS, SUPPORTED_COURIER_CODES } = require('../config/shippingCouriers');

const DEFAULT_EMPTY_STATE_MESSAGE = 'Metode pengiriman sedang tidak tersedia untuk alamat ini.';

const normalizeEnabledCouriers = (codes) => {
  if (!Array.isArray(codes)) {
    return [...SUPPORTED_COURIER_CODES];
  }

  const allowed = new Set(
    codes.filter((code) => typeof code === 'string' && SUPPORTED_COURIER_CODES.includes(code))
  );

  return SUPPORTED_COURIER_CODES.filter((code) => allowed.has(code));
};

const normalizeEmptyStateMessage = (value) => {
  if (typeof value !== 'string') {
    return DEFAULT_EMPTY_STATE_MESSAGE;
  }

  const trimmed = value.trim();
  return trimmed || DEFAULT_EMPTY_STATE_MESSAGE;
};

const toShippingSettingsResponse = (settings) => ({
  enabledCouriers: normalizeEnabledCouriers(settings.enabledCouriers),
  emptyStateMessage: normalizeEmptyStateMessage(settings.emptyStateMessage),
  supportedCouriers: SUPPORTED_COURIERS,
});

async function getOrCreateShippingSettings() {
  let settings = await ShippingSettings.findOne();

  if (!settings) {
    settings = await ShippingSettings.create({
      enabledCouriers: [...SUPPORTED_COURIER_CODES],
      emptyStateMessage: DEFAULT_EMPTY_STATE_MESSAGE,
    });
    return settings;
  }

  const normalizedCouriers = normalizeEnabledCouriers(settings.enabledCouriers);
  const normalizedMessage = normalizeEmptyStateMessage(settings.emptyStateMessage);
  const hasCourierDiff =
    JSON.stringify(settings.enabledCouriers) !== JSON.stringify(normalizedCouriers);
  const hasMessageDiff = settings.emptyStateMessage !== normalizedMessage;

  if (hasCourierDiff || hasMessageDiff) {
    settings.enabledCouriers = normalizedCouriers;
    settings.emptyStateMessage = normalizedMessage;
    await settings.save();
  }

  return settings;
}

module.exports = {
  DEFAULT_EMPTY_STATE_MESSAGE,
  getOrCreateShippingSettings,
  normalizeEnabledCouriers,
  normalizeEmptyStateMessage,
  toShippingSettingsResponse,
};
```

- [ ] **Step 4: Create admin shipping settings routes**

Create `routes/shippingSettingsRoutes.js`:

```js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const {
  getOrCreateShippingSettings,
  normalizeEnabledCouriers,
  normalizeEmptyStateMessage,
  toShippingSettingsResponse,
} = require('../services/shippingSettingsService');

router.get('/', auth, async (req, res) => {
  try {
    const settings = await getOrCreateShippingSettings();
    res.json(toShippingSettingsResponse(settings));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/', auth, async (req, res) => {
  try {
    const settings = await getOrCreateShippingSettings();

    settings.enabledCouriers = normalizeEnabledCouriers(req.body.enabledCouriers);
    settings.emptyStateMessage = normalizeEmptyStateMessage(req.body.emptyStateMessage);

    await settings.save();

    res.json(toShippingSettingsResponse(settings));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
```

- [ ] **Step 5: Register route in `server.js`**

Update `server.js` imports and route registration:

```js
const shippingSettingsRoutes = require('./routes/shippingSettingsRoutes');
```

```js
app.use('/api/shipping-settings', shippingSettingsRoutes);
```

Place the `require()` with other route imports and the `app.use()` beside the other `/api/*` registrations.

- [ ] **Step 6: Run backend module-load smoke check**

Run:

```powershell
node -e "require('./config/shippingCouriers'); require('./models/ShippingSettings'); require('./services/shippingSettingsService'); require('./routes/shippingSettingsRoutes'); console.log('shipping settings modules loaded')"
```

Expected:

```text
shipping settings modules loaded
```

- [ ] **Step 7: Run repo-required frontend checks before commit**

Run:

```powershell
cd client
npx tsc --noEmit
npm run lint
```

Expected:
- `npx tsc --noEmit` exits `0`
- `npm run lint` reports no new errors

- [ ] **Step 8: Commit foundation task**

Run:

```powershell
git add config/shippingCouriers.js models/ShippingSettings.js services/shippingSettingsService.js routes/shippingSettingsRoutes.js server.js
git commit -m "feat: add shipping settings endpoints"
```

Expected:
- commit succeeds
- commit message is exactly `feat: add shipping settings endpoints`

---

## Task 2: Return structured shipping rate states from backend

**Files:**
- Modify: `services/biteshipService.js`
- Modify: `routes/shippingRoutes.js`

- [ ] **Step 1: Update Biteship service to use shared courier catalog**

Replace `services/biteshipService.js` with:

```js
const axios = require('axios');
const { SUPPORTED_COURIER_CODES } = require('../config/shippingCouriers');

const BASE_URL = 'https://api.biteship.com';

const getApiKey = () => process.env.BITESHIP_API_KEY || process.env.BITESHIP_API_KEY_SANDBOX;

const headers = () => {
  const apiKey = getApiKey();

  if (!apiKey) {
    throw new Error('Biteship API key is not configured');
  }

  return {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  };
};

async function searchAreas(keyword) {
  const res = await axios.get(`${BASE_URL}/v1/maps/areas`, {
    headers: headers(),
    params: { input: keyword, type: 'single' },
  });

  return (res.data.areas ?? []).map((area) => ({
    ...area,
    area_id: area.area_id || area.id || '',
    postal_code: area.postal_code ? String(area.postal_code) : '',
  }));
}

async function getRates({ destinationAreaId, items }) {
  const payload = {
    origin_area_id: process.env.BITESHIP_ORIGIN_AREA_ID,
    destination_area_id: destinationAreaId,
    couriers: SUPPORTED_COURIER_CODES.join(','),
    items: items.map((item) => ({
      name: item.name,
      description: item.name,
      value: item.priceNumeric,
      length: item.dimensions?.length ?? 1,
      width: item.dimensions?.width ?? 1,
      height: item.dimensions?.height ?? 1,
      weight: item.weightGrams ?? 100,
      quantity: item.quantity,
    })),
  };

  const res = await axios.post(`${BASE_URL}/v1/rates/couriers`, payload, { headers: headers() });
  return res.data.pricing ?? [];
}

async function createOrder(order) {
  const payload = {
    shipper_contact_name: process.env.SHIPPER_NAME || 'Katiga',
    shipper_contact_phone: process.env.SHIPPER_PHONE,
    shipper_contact_email: process.env.SHIPPER_EMAIL,
    shipper_organization: process.env.SHIPPER_NAME || 'Katiga',
    origin_contact_name: process.env.SHIPPER_NAME || 'Katiga',
    origin_contact_phone: process.env.SHIPPER_PHONE,
    origin_address: process.env.ORIGIN_ADDRESS,
    origin_area_id: process.env.BITESHIP_ORIGIN_AREA_ID,
    destination_contact_name: order.shippingAddress.recipientName,
    destination_contact_phone: order.shippingAddress.phone,
    destination_address: order.shippingAddress.street,
    destination_postal_code: order.shippingAddress.postalCode,
    destination_area_id: order.shippingAddress.areaId,
    courier_company: order.shippingCourier,
    courier_type: order.shippingService,
    delivery_type: 'now',
    order_note: `Order ID: ${order._id}`,
    items: order.items.map((item) => ({
      id: item.product?.toString() ?? '',
      name: item.name,
      description: item.name,
      value: item.priceNumeric,
      length: 1,
      width: 1,
      height: 1,
      weight: item.weightGrams ?? 100,
      quantity: item.quantity,
    })),
  };

  const res = await axios.post(`${BASE_URL}/v1/orders`, payload, { headers: headers() });
  return res.data;
}

module.exports = { searchAreas, getRates, createOrder };
```

- [ ] **Step 2: Replace `routes/shippingRoutes.js` with structured response logic**

Replace `routes/shippingRoutes.js` with:

```js
const express = require('express');
const router = express.Router();
const customerAuth = require('../middleware/customerAuth');
const { searchAreas, getRates } = require('../services/biteshipService');
const { getOrCreateShippingSettings } = require('../services/shippingSettingsService');

const PROVIDER_EMPTY_MESSAGE = 'Tidak ada kurir tersedia untuk tujuan ini.';
const REQUEST_ERROR_MESSAGE = 'Gagal mengambil metode pengiriman';

const filterRatesByEnabledCouriers = (rates, enabledCouriers) =>
  rates.filter((rate) => enabledCouriers.includes(rate.courier_code));

// GET /api/shipping/areas?keyword=kebon%20jeruk
router.get('/areas', customerAuth, async (req, res) => {
  try {
    const { keyword } = req.query;
    if (!keyword || keyword.length < 2) {
      return res.json([]);
    }

    const areas = await searchAreas(keyword);
    res.json(areas);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/shipping/rates
router.post('/rates', customerAuth, async (req, res) => {
  const { destinationAreaId, items } = req.body;

  if (!destinationAreaId || !items?.length) {
    return res.status(400).json({ message: 'destinationAreaId dan items wajib diisi' });
  }

  try {
    const settings = await getOrCreateShippingSettings();
    const providerRates = await getRates({ destinationAreaId, items });

    if (!providerRates.length) {
      return res.json({
        rates: [],
        reason: 'provider_empty',
        message: PROVIDER_EMPTY_MESSAGE,
      });
    }

    const filteredRates = filterRatesByEnabledCouriers(
      providerRates,
      settings.enabledCouriers
    );

    if (!filteredRates.length) {
      return res.json({
        rates: [],
        reason: 'filtered_out',
        message: settings.emptyStateMessage,
      });
    }

    return res.json({
      rates: filteredRates,
      reason: 'ok',
      message: '',
    });
  } catch (err) {
    if (err.response || err.request) {
      return res.status(502).json({ message: REQUEST_ERROR_MESSAGE });
    }

    return res.status(500).json({ message: err.message });
  }
});

module.exports = router;
```

- [ ] **Step 3: Run backend module-load smoke check**

Run:

```powershell
node -e "require('./services/biteshipService'); require('./routes/shippingRoutes'); console.log('shipping rate modules loaded')"
```

Expected:

```text
shipping rate modules loaded
```

- [ ] **Step 4: Run repo-required frontend checks before commit**

Run:

```powershell
cd client
npx tsc --noEmit
npm run lint
```

Expected:
- `npx tsc --noEmit` exits `0`
- `npm run lint` reports no new errors

- [ ] **Step 5: Commit structured backend responses**

Run:

```powershell
git add services/biteshipService.js routes/shippingRoutes.js
git commit -m "fix: structure shipping rate responses"
```

Expected:
- commit succeeds
- commit message is exactly `fix: structure shipping rate responses`

---

## Task 3: Add client types, API methods, and admin hook

**Files:**
- Modify: `client/src/types/ecommerce.ts`
- Modify: `client/src/services/api.ts`
- Modify: `client/src/hooks/useApi.ts`

- [ ] **Step 1: Add shipping settings and structured response types**

In `client/src/types/ecommerce.ts`, insert these interfaces immediately after `ShippingRate`:

```ts
export interface ShippingCourierOption {
  code: string;
  label: string;
}

export interface ShippingSettings {
  enabledCouriers: string[];
  emptyStateMessage: string;
  supportedCouriers: ShippingCourierOption[];
}

export interface ShippingRatesResponse {
  rates: ShippingRate[];
  reason: 'ok' | 'provider_empty' | 'filtered_out';
  message: string;
}
```

- [ ] **Step 2: Update shipping methods in `client/src/services/api.ts`**

Update the type import at the top:

```ts
import type {
  WishlistProduct,
  Review,
  ReviewsResponse,
  CanReviewResponse,
  SavedAddress,
  VoucherValidation,
  CreateOrderPayload,
  ReportsSummary,
  ReportsRange,
  ShippingSettings,
  ShippingRatesResponse,
} from '../types/ecommerce';
```

Replace the shipping block in `client/src/services/api.ts` with:

```ts
  // Shipping (Biteship)
  searchAreas: async (keyword: string) => {
    const token = localStorage.getItem('customerToken');
    const res = await fetch(`${API_BASE_URL}/shipping/areas?keyword=${encodeURIComponent(keyword)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Failed to search areas');
    return res.json();
  },

  getShippingRates: async (payload: { destinationAreaId: string; items: object[] }): Promise<ShippingRatesResponse> => {
    const token = localStorage.getItem('customerToken');
    const res = await fetch(`${API_BASE_URL}/shipping/rates`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const error = await res.json().catch(() => null);
      throw new Error(error?.message || 'Gagal mengambil metode pengiriman');
    }
    return res.json();
  },

  getShippingSettings: async (): Promise<ShippingSettings> => {
    const token = localStorage.getItem('adminToken');
    const res = await fetch(`${API_BASE_URL}/shipping-settings`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Gagal memuat pengaturan pengiriman');
    return res.json();
  },

  updateShippingSettings: async (data: {
    enabledCouriers: string[];
    emptyStateMessage: string;
  }): Promise<ShippingSettings> => {
    const token = localStorage.getItem('adminToken');
    const res = await fetch(`${API_BASE_URL}/shipping-settings`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const error = await res.json().catch(() => null);
      throw new Error(error?.message || 'Gagal menyimpan pengaturan pengiriman');
    }
    return res.json();
  },
```

- [ ] **Step 3: Add `useShippingSettings()` hook**

Update the type import at the top of `client/src/hooks/useApi.ts`:

```ts
import type {
  WishlistProduct,
  SavedAddress,
  VoucherValidation,
  ReportsSummary,
  ReportsRange,
  ShippingSettings,
} from '../types/ecommerce';
```

Insert this hook after `useCustomerAddresses()` in `client/src/hooks/useApi.ts`:

```ts
export function useShippingSettings() {
  const [data, setData] = useState<ShippingSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.getShippingSettings();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat pengaturan pengiriman');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const save = useCallback(async (payload: {
    enabledCouriers: string[];
    emptyStateMessage: string;
  }): Promise<ShippingSettings> => {
    setSaving(true);
    setError(null);
    try {
      const result = await api.updateShippingSettings(payload);
      setData(result);
      return result;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Gagal menyimpan pengaturan pengiriman';
      setError(message);
      throw err;
    } finally {
      setSaving(false);
    }
  }, []);

  return { data, loading, saving, error, refresh, save };
}
```

- [ ] **Step 4: Run TypeScript check**

Run:

```powershell
cd client
npx tsc --noEmit
```

Expected:
- exits `0`
- no type errors about `ShippingRatesResponse` / `ShippingSettings`

- [ ] **Step 5: Run lint**

Run:

```powershell
cd client
npm run lint
```

Expected:
- no new lint errors

- [ ] **Step 6: Commit client API surface**

Run:

```powershell
git add client/src/types/ecommerce.ts client/src/services/api.ts client/src/hooks/useApi.ts
git commit -m "refactor: add shipping settings client api"
```

Expected:
- commit succeeds
- commit message is exactly `refactor: add shipping settings client api`

---

## Task 4: Update checkout shipping selector states

**Files:**
- Modify: `client/src/components/ShippingSelector.tsx`

- [ ] **Step 1: Replace `ShippingSelector.tsx` with structured-state version**

Replace `client/src/components/ShippingSelector.tsx` with:

```tsx
import { useState, useEffect, useCallback } from 'react';
import type { ShippingAddress, ShippingRate, CartItem } from '../types/ecommerce';
import api from '../services/api';

interface Props {
  address: ShippingAddress;
  cart: CartItem[];
  onSelect: (rate: ShippingRate | null) => void;
}

const fmt = (n: number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(n);

export default function ShippingSelector({ address, cart, onSelect }: Props) {
  const [rates, setRates] = useState<ShippingRate[]>([]);
  const [selected, setSelected] = useState<ShippingRate | null>(null);
  const [loading, setLoading] = useState(false);
  const [emptyReason, setEmptyReason] = useState<'provider_empty' | 'filtered_out' | null>(null);
  const [emptyMessage, setEmptyMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchRates = useCallback(async () => {
    if (!address.areaId || !cart.length) return;

    setLoading(true);
    setRates([]);
    setSelected(null);
    setEmptyReason(null);
    setEmptyMessage('');
    setErrorMessage(null);
    onSelect(null);

    try {
      const items = cart.map((c) => ({
        name: c.name,
        priceNumeric: c.priceNumeric,
        weightGrams: c.weightGrams,
        quantity: c.quantity,
        dimensions: { length: 1, width: 1, height: 1 },
      }));

      const result = await api.getShippingRates({
        destinationAreaId: address.areaId,
        items,
      });

      setRates(Array.isArray(result.rates) ? result.rates : []);

      if (result.reason !== 'ok') {
        setEmptyReason(result.reason);
        setEmptyMessage(result.message);
      }
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Gagal mengambil metode pengiriman. Coba lagi.'
      );
    } finally {
      setLoading(false);
    }
  }, [address.areaId, cart, onSelect]);

  useEffect(() => {
    fetchRates();
  }, [fetchRates]);

  const handleSelect = (rate: ShippingRate) => {
    setSelected(rate);
    onSelect(rate);
  };

  if (loading) {
    return <p className="text-sm text-black/60 py-2">Mengambil tarif pengiriman...</p>;
  }

  if (errorMessage) {
    return (
      <div className="space-y-2">
        <p className="text-sm text-red-600">{errorMessage}</p>
        <button
          onClick={fetchRates}
          className="text-sm text-primary hover:underline"
        >
          Coba lagi
        </button>
      </div>
    );
  }

  if (!rates.length && emptyReason) {
    return (
      <div className="space-y-2">
        <p className="text-sm text-black/60">{emptyMessage}</p>
        {emptyReason === 'provider_empty' && (
          <button
            onClick={fetchRates}
            className="text-sm text-primary hover:underline"
          >
            Coba lagi
          </button>
        )}
      </div>
    );
  }

  if (!rates.length) {
    return (
      <div className="space-y-2">
        <p className="text-sm text-black/60">Tidak ada kurir tersedia untuk tujuan ini.</p>
        <button
          onClick={fetchRates}
          className="text-sm text-primary hover:underline"
        >
          Coba lagi
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {rates.map((rate, i) => (
        <label
          key={`${rate.courier_code}-${rate.courier_service_code}-${i}`}
          className={`flex items-center justify-between p-3 border rounded-xl cursor-pointer transition ${
            selected?.courier_code === rate.courier_code &&
            selected?.courier_service_code === rate.courier_service_code
              ? 'border-primary bg-blue-50'
              : 'border-gray-200 hover:border-gray-300'
          }`}
        >
          <div className="flex items-center gap-3">
            <input
              type="radio"
              name="shippingRate"
              checked={
                selected?.courier_code === rate.courier_code &&
                selected?.courier_service_code === rate.courier_service_code
              }
              onChange={() => handleSelect(rate)}
              className="accent-primary"
            />
            <div>
              <p className="font-medium text-sm text-black">
                {rate.courier_name} — {rate.courier_service_name}
              </p>
              <p className="text-xs text-black/60">{rate.duration}</p>
            </div>
          </div>
          <span className="text-sm font-bold text-black shrink-0">{fmt(rate.price)}</span>
        </label>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Run TypeScript check**

Run:

```powershell
cd client
npx tsc --noEmit
```

Expected:
- exits `0`
- no type errors in `ShippingSelector.tsx`

- [ ] **Step 3: Run lint**

Run:

```powershell
cd client
npm run lint
```

Expected:
- no new lint errors

- [ ] **Step 4: Commit checkout state handling**

Run:

```powershell
git add client/src/components/ShippingSelector.tsx
git commit -m "fix: clarify checkout shipping states"
```

Expected:
- commit succeeds
- commit message is exactly `fix: clarify checkout shipping states`

---

## Task 5: Add admin shipping settings page and wire navigation

**Files:**
- Create: `client/src/pages/admin/ShippingSettings.tsx`
- Modify: `client/src/App.tsx`
- Modify: `client/src/components/AdminLayout.tsx`

- [ ] **Step 1: Create admin shipping settings page**

Create `client/src/pages/admin/ShippingSettings.tsx`:

```tsx
import { useEffect, useState } from 'react';
import AdminLayout from '../../components/AdminLayout';
import { useShippingSettings } from '../../hooks/useApi';

export default function AdminShippingSettings() {
  const { data, loading, saving, error, save } = useShippingSettings();
  const [enabledCouriers, setEnabledCouriers] = useState<string[]>([]);
  const [emptyStateMessage, setEmptyStateMessage] = useState('');

  useEffect(() => {
    if (!data) return;
    setEnabledCouriers(data.enabledCouriers);
    setEmptyStateMessage(data.emptyStateMessage);
  }, [data]);

  const toggleCourier = (code: string) => {
    setEnabledCouriers((prev) =>
      prev.includes(code) ? prev.filter((item) => item !== code) : [...prev, code]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await save({ enabledCouriers, emptyStateMessage });
      alert('Pengaturan pengiriman berhasil disimpan');
    } catch {
      // Error state already handled by hook
    }
  };

  const couriers = data?.supportedCouriers ?? [];

  return (
    <AdminLayout title="Pengaturan Pengiriman">
      <div className="max-w-3xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm p-6 space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Kurir Checkout</h2>
              <p className="text-sm text-gray-500 mt-1">
                Pilih kurir Biteship yang boleh tampil di checkout.
              </p>
            </div>

            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((item) => (
                  <div
                    key={item}
                    className="h-14 bg-gray-100 rounded-lg animate-pulse"
                  />
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {couriers.map((courier) => {
                  const checked = enabledCouriers.includes(courier.code);
                  return (
                    <label
                      key={courier.code}
                      className={`flex items-center justify-between rounded-xl border px-4 py-3 cursor-pointer transition ${
                        checked
                          ? 'border-indigo-500 bg-indigo-50'
                          : 'border-gray-200 bg-white hover:border-gray-300'
                      }`}
                    >
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {courier.label}
                        </p>
                        <p className="text-xs text-gray-500">{courier.code}</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleCourier(courier.code)}
                        className="h-4 w-4 accent-indigo-600"
                      />
                    </label>
                  );
                })}
              </div>
            )}

            {!loading && enabledCouriers.length === 0 && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                Semua kurir nonaktif. Checkout tidak akan menampilkan metode pengiriman.
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Pesan Empty State</h2>
              <p className="text-sm text-gray-500 mt-1">
                Pesan ini tampil jika Biteship punya rate, tapi semua kurir sedang dimatikan admin.
              </p>
            </div>

            <textarea
              value={emptyStateMessage}
              onChange={(e) => setEmptyStateMessage(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || saving}
            className="w-full py-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-50"
          >
            {saving ? 'Menyimpan...' : 'Simpan Pengaturan'}
          </button>
        </form>
      </div>
    </AdminLayout>
  );
}
```

- [ ] **Step 2: Register admin page in `client/src/App.tsx`**

Add import:

```ts
import AdminShippingSettings from './pages/admin/ShippingSettings';
```

Add route beside the other admin `Sistem` routes:

```tsx
<Route path="/admin/shipping" element={<AdminShippingSettings />} />
```

- [ ] **Step 3: Add nav item in `client/src/components/AdminLayout.tsx`**

Update `lucide-react` import to include `Truck`:

```ts
  Truck,
```

Replace the `Sistem` group with:

```ts
  {
    label: 'Sistem',
    items: [
      { path: '/admin/settings', icon: Settings, label: 'Pengaturan' },
      { path: '/admin/shipping', icon: Truck, label: 'Pengiriman' },
    ],
  },
```

- [ ] **Step 4: Run TypeScript check**

Run:

```powershell
cd client
npx tsc --noEmit
```

Expected:
- exits `0`
- no type errors in `ShippingSettings.tsx`, `App.tsx`, or `AdminLayout.tsx`

- [ ] **Step 5: Run lint**

Run:

```powershell
cd client
npm run lint
```

Expected:
- no new lint errors

- [ ] **Step 6: Run full manual browser smoke test**

Run dev servers if not already running:

```powershell
npm run dev
```

Manual checks:
1. Log in as admin and open `http://localhost:5173/admin/shipping`
2. Confirm all supported couriers show with checkboxes
3. Uncheck `J&T Express`, save, and confirm success alert
4. Log in as customer and open `http://localhost:5173/checkout`
5. Choose a saved address and wait for shipping methods to load
6. Confirm no rate with `courier_code = 'jnt'` is visible
7. Go back to `/admin/shipping`, uncheck all couriers, save
8. Return to checkout and confirm admin-configured empty-state message appears
9. Re-enable all couriers and save, so local dev returns to default-safe state

Expected:
- admin page saves without refresh errors
- checkout shipping list responds to admin config changes
- disable-all state shows message, not silent blank UI

- [ ] **Step 7: Commit admin UI wiring**

Run:

```powershell
git add client/src/pages/admin/ShippingSettings.tsx client/src/App.tsx client/src/components/AdminLayout.tsx
git commit -m "feat: add admin shipping settings page"
```

Expected:
- commit succeeds
- commit message is exactly `feat: add admin shipping settings page`

---

## Task 6: Run edge-case verification matrix

**Files:**
- Modify: none (verification only)

- [ ] **Step 1: Verify filtered-out state remains explicit**

Manual check:
1. In `/admin/shipping`, disable all couriers
2. Save
3. Open checkout and choose an address with known-valid rates

Expected:
- checkout shows admin `emptyStateMessage`
- checkout does **not** show generic provider error

- [ ] **Step 2: Verify provider-empty state remains explicit**

Manual check:
1. Re-enable all couriers
2. Use a destination that Biteship genuinely returns no rates for
3. Reload shipping methods

Expected:
- checkout shows `Tidak ada kurir tersedia untuk tujuan ini.`
- `Coba lagi` button remains available

- [ ] **Step 3: Verify provider-error retry state**

Local-only smoke:
1. Temporarily replace the local Biteship key in `.env` with an invalid value
2. Restart `npm run dev`
3. Open checkout and load shipping methods
4. Confirm error state appears
5. Restore the original key immediately
6. Restart `npm run dev` again

Expected:
- checkout shows `Gagal mengambil metode pengiriman`
- retry link appears
- restoring the key returns checkout to normal

- [ ] **Step 4: Verify order payload still works**

Manual check:
1. Keep at least one courier enabled
2. Select one shipping method in checkout
3. Continue until order creation request fires

Expected request payload still includes:

```json
{
  "shippingCourier": "jne",
  "shippingService": "reg",
  "shippingServiceName": "JNE REG",
  "shippingCost": 18000,
  "estimatedDays": "2-3"
}
```

- [ ] **Step 5: No commit for QA-only task**

Do not create a QA-only commit if no code changed. Move directly to execution summary / PR prep if all checks pass.
