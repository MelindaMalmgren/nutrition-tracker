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

## Barcode scanning

"Scan barcode" on the Food tab of "Add food" looks a code up in this order: foods you've already saved, [Open Food Facts](https://world.openfoodfacts.org) (no key needed), then USDA branded foods (needs the key above). Anything found is saved to your Foods list, so a repeat scan works offline. The first scan asks for camera permission.

## Serving sizes

When adding a food, the **Serving size** dropdown lists the food's label serving, `1 g` / `1 oz` / `100 g` (for gram-based foods), and household measures such as "1 cup, sliced (150 g)" when the source has them. USDA only provides household measures for non-branded foods (Foundation and SR Legacy), fetched when you pick the food. To log something you weighed, pick `1 g` and enter the grams as Servings. Nutrition rescales automatically.

## Recipes

A recipe is a list of ingredients and how many servings it makes. Each ingredient is a number of servings of a chosen serving size (grams, ounces, or a household measure like "1 cup, sliced (150 g)"); tap an ingredient to change either. Per-serving nutrition is the whole pot divided by that number. Saved recipes are logged like any other food from **Add food > Recipes**, and can also be added to meals. Ingredients can come from your saved foods, a USDA search, or a barcode scan. Editing a custom food updates every recipe that uses it, and a food used in a recipe can't be deleted until it is removed from the recipe.

## Project layout

- `src/app/`: screens (Expo Router). `(tabs)/` holds the five main tabs: Diary, Foods, Meals, Recipes, Settings.
- `src/db/`: SQLite migrations and queries. Add new migrations to the end of the list in `migrations.ts`; never edit one that has shipped.
- `src/services/`: external APIs (USDA, Open Food Facts).
- `src/components/`, `src/lib/`, `src/types/`: shared UI, helpers, and types.
