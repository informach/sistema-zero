import { useFrame } from '@react-three/fiber'
import { CuboidCollider, RigidBody } from '@react-three/rapier'
import { ilhaAberta } from '@sistemazero/arquipelago-contracts'
import { useEffect, useMemo, useRef, useState } from 'react'
import { type Group, Vector3 } from 'three'
import barcoGlb from '../assets/ilhas/barco.glb'
import recifeGlb from '../assets/ilhas/recife.glb'
import { useEstado, useJogo } from '../estado/contexto'
import {
  BARCO,
  criarTravessia,
  embarcar,
  type Porto,
  podeEmbarcar,
  type Travessia,
} from '../sistemas/barco'
import { CORPO } from '../sistemas/corpo'
import { jogoPausado } from '../sistemas/pausa'
import { trocarClipe, useCopiaAnimada } from './animado'
import { gruposDoColisor } from './grupos'
import { useInterativo } from './interativos'
import { giroDaIlha, ilhasEmVolta, PIER } from './medidas'
import { ComReserva, MODELOS } from './modelos'
import { ancorasDoPorto } from './portos'

const URL_BARCO = new URL(barcoGlb, import.meta.url).href
const URL_RECIFE = new URL(recifeGlb, import.meta.url).href
const UMA_VEZ: readonly string[] = []
const RECIFE = ilhasEmVolta().find((i) => i.ilha.id === 'recife')!
/** Casco simples, sob o convés de 0,5 m. A câmera atravessa, como as estacas. */
/** Cabine de 1,6 × 1,1 × 1,3 m do barco.glb. Só segura o corpo. */
const CABINE = {
  meio: [0.8, 0.55, 0.65] as [number, number, number],
  centro: [-0.6, 1.05, 0] as [number, number, number],
}
const CASCO = { meio: [2.5, 0.45, 1] as [number, number, number], y: 0.05 }

export function Barcos() {
  const aberta = useEstado((s) => ilhaAberta('recife', s.jornada))
  return aberta ? (
    <ComReserva reserva={null}>
      <PortosDoBarco />
    </ComReserva>
  ) : null
}

function PortosDoBarco() {
  const { plataforma } = useJogo()
  const [portos, definir] = useState<readonly [Porto, Porto] | null>(null)
  useEffect(() => {
    const abortar = new AbortController()
    const ler = async (url: string) => {
      const r = await fetch(url, { signal: abortar.signal })
      if (!r.ok) throw new Error('Não foi possível ler as âncoras do barco')
      return r.arrayBuffer()
    }
    Promise.all([ler(MODELOS.pier), ler(URL_RECIFE)])
      .then(([pier, recife]) => {
        if (!abortar.signal.aborted)
          definir([
            ancorasDoPorto(pier, 'embarque', PIER, 0),
            ancorasDoPorto(recife, 'cais', RECIFE.centro, giroDaIlha(RECIFE.ilha)),
          ])
      })
      .catch((e) => {
        if (!abortar.signal.aborted) plataforma.relatarErro(e, 'ancoras-do-barco')
      })
    return () => abortar.abort()
  }, [plataforma])
  return portos ? <BarcoViajante portos={portos} /> : null
}

function BarcoViajante({ portos }: { portos: readonly [Porto, Porto] }) {
  const { movimento, rastro, loja } = useJogo()
  const pausado = useEstado(jogoPausado)
  const grupo = useRef<Group>(null)
  const animado = useRef<Group>(null)
  const { cena, actions, avancar } = useCopiaAnimada(URL_BARCO, animado, UMA_VEZ, pausado, true)
  const passageiro = useMemo(() => {
    const p = cena.getObjectByName('passageiro')
    if (!p) throw new Error('Barco sem âncora passageiro')
    return p
  }, [cena])
  const viagem = useMemo(
    () =>
      criarTravessia(
        portos,
        { x: passageiro.position.x, y: passageiro.position.y, z: passageiro.position.z },
        RECIFE.centro,
      ),
    [portos, passageiro],
  )
  const [recifePronto, definirRecifePronto] = useState(false)
  const [atracado, definirAtracado] = useState(true)
  const ultimo = useRef(true)
  const aviso = useRef({ esperando: false, devolvendo: false })
  const pe = useMemo(() => new Vector3(), [])
  useEffect(() => {
    movimento.barco = viagem
    return () => {
      if (movimento.barco === viagem) movimento.barco = null
    }
  }, [movimento, viagem])
  useEffect(() => trocarClipe(actions, null, 'balancar', 0, 'barco-viagem'), [actions])
  useFrame((_, dt) => {
    avancar(dt)
    const esperando = viagem.fase === 'espera'
    if (esperando && !aviso.current.esperando)
      loja.getState().dizer('O cais ainda está chegando. Vamos esperar no barco.')
    if (viagem.devolvendo && !aviso.current.devolvendo)
      loja
        .getState()
        .dizer('Vamos voltar ao cais de onde saímos. Você pode tentar a viagem de novo depois.')
    aviso.current.esperando = esperando
    aviso.current.devolvendo = viagem.devolvendo
    if (recifePronto !== viagem.recifePronto) definirRecifePronto(viagem.recifePronto)
    const parado = viagem.fase === 'atracado'
    if (parado !== ultimo.current) {
      ultimo.current = parado
      definirAtracado(parado)
    }
    const g = grupo.current
    if (!g) return
    g.position.set(viagem.pose.x, viagem.pose.y, viagem.pose.z)
    g.rotation.y = viagem.pose.giro
    // A posição física não balança: a câmera segue o casco estável. Só o desenho acompanha a âncora.
    g.updateMatrixWorld(true)
    passageiro.getWorldPosition(pe)
    Object.assign(viagem.visual, pe)
  }, -0.5)
  const agir = (porto: 0 | 1) => {
    const p = { x: rastro.x, y: rastro.y - CORPO.doCentroAoPe - CORPO.folga, z: rastro.z }
    if (
      !podeEmbarcar(
        viagem,
        porto,
        ilhaAberta('recife', loja.getState().jornada),
        movimento.noChao,
        p,
      )
    )
      return
    loja
      .getState()
      .dizer(
        porto === 0
          ? 'Vamos de barco até o Recife Coral. Você pode olhar a paisagem durante a viagem.'
          : 'Vamos de barco até a sua ilha. Você pode olhar a paisagem durante a viagem.',
      )
    embarcar(viagem, porto, p)
    movimento.pedido = { tipo: 'barco', viagem }
  }
  return (
    <>
      <Embarque viagem={viagem} porto={0} agir={() => agir(0)} />
      <Embarque viagem={viagem} porto={1} agir={() => agir(1)} />
      {atracado && (
        <>
          <BarcoAtracado porto={portos[0]} id="central" />
          {recifePronto && <BarcoAtracado porto={portos[1]} id="recife" />}
        </>
      )}
      <group ref={grupo} name="barco-da-viagem" visible={!atracado}>
        <group ref={animado}>
          <primitive object={cena} />
        </group>
      </group>
    </>
  )
}

function Embarque({ viagem, porto, agir }: { viagem: Travessia; porto: 0 | 1; agir: () => void }) {
  const { movimento, rastro } = useJogo()
  const e = viagem.portos[porto].embarque
  useInterativo(`barco-${porto}`, {
    x: e.x,
    z: e.z,
    raio: BARCO.alcance,
    rotulo: () =>
      viagem.fase === 'atracado' &&
      movimento.modo === 'chao' &&
      movimento.noChao &&
      Math.abs(rastro.y - CORPO.doCentroAoPe - CORPO.folga - e.y) < 0.5 &&
      (porto === 0 || viagem.recifePronto)
        ? 'Embarcar'
        : null,
    agir,
  })
  return null
}

function BarcoAtracado({ porto, id }: { porto: Porto; id: string }) {
  const pausado = useEstado(jogoPausado)
  const raiz = useRef<Group>(null)
  const { cena, actions } = useCopiaAnimada(URL_BARCO, raiz, UMA_VEZ, pausado)
  useEffect(() => trocarClipe(actions, null, 'balancar', 0, `barco-${id}`), [actions, id])
  return (
    <group position={[porto.barco.x, porto.barco.y, porto.barco.z]} rotation={[0, porto.giro, 0]}>
      <group ref={raiz}>
        <primitive object={cena} />
      </group>
      <RigidBody type="fixed" colliders={false} userData={{ barco: true }}>
        <CuboidCollider {...gruposDoColisor(true)} args={CASCO.meio} position={[0, CASCO.y, 0]} />
        <CuboidCollider {...gruposDoColisor(true)} args={CABINE.meio} position={CABINE.centro} />
      </RigidBody>
    </group>
  )
}
