import { type Object3D, Quaternion, Vector3 } from 'three'
import type { ColisorDaIlha } from './colisores-da-ilha'
import { alturaDaIlha } from './medidas'

/** Onde o cavalete fica e para onde olha, no espaço do grupo que o monta. */
export interface LugarDoQuadro {
  x: number
  y: number
  z: number
  giro: number
}

/**
 * O Quadro das Cores da sua ilha (C03a, 30/10/2026): os desafios do Faísca, com o Pega-conchas no
 * sexto quadro. Fica na grama, ao lado da trilha de pedras da porta até o píer, olhando para ela.
 * A sua ilha já tem cor: o cavalete acende as manchas, a ilha não muda.
 */
export const QUADRO_DA_SUA_ILHA = { x: -1.5, z: 18.5, olharPara: { x: -4, z: 18 } } as const

export function lugarDoQuadroNaSuaIlha(): LugarDoQuadro {
  return lugarNaIlhaCentral(QUADRO_DA_SUA_ILHA)
}

/**
 * O quadro do projeto autoral (C03b, 30/10/2026): do lado oeste do Farol, fora dos dois lotes da
 * casa (nenhuma obra chega ali) e longe da porta e da Íris, para o "Usar" não disputar com elas.
 * Olha para o Farol. Só aparece depois do final (`farol.concluido`).
 */
export const QUADRO_DO_FAROL = { x: -16, z: -11, olharPara: { x: -12, z: -11 } } as const

export function lugarDoQuadroNoFarol(): LugarDoQuadro {
  return lugarNaIlhaCentral(QUADRO_DO_FAROL)
}

function lugarNaIlhaCentral(q: {
  x: number
  z: number
  olharPara: { x: number; z: number }
}): LugarDoQuadro {
  const { x, z, olharPara } = q
  return { x, y: alturaDaIlha(x, z), z, giro: Math.atan2(olharPara.x - x, olharPara.z - z) }
}

/**
 * Onde o quadro fica: perto da chegada da ponte (a primeira coisa que a pessoa vê ao entrar na
 * ilha), um pouco para dentro e para o lado do caminho. Medidas no chão do modelo da ilha.
 */
export const LUGAR_DO_QUADRO = { paraDentro: 3.2, paraOLado: 2.4 } as const

/** Onde o quadro fica, no espaço do grupo da ilha (o giro da ilha já aplicado). */
export function posicaoDoQuadro(modelo: Object3D): LugarDoQuadro {
  const chegada = modelo.getObjectByName('chegada')
  const local = chegada ? chegada.position : { x: 11.6, y: 1, z: 0 }
  // No chão do modelo a chegada fica no +x: o quadro vem para dentro (−x) e para o lado (+z).
  const lx = local.x - LUGAR_DO_QUADRO.paraDentro
  const lz = local.z + LUGAR_DO_QUADRO.paraOLado
  const g = modelo.rotation.y
  const cos = Math.cos(g)
  const sin = Math.sin(g)
  const x = lx * cos + lz * sin
  const z = -lx * sin + lz * cos
  // De frente para a chegada (a frente do cavalete é o +z do arquivo).
  const cx = local.x * cos + local.z * sin
  const cz = -local.x * sin + local.z * cos
  return { x, y: local.y, z, giro: Math.atan2(cx - x, cz - z) }
}

/**
 * O cavalete segura o corpo (1,3 de largura e 1,5 de altura, das pernas da frente à de trás); a
 * câmera passa por ele.
 */
export const COLISORES_DO_QUADRO: ColisorDaIlha[] = [
  {
    forma: 'caixa',
    nome: 'col-quadro-das-cores',
    posicao: [0, 0.75, -0.14],
    rotacao: [0, 0, 0, 1],
    meio: [0.6, 0.75, 0.2],
  },
]

/** O mesmo colisor usado no mundo, no referencial da raiz preparada da ilha. */
export function colisoresDoQuadro(modelo: Object3D): ColisorDaIlha[] {
  return colisoresNoLugar(posicaoDoQuadro(modelo))
}

/** O colisor do cavalete posto num lugar (o da sua ilha, nos testes da ilha central). */
export function colisoresNoLugar(lugar: LugarDoQuadro): ColisorDaIlha[] {
  const giro = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), lugar.giro)
  return COLISORES_DO_QUADRO.map((c) => {
    if (c.forma === 'malha') return c
    const p = new Vector3(...c.posicao)
      .applyQuaternion(giro)
      .add(new Vector3(lugar.x, lugar.y, lugar.z))
    const q = giro.clone().multiply(new Quaternion(...c.rotacao))
    return { ...c, posicao: [p.x, p.y, p.z], rotacao: [q.x, q.y, q.z, q.w] }
  })
}
