import { beforeEach, describe, expect, it } from 'bun:test'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { strToU8, zipSync } from 'fflate'
import { COPY } from '../core/copy'
import { createPixelBackgroundAsset } from '../core/project'
import { galleryToPintaJson } from '../export/projectJson'
import { clearIdbMock } from '../testing/idbMock'

const { PintaApp } = await import('./PintaApp')
const { setPintaStorageNamespace } = await import('../state/persistence')
const { createGalleryStore } = await import('../state/galleryStore')

beforeEach(() => {
  clearIdbMock()
  setPintaStorageNamespace('')
})

describe('PintaApp — galeria', () => {
  it('aplica o tema no root (default light; host pode fixar dark)', async () => {
    const { container, unmount } = render(<PintaApp />)
    expect(container.querySelector('[data-pinta-theme="light"]')).toBeTruthy()
    await waitFor(() => {
      expect(screen.getByText(COPY.gallery.empty)).toBeTruthy()
    })
    unmount()

    const { container: dark } = render(<PintaApp adapter={{ theme: 'dark' }} />)
    expect(dark.querySelector('[data-pinta-theme="dark"]')).toBeTruthy()
    await waitFor(() => {
      expect(screen.getByText(COPY.gallery.empty)).toBeTruthy()
    })
  })

  it('recusa backup grande antes de ler o texto do arquivo', async () => {
    const { container } = render(<PintaApp />)
    await waitFor(() => {
      expect(screen.getByText(COPY.gallery.empty)).toBeTruthy()
    })
    const input = container.querySelector<HTMLInputElement>('input[accept*=".pinta.json"]')
    if (!input) throw new Error('input de backup esperado')
    const file = new File(['{}'], 'grande.pinta.json', { type: 'application/json' })
    let reads = 0
    Object.defineProperties(file, {
      size: { configurable: true, value: 33 * 1024 * 1024 },
      text: {
        configurable: true,
        value: async () => {
          reads += 1
          return '{}'
        },
      },
    })

    fireEvent.change(input, { target: { files: [file] } })
    await waitFor(() => {
      expect(screen.getByText(COPY.gallery.restoreTooLarge)).toBeTruthy()
    })
    expect(reads).toBe(0)
  })

  it('expõe o estado ocupado enquanto traz o arquivo de volta', async () => {
    const { container } = render(<PintaApp />)
    await waitFor(() => {
      expect(screen.getByText(COPY.gallery.empty)).toBeTruthy()
    })
    const input = container.querySelector<HTMLInputElement>('input[accept*=".pinta.json"]')
    if (!input) throw new Error('input de backup esperado')
    const json = galleryToPintaJson([
      createPixelBackgroundAsset({ name: 'ceu-lento', width: 16, height: 12 }),
    ])
    let finishRead: ((value: string) => void) | null = null
    const file = new File([json], 'ceu.pinta.json', { type: 'application/json' })
    Object.defineProperty(file, 'text', {
      configurable: true,
      value: () =>
        new Promise<string>((resolve) => {
          finishRead = resolve
        }),
    })

    fireEvent.change(input, { target: { files: [file] } })
    const busy = await screen.findByRole('button', { name: COPY.gallery.restoring })
    expect(busy.getAttribute('aria-busy')).toBe('true')
    expect((busy as HTMLButtonElement).disabled).toBe(true)

    await act(async () => finishRead?.(json))
    await waitFor(() => {
      expect(screen.getByRole('button', { name: COPY.gallery.restore })).toBeTruthy()
    })
  })

  it('traz a galeria diretamente do ZIP criado pelo Pinta', async () => {
    const { container } = render(<PintaApp />)
    await waitFor(() => {
      expect(screen.getByText(COPY.gallery.empty)).toBeTruthy()
    })
    const input = container.querySelector<HTMLInputElement>('input[accept*=".zip"]')
    if (!input) throw new Error('input inteligente de backup esperado')
    const json = galleryToPintaJson([
      createPixelBackgroundAsset({ name: 'ceu-restaurado', width: 16, height: 12 }),
    ])
    const zip = zipSync({ 'galeria.pinta.json': strToU8(json), 'LEIA-ME.txt': strToU8('olá') })
    const file = new File([zip.slice().buffer as ArrayBuffer], 'meus-desenhos-pinta.zip', {
      type: 'application/zip',
    })

    fireEvent.change(input, { target: { files: [file] } })

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Abrir ceu-restaurado/ })).toBeTruthy()
    })
    expect(screen.getByText(COPY.gallery.restoredOne)).toBeTruthy()
  })

  it('explica quando a foto passa do limite de 20 MB', async () => {
    const { container } = render(<PintaApp />)
    await waitFor(() => {
      expect(screen.getByText(COPY.gallery.empty)).toBeTruthy()
    })
    const input = container.querySelector<HTMLInputElement>(
      'input[accept="image/png,image/jpeg,image/webp"]',
    )
    if (!input) throw new Error('input de foto esperado')
    const file = new File(['x'], 'grande.png', { type: 'image/png' })
    Object.defineProperty(file, 'size', { configurable: true, value: 21 * 1024 * 1024 })

    fireEvent.change(input, { target: { files: [file] } })
    await waitFor(() => {
      expect(screen.getByText(COPY.gallery.importTooLarge)).toBeTruthy()
    })
  })

  it('cria um personagem (estilo → tipo → tamanho → nome) e abre o editor; voltar mostra o card', async () => {
    render(<PintaApp />)
    await waitFor(() => {
      expect(screen.getByText(COPY.gallery.empty)).toBeTruthy()
    })

    // Passo 1: ESTILO (pixel art | vetor).
    fireEvent.click(screen.getByRole('button', { name: new RegExp(COPY.gallery.create) }))
    expect(screen.getByText(COPY.newAsset.styleTitle)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: new RegExp(COPY.styles.pixel.title) }))

    // Passo 2: tipo.
    expect(screen.getByText(COPY.newAsset.title)).toBeTruthy()
    fireEvent.click(
      screen.getByRole('button', { name: new RegExp(COPY.kinds['pixel-sprite'].title) }),
    )

    // Passo 3: tamanho (o primeiro já vem selecionado).
    expect(screen.getByText(COPY.newAsset.sizeTitle)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: COPY.newAsset.next }))

    // Passo 4: nome.
    const input = screen.getByPlaceholderText(COPY.newAsset.namePlaceholder)
    fireEvent.change(input, { target: { value: 'Meu Herói' } })
    fireEvent.click(screen.getByRole('button', { name: COPY.newAsset.createButton }))

    // Editor aberto com o nome normalizado + ferramentas.
    await waitFor(() => {
      expect(screen.getByText('meu-heroi')).toBeTruthy()
    })
    expect(screen.getByRole('toolbar', { name: 'Ferramentas' })).toBeTruthy()
    expect(screen.getByText(COPY.editor.saved).getAttribute('role')).toBe('status')

    // Voltar → galeria com o card.
    fireEvent.click(screen.getByRole('button', { name: COPY.editor.back }))
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Abrir meu-heroi/ })).toBeTruthy()
    })
  })

  it('cria um cenário com tamanho PERSONALIZADO (card não avança; faixa valida; 300×200 nasce)', async () => {
    render(<PintaApp />)
    await waitFor(() => {
      expect(screen.getByText(COPY.gallery.empty)).toBeTruthy()
    })

    fireEvent.click(screen.getByRole('button', { name: new RegExp(COPY.gallery.create) }))
    fireEvent.click(screen.getByRole('button', { name: new RegExp(COPY.styles.pixel.title) }))
    fireEvent.click(
      screen.getByRole('button', { name: new RegExp(COPY.kinds['pixel-background'].title) }),
    )

    // Selecionar "Personalizado" NÃO avança (os presets avançam ao toque): o
    // formulário aparece no MESMO passo, semeado do preset selecionado.
    fireEvent.click(screen.getByRole('button', { name: new RegExp(COPY.newAsset.customSize.card) }))
    expect(screen.getByText(COPY.newAsset.sizeTitle)).toBeTruthy()
    const width = screen.getByLabelText(COPY.newAsset.customSize.width) as HTMLInputElement
    const height = screen.getByLabelText(COPY.newAsset.customSize.height) as HTMLInputElement
    expect(width.value).toBe('160')
    expect(height.value).toBe('120')

    // Fora da faixa → erro anunciado + Avançar travado.
    fireEvent.change(width, { target: { value: '9999' } })
    expect(
      screen.getByText(
        COPY.newAsset.customSize.rangeError(COPY.newAsset.customSize.width, 16, 512),
      ),
    ).toBeTruthy()
    const next = screen.getByRole('button', { name: COPY.newAsset.next }) as HTMLButtonElement
    expect(next.disabled).toBe(true)

    // Corrigir libera o Avançar; nome; criar.
    fireEvent.change(width, { target: { value: '300' } })
    fireEvent.change(height, { target: { value: '200' } })
    expect(next.disabled).toBe(false)
    fireEvent.click(next)
    const input = screen.getByPlaceholderText(COPY.newAsset.namePlaceholder)
    fireEvent.change(input, { target: { value: 'campo-grande' } })
    fireEvent.click(screen.getByRole('button', { name: COPY.newAsset.createButton }))
    await waitFor(() => {
      expect(screen.getByText('campo-grande')).toBeTruthy()
    })

    // O asset persistido tem as dimensões digitadas.
    const check = createGalleryStore()
    await check.getState().load()
    const asset = check.getState().assets.find((a) => a.name === 'campo-grande')
    expect(asset?.kind).toBe('pixel-background')
    if (asset?.kind === 'pixel-background') {
      expect(asset.cels[0]?.width).toBe(300)
      expect(asset.cels[0]?.height).toBe(200)
    }
  })

  it('personagem com quadro PERSONALIZADO nasce DEITADO (largura ≠ altura)', async () => {
    render(<PintaApp />)
    await waitFor(() => {
      expect(screen.getByText(COPY.gallery.empty)).toBeTruthy()
    })

    fireEvent.click(screen.getByRole('button', { name: new RegExp(COPY.gallery.create) }))
    fireEvent.click(screen.getByRole('button', { name: new RegExp(COPY.styles.pixel.title) }))
    fireEvent.click(
      screen.getByRole('button', { name: new RegExp(COPY.kinds['pixel-sprite'].title) }),
    )
    fireEvent.click(screen.getByRole('button', { name: new RegExp(COPY.newAsset.customSize.card) }))
    // Semeado da 1ª opção (o card de tipo pré-seleciona choices[0] = 16; o 32
    // do preferredSizeKeyFor é só do caminho da missão do Pensa).
    // ⭐ Personagem deixou de ser QUADRADO. O preset semeia os DOIS campos com o
    // mesmo número; aqui a criança faz uma NAVE: 128 de largura por 32 de altura.
    const largura = screen.getByLabelText(COPY.newAsset.customSize.width) as HTMLInputElement
    const altura = screen.getByLabelText(COPY.newAsset.customSize.height) as HTMLInputElement
    expect(largura.value).toBe('16')
    expect(altura.value).toBe('16')
    fireEvent.change(largura, { target: { value: '128' } })
    fireEvent.change(altura, { target: { value: '32' } })
    fireEvent.click(screen.getByRole('button', { name: COPY.newAsset.next }))
    fireEvent.change(screen.getByPlaceholderText(COPY.newAsset.namePlaceholder), {
      target: { value: 'gigante' },
    })
    fireEvent.click(screen.getByRole('button', { name: COPY.newAsset.createButton }))
    await waitFor(() => {
      expect(screen.getByText('gigante')).toBeTruthy()
    })

    const check = createGalleryStore()
    await check.getState().load()
    const asset = check.getState().assets.find((a) => a.name === 'gigante')
    expect(asset?.kind).toBe('pixel-sprite')
    if (asset?.kind === 'pixel-sprite') {
      expect(asset.frameWidth).toBe(128)
      expect(asset.frameHeight).toBe(32)
    }
  })

  it('cria a partir de um MODELO PRONTO (estilo → modelos → escolher → nome) e abre o editor', async () => {
    render(<PintaApp />)
    await waitFor(() => {
      expect(screen.getByText(COPY.gallery.empty)).toBeTruthy()
    })

    fireEvent.click(screen.getByRole('button', { name: new RegExp(COPY.gallery.create) }))
    // 3º cartão do passo de estilo: Modelos prontos.
    fireEvent.click(
      screen.getByRole('button', { name: new RegExp(COPY.templates.styleCard.title) }),
    )
    // Passo de modelos: os títulos aparecem.
    expect(screen.getByText(COPY.templates.stepTitle)).toBeTruthy()
    expect(screen.getByText(COPY.templates.items.heroi.title)).toBeTruthy()
    fireEvent.click(
      screen.getByRole('button', { name: new RegExp(COPY.templates.items.heroi.title) }),
    )

    // Nome já pré-preenchido; criar.
    fireEvent.click(screen.getByRole('button', { name: COPY.newAsset.createButton }))
    await waitFor(() => {
      expect(screen.getByText('heroi')).toBeTruthy()
    })
    expect(screen.getByRole('toolbar', { name: 'Ferramentas' })).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: COPY.editor.back }))
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Abrir heroi/ })).toBeTruthy()
    })
  })

  it('missão de MAPA do Pensa sem tileset trava o Avançar com aviso; com tileset, pré-seleciona', async () => {
    // O intent com artKind pula o card de tipo (que era quem guardava o portão
    // do mapa): sem nenhum tileset o Avançar precisa travar COM explicação.
    const intent = { projectRef: { id: 'jogo-1', name: 'meu-jogo' }, artKind: 'tilemap' as const }
    const { unmount } = render(<PintaApp adapter={{ initialIntent: intent }} />)
    await waitFor(() => {
      expect(screen.getByText(COPY.newAsset.styleTitle)).toBeTruthy()
    })
    fireEvent.click(screen.getByRole('button', { name: new RegExp(COPY.styles.pixel.title) }))
    expect(screen.getByText(COPY.newAsset.sizeTitle)).toBeTruthy()
    expect(screen.getByText(COPY.newAsset.needTileset)).toBeTruthy()
    const next = screen.getByRole('button', { name: COPY.newAsset.next }) as HTMLButtonElement
    expect(next.disabled).toBe(true)
    unmount()

    // Com um tileset na galeria: pré-selecionado (espelho do card de tipo) e
    // o Avançar liberado.
    const seed = createGalleryStore()
    await seed.getState().create({ kind: 'tileset', name: 'pecas', tileSize: 16 })
    render(<PintaApp adapter={{ initialIntent: intent }} />)
    // Espera a GALERIA carregar (o card aparece por baixo do modal): a
    // pré-seleção lê a lista no clique do estilo — clicar antes do load
    // deixaria sem seleção (o portão do Avançar segura mesmo assim).
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Abrir pecas/ })).toBeTruthy()
    })
    fireEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', {
        name: new RegExp(COPY.styles.pixel.title),
      }),
    )
    // `pressed: true` desambigua do card "Abrir pecas" da galeria atrás do
    // modal E já assere a pré-seleção.
    expect(screen.getByRole('button', { name: /pecas/, pressed: true })).toBeTruthy()
    const next2 = screen.getByRole('button', { name: COPY.newAsset.next }) as HTMLButtonElement
    expect(next2.disabled).toBe(false)
  })

  it('mapa fica desabilitado sem peças do cenário (nos dois estilos)', async () => {
    render(<PintaApp />)
    await waitFor(() => {
      expect(screen.getByText(COPY.gallery.empty)).toBeTruthy()
    })
    fireEvent.click(screen.getByRole('button', { name: new RegExp(COPY.gallery.create) }))
    fireEvent.click(screen.getByRole('button', { name: new RegExp(COPY.styles.vector.title) }))
    const tilemapCard = screen.getByRole('button', {
      name: new RegExp(COPY.kinds.tilemap.title),
    }) as HTMLButtonElement
    expect(tilemapCard.disabled).toBe(true)
    expect(screen.getByText(COPY.newAsset.needTileset)).toBeTruthy()
  })

  it('apagar pede confirmação e remove o card', async () => {
    // Semeia um asset direto no "disco" antes de montar.
    const seed = createGalleryStore()
    await seed.getState().create({ kind: 'pixel-sprite', name: 'apagavel', frameSize: 8 })

    render(<PintaApp />)
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Abrir apagavel/ })).toBeTruthy()
    })

    fireEvent.click(screen.getByRole('button', { name: `${COPY.gallery.remove} apagavel` }))
    expect(screen.getByText(COPY.gallery.removeConfirmTitle)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: COPY.gallery.removeConfirm }))
    // O update vem de store zustand FORA de act — flush explícito (waitFor pena
    // com o scheduler do React no happy-dom nesse caminho).
    await act(async () => {
      await Bun.sleep(0)
    })
    expect(screen.queryByRole('button', { name: /Abrir apagavel/ })).toBeNull()
  })

  it('não oferece apagar peças usadas e mostra os mapas dependentes', async () => {
    const seed = createGalleryStore()
    const tileset = await seed
      .getState()
      .create({ kind: 'tileset', name: 'pecas-usadas', tileSize: 16 })
    if (!tileset) throw new Error('tileset esperado')
    await seed.getState().create({
      kind: 'tilemap',
      name: 'fase-dependente',
      tilesetId: tileset.id,
      cols: 2,
      rows: 2,
    })

    render(<PintaApp />)
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Abrir pecas-usadas/ })).toBeTruthy()
    })
    fireEvent.click(screen.getByRole('button', { name: `${COPY.gallery.remove} pecas-usadas` }))
    expect(screen.getByText(COPY.gallery.removeTilesetTitle)).toBeTruthy()
    expect(screen.getAllByText('fase-dependente')).toHaveLength(2)
    expect(screen.queryByRole('button', { name: COPY.gallery.removeConfirm })).toBeNull()
  })

  it('botão "Usar no Estúdio" exige o callback do host E desenho de um jogo do Pensa', async () => {
    // Desenho AVULSO e desenho vinculado a um jogo do Pensa (projectRef): o
    // foguete só existe no segundo — avulso chega ao Estúdio pelo "Trazer do
    // Pinta" de lá (decisão da dona, 08/2026).
    const seed = createGalleryStore()
    await seed.getState().create({ kind: 'pixel-background', name: 'ceu', width: 8, height: 8 })
    await seed.getState().create({
      kind: 'pixel-background',
      name: 'ceu-do-jogo',
      width: 8,
      height: 8,
      projectRef: { id: 'jogo-1', name: 'meu-jogo' },
    })

    // Sem callback: nada, nem no desenho do jogo.
    const { unmount } = render(<PintaApp />)
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Abrir ceu-do-jogo/ })).toBeTruthy()
    })
    fireEvent.click(screen.getByRole('button', { name: /Abrir ceu-do-jogo/ }))
    await waitFor(() => {
      expect(screen.getByText('ceu-do-jogo')).toBeTruthy()
    })
    expect(screen.queryByText(new RegExp(COPY.editor.sendToStudio))).toBeNull()
    unmount()

    // Com callback, desenho AVULSO: o foguete continua fora. (O "(" do nome
    // acessível separa "ceu (" de "ceu-do-jogo (".)
    const { unmount: unmountAvulso } = render(
      <PintaApp adapter={{ sendToStudio: async () => ({ ok: true }) }} />,
    )
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Abrir ceu \(/ })).toBeTruthy()
    })
    fireEvent.click(screen.getByRole('button', { name: /Abrir ceu \(/ }))
    await waitFor(() => {
      expect(screen.getByText('ceu')).toBeTruthy()
    })
    expect(screen.queryByText(new RegExp(COPY.editor.sendToStudio))).toBeNull()
    unmountAvulso()

    // Com callback, desenho DE JOGO: aparece.
    render(<PintaApp adapter={{ sendToStudio: async () => ({ ok: true }) }} />)
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Abrir ceu-do-jogo/ })).toBeTruthy()
    })
    fireEvent.click(screen.getByRole('button', { name: /Abrir ceu-do-jogo/ }))
    await waitFor(() => {
      expect(screen.getByText(new RegExp(COPY.editor.sendToStudio))).toBeTruthy()
    })
  })

  it('`initialAssetId` de um desenho que NÃO existe, com persistência SEM `subscribe` (aula/perfil): diz "sumiu" na hora, como antes', async () => {
    const { createMemoryPersistence } = await import('../state/memoryPersistence')
    render(
      <PintaApp
        adapter={{ initialAssetId: 'nao-existe' }}
        persistence={createMemoryPersistence()}
      />,
    )
    await waitFor(() => {
      expect(screen.getByText(COPY.gallery.drawingGone)).toBeTruthy()
    })
    expect(screen.queryByText(COPY.gallery.syncing)).toBeNull()
  })

  it('`initialAssetId` de um desenho que só CHEGA com a sincronia da nuvem: espera o fim da sincronia e abre (em vez de dizer "sumiu")', async () => {
    const { createMemoryPersistence } = await import('../state/memoryPersistence')
    const { createPixelSpriteAsset } = await import('../core/project')
    const inner = createMemoryPersistence()
    const listeners = new Set<(event: { type: 'sync-start' | 'changed' | 'sync-end' }) => void>()
    const emit = (type: 'sync-start' | 'changed' | 'sync-end') => {
      for (const listener of listeners) listener({ type })
    }
    let started = false
    const persistence = {
      ...inner,
      // Como o wrapper da nuvem do host: a PRIMEIRA carga devolve o LOCAL na hora e já avisa
      // que a sincronia começou (antes de a galeria marcar `loaded`); as releituras seguintes
      // (o `sync-end` relê) NÃO abrem outra sincronia.
      async listAllAssets() {
        if (!started) {
          started = true
          emit('sync-start')
        }
        return inner.listAllAssets()
      },
      subscribe(listener: (event: { type: 'sync-start' | 'changed' | 'sync-end' }) => void) {
        listeners.add(listener)
        return () => {
          listeners.delete(listener)
        }
      },
    }
    const chegando = createPixelSpriteAsset({ name: 'chegando', frameSize: 8 })
    render(<PintaApp adapter={{ initialAssetId: chegando.id }} persistence={persistence} />)
    await waitFor(() => {
      expect(screen.getByText(COPY.gallery.syncing)).toBeTruthy()
    })
    // O desenho chega pela sincronia; o fim dela relê a galeria e o abridor abre.
    await inner.persistAssets([chegando])
    act(() => emit('sync-end'))
    // Abriu o editor do desenho que chegou (não o toast de "sumiu").
    await waitFor(() => {
      expect(screen.getByRole('img', { name: COPY.a11y.drawArea })).toBeTruthy()
    })
    expect(screen.queryByText(COPY.gallery.drawingGone)).toBeNull()
  })
})
