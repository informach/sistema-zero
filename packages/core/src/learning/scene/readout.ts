import { type SceneId, STAGE_TARGET } from './actions'
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
/** As três alturas de onde a câmera do 3D pode olhar. */
const ALTURA: Record<number, string> = { 0: 'por baixo', 1: 'no meio', 2: 'por cima' }
/**
 * Quantas faces do cubo a câmera vê daqui.
 *
 * ⚠️ É a MESMA regra do motor (`facesÀVista`), reescrita aqui de propósito: a leitura não pode
 * importar o motor (ele já importa a leitura), e a alternativa — guardar o número no estado —
 * faria um campo derivado que todo retrato antigo traria errado. Mexeu num, mexa no outro: a
 * varredura do `engine-scenes.test.ts` compara os dois.
 */
function faces(yaw: number, pitch: number): number {
  const canto = yaw % 2 === 1
  if (pitch === 1) return canto ? 2 : 1
  return canto ? 3 : 2
}
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
    /* ── O núcleo do Iniciante 2D ─────────────────────────────────────────────────────────── */
    case 'velocity':
      // ⚠️ Os DOIS eixos. Mostrando só o `vx`, uma criança que pusesse `vx 0, vy 5` via o Dino
      // descer com a faixa dizendo "velocidade 0" — o rótulo mentindo sobre o estado, na tela
      // que existe justamente para ligar o número ao que se vê.
      return [
        {
          label: 'velocidade',
          value:
            state.drive.vy === 0
              ? String(state.drive.vx)
              : `${state.drive.vx} para o lado · ${state.drive.vy} para baixo`,
          tone: 'a',
        },
        {
          // ⚠️ Os DOIS eixos aqui também: numa cena de velocidade para baixo, o único número
          // que se mexia na faixa era "quadros".
          label: 'onde ele está',
          value:
            state.drive.vy === 0
              ? `x ${Math.round(state.drive.x)}`
              : `x ${Math.round(state.drive.x)} · y ${Math.round(state.drive.y)}`,
          tone: 'b',
        },
        { label: 'quadros', value: String(state.drive.ticks), tone: 'plain' },
      ]
    case 'hold-vs-press':
      return [
        { label: 'quando apertar', value: String(Math.round(state.input.pressX)), tone: 'a' },
        { label: 'está apertada?', value: String(Math.round(state.input.holdX)), tone: 'b' },
        {
          label: 'a tecla',
          value: state.input.holding ? 'segurada' : 'solta',
          tone: state.input.holding ? 'alert' : 'plain',
        },
      ]
    case 'variable':
      return [
        { label: 'guardado na caixa', value: String(state.box.value), tone: 'a' },
        {
          label: 'na tela',
          value: state.box.shown ? String(state.box.value) : 'nada',
          tone: state.box.shown ? 'b' : 'alert',
        },
        { label: 'mudanças', value: String(state.box.changes), tone: 'plain' },
      ]
    case 'group-loop':
      return [
        { label: 'olhados', value: `${state.hunt.looked.length} de 3`, tone: 'a' },
        {
          label: 'escolhido',
          value: state.hunt.chosen ? `o ${state.hunt.chosen}º` : 'nenhum ainda',
          tone: 'b',
        },
        { label: 'laço', value: liga(state.hunt.auto), tone: 'plain' },
      ]
    case 'enemy-type':
      return [
        { label: 'velocidade na ficha', value: String(state.blueprint.speed), tone: 'a' },
        { label: 'vida na ficha', value: String(state.blueprint.life), tone: 'b' },
        { label: 'nasceram', value: String(state.blueprint.born), tone: 'plain' },
      ]
    case 'camera':
      return [
        { label: 'o Dino no mundo', value: String(state.view.heroX), tone: 'a' },
        { label: 'tela', value: `0 a ${STAGE_TARGET.width}`, tone: 'b' },
        {
          label: 'câmera',
          value: state.view.follow ? 'seguindo' : 'parada',
          tone: state.view.follow ? 'plain' : 'alert',
        },
      ]
    case 'contact':
      return [
        { label: 'distância', value: String(state.hit.distance), tone: 'a' },
        {
          label: 'a pergunta',
          value: state.hit.mode === 'ask' ? 'está encostando?' : 'acabou de encostar',
          tone: 'b',
        },
        {
          label: 'vida perdida',
          value: String(state.hit.damage),
          tone: state.hit.damage > 2 ? 'alert' : 'plain',
        },
      ]
    case 'cooldown':
      return [
        { label: 'recarga', value: `${state.weapon.seconds}s`, tone: 'a' },
        { label: 'tiros', value: String(state.weapon.shots), tone: 'b' },
        {
          label: 'pedidos recusados',
          value: String(state.weapon.refused),
          tone: state.weapon.refused > 0 ? 'alert' : 'plain',
        },
      ]
    case 'aim':
      return [
        { label: 'alvo', value: `${state.sight.targetX}, ${state.sight.targetY}`, tone: 'a' },
        { label: 'mira', value: liga(state.sight.chasing), tone: 'b' },
      ]
    case 'diagonal':
      return [
        {
          label: 'setas',
          value:
            state.walkPad.dx !== 0 && state.walkPad.dy !== 0
              ? 'duas'
              : state.walkPad.dx || state.walkPad.dy
                ? 'uma'
                : 'nenhuma',
          tone: 'a',
        },
        { label: 'andou no passo', value: String(state.walkPad.distance), tone: 'b' },
        { label: 'correção', value: liga(state.walkPad.even), tone: 'plain' },
      ]
    case 'tilemap':
      // ⚠️ A linha ESCRITA na faixa é a cena inteira: é ela que a criança compara com o desenho.
      return [
        { label: 'a linha do meio, escrita', value: state.grid.rows[3] ?? '', tone: 'a' },
        { label: 'casas trocadas', value: String(state.grid.edits), tone: 'b' },
        { label: 'o mapa', value: '6 linhas de 10', tone: 'plain' },
      ]
    /* ── O motor, o 3D e o ateliê ──────────────────────────────────────────────────────── */
    case 'pool':
      // ⚠️ Os DOIS contadores lado a lado são a cena: é a diferença entre eles que denuncia o
      // vazamento, e nenhum dos dois sozinho diz nada.
      return [
        { label: 'vivos agora', value: String(state.nursery.alive), tone: 'a' },
        { label: 'criados desde o começo', value: String(state.nursery.created), tone: 'b' },
        { label: 'reciclagem', value: liga(state.nursery.recycling), tone: 'plain' },
      ]
    case 'entity-state':
      return [
        { label: '1º', value: state.brains.states[0] ?? 'parado', tone: 'a' },
        { label: '2º', value: state.brains.states[1] ?? 'parado', tone: 'b' },
        { label: '3º', value: state.brains.states[2] ?? 'parado', tone: 'plain' },
      ]
    case 'delta-time':
      return [
        { label: 'a rápida andou', value: String(Math.round(state.machines.fastX)), tone: 'a' },
        { label: 'a devagar andou', value: String(Math.round(state.machines.slowX)), tone: 'b' },
        {
          label: 'o jogo conta',
          value: state.machines.mode === 'frames' ? 'quadros' : 'segundos',
          tone: 'plain',
        },
      ]
    case 'circle-collision': {
      const soma = state.circles.a + state.circles.b
      return [
        {
          label: 'distância entre os centros',
          value: String(Math.round(state.circles.distance)),
          tone: 'a',
        },
        { label: 'soma dos raios', value: String(soma), tone: 'b' },
        {
          label: 'a conta diz',
          value: state.circles.distance <= soma ? 'bateu' : 'ainda não',
          tone: state.circles.distance <= soma ? 'alert' : 'plain',
        },
      ]
    }
    case 'axis-z':
      return [
        { label: 'x', value: String(state.space.x), tone: 'a' },
        { label: 'y (altura)', value: String(state.space.y), tone: 'b' },
        { label: 'z (profundidade)', value: String(state.space.z), tone: 'plain' },
      ]
    case 'camera-3d':
      return [
        { label: 'volta da câmera', value: `${state.orbit.yaw} de 8`, tone: 'a' },
        { label: 'altura da câmera', value: ALTURA[state.orbit.pitch] ?? 'no meio', tone: 'b' },
        {
          label: 'cores à vista',
          value: String(faces(state.orbit.yaw, state.orbit.pitch)),
          tone: 'plain',
        },
      ]
    case 'mesh':
      return [
        { label: 'raio-X', value: liga(state.model.wire), tone: 'a' },
        { label: 'o que aparece', value: state.model.wire ? 'os pontos' : 'a roupa', tone: 'b' },
      ]
    case 'pick-ray':
      return [
        { label: 'a mira aponta para', value: `${state.ray.x}, ${state.ray.y}`, tone: 'a' },
        {
          label: 'a reta parou em',
          value: state.ray.hit ? `caixa ${state.ray.hit}` : 'nada',
          tone: 'b',
        },
        { label: 'caixas já acertadas', value: String(state.ray.hits.length), tone: 'plain' },
      ]
    case 'fill-stroke':
      return [
        { label: 'miolo', value: state.ink.fill ? 'pintado' : 'vazio', tone: 'a' },
        { label: 'contorno', value: state.ink.stroke ? 'à vista' : 'sem cor', tone: 'b' },
      ]
    case 'shading':
      return [
        { label: 'sombra', value: liga(state.light.shade), tone: 'a' },
        {
          label: 'a luz vem da',
          value: state.light.side === 'left' ? 'esquerda' : 'direita',
          tone: 'b',
        },
        { label: 'cores na forma', value: state.light.shade ? 'duas' : 'uma', tone: 'plain' },
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
    case 'stage-size': {
      // ⭐ A DIFERENÇA até o alvo, em vez de só o valor de agora. É o que o Brilliant faz
      // quando o comando da criança erra: os pontos param ao lado do alvo, e a distância que
      // sobra é a própria correção. Aqui o alvo é a tela que a Aula 1 pede.
      const dl = STAGE_TARGET.width - state.stage.width
      const da = STAGE_TARGET.height - state.stage.height
      const falta =
        dl === 0 && da === 0
          ? ' É a tela que o jogo pede.'
          : ` Para chegar em ${STAGE_TARGET.width} por ${STAGE_TARGET.height}, falta ${[
              dl !== 0 && `${dl > 0 ? 'somar' : 'tirar'} ${Math.abs(dl)} na largura`,
              da !== 0 && `${da > 0 ? 'somar' : 'tirar'} ${Math.abs(da)} na altura`,
            ]
              .filter(Boolean)
              .join(' e ')}.`
      return state.stage.border
        ? `Tela de ${state.stage.width} por ${state.stage.height}, com a moldura à vista.${falta}`
        : `Tela de ${state.stage.width} por ${state.stage.height}. Sem a moldura, a cor do fundo cobre tudo.${falta}`
    }
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
    /* ── O núcleo do Iniciante 2D ─────────────────────────────────────────────────────────── */
    case 'velocity':
      // ⚠️ Os DOIS eixos, como na faixa: com a velocidade só para baixo esta frase afirmava
      // "velocidade 0" embaixo de um palco em que o Dino descia.
      return state.drive.vx === 0 && state.drive.vy === 0
        ? `O Dino está parado em x ${Math.round(state.drive.x)}: a velocidade é zero.`
        : state.drive.vy === 0
          ? `Velocidade ${state.drive.vx} para o lado, e o Dino já está em x ${Math.round(state.drive.x)}.`
          : `Velocidade ${state.drive.vx} para o lado e ${state.drive.vy} para baixo. O Dino está em x ${Math.round(state.drive.x)}, y ${Math.round(state.drive.y)}.`
    case 'hold-vs-press':
      return state.input.holding
        ? 'A tecla está segurada: a de baixo anda enquanto o relógio correr.'
        : `A de cima andou ${state.input.presses} passo(s), um por aperto.`
    case 'variable':
      return state.box.shown
        ? `A caixa guarda ${state.box.value}, e a tela está mostrando esse número.`
        : `A caixa guarda ${state.box.value}, e ninguém está vendo isso na tela.`
    case 'group-loop':
      return state.hunt.auto
        ? 'O laço percorre o grupo sozinho e fica com o mais perto.'
        : `Você olhou ${state.hunt.looked.length} de 3 cactos.`
    case 'enemy-type':
      return `Uma ficha com velocidade ${state.blueprint.speed} e vida ${state.blueprint.life}, e ${state.blueprint.born} já lendo ela.`
    case 'camera':
      return state.view.follow
        ? `A câmera segue o Dino, que está em ${state.view.heroX} do mundo.`
        : `O Dino está em ${state.view.heroX}, e a janela parada mostra de 0 a ${STAGE_TARGET.width}.`
    case 'contact':
      return state.hit.mode === 'ask'
        ? `O jogo pergunta "está encostando?" em todo quadro. Vida perdida: ${state.hit.damage}.`
        : `O jogo espera o acontecimento da batida. Vida perdida: ${state.hit.damage}.`
    case 'cooldown':
      return state.weapon.seconds === 0
        ? `Sem recarga: ${state.weapon.shots} tiro(s) até agora.`
        : `Recarga de ${state.weapon.seconds}s, ${state.weapon.shots} tiro(s) e ${state.weapon.refused} pedido(s) recusado(s).`
    case 'aim':
      return state.sight.chasing
        ? `A mira está ligada e o alvo está em ${state.sight.targetX}, ${state.sight.targetY}.`
        : 'A mira está desligada: o tiro sai sempre para o mesmo lado.'
    case 'diagonal':
      return state.walkPad.even
        ? 'A correção está ligada: os dois caminhos andam o mesmo.'
        : 'Sem correção: apertar duas setas soma os dois passos.'
    case 'tilemap':
      return state.grid.edits === 0
        ? 'O mapa está escrito com letras. Troque uma e olhe o desenho.'
        : `Você já trocou ${state.grid.edits} casa(s), e o desenho acompanhou.`
    /* ── O motor, o 3D e o ateliê ──────────────────────────────────────────────────────── */
    case 'pool':
      return state.nursery.recycling
        ? `Com reciclagem: ${state.nursery.alive} vivo(s) e ${state.nursery.created} criado(s) desde o começo.`
        : `${state.nursery.alive} vivo(s), mas já foram criados ${state.nursery.created} desde o começo.`
    case 'entity-state':
      return `1º ${state.brains.states[0]}, 2º ${state.brains.states[1]}, 3º ${state.brains.states[2]}.`
    case 'delta-time':
      return state.machines.mode === 'frames'
        ? `O jogo conta QUADROS: a rápida está em ${Math.round(state.machines.fastX)} e a devagar em ${Math.round(state.machines.slowX)}.`
        : `O jogo conta SEGUNDOS: a rápida está em ${Math.round(state.machines.fastX)} e a devagar em ${Math.round(state.machines.slowX)}.`
    case 'circle-collision': {
      const soma = state.circles.a + state.circles.b
      return state.circles.distance <= soma
        ? `Distância ${Math.round(state.circles.distance)} contra ${soma} de soma dos raios: é uma batida.`
        : `Distância ${Math.round(state.circles.distance)} contra ${soma} de soma dos raios: ainda não é uma batida.`
    }
    case 'axis-z':
      return state.space.y > 0
        ? `x ${state.space.x}, y ${state.space.y}, z ${state.space.z}. Ele está no ar, e a sombra ficou no chão.`
        : `x ${state.space.x}, y ${state.space.y}, z ${state.space.z}. Ele está no chão.`
    case 'camera-3d':
      return `Daqui a câmera vê ${faces(state.orbit.yaw, state.orbit.pitch)} cor(es) do cubo.`
    case 'mesh':
      return state.model.wire
        ? 'Com o raio-X, o modelo é um monte de pontos ligados por linhas.'
        : 'A roupa do modelo está no lugar, e os pontos continuam por baixo.'
    case 'pick-ray':
      return state.ray.hit
        ? `A reta saiu da câmera e parou na caixa ${state.ray.hit}.`
        : 'A mira está apontando para o vazio: a reta não encontrou nada.'
    case 'fill-stroke':
      return state.ink.fill && state.ink.stroke
        ? 'A forma tem miolo pintado e contorno à vista: dois desenhos no mesmo traço.'
        : state.ink.fill
          ? 'Só o miolo: a forma continua lá, sem a linha de fora.'
          : state.ink.stroke
            ? 'Só o contorno: a linha sozinha guarda a forma.'
            : 'Sem miolo e sem contorno: não sobrou desenho nenhum.'
    case 'shading':
      return state.light.shade
        ? `Com a luz vindo da ${state.light.side === 'left' ? 'esquerda' : 'direita'}, a sombra do outro lado dá volume.`
        : 'Com uma cor só, a forma parece um adesivo colado na tela.'
  }
}
