# Nutrition Tracker

A personal, local-first nutrition tracker for Android, built with React Native and Expo (TypeScript, Expo Router). Data is stored on the phone in SQLite; there is no backend.

## Run it

```bash
npm install
npx expo start
```

Open [Expo Go](https://expo.dev/go) on your Android phone and scan the QR code. Edits appear on the phone automatically while the server is running. Press `r` in the terminal to force a reload (needed after a database migration).

If the app behaves oddly, or after adding a package, changing `app.json`, or editing `.env`, stop the server (Ctrl+C) and restart it with the cache cleared:

```bash
npx expo start -c
```

If the phone can't connect (hotel or office Wi-Fi often blocks it), either connect your computer to your phone's hotspot or run `npx expo start --tunnel`.

## USDA API key

Food search uses the USDA FoodData Central API, which needs a free API key.

1. Go to https://fdc.nal.usda.gov/api-key-signup. If that link has moved, open the FoodData Central site (https://fdc.nal.usda.gov), go to the API Guide, and follow "Get an API Key".
2. Enter your name and email. The key is emailed to you within a couple of minutes (it is issued through api.data.gov, so the email may come from there).
3. In the project root, create or edit `.env` and add the key with no quotes or spaces:

   ```
   EXPO_PUBLIC_USDA_API_KEY=your_key_here
   ```

4. Restart Expo with the cache cleared, because the key is read at startup:

   ```bash
   npx expo start -c
   ```

`.env` is gitignored, so the key is not committed. The key is free; the default limit is 1,000 requests per hour. If the key is missing or wrong, the Food tab in "Add food" shows a message saying so.

## Project layout

- `src/app/`: screens (Expo Router). `(tabs)/` holds the five main tabs: Diary, Foods, Meals, Recipes, Settings.
- `src/db/`: SQLite migrations and queries. Add new migrations to the end of the list in `migrations.ts`; never edit one that has shipped.
- `src/services/`: external APIs (USDA).
- `src/components/`, `src/lib/`, `src/types/`: shared UI, helpers, and types.
