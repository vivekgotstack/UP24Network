import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import wawoff2 from 'wawoff2';

const root = fileURLToPath(new URL('../', import.meta.url));
const sources = path.join(root, 'assets/fonts');
const output = path.join(root, 'public/fonts');
const manifestPath = path.join(sources, 'manifest.json');
const names = [
  'source-serif-regular',
  'source-serif-bold',
  'source-sans-regular',
  'source-sans-semibold',
];
const digest = (buffer) => createHash('sha256').update(buffer).digest('hex');
const exists = async (file) => {
  try {
    await fs.access(file);
    return true;
  } catch {
    return false;
  }
};
await fs.mkdir(sources, { recursive: true });
let previous = {};
try {
  previous = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
} catch {}
const manifest = {};
let css = await fs.readFile(path.join(root, 'app/globals.css'), 'utf8');
let saved = 0;
for (const name of names) {
  const source = path.join(sources, name + '.ttf');
  const legacy = path.join(output, name + '.ttf');
  // Sources remain reviewable in assets; only compressed files ship in public/.
  if (!(await exists(source)) && (await exists(legacy))) await fs.rename(legacy, source);
  const input = await fs.readFile(source);
  const sourceHash = digest(input);
  const old = previous[name];
  let entry = old;
  if (!old || old.sourceHash !== sourceHash || !(await exists(path.join(output, old.file)))) {
    const encoded = Buffer.from(await wawoff2.compress(input));
    if (!encoded.length || encoded.length >= input.length)
      throw new Error(`Font optimization failed: ${name}`);
    const file = `${name}.${digest(encoded).slice(0, 8)}.woff2`;
    await fs.writeFile(path.join(output, file), encoded);
    entry = { sourceHash, file, sourceBytes: input.length, bytes: encoded.length };
    if (old?.file && old.file !== file && old.file.startsWith(name + '.'))
      await fs.rm(path.join(output, old.file), { force: true });
  }
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const reference = new RegExp(
    `/fonts/${escaped}(?:\\.[a-f0-9]{8})?\\.(?:ttf|woff2)'\\) format\\('(?:truetype|woff2)'\\)`,
    'g',
  );
  css = css.replace(reference, `/fonts/${entry.file}') format('woff2')`);
  if (await exists(legacy)) await fs.rm(legacy);
  manifest[name] = entry;
  saved += entry.sourceBytes - entry.bytes;
}
const cssPath = path.join(root, 'app/globals.css');
if (css !== (await fs.readFile(cssPath, 'utf8'))) await fs.writeFile(cssPath, css);
await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
console.log(
  `Self-hosted fonts ready; ${(saved / 1024).toFixed(0)} KB removed from reader downloads.`,
);
