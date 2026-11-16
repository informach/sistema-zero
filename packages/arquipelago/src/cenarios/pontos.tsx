// biome-ignore-all lint/a11y/noStaticElementInteractions: Os objetos são Three.js; os mesmos pontos têm edição por teclado no painel.
import { TransformControls } from '@react-three/drei'
import type { ComandoDeCenario, DocumentoDeCenario } from '@sistemazero/molda-cenarios-core'
import type { EstadoDeViewport } from '@sistemazero/molda-cenarios-core/runtime'
import { useRef } from 'react'
import type { Mesh } from 'three'

export const idDoCaminho = (id: string) => id.split('#ponto:')[0]!
export function PontosDeCaminho({
  doc,
  estado,
  altura,
  selecionar,
  gesto,
  editar,
}: {
  doc: DocumentoDeCenario
  estado: EstadoDeViewport
  altura: (x: number, z: number) => number
  selecionar: (ids: string[]) => void
  gesto: (ativo: boolean) => void
  editar: (c: ComandoDeCenario[]) => Promise<void>
}) {
  const id = estado.selecionados[0],
    caminho = doc.caminhos.find((p) => p.id === idDoCaminho(id ?? ''))
  if (!caminho || caminho.bloqueado || caminho.oculto) return null
  return caminho.pontos.map((p, i) => (
    <Ponto
      key={`${caminho.id}:${p.x}:${p.z}`}
      p={p}
      selecionado={id === `${caminho.id}#ponto:${i}`}
      altura={altura}
      encaixe={estado.encaixe}
      selecionar={() => selecionar([`${caminho.id}#ponto:${i}`])}
      gesto={gesto}
      salvar={async (x, z) => {
        const pontos = caminho.pontos.map((p, n) => (n === i ? { x, z } : p))
        await editar([{ tipo: 'caminho.definir', caminho: { ...caminho, pontos } }])
      }}
    />
  ))
}
function Ponto({
  p,
  selecionado,
  altura,
  encaixe,
  selecionar,
  gesto,
  salvar,
}: {
  p: { x: number; z: number }
  selecionado: boolean
  altura: (x: number, z: number) => number
  encaixe: boolean
  selecionar: () => void
  gesto: (ativo: boolean) => void
  salvar: (x: number, z: number) => Promise<void>
}) {
  const ref = useRef<Mesh>(null)
  return (
    <>
      <mesh
        ref={ref}
        position={[p.x, altura(p.x, p.z) + 0.4, p.z]}
        onClick={(e) => {
          e.stopPropagation()
          selecionar()
        }}
      >
        <sphereGeometry args={[0.32, 12, 8]} />
        <meshBasicMaterial color={selecionado ? '#ffd16a' : '#3f8fcb'} depthTest={false} />
      </mesh>
      {selecionado && (
        <TransformControls
          object={ref as React.RefObject<Mesh>}
          mode="translate"
          showY={false}
          translationSnap={encaixe ? 0.25 : null}
          onMouseDown={() => gesto(true)}
          onMouseUp={() => {
            const pos = ref.current?.position
            gesto(false)
            if (pos)
              void salvar(pos.x, pos.z).catch(() => {
                pos.set(p.x, altura(p.x, p.z) + 0.4, p.z)
              })
          }}
        />
      )}
    </>
  )
}
