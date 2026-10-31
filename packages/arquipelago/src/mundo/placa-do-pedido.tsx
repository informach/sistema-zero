import { useFrame } from '@react-three/fiber'
import { ILHA_DO_PEDIDO, type MoradorDoPedido } from '@sistemazero/arquipelago-contracts'
import { useEffect, useMemo, useRef } from 'react'
import {
  BufferAttribute,
  CanvasTexture,
  Color,
  Mesh,
  MeshBasicMaterial,
  type PointLight,
  SRGBColorSpace,
} from 'three'
import placaGlb from '../assets/itens/placa-quadro.glb'
import { useEstado, useJogo } from '../estado/contexto'
import { lojaDosDesafios, useDesafios } from '../estado/desafios'
import { pedidoDoEstudio, placaDoPedidoAcesa } from '../sistemas/pedido-do-estudio'
import { Colisores } from './colisores'
import type { ColisorDaIlha } from './colisores-da-ilha'
import { alturaDaIlha } from './medidas'
import { ComReserva, useModelo } from './modelos'

const URL_DA_PLACA = new URL(placaGlb, import.meta.url).href
const COLISORES: ColisorDaIlha[] = [
  {
    forma: 'caixa',
    nome: 'col-placa-do-pedido',
    posicao: [0, 0.5, 0],
    rotacao: [0, 0, 0, 1],
    meio: [0.48, 0.5, 0.09],
  },
]
/** Ao lado do Nico, um passo para dentro da areia, longe do acesso ao píer. */
export const PLACA_DO_NICO = { x: -1.4, z: 23.6, giro: 0 } as const
/** A face à noite: apagada (pedido por fazer) fica escura; acesa, brilha e ilumina em volta. */
const NOITE_APAGADA = new Color(0.32, 0.34, 0.45)
const CHEIA = new Color(1, 1, 1)
export const LUZ_DA_PLACA = { cor: '#ffd98a', intensidade: 2.2, alcance: 5 } as const

/** Como a placa chama o morador ("Pedido da Capi"). */
const DO_MORADOR: Readonly<Record<MoradorDoPedido, string>> = {
  capi: 'da Capi',
  bento: 'do Bento',
  mare: 'da Maré',
  floco: 'do Floco',
  jade: 'da Jade',
  irie: 'da Iriê',
  nico: 'do Nico',
}
const NOME: Readonly<Record<MoradorDoPedido, string>> = {
  capi: 'a Capi',
  bento: 'o Bento',
  mare: 'a Maré',
  floco: 'o Floco',
  jade: 'a Jade',
  irie: 'a Iriê',
  nico: 'o Nico',
}

/**
 * Onde fica a placa de um morador do anel: à frente dele e um pouco para o lado (atrás costuma
 * estar a casa dele), virada para quem chega.
 */
export function placaAoLadoDoMorador(lugar: {
  x: number
  y: number
  z: number
  descanso: number
}): LugarDaPlaca {
  const frente = 1.2
  const lado = 1.5
  const s = Math.sin(lugar.descanso)
  const c = Math.cos(lugar.descanso)
  return {
    x: lugar.x + s * frente + c * lado,
    y: lugar.y,
    z: lugar.z + c * frente - s * lado,
    giro: lugar.descanso,
  }
}
export interface LugarDaPlaca {
  x: number
  y: number
  z: number
  giro: number
}

/**
 * A placa do pedido de um morador (§6.28, A23; em toda ilha desde as lacunas de 01/11/2026): o
 * mesmo modelo da placa da ponte, com o pedido escrito. Só aparece com um pedido publicado para a
 * ilha do morador. De noite ela fica escura até o pedido ser feito; feito, acende à noite. Sem
 * `lugar`, é a do Nico, na praia da sua ilha.
 */
export function PlacaDoPedido({
  quem = 'nico',
  lugar,
}: {
  quem?: MoradorDoPedido
  lugar?: LugarDaPlaca
}) {
  const { loja, plataforma } = useJogo()
  const desafios = lojaDosDesafios(loja, plataforma)
  const dados = useDesafios(desafios, (s) => s.dados)
  // Na visita, a casa é de outra pessoa: o pedido seria o de quem visita.
  const visita = useEstado((s) => s.visita !== null)
  useEffect(() => {
    if (!visita && !desafios.getState().dados) void desafios.getState().carregar()
  }, [desafios, visita])
  const ilha = ILHA_DO_PEDIDO[quem]
  const pedido = visita ? null : pedidoDoEstudio(dados, ilha)
  if (!pedido) return null
  const onde = lugar ?? {
    ...PLACA_DO_NICO,
    y: alturaDaIlha(PLACA_DO_NICO.x, PLACA_DO_NICO.z),
  }
  return (
    <ComReserva reserva={null}>
      <PlacaCarregada
        quem={quem}
        lugar={onde}
        titulo={pedido.titulo}
        acesa={placaDoPedidoAcesa(dados, ilha)}
      />
    </ComReserva>
  )
}

function PlacaCarregada({
  quem,
  lugar,
  titulo,
  acesa,
}: {
  quem: MoradorDoPedido
  lugar: LugarDaPlaca
  titulo: string
  acesa: boolean
}) {
  const { ambiente } = useJogo()
  const original = useModelo(URL_DA_PLACA)
  const luz = useRef<PointLight>(null)
  const desenho = useMemo(() => {
    const cena = original.clone(true)
    const tela = document.createElement('canvas')
    tela.width = 768
    tela.height = 384
    const ctx = tela.getContext('2d')
    if (!ctx) throw new Error('A face da placa não pôde ser desenhada')
    ctx.fillStyle = acesa ? '#fff3ce' : '#f1ead8'
    ctx.fillRect(0, 0, tela.width, tela.height)
    ctx.fillStyle = '#27334c'
    ctx.textAlign = 'center'
    ctx.font = 'bold 44px sans-serif'
    ctx.fillText(`Pedido ${DO_MORADOR[quem]}`, 384, 90)
    ctx.font = '42px sans-serif'
    ctx.fillText(titulo, 384, 180, 720)
    ctx.font = 'italic 36px sans-serif'
    ctx.fillText(acesa ? 'Feito por você' : `Converse com ${NOME[quem]}`, 384, 290)
    const textura = new CanvasTexture(tela)
    textura.colorSpace = SRGBColorSpace
    const material = new MeshBasicMaterial({ map: textura })
    const geometrias: Mesh['geometry'][] = []
    cena.getObjectByName('texto')?.traverse((o) => {
      if (!(o instanceof Mesh)) return
      o.geometry = o.geometry.clone()
      geometrias.push(o.geometry)
      o.geometry.computeBoundingBox()
      const caixa = o.geometry.boundingBox
      if (!caixa) return
      const p = o.geometry.attributes.position
      if (!p) return
      const uv = new Float32Array(p.count * 2)
      for (let i = 0; i < p.count; i++) {
        uv[i * 2] = (p.getX(i) - caixa.min.x) / (caixa.max.x - caixa.min.x)
        uv[i * 2 + 1] = (p.getY(i) - caixa.min.y) / (caixa.max.y - caixa.min.y)
      }
      o.geometry.setAttribute('uv', new BufferAttribute(uv, 2))
      o.material = material
    })
    return { cena, textura, material, geometrias }
  }, [original, titulo, acesa, quem])
  useEffect(
    () => () => {
      desenho.textura.dispose()
      desenho.material.dispose()
      for (const g of desenho.geometrias) g.dispose()
    },
    [desenho],
  )
  // A luz só muda na virada do dia: compara antes de mexer no material.
  const noiteAntes = useRef<boolean | null>(null)
  useFrame(() => {
    const noite = ambiente.noite === true
    if (noiteAntes.current === noite) return
    noiteAntes.current = noite
    desenho.material.color.copy(noite && !acesa ? NOITE_APAGADA : CHEIA)
    if (luz.current) luz.current.intensity = noite && acesa ? LUZ_DA_PLACA.intensidade : 0
  })
  const { x, y, z, giro } = lugar
  return (
    <group
      name={`placa-do-pedido-${quem}`}
      position={[x, y, z]}
      rotation={[0, giro, 0]}
      dispose={null}
    >
      <primitive object={desenho.cena} />
      <pointLight
        ref={luz}
        position={[0, 1.1, 0.6]}
        color={LUZ_DA_PLACA.cor}
        intensity={0}
        distance={LUZ_DA_PLACA.alcance}
      />
      <Colisores lista={COLISORES} />
    </group>
  )
}
