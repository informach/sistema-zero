import { useFrame } from '@react-three/fiber'
import { CuboidCollider, RigidBody } from '@react-three/rapier'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { Group } from 'three'
import dinoGlb from '../assets/bichos/dino-montaria.glb'
import { useJogo } from '../estado/contexto'
import { CORPO } from '../sistemas/corpo'
import {
  FALAS_DA_MONTARIA,
  longeParaVoltar,
  MONTARIA,
  MONTARIA_NO_VALE,
  type MontariaViva,
  podeMontar,
  RAIO_DA_MONTARIA,
} from '../sistemas/montaria'
import { jogoPausado } from '../sistemas/pausa'
import { suavizarAngulo } from '../sistemas/zappy'
import { olhosNoInstante, PISCAR, trocarClipe, useCopiaAnimada } from './animado'
import { paraOMundo } from './bosque'
import { gruposDoColisor } from './grupos'
import type { IlhaPreparada, Troca } from './ilha-completa'
import { useInterativo } from './interativos'

type Ponto = { x: number; y: number; z: number }

/** O corpo dele parado, para o colisor (meia largura, meia altura e meio comprimento). */
const CORPO_PARADO = { meio: [0.55, 1, 1.6] as const }
const UMA_VEZ = ['pular'] as const

/**
 * A montaria do Vale (fase4-04): o parassaurolofo de sela espera no lugar dele (`MONTARIA_NO_VALE`)
 * e, com os três ninhos cuidados, "Montar no dino" pede o modo `montar` (`sistemas/modos/montar.ts`).
 * Montada, o desenho dele vai embaixo da criança e anda, corre e pula com ela; descer deixa ele
 * parado onde está. Parado, um colisor do tamanho do corpo dele segura só o corpo da criança (some
 * enquanto ela está em cima e volta quando ela se afasta).
 */
export function MontariaDoVale({
  preparada,
  meio,
  giro,
  troca,
}: {
  preparada: IlhaPreparada
  meio: Ponto
  giro: number
  troca: Troca
}) {
  const { loja, movimento, rastro } = useJogo()
  const chegada = preparada.modelo.getObjectByName('chegada')?.position
  const dino = useMemo<MontariaViva>(() => {
    const p = paraOMundo(
      { x: MONTARIA_NO_VALE.x, y: chegada?.y ?? 0, z: MONTARIA_NO_VALE.z },
      meio,
      giro,
      { x: 0, y: 0, z: 0 },
    )
    return {
      ...p,
      giro: MONTARIA_NO_VALE.giro + giro,
      montada: false,
      limite: { x: meio.x, z: meio.z, raio: RAIO_DA_MONTARIA },
    }
  }, [chegada, meio, giro])
  // O modo `montar` só vale com esta montaria registrada: a ilha que sai devolve ao chão.
  useEffect(() => {
    movimento.montaria = dino
    return () => {
      if (movimento.montaria === dino) movimento.montaria = null
    }
  }, [movimento, dino])

  const podeAgir = () => {
    const s = loja.getState()
    return (
      troca.opacidade >= 0.99 &&
      !jogoPausado(s) &&
      !s.acesso.somenteLeitura &&
      !s.visita &&
      movimento.modo === 'chao'
    )
  }
  useInterativo('montaria-do-vale', {
    get x() {
      return dino.x
    },
    get z() {
      return dino.z
    },
    raio: MONTARIA.alcance,
    rotulo: () => (dino.montada ? null : 'Montar no dino'),
    agir: () => {
      if (!podeAgir()) return
      const s = loja.getState()
      if (!podeMontar(s.salvamento)) {
        s.dizer(FALAS_DA_MONTARIA.antes)
        return
      }
      movimento.pedido = { tipo: 'montar', montaria: dino }
    },
  })

  // O aviso de quem subiu e o da água, quando o modo diz.
  useEffect(
    () =>
      loja.subscribe((s, antes) => {
        if (s.modo === 'montar' && antes.modo !== 'montar') s.dizer(FALAS_DA_MONTARIA.subiu)
      }),
    [loja],
  )

  const raiz = useRef<Group>(null)
  const desenho = useRef<Group>(null)
  const { cena, actions, olhos } = useCopiaAnimada(
    new URL(dinoGlb, import.meta.url).href,
    raiz,
    UMA_VEZ,
  )
  const olhar = useRef(dino.giro)
  const tocando = useRef<string | null>(null)
  const ySubindo = useRef<number | null>(null)
  const pulouAte = useRef(0)
  const piscarEm = useRef<number>(PISCAR.aCada)
  const relogio = useRef(0)
  const avisouDaBeira = useRef<string | null>(null)
  const [colide, setColide] = useState(true)

  useFrame((_, dtBruto) => {
    const dt = Math.min(dtBruto, 0.1)
    relogio.current += dt
    const agora = relogio.current
    const g = desenho.current
    if (!g) return
    const montado = dino.montada && movimento.modo === 'montar'
    let clipe = 'parado'
    if (montado) {
      // Embaixo da criança: o pé dela (o fim da cápsula) é o pé dele.
      const pe = rastro.y - CORPO.doCentroAoPe - CORPO.folga
      g.position.set(rastro.x, pe, rastro.z)
      olhar.current = suavizarAngulo(olhar.current, rastro.direcao, 12, dt)
      const vel = rastro.velocidade
      clipe =
        vel > (MONTARIA.velocidade + MONTARIA.correndo) / 2
          ? 'correr'
          : vel > 0.3
            ? 'andar'
            : 'parado'
      // O pulo: o pé subindo depressa toca o pulo uma vez.
      const antes = ySubindo.current
      ySubindo.current = pe
      if (antes !== null && (pe - antes) / Math.max(dt, 1e-3) > 1.5 && agora > pulouAte.current) {
        pulouAte.current = agora + 0.9
        trocarClipe(actions, tocando.current, 'pular', 0.15, 'montaria-do-vale')
        tocando.current = 'pular'
      }
      // Na beira (da água ou do Vale), o Zappy avisa uma vez por encostada.
      const beira = movimento.beira
      if (beira && beira !== avisouDaBeira.current) loja.getState().dizer(FALAS_DA_MONTARIA[beira])
      avisouDaBeira.current = beira
    } else {
      g.position.set(dino.x, dino.y, dino.z)
      olhar.current = suavizarAngulo(olhar.current, dino.giro, 6, dt)
      ySubindo.current = null
    }
    g.rotation.y = olhar.current
    if (agora < pulouAte.current) clipe = 'pular'
    if (clipe !== tocando.current) {
      trocarClipe(actions, tocando.current, clipe, 0.25, 'montaria-do-vale')
      tocando.current = clipe
    }
    olhosNoInstante(olhos, agora, piscarEm, false)
    // Parado, ele segura o corpo, menos com a criança ainda em cima do lugar dele.
    const longe = Math.hypot(rastro.x - dino.x, rastro.z - dino.z) > longeParaVoltar(CORPO.raio)
    const deve = !dino.montada && longe
    if (deve !== colide) setColide(deve)
  })

  return (
    <>
      <group ref={desenho}>
        <group ref={raiz} scale={MONTARIA.escala}>
          <primitive object={cena} />
        </group>
      </group>
      {colide ? (
        <RigidBody
          type="fixed"
          colliders={false}
          position={[dino.x, dino.y + CORPO_PARADO.meio[1], dino.z]}
          rotation={[0, dino.giro, 0]}
          userData={{ montaria: true }}
        >
          <CuboidCollider
            args={[...CORPO_PARADO.meio]}
            name="col-montaria"
            {...gruposDoColisor(true)}
          />
        </RigidBody>
      ) : null}
    </>
  )
}
