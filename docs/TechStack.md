# Technology Stack Documentation

## Frontend Framework

- **Next.js (TypeScript)**
  - Server-side rendering and Server Actions
  - Built-in API routes and Middleware to protect routes and validate inputs (e.g. via Zod)
  - File-based routing using Next.js 13 app directory
  - next/font for optimized fonts

## UI Components & Styling

- **React.js**
  - Component-based architecture with improved SSR support
- **shadcn/ui**
  - Prebuilt, accessible UI components
  - Integration with Tailwind CSS and class-variance-authority (cva) for variant styling
- **Global Styles**
  - Use of globals.css and custom theming

## Backend & Data Storage

- **Database**
  - PostgreSQL database
- **ORM**
  - Drizzle ORM for type-safe database queries
- **API routes & Server Actions**
  - Next.js API routes for backend logic
  - Server Actions for form handling and settings update

## Filesystem Integration

- **Filesystem Access**
  - Integration with external filesystems via WebDAV and klark0fs
  - Custom API endpoints to fetch and update file tree views

## Authentication & Security

- **Auth**
  - JWT-based session cookies for authentication
  - Global and local middleware for route protection and input validation

## Payment Processing

- **Stripe**
  - Subscription management and checkout via Stripe
  - Customer portal integrations and webhook handling

## Development Principles

1. Type safety using TypeScript
2. Component reusability with shadcn/ui
3. Server Actions & Middleware for secure and efficient updates
4. Accessibility compliance and responsive design
5. Progressive enhancement and performance optimization
