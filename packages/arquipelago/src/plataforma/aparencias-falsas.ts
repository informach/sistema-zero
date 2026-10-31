import {
  CATALOGO_DE_OBJETOS,
  type ObjetoDaCasa,
  type Plataforma,
  planificacaoDoMolde,
} from '@sistemazero/arquipelago-contracts'
import plantaGlb from '../assets/objetos/planta-interior.glb'

/** Exemplo reaproveitado da arte existente. Só converte a unidade do jogo para a grade da oficina. */
function naGradeDoMolda(bytes: Uint8Array): Uint8Array<ArrayBuffer> {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const fim = 20 + view.getUint32(12, true)
  const json = JSON.parse(new TextDecoder().decode(bytes.subarray(20, fim)))
  for (const i of json.scenes[json.scene ?? 0].nodes) {
    const node = json.nodes[i]
    node.scale = (node.scale ?? [1, 1, 1]).map((n: number) => n * 16)
    if (node.translation) node.translation = node.translation.map((n: number) => n * 16)
  }
  const texto = new TextEncoder().encode(JSON.stringify(json))
  const tamanho = Math.ceil(texto.length / 4) * 4
  const saida = new Uint8Array(20 + tamanho + bytes.length - fim)
  saida.set(bytes.subarray(0, 20))
  saida.fill(32, 20, 20 + tamanho)
  saida.set(texto, 20)
  saida.set(bytes.subarray(fim), 20 + tamanho)
  const cabecalho = new DataView(saida.buffer)
  cabecalho.setUint32(8, saida.length, true)
  cabecalho.setUint32(12, tamanho, true)
  return saida
}

export const lerAparenciaFalsa: NonNullable<Plataforma['lerAparencia']> = async (id, signal) => {
  signal?.throwIfAborted()
  if (id.endsWith('-molda')) {
    const r = await fetch(new URL(plantaGlb, import.meta.url).href, { signal })
    if (!r.ok) return null
    return { tipo: 'molda', bytes: naGradeDoMolda(new Uint8Array(await r.arrayBuffer())) }
  }
  if (!id.endsWith('-pinta')) return null
  // `molde-<objeto>-pinta` (feita agora) ou `conta-<objeto>-pinta` (uma das criações da conta).
  const objeto = id.replace(/^(?:molde|conta)-/, '').slice(0, -'-pinta'.length) as ObjetoDaCasa
  const molde = CATALOGO_DE_OBJETOS[objeto]?.molde
  const plan = molde && planificacaoDoMolde(molde)
  if (!plan) return null
  const canvas = document.createElement('canvas')
  canvas.width = plan.largura
  canvas.height = plan.altura
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  const cores = ['#ffd166', '#ef476f', '#06d6a0', '#118ab2']
  plan.faces.forEach((f, i) => {
    ctx.fillStyle = cores[i % cores.length] ?? '#ffffff'
    ctx.fillRect(f.x, f.y, f.largura, f.altura)
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(f.x + 4, f.y + 4, 7, 12)
  })
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/png'))
  signal?.throwIfAborted()
  return blob ? { tipo: 'pinta', bytes: new Uint8Array(await blob.arrayBuffer()) } : null
}

/**
 * As criações da conta que cabem no molde (A30), no playground: uma do Pinta quando o molde tem
 * faces e uma do Molda, com ids que `lerAparenciaFalsa` desenha.
 */
export const listarCriacoesQueCabemFalsas: NonNullable<
  Plataforma['listarCriacoesQueCabem']
> = async (molde, signal) => {
  signal?.throwIfAborted()
  return [
    ...(planificacaoDoMolde(molde)
      ? [
          {
            ferramenta: 'pinta' as const,
            id: `conta-${molde.objeto}-pinta`,
            nome: `${molde.nome} de listras`,
            miniatura: null,
          },
        ]
      : []),
    {
      ferramenta: 'molda' as const,
      id: `conta-${molde.objeto}-molda`,
      nome: `${molde.nome} redonda`,
      miniatura: null,
    },
  ]
}
