import { useFrame, useThree } from '@react-three/fiber'
import {
  RigidBody,
  RoundCuboidCollider,
  RoundCylinderCollider,
  TrimeshCollider,
} from '@react-three/rapier'
import { type Ilha, type IlhaId, ilhaAberta } from '@sistemazero/arquipelago-contracts'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  type Camera,
  type Material,
  type Object3D,
  type Scene,
  Vector3,
  type WebGLRenderer,
} from 'three'
import bosqueGlb from '../assets/ilhas/bosque.glb'
import nuvensGlb from '../assets/ilhas/nuvens.glb'
import picoGlb from '../assets/ilhas/pico.glb'
import recifeGlb from '../assets/ilhas/recife.glb'
import valeGlb from '../assets/ilhas/vale-dos-dinos.glb'
import vilaDoceGlb from '../assets/ilhas/vila-doce.glb'
import { useEstado, useJogo } from '../estado/contexto'
import {
  type EstadoDaIlha,
  esmaecer,
  ilhaPreferida,
  opacidadeAlvo,
  proximoEstadoDaIlha,
} from '../sistemas/ilhas-completas'
import { MERGULHO } from '../sistemas/mergulho'
import { iluminarArte, prepararLuzesNoturnas } from './arte-animada'
import { buscarIlha, reterIlha, soltarIlha } from './carregar-ilha'
import {
  bordaQueCabe,
  type ColisorDaIlha,
  lerColisores,
  pecaDoColisor,
  soParaOCorpo,
  tirarNosDeColisao,
} from './colisores-da-ilha'
import {
  aplicarSuave,
  type Copa,
  caixaNoMundo,
  esmaecidasAgora,
  separarCopas,
  tapa,
  usarSuave,
} from './copas'
import { gruposDoColisor } from './grupos'
import {
  DISTANCIA_DA_TROCA,
  DURACAO_DA_TROCA,
  DURACAO_DO_ESMAECER_DA_COPA,
  giroDaIlha,
  ilhasEmVolta,
  MARGEM_DA_ESPERA_PELO_CHAO,
  naPonteDa,
  nivelDeDetalhe,
  noModelo,
  OPACIDADE_DA_COPA_NA_FRENTE,
  raioDaEsperaDaIlha,
} from './medidas'
import { materiaisDe } from './modelos'
import { pintarMateriais, pinturaDaIlha } from './pintura-da-ilha'
import {
  type PlataformaDasNuvens,
  PlataformasDasNuvens,
  prepararPlataformasDasNuvens,
} from './plataformas-das-nuvens'
import { type PontesPreparadas, PontesVivas, prepararPontes } from './pontes-vivas'
import { prepararVegetacao } from './vegetacao-ao-vento'

/**
 * As ilhas completas do Blender (`arte/ilhas/`). Cada uma ocupa o mesmo lugar da versão leve
 * (mesmo chão, a chegada da ponte no +x do modelo) e traz os próprios nós de colisão `col-*`.
 */
export interface IlhaCompletaInfo {
  url: string
}

export const ILHAS_COMPLETAS: Partial<Record<IlhaId, IlhaCompletaInfo>> = {
  bosque: { url: new URL(bosqueGlb, import.meta.url).href },
  'vila-doce': { url: new URL(vilaDoceGlb, import.meta.url).href },
  recife: { url: new URL(recifeGlb, import.meta.url).href },
  pico: { url: new URL(picoGlb, import.meta.url).href },
  'vale-dos-dinos': { url: new URL(valeGlb, import.meta.url).href },
  nuvens: { url: new URL(nuvensGlb, import.meta.url).href },
}

/** O que fica pronto antes de a ilha aparecer: o desenho já girado (e com a tinta) e os colisores. */
export interface IlhaPreparada {
  luzesNoturnas: ReturnType<typeof prepararLuzesNoturnas>
  modelo: Object3D
  colisores: ColisorDaIlha[]
  /** Os materiais opacos de tudo (as peças que esmaecem têm, além deles, cópias transparentes). */
  materiais: Material[]
  /** Materiais do arquivo que deixaram de estar na cena ao separar suas copas. */
  materiaisSubstituidos: Material[]
  copas: Copa[]
  pontes: PontesPreparadas | null
  plataformas: PlataformaDasNuvens[]
  vegetacao: ReturnType<typeof prepararVegetacao>
}

/**
 * Solta o que a ilha criou fora da cena do arquivo: as cópias transparentes das peças que esmaecem
 * (a cena volta aos materiais opacos, que o `soltarIlha` solta junto com o resto).
 */
export function soltarExtras(preparada: IlhaPreparada) {
  for (const copa of preparada.copas) {
    esmaecidasAgora.delete(copa.no.name)
    usarSuave(copa, false)
    for (const s of copa.suaves) s.dispose()
  }
  for (const material of preparada.materiaisSubstituidos) material.dispose()
}

/** Uma cena se prepara uma vez só (os nós `col-*` saem dela na primeira leitura). */
const preparadas = new WeakMap<Object3D, IlhaPreparada>()

export function prepararIlha(cena: Object3D, ilha: Ilha): IlhaPreparada {
  const feita = preparadas.get(cena)
  if (feita) return feita
  cena.rotation.y = giroDaIlha(ilha)
  const colisores = lerColisores(cena)
  tirarNosDeColisao(cena)
  // O arquivo é só desta ilha (não vem de um cache dividido): tinge e esmaece os materiais dele.
  const originais = materiaisDe(cena)
  const copas = separarCopas(cena)
  const materiais = materiaisDe(cena)
  // A tinta compartilha os uniforms também com as cópias transparentes das copas.
  pintarMateriais([...materiais, ...copas.flatMap((c) => c.suaves)], pinturaDaIlha(ilha))
  const pontes =
    ilha.id === 'bosque'
      ? prepararPontes(cena, colisores, [...materiais, ...copas.flatMap((c) => c.suaves)])
      : null
  const vegetacao = prepararVegetacao([...materiais, ...copas.flatMap((c) => c.suaves)])
  const preparada = {
    luzesNoturnas: prepararLuzesNoturnas([...materiais, ...copas.flatMap((c) => c.suaves)]),
    vegetacao,
    pontes,
    plataformas: ilha.id === 'nuvens' ? prepararPlataformasDasNuvens(cena, colisores) : [],
    modelo: cena,
    colisores,
    materiais,
    materiaisSubstituidos: originais.filter((material) => !materiais.includes(material)),
    copas,
  }
  preparadas.set(cena, preparada)
  return preparada
}

/**
 * O esmaecer que troca a leve pela completa sem estalo. Usa `alphaHash` (pontilhado que some com
 * a distância), que desenha na passada opaca: nada de ordenar transparências nem de apagar a
 * profundidade no meio da troca. Material já transparente (a água) só multiplica a opacidade.
 */
const opacidadeDeFabrica = new WeakMap<Material, number>()

export function aplicarOpacidade(materiais: Material[], opacidade: number) {
  const pontilhar = opacidade < 1
  for (const m of materiais) {
    let base = opacidadeDeFabrica.get(m)
    if (base === undefined) {
      base = m.opacity
      opacidadeDeFabrica.set(m, base)
    }
    m.opacity = base * opacidade
    if (m.transparent) continue
    if (m.alphaHash !== pontilhar) {
      m.alphaHash = pontilhar
      m.needsUpdate = true
    }
  }
}

/** Do centro do corpo à cabeça: é a cabeça que a câmera precisa ver. */
const ALTURA_DA_CABECA = 0.5
/** Do centro do corpo aos pés (quase: o pé encosta no chão). */
const ALTURA_DOS_PES = 0.7
/** Meia largura do avatar (os lados do corpo também contam). */
const MEIA_LARGURA = 0.4

/** Quase inteira: liga o pontilhado (para compilar o shader dele) sem nada sumir na tela. */
const QUASE_INTEIRA = 0.999

/**
 * Compila os shaders das duas versões (inteira e pontilhada) da completa e o pontilhado da leve
 * ANTES da troca: compilar na hora daria um soluço justo quando a ilha aparece.
 */
async function aquecer(
  gl: WebGLRenderer,
  camera: Camera,
  cena: Scene,
  preparada: IlhaPreparada,
  leve: Object3D | undefined,
  ativa: () => boolean,
) {
  try {
    for (const opacidade of [QUASE_INTEIRA, 1]) {
      if (!ativa()) return
      aplicarOpacidade(preparada.materiais, opacidade)
      await gl.compileAsync(preparada.modelo, camera, cena)
    }
    if (!ativa()) return
    // E as cópias transparentes das peças que esmaecem na frente da câmera.
    for (const copa of preparada.copas) usarSuave(copa, true)
    await gl.compileAsync(preparada.modelo, camera, cena)
    for (const copa of preparada.copas) usarSuave(copa, false)
    if (leve && ativa()) {
      const materiais = materiaisDe(leve)
      aplicarOpacidade(materiais, QUASE_INTEIRA)
      await gl.compileAsync(leve, camera, cena)
      aplicarOpacidade(materiais, 1)
    }
  } catch {
    // Compilar antes é só para não soluçar; se falhar, compila na primeira vez que desenhar.
  } finally {
    for (const copa of preparada.copas) usarSuave(copa, false)
    aplicarOpacidade(preparada.materiais, 1)
    if (leve) aplicarOpacidade(materiaisDe(leve), 1)
  }
}

/** O que a leve e a completa dividem durante a troca. */
export interface Troca {
  /** 0 = só a leve; 1 = só a completa. */
  opacidade: number
  /** Os colisores da completa já estão no mundo da física. */
  colisoresNaCena?: boolean
  /** O desenho da versão leve (para compilar o pontilhado dela junto). */
  leve?: Object3D
}

/**
 * Leva a ilha pelo ciclo `longe → carregando → pronta → ativa → descarregando` pela posição do
 * personagem (lida a cada quadro, fora do React; o estado do React só muda nas transições).
 */
export function useIlhaCompleta(
  ilha: Ilha,
  centro: { x: number; z: number },
  aberta: boolean,
  troca: Troca,
): { estado: EstadoDaIlha; preparada: IlhaPreparada | null } {
  const { rastro, pedidos, movimento } = useJogo()
  const jornada = useEstado((s) => s.jornada)
  const candidatas = useMemo(
    () =>
      ilhasEmVolta()
        .filter((i) => !!ILHAS_COMPLETAS[i.ilha.id] && ilhaAberta(i.ilha.id, jornada))
        .map((i) => ({ id: i.ilha.id, ...i.centro })),
    [jornada],
  )
  const { gl, camera, scene } = useThree()
  const info = ILHAS_COMPLETAS[ilha.id]
  const [estado, setEstado] = useState<EstadoDaIlha>('longe')
  const [preparada, setPreparada] = useState<IlhaPreparada | null>(null)
  const vivo = useRef({
    estado: 'longe' as EstadoDaIlha,
    preparada: null as IlhaPreparada | null,
    falhou: false,
    // Cada carga tem um número: uma resposta que chega depois de a ilha ser solta é ignorada.
    carga: 0,
  })

  useFrame((_, dt) => {
    const v = vivo.current
    const distancia = Math.hypot(rastro.x - centro.x, rastro.z - centro.z)
    const perto =
      !!info &&
      aberta &&
      ilhaPreferida(
        rastro,
        candidatas,
        movimento.modo === 'mergulho'
          ? (movimento.mergulhos.find((v) => v.ativo)?.id ?? null)
          : null,
      ) === ilha.id &&
      (ilha.id === 'recife'
        ? distancia < MERGULHO.carregar
        : nivelDeDetalhe(distancia, naPonteDa(ilha, rastro.x, rastro.z)) !== 'silhueta')
    if (!perto) v.falhou = false
    troca.opacidade = esmaecer(troca.opacidade, opacidadeAlvo(v.estado), dt, DURACAO_DA_TROCA)
    const proximo = proximoEstadoDaIlha(v.estado, {
      perto,
      naTroca: perto && distancia < (ilha.id === 'recife' ? MERGULHO.ativar : DISTANCIA_DA_TROCA),
      carregada: v.preparada !== null,
      falhou: v.falhou,
      saiuDeVista: troca.opacidade <= 0,
    })
    // Com o personagem em cima da ilha antes de o chão de verdade chegar (o jogo abriu num deque),
    // ele espera no ar em vez de cair até a versão leve.
    const chegando =
      v.estado === 'carregando' ||
      v.estado === 'pronta' ||
      (v.estado === 'ativa' && !troca.colisoresNaCena)
    // Espera também fora do contorno leve: ponta do Bosque e caverna do Recife.
    const m = noModelo(rastro.x - centro.x, rastro.z - centro.z, giroDaIlha(ilha))
    const emCima = distancia < raioDaEsperaDaIlha(ilha, m.x, m.z) + MARGEM_DA_ESPERA_PELO_CHAO
    if (chegando && emCima) {
      pedidos.chaoChegando.add(ilha.id)
    } else pedidos.chaoChegando.delete(ilha.id)
    if (proximo === v.estado) return
    v.estado = proximo
    setEstado(proximo)
    if (proximo !== 'carregando' || !info) return
    const carga = ++v.carga
    buscarIlha(info.url)
      .then(async (cena) => {
        if (carga !== v.carga) return
        let p: IlhaPreparada | null = null
        const retencao = reterIlha(info.url, cena, () => {
          if (p) soltarExtras(p)
        })
        if (!retencao) return
        try {
          p = prepararIlha(cena, ilha)
          const ativa = () => carga === v.carga && retencao.ativa()
          await aquecer(gl, camera, scene, p, troca.leve, ativa)
          if (!ativa()) return
          v.preparada = p
          setPreparada(p)
        } finally {
          retencao.liberar()
        }
      })
      .catch(() => {
        if (carga === v.carga) v.falhou = true
      })
  })

  // De volta a longe: a cena já tirou a completa (este efeito roda depois do React), então
  // geometrias, materiais e texturas podem ser soltos sem a placa de vídeo desenhar de novo.
  useEffect(() => {
    if (estado !== 'longe' || !info) return
    const v = vivo.current
    v.carga++
    v.preparada = null
    setPreparada(null)
    soltarIlha(info.url)
  }, [estado, info])
  useEffect(
    () => () => {
      vivo.current.carga++
      vivo.current.preparada = null
      pedidos.chaoChegando.delete(ilha.id)
      if (info) soltarIlha(info.url)
    },
    [info, pedidos, ilha.id],
  )

  return { estado, preparada }
}

/** Os colisores dos nós `col-*`, com as bordas arredondadas (o personagem não engancha). */
export function ColisoresDaIlha({
  colisores,
  troca,
}: {
  colisores: ColisorDaIlha[]
  troca: Troca
}) {
  // Os colisores entram no mundo nos efeitos dos filhos, que rodam antes deste.
  useEffect(() => {
    troca.colisoresNaCena = true
    return () => {
      troca.colisoresNaCena = false
    }
  }, [troca])
  // As peças que o corpo usa (o trenó) num corpo próprio, marcado (`pecaDoColisor`).
  const pecas = new Map<string, ColisorDaIlha[]>()
  const chao: ColisorDaIlha[] = []
  for (const c of colisores) {
    const peca = pecaDoColisor(c.nome)
    if (!peca) chao.push(c)
    else pecas.set(peca, [...(pecas.get(peca) ?? []), c])
  }
  return (
    <>
      <RigidBody type="fixed" colliders={false}>
        {chao.map(colisorDaIlha)}
      </RigidBody>
      {[...pecas].map(([peca, lista]) => (
        <RigidBody key={peca} type="fixed" colliders={false} userData={{ peca }}>
          {lista.map(colisorDaIlha)}
        </RigidBody>
      ))}
    </>
  )
}

/**
 * Os colisores de uma peça carregada à parte numa ilha (o mirante das Nuvens): um corpo fixo, sem
 * marcar a troca da ilha (`colisoresNaCena` é da ilha).
 */
export function ColisoresSoltos({ colisores }: { colisores: ColisorDaIlha[] }) {
  return (
    <RigidBody type="fixed" colliders={false}>
      {colisores.map(colisorDaIlha)}
    </RigidBody>
  )
}

function colisorDaIlha(c: ColisorDaIlha) {
  if (c.forma === 'malha') {
    return <TrimeshCollider key={c.nome} args={[c.vertices, c.indices]} />
  }
  if (c.forma === 'cilindro') {
    const b = bordaQueCabe(c.meiaAltura, c.raio)
    return (
      <RoundCylinderCollider
        key={c.nome}
        {...gruposDoColisor(soParaOCorpo(c.nome))}
        args={[c.meiaAltura - b, c.raio - b, b]}
        position={c.posicao}
        quaternion={c.rotacao}
      />
    )
  }
  const [x, y, z] = c.meio
  const b = bordaQueCabe(x, y, z)
  return (
    <RoundCuboidCollider
      key={c.nome}
      {...gruposDoColisor(soParaOCorpo(c.nome))}
      args={[x - b, y - b, z - b, b]}
      position={c.posicao}
      quaternion={c.rotacao}
    />
  )
}

/**
 * A ilha completa na cena: entra e sai esmaecendo (`troca.opacidade`), com os pedaços saindo do
 * cinza como os da leve (a mesma tinta, `pintura-da-ilha.ts`). Só colide quando está ativa.
 */
export function IlhaCompleta({
  preparada,
  colide,
  troca,
}: {
  preparada: IlhaPreparada
  colide: boolean
  troca: Troca
}) {
  const { rastro, ambiente } = useJogo()
  const camera = useThree((s) => s.camera)
  const aplicada = useRef(-1)
  const pontos = useRef(Array.from({ length: 6 }, () => new Vector3()))
  useFrame((_, dt) => {
    iluminarArte(preparada.luzesNoturnas, ambiente.noite)
    if (troca.opacidade !== aplicada.current) {
      aplicada.current = troca.opacidade
      aplicarOpacidade(preparada.materiais, troca.opacidade)
      preparada.modelo.visible = troca.opacidade > 0
    }
    // A copa, o tronco ou o telhado que fica entre a câmera e o avatar (cabeça, peito, pés e os
    // dois lados do corpo, vistos da câmera, e o Zappy) esmaece suave e volta quando sai da frente.
    const [cabeca, peito, pes, esquerda, direita, zappy] = pontos.current
    cabeca?.set(rastro.x, rastro.y + ALTURA_DA_CABECA, rastro.z)
    peito?.set(rastro.x, rastro.y, rastro.z)
    pes?.set(rastro.x, rastro.y - ALTURA_DOS_PES, rastro.z)
    const lx = camera.position.z - rastro.z
    const lz = -(camera.position.x - rastro.x)
    const l = Math.hypot(lx, lz) || 1
    esquerda?.set(rastro.x + (lx / l) * MEIA_LARGURA, rastro.y, rastro.z + (lz / l) * MEIA_LARGURA)
    direita?.set(rastro.x - (lx / l) * MEIA_LARGURA, rastro.y, rastro.z - (lz / l) * MEIA_LARGURA)
    // O Zappy onde ele está de verdade (escrito por `personagem/zappy` a cada quadro).
    zappy?.set(rastro.zappy.x, rastro.zappy.y, rastro.zappy.z)
    for (const copa of preparada.copas) {
      // Com a câmera dentro da copa ela some de vez (de dentro, a copa só atrapalha).
      const alvo =
        copa.ehCopa && caixaNoMundo(copa).containsPoint(camera.position)
          ? 0
          : tapa(copa, pontos.current, camera.position)
            ? OPACIDADE_DA_COPA_NA_FRENTE
            : 1
      copa.visivel = esmaecer(copa.visivel, alvo, dt, DURACAO_DO_ESMAECER_DA_COPA)
      usarSuave(copa, copa.visivel < 1)
      if (copa.suaveLigado) {
        aplicarSuave(copa, copa.visivel)
        esmaecidasAgora.add(copa.no.name)
      } else esmaecidasAgora.delete(copa.no.name)
    }
  })
  return (
    <>
      <primitive object={preparada.modelo} />
      {colide && preparada.pontes && (
        <PontesVivas pontes={preparada.pontes} modelo={preparada.modelo} />
      )}
      {colide && preparada.plataformas.length > 0 && (
        <PlataformasDasNuvens
          plataformas={preparada.plataformas}
          modelo={preparada.modelo}
          troca={troca}
        />
      )}
      {colide && (
        <ColisoresDaIlha
          colisores={
            preparada.pontes
              ? preparada.colisores.filter(
                  (c) => !preparada.pontes?.trechos.some((t) => t.colisor === c),
                )
              : preparada.colisores.filter(
                  (c) => !preparada.plataformas.some((p) => p.colisor === c),
                )
          }
          troca={troca}
        />
      )}
    </>
  )
}
