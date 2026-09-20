import type { InteractiveBlock, LearningActivity } from '@sistemazero/core/learning'
import {
  initialScene,
  isSceneSetup,
  SCENE_MODELS,
  type SceneAction,
  type SceneCast,
  type SceneCenarioId,
  type SceneId,
  type ScenePilha,
  type SceneSetup,
  type SceneSpeechOverrides,
  type SceneVozes,
  sceneGoalIds,
  stepScene,
} from '@sistemazero/core/learning/scene'

/**
 * O que acontece com o trabalho do professor quando ele troca o tipo ou a cena do bloco.
 *
 * Puro de propósito, e num lugar só: cada uma destas regras já esteve errada, e o erro só
 * aparecia depois de o trabalho sumir — ou, pior, na parede genérica de "complete os campos"
 * ao tentar publicar, que fala de outra coisa.
 */

/**
 * O caso termina com um salto que ainda não saiu do chão?
 *
 * ⚠️⚠️ O motor abre esse caso SEM o salto (`openScene`, lote 1 do Raio-X): um salto começado e
 * parado deixava o Dino no chão e o primeiro toque da criança respondia "já está no ar". O caso
 * continua aceito, então o editor não recusa nada; ele AVISA, porque o professor vê "Pular" na
 * lista de ações e a prévia não mostra salto nenhum. A conta é a mesma do motor: as ações passam
 * por ele a partir do mundo de fábrica, e o que decide é o Dino ter subido pelo menos um pixel.
 */
export function saltoParadoNoCaso(scene: SceneId, actions: readonly SceneAction[] | undefined) {
  if (!actions?.some((a) => a.type === 'jump')) return false
  const start = { scene }
  const montado = actions.reduce(
    (estado, acao) => stepScene(start, estado, acao),
    initialScene(start),
  )
  return montado.flight.time !== null && montado.flight.y < 1
}

/** As duas cenas em que o impulso inicial existe. Fora delas o campo INVALIDA a atividade. */
const CENAS_COM_IMPULSO: readonly SceneId[] = ['gravity', 'impulse']

export interface TextoDoBloco {
  title: string
  instructions: string
  hints: string[]
}

/**
 * O texto que o bloco passa a ter quando a cena muda.
 *
 * ⚠️ O editor SOBRESCREVIA título, instrução e pistas com os do modelo a cada troca — de tipo
 * e de cena. Quem tinha escrito a própria instrução perdia tudo ao trocar de cena para
 * conferir outra, e nada avisava. A régua: o texto do modelo só entra onde o professor não
 * escreveu nada OU onde o que está escrito é, palavra por palavra, o do modelo anterior (ou
 * seja, ele nunca encostou). Se ele mexeu, o texto é dele e fica.
 */
export function textoAoTrocarCena(
  atual: TextoDoBloco,
  anterior: SceneId | null,
  nova: SceneId,
): TextoDoBloco {
  const modelo = SCENE_MODELS[nova]
  const antigo = anterior ? SCENE_MODELS[anterior] : null
  const intacto = (valor: string, doAntigo: string | undefined) =>
    valor.trim() === '' || (doAntigo !== undefined && valor === doAntigo)
  return {
    title: intacto(atual.title, antigo?.title) ? modelo.title : atual.title,
    instructions: intacto(atual.instructions, antigo?.instruction)
      ? modelo.instruction
      : atual.instructions,
    hints:
      atual.hints.length === 0 ||
      (antigo !== null && atual.hints.join('\n') === antigo.hints.join('\n'))
        ? [...modelo.hints]
        : atual.hints,
  }
}

/**
 * O CASO da atividade (`setup`) na troca de cena ou de tipo.
 *
 * ⚠️⚠️ Ele não pode simplesmente atravessar. As `actions` do caso são da CENA e as `goals` são
 * ids do modelo DELA — carregados para outra cena, o bloco passa a ser recusado na publicação
 * com o recado genérico de "complete os campos", e o editor do caso não tem como consertar: ele
 * desenha uma caixa por meta da cena NOVA, então nenhuma aparece marcada e o id estranho fica
 * lá dentro sem forma de desmarcar. É o mesmo beco do `initialImpulse`, e a saída é a mesma.
 *
 * As metas também são da cena escolhida; quando não servem na nova cena, saem com aviso.
 */
export function casoAoTrocarCena(
  setup: SceneSetup | undefined,
  nova: SceneId,
): { setup: SceneSetup | undefined; descartado: 'nada' | 'missao' | 'tudo' } {
  if (!setup) return { setup: undefined, descartado: 'nada' }
  // ⚠️ A metade que vale é lida ANTES do guard: depois dele o TS já estreitou o valor e o
  // acesso ao campo deixa de compilar.
  //
  // As ações podem valer na cena nova (um caso só de `advance` vale em quase todas); o alvo é
  // que quase nunca sobrevive. Salvar a metade que vale é melhor que devolver a caixa vazia.
  const soAcoes = setup.actions ? { actions: setup.actions } : undefined
  if (isSceneSetup(setup, nova)) return { setup, descartado: 'nada' }
  // ⚠️ Caso SEM ações é caso só de missão, e o que sai dele é a missão: o recado de "o caso é
  // de outra cena… voltou ao mundo de fábrica" mandava o professor procurar ações que nunca
  // existiram. É o mesmo erro que o ramo `missao` foi criado para evitar.
  if (!soAcoes) return { setup: undefined, descartado: 'missao' }
  // ⚠️ O que SAIU muda o recado. Quando só a missão cai — o caso comum, porque as metas são ids
  // do modelo e as ações costumam valer em mais de uma cena —, dizer "o caso é de outra cena"
  // fala de uma perda que não aconteceu, e o professor vai procurar o que consertar nas ações.
  if (soAcoes && isSceneSetup(soAcoes, nova)) return { setup: soAcoes, descartado: 'missao' }
  return { setup: undefined, descartado: 'tudo' }
}

/** O que o editor aplica, e o recado que ele mostra quando alguma coisa ficou pelo caminho. */
export interface Troca {
  bloco: InteractiveBlock
  aviso: string
}

/**
 * O que o EDITOR lembra enquanto está aberto, para devolver quando o professor volta.
 *
 * Os dois cartões de tipo são um grupo de rádio. Com esta memória
 * o passeio deixa de ser destrutivo: voltar ao cartão de onde saiu devolve tudo.
 *
 * ⚠️ É memória do EDITOR, não do bloco: some ao fechar, e o aviso continua verdadeiro sobre o
 * que será GRAVADO se ele publicar de outro tipo.
 */
export interface MemoriaDaAutoria {
  scene?: SceneId
  setup?: SceneSetup
  initialImpulse?: number
  instructionAudioUrl?: string
  vozes?: SceneVozes
  zappySpeech?: SceneSpeechOverrides
  cast?: SceneCast
  cenario?: SceneCenarioId
  pilha?: ScenePilha
  html?: string
}

/** Guarda o que o bloco atual tem de próprio, sem apagar o que já estava lembrado. */
export function lembrar(anterior: MemoriaDaAutoria, value: InteractiveBlock): MemoriaDaAutoria {
  const a = value.activity
  const nova = { ...anterior }
  if (a.type === 'experimentation') {
    nova.scene = a.scene
    if (a.instructionAudioUrl) nova.instructionAudioUrl = a.instructionAudioUrl
    if (a.vozes) nova.vozes = a.vozes
    if (a.zappySpeech) nova.zappySpeech = a.zappySpeech
    if (a.cast) nova.cast = a.cast
    if (a.cenario) nova.cenario = a.cenario
    if (a.pilha) nova.pilha = a.pilha
    if (a.setup) nova.setup = a.setup
  }
  if (a.type === 'experimentation' && a.initialImpulse !== undefined)
    nova.initialImpulse = a.initialImpulse
  if (a.type === 'html' && a.html) nova.html = a.html
  return nova
}

/** Pergunta que ninguém chegou a escrever: prompt, explicação e rótulos todos vazios. */
const perguntaEmBranco = (c: InteractiveBlock['checkpoint']) =>
  c !== undefined &&
  c.prompt.trim() === '' &&
  c.explanation.trim() === '' &&
  c.choices.every(
    (o) =>
      o.label === '' || o.label === 'Primeira possibilidade' || o.label === 'Segunda possibilidade',
  )

/**
 * A previsão levada para `scene`, sem o `revealOn` que não é meta dela.
 *
 * ⚠️⚠️ A previsão PRÓPRIA nasce copiada da cena (com o `revealOn` dela), e o editor não tem campo
 * para esse id. Trocada a cena, o `revealOn` antigo ficava lá dentro: o core recusa `revealOn` fora
 * das metas da cena, e o bloco passava a ser inválido, com o recado genérico de "complete os campos"
 * e nada na tela para consertar (review do lote 2 do Raio-X). Sem ele, o palpite só é retomado
 * quando a criança conclui, que é o comportamento de uma previsão sem `revealOn`.
 */
export function previsaoNaCena(
  prediction: InteractiveBlock['prediction'],
  scene: SceneId,
): { prediction: InteractiveBlock['prediction']; saiu: boolean } {
  if (!prediction?.revealOn || sceneGoalIds(scene).includes(prediction.revealOn))
    return { prediction, saiu: false }
  const { revealOn: _, ...resto } = prediction
  return { prediction: resto, saiu: true }
}
const AVISO_DA_PREVISAO =
  'A previsão que você escreveu era de outra cena: o palpite da criança volta a aparecer quando ela concluir esta atividade.'

/**
 * A pilha levada para `scene`: só a `layers` tem ordem de desenhar (full review de experiência, A1).
 * Em outra cena ela sai, sem aviso: o controle dela só existe na `layers`, e voltar para lá a pede de novo.
 */
export function pilhaNaCena(pilha: ScenePilha | undefined, scene: SceneId): ScenePilha | undefined {
  return scene === 'layers' ? pilha : undefined
}

/** A cena deste bloco, quando ele é de cena. */
const cenaDe = (a: LearningActivity): SceneId | null =>
  a.type === 'experimentation' ? a.scene : null

/**
 * Trocar a CENA do bloco, sem perder o que o professor escreveu.
 *
 * ⚠️ `initialImpulse` só existe em `gravity` e `impulse`, e o campo dele some da tela junto com
 * a cena — então, carregado para uma terceira cena, ele fica lá dentro sem forma de tirar e o
 * bloco passa a ser recusado na publicação, com uma mensagem que fala de verificação.
 */
export function trocarCena(
  value: InteractiveBlock,
  scene: SceneId,
  memoria: MemoriaDaAutoria = {},
): Troca {
  const a = value.activity
  if (a.type !== 'experimentation') return { bloco: value, aviso: '' }
  const texto = textoAoTrocarCena(value, a.scene, scene)
  const previsao = previsaoNaCena(value.prediction, scene)
  const caso = casoAoTrocarCena(a.setup ?? memoria.setup, scene)
  const avisoDoCaso =
    caso.descartado === 'tudo'
      ? 'O caso que você montou é de outra cena e não vale nesta. A atividade voltou a começar do mundo de fábrica — o seu continua guardado enquanto este editor estiver aberto, e volta se você escolher a cena de onde ele saiu.'
      : caso.descartado === 'missao'
        ? 'As descobertas que você tinha marcado são do modelo da cena anterior e saíram. O caso de partida ficou; escolha de novo o que esta atividade cobra.'
        : ''
  const mantemImpulso = CENAS_COM_IMPULSO.includes(scene)
  return {
    bloco: {
      ...value,
      ...texto,
      ...(value.prediction ? { prediction: previsao.prediction } : {}),
      activity: {
        ...a,
        scene,
        setup: caso.setup,
        pilha: pilhaNaCena(a.pilha, scene),
        // Atravessar uma cena sem salto zerava o impulso, e
        // chegar na outra cena de salto dava 9 em vez do que a professora tinha ajustado.
        initialImpulse: mantemImpulso ? (a.initialImpulse ?? memoria.initialImpulse) : undefined,
      },
    },
    aviso: [
      !mantemImpulso && a.initialImpulse !== undefined
        ? 'O impulso inicial vale só nas cenas de salto, então saiu junto com a troca de cena.'
        : '',
      avisoDoCaso,
      previsao.saiu ? AVISO_DA_PREVISAO : '',
    ]
      .filter(Boolean)
      .join(' '),
  }
}

/**
 * Troca entre a cena manipulável e o HTML, preservando no editor os campos próprios de cada uma.
 * A pergunta anexada pertence ao bloco e continua disponível nos dois formatos.
 */
export function trocarTipo(
  value: InteractiveBlock,
  tipo: LearningActivity['type'],
  memoria: MemoriaDaAutoria = {},
): Troca {
  const a = value.activity
  if (a.type === tipo) return { bloco: value, aviso: '' }
  const scene = cenaDe(a) ?? memoria.scene ?? 'world'
  const avisos: string[] = []

  if (a.type === 'experimentation' && a.initialImpulse !== undefined)
    avisos.push(
      'O impulso inicial só existe na experiência. Ele fica guardado enquanto este editor estiver aberto e volta se você escolher Experiência novamente.',
    )
  if (a.type === 'experimentation' && a.setup?.goals)
    avisos.push(
      'A missão desta cena fica guardada enquanto este editor estiver aberto e volta se você escolher Experiência novamente.',
    )
  if (a.type === 'html' && a.html)
    avisos.push(
      'O HTML que você escreveu fica guardado enquanto este editor estiver aberto e volta se você escolher HTML personalizado novamente.',
    )
  if (tipo === 'html' && value.prediction)
    avisos.push('O palpite saiu porque só uma cena pode mostrar o resultado da escolha da criança.')

  let activity: LearningActivity
  if (tipo === 'experimentation') {
    const source = a.type === 'experimentation' ? a : memoria
    activity = {
      type: 'experimentation',
      scene,
      instructionAudioUrl: source.instructionAudioUrl,
      vozes: source.vozes,
      zappySpeech: source.zappySpeech,
      cast: source.cast,
      cenario: source.cenario,
      setup: casoAoTrocarCena(source.setup, scene).setup,
      pilha: pilhaNaCena(source.pilha, scene),
      initialImpulse: CENAS_COM_IMPULSO.includes(scene) ? source.initialImpulse : undefined,
    }
  } else {
    activity = { type: 'html', html: a.type === 'html' ? a.html : (memoria.html ?? HTML_INICIAL) }
  }

  const viraCena = activity.type === 'experimentation'
  const previsao = viraCena
    ? previsaoNaCena(value.prediction, scene)
    : { prediction: undefined, saiu: false }
  if (previsao.saiu) avisos.push(AVISO_DA_PREVISAO)
  return {
    bloco: {
      ...value,
      activity,
      prediction: previsao.prediction,
      ...(viraCena ? textoAoTrocarCena(value, cenaDe(a), scene) : {}),
      ...(!viraCena && cenaDe(a) && value.hints.join('\n') === SCENE_MODELS[scene].hints.join('\n')
        ? { hints: [] }
        : {}),
      checkpoint: perguntaEmBranco(value.checkpoint) ? undefined : value.checkpoint,
      semPerguntaFinal: viraCena ? value.semPerguntaFinal : undefined,
    },
    aviso: avisos.join(' '),
  }
}
export const HTML_INICIAL =
  "<h2>Experimente uma ideia</h2>\n<button onclick=\"learning.save({tests:(learning.state.tests||0)+1});learning.participated();this.textContent='Você fez '+learning.state.tests+' testes'\">Experimentar</button>"
