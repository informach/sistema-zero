import { useFrame, useThree } from '@react-three/fiber'
import { useAfterPhysicsStep, useBeforePhysicsStep, useRapier } from '@react-three/rapier'
import { progresso } from '@sistemazero/arquipelago-contracts'
import { useEffect, useMemo, useRef } from 'react'
import { Box3, Mesh, type Object3D, type Skeleton, SkinnedMesh, Vector3 } from 'three'
import { type Movimento, useJogo } from '../estado/contexto'
import { lojaDosConvidados } from '../estado/convidados'
import { lojaDoFarol } from '../estado/farol'
import { climaEfetivo } from '../sistemas/clima'
import { fachosAcesos } from '../sistemas/final-do-farol'
import { geladeiraEm } from '../sistemas/horta'
import type { NivelDeQualidade } from '../sistemas/qualidade'
import type { ConvidadoNaCasa } from '../sistemas/visitas-dos-moradores'
import { ilhasNaMemoria, ultimaLiberacao } from './carregar-ilha'
import { medirFesta } from './catalogo-da-festa'
import { esmaecidasAgora } from './copas'
import { fogoAgora } from './fogueira-viva'
import { folhasAgora } from './folhas-ao-vento'
import { mecanismosAgora } from './mecanismos'
import { materiaisDe } from './modelos'
import { reativosAgora } from './objetos-reativos'
import { ondasAgora } from './ondinhas'
import { PalcoDePrint } from './palco-de-print'
import { pontesAgora } from './pontes-vivas'
import { useQualidade } from './qualidade-da-cena'
import { troncoAgora } from './tronco-no-lago'
import { qualidadeDaVegetacao, ventoAgora } from './vegetacao-ao-vento'

/**
 * Só para medir o desenho (playground e conferência de desempenho): com
 * `localStorage['arquipelago:medir'] = '1'`, deixa os números do `renderer.info` em
 * `globalThis.__arquipelagoDesenho` (com a posição do personagem) a cada quarto de segundo, e
 * `globalThis.__arquipelagoLevar(x, y, z, giro)` leva o personagem a um ponto (para medir a memória
 * na mesma pose antes e depois de uma visita) e `globalThis.__arquipelagoMovimento()` dá o que a
 * ilha registrou para os modos; `globalThis.__arquipelagoCameraEmVolta(desvio)` gira a câmera em
 * volta do avatar (para os prints das poses); `globalThis.__arquipelagoAcharNos(nome)` dá onde
 * ficam no mundo os nós com esse nome e se aparecem (um móvel desenhado onde colide). Desligado,
 * não faz nada.
 */
export const CHAVE_DE_MEDIR = 'arquipelago:medir'
const INTERVALO_DE_MEDIDA = 0.25

export interface MedidaDoDesenho {
  fantasma: {
    visivel: boolean
    x: number
    y: number
    z: number
    malhas: number
    opacidade: number | null
    esqueletoProprio: boolean
  } | null
  convidados: readonly ConvidadoNaCasa[]
  finalDoFarol: { etapa: string; tempo: number; fachos: number; leu: boolean; voltou: boolean }
  plataformasDasNuvens: {
    numero: number
    corpoY: number
    desenhoY: number
    topoY: number
    x: number
    z: number
  }[]
  mergulho: { pronto: boolean; achados: { bau: boolean; pagina: boolean; tesouro: boolean } }
  /** A corrida em andamento (fase4-07: as Nuvens têm duas) e as constelações achadas. */
  corrida: {
    percurso: string | null
    deque: number
    situacao: string
    tempoMs: number
    pegos: number
  } | null
  mira: { naMira: number; posicao: { x: number; y: number; z: number } } | null
  constelacoes: number
  /** O clima da sua ilha (fase4-08): o escolhido, a luz e o cinza que valem aqui e as gotas. */
  clima: { escolhido: string; efetivo: string; luz: number; cinza: number; gotas: boolean }
  /** A horta: o que está plantado, se foi regado e quanto já cresceu (0 a 1). */
  horta: { semente: string | null; regado: boolean; progresso: number }[]
  balao: {
    fase: string
    pousado: boolean
    fogo: boolean
    pe: { x: number; y: number; z: number }
    casa: { x: number; y: number; z: number }
    vel: { x: number; y: number; z: number }
  } | null
  barco: {
    fase: string
    distancia: number
    comprimento: number
    prontos: readonly boolean[]
    itinerario: readonly string[]
    devolvendo: boolean
    visual: { x: number; y: number; z: number }
    pose: { x: number; y: number; z: number }
  } | null
  festa: ReturnType<typeof medirFesta>
  luzesDosLumis: Record<string, number[]>
  qualidade: NivelDeQualidade
  metaDeQuadros: 30 | 60
  dpr: number
  amplitudeDoVento: number
  chamadas: number
  triangulos: number
  geometrias: number
  texturas: number
  programas: number
  quadrosPorSegundo: number
  ilhasCompletas: number
  posicao: { x: number; y: number; z: number }
  /** Para onde a câmera olha (o mesmo `giro` do rastro). */
  giro: number
  camera: { x: number; y: number; z: number }
  /**
   * Geometrias diferentes penduradas na cena agora (desenhadas ou não). `geometrias` (as que estão
   * na placa de vídeo) nunca passa disto se nada ficou para trás de uma ilha solta.
   */
  geometriasNaCena: number
  /** As copas, troncos e telhados esmaecidos agora (na frente da câmera). */
  esmaecidas: string[]
  /** Quanto a última ilha completa solta liberou. */
  liberadas: { geometrias: number; materiais: number; texturas: number }
  /** O tronco que boia no lago do Bosque (posição e parte na água). */
  tronco: typeof troncoAgora
  /** O modo do corpo (`sistemas/modos`) e se ele pisa em algo. */
  modo: Movimento['modo']
  noChao: boolean
  ondas: typeof ondasAgora
  reativos: typeof reativosAgora
  /** A folha e a pena soltas do Bosque. */
  folhas: typeof folhasAgora
  fogo: typeof fogoAgora
  vento: typeof ventoAgora
  mecanismos: typeof mecanismosAgora
  pontes: typeof pontesAgora
  fisica: { corposAtivos: number; passoMs: number }
  /** Cada patim calçado: quantas malhas e a altura mais baixa das rodinhas (vazio: descalço). */
  patins: { peca: string; malhas: number; rodas: number }[]
  /** Os borrões à vista (com onde estão), os Lumis da Vila e se a lanterna está na mão (fase2-06). */
  borroes: { id: string; x: number; z: number }[]
  lumisDaVila: string[]
  /** Os Lumis que moram nas ilhas (`ilha-âncora-espécie`), a Vila inclusive. */
  lumisDasIlhas: string[]
  /** O Lumi fazendo a rotina na horta (fase2-07), com onde está, ou `null`. */
  lumiDaRotina: { lumi: string; x: number; y: number; z: number } | null
  /** Onde está a lanterna acesa na mão (no mundo), ou `null`. */
  lanternaNaMao: { x: number; y: number; z: number } | null
  /** Descansando (fase2-13): o jeito, a energia e onde está a origem do desenho do avatar (os pés). */
  descanso: 'sentar' | 'deitar' | null
  energia: number
  avatar: { x: number; y: number; z: number; deitado: number } | null
  /** O bichinho do quarto acompanhando (S01), onde está e para onde olha, ou `null`. */
  petQueAcompanha: { x: number; y: number; z: number; giro: number } | null
}

function medirLigado(): boolean {
  try {
    return localStorage.getItem(CHAVE_DE_MEDIR) === '1'
  } catch {
    return false
  }
}

const caixaDoPatim = new Box3()
const caixaDaMalha = new Box3()
function medirPatins(raiz: Object3D): MedidaDoDesenho['patins'] {
  const r: MedidaDoDesenho['patins'] = []
  const grupo = raiz.getObjectByName('patins-calcados')
  if (!grupo) return r
  for (const peca of ['patim-esq', 'patim-dir']) {
    caixaDoPatim.makeEmpty()
    let malhas = 0
    for (const m of grupo.children) {
      if (!m.name.startsWith(`${peca}-`)) continue
      malhas++
      // A malha tem esqueleto: a caixa precisa da pose deste quadro.
      caixaDoPatim.union(caixaDaMalha.setFromObject(m, true))
    }
    if (malhas) r.push({ peca, malhas, rodas: caixaDoPatim.min.y })
  }
  return r
}

function medirBorroes(raiz: Object3D) {
  const borroes: MedidaDoDesenho['borroes'] = []
  const lumisDaVila: string[] = []
  const lumisDasIlhas: string[] = []
  let lanternaNaMao: MedidaDoDesenho['lanternaNaMao'] = null
  let lumiDaRotina: MedidaDoDesenho['lumiDaRotina'] = null
  raiz.traverse((o) => {
    if (/^borrao-(?:[a-z-]+:)?\d+:\d+$/.test(o.name) && o.visible)
      borroes.push({ id: o.name.slice(7), x: o.position.x, z: o.position.z })
    else if (o.name.startsWith('lumi-da-ilha-')) {
      const id = o.name.slice(13)
      lumisDasIlhas.push(id)
      if (id.startsWith('vila-doce-')) lumisDaVila.push(id.slice(10))
    } else if (o.name.startsWith('lumi-da-rotina-'))
      lumiDaRotina = { lumi: o.name.slice(15), x: o.position.x, y: o.position.y, z: o.position.z }
    else if (o.name === 'lanterna-na-mao' && o.visible) {
      const p = o.getWorldPosition(new Vector3())
      lanternaNaMao = { x: p.x, y: p.y, z: p.z }
    }
  })
  return { borroes, lumisDaVila, lumisDasIlhas, lanternaNaMao, lumiDaRotina }
}

function medirAvatar(raiz: Object3D): MedidaDoDesenho['avatar'] {
  const a = raiz.getObjectByName('avatar-visual')?.parent
  if (!a) return null
  const p = a.getWorldPosition(new Vector3())
  return { x: p.x, y: p.y, z: p.z, deitado: a.rotation.x }
}

function contarGeometrias(raiz: Object3D): number {
  const vistas = new Set<unknown>()
  raiz.traverse((o) => {
    const g = (o as Mesh).geometry
    if (g) vistas.add(g)
  })
  return vistas.size
}

function medirFantasma(raiz: Object3D): MedidaDoDesenho['fantasma'] {
  const g = raiz.getObjectByName('fantasma-familiar')
  if (!g) return null
  let malhas = 0,
    opacidade: number | null = null
  const doJogador = new Set<Skeleton>(),
    doFantasma = new Set<Skeleton>()
  raiz.getObjectByName('avatar-visual')?.traverse((o) => {
    if (o instanceof SkinnedMesh) doJogador.add(o.skeleton)
  })
  g.traverse((o) => {
    if (!(o instanceof Mesh)) return
    if (o instanceof SkinnedMesh) doFantasma.add(o.skeleton)
    malhas++
    opacidade = (Array.isArray(o.material) ? o.material[0] : o.material)?.opacity ?? null
  })
  return {
    visivel: g.visible,
    x: g.position.x,
    y: g.position.y,
    z: g.position.z,
    malhas,
    opacidade,
    esqueletoProprio:
      doFantasma.size > 0 && doJogador.size > 0 && [...doFantasma].every((s) => !doJogador.has(s)),
  }
}

/** Um nó da cena achado pelo nome (`__arquipelagoAcharNos`): o lugar no mundo e se aparece. */
interface NoNaCena {
  x: number
  y: number
  z: number
  visivel: boolean
}

export function Medidor() {
  const qualidade = useQualidade()
  const ligado = useMemo(medirLigado, [])
  const gl = useThree((s) => s.gl)
  const camera = useThree((s) => s.camera)
  const cena = useThree((s) => s.scene)
  const { rastro, pedidos, movimento, loja, ambiente } = useJogo()
  const conta = useRef({ tempo: 0, quadros: 0 })
  const { world } = useRapier()
  const fisica = useRef({ inicio: 0, ms: 0, passos: 0 })
  useBeforePhysicsStep(() => {
    if (ligado) fisica.current.inicio = performance.now()
  })
  useAfterPhysicsStep(() => {
    if (ligado) {
      fisica.current.ms += performance.now() - fisica.current.inicio
      fisica.current.passos++
    }
  })
  useEffect(() => {
    if (!ligado) return
    const g = globalThis as {
      __arquipelagoMovimento?: () => Movimento
      __arquipelagoCameraEmVolta?: (desvio: number) => void
      __arquipelagoLevar?: (...a: number[]) => void
      __arquipelagoLerQuarto?: () => { nome: string; pose: number[] }[]
      __arquipelagoAcharNos?: (nome: string) => NoNaCena[]
      __arquipelagoLerCorpo?: () => {
        x: number
        y: number
        z: number
        giro: number
        velocidade: number
        noChao: boolean
        /** O olho da vista pela luneta do mirante, quando aberta (fase4-07). */
        olho: { x: number; y: number; z: number } | null
      }
    }
    // Inspeção sob demanda: não percorre móveis nem aloca poses no laço do jogo.
    g.__arquipelagoLerQuarto = () => {
      const poses: { nome: string; pose: number[] }[] = []
      cena.getObjectByName('quarto-da-plataforma')?.traverse((o) => {
        poses.push({
          nome: o.name,
          pose: [...o.position.toArray(), ...o.quaternion.toArray(), ...o.scale.toArray()],
        })
      })
      return poses
    }
    // Os nós com esse nome na cena, onde estão no mundo e se aparecem (eles e todos os pais
    // visíveis): para conferir que um móvel está desenhado onde colide.
    g.__arquipelagoAcharNos = (nome: string) => {
      const achados: NoNaCena[] = []
      cena.updateMatrixWorld()
      cena.traverse((o) => {
        if (o.name !== nome) return
        let visivel = true
        for (let a: Object3D | null = o; a; a = a.parent) visivel &&= a.visible
        const p = o.getWorldPosition(new Vector3())
        achados.push({ x: p.x, y: p.y, z: p.z, visivel })
      })
      return achados
    }
    // Leitura sob demanda para conferir pulos sem reduzir o intervalo do medidor pesado.
    g.__arquipelagoLerCorpo = () => ({
      x: rastro.x,
      y: rastro.y,
      z: rastro.z,
      giro: rastro.giro,
      velocidade: rastro.velocidade,
      noChao: movimento.noChao,
      olho: movimento.mira ? { ...movimento.mira.posicao } : null,
    })
    // O que a ilha ativa registrou para os modos (cipós, troncos, escadas, bordas...) e o pedido
    // de um interativo: para a conferência das animações levar o corpo a cada um.
    g.__arquipelagoMovimento = () => movimento
    // A câmera em volta do avatar, a `desvio` de onde ele olha (0 é de frente, π é das costas).
    g.__arquipelagoCameraEmVolta = (desvio: number) => {
      rastro.giro = rastro.direcao + desvio
    }
    g.__arquipelagoLevar = (x = 0, y = 0, z = 0, giro?: number) => {
      pedidos.teleporte = { x, y, z }
      if (giro !== undefined) rastro.giro = giro
    }
    return () => {
      g.__arquipelagoLevar = undefined
      g.__arquipelagoLerQuarto = undefined
      g.__arquipelagoAcharNos = undefined
      g.__arquipelagoLerCorpo = undefined
      g.__arquipelagoMovimento = undefined
      g.__arquipelagoCameraEmVolta = undefined
    }
  }, [ligado, pedidos, rastro, movimento, cena])
  useFrame((_, dt) => {
    if (!ligado) return
    const c = conta.current
    c.tempo += dt
    c.quadros++
    if (c.tempo < INTERVALO_DE_MEDIDA) return
    const plataformasDasNuvens: MedidaDoDesenho['plataformasDasNuvens'] = []
    let corposAtivos = 0
    world.bodies.forEach((b) => {
      const numero = (b.userData as { nuvem?: number } | undefined)?.nuvem
      if (numero) {
        const desenho = cena.getObjectByName(`plataforma-${numero}`)
        const topo = cena.getObjectByName(`topo-plataforma-${numero}`)
        if (desenho && topo) {
          const p = b.translation()
          plataformasDasNuvens.push({
            numero,
            corpoY: p.y,
            desenhoY: desenho.getWorldPosition(new Vector3()).y,
            topoY: topo.getWorldPosition(new Vector3()).y,
            x: p.x,
            z: p.z,
          })
        }
      }
      if (!b.isFixed() && !b.isSleeping()) corposAtivos++
    })
    const final = lojaDoFarol(loja).getState()
    const medida: MedidaDoDesenho = {
      fantasma: medirFantasma(cena),
      convidados: lojaDosConvidados(loja).getState().convidados,
      finalDoFarol: {
        etapa: final.etapa,
        tempo: final.tempo,
        fachos: fachosAcesos(final.tempo, final.menosMovimento),
        leu: loja.getState().salvamento.farol.pagina,
        voltou: loja.getState().salvamento.farol.concluido,
      },
      plataformasDasNuvens,
      mergulho: {
        pronto: movimento.mergulhos.some((v) => v.ativo),
        achados: { ...loja.getState().salvamento.recife },
      },
      corrida: movimento.corrida
        ? {
            percurso: loja.getState().corrida?.percurso ?? null,
            deque: movimento.corrida.deque,
            situacao: movimento.corrida.situacao,
            tempoMs: movimento.corrida.tempoMs,
            pegos: movimento.corrida.pegos.filter(Boolean).length,
          }
        : null,
      mira: movimento.mira
        ? { naMira: movimento.mira.naMira, posicao: { ...movimento.mira.posicao } }
        : null,
      constelacoes: loja.getState().salvamento.nuvens.constelacoes,
      clima: {
        escolhido: loja.getState().salvamento.clima,
        efetivo: climaEfetivo(loja.getState(), Date.now()),
        luz: ambiente.luzDoClima ?? 1,
        cinza: ambiente.cinzaDoClima ?? 0,
        gotas: cena.getObjectByName('chuva-da-ilha')?.visible === true,
      },
      horta: loja.getState().salvamento.horta.map((c) => ({
        semente: c.semente,
        regado: c.regadoEm !== null,
        progresso: progresso(c, Date.now(), geladeiraEm(loja.getState().salvamento)),
      })),
      balao: movimento.balao
        ? {
            fase: movimento.balao.fase,
            pousado: movimento.balao.pousado,
            fogo: movimento.balao.fogo,
            pe: { ...movimento.balao.pe },
            casa: { ...movimento.balao.casa },
            vel: { ...movimento.balao.vel },
          }
        : null,
      barco: movimento.barco
        ? {
            fase: movimento.barco.fase,
            distancia: movimento.barco.distancia,
            comprimento: movimento.barco.rota.comprimento,
            prontos: [...movimento.barco.prontos],
            itinerario: [...movimento.barco.itinerario],
            devolvendo: movimento.barco.devolvendo,
            visual: { ...movimento.barco.visual },
            pose: { ...movimento.barco.pose },
          }
        : null,
      festa: medirFesta(cena),
      luzesDosLumis: Object.fromEntries(
        ['estrelinha', 'buzio'].map((id) => {
          const objeto = cena.getObjectByName(`habitante-${id}`)
          return [id, objeto ? materiaisDe(objeto, 'luz').map((m) => m.emissiveIntensity) : []]
        }),
      ),
      qualidade: qualidade.nivel,
      metaDeQuadros: qualidade.meta,
      dpr: gl.getPixelRatio(),
      amplitudeDoVento: (qualidadeDaVegetacao.get(cena) ?? 1) * ventoAgora.escalaVisual,
      ondas: { ...ondasAgora },
      reativos: { ...reativosAgora, pecas: reativosAgora.pecas.map((p) => ({ ...p })) },
      folhas: { pecas: folhasAgora.pecas.map((p) => ({ ...p })) },
      fogo: { ...fogoAgora },
      vento: { ...ventoAgora },
      mecanismos: { ...mecanismosAgora },
      pontes: { ...pontesAgora },
      fisica: { corposAtivos, passoMs: fisica.current.ms / Math.max(1, fisica.current.passos) },
      chamadas: gl.info.render.calls,
      triangulos: gl.info.render.triangles,
      geometrias: gl.info.memory.geometries,
      texturas: gl.info.memory.textures,
      programas: gl.info.programs?.length ?? 0,
      quadrosPorSegundo: Math.round(c.quadros / c.tempo),
      ilhasCompletas: ilhasNaMemoria(),
      posicao: { x: rastro.x, y: rastro.y, z: rastro.z },
      giro: rastro.giro,
      camera: { x: camera.position.x, y: camera.position.y, z: camera.position.z },
      liberadas: { ...ultimaLiberacao },
      esmaecidas: [...esmaecidasAgora],
      geometriasNaCena: contarGeometrias(cena),
      tronco: { ...troncoAgora },
      modo: movimento.modo,
      noChao: movimento.noChao,
      patins: medirPatins(cena),
      ...medirBorroes(cena),
      descanso: loja.getState().descanso,
      energia: loja.getState().salvamento.necessidades.energia,
      avatar: medirAvatar(cena),
      petQueAcompanha: (() => {
        const o = cena.getObjectByName('pet-que-acompanha')
        if (!o) return null
        const p = o.getWorldPosition(new Vector3())
        return { x: p.x, y: p.y, z: p.z, giro: o.rotation.y }
      })(),
    }
    ;(globalThis as { __arquipelagoDesenho?: MedidaDoDesenho }).__arquipelagoDesenho = medida
    fisica.current.ms = 0
    fisica.current.passos = 0
    c.tempo = 0
    c.quadros = 0
  })
  return <PalcoDePrint ligado={ligado} />
}
