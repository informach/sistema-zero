import { existsSync, readdirSync, statSync } from 'node:fs'
import { basename, dirname, extname, join, relative, resolve, sep } from 'node:path'
import type { CenariosHost, ModeloParaImportar } from '@sistemazero/molda-cenarios/oficina/autoria'
import { rotasDoConteudo } from './captura'
import type {
  ExportacaoFeita,
  ModelosPreparados,
  PedidoDeExportacao,
  PedidoDeModelos,
} from './oficina-pagina'
import { comPaginaSemJanela } from './pagina-sem-janela'

/**
 * Trazer modelos e exportar, para o agente, pelo MESMO caminho da oficina: uma página sem janela
 * converte, confere e fotografa os modelos (ou compila e empacota o cenário) com o código da
 * oficina; o agente envia o resultado à biblioteca (ou grava o pacote no disco) com o token dele.
 */

/** Os mesmos tetos da conversão (`importacao/conjunto.ts` do motor): mais que isso ela recusa. */
export const TETO_DE_ARQUIVOS = 5000
export const TETO_DE_BYTES = 512 * 1024 * 1024

export interface ArquivoLocal {
  /** Caminho como a oficina recebe de uma pasta escolhida: `pasta/sub/arquivo.glb`. */
  caminho: string
  nome: string
  absoluto: string
  bytes: number
}

/**
 * Os arquivos que o agente pediu para trazer: arquivos soltos e pastas inteiras (a pasta
 * escolhida vira a pasta do modelo na biblioteca, como na oficina). Arquivos ocultos ficam de fora.
 */
export function arquivosParaTrazer(caminhos: readonly string[]): ArquivoLocal[] {
  const saida: ArquivoLocal[] = []
  let total = 0
  const somar = (absoluto: string, caminho: string) => {
    const bytes = statSync(absoluto).size
    total += bytes
    if (saida.length >= TETO_DE_ARQUIVOS)
      throw Error(`Traga no máximo ${TETO_DE_ARQUIVOS} arquivos por vez.`)
    if (total > TETO_DE_BYTES) throw Error('Os arquivos passam de 512 MB. Traga em partes menores.')
    saida.push({ caminho, nome: basename(absoluto), absoluto, bytes })
  }
  const percorrer = (pasta: string, raiz: string) => {
    for (const item of readdirSync(pasta, { withFileTypes: true })
      .filter((i) => !i.name.startsWith('.'))
      .sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0))) {
      const absoluto = join(pasta, item.name)
      if (item.isDirectory()) percorrer(absoluto, raiz)
      else if (item.isFile())
        somar(absoluto, [basename(raiz), ...relative(raiz, absoluto).split(sep)].join('/'))
    }
  }
  for (const c of caminhos) {
    const absoluto = resolve(c)
    if (!existsSync(absoluto)) throw Error(`Não achei ${c}.`)
    if (statSync(absoluto).isDirectory()) percorrer(absoluto, absoluto)
    else somar(absoluto, basename(absoluto))
  }
  if (!saida.length) throw Error('Nenhum arquivo para trazer.')
  return saida
}

/** Quem roda a página (o Chrome sem tela); os testes trocam por um dublê. */
export type ExecutarPagina = <T>(
  pronta: 'prepararModelos' | 'exportarCenario',
  rotas: (url: URL, pedido: Request) => Promise<Response | null> | Response | null,
  prazoMs: number,
) => Promise<T>

export const paginaNoChrome =
  (navegador?: string): ExecutarPagina =>
  (pronta, rotas, prazoMs) =>
    comPaginaSemJanela(
      {
        entrada: resolve(import.meta.dirname, 'oficina-pagina.ts'),
        // A conversão roda num worker da oficina, criado pelo endereço relativo ao script.
        workers: {
          'converter.worker.ts': resolve(
            import.meta.dirname,
            '../../../molda-cenarios-motor/src/importacao/converter.worker.ts',
          ),
        },
        pronta,
        largura: 640,
        altura: 480,
        ...(navegador ? { navegador } : {}),
        rotas,
      },
      (pagina) => pagina.avaliar(`globalThis.${pronta}()`, prazoMs),
    )

const json = (valor: unknown) =>
  new Response(JSON.stringify(valor), { headers: { 'content-type': 'application/json' } })

export interface ModeloTrazido {
  id: string
  nome: string
  pasta: string
  digest: string
  triangulos: number
  medidas: { largura: number; altura: number; profundidade: number }
}

export async function trazerModelos(
  host: Pick<CenariosHost, 'importarModelos'>,
  bibliotecaId: string,
  caminhos: readonly string[],
  executar: ExecutarPagina = paginaNoChrome(),
): Promise<{ trazidos: ModeloTrazido[]; recusados: { arquivo: string; motivo: string }[] }> {
  const arquivos = arquivosParaTrazer(caminhos)
  const pedido: PedidoDeModelos = {
    arquivos: arquivos.map((a) => ({ caminho: a.caminho, nome: a.nome })),
  }
  const conteudos = new Map<number, Uint8Array<ArrayBuffer>>(),
    retratos = new Map<number, Uint8Array<ArrayBuffer>>()
  const preparados = await executar<ModelosPreparados>(
    'prepararModelos',
    async (url, req) => {
      if (url.pathname === '/pedido') return json(pedido)
      const entrada = /^\/entrada\/(\d+)$/.exec(url.pathname)
      if (entrada) {
        const a = arquivos[Number(entrada[1])]
        return a ? new Response(Bun.file(a.absoluto)) : null
      }
      const pronto = /^\/pronto\/(\d+)\/(conteudo|retrato)$/.exec(url.pathname)
      if (pronto && req.method === 'POST') {
        const bytes = new Uint8Array(await req.arrayBuffer())
        ;(pronto[2] === 'conteudo' ? conteudos : retratos).set(Number(pronto[1]), bytes)
        return new Response(null, { status: 204 })
      }
      return null
    },
    // Um pacote grande (FBX, ZIP com centenas de modelos) leva minutos para converter.
    600_000,
  )
  if (!preparados.prontos.length) return { trazidos: [], recusados: preparados.recusados }
  const modelos: ModeloParaImportar[] = preparados.prontos.map((p, i) => {
    const conteudo = conteudos.get(i),
      retrato = retratos.get(i)
    if (!conteudo || !retrato) throw Error(`A página não entregou o modelo ${p.nome}.`)
    return {
      nome: p.nome,
      pasta: p.pasta,
      etiquetas: p.etiquetas,
      conteudo,
      digest: p.digest,
      miniatura: new Blob([retrato], { type: p.tipoDoRetrato }),
      min: p.min,
      max: p.max,
      triangulos: p.triangulos,
    }
  })
  const importados = await host.importarModelos(bibliotecaId, modelos)
  const doDigest = new Map(modelos.map((m) => [m.digest, m]))
  return {
    trazidos: importados.map((m) => {
      const origem = doDigest.get(m.digest)
      const [x0, y0, z0] = origem?.min ?? [0, 0, 0],
        [x1, y1, z1] = origem?.max ?? [0, 0, 0]
      return {
        id: m.id,
        nome: m.nome,
        pasta: m.pasta,
        digest: m.digest,
        triangulos: origem?.triangulos ?? 0,
        medidas: { largura: x1 - x0, altura: y1 - y0, profundidade: z1 - z0 },
      }
    }),
    recusados: preparados.recusados,
  }
}

export interface OpcoesDaExportacao {
  destino: 'three' | 'glb' | 'raylib'
  /** Juntar peças estáticas (o Raylib sempre junta). */
  juntar?: boolean
  tamanhoDaRegiao?: number
  /** Revisão a exportar; sem ela, a atual. Mudou no meio: nada é exportado. */
  revisaoEsperada?: number
  /** Arquivo ou pasta de saída; sem ele, a pasta atual com o nome que a oficina daria. */
  saida?: string
}

/** Um caminho que ainda não existe: com o nome ocupado, acrescenta " (2)", " (3)"... */
function caminhoLivre(desejado: string): string {
  if (!existsSync(desejado)) return desejado
  const ext = extname(desejado),
    base = desejado.slice(0, desejado.length - ext.length)
  for (let n = 2; ; n++) {
    const outro = `${base} (${n})${ext}`
    if (!existsSync(outro)) return outro
  }
}

export async function exportarCenario(
  host: Pick<
    CenariosHost,
    | 'historicoDoCenario'
    | 'prepararExportacao'
    | 'conteudoDoModelo'
    | 'conteudoDaTextura'
    | 'conteudoDoTerreno'
  >,
  cenarioId: string,
  opcoes: OpcoesDaExportacao,
  executar: ExecutarPagina = paginaNoChrome(),
): Promise<ExportacaoFeita & { arquivo: string; destino: string; revisao: number }> {
  const revisao = opcoes.revisaoEsperada ?? (await host.historicoDoCenario(cenarioId)).revisao
  // O servidor confere a revisão e devolve o documento autorizado, como na oficina.
  const preparo = await host.prepararExportacao(cenarioId, revisao)
  const pedido: PedidoDeExportacao = {
    preparo,
    opcoes: {
      destino: opcoes.destino,
      juntar: opcoes.juntar ?? false,
      tamanhoDaRegiao: opcoes.tamanhoDaRegiao ?? 64,
    },
  }
  let pacote: Uint8Array | null = null
  const feito = await executar<ExportacaoFeita>(
    'exportarCenario',
    async (url, req) => {
      if (url.pathname === '/pedido') return json(pedido)
      if (url.pathname === '/resultado' && req.method === 'POST') {
        pacote = new Uint8Array(await req.arrayBuffer())
        return new Response(null, { status: 204 })
      }
      return rotasDoConteudo(host, cenarioId, preparo.espacoId, url)
    },
    // Compilar e empacotar um cenário grande leva minutos.
    900_000,
  )
  const bytes: Uint8Array | null = pacote
  if (!bytes) throw Error('A página não entregou o pacote exportado.')
  const pedidoDeSaida = opcoes.saida ? resolve(opcoes.saida) : resolve(feito.nome)
  const destinoNoDisco =
    existsSync(pedidoDeSaida) && statSync(pedidoDeSaida).isDirectory()
      ? join(pedidoDeSaida, feito.nome)
      : pedidoDeSaida
  if (!existsSync(dirname(destinoNoDisco)))
    throw Error(`A pasta ${dirname(destinoNoDisco)} não existe.`)
  const arquivo = caminhoLivre(destinoNoDisco)
  await Bun.write(arquivo, bytes)
  return { ...feito, arquivo, destino: opcoes.destino, revisao }
}
