import type { Ponto } from '../sistemas/cipo'
import type { CorrenteDeAr } from '../sistemas/planador'
import { type Segredo, VENTO_DO_SEGREDO } from '../sistemas/segredos'
import { paraOMundo } from './bosque'
import { alturaDaIlha } from './medidas'

/** A altura do chão das ilhas do anel nos pés das correntes (medida nos modelos, teste). */
export const CHAO_DO_SEGREDO_NO_MODELO = 1

/** O pé do vento no mundo: direto na sua ilha; nas outras, do modelo para o mundo. */
export function peDoSegredo(segredo: Segredo, meio?: Ponto, giro = 0): Ponto {
  if (segredo.ilha === 'sua-ilha' || !meio)
    return { x: segredo.x, y: alturaDaIlha(segredo.x, segredo.z), z: segredo.z }
  return paraOMundo({ x: segredo.x, y: CHAO_DO_SEGREDO_NO_MODELO, z: segredo.z }, meio, giro, {
    x: 0,
    y: 0,
    z: 0,
  })
}

/** A corrente do segredo e o lugar do baú, ao lado do alto dela (para o corpo não ficar dentro). */
export function ventoDoSegredo(
  segredo: Segredo,
  pe: Ponto,
): { corrente: CorrenteDeAr; bau: Ponto } {
  const topo = pe.y + VENTO_DO_SEGREDO.altura
  return {
    corrente: {
      id: `segredo:${segredo.id}`,
      x: pe.x,
      z: pe.z,
      raio: VENTO_DO_SEGREDO.raio,
      base: pe.y,
      topo,
    },
    bau: { x: pe.x + VENTO_DO_SEGREDO.bauAoLado, y: topo - 0.2, z: pe.z },
  }
}
