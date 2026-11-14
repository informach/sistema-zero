import { createPortal } from '@react-three/fiber'
import {
  type AparenciaDoObjeto,
  CATALOGO_DE_OBJETOS,
  type ObjetoDaCasa,
} from '@sistemazero/arquipelago-contracts'
import { useEffect, useMemo, useState } from 'react'
import {
  Box3,
  Group,
  Mesh,
  MeshStandardMaterial,
  type Object3D,
  PlaneGeometry,
  Vector3,
} from 'three'
import { useEstado, useJogo } from '../estado/contexto'
import { type AparenciaNoMundo, carregarAparencia, NOMES_DAS_FACES } from './carregar-aparencia'

/** Superfícies autorais sobre a peça Morada. O formato da planificação guardada continua válido. */
export function pintaMoradaModel(model: Object3D) {
  const root = model.clone(true)
  // O clone mede apenas o espaço local da peça; não leva a posição do cômodo ou do slot.
  root.position.set(0, 0, 0)
  root.rotation.set(0, 0, 0)
  root.scale.set(1, 1, 1)
  root.updateMatrixWorld(true)
  const box = new Box3().setFromObject(root)
  const size = box.getSize(new Vector3())
  const center = box.getCenter(new Vector3())
  const resources: { dispose(): void }[] = []
  function face(
    name: string,
    width: number,
    height: number,
    position: [number, number, number],
    rotation: [number, number, number],
  ) {
    const geometry = new PlaneGeometry(width, height)
    const material = new MeshStandardMaterial({ transparent: true, opacity: 0, depthWrite: false })
    const mesh = new Mesh(geometry, material)
    mesh.name = name
    mesh.position.set(...position)
    mesh.rotation.set(...rotation)
    root.add(mesh)
    resources.push(geometry, material)
  }
  face(NOMES_DAS_FACES.frente, size.x, size.y, [center.x, center.y, box.max.z + 0.003], [0, 0, 0])
  face(
    NOMES_DAS_FACES['lado-esq'],
    size.z,
    size.y,
    [box.min.x - 0.003, center.y, center.z],
    [0, -Math.PI / 2, 0],
  )
  face(
    NOMES_DAS_FACES['lado-dir'],
    size.z,
    size.y,
    [box.max.x + 0.003, center.y, center.z],
    [0, Math.PI / 2, 0],
  )
  face(
    NOMES_DAS_FACES.topo,
    size.x,
    size.z,
    [center.x, box.max.y + 0.003, center.z],
    [-Math.PI / 2, 0, 0],
  )
  face(
    NOMES_DAS_FACES.tela,
    size.x * 0.8,
    size.y * 0.45,
    [center.x, center.y + size.y * 0.12, box.max.z + 0.006],
    [0, 0, 0],
  )
  return {
    root,
    size,
    dispose() {
      for (const resource of resources) resource.dispose()
    },
  }
}

/** Guarda autoria e descarta recursos ao trocar de aparência; nunca usa arte retirada como reserva. */
export function MoradaAppearance({
  object,
  appearance,
  model,
}: {
  object: ObjetoDaCasa
  appearance: AparenciaDoObjeto | null
  model: Object3D
}) {
  const { plataforma } = useJogo()
  const workshop = useEstado((s) => s.ferramentaAberta)
  const [resource, setResource] = useState<{
    id: string
    model: Object3D
    value: AparenciaNoMundo
  } | null>(null)
  const id = appearance?.origem === 'galeria' ? null : (appearance?.id ?? null)
  const substrate = useMemo(() => pintaMoradaModel(model), [model])
  useEffect(() => () => substrate.dispose(), [substrate])
  useEffect(() => {
    setResource(null)
    if (!id || workshop || !plataforma.lerAparencia) return
    const abort = new AbortController()
    let own: AparenciaNoMundo | null = null
    void carregarAparencia(
      plataforma.lerAparencia.bind(plataforma),
      id,
      CATALOGO_DE_OBJETOS[object].molde,
      substrate.root,
      abort.signal,
    )
      .then((value) => {
        if (abort.signal.aborted) {
          value?.liberar()
          return
        }
        if (value && appearance?.origem === 'molda') {
          const group = new Group()
          const box = new Box3().setFromObject(value.raiz)
          const size = box.getSize(new Vector3())
          const scale = Math.min(
            substrate.size.x / Math.max(size.x, 0.001),
            substrate.size.y / Math.max(size.y, 0.001),
            substrate.size.z / Math.max(size.z, 0.001),
          )
          group.scale.setScalar(scale)
          group.add(value.raiz)
          const source = value
          value = { raiz: group, liberar: () => source.liberar() }
        }
        own = value
        setResource(value ? { id, model, value } : null)
      })
      .catch((error) => {
        if (!abort.signal.aborted) plataforma.relatarErro(error, 'morada-aparencia')
      })
    return () => {
      abort.abort()
      own?.liberar()
    }
  }, [id, workshop, model, substrate, object, plataforma, appearance?.origem])
  const visible = resource?.id === id && resource?.model === model ? resource.value : null
  useEffect(() => {
    model.visible = !visible
    return () => {
      model.visible = true
    }
  }, [model, visible])
  return visible && model.parent
    ? createPortal(<primitive object={visible.raiz} dispose={null} />, model.parent)
    : null
}
