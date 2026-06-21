# Admin User Management

**Date:** 2026-06-10  
**Status:** Approved

## Overview

Add a Users management section to the admin dashboard, allowing admins to view, edit, suspend, delete, and reset passwords for registered customers.

## Backend

### Model Change
Add `suspended` field to `models/Customer.js`:
```js
suspended: { type: Boolean, default: false }
```

### New Route File
`routes/adminCustomerRoutes.js` — all endpoints protected by `middleware/auth.js` (admin JWT).

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/admin/customers` | List customers. Query params: `search` (name/email), `page` (default 1), `limit` (default 20) |
| `GET` | `/api/admin/customers/:id` | Single customer detail |
| `PUT` | `/api/admin/customers/:id` | Update name, email, phone, suspended |
| `DELETE` | `/api/admin/customers/:id` | Delete customer document |
| `POST` | `/api/admin/customers/:id/reset-password` | Set new password from `{ password }` body |

### Registration
Add to `server.js`:
```js
app.use('/api/admin/customers', require('./routes/adminCustomerRoutes'));
```

## Frontend

### API Methods (`client/src/services/api.ts`)
- `getAdminCustomers(params?: { search?: string; page?: number; limit?: number })`
- `getAdminCustomer(id: string)`
- `updateAdminCustomer(id: string, data: object)`
- `deleteAdminCustomer(id: string)`
- `resetCustomerPassword(id: string, password: string)`

All admin methods read token from `localStorage.getItem('adminToken')`.

### Hook (`client/src/hooks/useApi.ts`)
`useAdminCustomers(params?)` — wraps `getAdminCustomers` with `useState`/`useEffect`.

### Page (`client/src/pages/admin/Users.tsx`)
- Search bar (name/email, debounced)
- Table columns: avatar (initials), name, email, phone, join date, status badge (Aktif / Suspended)
- Row actions: Edit button, Reset Password button, Delete button
- **Edit modal**: form fields for name, email, phone; toggle for suspended status
- **Reset password modal**: single password input field
- **Delete**: confirmation dialog before deletion
- Pagination controls

### Routing
- `App.tsx`: add `<Route path="/admin/users" element={<Users />} />`
- `AdminLayout.tsx`: add sidebar entry `{ path: '/admin/users', icon: Users, label: 'Users' }` after the Pesanan entry

## Constraints
- Password reset hashes the new password via `Customer.pre('save')` — set `customer.password = newPassword` then `customer.save()`.
- Delete does not cascade to orders — orders keep the customer reference but customer document is removed.
- Suspended field is informational only at this stage; it does not block customer login (future work).
