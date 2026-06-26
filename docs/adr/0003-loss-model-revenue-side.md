# Loss from faulty items is modelled on the revenue side, not the cost side

Faulty `BatchItem`s are unsellable. The owner wants to see a "loss" number for these, and we need to decide which side of the profit equation it lives on. We chose the revenue side: faulty items contribute 0 to `expectedRevenue`, and their wasted materials stay inside `productionCost` (we do not allocate cost per item — the owner has explicitly said they don't want per-item cost tracking). The "loss" displayed in the UI is therefore opportunity loss — the sale value the owner expected but did not realise — not cash loss.

## Considered Options

- **Cost-side loss with per-item cost allocation** — `expectedRevenue − faultyCost` and a separate `loss` line. More accurate P&L (separates opportunity loss from cash loss) but requires per-item cost tracking, which the owner has said they don't want. Adds a column or derivation the owner has to think about on every batch.
- **Revenue-side loss (chosen)** — faulty items contribute 0 to expected revenue; wasted materials stay inside `productionCost`. Matches the owner's stated workflow. Simpler math; the displayed "loss" is what the owner would have made, not what they spent and didn't recoup.
