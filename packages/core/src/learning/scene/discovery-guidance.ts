import type { SceneId } from './actions'
import { GUIAS_LIVRES } from './guia-livre'
import { CABANA_SPEECH, cabanaGuidance } from './guidance-cabana'
import { MOEDAS_SPEECH, moedasGuidance } from './guidance-moedas'
import { PONTE_SPEECH, ponteGuidance } from './guidance-ponte'
import { SIMBOLOS_SPEECH, simbolosGuidance } from './guidance-simbolos'
import type { SceneActivity } from './index'
import { ISLAND_SPEECH, islandGuidance } from './island-3d'
import {
  lighthouseKeyNotCase,
  lighthouseWalkGone,
  lighthouseWalkMaxX,
  lighthouseWalkOutSeenX,
  type SceneState,
} from './state'

/** Shared authored speech: player and recording inventory always use the same text. */
const speech = {
  ...ISLAND_SPEECH,
  ...PONTE_SPEECH,
  ...MOEDAS_SPEECH,
  ...SIMBOLOS_SPEECH,
  ...CABANA_SPEECH,
  // ⭐ "O jogo em câmera lenta" (Farol, Dia 1, 01/11/2026): só a IDEIA (quadro, passinho, seta). Os
  // blocos aparecem só na montagem do Estúdio; aqui não se fala de bloco, regra nem comando.
  // ⭐ Convite à investigação, como no Cadê (02/11/2026): antes do teste, a fala pergunta e diz o
  // que observar, sem contar o resultado; depois dele, explica.
  'slow-start': 'Faça o personagem andar. Segure a seta!',
  'slow-walking': 'Um quadro, um passinho. E se soltar a seta?',
  'slow-released': 'Os quadros passam e ele fica parado. E bem rápido?',
  'slow-real': 'Continue segurando. Compare com o Devagar: o que mudou?',
  'slow-out': 'Ele saiu da tela. Toque em Começo e teste de novo.',
  'slow-out-nave': 'A nave saiu da tela. Toque em Começo e teste de novo.',
  'slow-start-nave': 'Faça a nave andar. Segure a seta!',
  // ⭐ A ideia e a ponte (08/11/2026): com tudo descoberto, o balão do Zappy vira o cartão da ideia, e o
  // "Ouvir" lê as duas (a ponte começa por "No seu jogo:", exatamente como aparece no balão).
  'slow-idea':
    'O jogo desenha um quadro atrás do outro. Com a seta apertada, um passinho por quadro. Rápido, vira caminhada.',
  'slow-bridge':
    'No seu jogo: em cada quadro, o personagem dá um passinho se a seta estiver apertada.',
  'slow-idea-nave':
    'O jogo desenha um quadro atrás do outro. Com a seta apertada, a nave anda um pouco por quadro. Rápido, vira voo.',
  'slow-bridge-nave': 'No seu jogo: em cada quadro, a nave anda se a seta estiver apertada.',
  'slow-complete': 'Quadro a quadro, passinho a passinho. Rápido, vira caminhada!',
  // ⭐ "A beirada da tela" (Farol, Dia 1, parte 5, 01/11/2026): só a ideia, sem blocos nem ordem dos
  // blocos. A ordem aparece dentro de cada quadro: primeiro o passinho, depois a conferência.
  // ⚠️ Em câmera lenta, ir do meio da tela até a beirada leva uns 40 s: o caminho até lá é na
  // velocidade de verdade, e a câmera lenta só na beirada (o botão em destaque acompanha).
  'border-start': 'Até onde o personagem vai? Segure a seta.',
  'border-off': 'O limite está desligado. Segure a seta até a beirada.',
  'border-out': 'Ele passou da beirada! E se ligar o limite agora?',
  'border-on-out': 'O limite está ligado. Olhe o próximo quadro.',
  'border-back': 'Voltou! E segurando a seta na beirada, com o limite?',
  'border-edge': 'Limite ligado. Vá até a beirada e escolha Devagar.',
  'border-edge-off': 'Ligue o limite, vá até a beirada e escolha Devagar.',
  'border-hold': 'A cada passinho, o jogo confere e segura. E sem o limite?',
  'border-idea':
    'Depois de cada passinho, o jogo confere a beirada. Sem limite, sai da tela; com o limite, volta para dentro.',
  'border-bridge':
    'No seu jogo: o limite segura o personagem dentro da tela, depois de cada passinho.',
  'border-idea-nave':
    'Depois de cada passinho, o jogo confere a beirada. Sem limite, a nave sai da tela; com o limite, volta para dentro.',
  'border-bridge-nave':
    'No seu jogo: o limite segura a nave dentro da tela, depois de cada passinho.',
  'border-complete': 'Depois de cada passinho, o jogo confere a beirada.',
  // A Nave contra Asteroides (02/11/2026) usa as mesmas telas do andar com a nave: as falas sem
  // "personagem", "ele" nem a chave do Farol. A escolha acrescenta `-nave` à chave quando existe.
  'slow-released-nave': 'Os quadros passam e a nave fica parada. E bem rápido?',
  'slow-complete-nave': 'Quadro a quadro, passinho a passinho. Rápido, vira voo!',
  'border-start-nave': 'Até onde a nave vai? Segure a seta.',
  'border-off-nave': 'O limite está desligado. Segure a seta até a beirada.',
  'border-out-nave': 'A nave passou da beirada! E se ligar o limite agora?',
  'border-on-out-nave': 'O limite está ligado. Olhe o próximo quadro.',
  'border-back-nave': 'Voltou! E segurando a seta na beirada, com o limite?',
  'border-edge-nave': 'Limite ligado. Leve a nave até a beirada e escolha Devagar.',
  'border-edge-off-nave': 'Ligue o limite, leve a nave até a beirada e escolha Devagar.',
  'border-hold-nave': 'A cada passinho, o jogo confere e segura a nave. E sem o limite?',
  'border-complete-nave': 'Depois de cada passinho, o jogo confere a beirada.',
  // ⭐ "O tamanho do passinho" (Nave, Dia 1, 02/11/2026): só a ideia (o passinho de cada quadro pode
  // ser pequeno ou grande), sem bloco nem número de velocidade. Só existe na Nave, por isso as falas
  // já dizem "a nave". Antes do teste, a fala pergunta e diz o que comparar; o resultado vem depois.
  'stride-start':
    'Escolha um tamanho de passinho: Passinho pequeno ou Passinho grande. Depois clique em Câmera lenta, segure a seta e observe as marcas e a tira: quanto a nave anda em cada quadro?',
  'stride-small':
    'Com o passinho pequeno, a nave anda só um pouquinho em cada quadro, e as marcas ficam juntinhas. E com o passinho grande, o que muda? Clique em Passinho grande, segure a seta em câmera lenta e compare as marcas.',
  'stride-try-big':
    'Agora o passinho é grande. O que você acha que muda nas marcas? Clique em Câmera lenta, segure a seta e compare as marcas e a tira com as do passinho pequeno.',
  'stride-big':
    'Com o passinho grande, a nave vai mais longe em cada quadro, e as marcas ficam bem separadas. E com o passinho pequeno, o que muda? Clique em Passinho pequeno, segure a seta em câmera lenta e compare as marcas.',
  'stride-try-small':
    'Agora o passinho é pequeno. O que você acha que muda nas marcas? Clique em Câmera lenta, segure a seta e compare as marcas e a tira com as do passinho grande.',
  'stride-complete':
    'Nos dois casos, a nave dá um passinho em cada quadro. O que muda é o tamanho do passinho: com o passinho grande, a nave vai mais longe em cada quadro e, por isso, voa mais depressa. Quer sentir a diferença? Clique em Velocidade de verdade com cada passinho.',
  // ⚠️ As falas da bancada antiga do quadro: valem só para o bloco que ainda não foi reimportado.
  'walk-empty':
    'A regra está vazia. Você pode apertar a tecla no teclado de teste e avançar um quadro, ou começar adicionando o bloco.',
  'walk-no-command':
    'A tecla está apertada, mas falta o comando de mover. Avance um quadro para testar. Depois adicione o bloco e compare.',
  'walk-no-key':
    'O bloco está na regra, mas a tecla está solta. Avance um quadro para comparar. Apertar a tecla não muda os blocos.',
  'walk-both':
    'Bloco na regra e tecla apertada. Avance um ou vários quadros e observe os passos. Você pode retirar o bloco ou soltar a tecla para comparar.',
  'walk-complete':
    'Você comparou o comando, a tecla e a passagem dos quadros. Continue experimentando: todas as opções permanecem livres.',
  'edge-start':
    'O bloco de mover já está na regra. Aperte a tecla no teclado de teste e avance os quadros. Observe a borda.',
  'edge-limited-first':
    'O bloco de limite já está na regra. Você pode retirá-lo e comparar o que acontece na borda.',
  'edge-out': 'Ele saiu da tela. Adicione o bloco de limite e avance outro quadro. O que muda?',
  'edge-hold':
    'Avance mais quadros junto à borda. Veja como o bloco de limite mantém o personagem dentro da tela.',
  'edge-order':
    'Você comparou com e sem o bloco de limite. Abra o teste das duas ordens para ver por que a ordem importa.',
  'edge-complete':
    'Você comparou as duas regras e as duas ordens. Pode repetir os testes e continuar explorando.',
  // ⭐ Dias 2 e 3 do Farol (02/11/2026): só a ideia (memória da chave, a pergunta da porta, os dois
  // números) e o convite à investigação do Cadê: antes do teste, a fala pergunta e diz o que
  // observar; o resultado só vem depois dele. Nada de regra, ação, bloco, então ou senão.
  'memory-edited': 'O lápis mudou. Jogue de novo e pegue a chave.',
  'memory-first-saved': 'O lápis está ligado. Ande até a chave e olhe o caderninho.',
  'memory-first': 'Ande até a chave e pegue. Depois, olhe o caderninho.',
  'memory-compare': 'Pegou, mas o caderninho não mudou. E se o jogo anotar?',
  'memory-compare-off': 'Anotado: SIM! E com o lápis desligado, o que acontece?',
  'memory-away': 'Anotado: SIM! E se o personagem se afastar da chave?',
  'memory-restart': 'Longe da chave, continua SIM. E numa partida nova?',
  'memory-idea':
    'Pegar a chave e o jogo anotar são coisas diferentes. O anotado fica até uma partida nova.',
  'memory-bridge':
    'No seu jogo: quando o personagem pegar a chave, o jogo vai anotar que ele tem a chave.',
  'memory-complete': 'Pegar é uma coisa. Anotar é outra. Partida nova apaga.',
  'door-with': 'Pegou a chave! Olhe o caderninho. E a porta agora?',
  'door-without': 'A porta do farol faz uma pergunta. Ande até ela.',
  'door-compare-without': 'Abriu! O caderninho dizia SIM. E sem a chave? Jogue de novo.',
  'door-compare-with': 'Trancada. O caderninho dizia NÃO. Onde está a chave?',
  'door-idea': 'A porta faz sempre a mesma pergunta e olha o caderninho do jogo para responder.',
  'door-bridge': 'No seu jogo: a porta vai olhar se o personagem tem a chave antes de abrir.',
  'door-complete': 'A pergunta é a mesma. O caderninho muda a resposta.',
  // ⭐ A pergunta com o não (Ilha do Farol, aula 3, parte 3, 02/11/2026): a mesma porta, e a pergunta
  // pode ser "a porta está trancada?" ou "a porta não está trancada?". Sem a chave a porta está
  // trancada. Só a ideia: nada de bloco, Se, então, senão nem variável. Antes do teste, a fala pergunta;
  // a resposta de cada situação só vem depois de testada.
  'door-not-start':
    'Sem a chave, a porta está trancada. Com a chave, ela fica destrancada. A porta obedece à resposta da pergunta: com a resposta sim, ela abre; com a resposta não, ela fica fechada. Repare na pergunta que a porta faz agora. O que você acha que ela vai responder? Clique em Testar a porta e observe a resposta e a porta.',
  'door-not-try':
    'A situação mudou. O que você acha que a porta vai responder agora? Clique em Testar a porta e compare com o que você já viu.',
  'door-not-plain-with':
    'A pergunta era: a porta está trancada? Com a chave, ela não está. A resposta foi não, e a porta obedece ao não: ficou fechada, mesmo destrancada. E com o não na pergunta, o que muda? Clique em Pôr o não na pergunta e depois em Testar a porta.',
  'door-not-plain-without':
    'A pergunta era: a porta está trancada? Sem a chave, ela está. A resposta foi sim, e a porta obedece ao sim: abriu, mesmo trancada. É por isso que a pergunta precisa mudar. E com o não na pergunta, o que muda? Clique em Pôr o não na pergunta e depois em Testar a porta.',
  'door-not-not-with':
    'A pergunta era: a porta não está trancada? Com a chave, ela não está. A resposta foi sim, e a porta obedece ao sim: abriu. E sem o não, o que muda? Clique em Tirar o não da pergunta e depois em Testar a porta.',
  'door-not-not-without':
    'A pergunta era: a porta não está trancada? Sem a chave, ela está. A resposta foi não, e a porta obedece ao não: ficou fechada. E sem o não, o que muda? Clique em Tirar o não da pergunta e depois em Testar a porta.',
  'door-not-other-with':
    'Sem a chave, o não trocou a resposta: o que era sim virou não. E com a chave, o que acontece com as duas perguntas? Clique em Dar a chave ao personagem e teste a porta com e sem o não.',
  'door-not-other-without':
    'Com a chave, o não trocou a resposta: o que era não virou sim. E sem a chave, o que acontece com as duas perguntas? Clique em Tirar a chave do personagem e teste a porta com e sem o não.',
  'door-not-complete':
    'Nos dois casos, o não trocou a resposta: o que era sim virou não, e o que era não virou sim. Para a porta abrir só quando ela não está trancada, a pergunta precisa do não. Pode testar quantas vezes quiser.',
  'position-start': 'Onde a chave vai ficar? Mude o x ou o y.',
  'position-height': 'O x leva a chave para os lados. E o y?',
  'position-width': 'O y leva a chave para cima e para baixo. E o x?',
  // Os momentos que só a tela da posição conhece: o palpite do y e o desafio do alvo.
  'position-guess': 'Antes de testar: se o y aumentar, a chave sobe ou desce?',
  'position-guess-up': 'Você achou que subia, mas desceu! O y começa no alto.',
  'position-guess-down': 'Isso, desceu! O y começa em 0 lá no alto.',
  'position-target': 'Leve a chave até o alvo. Quais números ele tem?',
  'position-target-done': 'Você levou a chave até o alvo!',
  'position-idea':
    'O x leva a chave para os lados e o y para cima e para baixo. O y começa em 0 no alto: um y maior desce.',
  'position-bridge': 'No seu jogo: você vai escolher os dois números do lugar da chave.',
  'position-complete': 'O x vai para os lados. O y maior desce.',
  'touch-first': 'Tem alguém escondido no arbusto. Toque nele!',
  'touch-with-first': 'A regra está encaixada. Toque no arbusto e olhe!',
  'touch-with': 'Apareceu! E nas pedras, a regra funciona?',
  'touch-exhausted': 'Todos apareceram. Toque em Esconder de novo e teste mais.',
  'touch-nothing': 'Nada aconteceu. Encaixe a regra e toque de novo.',
  'touch-remove': 'Agora tire a regra. O toque ainda mostra alguém?',
  'touch-idea':
    'Tocar sozinho não faz nada. O jogo só responde quando uma regra liga o toque a uma ação.',
  'touch-bridge':
    'No seu jogo: cada esconderijo vai ter a regra que liga o toque a mostrar quem está lá.',
  'touch-complete': 'Sem regra, nada. Com a regra, o toque mostra quem está lá.',
  'count-start': 'O jogo conta quem você acha. Ache alguém!',
  'count-empty': 'E se tocar na grama, onde não tem ninguém?',
  'count-repeat': 'E se tocar de novo em quem já achou?',
  'count-add': 'Olhe o número. E se achar outro?',
  'count-restart': 'E se começar uma busca nova?',
  'count-idea':
    'O jogo guarda os achados. Achado novo soma 1; o resto não muda; busca nova volta a 0.',
  'count-bridge': 'No seu jogo: um número vai guardar quantos personagens a pessoa já achou.',
  'count-complete': 'Achado novo soma 1. Busca nova volta a zero.',
} as const
/**
 * O caso do tamanho do passinho (Nave, Dia 1, 02/11/2026): a exploração livre que cobra as metas da
 * velocidade sem a comparação antiga da seta solta (`still-without-arrow`, a bancada de antes). É a
 * mesma régua que escolhe a tela no member-shell.
 */
export function lighthouseWalkStrideCase(
  activity: Pick<SceneActivity, 'scene' | 'setup'>,
): boolean {
  const metas = activity.setup?.goals ?? []
  return (
    activity.scene === 'lighthouse-walk' &&
    activity.setup?.freeExploration === true &&
    (metas.includes('step-speed-1') || metas.includes('step-speed-3')) &&
    !metas.includes('still-without-arrow')
  )
}
/**
 * A fala da porta no caso do não (Ilha do Farol, aula 3, 02/11/2026). Testada a situação de agora, o
 * Zappy explica ESTA resposta e propõe a outra pergunta com a mesma chave; com as duas perguntas vistas
 * nessa chave, propõe a outra chave (se a atividade a cobra). A tela destaca o botão que a fala pede.
 */
export function portaDoNaoGuidance(
  activity: Pick<SceneActivity, 'setup'>,
  state: SceneState,
  has: (id: string) => boolean,
): keyof typeof speech {
  const l = state.lighthouse
  const chave = l.hasKey ? 'with-key' : 'without-key'
  const metas = activity.setup?.goals ?? []
  const falta = (k: string) => metas.includes(`not-flips-${k}`) && !has(`not-flips-${k}`)
  if (!falta('with-key') && !falta('without-key')) return 'door-not-complete'
  // Esta chave já viu as duas perguntas: a outra chave. ⚠️ Pelo que ela VIU (`has`), não pelo que
  // falta: numa atividade que só cobra a outra chave, esta nunca "falta" e a fala afirmaria a troca.
  if (has(`not-flips-${chave}`)) return l.hasKey ? 'door-not-other-without' : 'door-not-other-with'
  if (l.checkedKey != null)
    return `door-not-${l.checkedNot ? 'not' : 'plain'}-${l.hasKey ? 'with' : 'without'}`
  const testouAlguma = ['locked', 'not-locked'].some((q) =>
    ['with-key', 'without-key'].some((k) => has(`asked-${q}-${k}`)),
  )
  return testouAlguma ? 'door-not-try' : 'door-not-start'
}
/** Uma fala da descoberta pelo id (a tela pede as falas que só ela conhece: a ideia, o palpite, o alvo). */
export type DiscoverySpeechId = keyof typeof speech
export function discoverySpeech(id: DiscoverySpeechId, cenario?: string): string {
  if (cenario === 'nave') {
    const daNave = `${id}-nave`
    if (daNave in speech) return speech[daNave as DiscoverySpeechId]
  }
  return speech[id]
}

export function discoverySpeechSteps(scene?: SceneId) {
  const livre = scene ? GUIAS_LIVRES[scene] : undefined
  if (livre) return Object.entries(livre.speech).map(([id, text]) => ({ id, text }))
  const prefixes =
    scene === 'island-3d'
      ? ['island']
      : scene === 'touch-response'
        ? ['touch']
        : scene === 'found-counter'
          ? ['count']
          : scene === 'lighthouse-walk'
            ? ['slow', 'walk', 'border', 'edge', 'stride']
            : scene === 'collect-and-remember'
              ? ['memory']
              : scene === 'lighthouse-key'
                ? ['door']
                : scene === 'timed-bridge'
                  ? ['bridge']
                  : scene === 'coin-counter'
                    ? ['coin']
                    : scene === 'symbol-sequence'
                      ? ['symbols']
                      : scene === 'two-pieces'
                        ? ['cabin']
                        : scene === 'lighthouse-position'
                          ? ['position']
                          : []
  return Object.entries(speech)
    .filter(([id]) => !scene || prefixes.some((prefix) => id.startsWith(`${prefix}-`)))
    .map(([id, text]) => ({ id, text }))
}
export function discoveryGuidance(activity: SceneActivity, state: SceneState) {
  if (activity.scene === 'island-3d' && state.island3d)
    return islandGuidance(state, activity.setup?.goals)
  const has = (id: string) => state.evidence.discoveries.includes(id)
  const livre = GUIAS_LIVRES[activity.scene]
  if (livre) {
    const id = livre.guidance(state, has, activity)
    return { id, text: livre.speech[id] ?? '' }
  }
  let id: keyof typeof speech = 'count-start'
  switch (activity.scene) {
    case 'lighthouse-walk':
      if (activity.setup?.goals?.includes('came-back-inside')) {
        const { keepInside, x } = state.walk
        // "Fora" é a régua do `left-the-screen`: metade da caixa além da borda.
        id =
          has('left-the-screen') && has('came-back-inside') && has('stayed-inside')
            ? 'border-complete'
            : keepInside && x > lighthouseWalkMaxX()
              ? 'border-on-out'
              : !keepInside
                ? x >= lighthouseWalkOutSeenX()
                  ? 'border-out'
                  : has('left-the-screen') && has('came-back-inside')
                    ? 'border-edge-off'
                    : // Quem já testou com o limite ligado não ouve "ligue o limite primeiro".
                      has('came-back-inside') || has('stayed-inside')
                      ? 'border-off'
                      : 'border-start'
                : !has('stayed-inside')
                  ? // "Ele voltou para dentro" só enquanto ele está lá, na beirada.
                    has('came-back-inside') && x === lighthouseWalkMaxX()
                    ? 'border-back'
                    : 'border-edge'
                  : 'border-hold'
      } else if (activity.setup?.goals?.includes('left-the-screen'))
        id = !has('left-the-screen')
          ? state.walk.keepInside
            ? 'edge-limited-first'
            : 'edge-start'
          : !has('stayed-inside')
            ? state.walk.keepInside
              ? 'edge-hold'
              : 'edge-out'
            : !has('compared-command-order')
              ? 'edge-order'
              : 'edge-complete'
      else if (lighthouseWalkStrideCase(activity)) {
        const pequeno = has('step-speed-1')
        const grande = has('step-speed-3')
        id =
          pequeno && grande
            ? 'stride-complete'
            : pequeno
              ? state.walk.speed === 1
                ? 'stride-small'
                : 'stride-try-big'
              : grande
                ? state.walk.speed === 3
                  ? 'stride-big'
                  : 'stride-try-small'
                : 'stride-start'
      } else if (activity.setup?.goals?.includes('walked-real-speed'))
        id =
          !(has('moves-each-frame') && has('stopped-after-release') && has('walked-real-speed')) &&
          lighthouseWalkGone(state.walk)
            ? 'slow-out'
            : !has('moves-each-frame')
              ? 'slow-start'
              : !has('stopped-after-release')
                ? 'slow-walking'
                : !has('walked-real-speed')
                  ? state.walk.pace === 'real' && state.walk.arrow
                    ? 'slow-real'
                    : 'slow-released'
                  : 'slow-complete'
      else
        id = [
          'no-movement-command',
          'still-without-arrow',
          'moves-each-frame',
          'stopped-after-release',
        ].every(has)
          ? 'walk-complete'
          : state.walk.movement === false
            ? state.walk.arrow
              ? 'walk-no-command'
              : 'walk-empty'
            : state.walk.arrow
              ? 'walk-both'
              : 'walk-no-key'
      break
    case 'collect-and-remember':
      id =
        !state.collection.keyPresent && state.caption.includes('próximo encontro')
          ? 'memory-edited'
          : !has('collected-without-memory') && !has('collected-with-memory')
            ? state.collection.remember
              ? 'memory-first-saved'
              : 'memory-first'
            : // Quem começou com a memória ligada compara agora com ela desligada.
              !has('collected-without-memory')
              ? 'memory-compare-off'
              : !has('collected-with-memory')
                ? 'memory-compare'
                : !has('remembered-after-leaving')
                  ? 'memory-away'
                  : !has('reset-after-remembering')
                    ? 'memory-restart'
                    : 'memory-complete'
      break
    case 'lighthouse-key':
      if (lighthouseKeyNotCase(activity.setup)) {
        id = portaDoNaoGuidance(activity, state, has)
        break
      }
      id =
        has('opened-with-key') && has('locked-without-key')
          ? 'door-complete'
          : // Preparar de novo um caso já testado não repete a pergunta: o Zappy propõe o outro.
            state.lighthouse.checkedKey == null &&
              !has(state.lighthouse.hasKey ? 'opened-with-key' : 'locked-without-key')
            ? state.lighthouse.hasKey
              ? 'door-with'
              : 'door-without'
            : !has('locked-without-key')
              ? 'door-compare-without'
              : 'door-compare-with'
      break
    case 'lighthouse-position':
      id = ['x-plus', 'x-minus', 'y-plus', 'y-minus'].every(has)
        ? 'position-complete'
        : has('x-plus') && has('x-minus')
          ? 'position-height'
          : has('y-plus') && has('y-minus')
            ? 'position-width'
            : 'position-start'
      break
    case 'touch-response':
      // ⭐ 08/11/2026: cada fala pede o próximo teste, na ordem que a criança escolher.
      id = ['no-response', 'responds', 'second-target'].every(has)
        ? 'touch-complete'
        : state.match.gardenFound?.length === 2
          ? 'touch-exhausted'
          : !state.match.touch
            ? !has('no-response')
              ? has('responds')
                ? 'touch-remove'
                : 'touch-first'
              : !has('responds')
                ? 'touch-nothing'
                : 'touch-with'
            : !has('responds')
              ? 'touch-with-first'
              : !has('second-target')
                ? 'touch-with'
                : 'touch-remove'
      break
    case 'timed-bridge':
      id = ponteGuidance(state, has)
      break
    case 'coin-counter':
      id = moedasGuidance(state, has)
      break
    case 'symbol-sequence':
      id = simbolosGuidance(state, has)
      break
    case 'two-pieces':
      id = cabanaGuidance(state, has)
      break
    case 'found-counter':
      // ⭐ 08/11/2026: a fala pede o primeiro teste que falta (achar, outro, grama, repetir, recomeçar).
      id = !has('first-find')
        ? 'count-start'
        : !has('second-find')
          ? 'count-add'
          : !has('no-find')
            ? 'count-empty'
            : !has('repeat')
              ? 'count-repeat'
              : !has('back-to-zero')
                ? 'count-restart'
                : 'count-complete'
      break
  }
  // A Nave usa as telas do andar com a nave (02/11/2026): a variante `-nave` da fala, quando existe.
  if (activity.scene === 'lighthouse-walk' && activity.cenario === 'nave') {
    const daNave = `${id}-nave` as keyof typeof speech
    if (daNave in speech) return { id: daNave, text: speech[daNave] }
  }
  return { id, text: speech[id] }
}
