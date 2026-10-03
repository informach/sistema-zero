import type { SceneArgument, SceneMethod } from './catalog'

const n = (name: string, value: number): SceneArgument => ({ name, value })
const text = (name: string, value: string): SceneArgument => ({ name, value })
const track: SceneArgument = { name: 'TRACK', value: 'pista', picks: 'track' }
const layer: SceneArgument = { name: 'NAME', value: 'montanhas', picks: 'layer' }
const sprite: SceneArgument = { name: 'SPRITE', value: 'jogador', field: 'sprite' }
const select = (name: string, value: string, options: Array<[string, string]>): SceneArgument => ({
  name,
  value,
  field: 'select',
  options,
})
const preset = (name: string, value: number, options: Array<[string, string]>): SceneArgument => ({
  name,
  value,
  field: 'select',
  options,
})

export const SPRITE_SCENE_METHODS: readonly SceneMethod[] = [
  {
    method: 'addSceneBackdrop',
    block: 'add_scene_backdrop',
    family: 'begin',
    placement: 'start-only-command',
    message: 'Adicionar cenário %1 com imagem %2 %3',
    args: [
      { ...text('NAME', 'montanhas'), declares: 'layer' },
      { name: 'IMAGE', value: '', field: 'image' },
      select('PLANE', 'back', [
        ['bem ao fundo', 'far'],
        ['atrás dos personagens', 'back'],
        ['na frente dos personagens', 'front'],
      ]),
    ],
    tooltip:
      'O cenário se encaixa na tela e aparece sozinho. Partes transparentes deixam ver as camadas de baixo. Dê nomes diferentes para usar a mesma imagem mais de uma vez.',
  },
  {
    method: 'sceneBackdropMotion',
    block: 'scene_backdrop_motion',
    family: 'begin',
    placement: 'command',
    message: 'Cenário %1 acompanha o jogador em %2 %',
    args: [layer, n('AMOUNT', 40)],
    tooltip:
      '0 deixa o cenário parado; valores maiores acompanham mais o movimento. Funciona com a câmera do mundo e da pista.',
  },
  {
    method: 'sceneBackdropFit',
    block: 'scene_backdrop_fit',
    family: 'more',
    placement: 'command',
    message: 'Cenário %1 deve %2',
    args: [
      layer,
      select('FIT', 'cover', [
        ['cobrir a tela', 'cover'],
        ['mostrar a imagem inteira', 'contain'],
        ['repetir a imagem', 'repeat'],
      ]),
    ],
    tooltip:
      'Cobrir preenche sem deformar. Mostrar inteira preserva as bordas. Repetir emenda cópias da imagem.',
  },
  {
    method: 'createSpriteTrack',
    block: 'create_sprite_track',
    family: 'begin',
    placement: 'start-only-command',
    message: 'Criar pista para o fundo %1',
    args: [{ ...text('TRACK', 'pista'), declares: 'track' }],
    tooltip:
      'Cria uma pista em perspectiva: o que está longe aparece menor. Câmera e desenho são automáticos. Prepare uma vez em Ao iniciar.',
  },
  {
    method: 'trackFollow',
    block: 'track_follow',
    targets: ['gk'],
    family: 'begin',
    message: 'Na pista %1 acompanhar %2',
    args: [track, sprite],
    tooltip:
      'A câmera acompanha este personagem. Vida, controles e regras são escolhidos em outros blocos.',
  },
  {
    method: 'trackSpeed',
    block: 'track_speed',
    targets: ['gk'],
    family: 'begin',
    message: 'Velocidade de avanço da pista %1 %2',
    args: [track, n('SPEED', 320)],
    tooltip:
      'Avança a câmera em passos por segundo, mesmo sem jogador. Zero para. O motor cuida do tempo.',
  },
  {
    method: 'trackFinishLine',
    block: 'track_finish_line',
    targets: ['gk'],
    family: 'begin',
    message: 'Chegada da pista %1 em %2 passos',
    args: [track, n('DISTANCE', 6600)],
    tooltip:
      'Dispara o evento de chegada uma vez. Zero deixa sem fim. O evento decide o que acontece depois; não muda a tela nem o estado do jogo.',
  },
  {
    method: 'trackInput',
    block: 'track_input',
    targets: ['gk'],
    family: 'begin',
    message: 'Na pista %1 controlar pelos %2 com velocidade %3',
    args: [
      track,
      select('MODE', 'both', [
        ['setas e toque', 'both'],
        ['setas', 'arrows'],
        ['toques', 'pointer'],
        ['nenhum controle', 'off'],
      ]),
      n('SPEED', 140),
    ],
    tooltip:
      'Escolhe a entrada lateral do personagem acompanhado. Funciona sem laço de quadros. Os limites são ajustados separadamente.',
  },
  {
    method: 'trackLimit',
    block: 'track_limit',
    targets: ['gk'],
    family: 'begin',
    message: 'Limitar a lateral da pista %1 entre -%2 e +%3',
    args: [track, n('LIMIT', 120), n('RIGHT', 120)],
    tooltip:
      'Escolhe quanto o personagem pode ir para cada lado. Não altera a velocidade nem os controles.',
  },
  {
    method: 'trackPosition',
    block: 'track_position',
    targets: ['gk'],
    family: 'more',
    value: true,
    message: 'Na pista %1 ler %2',
    args: [
      track,
      select('PROPERTY', 'distance', [
        ['distância percorrida', 'distance'],
        ['lateral do personagem', 'lateral'],
      ]),
    ],
    tooltip: 'Usa a posição em regras, placares e no nascimento de personagens à frente da câmera.',
  },
  {
    method: 'onTrackSpriteEncounter',
    block: 'on_track_sprite_encounter',
    targets: ['gk'],
    family: 'begin',
    event: true,
    parameter: 'encontrado',
    message: 'Quando o personagem da pista %1 encontrar %2 ou suas cópias, chamar de %3',
    args: [track, sprite],
    tooltip:
      'Dentro do evento, encontrado é o personagem real desta passagem. Pode animá-lo, mudar sua aparência, machucar ou recolher usando blocos normais.',
  },
  {
    method: 'forEachTrackSprite',
    block: 'for_each_track_sprite',
    targets: ['gk'],
    family: 'more',
    each: true,
    parameter: 'copia',
    message: 'Para cada %2 vivo de %1 na pista',
    args: [sprite],
    tooltip:
      'Aplica os blocos de personagem a cada cópia viva. Continua funcionando depois de recolher o original. Não precisa criar lista ou função.',
  },
  {
    method: 'onTrackMoldEncounter',
    block: 'on_track_mold_encounter',
    targets: ['gk'],
    family: 'begin',
    event: true,
    parameter: 'encontrado',
    message: 'Quando o personagem da pista %1 encontrar alguém do molde %2, chamar de %3',
    args: [track, { name: 'MOLD', value: 'inimigo', field: 'mold' }],
    tooltip:
      'Vale para todos que nascerem desse molde na pista, inclusive novas ondas e cópias. Dentro do evento, use encontrado com os blocos de personagem ou recolha o encontrado.',
  },
  {
    method: 'trackPlayer',
    targets: ['g2d'],
    block: 'track_player',
    family: 'begin',
    placement: 'start-only-command',
    message: 'Na pista %1 usar %2 como jogador com %3 vidas',
    args: [track, sprite, n('LIVES', 3)],
    tooltip:
      'O mesmo sprite entra na pista com sua aparência, animações e efeitos. O tamanho original é preservado.',
  },
  {
    method: 'trackControls',
    targets: ['g2d'],
    block: 'track_controls',
    family: 'begin',
    placement: 'command',
    message: 'Na pista %1 usar setas e toque com movimento %2 e espaço %3',
    args: [
      track,
      preset('SPEED', 140, [
        ['normal', '140'],
        ['suave', '80'],
        ['rápido', '220'],
      ]),
      preset('LIMIT', 120, [
        ['normal', '120'],
        ['estreito', '60'],
        ['amplo', '200'],
      ]),
    ],
    tooltip:
      'Setas ou A/D e arrastar o dedo controlam o jogador livremente para os lados. A extensão cuida do tempo e dos limites.',
  },
  {
    method: 'trackTravel',
    targets: ['g2d'],
    block: 'track_travel',
    family: 'begin',
    message: 'Percorrer pista %1 em ritmo %2 até %3 passos',
    args: [
      track,
      preset('SPEED', 320, [
        ['normal', '320'],
        ['calmo', '160'],
        ['rápido', '480'],
        ['parado', '0'],
      ]),
      n('FINISH', 6600),
    ],
    tooltip:
      'Define a velocidade em passos por segundo e a chegada. Não precisa repetir a cada quadro. Velocidade 0 para; chegada 0 deixa o percurso sem fim.',
  },
  {
    method: 'putTrackSpriteAt',
    block: 'put_track_sprite_at',
    targets: ['g2d'],
    family: 'begin',
    message: 'Na pista %1 colocar %2 %3 a %4 passos',
    args: [
      track,
      sprite,
      select('SIDE', 'center', [
        ['no centro', 'center'],
        ['à esquerda', 'left'],
        ['à direita', 'right'],
      ]),
      n('DISTANCE', 600),
    ],
    tooltip:
      'Escolha o lado pela lista. O sprite conserva sua aparência e animação. Para uma posição exata, use Colocar na lateral em Mais controles.',
  },
  {
    method: 'putTrackSprite',
    block: 'put_track_sprite',
    family: 'more',
    placement: 'command',
    message: 'Na pista %1 colocar %2 na lateral %3 distância %4',
    args: [track, sprite, n('X', 0), n('DISTANCE', 600)],
    tooltip:
      'Use 0 no centro, um número negativo à esquerda e positivo à direita. Distância indica quantos passos desde o começo da pista. O sprite é desenhado sozinho com animação e efeitos.',
  },
  {
    method: 'repeatTrackSprite',
    block: 'repeat_track_sprite',
    family: 'begin',
    placement: 'command',
    message: 'Na pista %1 repetir %2: %3 sprites a cada %4 passos %5',
    args: [
      track,
      sprite,
      n('COUNT', 12),
      n('SPACING', 480),
      select('PATTERN', 'line', [
        ['em linha', 'line'],
        ['alternando os lados', 'alternate'],
        ['passando pelo centro', 'weave'],
        ['em degraus à esquerda', 'steps-left'],
        ['em degraus à direita', 'steps-right'],
      ]),
    ],
    tooltip:
      'O total inclui o sprite original. As cópias herdam aparência e animação. Passando pelo centro alterna lateral, centro, lado oposto, centro. Degraus usam três posições espaçadas por um terço da largura do sprite.',
  },
  {
    method: 'trackSpriteVelocity',
    block: 'track_sprite_velocity',
    family: 'more',
    message: 'Mover %1 pela pista: lateral %2 distância %3 por segundo',
    args: [sprite, n('X', 0), n('Z', -100)],
    tooltip:
      'Dá movimento próprio ao sprite e suas cópias. Distância negativa vem ao encontro do jogador. O tempo é calculado pelo motor.',
  },
  {
    method: 'trackCameraView',
    block: 'track_camera_view',
    family: 'more',
    message: 'Vista da pista %1 %2',
    args: [
      track,
      select('VIEW', 'near', [
        ['próxima', 'near'],
        ['aberta', 'wide'],
        ['alta', 'high'],
      ]),
    ],
    tooltip:
      'Muda o enquadramento sem perder sprites nem progresso. A matemática da câmera fica por conta da extensão.',
  },
  {
    method: 'onTrackEncounter',
    targets: ['g2d'],
    block: 'on_track_encounter',
    family: 'begin',
    event: true,
    message: 'Quando o jogador da pista %1 encontrar %2 ou suas cópias',
    args: [track, sprite],
    tooltip:
      'Roda uma vez por passagem. Dentro do evento, Recolher o sprite encontrado tira somente a cópia que o jogador encontrou.',
  },
  {
    method: 'onTrackFinish',
    block: 'on_track_finish',
    family: 'begin',
    event: true,
    message: 'Quando chegar ao fim da pista %1',
    args: [track],
    tooltip: 'Roda uma vez ao alcançar a chegada. Pode mudar a fase ou mostrar vitória.',
  },
  {
    method: 'collectTrackItem',
    block: 'collect_track_item',
    family: 'begin',
    placement: 'event-body',
    message: 'Recolher o sprite encontrado',
    args: [],
    tooltip:
      'Use dentro de Quando o jogador encontrar. Remove somente a instância encontrada, conservando as outras cópias.',
  },
  {
    method: 'trackScore',
    targets: ['g2d'],
    block: 'track_score',
    family: 'begin',
    message: 'Na pista %1 somar %2 ao placar',
    args: [track, n('AMOUNT', 1)],
    tooltip: 'Muda a pontuação. Use no evento de coleta; valores negativos tiram pontos.',
  },
  {
    method: 'trackHurt',
    targets: ['g2d'],
    block: 'track_hurt',
    family: 'begin',
    message: 'Na pista %1 tirar %2 vida do jogador e piscar',
    args: [track, n('AMOUNT', 1)],
    tooltip:
      'Tira vidas do sprite do jogador e mostra o impacto. Ao acabar a vida, mostra a derrota quando as telas prontas estão configuradas.',
  },
  {
    method: 'trackHud',
    targets: ['g2d'],
    block: 'track_hud',
    family: 'begin',
    placement: 'start-only-command',
    message: 'Mostrar vidas e placar da pista %1: %2 de %3',
    args: [track, text('LABEL', 'Estrelas'), n('TOTAL', 12)],
    tooltip:
      'Mostra automaticamente vidas, pontuação, progresso e botão de pausa. P pausa e R recomeça a partida. Total 0 esconde a meta numérica.',
  },
  {
    method: 'sceneGameScreens',
    targets: ['g2d'],
    block: 'scene_game_screens',
    family: 'begin',
    placement: 'start-only-command',
    message: 'Usar telas prontas: título %1 instruções %2',
    args: [text('TITLE', 'Meu jogo'), text('HELP', 'Pegue as estrelas e desvie dos obstáculos.')],
    tooltip:
      'Prepara início, pausa, vitória e derrota. Enter ou toque começa e continua; P pausa; R reinicia. A nova partida reconstrói os sprites e o percurso.',
  },
  {
    method: 'sceneAnimation',
    block: 'scene_animation',
    family: 'animation',
    message: 'Animar %1 com desenho %2 animação %3 uma vez %4',
    args: [
      sprite,
      { name: 'IMAGE', value: '', field: 'image' },
      { name: 'ANIM', value: 'deslizar', field: 'animation' },
      { name: 'ONCE', value: false },
    ],
    tooltip:
      'Escolha uma animação nomeada do Pinta. A extensão encontra a folha, os quadros e a velocidade. Uma vez = sim toca e para; não repete. Funciona também fora da pista.',
  },
  {
    method: 'sceneResult',
    targets: ['g2d'],
    block: 'scene_result',
    family: 'begin',
    message: 'Mostrar %1',
    args: [
      select('RESULT', 'won', [
        ['vitória', 'won'],
        ['derrota', 'lost'],
      ]),
    ],
    tooltip: 'Encerra a partida com a tela escolhida. Enter ou toque permite uma nova tentativa.',
  },
  {
    method: 'spriteTrackValue',
    targets: ['g2d'],
    block: 'sprite_track_value',
    family: 'more',
    value: true,
    message: 'Na pista %1 ler %2',
    args: [
      track,
      select('PROPERTY', 'score', [
        ['pontos', 'score'],
        ['distância percorrida', 'distance'],
        ['lateral do jogador', 'lateral'],
        ['vidas', 'lives'],
      ]),
    ],
    tooltip: 'Usa os dados da partida em suas próprias condições e regras.',
  },
]
