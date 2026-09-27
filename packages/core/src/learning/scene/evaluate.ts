import type { LearningResult } from '../index'
import type { SceneId, SceneSetup } from './actions'
import { castText, type SceneCast } from './cast'
import { sceneModel } from './catalog'
import { emCamadas, LAYERS_CAMADAS, type ScenePilha } from './pilha'
import { PISTA_DA_META, type PistaMeta, pistaCumprida } from './pistas'
import { sceneSituation } from './readout'
import { type SceneState, sceneAreaPercent } from './state'

/**
 * O que a criança descobriu, e se isso fecha a cena.
 *
 * A regra é a mesma para demonstração e experimentação no que diz respeito ao mundo — o que
 * muda é o que conta como pronto: assistir ao roteiro inteiro, ou alcançar as metas.
 */

export interface SceneGoalProgress {
  id: string
  label: string
  /** O gesto que faz a meta cair, quando o rótulo entregaria o resultado (ver `SceneGoal`). */
  pedido?: string
  complete: boolean
}

export function sceneGoals(
  scene: SceneId,
  state: SceneState,
  /** Quem está no palco. Sem elenco, o texto do catálogo vale como está. */
  cast?: SceneCast,
  /** As metas que ESTA atividade cobra (o `setup.goals`). Sem lista, todas as do modelo. */
  targets?: readonly string[],
  /** Como a pilha da `layers` se apresenta (`pilha.ts`): os pedidos falam da lista que a criança vê. */
  pilha?: ScenePilha,
  /** Texto curto ajustado à aula, sem mudar a evidência que a meta exige. */
  goalCopy?: SceneSetup['goalCopy'],
): SceneGoalProgress[] {
  return sceneModel(scene)
    .goals.filter((g) => (targets?.length ? targets.includes(g.id) : !g.soNoCaso))
    .map((g) => {
      const pedido = goalCopy?.[g.id]?.pedido || pedidoDaMeta(scene, g.id, pilha) || g.pedido
      return {
        id: g.id,
        label: castText(goalCopy?.[g.id]?.label || g.label, cast),
        ...(pedido ? { pedido: castText(pedido, cast) } : {}),
        complete: state.evidence.discoveries.includes(g.id),
      }
    })
}

/**
 * O pedido de uma meta (cru, sem o elenco): o do catálogo, ou o do painel Camadas quando a `layers`
 * se apresenta assim (full review de experiência, A1). Meta desconhecida devolve `''`.
 */
function pedidoDaMeta(scene: SceneId, meta: string, pilha?: ScenePilha): string {
  if (emCamadas(scene, pilha) && LAYERS_CAMADAS.pedidos[meta]) return LAYERS_CAMADAS.pedidos[meta]
  return sceneModel(scene).goals.find((g) => g.id === meta)?.pedido ?? ''
}

/**
 * A cena que pede que a montagem FIQUE no estado descoberto, não só que ele tenha passado: em
 * `jump-sound`, o fio do som no acontecimento. Descobrir e depois desfazer não fecha essa.
 *
 * ⚠️ A `layers` saiu daqui (full review de experiência, M4): a arrumação final virou a meta
 * `back-in-front`, que aparece na faixa e tem pedido e pista. Condição escondida fazia a faixa dizer
 * "Descobertas 2 de 2" sobre uma cena que não concluía.
 */
function settled(scene: SceneId, state: SceneState, targets?: readonly string[]): boolean {
  // ⚠️ A exigência de FICAR no estado descoberto acompanha a meta: uma atividade que não cobra
  // o som no pulo não pode travar a criança porque a montagem ficou no outro arranjo.
  if (scene === 'jump-sound')
    return !cobra(targets, 'key-sound', 'tap-sound', 'every-jump') || state.sound.onJump
  return true
}

/**
 * O que falta quando as metas caíram e a montagem NÃO ficou no arranjo do jogo (lote 5 do Raio-X).
 *
 * ⚠️ Era "Deixe a montagem com a descoberta que você fez.", que não diz qual.
 */
function pedidoDoArranjo(scene: SceneId, cast?: SceneCast): string {
  // ⚠️ "Leve… de volta" (consertos do review da onda A do lote 5): o "Conferir" do player responde com
  // esta frase ("Ainda não. Tente: leve Tocar efeito de volta…"), e antes ele não dizia nada com as metas
  // feitas e a montagem desfeita.
  if (scene === 'jump-sound')
    return castText('Leve Tocar efeito de volta para Quando o Dino pular, como fica no jogo.', cast)
  return 'Deixe a montagem com a descoberta que você fez.'
}
const cobra = (targets: readonly string[] | undefined, ...goals: string[]) =>
  !targets?.length || goals.some((g) => targets.includes(g))

/**
 * A frase de SUCESSO desta atividade (consertos do review da onda A do lote 5): a da missão restrita,
 * quando o modelo tem uma para essa lista de metas (`successNoCaso`), senão a de sempre. Vestida pelo
 * elenco. ⚠️ O player e o avaliador leem esta função: são a mesma frase no cartão e no retorno.
 */
export function sceneSuccess(
  scene: SceneId,
  cast?: SceneCast,
  targets?: readonly string[],
): string {
  const modelo = sceneModel(scene)
  const chave = targets?.length ? [...targets].sort().join('+') : ''
  return castText((chave && modelo.successNoCaso?.[chave]) || modelo.success, cast)
}

/** A criança mexeu e descobriu. */
export function evaluateExperimentation(
  scene: SceneId,
  state: SceneState,
  valid = true,
  cast?: SceneCast,
  /** As metas desta atividade. Sem lista, as do modelo. */
  targets?: readonly string[],
  /** Como a pilha da `layers` se apresenta: o "Ainda falta" diz o gesto da lista que ela vê. */
  pilha?: ScenePilha,
  goalCopy?: SceneSetup['goalCopy'],
): LearningResult {
  const cobradas = sceneGoals(scene, state, cast, targets, pilha, goalCopy)
  const missing = cobradas.find((g) => !g.complete)
  const ready = settled(scene, state, targets)
  // ⚠️⚠️ Missão VAZIA reprova. O filtro por `targets` cruza a lista do caso com as metas do
  // modelo, e uma meta renomeada no catálogo esvaziaria a lista de todo manifesto que a cita —
  // transformando a atividade em algo que passa com evidência ZERO, em silêncio.
  const temMissao = cobradas.length > 0
  return {
    participated: valid && state.evidence.actions > 0,
    passed: valid && temMissao && missing === undefined && ready,
    feedback: !valid
      ? 'Esta descoberta mudou. Recomece a experiência; seu projeto está guardado.'
      : !temMissao
        ? 'Esta atividade está sem descobertas para cobrar. Avise quem montou a aula.'
        : // ⚠️ O PEDIDO antes do rótulo: o "Ainda falta" não pode contar o resultado do gesto que
          // ela ainda não fez ("Velocidade negativa levou para cima" é a resposta do palpite).
          ((missing ? (missing.pedido ?? missing.label) : undefined) ??
          (!ready
            ? pedidoDoArranjo(scene, cast)
            : // ⚠️ Vestida pelo elenco, como as metas logo acima: crua, uma turma de nave lia no
              // cartão de sucesso "É o mesmo Dino", com a pergunta e a faixa falando da nave.
              sceneSuccess(scene, cast, targets))),
    verifiedBy: 'client',
    evidence: 'exploration',
  }
}

/**
 * Um degrau da escada: o texto e as metas a que ele serve (`PISTA_DA_META`). O player CONGELA o degrau
 * no clique e, quando ele fica cumprido, troca a caixa por "✓ Feito!" (full review de experiência, M1).
 * `metas` vazio = o degrau não sabe a que meta serve, e nunca vira "Feito".
 */
export interface SceneHintStep {
  texto: string
  metas: PistaMeta
}

/**
 * A dica do momento, só o texto. Ver `sceneHintStep`.
 */
export function sceneHint(
  scene: SceneId,
  state: SceneState,
  level: number,
  cast?: SceneCast,
  /** Como a pilha da `layers` se apresenta (`pilha.ts`). */
  pilha?: ScenePilha,
): string {
  return sceneHintStep(scene, state, level, cast, pilha).texto
}

/**
 * A dica do momento, com as metas a que ela serve. A escada do modelo PULA o degrau cuja meta já caiu
 * (`PISTA_DA_META`), e algumas cenas ganham um atalho quando o estado já diz em que ponto a criança
 * travou: mandá-la reler a mesma frase genérica ali seria não responder.
 */
export function sceneHintStep(
  scene: SceneId,
  state: SceneState,
  level: number,
  cast?: SceneCast,
  pilha?: ScenePilha,
): SceneHintStep {
  const escada = degrau(scene, state, level, cast, pilha)
  // ⭐ O primeiro degrau diz ONDE a criança está antes de dizer o que fazer — é o padrão da
  // ajuda do Brilliant ("seu primeiro ponto foi parar em (−2, 2), mas onde o alvo precisa
  // estar?"). A situação já é escrita em língua de criança e já passa pelo elenco; repetir a
  // frase genérica para quem travou é não responder.
  if (level > 1) return escada
  const situacao = sceneSituation(scene, state, cast).trim()
  // ⚠️ A situação que JÁ termina com o degrau não repete a frase.
  if (situacao.endsWith(escada.texto)) return { ...escada, texto: situacao }
  return situacao && !escada.texto.startsWith(situacao)
    ? { ...escada, texto: `${situacao} ${escada.texto}` }
    : escada
}

/** O degrau foi cumprido com as descobertas de agora? Sem meta nenhuma, nunca. */
export function sceneHintDone(step: SceneHintStep, state: SceneState): boolean {
  return pistaCumprida(step.metas, state.evidence.discoveries)
}

function degrau(
  scene: SceneId,
  state: SceneState,
  level: number,
  cast?: SceneCast,
  pilha?: ScenePilha,
): SceneHintStep {
  const d = state.evidence.discoveries
  // ⚠️ Os atalhos também passam pelo elenco: eles citam o cacto e o Dino pelo nome, e uma
  // pista que fala de outro personagem é pior que pista nenhuma.
  const t = (texto: string, metas: PistaMeta): SceneHintStep => ({
    texto: castText(texto, cast),
    metas,
  })
  if (scene === 'random' && state.speed.fallingY !== undefined) {
    if (!d.includes('positions'))
      return t(
        level >= 3
          ? 'Aperte Sortear lugar na régua de cima até aparecerem marcas em dois lugares diferentes.'
          : 'Sorteie o lugar de mais uma pedra e compare as marcas na régua de cima.',
        ['positions'],
      )
    if (!d.includes('above'))
      return t('Agora deixe o tempo passar até a primeira pedra entrar pela borda de cima.', [
        'above',
      ])
  }
  /**
   * ⚠️⚠️ Os ESTADOS SEM SAÍDA vêm antes da escada, em todo degrau (consertos do review da onda A do
   * lote 5). Neles a pista de sempre manda fazer o que já não funciona:
   * - `hitbox` (A4): com a área abaixo de 100% (a sessão do lote 4 abria em 75%), o BATEU só aparece
   *   com os desenhos já encostados, e `contact` pede um vão à vista;
   * - `acceleration` (A1): com a condição ligada e a base já abaixo de −9, religar não traz a base de
   *   volta, e `base-limit` e `variation-limit` pedem a base CHEGANDO em −9.
   */
  if (scene === 'hitbox' && !d.includes('contact') && sceneAreaPercent(state.contact.width) < 100)
    return t(
      'Aumente o Tamanho da área do Dino e aproxime o cacto de novo, um toque de cada vez.',
      ['contact'],
    )
  if (
    scene === 'acceleration' &&
    state.speed.limited &&
    state.speed.base < -9 &&
    !(d.includes('base-limit') && d.includes('variation-limit'))
  )
    return t('A base já passou de −9. Recomece para ver a base parar em −9.', [
      'base-limit',
      'variation-limit',
    ])
  /**
   * ⚠️ As pistas que não seguiam a meta que falta (consertos do review da onda A do lote 5): mandavam
   * fazer o que já tinha sido feito, ou usar um controle ainda fechado.
   */
  if (scene === 'coordinates' && level >= 3 && !d.includes('right'))
    return t('Aperte + no x três vezes, sem tocar no y.', ['right'])
  if (scene === 'coordinates' && level >= 3 && !d.includes('down'))
    return t('Aperte + no y três vezes, sem tocar no x.', ['down'])
  // ⚠️ Com x e y descobertos, faltando o 0, 0, a pista 1 mandava "Mexa só no x" (full review de
  // experiência, M1). O passo literal ("Diminua o x até 0…") fica para o degrau 3.
  if (
    scene === 'coordinates' &&
    level < 3 &&
    d.includes('right') &&
    d.includes('down') &&
    !d.includes('origin')
  )
    return t('Agora leve o Dino para x 0 e y 0.', ['origin'])
  if (scene === 'stage-size' && level >= 3 && !d.includes('border-on'))
    return t('Aperte A borda da tela: escondida, logo abaixo do desenho.', ['border-on'])
  if (scene === 'draw-loop' && d.includes('frozen') && !d.includes('trail'))
    return t('Escolha A cada quadro e aperte Avançar 1 quadro duas vezes.', ['trail'])
  if (scene === 'draw-loop' && d.includes('trail') && !d.includes('moving'))
    return t('Ligue Limpar a tela antes e aperte Avançar 1 quadro de novo.', ['moving'])
  if (scene === 'hitbox' && level < 3 && !d.includes('area-contrast'))
    return d.includes('contact')
      ? // ⚠️ Lote 5 do Raio-X: o controle chama Tamanho da área do Dino (em %), e não largura.
        t('Deixe o cacto onde bateu. Mude só o Tamanho da área do Dino e compare.', [
          'area-contrast',
        ])
      : t('Aproxime o cacto devagar. Observe a borda da área do Dino.', ['contact'])
  // ⚠️ Nas cenas de mais de uma missão, a escada fala da missão que FALTA (lote 5 do Raio-X): na
  // `layers` depois de o Dino aparecer a pista 3 continuava mandando levar o Dino para o fim.
  // ⚠️⚠️ Com `pilha: 'camadas'` os textos são os do painel Camadas do Pinta (full review de
  // experiência, A1): o "fim da lista" do Estúdio é o FUNDO do desenho no Pinta.
  if (scene === 'layers' && d.includes('front') && !d.includes('covered')) {
    const camadas = emCamadas(scene, pilha)
    const agora = camadas
      ? LAYERS_CAMADAS.depoisDaFrente[0]
      : 'Agora esconda o Dino de novo, só mudando a ordem.'
    const literal = camadas
      ? LAYERS_CAMADAS.depoisDaFrente[1]
      : 'Com o Dino no fim da lista, leve a floresta para o fim.'
    return t(level < 3 ? agora : literal, ['covered'])
  }
  // ⚠️ A terceira missão (full review de experiência, M4): era a frase do arranjo desfeito.
  if (scene === 'layers' && d.includes('covered') && !d.includes('back-in-front'))
    return t(pedidoDaMeta(scene, 'back-in-front', pilha), ['back-in-front'])
  if (
    scene === 'jump-sound' &&
    d.includes('false-sound') &&
    !d.includes('silent-jump') &&
    level < 3
  )
    return t('Agora pule tocando no Dino. Olhe se aparece um ♪.', ['silent-jump'])
  if (scene === 'jump-sound' && d.includes('silent-jump') && !d.includes('every-jump') && level < 3)
    return t(
      'Leve Tocar efeito para Quando o Dino pular. Depois pule pela tecla e tocando no Dino.',
      ['every-jump'],
    )
  if (scene === 'impulse' && d.includes('first-height') && level < 3)
    return t('A marca deste salto fica no palco. Mude só o impulso e pule de novo.', [
      'other-height',
    ])
  /**
   * ⚠️ Consertos do review da onda B do lote 5 (G6, BAIXO-9 e BAIXO-10).
   * - `circle-collision`: com os dois SOBREPOSTOS (a medida da distância, ou um caso), diminuir um raio
   *   de 10 não desfaz a batida, e a pista 3 manda não mexer na distância. A saída é afastar.
   * - `entity-state`: a escada não falava de `shared` nem de `own`, e com o estado no jogo as metas de
   *   "cada torre" não caem (mudar uma muda as três).
   */
  if (
    scene === 'circle-collision' &&
    !d.includes('formula') &&
    state.circles.distance <= state.circles.a + state.circles.b - 10
  )
    return t(
      'Afaste os centros até os dois só encostarem. Depois diminua um raio sem mexer na distância.',
      ['formula'],
    )
  if (
    scene === 'entity-state' &&
    state.brains.shared &&
    !(d.includes('own') && d.includes('independent'))
  )
    return t(
      'Aperte O estado mora até ficar em cada torre. Depois mude o estado de uma torre só.',
      ['own', 'independent'],
    )
  if (scene === 'entity-state' && d.includes('acts') && !d.includes('own'))
    return t('Deixe cada torre num estado diferente das outras duas.', ['own'])
  if (scene === 'entity-state' && d.includes('independent') && !d.includes('shared'))
    return t(
      level < 3
        ? 'Agora mude onde o estado mora para no jogo.'
        : 'Aperte O estado mora até ficar no jogo. Depois troque o estado de uma torre.',
      ['shared'],
    )
  /**
   * ⚠️ O núcleo do Iniciante 2D (consertos do review da onda B do lote 5, BAIXO-10): a escada fixa nunca
   * chegava à ÚLTIMA meta de quatro cenas, e quem travou ali lia de novo "meça um cacto" ou "faça nascer
   * três". Cada degrau diz o gesto da meta que falta, nunca o resultado.
   */
  if (scene === 'group-loop' && d.includes('nearest') && !d.includes('auto'))
    return t(
      level < 3
        ? 'Agora ligue o laço e deixe o tempo passar. Olhe o anel enquanto os cactos andam.'
        : 'Ligue o laço e deixe o tempo passar por 3 segundos, sem tocar em Escolher.',
      ['auto'],
    )
  if (scene === 'enemy-type' && d.includes('all-change') && !d.includes('copied'))
    return t(
      level < 3
        ? 'Agora ligue Copiar a ficha ao nascer, mude a velocidade e faça nascer mais um cacto.'
        : 'Com a cópia ligada, mude a velocidade, faça nascer mais um cacto e deixe o tempo passar. Olhe o número em cima de cada cacto.',
      ['copied'],
    )
  if (scene === 'cooldown' && d.includes('waiting') && !d.includes('spaced'))
    return t(
      level < 3
        ? 'Com a recarga, aperte Atirar e espere aparecer Pronto para atirar. Depois aperte Atirar de novo.'
        : 'Ponha a recarga em 1 segundo, aperte Atirar, espere Pronto para atirar e aperte Atirar de novo.',
      ['spaced'],
    )
  if (scene === 'tilemap' && d.includes('coin-row') && !d.includes('same-letter'))
    return t(
      level < 3
        ? 'Escreva uma peça numa linha. Depois escreva a mesma peça numa outra linha.'
        : 'Escolha a letra # e escreva na linha 2. Depois escreva # na linha 4.',
      ['same-letter'],
    )
  /**
   * ⭐⭐ A escada PULA o degrau cuja meta já caiu (full review de experiência, M1). O nível N é o degrau N
   * quando ele ainda serve; cumprido, o PRÓXIMO que serve (e, sem nenhum depois, o último que serve antes).
   * Acabou a escada, vem o pedido da meta que falta (o gesto do "Conferir"). Antes os degraus eram fixos:
   * "Aperte o botão da borda." seguia na caixa com a borda à vista, e "Mexa só no x" com x e y descobertos.
   * ⚠️ "O próximo", e não "o N-ésimo que sobra": quem pediu a pista 1, fez o gesto e pede a 2 recebe o
   * degrau seguinte ("diminua a largura"), e não o passo literal do fim, pulando o que nunca leu.
   */
  const pistas = emCamadas(scene, pilha) ? LAYERS_CAMADAS.hints : sceneModel(scene).hints
  const metas = PISTA_DA_META[scene]
  const escada = pistas.map((texto, i) => ({ texto, metas: metas[i] ?? ([] as const) }))
  const serve = (p: { metas: PistaMeta } | undefined) =>
    Boolean(p) && !pistaCumprida(p?.metas ?? [], d)
  const n = Math.min(Math.max(level, 1), escada.length) - 1
  const escolhida = serve(escada[n])
    ? escada[n]
    : (escada.slice(n + 1).find(serve) ?? escada.slice(0, n).reverse().find(serve))
  if (escolhida) return t(escolhida.texto, escolhida.metas)
  const falta = sceneModel(scene).goals.find((g) => !g.soNoCaso && !d.includes(g.id))
  if (falta) return t(pedidoDaMeta(scene, falta.id, pilha), [falta.id])
  return t(pistas[2] ?? '', [])
}
