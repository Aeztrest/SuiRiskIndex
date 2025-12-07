# Sui Risk Index Frontend

A modern, clean dashboard for the Sui Liquidity Risk Index project.

## Features

- 🎯 Pool risk scoring and monitoring
- 📊 Real-time metrics from Deepbook via Surflux
- 🎨 Risk Identity NFT minting
- 📱 Responsive design
- 🌓 Light/dark mode support

## Tech Stack

- Next.js 15 (App Router)
- React 18
- TypeScript
- Tailwind CSS

## Getting Started

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build
npm start
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

## Backend Configuration

The backend API URL is configured in `src/lib/config.ts`. Default: `http://45.9.30.42:8009`

## Project Structure

```
src/
  app/           # Next.js pages (App Router)
  components/    # Reusable React components
  lib/           # Utilities, API client, types
```
