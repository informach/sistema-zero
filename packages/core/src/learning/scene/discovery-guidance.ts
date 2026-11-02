import type { SceneId } from './actions'
import type { SceneActivity } from './index'
import { ISLAND_SPEECH, islandGuidance } from './island-3d'
import type { SceneState } from './state'

/** Shared authored speech: player and recording inventory always use the same text. */
const speech = {
  ...ISLAND_SPEECH,
  // ⭐ "O jogo em câmera lenta" (Farol, Dia 1, 01/11/2026): só a IDEIA (quadro, passinho, seta). Os
  // blocos aparecem só na montagem do Estúdio; aqui não se fala de bloco, regra nem comando.
  'slow-start':
    'Clique em Câmera lenta para os quadros passarem devagar. Depois segure a seta e veja o personagem dar um passinho a cada quadro.',
  'slow-walking':
    'Um quadro novo, um passinho, uma pegada. Agora solte a seta e deixe passar uns quadros.',
  'slow-released':
    'Os quadros continuam passando, mas sem a seta ele fica no lugar. Agora clique em Velocidade de verdade e segure a seta.',
  'slow-real':
    'Continue segurando: com os quadros passando bem rápido, os passinhos viram uma caminhada.',
  'slow-complete':
    'Você viu os passinhos, a parada e a caminhada. Se quiser, tente chegar à chave em câmera lenta e conte os quadros.',
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
  'memory-edited':
    'Você mudou a regra para o próximo encontro. A coleta que já aconteceu continua como estava. Recomece a partida para testar a mudança.',
  'memory-first-saved':
    'Pode começar guardando a coleta. Depois experimente outra partida sem a ação de guardar e compare.',
  'memory-first':
    'Encoste na chave e compare o que some com o que fica guardado. Você pode mudar a regra e repetir em outra partida.',
  'memory-compare':
    'Você viu a chave sumir sem guardar. Experimente adicionar a ação de guardar e encostar numa chave de uma nova partida.',
  'memory-away':
    'Você comparou os dois modos. Depois de uma coleta guardada, afaste o personagem e observe se a memória muda.',
  'memory-restart':
    'Afastar não apagou a memória. Quando quiser, recomece uma partida depois de guardar a coleta.',
  'memory-complete':
    'Você comparou os quatro casos. Continue adicionando ou retirando a ação de guardar, recolhendo a chave e recomeçando.',
  'door-with':
    'Neste teste, o personagem está com a chave. Teste a porta quando quiser. Também pode mudar a situação antes de testar.',
  'door-without':
    'Neste teste, o personagem está sem a chave. Teste a porta quando quiser. Também pode mudar a situação antes de testar.',
  'door-compare-without':
    'A porta abriu com a chave. Tire a chave do personagem e teste outra vez para comparar.',
  'door-compare-with':
    'Sem chave, a porta avisou. Experimente dar a chave ao personagem e testar novamente. Você também pode repetir este caso.',
  'door-complete':
    'Você testou com e sem chave. Pode mudar de situação e testar a porta quantas vezes quiser.',
  'position-start':
    'O x muda o lugar para os lados. Experimente ir e voltar. O y também está livre: você escolhe o que explorar primeiro.',
  'position-height':
    'Você comparou os lados. Agora experimente aumentar e diminuir o y, observando a altura. Pode continuar mexendo no x também.',
  'position-complete':
    'Você explorou as quatro direções. Continue escolhendo lugares. Se quiser um desafio, mostre um alvo e leve a chave até ele.',
  'touch-first':
    'Escolha um esconderijo e toque nele. A reação está desligada. Você também pode ligá-la primeiro e depois comparar.',
  'touch-with-first':
    'A reação está ligada. Escolha um esconderijo para testar. Quando quiser comparar, desligue a reação e toque em um esconderijo ainda visível.',
  'touch-with':
    'A reação está ligada. Toque em um esconderijo e veja qual deles fica invisível. Você pode escolher qualquer um.',
  'touch-exhausted':
    'Os dois personagens apareceram. Use Esconder de novo para preparar outro teste. Você pode mudar a ligação antes ou depois.',
  'touch-complete':
    'Você comparou os dois modos e os dois esconderijos. Pode esconder os personagens de novo e experimentar outras sequências.',
  'count-start':
    'Escolha onde tocar no jardim. Você pode procurar personagens, tocar no vazio e recomeçar quando quiser.',
  'count-empty':
    'Você tocou no vazio. Compare o valor guardado com o placar. Experimente outro lugar quando quiser.',
  'count-repeat':
    'Você repetiu o toque. Compare o valor guardado com o placar. Pode procurar outro personagem ou recomeçar.',
  'count-add':
    'Um novo personagem apareceu. Compare o valor anterior, a soma e o valor de agora. Você pode repetir o toque ou escolher outro lugar.',
  'count-restart':
    'A busca recomeçou com zero. As comparações já feitas continuam marcadas. Você pode experimentar outra sequência.',
  'count-complete':
    'Você comparou novos achados, vazio, repetição e reinício. Continue explorando na ordem que quiser.',
} as const
export function discoverySpeechSteps(scene?: SceneId) {
  const prefixes =
    scene === 'island-3d'
      ? ['island']
      : scene === 'touch-response'
        ? ['touch']
        : scene === 'found-counter'
          ? ['count']
          : scene === 'lighthouse-walk'
            ? ['slow', 'walk', 'edge']
            : scene === 'collect-and-remember'
              ? ['memory']
              : scene === 'lighthouse-key'
                ? ['door']
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
  let id: keyof typeof speech = 'count-start'
  switch (activity.scene) {
    case 'lighthouse-walk':
      if (activity.setup?.goals?.includes('left-the-screen'))
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
      else if (activity.setup?.goals?.includes('walked-real-speed'))
        id = !has('moves-each-frame')
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
          : !has('collected-without-memory')
            ? state.collection.remember
              ? 'memory-first-saved'
              : 'memory-first'
            : !has('collected-with-memory')
              ? 'memory-compare'
              : !has('remembered-after-leaving')
                ? 'memory-away'
                : !has('reset-after-remembering')
                  ? 'memory-restart'
                  : 'memory-complete'
      break
    case 'lighthouse-key':
      id =
        has('opened-with-key') && has('locked-without-key')
          ? 'door-complete'
          : state.lighthouse.checkedKey == null
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
          : 'position-start'
      break
    case 'touch-response':
      id = ['no-response', 'responds', 'second-target'].every(has)
        ? 'touch-complete'
        : state.match.gardenFound?.length === 2
          ? 'touch-exhausted'
          : !state.match.touch
            ? 'touch-first'
            : !has('no-response')
              ? 'touch-with-first'
              : 'touch-with'
      break
    case 'found-counter':
      id = ['first-find', 'second-find', 'no-find', 'repeat', 'back-to-zero'].every(has)
        ? 'count-complete'
        : state.match.counterUpdate?.kind === 'empty'
          ? 'count-empty'
          : state.match.counterUpdate?.kind === 'repeat'
            ? 'count-repeat'
            : state.match.counterUpdate?.kind === 'add'
              ? 'count-add'
              : state.match.counterUpdate?.kind === 'reset'
                ? 'count-restart'
                : 'count-start'
      break
  }
  return { id, text: speech[id] }
}
