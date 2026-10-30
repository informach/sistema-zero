import { useFrame } from '@react-three/fiber'
import { useReducedMotion } from '@sistemazero/avatar-quarto/use-reduced-motion'
import { useEffect, useMemo, useRef, useState } from 'react'
import { BufferAttribute, BufferGeometry, LineBasicMaterial, type LineSegments } from 'three'
import { lojaDoConforto, useConforto } from '../estado/conforto'
import { useEstado, useJogo } from '../estado/contexto'
import { CLIMA, chuvaNaHorta, climaEfetivo } from '../sistemas/clima'
import { geladeiraEm } from '../sistemas/horta'
import { jogoPausado } from '../sistemas/pausa'
import { ALTURA_DA_TERRA, dentroDaCasa } from './medidas'
import { useQualidade } from './qualidade-da-cena'

/** O meio da sua ilha (a ilha central fica no meio do mundo). */
const MEIO = { x: 0, z: 0 } as const
/** O tempo da sua ilha some aos poucos nesta faixa, passando do alcance. */
const FAIXA = 8

/** Um número de 0 a 1 que não muda de uma montagem para outra (as gotas nascem no mesmo lugar). */
function acaso(i: number, k: number): number {
  const x = Math.sin(i * 127.1 + k * 311.7) * 43758.5453
  return x - Math.floor(x)
}

/**
 * O clima da sua ilha (fase4-08, regras em `sistemas/clima.ts`): perto da ilha central, o céu
 * fecha e a luz cai no nublado e na chuva (o `Ceu` lê `ambiente`), as gotas caem em volta da
 * criança na chuva (menos no modo leve, nenhuma com menos movimento, nenhuma dentro de casa) e a
 * chuva rega a horta. A pausa congela.
 */
export function ClimaDaIlha() {
  const { loja, ambiente, rastro } = useJogo()
  const { nivel } = useQualidade()
  const aparelhoPedeMenos = useReducedMotion()
  const jogoPedeMenos = useConforto(lojaDoConforto(loja), (s) => s.conforto.menosMovimento)
  const menos = aparelhoPedeMenos || jogoPedeMenos
  // O clima natural muda com o dia do jogo: relê a cada segundo.
  const [agora, setAgora] = useState(() => Date.now())
  useEffect(() => {
    const t = setInterval(() => setAgora(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])
  const chovendo = useEstado((s) => climaEfetivo(s, agora) === 'chuva')
  const quantas = chovendo && !menos ? CLIMA.gotas[nivel] : 0
  const linhas = useRef<LineSegments>(null)
  const relogio = useRef(0)
  const geometria = useMemo(() => {
    // As gotas em volta da origem; o desenho vai junto com a criança (`linhas.position`).
    const g = new BufferGeometry()
    const p = new Float32Array(quantas * 6)
    for (let i = 0; i < quantas; i++) {
      const a = acaso(i, 1) * Math.PI * 2
      const r = Math.sqrt(acaso(i, 2)) * CLIMA.raioDaChuva
      const x = Math.cos(a) * r
      const z = Math.sin(a) * r
      const y = acaso(i, 3) * CLIMA.alturaDaChuva
      p.set([x, y, z, x, y - CLIMA.risco, z], i * 6)
    }
    g.setAttribute('position', new BufferAttribute(p, 3))
    return g
  }, [quantas])
  const material = useMemo(
    () => new LineBasicMaterial({ color: '#e8f1ff', transparent: true, opacity: 0.7, fog: false }),
    [],
  )
  useEffect(() => () => geometria.dispose(), [geometria])
  useEffect(() => () => material.dispose(), [material])
  // Sem o clima (desmontou), o céu volta ao do relógio.
  useEffect(
    () => () => {
      ambiente.luzDoClima = 1
      ambiente.cinzaDoClima = 0
    },
    [ambiente],
  )

  useFrame((_, dtBruto) => {
    const dt = Math.min(dtBruto, 0.1)
    const s = loja.getState()
    // Numa visita, a ilha é do irmão: o tempo dela não muda (`climaEfetivo` dá sol).
    const clima = climaEfetivo(s, Date.now())
    const longe = Math.hypot(rastro.x - MEIO.x, rastro.z - MEIO.z) - CLIMA.alcance
    const perto = Math.min(1, Math.max(0, 1 - longe / FAIXA))
    ambiente.luzDoClima = 1 - (1 - CLIMA.luz[clima]) * perto
    ambiente.cinzaDoClima = CLIMA.cinza[clima] * perto
    material.opacity = 0.7 * perto
    const gotas = linhas.current
    if (gotas) {
      // A chuva cai em volta da criança (no chão da sua ilha); dentro de casa, não.
      gotas.visible =
        clima === 'chuva' && quantas > 0 && perto > 0 && !dentroDaCasa(rastro.x, rastro.z)
      gotas.position.set(rastro.x, ALTURA_DA_TERRA, rastro.z)
    }
    if (jogoPausado(s)) return

    // A chuva rega a horta, conferindo a cada `CLIMA.chuvaACada` s de jogo.
    relogio.current += dt
    if (clima === 'chuva' && relogio.current >= CLIMA.chuvaACada) {
      relogio.current = 0
      const horta = chuvaNaHorta(s.salvamento.horta, new Date(), geladeiraEm(s.salvamento))
      if (horta)
        s.mudar((sv) => ({
          ...sv,
          horta: chuvaNaHorta(sv.horta, new Date(), geladeiraEm(sv)) ?? sv.horta,
        }))
    }

    // As gotas caem e voltam lá em cima.
    if (quantas === 0 || clima !== 'chuva') return
    const atributo = geometria.getAttribute('position') as BufferAttribute
    const p = atributo.array as Float32Array
    const desce = CLIMA.queda * dt
    for (let i = 0; i < quantas; i++) {
      const k = i * 6
      let y = (p[k + 1] ?? 0) - desce
      if (y < 0) y += CLIMA.alturaDaChuva
      p[k + 1] = y
      p[k + 4] = y - CLIMA.risco
    }
    atributo.needsUpdate = true
  })

  if (quantas === 0) return null
  return (
    <lineSegments
      ref={linhas}
      geometry={geometria}
      material={material}
      frustumCulled={false}
      name="chuva-da-ilha"
    />
  )
}
