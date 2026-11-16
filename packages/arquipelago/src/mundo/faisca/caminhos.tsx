import { useFrame } from '@react-three/fiber'
import { CuboidCollider, RigidBody } from '@react-three/rapier'
import { useEffect, useMemo, useRef } from 'react'
import {
  CanvasTexture,
  MeshStandardMaterial,
  PlaneGeometry,
  type Sprite,
  SRGBColorSpace,
} from 'three'
import { useJogo } from '../../estado/contexto'
import { assentamentoDaPeca } from '../../sistemas/assentamento-da-faisca'
import type { PecaNaFaisca } from '../../sistemas/composicao-faisca'
import {
  BASE_DO_FAROL,
  LUGAR_DA_FAISCA,
  ligarCabeceiras,
  type PontoDaFaisca,
  ROTAS_DA_FAISCA,
} from '../../sistemas/faisca'
import {
  ARQUIPELAGO,
  alturaDoArquipelago,
  conexaoDaIlha,
} from '../../sistemas/geografia-do-arquipelago'

export const ROTAS_COMPLETAS_DA_FAISCA = [
  ...ROTAS_DA_FAISCA,
  ...ligarCabeceiras(ARQUIPELAGO.slice(1).map((i) => conexaoDaIlha(i.id))),
]
const nomes: Partial<Record<keyof typeof LUGAR_DA_FAISCA, string>> = {
  casa: 'Morada · lote reservado',
  praca: 'Praça dos Criadores',
  horta: 'Horta da Íris',
  patio: 'Pátio das Invenções',
  costa: 'Descida para a Costa',
  pier: 'Píer do Nico',
  farol: 'Farol das Conexões',
  bosque: 'Bosque das Lanternas',
  lago: 'Lago dos Campos',
  pomar: 'Pomar',
  bancada: 'Bancada da Íris',
  galpao: 'Galpão das peças',
  miranteOeste: 'Mirante das marés',
  miranteLeste: 'Mirante das seis rotas',
  miranteNorte: 'Mirante do Bosque',
  enseadaAreia: 'Enseada das conchas',
  pocas: 'Poças de maré',
  dunas: 'Dunas da Bia',
  gruta: 'Gruta da maré',
  troncoOco: 'Tronco oco',
  lagoEscondido: 'Lago escondido',
  arvoreDaChave: 'Árvore da chave',
  observacao: 'Passarela de observação',
}
function Placa({ p, nome }: { p: PontoDaFaisca; nome: string }) {
  const { rastro } = useJogo(),
    ref = useRef<Sprite>(null)
  useFrame(() => {
    if (ref.current) {
      const d = Math.hypot(rastro.x - p.x, rastro.z - p.z)
      ref.current.visible = d > 10 && d < 90
    }
  })
  const textura = useMemo(() => {
    const c = document.createElement('canvas')
    c.width = 512
    c.height = 96
    const g = c.getContext('2d')!
    g.fillStyle = '#253c35ee'
    g.roundRect(0, 0, 512, 96, 20)
    g.fill()
    g.fillStyle = '#fff1cd'
    g.font = 'bold 29px sans-serif'
    g.textAlign = 'center'
    g.textBaseline = 'middle'
    g.fillText(nome, 256, 48, 490)
    return new CanvasTexture(c)
  }, [nome])
  useEffect(() => () => textura.dispose(), [textura])
  return (
    <sprite
      ref={ref}
      position={[p.x, alturaDoArquipelago(p.x, p.z) + 2.5, p.z]}
      scale={[4.8, 0.9, 1]}
    >
      <spriteMaterial map={textura} transparent depthWrite={false} />
    </sprite>
  )
}

/** Texto preso às duas faces da placa real. A frente do GLB aponta para +Z; a seta para +X. */
export function TextosNasPlacas({ colecao }: { colecao: readonly PecaNaFaisca[] }) {
  return <TextoSobreMadeira colecao={colecao} assentar={assentamentoDaPeca} />
}
export function TextoSobreMadeira<
  T extends {
    id: string
    x: number
    z: number
    giro: number
    escala: number
    sinal?: { texto: string }
  },
>({ colecao, assentar }: { colecao: readonly T[]; assentar: (p: T) => { y: number } }) {
  const recursos = useMemo(() => {
    const textos = new Set(colecao.flatMap((p) => (p.sinal ? [p.sinal.texto] : []))),
      estilos = new Map<string, { textura: CanvasTexture; material: MeshStandardMaterial }>()
    for (const texto of textos) {
      const c = document.createElement('canvas')
      c.width = 512
      c.height = 128
      const g = c.getContext('2d')!
      g.font = '700 98px sans-serif'
      g.fillStyle = '#352211'
      g.textAlign = 'center'
      g.textBaseline = 'middle'
      g.fillText(texto, 256, 67, 470)
      const textura = new CanvasTexture(c)
      textura.colorSpace = SRGBColorSpace
      textura.anisotropy = 4
      const material = new MeshStandardMaterial({
        map: textura,
        transparent: true,
        alphaTest: 0.08,
        depthWrite: false,
        roughness: 1,
      })
      estilos.set(texto, { textura, material })
    }
    return { estilos, geo: new PlaneGeometry(0.8, 0.2) }
  }, [colecao])
  useEffect(
    () => () => {
      for (const r of recursos.estilos.values()) {
        r.textura.dispose()
        r.material.dispose()
      }
      recursos.geo.dispose()
    },
    [recursos],
  )
  return colecao
    .filter((p) => p.sinal)
    .map((p) => (
      <group
        key={p.id}
        position={[p.x, assentar(p).y, p.z]}
        rotation={[0, p.giro, 0]}
        scale={p.escala}
      >
        <mesh
          geometry={recursos.geo}
          material={recursos.estilos.get(p.sinal!.texto)!.material}
          position={[0.02, 1.44, 0.173]}
          dispose={null}
        />
        <mesh
          geometry={recursos.geo}
          material={recursos.estilos.get(p.sinal!.texto)!.material}
          position={[0.02, 1.44, 0.067]}
          rotation={[0, Math.PI, 0]}
          dispose={null}
        />
      </group>
    ))
}
export function CaminhosDaFaisca({ marcos = true }: { marcos?: boolean }) {
  return (
    <>
      {marcos &&
        Object.entries(nomes).map(([id, nome]) => (
          <Placa key={id} p={LUGAR_DA_FAISCA[id as keyof typeof LUGAR_DA_FAISCA]} nome={nome} />
        ))}
      <RigidBody type="fixed" colliders={false} position={[8, 4, 230]}>
        <mesh position={[0, -0.15, 0]}>
          <boxGeometry args={[3, 0.3, 18]} />
          <meshStandardMaterial color="#ad8d60" />
        </mesh>
        <CuboidCollider args={[1.5, 0.15, 9]} position={[0, -0.15, 0]} />
      </RigidBody>
      {marcos && (
        <mesh
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, alturaDoArquipelago(0, 166) + 0.08, 166]}
        >
          <planeGeometry args={[24, 24]} />
          <meshStandardMaterial color="#b5c6b2" wireframe />
        </mesh>
      )}
      {marcos &&
        ARQUIPELAGO.slice(1).map((ilha, i) => {
          const a = (i * Math.PI) / 3
          return (
            <mesh
              key={ilha.id}
              position={[
                BASE_DO_FAROL.x + Math.sin(a) * 6.5,
                alturaDoArquipelago(BASE_DO_FAROL.x, BASE_DO_FAROL.z) + 1,
                BASE_DO_FAROL.z + Math.cos(a) * 6.5,
              ]}
            >
              <boxGeometry args={[0.8, 1.2, 0.5]} />
              <meshStandardMaterial color="#b6a67a" wireframe />
            </mesh>
          )
        })}
    </>
  )
}
