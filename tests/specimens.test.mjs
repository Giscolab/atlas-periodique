import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = fileURLToPath(new URL('../', import.meta.url));
const specimenDirectory = path.resolve(projectRoot, 'assets/specimens');

async function loadManifest() {
  return JSON.parse(await readFile(path.join(projectRoot, 'assets/specimens.json'), 'utf8'));
}

function nonempty(value, message) {
  assert.equal(typeof value, 'string', message);
  assert.ok(value.trim().length > 0, message);
}

function resolveImage(specimen) {
  nonempty(specimen.src, 'Element ' + specimen.number + ': image path required');
  assert.match(specimen.src, /^\.\/assets\/specimens\/[A-Za-z0-9_./-]+$/, 'Image must be a packaged local specimen asset');
  const fullPath = path.resolve(projectRoot, specimen.src);
  const relative = path.relative(specimenDirectory, fullPath);
  assert.ok(relative.length > 0 && relative !== '..' && !relative.startsWith('..' + path.sep) && !path.isAbsolute(relative), 'Image must remain inside assets/specimens');
  return fullPath;
}

test('specimen collection covers the 118 real element identities exactly once', async () => {
  const specimens = await loadManifest();
  const elements = JSON.parse(await readFile(path.join(projectRoot, 'assets/elements.json'), 'utf8'));
  assert.ok(Array.isArray(specimens));
  assert.equal(specimens.length, 118);
  assert.equal(elements.length, 118);
  const expected = new Map(elements.map(element => [Number(element.AtomicNumber), element.Symbol]));
  const seen = new Set();
  for (const specimen of specimens) {
    assert.ok(Number.isInteger(specimen.number), 'Atomic number must be an integer');
    assert.equal(specimen.symbol, expected.get(specimen.number), 'Wrong identity for element ' + specimen.number);
    assert.ok(!seen.has(specimen.number), 'Duplicate identity: ' + specimen.number);
    seen.add(specimen.number);
    assert.ok(['photo', 'diagram'].includes(specimen.kind), 'Unknown visual kind for ' + specimen.symbol);
  }
  assert.deepEqual([...seen].sort((a, b) => a - b), [...expected.keys()].sort((a, b) => a - b));
});

test('every element has its own packaged, readable image with a matching image signature', async () => {
  const specimens = await loadManifest();
  const seenPaths = new Set();
  for (const specimen of specimens) {
    const fullPath = resolveImage(specimen);
    assert.ok(!seenPaths.has(fullPath.toLowerCase()), 'Reused image path for ' + specimen.symbol);
    seenPaths.add(fullPath.toLowerCase());
    const data = await readFile(fullPath);
    assert.ok(data.length > 32, 'Empty or truncated image for ' + specimen.symbol);
    const extension = path.extname(fullPath).toLowerCase();
    if (extension === '.png') {
      assert.ok(data.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])), 'Invalid PNG for ' + specimen.symbol);
      assert.equal(data.toString('ascii', 12, 16), 'IHDR', 'Missing PNG header');
      assert.ok(data.readUInt32BE(16) > 0 && data.readUInt32BE(20) > 0, 'Empty PNG dimensions');
    } else if (extension === '.jpg' || extension === '.jpeg') {
      assert.equal(data[0], 0xff, 'Invalid JPEG for ' + specimen.symbol);
      assert.equal(data[1], 0xd8, 'Invalid JPEG for ' + specimen.symbol);
      assert.equal(data[2], 0xff, 'Invalid JPEG for ' + specimen.symbol);
      assert.equal(data[data.length - 2], 0xff, 'Truncated JPEG for ' + specimen.symbol);
      assert.equal(data[data.length - 1], 0xd9, 'Truncated JPEG for ' + specimen.symbol);
    } else if (extension === '.webp') {
      assert.equal(data.toString('ascii', 0, 4), 'RIFF', 'Invalid WebP for ' + specimen.symbol);
      assert.equal(data.toString('ascii', 8, 12), 'WEBP', 'Invalid WebP for ' + specimen.symbol);
      assert.ok(data.readUInt32LE(4) + 8 <= data.length, 'Truncated WebP for ' + specimen.symbol);
    } else if (extension === '.svg') {
      const svg = data.toString('utf8');
      assert.match(svg, /<svg\b[^>]*>/i, 'Missing SVG root for ' + specimen.symbol);
      assert.match(svg, /<\/svg\s*>\s*$/i, 'Truncated SVG for ' + specimen.symbol);
    } else {
      assert.fail('Unsupported image format for ' + specimen.symbol + ': ' + extension);
    }
  }
});

test('SVG diagrams work offline without remote images, fonts, scripts, or XML entities', async () => {
  for (const specimen of await loadManifest()) {
    const fullPath = resolveImage(specimen);
    if (path.extname(fullPath).toLowerCase() !== '.svg') continue;
    const svg = await readFile(fullPath, 'utf8');
    assert.doesNotMatch(svg, /<!DOCTYPE|<!ENTITY|<script\b|<foreignObject\b|<\?xml-stylesheet/i, 'Active or externally resolved SVG content for ' + specimen.symbol);
    assert.doesNotMatch(svg, /\s(?:onload|onerror|onclick)\s*=/i, 'Active SVG handler for ' + specimen.symbol);
    assert.doesNotMatch(svg, /@import\b/i, 'Imported stylesheet for ' + specimen.symbol);
    const hrefs = [...svg.matchAll(/\b(?:xlink:)?href\s*=\s*['"]([^'"]*)['"]/gi)];
    for (const [, href] of hrefs) {
      assert.ok(href.startsWith('#'), 'SVG reference must be internal for ' + specimen.symbol + ': ' + href);
    }
    const urls = [...svg.matchAll(/url\(\s*['"]?([^\s)'"\u0000]+)['"]?\s*\)/gi)];
    for (const [, url] of urls) {
      assert.ok(url.startsWith('#'), 'SVG resource must be internal for ' + specimen.symbol + ': ' + url);
    }
  }
});

test('captions and accessible descriptions identify each visual, and photos have traceable rights', async () => {
  for (const specimen of await loadManifest()) {
    for (const field of ['alt', 'caption', 'description']) {
      nonempty(specimen[field], 'Element ' + specimen.number + ': missing ' + field);
    }
    if (specimen.kind !== 'photo') continue;
    nonempty(specimen.credit, 'Photo credit required for ' + specimen.symbol);
    nonempty(specimen.license, 'Photo license required for ' + specimen.symbol);
    nonempty(specimen.sourceUrl, 'Photo source required for ' + specimen.symbol);
    const source = new URL(specimen.sourceUrl);
    assert.equal(source.protocol, 'https:', 'Photo source must be HTTPS for ' + specimen.symbol);
    assert.ok(source.hostname.includes('.'), 'Photo source host required for ' + specimen.symbol);
  }
});

test('schematic visuals are labelled honestly, including elements without macroscopic samples', async () => {
  for (const specimen of await loadManifest()) {
    if (specimen.kind !== 'diagram') continue;
    assert.match(specimen.caption, /sch[eé]ma|diagramme|illustration|mod[eè]le|repr[eé]sentation/i, 'Diagram must be visibly identified as such for ' + specimen.symbol);
    assert.doesNotMatch(specimen.caption, /(?:photographie|photo)\s+(?:r[eé]elle|authentique|de\s+(?:l['’])?[eé]chantillon)/i, 'Diagram must not claim to photograph a sample for ' + specimen.symbol);
    assert.doesNotMatch(specimen.alt, /^(?:photo|photographie)\b/i, 'Accessible text must not call a diagram a photo for ' + specimen.symbol);
  }
});
