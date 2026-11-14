import { useFrame } from '@react-three/fiber'
import { MORADA_CATALOG } from '@sistemazero/avatar-quarto/morada/catalog'
import { MoradaPieceView } from '@sistemazero/avatar-quarto/morada/piece'
import { useReducedMotion } from '@sistemazero/avatar-quarto/use-reduced-motion'
import { useEffect, useMemo, useRef } from 'react'
import { type Group, type Object3D, Quaternion, Vector3 } from 'three'
import pinguimGlb from '../assets/bichos/pinguim.glb'
import { lojaDoConforto } from '../estado/conforto'
import { useEstado, useJogo } from '../estado/contexto'
import {
  BANDA,
  devolverInstrumento,
  falaDaVolta,
  fazerChocolateNoIglu,
  INSTRUMENTOS,
  type Instrumento,
  instrumentoDeVolta,
  ROTULO_DO_FOGAREIRO,
  rotuloDoInstrumento,
  TODA_A_BANDA,
} from '../sistemas/banda'
import type { Ponto } from '../sistemas/cipo'
import { jogoPausado } from '../sistemas/pausa'
import { trocarClipe, useCopiaAnimada } from './animado'
import { paraOMundo } from './bosque'
import { Colisores } from './colisores'
import type { ColisorDaIlha } from './colisores-da-ilha'
import type { Troca } from './ilha-completa'
import { useInterativo } from './interativos'
import { ComReserva } from './modelos'

const INSTRUMENTO_MORADA: Record<Instrumento, string> = {
  xilofone: 'moveis/brinquedos/xilofone_colorido',
  violao: 'moveis/objetos/violao_pacote',
  bateria: 'moveis/objetos/brinquedo_tambor',
}
const URL_DO_PINGUIM = new URL(pinguimGlb, import.meta.url).href
const SEM_UMA_VEZ: readonly string[] = []
/** O balanço de quem toca: subida (m), giro (rad) e batidas por segundo. */
const TOCANDO = { subida: 0.05, giro: 0.14, batidas: 2.2 } as const

type Lugar = Ponto & { giro: number }

interface LugaresDaBanda {
  perdido: Record<Instrumento, Lugar>
  palco: Record<Instrumento, Lugar>
  musico: Record<Instrumento, Lugar>
  fogareiro: Ponto
  meioDoPalco: Ponto
}

/** As âncoras da banda (arte/ilhas-b/pico.py, `ancoras_da_banda`) no mundo; sem alguma, nada. */
function lerLugares(modelo: Object3D, meio: Ponto, giro: number): LugaresDaBanda | null {
  const ponto = (nome: string): Ponto | null => {
    const no = modelo.getObjectByName(nome)
    return no ? paraOMundo(no.position, meio, giro, { x: 0, y: 0, z: 0 }) : null
  }
  const palco = ponto('palco')
  const frente = ponto('morador')
  const fogareiro = ponto('fogareiro')
  if (!palco || !frente || !fogareiro) return null
  // No palco, tudo olha para a frente dele (a marca `morador`, onde a criança para para conversar).
  const olharDoPalco = Math.atan2(frente.x - palco.x, frente.z - palco.z)
  const perdido = {} as Record<Instrumento, Lugar>
  const noPalco = {} as Record<Instrumento, Lugar>
  const musico = {} as Record<Instrumento, Lugar>
  for (const id of INSTRUMENTOS) {
    const p = ponto(`instrumento-${id}`)
    const b = ponto(`banda-${id}`)
    const m = ponto(`musico-${id}`)
    if (!p || !b || !m) return null
    // O perdido fica virado para o meio da ilha, de onde a criança costuma chegar.
    perdido[id] = { ...p, giro: Math.atan2(meio.x - p.x, meio.z - p.z) }
    noPalco[id] = { ...b, giro: olharDoPalco }
    musico[id] = { ...m, giro: olharDoPalco }
  }
  return { perdido, palco: noPalco, musico, fogareiro, meioDoPalco: palco }
}

/**
 * A banda do festival de inverno (fase3-08), montada pelo `PicoVivo`: os três instrumentos (o
 * `banda.glb` da casa), perdidos pela ilha até a criança levar cada um ao palco, os três pinguins
 * músicos esperando no palco (tocando quando o instrumento deles volta), as notas no ar quando a
 * banda está completa, e o fogareiro do iglu, que faz chocolate quente.
 */
export function BandaDoPico({
  modelo,
  meio,
  giro,
  troca,
}: {
  modelo: Object3D
  meio: Ponto
  giro: number
  troca: Troca
}) {
  const lugares = useMemo(() => lerLugares(modelo, meio, giro), [modelo, meio, giro])
  if (!lugares) return null
  return (
    <>
      <ComReserva reserva={null}>
        {INSTRUMENTOS.map((id, i) => (
          <InstrumentoDaBanda key={id} id={id} i={i} lugares={lugares} troca={troca} />
        ))}
      </ComReserva>
      <ComReserva reserva={null}>
        {INSTRUMENTOS.map((id, i) => (
          <PinguimMusico key={id} i={i} lugar={lugares.musico[id]} />
        ))}
      </ComReserva>
      <NotasDoFestival meio={lugares.meioDoPalco} />
      <Fogareiro lugar={lugares.fogareiro} troca={troca} />
    </>
  )
}

/** Quem pode mexer no salvamento agora: a ilha inteira, sem somente leitura, andando no chão. */
function usePodeAgir(troca: Troca) {
  const { loja, movimento } = useJogo()
  return () => {
    const s = loja.getState()
    return (
      troca.opacidade >= 0.99 &&
      !s.acesso.somenteLeitura &&
      !jogoPausado(s) &&
      movimento.modo === 'chao'
    )
  }
}

function InstrumentoDaBanda({
  id,
  i,
  lugares,
  troca,
}: {
  id: Instrumento
  i: number
  lugares: LugaresDaBanda
  troca: Troca
}) {
  const { loja } = useJogo()
  const podeAgir = usePodeAgir(troca)
  const voltou = useEstado((s) => instrumentoDeVolta(s.salvamento.pico.banda, i))
  const piece = MORADA_CATALOG.pieces[INSTRUMENTO_MORADA[id]]
  if (!piece) throw new Error(`Instrumento Morada ausente: ${id}`)
  const lugar = voltou ? lugares.palco[id] : lugares.perdido[id]
  const colisores = useMemo<ColisorDaIlha[]>(
    () =>
      piece.colliders.map((box, index) => {
        const q = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), lugar.giro)
        const center = new Vector3(...box.center).applyQuaternion(q)
        return {
          forma: 'caixa',
          nome: `col-instrumento-${id}-${index}`,
          posicao: [lugar.x + center.x, lugar.y + center.y, lugar.z + center.z],
          rotacao: [q.x, q.y, q.z, q.w],
          meio: [box.size[0] / 2, box.size[1] / 2, box.size[2] / 2],
        }
      }),
    [piece, lugar, id],
  )
  const perdido = lugares.perdido[id]
  useInterativo(`pico:instrumento-${id}`, {
    x: perdido.x,
    z: perdido.z,
    raio: voltou ? 0 : BANDA.alcance,
    rotulo: () =>
      !instrumentoDeVolta(loja.getState().salvamento.pico.banda, i) && podeAgir()
        ? rotuloDoInstrumento(i)
        : null,
    agir() {
      const s = loja.getState()
      if (!podeAgir() || instrumentoDeVolta(s.salvamento.pico.banda, i)) return
      const novo = devolverInstrumento(s.salvamento, i)
      s.mudar(() => novo)
      s.dizer(falaDaVolta(i, novo.pico.banda))
    },
  })
  return (
    <>
      <MoradaPieceView
        instance={{
          id: `instrumento-${id}`,
          pieceId: piece.id,
          position: [lugar.x, lugar.y, lugar.z],
          rotation: lugar.giro,
        }}
      />
      <Colisores key={voltou ? 'palco' : 'perdido'} lista={colisores} />
    </>
  )
}

/** Um pinguim músico no palco: parado e cabisbaixo até o instrumento voltar; depois, tocando. */
function PinguimMusico({ i, lugar }: { i: number; lugar: Lugar }) {
  const { loja } = useJogo()
  const raiz = useRef<Group>(null)
  const corpo = useRef<Group>(null)
  const pausado = useEstado(jogoPausado)
  const voltou = useEstado((s) => instrumentoDeVolta(s.salvamento.pico.banda, i))
  const aparelhoPedeMenos = useReducedMotion()
  const { cena, actions } = useCopiaAnimada(URL_DO_PINGUIM, raiz, SEM_UMA_VEZ, pausado)
  const tempo = useRef(i * 0.37)
  useEffect(() => {
    trocarClipe(actions, null, 'parado', 0, `pinguim-musico-${i}`)
  }, [actions, i])
  useFrame((_, dt) => {
    const c = corpo.current
    if (!c) return
    const menos = aparelhoPedeMenos || lojaDoConforto(loja).getState().conforto.menosMovimento
    if (!pausado) tempo.current += Math.min(dt, 0.1)
    if (!voltou) {
      // Sem o instrumento: um pouco curvado para a frente, sem balançar.
      c.position.y = 0
      c.rotation.set(0.18, 0, 0)
      return
    }
    const fase = tempo.current * TOCANDO.batidas * Math.PI * 2
    c.position.y = menos ? 0 : Math.abs(Math.sin(fase)) * TOCANDO.subida
    c.rotation.set(0, 0, menos ? 0 : Math.sin(fase / 2) * TOCANDO.giro)
  })
  const colisores = useMemo<ColisorDaIlha[]>(() => {
    // O corpo do pinguim.glb (0,13 de raio e 0,51 de altura) na escala dos músicos.
    const raio = 0.13 * BANDA.escalaDoPinguim
    const meiaAltura = (0.51 * BANDA.escalaDoPinguim) / 2
    return [
      {
        forma: 'cilindro',
        nome: `col-morador-pinguim-${i + 1}`,
        posicao: [lugar.x, lugar.y + meiaAltura, lugar.z],
        rotacao: [0, 0, 0, 1],
        raio,
        meiaAltura,
      },
    ]
  }, [lugar, i])
  return (
    <>
      <group position={[lugar.x, lugar.y, lugar.z]} rotation={[0, lugar.giro, 0]}>
        <group ref={corpo}>
          <group ref={raiz} scale={BANDA.escalaDoPinguim}>
            <primitive object={cena} />
          </group>
        </group>
      </group>
      <Colisores lista={colisores} />
    </>
  )
}

/** As notas que sobem do palco com a banda completa (o festival de inverno). */
const NOTAS = 7
const VOO_DA_NOTA = { altura: 2.6, segundos: 3.2, raio: 1.8 } as const

function NotasDoFestival({ meio }: { meio: Ponto }) {
  const { loja } = useJogo()
  const festival = useEstado((s) => s.salvamento.pico.banda === TODA_A_BANDA)
  const aparelhoPedeMenos = useReducedMotion()
  const notas = useRef<(Group | null)[]>([])
  const tempo = useRef(0)
  useFrame((_, dt) => {
    if (!festival) return
    const s = loja.getState()
    const menos = aparelhoPedeMenos || lojaDoConforto(loja).getState().conforto.menosMovimento
    if (!jogoPausado(s) && !menos) tempo.current += Math.min(dt, 0.1)
    for (let k = 0; k < NOTAS; k++) {
      const n = notas.current[k]
      if (!n) continue
      const a = (k / NOTAS) * Math.PI * 2
      // Com menos movimento, as notas ficam paradas no ar, em roda.
      const t = menos ? 0.5 : (tempo.current / VOO_DA_NOTA.segundos + k / NOTAS) % 1
      n.position.set(
        Math.cos(a) * VOO_DA_NOTA.raio * (0.6 + 0.4 * t),
        1.4 + t * VOO_DA_NOTA.altura,
        Math.sin(a) * VOO_DA_NOTA.raio * (0.6 + 0.4 * t),
      )
      n.scale.setScalar(Math.sin(Math.PI * t) * 0.9 + 0.1)
    }
  })
  if (!festival) return null
  return (
    <group position={[meio.x, meio.y, meio.z]} name="notas-do-festival">
      {Array.from({ length: NOTAS }, (_, k) => (
        <group
          // biome-ignore lint/suspicious/noArrayIndexKey: as notas são fixas, uma por posição na roda
          key={k}
          ref={(g) => {
            notas.current[k] = g
          }}
        >
          <mesh position={[0, 0, 0]} scale={[1.2, 0.9, 0.5]}>
            <sphereGeometry args={[0.12, 10, 6]} />
            <meshBasicMaterial color={k % 2 ? '#ffd56b' : '#34507e'} toneMapped={false} />
          </mesh>
          <mesh position={[0.11, 0.24, 0]}>
            <boxGeometry args={[0.035, 0.5, 0.035]} />
            <meshBasicMaterial color={k % 2 ? '#ffd56b' : '#34507e'} toneMapped={false} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

/** O fogareiro do iglu: "Fazer chocolate quente" com o cacau e o leite da mochila. */
function Fogareiro({ lugar, troca }: { lugar: Ponto; troca: Troca }) {
  const { loja } = useJogo()
  const podeAgir = usePodeAgir(troca)
  useInterativo('pico:fogareiro', {
    x: lugar.x,
    z: lugar.z,
    raio: BANDA.alcanceDoFogareiro,
    rotulo: () => (podeAgir() ? ROTULO_DO_FOGAREIRO : null),
    agir() {
      const s = loja.getState()
      if (!podeAgir()) return
      const r = fazerChocolateNoIglu(s.salvamento, new Date())
      if (r.salvamento !== s.salvamento) s.mudar(() => r.salvamento)
      if (r.falas.length) s.dizer(r.falas.join(' '))
    },
  })
  return null
}
