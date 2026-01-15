# FoodPlaner - Setup and Development Guide

## Quick Start

### One-Command Setup (Recommended)
```bash
cd /home/bay/Documents/FoodPlaner
./start-dev.sh
```

This will start both the backend and frontend servers automatically.

### Manual Start (Two Terminals)

**Terminal 1 - Backend Server (Port 3001)**
```bash
cd /home/bay/Documents/FoodPlaner/backend
npm run dev
```

**Terminal 2 - Frontend Server (Port 3000)**
```bash
cd /home/bay/Documents/FoodPlaner/nextjs
npm run dev
```

## Access Points

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001/api
- **WebSocket**: ws://localhost:3001

## Default Credentials (if seed data exists)

Check your backend for any pre-seeded test users. If not, you can:
1. Click "Hier registrieren" on the login page
2. Create a new account with email and password
3. Start using the application

## Project Structure

```
FoodPlaner/
├── nextjs/              # React frontend with Next.js
│   ├── src/
│   │   ├── app/        # Next.js App Router pages
│   │   ├── components/ # Reusable components
│   │   ├── services/   # API and WebSocket clients
│   │   └── api.ts      # API configuration
│   └── public/         # Static assets
├── backend/            # Express backend
│   ├── server.ts       # Main server file
│   ├── middleware/     # Auth middleware
│   └── prisma/         # Database schema
└── frontend/           # Original Vite frontend (reference)
```

## Features

### User Management
- ✓ Registration and login
- ✓ Profile editing
- ✓ Password change

### Shopping Lists
- ✓ Create lists
- ✓ Add/remove items
- ✓ Categorize items
- ✓ Mark items as completed
- ✓ Share lists with other users

### Recipes
- ✓ Create recipes
- ✓ Add items to recipes
- ✓ Quick-add recipes to shopping lists

### Real-time Updates
- ✓ WebSocket support
- ✓ Live list updates
- ✓ Instant item synchronization

## Common Issues

### "Failed to fetch" Error
**Problem**: Backend is not running
**Solution**: 
```bash
cd /home/bay/Documents/FoodPlaner/backend
npm run dev
```

### "Cannot GET /login" with 404
**Problem**: Frontend is not running
**Solution**:
```bash
cd /home/bay/Documents/FoodPlaner/nextjs
npm run dev
```

### Logo not showing (404 for FoodPlaner.png)
**Problem**: Image file is missing
**Solution**: Already copied to `nextjs/public/FoodPlaner.png`. The page will auto-refresh once the backend is running.

### CORS or Connection Errors
**Problem**: Frontend can't reach backend
**Solution**:
1. Verify backend is running on port 3001
2. Check `src/api.ts` API_URL configuration
3. Ensure no firewall is blocking connections

## API Documentation

### Authentication
- `POST /api/auth/register` - Create new account
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/profile` - Update profile

### Shopping Lists
- `GET /api/lists` - Get all user lists
- `POST /api/lists` - Create new list
- `GET /api/lists/:id` - Get list details
- `DELETE /api/lists/:id` - Delete list

### List Items
- `GET /api/lists/:id/items` - Get items in list
- `POST /api/lists/:id/items` - Add item
- `PUT /api/lists/:id/items/:itemId` - Update item
- `DELETE /api/lists/:id/items/:itemId` - Delete item

### Recipes
- `GET /api/recipes` - Get all recipes
- `POST /api/recipes` - Create recipe
- `DELETE /api/recipes/:id` - Delete recipe
- `POST /api/recipes/:id/add-to-list` - Add recipe to shopping list

## Environment Configuration

### Frontend
No environment variables needed for development. The app automatically connects to:
- API: `http://localhost:3001/api`
- WebSocket: Auto-detected from browser location

### Backend
Check `.env` file for:
```
DATABASE_URL=   # PostgreSQL connection
JWT_SECRET=     # JWT signing key
PORT=3001       # Server port (default)
```

## Development Workflow

1. **Start both servers** (use `./start-dev.sh`)
2. **Open browser** to http://localhost:3000
3. **Register or login** with test account
4. **Test features**:
   - Create a shopping list
   - Add items and categorize them
   - Create a recipe and add it to a list
   - Share list with another user
   - See real-time updates via WebSocket

## Database Management

### Reset Database
```bash
cd /home/bay/Documents/FoodPlaner/backend
npm run db:reset
```

### Run Migrations
```bash
npm run prisma:migrate
```

### Seed Initial Data
```bash
npm run prisma:seed
```

## Performance Tips

- Clear browser cache if styles look broken: `Ctrl+Shift+Delete`
- Use browser DevTools to check network requests if API fails
- Check browser console for JavaScript errors
- Verify both servers are running if features aren't working

## Next Steps

1. ✅ Both servers are running
2. ✅ Logo is in place
3. Try creating a test list and adding items
4. Test recipe functionality
5. Share a list and verify real-time updates
6. Deploy to production when ready!

## Support

If you encounter issues:
1. Check that both servers are running
2. Verify API_URL in `nextjs/src/api.ts`
3. Check browser console for errors
4. Review server logs in terminal output
