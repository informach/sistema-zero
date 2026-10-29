import { useFrame } from '@react-three/fiber'
import { useReducedMotion } from '@sistemazero/avatar-quarto/use-reduced-motion'
import { useEffect, useMemo, useRef, useState } from 'react'
import { type Group, type Material, type Mesh, MeshStandardMaterial, type Object3D } from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import propsUrl from '../assets/ilhas/recife-props.glb'
import { lojaDoConforto } from '../estado/conforto'
import { useEstado, useJogo } from '../estado/contexto'
import {
  CORAIS,
  coralReplantado,
  falaDoReplantio,
  PONTOS_DOS_CORAIS,
  replantarCoral,
  rotuloDoCoral,
} from '../sistemas/corais-do-recife'
import { jogoPausado } from '../sistemas/pausa'
import { paraOMundo } from './bosque'
import { liberarObjeto } from './carregar-ilha'
import type { Troca } from './ilha-completa'
import { useInterativo } from './interativos'

type Ponto = { x: number; y: number; z: number }

/** Os quatro corais soltos do `recife-props.glb`, carregados sem cache global (como o mergulho). */
async function carregarCorais(): Promise<{ modelos: Object3D[]; soltar: () => void }> {
  const g = await new GLTFLoader().loadAsync(new URL(propsUrl, import.meta.url).href)
  const soltar = () => liberarObjeto(g.scene)
  const modelos = PONTOS_DOS_CORAIS.map((p) => {
    const no = g.scene.getObjectByName(p.no)
    if (!no) {
      soltar()
      throw new Error(`recife-props sem o nó ${p.no}`)
    }
    return no
  })
  return { modelos, soltar }
}

/**
 * Um coral da lagoa: desbotado (menor, branco acinzentado) até ser replantado; replantado, cresce
 * e volta à cor do arquivo em `CORAIS.crescer` s de jogo. A pausa congela o crescer; com menos
 * movimento ele muda na hora. Não colide (como os corais pequenos e as algas da lagoa).
 */
function Coral({
  i,
  modelo,
  desbotado,
  noMundo,
  troca,
}: {
  i: number
  modelo: Object3D
  desbotado: Material
  noMundo: Ponto
  troca: Troca
}) {
  const { loja } = useJogo()
  const aparelhoPedeMenos = useReducedMotion()
  const replantado = useEstado((s) => coralReplantado(s.salvamento.recife.corais, i))
  const grupo = useRef<Group>(null)
  // O crescer: 1 = pronto. Quem já chega replantado começa pronto; quem replanta agora cresce.
  const crescer = useRef(replantado ? 1 : 0)
  const ponto = PONTOS_DOS_CORAIS[i]
  const { colorido, cinza } = useMemo(() => {
    const colorido = modelo.clone(true)
    const cinza = modelo.clone(true)
    cinza.traverse((o) => {
      const m = o as Mesh
      if (m.isMesh) m.material = desbotado
    })
    return { colorido, cinza }
  }, [modelo, desbotado])
  useFrame((_, dt) => {
    const g = grupo.current
    if (!g) return
    const s = loja.getState()
    const menos = aparelhoPedeMenos || lojaDoConforto(loja).getState().conforto.menosMovimento
    if (!replantado) crescer.current = 0
    else if (menos) crescer.current = 1
    else if (crescer.current < 1 && !jogoPausado(s))
      crescer.current = Math.min(1, crescer.current + Math.min(dt, 0.1) / CORAIS.crescer)
    const t = crescer.current
    const suave = t * t * (3 - 2 * t)
    const escala = replantado
      ? CORAIS.escalaDesbotado + (CORAIS.escala - CORAIS.escalaDesbotado) * suave
      : CORAIS.escalaDesbotado
    g.scale.setScalar(escala)
    colorido.visible = replantado
    cinza.visible = !replantado
  })
  // Somente leitura (o suporte olhando) não grava: sem o rótulo, a fala não promete um coral.
  const podeReplantar = () => {
    const s = loja.getState()
    return (
      troca.opacidade >= 0.99 &&
      !s.acesso.somenteLeitura &&
      !coralReplantado(s.salvamento.recife.corais, i)
    )
  }
  useInterativo(`recife:coral-${i}`, {
    x: noMundo.x,
    z: noMundo.z,
    raio: CORAIS.alcance,
    rotulo: () => (podeReplantar() ? rotuloDoCoral(i) : null),
    agir() {
      const s = loja.getState()
      if (!podeReplantar()) return
      const novo = replantarCoral(s.salvamento, i)
      s.mudar(() => novo)
      s.dizer(falaDoReplantio(i, novo.recife.corais))
    },
  })
  if (!ponto) return null
  return (
    <group ref={grupo} name={`coral-${i + 1}`} position={[ponto.x, ponto.y, ponto.z]}>
      <primitive object={colorido} />
      <primitive object={cinza} />
    </group>
  )
}

/** Filho do Recife: posições locais no desenho (girado com a ilha), mundiais nos interativos. */
export function CoraisDoRecife({
  centro,
  giro,
  troca,
}: {
  centro: Ponto
  giro: number
  troca: Troca
}) {
  const [modelos, definirModelos] = useState<Object3D[] | null>(null)
  const desbotado = useMemo(
    () => new MeshStandardMaterial({ color: CORAIS.desbotado, roughness: 0.95 }),
    [],
  )
  useEffect(() => () => desbotado.dispose(), [desbotado])
  useEffect(() => {
    let vivo = true
    let soltar: (() => void) | null = null
    carregarCorais()
      .then((c) => {
        if (!vivo) {
          c.soltar()
          return
        }
        soltar = c.soltar
        definirModelos(c.modelos)
      })
      // Sem os corais, a lagoa fica como era: nada a replantar até a ilha carregar de novo.
      .catch(() => {})
    return () => {
      vivo = false
      soltar?.()
    }
  }, [])
  const noMundo = useMemo(
    () => PONTOS_DOS_CORAIS.map((p) => paraOMundo(p, centro, giro, { x: 0, y: 0, z: 0 })),
    [centro, giro],
  )
  if (!modelos) return null
  return (
    <group name="corais-do-recife" position={[centro.x, centro.y, centro.z]} rotation-y={giro}>
      {modelos.map((modelo, i) => (
        <Coral
          key={PONTOS_DOS_CORAIS[i]?.no}
          i={i}
          modelo={modelo}
          desbotado={desbotado}
          noMundo={noMundo[i] ?? { x: 0, y: 0, z: 0 }}
          troca={troca}
        />
      ))}
    </group>
  )
}
