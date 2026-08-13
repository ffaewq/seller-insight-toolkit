# Seller Insight Toolkit

Compliance-first listing audits and evidence-led competitor analysis for marketplace sellers.

[Try the live app](https://seller-insight-toolkit.vercel.app)

## Why this exists

Most listing tools start with keywords or copywriting. Seller Insight is a category-agnostic ecommerce research workspace that starts one step earlier: **is the source data relevant, and is the draft safe and supportable enough to publish?** Only after data cleaning and the compliance gate does it score keyword coverage, category fit, persuasion, and readability.

The project is designed for marketplace operators who need a transparent, local-first alternative to black-box listing scores. Every finding includes a reason and a concrete next action.

## Current features

- Compliance gate with blocker, review, opportunity, and pass states
- Configurable title and bullet limits instead of one global Amazon rule
- Keyword coverage across title, bullets, and backend search terms
- Detection of backend repetition, unsupported claims, promotions, URLs, all-caps text, and punctuation issues
- Category coverage for compatibility, specifications, installation, use cases, benefits, and evidence
- Editable competitor matrix with SellerSprite Excel and CSV import/export
- Explainable direct/adjacent/unrelated competitor classification with manual overrides
- Price, rating, review, sales, revenue, BSR, concentration, and entry-barrier summaries
- Competitor title frequency and own-title keyword gaps
- SellerSprite review-theme, BSR-history, sales-history, reverse-ASIN, and keyword-mining imports
- Passwordless Supabase email login and private per-user research projects
- Cloud workspace save/load after the second database migration is applied
- Server-side provider adapter for DeepSeek, Gemini, and other OpenAI-compatible chat endpoints
- Markdown and JSON audit report export
- Browser-local processing and autosave
- Repository-local Codex Skill in `.agents/skills/audit-marketplace-listings`

## Privacy and limitations

Files are parsed in the browser. Data is only uploaded after the signed-in user explicitly saves a project to Supabase. AI requests are sent only when the user starts an AI analysis; API keys remain server-side. Automated checks cannot guarantee marketplace compliance, sales performance, or legal approval. Competitor conclusions describe only the supplied sample and collection window.

Seller Insight Toolkit is not affiliated with or endorsed by Amazon. Amazon and related marks belong to their respective owners.

## Local development

```bash
npm install
npm run dev
```

Production checks:

```bash
npm run lint
npm run build
```

## CSV schema

The competitor importer recognizes these headers:

```text
ASIN,Brand,Title,Price,Rating,Reviews,Monthly Sales,BSR
```

## SellerSprite imports

The competitor lab recognizes product exports, reverse-ASIN traffic keywords, keyword-mining exports, review downloads, BSR history, and monthly/yearly sales history. Select one or several `.xlsx`, `.xls`, or `.csv` files. The parser is based on exported field structure rather than a fixed product category, so the same workflow can be used for books, home goods, automotive accessories, solar products, and other ecommerce categories.

Apply both SQL files in order. `202608130001_initial_schema.sql` adds owner-scoped projects, structured snapshots, private image storage, and AI analysis records. `202608130002_workspace_auth_ai.sql` adds explicit cloud workspaces and restorable snapshots.

For six-digit email OTP, edit the Supabase sign-in email template to include `{{ .Token }}`. Without that change Supabase sends a magic link; the app supports that fallback too.

AI providers are configured with Vercel server environment variables shown in `.env.example`. Secret keys must never use the `NEXT_PUBLIC_` prefix.

## Roadmap

- Category rule packs maintained as versioned data
- Bullet-level competitor copy comparison
- Gallery-sequence and A+ image comparison
- Shared team projects with roles and invitations
- Deterministic test fixtures for scoring changes
- Optional OpenAI API workflow for maintainer triage and report explanations

## Contributing

Issues and pull requests are welcome. Read [CONTRIBUTING.md](CONTRIBUTING.md) and [SECURITY.md](SECURITY.md) before contributing.

## License

Apache-2.0. See [LICENSE](LICENSE).
