# Seller Insight Toolkit

Compliance-first listing audits and evidence-led competitor analysis for marketplace sellers.

[Try the live app](https://seller-insight-toolkit.thuankhuong2-9910736.chatgpt.site)

## Why this exists

Most listing tools start with keywords or copywriting. Seller Insight starts one step earlier: **is the draft safe and supportable enough to publish?** Only after the compliance gate does it score keyword coverage, category fit, persuasion, and readability.

The project is designed for marketplace operators who need a transparent, local-first alternative to black-box listing scores. Every finding includes a reason and a concrete next action.

## Current features

- Compliance gate with blocker, review, opportunity, and pass states
- Configurable title and bullet limits instead of one global Amazon rule
- Keyword coverage across title, bullets, and backend search terms
- Detection of backend repetition, unsupported claims, promotions, URLs, all-caps text, and punctuation issues
- Category coverage for compatibility, specifications, installation, use cases, benefits, and evidence
- Editable competitor matrix with SellerSprite Excel and CSV import/export
- Price, rating, review, sales, revenue, BSR, concentration, and entry-barrier summaries
- Competitor title frequency and own-title keyword gaps
- Markdown and JSON audit report export
- Browser-local processing and autosave
- Repository-local Codex Skill in `.agents/skills/audit-marketplace-listings`

## Privacy and limitations

The current app performs analysis in the browser. Listing and competitor data are not sent to a project backend. Automated checks cannot guarantee marketplace compliance, sales performance, or legal approval. Competitor conclusions describe only the supplied sample and collection window.

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

The competitor lab recognizes product exports with `ASIN` / `商品标题` headers and reverse-ASIN keyword exports with `流量词` / `自然排名` headers. Select one or several `.xlsx`, `.xls`, or `.csv` files. Product rows, main-image links, listing copy, market metrics, keyword traffic, ranking, purchase, and PPC fields are normalized while the original row remains available as raw data for auditability.

The first import milestone is browser-local. The Supabase schema in `supabase/migrations/202608130001_initial_schema.sql` adds owner-scoped projects, import batches, historical product and keyword snapshots, private competitor-image storage, and AI analysis records.

## Roadmap

- Category rule packs maintained as versioned data
- Bullet-level competitor copy comparison
- Image and review-theme analysis
- Supabase persistence and authenticated workspaces
- Deterministic test fixtures for scoring changes
- Optional OpenAI API workflow for maintainer triage and report explanations

## Contributing

Issues and pull requests are welcome. Read [CONTRIBUTING.md](CONTRIBUTING.md) and [SECURITY.md](SECURITY.md) before contributing.

## License

Apache-2.0. See [LICENSE](LICENSE).
