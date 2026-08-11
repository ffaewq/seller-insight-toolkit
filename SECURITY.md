# Security Policy

## Data boundary

The current release processes listing and competitor inputs in the browser and does not require seller credentials, marketplace cookies, API keys, or an OpenAI API key.

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
