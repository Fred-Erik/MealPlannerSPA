---
name: add-recipe
description: "Use to add a new recipe to the MealPlannerSPA database from a recipe website URL (e.g. ah.nl/allerhande, leukerecepten.nl). Extracts the recipe, deduplicates ingredient names against existing recipes, and writes it via scripts/add-recipe.mjs."
metadata:
  author: frederik
  version: "0.1.0"
---

# Add recipe to MealPlannerSPA

Adds a single recipe, fetched from a website, into the Supabase database used by this app.
This skill only writes data — it never edits app code.

## Prerequisites

- `.env` in the repo root must contain `VITE_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`
  (get the service role key from the Supabase dashboard → Project Settings → API, or
  `supabase projects api-keys --project-ref <ref>` after `supabase login`).
- Node.js available on PATH.

## Steps

1. **Fetch the recipe** from the given URL. Extract: name, ingredients (quantity, unit, name),
   instructions, servings (if stated), and the source URL. Translate to Dutch if the source
   is in another language — this app's content is Dutch.

   For **ah.nl/allerhande** URLs, use the extraction helper instead of fetching the page
   directly — ah.nl is behind Akamai bot protection, so direct fetches usually return a
   challenge page:
   ```bash
   node scripts/extract-ah-recipe.mjs <url>
   ```
   If that errors because of the bot check, ask the user to save the page from their browser
   (Ctrl+S, "Webpagina, alleen HTML") and run it against the saved file instead:
   ```bash
   node scripts/extract-ah-recipe.mjs "C:\path\to\saved-page.html" --out /tmp/extracted.json
   ```
   This prints normalized JSON (name, servings, instructions, image url, source url, and both
   raw and best-effort quantity/unit/name-split ingredients). The unit/name split is a naive
   heuristic — always sanity-check it (and dedupe against step 3) before using it in the payload.

2. **List existing categories**:
   ```bash
   node --env-file=.env scripts/add-recipe.mjs categories
   ```
   Pick the best matching category id. If none fits well, ask the user before inventing a new
   one (categories are managed in the app UI, not by this script).

3. **List existing ingredient names** to reuse exact strings for deduplication:
   ```bash
   node --env-file=.env scripts/add-recipe.mjs ingredients
   ```
   For every ingredient in the new recipe, check if a matching name already exists (same
   ingredient, e.g. "ui" vs "uien" vs "gele ui") and reuse that **exact** string. Only introduce
   a new name string when the ingredient genuinely isn't in the list yet.

4. **Write a payload JSON file** (e.g. `/tmp/recipe-payload.json`) matching this shape:
   ```json
   {
     "category_id": "uuid-from-step-2",
     "name": "Recept naam",
     "base_servings": 6,
     "instructions": "Stap 1...\nStap 2...",
     "source_url": "https://example.com/recept",
     "notes": null,
     "photo_url": "https://example.com/foto.jpg",
     "last_cooked_at": null,
     "ingredients": [
       { "quantity": 400, "unit": "g", "name": "pasta" },
       { "quantity": 1, "unit": "blik", "name": "tomatenblokjes" },
       { "quantity": null, "unit": null, "name": "peper naar smaak" }
     ]
   }
   ```
   - `quantity` is a number or `null` (for "naar smaak" style ingredients).
   - `unit` is a short Dutch string (`g`, `ml`, `stuks`, `blik`, `teentje`, …) or `null`.
   - `photo_url` is optional; if present the script downloads it and uploads it to the
     `recipe-photos` Storage bucket. Omit it if the source has no usable image.
   - `base_servings` defaults to 6 if omitted.

5. **Run the insert**:
   ```bash
   node --env-file=.env scripts/add-recipe.mjs add /tmp/recipe-payload.json
   ```

6. **Report the result** to the user: print the summary the script outputs (recipe id, name,
   category, servings, source, photo path, and the full ingredient list) so they can verify it
   before trusting it in the app. If the script errors, show the error and stop — do not retry
   blindly.
