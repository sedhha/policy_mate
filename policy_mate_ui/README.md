# Policy Mate UI

Modern compliance management platform with AWS Cognito authentication.

## Quick Setup

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Configure Environment

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```env
NEXT_PUBLIC_AWS_REGION=us-east-1
NEXT_PUBLIC_COGNITO_CLIENT_ID=your_client_id_here
```

### 3. Run Development Server

```bash
pnpm dev
```

Visit http://localhost:3000

## AWS Cognito Setup

1. Create User Pool in AWS Cognito Console
2. Enable sign-in with Email and Username
3. Create App Client (Public client)
4. Enable authentication flows:
   - `ALLOW_USER_PASSWORD_AUTH`
   - `ALLOW_REFRESH_TOKEN_AUTH`
5. Copy Client ID to `.env.local`

## Features

- � Secure authentication with AWS Cognito
- 🎨 Professional UI with Tailwind CSS
- ⚡ Server components for optimal performance
- 🛡️ Protected routes with auto-redirect
- 🔄 Session persistence & token refresh
- 📱 Responsive design

## Routes

- `/` - Redirects to login
- `/login` - User login (with redirect support)
- `/register` - User registration
- `/confirm` - Email confirmation
- `/dashboard` - Protected dashboard

## Tech Stack

- Next.js 15 (App Router)
- TypeScript
- Tailwind CSS v4
- Zustand (State Management)
- AWS Cognito

## Commands

```bash
pnpm dev      # Development
pnpm build    # Production build
pnpm start    # Production server
pnpm lint     # Run linter
pnpm format   # Format code
```
