# Sui Risk Index Frontend

Modern, clean dashboard for the Sui Liquidity Risk Index project.

## Project Structure

```
src/
├── app/              # Next.js App Router pages
│   ├── layout.tsx    # Root layout with navigation
│   ├── page.tsx      # Landing page
│   ├── pools/        # Pools listing and detail pages
│   │   ├── page.tsx
│   │   └── [id]/page.tsx
│   └── identity/     # Risk Identity NFT minting page
│       └── page.tsx
├── components/       # Reusable UI components
│   ├── Navbar.tsx
│   ├── RiskBadge.tsx
│   ├── IdentityBadge.tsx
│   ├── LoadingSpinner.tsx
│   ├── ErrorAlert.tsx
│   ├── SuccessAlert.tsx
│   ├── MetricCard.tsx
│   └── Button.tsx
└── lib/             # Utilities and API client
    ├── api.ts       # Backend API client
    ├── types.ts     # TypeScript interfaces
    ├── utils.ts     # Utility functions
    └── config.ts    # Configuration
```

## Features

### Landing Page (/)
- Hero section with project overview
- Three feature cards explaining the system
- Call-to-action buttons for pools and identity minting
- "How It Works" section

### Pools Page (/pools)
- List all Deepbook liquidity pools
- Display risk scores and metrics for each pool
- Sync pools from Deepbook
- Sync all metrics
- Responsive table/grid layout
- Click through to pool details

### Pool Detail Page (/pools/[id])
- Detailed risk breakdown
- Large risk score display with level badge
- Metrics cards (TVL, Volume, Volatility, IL Risk, Utilization)
- Refresh metrics button
- Copy pool address
- Explanation of risk calculation

### Risk Identity Page (/identity)
- Wallet connection (demo mode)
- Risk score slider (0-100)
- Real-time level preview
- Generate mint payload from backend
- Display Move call details
- Mint NFT button (pseudo implementation)
- SDK integration examples

## Backend Integration

All API calls go through the centralized API client in `src/lib/api.ts`.

Base URL: `http://45.9.30.42:8009` (configurable in `src/lib/config.ts`)

Endpoints used:
- `GET /pools` - List all pools
- `GET /pools/{id}/metrics/latest` - Get pool metrics
- `POST /sync/deepbook/pools` - Sync pools from Deepbook
- `POST /sync/deepbook/metrics` - Sync all metrics
- `POST /sync/deepbook/metrics/{id}` - Sync specific pool metrics
- `POST /risk/identity/mint-payload` - Generate NFT mint payload

## Design System

### Colors
- **Low Risk**: Green (text-green-600, bg-green-50)
- **Medium Risk**: Yellow (text-yellow-600, bg-yellow-50)
- **High Risk**: Red (text-red-600, bg-red-50)
- **Bronze**: Amber (text-amber-700, bg-amber-50)
- **Silver**: Gray (text-gray-700, bg-gray-100)
- **Gold**: Yellow (text-yellow-600, bg-yellow-50)

### Components
- Rounded corners (rounded-lg, rounded-xl)
- Subtle shadows (border + hover:shadow-lg)
- Consistent spacing (p-4, p-6, p-8)
- Responsive grid layouts
- Loading states for async operations
- Error/success alerts with dismiss

## Running the Application

```bash
# Install dependencies
npm install

# Development server
npm run dev

# Production build
npm run build
npm start
```

The application will be available at http://localhost:3000

## Future Enhancements

1. **Wallet Integration**: Replace demo wallet with actual Sui dApp Kit
2. **Real-time Updates**: WebSocket connection for live metric updates
3. **Charts**: Add historical risk score charts using Chart.js or Recharts
4. **Search/Filter**: Add search and filtering to pools table
5. **Dark Mode**: Implement full dark mode support
6. **Notifications**: Toast notifications for better UX
7. **Pool Analytics**: Add more detailed analytics and comparisons

## Notes

- TypeScript strict mode enabled
- All components are functional with React hooks
- Error boundaries for robust error handling
- Responsive design (mobile-first approach)
- SEO-friendly with Next.js metadata
