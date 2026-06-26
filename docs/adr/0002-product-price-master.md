# Catalog price is the master; batch planned prices are snapshots

The catalog `Product` carries a `price` (what the website displays) and each `BatchItem` carries a `plannedSalePrice` (what the owner expects to sell that piece for). These two prices can drift apart if we let them. We chose to make `Product.price` the master: when a BatchItem is created, its `plannedSalePrice` is copied from the Product's current `price` (overridable per item by the owner). Once the batch is created, the per-item planned prices are frozen for that batch — the catalog price can change later without retroactively shifting profit projections on existing batches.

## Considered Options

- **`BatchItem.plannedSalePrice` always derived from `Product.price`** — simplest at write time, but a price change silently changes the planned revenue (and projected profit) of every prior batch. Wrong for accounting.
- **`Product.price` and `BatchItem.plannedSalePrice` fully independent** — owner maintains two prices. Highest flexibility, highest friction, and the website doesn't know which one to display.
- **`Product.price` is master, `BatchItem.plannedSalePrice` is a snapshot at creation (chosen)** — stable website display, batch-specific overrides possible, historical batches don't move when the catalog reprices.
