import type { Ilha } from '@sistemazero/arquipelago-contracts'
import { useEffect, useMemo } from 'react'
import { BufferAttribute, CanvasTexture, Mesh, MeshBasicMaterial, SRGBColorSpace } from 'three'
import placaGlb from '../assets/itens/placa-quadro.glb'
import { useJogo } from '../estado/contexto'
import { useVoz } from '../interface/voz'
import type { Tabua } from './colisao-da-ilha-central'
import { Colisores } from './colisores'
import type { ColisorDaIlha } from './colisores-da-ilha'
import { useInterativo } from './interativos'
import { ComReserva, useModelo } from './modelos'

const URL_DA_PLACA = new URL(placaGlb, import.meta.url).href
const COLISORES: ColisorDaIlha[] = [
  {
    forma: 'caixa',
    nome: 'col-quadro-iris',
    posicao: [0, 0.5, 0],
    rotacao: [0, 0, 0, 1],
    meio: [0.48, 0.5, 0.09],
  },
]

export function PlacaDaPonte({ ilha, tabua }: { ilha: Ilha; tabua: Tabua }) {
  return (
    <ComReserva reserva={null}>
      <PlacaCarregada ilha={ilha} tabua={tabua} />
    </ComReserva>
  )
}

function PlacaCarregada({ ilha, tabua }: { ilha: Ilha; tabua: Tabua }) {
  const { loja, rastro } = useJogo()
  const voz = useVoz()
  const original = useModelo(URL_DA_PLACA)
  const desenho = useMemo(() => {
    const cena = original.clone(true)
    const tela = document.createElement('canvas')
    tela.width = 768
    tela.height = 384
    const ctx = tela.getContext('2d')
    if (!ctx) throw new Error('A face da placa não pôde ser desenhada')
    ctx.fillStyle = '#fff3ce'
    ctx.fillRect(0, 0, tela.width, tela.height)
    ctx.fillStyle = '#27334c'
    ctx.textAlign = 'center'
    ctx.font = 'bold 44px sans-serif'
    ctx.fillText('Tem mais para descobrir.', 384, 78)
    ctx.font = '38px sans-serif'
    // O marco na voz de cada público: o posto no Kids, a etapa da jornada no adulto.
    const { antes, marco } = voz.placaDaPonte(ilha)
    ctx.fillText(antes, 384, 155)
    ctx.font = 'bold 38px sans-serif'
    ctx.fillText(marco, 384, 219, 720)
    const textura = new CanvasTexture(tela)
    textura.colorSpace = SRGBColorSpace
    const material = new MeshBasicMaterial({ map: textura })
    const geometrias: Mesh['geometry'][] = []
    cena.getObjectByName('texto')?.traverse((o) => {
      if (!(o instanceof Mesh)) return
      // A face já existe no arquivo. Projeta o texto sobre ela, sem uma segunda face coplanar.
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
  }, [original, ilha, voz])
  useEffect(
    () => () => {
      desenho.textura.dispose()
      desenho.material.dispose()
      for (const g of desenho.geometrias) g.dispose()
    },
    [desenho],
  )
  // No fim do trecho que existe, meio metro antes da borda, voltada para quem vem da praia.
  const x = tabua.x - Math.sin(tabua.giro) * 0.5 + Math.cos(tabua.giro) * 0.6
  const z = tabua.z - Math.cos(tabua.giro) * 0.5 - Math.sin(tabua.giro) * 0.6
  useInterativo(`placa-ponte-${ilha.id}`, {
    x,
    z,
    raio: 2.3,
    rotulo: () => (Math.abs(rastro.y - tabua.y - 0.9) < 1.3 ? 'Ler a placa da ponte' : null),
    agir: () => loja.getState().dizer(voz.recadoDaPlaca(ilha)),
  })
  return (
    <group
      name={`placa-ponte-${ilha.id}`}
      position={[x, tabua.y + 0.07, z]}
      rotation={[0, tabua.giro + Math.PI, 0]}
      dispose={null}
    >
      <primitive object={desenho.cena} />
      <Colisores lista={COLISORES} />
    </group>
  )
}
