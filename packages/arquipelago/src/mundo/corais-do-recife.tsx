import { useFrame } from '@react-three/fiber'
import { useReducedMotion } from '@sistemazero/avatar-quarto/use-reduced-motion'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { Object3D } from 'three'
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

interface ModelosDoCoral {
  vivo: Object3D
  desbotado: Object3D
}

/**
 * Os corais soltos do `recife-props.glb`, o vivo e o desbotado de cada tipo, carregados sem cache
 * global (como o mergulho).
 */
async function carregarCorais(): Promise<{ modelos: ModelosDoCoral[]; soltar: () => void }> {
  const g = await new GLTFLoader().loadAsync(new URL(propsUrl, import.meta.url).href)
  const soltar = () => liberarObjeto(g.scene)
  const no = (nome: string) => {
    const achado = g.scene.getObjectByName(nome)
    if (!achado) {
      soltar()
      throw new Error(`recife-props sem o nó ${nome}`)
    }
    return achado
  }
  const modelos = PONTOS_DOS_CORAIS.map((p) => ({ vivo: no(p.no), desbotado: no(p.desbotado) }))
  return { modelos, soltar }
}

/** As âncoras `coral-muda-N` do `recife.glb`, no referencial do modelo; sem alguma, nenhum coral. */
export function lugaresDasMudas(modelo: Object3D): Ponto[] | null {
  const lugares: Ponto[] = []
  for (const p of PONTOS_DOS_CORAIS) {
    const no = modelo.getObjectByName(p.ancora)
    if (!no) return null
    lugares.push({ x: no.position.x, y: no.position.y, z: no.position.z })
  }
  return lugares
}

/**
 * Um coral da lagoa: o desbotado do arquivo (branco de osso, com cacos em volta) até ser
 * replantado; replantado, a muda viva nasce pequena e cresce até `CORAIS.escala` em
 * `CORAIS.crescer` s de jogo. A pausa congela o crescer; com menos movimento ela já nasce grande.
 * Não colide (como os corais pequenos e as algas da lagoa).
 */
function Coral({
  i,
  modelos,
  lugar,
  noMundo,
  troca,
}: {
  i: number
  modelos: ModelosDoCoral
  lugar: Ponto
  noMundo: Ponto
  troca: Troca
}) {
  const { loja } = useJogo()
  const aparelhoPedeMenos = useReducedMotion()
  const replantado = useEstado((s) => coralReplantado(s.salvamento.recife.corais, i))
  // O crescer: 1 = pronto. Quem já chega replantado começa pronto; quem replanta agora cresce.
  const crescer = useRef(replantado ? 1 : 0)
  const { vivo, desbotado } = useMemo(
    () => ({ vivo: modelos.vivo.clone(true), desbotado: modelos.desbotado.clone(true) }),
    [modelos],
  )
  useFrame((_, dt) => {
    const s = loja.getState()
    const menos = aparelhoPedeMenos || lojaDoConforto(loja).getState().conforto.menosMovimento
    if (!replantado) crescer.current = 0
    else if (menos) crescer.current = 1
    else if (crescer.current < 1 && !jogoPausado(s))
      crescer.current = Math.min(1, crescer.current + Math.min(dt, 0.1) / CORAIS.crescer)
    const t = crescer.current
    const suave = t * t * (3 - 2 * t)
    // O grupo já está em `CORAIS.escala`: a muda cresce de `escalaDaMuda` até ela.
    vivo.scale.setScalar(
      (CORAIS.escalaDaMuda + (CORAIS.escala - CORAIS.escalaDaMuda) * suave) / CORAIS.escala,
    )
    vivo.visible = replantado
    desbotado.visible = !replantado
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
  return (
    <group name={`coral-${i + 1}`} position={[lugar.x, lugar.y, lugar.z]} scale={CORAIS.escala}>
      <primitive object={vivo} />
      <primitive object={desbotado} />
    </group>
  )
}

/** Filho do Recife: posições locais no desenho (girado com a ilha), mundiais nos interativos. */
export function CoraisDoRecife({
  modelo,
  centro,
  giro,
  troca,
}: {
  modelo: Object3D
  centro: Ponto
  giro: number
  troca: Troca
}) {
  const [modelos, definirModelos] = useState<ModelosDoCoral[] | null>(null)
  const lugares = useMemo(() => lugaresDasMudas(modelo), [modelo])
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
    () => lugares?.map((p) => paraOMundo(p, centro, giro, { x: 0, y: 0, z: 0 })) ?? [],
    [lugares, centro, giro],
  )
  if (!modelos || !lugares) return null
  return (
    <group name="corais-do-recife" position={[centro.x, centro.y, centro.z]} rotation-y={giro}>
      {modelos.map((m, i) => (
        <Coral
          key={PONTOS_DOS_CORAIS[i]?.no}
          i={i}
          modelos={m}
          lugar={lugares[i] ?? { x: 0, y: 0, z: 0 }}
          noMundo={noMundo[i] ?? { x: 0, y: 0, z: 0 }}
          troca={troca}
        />
      ))}
    </group>
  )
}
