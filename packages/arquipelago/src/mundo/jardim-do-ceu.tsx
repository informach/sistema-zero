import {
  CANTEIROS_DO_CEU,
  type EstagioDoCeu,
  estagioNoCeu,
  plantaNoCanteiro,
  type SementeDoCeu,
} from '@sistemazero/arquipelago-contracts'
import { useEffect, useMemo, useState } from 'react'
import type { Object3D } from 'three'
import plantasGlb from '../assets/itens/plantas-do-ceu.glb'
import { useEstado, useJogo } from '../estado/contexto'
import {
  colherNoJardim,
  painelDoCanteiroDoCeu,
  quandoFloresce,
  TEXTOS_DO_JARDIM_DO_CEU,
} from '../sistemas/jardim-do-ceu'
import { jogoPausado } from '../sistemas/pausa'
import { paraOMundo } from './bosque'
import { useInterativo } from './interativos'
import { ComReserva, copiarNo, useModelo } from './modelos'

const URL_DAS_PLANTAS = new URL(plantasGlb, import.meta.url).href
const K = Array.from({ length: CANTEIROS_DO_CEU }, (_, i) => i + 1)
/** O nó do `plantas-do-ceu.glb` de cada estágio (a flor aberta é o `maduro`, como na horta). */
const SUFIXO: Record<Exclude<EstagioDoCeu, 'vazio'>, string> = {
  broto: 'broto',
  crescendo: 'crescendo',
  flor: 'maduro',
}

/**
 * O jardim do céu (B6): uma planta em cada canteiro do terraço das Nuvens (âncoras `canteiro-ceu-1`
 * a `-6`, no chão do canteiro). Vazio, o canteiro oferece plantar (o painel escolhe a planta);
 * crescendo, diz quando floresce; com a flor aberta, colher manda a flor para a sua ilha. Na visita
 * só se olha.
 */
export function JardimDoCeu({
  modelo,
  meio,
  giro,
}: {
  modelo: Object3D
  meio: { x: number; y: number; z: number }
  giro: number
}) {
  const lugares = useMemo(
    () =>
      K.flatMap((k) => {
        const p = modelo.getObjectByName(`canteiro-ceu-${k}`)?.position
        return p ? [{ k, ...paraOMundo(p, meio, giro, { x: 0, y: 0, z: 0 }) }] : []
      }),
    [modelo, meio, giro],
  )
  const [agora, setAgora] = useState(() => Date.now())
  useEffect(() => {
    const t = setInterval(() => setAgora(Date.now()), 5000)
    return () => clearInterval(t)
  }, [])
  return (
    <>
      {lugares.map((l) => (
        <CanteiroDoCeu key={l.k} k={l.k} lugar={l} giro={giro} agora={agora} />
      ))}
    </>
  )
}

function CanteiroDoCeu({
  k,
  lugar,
  giro,
  agora,
}: {
  k: number
  lugar: { x: number; y: number; z: number }
  giro: number
  agora: number
}) {
  const { loja } = useJogo()
  const ceu = useEstado((s) => (s.visita ? null : s.salvamento.ceu))
  const planta = ceu ? plantaNoCanteiro(ceu, k) : null
  const fase = ceu ? estagioNoCeu(ceu, k, agora) : 'vazio'
  const pode = () => {
    const s = loja.getState()
    return !s.visita && !jogoPausado(s) && !s.acesso.somenteLeitura
  }
  useInterativo(`jardim-do-ceu-${k}`, {
    x: lugar.x,
    z: lugar.z,
    raio: 1.4,
    rotulo: () => {
      if (!pode()) return null
      const s = loja.getState().salvamento
      const f = estagioNoCeu(s.ceu, k, Date.now())
      if (f === 'vazio') return TEXTOS_DO_JARDIM_DO_CEU.plantar
      const p = plantaNoCanteiro(s.ceu, k)
      if (f === 'flor' && p) return TEXTOS_DO_JARDIM_DO_CEU.colher(p.semente)
      return TEXTOS_DO_JARDIM_DO_CEU.verQuando
    },
    agir: () => {
      if (!pode()) return
      const s = loja.getState()
      const f = estagioNoCeu(s.salvamento.ceu, k, Date.now())
      if (f === 'vazio') {
        s.abrirPainel(painelDoCanteiroDoCeu(k))
        return
      }
      if (f === 'flor') {
        const novo = colherNoJardim(s.salvamento, k, Date.now())
        if (!novo) return
        s.mudar(() => novo)
        s.dizer(TEXTOS_DO_JARDIM_DO_CEU.colheu(novo.florada))
        return
      }
      const fala = quandoFloresce(s.salvamento, k, Date.now())
      if (fala) s.dizer(fala)
    },
  })
  useEffect(
    () => () => {
      const s = loja.getState()
      if (s.painelAberto === painelDoCanteiroDoCeu(k)) s.abrirPainel(null)
    },
    [loja, k],
  )
  if (!planta || fase === 'vazio') return null
  return (
    <ComReserva reserva={null}>
      <PlantaDoCeu semente={planta.semente} fase={fase} lugar={lugar} giro={giro + k * 1.3} />
    </ComReserva>
  )
}

function PlantaDoCeu({
  semente,
  fase,
  lugar,
  giro,
}: {
  semente: SementeDoCeu
  fase: Exclude<EstagioDoCeu, 'vazio'>
  lugar: { x: number; y: number; z: number }
  giro: number
}) {
  const raiz = useModelo(URL_DAS_PLANTAS)
  const no = useMemo(() => copiarNo(raiz, `${semente}-${SUFIXO[fase]}`), [raiz, semente, fase])
  return (
    <group
      position={[lugar.x, lugar.y, lugar.z]}
      rotation-y={giro}
      name={`planta-do-ceu-${semente}`}
    >
      <primitive object={no} dispose={null} />
    </group>
  )
}
