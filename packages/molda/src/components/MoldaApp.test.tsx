import { beforeEach, describe, expect, test } from 'bun:test'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { StrictMode } from 'react'
import { COPY } from '../core/copy'
import { GALLERY_SHELL_COPY } from '../core/galleryShellCopy'
import type { MoldaAsset } from '../core/model'
import { galleryToJsonText } from '../export/projectJson'
import { zipGallery } from '../export/zip'
import { createMemoryPersistence } from '../state/memoryPersistence'
import { isMoldaAssetOpen, resetMoldaPersistenceForTests } from '../state/persistence'
import { installFakeViewport } from '../testing/fakeViewport'
import { makeModel, makeSky, makeTexture } from '../testing/fixtures'
import { MoldaApp } from './MoldaApp'

beforeEach(() => {
  resetMoldaPersistenceForTests()
})

async function settle(): Promise<void> {
  await act(async () => {
    await Bun.sleep(0)
  })
}

function presetOf(asset: MoldaAsset | undefined): string | null {
  return asset?.kind === 'sky' ? asset.params.preset : null
}

/** O nome acessível do cartão que abre a grade: título + dica. */
const NEW_CARD_NAME = `${GALLERY_SHELL_COPY.newCardTitle} ${GALLERY_SHELL_COPY.newCardHint}`

/**
 * As CRIAÇÕES da grade. O primeiro item é o cartão "Nova criação" (11/09/2026, as telas-modelo)
 * e fica fora da conta de propósito: ele não é uma criação.
 */
function creations(grid: HTMLElement): HTMLElement[] {
  return within(grid)
    .queryAllByRole('listitem')
    .filter((item) => !item.hasAttribute('data-mld-new-card'))
}

describe('MoldaApp', () => {
  test('galeria vazia mostra o convite e o tema no root', async () => {
    const { container } = render(
      <MoldaApp persistence={createMemoryPersistence()} adapter={{ theme: 'dark' }} />,
    )
    await settle()
    expect(container.querySelector('[data-molda-theme="dark"]')).not.toBeNull()
    expect(await screen.findByText(COPY.gallery.empty)).toBeDefined()
    // O convite da galeria vazia é o cartão "Nova criação" sozinho na grade (o botão grande do
    // meio da tela saiu), e ele abre o "Criar novo".
    fireEvent.click(screen.getByRole('button', { name: NEW_CARD_NAME }))
    expect(await screen.findByRole('dialog')).toBeDefined()
  })

  test('lista as criações com selo do tipo, busca e filtro', async () => {
    const persistence = createMemoryPersistence([makeModel(), makeTexture(), makeSky()])
    render(<MoldaApp persistence={persistence} />)
    const grid = await screen.findByRole('list', { name: COPY.a11y.galleryGrid })
    await waitFor(() => expect(creations(grid)).toHaveLength(3))
    expect(screen.getByRole('status').textContent).toContain('3 criações')

    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'céu' } })
    await waitFor(() => expect(creations(grid)).toHaveLength(1))
    expect(screen.getByRole('status').textContent).toContain('1 de 3')

    fireEvent.click(screen.getByRole('button', { name: COPY.gallery.searchClear }))
    fireEvent.click(screen.getByRole('button', { name: COPY.gallery.filterAria.texture }))
    await waitFor(() => expect(creations(grid)).toHaveLength(1))
    expect(within(grid).getByText('grama')).toBeDefined()

    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'zzz' } })
    expect(await screen.findByText(COPY.gallery.searchEmpty)).toBeDefined()
    fireEvent.click(screen.getByRole('button', { name: COPY.gallery.searchClearAll }))
    // O estado vazio desmonta a grade: a referência antiga ficou solta, buscar de novo.
    await waitFor(() =>
      expect(creations(screen.getByRole('list', { name: COPY.a11y.galleryGrid }))).toHaveLength(3),
    )
  })

  test('limita a primeira página da galeria e permite revelar o restante', async () => {
    const assets = Array.from({ length: 61 }, (_unused, index) =>
      makeSky({ id: `sky-${index}`, name: `ceu-${index}`, updatedAt: index + 1 }),
    )
    render(<MoldaApp persistence={createMemoryPersistence(assets)} />)

    const grid = await screen.findByRole('list', { name: COPY.a11y.galleryGrid })
    await waitFor(() => expect(creations(grid)).toHaveLength(60))

    fireEvent.click(screen.getByRole('button', { name: COPY.gallery.loadMore }))

    await waitFor(() => expect(creations(grid)).toHaveLength(61))
    expect(screen.queryByRole('button', { name: COPY.gallery.loadMore })).toBeNull()
  })

  test('Criar novo: tipo → opções → nome → abre o editor e grava', async () => {
    const persistence = createMemoryPersistence()
    render(<MoldaApp persistence={persistence} />)
    await settle()
    fireEvent.click(screen.getByRole('button', { name: COPY.gallery.create }))
    const dialog = await screen.findByRole('dialog')
    fireEvent.click(within(dialog).getByRole('button', { name: COPY.a11y.newAssetKind('Céu') }))
    expect(within(dialog).getByText(COPY.newAsset.stepOptions)).toBeDefined()
    fireEvent.click(within(dialog).getByRole('button', { name: /Noite/ }))
    fireEvent.click(within(dialog).getByRole('button', { name: COPY.newAsset.next }))
    const input = within(dialog).getByRole('textbox')
    fireEvent.change(input, { target: { value: 'Meu Céu' } })
    fireEvent.click(within(dialog).getByRole('button', { name: COPY.newAsset.create }))

    await waitFor(() =>
      expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('meu-ceu'),
    )
    expect(
      screen.getByRole('button', { name: COPY.skyPresets.noite }).getAttribute('aria-pressed'),
    ).toBe('true')
    await waitFor(() => expect(persistence.snapshot()).toHaveLength(1))
    expect(presetOf(persistence.snapshot()[0])).toBe('noite')
  })

  test('nome inválido ou repetido não cria', async () => {
    render(<MoldaApp persistence={createMemoryPersistence([makeSky()])} />)
    await screen.findByRole('list', { name: COPY.a11y.galleryGrid })
    fireEvent.click(screen.getByRole('button', { name: COPY.gallery.create }))
    const dialog = await screen.findByRole('dialog')
    fireEvent.click(within(dialog).getByRole('button', { name: COPY.a11y.newAssetKind('Modelo') }))
    fireEvent.click(within(dialog).getByRole('button', { name: COPY.newAsset.next }))
    const input = within(dialog).getByRole('textbox')
    fireEvent.change(input, { target: { value: 'fim de tarde' } })
    expect(await within(dialog).findByRole('alert')).toBeDefined()
    expect(
      (within(dialog).getByRole('button', { name: COPY.newAsset.create }) as HTMLButtonElement)
        .disabled,
    ).toBe(true)
    fireEvent.change(input, { target: { value: '!!!' } })
    expect(
      (within(dialog).getByRole('button', { name: COPY.newAsset.create }) as HTMLButtonElement)
        .disabled,
    ).toBe(true)
  })

  test('editor do céu: trocar o preset salva, desfaz e refaz; Voltar volta à galeria', async () => {
    const persistence = createMemoryPersistence([makeSky()])
    render(<MoldaApp persistence={persistence} adapter={{ initialAssetId: 'sky-1' }} />)
    await waitFor(() =>
      expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('fim-de-tarde'),
    )
    const undo = screen.getByRole('button', { name: COPY.editor.undo }) as HTMLButtonElement
    expect(undo.disabled).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: COPY.skyPresets.nublado }))
    expect(undo.disabled).toBe(false)
    await waitFor(() => expect(presetOf(persistence.snapshot()[0])).toBe('nublado'))
    fireEvent.click(undo)
    expect(
      screen.getByRole('button', { name: COPY.skyPresets.entardecer }).getAttribute('aria-pressed'),
    ).toBe('true')
    fireEvent.click(screen.getByRole('button', { name: COPY.editor.redo }))
    expect(
      screen.getByRole('button', { name: COPY.skyPresets.nublado }).getAttribute('aria-pressed'),
    ).toBe('true')

    fireEvent.click(screen.getByRole('button', { name: COPY.editor.backToGallery }))
    expect(await screen.findByRole('heading', { level: 1, name: COPY.gallery.title })).toBeDefined()
    await waitFor(() => expect(presetOf(persistence.snapshot()[0])).toBe('nublado'))
  })

  test('Voltar antes do autosave aguarda o salvamento e reenvia a versão nova ao Estúdio', async () => {
    const persistence = createMemoryPersistence([makeSky()])
    const synced: string[] = []
    render(
      <MoldaApp
        persistence={persistence}
        adapter={{
          initialAssetId: 'sky-1',
          resyncToStudio: async (asset) => {
            synced.push(asset.dataUrl)
            return { updated: true }
          },
        }}
      />,
    )
    await screen.findByRole('heading', { level: 1, name: 'fim-de-tarde' })

    fireEvent.click(screen.getByRole('button', { name: COPY.skyPresets.nublado }))
    fireEvent.click(screen.getByRole('button', { name: COPY.editor.backToGallery }))

    await screen.findByRole('heading', { level: 1, name: COPY.gallery.title })
    expect(presetOf(persistence.snapshot()[0])).toBe('nublado')
    expect(synced).toHaveLength(1)
  })

  test('sob StrictMode (montagem dupla) o salvamento automático segue vivo e a criação fica aberta', async () => {
    const persistence = createMemoryPersistence([makeSky()])
    render(<MoldaApp persistence={persistence} adapter={{ initialAssetId: 'sky-1' }} />, {
      wrapper: StrictMode,
    })
    await waitFor(() =>
      expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('fim-de-tarde'),
    )
    await waitFor(() => expect(isMoldaAssetOpen('sky-1')).toBe(true))
    fireEvent.click(screen.getByRole('button', { name: COPY.skyPresets.noite }))
    await waitFor(() => expect(presetOf(persistence.snapshot()[0])).toBe('noite'), {
      timeout: 3000,
    })
    expect(screen.getByRole('status').textContent).toBe(COPY.editor.saved)
    fireEvent.click(screen.getByRole('button', { name: COPY.editor.backToGallery }))
    await screen.findByRole('heading', { level: 1, name: COPY.gallery.title })
    await waitFor(() => expect(isMoldaAssetOpen('sky-1')).toBe(false))
  })

  test('Voltar rechecks edits made during asynchronous Studio delivery before leaving', async () => {
    const memory = createMemoryPersistence([makeSky()])
    let savingAllowed = true
    const persistence = {
      ...memory,
      save: async (asset: MoldaAsset) => {
        if (!savingAllowed) throw new Error('storage unavailable')
        await memory.save(asset)
      },
    }
    let release = (): void => {
      throw new Error('Delivery gate not initialized')
    }
    const gate = new Promise<void>((resolve) => {
      release = resolve
    })
    let deliveries = 0
    render(
      <MoldaApp
        persistence={persistence}
        adapter={{
          initialAssetId: 'sky-1',
          resyncToStudio: async () => {
            deliveries += 1
            await gate
            return { updated: true }
          },
        }}
      />,
    )
    await screen.findByRole('button', { name: COPY.skyPresets.nublado })
    fireEvent.click(screen.getByRole('button', { name: COPY.skyPresets.nublado }))
    fireEvent.click(screen.getByRole('button', { name: COPY.editor.backToGallery }))
    await waitFor(() => expect(deliveries).toBe(1))
    savingAllowed = false
    fireEvent.click(screen.getByRole('button', { name: COPY.skyPresets.noite }))
    await act(async () => {
      release()
      await gate
    })
    await screen.findAllByText(COPY.editor.saveError)
    expect(screen.queryByRole('heading', { level: 1, name: COPY.gallery.title })).toBeNull()
    expect(
      screen.getByRole('button', { name: COPY.skyPresets.noite }).getAttribute('aria-pressed'),
    ).toBe('true')
    savingAllowed = true
    fireEvent.click(screen.getByRole('button', { name: COPY.editor.backToGallery }))
    await screen.findByRole('heading', { level: 1, name: COPY.gallery.title })
    expect(presetOf(memory.snapshot()[0])).toBe('noite')
    expect(deliveries).toBe(2)
  })

  test('atalho Ctrl+Z desfaz no editor (e não com um modal aberto)', async () => {
    const persistence = createMemoryPersistence([makeSky()])
    render(<MoldaApp persistence={persistence} adapter={{ initialAssetId: 'sky-1' }} />)
    await waitFor(() =>
      expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('fim-de-tarde'),
    )
    fireEvent.click(screen.getByRole('button', { name: COPY.skyPresets.noite }))
    // Âncora antes do atalho: sem provar que o clique entrou, um "entardecer
    // ainda ligado" passaria como se o desfazer já tivesse acontecido.
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: COPY.skyPresets.noite }).getAttribute('aria-pressed'),
      ).toBe('true'),
    )
    fireEvent.keyDown(document, { key: 'z', ctrlKey: true })
    await waitFor(() =>
      expect(
        screen
          .getByRole('button', { name: COPY.skyPresets.entardecer })
          .getAttribute('aria-pressed'),
      ).toBe('true'),
    )
    fireEvent.keyDown(document, { key: 'z', ctrlKey: true, shiftKey: true })
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: COPY.skyPresets.noite }).getAttribute('aria-pressed'),
      ).toBe('true'),
    )
  })

  test('renomear e apagar pela galeria', async () => {
    const persistence = createMemoryPersistence([makeSky(), makeTexture()])
    render(<MoldaApp persistence={persistence} />)
    const grid = await screen.findByRole('list', { name: COPY.a11y.galleryGrid })
    await waitFor(() => expect(creations(grid)).toHaveLength(2))

    fireEvent.click(screen.getByRole('button', { name: `${COPY.gallery.rename} grama` }))
    const rename = await screen.findByRole('dialog')
    fireEvent.change(within(rename).getByRole('textbox'), { target: { value: 'Terra' } })
    fireEvent.click(within(rename).getByRole('button', { name: COPY.rename.save }))
    await waitFor(() => expect(within(grid).getByText('terra')).toBeDefined())
    expect(persistence.snapshot().some((a) => a.name === 'terra')).toBe(true)

    fireEvent.click(screen.getByRole('button', { name: `${COPY.gallery.remove} terra` }))
    const confirm = await screen.findByRole('dialog')
    fireEvent.click(within(confirm).getByRole('button', { name: COPY.gallery.removeConfirm }))
    await waitFor(() => expect(creations(grid)).toHaveLength(1))
    expect(persistence.snapshot()).toHaveLength(1)
  })

  test('mantém os diálogos abertos e explica quando renomear ou apagar não pode ser salvo', async () => {
    const persistence = createMemoryPersistence([makeSky(), makeTexture()])
    render(<MoldaApp persistence={persistence} />)
    await screen.findByRole('list', { name: COPY.a11y.galleryGrid })

    persistence.saveIfUnchanged = async () => {
      throw new Error('disco indisponível')
    }
    fireEvent.click(screen.getByRole('button', { name: `${COPY.gallery.rename} grama` }))
    const rename = await screen.findByRole('dialog')
    fireEvent.change(within(rename).getByRole('textbox'), { target: { value: 'Terra' } })
    fireEvent.click(within(rename).getByRole('button', { name: COPY.rename.save }))
    expect((await within(rename).findByRole('alert')).textContent).toContain(COPY.toast.saveFailed)
    expect(persistence.snapshot().find((asset) => asset.id === 'texture-1')?.name).toBe('grama')
    fireEvent.click(within(rename).getByRole('button', { name: COPY.gallery.cancel }))

    persistence.remove = async () => {
      throw new Error('disco indisponível')
    }
    fireEvent.click(screen.getByRole('button', { name: `${COPY.gallery.remove} grama` }))
    const confirm = await screen.findByRole('dialog')
    fireEvent.click(within(confirm).getByRole('button', { name: COPY.gallery.removeConfirm }))
    expect(await screen.findByText(COPY.toast.saveFailed)).toBeDefined()
    expect(screen.getByRole('dialog')).toBeDefined()
    expect(persistence.snapshot().some((asset) => asset.id === 'texture-1')).toBe(true)
  })

  test('duplicar cria a cópia -2', async () => {
    const persistence = createMemoryPersistence([makeModel()])
    render(<MoldaApp persistence={persistence} />)
    const grid = await screen.findByRole('list', { name: COPY.a11y.galleryGrid })
    await waitFor(() => expect(creations(grid)).toHaveLength(1))
    fireEvent.click(screen.getByRole('button', { name: `${COPY.gallery.duplicate} nave` }))
    await waitFor(() => expect(within(grid).getByText('nave-2')).toBeDefined())
  })

  test('deep link para uma criação que não existe fica na galeria; onChange avisa', async () => {
    let changes = 0
    render(
      <MoldaApp
        persistence={createMemoryPersistence([makeSky()])}
        adapter={{ initialAssetId: 'nope', onChange: () => (changes += 1) }}
      />,
    )
    await screen.findByRole('list', { name: COPY.a11y.galleryGrid })
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(COPY.gallery.title)
    expect(changes).toBeGreaterThan(0)
  })

  test('atalho do Estúdio só com posse', async () => {
    let opened = 0
    const { rerender } = render(
      <MoldaApp
        persistence={createMemoryPersistence()}
        adapter={{ onOpenStudio: () => (opened += 1) }}
      />,
    )
    await settle()
    expect(screen.queryByRole('button', { name: COPY.gallery.openStudio })).toBeNull()
    rerender(
      <MoldaApp
        persistence={createMemoryPersistence()}
        adapter={{ studioOwned: true, onOpenStudio: () => (opened += 1) }}
      />,
    )
    fireEvent.click(await screen.findByRole('button', { name: COPY.gallery.openStudio }))
    expect(opened).toBe(1)
  })

  test('Modelos prontos: escolher a nave sugere um nome livre e abre o modelo já montado', async () => {
    const fake = installFakeViewport()
    try {
      // A galeria JÁ tem uma "nave" (o fixture): a sugestão vira "nave-2".
      const persistence = createMemoryPersistence([makeModel()])
      render(<MoldaApp persistence={persistence} />)
      await screen.findByRole('list', { name: COPY.a11y.galleryGrid })
      fireEvent.click(screen.getByRole('button', { name: COPY.gallery.create }))
      const dialog = await screen.findByRole('dialog')
      fireEvent.click(within(dialog).getByRole('button', { name: COPY.a11y.openTemplates }))
      expect(within(dialog).getByText(COPY.templates.stepTitle)).toBeDefined()
      expect(within(dialog).getByText(COPY.newAsset.progress(2, 3))).toBeDefined()
      fireEvent.click(
        within(dialog).getByRole('button', {
          name: COPY.a11y.templateCard(COPY.templates.items.nave.title),
        }),
      )
      const input = within(dialog).getByRole('textbox') as HTMLInputElement
      expect(input.value).toBe('nave-2')
      fireEvent.click(within(dialog).getByRole('button', { name: COPY.newAsset.create }))

      await waitFor(() =>
        expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('nave-2'),
      )
      await waitFor(() => expect(persistence.snapshot()).toHaveLength(2))
      const created = persistence.snapshot().find((asset) => asset.name === 'nave-2')
      expect(created?.kind).toBe('model')
      expect(created?.kind === 'model' ? created.parts.length : 0).toBe(8)
    } finally {
      fake.uninstall()
    }
  })

  test('Trazer de volta aceita o .zip do "Baixar tudo" e o .molda.json solto', async () => {
    const zip = await zipGallery([makeTexture(), makeSky()], {
      yieldBetween: null,
      skySize: { width: 16, height: 8 },
    })
    const persistence = createMemoryPersistence()
    render(<MoldaApp persistence={persistence} />)
    await settle()
    const input = screen.getByLabelText(COPY.gallery.importJson) as HTMLInputElement
    expect(input.accept).toContain('.zip')

    fireEvent.change(input, {
      target: {
        files: [
          new File([zip.slice().buffer as ArrayBuffer], 'minhas-criacoes-3d-molda.zip', {
            type: 'application/zip',
          }),
        ],
      },
    })
    const grid = await screen.findByRole('list', { name: COPY.a11y.galleryGrid })
    await waitFor(() => expect(creations(grid)).toHaveLength(2))
    expect(
      persistence
        .snapshot()
        .map((asset) => asset.name)
        .sort(),
    ).toEqual(['fim-de-tarde', 'grama'])

    fireEvent.change(input, {
      target: {
        files: [
          new File([galleryToJsonText([makeModel()])], 'galeria.molda.json', {
            type: 'application/json',
          }),
        ],
      },
    })
    await waitFor(() => expect(creations(grid)).toHaveLength(3))
    expect(persistence.snapshot().some((asset) => asset.name === 'nave')).toBe(true)
  })
})

describe('galeria: o desenho das telas-modelo (11/09)', () => {
  test('três faixas de borda a borda rolam juntas: cabeçalho creme, grade no céu, fechamento lilás', async () => {
    render(<MoldaApp persistence={createMemoryPersistence([makeModel()])} />)
    const heading = await screen.findByRole('heading', { level: 1, name: COPY.gallery.title })
    const creme = heading.closest('[data-mld-band]')
    if (!creme) throw new Error('sem faixa creme')
    expect(creme.tagName).toBe('HEADER')
    expect(creme.getAttribute('data-mld-band')).toBe('creme')
    expect(creme.className).toContain('sz-tool-band--creme')
    const grid = await screen.findByRole('list', { name: COPY.a11y.galleryGrid })
    expect(grid.closest('[data-mld-band]')?.getAttribute('data-mld-band')).toBe('ceu')
    const lilas = screen.getByRole('region', { name: GALLERY_SHELL_COPY.savedDevice(1) })
    expect(lilas.getAttribute('data-mld-band')).toBe('lilas')
    // As três moram na MESMA área rolável: o cabeçalho rola junto, nada preso em cima. E nada de
    // `<main>` próprio: o host já tem o dele.
    const scrollRoot = creme.closest('[data-mld-scroll-root]')
    if (!scrollRoot) throw new Error('sem raiz rolável')
    expect(scrollRoot.className).toContain('overflow-y-auto')
    expect(grid.closest('[data-mld-scroll-root]')).toBe(scrollRoot)
    expect(lilas.closest('[data-mld-scroll-root]')).toBe(scrollRoot)
    expect(screen.queryByRole('main')).toBeNull()
  })

  test('o cartão da criação: nome em cima, a capa cinza-clara abre, e sem a borda do tipo', async () => {
    render(<MoldaApp persistence={createMemoryPersistence([makeModel()])} />)
    const grid = await screen.findByRole('list', { name: COPY.a11y.galleryGrid })
    await waitFor(() => expect(creations(grid)).toHaveLength(1))
    const card = creations(grid)[0]
    if (!card) throw new Error('sem cartão')
    expect(card.className).toContain('sz-tool-card')
    expect(card.className).not.toContain('mld-pop')
    expect(card.getAttribute('style')).toBeNull()
    const title = card.querySelector('.sz-tool-card-title')
    expect(title?.textContent).toBe('nave')
    const open = within(card).getByRole('button', {
      name: COPY.a11y.assetCard('nave', COPY.kinds.model.title),
    })
    expect(open.className).toContain('sz-tool-cover')
    // O nome vem ANTES da capa.
    expect(title?.compareDocumentPosition(open)).toBe(Node.DOCUMENT_POSITION_FOLLOWING)
  })

  test('o cartão "Nova criação" abre a grade, tem nome próprio e some com busca ou filtro', async () => {
    render(<MoldaApp persistence={createMemoryPersistence([makeModel(), makeSky()])} />)
    const grid = await screen.findByRole('list', { name: COPY.a11y.galleryGrid })
    await waitFor(() => expect(creations(grid)).toHaveLength(2))
    expect(within(grid).getAllByRole('listitem')[0]?.hasAttribute('data-mld-new-card')).toBe(true)
    // O "Criar novo" do cabeçalho segue sendo o ÚNICO botão com esse pedaço de nome: os e2e o
    // acham pelo nome, e o Playwright casa por pedaço.
    expect(NEW_CARD_NAME.includes(COPY.gallery.create)).toBe(false)
    expect(screen.getAllByRole('button', { name: COPY.gallery.create })).toHaveLength(1)

    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'nave' } })
    await waitFor(() => expect(screen.queryByRole('button', { name: NEW_CARD_NAME })).toBeNull())
    fireEvent.keyDown(screen.getByRole('searchbox'), { key: 'Escape' })
    expect(await screen.findByRole('button', { name: NEW_CARD_NAME })).toBeDefined()
    fireEvent.click(screen.getByRole('button', { name: COPY.gallery.filterAria.sky }))
    await waitFor(() => expect(screen.queryByRole('button', { name: NEW_CARD_NAME })).toBeNull())
  })

  test('os chips de tipo levam ícones de linha no lugar dos emojis ("Todos" sem ícone)', async () => {
    render(<MoldaApp persistence={createMemoryPersistence([makeModel()])} />)
    await screen.findByRole('list', { name: COPY.a11y.galleryGrid })
    const all = screen.getByRole('button', { name: COPY.gallery.filterAria.all })
    expect(all.querySelector('svg')).toBeNull()
    for (const kind of ['model', 'texture', 'sky'] as const) {
      const chip = screen.getByRole('button', { name: COPY.gallery.filterAria[kind] })
      expect(chip.querySelector('svg')).not.toBeNull()
      expect(chip.textContent).toBe(COPY.kinds[kind].plural)
    }
  })

  test('Baixar tudo e Trazer de volta moram no cartão lilás; o cabeçalho fica com o Criar novo', async () => {
    render(
      <MoldaApp
        persistence={createMemoryPersistence([makeModel()])}
        adapter={{ studioOwned: true, onOpenStudio: () => {} }}
      />,
    )
    const heading = await screen.findByRole('heading', { level: 1, name: COPY.gallery.title })
    const header = heading.closest('header')
    if (!header) throw new Error('sem cabeçalho')
    expect(within(header).getByRole('button', { name: COPY.gallery.create })).toBeDefined()
    expect(within(header).getByRole('button', { name: COPY.gallery.openStudio })).toBeDefined()
    expect(within(header).queryByRole('button', { name: COPY.gallery.downloadAll })).toBeNull()
    expect(within(header).queryByRole('button', { name: COPY.gallery.importJson })).toBeNull()
    const lilas = await screen.findByRole('region', { name: GALLERY_SHELL_COPY.savedDevice(1) })
    expect(within(lilas).getByRole('button', { name: COPY.gallery.downloadAll })).toBeDefined()
    expect(within(lilas).getByRole('button', { name: COPY.gallery.importJson })).toBeDefined()
  })

  test('galeria vazia: o fechamento lilás aparece (trazer de volta num aparelho novo), sem o Baixar tudo', async () => {
    render(<MoldaApp persistence={createMemoryPersistence()} />)
    const lilas = await screen.findByRole('region', { name: GALLERY_SHELL_COPY.savedDevice(0) })
    expect(within(lilas).queryByRole('button', { name: COPY.gallery.downloadAll })).toBeNull()
    expect(within(lilas).getByRole('button', { name: COPY.gallery.importJson })).toBeDefined()
    // Sem criações não há o que contar: o contador (a região viva) fica montado e vazio.
    expect(screen.getByRole('status').textContent).toBe('')
  })
})

test('deep link para uma criação que não existe abre a galeria e AVISA', async () => {
  render(
    <MoldaApp
      persistence={createMemoryPersistence([makeModel()])}
      adapter={{ initialAssetId: 'nao-existe' }}
    />,
  )
  await screen.findByText(COPY.gallery.creationGone)
  screen.getByRole('heading', { level: 1, name: COPY.gallery.title })
})
