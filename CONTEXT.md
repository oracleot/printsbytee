# PrintsbyTee

The shared vocabulary for the PrintsbyTee platform — the public website (Next.js) and the internal business app for production, cost, and profit management. Both consume a single API.

## Catalog

**Product**:
A sellable item in the catalogue, identified at the colour/style level (e.g. `Lora Set — Red`, `Aso Oke Pant — Maroon`). The unit the website displays and the new app links Batch Items to.
_Avoid_: variant, SKU, item (overloaded with Batch Item)

**ProductCategory**:
A grouping of related Products that differ only by colour or style (e.g. `Lora Set` contains `Lora Set — Red`, `Lora Set — Green`, `Lora Set — Turquoise`, …).
_Avoid_: collection, family, type

**Stock**:
The number of unsold, non-faulty Batch Items linked to a given Product. Derived — not stored.
_Avoid_: inventory, quantity on hand

## Production

**ProductionBatch**:
A single production run containing many Batch Items, with a shared Production Cost and Marketing Cost. Represents one cycle of materials-and-labour investment.
_Avoid_: batch (too generic), production run

**BatchItem**:
A single physical piece within a ProductionBatch. Belongs to one Product, carries a `plannedSalePrice` copied from that Product's `price` at creation (overridable per item), and a status (`sellable` | `sold` | `faulty`).
_Avoid_: piece, unit, stock item

**ProductionCost**:
The total cost of producing a ProductionBatch, broken down by category: `materials`, `logistics`, `salary`, `other`. Attached to the batch — not tracked per Batch Item.
_Avoid_: COGS, cost of goods

**MarketingCost**:
The cost of marketing or selling the items in a specific ProductionBatch. Attached to the batch. Not a business-wide budget.
_Avoid_: marketing budget, ad spend

**Sale**:
A record that a BatchItem has been sold. Carries the actual `salePrice` (overridable from `plannedSalePrice`) and `soldAt`. Deletable — deletion reverts the BatchItem to `sellable`. Recorded only in the business app — the website has no checkout.
_Avoid_: order, transaction, purchase
