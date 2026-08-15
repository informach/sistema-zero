/**
 * `<PintaLesson>` — o Pinta dentro de um bloco de aula.
 *
 * O que estes testes protegem é o contrato com o host: um desenho só, sem saída para a galeria
 * do perfil, com a moldura restrita por default, e um handle por onde o bloco lê o desenho e
 * força a gravação antes de enviar ao professor.
 */
import { beforeEach, describe, expect, it } from 'bun:test'
import { act, render, screen, waitFor } from '@testing-library/react'
import { createRef } from 'react'
import { COPY } from '../core/copy'
import { createPixelSpriteAsset, type PintaAsset } from '../core/project'
import { clearIdbMock } from '../testing/idbMock'

const { PintaLesson } = await import('./PintaLesson')
const { setPintaStorageNamespace } = await import('../state/persistence')
const { createGalleryStore } = await import('../state/galleryStore')
const { createMemoryPersistence } = await import('../state/memoryPersistence')
type PintaHandle = import('./PintaLesson').PintaHandle

beforeEach(() => {
  clearIdbMock()
  setPintaStorageNamespace('')
})

function nave(): PintaAsset {
  return createPixelSpriteAsset({ name: 'nave', frameSize: 32 })
}

/** O editor montou quando a caixa de ferramentas está na tela. */
async function esperarEditor(): Promise<void> {
  await waitFor(() => {
    expect(screen.getByRole('toolbar', { name: COPY.a11y.tools })).toBeTruthy()
  })
}

/**
 * ⚠️⚠️ O editor PINTAR não é o editor ANUNCIAR-SE ao handle: o `onEditorReady` roda num efeito,
 * um turno depois, e no CI (Linux, mais lento que esta máquina) ele chegava DEPOIS do
 * `esperarEditor()` — o `replaceAsset` devolvia `false` só por isso.
 *
 * ⚠️ O `getAsset()` NÃO serve de sonda: sem editor ele cai no `boot.seed` e devolve o desenho
 * certo mesmo assim. Quem denuncia a diferença é o próprio `replaceAsset`, e repeti-lo é seguro
 * porque o `replace` do editorStore não cria entrada de undo.
 */
async function esperarHandlePronto(handle: PintaHandle, asset: PintaAsset): Promise<void> {
  await waitFor(() => {
    expect(handle.replaceAsset(asset)).toBe(true)
  })
}

describe('modo asset único', () => {
  it('abre DIRETO no desenho, sem galeria e sem caminho de volta', async () => {
    const asset = nave()
    render(<PintaLesson initialAsset={asset} />)
    await esperarEditor()

    expect(screen.getByTitle('nave')).toBeTruthy()
    // Sem galeria atrás, o botão voltar levaria a uma tela em branco.
    expect(screen.queryByRole('button', { name: COPY.editor.back })).toBeNull()
    // E o "Criar novo" da galeria nunca chega a montar.
    expect(screen.queryByRole('button', { name: COPY.gallery.create })).toBeNull()
  })

  it('a moldura nasce restrita: sem mudar tamanho e sem baixar', async () => {
    render(<PintaLesson initialAsset={nave()} />)
    await esperarEditor()

    expect(screen.queryByRole('button', { name: COPY.editor.resize.button(32, 32) })).toBeNull()
    expect(screen.queryByRole('button', { name: COPY.editor.download })).toBeNull()
  })

  it('…e o host consegue ligar as duas de volta (anti-vácuo do caso acima)', async () => {
    render(<PintaLesson initialAsset={nave()} features={{ resize: true, export: true }} />)
    await esperarEditor()

    expect(screen.getByRole('button', { name: COPY.editor.resize.button(32, 32) })).toBeTruthy()
    expect(screen.getByRole('button', { name: COPY.editor.download })).toBeTruthy()
  })

  it('a curadoria de ferramentas do professor vale aqui dentro', async () => {
    render(<PintaLesson initialAsset={nave()} allowTools={['pencil', 'eraser']} />)
    await esperarEditor()

    expect(screen.getByRole('button', { name: COPY.tools.pencil })).toBeTruthy()
    expect(screen.queryByRole('button', { name: COPY.tools.fill })).toBeNull()
  })

  it('nada vaza para o IndexedDB do perfil com a persistência default', async () => {
    render(<PintaLesson initialAsset={nave()} />)
    await esperarEditor()

    const perfil = createGalleryStore()
    await perfil.getState().load()
    expect(perfil.getState().assets).toEqual([])
  })
})

describe('semeadura do desenho inicial', () => {
  it('🚨 o que a criança já desenhou VENCE o desenho inicial do professor', async () => {
    // Sem esta regra, reabrir a aula apagaria tudo que ela fez: o bloco remonta com o mesmo
    // `initialAsset` toda vez.
    const original = nave()
    const emAndamento: PintaAsset = { ...original, name: 'nave-da-crianca' }
    const guardado = createMemoryPersistence([emAndamento])

    render(<PintaLesson initialAsset={original} persistence={guardado} />)
    await esperarEditor()

    expect(screen.getByTitle('nave-da-crianca')).toBeTruthy()
    const noArmazenamento = await guardado.loadAssetById(original.id)
    expect(noArmazenamento?.name).toBe('nave-da-crianca')
  })

  it('armazenamento vazio recebe o desenho do professor', async () => {
    const asset = nave()
    const vazio = createMemoryPersistence()

    render(<PintaLesson initialAsset={asset} persistence={vazio} />)
    await esperarEditor()

    expect((await vazio.loadAssetById(asset.id))?.name).toBe('nave')
  })
})

describe('🚨 falhar sem virar tela branca', () => {
  it('armazenamento que recusa gravar vira recado, e não um retângulo vazio', async () => {
    // O armazenamento do host pode falhar (rede, cota). Antes do catch, a promessa rejeitava e o
    // bloco ficava branco para sempre, sem uma linha no console da criança.
    const quebrado = {
      ...createMemoryPersistence(),
      persistAsset: async () => {
        throw new Error('sem espaço')
      },
    }

    render(<PintaLesson initialAsset={nave()} persistence={quebrado} />)

    await waitFor(() => {
      expect(screen.getByRole('alert').textContent).toBe(COPY.gallery.lessonLoadError)
    })
    expect(screen.queryByRole('toolbar', { name: COPY.a11y.tools })).toBeNull()
  })

  it('desenho MALFORMADO é recusado na borda, com recado próprio', async () => {
    // Sem o sanitize aqui, ele entraria, seria editado, e sumiria no próximo load — a falha mais
    // cara deste pacote. E o recado é OUTRO: recarregar não conserta autoria.
    const torto = { ...nave(), kind: 'inventado' } as unknown as PintaAsset

    render(<PintaLesson initialAsset={torto} />)

    await waitFor(() => {
      expect(screen.getByRole('alert').textContent).toBe(COPY.gallery.lessonBrokenAsset)
    })
  })
})

describe('PintaHandle', () => {
  it('devolve o desenho VIVO, grava sob demanda e troca o desenho', async () => {
    const asset = nave()
    const guardado = createMemoryPersistence([asset])
    const handleRef = createRef<PintaHandle | null>()

    render(<PintaLesson initialAsset={asset} persistence={guardado} handleRef={handleRef} />)
    await esperarEditor()

    const handle = handleRef.current
    if (!handle) throw new Error('handle esperado')
    await esperarHandlePronto(handle, asset)
    expect(handle.getAsset().name).toBe('nave')

    // O bloco "sincroniza com o enviado" por aqui.
    let trocou = false
    await act(async () => {
      trocou = handle.replaceAsset({ ...asset, name: 'nave-do-professor' })
    })
    expect(trocou).toBe(true)
    expect(handle.getAsset().name).toBe('nave-do-professor')

    // ⚠️ Salvar tem que CONFIRMAR: o host só envia ao professor depois de um `true`.
    let salvou = false
    await act(async () => {
      salvou = await handle.save()
    })
    expect(salvou).toBe(true)
    expect((await guardado.loadAssetById(asset.id))?.name).toBe('nave-do-professor')
  })

  it('🚨 recusa trocar por um desenho de OUTRA identidade', async () => {
    const asset = nave()
    const handleRef = createRef<PintaHandle | null>()
    render(<PintaLesson initialAsset={asset} handleRef={handleRef} />)
    await esperarEditor()

    const handle = handleRef.current
    if (!handle) throw new Error('handle esperado')
    // ⚠️ Anti-vácuo: `replaceAsset` também devolve `false` com o editor ainda não anunciado, então
    // sem esta espera o teste passaria pelo motivo ERRADO e nunca exercitaria a recusa por id.
    await esperarHandlePronto(handle, asset)
    // O editor é montado POR ID; trocar a identidade por baixo dele deixaria a galeria apontando
    // para um desenho que não existe.
    let trocou = true
    await act(async () => {
      trocou = handle.replaceAsset(createPixelSpriteAsset({ name: 'outro', frameSize: 32 }))
    })
    expect(trocou).toBe(false)
    expect(handle.getAsset().name).toBe('nave')
  })
})
