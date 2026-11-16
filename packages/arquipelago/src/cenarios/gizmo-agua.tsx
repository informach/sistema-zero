import { TransformControls } from '@react-three/drei'
import type { DocumentoDeCenario } from '@sistemazero/molda-cenarios-core'
import { escalaUniformeDoGesto } from '@sistemazero/molda-cenarios-core'
import type { FerramentaDeCenario } from '@sistemazero/molda-cenarios-core/runtime'
import { type ComponentRef, useRef } from 'react'
import type { Group } from 'three'

type Agua = DocumentoDeCenario['aguas'][number]
export function GizmoDaAgua({
  agua,
  ferramenta,
  encaixe,
  gesto,
  previa,
  salvar,
}: {
  agua: Agua
  ferramenta: FerramentaDeCenario
  encaixe: boolean
  gesto: (ativo: boolean) => void
  previa: (a: Agua | null) => void
  salvar: (a: Agua) => Promise<void>
}) {
  const ref = useRef<Group>(null),
    controle = useRef<ComponentRef<typeof TransformControls>>(null),
    ultima = useRef<Agua | null>(null),
    ativo = useRef(false)
  const ler = () => {
    const g = ref.current!
    if (ferramenta === 'escala') {
      g.scale.setScalar(escalaUniformeDoGesto(g.scale, agua.escala))
    }
    return {
      ...agua,
      centro: { x: g.position.x, z: g.position.z },
      nivel: g.position.y,
      giro: g.rotation.y,
      escala: g.scale.x,
    }
  }
  return (
    <>
      <group
        ref={ref}
        position={[agua.centro.x, agua.nivel, agua.centro.z]}
        rotation={[0, agua.giro, 0]}
        scale={agua.escala}
      />
      <TransformControls
        ref={controle}
        object={ref as React.RefObject<Group>}
        mode={ferramenta === 'girar' ? 'rotate' : ferramenta === 'escala' ? 'scale' : 'translate'}
        showX={ferramenta !== 'girar'}
        showZ={ferramenta !== 'girar'}
        translationSnap={encaixe ? 0.25 : null}
        rotationSnap={encaixe ? Math.PI / 12 : null}
        scaleSnap={encaixe ? 0.05 : null}
        onMouseDown={() => {
          ativo.current = true
          gesto(true)
        }}
        onObjectChange={() => {
          if (!ativo.current) return
          ultima.current = ler()
          previa(ultima.current)
        }}
        onMouseUp={() => {
          ativo.current = false
          gesto(false)
          const a = ultima.current
          ultima.current = null
          if (a)
            void salvar(a)
              .finally(() => previa(null))
              .catch(() => {})
          else previa(null)
        }}
      />
    </>
  )
}
