import { Matrix4, Quaternion, Vector3 } from 'three'
import { criarGrade, type Grade } from '../sistemas/caminho'
import type { ColisorDaIlha } from './colisores-da-ilha'

/**
 * Onde um bicho cabe no chão de uma ilha completa (no referencial do modelo): fora dos colisores
 * que ficam na altura dele (o que está lá em cima, como deques e pontes, não conta) e dentro do
 * tampo. É a pergunta que a grade do caminho (`sistemas/caminho.ts`) faz a cada casa.
 */
export function chaoLivre(
  colisores: readonly ColisorDaIlha[],
  opcoes: {
    /** O tampo da ilha (y do chão). */
    chao: number
    /** O raio do bicho (a folga em volta dos colisores). */
    raio: number
    /** A altura do bicho: colisor acima disto não atrapalha. */
    altura: number
    /** O raio do tampo onde dá para andar (centro na origem do modelo). */
    raioDaIlha: number
  },
): (x: number, z: number) => boolean {
  const formas = colisores
    .filter((c): c is Exclude<ColisorDaIlha, { forma: 'malha' }> => c.forma !== 'malha')
    .map((c) => {
      const inversa = new Matrix4()
        .compose(new Vector3(...c.posicao), new Quaternion(...c.rotacao), new Vector3(1, 1, 1))
        .invert()
      return { c, inversa }
    })
  const local = new Vector3()
  const meioDoBicho = opcoes.chao + opcoes.altura / 2
  return (x, z) => {
    if (Math.hypot(x, z) > opcoes.raioDaIlha) return false
    for (const { c, inversa } of formas) {
      local.set(x, meioDoBicho, z).applyMatrix4(inversa)
      if (c.forma === 'caixa') {
        if (
          Math.abs(local.x) < c.meio[0] + opcoes.raio &&
          Math.abs(local.y) < c.meio[1] + opcoes.altura / 2 &&
          Math.abs(local.z) < c.meio[2] + opcoes.raio
        )
          return false
      } else if (
        Math.hypot(local.x, local.z) < c.raio + opcoes.raio &&
        Math.abs(local.y) < c.meiaAltura + opcoes.altura / 2
      )
        return false
    }
    return true
  }
}

/** O que um bicho atravessa no caminho (folhagem macia); o resto ele contorna. */
export const MACIOS_PARA_O_BICHO = ['col-cil-moita-', 'col-cil-cogumelo-'] as const
/** O bicho no chão, para a grade do caminho. */
export const CORPO_DO_BICHO = { raio: 0.25, altura: 0.6 } as const
/** A grade cobre a ilha toda (13 m para cada lado do centro), em casas de 25 cm. */
const GRADE_DA_ILHA = { meio: 13, passo: 0.25, raioDoTampo: 12 } as const

/** A grade do chão de uma ilha completa para o caminho dos bichos (custa uns 50 a 90 ms). */
export function gradeDoBicho(colisores: readonly ColisorDaIlha[], chao: number): Grade {
  const livre = chaoLivre(
    colisores.filter((c) => !MACIOS_PARA_O_BICHO.some((m) => c.nome.startsWith(m))),
    {
      chao,
      raio: CORPO_DO_BICHO.raio,
      altura: CORPO_DO_BICHO.altura,
      raioDaIlha: GRADE_DA_ILHA.raioDoTampo,
    },
  )
  const m = GRADE_DA_ILHA.meio
  return criarGrade({ x: -m, z: -m }, { x: m, z: m }, GRADE_DA_ILHA.passo, livre)
}
