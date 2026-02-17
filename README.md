# Carrier Integration Service (UPS Rating)

This project implements a production-style carrier integration module in TypeScript for the UPS Rating API.

The design goal is to keep caller-facing models carrier-agnostic while isolating carrier-specific payloads, auth behavior, and response parsing behind adapters.

## What is implemented

- UPS OAuth 2.0 client-credentials auth flow
- Token caching and transparent refresh on expiry
- Domain-first rate request and normalized quote response models
- Runtime validation for config, input, and upstream response payloads
- Structured error model for validation, auth, timeout, rate limit, upstream, malformed response, and network failures
- Integration tests with stubbed HTTP responses that exercise full service logic

## Project structure

- `src/domain`: internal models and error types
- `src/http`: HTTP abstraction and default `fetch` implementation
- `src/config`: environment/config loading and validation
- `src/carriers/base`: carrier interface
- `src/carriers/ups`: UPS adapter (auth, payload builder, response mapper)
- `src/app`: orchestration service for multiple carriers
- `tests`: integration-style tests with stubbed HTTP

## How to run

1. Install dependencies:

```bash
npm install
```

2. Copy env file and fill values:

```bash
cp .env.example .env
```

3. Run tests:

```bash
npm test
```

4. Type-check:

```bash
npm run typecheck
```

5. Build:

```bash
npm run build
```

## Key design decisions

- Internal API shapes are fully decoupled from UPS request/response format.
- UPS specifics are confined to `src/carriers/ups`.
- Carrier orchestration is map-based so adding a new carrier means implementing the base interface and registering it.
- HTTP is abstracted to enable integration tests without live credentials.
- Validation happens at every boundary: env, inbound request, and outbound upstream responses.
# carrier-ups-integration
