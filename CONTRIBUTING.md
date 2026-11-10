# Contributing to RPay Protocol

RPay welcomes issues, documentation corrections, tests and code contributions focused on safe, verifiable connectivity delegation.

## Before proposing a change

Search existing issues and describe the problem, intended behavior, security implications and compatibility impact. For changes to wire formats, state transitions or trust assumptions, propose a specification change before implementing incompatible behavior.

## Local development

```bash
npm ci
npm run dev
npm test
npm run build
```

Consult the repository's `package.json` for additional scripts. Never commit seed phrases, private keys, real credentials or production wallet data.

## Pull requests

Include a concise rationale, test coverage, affected protocol documentation, migration notes when relevant and screenshots for UI changes. Keep protocol guarantees separate from aspirational features. Mark unimplemented proposals as drafts.

## Protocol proposals

See [specs/README.md](specs/README.md). Changes to signed transaction semantics, message encodings or relay responsibilities require explicit compatibility and threat-model review.

## Code of conduct

Be respectful, specific and constructive. Discuss ideas and implementation choices without personal attacks or discriminatory language.
