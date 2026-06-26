# Plan-CEO — PrintsbyTee Website
# Project: PrintsbyTee E-Commerce Website
# Created: 2026-04-06
# Previous: 00-office-hours.md
# Status: COMPLETE

---

## Problem Statement (from Office Hours)

African diaspora women aged 22–40 want everyday, statement fashion that blends cultural pride with modern luxury. Most options are either ceremonial traditional wear OR generic fast fashion. PrintsbyTee fills the gap — premium, contemporary African prints for confident, culturally proud women who see clothing as identity.

---

## Product Decisions

### Scope Mode: **HOLD SCOPE** (intentional MVP focus)

We ship exactly what's defined. No expansion until v1 is live and validated.

### What We're Building (MVP v1)

| Page | Features |
|------|----------|
| **Homepage** | Hero section, brand story snippet, featured products (6), cultural pattern accent elements, newsletter CTA |
| **Products** | Grid listing all 20 SKUs, category filter (Laura Set / Short Bubu / 2-piece set), hover effects, quick-view on click |
| **Product Detail** | Image gallery (swipeable), product name, price (conditional render), description with storytelling, size selector, "Enquire to Order" CTA, Notify Me / Waitlist (for out-of-stock), related products |
| **Contact** | Enquiry form (name, email, product interest, message), WhatsApp quick-link CTA |

**NOT in v1:** Full cart, Stripe checkout, user accounts, wishlist, blog

### What's Coming in v1+1

- Stripe payment integration
- Full cart + checkout flow
- Order confirmation emails

---

## Brand Design Direction (MVP)

### Aesthetic: **"Afro-Luxe Modern"**

Modern editorial luxury with unmistakably African DNA. Think: the sophistication of a Reformation editorial, the boldness of a Valentino campaign, the cultural richness of Ankara print archives.

### Color Palette

| Color | Hex | Usage |
|-------|-----|-------|
| **Obsidian Black** | `#0D0D0D` | Primary text, headers, CTA backgrounds |
| **African Gold** | `#C9A84C` | Accent, hover states, decorative elements, price |
| **Warm Cream** | `#F5F0E8` | Background, card backgrounds |
| **Deep Emerald** | `#1B4D3E` | Secondary accent, cultural nod |
| **Terracotta** | `#C75B39` | Warm accent, CTAs, highlights |
| **Off-White** | `#FAFAF8` | Page backgrounds |

### Typography

- **Headlines:** Bold serif — *Playfair Display* or *Cormorant Garamond* — editorial, confident, luxury
- **Body / UI:** Clean sans-serif — *DM Sans* or *Outfit* — modern, readable
- **Accent / Labels:** Small caps, letterspaced — for category labels, size tags

### African Pattern Accents

Geometric West African patterns (Adinkra-inspired) used as:
- Section dividers
- Card borders / corners
- Loader / loading states
- Hover decorative overlays
- Footer background texture

**Rule:** Pattern as accent, never overwhelming. Let the product photography lead.

### Layout Principles

- **Editorial first** — homepage feels like a fashion magazine spread, not a product grid
- **Generous whitespace** — luxury breathing room
- **Image dominant** — product photos are heroes, UI is minimal and recedes
- **Mobile-first** — majority of target audience browses on mobile

---

## Open Questions — ANSWERED

1. **Photography** — iPhone 17 Pro Max shots ✅ (high-res, studio-level quality)
2. **Logo** — Already exists, sharing pending ⏳
3. **SKU Breakdown** — Custom categories: **Laura Set**, **Short Bubu**, **2-piece set**
4. **Pricing** — Yes, display prices — but make rendering conditional per product (client can opt out per SKU)
5. **Stock** — Need **Notify Me / Waitlist** feature in MVP
6. **Socials** — Instagram, Facebook, TikTok handles → needed for header/footer

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Site live at printsbytee.co.uk | Week 4 |
| All 20 SKUs live with full product pages | Week 4 |
| Inquiry form submission rate | 5%+ of visitors |
| Notify Me / Waitlist functional | Week 4 |
| Lighthouse Performance score | 90+ |
| Lighthouse Accessibility score | 90+ |
| First paid order (post-Stripe integration) | Week 6–8 |

---

## Output for Next Stage (Plan-ENG)

- Scope locked: 4 pages, Notify Me / Waitlist in v1
- Design system defined: Afro-Luxe Modern palette + typography
- African pattern accents as decorative UI elements
- Prices conditionally rendered per product
- Logo pending from client
- Socials (IG, FB, TikTok) pending from client