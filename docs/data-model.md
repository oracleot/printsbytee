# Data Model

All entities live in Postgres. Timestamps stored as `timestamptz` in UTC; displayed in Europe/London.

## Enum types

```sql
CREATE TYPE product_category AS ENUM (
  'lora-set',
  'aso-oke-kimono',
  'fringe-bubu',
  'naya-jump-suit',
  'lumi-set',
  'jasmine-set',
  'seline-dress',
  'aso-oke-pant',
  'kora-bubu',
  'mina-set'
);

CREATE TYPE batch_item_status AS ENUM ('sellable', 'sold', 'faulty');
```

## Entities

### `products`

| Field | Type | Notes |
|---|---|---|
| `id` | uuid (PK) | Server-generated. |
| `slug` | text (unique, indexed) | Human-readable URL slug. Stable after creation. |
| `name` | text | Display name, e.g. `Lora Set — Red`. |
| `category` | `product_category` | One of the enum values. |
| `description` | text | Marketing copy. |
| `price` | integer (pence) | GBP master price. Display as `£X.XX` in the UI. |
| `sizes` | text[] | Available sizes. Empty array if N/A. |
| `images` | text[] | Absolute URLs (R2). Empty array allowed. |
| `notifyMeEnabled` | boolean | Whether the "Notify Me" button shows. |
| `featured` | boolean | Whether featured on the home page. |
| `createdAt` | timestamptz | UTC. |
| `updatedAt` | timestamptz | UTC. |

**Derived (returned in API responses, never stored):**
- `inStock`: `stockCount > 0`
- `stockCount`: `count(BatchItem where productId = this.id and status = 'sellable')`
- `stockLabel`: `'low-stock'` if `stockCount ∈ [1, 3]`, otherwise `null`

### `production_batches`

| Field | Type | Notes |
|---|---|---|
| `id` | uuid (PK) | Server-generated. |
| `name` | text | Human label, e.g. `Spring 2026 — Batch 1`. |
| `productionCost` | jsonb | `{ materials, logistics, salary, other }` — all integer pence. |
| `marketingCost` | integer (pence) | Single number. |
| `createdAt` | timestamptz | UTC. |
| `updatedAt` | timestamptz | UTC. |

### `batch_items`

| Field | Type | Notes |
|---|---|---|
| `id` | uuid (PK) | Server-generated. |
| `batchId` | uuid (FK → `production_batches.id`, ON DELETE CASCADE) | |
| `productId` | uuid (FK → `products.id`, ON DELETE RESTRICT) | Cannot delete a Product with items. |
| `plannedSalePrice` | integer (pence) | Copied from `Product.price` at creation. Overridable. Frozen for the batch once set. |
| `status` | `batch_item_status` | `sellable` \| `sold` \| `faulty`. |
| `createdAt` | timestamptz | UTC. |
| `updatedAt` | timestamptz | UTC. |

Unique constraint: `(batchId, productId)` is **not** unique — a batch can contain many items of the same product.

### `sales`

| Field | Type | Notes |
|---|---|---|
| `id` | uuid (PK) | Server-generated. |
| `batchItemId` | uuid (FK → `batch_items.id`, ON DELETE CASCADE, UNIQUE) | At most one Sale per BatchItem. |
| `salePrice` | integer (pence) | Actual sale price. |
| `soldAt` | timestamptz | UTC. Set by client or `now()`. |
| `customerName` | text (nullable) | Optional denormalised customer field. |
| `customerContact` | text (nullable) | Optional denormalised customer field. |
| `createdAt` | timestamptz | UTC. |

### `enquiries`

| Field | Type | Notes |
|---|---|---|
| `id` | uuid (PK) | Server-generated. |
| `name` | text | Required. |
| `email` | text | Required. |
| `productId` | uuid (FK → `products.id`, ON DELETE SET NULL) | Optional. Null if not about a specific product. |
| `message` | text | Required. |
| `createdAt` | timestamptz | UTC. |

### `waitlist_entries`

| Field | Type | Notes |
|---|---|---|
| `id` | uuid (PK) | Server-generated. |
| `productId` | uuid (FK → `products.id`, ON DELETE RESTRICT) | Required. |
| `email` | text | Required. |
| `createdAt` | timestamptz | UTC. |

Unique constraint: `(productId, email)` — one waitlist entry per product per email.

### `users`

| Field | Type | Notes |
|---|---|---|
| `id` | uuid (PK) | Server-generated. |
| `email` | text (unique) | Login identifier. |
| `passwordHash` | text | bcrypt or argon2. |
| `createdAt` | timestamptz | UTC. |

### `sessions`

| Field | Type | Notes |
|---|---|---|
| `id` | text (PK) | Opaque random token (cookie value). |
| `userId` | uuid (FK → `users.id`, ON DELETE CASCADE) | |
| `expiresAt` | timestamptz | UTC. Sliding expiry extended on use. |
| `createdAt` | timestamptz | UTC. |

## Relationships

```
Product  1───────*  BatchItem  *───────1  ProductionBatch
   │                                              │
   *──── 0..1  Enquiry  (productId nullable)      │
   │                                              │
   *──── 1..*  WaitlistEntry                      │
                                              │
User  1───────*  Session                      │
                                              │
BatchItem  1───────0..1  Sale   (unique on batchItemId)
```

- **Product ↔ BatchItem**: one Product is referenced by many BatchItems across many batches. RESTRICT on delete (cannot delete a Product with items).
- **ProductionBatch ↔ BatchItem**: CASCADE on delete (deleting a batch deletes its items, which cascades to their Sales). Refused at the API layer if any item is `sold`.
- **BatchItem ↔ Sale**: at most one Sale per BatchItem (unique constraint on `sales.batchItemId`). CASCADE on delete.
- **Product ↔ Enquiry**: optional FK. SET NULL on delete.
- **Product ↔ WaitlistEntry**: required FK. RESTRICT on delete.
- **User ↔ Session**: CASCADE on delete.

## Conventions

- **Currency**: all money values stored as integer pence (`£40 = 4000`). Display formatting handled in the UI layer. Avoids floating-point errors.
- **Timestamps**: UTC at rest; the UI converts to Europe/London for display.
- **IDs**: `gen_random_uuid()` everywhere.
- **Money totals**: always derived (computed in SQL on read), never stored.
- **Stock**: derived, never stored.
