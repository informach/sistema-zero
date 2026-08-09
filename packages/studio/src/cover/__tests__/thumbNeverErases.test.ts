import { beforeEach, describe, expect, it, mock } from 'bun:test'

/**
 * Uma captura que FALHA não pode apagar a capa que já existe.
 *
 * ⭐ Esta propriedade passou a segurar a peça inteira: desde 08/2026 o harness
 * posta `null` quando o quadro está em branco (jogo que não desenhou, 3D com o
 * buffer WebGL já descartado), e a 2ª passada — html2canvas — **não funciona**
 * na nossa sandbox de origem opaca. Ou seja: `null` acontece de verdade, e com
 * frequência. Se ele chegasse até a gravação, uma foto boa viraria nada.
 */

const gravacoes: { id: string; dataUrl: string }[] = []
let falharGravacao = false
let duranteGravacao: (() => void) | null = null

mock.module('../../state/persistence', () => ({
  MAX_PROJECT_THUMB_CHARS: 400_000,
  PROJECT_THUMB_UPDATED_EVENT: 'sz:project-thumb',
  writeProjectThumb: (id: string, dataUrl: string) => {
    duranteGravacao?.()
    if (falharGravacao) return Promise.resolve(false)
    gravacoes.push({ id, dataUrl })
    return Promise.resolve(true)
  },
}))

let capaDevolvida: string | null = null
mock.module('../coverCapture', () => ({
  captureCoverFromProject: () => Promise.resolve(capaDevolvida),
}))

const { forgetProjectSnapshot, peekProjectSnapshot, rememberProjectSnapshot } = await import(
  '../latestSnapshot'
)
const { captureAndStoreProjectThumb } = await import('../thumbCapture')

const projeto = { id: 'p1', name: 'jogo' } as unknown as Parameters<
  typeof captureAndStoreProjectThumb
>[0]

describe('gravação da miniatura', () => {
  beforeEach(() => {
    gravacoes.length = 0
    falharGravacao = false
    duranteGravacao = null
    forgetProjectSnapshot()
  })

  it('⭐ captura que volta null NÃO grava nada (a capa anterior sobrevive)', async () => {
    capaDevolvida = null
    await captureAndStoreProjectThumb(projeto)
    expect(gravacoes).toHaveLength(0)
  })

  it('miniatura que não pôde ser reduzida também não grava', async () => {
    // happy-dom não tem canvas, então o `downscaleToThumb` devolve null aqui —
    // é exatamente o segundo portão, e ele também tem que barrar a gravação.
    capaDevolvida = 'data:image/png;base64,AAAA'
    await captureAndStoreProjectThumb(projeto)
    expect(gravacoes).toHaveLength(0)
  })

  it('⭐⭐ prefere a foto que o PREVIEW já tirou, sem abrir iframe nenhum', async () => {
    // O caminho novo: enquanto a criança edita, o preview manda a miniatura do
    // jogo que está rodando na tela. Aqui é só gravar — nada de rodar o jogo de
    // novo e torcer para o navegador entregar quadros na saída.
    capaDevolvida = null // o caminho antigo FALHARIA, e mesmo assim tem que gravar
    rememberProjectSnapshot('p1', 'data:image/jpeg;base64,PREVIEW')
    await captureAndStoreProjectThumb(projeto)
    expect(gravacoes).toEqual([{ id: 'p1', dataUrl: 'data:image/jpeg;base64,PREVIEW' }])
    forgetProjectSnapshot()
  })

  it('sem foto do preview, ainda tenta o caminho antigo', async () => {
    forgetProjectSnapshot()
    capaDevolvida = null
    await captureAndStoreProjectThumb(projeto)
    // Nada gravado, mas o importante é que a RESERVA foi exercida (o
    // `captureCoverFromProject` mockado foi consultado e devolveu null).
    expect(gravacoes).toHaveLength(0)
  })

  it('mantém a foto para nova tentativa quando a gravação falha', async () => {
    capaDevolvida = null
    rememberProjectSnapshot('p1', 'data:image/jpeg;base64,RETRY')
    falharGravacao = true

    await captureAndStoreProjectThumb(projeto)
    expect(gravacoes).toHaveLength(0)

    falharGravacao = false
    await captureAndStoreProjectThumb(projeto)
    expect(gravacoes).toEqual([{ id: 'p1', dataUrl: 'data:image/jpeg;base64,RETRY' }])
    expect(peekProjectSnapshot('p1')).toBeNull()
  })

  it('não consome uma foto mais nova que chega durante a gravação', async () => {
    capaDevolvida = null
    rememberProjectSnapshot('p1', 'data:image/jpeg;base64,ANTIGA')
    duranteGravacao = () => {
      rememberProjectSnapshot('p1', 'data:image/jpeg;base64,NOVA')
    }

    await captureAndStoreProjectThumb(projeto)

    expect(gravacoes).toEqual([{ id: 'p1', dataUrl: 'data:image/jpeg;base64,ANTIGA' }])
    expect(peekProjectSnapshot('p1')?.dataUrl).toBe('data:image/jpeg;base64,NOVA')
  })
})
