# fashion – Virtual Try-On App

Expo-App (iOS zuerst, Android + Web nebenbei): Nutzer laden ein Foto von sich und mehrere Kleidungsstücke hoch, die OpenAI Image API erzeugt ein Bild, in dem sie die Kleidung tragen. Danach können sie das Ergebnis per Text-Feedback iterativ ändern. Alle generierten Bilder landen in einer Galerie mit Favoriten.

## Stack

| Bereich | Wahl |
|---|---|
| Framework | Expo SDK 58 (RN 0.88, React 19.3, React Compiler an), TypeScript `strict` |
| Navigation | `expo-router` unter `src/app`, typed routes. **JS-Tabs kommen aus `expo-router/js-tabs`** (nicht aus `expo-router`) |
| Styling | NativeWind 4.2 (Tailwind **3**), Theme-Tokens in `src/global.css` |
| Icons | `lucide-react-native` über den Wrapper `Icon` aus `src/components/ui.tsx` (Farbe per `className="text-*"`) |
| Client State | Zustand (`src/lib/auth-store.ts`) |
| Server State | TanStack Query (`src/lib/queries.ts`) |
| Backend | Supabase-Projekt `fashion` (Ref `yuyoqpwtjuvcmjyadwsf`, Frankfurt, Free-Tier) |
| KI | OpenAI `images.edit`, **nur** in der Edge Function `supabase/functions/tryon` |
| Formatter/Linter | Biome (`npm run format`, `npm run lint`) |

## Grundregeln

- **XP / Fail-Fast:** einfachster Code, der funktioniert. Kein defensives Error-Handling. Supabase-Queries mit `.throwOnError()`.
- **Native Pakete immer mit `npx expo install <pkg>`** installieren.
- Keine Long-Running-Commands (`npx expo start`) durch Claude. Die startet der User.
- **Keine hartkodierten Farben.** Nur Tokens: `background`, `foreground`, `card`, `muted`, `muted-foreground`, `ink` (Text auf Pastell, immer dunkel), `butter`, `blush`, `sage`, `lavender`, `peach`, `destructive`. Neue Farben werden in `global.css` (light + dark) **und** in `tailwind.config.js` angelegt.
- Klassen über `cn()` aus `src/components/ui.tsx` zusammenführen (tailwind-merge).
- UUIDs im App-Code über `expo-crypto` (`randomUUID`). `crypto.randomUUID` gibt es in Hermes nicht.
- Vor dem Commit: `npm run typecheck && npm run lint`

## Design

- Stil „flächig pastell“: große Farbflächen (`rounded-[32px]`), Creme-Hintergrund, weiße runde Icon-Buttons, schwarze Pill-CTAs, keine Outlines.
- Typo: Headlines `font-display` (Plus Jakarta Sans 800, `tracking-tight`), Akzentwörter `font-serif` (Instrument Serif Italic), Fließtext `font-sans`/`font-bold`. In RN wählt die Font-Family das Gewicht, `font-weight` hat darauf keinen Einfluss.
- Schwebende Tab-Bar `src/components/floating-tab-bar.tsx` (Home · + · Galerie). Inhalte unten mit `TAB_BAR_HEIGHT + 48` Padding versehen.

## Layout & Screen-Größen

- Safe Areas über `react-native-safe-area-context`. Nie feste Abstände für Notch oder Home-Indicator.
- Flexbox statt fixer Größen, Bilder per `aspect-[2/3]` + `w-full`.
- Content für Tablet/Web auf `mx-auto w-full max-w-screen-sm` begrenzen.
- `useWindowDimensions()` für responsive Spalten (Galerie: 2 bzw. ab 700 px 3).
- Dynamic Type nicht deaktivieren. Touch-Targets mindestens 44 pt, sonst `hitSlop`.
- Lange Listen mit `FlatList`, nie `.map()` in einer `ScrollView`.
- Native Stack für Swipe-Back. Sheets über `presentation: "formSheet"`. Haptics bei wichtigen Aktionen.

## Supabase & Sicherheit

- CLI über `npx supabase@latest …` (brew-Version ist veraltet).
- In der App nur `EXPO_PUBLIC_SUPABASE_URL` + `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (in `.env`, gitignored). Alles mit `EXPO_PUBLIC_` ist öffentlich.
- OpenAI-Key und Secret-Key **nie** in der App. Der OpenAI-Key liegt als Function-Secret `OPENAI_API_KEY`.
- RLS auf jeder Tabelle: `to authenticated` + `(select auth.uid()) = user_id`, mit `using` **und** `with check`.
- Storage-Buckets `uploads` und `generations` sind privat. Pfadschema `{user_id}/{chat_id}/{uuid}.{ext}`, Anzeige über Signed URLs (expo-image mit `cacheKey` = Bild-ID).
- Uploads als `ArrayBuffer` (`new File(uri).arrayBuffer()` aus `expo-file-system`), nicht als `Blob`.
- Die Edge Function nutzt `withSupabase({ auth: "user" })` und `ctx.supabase`. RLS greift dort ebenfalls, ein Service-Role-Key wird nicht gebraucht.
- Schema-Änderungen: `npx supabase@latest migration new <name>` → `db push` → `db advisors` → Typen neu generieren:
  `npx supabase@latest gen types typescript --linked --schema public > src/lib/database.types.ts`
- Auth: E-Mail + Passwort ohne Bestätigungsmail. Eigene Mail-Templates (z. B. für OTP-Codes) gehen im Free-Tier erst mit eigenem SMTP-Provider.

## Datenmodell

- `chats`: eine Anprobier-Session
- `images`: `kind` ist `person` | `garment` | `generated`, dazu `storage_path` und `is_favorite`
- `generations`: ein Turn mit `input_image_ids[]`, `feedback`, `output_image_id` und `status`
- Turn 1 bekommt als Input Person und Kleidung. Bei einem Feedback-Turn sind es das angezeigte Ergebnis, die Kleidung und der Feedback-Text.

## Testen

- Lokal: `npx expo start` → Expo Go oder iOS-Simulator
- Remote-Tester: `npx expo start --tunnel`
- TestFlight: `eas build` + `eas submit` (Apple-Developer-Account nötig)
- Bundle-Smoke-Test ohne Server: `npx expo export --platform ios --output-dir <tmp>`
