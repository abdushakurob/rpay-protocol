# Security Policy

## Supported status

RPay is experimental software targeting Solana Devnet. It is not audited or approved for production custody of valuable assets. No supported mainnet security release is declared.

## Reporting a vulnerability

Please use [GitHub's private vulnerability reporting feature](https://github.com/abdushakurob/rpay-protocol/security) if it is enabled for this repository. Otherwise, open a public issue **without exploit details, secrets, wallet phrases, or sensitive reproduction data** asking maintainers for a private reporting channel.

Include affected commit/version, impact, reproduction prerequisites and a minimal safe proof of concept where appropriate. Do not test against other people's wallets or deploy attacks against public services.

## Disclosure

Maintainers should acknowledge reports, investigate privately, coordinate fixes and publish an advisory once users can mitigate the issue. No response-time service-level agreement is currently offered.

## Important warnings

Never share a seed phrase with a relay. Never import a valuable mainnet wallet into an experimental Devnet application. Treat relay acknowledgements as untrusted until verified on Solana.

For design analysis, see [docs/05-security-model.md](docs/05-security-model.md).
