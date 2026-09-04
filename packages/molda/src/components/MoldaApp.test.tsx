import { beforeEach, describe, expect, test } from 'bun:test'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { StrictMode } from 'react'
import { COPY } from '../core/copy'
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

describe('MoldaApp', () => {
  test('galeria vazia mostra o convite e o tema no root', async () => {
    const { container } = render(
      <MoldaApp persistence={createMemoryPersistence()} adapter={{ theme: 'dark' }} />,
    )
    await settle()
    expect(container.querySelector('[data-molda-theme="dark"]')).not.toBeNull()
    expect(await screen.findByText(COPY.gallery.empty)).toBeDefined()
    expect(screen.getByRole('button', { name: COPY.gallery.emptyCta })).toBeDefined()
  })

  test('lista as criações com selo do tipo, busca e filtro', async () => {
    const persistence = createMemoryPersistence([makeModel(), makeTexture(), makeSky()])
    render(<MoldaApp persistence={persistence} />)
    const grid = await screen.findByRole('list', { name: COPY.a11y.galleryGrid })
    await waitFor(() => expect(within(grid).getAllByRole('listitem')).toHaveLength(3))
    expect(screen.getByRole('status').textContent).toContain('3 criações')

    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'céu' } })
    await waitFor(() => expect(within(grid).getAllByRole('listitem')).toHaveLength(1))
    expect(screen.getByRole('status').textContent).toContain('1 de 3')

    fireEvent.click(screen.getByRole('button', { name: COPY.gallery.searchClear }))
    fireEvent.click(screen.getByRole('button', { name: COPY.gallery.filterAria.texture }))
    await waitFor(() => expect(within(grid).getAllByRole('listitem')).toHaveLength(1))
    expect(within(grid).getByText('grama')).toBeDefined()

    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'zzz' } })
    expect(await screen.findByText(COPY.gallery.searchEmpty)).toBeDefined()
    fireEvent.click(screen.getByRole('button', { name: COPY.gallery.searchClearAll }))
    // O estado vazio desmonta a grade: a referência antiga ficou solta, buscar de novo.
    await waitFor(() =>
      expect(
        within(screen.getByRole('list', { name: COPY.a11y.galleryGrid })).getAllByRole('listitem'),
      ).toHaveLength(3),
    )
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

  test('sob StrictMode (montagem dupla) o salvamento automático segue vivo e a criação fica aberta', async () => {
    const persistence = createMemoryPersistence([makeSky()])
    render(<MoldaApp persistence={persistence} adapter={{ initialAssetId: 'sky-1' }} />, {
      wrapper: StrictMode,
    })
    await waitFor(() =>
      expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('fim-de-tarde'),
    )
    expect(isMoldaAssetOpen('sky-1')).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: COPY.skyPresets.noite }))
    await waitFor(() => expect(presetOf(persistence.snapshot()[0])).toBe('noite'), {
      timeout: 3000,
    })
    expect(screen.getByRole('status').textContent).toBe(COPY.editor.saved)
    fireEvent.click(screen.getByRole('button', { name: COPY.editor.backToGallery }))
    await screen.findByRole('heading', { level: 1, name: COPY.gallery.title })
    expect(isMoldaAssetOpen('sky-1')).toBe(false)
  })

  test('atalho Ctrl+Z desfaz no editor (e não com um modal aberto)', async () => {
    const persistence = createMemoryPersistence([makeSky()])
    render(<MoldaApp persistence={persistence} adapter={{ initialAssetId: 'sky-1' }} />)
    await waitFor(() =>
      expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('fim-de-tarde'),
    )
    fireEvent.click(screen.getByRole('button', { name: COPY.skyPresets.noite }))
    fireEvent.keyDown(document, { key: 'z', ctrlKey: true })
    expect(
      screen.getByRole('button', { name: COPY.skyPresets.entardecer }).getAttribute('aria-pressed'),
    ).toBe('true')
    fireEvent.keyDown(document, { key: 'z', ctrlKey: true, shiftKey: true })
    expect(
      screen.getByRole('button', { name: COPY.skyPresets.noite }).getAttribute('aria-pressed'),
    ).toBe('true')
  })

  test('renomear e apagar pela galeria', async () => {
    const persistence = createMemoryPersistence([makeSky(), makeTexture()])
    render(<MoldaApp persistence={persistence} />)
    const grid = await screen.findByRole('list', { name: COPY.a11y.galleryGrid })
    await waitFor(() => expect(within(grid).getAllByRole('listitem')).toHaveLength(2))

    fireEvent.click(screen.getByRole('button', { name: `${COPY.gallery.rename} grama` }))
    const rename = await screen.findByRole('dialog')
    fireEvent.change(within(rename).getByRole('textbox'), { target: { value: 'Terra' } })
    fireEvent.click(within(rename).getByRole('button', { name: COPY.rename.save }))
    await waitFor(() => expect(within(grid).getByText('terra')).toBeDefined())
    expect(persistence.snapshot().some((a) => a.name === 'terra')).toBe(true)

    fireEvent.click(screen.getByRole('button', { name: `${COPY.gallery.remove} terra` }))
    const confirm = await screen.findByRole('dialog')
    fireEvent.click(within(confirm).getByRole('button', { name: COPY.gallery.removeConfirm }))
    await waitFor(() => expect(within(grid).getAllByRole('listitem')).toHaveLength(1))
    expect(persistence.snapshot()).toHaveLength(1)
  })

  test('duplicar cria a cópia -2', async () => {
    const persistence = createMemoryPersistence([makeModel()])
    render(<MoldaApp persistence={persistence} />)
    const grid = await screen.findByRole('list', { name: COPY.a11y.galleryGrid })
    await waitFor(() => expect(within(grid).getAllByRole('listitem')).toHaveLength(1))
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
    await waitFor(() => expect(within(grid).getAllByRole('listitem')).toHaveLength(2))
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
    await waitFor(() => expect(within(grid).getAllByRole('listitem')).toHaveLength(3))
    expect(persistence.snapshot().some((asset) => asset.name === 'nave')).toBe(true)
  })
})
