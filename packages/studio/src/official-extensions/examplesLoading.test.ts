import { describe, expect, it } from 'bun:test'
import { createHash } from 'node:crypto'
import { resolve } from 'node:path'
import { loadExtensionExamples } from '#extensions'
import { OFFICIAL_CATALOG } from './index'

const goldenCatalogs = {
  'game-2d': {
    count: 33,
    // ⚠️ Mudou em 09/08: os exemplos de plataforma passaram a usar os contratos
    // explícitos de terreno, Mundo e Fase em vez dos encaixes de tela legados; Reino Zero
    // agora documenta a seleção de jogadores e preserva o sobrevivente após uma morte.
    // ⚠️ Mudou em 12/08: o Reino Zero teve a geometria das 32 fases refeita (cano de duas
    // colunas assentado sobre o chão, poço limitado ao alcance do pulo) e passou a usar o
    // fluxo de Fase do motor, que devolve posição, câmera e blocos `?` ao morrer.
    // ⚠️ Mudou de novo em 12/08: HUD do Reino Zero em duas linhas (cabia só assim nos
    // 256px), sem o escurecimento de tela cheia, e a pisada passou a vir antes do
    // "Atualizar os inimigos" no laço.
    sha256: '215a41572c45434a4ca9c2634ab51e10bad5cc0f0c0a4e53438875bddba84c19',
  },
  'game-2d-advanced': {
    count: 37,
    // Reino Zero Pro passou a carregar a campanha validada de 32 fases.
    sha256: 'bdde1a5e1b190e9789bb0618ec2d90ec112bc538ae00565c2af9300b07da7356',
  },
  'game-3d': {
    count: 19,
    sha256: '4e1e5973eecc0738dfeed06d28bf7fb783441ec2ba1e62bfb09105627df3c3b8',
  },
  'game-3d-advanced': {
    count: 17,
    sha256: '5b38203f8294c4c18dc70c06fe95a8938e34b64a303906eb67809bcd7c90afca',
  },
  'world-3d': {
    count: 13,
    sha256: 'd015e060063e041bf2c96c15c7307b14c30815082444fd48d3f2da73c42b036e',
  },
} as const

describe('catálogos lazy das extensões oficiais', () => {
  it('preserva quantidade e ordem da saída validada e sanitizada', async () => {
    for (const extension of OFFICIAL_CATALOG) {
      const golden = goldenCatalogs[extension.manifest.id as keyof typeof goldenCatalogs]
      expect(extension.examples.count).toBe(golden.count)
      expect('examples' in extension.manifest).toBe(false)

      const examples = await loadExtensionExamples(extension)
      const sha256 = createHash('sha256').update(JSON.stringify(examples)).digest('hex')
      expect(examples).toHaveLength(golden.count)
      expect(sha256).toBe(golden.sha256)
    }
  })

  it('mantém os IRs pesados fora do chunk inicial do catálogo', async () => {
    const build = await Bun.build({
      entrypoints: [resolve(import.meta.dir, 'index.ts')],
      target: 'browser',
      minify: true,
      splitting: true,
      write: false,
    } as Parameters<typeof Bun.build>[0])
    expect(build.success).toBe(true)

    const entry = build.outputs.find((output) => output.kind === 'entry-point')
    expect(entry).toBeDefined()
    if (!entry) throw new Error('build sem entry-point')

    expect(entry.size).toBeLessThan(800_000)
    expect(Bun.gzipSync(new Uint8Array(await entry.arrayBuffer())).byteLength).toBeLessThan(230_000)
    const entrySource = await entry.text()
    expect(entrySource).not.toContain('Pegue a moeda')
    expect(entrySource).not.toContain('Jogo 2D interativo')
    expect(build.outputs.filter((output) => output.kind === 'chunk').length).toBeGreaterThanOrEqual(
      15,
    )
  })
})
