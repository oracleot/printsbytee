# Office Hours — PrintsbyTee Website
# Project: PrintsbyTee E-Commerce Website
# Created: 2026-04-06
# Status: IN_PROGRESS

---

## 1. What problem does this solve?

PrintsbyTee solves the problem of African diaspora women struggling to find **everyday, statement fashion** that blends cultural pride with modern luxury. Most African fashion brands either serve ceremonial/traditional wear OR generic fast fashion. There's a gap for premium, contemporary African prints that work for everyday styling — a、自信 (confident), culturally rich wardrobe.

**Core problem:** Where do diaspora African women buy bold, modern African-print fashion that isn't traditional wear and isn't generic?

---

## 2. Who's the user?

**Primary:**
- African diaspora women aged 22–40
- Based in UK, US, Europe, Canada
- Fashion-forward, culturally proud, financially independent
- Income bracket: middle to upper-middle class
- Uses Instagram as primary discovery platform

**Secondary:**
- Gift buyers (buying for someone who's proud of their African heritage)
- Fashion bloggers / stylists seeking statement pieces

**User quote:** *"I want to wear my culture without looking like I'm going to a wedding. I want to stand out AND feel premium."*

---

## 3. What's the simplest version?

**MVP (v1) — 4 pages, no payments:**

- Homepage with hero + brand story + featured products
- Products listing page (grid of 20 SKUs with filters)
- Product detail page (gallery, description, size, add-to-inquiry/waitlist)
- Contact page (enquiry form for orders + wholesale)

**Payments (v1+1):**
- Stripe checkout integration
- Cart functionality

**NOT in MVP:**
- Full e-commerce checkout flow
- User accounts / wishlists
- Blog / editorial content
- Multi-language

---

## 4. What's the hardest part?

1. **Design differentiation** — The African fashion e-commerce space is getting crowded (Fashion Vera, Anchebi, Quintence, Ayo Abraham). The site needs to feel distinctly premium and modern without being generic. shadcn/ui is a great component foundation but the brand personality has to come through in custom design choices.

2. **Imagery is everything** — The product photos are ready but we need editorial-quality presentation. If the photography is flat/background-clipped, the premium feel disappears. Art direction for how to display products matters.

3. **Content gap** — 20 SKUs is enough to launch but we need compelling product descriptions that tell a story (not just "Blue andWhite Striped Dress"). The brand is about cultural storytelling.

4. **Conversion without Stripe in MVP** — Inquiry form as the only conversion mechanism (pre-Stripe). Need to make it feel trustworthy and premium, not like "please email me."

---

## 5. What could go wrong?

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Design looks generic / template-heavy | Medium | High | Bold typography choices, warm gold/earth-tone palette, African pattern accents in UI |
| Photography doesn't match brand premium feel | Medium | High | Art direction guide for product shots; consider lifestyle/context shots |
| Load time too slow (image-heavy site) | Low | Medium | Next.js Image optimization, lazy loading, CDN via Vercel |
| Inquiry form has low conversion (no payments) | High | High | Make inquiry flow feel premium; WhatsApp CTA as alternative; Stripe MVP+1 |
| Brand voice feels corporate instead of confident | Medium | Medium | Copywriting with personality — bold, warm, unapologetic |
| Domain DNS / SSL / Vercel config issues | Low | High | Deploy early, test thoroughly |

---

## 6. What could make this exceptional?

- **Heritage storytelling** woven into product descriptions and UI microcopy
- **Cultural pattern library** — African geometric patterns used as decorative UI elements (borders, backgrounds, loaders)
- **Editorial homepage** — not just products; features a "Look" or story, making it feel like a fashion magazine
- **Size/style guide** with African body-type inclusivity in mind
- **WhatsApp integration** for inquiry/ordering — matches the audience's communication preference
- **Lifestyle photography** beyond just flat-lay product shots
- **Cultural day campaigns** — Heritage Month drops, Kwanzaa collections, etc.

---

## 7. What's the measure of success?

| Metric | Target (Month 1) |
|--------|-----------------|
| Site live at printsbytee.co.uk | ✅ |
| All 20 SKUs listed + product pages complete | ✅ |
| Inquiry form functional | ✅ |
| Mobile-first, 90+ Lighthouse performance | ✅ |
| Lighthouse accessibility score | 90+ |
| First 10 orders / inquiries | 30 days post-launch |
| Social media link clicks → site | Track via UTM |

---

## Output for Next Stage (Plan-CEO)

**Confirmed:**
- MVP: 4 pages (Home, Products, Product Detail, Contact) — no Stripe in v1
- Stack: Next.js + Tailwind + shadcn/ui + Vercel
- Domain: printsbytee.co.uk (already registered)
- 20 physical SKUs, photography ready
- Stripe comes in v1+1

**Design Direction (seeded from brief):**
- Premium, bold, modern African luxury
- NOT playful, NOT casual, NOT generic western fast-fashion
- Target: confident African diaspora women
- Design: warm earth tones + gold accents + African geometric pattern accents in UI

---

## Open Questions

1. Do we have the product photos in high-res already, or are they mobile shots?
2. Is there a logo/brand mark already designed, or do we design one too?
3. What are the primary social channels? (Instagram-heavy = image-first design)
4. Is there any existing brand copy/taglines we must keep?
5. Do we want a waitlist/notification feature for "out of stock" items in MVP?
