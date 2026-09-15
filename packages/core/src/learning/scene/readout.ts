import type { SceneId } from './actions'
import { castText, type SceneCast } from './cast'
import { type SceneState, sceneContact } from './state'

/**
 * O que a cena DIZ de si mesma: a faixa de estado e a frase da situação.
 *
 * Dois buracos de ensino, um arquivo só.
 *
 * ⚠️ O primeiro é a faixa. Os números que a criança vai digitar no bloco do Estúdio — o x, o
 * impulso, o limite, o placar — não apareciam em lugar nenhum do palco: ela mexia num controle e
 * via o desenho mudar, mas nada ligava o VALOR ao que aconteceu. O Brilliant põe esse par acima
 * da cena (`truckX = 7 · deliveryY = ?`) e é o elo que faltava aqui.
 *
 * ⚠️ O segundo é a frase. O player caía em "Siga a missão e observe o resultado" sempre que o
 * motor não tinha escrito um `state.caption` para AQUELA ação — o que acontece na maioria das
 * cenas, porque o `caption` nasce de ações pontuais (saltar, avançar o relógio, sortear) e não
 * do estado. A frase genérica é a mesma nas catorze cenas e não diz nada sobre o que está na
 * tela agora. Aqui ela descreve a SITUAÇÃO, sempre derivada do estado.
 *
 * Fica no core, e não no player, porque é conteúdo pedagógico: a mesma frase precisa valer para
 * o aluno, para o ensaio do admin e para qualquer superfície que venha depois — e porque assim
 * ela é testável sem navegador.
 */

/** Um par nome/valor da faixa. O `tone` diz qual papel a medida tem na descoberta. */
export interface SceneReading {
  /** Como a criança chama a coisa. Nunca o nome do campo. */
  label: string
  /** Já formatado para leitura: a faixa não faz conta nem arredonda depois. */
  value: string
  /**
   * `a` e `b` são o PAR de comparação da cena (as mesmas cores do desenho: A azul, B laranja);
   * `plain` é medida de apoio; `alert` é o estado que a cena quer que salte aos olhos.
   */
  tone: 'a' | 'b' | 'plain' | 'alert'
}

const liga = (on: boolean) => (on ? 'ligada' : 'desligada')
const TELA: Record<string, string> = { start: 'Início', playing: 'Jogando', end: 'Fim' }

/**
 * Os valores vivos da cena, na ordem em que ajudam a entender o que está acontecendo.
 *
 * ⚠️ Máximo de três leituras por cena, de propósito: a faixa é uma linha que a criança varre
 * com os olhos antes de voltar ao palco, não um painel de instrumentos. Quando havia um quarto
 * candidato, ele já estava dito no próprio desenho (a altura tem régua, os cactos se contam).
 */
export function sceneReadout(scene: SceneId, state: SceneState, cast?: SceneCast): SceneReading[] {
  // ⚠️ O VALOR também passa pelo elenco, não só o rótulo: em `layers` o valor É o nome do
  // personagem ("o Dino", "a floresta"), e vesti-lo pela metade deixava a faixa falando de
  // dois elencos ao mesmo tempo. Achado do full review de 14/09/2026.
  return leituras(scene, state).map((l) => ({
    ...l,
    label: castText(l.label, cast),
    value: castText(l.value, cast),
  }))
}

function leituras(scene: SceneId, state: SceneState): SceneReading[] {
  switch (scene) {
    case 'coordinates':
      // A faixa que a cena inteira existe para criar: o par que ela vai digitar no bloco.
      return [
        { label: 'x', value: String(state.place.x), tone: 'a' },
        { label: 'y', value: String(state.place.y), tone: 'b' },
        { label: 'tela', value: '480 por 270', tone: 'plain' },
      ]
    case 'stage-size':
      return [
        { label: 'largura', value: String(state.stage.width), tone: 'a' },
        { label: 'altura', value: String(state.stage.height), tone: 'b' },
        {
          label: 'borda',
          value: state.stage.border ? 'aparecendo' : 'escondida',
          tone: state.stage.border ? 'plain' : 'alert',
        },
      ]
    case 'draw-loop':
      return [
        {
          label: 'desenhar a cada quadro',
          value: state.render.loop ? 'ligado' : 'desligado',
          tone: 'a',
        },
        { label: 'limpar antes', value: state.render.erase ? 'ligado' : 'desligado', tone: 'b' },
        { label: 'Dinos na tela', value: String(Math.max(1, state.render.trail)), tone: 'plain' },
      ]
    case 'screen-reader':
      return [
        {
          label: 'descrição',
          value: state.description.text ? 'escrita' : 'vazia',
          tone: state.description.text ? 'a' : 'alert',
        },
        {
          // ⚠️ A faixa é uma linha para varrer com os olhos: o texto inteiro (até 200 letras)
          // a estouraria. Quem mostra o que foi lido, por inteiro, é o painel do leitor.
          label: 'o que a pessoa ouviu',
          value: state.description.heard ? 'a tela foi lida' : 'nada ainda',
          tone: 'b',
        },
      ]
    case 'frames':
      return [
        { label: 'quadro', value: `${state.animation.frame} de 2`, tone: 'a' },
        { label: 'trocas por segundo', value: String(state.animation.rate), tone: 'b' },
        // ⚠️ A troca parada NÃO é alerta: é onde a cena começa e onde a criança DEVE ficar para
        // ver os dois desenhos parados. O tom de alerta é para falta (a descrição vazia, a borda
        // escondida, o fantasma desligado), não para um estado legítimo do percurso.
        {
          label: 'troca',
          value: state.animation.playing ? 'andando' : 'parada',
          tone: 'plain',
        },
      ]
    case 'onion-skin':
      return [
        { label: 'quadro', value: `${state.animation.frame} de 2`, tone: 'a' },
        { label: 'passo do quadro 2', value: String(state.animation.shift), tone: 'b' },
        {
          label: 'fantasma',
          value: state.animation.onion ? 'ligado' : 'desligado',
          tone: state.animation.onion ? 'plain' : 'alert',
        },
      ]
    case 'symmetry':
      return [
        // Mesma régua: pintar sem espelho é a PRIMEIRA descoberta da cena, não uma falta.
        { label: 'espelho', value: state.mirror.on ? 'ligado' : 'desligado', tone: 'a' },
        { label: 'eixo na linha', value: String(state.mirror.line), tone: 'b' },
        { label: 'traços no papel', value: String(state.mirror.painted.length), tone: 'plain' },
      ]
    case 'pixel-vector':
      return [
        {
          label: 'pedra',
          value: state.pixels.kind === 'pixel' ? 'de pixel' : 'de vetor',
          tone: 'a',
        },
        { label: 'lupa', value: `${state.pixels.zoom} vezes`, tone: 'b' },
        {
          label: 'borda',
          value:
            state.pixels.zoom < 5
              ? 'de longe, igual'
              : state.pixels.kind === 'pixel'
                ? 'escadinha'
                : 'lisa',
          tone: 'plain',
        },
      ]
    case 'sheet-vs-sprite':
      return [
        { label: 'pedaço da folha', value: `${state.sheet.cell} de 4`, tone: 'a' },
        { label: 'tamanho no jogo', value: String(state.sheet.size), tone: 'b' },
        // ⚠️ A folha é CONSTANTE, e por isso está na faixa: é justamente o número que não muda
        // quando o outro muda que faz a criança ver que são duas coisas diferentes.
        { label: 'folha', value: '64 por 64', tone: 'plain' },
      ]
    case 'lives':
      return [
        { label: 'vidas', value: String(state.lifeline.lives), tone: 'a' },
        { label: 'pontos', value: String(state.lifeline.points), tone: 'b' },
        {
          label: 'batidas',
          value: String(state.lifeline.hits),
          tone: state.lifeline.lives === 0 ? 'alert' : 'plain',
        },
      ]
    case 'world':
      return [
        // ⚠️ O rótulo NÃO usa particípio ("Dino criado"): ele concordaria com o personagem, e
        // um elenco feminino leria "nave criado". O que é constante aqui é o lugar.
        {
          label: 'o Dino nos bastidores',
          value: state.world.created ? 'existe' : 'ainda não',
          tone: 'a',
        },
        { label: 'desenho', value: state.world.drawn ? 'ligado' : 'desligado', tone: 'b' },
      ]
    case 'layers':
      return [
        {
          label: 'quem é desenhado por último',
          value: state.world.front ? 'o Dino' : 'a floresta',
          tone: 'a',
        },
        {
          label: 'quem aparece na frente',
          value: state.world.front ? 'o Dino' : 'a floresta',
          tone: 'b',
        },
      ]
    case 'gravity':
      return [
        { label: 'gravidade', value: liga(state.flight.gravity), tone: 'a' },
        { label: 'impulso', value: String(state.flight.force), tone: 'plain' },
        { label: 'altura do salto', value: String(Math.round(state.flight.peak)), tone: 'b' },
      ]
    case 'impulse':
      return [
        { label: 'impulso', value: String(state.flight.force), tone: 'a' },
        { label: 'altura do salto', value: String(Math.round(state.flight.peak)), tone: 'b' },
      ]
    case 'jump-sound':
      return [
        { label: 'som no salto', value: liga(state.sound.onJump), tone: 'a' },
        { label: 'saltos', value: String(state.sound.jumps), tone: 'plain' },
        { label: 'sons', value: String(state.sound.count), tone: 'b' },
      ]
    case 'spawn':
      return [
        { label: 'nascimento por relógio', value: liga(state.crowd.timer), tone: 'a' },
        { label: 'intervalo', value: `${state.crowd.interval}s`, tone: 'plain' },
        { label: 'cactos que nasceram', value: String(state.crowd.born), tone: 'b' },
      ]
    case 'cleanup':
      return [
        { label: 'remoção na saída', value: liga(state.crowd.cleanup), tone: 'a' },
        { label: 'cactos na tela', value: String(state.crowd.cacti.length), tone: 'plain' },
        {
          label: 'guardados nos bastidores',
          value: String(state.crowd.born - state.crowd.removed),
          tone: 'b',
        },
      ]
    case 'game-state':
      return [
        { label: 'tela', value: TELA[state.match.screen] ?? state.match.screen, tone: 'a' },
        { label: 'relógio dentro de Se jogando', value: liga(state.match.guarded), tone: 'b' },
      ]
    case 'controls':
      return [
        { label: 'tela', value: TELA[state.match.screen] ?? state.match.screen, tone: 'a' },
        { label: 'começar por toque', value: liga(state.match.touch), tone: 'b' },
      ]
    case 'restart':
      return [
        { label: 'tela', value: TELA[state.match.screen] ?? state.match.screen, tone: 'a' },
        { label: 'ligação de Jogar de novo', value: liga(state.match.restartConnected), tone: 'b' },
      ]
    case 'hitbox':
      return [
        { label: 'distância do cacto', value: String(state.contact.distance), tone: 'a' },
        { label: 'área do Dino', value: String(state.contact.width), tone: 'b' },
        {
          label: 'as áreas',
          value: sceneContact(state.contact) ? 'se tocam' : 'estão separadas',
          tone: sceneContact(state.contact) ? 'alert' : 'plain',
        },
      ]
    case 'score':
      return [
        { label: 'tela', value: TELA[state.match.screen] ?? state.match.screen, tone: 'a' },
        {
          label: 'Somar ponto dentro de Se jogando',
          value: liga(state.match.guarded),
          tone: 'plain',
        },
        { label: 'pontos', value: String(state.match.points), tone: 'b' },
      ]
    case 'random':
      return [
        {
          label: 'posições sorteadas',
          value: String(state.speed.samples.positions.length),
          tone: 'a',
        },
        {
          label: 'velocidades sorteadas',
          value: String(state.speed.samples.velocities.length),
          tone: 'b',
        },
      ]
    case 'acceleration':
      return [
        { label: 'velocidade do próximo cacto', value: String(state.speed.base), tone: 'a' },
        { label: 'limite', value: liga(state.speed.limited), tone: 'b' },
        { label: 'passos do relógio', value: String(state.speed.ticks), tone: 'plain' },
      ]
  }
}

/**
 * A frase embaixo do palco: o que está acontecendo AGORA.
 *
 * O `state.caption` do motor tem prioridade — ele narra o ACONTECIMENTO (o salto que aconteceu,
 * o sorteio que saiu) e é mais específico do que qualquer descrição de estado. Esta função é o
 * que entra quando não houve acontecimento nenhum: na abertura da cena, depois de desfazer,
 * depois de mexer num controle que o motor não legenda.
 */
export function sceneSituation(scene: SceneId, state: SceneState, cast?: SceneCast): string {
  return castText(situacao(scene, state), cast)
}

function situacao(scene: SceneId, state: SceneState): string {
  const c = state.caption.trim()
  if (c) return c
  switch (scene) {
    case 'coordinates':
      return `O Dino está em x ${state.place.x}, y ${state.place.y}.`
    case 'stage-size':
      return state.stage.border
        ? `Tela de ${state.stage.width} por ${state.stage.height}, com a moldura à vista.`
        : `Tela de ${state.stage.width} por ${state.stage.height}. Sem a moldura, a cor do fundo cobre tudo.`
    case 'draw-loop':
      return state.render.loop
        ? state.render.erase
          ? 'Desenhando a cada quadro e limpando antes: é assim que o jogo se mexe.'
          : 'Desenhando a cada quadro, sem limpar. Avance o relógio e veja o que fica para trás.'
        : 'Ninguém está mandando desenhar de novo. Avance o relógio e veja se a tela muda.'
    case 'screen-reader':
      return state.description.text
        ? 'A descrição está escrita. Aperte Ouvir a tela para saber o que ela informa.'
        : 'A descrição está vazia. Ouça a tela assim mesmo, para saber o que a pessoa recebe.'
    case 'frames':
      return state.animation.playing
        ? `A troca está andando a ${state.animation.rate} por segundo. Olhe o fogo da nave.`
        : `O quadro ${state.animation.frame} está parado na tela. Os dois são desenhos inteiros.`
    case 'onion-skin':
      return state.animation.onion
        ? state.animation.frame === 2
          ? `O fantasma do quadro 1 aparece por baixo, e o passo está em ${state.animation.shift}.`
          : 'No quadro 1 não há quadro anterior para o fantasma mostrar.'
        : `O fantasma está desligado: o passo de ${state.animation.shift} é chute.`
    case 'symmetry':
      return state.mirror.on
        ? `O espelho está na linha ${state.mirror.line}: cada traço aparece dos dois lados.`
        : 'O espelho está desligado: cada traço fica só do lado em que você pintar.'
    case 'pixel-vector':
      return state.pixels.zoom < 5
        ? `De longe, com a lupa em ${state.pixels.zoom}, as duas pedras parecem a mesma.`
        : state.pixels.kind === 'pixel'
          ? `Com a lupa em ${state.pixels.zoom}, a borda da pedra de pixel vira escadinha.`
          : `Com a lupa em ${state.pixels.zoom}, a borda da pedra de vetor continua lisa.`
    case 'sheet-vs-sprite':
      return `O pedaço ${state.sheet.cell} está recortado e aparece com ${state.sheet.size} no jogo. A folha segue de 64 por 64.`
    case 'lives':
      return state.lifeline.lives === 0
        ? `Sem vidas, a partida acabou. O placar guardou ${state.lifeline.points}.`
        : `${state.lifeline.lives} vidas e ${state.lifeline.points} pontos. ${
            state.lifeline.onHit
              ? 'A batida custa uma vida.'
              : 'A batida ainda não custa nada: falta o fio da vida.'
          }`
    case 'world':
      // ⚠️ Sem particípio solto ("foi criado") e sem pronome ("ele aparece"): os dois
      // concordam com o personagem, e o elenco só sabe flexionar o que está colado ao nome.
      return state.world.created
        ? state.world.drawn
          ? 'O Dino existe nos bastidores e o desenho está ligado, então aparece na tela.'
          : 'O Dino já existe nos bastidores, mas nada foi mandado desenhar ainda.'
        : 'Os bastidores estão vazios: ninguém foi criado ainda.'
    case 'layers':
      return state.world.front
        ? 'O Dino vem por último na faixa de desenho e aparece na frente da floresta.'
        : 'A floresta vem por último na faixa de desenho e cobre o Dino.'
    case 'gravity':
      return state.flight.gravity
        ? 'A gravidade está ligada: o Dino sobe e volta ao chão.'
        : 'A gravidade está desligada: quem sobe não tem o que o traga de volta.'
    case 'impulse':
      return state.flight.peak > 0
        ? `Com impulso ${state.flight.force}, o salto mais alto até agora chegou a ${Math.round(state.flight.peak)}.`
        : `O impulso está em ${state.flight.force}. Faça o Dino saltar para ver a altura.`
    case 'jump-sound':
      return state.sound.onJump
        ? `O som está ligado ao salto: ${state.sound.jumps} saltos e ${state.sound.count} sons.`
        : `O som está solto do salto: ${state.sound.jumps} saltos e ${state.sound.count} sons.`
    case 'spawn':
      return state.crowd.timer
        ? `Os cactos nascem a cada ${state.crowd.interval}s. Já nasceram ${state.crowd.born}.`
        : 'Nada liga o relógio ao nascimento dos cactos ainda.'
    case 'cleanup':
      return state.crowd.cleanup
        ? `Quem sai da pista é removido: ${state.crowd.removed} de ${state.crowd.born} já saíram dos bastidores.`
        : `Quem sai da pista continua guardado: ${state.crowd.born - state.crowd.removed} cactos nos bastidores.`
    case 'game-state':
      return `Tela ${(TELA[state.match.screen] ?? state.match.screen).toLowerCase()}. O relógio ${state.match.guarded ? 'está dentro de Se jogando' : 'corre em qualquer tela'}.`
    case 'controls':
      return state.match.touch
        ? 'O toque está ligado ao início: a tela cumpre o que promete.'
        : 'A tela convida a tocar, mas o toque não está ligado ao início da partida.'
    case 'restart':
      return state.match.restartConnected
        ? 'Jogar de novo está ligado: o fim da partida tem saída.'
        : 'Nada liga Jogar de novo ao começo de outra partida.'
    case 'hitbox':
      return sceneContact(state.contact)
        ? `Distância ${state.contact.distance} e área ${state.contact.width}: as áreas encostam, e é aí que a batida acontece.`
        : `Distância ${state.contact.distance} e área ${state.contact.width}: as áreas ainda não se tocam.`
    case 'score':
      return state.match.guarded
        ? `Somar ponto está dentro de Se jogando. Placar: ${state.match.points}.`
        : `Somar ponto está solto, fora da condição. Placar: ${state.match.points}.`
    case 'random':
      return state.speed.samples.positions.length + state.speed.samples.velocities.length > 0
        ? `Sorteios guardados: ${state.speed.samples.positions.length} de posição e ${state.speed.samples.velocities.length} de velocidade.`
        : 'Nenhum sorteio ainda. Acione o sorteador para comparar os resultados.'
    case 'acceleration':
      return state.speed.limited
        ? `O próximo cacto sai com velocidade ${state.speed.base}, e a placa de limite está no lugar.`
        : `O próximo cacto sai com velocidade ${state.speed.base}, sem limite nenhum para segurar.`
  }
}
