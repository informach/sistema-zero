import type { InteractiveBlock, LearningActivity, LearningChoice } from '@sistemazero/core/learning'
import {
  initialScene,
  isSceneScript,
  isSceneSetup,
  SCENE_MODELS,
  type SceneAction,
  type SceneId,
  type ScenePilha,
  type SceneSetup,
  type SceneStep,
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
 * O roteiro autoral sobrevive à troca de cena?
 *
 * ⚠️ O editor reconstruía a atividade do zero na troca de cena, e o roteiro escrito à mão
 * sumia sem uma palavra. Às vezes ele PODE sobreviver: um roteiro só de salto vale nas duas
 * cenas de salto. Quando não vale — e é o caso comum, porque as ações são da cena —, ele é
 * descartado, mas quem descarta AVISA: é isso que `descartado` existe para dizer.
 *
 * ⚠️ O `lembrado` é o roteiro que o EDITOR guardou (ver `MemoriaDaAutoria`): as catorze cenas
 * também são um grupo de rádio, e ir de `gravity` a `impulse` pela seta atravessa as doze do
 * meio. Sem isto, a primeira cena do caminho descartava o roteiro de salto e chegar na irmã —
 * onde ele VALE — devolvia a demonstração vazia, sem volta.
 */
/**
 * O CASO da atividade (`setup`) na troca de cena ou de tipo.
 *
 * ⚠️⚠️ Ele não pode simplesmente atravessar. As `actions` do caso são da CENA e as `goals` são
 * ids do modelo DELA — carregados para outra cena, o bloco passa a ser recusado na publicação
 * com o recado genérico de "complete os campos", e o editor do caso não tem como consertar: ele
 * desenha uma caixa por meta da cena NOVA, então nenhuma aparece marcada e o id estranho fica
 * lá dentro sem forma de desmarcar. É o mesmo beco do `initialImpulse`, e a saída é a mesma.
 *
 * ⚠️ E as `goals` só existem na experimentação: a demonstração não cobra meta nenhuma, e o
 * guard do domínio recusa o campo. Por isso `metas` — indo para demonstração, o alvo sai e
 * quem sai AVISA.
 */
export function casoAoTrocarCena(
  setup: SceneSetup | undefined,
  nova: SceneId,
  { metas }: { metas: boolean },
): { setup: SceneSetup | undefined; descartado: 'nada' | 'missao' | 'tudo' } {
  if (!setup) return { setup: undefined, descartado: 'nada' }
  // ⚠️ A metade que vale é lida ANTES do guard: depois dele o TS já estreitou o valor e o
  // acesso ao campo deixa de compilar.
  //
  // As ações podem valer na cena nova (um caso só de `advance` vale em quase todas); o alvo é
  // que quase nunca sobrevive. Salvar a metade que vale é melhor que devolver a caixa vazia.
  const soAcoes = setup.actions ? { actions: setup.actions } : undefined
  if (isSceneSetup(setup, nova, { goals: metas })) return { setup, descartado: 'nada' }
  // ⚠️ Caso SEM ações é caso só de missão, e o que sai dele é a missão: o recado de "o caso é
  // de outra cena… voltou ao mundo de fábrica" mandava o professor procurar ações que nunca
  // existiram. É o mesmo erro que o ramo `missao` foi criado para evitar.
  if (!soAcoes) return { setup: undefined, descartado: 'missao' }
  // ⚠️ O que SAIU muda o recado. Quando só a missão cai — o caso comum, porque as metas são ids
  // do modelo e as ações costumam valer em mais de uma cena —, dizer "o caso é de outra cena"
  // fala de uma perda que não aconteceu, e o professor vai procurar o que consertar nas ações.
  if (soAcoes && isSceneSetup(soAcoes, nova, { goals: false }))
    return { setup: soAcoes, descartado: 'missao' }
  return { setup: undefined, descartado: 'tudo' }
}

export function roteiroAoTrocarCena(
  script: readonly SceneStep[] | undefined,
  nova: SceneId,
  lembrado?: readonly SceneStep[],
  /** O caso da atividade: o roteiro é tocado a partir DELE, como o domínio faz. */
  setup?: SceneSetup,
): { script: SceneStep[] | undefined; descartado: boolean } {
  const candidato = script ?? lembrado
  if (!candidato) return { script: undefined, descartado: false }
  if (isSceneScript(candidato, nova, setup))
    return { script: candidato.map((p) => ({ ...p })), descartado: false }
  return { script: undefined, descartado: true }
}

/** O que o editor aplica, e o recado que ele mostra quando alguma coisa ficou pelo caminho. */
export interface Troca {
  bloco: InteractiveBlock
  aviso: string
}

/**
 * O que o EDITOR lembra enquanto está aberto, para devolver quando o professor volta.
 *
 * ⚠️ Os quatro cartões de tipo são um grupo de rádio, e num grupo de rádio a SETA já seleciona
 * ao passar. Ir de Experimentação até HTML pelo teclado atravessa os outros dois — e cada
 * passagem destruía o roteiro, o HTML, o áudio, o impulso e a cena escolhida. Com esta memória
 * o passeio deixa de ser destrutivo: voltar ao cartão de onde saiu devolve tudo.
 *
 * ⚠️ É memória do EDITOR, não do bloco: some ao fechar, e o aviso continua verdadeiro sobre o
 * que será GRAVADO se ele publicar de outro tipo.
 */
export interface MemoriaDaAutoria {
  scene?: SceneId
  script?: readonly SceneStep[]
  setup?: SceneSetup
  initialImpulse?: number
  instructionAudioUrl?: string
  html?: string
}

/** Guarda o que o bloco atual tem de próprio, sem apagar o que já estava lembrado. */
export function lembrar(anterior: MemoriaDaAutoria, value: InteractiveBlock): MemoriaDaAutoria {
  const a = value.activity
  const nova = { ...anterior }
  if (a.type === 'demonstration' || a.type === 'experimentation') {
    nova.scene = a.scene
    if (a.instructionAudioUrl) nova.instructionAudioUrl = a.instructionAudioUrl
    if (a.setup) nova.setup = a.setup
  }
  if (a.type === 'demonstration' && a.script) nova.script = a.script
  if (a.type === 'experimentation' && a.initialImpulse !== undefined)
    nova.initialImpulse = a.initialImpulse
  if (a.type === 'html' && a.html) nova.html = a.html
  return nova
}

const escolhasNovas = (): LearningChoice[] => [
  { id: 'first', label: 'Primeira possibilidade' },
  { id: 'second', label: 'Segunda possibilidade' },
]

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
  a.type === 'demonstration' || a.type === 'experimentation' ? a.scene : null

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
  if (a.type !== 'demonstration' && a.type !== 'experimentation') return { bloco: value, aviso: '' }
  const texto = textoAoTrocarCena(value, a.scene, scene)
  const previsao = previsaoNaCena(value.prediction, scene)
  const caso = casoAoTrocarCena(a.setup ?? memoria.setup, scene, {
    metas: a.type === 'experimentation',
  })
  const avisoDoCaso =
    caso.descartado === 'tudo'
      ? 'O caso que você montou é de outra cena e não vale nesta. A atividade voltou a começar do mundo de fábrica — o seu continua guardado enquanto este editor estiver aberto, e volta se você escolher a cena de onde ele saiu.'
      : caso.descartado === 'missao'
        ? 'As descobertas que você tinha marcado são do modelo da cena anterior e saíram. O caso de partida ficou; escolha de novo o que esta atividade cobra.'
        : ''
  if (a.type === 'demonstration') {
    // ⚠️ O roteiro é conferido a partir do caso APARADO, que é de onde o domínio o toca
    // (`isSceneScript(script, scene, setup)` → `openScene`). Conferindo contra o mundo de
    // fábrica, o editor guardava sem aviso um roteiro que a publicação depois recusava.
    const { script, descartado } = roteiroAoTrocarCena(a.script, scene, memoria.script, caso.setup)
    return {
      bloco: {
        ...value,
        ...texto,
        ...(value.prediction ? { prediction: previsao.prediction } : {}),
        // ⚠️ A pilha só existe na `layers` (full review de experiência, A1): levada para outra cena, o
        // core recusaria o bloco na publicação sem nada na tela para consertar.
        activity: { ...a, scene, script, setup: caso.setup, pilha: pilhaNaCena(a.pilha, scene) },
      },
      aviso: [
        descartado
          ? 'O roteiro que você escreveu é de outra cena e não vale nesta. A demonstração está com o roteiro que vem com a cena escolhida — o seu continua guardado enquanto este editor estiver aberto, e volta se você escolher uma cena em que ele valha.'
          : '',
        avisoDoCaso,
        previsao.saiu ? AVISO_DA_PREVISAO : '',
      ]
        .filter(Boolean)
        .join(' '),
    }
  }
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
        // ⚠️ Mesma história do roteiro: atravessar uma cena sem salto zerava o impulso, e
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
 * Trocar o TIPO do bloco.
 *
 * ⚠️ Três coisas atravessavam esta troca e não podiam: a PERGUNTA de verificação (uma cena não
 * aceita pergunta anexa — `answers.checkpoint` seria a alternativa escolhida E os pedaços da
 * sessão na mesma chave —, e a caixa de desmarcar some junto com o tipo, então o bloco ficava
 * recusado para sempre sem caminho de volta); o IMPULSO inicial, pelo mesmo motivo da troca de
 * cena; e as PISTAS do modelo da cena, que continuavam oferecidas numa múltipla escolha.
 *
 * ⚠️ E duas coisas se perdiam calado: o roteiro autoral e o áudio da instrução. O áudio volta
 * inteiro (os dois tipos de cena o têm); o roteiro só existe na demonstração, então sair dela
 * com um roteiro seu agora AVISA, em vez de sumir.
 */
export function trocarTipo(
  value: InteractiveBlock,
  tipo: LearningActivity['type'],
  memoria: MemoriaDaAutoria = {},
): Troca {
  const a = value.activity
  const cena = cenaDe(a) ?? memoria.scene ?? null
  const avisos: string[] = []

  // ⚠️ O aviso de que a pergunta SAÍA ao virar cena morreu em 15/09/2026, junto com a regra:
  // a cena passou a aceitar pergunta anexa (o terceiro tempo do ciclo), então não há mais nada
  // a avisar aqui — e um aviso que fala de uma perda que não acontece mais é pior que nenhum.
  if (a.type === 'demonstration' && a.script && tipo !== 'demonstration')
    avisos.push(
      'O roteiro que você escreveu vive na demonstração. Ele está guardado enquanto este editor estiver aberto — voltar para Demonstração o traz de volta —, mas publicar de outro tipo grava o bloco sem ele.',
    )
  if (a.type === 'experimentation' && a.initialImpulse !== undefined && tipo !== 'experimentation')
    avisos.push(
      'O impulso inicial que você ajustou só existe na experimentação. Ele está guardado enquanto este editor estiver aberto — voltar para Experimentação o traz de volta —, mas publicar de outro tipo grava o bloco sem ele.',
    )
  if (a.type === 'html' && a.html && tipo !== 'html')
    avisos.push(
      'O HTML que você escreveu está guardado enquanto este editor estiver aberto — voltar para Experiência em HTML o traz de volta —, mas publicar de outro tipo grava o bloco sem ele.',
    )
  // ⚠️ A MISSÃO (as metas que esta atividade cobra) só existe na experimentação: a demonstração
  // não cobra meta nenhuma. O caso de partida segue nas duas.
  if (a.type === 'experimentation' && a.setup?.goals && tipo !== 'experimentation')
    avisos.push(
      'A missão que você escolheu (quais descobertas esta atividade cobra) só existe na experimentação. Ela está guardada enquanto este editor estiver aberto — voltar para Experimentação a traz de volta.',
    )
  // ⚠️⚠️ A previsão é das CENAS (o palco é que responde o palpite) e o editor só a mostra lá.
  // Saindo para pergunta curta ou HTML ela ficava no bloco, INVISÍVEL: o professor não tinha como
  // apagá-la, o player não a renderiza e, com a pergunta em branco, ela derrubava a publicação com
  // o recado genérico de "complete os campos" sem nada na tela para consertar.
  const saiDaCena = tipo !== 'demonstration' && tipo !== 'experimentation'
  if (saiDaCena && value.prediction)
    avisos.push(
      'A previsão saiu: ela existe porque a CENA responde o palpite quando a criança mexe, e uma pergunta curta ou uma experiência em HTML não têm esse palco.',
    )

  // ⚠️ A cena ACOMPANHA entre as duas irmãs: são o mesmo assunto, e voltar para `world`
  // obrigaria a reescolher toda vez.
  const audio =
    a.type === 'demonstration' || a.type === 'experimentation'
      ? a.instructionAudioUrl
      : memoria.instructionAudioUrl
  // ⚠️ O caso ACOMPANHA as duas irmãs, como a cena e o áudio: montar o mundo de partida é o
  // trabalho mais caro da autoria de uma atividade, e perdê-lo num passeio pelo grupo de rádio
  // (que a SETA do teclado faz sozinha) é a pior perda das quatro.
  const casoLembrado =
    a.type === 'demonstration' || a.type === 'experimentation'
      ? (a.setup ?? memoria.setup)
      : memoria.setup
  // A pilha acompanha as duas irmãs, como o caso (só vale na `layers`).
  const pilhaLembrada =
    a.type === 'demonstration' || a.type === 'experimentation' ? a.pilha : undefined
  let activity: LearningActivity
  if (tipo === 'demonstration')
    activity = {
      type: tipo,
      scene: cena ?? 'world',
      instructionAudioUrl: audio,
      setup: casoAoTrocarCena(casoLembrado, cena ?? 'world', { metas: false }).setup,
      script: a.type === 'demonstration' ? a.script : memoria.script?.map((p) => ({ ...p })),
      pilha: pilhaNaCena(pilhaLembrada, cena ?? 'world'),
    }
  else if (tipo === 'experimentation') {
    const destino = cena ?? 'world'
    activity = {
      type: tipo,
      scene: destino,
      instructionAudioUrl: audio,
      setup: casoAoTrocarCena(casoLembrado, destino, { metas: true }).setup,
      pilha: pilhaNaCena(pilhaLembrada, destino),
      initialImpulse: CENAS_COM_IMPULSO.includes(destino)
        ? a.type === 'experimentation'
          ? a.initialImpulse
          : memoria.initialImpulse
        : undefined,
    }
  } else if (tipo === 'question') activity = { type: tipo }
  else
    activity = {
      type: 'html',
      html: a.type === 'html' ? a.html : (memoria.html ?? HTML_INICIAL),
    }

  const viraCena = activity.type === 'demonstration' || activity.type === 'experimentation'
  // ⚠️ A cena de chegada pode não ser a da previsão (quem volta de Pergunta curta cai na cena
  // lembrada, ou em `world`): o `revealOn` que não é meta dela sai, como na troca de cena.
  const previsao = viraCena
    ? previsaoNaCena(value.prediction, cenaDe(activity) as SceneId)
    : { prediction: undefined, saiu: false }
  if (previsao.saiu) avisos.push(AVISO_DA_PREVISAO)
  return {
    bloco: {
      ...value,
      activity,
      prediction: previsao.prediction,
      // O texto do modelo só entra onde o professor não escreveu nada.
      ...(viraCena ? textoAoTrocarCena(value, cena, cenaDe(activity) as SceneId) : {}),
      // ⚠️ Saindo da cena, as pistas DELA não seguem: "Olhe os bastidores: o Dino já existe?"
      // oferecida numa múltipla escolha é ajuda para outra pergunta.
      ...(!viraCena && cena && value.hints.join('\n') === SCENE_MODELS[cena].hints.join('\n')
        ? { hints: [] }
        : {}),
      // ⚠️ A cena passou a ACEITAR pergunta anexa (15/09/2026), então virar cena não apaga mais
      // o que o professor escreveu. Ela é o terceiro tempo do ciclo: mexer, prever, enunciar.
      // ⚠️ A pergunta EM BRANCO criada ao passar por "Pergunta curta" continua não ficando
      // presa: ela invalida o bloco (o prompt vazio é recusado) e a parede de publicação fala
      // de "complete os campos", sem dizer qual. Quem escreveu alguma coisa, fica.
      checkpoint:
        tipo !== 'question' && perguntaEmBranco(value.checkpoint)
          ? undefined
          : tipo === 'question' && !value.checkpoint
            ? { prompt: '', choices: escolhasNovas(), correctChoiceId: 'first', explanation: '' }
            : value.checkpoint,
      // ⚠️⚠️ "Sem a pergunta do fim" só existe na EXPERIMENTAÇÃO (é a única que herda pergunta do
      // modelo), e a caixa some junto com o tipo. Carregada para fora, ela deixaria o bloco recusado
      // para sempre sem caminho de volta na tela — o mesmo defeito que levou a pergunta e o impulso
      // a saírem daqui. Voltar para Experimentação não a ressuscita: é uma caixa, não um trabalho.
      semPerguntaFinal: tipo === 'experimentation' ? value.semPerguntaFinal : undefined,
    },
    aviso: avisos.join(' '),
  }
}

export const HTML_INICIAL =
  "<h2>Experimente uma ideia</h2>\n<button onclick=\"learning.save({tests:(learning.state.tests||0)+1});learning.participated();this.textContent='Você fez '+learning.state.tests+' testes'\">Experimentar</button>"
