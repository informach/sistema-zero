import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import { Matrix4, type Object3D, Vector3 } from 'three'
import { useJogo } from '../estado/contexto'
import { type AreaQueEmpurra, FALA_DA_CINZA_QUENTE } from '../sistemas/cinza-quente'
import type { Ponto } from '../sistemas/cipo'
import { CORPO } from '../sistemas/corpo'
import { jogoPausado } from '../sistemas/pausa'
import { type SegredoDoMovimento, segredoDoMovimento } from '../sistemas/segredos'
import { paraOMundo } from './bosque'
import { BauDoSegredo } from './segredos-das-ilhas'

/** A âncora de um modelo de ilha no mundo (o meio da ilha e o giro dela), ou `null`. */
export function ancoraNoMundo(
  modelo: Object3D,
  nome: string,
  meio: Ponto,
  giro: number,
): Ponto | null {
  const p = modelo.getObjectByName(nome)?.position
  return p ? paraOMundo(p, meio, giro, { x: 0, y: 0, z: 0 }) : null
}

/**
 * O baú de um segredo dos movimentos numa ilha do anel (B11): na âncora `segredo-<movimento>` do
 * modelo dela. O patins no Bosque, a montaria no Vale e o balão nas Nuvens.
 */
export function SegredoNaIlha({
  id,
  modelo,
  meio,
  giro,
}: {
  id: SegredoDoMovimento['id']
  modelo: Object3D
  meio: Ponto
  giro: number
}) {
  const segredo = segredoDoMovimento(id)
  const lugar = useMemo(
    () => ancoraNoMundo(modelo, segredo.ancora, meio, giro),
    [modelo, segredo, meio, giro],
  )
  return lugar ? <BauDoSegredo segredo={segredo} lugar={lugar} giro={giro} /> : null
}

/**
 * A área da cinza quente no mundo: a caixa unitária da âncora `cinza-quente-area` (posição, giro e
 * escala do nó) e o empurrão para longe do terraço `segredo-montaria`. `null` sem as âncoras.
 */
export function areaDaCinzaQuente(
  modelo: Object3D,
  meio: Ponto,
  giro: number,
): AreaQueEmpurra | null {
  const no = modelo.getObjectByName('cinza-quente-area')
  const terraco = modelo.getObjectByName('segredo-montaria')
  if (!no || !terraco) return null
  // A caixa no referencial do modelo (o nó pode estar dentro de outro), depois no mundo.
  modelo.updateWorldMatrix(true, true)
  const noModelo = modelo.matrixWorld.clone().invert().multiply(no.matrixWorld)
  const doMundo = new Matrix4()
    .makeTranslation(meio.x, meio.y, meio.z)
    .multiply(new Matrix4().makeRotationY(giro))
    .multiply(noModelo)
  const inversa = doMundo.clone().invert()
  const centro = new Vector3().setFromMatrixPosition(doMundo)
  const alto = paraOMundo(terraco.position, meio, giro, { x: 0, y: 0, z: 0 })
  const dx = centro.x - alto.x
  const dz = centro.z - alto.z
  const d = Math.hypot(dx, dz) || 1
  const v = new Vector3()
  return {
    id: 'vale:cinza-quente',
    direcao: { x: dx / d, z: dz / d },
    contem(x, y, z) {
      v.set(x, y - CORPO.doCentroAoPe, z).applyMatrix4(inversa)
      return Math.abs(v.x) <= 0.5 && Math.abs(v.y) <= 0.5 && Math.abs(v.z) <= 0.5
    },
  }
}

/** A fala da cinza quente volta só depois de tanto tempo fora dela (ms). */
const FALA_DE_NOVO_DEPOIS = 20_000

/**
 * A cinza quente do Vale (B11): a caixa da âncora `cinza-quente-area` empurra quem vai a pé para
 * longe do terraço do segredo (`sistemas/cinza-quente.ts`), sem dano. Montado no dino, nada
 * empurra. Na primeira vez que empurra, o Zappy explica.
 */
export function CinzaQuente({
  modelo,
  meio,
  giro,
}: {
  modelo: Object3D
  meio: Ponto
  giro: number
}) {
  const { loja, movimento, rastro } = useJogo()
  const area = useMemo(() => areaDaCinzaQuente(modelo, meio, giro), [modelo, meio, giro])
  useEffect(() => {
    if (!area) return
    const lista = movimento.empurroes
    lista.push(area)
    return () => {
      const i = lista.indexOf(area)
      if (i >= 0) lista.splice(i, 1)
    }
  }, [area, movimento])
  const foraDesde = useRef(0)
  const avisou = useRef(false)
  useFrame(() => {
    if (!area) return
    const s = loja.getState()
    const dentro = movimento.modo === 'chao' && area.contem(rastro.x, rastro.y, rastro.z)
    const agora = performance.now()
    if (!dentro) {
      if (avisou.current && agora - foraDesde.current > FALA_DE_NOVO_DEPOIS) avisou.current = false
      if (!avisou.current) foraDesde.current = agora
      return
    }
    foraDesde.current = agora
    if (avisou.current || jogoPausado(s) || s.visita) return
    avisou.current = true
    s.dizer(FALA_DA_CINZA_QUENTE)
  })
  return null
}
