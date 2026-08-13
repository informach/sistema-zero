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
    // ⚠️ Mudou uma 4ª vez em 12/08 (full review contra o jogo de referência): o inimigo
    // VOADOR ganhou modo de pisada e bloco de pisada — ele estava em "todos os
    // inimigos", machucava ao encostar e não havia como derrotá-lo, então toda etapa 3
    // tinha um perigo imortal. E os textos voltaram ao português correto (RECOMEÇA com
    // cedilha, "32 FASES / 2 JORNADAS"), agora que a fonte de pixel tem barra e acentos.
    // ⚠️ Mudou uma 5ª vez em 12/08 — a maior delas: as 32 fases deixaram de ser
    // SORTEADAS e viraram plantas escritas à mão, e o TEMA passou a sair do tipo da
    // fase (superfície / subterrâneo / água / castelo) em vez do mundo, que era o que
    // fazia 1-1, 1-2, 1-3 e 1-4 dividirem o mesmo céu azul. Entraram a peça de moeda e
    // a lava do castelo, as duas usando o papel novo "atravessa e avisa".
    // ⚠️ E o power-up deixou de ser um NO-OP: o herói começa pequeno (1 de vida, teto
    // 2), o broto o deixa grande e levar dano ENCOLHE em vez de matar. A figura segue
    // a vida, então quem está forte aparece diferente na tela.
    // ⚠️ 6ª vez em 12/08: o HUD passou para UMA tipografia só (a de pixel, via o bloco
    // novo "Escrever placar pixel"), MUNDO e ETAPA viraram um campo só no formato
    // "1-1" como no original, e VIDAS finalmente aparece na tela — ela existia só na
    // variável, então não dava para saber quantas restavam nem de quem era a vez.
    // ⚠️ 7ª vez em 12/08: as mecânicas que faltavam. O portal virou MASTRO de 9 tiles
    // e a altura do toque paga; entrou a ESTRELA de invencibilidade (o encostão passa
    // a derrotar) e a PLANTA que sai do cano e não aceita pisada. O voador deixou de
    // ser a única posição de inimigo escrita na mão.
    // ⚠️ 8ª vez em 13/08: descritor único de fase, larguras autorais, água/atalhos
    // coerentes, power-ups móveis, 100 moedas, tijolos, fogo, barras de fogo, chefes
    // progressivos e uma segunda jornada com composição própria.
    sha256: '859a34fab7afb83e14f18cdee6763d5bba4419d3a92c589df29e35b9725817ce',
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
