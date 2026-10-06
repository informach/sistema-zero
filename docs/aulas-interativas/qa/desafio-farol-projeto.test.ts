import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import {
  FAROL_HITBOXES,
  FAROL_LAYOUT,
  FAROL_PERSONAGENS,
  farolSvg,
} from '../../../packages/studio/src/arte/farol-assets'
import { sanitizeProjectAssets } from '../../../packages/studio/src/core/project'
import { type SZIRV2, SZIRV2Schema } from '../../../packages/studio/src/ir/schema'
import { exampleHarness } from '../../../packages/studio/src/official-extensions/game-2d/__tests__/examplePlaythroughHarness'
import { gameTwoDBlocks } from '../../../packages/studio/src/official-extensions/game-2d/blockCatalog'
import { montarProjetoFarol } from './desafio-farol-projeto'

describe('projeto preparado A Chave do Farol', () => {
  test.each([
    'dia-1',
    'dia-2',
    'dia-3',
    'concluido',
  ] as const)('%s usa Jogo 2D e somente variáveis, valores e condições simples', (etapa) => {
    const project = montarProjetoFarol(etapa)
    const gameTypes = new Set(gameTwoDBlocks.map((block) => block.type))
    const simpleTypes = new Set([
      'sz_frame_start',
      'sz_frame_events',
      'sz_frame_loops',
      'sz_js_var_create',
      'sz_js_var_assign',
      'sz_js_if_else',
      'sz_val_bool',
      'sz_val_compare',
      'sz_val_number',
      'sz_val_text',
      'sz_val_variable',
    ])
    const types = [...JSON.stringify(project.blocksState).matchAll(/"type":"(sz_[^"]+)"/g)].map(
      (match) => match[1]!,
    )
    expect(types.length).toBeGreaterThan(0)
    expect([
      ...new Set(types.filter((type) => !gameTypes.has(type) && !simpleTypes.has(type))),
    ]).toEqual([])
    const commands = types.filter(
      (type) => !type.startsWith('sz_val_') && !type.startsWith('sz_frame_'),
    )
    expect(commands.filter((type) => gameTypes.has(type)).length).toBeGreaterThan(
      commands.length / 2,
    )
  })

  test('usa os SVGs originais, incluindo as duas versões da porta e o cenário sem atores', () => {
    const files = {
      cenario: 'cenario-farol-limpo',
      personagem: 'player-farol',
      menina: 'menina-farol',
      marinheira: 'marinheira-farol',
      menino: 'menino-farol',
      exploradora: 'exploradora-farol',
      chave: 'chave-farol',
      'farol-apagado': 'farol-apagado',
      'farol-aceso': 'farol-aceso',
      barco: 'barco-farol',
    } as const
    for (const [name, filename] of Object.entries(files)) {
      const original = readFileSync(
        new URL(`../../../packages/studio/src/arte/assets/farol/${filename}.svg`, import.meta.url),
        'utf8',
      )
        .trim()
        .replaceAll('\r\n', '\n')
      expect(farolSvg(name as keyof typeof files)).toBe(original)
    }
    expect(farolSvg('farol-apagado')).not.toBe(farolSvg('farol-aceso'))
  })
  test('três retomadas válidas, uma extensão e arte inteiramente local', () => {
    const d1 = montarProjetoFarol('dia-1')
    const d2 = montarProjetoFarol('dia-2')
    const d3 = montarProjetoFarol('dia-3')
    for (const project of [d1, d2, d3, montarProjetoFarol('concluido')]) {
      expect(project.installedExtensions?.map((item) => item.id)).toEqual(['game-2d'])
      expect(SZIRV2Schema.safeParse(project.ir).success).toBe(true)
      expect(project.ir.html).toEqual([])
      expect(project.ir.css).toEqual([])
      expect(sanitizeProjectAssets(JSON.parse(JSON.stringify(project.assets)))).toEqual(
        project.assets,
      )
      expect(project.ir.behavior.start[0]).toMatchObject({
        type: 'g2d:setupStage',
        width: 480,
        height: 360,
      })
      expect(JSON.stringify(project.blocksState)).not.toMatch(
        /sz_(?:html|css|canvas|frame_structure|frame_appearance)/,
      )
      expect(
        project.assets.every((asset) => asset.dataUrl.startsWith('data:image/svg+xml;base64,')),
      ).toBe(true)
      expect(project.assets.map((asset) => asset.name)).toEqual([
        'cenario',
        'personagem',
        'menina',
        'marinheira',
        'menino',
        'exploradora',
        'chave',
        'farol-apagado',
        'farol-aceso',
        'barco',
      ])
    }
    expect(JSON.stringify(d1.ir)).not.toContain('g2d:topDown')
    expect(JSON.stringify(d1.ir)).not.toContain('g2d:onOverlap')
    expect(JSON.stringify(d2.ir)).toContain('g2d:topDown')
    expect(JSON.stringify(d2.ir)).not.toContain('g2d:onOverlap')
    expect(JSON.stringify(d3.ir)).toContain('g2d:onOverlap')
  })

  test('as imagens de personagem vêm logo depois do original, com a mesma caixa e o mesmo contato', () => {
    const assets = montarProjetoFarol('concluido').assets ?? []
    const inicio = assets.findIndex((asset) => asset.name === 'personagem')
    const personagens = assets.slice(inicio, inicio + FAROL_PERSONAGENS.length)
    expect(personagens.map((asset) => asset.name)).toEqual([...FAROL_PERSONAGENS])
    for (const asset of personagens) {
      expect([asset.width, asset.height], asset.name).toEqual([64, 64])
      expect(asset.sprite?.hitbox, asset.name).toEqual(FAROL_HITBOXES.personagem)
      expect(asset.sprite?.frameW, asset.name).toBe(64)
      expect(asset.sprite?.frameH, asset.name).toBe(64)
    }
  })

  test('trocar a imagem do sprite personagem não muda o jogo: mesmo tamanho, mesmos encontros', () => {
    /** Onde o personagem encosta na chave e na porta, numa grade em volta de cada uma. */
    function encontros(imagem: string, semContato = false) {
      const project = montarProjetoFarol('concluido')
      const ir = structuredClone(project.ir) as SZIRV2
      const cria = ir.behavior.start.find(
        (st) => st.type === 'g2d:createImageSprite' && st.varName === 'personagem',
      )
      if (cria?.type !== 'g2d:createImageSprite') throw new Error('sprite personagem ausente')
      cria.image = imagem
      const assets = (project.assets ?? []).map((asset) =>
        semContato && asset.name === imagem ? { ...asset, sprite: undefined } : asset,
      )
      const game = exampleHarness({ name: project.name, experience: 'game', ir, assets })
      const [personagem, chave, farol] = game.sprites
      if (!personagem || !chave || !farol) throw new Error('Personagens preparados ausentes')
      game.nextFrame()
      const api = game.api as unknown as { isColliding(a: unknown, b: unknown): boolean }
      const mapa: boolean[] = []
      for (const alvo of [chave, farol])
        for (let dy = -72; dy <= 40; dy += 4)
          for (let dx = -72; dx <= 40; dx += 4) {
            personagem.x = alvo.x + dx
            personagem.y = alvo.y + dy
            mapa.push(api.isColliding(personagem, alvo))
          }
      expect(game.errors).toEqual([])
      expect(game.warnings).toEqual([])
      return { mapa, w: personagem.w, h: personagem.h }
    }

    const original = encontros('personagem')
    expect(original.mapa.filter(Boolean).length).toBeGreaterThan(20)
    expect(original.mapa.filter((v) => !v).length).toBeGreaterThan(20)
    for (const imagem of FAROL_PERSONAGENS) {
      const trocado = encontros(imagem)
      expect([trocado.w, trocado.h], imagem).toEqual([original.w, original.h])
      expect(trocado.mapa, imagem).toEqual(original.mapa)
    }
    // anti-vácuo: sem a área de contato no asset, a mesma grade encosta em outros lugares
    expect(encontros('menina', true).mapa).not.toEqual(original.mapa)
  })

  test('o jogo real anda, recolhe a chave uma vez e só acende o farol depois dela', () => {
    const project = montarProjetoFarol('concluido')
    const game = exampleHarness({
      name: project.name,
      experience: 'game',
      ir: project.ir,
      assets: project.assets,
    })
    const [personagem, chave, farol, barco] = game.sprites
    if (!personagem || !chave || !farol || !barco)
      throw new Error('Personagens preparados ausentes')

    const initialX = personagem.x
    game.fireKey('ArrowRight')
    expect(game.api.actionDown('right')).toBe(true)
    game.nextFrame()
    game.fireKey('ArrowRight', 'keyup')
    expect(game.errors).toEqual([])
    expect(game.warnings).toEqual([])
    expect(personagem.x).toBeGreaterThan(initialX)

    personagem.x = FAROL_LAYOUT.personagemNaPorta.x
    personagem.y = FAROL_LAYOUT.personagemNaPorta.y
    game.nextFrame()
    expect(barco.x).toBe(FAROL_LAYOUT.barco.x)

    personagem.x = chave.x
    personagem.y = chave.y
    game.nextFrame()
    expect((chave as typeof chave & { image?: unknown }).image).toBeNull()

    // O facho e a margem transparente da torre não são a porta.
    personagem.x = farol.x
    personagem.y = farol.y
    game.nextFrame()
    expect(barco.x).toBe(FAROL_LAYOUT.barco.x)
    personagem.x = FAROL_LAYOUT.personagemNaPorta.x
    personagem.y = FAROL_LAYOUT.personagemNaPorta.y
    game.nextFrame()
    game.nextFrame()
    expect(barco.x).toBeLessThan(FAROL_LAYOUT.barco.x)
    for (let frame = 0; frame < 100; frame++) game.nextFrame()
    expect(barco.x).toBe(FAROL_LAYOUT.chegadaBarcoX)
    expect(barco.x + barco.w).toBeLessThanOrEqual(480)
    expect(game.errors).toEqual([])
    expect(game.warnings).toEqual([])
  })
})
