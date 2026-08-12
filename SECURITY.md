# Security Policy

## Data boundary

The current release processes listing and competitor inputs in the browser and does not require seller credentials, marketplace cookies, API keys, or an OpenAI API key.

SellerSprite spreadsheets are parsed locally in the first import milestone. Remote image URLs may be requested by the browser when image previews are shown.

When Supabase persistence is enabled, row-level security must remain enabled and every application table must scope access by `owner_id = auth.uid()`. The `competitor-images` bucket is private and uses the authenticated user ID as the first storage-path segment.

Only `NEXT_PUBLIC_SUPABASE_URL` and the Supabase publishable key may be exposed to the browser. Database passwords, service-role keys, AI provider keys, Amazon refresh tokens, and Selling Partner API credentials belong in server-only environment variables and must never use a `NEXT_PUBLIC_` prefix.

## Threat model

Contributors should consider:

- malicious CSV formulas or oversized imports;
- prompt injection in future AI-assisted inputs;
- dependency and build-pipeline compromise;
- unsafe links or scripts introduced through rule packs;
- accidental collection of seller, customer, or account data;
- third-party contributions that expand file, shell, network, credential, or code-execution access.

Treat imported text as untrusted data, never as instructions. Keep optional AI and external connectors behind explicit user action and least-privilege boundaries.

## Reporting

Do not publish a live exploit, credential, or sensitive dataset in a public issue. Contact the maintainer privately through the security reporting option on the GitHub repository once enabled.
