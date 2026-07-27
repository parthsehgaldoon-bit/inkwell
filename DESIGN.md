# Design Brief

## Direction

Inkwell — a warm literary editor for blogs, notes, and diaries that feels like writing on cream paper at a quiet desk.

## Tone

Refined editorial warmth — cream paper, deep ink, terracotta primary, sage marginalia accent. Rejects the productivity-cliche of cold blue/grey and the AI-cliche of purple gradients.

## Differentiation

A serif display (Fraunces) that reads like a literary journal, paired with a quiet sage accent reserved for the style-review marginalia panel — the writer's desk at golden hour, not a SaaS dashboard.

## Color Palette

| Token      | OKLCH (light)        | Role                          |
| ---------- | -------------------- | ----------------------------- |
| background | 0.97 0.012 75        | warm cream paper              |
| foreground | 0.22 0.025 45        | deep ink text                 |
| card       | 0.99 0.008 75        | elevated paper surface        |
| primary    | 0.48 0.13 35         | terracotta — CTAs, active     |
| accent     | 0.55 0.08 155        | sage — style review, tags     |
| secondary  | 0.93 0.018 70       | quiet surface                 |
| muted      | 0.93 0.018 70       | secondary surfaces            |
| border     | 0.88 0.022 70       | hairline dividers             |
| destructive| 0.5 0.19 25          | delete / unpublish            |

## Typography

- Display: Fraunces — entry titles, page headings, hero text
- Body: General Sans — UI labels, paragraphs, metadata
- Mono: JetBrains Mono — code blocks inside entries
- Scale: hero `text-5xl md:text-6xl font-display font-medium tracking-tight`, h2 `text-3xl font-display tracking-tight`, label `text-xs font-semibold tracking-widest uppercase text-muted-foreground`, body `text-base leading-relaxed`

## Elevation & Depth

Subtle warm shadows (rgba 60,40,20) on cards and popovers; no glow or neon. Three tiers: `shadow-subtle` (resting), `shadow-elevated` (hover/floating), `shadow-ink` (modals/dropdowns). Paper-textured gradients on hero and content surfaces via `bg-paper` / `bg-subtle`.

## Structural Zones

| Zone    | Background         | Border          | Notes                                    |
| ------- | ------------------ | --------------- | ---------------------------------------- |
| Header  | `bg-card`          | `border-b`      | sticky, hairline bottom, Fraunces wordmark |
| Content | `bg-background`    | —               | alternating `bg-muted/30` on list rows   |
| Sidebar | `bg-sidebar`       | `border-r`      | entry list + filters, persistent on desktop |
| Footer  | `bg-muted/40`      | `border-t`      | quiet, signed-off feel                   |
| Review  | `bg-card` panel    | `border-l`      | slide-in right panel, sage accent border |

## Spacing & Rhythm

Spacious literary rhythm — section gaps `gap-8 md:gap-12`, content max-width `max-w-3xl` for reading, `max-w-5xl` for lists. Micro-spacing `gap-2` for tag clusters and metadata rows.

## Component Patterns

- Buttons: terracotta primary (rounded-md, no shadow at rest, `shadow-elevated` on hover), sage ghost for review actions, outline for secondary
- Cards: `rounded-md bg-card shadow-subtle border`, paper gradient on featured/hero cards
- Badges: type pills (blog/note/diary) in muted tones, tag chips in sage-tinted `bg-accent/10 text-accent`
- Entry list rows: hairline dividers, hover lifts to `bg-card` with `shadow-subtle`

## Motion

- Entrance: `animate-fade-in` on page content (0.4s), `animate-fade-in-slow` on hero text (0.6s)
- Hover: `transition-smooth` on interactive elements, cards lift to `shadow-elevated`
- Review panel: `animate-slide-in-right` (0.35s) when triggered after drafting
- Decorative: none — restraint over flourish for a writing tool

## Constraints

- No purple gradients, no cold blue CTAs, no glow shadows
- Sage accent reserved for style-review marginalia and tag chips only
- Entries private by default — no public-feed chrome on the editor
- Tag-based organization only — no collections/categories UI zones
- No per-author profile pages — single shared public feed

## Signature Detail

The style-review panel slides in from the right with a sage `border-l`, framed as marginalia in a manuscript — flagged text appears as if annotated in the margin by a quiet editor, not as inline red underlines while writing.
