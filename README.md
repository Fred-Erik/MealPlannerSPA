# Maaltijdplanner

Een SPA om maaltijden te plannen met roulatie over categorieën (ovenschotel, pasta, curry, …).
Gebouwd met Vite, React 19, TypeScript, Tailwind v4, shadcn/base-ui en Supabase. Gehost op
GitHub Pages.

## Vereisten

- Node.js 22+
- [Supabase CLI](https://supabase.com/docs/guides/local-development/cli/getting-started) (via `npx supabase` of globaal geïnstalleerd)
- Docker (voor lokale Supabase-stack)

## Lokale ontwikkeling

```bash
npm install
cp .env.example .env   # vul VITE_SUPABASE_URL en VITE_SUPABASE_PUBLISHABLE_KEY in
npx supabase start     # start lokale Postgres/Auth/Storage in Docker
npm run dev
```

`npx supabase start` print lokale API URL en keys — gebruik die in `.env` voor lokale
ontwikkeling (i.p.v. de cloud-project-keys), of gebruik de cloud-omgeving direct als die al is
opgezet (zie hieronder).

### Database schema wijzigen

Het schema staat **declaratief** in `supabase/schemas/*.sql` — dat zijn de bronbestanden, niet
rechtstreeks aanpasbaar via Studio/SQL editor. Na een wijziging:

```bash
npx supabase db schema declarative sync --schema public,storage --name <omschrijving> --apply --yes
```

Dit genereert een migratiebestand in `supabase/migrations/` en past het toe op de lokale database.
Controleer daarna:

```bash
npx supabase db advisors --local
```

(Het `rls_policy_always_true` WARN-signaal op alle 6 tabellen is bewust — dit is een
gedeelde-huishouden-app waarin elke ingelogde gebruiker alles mag.)

### Types genereren

```bash
npx supabase gen types typescript --local > src/types/database.ts
```

### Naar productie deployen

```bash
npx supabase login
npx supabase link --project-ref <project-ref>
npx supabase db push --include-seed
```

Configureer daarna in het Supabase dashboard (eenmalig, kan niet via migraties):
1. Authentication → Sign In / Providers → Email: zet **"Allow new users to sign up" uit**.
2. Authentication → Users → maak handmatig een account per huisgenoot aan.
3. Controleer of de Data API `public`-schema blootstelt aan `anon`/`authenticated`.

## Recepten toevoegen via de agent-skill

Zie [.agents/skills/add-recipe/SKILL.md](.agents/skills/add-recipe/SKILL.md). Vereist
`SUPABASE_SERVICE_ROLE_KEY` in `.env` (nooit met `VITE_` prefix — dat zou naar de browser gaan).

```bash
node --env-file=.env scripts/add-recipe.mjs categories
node --env-file=.env scripts/add-recipe.mjs ingredients
node --env-file=.env scripts/add-recipe.mjs add pad/naar/payload.json
```

## Deployment (GitHub Pages)

`.github/workflows/deploy.yml` bouwt en publiceert bij elke push naar `main`. Eenmalig instellen:

1. Repo → Settings → Pages → Source = **GitHub Actions**.
2. Repo → Settings → Secrets and variables → Actions → **Variables** toevoegen:
   `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`.

De app gebruikt `HashRouter`, dus er is geen serverside rewrite-configuratie nodig op Pages.

## Projectstructuur

- `src/pages/` — routes (Week, Recepten, Categorieën, Archief, Instellingen, Login)
- `src/api/` — PostgREST-wrappers per aggregaat
- `src/hooks/` — React Query hooks
- `src/lib/` — pure logica: rotatie-algoritme, boodschappenlijst, weekberekeningen
- `supabase/schemas/` — declaratief DB-schema (bron van waarheid)
- `scripts/add-recipe.mjs` — CLI voor de add-recipe agent-skill


If you are developing a production application, we recommend enabling type-aware lint rules by installing `oxlint-tsgolint` and editing `.oxlintrc.json`:

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "typescript", "oxc"],
  "options": {
    "typeAware": true
  },
  "rules": {
    "react/rules-of-hooks": "error",
    "react/only-export-components": ["warn", { "allowConstantExport": true }]
  }
}
```

See the [Oxlint rules documentation](https://oxc.rs/docs/guide/usage/linter/rules) for the full list of rules and categories.
