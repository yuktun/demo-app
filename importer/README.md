# Public Matters article importer — local implementation

This feature is **not enabled on the published GitHub Pages reader**. The
production endpoint in `dist/matters-config.js` remains empty and the production
CSP still has `connect-src 'none'`. No cloud service or account has been created.

## Local preview and tests

From the repository root, with Node 22 or later:

```sh
npm --prefix importer ci
npm test
npm run test:matters
npm run check
npm run preview:matters
```

Open `http://127.0.0.1:8766/`. The preview injects a same-origin `/api/matters`
endpoint and permits only same-origin connections in the local HTML response.
The checked-in production HTML and configuration are not rewritten. Local
preview binds only to loopback; it is not a public server deployment.

Browser acceptance uses entirely synthetic upstream HTML:

```sh
# Supply installed Playwright / Chromium locations through environment variables
# PLAYWRIGHT_PATH and BROWSER_PATH when they are not available by default.
node tests/matters-browser.mjs
```

Use `MATTERS_QA_DIR` to keep internal screenshots outside the repository. Do not
upload these screenshots or add real public article bodies to test fixtures.

## Retrieval and access rules

The service makes one ordinary anonymous `GET` to the canonical
`https://matters.town/a/<shortHash>` page. It sends no cookies, authentication,
user-supplied headers or article body, and never retries another route. On
2026-10-18 this normal request to the user-provided sample returned HTTP 403 in
the development environment. Successful live retrieval is therefore **not
verified**. The service returns a clear unavailable error for denied access;
it does not use API workarounds, IPFS mirrors, proxy services or browser cookies.

Matters' [official public article query](https://github.com/thematters/matters-web/blob/develop/src/views/ArticleDetail/gql.ts)
includes article state, access circle, author, license, and `contents.html`.
The [official article view](https://github.com/thematters/matters-web/blob/develop/src/views/ArticleDetail/index.tsx)
permits full content when there is no circle or access is explicitly public.
The [official schema](https://github.com/thematters/matters-server/blob/develop/src/types/article.ts)
defines the supported state/access/license values.

The extractor accepts one matching Article in the page's `__NEXT_DATA__` cache,
resolves normalized references, requires active/public access, and rejects
missing/unknown access, restricted author states, empty text and unknown licenses.
It does not read private query results through any separate API. A future page
format change fails closed rather than importing a summary as a complete article.
The current cache adapter is validated against synthetic official-schema-shaped
data; real public-page compatibility still needs a permitted successful response.

`parse5` parses HTML as data without running scripts or loading resources. The
reader receives only title, plain text and validated attribution. Block elements
and line breaks preserve paragraph boundaries. Scripts, frames, forms, images,
hidden content and original formatting are omitted. No remote HTML enters the
reader DOM. The original author, source link, license and conversion notice are
shown in the book sidebar and persist with the local article snapshot.

Repeated imports of the same canonical article reopen the saved snapshot without
refetching or overwriting progress. To fetch a new copy, explicitly delete the
local article first and import it again. Network requests occur only after the
user's import action; there is no polling, prefetching or background refresh.

## Service contract and limits

`createHandler({allowedOrigin, fetcher, timeoutMs, maxConcurrent})` in
`handler.mjs` returns a Web `Request` → `Response` handler, suitable for a reviewed
Node/serverless adapter. Only POST JSON `{ "url": "https://matters.town/a/..." }`
and its CORS OPTIONS preflight are accepted. The adapter must expose only the
chosen `/api/matters` path. CORS permits one exact configured reader origin and
never allows credentials. Origin checking is not authentication or a billing
quota; a public deployment also needs provider-side rate/usage limits.

- Exact HTTPS host/path allowlist; user credentials and nondefault ports rejected.
- Query tracking and fragments are discarded before fetching.
- All redirects rejected, including same-host redirects; no redirect escape.
- 4 KB input, 4 MB fetched HTML, 1 million text characters, 10-second upstream
  deadline, 12-second client deadline, two concurrent upstream requests per handler.
- Response is JSON with `Cache-Control: no-store`; service does not persist or
  log article bodies, URLs, cookies or credentials.
- Cancel, dialog close, changing URL, switching books, another import and page
  exit invalidate the active request. Late responses cannot replace a book.
- Existing TXT/Markdown/paste imports remain local and use the existing parser,
  IndexedDB library, localStorage positions and local Chinese/Cantonese TTS.

## Required approval before activation

1. Select an existing user-approved Node/serverless host, resource/project and
   exact HTTPS endpoint. Review any charges, credentials, region and provider
   usage/rate limits before creating or configuring that resource.
2. Adapt the handler to that provider without changing the fixed Matters host
   allowlist. Permit only `https://yuktun.github.io` as reader Origin. Validate a
   normal anonymous public-page request from the approved host. If it is denied,
   stop; deployment elsewhere must not be used to bypass that denial.
3. Once permitted retrieval and real-page parsing succeed, set the exact endpoint
   in `dist/matters-config.js` and allow only its precise URL in HTML `connect-src`.
   Do not add `*`, broad HTTPS permissions or a general CORS proxy.
4. Rerun local tests, real public success/error cases and mobile browser checks.
   Request approval immediately before committing and pushing this feature.

Until those steps are approved and validated, leave the production importer
disabled. Plain-text paste remains available now.
