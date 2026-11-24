/**
 * Conferência de um modelo `.glb` antes de entrar numa biblioteca. Pura: roda igual no
 * navegador (na importação) e no servidor (depois do envio).
 *
 * A biblioteca só guarda GLB simples e autocontido, porque é o que todos os destinos da
 * exportação abrem: o Estúdio e o Raylib não decodificam Draco, Meshopt nem KTX2.
 */
export const GLB_MAX_BYTES = 64 * 1024 * 1024
/** O servidor guarda só este prefixo ao conferir o arquivo em stream. */
export const GLB_MAX_JSON_BYTES = 8 * 1024 * 1024

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

function lista(valor: unknown): Record<string, unknown>[] {
  if (valor === undefined) return []
  if (
    !Array.isArray(valor) ||
    valor.length > 65536 ||
    valor.some((v) => !v || typeof v !== 'object' || Array.isArray(v))
  )
    throw new GlbInvalido('As tabelas do modelo GLB estão corrompidas')
  return valor
}

/** Quantos bytes iniciais são necessários, antes de alocar o espaço do JSON. */
export function tamanhoDoInicioGlb(bytes: Uint8Array): number {
  if (bytes.length < 20) throw new GlbInvalido('O arquivo não é um modelo GLB')
  const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  if (v.getUint32(0, true) !== 0x46546c67) throw new GlbInvalido('O arquivo não é um modelo GLB')
  if (v.getUint32(4, true) !== 2) throw new GlbInvalido('Só o formato glTF 2.0 é aceito')
  if (v.getUint32(16, true) !== 0x4e4f534a) throw new GlbInvalido('O arquivo GLB está incompleto')
  const tamanho = v.getUint32(12, true)
  if (tamanho > GLB_MAX_JSON_BYTES) throw new GlbInvalido('Os metadados do modelo passam de 8 MB')
  if (tamanho % 4 !== 0 || tamanho > v.getUint32(8, true) - 20)
    throw new GlbInvalido('O arquivo GLB está incompleto')
  return tamanho + 20
}

/** Confere o prefixo JSON usando o tamanho REAL do arquivo, medido por quem lê o stream. */
export function conferirInicioGlb(bytes: Uint8Array, tamanhoTotal: number): DescricaoDoGlb {
  if (!Number.isSafeInteger(tamanhoTotal) || tamanhoTotal > GLB_MAX_BYTES)
    throw new GlbInvalido('O modelo passa de 64 MB')
  const inicio = tamanhoDoInicioGlb(bytes)
  if (
    inicio > bytes.length ||
    new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(8, true) !==
      tamanhoTotal
  )
    throw new GlbInvalido('O arquivo GLB está incompleto')
  let valor: unknown
  try {
    valor = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes.subarray(20, inicio)))
  } catch {
    throw new GlbInvalido('O arquivo GLB está corrompido')
  }
  if (!valor || typeof valor !== 'object' || Array.isArray(valor))
    throw new GlbInvalido('O arquivo GLB está corrompido')
  const gltf = valor as Record<string, unknown>
  for (const r of [...lista(gltf.buffers), ...lista(gltf.images)]) {
    if (r.uri !== undefined && typeof r.uri !== 'string')
      throw new GlbInvalido('O recurso do modelo tem formato inválido')
    if (typeof r.uri === 'string' && !r.uri.startsWith('data:'))
      throw new GlbInvalido('O modelo depende de arquivos de fora; ele precisa vir completo')
  }
  const extensoes = [gltf.extensionsRequired, gltf.extensionsUsed].flatMap((v) => {
    if (v === undefined) return []
    if (!Array.isArray(v) || v.length > 1024 || v.some((e) => typeof e !== 'string'))
      throw new GlbInvalido('As extensões do modelo têm formato inválido')
    return v
  })
  for (const e of extensoes) {
    const motivo = EXTENSOES_RECUSADAS[e]
    if (motivo) throw new GlbInvalido(`O modelo usa ${motivo}, que os jogos não abrem`)
  }
  const malhas = lista(gltf.meshes)
  if (!malhas.length) throw new GlbInvalido('O modelo não tem nenhuma forma 3D')
  return {
    bytes: tamanhoTotal,
    malhas: malhas.length,
    materiais: lista(gltf.materials).length,
    imagens: lista(gltf.images).length,
    animacoes: lista(gltf.animations).length,
  }
}

export function conferirGlb(bytes: Uint8Array): DescricaoDoGlb {
  const descricao = conferirInicioGlb(bytes, bytes.byteLength)
  const inicio = tamanhoDoInicioGlb(bytes)
  if (inicio < bytes.byteLength)
    conferirBlocoBinarioGlb(bytes.subarray(inicio, inicio + 8), bytes.byteLength - inicio)
  return descricao
}

/** Só um BIN opcional depois do JSON. O stream pode pular seu corpo sem guardá-lo. */
export function conferirBlocoBinarioGlb(cabecalho: Uint8Array, restante: number): void {
  if (cabecalho.byteLength !== 8 || restante < 8)
    throw new GlbInvalido('O bloco binário GLB está incompleto')
  const v = new DataView(cabecalho.buffer, cabecalho.byteOffset, cabecalho.byteLength)
  if (
    v.getUint32(4, true) !== 0x004e4942 ||
    v.getUint32(0, true) + 8 !== restante ||
    v.getUint32(0, true) % 4 !== 0
  )
    throw new GlbInvalido('O bloco binário GLB tem formato inválido')
}

/** SHA-256 em hexadecimal: o endereço do arquivo na biblioteca. */
export async function digestDosBytes(bytes: Uint8Array): Promise<string> {
  const copia = new Uint8Array(bytes)
  const hash = await crypto.subtle.digest('SHA-256', copia)
  return Array.from(new Uint8Array(hash), (n) => n.toString(16).padStart(2, '0')).join('')
}
