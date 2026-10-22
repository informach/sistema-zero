import { expect, test } from 'bun:test'
import { execFileSync } from 'node:child_process'

test('a fresh JS gallery loads no Python payload, and maze selection loads only its own sources and media', () => {
  const gallery = new URL('../projects/KitGallery.tsx', import.meta.url).href
  const catalog = new URL('./pythonCatalog.ts', import.meta.url).href
  // An isolated loader makes the observation independent of other tests' module caches.
  const result = JSON.parse(
    execFileSync(
      process.execPath,
      [
        '--eval',
        `
const loaded = () => Object.keys(require.cache)
  .map(path => path.replaceAll('\\\\', '/'))
  .filter(path => /studio\\/src\\/(examples\\/python|runtime\\/python)/.test(path))
  .map(path => path.split('/studio/src/')[1]).sort();
const initial = loaded();
await import(${JSON.stringify(gallery)});
const javascript = loaded();
const { PYTHON_EXAMPLE_SUMMARIES } = await import(${JSON.stringify(catalog)});
const metadata = loaded();
await PYTHON_EXAMPLE_SUMMARIES.find(entry => entry.key === 'python:maze-lights').load();
console.log(JSON.stringify({ initial, javascript, metadata, selected: loaded() }));
`,
      ],
      { encoding: 'utf8', timeout: 8000, maxBuffer: 64 * 1024 },
    ),
  )
  expect(result.initial).toEqual([])
  expect(result.javascript).toEqual([])
  const metadata = [
    'examples/python/mazeLights.ts',
    'examples/python/turtleRace.ts',
    'examples/python/visualReferenceGames.ts',
    'examples/python/visualReferenceGames.blocks.generated.ts',
    'examples/pythonCatalog.ts',
  ].sort()
  expect(result.metadata).toEqual(metadata)
  expect(result.selected).toEqual(
    [
      ...metadata,
      'examples/python/mazeLightsPayload.ts',
      'examples/python/mazeLights.audio.generated.ts',
      'examples/python/mazeLights.sources.generated.ts',
    ].sort(),
  )
}, 10000)
