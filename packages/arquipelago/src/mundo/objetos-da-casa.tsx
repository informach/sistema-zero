import { useGLTF } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import {
  CATALOGO_DE_OBJETOS,
  type ObjetoDaCasa,
  type Obra,
} from '@sistemazero/arquipelago-contracts'
import { memo, useEffect, useMemo } from 'react'
import { AdditiveBlending, Color, type Material, type Mesh, MeshStandardMaterial } from 'three'
import aquarioGlb from '../assets/objetos/aquario.glb'
import bandaGlb from '../assets/objetos/banda.glb'
import casinhaGlb from '../assets/objetos/casinha.glb'
import fliperamaGlb from '../assets/objetos/fliperama.glb'
import fornoGlb from '../assets/objetos/forno.glb'
import geladeiraGlb from '../assets/objetos/geladeira.glb'
import geladeiraHologramaGlb from '../assets/objetos/geladeira-holograma.glb'
import lareiraGlb from '../assets/objetos/lareira.glb'
import museuGlb from '../assets/objetos/museu.glb'
import { useEstado, useJogo } from '../estado/contexto'
import {
  areaComGiro,
  falaDoGanho,
  ganharProjetos,
  LUGAR_DO_OBJETO,
} from '../sistemas/construcao/projeto-azul'
import { giroEmY, type Solido } from './colisao-da-ilha-central'
import { Colisores } from './colisores'
import { useInterativo } from './interativos'
import { ComReserva, materiaisDe, useModelo } from './modelos'

/** Os modelos dos objetos com função (`arte/objetos`, README de lá). */
const MODELO_DO_OBJETO: Readonly<Record<ObjetoDaCasa, string>> = {
  geladeira: new URL(geladeiraGlb, import.meta.url).href,
  forno: new URL(fornoGlb, import.meta.url).href,
  aquario: new URL(aquarioGlb, import.meta.url).href,
  lareira: new URL(lareiraGlb, import.meta.url).href,
  banda: new URL(bandaGlb, import.meta.url).href,
  fliperama: new URL(fliperamaGlb, import.meta.url).href,
  museu: new URL(museuGlb, import.meta.url).href,
  casinha: new URL(casinhaGlb, import.meta.url).href,
}

/** O holograma feito no Blender (só a geladeira tem; os outros viram holograma no código). */
const HOLOGRAMA_DO_OBJETO: Partial<Record<ObjetoDaCasa, string>> = {
  geladeira: new URL(geladeiraHologramaGlb, import.meta.url).href,
}

export function carregarObjetos(ids: readonly ObjetoDaCasa[]) {
  for (const id of ids) {
    const url = HOLOGRAMA_DO_OBJETO[id] ?? MODELO_DO_OBJETO[id]
    useGLTF.preload(url, false, false)
  }
}

/** O valor de `painelAberto` do painel de um objeto. */
export function painelDoObjeto(id: ObjetoDaCasa): string {
  return `objeto:${id}`
}

const AZUL = new Color('#5fb8ff')

/**
 * Um objeto em projeto azul: o holograma do Blender (a luz soma: `AdditiveBlending`, sem
 * `depthWrite`, como a bancada) ou, sem ele, o modelo com todos os materiais trocados por um azul
 * translúcido. Com aparência, o modelo de verdade.
 */
function ModeloDoObjeto({ id, completo }: { id: ObjetoDaCasa; completo: boolean }) {
  const url = completo ? MODELO_DO_OBJETO[id] : (HOLOGRAMA_DO_OBJETO[id] ?? MODELO_DO_OBJETO[id])
  const raiz = useModelo(url)
  const { copia, materiaisProprios } = useMemo(() => {
    const c = raiz.clone(true)
    const materiaisProprios: Material[] = []
    if (completo) return { copia: c, materiaisProprios }
    if (HOLOGRAMA_DO_OBJETO[id]) {
      // O holograma do arquivo: projetoAzul e projetoAzulLinha somam luz; o projetor fica sólido.
      const trocas = new Map<Material, Material>()
      for (const m of materiaisDe(c)) {
        if (!m.name.startsWith('projetoAzul')) continue
        const proprio = m.clone()
        proprio.blending = AdditiveBlending
        proprio.depthWrite = false
        proprio.transparent = true
        trocas.set(m, proprio)
        materiaisProprios.push(proprio)
      }
      c.traverse((o) => {
        const m = o as Mesh
        if (!m.isMesh) return
        const trocar = (mat: Material) => trocas.get(mat) ?? mat
        m.material = Array.isArray(m.material) ? m.material.map(trocar) : trocar(m.material)
      })
      return { copia: c, materiaisProprios }
    }
    const azul = new MeshStandardMaterial({
      color: AZUL,
      emissive: AZUL,
      emissiveIntensity: 0.6,
      transparent: true,
      opacity: 0.35,
      depthWrite: false,
      blending: AdditiveBlending,
    })
    materiaisProprios.push(azul)
    c.traverse((o) => {
      const m = o as Mesh
      if (!m.isMesh) return
      m.material = Array.isArray(m.material) ? m.material.map(() => azul as Material) : azul
    })
    return { copia: c, materiaisProprios }
  }, [raiz, id, completo])
  useEffect(
    () => () => {
      for (const material of materiaisProprios) material.dispose()
    },
    [materiaisProprios],
  )
  useFrame(({ clock }) => {
    if (completo) return
    copia.position.y = 0.02 + Math.sin(clock.elapsedTime * 1.6) * 0.015
  })
  return <primitive object={copia} />
}

/** O objeto na obra: no meio da área dele, com o giro, a colisão e o "Abrir". */
const ObjetoNaObra = memo(function ObjetoNaObra({
  obj,
  base,
  completo,
}: {
  obj: Obra['objetos'][number]
  base: [number, number, number]
  completo: boolean
}) {
  const { loja } = useJogo()
  const { largura, fundo } = areaComGiro(obj.id, obj.giro)
  const x = obj.x + largura / 2
  const z = obj.z + fundo / 2
  const giro = (obj.giro * Math.PI) / 2
  // A casinha fica no quintal, no chão da ilha (2 cm abaixo do piso da casa).
  const y = LUGAR_DO_OBJETO[obj.id] === 'fora' ? -0.02 : 0
  const nome = CATALOGO_DE_OBJETOS[obj.id].molde.nome
  useInterativo(`objeto-${obj.id}`, {
    x: base[0] + x,
    z: base[2] + z,
    raio: Math.max(largura, fundo) / 2 + 1.4,
    rotulo: () => (obj.id === 'geladeira' ? 'Abrir a geladeira' : `Ver ${nome.toLowerCase()}`),
    agir: () => loja.getState().abrirPainel(painelDoObjeto(obj.id)),
  })
  const colisores = useMemo<Solido[]>(() => {
    const { caixa } = CATALOGO_DE_OBJETOS[obj.id].molde
    const de = obj.giro % 2 === 0
    return [
      {
        forma: 'caixa',
        nome: `col-objeto-${obj.id}`,
        posicao: [base[0] + x, base[1] + y + caixa.altura / 2, base[2] + z],
        meio: [
          (de ? caixa.largura : caixa.fundo) / 2,
          caixa.altura / 2,
          (de ? caixa.fundo : caixa.largura) / 2,
        ],
        rotacao: giroEmY(0),
      },
    ]
  }, [obj, base, x, y, z])
  return (
    <>
      <group position={[base[0] + x, base[1] + y, base[2] + z]} rotation-y={giro}>
        <ComReserva reserva={<FormaDoObjeto id={obj.id} />}>
          <ModeloDoObjeto id={obj.id} completo={completo} />
        </ComReserva>
      </group>
      <Colisores lista={colisores} />
    </>
  )
})

/** A caixa azul enquanto o modelo baixa. */
function FormaDoObjeto({ id }: { id: ObjetoDaCasa }) {
  const { caixa } = CATALOGO_DE_OBJETOS[id].molde
  return (
    <mesh position={[0, caixa.altura / 2, 0]}>
      <boxGeometry args={[caixa.largura, caixa.altura, caixa.fundo]} />
      <meshBasicMaterial color="#5fb8ff" transparent opacity={0.35} depthWrite={false} />
    </mesh>
  )
}

/** Os objetos postos na obra da casa. */
export function ObjetosDaObra({ obra, base }: { obra: Obra; base: [number, number, number] }) {
  const projetos = useEstado((s) => s.salvamento.projetos)
  return (
    <>
      {obra.objetos.map((o) => (
        <ObjetoNaObra
          key={o.id}
          obj={o}
          base={base}
          completo={Boolean(projetos[o.id]?.aparencia)}
        />
      ))}
    </>
  )
}

/**
 * Os projetos azuis chegam sozinhos: a cada mudança do salvamento, o que a pessoa ganhou (o
 * primeiro pedido entregue, adotar um bicho) entra em `projetos`, e o Zappy avisa.
 */
export function GanharProjetos() {
  const { loja } = useJogo()
  useEffect(() => {
    const conferir = () => {
      const s = loja.getState()
      const { salvamento, ganhos } = ganharProjetos(s.salvamento, new Date())
      if (ganhos.length === 0) return
      s.mudar(() => salvamento)
      const ultimo = ganhos.at(-1)
      if (ultimo) s.dizer(falaDoGanho(ultimo))
    }
    conferir()
    return loja.subscribe((s, antes) => {
      if (s.salvamento !== antes.salvamento) conferir()
    })
  }, [loja])
  return null
}
