# FoodPlaner Next.js Migration - Quick Start

## What's Been Done

✅ **Complete Next.js Project Setup**
- Created a new Next.js 16 project with TypeScript, Tailwind CSS, and ESLint
- Migrated all components from the React/Vite frontend
- Converted React Router pages to Next.js App Router routes
- Fixed SSR compatibility issues (window/localStorage checks)
- Successfully built the production bundle

## Project Structure

```
src/
├── app/
│   ├── page.tsx              # Home (redirects to login/dashboard)
│   ├── login/page.tsx        # Login page
│   ├── register/page.tsx     # Registration page
│   ├── dashboard/page.tsx    # Main dashboard
│   ├── list/[listId]/page.tsx # Shopping list details
│   ├── profile/page.tsx      # User profile
│   ├── recipes/page.tsx      # Recipe management
│   ├── layout.tsx            # Root layout
│   └── globals.css           # Global styles
├── components/               # Reusable components
│   ├── CreateListModal.tsx
│   ├── ListCard.tsx
│   ├── ListItemWithCategory.tsx
│   ├── RecipeCard.tsx
│   ├── RecipeModal.tsx
│   ├── ShareListModal.tsx
│   └── ShoppingItem.tsx
├── services/
│   ├── api.ts               # API client
│   └── websocket.ts         # WebSocket service
├── api.ts                   # API endpoints
└── assets/                  # Images and assets
```

## File Summary

- **Total Source Files**: 18 TypeScript/TSX files
- **Pages Created**: 7 (login, register, dashboard, list detail, profile, recipes, home)
- **Components Migrated**: 7 reusable components
- **Build Status**: ✅ Success (0 errors)

## How to Run

### Development Mode
```bash
cd /home/bay/Documents/FoodPlaner/nextjs
npm run dev
```
Open http://localhost:3000

### Production Build
```bash
npm run build
npm start
```

### Linting
```bash
npm run lint
```

## Key Changes from Original Frontend

1. **Routing**: Changed from React Router (BrowserRouter, Routes) to Next.js App Router
2. **Navigation**: Changed `useNavigate()` to `useRouter()` and `navigate()` to `router.push()`
3. **SSR Safety**: Added `typeof window !== 'undefined'` checks for localStorage access
4. **Client Components**: Added `'use client'` directive to all interactive pages
5. **Hydration**: Implemented client-side state checking to prevent SSR mismatches
6. **Build Configuration**: Next.js with Turbopack for fast builds

## Important Notes

- The application expects a backend API running on `http://localhost:3001/api`
- WebSocket server should also be available at `ws://localhost:3001`
- All authentication tokens are stored in localStorage
- The app redirects non-authenticated users to `/login`
- The home page (`/`) automatically redirects based on authentication status

## Next Steps

1. Update `src/api.ts` with your backend URL if different
2. Ensure backend is running
3. Run `npm run dev` to start development
4. Test all features (login, create lists, add items, manage recipes)
5. For production deployment, use `npm run build && npm start`

## Troubleshooting

**Issue**: "window is not defined" errors
- **Solution**: All components already have SSR safety checks; rebuild with `npm run build`

**Issue**: API connection errors
- **Solution**: Verify backend is running on `http://localhost:3001`
- Check `src/api.ts` for correct API_URL configuration

**Issue**: WebSocket connection fails
- **Solution**: Ensure WebSocket server is running on same host as API
- Update `src/services/websocket.ts` if using different URL

## Migration Complete! 🎉

Your FoodPlaner application is now fully migrated to Next.js with:
- Modern React 19
- TypeScript for type safety
- Tailwind CSS for styling
- Server-side rendering capabilities
- Production-ready build
