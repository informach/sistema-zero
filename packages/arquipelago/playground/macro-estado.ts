import {
  ARQUIPELAGO,
  alturaDoTerritorio,
  ilhaDoArquipelago,
  type PontoDoTerritorio,
  paraGlobal,
  type TerritorioId,
  VERSAO_DA_GEOGRAFIA,
} from '../src/sistemas/geografia-do-arquipelago'

export const CHAVE_DO_ENSAIO = 'arquipelago:macro:ensaio'
export interface EnsaioMacro {
  versao: number
  ponteInstalada: boolean
  posicao: { ilha: TerritorioId; local: PontoDoTerritorio }
}
export function ensaioInicial(): EnsaioMacro {
  const ilha = ilhaDoArquipelago('sua-ilha')
  return {
    versao: VERSAO_DA_GEOGRAFIA,
    ponteInstalada: false,
    posicao: { ilha: ilha.id, local: { x: 0, y: alturaDoTerritorio(ilha, 0, 60), z: 60 } },
  }
}
export function lerEnsaio(bruto: string | null): EnsaioMacro {
  if (bruto === null) return ensaioInicial()
  let v: unknown
  try {
    v = JSON.parse(bruto)
  } catch {
    throw new Error('O ensaio guardado está ilegível. Recomece este ensaio.')
  }
  if (
    typeof v !== 'object' ||
    v === null ||
    !('versao' in v) ||
    v.versao !== VERSAO_DA_GEOGRAFIA ||
    !('ponteInstalada' in v) ||
    typeof v.ponteInstalada !== 'boolean' ||
    !('posicao' in v)
  )
    throw new Error('O ensaio guardado não pertence a esta geografia.')
  const p = v.posicao
  if (typeof p !== 'object' || p === null || !('ilha' in p) || !('local' in p))
    throw new Error('O ensaio não tem uma posição válida.')
  const ilha = ARQUIPELAGO.find((i) => i.id === p.ilha)
  const local = p.local
  if (
    !ilha ||
    typeof local !== 'object' ||
    local === null ||
    !('x' in local) ||
    !('y' in local) ||
    !('z' in local) ||
    typeof local.x !== 'number' ||
    typeof local.y !== 'number' ||
    typeof local.z !== 'number' ||
    ![local.x, local.y, local.z].every(Number.isFinite) ||
    alturaDoTerritorio(ilha, local.x, local.z) <= 0 ||
    (ilha.id === 'bosque' && !v.ponteInstalada)
  )
    throw new Error('A posição guardada não tem chão acessível.')
  return {
    versao: VERSAO_DA_GEOGRAFIA,
    ponteInstalada: v.ponteInstalada,
    posicao: {
      ilha: ilha.id,
      local: { x: local.x, y: alturaDoTerritorio(ilha, local.x, local.z), z: local.z },
    },
  }
}
export function partidaDoEnsaio(ensaio: EnsaioMacro, centroAoPe: number): PontoDoTerritorio {
  const p = paraGlobal(ilhaDoArquipelago(ensaio.posicao.ilha), ensaio.posicao.local)
  return { ...p, y: p.y + centroAoPe + 0.25 }
}
