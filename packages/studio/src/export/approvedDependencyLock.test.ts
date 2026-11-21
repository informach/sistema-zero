import { describe, expect, it } from 'bun:test'
import { strFromU8, unzipSync } from 'fflate'
import { createProProject } from '../components/code/pro-templates'
import { type ApprovedLockPackage, approvedLockFor } from './approvedDependencyLock'
import { exportProjectSource } from './sourceExport'

// Lote 7 da missão (seção 14, "builds reproduzíveis", 21/11/2026).
const graph: Record<string, ApprovedLockPackage> = {
  'node_modules/vite': {
    version: '8.1.6',
    dependencies: { rolldown: '1.0.0' },
    optionalDependencies: { fsevents: '~2.3.3' },
    peerDependencies: { less: '*' },
    peerDependenciesMeta: { less: { optional: true } },
  },
  'node_modules/rolldown': {
    version: '1.0.0',
    optionalDependencies: { '@rolldown/binding-linux-x64-gnu': '1.0.0' },
  },
  'node_modules/@rolldown/binding-linux-x64-gnu': { version: '1.0.0', optional: true },
  'node_modules/three': { version: '0.184.0' },
}
const manifest = (value: Record<string, unknown>) => JSON.stringify(value)

describe('a trava tirada do grafo aprovado', () => {
  it('leva só o que as dependências alcançam, com `dev` no que só o desenvolvimento usa', () => {
    const lock = JSON.parse(
      approvedLockFor(
        manifest({
          name: 'meu-jogo',
          dependencies: { three: '0.184.0' },
          devDependencies: { vite: '8.1.6' },
        }),
        graph,
      ) ?? 'null',
    )
    expect(lock.lockfileVersion).toBe(3)
    expect(lock.packages['']).toEqual({
      name: 'meu-jogo',
      dependencies: { three: '0.184.0' },
      devDependencies: { vite: '8.1.6' },
    })
    expect(Object.keys(lock.packages).sort()).toEqual(
      [
        '',
        'node_modules/@rolldown/binding-linux-x64-gnu',
        'node_modules/rolldown',
        'node_modules/three',
        'node_modules/vite',
      ].sort(),
    )
    expect(lock.packages['node_modules/three'].dev).toBeUndefined()
    expect(lock.packages['node_modules/vite'].dev).toBe(true)
    expect(lock.packages['node_modules/rolldown'].dev).toBe(true)
    // A dependência opcional ausente do grafo (fsevents) e o par opcional (less) não travam.
    expect(lock.packages['node_modules/fsevents']).toBeUndefined()
  })

  it('versão diferente da aprovada, biblioteca fora do grafo ou outro gerenciador: sem trava', () => {
    expect(approvedLockFor(manifest({ devDependencies: { vite: '8.1.5' } }), graph)).toBeNull()
    expect(
      approvedLockFor(manifest({ dependencies: { nanoid: '5.0.9', three: '0.184.0' } }), graph),
    ).toBeNull()
    expect(
      approvedLockFor(
        manifest({ packageManager: 'pnpm@9.0.0', dependencies: { three: '0.184.0' } }),
        graph,
      ),
    ).toBeNull()
    expect(approvedLockFor('{ quebrado', graph)).toBeNull()
    expect(approvedLockFor(manifest({}), graph)).toBeNull()
  })

  // Revisão do lote 7: com estes campos o `npm ci` recusa a trava ("Missing … from lock file"), e
  // a exportação levaria uma trava falsa com o LEIA-ME mandando `npm ci`.
  it('campos que a trava não descreve fazem a exportação sair sem trava', () => {
    for (const field of [
      { optionalDependencies: { three: '0.184.0' } },
      { peerDependencies: { three: '0.184.0' } },
      { overrides: { rolldown: '1.0.0' } },
      { bundleDependencies: ['three'] },
      { bundledDependencies: ['three'] },
      { workspaces: ['packages/*'] },
    ])
      expect(
        approvedLockFor(manifest({ devDependencies: { vite: '8.1.6' }, ...field }), graph),
      ).toBeNull()
  })

  it('uma indireta obrigatória que falta no grafo derruba a trava inteira', () => {
    const missing = { ...graph }
    delete missing['node_modules/rolldown']
    expect(approvedLockFor(manifest({ devDependencies: { vite: '8.1.6' } }), missing)).toBeNull()
  })
})

describe('a exportação do Pro leva a trava', () => {
  it('o ZIP de código-fonte de um modelo do Pro sai com package-lock.json do grafo aprovado', async () => {
    const result = await exportProjectSource(
      await createProProject('exportado', 'Exportado', 'three-action'),
    )
    const files = unzipSync(new Uint8Array(await result.blob.arrayBuffer()))
    expect(files['package-lock.json']).toBeDefined()
    const lock = JSON.parse(strFromU8(files['package-lock.json'] as Uint8Array))
    const pkg = JSON.parse(strFromU8(files['package.json'] as Uint8Array))
    expect(lock.packages['node_modules/three'].version).toBe(pkg.dependencies.three)
    expect(lock.packages['node_modules/three'].integrity).toMatch(/^sha512-/)
    // As instruções passam a mandar instalar as versões registradas.
    expect(strFromU8(files['LEIA-ME.txt'] as Uint8Array)).toContain('npm ci')
    expect(result.warnings).toEqual([])
  })
})
