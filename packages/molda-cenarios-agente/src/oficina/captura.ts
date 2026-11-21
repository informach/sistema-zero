import { resolve } from 'node:path'
import type { CenariosHost } from '@sistemazero/molda-cenarios/oficina/autoria'
import type { PedidoDaPagina } from './captura-pagina'
import { binario, comPaginaSemJanela } from './pagina-sem-janela'

/**
 * Captura SEM janela: abre o Chrome local (sem tela), serve numa porta só do computador uma
 * página com o palco do motor e entrega a ela o cenário, os modelos, as texturas e as peças do
 * relevo, lidos pelo cliente da oficina com o token do agente. Nada sai do computador além das
 * leituras que a oficina já faz. Devolve a imagem (WebP).
 */

export interface OpcoesDaCaptura {
  largura?: number
  altura?: number
  vista?: PedidoDaPagina['vista']
  /** Ids a enquadrar; sem eles, o cenário inteiro. */
  enquadrar?: string[]
  /** Caminho de um Chrome/Chromium; sem ele, `MOLDA_CENARIOS_CHROMIUM` ou o Chrome instalado. */
  navegador?: string
}

export async function capturarSemJanela(
  host: CenariosHost,
  cenarioId: string,
  opcoes: OpcoesDaCaptura = {},
): Promise<{ imagem: Uint8Array; tipo: 'image/webp'; revisao: number; largura: number }> {
  const largura = Math.min(1920, Math.max(160, Math.round(opcoes.largura ?? 960))),
    altura = Math.min(1080, Math.max(120, Math.round(opcoes.altura ?? (largura * 9) / 16)))
  const aberto = await host.abrirCenario(cenarioId)
  const espacoId = (await host.obterMundo(aberto.resumo.mundoId)).espacoId
  const pedido: PedidoDaPagina = {
    documento: aberto.documento,
    largura,
    vista: opcoes.vista ?? 'livre',
    ...(opcoes.enquadrar?.length ? { enquadrar: opcoes.enquadrar } : {}),
  }
  const base64 = await comPaginaSemJanela(
    {
      entrada: resolve(import.meta.dirname, 'captura-pagina.ts'),
      pronta: 'capturarCenario',
      largura,
      altura,
      ...(opcoes.navegador ? { navegador: opcoes.navegador } : {}),
      rotas: (url) => rotasDoConteudo(host, cenarioId, espacoId, url),
    },
    async (pagina) => {
      try {
        // Carregar os modelos de um cenário grande leva tempo; sem fim, nunca.
        return await pagina.avaliar<string>(
          `globalThis.capturarCenario(${JSON.stringify(pedido)})`,
          180_000,
        )
      } catch (falha) {
        throw Error(`A captura falhou: ${falha instanceof Error ? falha.message : falha}`)
      }
    },
  )
  if (typeof base64 !== 'string') throw Error('A captura não devolveu a imagem.')
  return {
    imagem: Uint8Array.from(Buffer.from(base64, 'base64')),
    tipo: 'image/webp',
    revisao: aberto.revisao,
    largura,
  }
}

/** Modelos, texturas e peças do relevo de um cenário, lidos pelo cliente da oficina com o token. */
export async function rotasDoConteudo(
  host: Pick<CenariosHost, 'conteudoDoModelo' | 'conteudoDaTextura' | 'conteudoDoTerreno'>,
  cenarioId: string,
  espacoId: string,
  url: URL,
): Promise<Response | null> {
  const biblioteca = url.searchParams.get('biblioteca') ?? '',
    digest = url.searchParams.get('digest') ?? ''
  if (url.pathname === '/modelo')
    return binario(await host.conteudoDoModelo({ biblioteca, digest, espacoId }))
  if (url.pathname === '/textura')
    return binario(await host.conteudoDaTextura({ biblioteca, digest, espacoId }))
  const terreno = /^\/terreno\/([a-f0-9]{64})$/.exec(url.pathname)
  if (terreno) return binario(await host.conteudoDoTerreno(cenarioId, terreno[1]!))
  return null
}

/**
 * Captura PELA OFICINA ABERTA: a oficina, com a aba à vista, abre sozinha a versão que o agente
 * guardou (edição ao vivo) e a fotografa como faz com toda revisão estável. Aqui só se espera o
 * retrato da revisão atual aparecer e ele é baixado. A foto mostra a câmera de quem está na
 * oficina; sem a oficina aberta, use o modo sem janela.
 */
export async function capturarPelaOficina(
  host: Pick<CenariosHost, 'historicoDoCenario' | 'listarRevisoes'>,
  baixar: (endereco: string) => Promise<Uint8Array>,
  cenarioId: string,
  { prazoMs = 30_000, intervaloMs = 1500 }: { prazoMs?: number; intervaloMs?: number } = {},
): Promise<{ imagem: Uint8Array; tipo: 'image/webp'; revisao: number; origem: 'oficina' }> {
  const { revisao } = await host.historicoDoCenario(cenarioId)
  const fim = Date.now() + prazoMs
  while (true) {
    const pagina = await host.listarRevisoes(cenarioId)
    const item = pagina.itens.find((i) => i.revisao === revisao)
    if (item?.miniatura)
      return {
        imagem: await baixar(item.miniatura),
        tipo: 'image/webp',
        revisao,
        origem: 'oficina',
      }
    if (Date.now() > fim)
      throw Error(
        'A oficina não fotografou a versão atual a tempo. Ela está aberta neste cenário, com a aba à vista? Sem ela, use o modo sem janela.',
      )
    await Bun.sleep(intervaloMs)
  }
}
