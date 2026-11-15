export interface PontoMedido {
  x: number
  y: number
  z: number
}
export interface MedicaoDePercurso {
  estado: 'aguardando' | 'medindo' | 'concluida' | 'cancelada'
  metros: number
  segundos: number
  inicio: number
  origem: { x: number; z: number }
  alvo: { x: number; z: number }
  ultimo: PontoMedido | null
}
export function criarMedicao(
  origem: { x: number; z: number },
  alvo: { x: number; z: number },
): MedicaoDePercurso {
  return { estado: 'aguardando', metros: 0, segundos: 0, inicio: 0, origem, alvo, ultimo: null }
}
/** Relógio recebido é de tempo ativo; mudanças grandes de posição são teleporte, não percurso. */
export function amostrarMedicao(
  m: MedicaoDePercurso,
  p: PontoMedido,
  tempo: number,
  carregando: boolean,
): void {
  if (m.estado === 'cancelada' || m.estado === 'concluida' || carregando) return
  if (m.estado === 'aguardando') {
    if (Math.hypot(p.x - m.origem.x, p.z - m.origem.z) > 0.6) return
    m.estado = 'medindo'
    m.inicio = tempo
    m.ultimo = { ...p }
    return
  }
  const distancia = Math.hypot(p.x - m.ultimo!.x, p.y - m.ultimo!.y, p.z - m.ultimo!.z)
  if (distancia > 8) {
    m.estado = 'cancelada'
    return
  }
  m.metros += distancia
  m.segundos = tempo - m.inicio
  m.ultimo = { ...p }
  if (m.metros > 1 && Math.hypot(p.x - m.alvo.x, p.z - m.alvo.z) < 0.5) m.estado = 'concluida'
}
