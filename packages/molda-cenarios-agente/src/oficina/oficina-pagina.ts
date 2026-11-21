import {
  type OpcoesDoArquivo,
  prepararArquivoDaExportacao,
} from '@sistemazero/molda-cenarios/exportar/preparar'
import { encerrarPreparacao, prepararArquivos } from '@sistemazero/molda-cenarios/oficina/importar'
import type { PreparoDeExportacao } from '@sistemazero/molda-cenarios-core/compilar'

/**
 * A página sem janela que faz, para o agente, o que a oficina faz no navegador ao trazer modelos
 * e ao exportar: o MESMO código (conversão de formatos, conferência, retrato, compilação e
 * pacotes). Ela só fala com o servidor local do agente; o token fica no processo do agente.
 */

export interface PedidoDeModelos {
  arquivos: { caminho: string; nome: string }[]
}
export interface ModeloPreparado {
  nome: string
  pasta: string
  etiquetas: string[]
  digest: string
  min: [number, number, number]
  max: [number, number, number]
  triangulos: number
  tipoDoRetrato: string
}
export interface ModelosPreparados {
  prontos: ModeloPreparado[]
  recusados: { arquivo: string; motivo: string }[]
}
export interface PedidoDeExportacao {
  preparo: PreparoDeExportacao
  opcoes: OpcoesDoArquivo
}
export interface ExportacaoFeita {
  nome: string
  bytes: number
  medidas: { malhas: number; triangulos: number; recursos: number; bytesDosRecursos: number }
  avisos: string[]
}

async function ler(endereco: string, sinal?: AbortSignal): Promise<ArrayBuffer> {
  const resposta = await fetch(endereco, sinal ? { signal: sinal } : {})
  if (!resposta.ok)
    throw Error(`Não consegui ler ${endereco} (${resposta.status}): ${await resposta.text()}`)
  return resposta.arrayBuffer()
}
async function enviar(endereco: string, corpo: Blob | Uint8Array) {
  const resposta = await fetch(endereco, {
    method: 'POST',
    body: corpo instanceof Blob ? corpo : new Blob([corpo.slice()]),
  })
  if (!resposta.ok) throw Error(`Não consegui entregar ${endereco} (${resposta.status}).`)
}
const lerJson = async <T>(endereco: string): Promise<T> =>
  JSON.parse(new TextDecoder().decode(await ler(endereco))) as T

async function prepararModelosNaPagina(): Promise<ModelosPreparados> {
  const pedido = await lerJson<PedidoDeModelos>('/pedido')
  const entradas = []
  for (const [i, a] of pedido.arquivos.entries())
    entradas.push({ caminho: a.caminho, arquivo: new File([await ler(`/entrada/${i}`)], a.nome) })
  try {
    const r = await prepararArquivos(entradas)
    const prontos: ModeloPreparado[] = []
    for (const [i, p] of r.prontos.entries()) {
      // O conteúdo e o retrato voltam ao agente por aqui; ele é quem envia à biblioteca.
      await enviar(`/pronto/${i}/conteudo`, p.conteudo)
      await enviar(`/pronto/${i}/retrato`, p.miniatura)
      prontos.push({
        nome: p.nome,
        pasta: p.pasta,
        etiquetas: p.etiquetas,
        digest: p.digest,
        min: p.min,
        max: p.max,
        triangulos: p.triangulos,
        tipoDoRetrato: p.miniatura.type,
      })
    }
    return { prontos, recusados: r.recusados }
  } finally {
    await encerrarPreparacao()
  }
}

async function exportarNaPagina(): Promise<ExportacaoFeita> {
  const { preparo, opcoes } = await lerJson<PedidoDeExportacao>('/pedido')
  const r = await prepararArquivoDaExportacao(
    {
      conteudoDoModelo: (m, sinal) =>
        ler(`/modelo?biblioteca=${encodeURIComponent(m.biblioteca)}&digest=${m.digest}`, sinal),
      conteudoDaTextura: (t, sinal) =>
        ler(`/textura?biblioteca=${encodeURIComponent(t.biblioteca)}&digest=${t.digest}`, sinal),
      conteudoDoTerreno: (_cenario, digest, sinal) => ler(`/terreno/${digest}`, sinal),
    },
    preparo,
    opcoes,
    new AbortController().signal,
    () => {},
  )
  await enviar('/resultado', r.blob)
  return { nome: r.nome, bytes: r.blob.size, medidas: r.medidas, avisos: r.avisos }
}

declare global {
  /** As pontes com o agente: ele chama pela página do Chromium e recebe o resumo. */
  var prepararModelos: (() => Promise<ModelosPreparados>) | undefined
  var exportarCenario: (() => Promise<ExportacaoFeita>) | undefined
}
globalThis.prepararModelos = prepararModelosNaPagina
globalThis.exportarCenario = exportarNaPagina
