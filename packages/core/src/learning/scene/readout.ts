import { MESH_SKIN_LABELS, type SceneId, STAGE_TARGET } from './actions'
import {
  FOLHA_DA_NAVE,
  LUPA,
  type MirrorAxis,
  type OnionFireZone,
  onionFireZone,
  sheetCropCell,
} from './atelie'
import { castText, decimal, numero, quantos, type SceneCast } from './cast'
import {
  PARADA_DO_SALTO,
  sceneBrainLabel,
  sceneDescriptionSays,
  scenePickLetter,
  scenePickPath,
  TOPO_DO_SALTO,
} from './engine'
import { CONTACT_HEARTS, cameraWindow, contactTouching, rechargeWords } from './nucleo'
import { emCamadas, type ScenePilha } from './pilha'
import {
  DELTA_RACE,
  HITBOX_DINO_SIZE,
  MESH_POINTS,
  SCREEN_READER_EMPTY,
  type SceneState,
  sceneAreaPercent,
  sceneCactiOnScreen,
  sceneContact,
  sceneDrawingsGap,
} from './state'

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
   * ⚠️ `leaf` (consertos do review da onda B do lote 5) é o verde do eixo y: na `axis-z` cada número
   * veste a cor do SEU eixo (x vermelho `alert`, y verde `leaf`, z azul `a`, as do Estúdio), e a faixa
   * pintava o x de azul e o y de laranja, brigando com o desenho.
   */
  tone: 'a' | 'b' | 'plain' | 'alert' | 'leaf'
}

/**
 * Ligado ou desligado, concordando com o RÓTULO.
 *
 * ⚠️ O gênero é obrigatório no call site de propósito: a versão sem ele só sabia o feminino, e a
 * faixa dizia "som no salto desligada", "começar por toque desligada", "laço desligada" e
 * "raio-X desligada". Quem sabe o gênero do rótulo é quem escreve o rótulo, ao lado dele.
 */
const liga = (on: boolean, genero: 'm' | 'f') =>
  genero === 'm' ? (on ? 'ligado' : 'desligado') : on ? 'ligada' : 'desligada'

/**
 * ⚠️ "falta 0,5 s" / "faltam 2 s", abaixo de 2 no singular (review do lote 2). Morava no motor como
 * legenda de cada quadro da `cooldown`; desde o lote 5 do Raio-X é a SITUAÇÃO que diz quanto falta.
 */
function faltaDaRecarga(segundos: number): string {
  const n = Number(segundos.toFixed(1))
  return `${n < 2 ? 'falta' : 'faltam'} ${decimal(n)} s`
}

/**
 * Quantos Dinos a tela do `draw-loop` mostra AGORA. Zero quando a limpeza apagou e ninguém
 * desenhou (`render.empty`).
 *
 * ⚠️ EXPORTADA porque o palco precisa do MESMO número que a faixa escreve: foi a divergência
 * entre os dois (o palco desenhava o Dino, a tela estava vazia) que motivou o campo. O número é o
 * tamanho de `render.drawn` (onde cada desenho está), a mesma lista que o palco desenha.
 */
export function drawLoopOnScreen(state: SceneState): number {
  // ⚠️ Desde o lote 5 a tela guarda ONDE cada desenho está (`render.drawn`), e o número é o tamanho
  // dessa lista: a faixa e o palco contam a mesma coisa que o palco desenha.
  return state.render.drawn.length
}

/**
 * O que a ÚLTIMA escuta com frase diz (lote 5 do Raio-X): os dois selos do painel do leitor e da
 * faixa ("diz o que fazer", "diz como jogar"). `null` antes de ela ouvir uma frase.
 *
 * ⚠️ Mede o que foi OUVIDO (`said`), e não o que está escrito agora: é "Ouvir a tela" que conta a
 * frase, como no motor. Escrever sem ouvir não acende selo nenhum.
 */
export function screenReaderSays(state: SceneState): { goal: boolean; control: boolean } | null {
  const { said } = state.description
  if (!said || said === SCREEN_READER_EMPTY) return null
  return sceneDescriptionSays(said.replace(/^Tela do jogo\.\s*/, ''))
}
/** As três alturas de onde a câmera do 3D pode olhar. */
const ALTURA: Record<number, string> = { 0: 'por baixo', 1: 'no meio', 2: 'por cima' }
/**
 * ⚠️ A segunda cópia da régua das faces do cubo (`faces`) SAIU daqui no lote 2 do Raio-X
 * (16/09/2026): a faixa e a frase deixaram de dizer quantas cores a câmera vê, porque contar é a
 * tarefa da criança. A régua única é a do motor (`facesAVista`), que o palco também usa.
 */
const TELA: Record<string, string> = { start: 'Início', playing: 'Jogando', end: 'Fim' }
/* ── O ateliê (lote 5 do Raio-X) ─────────────────────────────────────────────────────────────── */
/** O que o fantasma deixa ver nas duas pontas do fogo. */
const FOGO_CRESCEU: Record<OnionFireZone, string> = {
  quase: 'quase nada',
  pouco: 'um pouco',
  passou: 'passou do quadro',
}
/** Os dois espelhos do Pinta, com o nome curto do botão (e os dois juntos: são duas chaves). */
const ESPELHO: Record<'off' | MirrorAxis, string> = {
  off: 'desligado',
  x: 'lado a lado',
  y: 'cima e baixo',
  xy: 'os dois',
}
const modoDoEspelho = (state: SceneState): 'off' | MirrorAxis =>
  state.mirror.on ? state.mirror.axis : 'off'
const LADO: Record<'left' | 'right', string> = { left: 'esquerda', right: 'direita' }
/** Onde a partida está, como começo de frase. */
const ONDE: Record<string, string> = {
  start: 'Na tela de início',
  playing: 'Durante a partida',
  end: 'No fim da partida',
}

/**
 * Os valores vivos da cena, na ordem em que ajudam a entender o que está acontecendo.
 *
 * ⚠️ Máximo de três leituras por cena, de propósito: a faixa é uma linha que a criança varre
 * com os olhos antes de voltar ao palco, não um painel de instrumentos. Quando havia um quarto
 * candidato, ele já estava dito no próprio desenho (a altura tem régua, os cactos se contam).
 */
export function sceneReadout(
  scene: SceneId,
  state: SceneState,
  cast?: SceneCast,
  /** Como a pilha da `layers` se apresenta (`pilha.ts`). Sem ela, a lista de blocos do Estúdio. */
  pilha?: ScenePilha,
): SceneReading[] {
  // ⚠️ O VALOR também passa pelo elenco, não só o rótulo: em `layers` o valor É o nome do
  // personagem ("o Dino", "a floresta"), e vesti-lo pela metade deixava a faixa falando de
  // dois elencos ao mesmo tempo. Achado do full review de 14/09/2026.
  return leituras(scene, state, pilha).map((l) => ({
    ...l,
    label: castText(l.label, cast),
    value: castText(l.value, cast),
  }))
}

function leituras(scene: SceneId, state: SceneState, pilha?: ScenePilha): SceneReading[] {
  switch (scene) {
    case 'coordinates':
      // A faixa que a cena inteira existe para criar: o par que ela vai digitar no bloco.
      // ⚠️ Sem "tela 480 por 270": o par nunca mudava e só repetia o que a régua já desenha.
      // ⚠️ A tela só aparece quando o CASO a trocou (lote 5): no Desafio ela é 800 × 480, e é a mesma
      // medida que a criança deixa no bloco "Preparar o jogo".
      return [
        { label: 'x', value: String(state.place.x), tone: 'a' },
        { label: 'y', value: String(state.place.y), tone: 'b' },
        ...(state.place.width !== 480 || state.place.height !== 270
          ? [
              {
                label: 'tela',
                value: `${state.place.width} por ${state.place.height}`,
                tone: 'plain' as const,
              },
            ]
          : []),
      ]
    case 'stage-size':
      return [
        { label: 'largura', value: String(state.stage.width), tone: 'a' },
        { label: 'altura', value: String(state.stage.height), tone: 'b' },
        {
          label: 'borda',
          // "à vista", como o botão da bancada: eram duas palavras para o mesmo estado.
          value: state.stage.border ? 'à vista' : 'escondida',
          tone: state.stage.border ? 'plain' : 'alert',
        },
      ]
    case 'draw-loop':
      // ⚠️⚠️ Os VALORES, e não as chaves (lote 5 do Raio-X): os botões já dizem o próprio estado, e a
      // faixa repetia os dois. O x do Dino é o que faz o "a tela não muda" se ver: o número anda a
      // cada quadro e o desenho, não.
      return [
        { label: 'quadro', value: String(state.render.frames), tone: 'plain' },
        { label: 'x do Dino', value: String(state.render.x), tone: 'a' },
        { label: 'Dinos na tela', value: String(drawLoopOnScreen(state)), tone: 'b' },
      ]
    case 'screen-reader': {
      // ⚠️ Os dois selos só mudam numa ESCUTA (lote 5): o que conta é a frase que a pessoa ouviu.
      const diz = screenReaderSays(state)
      return [
        {
          label: 'descrição',
          value: state.description.text ? 'escrita' : 'vazia',
          tone: state.description.text ? 'a' : 'alert',
        },
        { label: 'diz o que fazer', value: diz?.goal ? 'sim' : 'ainda não', tone: 'b' },
        { label: 'diz como jogar', value: diz?.control ? 'sim' : 'ainda não', tone: 'b' },
      ]
    }
    // ⚠️⚠️ O ateliê com as palavras do Pinta (lote 5 do Raio-X): Prévia, Velocidade em quadros por
    // segundo, Espelho lado a lado, Preenchimento, Contorno e Sem cor. A faixa diz o ESTADO dos
    // controles e nunca o que o desenho virou.
    case 'frames':
      return [
        { label: 'quadro', value: `${state.animation.frame} de 2`, tone: 'a' },
        {
          label: 'velocidade',
          value: `${quantos(state.animation.rate, 'quadro', 'quadros')} por segundo`,
          tone: 'b',
        },
        // ⚠️ A prévia parada NÃO é alerta: é onde a cena começa e onde a criança DEVE ficar para
        // ver os dois desenhos parados.
        { label: 'prévia', value: state.animation.playing ? 'tocando' : 'parada', tone: 'plain' },
      ]
    case 'onion-skin':
      return [
        { label: 'quadro', value: `${state.animation.frame} de 2`, tone: 'a' },
        // ⚠️ Sem o tom de alerta (lote 5): o fantasma desligado é a primeira metade da comparação, e
        // o vermelho respondia a previsão ("dá para saber sem ver o quadro 1?").
        { label: 'fantasma', value: state.animation.onion ? 'ligado' : 'desligado', tone: 'b' },
        // ⚠️⚠️ Sem número NENHUM com o fantasma desligado (lote 5): "passo do quadro 2 52" dava a
        // medida que a cena diz que não dá para saber. Com o fogo 1 à vista, o que se vê nas pontas.
        ...(state.animation.onion && state.animation.frame === 2
          ? [
              {
                label: 'o fogo 2 cresceu',
                value: FOGO_CRESCEU[onionFireZone(state.animation.shift)],
                tone: 'plain' as const,
              },
            ]
          : []),
      ]
    case 'symmetry':
      // ⚠️⚠️ Os GESTOS, e não as marcas (consertos do review da onda B do lote 5, B4): "você pintou 3 · no
      // papel 4" não subia quando a criança pintava de novo a mesma peça, e "no papel" contava traços
      // enquanto o desenho contava quadradinhos.
      return [
        { label: 'espelho', value: ESPELHO[modoDoEspelho(state)], tone: 'a' },
        { label: 'seus traços', value: String(state.mirror.strokes), tone: 'b' },
        { label: 'cópias do espelho', value: String(state.mirror.copies), tone: 'plain' },
      ]
    case 'pixel-vector':
      return [
        // ⚠️ "Aproximar", o nome do controle, e UMA lupa para as duas pedras (lote 5).
        { label: 'aproximar', value: quantos(state.pixels.zoom, 'vez', 'vezes'), tone: 'a' },
        // ⚠️ De perto ou de longe, e não o que a borda virou: a borda está no desenho.
        {
          label: 'as duas pedras',
          value: state.pixels.zoom >= LUPA.perto ? 'de perto' : 'de longe',
          tone: 'b',
        },
      ]
    case 'sheet-vs-sprite': {
      const { width, size, cell, loaded } = state.sheet
      return [
        // ⚠️ O jogo abre VAZIO (consertos do review da onda B do lote 5, A4): nenhum recorte ainda.
        { label: 'recorte', value: loaded ? `${width} por 32` : 'nenhum', tone: 'a' },
        { label: 'no jogo', value: `${size} por ${size}`, tone: 'b' },
        // O quadro só existe com o recorte do tamanho de um quadro.
        ...(loaded && width === FOLHA_DA_NAVE.quadro
          ? [
              {
                label: 'quadro',
                value: `${sheetCropCell(cell, width)} de 2`,
                tone: 'plain' as const,
              },
            ]
          : []),
      ]
    }
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
        { label: 'bastidores', value: state.world.created ? 'com o Dino' : 'vazio', tone: 'a' },
        {
          label: 'na tela do jogo',
          value: state.world.created && state.world.drawn ? 'Dino apareceu' : 'ainda não apareceu',
          tone: 'b',
        },
      ]
    case 'layers':
      // ⚠️⚠️ A ORDEM, e não o efeito dela (lote 2 do Raio-X). A faixa punha lado a lado "quem é
      // desenhado por último" e "quem aparece na frente", dois valores SEMPRE iguais: a faixa era
      // a própria regra que a cena existe para a criança descobrir. O efeito fica no desenho.
      // ⚠️⚠️ Com `pilha: 'camadas'` (full review de experiência, A1) a faixa fala como o painel Camadas
      // do Pinta, que lista a da FRENTE em cima: "na frente: a chama · atrás: a pedra". No Pinta a
      // camada É a posição no desenho; a ordem de desenhar é vocabulário do Estúdio.
      if (emCamadas(scene, pilha))
        return [
          { label: 'na frente', value: state.world.front ? 'o Dino' : 'a floresta', tone: 'a' },
          { label: 'atrás', value: state.world.front ? 'a floresta' : 'o Dino', tone: 'b' },
        ]
      return [
        {
          label: '1º a desenhar',
          value: state.world.front ? 'a floresta' : 'o Dino',
          tone: 'a',
        },
        {
          label: '2º a desenhar',
          value: state.world.front ? 'o Dino' : 'a floresta',
          tone: 'b',
        },
      ]
    case 'gravity':
      // ⚠️ A altura de AGORA, e sem o impulso (lote 5 do Raio-X): "altura do salto 1350" num salto que
      // nunca termina não era altura de salto nenhum, e o impulso (que não muda nesta cena) era o
      // mesmo estado dito quatro vezes na tela.
      return [
        { label: 'gravidade', value: liga(state.flight.gravity, 'f'), tone: 'a' },
        { label: 'altura agora', value: String(Math.round(state.flight.y)), tone: 'b' },
      ]
    case 'impulse':
      // ⚠️⚠️ As DUAS marcas, com as cores do palco (lote 5 do Raio-X): azul o salto de antes, laranja
      // este. A faixa mostrava só a altura do último salto, e a instrução pedia para comparar.
      return [
        { label: 'impulso', value: String(state.flight.force), tone: 'plain' },
        {
          label: 'salto de antes',
          value: state.flight.before > 0 ? String(Math.round(state.flight.before)) : 'ainda não',
          tone: 'a',
        },
        { label: 'este salto', value: String(Math.round(state.flight.peak)), tone: 'b' },
      ]
    case 'jump-sound':
      return [
        // ⚠️ Onde a PEÇA está (lote 5 do Raio-X), com as palavras das caixas da bancada. "o som
        // escuta: Pulou" era a terceira metáfora da mesma cena (faixa, fio e palco).
        {
          label: 'o som toca quando',
          value: state.sound.onJump ? 'o Dino pular' : 'apertar Espaço',
          tone: 'a',
        },
        { label: 'pulos', value: String(state.sound.jumps), tone: 'plain' },
        { label: 'sons', value: String(state.sound.count), tone: 'b' },
      ]
    case 'spawn':
      return [
        // ⚠️⚠️ Sem o relógio NÃO existe intervalo: nasce um a cada quadro. A faixa dizia
        // "intervalo 1s" com o relógio desligado, e no Desafio a pergunta anexa tem justamente o
        // distrator "um por segundo", que a faixa confirmava.
        // ⚠️⚠️ E "a cada quadro" só aparece DEPOIS de nascer alguém: escrito na abertura, é a
        // resposta da pergunta anexa do Dia 3 antes do primeiro gesto. Com o relógio ligado o
        // intervalo foi escolhido pela criança, e aí ele fica à vista desde o começo.
        ...(state.crowd.timer || state.crowd.born > 0
          ? [
              {
                label: 'nasce',
                value: state.crowd.timer
                  ? `a cada ${decimal(state.crowd.interval)} s`
                  : 'a cada quadro',
                // ⚠️ O par da faixa (lote 5): sem a comparação, "nasce" e "nasceram"; com ela, o
                // azul passa para o "sem relógio", que é o número guardado para comparar.
                tone:
                  state.crowd.timer && state.crowd.untimedBorn > 0
                    ? ('plain' as const)
                    : ('a' as const),
              },
            ]
          : []),
        // ⚠️⚠️ A comparação que FICA (lote 5 do Raio-X): ligar o relógio recomeça a pista, e o "60 em
        // 2 s" do trecho sem relógio sumia na hora exata de comparar.
        // ⚠️⚠️ E os dois lados no MESMO molde, com o tempo de cada um (consertos do review da onda A do
        // lote 5): "sem relógio: 128 em 4,3 s" ao lado de "nasceram: 2" não dizia em quanto tempo os 2
        // nasceram, e a pista manda comparar o mesmo tempo.
        ...(state.crowd.timer && state.crowd.untimedBorn > 0
          ? [
              {
                label: 'sem relógio',
                value: `${state.crowd.untimedBorn} em ${decimal(Math.round(state.crowd.untimedSeconds * 10) / 10)} s`,
                tone: 'a' as const,
              },
              {
                label: 'com relógio',
                value: `${state.crowd.born} em ${decimal(Math.round(state.crowd.elapsed * 10) / 10)} s`,
                tone: 'b' as const,
              },
            ]
          : [{ label: 'nasceram', value: String(state.crowd.born), tone: 'b' as const }]),
      ]
    case 'cleanup':
      return [
        // ⚠️⚠️ Só os que estão NA TELA. Contando todos os vivos, a faixa dizia "na tela 17" com 8
        // desenhados, e "na tela 10 · guardados 10" no momento exato em que a cena existe para
        // mostrar que os dois números são diferentes. Os que saíram estão no grupo.
        { label: 'na tela', value: String(sceneCactiOnScreen(state.crowd)), tone: 'plain' },
        // ⚠️ "no grupo", e não "guardados nos bastidores" (review do lote 2): a resposta certa da
        // previsão é "continua guardado", e a faixa a escrevia embaixo da pergunta.
        { label: 'no grupo', value: String(state.crowd.born - state.crowd.removed), tone: 'b' },
        // O nome curto da CHAVE da bancada (lote 5), e não "remoção na saída: desligada".
        // ⚠️ "desligado", e não "não" (full review de experiência, B9): a chave logo abaixo diz
        // "desligado", e o mesmo estado com duas palavras na mesma tela lia como duas coisas.
        { label: 'remover quem sai', value: liga(state.crowd.cleanup, 'm'), tone: 'a' },
      ]
    case 'game-state':
      return [
        { label: 'tela', value: TELA[state.match.screen] ?? state.match.screen, tone: 'a' },
        // Onde a PEÇA está (lote 5 do Raio-X): "relógio dentro de Se jogando: desligada".
        {
          label: 'Criar cacto está',
          value: state.match.guarded ? 'dentro de Se jogando' : 'fora do Se',
          tone: 'b',
        },
      ]
    case 'controls':
      return [
        { label: 'tela', value: TELA[state.match.screen] ?? state.match.screen, tone: 'a' },
        // ⚠️⚠️ O toque só entra na faixa DEPOIS de a criança tocar, ou com ele já ligado (review do
        // lote 2): "começar por toque: desligado" embaixo de "você aperta Toque para começar. O que
        // acontece?" respondia a previsão. O mesmo molde do "nasce" da `spawn`.
        // ⚠️ E com o que COMEÇA a partida (lote 5): "começar por toque: desligada".
        ...(state.match.touch || state.evidence.discoveries.includes('missing-touch')
          ? [
              {
                label: 'começa com',
                value: state.match.touch ? 'Enter e toque' : 'Enter',
                tone: 'b' as const,
              },
            ]
          : []),
      ]
    case 'restart':
      // ⚠️ Lote 5 do Raio-X: os cactos da pista são o assunto (quem só troca de tela começa a partida
      // com eles), e o fio virou a escolha do que o toque faz no fim.
      return [
        { label: 'tela', value: TELA[state.match.screen] ?? state.match.screen, tone: 'a' },
        { label: 'cactos na pista', value: String(state.crowd.cacti.length), tone: 'plain' },
        {
          label: 'no fim, o toque',
          value: state.match.restartConnected ? 'reinicia o jogo' : 'vai para o início',
          tone: 'b',
        },
      ]
    case 'hitbox':
      // ⚠️⚠️ Em PORCENTAGEM, como o Estúdio (lote 5): "área de colisão 80%" é o número que a Aula 10
      // manda digitar. E o tamanho do Dino fica à vista porque é ele que NÃO muda.
      return [
        { label: 'distância do cacto', value: String(state.contact.distance), tone: 'a' },
        // A área acende em alerta quando BATE: é o número que decide a batida.
        {
          label: 'área do Dino',
          value: `${sceneAreaPercent(state.contact.width)}%`,
          tone: sceneContact(state.contact) ? 'alert' : 'b',
        },
        { label: 'tamanho do Dino', value: String(HITBOX_DINO_SIZE), tone: 'plain' },
      ]
    case 'score':
      return [
        { label: 'tela', value: TELA[state.match.screen] ?? state.match.screen, tone: 'a' },
        // O MESMO jeito de dizer da frase ("Somar ponto está dentro de Se jogando").
        // ⚠️ "solto", e não "fora de Se jogando" (lote 5): a peça fica numa caixa de "qualquer tela".
        {
          label: 'Somar ponto',
          value: state.match.guarded ? 'dentro de Se jogando' : 'solto',
          tone: 'plain',
        },
        { label: 'pontos', value: String(state.match.points), tone: 'b' },
      ]
    case 'random': {
      // ⚠️ Lote 5 do Raio-X: o que saiu, e não quantos "sorteios guardados" (o sorteio era de mentira).
      const diferentes = state.speed.spots.filter((n) => n > 0).length
      return [
        {
          label: 'último lugar',
          value: diferentes > 0 ? String(state.speed.samples.x) : 'nenhum',
          tone: 'a',
        },
        { label: 'lugares diferentes', value: String(diferentes), tone: 'plain' },
        {
          label: 'última velocidade',
          value:
            state.speed.samples.velocities.length > 0
              ? numero(state.speed.samples.velocity)
              : 'nenhuma',
          tone: 'b',
        },
      ]
    }
    case 'acceleration': {
      const ultimo = state.crowd.cacti.at(-1)
      return [
        // ⚠️⚠️ "base" (consertos do review da onda A do lote 5): a instrução, as pistas, a frase e as metas
        // dizem "base", e a faixa e o cartão diziam "velocidade dos novos". Aqui "base" é a palavra da
        // AULA, não o nome do campo (o `readout.test.ts` abre esta exceção com o motivo).
        { label: 'base', value: numero(state.speed.base), tone: 'a' },
        { label: 'a condição', value: liga(state.speed.limited, 'f'), tone: 'b' },
        {
          label: 'último cacto',
          value: ultimo ? numero(ultimo.velocity) : 'nenhum',
          tone: 'plain',
        },
      ]
    }
    /* ── O núcleo do Iniciante 2D ─────────────────────────────────────────────────────────── */
    case 'velocity':
      // ⚠️ Os DOIS eixos, SEMPRE (lote 5 do Raio-X): mostrando o y só com `vy` diferente de zero, a
      // pedra do Desafio nascia em y −40 com a faixa escondendo o y, e "parou onde chegou" não se
      // conferia. E "vx"/"vy" são os nomes que o bloco do Estúdio escreve.
      return [
        {
          label: 'velocidade',
          // ⚠️ O negativo com o sinal de menos do conteúdo: a instrução escreve "−9".
          value: `vx ${numero(state.drive.vx)} · vy ${numero(state.drive.vy)}`,
          tone: 'a',
        },
        {
          // Sem pronome: "ele" não concorda com a nave nem com a pedra.
          label: 'posição',
          value: `x ${numero(Math.round(state.drive.x))} · y ${numero(Math.round(state.drive.y))}`,
          tone: 'b',
        },
        { label: 'quadros', value: String(state.drive.ticks), tone: 'plain' },
      ]
    case 'hold-vs-press':
      // ⚠️ Os PASSOS desde que a tecla afundou (lote 5 do Raio-X), e não a posição: "está apertada? 40"
      // respondia uma pergunta com um lugar da pista.
      return [
        { label: 'de cima', value: quantos(state.input.pressSteps, 'passo', 'passos'), tone: 'a' },
        { label: 'de baixo', value: quantos(state.input.holdSteps, 'passo', 'passos'), tone: 'b' },
        {
          label: 'a tecla',
          value: state.input.holding ? 'segurada' : 'solta',
          tone: state.input.holding ? 'alert' : 'plain',
        },
      ]
    case 'variable':
      return [
        {
          label: 'guardado na caixa',
          value: state.box.created ? String(state.box.value) : 'sem caixa',
          tone: 'a',
        },
        {
          label: 'na tela',
          value: state.box.shown ? String(state.box.value) : 'nada',
          tone: state.box.shown ? 'b' : 'alert',
        },
        { label: 'mudanças', value: String(state.box.changes), tone: 'plain' },
      ]
    case 'group-loop':
      return [
        // ⚠️⚠️ Os TRÊS números medidos, com "?" até medir (consertos do review da onda B do lote 5): eles
        // são a comparação, e a 390 px só existiam no desenho, a ~8 px. "medidos 3 de 3" não comparava nada.
        {
          label: 'medidas',
          value: state.hunt.measured.map((d, i) => `${i + 1}º ${d > 0 ? d : '?'}`).join(', '),
          tone: 'a',
        },
        {
          label: 'escolhido',
          value: state.hunt.chosen ? `o ${state.hunt.chosen}º` : 'nenhum',
          tone: 'b',
        },
        { label: 'laço', value: liga(state.hunt.auto, 'm'), tone: 'plain' },
      ]
    case 'enemy-type':
      // ⚠️ O modo da cópia no lugar de "nasceram" (lote 5 do Raio-X): quantos nasceram, a frase e o
      // palco contam, e a regra que decide se os antigos mudam precisa estar à vista.
      return [
        { label: 'velocidade na ficha', value: String(state.blueprint.speed), tone: 'a' },
        { label: 'vida na ficha', value: String(state.blueprint.life), tone: 'b' },
        {
          label: 'o cacto',
          value: state.blueprint.copy ? 'copia a ficha ao nascer' : 'lê a ficha',
          tone: 'plain',
        },
      ]
    case 'camera': {
      // ⚠️ O pedaço que a tela MOSTRA agora, com a MESMA conta do palco (`cameraWindow`).
      // ⚠️ Sem o vermelho na câmera parada (lote 5 do Raio-X): em alerta desde a abertura, ele dizia
      // "câmera parada é o problema" embaixo da previsão que pergunta o que acontece com ela parada.
      const janela = cameraWindow(state.view.heroX, state.view.follow)
      return [
        { label: 'o Dino no mundo', value: String(state.view.heroX), tone: 'a' },
        { label: 'a tela mostra', value: `${janela} a ${janela + STAGE_TARGET.width}`, tone: 'b' },
        {
          label: 'câmera',
          value: state.view.follow ? 'segue o Dino' : 'parada',
          tone: 'plain',
        },
      ]
    }
    case 'contact':
      // ⚠️⚠️ As DUAS pistas lado a lado (lote 5 do Raio-X): a Escolha da pergunta saiu, e a faixa conta
      // quantos corações cada regra tirou. A distância é a dos DESENHOS (0 é encostado).
      return [
        { label: 'distância', value: String(state.hit.distance), tone: 'plain' },
        {
          label: 'em cima',
          value: `${quantos(CONTACT_HEARTS - state.hit.top, 'coração', 'corações')} a menos`,
          tone: 'a',
        },
        {
          label: 'embaixo',
          value: `${quantos(CONTACT_HEARTS - state.hit.bottom, 'coração', 'corações')} a menos`,
          tone: 'b',
        },
      ]
    case 'cooldown':
      return [
        // ⚠️ A recarga em PALAVRA (lote 5 do Raio-X): "0.5s" e "1.0s" não eram número de escola.
        { label: 'recarga', value: rechargeWords(state.weapon.seconds), tone: 'a' },
        { label: 'tiros', value: String(state.weapon.shots), tone: 'b' },
        // ⚠️⚠️ Os apertos que NÃO viraram tiro (lote 5 do Raio-X): a proposta os nomeia, e o palco os
        // mostra piscando e sumindo. Embaixo da previsão eles abrem em zero.
        { label: 'apertos sem tiro', value: String(state.weapon.refused), tone: 'plain' },
      ]
    case 'aim': {
      const { result, flying } = state.sight
      return [
        // ⚠️ "x" e "y" escritos (lote 5 do Raio-X): "alvo 360, 80" não dizia qual número era qual.
        {
          label: 'alvo',
          value: `x ${state.sight.targetX}, y ${state.sight.targetY}`,
          tone: 'a',
        },
        { label: 'mira', value: liga(state.sight.chasing, 'f'), tone: 'b' },
        {
          label: 'o tiro',
          value: flying
            ? 'voando'
            : result === 'acertou'
              ? 'acertou'
              : result === 'errou'
                ? 'passou longe'
                : 'ainda não saiu',
          tone: 'plain',
        },
      ]
    }
    case 'diagonal': {
      const { dx, dy } = state.walkPad
      // ⚠️ As SETAS apertadas (lote 5 do Raio-X), e o caminho em número inteiro: "84.85" com
      // centésimos era ruído, e "o passo deste quadro" tinha três sentidos na mesma tela.
      const setas =
        [dx === -1 ? '←' : '', dx === 1 ? '→' : '', dy === -1 ? '↑' : '', dy === 1 ? '↓' : '']
          .filter(Boolean)
          .join(' e ') || 'nenhuma'
      return [
        { label: 'setas', value: setas, tone: 'a' },
        {
          label: 'andou',
          value: state.walkPad.strides ? String(Math.round(state.walkPad.distance)) : 'nada ainda',
          tone: 'b',
        },
        { label: 'correção', value: liga(state.walkPad.even, 'f'), tone: 'plain' },
      ]
    }
    case 'tilemap':
      // ⚠️⚠️ Lote 5 do Raio-X: "a linha do meio, escrita" mostrava a linha 4, que a criança podia nem
      // estar mexendo, e o texto do palco (que agora é onde se escreve) já é a linha escrita.
      return [
        { label: 'casas trocadas', value: String(state.grid.edits), tone: 'a' },
        {
          label: 'moedas no mapa',
          value: String(state.grid.rows.join('').split('o').length - 1),
          tone: 'b',
        },
        // ⚠️ "6 linhas de 10" se lia como "6 de 10 linhas".
        { label: 'o mapa', value: '6 linhas, 10 casas cada', tone: 'plain' },
      ]
    /* ── O motor, o 3D e o ateliê ──────────────────────────────────────────────────────── */
    case 'pool':
      // ⚠️ Os DOIS contadores lado a lado são a cena: é a diferença entre eles que denuncia o
      // vazamento, e nenhum dos dois sozinho diz nada. ⚠️ "fabricados", e não "criados" (lote 5 do
      // Raio-X): é o jogo que fabrica, e "vivos" não servia para um cacto.
      return [
        { label: 'na tela agora', value: String(state.nursery.alive), tone: 'a' },
        { label: 'fabricados desde o começo', value: String(state.nursery.created), tone: 'b' },
        { label: 'reciclar quem saiu', value: liga(state.nursery.recycling, 'm'), tone: 'plain' },
      ]
    case 'entity-state':
      // ⚠️ No gerúndio, como o palco e a bancada: "1º mirar" era o id, não o estado.
      // ⚠️⚠️ As TRÊS no mesmo tom (lote 5 do Raio-X): com a 1ª azul, a 2ª laranja e a 3ª neutra, a
      // faixa sugeria que só as duas primeiras se comparam. Não há par aqui: são três iguais.
      return state.brains.states.map((estado, i) => ({
        label: `${i + 1}ª`,
        value: sceneBrainLabel(estado),
        tone: 'a' as const,
      }))
    case 'delta-time':
      // ⚠️⚠️ Os QUADROS de cada computador (lote 5 do Raio-X), e não as posições: as posições já se
      // veem na pista, e o que o desenho não conta sozinho é quantos quadros cada um desenhou.
      return [
        { label: 'quadros do rápido', value: String(state.machines.fastFrames), tone: 'a' },
        { label: 'quadros do devagar', value: String(state.machines.slowFrames), tone: 'b' },
        {
          label: 'o Dino anda',
          value: state.machines.mode === 'frames' ? 'a cada quadro' : 'a cada segundo',
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
        // ⚠️⚠️ O veredito da conta só DEPOIS da primeira meta (full review de experiência, M6): "a conta
        // diz: ainda não" ficava legível embaixo do véu de "Os dois círculos já bateram?".
        ...(state.evidence.discoveries.includes('touch')
          ? [
              {
                label: 'a conta diz',
                value: state.circles.distance <= soma ? 'bateu' : 'ainda não',
                tone: state.circles.distance <= soma ? ('alert' as const) : ('plain' as const),
              },
            ]
          : []),
      ]
    }
    case 'axis-z': {
      // ⚠️⚠️ "y (altura)" era a resposta da previsão ("aumentar o y leva para onde?") escrita no
      // rótulo. O nome do eixo só ganha o sentido DEPOIS de a criança ver: é a mesma régua da
      // bancada (`scene-motor-controls`). ⚠️ "negativo é o fundo" (consertos do review da onda B do lote
      // 5): o sentido do z saiu de DENTRO do desenho, onde o rótulo "fundo (z negativo)" cobria o cubo e
      // a sombra, e mora aqui e na bancada. ⚠️ Cada número na cor do SEU eixo, as do Estúdio.
      const viu = (meta: string) => state.evidence.discoveries.includes(meta)
      return [
        { label: 'x', value: numero(state.space.x), tone: 'alert' },
        { label: viu('up') ? 'y (altura)' : 'y', value: numero(state.space.y), tone: 'leaf' },
        {
          label: viu('depth') ? 'z (negativo é o fundo)' : 'z',
          value: numero(state.space.z),
          tone: 'a',
        },
      ]
    }
    case 'camera-3d':
      // ⚠️⚠️ "cores à vista" SAIU (lote 2 do Raio-X): contar as cores é a TAREFA da cena, e a faixa
      // entregava a conta pronta embaixo da previsão.
      return [
        // ⚠️ De 1 a 8 (lote 5): "volta 0 de 8" confundia, e o número cru não dizia quantas voltas há.
        { label: 'volta da câmera', value: `${state.orbit.yaw + 1} de 8`, tone: 'a' },
        { label: 'altura da câmera', value: ALTURA[state.orbit.pitch] ?? 'no meio', tone: 'b' },
      ]
    case 'mesh':
      // ⚠️ "raio-X desligada" e "a roupa" saíram (lote 5): a pele é a palavra do Molda.
      // ⚠️⚠️ "a pele" no lugar de "ver os pontos", e o número de PONTOS só depois de `points` (consertos
      // do review da onda B do lote 5): "ver os pontos: nada · pontos do modelo: 8" embaixo de "do que um
      // modelo 3D é feito?" era a resposta. A volta do modelo fica no lugar dela, neutra.
      return [
        { label: 'a pele', value: MESH_SKIN_LABELS[state.model.see], tone: 'a' },
        { label: 'volta do modelo', value: `${state.model.yaw + 1} de 8`, tone: 'b' },
        ...(state.evidence.discoveries.includes('points')
          ? [{ label: 'pontos do modelo', value: String(MESH_POINTS), tone: 'plain' as const }]
          : []),
      ]
    case 'pick-ray': {
      // ⚠️ Sem as coordenadas cruas e sem "caixas já acertadas", que nenhuma meta usa (lote 5 do
      // Raio-X). O que se compara é QUANTAS caixas a reta atravessaria e qual acendeu.
      const caminho = scenePickPath(state.ray.x, state.ray.y)
      return [
        { label: 'caixas no caminho', value: String(caminho.length), tone: 'a' },
        {
          label: 'acendeu',
          value: state.ray.hit ? `caixa ${scenePickLetter(state.ray.hit)}` : 'nenhuma',
          tone: 'b',
        },
      ]
    }
    case 'fill-stroke':
      return [
        { label: 'preenchimento', value: state.ink.fill ? 'azul' : 'Sem cor', tone: 'a' },
        { label: 'contorno', value: state.ink.stroke ? 'laranja' : 'Sem cor', tone: 'b' },
      ]
    // ⚠️ Lote 5: o SOL e os tons da família do azul (a "segunda cor" era verde-oliva).
    case 'shading':
      return [
        { label: 'o sol está na', value: LADO[state.light.side], tone: 'a' },
        { label: 'tons de azul', value: state.light.shade ? '3' : '1', tone: 'b' },
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
 *
 * ⚠️⚠️ E a legenda dura UM passo (review do lote 2 do Raio-X, 16/09/2026): o motor a zera no começo
 * de toda ação que não é pista (`stepScene`). Antes ela só saía quando outra ação escrevia uma nova,
 * e ficava velha embaixo do palco, às vezes dizendo a regra que esta frase tinha parado de dizer.
 *
 * ⚠️⚠️ UM NARRADOR POR COISA (lote 2 do Raio-X, 16/09/2026). Esta frase DESCREVE o estado da tela
 * e nunca enuncia a regra que a cena existe para a criança descobrir. Antes ela dizia "quem sobe
 * não tem o que o traga de volta", "quem sai da pista continua guardado", "o relógio corre em
 * qualquer tela", "é assim que o jogo se mexe": a resposta da previsão, embaixo do palco, desde a
 * abertura. A regra mora no sucesso e na explicação, que só aparecem DEPOIS.
 *
 * ⚠️ Ela é também o primeiro degrau da pista (`sceneHint`: situação + degrau 1 do modelo), então
 * precisa dizer ONDE a criança está, com números e estados, e não só "está tudo parado".
 */
export function sceneSituation(scene: SceneId, state: SceneState, cast?: SceneCast): string {
  return castText(situacao(scene, state), cast)
}

function situacao(scene: SceneId, state: SceneState): string {
  const c = state.caption.trim()
  if (c) return c
  const onde = ONDE[state.match.screen] ?? 'Na tela de início'
  switch (scene) {
    case 'coordinates':
      return `O Dino está em x ${state.place.x}, y ${state.place.y}.`
    case 'stage-size': {
      const tela = `Tela de ${state.stage.width} por ${state.stage.height}`
      if (!state.stage.border) return `${tela}, com a borda escondida.`
      const noAlvo =
        state.stage.width === STAGE_TARGET.width && state.stage.height === STAGE_TARGET.height
      // ⚠️ Sem "Sem a moldura, a cor do fundo cobre tudo" (a resposta da previsão) e sem a conta
      // de quanto falta: eram três frases e duas subtrações embaixo de um palco com a legenda do
      // alvo e a faixa (relatório g1).
      return noAlvo
        ? `${tela}, com a borda à vista. É a tela que o jogo pede.`
        : `${tela}, com a borda à vista. O jogo pede ${STAGE_TARGET.width} por ${STAGE_TARGET.height}.`
    }
    case 'draw-loop': {
      // ⚠️ O que ESTÁ na tela, e não o que as chaves fazem ("é assim que o jogo se mexe"): as
      // chaves já dizem o próprio estado, e a faixa também.
      const naTela = drawLoopOnScreen(state)
      return naTela === 0
        ? `Quadro ${state.render.frames}: a tela está vazia.`
        : `Quadro ${state.render.frames}: ${quantos(naTela, 'Dino', 'Dinos')} na tela.`
    }
    case 'screen-reader': {
      // ⚠️ A frase NOVA, que ninguém ouviu ainda, é dita (lote 5): o painel mostra a escuta de antes,
      // e sem isto a criança lia a frase velha como se fosse a que acabou de escrever.
      const escrita = state.description.text.trim()
      if (!escrita) return 'A descrição do jogo está vazia.'
      return state.description.said === `Tela do jogo. ${escrita}`
        ? 'A descrição do jogo tem uma frase escrita.'
        : 'A descrição tem uma frase que a pessoa ainda não ouviu.'
    }
    // ⚠️ O ateliê (lote 5 do Raio-X): o que ESTÁ no desenho, sem a regra ("os dois são desenhos
    // inteiros", "o passo de 40 é chute", "cada traço fica só do lado em que você pintar").
    case 'frames':
      return state.animation.playing
        ? `A prévia troca ${quantos(state.animation.rate, 'quadro', 'quadros')} por segundo.`
        : `Na tela, com a prévia parada: o quadro ${state.animation.frame}.`
    case 'onion-skin':
      return state.animation.onion
        ? state.animation.frame === 2
          ? // ⚠️ "Tracejado" (consertos do review da onda B do lote 5, A2): o palco desenha o contorno
            // do fogo 1 por CIMA do fogo 2, e a frase dizia "clarinho por baixo".
            'Fantasma ligado: o quadro 2 na tela, e o fogo do quadro 1 tracejado.'
          : 'Fantasma ligado no quadro 1, que não tem quadro anterior.'
        : `Fantasma desligado: só o quadro ${state.animation.frame} está na tela.`
    case 'symmetry': {
      const modo = modoDoEspelho(state)
      // ⚠️ Sem "o reflexo caiu fora do papel: o eixo está muito na beirada": o espelho do Pinta fica
      // no meio, e a cópia sempre cabe na grade.
      return modo === 'off'
        ? 'Espelhos desligados, na grade da nave.'
        : modo === 'x'
          ? 'Espelho lado a lado ligado, na grade da nave.'
          : modo === 'y'
            ? 'Espelho de cima e de baixo ligado, na grade da nave.'
            : 'Os dois espelhos ligados, na grade da nave.'
    }
    case 'pixel-vector':
      // ⚠️ Sem dizer o que ela VAI ver (lote 5): de perto, só o convite a olhar as bordas.
      return state.pixels.zoom >= LUPA.perto
        ? `Lupa em ${state.pixels.zoom}. Olhe as bordas das duas pedras.`
        : `Lupa em ${state.pixels.zoom}: as duas pedras quase do tamanho do jogo.`
    case 'sheet-vs-sprite': {
      const { width, size, loaded } = state.sheet
      // ⚠️ A frase descreve o JOGO (lote 5), e na abertura não diz "espremidas": é a resposta da
      // previsão da demonstração da Aula 6. ⚠️⚠️ E a abertura é o jogo VAZIO (consertos do review da
      // onda B do lote 5, A4): com a folha inteira desenhada, a resposta estava na tela antes do palpite.
      if (!loaded)
        return `Nenhum recorte da folha de 64 por 32 ainda: o jogo está vazio, num quadrado de ${size} por ${size}.`
      if (width === FOLHA_DA_NAVE.largura)
        return `O jogo usa a folha inteira, de 64 por 32, num quadrado de ${size} por ${size}.`
      return width === FOLHA_DA_NAVE.quadro
        ? `Recorte de 32: no jogo aparece uma nave inteira, com ${size} por ${size}.`
        : `Recorte de 16: no jogo aparece metade da nave, com ${size} por ${size}.`
    }
    case 'lives':
      // ⚠️ Sem o fio (review do lote 2): na demonstração do Dia 4 não há bancada, e a frase falava de
      // um fio que a criança não vê. Na experimentação o fio está logo abaixo, com o estado dele.
      return state.lifeline.lives === 0
        ? `Sem vidas, a partida acabou com o placar em ${state.lifeline.points}.`
        : `${quantos(state.lifeline.lives, 'vida', 'vidas')} e ${quantos(state.lifeline.points, 'ponto', 'pontos')} no placar.`
    case 'world':
      if (!state.world.created) return 'Os bastidores estão vazios e a tela do jogo também.'
      return state.world.drawn
        ? 'O Dino está nos bastidores e apareceu na tela do jogo.'
        : 'O Dino está nos bastidores e ainda não apareceu na tela do jogo.'
    case 'layers':
      // ⚠️ O que se VÊ, e não "vem por último e cobre": a ordem está na faixa, o efeito no
      // desenho, e juntar os dois numa frase era escrever a regra.
      // ⚠️⚠️ E sem dizer QUEM COBRE QUEM (review do lote 2): "A floresta está na frente do Dino" ao
      // lado de "2º a desenhar: a floresta" na faixa era a regra montada pela criança antes do
      // palpite ("o Dino vem depois da floresta: onde o Dino aparece?").
      // ⚠️ Sem o "Leve o Dino de volta…" colado (full review de experiência, M4): a arrumação final
      // virou a meta `back-in-front`, com pedido e pista próprios, e a frase voltou a só dizer o que se
      // vê. Ela também não sabe para que lado a lista se lê (`pilha`).
      return state.world.front
        ? 'O Dino aparece sem nada na frente.'
        : 'Só um pedacinho do Dino aparece no desenho.'
    case 'gravity':
      // ⚠️⚠️ Sem "com a gravidade desligada" (lote 5 do Raio-X): a faixa já diz a gravidade, e a
      // frase é o que se VÊ. "Voltou ao chão" só depois de um salto que subiu (o `peak` fica).
      if (state.flight.time === null || state.flight.y < 1)
        return state.flight.peak > 0 ? 'O Dino voltou ao chão.' : 'O Dino está parado no chão.'
      // ⚠️ Sem gravidade, "saiu pelo alto e não voltou" (consertos do review da onda A do lote 5): com o ▶
      // parado ali, "passou do alto" sobre um Dino imóvel parecia que ele tinha PARADO de subir. Nesta
      // altura `floating` já caiu, então a previsão já foi respondida.
      if (state.flight.y >= TOPO_DO_SALTO && !state.flight.atGravity)
        return `O Dino saiu pelo alto da tela, a ${Math.round(state.flight.y)} de altura, e não voltou.`
      // ⚠️ O ▶ para em `PARADA_DO_SALTO` (500), ainda dentro do palco: a frase diz que o Dino SEGUE
      // subindo, com a seta no desenho, para o Dino parado ali não parecer um Dino que parou.
      if (state.flight.y >= PARADA_DO_SALTO && !state.flight.atGravity)
        return `O Dino segue subindo, a ${Math.round(state.flight.y)} de altura, sem voltar.`
      return state.flight.y >= TOPO_DO_SALTO
        ? `O Dino passou do alto da tela, a ${Math.round(state.flight.y)} de altura.`
        : `O Dino está a ${Math.round(state.flight.y)} de altura.`
    case 'impulse':
      // ⚠️ "o salto mais alto até agora" era falso: o pico é o do ÚLTIMO salto. ⚠️ As duas marcas
      // (lote 5 do Raio-X), porque as duas ficam no palco.
      if (state.flight.before > 0)
        return `A marca de antes está em ${Math.round(state.flight.before)}, e a deste salto em ${Math.round(state.flight.peak)}.`
      return state.flight.peak > 0
        ? `Impulso ${state.flight.force}: o último salto chegou a ${Math.round(state.flight.peak)} de altura.`
        : `O impulso está em ${state.flight.force}. Faça o Dino saltar para ver a altura.`
    case 'jump-sound':
      // ⚠️ A CONTA, e não onde a peça está (lote 5 do Raio-X): a faixa e as caixas da bancada já dizem
      // onde o som mora, e "1 pulo e 2 sons" é o que a linha do tempo desenha, sem regra nenhuma.
      // ⚠️⚠️ Com as metas feitas e a peça de volta na tecla, a frase diz o que falta (consertos do review
      // da onda A do lote 5), como na `layers`: a cena não concluía e ninguém dizia por quê.
      if (!state.sound.onJump && state.evidence.discoveries.includes('every-jump'))
        return `${quantos(state.sound.jumps, 'pulo', 'pulos')} e ${quantos(state.sound.count, 'som', 'sons')}. Leve Tocar som de volta para Quando o Dino pular, como fica no jogo.`
      return state.sound.jumps + state.sound.count === 0
        ? 'Nenhum pulo e nenhum som ainda.'
        : `${quantos(state.sound.jumps, 'pulo', 'pulos')} e ${quantos(state.sound.count, 'som', 'sons')}.`
    case 'spawn': {
      // ⚠️ Sem "pista": o Desafio e o Meu Jeito usam esta cena no espaço.
      if (!state.crowd.timer && state.crowd.born === 0) return 'Ainda não nasceu nenhum cacto.'
      const nasceram = quantos(state.crowd.born, 'cacto nasceu', 'cactos nasceram')
      // ⚠️ Onde a PEÇA está (lote 5 do Raio-X), e não "o relógio ligado ao nascimento".
      return state.crowd.timer
        ? `Criar cacto está no relógio, a cada ${decimal(state.crowd.interval)} s. ${nasceram} até agora.`
        : `${nasceram} até agora.`
    }
    case 'cleanup':
      // ⚠️⚠️ Os dois números, e não "quem sai continua guardado": a resposta da previsão. ⚠️ E sem a
      // regra (lote 5): a chave da bancada e a faixa já dizem se ela está ligada.
      return `${quantos(sceneCactiOnScreen(state.crowd), 'cacto', 'cactos')} na tela e ${state.crowd.born - state.crowd.removed} no grupo.`
    case 'game-state':
      // ⚠️ "O relógio corre em qualquer tela" era a resposta da previsão da Aula 7. ⚠️ E sem onde a
      // peça está (lote 5): a faixa e a bancada dizem, e a frase ficava espremida entre as duas.
      return `${onde}. ${quantos(state.crowd.born, 'cacto criado', 'cactos criados')} até agora.`
    case 'controls':
      // ⚠️ Sem o fio do toque: "o toque não está ligado ao início" era a resposta da previsão, e
      // a faixa e a própria bancada já dizem o estado dele.
      return state.match.screen === 'start'
        ? 'A tela de início mostra o convite para começar.'
        : state.match.screen === 'playing'
          ? 'A partida está acontecendo.'
          : 'A partida terminou.'
    case 'restart': {
      const n = quantos(state.crowd.cacti.length, 'cacto', 'cactos')
      if (state.match.screen === 'start')
        return state.crowd.cacti.length === 0
          ? 'Na tela de início, com a pista vazia.'
          : `Na tela de início, com ${n} da partida anterior na pista.`
      return `${onde}, com ${n} na pista.`
    }
    case 'hitbox': {
      // ⚠️ Sem "é aí que a batida acontece": a regra da previsão.
      // ⚠️⚠️ Lote 5 do Raio-X: o VÃO entre os desenhos é a informação nova (a batida injusta), e é
      // dito só com as áreas encostadas. O selo do palco diz BATEU; a faixa, as medidas.
      if (!sceneContact(state.contact))
        return `O cacto está a ${state.contact.distance} do Dino. As áreas pontilhadas ainda não se encostam.`
      const vao = Math.round(sceneDrawingsGap(state.contact))
      return vao > 0
        ? `As áreas encostaram. Os desenhos ainda têm um vão de ${vao}.`
        : 'As áreas encostaram, e os desenhos também.'
    }
    case 'score':
      return `${onde}, Somar ponto está ${state.match.guarded ? 'dentro de Se jogando' : 'solto'}, e o placar está em ${state.match.points}.`
    case 'random': {
      const { spots, samples } = state.speed
      const diferentes = spots.filter((n) => n > 0).length
      if (samples.velocities.length > 0)
        return `O último cacto saiu com ${numero(samples.velocity)} e andou ${Math.abs(samples.velocity * 30)} em 1 segundo.`
      if (diferentes === 0) return 'Nenhum lugar sorteado ainda.'
      const repetiu = spots.some((n) => n >= 2)
      return `Saiu ${samples.x}. ${diferentes === 1 ? 'Até agora saiu 1 lugar' : `Já saíram ${diferentes} lugares diferentes`}${repetiu ? ', e algum repetiu' : ''}.`
    }
    case 'acceleration':
      return `A base está em ${numero(state.speed.base)}, com a condição ${liga(state.speed.limited, 'f')}. ${quantos(state.crowd.cacti.length, 'cacto', 'cactos')} na fileira.`
    /* ── O núcleo do Iniciante 2D ─────────────────────────────────────────────────────────── */
    case 'velocity':
      // ⚠️ Os DOIS eixos, como na faixa: com a velocidade só para baixo esta frase afirmava
      // "velocidade 0" embaixo de um palco em que o Dino descia.
      // ⚠️ Sem "parado… a velocidade é zero" na abertura (review do lote 2): era a meta `stopped`
      // escrita antes do primeiro gesto, nas quatro aulas que usam a cena.
      return `O Dino está em x ${numero(Math.round(state.drive.x))}, y ${numero(Math.round(state.drive.y))}, com velocidade ${numero(state.drive.vx)} para o lado e ${numero(state.drive.vy)} para baixo.`
    case 'hold-vs-press': {
      // ⚠️ Lote 5 do Raio-X: a tecla e os passos desta vez, e não duas posições da pista. Na abertura
      // não diz nada das raquetes além de que ninguém anda.
      const { holding, pressSteps, holdSteps, presses } = state.input
      const passos = `A de cima deu ${quantos(pressSteps, 'passo', 'passos')} e a de baixo ${quantos(holdSteps, 'passo', 'passos')}.`
      if (holding) return `A tecla está segurada. ${passos}`
      return presses === 0
        ? 'A tecla está solta. Nenhuma raquete anda agora.'
        : `A tecla está solta. ${passos}`
    }
    case 'variable':
      return state.box.created
        ? `A caixa guarda ${state.box.value}, e a tela ${state.box.shown ? `mostra ${state.box.value}` : 'não mostra nenhum número'}.`
        : 'A caixa pontos ainda não existe.'
    case 'group-loop': {
      const { auto, chosen, looked, measured, distances } = state.hunt
      if (auto) return `O laço mede os três em todo quadro. O escolhido é o ${chosen}º.`
      // ⚠️ Sem o laço a régua é uma foto (consertos do review da onda B do lote 5): com o tempo passando,
      // a frase diz que os números são de antes, em vez de deixar a criança comparar o que já mudou.
      const velhas = measured.some((d, i) => d > 0 && d !== distances[i])
      return `Você mediu ${looked.length} de 3 cactos${chosen ? ` e escolheu o ${chosen}º` : ''}.${velhas ? ' Os cactos andaram depois de você medir.' : ''}`
    }
    case 'enemy-type': {
      const { cacti, speed, life, copy } = state.blueprint
      if (cacti.length === 0)
        return `A ficha diz velocidade ${speed} e vida ${life}. Nenhum cacto nasceu ainda.`
      // ⚠️ "3 cactos na pista", com o nome colado ao número: o elenco flexiona o que está grudado.
      // ⚠️⚠️ Com a cópia, a velocidade de CADA cacto, da esquerda para a direita (consertos do review da
      // onda B do lote 5): "Cada um copiou a ficha" não dizia a quem não enxerga que o novo anda diferente.
      if (copy) {
        const velocidades = [...cacti].sort((a, b) => a.x - b.x).map((c) => String(c.speed))
        const lista =
          velocidades.length > 1
            ? `${velocidades.slice(0, -1).join(', ')} e ${velocidades.at(-1)}`
            : (velocidades[0] ?? '')
        return `${quantos(cacti.length, 'cacto', 'cactos')} na pista, com velocidade ${lista}.`
      }
      return `${quantos(cacti.length, 'cacto', 'cactos')} na pista. A ficha diz velocidade ${speed} e vida ${life}.`
    }
    case 'camera': {
      const janela = cameraWindow(state.view.heroX, state.view.follow)
      const mostra = `A tela mostra do ${janela} ao ${janela + STAGE_TARGET.width}`
      // ⚠️ "com o Dino no meio" só quando é verdade: nas pontas do mundo a janela para e o Dino anda.
      if (!state.view.follow) return `${mostra}, e o Dino está em ${state.view.heroX}.`
      return state.view.heroX - janela === STAGE_TARGET.width / 2
        ? `${mostra}, com o Dino no meio.`
        : `${mostra}, com o Dino em ${state.view.heroX}.`
    }
    case 'contact':
      // ⚠️ Com o nome do cacto colado ao verbo: "Encostados há 3 quadros" não sobrevive ao elenco.
      return contactTouching(state.hit.distance)
        ? `O cacto está encostando no Dino há ${quantos(state.hit.frames, 'quadro', 'quadros')}.`
        : 'O cacto está longe do Dino.'
    case 'cooldown': {
      const { seconds, ready, shots, refused } = state.weapon
      const tiros = quantos(shots, 'tiro saiu', 'tiros saíram')
      const recusados = refused
        ? ` ${quantos(refused, 'aperto não virou tiro', 'apertos não viraram tiro')}.`
        : ''
      if (seconds === 0) return `Sem recarga. ${tiros}.${recusados}`
      // ⚠️ "Pronto para atirar" é o SINAL que o pedido da meta `spaced` manda esperar.
      return ready > 0
        ? `Recarregando: ${faltaDaRecarga(ready)}. ${tiros}.${recusados}`
        : `Pronto para atirar. ${tiros}.${recusados}`
    }
    case 'aim': {
      const { result, flying, targetX, targetY, chasing } = state.sight
      if (flying) return 'O tiro está voando.'
      if (result === 'acertou') return 'O tiro acertou o alvo.'
      if (result === 'errou') return 'O tiro passou longe do alvo.'
      // ⚠️ Sem "o tiro sai sempre para o mesmo lado": a resposta da previsão.
      return `A mira está ${liga(chasing, 'f')}, e o alvo está em x ${targetX}, y ${targetY}.`
    }
    case 'diagonal': {
      const { last, distance, even } = state.walkPad
      const andou = Math.round(distance)
      if (last === 'reto') return `O Dino andou ${andou} e parou no círculo.`
      if (last === 'diagonal') return `O Dino andou ${andou} e passou do círculo.`
      if (last === 'corrigida') return `Com a correção, o Dino andou ${andou} na diagonal.`
      return `O Dino está no começo, com a correção ${liga(even, 'f')}.`
    }
    case 'tilemap':
      // ⚠️ Lote 5 do Raio-X: na abertura, o que a criança olha para comparar (a última linha do texto
      // é o chão do desenho); depois, só quantas casas mudaram.
      return state.grid.edits === 0
        ? 'O chão do desenho está escrito na última linha do texto.'
        : `Você trocou ${quantos(state.grid.edits, 'casa', 'casas')} do mapa.`
    /* ── O motor, o 3D e o ateliê ──────────────────────────────────────────────────────── */
    case 'pool':
      return situacaoDaPool(state)
    case 'entity-state': {
      const [a = 'parado', b = 'parado', c = 'parado'] = state.brains.states
      // ⚠️ Onde o estado mora só entra quando é "no jogo": a chave já diz, e "em cada uma" na frase da
      // abertura era a resposta da previsão ("o que as outras duas fazem?").
      const lida = `A 1ª torre está ${sceneBrainLabel(a)}, a 2ª ${sceneBrainLabel(b)} e a 3ª ${sceneBrainLabel(c)}.`
      return state.brains.shared ? `${lida} O estado mora no jogo.` : lida
    }
    case 'delta-time':
      return situacaoDaCorrida(state)
    case 'circle-collision': {
      // ⚠️ Sem o veredito ("é uma batida"): a faixa já diz o que a conta deu. ⚠️ A conta escrita
      // (lote 5 do Raio-X) e o que a fila dos raios desenha, com os mesmos números do palco.
      const { a, b } = state.circles
      const distancia = Math.round(state.circles.distance)
      const conta = `Distância ${distancia}. Raios ${a} + ${b} = ${a + b}.`
      return state.circles.distance <= a + b
        ? `${conta} A fila dos raios alcançou o outro centro.`
        : conta
    }
    case 'axis-z':
      return situacaoDoEixoZ(state)
    case 'camera-3d': {
      // ⚠️⚠️ Onde a CÂMERA está, e não quantas cores ela vê: contar é a tarefa da criança.
      // ⚠️ As MESMAS palavras da faixa ("por cima"), e não "na altura de cima" (review do lote 2).
      // ⚠️ "no canto" ou "bem de frente para um lado" (lote 5): o mapa de cima mostra o mesmo lugar.
      const altura: Record<number, string> = {
        0: 'olhando por baixo',
        1: 'na altura do meio',
        2: 'olhando por cima',
      }
      const lugar = state.orbit.yaw % 2 === 1 ? 'no canto do cubo' : 'bem de frente para um lado'
      return `A câmera está ${lugar}, ${altura[state.orbit.pitch] ?? 'na altura do meio'}. Volta ${state.orbit.yaw + 1} de 8.`
    }
    case 'mesh':
      // ⚠️ Sem "os pontos continuam por baixo" enquanto só a pele aparece: é a resposta da previsão.
      return state.model.see === 'nada'
        ? 'O modelo está com a pele inteira.'
        : state.model.see === 'metade'
          ? 'A pele está transparente. Os pontos estão logo embaixo.'
          : 'Sem a pele: só pontos e linhas.'
    case 'pick-ray': {
      const [primeira, ...atras] = scenePickPath(state.ray.x, state.ray.y)
      if (!primeira) return 'Nada no caminho: a reta foi até o fim.'
      const bateu = `A reta saiu do seu olho e bateu na caixa ${scenePickLetter(primeira)}.`
      return atras.length === 0
        ? bateu
        : `${bateu} A caixa ${scenePickLetter(atras[0] ?? 0)} ficou atrás.`
    }
    case 'fill-stroke':
      // ⚠️ "a forma continua lá" e "a linha sozinha guarda a forma" eram a resposta da previsão e
      // o rótulo da meta. A tela sem nada continua dita: é o que se vê, não uma regra.
      // ⚠️ Lote 5 do Raio-X: com as palavras do Pinta (Preenchimento, Contorno, Sem cor).
      return state.ink.fill || state.ink.stroke
        ? `Preenchimento ${state.ink.fill ? 'azul' : 'em Sem cor'}, contorno ${state.ink.stroke ? 'laranja' : 'em Sem cor'}.`
        : 'As duas partes em Sem cor: a pedra sumiu.'
    case 'shading':
      // ⚠️ Lote 5: com os tons ligados a frase diz onde está a sombra, que é o que se VÊ.
      return state.light.shade
        ? `Sol na ${LADO[state.light.side]}, sombra na ${LADO[state.light.side === 'left' ? 'right' : 'left']}.`
        : `A bola tem um tom só, com o sol na ${LADO[state.light.side]}.`
  }
}

/**
 * A frase da `pool` (lote 5 do Raio-X): o NÚMERO do cacto da tela e o que aconteceu na última saída.
 *
 * ⚠️ "Os cactos nº 1 e 2", com o nome: "Os nº 1 e 2" deixava o artigo longe do nome, e o elenco
 * não o flexiona ("Os nº" numa turma de pedras). E "nenhum cacto novo", colado, pela mesma régua.
 */
function situacaoDaPool(state: SceneState): string {
  const { onScreen, last, created } = state.nursery
  if (onScreen === 0) return 'Nenhum cacto ainda. Aperte ▶.'
  if (last === 'voltou')
    return `O cacto nº ${onScreen} saiu e entrou de novo. O jogo não fabricou nenhum cacto novo.`
  const saiu = created - 1
  if (saiu <= 0) return `O cacto nº ${onScreen} está atravessando a tela.`
  const numeros =
    saiu === 1
      ? 'O cacto nº 1 já saiu.'
      : saiu === 2
        ? 'Os cactos nº 1 e 2 já saíram.'
        : saiu === 3
          ? 'Os cactos nº 1, 2 e 3 já saíram.'
          : `Os cactos nº 1 a ${saiu} já saíram.`
  return `O cacto nº ${onScreen} entrou. ${numeros}`
}

/**
 * A frase da corrida da `delta-time` (lote 5 do Raio-X): quem chegou, e onde o outro ficou.
 *
 * ⚠️ "o rápido" e "o devagar" são os COMPUTADORES, como no desenho; o elenco não os toca.
 */
function situacaoDaCorrida(state: SceneState): string {
  const { fastX, slowX, fastFrames, slowFrames, mode } = state.machines
  const { chegada } = DELTA_RACE
  if (fastFrames === 0) return 'Os dois estão na largada.'
  if (fastX < chegada) return `O rápido está em ${fastX} e o devagar em ${slowX}.`
  if (mode === 'seconds' && slowX >= chegada)
    return fastFrames === slowFrames * 2
      ? 'Chegaram juntos! O rápido desenhou o dobro de quadros.'
      : `Chegaram juntos! O rápido desenhou ${fastFrames} quadros, e o devagar ${slowFrames}.`
  return slowX * 2 === chegada
    ? 'O rápido chegou! O devagar está na metade do caminho.'
    : `O rápido chegou! O devagar está em ${slowX}.`
}

/**
 * Até onde o z vale "no meio", para a frase da `axis-z`. Com o passo de 20 da bancada, um toque só não
 * troca a frase; dois já levam o cubo para a frente ou para o fundo.
 */
const MEIO_DO_Z = 40

/**
 * A frase da `axis-z`: onde o cubo está e como ele PARECE (consertos do review da onda B do lote 5).
 *
 * ⚠️⚠️ Quem usa leitor de tela não recebia a descoberta do z: a frase era a mesma com o cubo na frente e
 * no fundo, e o que a cena ensina (longe parece menor) só existia no desenho. ⚠️ O que se VÊ, sem a
 * regra do sinal ("z negativo é o fundo" é da faixa e da bancada, e só depois de mexer no z). ⚠️ Sem os
 * números (lote 5): a faixa e a bancada já dizem os três. ⚠️ Sem pronome: "o cubo" repetido.
 */
function situacaoDoEixoZ(state: SceneState): string {
  const { y, z } = state.space
  const frente = z >= MEIO_DO_Z
  const fundo = z <= -MEIO_DO_Z
  const lugar = frente ? 'lá na frente' : fundo ? 'lá no fundo' : 'no meio'
  const tamanho = frente
    ? ' Na frente, o cubo parece maior.'
    : fundo
      ? ' No fundo, o cubo parece menor.'
      : ''
  return y > 0
    ? `O cubo está no ar, ${lugar}. A sombra ficou no chão, bem embaixo.${tamanho}`
    : `O cubo está no chão, ${lugar}, com a sombra embaixo.${tamanho}`
}
