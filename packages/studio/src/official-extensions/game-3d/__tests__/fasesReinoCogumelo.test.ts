import { describe, expect, it } from 'bun:test'
import { FASE_1_1, FASE_1_2, FASE_1_4, FASES_REINO_COGUMELO, MUNDO_1 } from '../stagesReinoCogumelo'
import { type Any, call, loadRuntime } from './platformHarness'

/**
 * O Mundo 1 do "Reino Cogumelo", jogado de verdade.
 *
 * Estes testes valem mais que o schema: um mapa pode ser válido e mesmo assim
 * ser INJOGÁVEL (abismo largo demais, fase sem fim, peças demais para o
 * orçamento do kit). Aqui a fase é montada, percorrida e conferida.
 */

/** As 32, nomeadas como no original: 1-1, 1-2, … 8-4. */
const FASES: Array<[string, string]> = FASES_REINO_COGUMELO.map((mapa, i) => [
  `${Math.floor(i / 4) + 1}-${(i % 4) + 1}`,
  mapa,
])

function jogo(mapa: string) {
  const b = loadRuntime()
  const world = call(b.api, 'createPlatformScene', 'tela')
  const heroi = call(b.api, 'createHero', world, '#e03010')
  call(b.api, 'loadStage', world, mapa)
  return { ...b, world, heroi }
}

const estado = (world: Any) => world._stage as Any

/** Anda o herói até `ateX`, teleportando na horizontal e deixando a física agir. */
function caminhar(api: Any, world: Any, heroi: Any, ateX: number) {
  let maiorSolidos = 0
  let maiorMalhas = 0
  for (let x = 2; x <= ateX; x += 0.5) {
    call(api, 'setPosition', heroi, x, 3, 0)
    call(api, 'stepBody', heroi, world)
    call(api, 'stageStep', world, heroi)
    call(api, 'sideCamera', world, heroi)
    const st = estado(world)
    maiorSolidos = Math.max(maiorSolidos, (world._solids as unknown[]).length)
    maiorMalhas = Math.max(maiorMalhas, (st.meshes as unknown[]).length)
  }
  return { maiorSolidos, maiorMalhas }
}

describe('Reino Cogumelo — o Mundo 1 monta e é jogável', () => {
  it('são 32 fases: 8 mundos de 4 áreas, nenhuma vazia', () => {
    expect(FASES_REINO_COGUMELO).toHaveLength(32)
    expect(MUNDO_1).toHaveLength(4)
    for (const [nome, mapa] of FASES) {
      // Só "não está vazia": as áreas de castelo são compactas de propósito.
      expect(mapa.length, nome).toBeGreaterThan(120)
      expect(mapa, nome).toContain('chao=')
    }
  })

  it('a matriz de temas é a do GDD: castelo na Área 4, água e subterrâneo no lugar', () => {
    const tema = (i: number) => FASES[i]?.[1].match(/tema=(\w+)/)?.[1]
    // Área 4 de todo mundo é castelo.
    for (let mundo = 0; mundo < 8; mundo++)
      expect(tema(mundo * 4 + 3), `${mundo + 1}-4`).toBe('castelo')
    // Mundos 1 e 4 têm a Área 2 subterrânea; 2 e 7, aquática.
    expect(tema(1)).toBe('subterraneo')
    expect(tema(12 + 1)).toBe('subterraneo')
    expect(tema(4 + 1)).toBe('agua')
    expect(tema(24 + 1)).toBe('agua')
    // Mundos 3 e 6 são as áreas de superfície NOTURNAS.
    expect(tema(8)).toBe('noite')
    expect(tema(20)).toBe('noite')
  })

  for (const [nome, mapa] of FASES) {
    it(`a fase ${nome} monta, tem chão sob o começo e cabe no orçamento`, () => {
      const { api, world, heroi } = jogo(mapa)
      const st = estado(world)
      expect((st.meshes as unknown[]).length, nome).toBeGreaterThan(0)

      // Cai no começo: tem de pousar, não afundar para sempre.
      for (let f = 0; f < 60; f++) {
        call(api, 'stepBody', heroi, world)
        call(api, 'stageStep', world, heroi)
      }
      expect((heroi.position as { y: number }).y, nome).toBeGreaterThan(-2)

      const largura = st.width as number
      const { maiorSolidos, maiorMalhas } = caminhar(api, world, heroi, largura)
      // O kit tem orçamento PRÓPRIO (260 malhas); estourá-lo faz a fase sumir aos
      // pedaços em silêncio.
      expect(maiorMalhas, nome + ' malhas').toBeLessThan(260)
      // E o laço de colisão só é barato porque a janela é pequena.
      expect(maiorSolidos, nome + ' sólidos').toBeLessThan(90)
    })
  }

  it('toda fase termina em mastro ou em chefão, nunca no vazio', () => {
    for (const [nome, mapa] of FASES) {
      const temFim = mapa.includes('mastro=') || mapa.includes('chefao=')
      expect(temFim, nome).toBe(true)
    }
  })

  it('nenhum abismo é largo demais para o pulo com corrida', () => {
    // O artigo diz que os poços têm "aproximadamente o comprimento que Mario
    // pode pular". Com a corrida em 0,18/quadro e o pulo segurado, o alcance
    // fica em torno de 6 colunas; 5 é o teto seguro.
    for (const [nome, mapa] of FASES) {
      const partes = mapa.split(';')
      const apoio = new Set<number>()
      // Chão conta como apoio...
      for (const trecho of (partes.find((l) => l.startsWith('chao=')) ?? '')
        .slice('chao='.length)
        .split(',')) {
        const [de, ate] = trecho.split('-').map(Number)
        for (let c = de ?? 0; c <= (ate ?? de ?? 0); c++) apoio.add(c)
      }
      // ...e plataforma suspensa também: é assim que a 1-3 atravessa o vazio.
      for (const linha of partes) {
        if (!linha.startsWith('solido=') && !linha.startsWith('plataforma=')) continue
        for (const item of linha.slice(linha.indexOf('=') + 1).split(',')) {
          const col = Number(item.split(':')[0])
          if (!Number.isNaN(col)) {
            apoio.add(col)
            apoio.add(col + 1)
          }
        }
      }
      const largura = Math.max(...apoio)
      let vao = 0
      for (let c = 0; c <= largura; c++) {
        vao = apoio.has(c) ? 0 : vao + 1
        expect(vao, `${nome}: vão terminando em ${c}`).toBeLessThanOrEqual(5)
      }
    }
  })

  it('a 1-1 dá para atravessar até o mastro e vencer', () => {
    const { api, world, heroi } = jogo(FASE_1_1)
    caminhar(api, world, heroi, 199)
    expect(call(api, 'stageIs', world, 'venceu')).toBe(true)
    expect(call(api, 'stageValue', world, 'pontos')).toBeGreaterThan(0)
  })

  it('a 1-2 tem o subterrâneo, as plantas e as plataformas móveis', () => {
    expect(FASE_1_2).toContain('tema=subterraneo')
    expect(FASE_1_2).toContain('planta')
    expect(FASE_1_2).toContain('plataforma=')
    const { api, world, heroi } = jogo(FASE_1_2)
    caminhar(api, world, heroi, 159)
    expect(call(api, 'stageIs', world, 'venceu')).toBe(true)
  })

  it('a 1-4 é castelo com lava, barra de fogo e chefão', () => {
    expect(FASE_1_4).toContain('tema=castelo')
    expect(FASE_1_4).toContain('lava=')
    expect(FASE_1_4).toContain('fogo=')
    expect(FASE_1_4).toContain('chefao=')
  })

  it('a vida extra escondida da 1-1 está logo antes do abismo, como no artigo', () => {
    // O artigo mostra que o bloco invisível segura o pulo errado do jogador —
    // ele precisa estar ANTES da borda do buraco, não depois.
    const escondido = FASE_1_1.split(';').find((l) => l.startsWith('escondido='))
    const coluna = Number((escondido ?? '').split('=')[1]?.split(':')[0])
    const chao = FASE_1_1.split(';').find((l) => l.startsWith('chao=')) ?? ''
    const primeiroFim = Number(chao.slice('chao='.length).split(',')[0]?.split('-')[1])
    expect(coluna).toBeLessThan(primeiroFim)
    expect(primeiroFim - coluna).toBeLessThan(8)
  })
})
