# Keneta E-commerce Frontend

This project is a storefront for the **Keneta** e‑commerce platform. It is built with [React](https://react.dev/) and [Vite](https://vitejs.dev/) and communicates with a Bagisto/Laravel backend.

## Features

- Product catalogue with pagination and search
- Shopping cart with guest and customer modes
- Customer authentication and registration
- Checkout flow (address, shipping, payment)
- Responsive layout styled with Tailwind CSS

## Prerequisites

- Node.js 18 or later
- npm (comes with Node.js)

## Installation

```bash
npm install
```

### Development server

Start a local dev server with hot reloading:

```bash
npm run dev
```

The dev server proxies API requests to `https://keneta.laratest-app.com/api` as configured in `vite.config.js`.

### Linting

Run ESLint on the project:

```bash
npm run lint
```

### Build for production

```bash
npm run build
```

This outputs static files to the `dist` directory. You can preview the build locally with:

```bash
npm run preview
```

## Project structure

- `src/` – React components, pages and API utilities
- `public/` – static assets served as-is
- `vite.config.js` – Vite configuration with API proxy rules
- `vercel.json` – rewrite rules used when deploying to Vercel


## License

This project is proprietary code developed for the Keneta client.
