# Plan-ENG — PrintsbyTee Website
# Project: PrintsbyTee E-Commerce Website
# Created: 2026-04-06
# Previous: 01-plan-ceo.md
# Status: COMPLETE

---

## Overview

Next.js 16.2.2 + TypeScript + Tailwind CSS + shadcn/ui e-commerce site for PrintsbyTee — an African print fashion brand targeting diaspora women. MVP with 4 pages, inquiry form, and Notify Me / Waitlist. Stripe comes in v1+1.

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 16.2.2 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 + shadcn/ui |
| Animations | Framer Motion |
| Icons | Lucide React |
| Forms | React Hook Form + Zod validation |
| Email (contact) | Nodemailer (via API route) |
| Waitlist/Notify | Email collection → stored in JSON file (MVP) |
| Hosting | Vercel |
| Domain | printsbytee.co.uk |

**Dependencies to add:**
- `framer-motion` — page transitions + micro-animations
- `react-hook-form` + `zod` — form handling + validation
- `nodemailer` — contact/enquiry emails
- `@shadcn/ui` components: Button, Input, Label, Textarea, Select, Dialog, Badge

---

## Data Model

### Product

```typescript
interface Product {
  id: string;                    // UUID
  slug: string;                  // URL-friendly name
  name: string;
  category: 'laura-set' | 'short-bubu' | '2-piece-set';
  description: string;           // Storytelling copy
  price: number | null;          // null = client opted out of displaying price
  sizes: string[];               // e.g. ["S", "M", "L", "XL"]
  images: string[];               // Array of image URLs (min 1)
  inStock: boolean;
  notifyMeEnabled: boolean;
  featured: boolean;             // Show on homepage
  createdAt: Date;
}
```

### Waitlist Entry

```typescript
interface WaitlistEntry {
  id: string;
  productId: string;
  email: string;
  createdAt: Date;
}
```

### Enquiry

```typescript
interface Enquiry {
  id: string;
  name: string;
  email: string;
  productInterest: string;        // Optional product name/SKU
  message: string;
  createdAt: Date;
}
```

---

## Page Architecture

### `/` — Homepage

```
Layout:
├── Header (sticky)
│   ├── Logo (left)
│   ├── Nav: Home | Products | Contact (center)
│   └── Icons: Instagram | Facebook | TikTok (right)
├── Hero Section (full-bleed, 80vh)
│   ├── Background: Hero product/lifestyle image
│   ├── Overlay: Brand tagline + "SHOP NOW" CTA
│   └── African pattern accent (corner or divider)
├── Brand Story Snippet (2-column: text + image)
├── Featured Products (3-4 product cards, horizontal scroll mobile)
├── Cultural Pattern Divider (Adinkra-inspired decorative element)
├── Category Showcase (3 category tiles with hover effects)
├── Newsletter CTA (email capture + pattern background)
└── Footer
    ├── Logo + tagline
    ├── Quick links
    ├── Social icons
    └── Copyright
```

**Key components:** `Hero`, `ProductCard`, `CategoryTile`, `PatternDivider`, `NewsletterForm`

---

### `/products` — Products Listing

```
Layout:
├── Page Header (title + category filter tabs)
├── Product Grid (responsive: 1 col mobile, 2 col tablet, 3 col desktop)
│   └── ProductCard
│       ├── Product image (hover: second image or zoom)
│       ├── Category badge
│       ├── Product name
│       ├── Price (conditional — show only if not null)
│       └── "View" button on hover
├── Empty state (if no products in category)
└── Footer
```

**Filtering:** Client-side filter by category (Laura Set / Short Bubu / 2-piece set / All)

---

### `/products/[slug]` — Product Detail

```
Layout:
├── Breadcrumb (Home → Products → [Product Name])
├── Product Layout (2-column desktop, stacked mobile)
│   ├── Image Gallery (left)
│   │   ├── Main image (large, zoomable on hover)
│   │   ├── Thumbnail strip below
│   │   └── Swipeable on mobile
│   └── Product Info (right)
│       ├── Category badge
│       ├── Product name
│       ├── Price (conditional, prominent if shown)
│       ├── Description (storytelling copy)
│       ├── Size selector (radio buttons or pills)
│       ├── Quantity (number input)
│       ├── CTA: "Enquire to Order" (primary)
│       ├── CTA: "Notify Me When Available" (if !inStock && notifyMeEnabled)
│       ├── WhatsApp quick-link (secondary)
│       └── Product details accordion (material, care, sizing guide)
├── Related Products (3-4 cards, same category)
└── Footer
```

**Notify Me flow:** Click → modal with email input → stored to `waitlist.json` → confirmation message.

---

### `/contact` — Contact Page

```
Layout:
├── Page Header ("Get in Touch" + cultural pattern accent)
├── Two-column layout (desktop), stacked (mobile)
│   ├── Contact Info (left)
│   │   ├── Brand story blurb
│   │   ├── Email address
│   │   ├── WhatsApp link
│   │   └── Social icons
│   └── Enquiry Form (right)
│       ├── Name (required)
│       ├── Email (required, validated)
│       ├── Product Interest (optional, text or dropdown of products)
│       ├── Message (textarea, required)
│       └── Submit button
└── Footer
```

**Form submission:** POST to `/api/enquiry` → Nodemailer sends email to client → store in `enquiries.json` → success/error toast.

---

## API Routes

### `POST /api/enquiry`

**Request:**
```json
{
  "name": "string",
  "email": "string",
  "productInterest": "string (optional)",
  "message": "string"
}
```

**Response (success):** `{ "success": true, "id": "uuid" }`
**Response (error):** `{ "success": false, "error": "string" }`

**Validation (Zod):**
- name: min 2 chars
- email: valid email format
- message: min 10 chars

**Side effects:**
- Send email via Nodemailer to `printsbytee.co.uk` inbox
- Append to `data/enquiries.json`

---

### `POST /api/waitlist`

**Request:**
```json
{
  "email": "string",
  "productId": "string"
}
```

**Response (success):** `{ "success": true }`
**Response (duplicate):** `{ "success": true, "message": "You're already on the list" }`

**Side effects:**
- Append to `data/waitlist.json`
- Prevent duplicate emails per product

---

### `GET /api/products`

**Response:** `{ "products": Product[] }`
Returns all products (public endpoint for listing page).

---

### `GET /api/products/[slug]`

**Response:** `{ "product": Product }` or `{ "error": "Not found" }`

---

## File Structure

```
printsbytee/
├── app/
│   ├── layout.tsx              # Root layout (fonts, global styles)
│   ├── page.tsx               # Homepage
│   ├── globals.css            # Global styles + Tailwind
│   ├── products/
│   │   ├── page.tsx          # Products listing
│   │   └── [slug]/
│   │       └── page.tsx      # Product detail
│   ├── contact/
│   │   └── page.tsx          # Contact page
│   └── api/
│       ├── enquiry/
│       │   └── route.ts
│       ├── waitlist/
│       │   └── route.ts
│       └── products/
│           ├── route.ts
│           └── [slug]/
│               └── route.ts
├── components/
│   ├── ui/                    # shadcn/ui components
│   ├── layout/
│   │   ├── Header.tsx
│   │   └── Footer.tsx
│   ├── home/
│   │   ├── Hero.tsx
│   │   ├── BrandStory.tsx
│   │   ├── FeaturedProducts.tsx
│   │   ├── CategoryShowcase.tsx
│   │   └── NewsletterForm.tsx
│   ├── products/
│   │   ├── ProductCard.tsx
│   │   ├── ProductGrid.tsx
│   │   ├── ProductGallery.tsx
│   │   ├── ProductInfo.tsx
│   │   └── NotifyMeModal.tsx
│   └── shared/
│       ├── PatternDivider.tsx
│       └── WhatsAppButton.tsx
├── lib/
│   ├── products.ts            # Product data + getters
│   ├── utils.ts               # cn() helper, formatters
│   └── mail.ts                # Nodemailer setup
├── data/
│   ├── products.json          # Product catalogue (20 SKUs)
│   ├── enquiries.json         # Contact form submissions
│   └── waitlist.json          # Notify-me signups
├── public/
│   ├── images/                # Product images
│   └── patterns/              # SVG African pattern assets
├── SPEC.md                    # Full product spec (this file)
└── next.config.ts
```

---

## Design System — Implementation

### Color Tokens (Tailwind config)

```javascript
colors: {
  black: '#0D0D0D',
  gold: '#C9A84C',
  cream: '#F5F0E8',
  emerald: '#1B4D3E',
  terracotta: '#C75B39',
  offwhite: '#FAFAF8',
}
```

### Typography (next/font or Google Fonts)

```javascript
// layout.tsx
import { Playfair_Display, DM_Sans } from 'next/font/google';

const playfair = Playfair_Display({ subsets: ['latin'], weight: ['400', '700'] });
const dmsans = DM_Sans({ subsets: ['latin'], weight: ['400', '500', '600'] });
```

### African Pattern Component

Create `<PatternDivider />` as a reusable SVG component that renders a geometric Adinkra-inspired divider. Accepts `variant` prop for different patterns.

```tsx
// PatternDivider.tsx
// Variants: 'kasA' | 'gyeNyame' | 'dwennimmen' | 'sankofa'
// Used as: section separators, card borders, hero accent
```

---

## Test Plan

### Functional Tests

| Test | Description | Expected |
|------|-------------|----------|
| Homepage loads | Navigate to `/` | Hero, featured products, brand story all visible |
| Product listing | Navigate to `/products` | All 20 products in grid, filter tabs work |
| Category filter | Click "Laura Set" filter | Only Laura Set products shown |
| Product detail | Click a product | Correct name, price, images, sizes shown |
| Price conditional | Product with `price: null` | Price hidden, no blank space |
| Notify Me modal | Product with `inStock: false` | Modal opens, email input, success on submit |
| Contact form | Submit valid enquiry | Success toast, email received |
| Contact form | Submit invalid email | Validation error shown |
| Mobile responsiveness | Resize to 375px | All pages stack correctly, no horizontal scroll |

### Browser QA (Playwright)

- [ ] All 4 pages load without console errors
- [ ] Navigation between all pages works
- [ ] Forms submit successfully
- [ ] Images load correctly
- [ ] Mobile viewport (375px) — no layout breaks

---

## MVP Deliverables Checklist

- [ ] Homepage with hero, brand story, featured products, newsletter
- [ ] Products page with 20 SKUs + category filter
- [ ] Product detail with gallery, sizes, Notify Me, enquiry CTA
- [ ] Contact page with enquiry form + WhatsApp link
- [ ] Header with logo, nav, social icons
- [ ] Footer with links, social icons
- [ ] African pattern decorative elements throughout
- [ ] Mobile-first responsive design
- [ ] Lighthouse Performance 90+
- [ ] Lighthouse Accessibility 90+
- [ ] All forms functional (enquiry + notify me)
- [ ] Data files created: products.json, enquiries.json, waitlist.json

---

## Pending Assets (from client)

- [ ] Logo file (for Header + Footer)
- [ ] 20 product images (high-res)
- [ ] Instagram handle
- [ ] Facebook handle
- [ ] TikTok handle

---

## Open Questions

1. **Logo format** — Will the client share SVG/PNG? (Need for responsive scaling)
2. **Product descriptions** — Are these written and ready, or do we need to write placeholder storytelling copy?
3. **Email for enquiries** — Where should enquiry emails be sent? (Her personal email or a dedicated address?)

---

## Output for Build Stage

- Architecture defined
- Data model specified
- Pages and components listed
- API routes defined
- Test plan written
- Awaiting: logo, product images, social handles, product descriptions