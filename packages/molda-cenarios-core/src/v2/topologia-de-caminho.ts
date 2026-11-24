import { CenarioInvalido, poligonoSimples } from '../validacao'
import { medirCurva, type Polilinha, suavizarCurva } from './curvas'
import type { CaminhoDeCenario } from './documento'

/** Também usada na validação do documento, sem gerar malhas ou amostrar terreno. */
export function errosDaTopologiaDoCaminho(c: CaminhoDeCenario): string[] {
  const erros: string[] = []
  if (
    c.pontos.some(
      (p, i) => i > 0 && Math.hypot(p.x - c.pontos[i - 1]!.x, p.z - c.pontos[i - 1]!.z) < 1e-6,
    )
  )
    erros.push(`Pontos repetidos: ${c.id}`)
  if ((c.tipo === 'cerca' || c.tipo === 'muro') && !c.fechada) {
    const a = c.pontos[0]!,
      b = c.pontos.at(-1)!
    if (Math.hypot(a.x - b.x, a.z - b.z) < 1e-6)
      erros.push(`Marque a curva como fechada em vez de repetir o primeiro apoio: ${c.id}`)
  }
  // Transladar primeiro evita cancelamento de área em polígonos pequenos longe da origem.
  if (c.tipo === 'praca') {
    const origem = c.pontos[0]!
    if (!poligonoSimples(c.pontos.map((p) => ({ x: p.x - origem.x, z: p.z - origem.z }))))
      erros.push(`Contorno de praça inválido: ${c.id}`)
  }
  return erros
}

/** Mesmo eixo para preparo, malhas, módulos e edição. O documento conserva os controles. */
export function curvaDoCaminho(c: CaminhoDeCenario): Polilinha {
  const erros = errosDaTopologiaDoCaminho(c)
  if (erros.length) throw new CenarioInvalido(erros)
  const fechada = c.tipo === 'praca' || (c.fechada ?? false)
  const curva = c.suave
    ? suavizarCurva(c.pontos, { fechada, passo: 0.5 })
    : medirCurva(c.pontos, fechada)
  if (c.tipo === 'praca') {
    if (curva.pontos.length > 4096)
      throw new CenarioInvalido([
        'A praça suavizada exige pontos demais. Reduza os controles ou divida a área.',
      ])
    const origem = curva.pontos[0]!
    if (!poligonoSimples(curva.pontos.map((p) => ({ x: p.x - origem.x, z: p.z - origem.z }))))
      throw new CenarioInvalido([
        'A curva da praça se cruza. Ajuste os controles ou desative a suavização.',
      ])
  }
  return curva
}
