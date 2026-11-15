import { useFrame } from '@react-three/fiber'
import { CuboidCollider, RigidBody } from '@react-three/rapier'
import { useEffect, useMemo, useRef } from 'react'
import { BufferAttribute, BufferGeometry, CanvasTexture, type Sprite } from 'three'
import { useJogo } from '../../estado/contexto'
import {
  BASE_DO_FAROL,
  LUGAR_DA_FAISCA,
  ligarCabeceiras,
  type PontoDaFaisca,
  pontosAoLongo,
  ROTAS_DA_FAISCA,
  type RotaDaFaisca,
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
function Caminho({ rota }: { rota: RotaDaFaisca }) {
  const geometria = useMemo(() => {
    const pts = pontosAoLongo(rota.pontos, 2),
      v: number[] = [],
      indices: number[] = []
    pts.forEach((p, i) => {
      const a = pts[Math.max(0, i - 1)]!,
        b = pts[Math.min(pts.length - 1, i + 1)]!,
        d = Math.hypot(b.x - a.x, b.z - a.z) || 1,
        w = rota.tipo === 'atalho' ? 0.9 : 1.6
      for (const lado of [-1, 1]) {
        const x = p.x + ((b.z - a.z) / d) * w * lado,
          z = p.z - ((b.x - a.x) / d) * w * lado
        v.push(x, alturaDoArquipelago(x, z) + 0.07, z)
      }
      if (i > 0) {
        const j = i * 2
        indices.push(j - 2, j, j - 1, j - 1, j, j + 1)
      }
    })
    const g = new BufferGeometry()
    g.setAttribute('position', new BufferAttribute(new Float32Array(v), 3))
    g.setIndex(indices)
    g.computeVertexNormals()
    return g
  }, [rota])
  useEffect(() => () => geometria.dispose(), [geometria])
  return (
    <mesh geometry={geometria}>
      <meshStandardMaterial
        color={rota.tipo === 'atalho' ? '#a1a17c' : '#d6bb85'}
        roughness={1}
        side={2}
      />
    </mesh>
  )
}
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
export function CaminhosDaFaisca() {
  return (
    <>
      {ROTAS_COMPLETAS_DA_FAISCA.filter((r) => r.tipo !== 'ponte-interna').map((r) => (
        <Caminho key={r.id} rota={r} />
      ))}
      {Object.entries(nomes).map(([id, nome]) => (
        <Placa key={id} p={LUGAR_DA_FAISCA[id as keyof typeof LUGAR_DA_FAISCA]} nome={nome} />
      ))}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[58, 3.65, 127]} scale={[8, 4, 1]}>
        <circleGeometry args={[1, 48]} />
        <meshStandardMaterial color="#69b4b9" transparent opacity={0.8} roughness={0.25} />
      </mesh>
      <RigidBody type="fixed" colliders={false} position={[8, 4, 230]}>
        <mesh position={[0, -0.15, 0]}>
          <boxGeometry args={[3, 0.3, 18]} />
          <meshStandardMaterial color="#ad8d60" />
        </mesh>
        <CuboidCollider args={[1.5, 0.15, 9]} position={[0, -0.15, 0]} />
      </RigidBody>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, alturaDoArquipelago(0, 166) + 0.08, 166]}>
        <planeGeometry args={[24, 24]} />
        <meshStandardMaterial color="#b5c6b2" wireframe />
      </mesh>
      {ARQUIPELAGO.slice(1).map((ilha, i) => {
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
