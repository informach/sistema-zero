import { expect, test } from 'bun:test'

test.each([
  ['', null, 0],
  ['?missao=1', '1', 0],
  ['?missao=falha', 'falha', 0],
  ['?missao=adiada&autosave-ms=600000', 'adiada', 600000],
] as const)('captura a query inicial antes da navegação: %s', (search, mission, autosave) => {
  // Cada processo importa o módulo real uma vez; Bun normaliza querystrings de imports.
  const modulePath = new URL('../playground/initialQuery.ts', import.meta.url).href
  const child = Bun.spawnSync(
    [
      process.execPath,
      '--eval',
      `globalThis.window = { location: { search: ${JSON.stringify(search)} } };
       const initial = await import(${JSON.stringify(modulePath)});
       window.location.search = '';
       const after = await import(${JSON.stringify(modulePath)});
       console.log(JSON.stringify([
         initial.PLAYGROUND_DEMO_MISSION, initial.E2E_AUTOSAVE_MS,
         after === initial, after.PLAYGROUND_DEMO_MISSION, after.E2E_AUTOSAVE_MS
       ]));`,
    ],
    { stdout: 'pipe', stderr: 'pipe' },
  )
  expect(new TextDecoder().decode(child.stderr)).toBe('')
  expect(child.exitCode).toBe(0)
  expect(JSON.parse(new TextDecoder().decode(child.stdout))).toEqual([
    mission,
    autosave,
    true,
    mission,
    autosave,
  ])
})
