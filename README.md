# Sunday League Football Dashboard

A comprehensive web application for managing a weekly football group, built with React, TypeScript, Tailwind CSS, and Firebase.

## Features

### For Admins
- ✅ Add and manage players
- ✅ Schedule matches
- ✅ Assign players to Team A and Team B
- ✅ Add match results with final scores
- ✅ Record goals and assists
- ✅ View and manage all data

### For Players
- ✅ View upcoming matches
- ✅ View team assignments
- ✅ View match results
- ✅ View leaderboard and statistics
- ✅ View player profiles

## Screens

### 1. Login Screen
- Firebase authentication
- Demo login buttons (Admin / Player)
- Email and password login

### 2. Dashboard Home
- Overview cards showing:
  - Upcoming match
  - Total players
  - Last match result
  - Top scorer
  - Top assister
  - Matches played
- Recent matches list
- Top performers list

### 3. Players Screen
- Player cards with stats
- Add/Edit/Delete players (Admin only)
- View player details:
  - Goals, assists, matches played
  - Win rate
  - Position and status

### 4. Matches Screen
- View upcoming and completed matches
- Schedule new matches (Admin only)
- Match details modal
- Team assignment interface
- Drag-and-drop team builder

### 5. Team Assignment
- Assign players to Team A or Team B
- View available players
- Move players between teams
- Auto-balance option

### 6. Match Details
- View match information
- See team lineups
- View final score (for completed matches)
- Edit teams (Admin only)

### 7. Add Match Result (Component)
- Enter final score for Team A and Team B
- Add individual goal details:
  - Scorer
  - Assist (optional)
  - Minute (optional)
- Automatic team assignment based on player selection

### 8. Leaderboard
- Four tabs:
  - Goals + Assists (Total contributions)
  - Goals only
  - Assists only
  - Matches played
- Medal icons for top 3 players
- Highlight cards for:
  - Top scorer
  - Top assister
  - Best overall player

### 9. Player Profile (Component)
- Detailed player statistics
- Match record (W/L/D)
- Recent matches with results
- Goal contributions per match

## Tech Stack

- **Frontend**: React 18 + TypeScript
- **Styling**: Tailwind CSS v4
- **Icons**: Lucide React
- **UI Components**: Radix UI
- **Forms**: React Hook Form
- **Notifications**: Sonner
- **Date Handling**: date-fns
- **Backend**: Firebase
  - Authentication
  - Firestore Database
  - Storage (optional)

## Current State

The application currently runs with **mock data** for demonstration purposes. This allows you to:
- Test all features without Firebase setup
- See the complete UI and user flow
- Understand the data structure

### Demo Login Credentials

**Admin Account:**
- Email: `admin@football.com`
- Password: any password (demo mode)

**Player Account:**
- Email: `player@football.com`
- Password: any password (demo mode)

## Firebase Integration

To use real Firebase authentication and database:

1. See `FIREBASE_SETUP.md` for detailed setup instructions
2. Create a Firebase project
3. Enable Authentication and Firestore
4. Update `src/lib/firebase.ts` with your Firebase config
5. Uncomment production code in `src/contexts/AuthContext.tsx`

## Data Structure

### Players
- name, nickname, position, status
- totalGoals, totalAssists, matchesPlayed
- wins, losses, draws

### Matches
- date, time, location, status
- teamA and teamB with playerIds and scores
- notes (optional)

### Goals
- matchId, scorerId, assistId (optional)
- team (A or B)
- minute (optional)

### Users
- email, role (admin/player)
- playerId (for player accounts)

## Responsive Design

The application is fully responsive and works on:
- ✅ Desktop (1024px+)
- ✅ Tablet (768px - 1024px)
- ✅ Mobile (320px - 768px)

Features mobile navigation with hamburger menu.

## Key Features

### Role-Based Access Control
- Admin users can create, edit, and delete
- Player users have read-only access
- Secured with Firebase Authentication and Security Rules

### Real-Time Statistics
- Automatic calculation of:
  - Player goals and assists
  - Win/loss records
  - Leaderboard rankings
  - Goal contributions per match

### Modern UI/UX
- Clean, sports-themed design
- Green and blue color scheme
- Smooth transitions and hover effects
- Toast notifications for actions
- Modal dialogs for forms

## Development

```bash
# Install dependencies
pnpm install

# Run development server (already running in Figma Make)
# The preview is automatically available

# Build for production
pnpm build
```

## Project Structure

```
src/
├── app/
│   ├── components/
│   │   ├── LoginScreen.tsx
│   │   ├── Layout.tsx
│   │   ├── DashboardHome.tsx
│   │   ├── PlayersScreen.tsx
│   │   ├── MatchesScreen.tsx
│   │   ├── LeaderboardScreen.tsx
│   │   ├── PlayerProfileScreen.tsx
│   │   └── AddResultModal.tsx
│   └── App.tsx
├── contexts/
│   └── AuthContext.tsx
├── lib/
│   └── firebase.ts
├── data/
│   └── mockData.ts
└── types/
    └── index.ts
```

## Next Steps

1. **Set up Firebase** - Follow `FIREBASE_SETUP.md`
2. **Implement Firestore Operations** - Replace mock data with real database calls
3. **Add Player Avatars** - Use Firebase Storage
4. **Deploy** - Host on Firebase Hosting or Vercel
5. **Additional Features**:
   - Match notifications
   - Season tracking
   - Player registration flow
   - Export statistics
   - Team chat/messaging

## License

This project is created for demonstration purposes.

## Support

For Firebase setup help, see `FIREBASE_SETUP.md`
