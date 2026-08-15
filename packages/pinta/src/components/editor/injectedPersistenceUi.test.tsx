/**
 * Persistência INJETADA + `onChange` — as duas peças que fazem o bloco de aula existir.
 *
 * O host da aula não quer a galeria do perfil: ele quer guardar o desenho no backend dele. Isso
 * exige duas coisas que o Pinta solto nunca precisou — um armazenamento próprio, e um aviso a
 * cada revisão confirmada. E exige que as duas andem JUNTAS: `persistence` de memória não pode
 * significar "salvamento desligado", senão o desenho da criança nunca chega ao professor.
 */
import { beforeEach, describe, expect, it } from 'bun:test'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { COPY } from '../../core/copy'
import { createPixelSpriteAsset, type PintaAsset } from '../../core/project'
import { clearIdbMock } from '../../testing/idbMock'

const { PintaApp } = await import('../PintaApp')
const { setPintaStorageNamespace } = await import('../../state/persistence')
const { createGalleryStore } = await import('../../state/galleryStore')
const { createMemoryPersistence } = await import('../../state/memoryPersistence')

beforeEach(() => {
  clearIdbMock()
  setPintaStorageNamespace('')
})

/** O que o IndexedDB do PERFIL tem agora — o que a curadoria de armazenamento promete não tocar. */
async function noDiscoDoPerfil(): Promise<PintaAsset[]> {
  const conferir = createGalleryStore()
  await conferir.getState().load()
  return conferir.getState().assets
}

/** Uma edição determinística e pequena: crescer o quadro pelo diálogo de tamanho. */
function redimensionar(de: [number, number], para: [string, string]): void {
  fireEvent.click(screen.getByRole('button', { name: COPY.editor.resize.button(de[0], de[1]) }))
  fireEvent.change(screen.getByLabelText(COPY.newAsset.customSize.width), {
    target: { value: para[0] },
  })
  fireEvent.change(screen.getByLabelText(COPY.newAsset.customSize.height), {
    target: { value: para[1] },
  })
  fireEvent.click(screen.getByRole('button', { name: COPY.editor.resize.apply }))
}

async function abrirNave(): Promise<void> {
  await waitFor(() => {
    expect(screen.getByRole('button', { name: /Abrir nave/ })).toBeTruthy()
  })
  fireEvent.click(screen.getByRole('button', { name: /Abrir nave/ }))
  await waitFor(() => {
    expect(screen.getByRole('button', { name: COPY.editor.resize.button(32, 32) })).toBeTruthy()
  })
}

describe('armazenamento injetado', () => {
  it('🚨 o autosave do EDITOR vai para o armazenamento do host, e o perfil fica intocado', async () => {
    // ⚠️ O asset é semeado pela FÁBRICA pura, e não por uma galeria local: assim o IndexedDB
    // começa vazio de verdade e a asserção do fim significa alguma coisa.
    const nave = createPixelSpriteAsset({ name: 'nave', frameSize: 32 })
    const memoria = createMemoryPersistence([nave])
    const vistas: PintaAsset[] = []
    const adapter = { onChange: (asset: PintaAsset) => vistas.push(asset) }

    render(<PintaApp adapter={adapter} persistence={memoria} />)
    await abrirNave()
    redimensionar([32, 32], ['128', '32'])

    // O que prova o caminho inteiro é o armazenamento do host ter a revisão nova.
    await waitFor(
      async () => {
        const salvo = await memoria.loadAssetById(nave.id)
        expect(salvo?.kind === 'pixel-sprite' && salvo.frameWidth).toBe(128)
      },
      { timeout: 5000 },
    )

    // ⭐ E o perfil não recebeu NADA: era o `persistAssets` de módulo, chamado direto pelo
    // EditorScreen, que furava o armazenamento injetado.
    expect(await noDiscoDoPerfil()).toEqual([])
  })

  it('sem injeção o desenho continua indo para o IndexedDB do perfil (anti-vácuo)', async () => {
    const seed = createGalleryStore()
    await seed.getState().create({ kind: 'pixel-sprite', name: 'nave', frameSize: 32 })

    render(<PintaApp />)
    await abrirNave()
    redimensionar([32, 32], ['128', '32'])

    await waitFor(
      async () => {
        const salvo = (await noDiscoDoPerfil()).find((a) => a.name === 'nave')
        expect(salvo?.kind === 'pixel-sprite' && salvo.frameWidth).toBe(128)
      },
      { timeout: 5000 },
    )
  })
})

describe('onChange', () => {
  it('⭐ dispara MESMO com a persistência de memória (é assim que o host salva)', async () => {
    const nave = createPixelSpriteAsset({ name: 'nave', frameSize: 32 })
    const vistas: PintaAsset[] = []
    const adapter = { onChange: (asset: PintaAsset) => vistas.push(asset) }

    render(<PintaApp adapter={adapter} persistence={createMemoryPersistence([nave])} />)
    await abrirNave()
    redimensionar([32, 32], ['128', '32'])

    await waitFor(
      () => {
        const ultimo = vistas.at(-1)
        expect(ultimo?.kind === 'pixel-sprite' && ultimo.frameWidth).toBe(128)
      },
      { timeout: 5000 },
    )
    expect(vistas.at(-1)?.id).toBe(nave.id)
  })

  it('🚨 ABRIR um desenho não dispara — só editar', async () => {
    const nave = createPixelSpriteAsset({ name: 'nave', frameSize: 32 })
    const vistas: PintaAsset[] = []
    const adapter = { onChange: (asset: PintaAsset) => vistas.push(asset) }

    render(<PintaApp adapter={adapter} persistence={createMemoryPersistence([nave])} />)
    await abrirNave()

    // Passa do debounce do autosave (~1s): se abrir contasse como revisão, ela apareceria aqui.
    // Sem isto o host gravaria no backend a cada abertura, e no bloco de aula isso vira uma
    // entrega "nova" toda vez que a criança volta à página.
    await act(async () => {
      await Bun.sleep(1500)
    })
    expect(vistas).toEqual([])
  })
})
