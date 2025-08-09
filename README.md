# Zillow Assistant Frontend
## FIX REPORT (latest)

- Global
  - Added env assertion `src/lib/env.ts` to fail fast if `NEXT_PUBLIC_API_URL` missing
  - Hardened API wrapper `src/lib/api.ts` (JSON headers, detailed errors, CORS-friendly toast, diagnostics console.info)
  - Introduced `ErrorNote` banners for persistent page errors
  - Added `withLoading` helper (exported from api.ts) for optional spinner wiring

- Dashboard `/src/pages/index.tsx`
  - Re-run Scraper now navigates to `/scraper` per spec; Auto Messages toggle persists with rollback on failure
  - Soft status load with error note if missing

- Scraper `/src/pages/scraper.tsx`
  - Button disabled until zip entered; includes filters + `minBedrooms`/`maxPrice` in payload
  - Stores listings for Messages page; shows banner when 0 results

- Messages `/src/pages/messages.tsx`
  - Per-card send respects disabled state; toasts + error banners maintained
  - Send All maintains disabled state and error handling

- Logs `/src/pages/logs.tsx`
  - Robust load + export with error banner and toasts

- Backend (Render)
  - Non-blocking Mongo connect; `/health` includes `dbConnected`
  - Added missing routes: messages, logs, settings, analytics; aligned `/api/scraper/run`

Remaining
  - Dashboard mode toggle toast + rollback on failure (currently optimistic)
  - Messages: show `[Test Mode]` tag when applicable
  - Logs: disable Export if `googleSheetUrl` blank
  - Settings: validate `messageWindow` (end > start)

# Zillow Assistant Frontend

A modern, responsive React dashboard for the Zillow Assistant automation tool. This frontend provides a beautiful interface for managing Zillow property scraping, messaging, and analytics.

## Features

- 🏠 **Property Scraping**: Search and scrape FRBO/FSBO listings from Zillow
- 💬 **Smart Messaging**: Automated message generation and sending to property owners
- 📊 **Analytics Dashboard**: Track performance, response rates, and messaging statistics
- ⚙️ **Settings Management**: Configure Zillow credentials, filters, and automation settings
- 🧪 **Test Mode**: Preview and test message flows before going live
- 📝 **Message Logs**: Track all sent messages with export to Google Sheets

## Tech Stack

- **React 18** with TypeScript
- **Vite** for fast development and building
- **Tailwind CSS** for beautiful, responsive styling
- **Lucide React** for modern icons
- **Space Grotesk** font for professional typography

## Getting Started

### Prerequisites

- Node.js 16+ and npm
- Git

### Installation

1. Clone the repository:
```bash
git clone https://github.com/PropertyPete1/Zillow-Assistant-Frontend.git
cd Zillow-Assistant-Frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser to `http://localhost:3000`

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Dashboard Sections

### 🏠 Dashboard
- Overview statistics and metrics
- Scraper controls and auto-message toggle
- Real-time activity feed

### 🔍 Scraper
- Property search controls
- Listing filters and red flag detection
- Recent listings display

### 💬 Messages
- Individual and batch message sending
- Smart filters for targeted messaging
- Message composition and templates

### 📝 Logs
- Complete message history
- Export functionality to Google Sheets
- Status tracking and filtering

### ⚙️ Settings
- Zillow credentials configuration
- Google Sheets integration
- Search filters and automation settings

### 🧪 Test Mode
- Message flow simulation
- Preview generated messages
- Safe testing environment

### 📊 Analytics
- Performance metrics and trends
- Smart suggestions for optimization
- Response rate tracking

## Configuration

The dashboard supports configuration for:
- Zillow account credentials
- Google Sheets integration
- Message templates and automation settings
- Search filters and red flag detection
- Daily message limits and scheduling

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

This project is private and proprietary.

## Support

For support, please contact the development team or create an issue in the repository.
