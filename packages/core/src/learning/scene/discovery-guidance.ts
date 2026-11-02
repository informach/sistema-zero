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
  'slow-start':
    'Clique em Câmera lenta e segure a seta. Olhe a tira: o que muda de um quadro para o outro?',
  'slow-walking':
    'Um quadro novo, um passinho. E se você soltar a seta? Em câmera lenta, observe os próximos quadros na tira.',
  'slow-released':
    'Sem a seta, os quadros continuam passando, mas ele fica no lugar. E na velocidade de verdade, como fica? Clique em Velocidade de verdade e segure a seta.',
  'slow-real': 'Continue segurando e compare com a câmera lenta: o que mudou?',
  'slow-complete':
    'Você viu os passinhos, a parada e a caminhada. Se quiser, tente chegar à chave em câmera lenta e conte os quadros.',
  // ⭐ "A beirada da tela" (Farol, Dia 1, parte 5, 01/11/2026): só a ideia, sem blocos nem ordem dos
  // blocos. A ordem aparece dentro de cada quadro: primeiro o passinho, depois a conferência.
  // ⚠️ Em câmera lenta, ir do meio da tela até a beirada leva uns 40 s: o caminho até lá é na
  // velocidade de verdade, e a câmera lenta só na beirada (o botão em destaque acompanha).
  'border-start':
    'O limite está desligado. Clique em Velocidade de verdade e leve o personagem até a beirada. Continue segurando a seta e observe a faixa fora da tela. Se preferir, ligue o limite primeiro e compare depois.',
  'border-off':
    'O limite está desligado. Clique em Velocidade de verdade e leve o personagem até a beirada. Continue segurando a seta e observe a faixa fora da tela.',
  'border-out':
    'Ele saiu da janela do jogo. E se você ligar o limite agora, com ele fora? Clique em Ligar o limite da tela e observe o próximo quadro.',
  'border-on-out': 'O limite está ligado e ele ainda está fora. Deixe passar um quadro e observe.',
  'border-back':
    'Ele voltou para dentro: em todo quadro, o jogo confere a beirada. E se você segurar a seta junto à beirada? Clique em Câmera lenta e olhe cada quadro.',
  'border-edge':
    'O limite está ligado. Leve o personagem até a beirada e continue segurando a seta. Lá, clique em Câmera lenta e observe a tira e a frase de cada quadro.',
  'border-edge-off':
    'Ligue o limite da tela e leve o personagem até a beirada. Lá, clique em Câmera lenta, segure a seta e observe a tira e a frase de cada quadro.',
  'border-hold':
    'Em cada quadro, o passinho ia levar ele para fora, e depois o jogo confere a beirada e segura ele dentro. Quer comparar? Desligue o limite e deixe ele ir até a beirada.',
  'border-complete':
    'Você viu ele sair, voltar e ficar na beirada. Pode continuar experimentando: ligue e desligue o limite quando quiser.',
  // A Nave contra Asteroides (02/11/2026) usa as mesmas telas do andar com a nave: as falas sem
  // "personagem", "ele" nem a chave do Farol. A escolha acrescenta `-nave` à chave quando existe.
  'slow-released-nave':
    'Sem a seta, os quadros continuam passando, mas a nave fica no lugar. E na velocidade de verdade, como fica? Clique em Velocidade de verdade e segure a seta.',
  'slow-complete-nave':
    'Você viu os passinhos, a parada e o voo. Pode continuar comparando a câmera lenta com a velocidade de verdade.',
  'border-start-nave':
    'O limite está desligado. Clique em Velocidade de verdade e leve a nave até a beirada. Continue segurando a seta e observe a faixa fora da tela. Se preferir, ligue o limite primeiro e compare depois.',
  'border-off-nave':
    'O limite está desligado. Clique em Velocidade de verdade e leve a nave até a beirada. Continue segurando a seta e observe a faixa fora da tela.',
  'border-out-nave':
    'A nave saiu da janela do jogo. E se você ligar o limite agora, com a nave fora? Clique em Ligar o limite da tela e observe o próximo quadro.',
  'border-on-out-nave':
    'O limite está ligado e a nave ainda está fora. Deixe passar um quadro e observe.',
  'border-back-nave':
    'A nave voltou para dentro: em todo quadro, o jogo confere a beirada. E se você segurar a seta junto à beirada? Clique em Câmera lenta e olhe cada quadro.',
  'border-edge-nave':
    'O limite está ligado. Leve a nave até a beirada e continue segurando a seta. Lá, clique em Câmera lenta e observe a tira e a frase de cada quadro.',
  'border-edge-off-nave':
    'Ligue o limite da tela e leve a nave até a beirada. Lá, clique em Câmera lenta, segure a seta e observe a tira e a frase de cada quadro.',
  'border-hold-nave':
    'Em cada quadro, o passinho ia levar a nave para fora, e depois o jogo confere a beirada e segura a nave dentro. Quer comparar? Desligue o limite e deixe a nave ir até a beirada.',
  'border-complete-nave':
    'Você viu a nave sair, voltar e ficar na beirada. Pode continuar experimentando: ligue e desligue o limite quando quiser.',
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
  'memory-edited':
    'Você mudou a memória da chave. temChave continua como estava, porque a mudança só vale para o próximo encontro. Recomece a partida para testar.',
  'memory-first-saved':
    'A memória da chave está ligada. Encoste na chave e observe três coisas: a chave, o aviso e temChave. Se preferir, desligue a memória primeiro e compare depois.',
  'memory-first':
    'A memória da chave está desligada. Encoste na chave e observe três coisas: a chave, o aviso e temChave. Se preferir, ligue a memória primeiro e compare depois.',
  'memory-compare':
    'Sem a memória, a chave saiu do chão e o aviso mudou, mas temChave continuou falso. E com a memória ligada, o que muda? Teste numa partida nova com a memória ligada e observe temChave.',
  'memory-compare-off':
    'Com a memória ligada, a chave saiu do chão, o aviso mudou e temChave virou verdadeiro. E com a memória desligada, o que muda? Teste numa partida nova com a memória desligada e observe temChave.',
  'memory-away':
    'Você comparou a memória ligada e desligada. E se o personagem se afastar depois de o jogo guardar a chave, temChave muda? Depois de pegar a chave com a memória ligada, clique em Afastar e observe.',
  'memory-restart':
    'Afastar não apagou temChave: o jogo continua lembrando, mesmo longe da chave. E numa partida nova, o que acontece com temChave? Depois de guardar a chave, clique em Recomeçar a partida e observe.',
  'memory-complete':
    'Você comparou os quatro casos. Só com a memória ligada temChave vira verdadeiro, e ele continua assim mesmo longe da chave. Numa partida nova, o jogo começa do zero, e temChave volta a falso. Pode continuar ligando e desligando a memória e testando de novo.',
  'door-with':
    'O personagem está com a chave. O que você acha que a porta vai fazer? Teste a porta e observe temChave e a resposta que ela escolhe.',
  'door-without':
    'O personagem está sem a chave. O que você acha que a porta vai fazer? Teste a porta e observe temChave e a resposta que ela escolhe.',
  'door-compare-without':
    'Com temChave verdadeiro, a resposta foi sim: a porta abriu e o farol acendeu. E sem a chave, o que a porta faz? Tire a chave do personagem e teste a mesma porta.',
  'door-compare-with':
    'Com temChave falso, a resposta foi não: a porta ficou fechada e avisou que falta a chave. E com a chave, o que a porta faz? Dê a chave ao personagem e teste a mesma porta.',
  'door-complete':
    'A pergunta foi a mesma nas duas vezes. O que mudou foi o valor de temChave, e por isso a porta escolheu outra resposta. Pode mudar a situação e testar quantas vezes quiser.',
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
  'position-start':
    'Mude só o x, para mais ou para menos, e observe a chave. Para onde ela vai? O y também está livre: você escolhe o que explorar primeiro.',
  'position-height':
    'O x leva a chave para os lados: um x maior leva para a direita, e um menor, para a esquerda. E o y? Aumente e diminua o y e observe a chave.',
  'position-width':
    'O y leva a chave para cima e para baixo: um y maior leva para baixo, e um menor, para cima, porque na tela do jogo a contagem começa em zero lá em cima. E o x? Aumente e diminua o x e observe a chave.',
  'position-complete':
    'O x leva a chave para os lados, e o y, para cima e para baixo. Repare: um y maior leva a chave para baixo, porque na tela do jogo a contagem começa em zero lá em cima. Continue escolhendo lugares ou mostre um alvo e leve a chave até ele.',
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
  // A Nave usa as telas do andar com a nave (02/11/2026): a variante `-nave` da fala, quando existe.
  if (activity.scene === 'lighthouse-walk' && activity.cenario === 'nave') {
    const daNave = `${id}-nave` as keyof typeof speech
    if (daNave in speech) return { id: daNave, text: speech[daNave] }
  }
  return { id, text: speech[id] }
}
