import { z } from 'zod'
import { LADO_DA_PLANIFICACAO, type MoldeDeObjeto, TRIANGULOS_DO_OBJETO_CRIADO } from './objetos'

/** Proposta de orçamento por objeto: malha pequena e atlas de até 512 pontos. */
export const LIMITES_DA_APARENCIA = {
  glbBytes: 2 * 1024 * 1024,
  pngBytes: 256 * 1024,
  triangulos: TRIANGULOS_DO_OBJETO_CRIADO,
  ladoPintura: LADO_DA_PLANIFICACAO,
  ladoAtlas: 512,
} as const

/** Unidades da grade por célula do jogo. A oficina e o mundo usam a mesma régua. */
export const UNIDADES_DO_MOLDA_POR_CELULA = 16
/** Folga de uma unidade de cada lado na grade de 32 da oficina. */
export const MAIOR_LADO_DA_CAIXA_DO_MOLDA = 30

/** A mesma escala usada para abrir a caixa na grade do Molda. */
export function escalaDaCaixaDoMolda({ caixa }: MoldeDeObjeto): number {
  return Math.min(
    UNIDADES_DO_MOLDA_POR_CELULA,
    MAIOR_LADO_DA_CAIXA_DO_MOLDA / Math.max(caixa.largura, caixa.altura, caixa.fundo),
  )
}

/** Lê dimensões reais antes de entregar a imagem ao decodificador do navegador. */
export function tamanhoDoPng(bytes: Uint8Array): { largura: number; altura: number } | null {
  if (bytes.length < 33) return null
  const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  if (
    v.getUint32(0) !== 0x89504e47 ||
    v.getUint32(4) !== 0x0d0a1a0a ||
    v.getUint32(8) !== 13 ||
    v.getUint32(12) !== 0x49484452
  )
    return null
  const largura = v.getUint32(16)
  const altura = v.getUint32(20)
  return largura > 0 && altura > 0 ? { largura, altura } : null
}

/** GLB estático e autônomo. Conta instâncias, não confia num total enviado pela página. */
export function triangulosDoGlb(bytes: Uint8Array): number | null {
  try {
    if (bytes.length < 28 || bytes.length > LIMITES_DA_APARENCIA.glbBytes) return null
    const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
    if (
      v.getUint32(0, true) !== 0x46546c67 ||
      v.getUint32(4, true) !== 2 ||
      v.getUint32(8, true) !== bytes.length ||
      v.getUint32(16, true) !== 0x4e4f534a
    )
      return null
    const fim = 20 + v.getUint32(12, true)
    if (
      fim + 8 > bytes.length ||
      v.getUint32(fim + 4, true) !== 0x004e4942 ||
      fim + 8 + v.getUint32(fim, true) !== bytes.length
    )
      return null
    const g = JSON.parse(new TextDecoder().decode(bytes.subarray(20, fim)))
    // O exportador de modelos usa uma cena estática. Animações e extensões não entram pela porta.
    if (
      g.asset?.version !== '2.0' ||
      g.animations?.length ||
      g.skins?.length ||
      g.extensionsUsed?.length ||
      g.extensionsRequired?.length
    )
      return null
    if (
      !Array.isArray(g.buffers) ||
      g.buffers.length !== 1 ||
      g.buffers[0].uri !== undefined ||
      !Number.isInteger(g.buffers[0].byteLength) ||
      g.buffers[0].byteLength < 1 ||
      g.buffers[0].byteLength > bytes.length - fim - 8
    )
      return null
    if (
      !Array.isArray(g.nodes) ||
      g.nodes.length > 256 ||
      !Array.isArray(g.meshes) ||
      !Array.isArray(g.accessors) ||
      !Array.isArray(g.bufferViews)
    )
      return null
    for (const view of g.bufferViews) {
      if (
        view.buffer !== 0 ||
        !Number.isInteger(view.byteLength) ||
        view.byteLength < 0 ||
        !Number.isInteger(view.byteOffset ?? 0) ||
        (view.byteOffset ?? 0) < 0 ||
        (view.byteOffset ?? 0) + view.byteLength > g.buffers[0].byteLength
      )
        return null
    }
    if (g.scenes?.length !== 1 || (g.images?.length ?? 0) > 1 || g.accessors.length > 1024)
      return null
    for (const a of g.accessors) {
      const view = g.bufferViews[a.bufferView]
      const componentes = ({ SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 } as Record<string, number>)[
        a.type
      ]
      const unidade = ({ 5126: 4, 5125: 4, 5123: 2 } as Record<number, number>)[a.componentType]
      if (
        !view ||
        !componentes ||
        !unidade ||
        a.sparse ||
        !Number.isInteger(a.count) ||
        a.count < 1 ||
        a.count > LIMITES_DA_APARENCIA.triangulos * 3
      )
        return null
      const passo = view.byteStride ?? componentes * unidade
      const offset = a.byteOffset ?? 0
      if (
        !Number.isInteger(passo) ||
        passo < componentes * unidade ||
        passo > 252 ||
        !Number.isInteger(offset) ||
        offset < 0 ||
        offset + (a.count - 1) * passo + componentes * unidade > view.byteLength
      )
        return null
    }
    for (const image of g.images ?? []) {
      if (image.uri !== undefined || image.mimeType !== 'image/png') return null
      const view = g.bufferViews[image.bufferView]
      if (!view) return null
      const start = fim + 8 + (view.byteOffset ?? 0)
      const size = tamanhoDoPng(bytes.subarray(start, start + view.byteLength))
      if (!size || Math.max(size.largura, size.altura) > LIMITES_DA_APARENCIA.ladoAtlas) return null
    }
    // Sem referências repetidas/ciclos que multiplicariam a cena ou recursão no carregador.
    const usados = new Set<number>()
    const cena = g.scenes?.[g.scene ?? 0]
    if (!Array.isArray(cena?.nodes)) return null
    let total = 0
    const visitar = (i: number) => {
      if (!Number.isInteger(i) || i < 0 || usados.has(i) || !g.nodes[i])
        throw new Error('nó inválido')
      usados.add(i)
      const node = g.nodes[i]
      if (node.skin !== undefined || node.extensions) throw new Error('nó incompatível')
      if (node.mesh !== undefined) {
        const mesh = g.meshes[node.mesh]
        if (!Array.isArray(mesh?.primitives)) throw new Error('malha inválida')
        for (const p of mesh.primitives) {
          if ((p.mode ?? 4) !== 4 || p.extensions || p.targets)
            throw new Error('malha incompatível')
          const a = g.accessors[p.indices ?? p.attributes?.POSITION]
          const posicao = g.accessors[p.attributes?.POSITION]
          if (
            posicao?.type !== 'VEC3' ||
            posicao.componentType !== 5126 ||
            (p.indices !== undefined &&
              (a?.type !== 'SCALAR' || ![5123, 5125].includes(a.componentType)))
          )
            throw new Error('atributo inválido')
          if (!a || !Number.isInteger(a.count) || a.count <= 0 || a.count % 3)
            throw new Error('contagem inválida')
          total += a.count / 3
          if (total > LIMITES_DA_APARENCIA.triangulos) throw new Error('malha grande')
        }
      }
      for (const child of node.children ?? []) visitar(child)
    }
    for (const i of cena.nodes) visitar(i)
    return total > 0 && usados.size === g.nodes.length ? total : null
  } catch {
    return null
  }
}

const bytes = z.instanceof(Uint8Array)
export const AparenciaLidaSchema = z.discriminatedUnion('tipo', [
  z.strictObject({
    tipo: z.literal('molda'),
    bytes: bytes.refine((b) => triangulosDoGlb(b) !== null),
  }),
  z.strictObject({
    tipo: z.literal('pinta'),
    bytes: bytes.refine((b) => {
      const size = tamanhoDoPng(b)
      return (
        b.length <= LIMITES_DA_APARENCIA.pngBytes &&
        size !== null &&
        Math.max(size.largura, size.altura) <= LIMITES_DA_APARENCIA.ladoPintura
      )
    }),
  }),
])
export type AparenciaLida = z.infer<typeof AparenciaLidaSchema>
