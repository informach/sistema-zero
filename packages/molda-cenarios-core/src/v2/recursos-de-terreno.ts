import { z } from 'zod'
import { lerPecaDePintura } from './pintura-de-chao'
import {
  type BaseDeTerreno,
  BYTES_DA_PECA,
  CELULAS_DA_PECA,
  LADO_DAS_AMOSTRAS,
  lerPecaDeAlturas,
  type PecaDeAlturas,
  TerrenoInvalido,
} from './terreno'

const intervalo = z
  .object({ min: z.number().finite().min(-10000), max: z.number().finite().max(10000) })
  .strict()
  .refine((v) => v.max > v.min, 'O intervalo do terreno é inválido')
/** Mantém a prova SZHT existente; os demais formatos têm discriminador explícito. */
export const MetadadosDeTerrenoSchema = z.union([
  intervalo,
  z.object({ tipo: z.literal('pintura'), camadas: z.number().int().min(1).max(8) }).strict(),
  z.object({ tipo: z.literal('buracos') }).strict(),
])
export type MetadadosDeTerreno = z.infer<typeof MetadadosDeTerrenoSchema>
export const MAX_BYTES_RECURSO_TERRENO = 8 + LADO_DAS_AMOSTRAS ** 2 * 8
export const BYTES_BURACOS_TERRENO = 8 + CELULAS_DA_PECA ** 2 / 8
export const MAX_RECURSOS_TERRENO = 4096 * 3
export const TAMANHOS_RECURSO_TERRENO = [
  BYTES_DA_PECA,
  BYTES_BURACOS_TERRENO,
  ...Array.from({ length: 8 }, (_, i) => 8 + LADO_DAS_AMOSTRAS ** 2 * (i + 1)),
]
const MAGIC_BURACOS = 0x4f485a53 // SZHO

export type RecursoDeTerreno =
  | { tipo: 'alturas'; metadados: { min: number; max: number }; alturas: PecaDeAlturas }
  | { tipo: 'pintura'; metadados: { tipo: 'pintura'; camadas: number }; pesos: Uint8Array }
  | { tipo: 'buracos'; metadados: { tipo: 'buracos' }; bits: Uint8Array }

export function codificarRecursoDeBuracos(bits: Uint8Array): Uint8Array<ArrayBuffer> {
  if (bits.byteLength !== BYTES_BURACOS_TERRENO - 8)
    throw new TerrenoInvalido('O mapa de buracos é inválido')
  const bytes = new Uint8Array(BYTES_BURACOS_TERRENO),
    v = new DataView(bytes.buffer)
  v.setUint32(0, MAGIC_BURACOS, true)
  v.setUint8(4, 1)
  v.setUint8(5, CELULAS_DA_PECA)
  bytes.set(bits, 8)
  return bytes
}

/** O formato vem do cabeçalho validado, nunca do nome do arquivo ou de uma declaração do cliente. */
export function lerRecursoDeTerreno(bytes: Uint8Array): RecursoDeTerreno {
  if (bytes.byteLength < 8 || bytes.byteLength > MAX_BYTES_RECURSO_TERRENO)
    throw new TerrenoInvalido('O tamanho do recurso de terreno é inválido')
  const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength),
    magic = v.getUint32(0, true)
  if (magic === 0x54485a53) {
    const alturas = lerPecaDeAlturas(bytes)
    return { tipo: 'alturas', metadados: { min: alturas.min, max: alturas.max }, alturas }
  }
  if (magic === 0x50485a53) {
    const pintura = lerPecaDePintura(bytes)
    return {
      tipo: 'pintura',
      metadados: { tipo: 'pintura', camadas: pintura.camadas },
      pesos: pintura.pesos,
    }
  }
  if (
    magic === MAGIC_BURACOS &&
    bytes.byteLength === BYTES_BURACOS_TERRENO &&
    v.getUint8(4) === 1 &&
    v.getUint8(5) === CELULAS_DA_PECA &&
    v.getUint16(6) === 0
  )
    return { tipo: 'buracos', metadados: { tipo: 'buracos' }, bits: bytes.slice(8) }
  throw new TerrenoInvalido('O formato do recurso de terreno é inválido')
}

export function conferirMetadadosDoTerreno(
  entrada: unknown,
  bytes: number,
): entrada is MetadadosDeTerreno {
  const resultado = MetadadosDeTerrenoSchema.safeParse(entrada)
  if (!resultado.success) return false
  const m = resultado.data
  return (
    bytes ===
    ('min' in m
      ? BYTES_DA_PECA
      : m.tipo === 'buracos'
        ? BYTES_BURACOS_TERRENO
        : 8 + LADO_DAS_AMOSTRAS ** 2 * m.camadas)
  )
}

export function referenciasDoTerreno(
  base: BaseDeTerreno,
): { digest: string; esperado: MetadadosDeTerreno }[] {
  return [
    ...base.pecas.map((p) => ({ digest: p.digest, esperado: { min: base.min, max: base.max } })),
    ...(base.solo?.pecas.map((p) => ({
      digest: p.digest,
      esperado: { tipo: 'pintura' as const, camadas: base.solo!.camadas.length },
    })) ?? []),
    ...(base.buracos?.map((p) => ({ digest: p.digest, esperado: { tipo: 'buracos' as const } })) ??
      []),
  ]
}

export function metadadosDoTerrenoCorrespondem(
  entrada: unknown,
  esperado: MetadadosDeTerreno,
): boolean {
  const r = MetadadosDeTerrenoSchema.safeParse(entrada)
  if (!r.success) return false
  const m = r.data
  if ('min' in esperado) return 'min' in m && m.min === esperado.min && m.max === esperado.max
  return (
    'tipo' in m &&
    m.tipo === esperado.tipo &&
    (esperado.tipo !== 'pintura' || (m.tipo === 'pintura' && m.camadas === esperado.camadas))
  )
}
