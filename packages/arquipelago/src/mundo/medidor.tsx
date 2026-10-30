import { useFrame, useThree } from '@react-three/fiber'
import { useAfterPhysicsStep, useBeforePhysicsStep, useRapier } from '@react-three/rapier'
import { progresso } from '@sistemazero/arquipelago-contracts'
import { useEffect, useMemo, useRef } from 'react'
import { Box3, type Mesh, type Object3D, Vector3 } from 'three'
import { type Movimento, useJogo } from '../estado/contexto'
import { lojaDosConvidados } from '../estado/convidados'
import { lojaDoFarol } from '../estado/farol'
import { fachosAcesos } from '../sistemas/final-do-farol'
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
 * volta do avatar (para os prints das poses). Desligado, não faz nada.
 */
export const CHAVE_DE_MEDIR = 'arquipelago:medir'
const INTERVALO_DE_MEDIDA = 0.25

export interface MedidaDoDesenho {
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
  clima: { escolhido: string; luz: number; cinza: number; gotas: boolean }
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
    recifePronto: boolean
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
  /** O Lumi fazendo a rotina na horta (fase2-07), com onde está, ou `null`. */
  lumiDaRotina: { lumi: string; x: number; y: number; z: number } | null
  /** Onde está a lanterna acesa na mão (no mundo), ou `null`. */
  lanternaNaMao: { x: number; y: number; z: number } | null
  /** Descansando (fase2-13): o jeito, a energia e onde está a origem do desenho do avatar (os pés). */
  descanso: 'sentar' | 'deitar' | null
  energia: number
  avatar: { x: number; y: number; z: number; deitado: number } | null
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
  let lanternaNaMao: MedidaDoDesenho['lanternaNaMao'] = null
  let lumiDaRotina: MedidaDoDesenho['lumiDaRotina'] = null
  raiz.traverse((o) => {
    if (/^borrao-\d+:\d+$/.test(o.name) && o.visible)
      borroes.push({ id: o.name.slice(7), x: o.position.x, z: o.position.z })
    else if (o.name.startsWith('lumi-da-vila-')) lumisDaVila.push(o.name.slice(13))
    else if (o.name.startsWith('lumi-da-rotina-'))
      lumiDaRotina = { lumi: o.name.slice(15), x: o.position.x, y: o.position.y, z: o.position.z }
    else if (o.name === 'lanterna-na-mao' && o.visible) {
      const p = o.getWorldPosition(new Vector3())
      lanternaNaMao = { x: p.x, y: p.y, z: p.z }
    }
  })
  return { borroes, lumisDaVila, lanternaNaMao, lumiDaRotina }
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
      __arquipelagoLerCorpo?: () => {
        x: number
        y: number
        z: number
        giro: number
        noChao: boolean
        /** O olho da vista pela luneta do mirante, quando aberta (fase4-07). */
        olho: { x: number; y: number; z: number } | null
      }
    }
    // Leitura sob demanda para conferir pulos sem reduzir o intervalo do medidor pesado.
    g.__arquipelagoLerCorpo = () => ({
      x: rastro.x,
      y: rastro.y,
      z: rastro.z,
      giro: rastro.giro,
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
      g.__arquipelagoLerCorpo = undefined
      g.__arquipelagoMovimento = undefined
      g.__arquipelagoCameraEmVolta = undefined
    }
  }, [ligado, pedidos, rastro, movimento])
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
        luz: ambiente.luzDoClima ?? 1,
        cinza: ambiente.cinzaDoClima ?? 0,
        gotas: cena.getObjectByName('chuva-da-ilha')?.visible === true,
      },
      horta: loja.getState().salvamento.horta.map((c) => ({
        semente: c.semente,
        regado: c.regadoEm !== null,
        progresso: progresso(c, Date.now()),
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
            recifePronto: movimento.barco.recifePronto,
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
    }
    ;(globalThis as { __arquipelagoDesenho?: MedidaDoDesenho }).__arquipelagoDesenho = medida
    fisica.current.ms = 0
    fisica.current.passos = 0
    c.tempo = 0
    c.quadros = 0
  })
  return <PalcoDePrint ligado={ligado} />
}
