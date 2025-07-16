# kontext.one Design System

## Designprinzipien

- Klare, moderne Ästhetik mit warmen, orangen Akzenten
- Mobile-first Ansatz
- Konsistente Abstände und responsive Layouts
- Deutliche typografische Hierarchie
- Ausgewogene visuelle Wärme und professionelle Zurückhaltung

## Design Tokens

### Farben

**Primärfarbe**

- `orange-500` (#F97316)

**Textfarben**

- Überschriften: `gray-900` (#111827)
- Fließtext: `gray-500` (#6B7280)
- Links: `gray-700` (#374151) – → `gray-900` beim Hover

**Hintergründe**

- Haupt: `white` (#FFFFFF)
- Sekundär: `gray-50` (#F9FAFB)

### Typografie

**Schriftart**

- Primär: Manrope (wie in layout.tsx definiert)

**Gewichte**

- Normal: `font-medium` (500)
- Fett: `font-bold` (700)

**Größen**

- H1: `text-4xl` / `text-5xl` (ca. 36–48px)
- H2: `text-3xl` (ca. 30px)
- H3: `text-lg` (ca. 18px)
- Fließtext: `text-base` (ca. 16px)

### Abstände

**Vertikal**

- Abschnitte: `py-16` (64px) / `py-20` (80px)
- Zwischen Elementen: `mt-3` (12px) bis `mt-8` (32px)

**Horizontal**

- Container-Padding: `px-4` (16px) bis `px-6` (24px)
- Grid-Abstände: `gap-8` (32px)

## Komponenten

### Buttons

**Primär**

- Stil: `rounded-full` mit `text-lg`
- Größe: `size="lg"`

**Varianten**

- Outline: `variant="outline"`

**Icon-Platzierung**

- Zwischenräume: `ml-2` (8px) oder `ml-3` (12px)

### Formularfelder

**Abstände**

- Zwischenfelder: `space-y-4` (16px)
- Labels: `mb-2` (8px)
- Abschnittsabstände: `mb-4` (16px)

**Inputfelder**

- Innenabstand: `px-3 py-2` (z. B. 12px horizontal, 8px vertikal)

### Select-Komponenten

- Element-Innenabstand: `py-2 px-4 my-1` (8px vertikal, 16px horizontal, 4px Margin)

### Karten

**Icons**

- Größe: `h-12 w-12`
- Stil: `rounded-md bg-orange-500 text-white`

**Inhalt**

- Abstand: `mt-5` (20px)

**Karten-Komponenten**

- **Standardkarte**
  - Verwendung: Dient zur Darstellung zusammenhängender Informationen in einem abgetrennten Container.
  - Merkmale:
    - Abgerundete Ecken (`rounded-lg`)
    - Optionaler Header, Inhalt und Footer
    - Schatten (`shadow-lg`) für visuelle Tiefe

- **Header**
  - Textstil: `text-xl font-bold`
  - Optionaler Hintergrund und Padding (`p-4`)

- **Inhalt**
  - Polsterung: `p-4` bis `p-6`
  - Konsistente interne Abstände zwischen Elementen

- **Footer**
  - Optionale Aktionselemente oder Zusammenfassungen

### Layout

- Seitenstruktur: `flex flex-col min-h-screen`
- Grid-Layouts:
  - Zweispaltig: `lg:grid lg:grid-cols-2 lg:gap-8`
  - Dreispaltig: `lg:grid lg:grid-cols-3 lg:gap-8`
  - Zwölfspaltig: `lg:grid lg:grid-cols-12 lg:gap-8`

## UI-Muster

### Sidebar Navigation

**Layout**

- Struktur: `flex flex-col w-64 min-h-screen bg-white border-r border-gray-200`
- Abstände: `px-4 py-6` (16px × 24px)
- Breakpoints: sichtbar ab `md:` (mobile über Toggle)

**Navigationselemente**

- Aktiver Zustand: `bg-orange-50 text-orange-700`
- Hover-Zustand: `hover:bg-gray-50`
- Abstände: `px-3 py-2 mb-1` (12px horizontal, 8px vertikal, 4px Margin)
- Icon: `w-5 h-5 mr-3` (20px × 20px mit 12px Abstand)

**Submenüs**

- Einrückung: `ml-8` (32px)
- Transition: `transition-all duration-200 ease-in-out`

### Hero-Bereiche

- Überschrift: `text-4xl`/`text-5xl`
- Unterüberschrift: `text-3xl block text-orange-500`
- Call-to-Action: Button mit Pfeilsymbol

### Feature-Bereiche

- Layout: Kombination aus Icon, Überschrift und Beschreibung
- Abstand: Konsistente `mt-5`

### Formulare

- Abstand: `space-y-4` zwischen Feldern
- Labels: `mb-2`
- Meldungen: `text-sm` mit `text-red-500` oder `text-green-500`
- Ladezustände: `animate-spin` für Icons

### Aktivitätsprotokoll

- Icon: `bg-orange-100 rounded-full p-2`
- Icon-Größe: `w-5 h-5 text-orange-600`
- Elementabstand: `flex items-center space-x-4`
- Text:
  - Haupt: `text-sm font-medium text-gray-900`
  - Zeitstempel: `text-xs text-gray-500`

## Responsives Design

- Mobile-first Ansatz mit `sm:`, `md:`, `lg:` Breakpoints
- Textausrichtung: `sm:text-center`, `lg:text-left`
- Grid-Anpassungen je Breakpoint
