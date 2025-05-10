# Klark0 Design System

## Design Principles

- Clean, modern aesthetic with orange accents
- Mobile-first approach
- Consistent spacing and responsive layouts
- Clear typographic hierarchy
- Balance of visual warmth and professional restraint

## Design Tokens

### Colors

**Primary**

- `orange-500` (#F97316)

**Text**

- Headings: `gray-900` (#111827)
- Body: `gray-500` (#6B7280)
- Links: `gray-700` (#374151) → `gray-900` on hover

**Backgrounds**

- Light: `white` (#FFFFFF)
- Secondary: `gray-50` (#F9FAFB)

### Typography

**Font**

- Family: Inter (system sans-serif)

**Weights**

- Regular: `font-medium` (500)
- Bold: `font-bold` (700)

**Sizes**

- H1: `text-4xl`/`text-5xl` (36px/48px)
- H2: `text-3xl` (30px)
- H3: `text-lg` (18px)
- Body: `text-base` (16px)

### Spacing

**Vertical**

- Sections: `py-16` (64px) / `py-20` (80px)
- Between elements: `mt-3` (12px) to `mt-8` (32px)

**Horizontal**

- Container padding: `px-4` (16px) / `px-6` (24px)
- Grid gaps: `gap-8` (32px)

## Components

### Buttons

**Primary**

- Style: `rounded-full` with `text-lg`
- Size: `size="lg"`

**Variants**

- Outline: `variant="outline"`

**Icon Placement**

- `ml-2` (8px) / `ml-3` (12px)

### Form Fields

**Spacing**

- Between fields: `space-y-4` (16px)
- Labels: `mb-2` (8px)
- Sections: `mb-4` (16px)

**Input Fields**

- Padding: `px-3 py-2` (12px × 8px)

**Select Components**

- Item padding: `py-2 px-4 my-1` (8px × 16px × 4px)

### Select Components

- Item padding: `py-2 px-4 my-1` (8px vertical, 16px horizontal, 4px margin)
- Trigger padding: default (matches input fields)
- Content spacing: consistent with form field spacing

### Cards

**Icon**

- Size: `h-12 w-12`
- Style: `rounded-md bg-orange-500 text-white`

**Content**

- Spacing: `mt-5` (20px)

### Layout

- Page Structure: `flex flex-col min-h-screen`
- Grid Layouts:
  - 2-column: `lg:grid lg:grid-cols-2 lg:gap-8`
  - 3-column: `lg:grid lg:grid-cols-3 lg:gap-8`
  - 12-column: `lg:grid lg:grid-cols-12 lg:gap-8`

## UI Patterns

### Hero Sections

- Headline: `text-4xl`/`text-5xl`
- Subheading: `text-3xl block text-orange-500`
- CTA: Button with arrow icon

### Feature Sections

- Layout: Icon + heading + description
- Spacing: Consistent `mt-5`

### Forms

- Spacing: `space-y-4` between fields
- Labels: `mb-2` below
- Messages: `text-sm` with `text-red-500`/`text-green-500`
- Loading: `animate-spin` icon

### Activity Log

- Icon: `bg-orange-100 rounded-full p-2`
- Icon size: `w-5 h-5 text-orange-600`
- Item spacing: `flex items-center space-x-4`
- Text:
  - Main: `text-sm font-medium text-gray-900`
  - Timestamp: `text-xs text-gray-500`

## Responsive Design

- Mobile-first approach with `sm:`, `md:`, `lg:` breakpoints
- Text alignment: `sm:text-center lg:text-left`
- Grid adjustments per breakpoint
