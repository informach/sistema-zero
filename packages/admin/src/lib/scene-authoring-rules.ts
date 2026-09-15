import type { InteractiveBlock, LearningActivity, LearningChoice } from '@sistemazero/core/learning'
import {
  isSceneScript,
  SCENE_MODELS,
  type SceneId,
  type SceneStep,
} from '@sistemazero/core/learning/scene'

/**
 * O que acontece com o trabalho do professor quando ele troca o tipo ou a cena do bloco.
 *
 * Puro de propósito, e num lugar só: cada uma destas regras já esteve errada, e o erro só
 * aparecia depois de o trabalho sumir — ou, pior, na parede genérica de "complete os campos"
 * ao tentar publicar, que fala de outra coisa.
 */

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
export function roteiroAoTrocarCena(
  script: readonly SceneStep[] | undefined,
  nova: SceneId,
  lembrado?: readonly SceneStep[],
): { script: SceneStep[] | undefined; descartado: boolean } {
  const candidato = script ?? lembrado
  if (!candidato) return { script: undefined, descartado: false }
  if (isSceneScript(candidato, nova))
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
  if (a.type === 'demonstration') {
    const { script, descartado } = roteiroAoTrocarCena(a.script, scene, memoria.script)
    return {
      bloco: { ...value, ...texto, activity: { ...a, scene, script } },
      aviso: descartado
        ? 'O roteiro que você escreveu é de outra cena e não vale nesta. A demonstração está com o roteiro que vem com a cena escolhida — o seu continua guardado enquanto este editor estiver aberto, e volta se você escolher uma cena em que ele valha.'
        : '',
    }
  }
  const mantemImpulso = CENAS_COM_IMPULSO.includes(scene)
  return {
    bloco: {
      ...value,
      ...texto,
      activity: {
        ...a,
        scene,
        // ⚠️ Mesma história do roteiro: atravessar uma cena sem salto zerava o impulso, e
        // chegar na outra cena de salto dava 9 em vez do que a professora tinha ajustado.
        initialImpulse: mantemImpulso ? (a.initialImpulse ?? memoria.initialImpulse) : undefined,
      },
    },
    aviso:
      !mantemImpulso && a.initialImpulse !== undefined
        ? 'O impulso inicial vale só nas cenas de salto, então saiu junto com a troca de cena.'
        : '',
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

  // ⚠️ A condição NÃO pode ser `cena === null`: desde que a memória devolve a cena escolhida
  // antes, `cena` quase nunca é nula, e o aviso morria calado justamente no caminho comum
  // (Pergunta curta → Experimentação). Quem decide é o DESTINO: toda cena descarta a pergunta.
  if ((tipo === 'demonstration' || tipo === 'experimentation') && value.checkpoint)
    avisos.push(
      'A pergunta de verificação saiu: uma cena não carrega pergunta anexa, porque as duas guardariam a resposta no mesmo lugar.',
    )
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
  let activity: LearningActivity
  if (tipo === 'demonstration')
    activity = {
      type: tipo,
      scene: cena ?? 'world',
      instructionAudioUrl: audio,
      script: a.type === 'demonstration' ? a.script : memoria.script?.map((p) => ({ ...p })),
    }
  else if (tipo === 'experimentation') {
    const destino = cena ?? 'world'
    activity = {
      type: tipo,
      scene: destino,
      instructionAudioUrl: audio,
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
  return {
    bloco: {
      ...value,
      activity,
      prediction: viraCena ? value.prediction : undefined,
      // O texto do modelo só entra onde o professor não escreveu nada.
      ...(viraCena ? textoAoTrocarCena(value, cena, cenaDe(activity) as SceneId) : {}),
      // ⚠️ Saindo da cena, as pistas DELA não seguem: "Olhe os bastidores: o Dino já existe?"
      // oferecida numa múltipla escolha é ajuda para outra pergunta.
      ...(!viraCena && cena && value.hints.join('\n') === SCENE_MODELS[cena].hints.join('\n')
        ? { hints: [] }
        : {}),
      checkpoint: viraCena
        ? undefined
        : // ⚠️ A pergunta EM BRANCO criada ao passar por "Pergunta curta" não fica presa: ela
          // invalida o bloco (o prompt vazio é recusado) e a parede de publicação fala de
          // "complete os campos", sem dizer qual. Quem escreveu alguma coisa, fica.
          tipo !== 'question' && perguntaEmBranco(value.checkpoint)
          ? undefined
          : tipo === 'question' && !value.checkpoint
            ? { prompt: '', choices: escolhasNovas(), correctChoiceId: 'first', explanation: '' }
            : value.checkpoint,
    },
    aviso: avisos.join(' '),
  }
}

export const HTML_INICIAL =
  "<h2>Experimente uma ideia</h2>\n<button onclick=\"learning.save({tests:(learning.state.tests||0)+1});learning.participated();this.textContent='Você fez '+learning.state.tests+' testes'\">Experimentar</button>"
