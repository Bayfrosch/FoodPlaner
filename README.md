# FoodPlaner - Next.js Version

A modern food planning and shopping list management application built with Next.js 16, React 19, TypeScript, and Tailwind CSS.

## Project Structure

```
src/
├── app/
│   ├── layout.tsx          # Root layout
│   ├── page.tsx            # Home page (redirects to login/dashboard)
│   ├── login/              # Login page
│   ├── register/           # Registration page
│   ├── dashboard/          # Main dashboard
│   ├── list/[listId]/      # Shopping list detail view
│   ├── profile/            # User profile page
│   └── recipes/            # Recipe management
├── components/             # Reusable React components
├── services/              # API and WebSocket services
├── api.ts                 # API client functions
├── assets/                # Static assets
└── styles/                # Global styles
```

## Features

- **User Authentication**: Login and registration system
- **Shopping Lists**: Create, edit, and manage shopping lists
- **Categories**: Organize items by categories
- **Recipes**: Create and manage recipes to add to shopping lists
- **Real-time Updates**: WebSocket support for live updates
- **User Profiles**: Manage user information and settings
- **Responsive Design**: Mobile-friendly interface with dark theme

## Getting Started

### Prerequisites
- Node.js 18+ and npm

### Installation

```bash
# Install dependencies
npm install
```

### Development

```bash
# Run development server
npm run dev

# Open browser to
# http://localhost:3000
```

### Production Build

```bash
# Build for production
npm build

# Start production server
npm start
```

## Technology Stack

- **Framework**: Next.js 16.1.1
- **UI Library**: React 19.2.3
- **Styling**: Tailwind CSS 4
- **Language**: TypeScript 5
- **Database**: PostgreSQL (via pg)
- **Real-time**: WebSocket support
- **Linting**: ESLint

## API Configuration

Update the API_URL in `src/api.ts` to point to your backend:

```typescript
const API_URL = 'http://localhost:3001/api';
```

## Features

### Authentication
- User login/registration
- JWT token-based authentication
- Profile management

### Shopping Lists
- Create new lists with title and description
- Add/remove items
- Organize items by categories
- Mark items as completed
- Share lists with other users

### Recipes
- Create and save recipes
- Add items to recipes
- Quick-add recipes to shopping lists
- Edit/delete recipes

### User Interface
- Dark theme with purple accent colors
- Responsive grid layouts
- Modal dialogs for forms
- Real-time WebSocket updates
- Loading states and error handling

## Environment Variables

No environment variables required for development. The application uses:
- API URL: `http://localhost:3001/api` (configurable in `src/api.ts`)
- WebSocket URL: Auto-detected from window location

## Deployment

The project is configured for Vercel deployment. To deploy:

1. Push code to GitHub
2. Connect repository to Vercel
3. Configure environment variables if needed
4. Deploy with a single click

## Development Notes

- All page components are marked with `'use client'` for client-side rendering
- The app uses Next.js App Router with dynamic routes
- Protected routes check for authentication token in localStorage
- WebSocket connections are established after client-side hydration
- The layout supports both logged-in and non-authenticated states

## License

MIT


## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
