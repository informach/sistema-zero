import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  actorFigure,
  cenarioTemChao,
  DEFAULT_CAST,
  isSceneCast,
  openScene,
  SCENE_IDS,
  SCENE_ROLES,
  type SceneActivity,
  type SceneCast,
  type SceneFigure,
  type SceneId,
  type SceneRole,
  type SceneStart,
  type SceneState,
  sceneCenario,
  sceneScript,
  stepScene,
} from '@sistemazero/core/learning/scene'
import { Glob } from 'bun'
import { renderToStaticMarkup } from 'react-dom/server'
import { ExplorationPieces } from '../src/components/exploration-pieces'
import { ExplorationStage } from '../src/components/exploration-stage'
import { ActorFigure } from '../src/components/scene-figures'

/**
 * O desenho veste o elenco (Raio-X, lote 3, 16/09/2026).
 *
 * ⚠️⚠️ O elenco trocava só os NOMES: o Desafio publicado mostrava "nave" num dinossauro azul na
 * grama, e O Jogo do Meu Jeito, "pedra" e "chama" sobre um Dino e três árvores. Esta varredura
 * é o que impede a volta disso: para cada uma das 45 cenas ela cobra que o palco desenhe, para
 * cada papel da tabela `SCENE_ROLES` do core, a figura que o core escolhe — e nunca o Dino, o
 * cacto ou a árvore no lugar de outra coisa.
 *
 * ⚠️⚠️ Consertos do review do lote 3, provados por mutação: a primeira versão DESCOBRIA os papéis
 * de cada cena pelo desenho e deixava passar dois esquecimentos.
 * 1. Um palco que desenhasse o obstáculo com o traço CRU do cacto (sem `ActorFigure`) só perdia o
 *    papel na descoberta, e a cena passava por "abstrata". Hoje a descoberta é comparada com a
 *    tabela LITERAL do core, e os traços crus do cacto e da árvore são procurados como o do Dino.
 * 2. Um palco que pusesse a moldura no espaço e esquecesse o `FundoDoCenario` (a grama da terra
 *    dentro do céu) passava, porque só a moldura era conferida. Hoje o fundo tem contrato próprio
 *    (`data-fundo`), e a folhagem da terra no espaço reprova.
 * O `describe` final roda o conferente contra HTML adulterado: sem ele, um conferente que não
 * reprovasse nada deixaria todo o resto verde.
 *
 * ⚠️ Os elencos são os dos MANIFESTOS de verdade (`docs/aulas-interativas/*-v6`), lidos pelo
 * caminho, mais as BORDAS que o editor deixa montar (um papel só, a pedra com o Dino declarado).
 */

const DOCS = join(import.meta.dir, '../../../docs/aulas-interativas')

type Uso = { arquivo: string; activity: SceneActivity }

/** Todo bloco de cena com elenco nos manifestos v6. */
function usosComElenco(): Uso[] {
  const usos: Uso[] = []
  const visitar = (no: unknown, arquivo: string) => {
    if (Array.isArray(no)) for (const item of no) visitar(item, arquivo)
    else if (no && typeof no === 'object') {
      const registro = no as Record<string, unknown>
      if (typeof registro.scene === 'string' && registro.cast && typeof registro.type === 'string')
        usos.push({ arquivo, activity: registro as unknown as SceneActivity })
      for (const valor of Object.values(registro)) visitar(valor, arquivo)
    }
  }
  for (const arquivo of new Glob('*-v6/**/manifesto.json').scanSync(DOCS))
    visitar(JSON.parse(readFileSync(join(DOCS, arquivo), 'utf8')), arquivo)
  return usos
}

const USOS = usosComElenco()
/** Os elencos distintos dos manifestos. */
const ELENCOS_REAIS: SceneCast[] = [
  ...new Map(
    USOS.map((u) => [JSON.stringify(u.activity.cast), u.activity.cast as SceneCast]),
  ).values(),
]
/**
 * As bordas do review do lote 3: elenco que declara UM papel só (o Dino no espaço e o cacto entre
 * as estrelas saíam daqui), a pedra no caminho de um Dino DECLARADO (terra) e um elenco com as
 * figuras que nenhum curso usa em papel nenhum (o tiro de herói, a chama de obstáculo, a pedra de
 * cenário).
 */
const BORDAS: SceneCast[] = [
  { hero: { name: 'nave', gender: 'f' } },
  { obstacle: { name: 'asteroide', gender: 'm' } },
  { scenery: { name: 'chama', gender: 'f' } },
  { hero: { name: 'Dino', gender: 'm' }, obstacle: { name: 'pedra', gender: 'f' } },
  {
    hero: { name: 'Zé', gender: 'm', figure: 'tiro' },
    obstacle: { name: 'fogo', gender: 'm' },
    scenery: { name: 'rocha', gender: 'f' },
  },
]
const ELENCOS = [...ELENCOS_REAIS, ...BORDAS]

/** A abertura e o estado depois de cada parte do roteiro: é onde cada papel aparece. */
function estados(activity: SceneActivity): SceneState[] {
  const start: SceneStart = {
    scene: activity.scene,
    setup: activity.type === 'experimentation' ? activity.setup : undefined,
    initialImpulse: activity.type === 'experimentation' ? activity.initialImpulse : undefined,
  }
  let estado = openScene(start)
  const lista = [estado]
  for (const passo of sceneScript(activity)) {
    for (const acao of passo.actions) estado = stepScene(start, estado, acao)
    lista.push(estado)
  }
  return lista
}

/** O palco e a bancada (a ordem de desenhar do `layers` mostra as figuras nas peças). */
function desenhar(activity: SceneActivity, estado: SceneState) {
  return renderToStaticMarkup(
    <>
      <ExplorationStage activity={activity} state={estado} dispatch={() => {}} />
      <ExplorationPieces activity={activity} state={estado} dispatch={() => {}} more={false} />
    </>,
  )
}

const figuras = (html: string) =>
  new Set([...html.matchAll(/data-figure="([a-z]+)"/g)].map((m) => m[1] as SceneFigure))
const contar = (htmls: string[], re: RegExp) =>
  htmls.reduce((n, h) => n + (h.match(re)?.length ?? 0), 0)
/** Conta ocorrências de um TEXTO literal (as assinaturas de caminho têm ponto e sinal). */
const contarTexto = (htmls: string[], texto: string) =>
  htmls.reduce((n, h) => n + h.split(texto).length - 1, 0)

/**
 * Os traços do Corre Dino: contam os desenhados de verdade, com ou sem `data-figure`.
 *
 * ⚠️⚠️ DERIVADOS da arte, e não escritos à mão. Eram três `d="M-22 -8V-33…"` copiados dos SVGs
 * que moravam no `scene-figures.tsx`; quando o palco passou a desenhar pela arte do Jogo 2D, os
 * três pararam de casar com qualquer coisa e a metade mais importante deste conferente virou
 * VÁCUO — passava sempre, inclusive contra um palco que desenhasse o Dino cru. Agora a assinatura
 * é o primeiro `d` do desenho REAL de cada figura, renderizado isolado, então ela acompanha
 * qualquer mudança na arte sozinha.
 * ⚠️ Funciona porque o `ArteSvg` desenha em coordenadas LOCAIS: quem posiciona é o `translate` do
 * grupo de fora, então o markup interno é idêntico onde quer que a figura apareça.
 */
const assinaturaDaFigura = (figura: SceneFigure) => {
  const html = renderToStaticMarkup(<ActorFigure figure={figura} x={0} y={0} />)
  const d = html.match(/ d="([^"]{24,})"/)?.[1]
  if (!d) throw new Error(`a figura ${figura} não desenhou nenhum caminho`)
  // Texto puro, sem virar regex: um `d` de caminho tem ponto e sinal, que viram metacaractere.
  return d.slice(0, 40)
}
const TRACO = {
  dino: assinaturaDaFigura('dino'),
  cacto: assinaturaDaFigura('cacto'),
  floresta: assinaturaDaFigura('floresta'),
}
/**
 * A folhagem do Corre Dino. Num cenário sem chão, só com um cacto ou uma floresta desenhados.
 *
 * ⚠️ Eram as classes `fill-scene-leaf*`, que a arte do jogo não usa mais (as cores vêm dela). Hoje
 * é o verde das copas e do cacto, que é o que de fato denuncia mato no meio do espaço.
 */
const FOLHAGEM = /fill="#(?:74cf77|91dc7a|a8e88c|4f9f5c|5fb163|24a05a)"/g
const ORDEM: readonly SceneRole[] = ['hero', 'obstacle', 'scenery']
const PAPEL_DE_FABRICA: Partial<Record<SceneFigure, SceneRole>> = {
  dino: 'hero',
  cacto: 'obstacle',
  floresta: 'scenery',
}

/** Os papéis que o desenho mostra com o elenco de fábrica, na ordem canônica. */
const papeisDesenhados = (htmls: string[]) => {
  const desenhadas = new Set(htmls.flatMap((h) => [...figuras(h)]))
  return ORDEM.filter((p) => [...desenhadas].some((f) => PAPEL_DE_FABRICA[f] === p))
}

/**
 * O conferente: o que está errado no desenho de UMA cena com UM elenco, em todos os estados.
 * Função à parte para o último `describe` provar que ela reprova o que deve.
 */
function conferir(scene: SceneId, cast: SceneCast | undefined, htmls: string[]): string[] {
  const falhas: string[] = []
  const rotulo = `${scene} com ${JSON.stringify(cast ?? 'fábrica')}`
  const papeis = SCENE_ROLES[scene]
  const doElenco = new Set(papeis.map((p) => actorFigure(cast, p)))
  const desenhadas = new Set(htmls.flatMap((h) => [...figuras(h)]))
  if ([...desenhadas].sort().join() !== [...doElenco].sort().join())
    falhas.push(`${rotulo}: desenhou [${[...desenhadas]}], esperava [${[...doElenco]}]`)
  // O traço cru de uma figura do Corre Dino só existe quando algum papel DESENHADO é ela.
  const mundo = sceneCenario(cast, scene)
  for (const figura of ['dino', 'cacto', 'floresta'] as const) {
    const tracos = contarTexto(htmls, TRACO[figura])
    // ⚠️ A árvore da PAISAGEM (a tela do jogo na `world`) não é papel: na terra ela pode.
    const paisagem = figura === 'floresta' && mundo === 'corre-dino'
    if (tracos > 0 && !doElenco.has(figura) && !paisagem)
      falhas.push(`${rotulo}: desenhou o traço de ${figura} ${tracos}×`)
  }
  // Palco que desenha papel vai para o mundo da cena; palco abstrato fica no papel.
  if (papeis.length > 0) {
    if (!htmls.every((h) => h.includes(`data-mundo="${mundo}"`)))
      falhas.push(`${rotulo}: a moldura não está no mundo ${mundo}`)
    // ⚠️⚠️ A régua MUDOU quando o fundo virou a arte do jogo: era "só o espaço pinta o céu, e a
    // terra é um retângulo que cada palco desenha". Hoje TODO cenário tem o mundo dele desenhado,
    // e o que o conferente cobra é que seja o mundo CERTO — um palco que pintasse a floresta numa
    // turma de nave é exatamente o defeito que esta varredura existe para pegar.
    const comFundo = htmls.filter((h) => h.includes(`data-fundo="${mundo}"`)).length
    if (comFundo < htmls.length) falhas.push(`${rotulo}: o palco não pintou o mundo de ${mundo}`)
    const outro = htmls.some((h) =>
      [...h.matchAll(/data-fundo="([a-z-]+)"/g)].some((m) => m[1] !== mundo),
    )
    if (outro) falhas.push(`${rotulo}: o palco pintou o mundo de OUTRO cenário`)
    const folhas = contar(htmls, FOLHAGEM)
    if (!cenarioTemChao(mundo) && folhas > 0 && !doElenco.has('cacto') && !doElenco.has('floresta'))
      falhas.push(`${rotulo}: a folhagem da terra apareceu no espaço ${folhas}×`)
  } else if (htmls.some((h) => h.includes('data-mundo=') || h.includes('data-fundo=')))
    falhas.push(`${rotulo}: palco sem papel do elenco mudou de mundo`)
  return falhas
}

const estadosPorCena = new Map<SceneId, SceneState[]>(
  SCENE_IDS.map((scene) => [scene, estados({ type: 'demonstration', scene })]),
)
const htmlsDe = (scene: SceneId, cast?: SceneCast) =>
  (estadosPorCena.get(scene) ?? []).map((e) =>
    desenhar({ type: 'experimentation', scene, cast }, e),
  )

describe('o desenho veste o elenco', () => {
  test('a varredura mede alguma coisa', () => {
    // Anti-vácuo: sem manifestos lidos, ou sem nenhum palco com papel, tudo passaria calado.
    expect(USOS.length).toBeGreaterThanOrEqual(10)
    expect(ELENCOS_REAIS.length).toBeGreaterThanOrEqual(5)
    for (const u of USOS)
      expect({ arquivo: u.arquivo, ok: isSceneCast(u.activity.cast) }).toEqual({
        arquivo: u.arquivo,
        ok: true,
      })
    for (const cast of BORDAS) expect(isSceneCast(cast)).toBe(true)
    // ⚠️ Mudou de propósito (lote 5 do Raio-X), a mesma conta do `cast.test.ts` do core: a
    // `entity-state` desenha torres (G6); `frames`, `onion-skin` e `sheet-vs-sprite` desenham a nave
    // do ateliê (G4); a `diagonal` e a `tilemap` ganharam o personagem (G5).
    expect(SCENE_IDS.filter((s) => SCENE_ROLES[s].length > 0).length).toBe(31)
  })

  test('⚠️⚠️ a tabela SCENE_ROLES é EXATAMENTE o que cada palco desenha', () => {
    // Papel a menos (o traço cru no lugar da figura) ou papel a mais (um palco novo que passou a
    // desenhar o cenário sem entrar na tabela, e aí o mundo não o enxerga) reprovam aqui.
    const falhas: string[] = []
    for (const scene of SCENE_IDS) {
      const desenhados = papeisDesenhados(htmlsDe(scene))
      if (desenhados.join() !== SCENE_ROLES[scene].join())
        falhas.push(`${scene}: desenha [${desenhados}], a tabela diz [${SCENE_ROLES[scene]}]`)
    }
    expect(falhas).toEqual([])
  })

  test('⚠️ sem elenco (e com o de fábrica) só o Corre Dino aparece, na terra', () => {
    const falhas: string[] = []
    for (const scene of SCENE_IDS)
      for (const cast of [undefined, DEFAULT_CAST])
        falhas.push(...conferir(scene, cast, htmlsDe(scene, cast)))
    expect(falhas).toEqual([])
  })

  test('⚠️⚠️ as 45 cenas × os elencos dos manifestos e as bordas: cada papel com a SUA figura, no mundo certo', () => {
    const falhas: string[] = []
    let medidos = 0
    for (const scene of SCENE_IDS)
      for (const cast of ELENCOS) {
        falhas.push(...conferir(scene, cast, htmlsDe(scene, cast)))
        medidos++
      }
    expect(falhas).toEqual([])
    expect(medidos).toBe(SCENE_IDS.length * ELENCOS.length)
  })

  test('⚠️⚠️ e os usos REAIS, como estão nos manifestos (com o caso e o roteiro deles)', () => {
    const falhas: string[] = []
    for (const { arquivo, activity } of USOS) {
      const htmls = estados(activity).map((e) => desenhar(activity, e))
      for (const f of conferir(activity.scene, activity.cast, htmls)) falhas.push(`${arquivo} ${f}`)
    }
    expect(falhas).toEqual([])
    // O que a proposta viu nos cursos: a nave no espaço, e a pedra com a chama também. E, desde o
    // lote 5 do Raio-X, o cacto na terra: a `velocity` das Aulas 5 e 12 do Corre Dino veste o cacto.
    // ⚠️ A pedra com a chama é O Jogo do Meu Jeito desde o registro de cenários: os dois cursos do
    // espaço deixaram de ser o mesmo "espaco" e cada um tem o seu elenco.
    const mundos = new Set(USOS.map((u) => sceneCenario(u.activity.cast, u.activity.scene)))
    expect([...mundos].sort()).toEqual(['corre-dino', 'meu-jeito', 'nave'])
  })
})

describe('o conferente REPROVA os esquecimentos que o review mostrou', () => {
  const NAVE: SceneCast = {
    hero: { name: 'nave', gender: 'f' },
    obstacle: { name: 'asteroide', gender: 'm' },
  }

  test('o obstáculo desenhado com o traço cru do cacto, sem a figura', () => {
    const htmls = htmlsDe('lives', NAVE).map(
      (h) => `${h.replace(/<g data-figure="asteroide"/g, '<g')}<path d="${TRACO.cacto}"/>`,
    )
    const falhas = conferir('lives', NAVE, htmls)
    expect(falhas.some((f) => f.includes('esperava'))).toBe(true)
    expect(falhas.some((f) => f.includes('traço de cacto'))).toBe(true)
  })

  test('o papel que some da descoberta não passa por cena abstrata', () => {
    const semObstaculo = htmlsDe('spawn').map((h) => h.replace(/data-figure="cacto"/g, ''))
    expect(papeisDesenhados(semObstaculo)).not.toEqual([...SCENE_ROLES.spawn])
  })

  test('a moldura no espaço sem o céu, e a grama e a árvore da terra dentro dela', () => {
    // ⚠️ Mudou de propósito (lote 5 do Raio-X, G4): era a `frames`, que desenha a nave 32 × 32 do
    // ateliê e não tem mais papel do elenco (nunca vai ao espaço). A `lives` desenha a nave no céu.
    const htmls = htmlsDe('lives', NAVE).map((h) =>
      h
        .replace(/data-fundo="[a-z-]+"/g, '')
        .replace('</svg>', `<path fill="#74cf77" d="${TRACO.floresta}"/></svg>`),
    )
    const falhas = conferir('lives', NAVE, htmls)
    expect(falhas.some((f) => f.includes('não pintou o mundo'))).toBe(true)
    expect(falhas.some((f) => f.includes('folhagem da terra'))).toBe(true)
    expect(falhas.some((f) => f.includes('traço de floresta'))).toBe(true)
  })

  test('o Dino cru no espaço, e o mundo errado na moldura', () => {
    const htmls = htmlsDe('draw-loop', NAVE).map((h) =>
      h
        .replace('data-mundo="nave"', 'data-mundo="corre-dino"')
        // ⚠️ O traço injetado é a assinatura VIVA do Dino: com um path fixo escrito à mão, esta
        // sabotagem deixaria de sabotar no dia em que a arte mudasse — que foi o que aconteceu.
        .replace('</svg>', `<path d="${TRACO.dino}"/></svg>`),
    )
    const falhas = conferir('draw-loop', NAVE, htmls)
    expect(falhas.some((f) => f.includes('traço de dino'))).toBe(true)
    expect(falhas.some((f) => f.includes('não está no mundo nave'))).toBe(true)
  })
})
