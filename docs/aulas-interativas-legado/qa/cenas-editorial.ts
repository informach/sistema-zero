import {
  blockCheckpoint,
  blockPrediction,
  type InteractiveBlock,
  type LearningManifest,
  type LearningPrediction,
  learningHints,
} from '../../../packages/core/src/learning'
import {
  castText,
  DEFAULT_CAST,
  openScene,
  SCENE_IDS,
  SCENE_ROLES,
  type SceneActivity,
  type SceneCast,
  type SceneCenarioId,
  type SceneId,
  type SceneRole,
  sceneGoalIds,
  sceneGoals,
  sceneHintsFor,
  sceneModelFor,
  sceneScript,
  sceneSituation,
  sceneStart,
  sceneSuccess,
  sceneTargets,
} from '../../../packages/core/src/learning/scene'

/**
 * As cenas nativas das aulas, como DADO da receita.
 *
 * Desde 15/09/2026 os manifestos ganharam cenas (experimentação e demonstração) editadas à mão, e o
 * redesenho das 45 cenas mudou instruções, pistas, previsões, casos e roteiros. A receita guarda o bloco
 * de cena como ele vai ao manifesto, e o editorial de cada curso só o encaixa na seção. O roteiro
 * descreve a cena lendo o core (metas, pedidos, pistas e roteiro de fábrica), para ficar em dia sozinho.
 *
 * ⚠️ O objeto `bloco` está na ORDEM das chaves do manifesto publicado: o gerador precisa reproduzir o
 * arquivo byte a byte, e a ordem varia entre blocos editados em momentos diferentes.
 * ⚠️ O que o core já dá de fábrica não se copia para a receita: `PISTAS_DE_FABRICA` e
 * `PREVISAO_DE_FABRICA` marcam os blocos cujo manifesto guarda uma cópia do texto do modelo.
 */
export const PISTAS_DE_FABRICA = 'pistas-de-fabrica' as const
export const PREVISAO_DE_FABRICA = 'previsao-de-fabrica' as const

type BlocoDeCena = Omit<InteractiveBlock, 'kind' | 'hints' | 'prediction' | 'activity'> & {
  activity: SceneActivity
  hints: string[] | typeof PISTAS_DE_FABRICA
  prediction?: LearningPrediction | typeof PREVISAO_DE_FABRICA
}

export interface CenaDaAula {
  /** A chave do bloco no manifesto. */
  chave: string
  /** O bloco sem `kind`, na ordem das chaves do manifesto. */
  bloco: BlocoDeCena
  /**
   * O bloco entrou na lista DEPOIS dos blocos da aula (fim do manifesto), embora a seção o mostre logo
   * depois do vídeo. Só a posição na lista muda; a seção continua a mesma.
   */
  noFimDaLista?: true
}

export const ACOES_DA_CENA_ANTERIOR = ['regravar', 'cortar', 'conferir'] as const
/** Um clipe planejado que mostra ou descreve a experiência num estado que não existe mais. */
export interface CenaAnterior {
  cena: SceneId
  oQueMudou: string
  acao: (typeof ACOES_DA_CENA_ANTERIOR)[number]
}

/**
 * O CENÁRIO que cada curso retrata — o jogo que a criança está montando nele.
 *
 * ⭐⭐ É o que o editorial injeta em toda cena do curso, e é a peça que faltava para a cena "ficar
 * igual ao jogo". Sem ele, o cenário era DERIVADO do elenco de cada bloco, e o levantamento dos 27
 * manifestos mostrou onde isso erra: a `velocity` do Desafio, cujo elenco é uma "pedra", caía no
 * Jogo do Meu Jeito. O elenco diz QUEM está no palco; o curso diz QUE JOGO é.
 *
 * ⚠️ Declarar não tira nada do elenco: as FIGURAS continuam vindo dele (uma nave declarada numa
 * cena do Meu Jeito continua sendo desenhada como nave). O cenário decide o MUNDO.
 */
export const CENARIO_DO_CURSO: Record<string, SceneCenarioId> = {
  'corre-dino': 'corre-dino',
  'desafio-primeiro-jogo': 'nave',
  'o-jogo-do-meu-jeito': 'meu-jeito',
}

/**
 * O conteúdo do bloco, com as marcas de fábrica trocadas pelo texto do core.
 *
 * ⚠️⚠️ O `cenario` entra logo DEPOIS do `cast`, e a posição é contrato: o gerador reproduz o
 * manifesto byte a byte, e a ordem das chaves faz parte do arquivo. É a mesma posição que o campo
 * ocupa no tipo `SceneActivity`.
 */
export function conteudoDaCena(cena: CenaDaAula, cenario?: SceneCenarioId): InteractiveBlock {
  const { activity } = cena.bloco
  const conteudo: Record<string, unknown> = { kind: 'interactive' }
  for (const [campo, valor] of Object.entries(cena.bloco)) {
    if (valor === PISTAS_DE_FABRICA)
      conteudo[campo] = sceneHintsFor(activity).map((pista) => castText(pista, activity.cast))
    else if (valor === PREVISAO_DE_FABRICA) {
      const { prediction: _marca, ...semPrevisao } = cena.bloco
      const previsao = blockPrediction({
        ...semPrevisao,
        kind: 'interactive',
        hints: [],
      } as InteractiveBlock)
      if (!previsao) throw new Error(`${cena.chave}: a cena não tem previsão de fábrica`)
      conteudo[campo] = previsao
    } else if (campo === 'activity' && cenario) conteudo[campo] = comCenario(activity, cenario)
    else conteudo[campo] = structuredClone(valor)
  }
  return conteudo as unknown as InteractiveBlock
}

/** A atividade com o `cenario` na posição dele: logo depois do `cast`, senão depois do `scene`. */
function comCenario(activity: SceneActivity, cenario: SceneCenarioId) {
  const saida: Record<string, unknown> = {}
  let posto = false
  for (const [campo, valor] of Object.entries(structuredClone(activity))) {
    saida[campo] = valor
    if (campo === 'cast') {
      saida.cenario = cenario
      posto = true
    }
  }
  if (posto) return saida
  // Sem elenco declarado, o cenário entra logo depois da cena: é o par que descreve o palco.
  const semCast: Record<string, unknown> = {}
  for (const [campo, valor] of Object.entries(saida)) {
    semCast[campo] = valor
    if (campo === 'scene') semCast.cenario = cenario
  }
  return semCast
}

export function blocoDaCena(
  cena: CenaDaAula,
  cenario?: SceneCenarioId,
): LearningManifest['blocks'][number] {
  return { key: cena.chave, content: conteudoDaCena(cena, cenario) }
}

/** A seção de um vídeo seguido de cena: a cena de experimentar faz dela uma seção de experimentação. */
export function intencaoDaCena(cena: CenaDaAula): 'exploration' | 'demonstration' {
  return cena.bloco.activity.type === 'experimentation' ? 'exploration' : 'demonstration'
}

export function eCena(
  block: LearningManifest['blocks'][number],
): block is { key: string; content: InteractiveBlock & { activity: SceneActivity } } {
  return (
    'content' in block &&
    block.content.kind === 'interactive' &&
    (block.content.activity.type === 'experimentation' ||
      block.content.activity.type === 'demonstration')
  )
}

const PAPEIS: Record<SceneRole, string> = {
  hero: 'personagem',
  obstacle: 'obstáculo',
  scenery: 'cenário',
}
const lista = (itens: readonly string[]) =>
  itens.length > 1 ? `${itens.slice(0, -1).join(', ')} e ${itens.at(-1)}` : (itens[0] ?? '')

function elenco(scene: SceneId, cast?: SceneCast): string {
  const papeis = SCENE_ROLES[scene]
  if (!papeis.length) return 'esta cena não desenha personagem do elenco.'
  return `${lista(
    papeis.map((papel) => {
      const ator = cast?.[papel]
      return `${PAPEIS[papel]}: ${ator ? ator.name : `${DEFAULT_CAST[papel].name} (o de fábrica)`}`
    }),
  )}.`
}

function formato(atividade: SceneActivity): string {
  if (atividade.type === 'experimentation') return 'experimentação (a criança mexe e descobre)'
  return atividade.presentation === 'inline'
    ? 'demonstração no meio do texto (um botão Ver acontecer, que toca as partes de uma vez)'
    : 'demonstração guiada (uma parte de cada vez, no ritmo da criança)'
}

function previsaoMarkdown(bloco: InteractiveBlock, rotulo: (meta: string) => string): string[] {
  const atividade = bloco.activity as SceneActivity
  const previsao = blockPrediction(bloco)
  if (!previsao)
    return [
      atividade.type === 'demonstration' && atividade.presentation === 'inline'
        ? '**Previsão:** nenhuma. A demonstração no meio do texto não trava o palco com uma pergunta.'
        : '**Previsão:** nenhuma.',
      '',
    ]
  return [
    `**Antes de escolher:** “${previsao.context.explanation}”`,
    '',
    `**Hoje vamos usar:** ${previsao.context.label}.`,
    '',
    `**Seu palpite, antes de abrir a cena (${bloco.prediction ? 'escrito na aula' : 'o de fábrica da cena'}; não vale nota):** “${previsao.prompt}”`,
    '',
    ...previsao.choices.map((escolha) =>
      escolha.id === previsao.correctChoiceId
        ? `- ${escolha.label} ✓ (o que acontece de verdade)`
        : `- ${escolha.label}${escolha.shows ? ` (se ela escolher esta, a tela conta depois: “${escolha.shows}”)` : ''}`,
    ),
    '',
    ...(previsao.revealOn
      ? [`O palpite volta à tela quando ela descobre: “${rotulo(previsao.revealOn)}”.`, '']
      : []),
  ]
}

/**
 * O que a professora e o editor precisam saber de uma cena, com os textos de hoje: a cena e o elenco, o
 * que a criança lê ao abrir, a previsão, o que ela precisa descobrir (pedido e rótulo das metas), as
 * pistas, o caso, a pergunta final e, na demonstração, as partes e o fim.
 */
export function cenaMarkdown(bloco: InteractiveBlock): string[] {
  const atividade = bloco.activity as SceneActivity
  const { scene, cast } = atividade
  const modelo = sceneModelFor(atividade)
  const inicio = openScene(sceneStart(atividade))
  const rotulo = (meta: string) =>
    castText(modelo.goals.find((goal) => goal.id === meta)?.label ?? meta, cast)
  const linhas = [
    `**Cena:** \`${scene}\`, “${modelo.title}”. Formato: ${formato(atividade)}. Fica separada da criação da criança: nada do que ela faz aqui muda o projeto ou o desenho.`,
    '',
    `**Elenco:** ${elenco(scene, cast)}`,
    '',
    `**O que a criança lê ao abrir:** “${bloco.instructions}”`,
    '',
    `**Como o palco começa:** ${sceneSituation(scene, inicio, cast)}`,
    '',
  ]
  const setup = atividade.setup
  if (setup) {
    const partes = []
    if (setup.actions?.length)
      partes.push(
        `a cena não parte do começo de fábrica: ${setup.actions.length === 1 ? 'uma ação prepara' : `${setup.actions.length} ações preparam`} o palco antes de a criança entrar, e a frase acima já mostra o resultado`,
      )
    if (atividade.type === 'experimentation' && setup.goals?.length)
      partes.push(
        `a missão cobra só ${setup.goals.length === 1 ? 'esta descoberta' : 'estas descobertas'}: ${lista(setup.goals.map((meta) => `“${rotulo(meta)}”`))}`,
      )
    linhas.push(`**Caso preparado na aula:** ${partes.join('; ')}.`, '')
  }
  if (atividade.type === 'demonstration' && atividade.pilha === 'camadas')
    linhas.push('**Lista:** a das Camadas do Pinta, com a forma da frente em cima.', '')
  if (atividade.type === 'experimentation' && atividade.pilha === 'camadas')
    linhas.push(
      '**Lista:** a do painel Camadas do Pinta, com a forma da frente em cima. Os pedidos e as pistas falam em “uma camada para trás” e “uma camada para a frente”, como os botões do Pinta.',
      '',
    )
  linhas.push(...previsaoMarkdown(bloco, rotulo))
  if (atividade.type === 'demonstration') {
    const roteiro = sceneScript(atividade)
    linhas.push(
      `**Partes da demonstração (${atividade.script ? 'roteiro escrito na aula' : 'o roteiro de fábrica da cena'}):**`,
      '',
      ...roteiro.map(
        (parte, i) =>
          `${i + 1}. “${parte.caption}”${parte.waitFor ? ` A parte espera acontecer: “${rotulo(parte.waitFor)}”.` : ''}`,
      ),
      '',
      atividade.presentation === 'inline'
        ? '**No fim:** um ✓ pequeno ao lado do botão, que vira Ver de novo. Este formato não tem “Agora é sua vez”. A seção conclui quando a demonstração é vista até o fim.'
        : '**No fim:** aparece “✓ Você viu tudo!” e o botão “Agora é sua vez”, que abre a bancada da cena a partir de onde a demonstração parou. É um rascunho local: o que a criança mexe ali não é guardado e não conta nota. A seção conclui quando a demonstração é vista até o fim.',
      '',
    )
    return linhas
  }
  const metas = sceneGoals(scene, inicio, cast, sceneTargets(atividade), atividade.pilha)
  linhas.push(
    '**O que ela precisa descobrir** (a faixa e o botão Conferir mostram o pedido; o rótulo só aparece quando a descoberta acontece):',
    '',
    ...metas.map((meta, i) => `${i + 1}. Pedido: “${meta.pedido}” Ao descobrir: “${meta.label}”.`),
    '',
    `**Frase de sucesso:** “${sceneSuccess(scene, cast, setup?.goals)}”`,
    '',
  )
  const pistas = learningHints(bloco)
  const deFabrica = sceneHintsFor(atividade).map((pista) => castText(pista, cast))
  const origemDasPistas = !bloco.hints.length
    ? 'as de fábrica da cena'
    : JSON.stringify(bloco.hints) === JSON.stringify(deFabrica)
      ? 'guardadas no bloco, iguais às de fábrica'
      : 'escritas na aula'
  const restrita =
    bloco.hints.length === 0 &&
    setup?.goals?.length &&
    setup.goals.join('+') !== sceneTargets({ ...atividade, setup: undefined }).join('+')
  linhas.push(
    `**Pistas (uma por vez, no botão Uma pista; ${origemDasPistas}):**`,
    '',
    ...(restrita
      ? [
          '- Sem pistas escritas e com a missão restrita pelo caso, a tela mostra um degrau só, tirado do pedido da descoberta que falta.',
        ]
      : pistas.map((pista, i) => `${i + 1}. “${pista}”`)),
    '',
  )
  const pergunta = blockCheckpoint(bloco)
  if (pergunta)
    linhas.push(
      `**Pergunta depois de descobrir (${bloco.checkpoint ? 'escrita na aula' : 'a de fábrica da cena'}; conta para concluir):** “${pergunta.prompt}”`,
      '',
      ...pergunta.choices.map(
        (escolha) =>
          `- ${escolha.label}${escolha.id === pergunta.correctChoiceId ? ' ✓ (correta)' : ''}`,
      ),
      '',
      `**Explicação que ela lê ao acertar:** “${pergunta.explanation}”`,
      '',
    )
  // ⚠️ A aula pode dispensar a pergunta do fim (`semPerguntaFinal`). O roteiro precisa DIZER isso, e
  // a linha de tela muda junto: sem pergunta, a frase de sucesso aparece na hora e quem conclui o
  // bloco é a descoberta.
  else if (bloco.semPerguntaFinal)
    linhas.push(
      '**Pergunta depois de descobrir:** nenhuma. Esta aula dispensou a pergunta do fim, e a descoberta é que conclui o bloco.',
      '',
    )
  linhas.push(
    pergunta
      ? '**Na tela da cena:** Conferir responde com o pedido da descoberta que falta. Quando tudo cai, aparece “✓ Você descobriu!” e a pergunta. Na revisita, a faixa mostra “✓ Você já descobriu isto.”, sem pedir a pergunta de novo.'
      : '**Na tela da cena:** Conferir responde com o pedido da descoberta que falta. Quando tudo cai, aparece “✓ Você descobriu!” e, logo embaixo, a frase de sucesso. Na revisita, a faixa mostra “✓ Você já descobriu isto.”.',
    '',
  )
  return linhas
}

export const cenaAnteriorMarkdown = (marca: CenaAnterior) =>
  `**⚠️ Mostra a cena anterior:** ${marca.oQueMudou} Ação: ${marca.acao}.`

/** Pendura a marca em cada clipe citado pela receita. Chave que não é clipe da aula é erro de autoria. */
export function marcarCenasAnteriores<T extends { key: string }>(
  aula: string,
  clips: T[],
  marcas: Record<string, CenaAnterior> | undefined,
): Array<T & { cenaAnterior?: CenaAnterior }> {
  for (const chave of Object.keys(marcas ?? {}))
    if (!clips.some((clip) => clip.key === chave))
      throw new Error(`${aula}: cenaAnterior aponta um clipe que não existe (${chave})`)
  return clips.map((clip) =>
    marcas?.[clip.key] ? Object.assign(clip, { cenaAnterior: marcas[clip.key] }) : clip,
  )
}

/** O resumo das cenas para a montagem: que cena vem depois de que clipe, em cada seção. */
export function cenasDaMontagem(manifest: LearningManifest) {
  return manifest.sections.flatMap((section) =>
    section.blockKeys.flatMap((chave) => {
      const block = manifest.blocks.find((b) => b.key === chave)
      if (!block || !eCena(block)) return []
      const { activity } = block.content
      return [
        {
          secao: section.key,
          bloco: chave,
          cena: activity.scene,
          atividade: activity.type,
          ...(activity.type === 'demonstration' && activity.presentation
            ? { apresentacao: activity.presentation }
            : {}),
          clipesAntes: section.blockKeys
            .slice(0, section.blockKeys.indexOf(chave))
            .filter((k) => manifest.blocks.some((b) => b.key === k && 'plannedVideo' in b)),
        },
      ]
    }),
  )
}

/** O que o roteiro precisa citar de cada cena: instrução, previsão, pedidos das metas e partes. */
export function trechosObrigatoriosDaCena(bloco: InteractiveBlock): string[] {
  const atividade = bloco.activity as SceneActivity
  const trechos = [bloco.instructions]
  const previsao = blockPrediction(bloco)
  if (previsao)
    trechos.push(
      previsao.context.label,
      previsao.context.explanation,
      previsao.prompt,
      ...previsao.choices.map((c) => c.label),
    )
  if (atividade.type === 'demonstration')
    trechos.push(...sceneScript(atividade).map((parte) => parte.caption))
  else {
    const inicio = openScene(sceneStart(atividade))
    for (const meta of sceneGoals(
      atividade.scene,
      inicio,
      atividade.cast,
      sceneTargets(atividade),
      atividade.pilha,
    ))
      trechos.push(meta.pedido ?? '', meta.label)
  }
  return trechos.filter(Boolean)
}

/**
 * Conferência comum dos três validadores: toda cena do manifesto aparece no roteiro com os textos de
 * hoje, e toda marca de cena anterior é legal, aponta um clipe da montagem e uma cena da aula, e aparece
 * no roteiro junto do clipe.
 */
export function conferirCenasNoRoteiro(
  aula: string,
  manifest: LearningManifest,
  montage: { clips: Array<{ key: string; cenaAnterior?: CenaAnterior }> },
  roteiro: string,
  marcasDaReceita: Record<string, CenaAnterior> | undefined,
): string[] {
  const problemas: string[] = []
  const cenas = manifest.blocks.filter(eCena)
  for (const block of cenas)
    for (const trecho of trechosObrigatoriosDaCena(block.content))
      if (!roteiro.includes(trecho))
        problemas.push(`${aula}/${block.key}: o roteiro não cita “${trecho}”`)
  const cenasDaAula = new Set(cenas.map((b) => b.content.activity.scene))
  for (const chave of Object.keys(marcasDaReceita ?? {}))
    if (!montage.clips.some((clip) => clip.key === chave && clip.cenaAnterior))
      problemas.push(`${aula}: a marca de ${chave} não chegou a um clipe da montagem`)
  for (const clip of montage.clips) {
    const marca = clip.cenaAnterior
    if (!marca) continue
    if (!SCENE_IDS.includes(marca.cena))
      problemas.push(`${aula}/${clip.key}: cena desconhecida ${marca.cena}`)
    if (!cenasDaAula.has(marca.cena))
      problemas.push(`${aula}/${clip.key}: ${marca.cena} não é cena desta aula`)
    if (!ACOES_DA_CENA_ANTERIOR.includes(marca.acao))
      problemas.push(`${aula}/${clip.key}: ação ${marca.acao}`)
    if (!marca.oQueMudou.trim()) problemas.push(`${aula}/${clip.key}: oQueMudou vazio`)
    if (!roteiro.includes(cenaAnteriorMarkdown(marca)))
      problemas.push(`${aula}/${clip.key}: a marca não aparece no roteiro`)
    if (JSON.stringify(marcasDaReceita?.[clip.key]) !== JSON.stringify(marca))
      problemas.push(`${aula}/${clip.key}: a marca não nasce da receita`)
  }
  // As metas citadas pelo caso existem na cena (a leitura tolerante do core não pode esconder um erro).
  for (const block of cenas) {
    const { activity } = block.content
    if (activity.type !== 'experimentation') continue
    for (const meta of activity.setup?.goals ?? [])
      if (!sceneGoalIds(activity.scene).includes(meta))
        problemas.push(`${aula}/${block.key}: meta ${meta} fora da cena ${activity.scene}`)
  }
  return problemas
}
