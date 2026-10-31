import { useFrame } from '@react-three/fiber'
import { useBeforePhysicsStep } from '@react-three/rapier'
import { ilhaVisitada } from '@sistemazero/arquipelago-contracts'
import { useEffect, useMemo } from 'react'
import type { Mesh, Object3D } from 'three'
import segredosGlb from '../assets/mundo/segredos-da-ilha.glb'
import { type CipoVivo, useEstado, useJogo } from '../estado/contexto'
import { CIPO, comprimentoDaPegada, criarBalanco } from '../sistemas/cipo'
import { CORDAS, criarPontos, passoDasCordas } from '../sistemas/cordas'
import { CORPO } from '../sistemas/corpo'
import { MERGULHO, podeMergulhar, type VolumeDeMergulho } from '../sistemas/mergulho'
import { segredoDoMovimento } from '../sistemas/segredos'
import {
  type CipoDesenhado,
  desenharCipo,
  desmontarCipoDesenhado,
  prepararCipoDesenhado,
} from './cipo-desenhado'
import { Colisores } from './colisores'
import { lerColisores } from './colisores-da-ilha'
import { useInterativo } from './interativos'
import { alturaDaIlha, FUNDO_DO_MAR, NIVEL_DA_AGUA, PASSO_DA_FISICA, PIER } from './medidas'
import { ComReserva, MODELOS, useModelo } from './modelos'
import { BauDoSegredo } from './segredos-das-ilhas'

const URL_DOS_SEGREDOS = new URL(segredosGlb, import.meta.url).href

export const TEXTOS_DA_SUA_ILHA = {
  cipoSemBosque: 'Um cipó bem alto. Balançar assim a gente aprende no Bosque dos Bichos.',
  olharCipo: 'Olhar o cipó',
  mergulhar: 'Mergulhar na gruta',
  olharGruta: 'Olhar a água',
  semRecife:
    'Tem uma gruta aqui embaixo do píer. Mergulhar até lá a gente aprende no Recife Coral.',
  mergulho: 'Explore com calma. Espaço sobe e Q desce. No toque, use Subir e Descer.',
} as const

/**
 * O segredo do cipó na sua ilha (B11, `segredos-da-ilha.glb`, em coordenadas do mundo): a árvore
 * alta perto das pedras, o deque no alto que só o balanço alcança e o baú da Íris nele. A árvore e
 * o deque estão sempre lá; o cipó só balança para quem já aprendeu no Bosque dos Bichos (a ilha
 * visitada), como os cipós de lá (`bosque-vivo.tsx`).
 */
export function SegredoDoCipo() {
  return (
    <ComReserva reserva={null}>
      <CipoCarregado />
    </ComReserva>
  )
}

function CipoCarregado() {
  const raiz = useModelo(URL_DOS_SEGREDOS)
  const sabeCipo = useEstado(
    (s) => s.visita === null && ilhaVisitada(s.salvamento.ilhasVisitadas, 'bosque'),
  )
  const { cena, colisores, bau } = useMemo(() => {
    const cena = raiz.clone(true)
    const ancora = cena.getObjectByName(segredoDoMovimento('cipo').ancora)?.position
    return {
      cena,
      colisores: lerColisores(raiz),
      bau: ancora ? { x: ancora.x, y: ancora.y, z: ancora.z } : null,
    }
  }, [raiz])
  const no = useMemo(() => cena.getObjectByName('cipo-1') ?? null, [cena])
  return (
    <>
      <primitive object={cena} dispose={null} />
      <Colisores lista={colisores} />
      {no && sabeCipo ? <CipoDaSuaIlha no={no} /> : null}
      {no && !sabeCipo ? <CipoParado no={no} /> : null}
      {bau ? <BauDoSegredo segredo={segredoDoMovimento('cipo')} lugar={bau} /> : null}
    </>
  )
}

/** A corda do nó `cipo-1`: do pivô até o ponto mais baixo (a alça). */
function cordaDoNo(no: Object3D): number {
  let fundo = no.position.y
  no.traverse((o) => {
    const m = o as Mesh
    if (!m.isMesh) return
    m.geometry.computeBoundingBox()
    const b = m.geometry.boundingBox
    if (b) fundo = Math.min(fundo, no.position.y + b.min.y)
  })
  return no.position.y - fundo
}

/** Sem o Bosque, o cipó só se olha. */
function CipoParado({ no }: { no: Object3D }) {
  const { loja } = useJogo()
  useInterativo('sua-ilha:cipo', {
    x: no.position.x,
    z: no.position.z,
    raio: CIPO.raioDaDica,
    deFundo: true,
    rotulo: () => (loja.getState().visita ? null : TEXTOS_DA_SUA_ILHA.olharCipo),
    agir: () => loja.getState().dizer(TEXTOS_DA_SUA_ILHA.cipoSemBosque),
  })
  return null
}

function CipoDaSuaIlha({ no }: { no: Object3D }) {
  const { movimento, rastro } = useJogo()
  const cipo = useMemo<{ vivo: CipoVivo; desenho: CipoDesenhado | null }>(() => {
    const pivo = { x: no.position.x, y: no.position.y, z: no.position.z }
    const corda = cordaDoNo(no)
    const chao = alturaDaIlha(pivo.x, pivo.z)
    const vivo: CipoVivo = {
      id: 'sua-ilha:cipo-1',
      pivo,
      corda,
      pegada: comprimentoDaPegada(pivo.y, chao, corda, CORPO.doCentroAoPe),
      balanco: criarBalanco(),
      seguro: false,
      soltoEm: Number.NEGATIVE_INFINITY,
      ...criarPontos(pivo, corda),
      chao,
      esperandoOCorpoSair: false,
    }
    vivo.balanco.comprimento = vivo.pegada
    return { vivo, desenho: null }
  }, [no])
  const vento = useMemo(() => ({ tempo: 0, hora: 9 }), [])
  useEffect(() => {
    movimento.cipos.push(cipo.vivo)
    cipo.desenho = prepararCipoDesenhado(no, cipo.vivo.corda, CORDAS.elos)
    return () => {
      const i = movimento.cipos.indexOf(cipo.vivo)
      if (i >= 0) movimento.cipos.splice(i, 1)
      if (cipo.desenho) desmontarCipoDesenhado(cipo.desenho)
      cipo.desenho = null
    }
  }, [movimento, cipo, no])
  useBeforePhysicsStep(() => {
    vento.tempo += PASSO_DA_FISICA
    passoDasCordas([cipo.vivo], movimento.corpoDesenhado, [], PASSO_DA_FISICA, vento)
  })
  useFrame(() => {
    if (cipo.desenho) desenharCipo(cipo.desenho, cipo.vivo.pontos)
  })
  const noChao = () =>
    movimento.modo === 'chao' && rastro.y - CORPO.doCentroAoPe < cipo.vivo.chao + 0.6
  useInterativo(cipo.vivo.id, {
    x: cipo.vivo.pivo.x,
    z: cipo.vivo.pivo.z,
    raio: CIPO.raioDaDica,
    rotulo: () => (noChao() && !cipo.vivo.seguro ? 'Pegar o cipó' : null),
    agir: () => {
      movimento.pedido = { tipo: 'cipo', id: cipo.vivo.id }
    },
  })
  return null
}

/**
 * O segredo do mergulho na sua ilha (B11, a gruta do `pier.glb`): a área de mergulho em volta da
 * gruta (âncora `area-mergulho-gruta`, o raio na escala), a entrada perto da ponta do píer e o baú
 * da Íris lá dentro, que se abre nadando. Mergulhar aqui pede ter estado no Recife Coral, onde a
 * criança aprende a mergulhar; antes disso, a água só se olha.
 */
export function MergulhoDaGruta() {
  return (
    <ComReserva reserva={null}>
      <GrutaCarregada />
    </ComReserva>
  )
}

function GrutaCarregada() {
  const { loja, movimento, rastro } = useJogo()
  const raiz = useModelo(MODELOS.pier)
  const sabeMergulhar = useEstado(
    (s) => s.visita === null && ilhaVisitada(s.salvamento.ilhasVisitadas, 'recife'),
  )
  const lugares = useMemo(() => {
    const area = raiz.getObjectByName('area-mergulho-gruta')
    const entrada = raiz.getObjectByName('mergulho-gruta')?.position
    const bau = raiz.getObjectByName(segredoDoMovimento('mergulho').ancora)?.position
    if (!area || !entrada || !bau) return null
    const volume: VolumeDeMergulho = {
      id: 'sua-ilha:gruta',
      x: PIER.x + area.position.x,
      z: PIER.z + area.position.z,
      raio: area.scale.x,
      fundo: FUNDO_DO_MAR,
      superficie: NIVEL_DA_AGUA,
      entrada: { x: PIER.x + entrada.x, y: entrada.y, z: PIER.z + entrada.z },
      ativo: true,
    }
    return { volume, bau: { x: PIER.x + bau.x, y: bau.y, z: PIER.z + bau.z } }
  }, [raiz])
  useEffect(() => {
    if (!lugares || !sabeMergulhar) return
    const lista = movimento.mergulhos ?? []
    movimento.mergulhos = lista
    lista.push(lugares.volume)
    return () => {
      const i = lista.indexOf(lugares.volume)
      if (i >= 0) lista.splice(i, 1)
    }
  }, [lugares, sabeMergulhar, movimento])
  useInterativo('sua-ilha:mergulhar', {
    x: lugares?.volume.entrada.x ?? PIER.x,
    z: lugares?.volume.entrada.z ?? PIER.z,
    raio: MERGULHO.alcance + 0.6,
    rotulo: () => {
      const s = loja.getState()
      if (!lugares || s.visita || movimento.modo !== 'chao') return null
      return sabeMergulhar ? TEXTOS_DA_SUA_ILHA.mergulhar : TEXTOS_DA_SUA_ILHA.olharGruta
    },
    agir() {
      const s = loja.getState()
      if (!lugares || s.visita) return
      if (!sabeMergulhar) {
        s.dizer(TEXTOS_DA_SUA_ILHA.semRecife)
        return
      }
      const { volume } = lugares
      // Como no Recife: a criança desce à água na entrada e o mergulho começa dali.
      s.mudar((v) => ({
        ...v,
        posicao: { x: volume.entrada.x, y: NIVEL_DA_AGUA + 0.65, z: volume.entrada.z },
      }))
      const naEntrada = { x: volume.entrada.x, y: NIVEL_DA_AGUA + 0.65, z: volume.entrada.z }
      if (!podeMergulhar(volume, naEntrada) && !podeMergulhar(volume, rastro)) return
      movimento.pedido = { tipo: 'mergulho', volume }
      s.dizer(TEXTOS_DA_SUA_ILHA.mergulho)
    },
  })
  if (!lugares) return null
  return <BauDoSegredo segredo={segredoDoMovimento('mergulho')} lugar={lugares.bau} submerso />
}
