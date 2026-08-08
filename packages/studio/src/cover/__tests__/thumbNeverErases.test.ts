import { describe, expect, it, mock } from 'bun:test'

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

mock.module('../../state/persistence', () => ({
  MAX_PROJECT_THUMB_CHARS: 400_000,
  PROJECT_THUMB_UPDATED_EVENT: 'sz:project-thumb',
  writeProjectThumb: (id: string, dataUrl: string) => {
    gravacoes.push({ id, dataUrl })
    return Promise.resolve()
  },
}))

let capaDevolvida: string | null = null
mock.module('../coverCapture', () => ({
  captureCoverFromProject: () => Promise.resolve(capaDevolvida),
}))

const { captureAndStoreProjectThumb } = await import('../thumbCapture')

const projeto = { id: 'p1', name: 'jogo' } as unknown as Parameters<
  typeof captureAndStoreProjectThumb
>[0]

describe('gravação da miniatura', () => {
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
})
