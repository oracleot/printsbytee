# API Surface

All endpoints accept and return JSON, except `POST /uploads` which is multipart. Public endpoints need no auth. Write endpoints (and reads behind auth) require a session cookie obtained from `POST /auth/login`. A shared `INTERNAL_API_KEY` header is required for cross-service calls (e.g. the website calling the API) to prevent accidental public access to write endpoints.

## Auth

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/auth/login` | none | Log in. Body: `{ email, password }`. Sets session cookie on success. |
| POST | `/auth/logout` | session | Clear the session cookie. |
| GET | `/auth/me` | session | Return the current user. |

## Products

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/products` | none | List all products. Each response item includes derived `inStock`, `stockCount`, `stockLabel`. Optional filters: `?category=&inStock=true&featured=true`. |
| GET | `/products/:slug` | none | Get one product by slug. Same derived fields. |
| POST | `/products` | session | Create a product. Body validates against the `Product` schema in `packages/shared`. |
| PATCH | `/products/:id` | session | Update a product. `id` and `slug` are immutable. |
| DELETE | `/products/:id` | session | Hard delete. Refuses if any `BatchItem` references the product. |

## Production Batches

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/batches` | session | List batches. Optional filters: `?from=&to=` (ISO date, inclusive). |
| POST | `/batches` | session | Create a batch. Body: `{ name, productionCost, marketingCost }`. `productionCost` is `{ materials, logistics, salary, other }`. |
| GET | `/batches/:id` | session | Get one batch with items + computed totals (see below). |
| PATCH | `/batches/:id` | session | Update batch `name`, `productionCost`, or `marketingCost`. Items unchanged. |
| DELETE | `/batches/:id` | session | Hard delete. Refuses if any item has status `sold`. |

### Computed totals returned on `GET /batches/:id`

| Field | Formula |
|---|---|
| `itemCount` | total items in the batch |
| `expectedRevenue` | `sum(plannedSalePrice)` where status ∈ {`sellable`, `sold`} |
| `actualRevenue` | `sum(salePrice)` of sold items' Sales |
| `loss` | `sum(plannedSalePrice)` where status = `faulty` |
| `expectedProfit` | `expectedRevenue − productionCost.total − marketingCost` |
| `profitSoFar` | `actualRevenue − productionCost.total − marketingCost` |

## Batch Items

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/batches/:id/items` | session | List items in a batch. |
| POST | `/batches/:id/items` | session | Add items in bulk. Body: `{ items: [{ productId, plannedSalePrice? }] }`. `plannedSalePrice` defaults to the referenced product's current `price`. |
| PATCH | `/batch-items/:id` | session | Update `plannedSalePrice` or `status`. Refuses to set status to `sold` — use the sale endpoint. |
| DELETE | `/batch-items/:id` | session | Hard delete. Refuses if the item has a sale. |

## Sales

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/batch-items/:id/sale` | session | Record a sale. Body: `{ salePrice, soldAt?, customerName?, customerContact? }`. Defaults: `salePrice = item.plannedSalePrice`, `soldAt = now()`. Transitions item to `sold`. |
| DELETE | `/sales/:id` | session | Undo a sale. Deletes the Sale and reverts the item to `sellable`. |

## Enquiries & Waitlist

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/enquiries` | INTERNAL_API_KEY | Submit a contact-form enquiry. Body: `{ name, email, productId?, message }`. Persists to DB and triggers an email notification via SMTP. Requires `Authorization: Bearer <INTERNAL_API_KEY>` header. Only callable by the website's proxies. |
| POST | `/waitlist` | INTERNAL_API_KEY | Join a waitlist. Body: `{ productId, email }`. Requires `Authorization: Bearer <INTERNAL_API_KEY>` header. Only callable by the website's proxies. |

## Uploads

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/uploads` | session | Upload an image (multipart/form-data). Body: `file`. Returns `{ url, contentType, size }`. Streamed to R2. |

## Error format

All errors return:

```json
{ "error": { "code": "string", "message": "string", "details"?: unknown } }
```

Common codes: `VALIDATION_ERROR`, `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `CONFLICT` (e.g. selling an already-sold item), `INTERNAL_ERROR`.
