/**
 * Conferência de um modelo `.glb` antes de entrar numa biblioteca. Pura: roda igual no
 * navegador (na importação) e no servidor (depois do envio).
 *
 * A biblioteca só guarda GLB simples e autocontido, porque é o que todos os destinos da
 * exportação abrem: o Estúdio e o Raylib não decodificam Draco, Meshopt nem KTX2.
 */
export const GLB_MAX_BYTES = 64 * 1024 * 1024

const EXTENSOES_RECUSADAS: Record<string, string> = {
  KHR_draco_mesh_compression: 'compressão Draco',
  EXT_meshopt_compression: 'compressão Meshopt',
  KHR_texture_basisu: 'texturas KTX2',
}

export class GlbInvalido extends Error {
  constructor(mensagem: string) {
    super(mensagem)
    this.name = 'GlbInvalido'
  }
}

export interface DescricaoDoGlb {
  bytes: number
  malhas: number
  materiais: number
  imagens: number
  animacoes: number
}

interface GltfJson {
  buffers?: { uri?: string }[]
  images?: { uri?: string }[]
  meshes?: unknown[]
  materials?: unknown[]
  animations?: unknown[]
  extensionsUsed?: string[]
  extensionsRequired?: string[]
}

export function conferirGlb(bytes: Uint8Array): DescricaoDoGlb {
  if (bytes.length < 20) throw new GlbInvalido('O arquivo não é um modelo GLB')
  if (bytes.length > GLB_MAX_BYTES) throw new GlbInvalido('O modelo passa de 64 MB')
  const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  if (v.getUint32(0, true) !== 0x46546c67) throw new GlbInvalido('O arquivo não é um modelo GLB')
  if (v.getUint32(4, true) !== 2) throw new GlbInvalido('Só o formato glTF 2.0 é aceito')
  if (v.getUint32(8, true) !== bytes.length || v.getUint32(16, true) !== 0x4e4f534a)
    throw new GlbInvalido('O arquivo GLB está incompleto')
  const tamanho = v.getUint32(12, true)
  if (tamanho > bytes.length - 20) throw new GlbInvalido('O arquivo GLB está incompleto')
  let gltf: GltfJson
  try {
    gltf = JSON.parse(
      new TextDecoder('utf-8', { fatal: true }).decode(bytes.subarray(20, 20 + tamanho)),
    )
  } catch {
    throw new GlbInvalido('O arquivo GLB está corrompido')
  }
  if (!gltf || typeof gltf !== 'object') throw new GlbInvalido('O arquivo GLB está corrompido')
  for (const r of [...(gltf.buffers ?? []), ...(gltf.images ?? [])])
    if (r?.uri && !r.uri.startsWith('data:'))
      throw new GlbInvalido('O modelo depende de arquivos de fora; ele precisa vir completo')
  for (const e of [...(gltf.extensionsRequired ?? []), ...(gltf.extensionsUsed ?? [])]) {
    const motivo = EXTENSOES_RECUSADAS[e]
    if (motivo) throw new GlbInvalido(`O modelo usa ${motivo}, que os jogos não abrem`)
  }
  if (!gltf.meshes?.length) throw new GlbInvalido('O modelo não tem nenhuma forma 3D')
  return {
    bytes: bytes.length,
    malhas: gltf.meshes.length,
    materiais: gltf.materials?.length ?? 0,
    imagens: gltf.images?.length ?? 0,
    animacoes: gltf.animations?.length ?? 0,
  }
}

/** SHA-256 em hexadecimal: o endereço do arquivo na biblioteca. */
export async function digestDosBytes(bytes: Uint8Array): Promise<string> {
  const copia = new Uint8Array(bytes)
  const hash = await crypto.subtle.digest('SHA-256', copia)
  return Array.from(new Uint8Array(hash), (n) => n.toString(16).padStart(2, '0')).join('')
}
