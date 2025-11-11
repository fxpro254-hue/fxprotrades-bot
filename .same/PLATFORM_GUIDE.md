# FxProTrades Bot Platform - Complete Guide

## Overview
FxProTrades is a professional trading bot platform built for Deriv affiliates. It features a stunning black and gold theme and integrates directly with Deriv's API for real-time trading data and OAuth authentication.

## Your Configuration
- **App ID**: 110104
- **OAuth Redirect URL**: https://fxprotrades.site
- **Affiliate Link**: Your custom Deriv affiliate link
- **Theme**: Black and Gold premium design

## Features Implemented

### 1. Landing Page
- Animated background with golden effects
- Deriv OAuth login integration
- Create account button (links to your affiliate link)
- Welcome dialog with guides and FAQs
- Risk disclaimer
- Fully responsive design

### 2. Dashboard
The main dashboard includes:
- **Sidebar Navigation** with 9 sections:
  - Dashboard
  - Bot Builder
  - DTrader
  - Smart Trading
  - Auto
  - Analysis Tool
  - Signals
  - Portfolio
  - Free Bots

- **Real-time Market Data**:
  - Live tick stream from Deriv API (Volatility 100 Index)
  - Animated chart visualization
  - Price and percentage change display
  - Automatic WebSocket reconnection

- **Account Information**:
  - Real-time balance display
  - Currency information
  - Logout functionality

- **Quick Actions**:
  - Import Bot
  - Build New Bot
  - Quick Strategy

- **Bot Status Indicator**:
  - Shows if bot is running or stopped
  - Animated pulse effect

### 3. Deriv API Integration
Full WebSocket integration with:
- Automatic connection/reconnection
- Balance subscription
- Tick stream subscription (real-time price data)
- OAuth authentication flow
- Proper error handling

### 4. Authentication Flow
1. User clicks "Login with Deriv"
2. Redirects to Deriv OAuth page
3. User authorizes your app (App ID: 110104)
4. Returns to your platform with token
5. Token stored in localStorage
6. Dashboard loads with real account data

## How to Use Your Platform

### For Testing Locally:
1. The dev server is running on port 3000
2. Click "Login with Deriv" to test OAuth flow
3. Use your Deriv account or create a demo account
4. After login, you'll see the dashboard with real-time data

### For Production Deployment:
1. Deploy to your domain (fxprotrades.site)
2. Make sure the OAuth redirect URL matches in Deriv's app settings
3. Users will authenticate and see their real account data

## Technical Stack
- **Framework**: Next.js 15 with TypeScript
- **Styling**: Tailwind CSS with custom black/gold theme
- **UI Components**: Shadcn/ui (customized)
- **API**: Deriv WebSocket API
- **Authentication**: Deriv OAuth 2.0

## Files Structure
```
src/
├── app/
│   ├── page.tsx          # Main entry point
│   ├── layout.tsx        # App layout with metadata
│   └── globals.css       # Global styles + animations
├── components/
│   ├── landing-page.tsx  # Login/welcome page
│   ├── dashboard.tsx     # Main dashboard
│   └── ui/               # UI components
│       ├── button.tsx
│       ├── card.tsx
│       ├── dialog.tsx
│       └── input.tsx
└── lib/
    ├── deriv-api.ts      # Deriv API integration
    └── utils.ts          # Utility functions
```

## Customization Options

### Change Theme Colors:
Edit `src/app/globals.css` - look for the `.dark` section:
- `--primary`: Gold color (currently 45 100% 50%)
- `--background`: Black background (currently 0 0% 7%)
- `--accent`: Accent color

### Add New Navigation Items:
Edit `src/components/dashboard.tsx` - find the `navItems` array

### Modify API Endpoints:
Edit `src/lib/deriv-api.ts` - update the constants at the top

### Change Affiliate Link:
Update `AFFILIATE_LINK` in `src/lib/deriv-api.ts`

## Real-time Data Features

The platform connects to Deriv's WebSocket API and provides:
- **Balance Updates**: Real-time account balance
- **Price Ticks**: Live market data for trading instruments
- **Active Symbols**: Available markets
- **Bot Status**: Track bot execution state

## Next Steps for Enhancement

Potential features you could add:
1. **Bot Builder Interface**: Visual block-based bot builder
2. **Strategy Templates**: Pre-built trading strategies
3. **Advanced Charts**: Integration with TradingView or Chart.js
4. **Trade History**: Display past trades and performance
5. **Multi-Account Support**: Switch between demo/real accounts
6. **Mobile App**: PWA capabilities are already set up
7. **Analytics Dashboard**: Profit/loss charts and statistics

## Support & Resources

- **Deriv API Documentation**: https://api.deriv.com
- **Your Deriv App**: https://app.deriv.com
- **Platform URL**: https://fxprotrades.site

## Security Notes

1. OAuth tokens are stored in localStorage (client-side)
2. All API communication is via WSS (secure WebSocket)
3. No sensitive data is stored on the server
4. Affiliate link is public-facing (safe to expose)

---

**Your platform is now ready to use!** 🚀

The black and gold theme creates a premium, professional look that stands out from typical trading platforms. All Deriv API integrations are working, and users can authenticate with their real accounts to see live data.
