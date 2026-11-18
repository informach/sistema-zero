/**
 * As ferramentas do editor de mapa na TELA: níveis, camadas, terreno, animação de peça,
 * biblioteca, objetos escolhidos, formas ponto a ponto, minimapa, teste com personagem e o
 * editor de conjuntos.
 *
 * ⚠️ O happy-dom não faz layout: os testes fixam o `getBoundingClientRect` do que converte
 * ponteiro em lugar do mapa. E esperam o que APARECE, nunca o que some.
 * ⚠️ "Sem desfazer vazio" é conferido por um Desfazer só: ele tem de voltar a mudança de
 * VERDADE anterior. Com um passo vazio no meio, o Desfazer não mudaria nada.
 */
import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createRef } from 'react'
import { COPY } from '../../core/copy'
import {
  createPixelSpriteAsset,
  createTilemapAsset,
  createTilesetAsset,
  isObjectLayer,
  isTileLayer,
  PINTA_LIMITS,
  type TilemapAsset,
} from '../../core/project'
import { clearIdbMock } from '../../testing/idbMock'

const { PintaApp } = await import('../PintaApp')
const { setPintaStorageNamespace } = await import('../../state/persistence')
const { createGalleryStore } = await import('../../state/galleryStore')
const { writeMapLevel, readMapLevel } = await import('./mapTools/mapLevels')
const { MapMinimapPanel } = await import('./MapMinimapPanel')
const { createMapSet } = await import('../../tiles/sets')
const { setCell, addObjectLayer } = await import('../../tiles/tilemapOps')
const { addMapGroup, updateMapLayer } = await import('../../tiles/layerTree')
const { addMapObject, createMapObject } = await import('../../tiles/mapObjects')

const LEVEL_KEY = 'pinta:map-level'
beforeEach(() => {
  clearIdbMock()
  setPintaStorageNamespace('')
  localStorage.removeItem(LEVEL_KEY)
})
afterEach(() => localStorage.removeItem(LEVEL_KEY))

type Seed = ReturnType<typeof createGalleryStore>
const SCALE = 2
const COLS = 6,
  ROWS = 4

/** Abre o mapa "fase" (6 × 4 casas de 16 px). `prepare` muda o mapa antes de abrir. */
async function abrirMapa(
  options: {
    level?: 'start' | 'create' | 'advanced'
    prepare?: (map: TilemapAsset) => TilemapAsset
    extra?: (seed: Seed, map: TilemapAsset) => Promise<void>
    open?: RegExp
  } = {},
) {
  if (options.level) writeMapLevel('', options.level)
  const seed = createGalleryStore()
  const tileset = await seed.getState().create({ kind: 'tileset', name: 'pecas', tileSize: 16 })
  if (!tileset) throw new Error('tileset esperado')
  const base = createTilemapAsset({ name: 'fase', tilesetId: tileset.id, cols: COLS, rows: ROWS })
  const map = await seed.getState().createPrepared(options.prepare ? options.prepare(base) : base)
  if (map?.kind !== 'tilemap') throw new Error('mapa esperado')
  await options.extra?.(seed, map)
  const view = render(<PintaApp />)
  fireEvent.click(await screen.findByRole('button', { name: options.open ?? /Abrir fase/ }))
  await screen.findByRole('img', { name: COPY.tiles.mapGrid })
  return view
}

function fixarCaixa(element: Element, width: number, height: number): void {
  Object.defineProperty(element, 'getBoundingClientRect', {
    configurable: true,
    value: () => ({
      left: 0,
      top: 0,
      width,
      height,
      right: width,
      bottom: height,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    }),
  })
}
function palcoDeObjetos(container: HTMLElement): SVGSVGElement {
  const svg = container.querySelector<SVGSVGElement>('[data-pin-objects-overlay]')
  if (!svg) throw new Error('palco de objetos esperado')
  fixarCaixa(svg, COLS * 16 * SCALE, ROWS * 16 * SCALE)
  if (svg.parentElement) fixarCaixa(svg.parentElement, COLS * 16 * SCALE, ROWS * 16 * SCALE)
  return svg
}
function grade(): HTMLElement {
  const grid = screen.getByRole('img', { name: COPY.tiles.mapGrid })
  fixarCaixa(grid, COLS * 16 * SCALE, ROWS * 16 * SCALE)
  return grid
}
/** Um lugar do mapa (px do mapa) → evento de ponteiro na tela. */
const at = (x: number, y: number, pointerId = 1) => ({
  isPrimary: true,
  pointerId,
  clientX: x * SCALE,
  clientY: y * SCALE,
})
const tocar = (svg: Element, x: number, y: number): void => {
  fireEvent.pointerDown(svg, at(x, y))
  fireEvent.pointerUp(svg, at(x, y))
}
const desfazer = (): HTMLButtonElement =>
  screen.getByRole('button', { name: COPY.editor.undo }) as HTMLButtonElement
const nivel = (): HTMLSelectElement =>
  screen.getByLabelText(COPY.scene.nivelDasFerramentas) as HTMLSelectElement
const ferramenta = (name: string): HTMLElement | null => screen.queryByRole('button', { name })
const ativa = (name: string): boolean =>
  screen.getByRole('button', { name }).getAttribute('aria-pressed') === 'true'
const espera = (): Promise<void> => act(async () => Bun.sleep(0))
/** O salvamento demora um instante: quem diz a verdade é o disco, relido até refletir a edição. */
const noDisco = (check: () => Promise<void>): Promise<void> => waitFor(check, { timeout: 5000 })

async function mapaDoDisco(): Promise<TilemapAsset> {
  const conferir = createGalleryStore()
  await conferir.getState().load()
  const map = conferir.getState().assets.find((a) => a.kind === 'tilemap')
  if (map?.kind !== 'tilemap') throw new Error('mapa esperado no disco')
  return map
}
const objetos = (map: TilemapAsset) => map.layers.find(isObjectLayer)?.objects ?? []
/** Com uma camada de objetos pronta e ativa. */
const comObjetos = (map: TilemapAsset): TilemapAsset => addObjectLayer(map, 'Objetos')
async function ativarObjetos(): Promise<void> {
  fireEvent.click(screen.getByRole('button', { name: /^Objetos/ }))
  await screen.findByRole('button', { name: COPY.tiles.objectSelect })
}

describe('níveis do editor de mapa', () => {
  it('colisão de camada em Criar mais não abre controles técnicos e permanece ao voltar para Começar', async () => {
    await abrirMapa()
    expect(screen.queryByRole('checkbox', { name: COPY.tiles.layerCollision })).toBeNull()
    fireEvent.change(nivel(), { target: { value: 'create' } })
    const collision = screen.getByRole('checkbox', {
      name: COPY.tiles.layerCollision,
    }) as HTMLInputElement
    expect(collision.checked).toBe(false)
    expect(screen.queryByRole('slider', { name: /Opacidade/ })).toBeNull()
    expect(screen.queryByText(COPY.tiles.layerParent)).toBeNull()
    expect(screen.queryByText(COPY.scene.deslocamentoEDistancia)).toBeNull()
    expect(ferramenta(COPY.tiles.addGroup)).toBeNull()
    fireEvent.click(collision)
    expect(collision.checked).toBe(true)
    expect(screen.queryByRole('slider', { name: /Opacidade/ })).toBeNull()
    expect(screen.queryByText(COPY.scene.deslocamentoEDistancia)).toBeNull()
    fireEvent.change(nivel(), { target: { value: 'start' } })
    expect(
      (screen.getByRole('checkbox', { name: COPY.tiles.layerCollision }) as HTMLInputElement)
        .checked,
    ).toBe(true)
    fireEvent.change(nivel(), { target: { value: 'advanced' } })
    expect(screen.getByRole('slider', { name: /Opacidade/ })).toBeTruthy()
    expect(screen.getByText(COPY.tiles.layerParent)).toBeTruthy()
    expect(screen.getByText(COPY.scene.deslocamentoEDistancia)).toBeTruthy()
  })
  it('perfil novo abre em "Começar": poucas ferramentas, poucos painéis e o teste', async () => {
    await abrirMapa()
    expect(nivel().value).toBe('start')
    for (const name of [COPY.tools.pencil, COPY.tools.eraser, COPY.tools.fill, COPY.tools.select])
      expect(ferramenta(name)).toBeTruthy()
    for (const name of [COPY.tools.line, COPY.tools.rect, COPY.tools.picker, COPY.tiles.autoExpand])
      expect(ferramenta(name)).toBeNull()
    expect(screen.getByText(COPY.tiles.pickTile)).toBeTruthy()
    expect(screen.getByRole('button', { name: COPY.scene.testarComPersonagem })).toBeTruthy()
    expect(screen.queryByText(COPY.scene.oMapaInteiro)).toBeNull()
    expect(screen.getByText(COPY.scene.terrenoInteligente)).toBeTruthy()
    expect(screen.queryByText(COPY.tiles.turnTile)).toBeNull()
    expect(ferramenta(COPY.tiles.addGroup)).toBeNull()
    expect(ferramenta(COPY.tiles.addLayer)).toBeTruthy()
  })
  it('"Criar mais" e "Avançado" mostram mais, e a escolha fica guardada', async () => {
    const view = await abrirMapa()
    fireEvent.change(nivel(), { target: { value: 'create' } })
    expect(await screen.findByRole('button', { name: COPY.tools.line })).toBeTruthy()
    expect(screen.getByText(COPY.scene.oMapaInteiro)).toBeTruthy()
    expect(screen.getByText(COPY.scene.terrenoInteligente)).toBeTruthy()
    expect(screen.getByText(COPY.tiles.turnTile)).toBeTruthy()
    expect(ferramenta(COPY.tiles.addGroup)).toBeNull()
    expect(readMapLevel('')).toBe('create')
    fireEvent.change(nivel(), { target: { value: 'advanced' } })
    expect(await screen.findByRole('button', { name: COPY.tiles.addGroup })).toBeTruthy()
    // Fecha e abre de novo: o nível é o que ficou guardado.
    view.unmount()
    render(<PintaApp />)
    fireEvent.click(await screen.findByRole('button', { name: /Abrir fase/ }))
    await screen.findByRole('img', { name: COPY.tiles.mapGrid })
    expect(nivel().value).toBe('advanced')
  })
  it('a letra do atalho respeita o nível', async () => {
    await abrirMapa()
    expect(ativa(COPY.tools.pencil)).toBe(true)
    fireEvent.keyDown(window, { key: 'l' })
    await espera()
    expect(ativa(COPY.tools.pencil)).toBe(true)
    fireEvent.keyDown(window, { key: 'e' })
    await waitFor(() => expect(ativa(COPY.tools.eraser)).toBe(true))
    fireEvent.change(nivel(), { target: { value: 'create' } })
    await screen.findByRole('button', { name: COPY.tools.line })
    fireEvent.keyDown(window, { key: 'l' })
    await waitFor(() => expect(ativa(COPY.tools.line)).toBe(true))
    // Voltar para "Começar" com a Linha ligada troca para uma ferramenta que existe na caixa.
    fireEvent.change(nivel(), { target: { value: 'start' } })
    await waitFor(() => expect(ativa(COPY.tools.pencil)).toBe(true))
  })
  it('o que o mapa já usa aparece mesmo em "Começar"', async () => {
    await abrirMapa({ prepare: (m) => addMapGroup(m, 'Vila') })
    expect(nivel().value).toBe('start')
    expect(await screen.findByRole('button', { name: COPY.tiles.addGroup })).toBeTruthy()
    // O que o mapa não usa continua guardado.
    expect(screen.queryByText(COPY.scene.oMapaInteiro)).toBeNull()
  })
})

describe('camadas do mapa', () => {
  it('subir a camada que já está em cima e pedir grupo no teto não criam desfazer', async () => {
    await abrirMapa({ level: 'advanced' })
    fireEvent.click(screen.getByRole('button', { name: /^Subir camada/ }))
    fireEvent.click(screen.getByRole('button', { name: /^Descer camada/ }))
    await espera()
    expect(desfazer().disabled).toBe(true)
    // Enche o mapa até o orçamento da autoria e pede mais um grupo.
    for (let i = 1; i < PINTA_LIMITS.maxTilemapLayers; i++)
      fireEvent.click(screen.getByRole('button', { name: COPY.tiles.addGroup }))
    await noDisco(async () =>
      expect((await mapaDoDisco()).layers).toHaveLength(PINTA_LIMITS.maxTilemapLayers),
    )
    fireEvent.click(screen.getByRole('button', { name: COPY.tiles.addGroup }))
    await espera()
    // Cada criação deixou um passo; o pedido recusado não deixou nenhum.
    for (let i = 1; i < PINTA_LIMITS.maxTilemapLayers; i++) fireEvent.click(desfazer())
    await waitFor(() => expect(desfazer().disabled).toBe(true))
  })
  it('camada trancada: marcar colisão avisa e não muda nada', async () => {
    await abrirMapa({
      level: 'advanced',
      prepare: (m) => updateMapLayer(m, m.layers[0]!.id, { locked: true }),
    })
    fireEvent.click(screen.getByRole('checkbox', { name: COPY.tiles.layerCollision }))
    expect(await screen.findByText(COPY.layers.lockedWarning)).toBeTruthy()
    expect(desfazer().disabled).toBe(true)
    // Pintar na camada trancada dá o mesmo aviso do editor de pixel.
    const grid = grade()
    fireEvent.pointerDown(grid, { isPrimary: true, pointerId: 3, clientX: 40, clientY: 40 })
    fireEvent.pointerUp(grid, { pointerId: 3, clientX: 40, clientY: 40 })
    await espera()
    expect(desfazer().disabled).toBe(true)
    expect(screen.getByText(COPY.layers.lockedWarning)).toBeTruthy()
  })
  it('nomes vêm do texto central e os alvos de toque têm 44 px', async () => {
    await abrirMapa({ level: 'advanced' })
    const layerName = (await mapaDoDisco()).layers[0]!.name
    expect(screen.getByRole('button', { name: COPY.tiles.showOrHide(layerName) })).toBeTruthy()
    const summary = screen.getByText(COPY.scene.deslocamentoEDistancia)
    expect(summary.className).toContain('min-h-11')
    const slider = document.querySelector('input[type="range"]')
    expect(slider?.className).toContain('pin-range')
  })
})

describe('balde no mapa', () => {
  it('área que já está igual não cria desfazer; a pintada cria um', async () => {
    await abrirMapa({ level: 'advanced' })
    const grid = grade()
    fireEvent.click(screen.getByRole('button', { name: COPY.tools.fill }))
    const clique = (id: number): void => {
      fireEvent.pointerDown(grid, { isPrimary: true, pointerId: id, clientX: 40, clientY: 40 })
      fireEvent.pointerUp(grid, { pointerId: id, clientX: 40, clientY: 40 })
    }
    clique(1)
    await waitFor(() => expect(desfazer().disabled).toBe(false))
    clique(2)
    await espera()
    fireEvent.click(desfazer())
    await waitFor(() => expect(desfazer().disabled).toBe(true))
  })
  it('a peça virada enche a área virada', async () => {
    await abrirMapa({ level: 'advanced' })
    const grid = grade()
    fireEvent.click(screen.getByRole('button', { name: COPY.tools.flipH }))
    fireEvent.click(screen.getByRole('button', { name: COPY.tools.fill }))
    fireEvent.pointerDown(grid, { isPrimary: true, pointerId: 1, clientX: 40, clientY: 40 })
    fireEvent.pointerUp(grid, { pointerId: 1, clientX: 40, clientY: 40 })
    await noDisco(async () => {
      const cells = (await mapaDoDisco()).layers.find(isTileLayer)!.cells
      // Peça 0 com o bit de virar de lado: o número guardado não é zero.
      expect(cells.every((cell) => cell > 0)).toBe(true)
    })
  })
})

describe('terreno, espalhar e animação da peça', () => {
  it('"Peças (separe por vírgula)" aceita a vírgula digitada', async () => {
    await abrirMapa({ level: 'create' })
    fireEvent.click(screen.getByRole('checkbox', { name: COPY.scene.espalharComOPincel }))
    const field = (await screen.findByLabelText(
      COPY.scene.pecasSeparePorVirgula,
    )) as HTMLInputElement
    fireEvent.change(field, { target: { value: '0,' } })
    expect(field.value).toBe('0,')
    fireEvent.change(field, { target: { value: '0, 0' } })
    expect(field.value).toBe('0, 0')
    fireEvent.blur(field)
    await waitFor(() => expect(field.value).toBe('0,0'))
  })
  it('o nome do terreno grava ao sair do campo: um desfazer por nome', async () => {
    await abrirMapa({ level: 'create' })
    fireEvent.click(screen.getByRole('button', { name: COPY.scene.novoTerreno }))
    const name = (await screen.findByLabelText(COPY.scene.nome)) as HTMLInputElement
    const original = name.value
    for (const value of ['G', 'Gr', 'Grama']) fireEvent.change(name, { target: { value } })
    fireEvent.blur(name)
    await waitFor(() =>
      expect(
        (screen.getByLabelText(COPY.scene.terreno) as HTMLSelectElement).textContent,
      ).toContain('Grama'),
    )
    // Um desfazer só devolve o nome inteiro de antes (não "Gr").
    fireEvent.click(desfazer())
    await waitFor(() =>
      expect((screen.getByLabelText(COPY.scene.nome) as HTMLInputElement).value).toBe(original),
    )
  })
  it('a duração do quadro só vale ao sair do campo: "500" grava 500, uma vez', async () => {
    await abrirMapa({ level: 'advanced' })
    fireEvent.click(screen.getByRole('button', { name: COPY.scene.maisUmQuadro }))
    const label = COPY.scene.dynamicDuracaoDoQuadroEmMilissegundos(1)
    const field = (await screen.findByLabelText(label)) as HTMLInputElement
    expect(field.value).toBe('150')
    for (const value of ['5', '50', '500']) {
      fireEvent.change(field, { target: { value } })
      expect(field.value).toBe(value)
    }
    fireEvent.blur(field)
    await waitFor(() =>
      expect((screen.getByLabelText(label) as HTMLInputElement).value).toBe('500'),
    )
    // Menor que o mínimo é corrigido só na hora de gravar.
    fireEvent.change(screen.getByLabelText(label), { target: { value: '3' } })
    fireEvent.keyDown(screen.getByLabelText(label), { key: 'Enter' })
    await waitFor(() => expect((screen.getByLabelText(label) as HTMLInputElement).value).toBe('16'))
    fireEvent.click(desfazer())
    await waitFor(() =>
      expect((screen.getByLabelText(label) as HTMLInputElement).value).toBe('500'),
    )
    fireEvent.click(desfazer())
    await waitFor(() =>
      expect((screen.getByLabelText(label) as HTMLInputElement).value).toBe('150'),
    )
  })
})

describe('objetos do mapa', () => {
  it('arte: guardar versão, desfazer/refazer, reconectar e limpar sem perder a animação escolhida', async () => {
    const sprite = createPixelSpriteAsset({ name: 'arvore', frameSize: 16 })
    sprite.animations.push({
      ...structuredClone(sprite.animations[0]!),
      id: 'vento',
      name: 'vento',
    })
    await abrirMapa({
      level: 'advanced',
      prepare: comObjetos,
      extra: async (seed) => {
        await seed.getState().createPrepared(sprite)
      },
    })
    await ativarObjetos()
    fireEvent.click(
      await screen.findByRole('button', { name: COPY.scene.dynamicPorNoMapa('arvore') }),
    )
    await noDisco(async () => expect(objetos(await mapaDoDisco())).toHaveLength(1))
    fireEvent.click(screen.getByRole('button', { name: COPY.tiles.pickObject('arvore') }))
    fireEvent.change(screen.getByLabelText(COPY.scene.objectAnimation), {
      target: { value: 'vento' },
    })
    await noDisco(async () =>
      expect(objetos(await mapaDoDisco())[0]!.art?.animationId).toBe('vento'),
    )
    fireEvent.click(screen.getByRole('button', { name: COPY.scene.keepResourceVersion }))
    let frozenId = ''
    await noDisco(async () => {
      const saved = await mapaDoDisco()
      expect(saved.resources).toHaveLength(1)
      frozenId = saved.resources![0]!.asset.id
      expect(frozenId).not.toBe(sprite.id)
      expect(objetos(saved)[0]!.art).toMatchObject({ assetId: frozenId, animationId: 'vento' })
    })
    fireEvent.click(desfazer())
    await noDisco(async () => expect((await mapaDoDisco()).resources).toBeUndefined())
    fireEvent.click(screen.getByRole('button', { name: COPY.editor.redo }))
    await noDisco(async () => expect((await mapaDoDisco()).resources![0]!.asset.id).toBe(frozenId))
    fireEvent.click(screen.getByRole('button', { name: COPY.scene.followResource }))
    await noDisco(async () =>
      expect(objetos(await mapaDoDisco())[0]!.art).toMatchObject({
        assetId: sprite.id,
        animationId: 'vento',
      }),
    )
    fireEvent.click(screen.getByRole('button', { name: COPY.scene.clearUnusedVersions }))
    await noDisco(async () => expect((await mapaDoDisco()).resources).toBeUndefined())
    fireEvent.change(screen.getByLabelText(COPY.scene.objectAnimation), { target: { value: '' } })
    await noDisco(async () => {
      const saved = await mapaDoDisco()
      expect(objetos(saved)[0]!.art?.animationId).toBeUndefined()
      expect(saved.schema).toBe(4)
    })
  }, 15000)
  it('Delete sem nada escolhido não cria desfazer', async () => {
    await abrirMapa({ level: 'advanced', prepare: comObjetos })
    await ativarObjetos()
    fireEvent.keyDown(window, { key: 'Delete' })
    await espera()
    expect(desfazer().disabled).toBe(true)
  })
  it('distribuir com dois objetos não cria desfazer; alinhar cria um', async () => {
    const { container } = await abrirMapa({ level: 'advanced', prepare: comObjetos })
    await ativarObjetos()
    const svg = palcoDeObjetos(container)
    fireEvent.click(screen.getByRole('button', { name: COPY.tiles.objectPoint }))
    tocar(svg, 8, 8)
    tocar(svg, 40, 24)
    await noDisco(async () => expect(objetos(await mapaDoDisco())).toHaveLength(2))
    fireEvent.keyDown(window, { key: 'a', ctrlKey: true })
    await screen.findByText(COPY.scene.dynamicObjetosEscolhidos(2))
    fireEvent.change(screen.getByLabelText(COPY.scene.organizarObjetos), {
      target: { value: 'distributeX' },
    })
    fireEvent.click(screen.getByRole('button', { name: COPY.scene.organizar }))
    await espera()
    // O desfazer seguinte tira o SEGUNDO ponto: não havia passo vazio na frente.
    fireEvent.click(desfazer())
    await noDisco(async () => expect(objetos(await mapaDoDisco())).toHaveLength(1))
  })
  it('colar põe a cópia onde o ponteiro esteve por último sem encaixe', async () => {
    const { container } = await abrirMapa({ level: 'advanced', prepare: comObjetos })
    await ativarObjetos()
    const svg = palcoDeObjetos(container)
    fireEvent.click(screen.getByRole('button', { name: COPY.tiles.objectPoint }))
    tocar(svg, 8, 8)
    await noDisco(async () => expect(objetos(await mapaDoDisco())).toHaveLength(1))
    fireEvent.click(screen.getByRole('button', { name: COPY.scene.copiar }))
    fireEvent.click(screen.getByRole('button', { name: COPY.tiles.objectSnap }))
    fireEvent.pointerMove(svg, at(72, 40))
    fireEvent.click(screen.getByRole('button', { name: COPY.scene.colar }))
    await noDisco(async () => {
      const list = objetos(await mapaDoDisco())
      expect(list).toHaveLength(2)
      expect([list[1]!.x, list[1]!.y]).toEqual([72, 40])
    })
  })
  it('biblioteca: o desenho nasce no ponteiro, e a camada trancada avisa', async () => {
    const { container } = await abrirMapa({
      level: 'advanced',
      prepare: comObjetos,
      extra: async (seed) => {
        await seed.getState().create({ kind: 'pixel-sprite', name: 'heroi', frameSize: 16 })
      },
    })
    await ativarObjetos()
    const svg = palcoDeObjetos(container)
    fireEvent.pointerMove(svg, at(56, 40))
    fireEvent.click(
      await screen.findByRole('button', { name: COPY.scene.dynamicPorNoMapa('heroi') }),
    )
    await noDisco(async () => {
      const [object] = objetos(await mapaDoDisco())
      // O meio do desenho cai na casa do ponteiro (encaixado na grade).
      expect(object?.art).toBeTruthy()
      expect([object?.x, object?.y]).toEqual([48, 32])
    })
    // Tranca a camada e tenta de novo: aviso, e nenhum objeto a mais.
    fireEvent.click(screen.getByRole('button', { name: /^Trancar camada/ }))
    await screen.findByRole('button', { name: /^Destrancar camada/ })
    fireEvent.click(screen.getByRole('button', { name: COPY.scene.dynamicPorNoMapa('heroi') }))
    expect(await screen.findByText(COPY.layers.lockedWarning)).toBeTruthy()
    await espera()
    expect(objetos(await mapaDoDisco())).toHaveLength(1)
  })
})

describe('formas ponto a ponto', () => {
  it('cada toque põe um ponto; Enter fecha o polígono; Esc cancela', async () => {
    const { container } = await abrirMapa({ level: 'advanced', prepare: comObjetos })
    await ativarObjetos()
    const svg = palcoDeObjetos(container)
    fireEvent.click(screen.getByRole('button', { name: COPY.tiles.objectShapes.polygon }))
    tocar(svg, 16, 16)
    tocar(svg, 64, 16)
    // A prévia segue o ponteiro e nada foi gravado ainda.
    fireEvent.pointerMove(svg, at(48, 48))
    expect(svg.querySelectorAll('[data-draft-point]')).toHaveLength(2)
    expect(desfazer().disabled).toBe(true)
    // Com dois pontos o polígono ainda não fecha.
    fireEvent.keyDown(window, { key: 'Enter' })
    expect(await screen.findByText(COPY.scene.formaPrecisaDePontos(3))).toBeTruthy()
    tocar(svg, 64, 48)
    fireEvent.keyDown(window, { key: 'Enter' })
    await noDisco(async () => {
      const [object] = objetos(await mapaDoDisco())
      expect(object?.shape).toBe('polygon')
      expect([object?.x, object?.y, object?.width, object?.height]).toEqual([16, 16, 48, 32])
      expect(object?.points).toEqual([
        { x: 0, y: 0 },
        { x: 48, y: 0 },
        { x: 48, y: 32 },
      ])
    })
    expect(svg.querySelector('[data-shape-draft]')).toBeNull()
    // Outra forma, cancelada com Esc: nada entra no mapa.
    fireEvent.click(screen.getByRole('button', { name: COPY.tiles.objectShapes.polyline }))
    tocar(svg, 80, 8)
    tocar(svg, 88, 56)
    expect(svg.querySelector('[data-shape-draft="polyline"]')).toBeTruthy()
    fireEvent.keyDown(window, { key: 'Escape' })
    await waitFor(() => expect(svg.querySelector('[data-shape-draft]')).toBeNull())
    expect(objetos(await mapaDoDisco())).toHaveLength(1)
    // Um desfazer tira o polígono inteiro (foi um passo só).
    fireEvent.click(desfazer())
    await waitFor(() => expect(desfazer().disabled).toBe(true))
  })
  it('tocar no primeiro ponto e o toque duplo também fecham', async () => {
    const { container } = await abrirMapa({ level: 'advanced', prepare: comObjetos })
    await ativarObjetos()
    const svg = palcoDeObjetos(container)
    fireEvent.click(screen.getByRole('button', { name: COPY.tiles.objectShapes.polygon }))
    for (const [x, y] of [
      [16, 16],
      [64, 16],
      [64, 48],
      [16, 16],
    ] as const)
      tocar(svg, x, y)
    await noDisco(async () => expect(objetos(await mapaDoDisco())[0]?.points).toHaveLength(3))
    fireEvent.click(screen.getByRole('button', { name: COPY.tiles.objectShapes.polyline }))
    tocar(svg, 80, 8)
    tocar(svg, 88, 56)
    tocar(svg, 88, 56)
    fireEvent.doubleClick(svg)
    await noDisco(async () => {
      const linha = objetos(await mapaDoDisco())[1]
      expect(linha?.shape).toBe('polyline')
      expect(linha?.points).toHaveLength(2)
    })
  })
  const triangulo = (m: TilemapAsset): TilemapAsset => {
    const layered = comObjetos(m)
    return addMapObject(
      layered,
      layered.layers.at(-1)!.id,
      createMapObject({
        name: 'area',
        shape: 'polygon',
        x: 16,
        y: 16,
        width: 48,
        height: 32,
        points: [
          { x: 0, y: 0 },
          { x: 48, y: 0 },
          { x: 48, y: 32 },
        ],
      }),
    )
  }
  it('arrastar um ponto muda a forma com um desfazer; Delete tira o ponto', async () => {
    const { container } = await abrirMapa({ level: 'advanced', prepare: triangulo })
    await ativarObjetos()
    const svg = palcoDeObjetos(container)
    fireEvent.click(screen.getByRole('button', { name: COPY.tiles.pickObject('area') }))
    await waitFor(() => expect(svg.querySelectorAll('[data-vertex]')).toHaveLength(3))
    // O terceiro ponto está em (64, 48) no mapa: leva para (32, 48).
    fireEvent.pointerDown(svg, at(64, 48))
    fireEvent.pointerMove(svg, at(48, 48))
    fireEvent.pointerMove(svg, at(32, 48))
    fireEvent.pointerUp(svg, at(32, 48))
    await noDisco(async () =>
      expect(objetos(await mapaDoDisco())[0]?.points?.[2]).toEqual({ x: 16, y: 32 }),
    )
    expect(svg.querySelector('[data-vertex-selected]')?.getAttribute('data-vertex')).toBe('2')
    // No mínimo de pontos, o Delete avisa e o triângulo fica.
    fireEvent.keyDown(window, { key: 'Delete' })
    expect(await screen.findByText(COPY.scene.formaPrecisaDePontos(3))).toBeTruthy()
    expect(objetos(await mapaDoDisco())).toHaveLength(1)
    // Um desfazer devolve o ponto para onde estava (dois movimentos, um passo).
    fireEvent.click(desfazer())
    await noDisco(async () =>
      expect(objetos(await mapaDoDisco())[0]?.points?.[2]).toEqual({ x: 48, y: 32 }),
    )
    expect(desfazer().disabled).toBe(true)
  })
  it('tocar num trecho põe um ponto novo, e o Delete tira o ponto escolhido', async () => {
    const { container } = await abrirMapa({ level: 'advanced', prepare: triangulo })
    await ativarObjetos()
    const svg = palcoDeObjetos(container)
    fireEvent.click(screen.getByRole('button', { name: COPY.tiles.pickObject('area') }))
    await waitFor(() => expect(svg.querySelectorAll('[data-vertex]')).toHaveLength(3))
    // No meio do lado de cima (de (16,16) a (64,16)).
    fireEvent.pointerDown(svg, at(40, 16))
    fireEvent.pointerUp(svg, at(40, 16))
    await noDisco(async () => expect(objetos(await mapaDoDisco())[0]?.points).toHaveLength(4))
    fireEvent.keyDown(window, { key: 'Delete' })
    await noDisco(async () => expect(objetos(await mapaDoDisco())[0]?.points).toHaveLength(3))
    expect(objetos(await mapaDoDisco())).toHaveLength(1)
  })
  it('objeto girado tem alças: puxar o canto muda o tamanho', async () => {
    const girado = (m: TilemapAsset): TilemapAsset => {
      const layered = comObjetos(m)
      return addMapObject(
        layered,
        layered.layers.at(-1)!.id,
        createMapObject({ name: 'caixa', x: 48, y: 8, width: 32, height: 16, rotation: 90 }),
      )
    }
    const { container } = await abrirMapa({ level: 'advanced', prepare: girado })
    await ativarObjetos()
    const svg = palcoDeObjetos(container)
    fireEvent.click(screen.getByRole('button', { name: COPY.tiles.pickObject('caixa') }))
    await waitFor(() => expect(svg.querySelectorAll('[data-handle]')).toHaveLength(4))
    // Girado 90 graus em volta de (48, 8): o canto "de baixo à direita" está em (32, 40).
    fireEvent.pointerDown(svg, at(32, 40))
    fireEvent.pointerMove(svg, at(32, 56))
    fireEvent.pointerUp(svg, at(32, 56))
    await noDisco(async () => {
      const [object] = objetos(await mapaDoDisco())
      expect([object?.x, object?.y, object?.width, object?.height]).toEqual([48, 8, 48, 16])
    })
  })
})

describe('guardar conjunto', () => {
  it('diz que guardou e o conjunto aparece na galeria', async () => {
    await abrirMapa({
      level: 'advanced',
      prepare: (m) => setCell(m, m.layers[0]!.id, 1, 1, 0),
    })
    const grid = grade()
    fireEvent.click(screen.getByRole('button', { name: COPY.tools.select }))
    fireEvent.pointerDown(grid, { isPrimary: true, pointerId: 1, clientX: 40, clientY: 40 })
    fireEvent.pointerUp(grid, { pointerId: 1, clientX: 40, clientY: 40 })
    fireEvent.click(await screen.findByRole('button', { name: COPY.scene.guardarConjunto }))
    expect(await screen.findByText(COPY.scene.conjuntoGuardado('conjunto-fase'))).toBeTruthy()
    const conferir = createGalleryStore()
    await conferir.getState().load()
    expect(conferir.getState().assets.some((a) => a.kind === 'map-set')).toBe(true)
  })
})

describe('editor de conjunto', () => {
  it('ação que não muda nada não cria desfazer; apagar uma casa cria um', async () => {
    await abrirMapa({
      level: 'advanced',
      open: /Abrir conjunto-fase/,
      extra: async (seed, map) => {
        const painted = setCell(map, map.layers[0]!.id, 0, 0, 0)
        await seed
          .getState()
          .createPrepared(
            createMapSet(painted, { col: 0, row: 0, cols: 2, rows: 2 }, 16, 'conjunto-fase'),
          )
      },
    })
    // Subir a camada que já está em cima: o conjunto continua igual.
    fireEvent.click(screen.getAllByRole('button', { name: /^Subir camada/ })[0]!)
    await espera()
    expect(desfazer().disabled).toBe(true)
    const grid = grade()
    const tocarCanto = (id: number): void => {
      fireEvent.pointerDown(grid, { isPrimary: true, pointerId: id, clientX: 5, clientY: 5 })
      fireEvent.pointerUp(grid, { pointerId: id, clientX: 5, clientY: 5 })
    }
    // A casa do canto já tem a peça 0: pintar a mesma peça ali é um gesto que não muda nada.
    tocarCanto(1)
    await espera()
    expect(desfazer().disabled).toBe(true)
    // Apagar a casa muda o conjunto: um desfazer, e só um.
    fireEvent.click(screen.getByRole('button', { name: COPY.tools.eraser }))
    tocarCanto(2)
    await waitFor(() => expect(desfazer().disabled).toBe(false))
    tocarCanto(3)
    await espera()
    fireEvent.click(desfazer())
    await waitFor(() => expect(desfazer().disabled).toBe(true))
  })
})

describe('minimapa', () => {
  const pecas = createTilesetAsset({ name: 'pecas', tileSize: 16 })
  const mapa = createTilemapAsset({ name: 'fase', tilesetId: pecas.id, cols: 40, rows: 20 })
  it('tocar no minimapa leva o palco para aquele lugar', () => {
    const jumps: Array<[number, number]> = []
    render(
      <div data-pinta-theme="light">
        <MapMinimapPanel map={mapa} tilesets={[pecas]} onJump={(c, r) => jumps.push([c, r])} />
      </div>,
    )
    const button = screen.getByRole('button', { name: COPY.scene.navegarPeloMinimapa })
    fixarCaixa(button, 200, 100)
    fireEvent.click(button, { clientX: 100, clientY: 25 })
    expect(jumps).toEqual([[20, 5]])
    expect(document.body.textContent).toContain(COPY.scene.dimensions(40, 20, 1))
  })
  it('mostra o retângulo da parte que aparece na tela e segue a rolagem', async () => {
    const stage = document.createElement('div')
    const medidas = { scrollLeft: 320, scrollTop: 0, clientWidth: 320, clientHeight: 160 }
    for (const [key, value] of Object.entries(medidas))
      Object.defineProperty(stage, key, { configurable: true, writable: true, value })
    const stageRef = createRef<HTMLElement | null>()
    stageRef.current = stage
    const { container } = render(
      <MapMinimapPanel
        map={mapa}
        tilesets={[pecas]}
        onJump={() => {}}
        stageRef={stageRef}
        cellPx={32}
        pad={0}
      />,
    )
    const rect = (): HTMLElement | null => container.querySelector('[data-pin-minimap-view]')
    await waitFor(() => expect(rect()?.style.left).toBe('25%'))
    expect(rect()?.style.width).toBe('25%')
    expect(rect()?.style.height).toBe('25%')
    ;(stage as unknown as { scrollLeft: number }).scrollLeft = 640
    await act(async () => {
      stage.dispatchEvent(new Event('scroll'))
    })
    expect(rect()?.style.left).toBe('50%')
  })
})

describe('testar com personagem', () => {
  it('abre com o boneco do Pinta, os personagens da galeria e as duas vistas', async () => {
    await abrirMapa({
      extra: async (seed) => {
        await seed.getState().create({ kind: 'pixel-sprite', name: 'heroi', frameSize: 16 })
        await seed
          .getState()
          .create({ kind: 'pixel-background', name: 'ceu', width: 160, height: 120 })
      },
    })
    fireEvent.click(screen.getByRole('button', { name: COPY.scene.testarComPersonagem }))
    expect(await screen.findByText(COPY.scene.testarMeuMapa)).toBeTruthy()
    expect(screen.getByText(COPY.scene.comoAndarNoTeste)).toBeTruthy()
    const picker = screen.getByLabelText(COPY.scene.personagemDoTeste) as HTMLSelectElement
    const names = [...picker.options].map((option) => option.textContent)
    // Só personagens entram na lista (o cenário "ceu" não); o boneco vem primeiro e escolhido.
    expect(names).toEqual([COPY.scene.bonecoDoPinta, 'heroi'])
    expect(picker.value).toBe('')
    const cima = screen.getByRole('button', { name: COPY.scene.vistaDeCima })
    const lado = screen.getByRole('button', { name: COPY.scene.vistaDeLado })
    expect(cima.getAttribute('aria-pressed')).toBe('true')
    fireEvent.click(lado)
    await waitFor(() => expect(lado.getAttribute('aria-pressed')).toBe('true'))
    expect(cima.getAttribute('aria-pressed')).toBe('false')
  })
})

describe('inserção e colagem no espaço da camada', () => {
  const deslocado = (m: TilemapAsset): TilemapAsset => {
    const next = comObjetos(m),
      layer = next.layers.at(-1)!
    return {
      ...next,
      layers: [
        ...next.layers.slice(0, -1),
        {
          id: 'grupo-deslocado',
          kind: 'group',
          name: 'Vila',
          visible: true,
          offsetX: 16,
          offsetY: 8,
        },
        { ...layer, parentId: 'grupo-deslocado', offsetX: 16, offsetY: 8 },
      ],
    }
  }
  for (const snap of [false, true])
    it(`biblioteca desconta offset herdado e respeita encaixe ${snap}`, async () => {
      const { container } = await abrirMapa({
        level: 'create',
        prepare: deslocado,
        extra: async (seed) => {
          await seed.getState().create({ kind: 'pixel-sprite', name: 'arvore', frameSize: 16 })
        },
      })
      await ativarObjetos()
      const svg = palcoDeObjetos(container)
      if (!snap) fireEvent.click(screen.getByRole('button', { name: COPY.tiles.objectSnap }))
      fireEvent.pointerMove(svg, at(59, 43))
      fireEvent.click(
        await screen.findByRole('button', { name: COPY.scene.dynamicPorNoMapa('arvore') }),
      )
      await noDisco(async () => {
        const [object] = objetos(await mapaDoDisco())
        expect([object?.x, object?.y]).toEqual(snap ? [16, 16] : [19, 19])
      })
    })
  for (const snap of [false, true])
    it(`colar desconta offset herdado e respeita encaixe ${snap}`, async () => {
      const { container } = await abrirMapa({ level: 'create', prepare: deslocado })
      await ativarObjetos()
      const svg = palcoDeObjetos(container)
      fireEvent.click(screen.getByRole('button', { name: COPY.tiles.objectPoint }))
      tocar(svg, 40, 24)
      await noDisco(async () => expect(objetos(await mapaDoDisco())).toHaveLength(1))
      fireEvent.click(screen.getByRole('button', { name: COPY.scene.copiar }))
      if (!snap) fireEvent.click(screen.getByRole('button', { name: COPY.tiles.objectSnap }))
      fireEvent.pointerMove(svg, at(75, 43))
      fireEvent.click(screen.getByRole('button', { name: COPY.scene.colar }))
      await noDisco(async () => {
        const list = objetos(await mapaDoDisco())
        expect(list).toHaveLength(2)
        expect([list[1]!.x, list[1]!.y]).toEqual(snap ? [40, 24] : [43, 27])
      })
    })
  it('Começar mostra a biblioteca de desenhos', async () => {
    await abrirMapa({ prepare: comObjetos })
    await ativarObjetos()
    expect(screen.getByText(COPY.scene.desenhosDaBiblioteca)).toBeTruthy()
  })
})

it('biblioteca usa o tamanho inteiro do conjunto para posicioná-lo dentro do mapa', async () => {
  const { container } = await abrirMapa({
    level: 'create',
    prepare: comObjetos,
    extra: async (seed, map) => {
      await seed
        .getState()
        .createPrepared(createMapSet(map, { col: 0, row: 0, cols: 2, rows: 1 }, 16, 'casa-grande'))
    },
  })
  await ativarObjetos()
  const svg = palcoDeObjetos(container)
  fireEvent.pointerMove(svg, at(88, 40))
  fireEvent.click(
    await screen.findByRole('button', { name: COPY.scene.dynamicPorNoMapa('casa-grande') }),
  )
  await noDisco(async () => {
    const [object] = objetos(await mapaDoDisco())
    expect([object?.x, object?.y, object?.width, object?.height]).toEqual([64, 32, 32, 16])
  })
})
