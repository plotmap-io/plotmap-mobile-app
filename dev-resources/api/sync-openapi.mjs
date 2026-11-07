/**
 * Pull the API contract from a running Plotmap server into this repo.
 *
 *   npm run api:sync                       # http://localhost:9000
 *   npm run api:sync -- http://host:9000
 *
 * The server generates its OpenAPI document from the live code, so this is the
 * contract as it actually is, not a description of it someone kept up to date
 * by hand. The whole document is ~107 KB of every domain the product has;
 * what lands here is the subset this client talks to, found by scanning `src/`
 * for `/api/v1/...` literals. Nothing is written by hand — re-run it after a
 * backend change and read the diff.
 *
 * Admin and internal routes are dropped whether or not they match: they are
 * not this client's business and this repository is public.
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '../..');
const OUT = resolve(HERE, 'openapi.json');
const base = (process.argv[2] ?? process.env.PLOTMAP_API ?? 'http://localhost:9000').replace(/\/$/, '');

/** Every `/api/v1/...` string the client source mentions, as path shapes. */
function clientPaths() {
  const grep = execFileSync(
    'grep',
    ['-rhoE', "'/api/v1/[^']*'|`/api/v1/[^`]*`", 'src'],
    { cwd: ROOT, encoding: 'utf8' },
  );
  const shapes = new Set();
  for (const raw of grep.split('\n')) {
    const literal = raw.trim().replace(/^['`]|['`]$/g, '');
    if (!literal.startsWith('/api/v1/')) continue;
    const path = literal.split('?')[0];
    // `${id}` in the client is `{id}` in the document: match on shape.
    shapes.add('^' + path.replace(/\$\{[^}]*\}/g, '[^/]+').replace(/\{[^}]*\}/g, '[^/]+') + '$');
  }
  return [...shapes].map((s) => new RegExp(s));
}

/** Collect every component a kept path points at, following nested $refs. */
function refsOf(node, into = new Set()) {
  if (!node || typeof node !== 'object') return into;
  if (Array.isArray(node)) {
    for (const item of node) refsOf(item, into);
    return into;
  }
  for (const [key, value] of Object.entries(node)) {
    if (key === '$ref' && typeof value === 'string') into.add(value);
    else refsOf(value, into);
  }
  return into;
}

const res = await fetch(`${base}/api/v1/docs/openapi.json`);
if (!res.ok) {
  console.error(`${base} answered ${res.status}. Is the backend running?`);
  process.exit(1);
}
const doc = await res.json();

const shapes = clientPaths();
const isOurs = (p) =>
  !/\/(admin|internal)(\/|$)/.test(p) && shapes.some((re) => re.test(p));

const paths = {};
for (const path of Object.keys(doc.paths ?? {}).sort()) {
  if (isOurs(path)) paths[path] = doc.paths[path];
}

// Walk refs until the set stops growing — a schema can name another schema.
const schemas = doc.components?.schemas ?? {};
const kept = new Set();
let frontier = refsOf(paths);
while (frontier.size) {
  const next = new Set();
  for (const ref of frontier) {
    const name = ref.replace('#/components/schemas/', '');
    if (!schemas[name] || kept.has(name)) continue;
    kept.add(name);
    for (const r of refsOf(schemas[name])) next.add(r);
  }
  frontier = next;
}

const out = {
  openapi: doc.openapi,
  info: {
    ...doc.info,
    title: `${doc.info?.title ?? 'Plotmap API'} — mobile client subset`,
    description:
      'Generated from the running server by dev-resources/api/sync-openapi.mjs. ' +
      'Only the routes src/ calls are kept. Do not edit by hand.',
  },
  servers: doc.servers,
  paths,
  components: {
    schemas: Object.fromEntries([...kept].sort().map((n) => [n, schemas[n]])),
    ...(doc.components?.securitySchemes
      ? { securitySchemes: doc.components.securitySchemes }
      : {}),
  },
};

mkdirSync(HERE, { recursive: true });
writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');

/**
 * The filter schema is configuration, not data: which fields a property type
 * can be filtered by, each one's widget and its bounds. The Filters screen is
 * supposed to be built from it, so it is worth having a copy to read and to
 * write tests against without a server.
 */
const metaRes = await fetch(`${base}/api/v1/metadata`);
if (metaRes.ok) {
  const meta = await metaRes.json();
  const samples = resolve(HERE, 'samples');
  mkdirSync(samples, { recursive: true });
  writeFileSync(
    resolve(samples, 'metadata.json'),
    JSON.stringify(meta.data ?? meta, null, 2) + '\n',
  );
  console.log('dev-resources/api/samples/metadata.json');
}

const ops = Object.values(paths).reduce(
  (n, item) => n + Object.keys(item).filter((k) => k !== 'parameters').length,
  0,
);
console.log(`dev-resources/api/openapi.json`);
console.log(`  ${Object.keys(paths).length} paths, ${ops} operations, ${kept.size} schemas`);
console.log(`  from ${base} (${Object.keys(doc.paths ?? {}).length} paths in the full document)`);
