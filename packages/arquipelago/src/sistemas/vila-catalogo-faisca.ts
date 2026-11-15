import type { PecaNaFaisca } from './composicao-faisca'

/** Fachadas estáticas feitas com as peças de construção existentes. Sem documento de casa/conta. */
export function casasDaVila(): PecaNaFaisca[] {
  const pecas: PecaNaFaisca[] = []
  for (const casa of [
    { id: 'vizinho-oeste', x: -16, z: 144, giro: Math.PI / 2, quatro: false },
    { id: 'vizinho-leste', x: 13, z: 124, giro: 0, quatro: false },
    { id: 'correio', x: -17, z: 123, giro: 0, quatro: true },
  ]) {
    const base = `${casa.id}-piso`,
      c = Math.cos(casa.giro),
      s = Math.sin(casa.giro)
    const por = (id: string, peca: string, x: number, y: number, z: number, giro = 0) =>
      pecas.push({
        id: `${casa.id}-${id}`,
        peca,
        x: casa.x + c * x + s * z,
        z: casa.z - s * x + c * z,
        giro: casa.giro + giro,
        escala: 1,
        solida: 'caixa',
        ...(id === 'piso' ? {} : { apoio: base, deslocamentoY: y }),
      })
    por('piso', 'morada_chao', -2, 0, 2)
    por('fundo', 'morada_parede', 2, 0, -2, Math.PI)
    por('lateral-oeste', 'morada_parede', -2, 0, -2, -Math.PI / 2)
    por('lateral-leste', 'morada_parede', 2, 0, 2, Math.PI / 2)
    por('entrada', 'morada_portal', -2, 0, 2)
    por('porta', 'morada_porta', -1, 0, 2)
    por('janela', 'morada_janela', 0, 0, 2)
    por('caixilho', 'morada_caixilho', 1, 0, 2)
    if (casa.quatro) {
      por('telhado-1', 'morada_telhado_quatro', -2, 3, 2)
      por('telhado-2', 'morada_telhado_quatro', 2, 3, -2, Math.PI)
    } else {
      for (let i = 0; i < 4; i++) por(`telha-${i}`, 'morada_telhado', -2 + i, 3, 2)
      por('oitao-oeste', 'morada_oitao', -2, 3, 2, Math.PI / 2)
      por('oitao-leste', 'morada_oitao', 2, 3, -2, -Math.PI / 2)
    }
  }
  return pecas
}
