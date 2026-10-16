# fashion

Virtual-Try-On-App: Foto von dir + Kleidung hochladen → KI zeigt dir das Outfit an dir → per Feedback anpassen.

Expo (iOS/Android/Web) · NativeWind · Supabase (Auth, Postgres, Storage, Edge Functions) · OpenAI Image API

## Setup

```bash
npm install
# .env mit EXPO_PUBLIC_SUPABASE_URL und EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY anlegen
npx expo start
```

Backend: `supabase/migrations` (Schema + RLS + Storage), `supabase/functions/tryon` (OpenAI-Aufruf).
