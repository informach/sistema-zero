import { describe, expect, it } from 'bun:test'
import { buildKitGroupsResult, buildProjectFromKitEntry } from '../projects/KitGallery'
import { type ArquivoDoExemplo, BIG_EXAMPLES, carregarArquivoDoExemplo } from './bigExamples'
import { JOGO_E_ARQUIVO } from './jogoEArquivo.generated'

/**
 * Os exemplos grandes da galeria (lote 9 da conclusão do plano do Estúdio, 22/11/2026): o arquivo
 * de fora do pacote só vira projeto com o tamanho e o hash certos, e o card do jogo E só aparece
 * quando o host diz onde os arquivos moram.
 */

const ARQUIVO_DE_TESTE = {
  ir: {
    version: 2,
    html: [],
    css: [],
    extensions: [{ extensionId: 'game-3d' }],
    behavior: { start: [], events: [], loops: [] },
  },
  assets: [],
}
async function arquivo(conteudo: unknown): Promise<{ bytes: Uint8Array; info: ArquivoDoExemplo }> {
  const bytes = new TextEncoder().encode(JSON.stringify(conteudo))
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  const sha256 = [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
  return { bytes, info: { caminho: `teste/${sha256}.json`, sha256, bytes: bytes.length } }
}
const servindo = (bytes: Uint8Array, pedidos: string[] = []) =>
  (async (url: string) => {
    pedidos.push(String(url))
    return new Response(bytes)
  }) as unknown as typeof fetch

describe('o arquivo de um exemplo grande', () => {
  it('abre só com o tamanho e o hash certos, pelo endereço do host', async () => {
    const { bytes, info } = await arquivo(ARQUIVO_DE_TESTE)
    const pedidos: string[] = []
    const aberto = await carregarArquivoDoExemplo(
      '/api/studio/example-files/',
      info,
      servindo(bytes, pedidos),
    )
    expect(pedidos).toEqual([`/api/studio/example-files/${info.caminho}`])
    expect(aberto.ir.extensions).toEqual([{ extensionId: 'game-3d' }])
  })

  it('recusa o arquivo trocado, cortado, ausente ou que não é projeto', async () => {
    const { bytes, info } = await arquivo(ARQUIVO_DE_TESTE)
    const trocado = new Uint8Array(bytes)
    trocado[10] = trocado[10]! ^ 1
    await expect(carregarArquivoDoExemplo('/b', info, servindo(trocado))).rejects.toThrow(
      'diferente',
    )
    await expect(carregarArquivoDoExemplo('/b', info, servindo(bytes.slice(1)))).rejects.toThrow(
      'diferente',
    )
    const ausente = (async () => new Response('', { status: 404 })) as unknown as typeof fetch
    await expect(carregarArquivoDoExemplo('/b', info, ausente)).rejects.toThrow('baixar')
    await expect(carregarArquivoDoExemplo(undefined, info, servindo(bytes))).rejects.toThrow(
      'disponível',
    )
    const outro = await arquivo({ nada: true })
    await expect(carregarArquivoDoExemplo('/b', outro.info, servindo(outro.bytes))).rejects.toThrow(
      'não é um projeto',
    )
  })
})

describe('o jogo E na galeria', () => {
  const jogoE = BIG_EXAMPLES.find((exemplo) => exemplo.extensionId === 'game-3d')!

  it('mora fora do pacote: o resumo tem o caminho pelo hash e a capa do próprio jogo', () => {
    expect(jogoE.arquivo).toBe(JOGO_E_ARQUIVO)
    expect(JOGO_E_ARQUIVO.caminho).toBe(`jogo-e/${JOGO_E_ARQUIVO.sha256}.json`)
    expect(JOGO_E_ARQUIVO.sha256).toMatch(/^[0-9a-f]{64}$/)
    expect(jogoE.cover).toMatch(/^data:image\/png;base64,/)
  })

  it('sem o endereço do host o card não aparece; com ele, aparece no grupo do Jogo 3D', async () => {
    const semEndereco = (await buildKitGroupsResult()).groups.find(
      (g) => g.extensionId === 'game-3d',
    )
    expect(semEndereco?.entries.some((e) => e.name === jogoE.name)).toBe(false)
    const com = (
      await buildKitGroupsResult(undefined, { exampleFilesBaseUrl: '/api/studio/example-files' })
    ).groups.find((g) => g.extensionId === 'game-3d')
    const entrada = com?.entries.find((e) => e.name === jogoE.name)
    expect(entrada).toMatchObject({ difficulty: 'advanced', cover: jogoE.cover })
    expect(entrada?.ir).toBeUndefined()
  })

  it('o projeto aberto pelo arquivo instala o Jogo 3D, como o clique da galeria', async () => {
    const { bytes, info } = await arquivo(ARQUIVO_DE_TESTE)
    const carregado = await carregarArquivoDoExemplo('/b', info, servindo(bytes))
    const projeto = buildProjectFromKitEntry({
      key: 'game-3d:teste',
      name: 'Teste',
      description: '',
      experience: 'game',
      emoji: '🎮',
      ...carregado,
    })
    expect(projeto.installedExtensions.map((extensao) => extensao.id)).toEqual(['game-3d'])
  })
})
