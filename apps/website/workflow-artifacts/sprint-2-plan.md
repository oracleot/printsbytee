# PrintsbyTee Homepage — Aceternity UI Component Plan

> **Status:** Planning only. Do NOT install Aceternity UI until Dami approves.

**Brand:** PrintsbyTee — African print ready-to-wear fashion for bold and beautiful African women.
**Aesthetic:** Afro-Luxe Modern — rich, warm, sophisticated, heritage-forward.

---

## 1. Bento Grid

**Where on homepage:** Featured Products / Product Categories section

**Visual sketch:**
```
┌────────────────────────┬──────────────────┐
│                        │                  │
│    FEATURED DRESS      │   BLAZER         │
│    (large, 2 cols)     │   (small)        │
│                        ├────────┬─────────┤
│                        │ KIMONO │ STOLE   │
├────────────┬───────────┴────────┴─────────┤
│  MAXI DRESS│         NEW ARRIVALS BADGE     │
│  (tall)    │                                │
└────────────┴────────────────────────────────┘
```

**How it elevates the Afro-Luxe Modern brand:**
The Bento Grid's asymmetric layout mirrors how African print fabrics are draped and layered — the varied box sizes create visual rhythm and depth, much like the bold patterns of Ankara and Kente fabrics. It showcases product variety in a premium, editorial way that feels like a fashion magazine spread rather than a standard e-commerce grid.

---

## 2. Hero Parallax (Parallax Hero Images)

**Where on homepage:** Hero / Above the fold section (replaces current hero)

**Visual sketch:**
```
                    ┌──────────────────────────┐
    FABRIC SWATCH   │  "Wear Your Heritage"  │
    (parallax bg)   │                         │
    ┌───────────┐   │  Premium African Print  │
    │ ANKARA    │   │  Ready-to-Wear          │
    │ PATTERN   │   │                         │
    │ (blur,    │   │  [Shop Collection →]    │
    │  parallax)│   │                         │
    └───────────┘   └──────────────────────────┘
        ↕ scroll moves at different depth
```

**How it elevates the Afro-Luxe Modern brand:**
The parallax effect creates a sense of depth and dimension that mirrors the layered, textile-rich nature of African fashion. As users scroll, the African print imagery moves at a different depth than the headline text, creating an immersive, cinematic experience that makes the brand feel luxurious and intentional.

---

## 3. Sparkles Background (Hero section)

**Where on homepage:** Hero background effect (behind the hero text)

**Visual sketch:**
```
    ✦  ·  ✦      ✦       ·   ✦
  ·    ✦    · ✦    ·  ✦    ·
       ·  ✦      ·    ✦  ·    ✦
  ┌────────────────────────────────┐
  │  ✦  PrintsbyTee  ✦             │
  │  "Bold Prints. Beautiful You" │
  │       [Explore →]              │
  │  ✦   ·   ✦    ✦   ·   ✦       │
  └────────────────────────────────┘
      (gold sparkle particles drift)
```

**How it elevates the Afro-Luxe Modern brand:**
The warm gold sparkles against a dark or cream background evoke the shimmer of gold jewelry worn with African print garments — a hallmark of Afro-Luxe styling. The "stars" feeling reinforces the "bold and beautiful" narrative and adds a premium, celebratory quality to the homepage without being garish.

---

## 4. Sticky Scroll Reveal (Brand Story section)

**Where on homepage:** "Our Story" / Brand Heritage section (between hero and products)

**Visual sketch:**
```
SCROLL ──────────────────────────────────────►

[STICKY PANEL — stays in view]
┌──────────────────────────────────────┐
│  ✦ Our Heritage ✦                   │
│                                      │
│  "Every PrintsbyTee piece           │
│   is a celebration of African       │
│   artistry..."                      │
│                                      │
│  [fades in on scroll]               │
│  ↕ scroll reveals next paragraph    │
│  [fades in] "From our hands        │
│   to your wardrobe..."              │
└──────────────────────────────────────┘

[CONTENT BLOCKS — scroll past the sticky panel]
   Block 1 (artisan hands + fabric)
   Block 2 (design sketch + measurements)
   Block 3 (finished garment on model)
```

**How it elevates the Afro-Luxe Modern brand:**
The sticky scroll creates a storytelling pace — the brand has a meaningful narrative (heritage, artisans, craftsmanship) that deserves to be told with ceremony rather than rushed past. This component slows users down and immerses them in the brand story, reinforcing the "premium" positioning.

---

## 5. Animated Testimonials (Customer Reviews)

**Where on homepage:** Social proof section (between products and footer CTA)

**Visual sketch:**
```
┌─────────────────────────────────────────────┐
│         ✦ What Our Customers Say ✦          │
│                                             │
│   ┌─────────────────────────────────────┐   │
│   │  "I've never felt more beautiful    │   │
│   │   in an African print dress..."     │   │
│   │                                     │   │
│   │       ⭐⭐⭐⭐⭐                        │   │
│   │                                     │   │
│   │   — Amara K., London                │   │
│   │     [photo avatar]                  │   │
│   └─────────────────────────────────────┘   │
│                                             │
│      ◀  ● ○ ○  ●  ○  (carousel dots)  ▶    │
│                                             │
│   [card slides in from right on transition] │
└─────────────────────────────────────────────┘
```

**How it elevates the Afro-Luxe Modern brand:**
The smooth, elegant card transitions mirror the fluidity of well-draped fabric. Featuring real customer names, locations, and photos adds authentic social proof. The premium animation quality signals that PrintsbyTee is a brand that pays attention to every detail — including how testimonials are presented.

---

## Recommended Implementation Order

1. **Bento Grid** — Most impactful for product discovery, easiest to integrate
2. **Hero Parallax** — High visual impact at first impression
3. **Animated Testimonials** — Builds trust, medium complexity
4. **Sparkles** — Subtle polish for hero background
5. **Sticky Scroll Reveal** — For brand storytelling, highest complexity

---

## Notes for Dami

- All components require Framer Motion (already installed) + Tailwind CSS
- Aceternity UI components are MIT licensed, copy-paste into the project
- No vendor lock-in — we copy the components we need, no external dependency
- Let me know which components to prioritize and I'll begin integration
