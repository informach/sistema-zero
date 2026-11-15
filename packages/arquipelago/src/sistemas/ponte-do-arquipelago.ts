import type { ConexaoDoArquipelago } from './geografia-do-arquipelago'

export const COMPRIMENTO_DO_MODULO = 6
export const SEGUNDOS_PARA_RECONSTRUIR = 8
export type EstadoDaPonte = 'quebrada' | 'reconstruindo' | 'aberta'

/** Instalação e animação são fatos distintos. Nenhuma leitura da Jornada abre a conexão. */
export function estadoDaPonte(
  instalado: boolean,
  inicio: number | null,
  agora: number,
): EstadoDaPonte {
  if (!instalado) return 'quebrada'
  return inicio !== null && agora - inicio < SEGUNDOS_PARA_RECONSTRUIR ? 'reconstruindo' : 'aberta'
}

export function modulosDaPonte(ponte: ConexaoDoArquipelago) {
  const dx = ponte.destino.x - ponte.origem.x
  const dy = ponte.destino.y - ponte.origem.y
  const dz = ponte.destino.z - ponte.origem.z
  const comprimentoTotal = Math.hypot(ponte.comprimento, dy)
  const total = Math.ceil(comprimentoTotal / COMPRIMENTO_DO_MODULO)
  return Array.from({ length: total }, (_, i) => {
    const t = (i + 0.5) / total
    return {
      x: ponte.origem.x + dx * t,
      y: ponte.origem.y + dy * t,
      z: ponte.origem.z + dz * t,
      giro: Math.atan2(dx, dz),
      inclinacao: -Math.atan2(dy, ponte.comprimento),
      comprimento: comprimentoTotal / total,
      largura: ponte.largura,
      ordem: i,
    }
  })
}
