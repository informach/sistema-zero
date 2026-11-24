import type { DocumentoDeCenario, InstanciaDeCenario, Transformacao } from './documento'
export function escalaUniformeDoGesto(eixos: { x: number; y: number; z: number }, inicial: number) {
  const valor = [eixos.x, eixos.y, eixos.z].reduce(
    (atual, v) => (Math.abs(v - inicial) > Math.abs(atual - inicial) ? v : atual),
    inicial,
  )
  return Math.max(0.01, Math.min(100, Math.abs(valor)))
}

/** Converte um gesto em coordenadas de mundo para a intenção de apoio já existente. */
export function apoioDepoisDeTransformar(
  p: InstanciaDeCenario,
  t: Transformacao,
  antes: Transformacao,
  doc: DocumentoDeCenario,
): InstanciaDeCenario['apoio'] {
  const apoio = structuredClone(p.apoio)
  if (apoio.tipo === 'terreno' || apoio.tipo === 'objeto')
    apoio.deslocamento += t.posicao.y - antes.posicao.y
  if (apoio.tipo === 'agua') {
    const a = doc.aguas.find((a) => a.id === apoio.agua)
    if (!a) throw Error('Água de apoio ausente')
    const dx = (t.posicao.x - a.centro.x) / a.escala,
      dz = (t.posicao.z - a.centro.z) / a.escala,
      c = Math.cos(a.giro),
      s = Math.sin(a.giro)
    apoio.local = { x: c * dx - s * dz, z: s * dx + c * dz }
    apoio.deslocamento = (t.posicao.y - a.nivel) / a.escala
    apoio.giro = t.rotacao.y - a.giro
    apoio.escala = t.escala / a.escala
  }
  return apoio
}
