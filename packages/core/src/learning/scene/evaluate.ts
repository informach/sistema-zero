import type { LearningResult } from '../index'
import type { SceneId } from './actions'
import { castText, type SceneCast } from './cast'
import { sceneModel } from './catalog'
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
): SceneGoalProgress[] {
  return sceneModel(scene)
    .goals.filter((g) => (targets?.length ? targets.includes(g.id) : !g.soNoCaso))
    .map((g) => ({
      id: g.id,
      label: castText(g.label, cast),
      ...(g.pedido ? { pedido: castText(g.pedido, cast) } : {}),
      complete: state.evidence.discoveries.includes(g.id),
    }))
}

/**
 * Duas cenas pedem que a montagem FIQUE no estado descoberto, não só que ele tenha passado:
 * em `layers`, o Dino na frente; em `jump-sound`, o fio do som no acontecimento. Descobrir e
 * depois desfazer não fecha essas duas — nas outras doze, descobrir basta.
 */
function settled(scene: SceneId, state: SceneState, targets?: readonly string[]): boolean {
  // ⚠️ A exigência de FICAR no estado descoberto acompanha a meta: uma atividade que não cobra
  // "Dino na frente" não pode travar a criança porque a montagem ficou no outro arranjo.
  if (scene === 'layers') return !cobra(targets, 'front') || state.world.front
  if (scene === 'jump-sound')
    return !cobra(targets, 'key-sound', 'tap-sound', 'every-jump') || state.sound.onJump
  return true
}

/**
 * O que falta quando as metas caíram e a montagem NÃO ficou no arranjo do jogo (lote 5 do Raio-X).
 *
 * ⚠️ Era "Deixe a montagem com a descoberta que você fez.", que não diz qual: na `layers` a segunda
 * descoberta é justamente esconder o Dino de novo, e a frase apontava para as duas ao mesmo tempo.
 */
function pedidoDoArranjo(scene: SceneId, cast?: SceneCast): string {
  // ⚠️ "Leve… de volta" (consertos do review da onda A do lote 5): o "Conferir" do player responde com
  // esta frase ("Ainda não. Tente: leve o Dino de volta…"), e antes ele não dizia nada com as metas
  // feitas e a montagem desfeita.
  if (scene === 'layers')
    return castText(
      'Leve o Dino de volta para o fim da ordem de desenhar, como fica no jogo.',
      cast,
    )
  if (scene === 'jump-sound')
    return castText('Leve Tocar som de volta para Quando o Dino pular, como fica no jogo.', cast)
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
): LearningResult {
  const cobradas = sceneGoals(scene, state, cast, targets)
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
 * A criança assistiu. Aqui as metas NÃO são cobradas: quem conduz é o roteiro, e exigir
 * descoberta de quem só observou seria cobrar por um gesto que a tela não ofereceu.
 */
export function evaluateDemonstration(
  viewed: boolean,
  valid = true,
  /** Houve sessão guardada? Quem nunca abriu não participou — é ausência, não evidência. */
  started = true,
): LearningResult {
  return {
    participated: valid && started,
    passed: valid && viewed,
    // ⚠️ Voz de criança (lote 2 do Raio-X): "Demonstração concluída" era texto de relatório. A
    // mesma frase aparece no fim da demonstração e no relatório do professor.
    feedback: !valid
      ? 'Esta demonstração mudou. Abra de novo para ver do começo.'
      : viewed
        ? 'Você viu tudo!'
        : 'Veja todas as partes até o fim.',
    verifiedBy: 'client',
    evidence: 'demonstration',
  }
}

/**
 * A dica do momento. Os três degraus do modelo valem quase sempre, mas três cenas ganham um
 * atalho quando o estado já diz em que ponto a criança travou — mandá-la reler a mesma frase
 * genérica ali seria não responder.
 */
export function sceneHint(
  scene: SceneId,
  state: SceneState,
  level: number,
  cast?: SceneCast,
): string {
  const escada = degrau(scene, state, level, cast)
  // ⭐ O primeiro degrau diz ONDE a criança está antes de dizer o que fazer — é o padrão da
  // ajuda do Brilliant ("seu primeiro ponto foi parar em (−2, 2), mas onde o alvo precisa
  // estar?"). A situação já é escrita em língua de criança e já passa pelo elenco; repetir a
  // frase genérica para quem travou é não responder.
  if (level > 1) return escada
  const situacao = sceneSituation(scene, state, cast).trim()
  // ⚠️ A situação que JÁ termina com o degrau (a `layers` e a `jump-sound` com a montagem desfeita,
  // consertos do review da onda A do lote 5) não repete a frase.
  if (situacao.endsWith(escada)) return situacao
  return situacao && !escada.startsWith(situacao) ? `${situacao} ${escada}` : escada
}

function degrau(scene: SceneId, state: SceneState, level: number, cast?: SceneCast): string {
  const d = state.evidence.discoveries
  // ⚠️ Os atalhos também passam pelo elenco: eles citam o cacto e o Dino pelo nome, e uma
  // pista que fala de outro personagem é pior que pista nenhuma.
  /**
   * ⚠️⚠️ Os ESTADOS SEM SAÍDA vêm antes da escada, em todo degrau (consertos do review da onda A do
   * lote 5). Neles a pista de sempre manda fazer o que já não funciona:
   * - `hitbox` (A4): com a área abaixo de 100% (a sessão do lote 4 abria em 75%), o BATEU só aparece
   *   com os desenhos já encostados, e `contact` pede um vão à vista;
   * - `acceleration` (A1): com a condição ligada e a base já abaixo de −9, religar não traz a base de
   *   volta, e `base-limit` e `variation-limit` pedem a base CHEGANDO em −9.
   */
  if (scene === 'hitbox' && !d.includes('contact') && sceneAreaPercent(state.contact.width) < 100)
    return castText(
      'Aumente o Tamanho da área do Dino e aproxime o cacto de novo, um toque de cada vez.',
      cast,
    )
  if (
    scene === 'acceleration' &&
    state.speed.limited &&
    state.speed.base < -9 &&
    !(d.includes('base-limit') && d.includes('variation-limit'))
  )
    return 'A base já passou de −9. Recomece para ver a base parar em −9.'
  /**
   * ⚠️ As pistas que não seguiam a meta que falta (consertos do review da onda A do lote 5): mandavam
   * fazer o que já tinha sido feito, ou usar um controle ainda fechado.
   */
  if (scene === 'coordinates' && level >= 3 && !d.includes('right'))
    return 'Aperte + no x três vezes, sem tocar no y.'
  if (scene === 'coordinates' && level >= 3 && !d.includes('down'))
    return 'Aperte + no y três vezes, sem tocar no x.'
  if (scene === 'screen-reader' && level <= 1 && d.includes('heard-empty'))
    return 'Escreva o que se faz no jogo. Por exemplo: pule, corra, desvie.'
  if (scene === 'stage-size' && level >= 3 && !d.includes('border-on'))
    return 'Aperte A borda da tela: escondida, logo abaixo do desenho.'
  if (scene === 'draw-loop' && d.includes('frozen') && !d.includes('trail'))
    return castText('Escolha A cada quadro e aperte Avançar 1 quadro duas vezes.', cast)
  if (scene === 'draw-loop' && d.includes('trail') && !d.includes('moving'))
    return 'Ligue Limpar a tela antes e aperte Avançar 1 quadro de novo.'
  if (scene === 'hitbox' && level < 3)
    return castText(
      d.includes('contact')
        ? // ⚠️ Lote 5 do Raio-X: o controle chama Tamanho da área do Dino (em %), e não largura.
          'Deixe o cacto onde bateu. Mude só o Tamanho da área do Dino e compare.'
        : 'Aproxime o cacto devagar. Observe a borda da área do Dino.',
      cast,
    )
  // ⚠️ Nas cenas de mais de uma missão, a escada fala da missão que FALTA (lote 5 do Raio-X): na
  // `layers` depois de o Dino aparecer a pista 3 continuava mandando levar o Dino para o fim.
  if (scene === 'layers' && d.includes('front') && !d.includes('covered'))
    return castText(
      level < 3
        ? 'Agora esconda o Dino de novo, só mudando a ordem.'
        : 'Com o Dino no fim da lista, leve a floresta para o fim.',
      cast,
    )
  if (scene === 'layers' && d.includes('covered') && !state.world.front)
    return pedidoDoArranjo(scene, cast)
  if (
    scene === 'jump-sound' &&
    d.includes('false-sound') &&
    !d.includes('silent-jump') &&
    level < 3
  )
    return castText('Agora pule tocando no Dino. Olhe se aparece um ♪.', cast)
  if (scene === 'jump-sound' && d.includes('silent-jump') && !d.includes('every-jump') && level < 3)
    return castText(
      'Leve Tocar som para Quando o Dino pular. Depois pule pela tecla e tocando no Dino.',
      cast,
    )
  if (scene === 'impulse' && d.includes('first-height') && level < 3)
    return 'A marca deste salto fica no palco. Mude só o impulso e pule de novo.'
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
    return 'Afaste os centros até os dois só encostarem. Depois diminua um raio sem mexer na distância.'
  if (
    scene === 'entity-state' &&
    state.brains.shared &&
    !(d.includes('own') && d.includes('independent'))
  )
    return 'Aperte O estado mora até ficar em cada torre. Depois mude o estado de uma torre só.'
  if (scene === 'entity-state' && d.includes('acts') && !d.includes('own'))
    return 'Deixe cada torre num estado diferente das outras duas.'
  if (scene === 'entity-state' && d.includes('independent') && !d.includes('shared'))
    return level < 3
      ? 'Agora mude onde o estado mora para no jogo.'
      : 'Aperte O estado mora até ficar no jogo. Depois troque o estado de uma torre.'
  /**
   * ⚠️ O núcleo do Iniciante 2D (consertos do review da onda B do lote 5, BAIXO-10): a escada fixa nunca
   * chegava à ÚLTIMA meta de quatro cenas, e quem travou ali lia de novo "meça um cacto" ou "faça nascer
   * três". Cada degrau diz o gesto da meta que falta, nunca o resultado.
   */
  if (scene === 'group-loop' && d.includes('nearest') && !d.includes('auto'))
    return castText(
      level < 3
        ? 'Agora ligue o laço e deixe o tempo passar. Olhe o anel enquanto os cactos andam.'
        : 'Ligue o laço e deixe o tempo passar por 3 segundos, sem tocar em Escolher.',
      cast,
    )
  if (scene === 'enemy-type' && d.includes('all-change') && !d.includes('copied'))
    return castText(
      level < 3
        ? 'Agora ligue Copiar a ficha ao nascer, mude a velocidade e faça nascer mais um cacto.'
        : 'Com a cópia ligada, mude a velocidade, faça nascer mais um cacto e deixe o tempo passar. Olhe o número em cima de cada cacto.',
      cast,
    )
  if (scene === 'cooldown' && d.includes('waiting') && !d.includes('spaced'))
    return level < 3
      ? 'Com a recarga, aperte Atirar e espere aparecer Pronto para atirar. Depois aperte Atirar de novo.'
      : 'Ponha a recarga em 1 segundo, aperte Atirar, espere Pronto para atirar e aperte Atirar de novo.'
  if (scene === 'tilemap' && d.includes('coin-row') && !d.includes('same-letter'))
    return level < 3
      ? 'Escreva uma peça numa linha. Depois escreva a mesma peça numa outra linha.'
      : 'Escolha a letra # e escreva na linha 2. Depois escreva # na linha 4.'
  const hints = sceneModel(scene).hints
  return castText(hints[level <= 1 ? 0 : level === 2 ? 1 : 2] ?? '', cast)
}
