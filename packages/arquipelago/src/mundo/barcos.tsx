import { useFrame } from '@react-three/fiber'
import { CuboidCollider, RigidBody } from '@react-three/rapier'
import { ilha, ilhaAberta } from '@sistemazero/arquipelago-contracts'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { type Group, Vector3 } from 'three'
import barcoGlb from '../assets/ilhas/barco.glb'
import { useEstado, useJogo } from '../estado/contexto'
import {
  BARCO,
  criarRotaDoBarco,
  criarTravessia,
  embarcar,
  type Porto,
  type PortoId,
  podeEmbarcar,
  type RotaDoBarco,
  type Travessia,
} from '../sistemas/barco'
import { CORPO } from '../sistemas/corpo'
import { jogoPausado } from '../sistemas/pausa'
import {
  caisPronto,
  destinosDoPorto,
  LIGACOES_DO_BARCO,
  ligacaoAberta,
  PAINEL_DO_BARCO,
  portoDoPainel,
} from '../sistemas/rede-do-barco'
import { trocarClipe, useCopiaAnimada } from './animado'
import { gruposDoColisor } from './grupos'
import { useInterativo } from './interativos'
import { centroNoAnel } from './medidas'
import { ComReserva } from './modelos'
import { PORTOS_DA_ARTE } from './portos-da-arte'
import { FALA_DA_REGATA, RegataDasBoias, rotaDaRegata } from './regata-das-boias'

const URL_BARCO = new URL(barcoGlb, import.meta.url).href
const UMA_VEZ: readonly string[] = []
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

const IDS_DOS_PORTOS: PortoId[] = [
  'sua-ilha',
  'bosque',
  'vila-doce',
  'recife',
  'pico',
  'vale-dos-dinos',
  'nuvens',
]
const centro = (id: PortoId) => (id === 'sua-ilha' ? null : { ...centroNoAnel(ilha(id)), y: 0 })

function PortosDoBarco() {
  const { movimento, rastro, loja } = useJogo()
  const jornada = useEstado((s) => s.jornada)
  const pausado = useEstado(jogoPausado)
  const grupo = useRef<Group>(null)
  const animado = useRef<Group>(null)
  const { cena, actions, avancar } = useCopiaAnimada(URL_BARCO, animado, UMA_VEZ, pausado, true)
  const passageiro = useMemo(() => {
    const p = cena.getObjectByName('passageiro')
    if (!p) throw new Error('Barco sem âncora passageiro')
    return p
  }, [cena])
  const cacheDasRotas = useRef(new Map<string, RotaDoBarco>())
  const obterRota = useCallback((a: PortoId, b: PortoId) => {
    const chave = `${a}:${b}`
    let rota = cacheDasRotas.current.get(chave)
    if (!rota) {
      rota = criarRotaDoBarco(PORTOS_DA_ARTE[a], PORTOS_DA_ARTE[b], [a, b])
      cacheDasRotas.current.set(chave, rota)
    }
    return rota
  }, [])
  const criar = useCallback(
    (a: PortoId, b: PortoId) =>
      criarTravessia(
        [PORTOS_DA_ARTE[a], PORTOS_DA_ARTE[b]],
        { x: passageiro.position.x, y: passageiro.position.y, z: passageiro.position.z },
        [centro(a), centro(b)],
        [a, b],
        obterRota(a, b),
      ),
    [passageiro, obterRota],
  )
  const [viagem, definirViagem] = useState<Travessia>(() => criar('sua-ilha', 'recife'))
  const atual = useRef(viagem)
  atual.current = viagem
  const [visiveis, definirVisiveis] = useState(0)
  const mascara = useRef(0)
  const aviso = useRef({ esperando: false, devolvendo: false })
  const pe = useMemo(() => new Vector3(), [])
  const rotas = useMemo(
    () =>
      LIGACOES_DO_BARCO.filter(([a, b]) => ligacaoAberta(a, b, jornada)).map(([a, b]) =>
        obterRota(a, b),
      ),
    [jornada, obterRota],
  )
  useEffect(() => {
    movimento.rotasDoBarco = rotas
    return () => {
      if (movimento.rotasDoBarco === rotas) movimento.rotasDoBarco = []
    }
  }, [movimento, rotas])
  useEffect(() => {
    movimento.barco = viagem
    return () => {
      if (movimento.barco === viagem) movimento.barco = null
    }
  }, [movimento, viagem])
  useEffect(() => {
    const embarcarPara = (origem: PortoId, destino: PortoId) => {
      const s = loja.getState(),
        v = atual.current
      if (
        s.painelAberto !== PAINEL_DO_BARCO + origem ||
        s.visita ||
        jogoPausado({ ...s, painelAberto: null }) ||
        movimento.modo !== 'chao' ||
        !ligacaoAberta(origem, destino, s.jornada) ||
        !caisPronto(origem, movimento.caisProntos) ||
        v.fase !== 'atracado'
      )
        return false
      const proxima = criar(origem, destino)
      proxima.prontos = [
        caisPronto(origem, movimento.caisProntos),
        caisPronto(destino, movimento.caisProntos),
      ]
      const p = { x: rastro.x, y: rastro.y - CORPO.doCentroAoPe - CORPO.folga, z: rastro.z }
      if (!podeEmbarcar(proxima, 0, true, movimento.noChao, p)) return false
      embarcar(proxima, 0, p)
      atual.current = proxima
      movimento.barco = proxima
      movimento.pedido = { tipo: 'barco', viagem: proxima }
      definirViagem(proxima)
      s.abrirPainel(null)
      s.dizer(
        `Vamos de barco até ${ilha(destino).nome}. Você pode olhar a paisagem durante a viagem.`,
      )
      return true
    }
    movimento.embarcarPara = embarcarPara
    // A volta das boias (lacunas, 01/11/2026): do cais da sua ilha, em volta dela, e de volta.
    const embarcarNaRegata = () => {
      const s = loja.getState(),
        v = atual.current
      if (
        s.painelAberto !== `${PAINEL_DO_BARCO}sua-ilha` ||
        s.visita ||
        jogoPausado({ ...s, painelAberto: null }) ||
        movimento.modo !== 'chao' ||
        destinosDoPorto('sua-ilha', s.jornada).length === 0 ||
        !caisPronto('sua-ilha', movimento.caisProntos) ||
        v.fase !== 'atracado'
      )
        return false
      const porto = PORTOS_DA_ARTE['sua-ilha']
      const proxima = criarTravessia(
        [porto, porto],
        { x: passageiro.position.x, y: passageiro.position.y, z: passageiro.position.z },
        [null, null],
        ['sua-ilha', 'sua-ilha'],
        rotaDaRegata(),
      )
      proxima.regata = { lado: 0, remo: 0 }
      proxima.prontos = [true, true]
      const p = { x: rastro.x, y: rastro.y - CORPO.doCentroAoPe - CORPO.folga, z: rastro.z }
      if (!podeEmbarcar(proxima, 0, true, movimento.noChao, p)) return false
      embarcar(proxima, 0, p)
      atual.current = proxima
      movimento.barco = proxima
      movimento.pedido = { tipo: 'barco', viagem: proxima }
      definirViagem(proxima)
      s.abrirPainel(null)
      s.dizer(FALA_DA_REGATA)
      return true
    }
    movimento.embarcarNaRegata = embarcarNaRegata
    return () => {
      if (movimento.embarcarPara === embarcarPara) movimento.embarcarPara = null
      if (movimento.embarcarNaRegata === embarcarNaRegata) movimento.embarcarNaRegata = null
    }
  }, [movimento, loja, rastro, criar, passageiro])
  useEffect(() => trocarClipe(actions, null, 'balancar', 0, 'barco-viagem'), [actions])
  useFrame((_, dt) => {
    const v = atual.current
    const s = loja.getState()
    const origemDoPainel = portoDoPainel(s.painelAberto)
    if (origemDoPainel) {
      const e = PORTOS_DA_ARTE[origemDoPainel].embarque
      if (
        s.visita ||
        jogoPausado({ ...s, painelAberto: null }) ||
        !caisPronto(origemDoPainel, movimento.caisProntos) ||
        movimento.modo !== 'chao' ||
        Math.hypot(rastro.x - e.x, rastro.z - e.z) > BARCO.alcance ||
        Math.abs(rastro.y - CORPO.doCentroAoPe - CORPO.folga - e.y) >= 0.5
      )
        s.abrirPainel(null)
    }
    v.prontos[0] = caisPronto(v.itinerario[0], movimento.caisProntos)
    v.prontos[1] = caisPronto(v.itinerario[1], movimento.caisProntos)
    avancar(dt)
    const esperando = v.fase === 'espera'
    if (esperando && !aviso.current.esperando)
      loja.getState().dizer('O cais ainda está chegando. Vamos esperar no barco.')
    if (v.devolvendo && !aviso.current.devolvendo)
      loja
        .getState()
        .dizer('Vamos voltar ao cais de onde saímos. Você pode tentar a viagem de novo depois.')
    aviso.current.esperando = esperando
    aviso.current.devolvendo = v.devolvendo
    let proximos = 0
    if (v.fase === 'atracado')
      for (let i = 0; i < IDS_DOS_PORTOS.length; i++) {
        const id = IDS_DOS_PORTOS[i]!,
          p = PORTOS_DA_ARTE[id].embarque
        if (
          ilhaAberta(id, jornada) &&
          caisPronto(id, movimento.caisProntos) &&
          Math.hypot(p.x - rastro.x, p.z - rastro.z) < 43
        )
          proximos |= 1 << i
      }
    if (proximos !== mascara.current) {
      mascara.current = proximos
      definirVisiveis(proximos)
    }
    const g = grupo.current
    if (!g) return
    g.visible = v.fase !== 'atracado'
    g.position.set(v.pose.x, v.pose.y, v.pose.z)
    g.rotation.y = v.pose.giro
    g.updateMatrixWorld(true)
    passageiro.getWorldPosition(pe)
    Object.assign(v.visual, pe)
  }, -0.5)
  return (
    <>
      {IDS_DOS_PORTOS.map((id, i) =>
        (visiveis & (1 << i)) !== 0 ? (
          <group key={id}>
            <Embarque id={id} />
            <BarcoAtracado porto={PORTOS_DA_ARTE[id]} id={id} />
          </group>
        ) : null,
      )}
      <RegataDasBoias />
      <group ref={grupo} name="barco-da-viagem" visible={false}>
        <group ref={animado}>
          <primitive object={cena} />
        </group>
      </group>
    </>
  )
}

function Embarque({ id }: { id: PortoId }) {
  const { movimento, rastro, loja } = useJogo()
  const e = PORTOS_DA_ARTE[id].embarque
  const disponivel = () => {
    const s = loja.getState()
    return (
      !s.visita &&
      !jogoPausado(s) &&
      movimento.barco?.fase === 'atracado' &&
      movimento.modo === 'chao' &&
      movimento.noChao &&
      caisPronto(id, movimento.caisProntos) &&
      Math.abs(rastro.y - CORPO.doCentroAoPe - CORPO.folga - e.y) < 0.5 &&
      destinosDoPorto(id, s.jornada).length > 0
    )
  }
  useInterativo(`barco-${id}`, {
    x: e.x,
    z: e.z,
    raio: BARCO.alcance,
    rotulo: () => (disponivel() ? 'Embarcar' : null),
    agir: () => {
      if (disponivel()) loja.getState().abrirPainel(PAINEL_DO_BARCO + id)
    },
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
