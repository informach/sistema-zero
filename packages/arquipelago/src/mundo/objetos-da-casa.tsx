import { useGLTF } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import {
  type AparenciaDoObjeto,
  CATALOGO_DE_OBJETOS,
  type ObjetoDaCasa,
  type Obra,
} from '@sistemazero/arquipelago-contracts'
import { useReducedMotion } from '@sistemazero/avatar-quarto/use-reduced-motion'
import { memo, useEffect, useMemo, useState } from 'react'
import {
  AdditiveBlending,
  AnimationMixer,
  Color,
  type Material,
  type Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  type Object3D,
  SRGBColorSpace,
  TextureLoader,
} from 'three'
import aquarioGlb from '../assets/objetos/aquario.glb'
import bandaGlb from '../assets/objetos/banda.glb'
import casinhaGlb from '../assets/objetos/casinha.glb'
import fliperamaGlb from '../assets/objetos/fliperama.glb'
import fornoGlb from '../assets/objetos/forno.glb'
import geladeiraGlb from '../assets/objetos/geladeira.glb'
import geladeiraHologramaGlb from '../assets/objetos/geladeira-holograma.glb'
import lareiraGlb from '../assets/objetos/lareira.glb'
import museuGlb from '../assets/objetos/museu.glb'
import plantaInteriorGlb from '../assets/objetos/planta-interior.glb'
import { lojaDoConforto } from '../estado/conforto'
import { useEstado, useJogo } from '../estado/contexto'
import { lojaDoFarol } from '../estado/farol'
import { lojaDosMinijogos, useMinijogos } from '../estado/minijogos'
import { lojaDosPassos } from '../estado/primeiros-passos'
import {
  areaComGiro,
  falaDoGanho,
  ganharProjetos,
  LUGAR_DO_OBJETO,
} from '../sistemas/construcao/projeto-azul'
import { PEIXES_DO_AQUARIO, peixesVisiveis } from '../sistemas/corais-do-recife'
import { FALA_DO_MODO_LIVRE } from '../sistemas/galeria-do-farol'
import { jogoPausado } from '../sistemas/pausa'
import {
  type AparenciaNoMundo,
  carregarAparencia,
  trocarMaterialDaFace,
} from './carregar-aparencia'
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
  'planta-interior': new URL(plantaInteriorGlb, import.meta.url).href,
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
 * translúcido. Com aparência própria, carrega a criação e mantém o modelo como reserva.
 */
export function ModeloDoObjeto({
  id,
  completo,
  aparencia,
}: {
  id: ObjetoDaCasa
  completo: boolean
  aparencia: AparenciaDoObjeto | null
}) {
  const { loja, plataforma } = useJogo()
  const fonte = lojaDosMinijogos(loja, plataforma)
  const capa = useMinijogos(fonte, (s) => s.lista[0]?.capa ?? null)
  const visita = useEstado((s) => s.visita !== null)
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
  const oficinaAberta = useEstado((s) => s.ferramentaAberta)
  const [leitura, definirLeitura] = useState<{
    recurso: AparenciaNoMundo
    id: string
    modelo: Object3D
    porta: typeof plataforma
  } | null>(null)
  const criacaoId = aparencia?.origem === 'galeria' ? null : aparencia?.id
  // Na troca, o render já retira a criação anterior antes do efeito liberar seus recursos.
  const criada =
    !oficinaAberta &&
    leitura?.id === criacaoId &&
    leitura?.modelo === copia &&
    leitura?.porta === plataforma
      ? leitura.recurso
      : null
  useEffect(() => {
    const controle = new AbortController()
    let recurso: AparenciaNoMundo | null = null
    definirLeitura(null)
    if (!oficinaAberta && criacaoId && plataforma.lerAparencia) {
      void carregarAparencia(
        plataforma.lerAparencia.bind(plataforma),
        criacaoId,
        CATALOGO_DE_OBJETOS[id].molde,
        copia,
        controle.signal,
      ).then((r) => {
        if (controle.signal.aborted) r?.liberar()
        else {
          recurso = r
          definirLeitura(r ? { recurso: r, id: criacaoId, modelo: copia, porta: plataforma } : null)
        }
      })
    }
    return () => {
      controle.abort()
      recurso?.liberar()
    }
  }, [criacaoId, copia, id, plataforma, oficinaAberta])
  const desenho = criada?.raiz ?? copia
  useEffect(() => {
    if (id !== 'fliperama' || !capa || visita) return
    let vivo = true
    let restaurar = () => {}
    const material = new MeshBasicMaterial({ toneMapped: false })
    const textura = new TextureLoader().load(capa, (t) => {
      if (!vivo) return
      t.colorSpace = SRGBColorSpace
      material.map = t
      material.needsUpdate = true
      restaurar = trocarMaterialDaFace(desenho, 'tela', material)
    })
    return () => {
      vivo = false
      restaurar()
      textura.dispose()
      material.dispose()
    }
  }, [desenho, capa, id, visita])
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
  return (
    <>
      <primitive object={desenho} dispose={null} />
      {id === 'aquario' && !criada ? <PeixesDoAquario copia={copia} url={url} /> : null}
    </>
  )
}

/**
 * Os peixes do aquário (fase3-03): o peixe N aparece com o coral N replantado no Recife; na casa
 * de um irmão, os quatro (a visita não traz os corais dele). O clipe `nadar` toca no objeto posto,
 * parado com a pausa e com menos movimento.
 */
function PeixesDoAquario({ copia, url }: { copia: Object3D; url: string }) {
  const { loja } = useJogo()
  const aparelhoPedeMenos = useReducedMotion()
  const { animations } = useGLTF(url, false, false)
  const corais = useEstado((s) => s.salvamento.recife.corais)
  const visita = useEstado((s) => s.visita !== null)
  useEffect(() => {
    const visiveis = visita ? PEIXES_DO_AQUARIO.map(() => true) : peixesVisiveis(corais)
    PEIXES_DO_AQUARIO.forEach((nome, i) => {
      const no = copia.getObjectByName(nome)
      if (no) no.visible = visiveis[i] ?? false
    })
  }, [copia, corais, visita])
  const mixer = useMemo(() => {
    const clip = animations.find((c) => c.name === 'nadar')
    if (!clip) return null
    const m = new AnimationMixer(copia)
    m.clipAction(clip).play()
    return m
  }, [copia, animations])
  useEffect(
    () => () => {
      mixer?.stopAllAction()
      mixer?.uncacheRoot(copia)
    },
    [mixer, copia],
  )
  useFrame((_, dt) => {
    if (!mixer) return
    const menos = aparelhoPedeMenos || lojaDoConforto(loja).getState().conforto.menosMovimento
    if (!menos && !jogoPausado(loja.getState())) mixer.update(Math.min(dt, 0.1))
  })
  return null
}

/** O objeto na obra: no meio da área dele, com o giro, a colisão e o "Abrir". */
const ObjetoNaObra = memo(function ObjetoNaObra({
  obj,
  base,
  completo,
  aparencia,
}: {
  obj: Obra['objetos'][number]
  base: [number, number, number]
  completo: boolean
  aparencia: AparenciaDoObjeto | null
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
    // Na casa do irmão só se olha: nenhum objeto abre.
    rotulo: () =>
      loja.getState().visita
        ? null
        : obj.id === 'geladeira'
          ? 'Abrir a geladeira'
          : `Ver ${nome.toLowerCase()}`,
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
          <ModeloDoObjeto id={obj.id} completo={completo} aparencia={aparencia} />
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
  // Na visita (fase3-12), o objeto do irmão aparece completo se tem aparência na casa dele.
  const projetos = useEstado((s) => s.salvamento.projetos)
  const visita = useEstado((s) => s.visita)
  return (
    <>
      {obra.objetos.map((o) => (
        <ObjetoNaObra
          key={o.id}
          obj={o}
          base={base}
          aparencia={visita ? null : (projetos[o.id]?.aparencia ?? null)}
          completo={visita ? visita.completos.includes(o.id) : Boolean(projetos[o.id]?.aparencia)}
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
  const { loja, plataforma } = useJogo()
  useEffect(() => {
    const fonte = lojaDosMinijogos(loja, plataforma)
    void fonte.carregar()
    return loja.subscribe((s, antes) => {
      if (antes.ferramentaAberta && !s.ferramentaAberta) void fonte.carregar()
    })
  }, [loja, plataforma])
  useEffect(() => {
    let esperando: (() => void) | null = null
    const conferir = () => {
      const s = loja.getState()
      const { salvamento, ganhos } = ganharProjetos(s.salvamento, new Date())
      if (ganhos.length === 0) return
      s.mudar(() => salvamento)
      const ultimo = ganhos.at(-1)
      if (!ultimo) return
      // Muitos de uma vez só acontece no modo livre: uma fala só, a do modo livre. Ela chega no
      // fim dos fachos, com a HUD escondida; a fala espera a descida do Farol para ser vista.
      if (ganhos.length > 1 && salvamento.farol.concluido) {
        const farol = lojaDoFarol(loja)
        if (farol.getState().etapa === 'fora') s.dizer(FALA_DO_MODO_LIVRE)
        else {
          esperando?.()
          esperando = farol.subscribe((f) => {
            if (f.etapa !== 'fora') return
            esperando?.()
            esperando = null
            loja.getState().dizer(FALA_DO_MODO_LIVRE)
          })
        }
        return
      }
      // Nos primeiros passos: a geladeira é a fala 16 deles; o resto espera o fim do tutorial.
      const passos = lojaDosPassos(loja, plataforma).getState()
      if (!passos.andando()) s.dizer(falaDoGanho(ultimo))
      else if (ultimo !== 'geladeira') passos.adiar(falaDoGanho(ultimo))
    }
    conferir()
    const parar = loja.subscribe((s, antes) => {
      if (s.salvamento !== antes.salvamento) conferir()
    })
    return () => {
      parar()
      esperando?.()
    }
  }, [loja, plataforma])
  return null
}
