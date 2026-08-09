import type { ExtensionToolboxCategory } from '#extensions'
import type { BlockDefinition } from '../../blockly/blocks/types'
import { categoryShades } from '../../blockly/colorShades'

// Jogo 3D Avançado = UMA cor da categoria: ÍNDIGO. As sub-categorias são TONS
// dela (derivados por categoryShades mais abaixo). Distinta do rosa (Jogo 2D),
// do teal (Jogo 2D Avançado) e do amarelo (Jogo 3D).
const C = '#4f46e5'

export const gameKit3DBlocks = [
  // ---- 🧰 O jogo ----
  {
    type: 'sz_g3k_setup',
    placement: 'start-only-command',
    message0: 'Preparar o jogo 3D: tela %1 × %2, mundo de %3, céu %4, chão %5',
    args0: [
      { type: 'input_value', name: 'W', check: 'JSValue' },
      { type: 'input_value', name: 'H', check: 'JSValue' },
      { type: 'input_value', name: 'SIZE', check: 'JSValue' },
      { type: 'field_colour_sz', name: 'SKY', colour: '#0b1026' },
      { type: 'field_colour_sz', name: 'GROUND', colour: '#14532d' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'O primeiro bloco do jogo 3D: escolhe a proporção e a resolução interna da tela, o tamanho do mundo (o lado do chão), a cor do céu (vira um degradê) e a do chão. O motor reduz resoluções acima do limite seguro da GPU, ajusta o canvas à janela e monta sombras, luz, câmera de órbita e telas prontas sozinho. Use uma vez, no começo.',
  },
  {
    type: 'sz_g3k_set_effects',
    placement: 'command',
    message0: 'Efeitos de cinema: sombras %1, brilho %2 com força %3, vinheta %4',
    args0: [
      { type: 'field_checkbox', name: 'SHADOWS', checked: true },
      { type: 'field_checkbox', name: 'BLOOM', checked: true },
      { type: 'input_value', name: 'STRENGTH', check: 'JSValue' },
      { type: 'field_checkbox', name: 'VIGNETTE', checked: true },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Liga ou desliga os efeitos que dão cara de cinema: sombras, brilho nas coisas claras e cantos mais escuros. Tudo já vem ligado. Desligue para ganhar velocidade num computador mais fraco.',
  },
  {
    type: 'sz_g3k_set_seed',
    placement: 'command',
    message0: 'Usar a semente %1 para o acaso',
    args0: [{ type: 'input_value', name: 'SEED', check: 'JSValue' }],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Trava o acaso do jogo numa semente: a MESMA semente dá exatamente a MESMA partida. Os enfeites nascem no mesmo lugar, os inimigos vêm na mesma ordem, as faíscas voam igual. Ótimo para testar (o bug acontece de novo!) e para fazer um desafio idêntico para todo mundo. Semente 0 = acaso de verdade. ⚠️ Vale para o acaso do MOTOR e para os blocos "sortear" DESTE kit. O bloco "número aleatório" comum não obedece à semente.',
  },
  {
    type: 'sz_g3k_scatter_decor',
    placement: 'command',
    message0: 'Espalhar %1 enfeites pelo chão (pedras e cristais)',
    args0: [{ type: 'input_value', name: 'COUNT', check: 'JSValue' }],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Decora o mundo na hora: pedras cinzas e cristais brilhantes em lugares aleatórios do chão. Use dentro de "quando o jogo entrar no estado jogando" (chamar de novo troca os enfeites de lugar).',
  },
  {
    type: 'sz_g3k_start',
    placement: 'start-only-command',
    migration: 'remove-engine-boot',
    message0: 'Começar o jogo (mostra o menu)',
    args0: [],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    hidden: true,
    tooltip:
      'Bloco antigo mantido para abrir projetos anteriores. O motor agora começa automaticamente depois de preparar moldes, eventos e telas.',
  },
  {
    type: 'sz_g3k_world_size',
    message0: 'o tamanho do mundo',
    args0: [],
    output: 'JSValue',
    colour: C,
    tooltip: 'O lado do chão do mundo (o do "Preparar o jogo 3D"). Bom para contas de posição.',
  },

  // ---- 🧊 Moldes & peças ----
  {
    type: 'sz_g3k_define_mold',
    placement: 'mold-declaration',
    bodyExecution: 'sync-callback',
    bodyContext: 'g3k-mold-parts',
    message0: 'Criar o molde 3D %1 com vida %2 e velocidade %3',
    args0: [
      { type: 'field_input', name: 'NAME', text: 'inimigo' },
      { type: 'input_value', name: 'HEALTH', check: 'JSValue' },
      { type: 'input_value', name: 'SPEED', check: 'JSValue' },
    ],
    message1: 'com as peças %1',
    args1: [{ type: 'input_statement', name: 'BODY' }],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Um MOLDE é a receita de um tipo de coisa do jogo (herói, torre, invasor, tiro…): a vida, a velocidade e a aparência montada de PEÇAS 3D (como um brinquedo de montar). Defina uma vez; depois faça nascer quantos quiser dele. Sem peça nenhuma, sai um cubinho.',
  },
  {
    type: 'sz_g3k_part',
    placement: {
      root: [],
      nested: ['g3k-mold-parts'],
      directNested: true,
      role: 'command',
    },
    message0: 'Peça %1 %2 cor %3 de %4 × %5 × %6',
    args0: [
      {
        type: 'field_dropdown',
        name: 'SHAPE',
        options: [
          ['caixa', 'box'],
          ['bola', 'sphere'],
          ['cilindro', 'cylinder'],
          ['cone', 'cone'],
          ['plano', 'plane'],
          ['rosca', 'torus'],
          ['pirâmide', 'pyramid'],
          ['rampa', 'rampa'],
          ['modelo importado', 'modelo'],
        ],
      },
      {
        type: 'field_dropdown',
        name: 'MATERIAL',
        options: [
          ['normal', 'normal'],
          ['metal', 'metal'],
          ['vidro', 'vidro'],
          ['brilho', 'brilho'],
        ],
      },
      { type: 'field_colour_sz', name: 'COLOR', colour: '#22d3ee' },
      { type: 'input_value', name: 'W', check: 'JSValue' },
      { type: 'input_value', name: 'H', check: 'JSValue' },
      { type: 'input_value', name: 'D', check: 'JSValue' },
    ],
    message1: 'deslocada para x %1 y %2 z %3, textura %4, modelo %5',
    args1: [
      { type: 'input_value', name: 'X', check: 'JSValue' },
      { type: 'input_value', name: 'Y', check: 'JSValue' },
      { type: 'input_value', name: 'Z', check: 'JSValue' },
      { type: 'field_asset_picker', name: 'TEXTURE', text: '' },
      {
        type: 'field_asset_picker',
        name: 'MODEL',
        text: '',
        kind: '3d',
        filter: 'model3d',
      },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Uma peça do molde: escolha forma, acabamento, cor, tamanho e posição. O acabamento BRILHO acende com o efeito de luz. O y 0.5 coloca um cubo de altura 1 no chão. Com “modelo importado”, escolha um arquivo .glb do projeto. A caixa de colisão continua com o tamanho informado. Use dentro de “Criar o molde 3D”.',
  },

  // ---- 👾 Nascer & enxames ----
  {
    type: 'sz_g3k_spawn',
    placement: 'command',
    message0: 'Nascer 1 do molde %1 em x %2 y %3 z %4',
    args0: [
      { type: 'field_name_picker', name: 'MOLD', text: 'inimigo', kind: 'mold3d' },
      { type: 'input_value', name: 'X', check: 'JSValue' },
      { type: 'input_value', name: 'Y', check: 'JSValue' },
      { type: 'input_value', name: 'Z', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Faz nascer 1 entidade do molde nessa posição do mundo. Use y 0 para colocar no chão. O motor reaproveita as entidades recolhidas, por isso funciona bem mesmo com muitas. Ela nasce no estado “parado”.',
  },
  {
    type: 'sz_g3k_spawn_named',
    placement: 'command',
    message0: 'Nascer 1 do molde %1 em x %2 y %3 z %4, chamando de %5',
    args0: [
      { type: 'field_name_picker', name: 'MOLD', text: 'heroi', kind: 'mold3d' },
      { type: 'input_value', name: 'X', check: 'JSValue' },
      { type: 'input_value', name: 'Y', check: 'JSValue' },
      { type: 'input_value', name: 'Z', check: 'JSValue' },
      { type: 'field_input', name: 'NAME', text: 'heroi' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Como o "Nascer 1", mas dá um APELIDO ao que nasceu. Aí você usa esse nome nos outros blocos (câmera seguir, mover pelas teclas, perseguir…). Perfeito para o herói e o chefão.',
  },
  {
    type: 'sz_g3k_spawn_from',
    placement: 'command',
    message0: 'Nascer 1 do molde %1 no lugar de %2 (virado igual)',
    args0: [
      { type: 'field_name_picker', name: 'MOLD', text: 'tiro', kind: 'mold3d' },
      { type: 'field_name_picker', name: 'FROM', text: 'ela', kind: 'entity3d' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Faz nascer 1 do molde na MESMA posição e virado para o MESMO lado de outra entidade. É assim que o tiro da torre nasce já mirado. Junte com "Mover para frente".',
  },
  {
    type: 'sz_g3k_start_spawner',
    placement: 'resource-creator',
    message0: 'A cada %1 s, nascer 1 do molde %2 %3',
    args0: [
      { type: 'input_value', name: 'SEC', check: 'JSValue' },
      { type: 'field_name_picker', name: 'MOLD', text: 'inimigo', kind: 'mold3d' },
      {
        type: 'field_dropdown',
        name: 'WHERE',
        options: [
          ['na beirada do mundo', 'edge'],
          ['num lugar qualquer do chão', 'anywhere'],
        ],
      },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Liga uma "fábrica" que faz nascer um do molde a cada tantos segundos. É assim que os invasores chegam sem parar. Ligar de novo só TROCA o ritmo (não duplica).',
  },
  {
    type: 'sz_g3k_stop_spawner',
    placement: 'command',
    message0: 'Parar a fábrica do molde %1',
    args0: [{ type: 'field_name_picker', name: 'MOLD', text: 'inimigo', kind: 'mold3d' }],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Desliga a fábrica desse molde. Nada mais nasce dele (os vivos continuam). Bom para fases e fim de onda.',
  },
  {
    type: 'sz_g3k_for_each_alive',
    placement: 'command',
    bodyExecution: 'sync-callback',
    message0: 'Para cada %1 vivo do molde %2',
    args0: [
      { type: 'field_input', name: 'ITEM', text: 'item' },
      { type: 'field_name_picker', name: 'MOLD', text: 'inimigo', kind: 'mold3d' },
    ],
    message1: 'fazer %1',
    args1: [{ type: 'input_statement', name: 'BODY' }],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Repete o "fazer" para CADA entidade viva desse molde. Dentro, "item" é a da vez. Use no "A cada quadro" para regras que valem para todos.',
  },
  {
    type: 'sz_g3k_count_alive',
    message0: 'quantos vivos do molde %1',
    args0: [{ type: 'field_name_picker', name: 'MOLD', text: 'inimigo', kind: 'mold3d' }],
    output: 'JSValue',
    colour: C,
    tooltip: 'Quantas entidades desse molde estão vivas agora. Use numa conta ou num "se".',
  },
  {
    type: 'sz_g3k_recycle',
    placement: 'command',
    message0: 'Recolher %1 (volta pro molde)',
    args0: [{ type: 'field_name_picker', name: 'WHO', text: 'ela', kind: 'entity3d' }],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Tira esta entidade do jogo. O motor reaproveita o mesh e a animação quando outra nascer, mas a entidade recolhida continua inválida (pooling seguro).',
  },
  {
    type: 'sz_g3k_recycle_all',
    placement: 'command',
    message0: 'Recolher todos do molde %1',
    args0: [{ type: 'field_name_picker', name: 'MOLD', text: 'inimigo', kind: 'mold3d' }],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Recolhe todas as entidades vivas desse molde de uma vez. Bom para limpar a arena no "Jogar de novo".',
  },
  {
    type: 'sz_g3k_cull_far',
    placement: 'command',
    message0: 'Recolher do molde %1 quem passar de %2 do centro',
    args0: [
      { type: 'field_name_picker', name: 'MOLD', text: 'tiro', kind: 'mold3d' },
      { type: 'input_value', name: 'DIST', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Recolhe quem foi longe demais do centro do mundo (ex.: tiros que erraram). É o segredo de otimização para o jogo não ficar pesado. Use no "A cada quadro".',
  },

  // ---- 🕹️ Jogar & teclas ----
  {
    type: 'sz_g3k_on_update',
    placement: 'loop-update',
    message0: 'A cada quadro, com o tempo %1 (em segundos)',
    args0: [{ type: 'field_input', name: 'DT', text: 'dt' }],
    message1: 'fazer %1',
    args1: [{ type: 'input_statement', name: 'BODY' }],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'O coração do jogo: roda o "fazer" a cada quadro, SÓ enquanto o estado é "jogando". O tempo (dt) é quanto durou o último quadro, em segundos. Multiplique a velocidade por ele para o jogo andar igual em qualquer computador.',
  },
  {
    type: 'sz_g3k_move_with_keys',
    placement: 'command',
    message0: 'Mover %1 pelas teclas (WASD e setas) a %2 por segundo',
    args0: [
      { type: 'field_name_picker', name: 'CHAR', text: 'heroi', kind: 'entity3d' },
      { type: 'input_value', name: 'SPEED', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Movimento pronto no chão: WASD e setas, com a diagonal na mesma velocidade e o tempo do quadro já embutido. Use DENTRO do "A cada quadro".',
  },
  {
    type: 'sz_g3k_key_down',
    message0: 'a tecla %1 está apertada ?',
    args0: [{ type: 'field_input', name: 'KEY', text: 'w' }],
    output: 'JSValue',
    colour: C,
    tooltip:
      'Verdadeiro enquanto a tecla está sendo segurada. Escreva a letra (w, a, s, d…), as setas (cima, baixo…) ou espaço. Use dentro do "A cada quadro".',
  },
  {
    type: 'sz_g3k_key_pressed',
    message0: 'a tecla %1 acabou de ser apertada ?',
    args0: [{ type: 'field_input', name: 'KEY', text: 'j' }],
    output: 'JSValue',
    colour: C,
    tooltip:
      'Verdadeiro SÓ no quadro em que a tecla desceu (segurar não repete). Perfeito para atirar: um aperto = uma ação.',
  },
  {
    type: 'sz_g3k_set_pause_key',
    placement: 'start-only-command',
    message0: 'Usar a tecla %1 para pausar e continuar',
    args0: [{ type: 'field_input', name: 'KEY', text: 'Escape' }],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'Troca a tecla que alterna a pausa (o padrão é Esc). Use antes de começar o jogo.',
  },

  // ---- 🎥 Câmera ----
  {
    type: 'sz_g3k_camera_follow',
    placement: 'command',
    message0: 'Câmera: seguir %1 de %2 de longe e %3 de altura',
    args0: [
      { type: 'field_name_picker', name: 'CHAR', text: 'heroi', kind: 'entity3d' },
      { type: 'input_value', name: 'DIST', check: 'JSValue' },
      { type: 'input_value', name: 'HEIGHT', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Câmera em 3ª pessoa: fica atrás da entidade, com suavidade profissional. Se ela virar (ex.: "Virar para onde anda"), a câmera acompanha por trás.',
  },
  {
    type: 'sz_g3k_camera_orbit',
    placement: 'command',
    message0: 'Câmera: girar em volta do mundo (arraste o mouse), a %1 de distância',
    args0: [{ type: 'input_value', name: 'DIST', check: 'JSValue' }],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'A câmera de órbita: arraste o mouse para girar em volta do mundo e use a rodinha para aproximar. É a câmera que o jogo já começa usando.',
  },
  {
    type: 'sz_g3k_camera_top',
    placement: 'command',
    message0: 'Câmera: ver de cima, a %1 de altura',
    args0: [{ type: 'input_value', name: 'HEIGHT', check: 'JSValue' }],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'Vista aérea do mundo inteiro. Perfeita para tower defense e jogos de estratégia.',
  },
  {
    type: 'sz_g3k_camera_angle',
    placement: 'command',
    message0: 'Câmera: girar para %1 ° e inclinar %2 °',
    args0: [
      { type: 'input_value', name: 'AZ', check: 'JSValue' },
      { type: 'input_value', name: 'EL', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Gira a câmera de órbita por CÓDIGO (sem esperar o mouse): dá para abrir a fase mostrando o mundo, virar para o chefão ou girar devagarinho a cada quadro. Girar = em volta; inclinar = de quase rente ao chão (5°) até quase de cima (80°).',
  },
  {
    type: 'sz_g3k_camera_distance',
    placement: 'command',
    message0: 'Câmera: afastar %1',
    args0: [{ type: 'input_value', name: 'DIST', check: 'JSValue' }],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Aproxima ou afasta a câmera. Vale tanto para a de órbita quanto para a que segue alguém. Dá para aproximar numa conversa e afastar na luta.',
  },
  {
    type: 'sz_g3k_camera_shake',
    placement: 'command',
    message0: 'Tremer a câmera com força %1 por %2 s',
    args0: [
      { type: 'input_value', name: 'STRENGTH', check: 'JSValue' },
      { type: 'input_value', name: 'SECONDS', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'O tremor de impacto do cinema: use na explosão, no tiro grande, no chefão pisando. O tremor vai sumindo sozinho até acabar. Force baixo (0.2) = sustinho; alto (1) = terremoto.',
  },
  {
    type: 'sz_g3k_camera_lens',
    placement: 'command',
    message0: 'Câmera: lente de %1 °',
    args0: [{ type: 'input_value', name: 'FOV', check: 'JSValue' }],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'O quanto a câmera enxerga de uma vez (o normal é 60°). Diminuir (30°) é dar ZOOM, como uma luneta de mira. Aumentar (100°) alarga tudo e dá sensação de velocidade.',
  },
  {
    type: 'sz_g3k_camera_look_at',
    placement: 'command',
    message0: 'Câmera: olhar para %1',
    args0: [{ type: 'field_name_picker', name: 'CHAR', text: 'heroi', kind: 'entity3d' }],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Faz a câmera de órbita/de cima girar em volta DELA em vez do meio do mundo. Sem este bloco a câmera olha sempre para o centro. Num mundo grande, é o que te deixa acompanhar o herói ou o chefão.',
  },
  {
    type: 'sz_g3k_camera_look_at_point',
    placement: 'command',
    message0: 'Câmera: olhar para o ponto x %1 y %2 z %3',
    args0: [
      { type: 'input_value', name: 'X', check: 'JSValue' },
      { type: 'input_value', name: 'Y', check: 'JSValue' },
      { type: 'input_value', name: 'Z', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Como o "olhar para", mas para um lugar fixo do mundo (a porta, a base, o portal). Ponto 0,0,0 volta a olhar para o meio do mundo.',
  },
  {
    type: 'sz_g3k_camera_smooth',
    placement: 'command',
    message0: 'Câmera: suavidade do seguir %1',
    args0: [{ type: 'input_value', name: 'LAMBDA', check: 'JSValue' }],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'O quanto a câmera que segue gruda em quem ela segue. Baixo (1) = ela vem preguiçosa, de longe, com cara de cinema. Alto (10) = colada, sem atraso nenhum. O normal é 3.',
  },

  // ---- 🤖 Entidades ----
  {
    type: 'sz_g3k_place',
    placement: 'command',
    message0: 'Colocar %1 em x %2 y %3 z %4',
    args0: [
      { type: 'field_name_picker', name: 'CHAR', text: 'heroi', kind: 'entity3d' },
      { type: 'input_value', name: 'X', check: 'JSValue' },
      { type: 'input_value', name: 'Y', check: 'JSValue' },
      { type: 'input_value', name: 'Z', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'Teletransporta a entidade para essa posição do mundo (y 0 = no chão).',
  },
  {
    type: 'sz_g3k_set_yaw',
    placement: 'command',
    message0: 'Girar %1 para %2 graus (bússola)',
    args0: [
      { type: 'field_name_picker', name: 'CHAR', text: 'heroi', kind: 'entity3d' },
      { type: 'input_value', name: 'DEG', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Vira a entidade para essa direção, como uma bússola (0 = frente, 90 = esquerda, 180 = costas…).',
  },
  {
    type: 'sz_g3k_set_velocity',
    placement: 'command',
    message0: 'Dar a %1 a velocidade x %2 y %3 z %4',
    args0: [
      { type: 'field_name_picker', name: 'CHAR', text: 'heroi', kind: 'entity3d' },
      { type: 'input_value', name: 'X', check: 'JSValue' },
      { type: 'input_value', name: 'Y', check: 'JSValue' },
      { type: 'input_value', name: 'Z', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Define a velocidade da entidade (unidades por segundo, em cada eixo). O motor integra sozinho a cada quadro. É a física do curso profissional.',
  },
  {
    type: 'sz_g3k_set_drag',
    placement: 'command',
    message0: 'Frear %1 aos poucos (arrasto %2)',
    args0: [
      { type: 'field_name_picker', name: 'CHAR', text: 'heroi', kind: 'entity3d' },
      { type: 'input_value', name: 'DRAG', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Liga o arrasto: a velocidade da entidade vai morrendo sozinha (quanto maior o número, mais rápido freia). Bom para empurrões e derrapadas. Freia só no PLANO (x/z). A queda continua com a gravidade.',
  },
  {
    type: 'sz_g3k_look_at',
    placement: 'command',
    message0: 'Virar %1 de uma vez para %2',
    args0: [
      { type: 'field_name_picker', name: 'WHO', text: 'ela', kind: 'entity3d' },
      { type: 'field_name_picker', name: 'TARGET', text: 'heroi', kind: 'entity3d' },
    ],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Vira a entidade instantaneamente para a outra. Para o giro SUAVE (de torre), use "Fazer mirar em".',
  },
  {
    type: 'sz_g3k_move_forward',
    placement: 'command',
    message0: 'Mover %1 para frente a %2 por segundo',
    args0: [
      { type: 'field_name_picker', name: 'WHO', text: 'ela', kind: 'entity3d' },
      { type: 'input_value', name: 'SPEED', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Empurra a entidade na direção para onde ela está virada. É o motor do tiro: nasceu virado (com "no lugar de"), é só mover para frente.',
  },
  {
    type: 'sz_g3k_pos_of',
    message0: 'a posição %1 de %2',
    args0: [
      {
        type: 'field_dropdown',
        name: 'AXIS',
        options: [
          ['x', 'x'],
          ['y', 'y'],
          ['z', 'z'],
        ],
      },
      { type: 'field_name_picker', name: 'CHAR', text: 'heroi', kind: 'entity3d' },
    ],
    output: 'JSValue',
    colour: C,
    tooltip: 'A posição da entidade num dos eixos do mundo (x/z = chão, y = altura).',
  },
  {
    type: 'sz_g3k_exists',
    message0: '%1 ainda está no jogo ?',
    args0: [{ type: 'field_name_picker', name: 'CHAR', text: 'alvo', kind: 'entity3d' }],
    output: 'JSValue',
    colour: C,
    tooltip:
      'Verdadeiro se a entidade existe e está viva (não foi recolhida). Use antes de mexer num alvo guardado. Ele pode já ter sido derrotado.',
  },
  {
    type: 'sz_g3k_is_mold',
    message0: '%1 é do molde %2 ?',
    args0: [
      { type: 'field_name_picker', name: 'CHAR', text: 'quem', kind: 'entity3d' },
      { type: 'field_name_picker', name: 'MOLD', text: 'heroi', kind: 'mold3d' },
    ],
    output: 'JSValue',
    colour: C,
    tooltip:
      'Pergunta a IDENTIDADE de uma entidade. É o filtro das zonas: o "quem" do "Quando alguém encostar" pode ser qualquer coisa que entrou (herói, bola, tiro). Pergunte o molde antes de contar o ponto, como os jogos de verdade filtram os alvos.',
  },
  {
    type: 'sz_g3k_set_entity_value',
    placement: 'command',
    message0: 'Guardar em %1 o valor %2 na gaveta %3',
    args0: [
      { type: 'field_name_picker', name: 'CHAR', text: 'ela', kind: 'entity3d' },
      { type: 'input_value', name: 'VALUE', check: 'JSValue' },
      { type: 'field_input', name: 'KEY', text: 'tempo' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Cada entidade tem GAVETAS próprias para lembrar coisas dela mesma: um cronômetro, um contador de tiros, o alvo que ela escolheu. É como os campos privados de cada personagem nos jogos de verdade. A gaveta esvazia quando a entidade nasce.',
  },
  {
    type: 'sz_g3k_entity_value',
    message0: 'o valor da gaveta %1 de %2',
    args0: [
      { type: 'field_input', name: 'KEY', text: 'tempo' },
      { type: 'field_name_picker', name: 'CHAR', text: 'ela', kind: 'entity3d' },
    ],
    output: 'JSValue',
    colour: C,
    tooltip: 'Lê o que essa entidade guardou na gaveta (começa vazia). Par do "Guardar na gaveta".',
  },
  {
    type: 'sz_g3k_state_time',
    message0: 'há quantos segundos %1 está no estado atual',
    args0: [{ type: 'field_name_picker', name: 'CHAR', text: 'ela', kind: 'entity3d' }],
    output: 'JSValue',
    colour: C,
    tooltip:
      'Quanto tempo essa entidade já está no estado atual (zera quando ela muda de estado). Bom para "depois de 2 segundos parado, atacar".',
  },

  // ---- 🧠 Cérebro da entidade (FSM — o coração do curso) ----
  {
    type: 'sz_g3k_on_enter_entity_state',
    placement: 'event',
    message0: 'Quando %1 do molde %2 entrar no estado %3',
    args0: [
      { type: 'field_input', name: 'ITEM', text: 'ela' },
      { type: 'field_name_picker', name: 'MOLD', text: 'torre', kind: 'mold3d' },
      { type: 'field_name_picker', name: 'STATE', text: 'parado', kind: 'entitystate' },
    ],
    message1: 'fazer %1',
    args1: [{ type: 'input_statement', name: 'BODY' }],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Roda o "fazer" toda vez que QUALQUER entidade desse molde ENTRAR nesse estado. Dentro, o apelido é a entidade da vez. É a máquina de estados dos jogos profissionais: cada torre e cada invasor tem o próprio cérebro.',
  },
  {
    type: 'sz_g3k_on_entity_state_update',
    placement: 'loop-update',
    message0: 'Enquanto %1 do molde %2 estiver no estado %3, a cada quadro (tempo %4)',
    args0: [
      { type: 'field_input', name: 'ITEM', text: 'ela' },
      { type: 'field_name_picker', name: 'MOLD', text: 'torre', kind: 'mold3d' },
      { type: 'field_name_picker', name: 'STATE', text: 'parado', kind: 'entitystate' },
      { type: 'field_input', name: 'DT', text: 'dt' },
    ],
    message1: 'fazer %1',
    args1: [{ type: 'input_statement', name: 'BODY' }],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'O cérebro por estado: roda a cada quadro para CADA entidade do molde que estiver nesse estado. A torre do exemplo: no "parado" procura alvo, no "mirar" gira, no "atirar" solta o tiro. Só roda enquanto o jogo está em "jogando".',
  },
  {
    type: 'sz_g3k_on_exit_entity_state',
    placement: 'event',
    message0: 'Quando %1 do molde %2 sair do estado %3',
    args0: [
      { type: 'field_input', name: 'ITEM', text: 'ela' },
      { type: 'field_name_picker', name: 'MOLD', text: 'torre', kind: 'mold3d' },
      { type: 'field_name_picker', name: 'STATE', text: 'mirar', kind: 'entitystate' },
    ],
    message1: 'fazer %1',
    args1: [{ type: 'input_statement', name: 'BODY' }],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'Roda o "fazer" quando a entidade SAIR desse estado (arrumar o que ficou para trás).',
  },
  {
    type: 'sz_g3k_set_entity_state',
    placement: 'command',
    message0: 'Mudar %1 para o estado %2',
    args0: [
      { type: 'field_name_picker', name: 'CHAR', text: 'ela', kind: 'entity3d' },
      { type: 'field_name_picker', name: 'STATE', text: 'mirar', kind: 'entitystate' },
    ],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Muda o estado DESTA entidade. Primeiro sai do estado velho e depois entra no novo. Pedir o estado atual de novo não faz nada, como nos jogos de verdade.',
  },
  {
    type: 'sz_g3k_entity_state_is',
    message0: '%1 está no estado %2 ?',
    args0: [
      { type: 'field_name_picker', name: 'CHAR', text: 'ela', kind: 'entity3d' },
      { type: 'field_name_picker', name: 'STATE', text: 'parado', kind: 'entitystate' },
    ],
    output: 'JSValue',
    colour: C,
    tooltip: 'Verdadeiro se a entidade está nesse estado agora. Use dentro de um "se".',
  },
  {
    type: 'sz_g3k_state_timer',
    placement: 'mold-declaration',
    message0: 'No molde %1, depois de %2 s no estado %3, mudar para %4',
    args0: [
      { type: 'field_name_picker', name: 'MOLD', text: 'torre', kind: 'mold3d' },
      { type: 'input_value', name: 'SEC', check: 'JSValue' },
      { type: 'field_name_picker', name: 'STATE', text: 'recarregar', kind: 'entitystate' },
      { type: 'field_name_picker', name: 'NEXT', text: 'parado', kind: 'entitystate' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Transição automática por tempo: quem ficar tantos segundos nesse estado muda sozinho para o próximo. É o "recarregar → parado" da torre, sem cronômetro na mão.',
  },

  // ---- 🎯 Comportamentos ----
  {
    type: 'sz_g3k_seek',
    placement: 'command',
    message0: 'Fazer %1 perseguir %2',
    args0: [
      { type: 'field_name_picker', name: 'WHO', text: 'ela', kind: 'entity3d' },
      { type: 'field_name_picker', name: 'TARGET', text: 'heroi', kind: 'entity3d' },
    ],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Comportamento de caçador: aponta a velocidade da entidade para o alvo, usando a velocidade do molde dela. Use a cada quadro (no cérebro do estado).',
  },
  {
    type: 'sz_g3k_seek_point',
    placement: 'command',
    message0: 'Fazer %1 andar rumo ao ponto x %2 z %3',
    args0: [
      { type: 'field_name_picker', name: 'WHO', text: 'ela', kind: 'entity3d' },
      { type: 'input_value', name: 'X', check: 'JSValue' },
      { type: 'input_value', name: 'Z', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Anda rumo a um LUGAR do mundo (não a uma entidade), na velocidade do molde, e para ao chegar. Só empurra no chão. A altura continua da gravidade. Com "sortear de … a …" vira passeio; com uma lista de pontos vira patrulha.',
  },
  {
    type: 'sz_g3k_aim_at',
    placement: 'command',
    message0: 'Fazer %1 mirar em %2 (suavidade %3)',
    args0: [
      { type: 'field_name_picker', name: 'WHO', text: 'ela', kind: 'entity3d' },
      { type: 'field_name_picker', name: 'TARGET', text: 'alvo', kind: 'entity3d' },
      { type: 'input_value', name: 'SMOOTH', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'O giro SUAVE da torre do curso: vira aos poucos na direção do alvo (quanto maior a suavidade, mais rápido). Use a cada quadro e pergunte "já está mirando?" para saber a hora de atirar.',
  },
  {
    type: 'sz_g3k_face_velocity',
    placement: 'command',
    message0: 'Virar %1 para onde anda',
    args0: [{ type: 'field_name_picker', name: 'WHO', text: 'ela', kind: 'entity3d' }],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'Vira a entidade na direção do movimento dela. Bom junto com "perseguir".',
  },
  {
    type: 'sz_g3k_is_aiming_at',
    message0: '%1 já está mirando em %2 ?',
    args0: [
      { type: 'field_name_picker', name: 'A', text: 'ela', kind: 'entity3d' },
      { type: 'field_name_picker', name: 'B', text: 'alvo', kind: 'entity3d' },
    ],
    output: 'JSValue',
    colour: C,
    tooltip:
      'Verdadeiro quando a frente da entidade aponta quase exatamente para o alvo. A hora de atirar. É a conta da torre profissional (o "mirar → atirar").',
  },

  // ---- 🕸️ Vizinhança (grade espacial) ----
  {
    type: 'sz_g3k_for_each_near',
    placement: 'command',
    bodyExecution: 'sync-callback',
    message0: 'Para cada %1 do molde %2 a até %3 de %4',
    args0: [
      { type: 'field_input', name: 'ITEM', text: 'vizinho' },
      { type: 'field_name_picker', name: 'MOLD', text: 'inimigo', kind: 'mold3d' },
      { type: 'input_value', name: 'RADIUS', check: 'JSValue' },
      { type: 'field_name_picker', name: 'CHAR', text: 'ela', kind: 'entity3d' },
    ],
    message1: 'fazer %1',
    args1: [{ type: 'input_statement', name: 'BODY' }],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Repete o "fazer" só para quem está PERTO (dentro do raio). Por dentro usa uma grade espacial. O truque dos jogos profissionais para nunca comparar todo mundo com todo mundo.',
  },
  {
    type: 'sz_g3k_store_nearest',
    placement: 'command',
    message0: 'Guardar em %1 quem do molde %2 está mais perto de %3',
    args0: [
      { type: 'field_input', name: 'NAME', text: 'alvo' },
      { type: 'field_name_picker', name: 'MOLD', text: 'inimigo', kind: 'mold3d' },
      { type: 'field_name_picker', name: 'CHAR', text: 'ela', kind: 'entity3d' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Acha a entidade viva mais próxima desse molde e guarda com um apelido. É como a torre escolhe o alvo. Pergunte "ainda está no jogo?" antes de usar (pode não haver ninguém).',
  },
  {
    type: 'sz_g3k_touches',
    message0: '%1 está encostando em %2 (a menos de %3) ?',
    args0: [
      { type: 'field_name_picker', name: 'A', text: 'ela', kind: 'entity3d' },
      { type: 'field_name_picker', name: 'B', text: 'heroi', kind: 'entity3d' },
      { type: 'input_value', name: 'DIST', check: 'JSValue' },
    ],
    inputsInline: true,
    output: 'JSValue',
    colour: C,
    tooltip:
      'Verdadeiro enquanto as duas entidades estão a menos dessa distância uma da outra. É a colisão dos jogos 3D. Use dentro de um "se".',
  },

  // ---- ❤️ Combate ----
  {
    type: 'sz_g3k_hurt',
    placement: 'command',
    message0: 'Machucar %1 tirando %2 de vida',
    args0: [
      { type: 'field_name_picker', name: 'WHO', text: 'ela', kind: 'entity3d' },
      { type: 'input_value', name: 'AMOUNT', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Tira vida da entidade e a deixa piscando e invencível por meio segundo (para não perder tudo de uma vez). Vida no zero = ela é derrotada (roda o "quando for derrotado" e é recolhida sozinha).',
  },
  {
    type: 'sz_g3k_heal',
    placement: 'command',
    message0: 'Curar %1 somando %2 de vida',
    args0: [
      { type: 'field_name_picker', name: 'WHO', text: 'heroi', kind: 'entity3d' },
      { type: 'input_value', name: 'AMOUNT', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Devolve vida à entidade, sem passar do máximo com que ela nasceu. É o oposto do "Machucar": bom para poções, pontos de descanso ou um chefão que se recupera entre as fases.',
  },
  {
    type: 'sz_g3k_health_of',
    message0: 'a vida de %1',
    args0: [{ type: 'field_name_picker', name: 'CHAR', text: 'heroi', kind: 'entity3d' }],
    output: 'JSValue',
    colour: C,
    tooltip: 'Quanto de vida a entidade tem agora. Bom para o placar da tela.',
  },
  {
    type: 'sz_g3k_show_health_bar',
    placement: 'command',
    message0: 'Mostrar a barra de vida do molde %1 %2',
    args0: [
      { type: 'field_name_picker', name: 'MOLD', text: 'chefao', kind: 'mold3d' },
      { type: 'field_checkbox', name: 'ON', checked: true },
    ],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Cada entidade viva desse molde ganha uma barrinha de vida flutuando sobre a cabeça, que acompanha ela pela tela e muda de cor conforme a vida cai. Ligue no chefão e nos inimigos de RPG; desligue para esconder de novo.',
  },
  {
    type: 'sz_g3k_on_entity_death',
    placement: 'event',
    message0: 'Quando %1 do molde %2 for derrotado',
    args0: [
      { type: 'field_input', name: 'ITEM', text: 'ela' },
      { type: 'field_name_picker', name: 'MOLD', text: 'inimigo', kind: 'mold3d' },
    ],
    message1: 'fazer %1',
    args1: [{ type: 'input_statement', name: 'BODY' }],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Roda o "fazer" quando a vida de uma entidade desse molde chegar a zero (pelo "Machucar"). Depois o motor a recolhe sozinho. Bom para somar pontos e soltar som.',
  },
  {
    type: 'sz_g3k_on_hurt',
    placement: 'event',
    message0: 'Quando %1 do molde %2 levar dano',
    args0: [
      { type: 'field_input', name: 'ITEM', text: 'ela' },
      { type: 'field_name_picker', name: 'MOLD', text: 'chefao', kind: 'mold3d' },
    ],
    message1: 'fazer %1',
    args1: [{ type: 'input_statement', name: 'BODY' }],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Roda o "fazer" toda vez que uma entidade desse molde leva dano (pelo "Machucar"). Leia a vida dela ali dentro para trocar de fase, piscar ou revidar. É o coração de um chefão em várias fases.',
  },
  {
    type: 'sz_g3k_spawn_ring',
    placement: 'command',
    message0: 'Disparar um anel de %1: %2 tiros ao redor de %3, velocidade %4',
    args0: [
      { type: 'field_name_picker', name: 'MOLD', text: 'tiro', kind: 'mold3d' },
      { type: 'input_value', name: 'COUNT', check: 'JSValue' },
      { type: 'field_name_picker', name: 'FROM', text: 'chefao', kind: 'entity3d' },
      { type: 'input_value', name: 'SPEED', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Faz nascer vários tiros do molde ao redor da entidade, espalhados em círculo e voando para fora. É o ataque clássico de chefão. Combine com "cortar longe" para limpar os tiros que saem do mundo.',
  },

  // ---- 💥 Faíscas 3D ----
  {
    type: 'sz_g3k_define_effect',
    placement: 'mold-declaration',
    message0: 'Criar o efeito 3D %1: %2 faíscas, cor %3 até %4, espalhar %5',
    args0: [
      { type: 'field_input', name: 'NAME', text: 'explosao' },
      { type: 'input_value', name: 'COUNT', check: 'JSValue' },
      { type: 'field_colour_sz', name: 'C1', colour: '#fb923c' },
      { type: 'field_colour_sz', name: 'C2', colour: '#451a03' },
      { type: 'input_value', name: 'SPREAD', check: 'JSValue' },
    ],
    message1: 'tamanho %1 até %2, vida %3 s, gravidade %4',
    args1: [
      { type: 'input_value', name: 'S1', check: 'JSValue' },
      { type: 'input_value', name: 'S2', check: 'JSValue' },
      { type: 'input_value', name: 'LIFE', check: 'JSValue' },
      { type: 'input_value', name: 'GRAVITY', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Um efeito é a receita de uma explosão de faíscas 3D. Escolha quantidade, cores, espalhamento, tamanhos, duração e gravidade. Gravidade negativa faz cair e positiva faz subir, como fogo. Defina uma vez e solte quantas quiser.',
  },
  {
    type: 'sz_g3k_burst_at',
    placement: 'command',
    message0: 'Soltar o efeito %1 em x %2 y %3 z %4',
    args0: [
      { type: 'field_name_picker', name: 'EFFECT', text: 'explosao', kind: 'effect3d' },
      { type: 'input_value', name: 'X', check: 'JSValue' },
      { type: 'input_value', name: 'Y', check: 'JSValue' },
      { type: 'input_value', name: 'Z', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'Estoura uma explosão de faíscas do efeito nesse ponto do mundo.',
  },
  {
    type: 'sz_g3k_burst_on',
    placement: 'command',
    message0: 'Soltar o efeito %1 em cima de %2',
    args0: [
      { type: 'field_name_picker', name: 'EFFECT', text: 'explosao', kind: 'effect3d' },
      { type: 'field_name_picker', name: 'WHO', text: 'ela', kind: 'entity3d' },
    ],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'Estoura o efeito em cima de uma entidade. Perfeito no "quando for derrotado".',
  },
  {
    type: 'sz_g3k_define_emitter',
    placement: 'mold-declaration',
    message0: 'Criar o emissor 3D %1: cor %2 até %3, tamanho %4 até %5',
    args0: [
      { type: 'field_input', name: 'NAME', text: 'fogo' },
      { type: 'field_colour_sz', name: 'C1', colour: '#fde047' },
      { type: 'field_colour_sz', name: 'C2', colour: '#7f1d1d' },
      { type: 'input_value', name: 'S1', check: 'JSValue' },
      { type: 'input_value', name: 'S2', check: 'JSValue' },
    ],
    message1: '%1 por segundo, força %2, cone %3°, gravidade %4, brilho %5',
    args1: [
      { type: 'input_value', name: 'RATE', check: 'JSValue' },
      { type: 'input_value', name: 'SPEED', check: 'JSValue' },
      { type: 'input_value', name: 'CONE', check: 'JSValue' },
      { type: 'input_value', name: 'GRAVITY', check: 'JSValue' },
      { type: 'field_checkbox', name: 'GLOW', checked: true },
    ],
    message2: 'jeito de nascer e morrer: %1',
    args2: [
      {
        type: 'field_dropdown',
        name: 'CURVE',
        options: [
          ['suave (incha e some)', 'suave'],
          ['linear (some devagar)', 'linear'],
          ['pulso (estoura e murcha)', 'pulso'],
          ['fogo (clarão e escurece)', 'fogo'],
        ],
      },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'A RECEITA de um jorro contínuo de partículas (fogo, fumaça, magia, rastro): a cor do começo e do fim, o tamanho ao nascer e morrer, quantos grãos por segundo, a força com que saem, a abertura do cone (0° = raio reto para cima, 180° = todas as direções), a gravidade (positiva sobe = fogo/fumaça; negativa cai) e se BRILHA (ligado = fogo/glow; desligado = fumaça com transparência). Depois use "Ligar o jorro".',
  },
  {
    type: 'sz_g3k_start_emitter',
    placement: 'command',
    message0: 'Ligar o jorro do efeito %1 em x %2 y %3 z %4',
    args0: [
      { type: 'field_name_picker', name: 'EFFECT', text: 'fogo', kind: 'effect3d' },
      { type: 'input_value', name: 'X', check: 'JSValue' },
      { type: 'input_value', name: 'Y', check: 'JSValue' },
      { type: 'input_value', name: 'Z', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Liga o jorro contínuo desse emissor num ponto fixo do mundo (uma fogueira, uma tocha na parede). Fica jorrando até você desligar.',
  },
  {
    type: 'sz_g3k_emitter_on',
    placement: 'command',
    message0: 'Ligar o jorro do efeito %1 em cima de %2',
    args0: [
      { type: 'field_name_picker', name: 'EFFECT', text: 'fogo', kind: 'effect3d' },
      { type: 'field_name_picker', name: 'WHO', text: 'ela', kind: 'entity3d' },
    ],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Liga o jorro contínuo seguindo uma entidade. O rastro de fogo da nave, a fumaça do carro, a aura mágica do herói. Ele acompanha a entidade por onde ela for.',
  },
  {
    type: 'sz_g3k_stop_emitter',
    placement: 'command',
    message0: 'Desligar o jorro do efeito %1',
    args0: [{ type: 'field_name_picker', name: 'EFFECT', text: 'fogo', kind: 'effect3d' }],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Para de jorrar novas partículas (as que já estão no ar terminam sozinhas). Apagar a fogueira, desligar o rastro.',
  },
  {
    type: 'sz_g3k_add_attractor',
    placement: 'start-only-command',
    message0: 'Puxar as faíscas do efeito %1 para x %2 y %3 z %4',
    args0: [
      { type: 'field_name_picker', name: 'EFFECT', text: 'fogo', kind: 'effect3d' },
      { type: 'input_value', name: 'X', check: 'JSValue' },
      { type: 'input_value', name: 'Y', check: 'JSValue' },
      { type: 'input_value', name: 'Z', check: 'JSValue' },
    ],
    message1: 'com força %1, alcance %2',
    args1: [
      { type: 'input_value', name: 'INT', check: 'JSValue' },
      { type: 'input_value', name: 'RAD', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Cria um ímã que puxa as partículas para um ponto, como um vórtice ou um buraco negro. A força diz quanto puxa e o alcance diz até onde. Registre uma vez, fora de “A cada quadro”. Cada efeito aceita até 16 ímãs.',
  },

  // ---- 🏃 Física ----
  {
    type: 'sz_g3k_fall',
    placement: 'command',
    message0: 'Fazer %1 cair com gravidade %2',
    args0: [
      { type: 'field_name_picker', name: 'CHAR', text: 'heroi', kind: 'entity3d' },
      { type: 'input_value', name: 'G', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Liga a gravidade nessa entidade: ela passa a cair e a pousar no chão (e nas plataformas sólidas). Quanto maior a gravidade, mais pesado. É a base de plataforma e pulo.',
  },
  {
    type: 'sz_g3k_jump',
    placement: 'command',
    message0: 'Fazer %1 pular com força %2',
    args0: [
      { type: 'field_name_picker', name: 'CHAR', text: 'heroi', kind: 'entity3d' },
      { type: 'input_value', name: 'FORCE', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Dá um impulso para cima. Mas SÓ se a entidade estiver no chão (não dá para voar segurando o pulo). Precisa da gravidade ligada.',
  },
  {
    type: 'sz_g3k_on_ground',
    message0: '%1 está no chão ?',
    args0: [{ type: 'field_name_picker', name: 'CHAR', text: 'heroi', kind: 'entity3d' }],
    output: 'JSValue',
    colour: C,
    tooltip:
      'Verdadeiro quando a entidade está pisando no chão ou numa plataforma. Use para o pulo.',
  },
  {
    type: 'sz_g3k_make_solid',
    placement: 'start-only-command',
    message0: 'Fazer o molde %1 ser sólido (parede/chão/plataforma)',
    args0: [{ type: 'field_name_picker', name: 'MOLD', text: 'parede', kind: 'mold3d' }],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Faz as entidades desse molde virarem paredes/chãos SÓLIDOS: quem cai com gravidade não atravessa, para em cima e pode pular delas. É o que transforma caixas em plataformas.',
  },
  {
    type: 'sz_g3k_platformer_keys',
    placement: 'command',
    message0: 'Mover %1 como plataforma: WASD a %2, pulo (espaço) %3',
    args0: [
      { type: 'field_name_picker', name: 'CHAR', text: 'heroi', kind: 'entity3d' },
      { type: 'input_value', name: 'SPEED', check: 'JSValue' },
      { type: 'input_value', name: 'JUMP', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Controle de plataforma pronto: anda no chão com WASD/setas e pula com o espaço (liga a gravidade sozinho). Use dentro do "A cada quadro".',
  },

  // ---- 🕺 Animação do modelo ----
  {
    type: 'sz_g3k_state_anim',
    placement: 'start-only-command',
    message0: 'No molde %1, no estado %2, tocar a animação %3',
    args0: [
      { type: 'field_name_picker', name: 'MOLD', text: 'heroi', kind: 'mold3d' },
      { type: 'field_name_picker', name: 'STATE', text: 'parado', kind: 'entitystate' },
      { type: 'field_input', name: 'CLIP', text: 'Idle' },
    ],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Amarra uma animação do modelo a um estado do cérebro. Você põe isso UMA vez e o boneco se anima sozinho: quando ele muda para o estado, a animação troca junto (com uma passagem suave). É o jeito profissional. O personagem do jogo não pede para animar, ele só muda de estado. O nome da animação é o que vem dentro do .glb (Idle, Run, Walk… cada site nomeia do seu jeito).',
  },
  {
    type: 'sz_g3k_play_anim',
    placement: 'command',
    message0: 'Tocar a animação %1 em %2 %3',
    args0: [
      { type: 'field_input', name: 'CLIP', text: 'Idle' },
      { type: 'field_name_picker', name: 'CHAR', text: 'heroi', kind: 'entity3d' },
      {
        type: 'field_dropdown',
        name: 'LOOP',
        options: [
          ['repetindo', 'LOOP'],
          ['uma vez só', 'ONCE'],
        ],
      },
    ],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Toca uma animação do modelo importado nessa entidade, na hora. "repetindo" é para andar/parado; "uma vez só" é para pular/atacar (fica no último quadro no fim e pode tocar de novo no próximo golpe). Pedir a animação enquanto ela ainda está tocando não recomeça do zero.',
  },
  {
    type: 'sz_g3k_stop_anim',
    placement: 'command',
    message0: 'Parar a animação de %1',
    args0: [{ type: 'field_name_picker', name: 'CHAR', text: 'heroi', kind: 'entity3d' }],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'Congela o boneco no lugar (ele para de se mexer por dentro).',
  },

  // ---- 🎲 Sorteio + ⏱️ Tempo ----
  {
    type: 'sz_g3k_random_between',
    message0: 'sortear de %1 a %2',
    args0: [
      { type: 'input_value', name: 'FROM', check: 'JSValue' },
      { type: 'input_value', name: 'TO', check: 'JSValue' },
    ],
    inputsInline: true,
    output: 'JSValue',
    colour: C,
    tooltip:
      'Um número sorteado entre os dois (pode sair com vírgula). ⚠️ Use ESTE, e não o "número aleatório" comum: só o sorteio do kit obedece à semente. Com ele, a mesma semente dá exatamente a mesma partida.',
  },
  {
    type: 'sz_g3k_random_chance',
    message0: 'sortear com %1 % de chance',
    args0: [{ type: 'input_value', name: 'PERCENT', check: 'JSValue' }],
    inputsInline: true,
    output: 'JSValue',
    colour: C,
    tooltip:
      'Verdadeiro em N% das vezes: 100 é sempre, 0 é nunca, 30 é "às vezes". Bom para o inimigo que às vezes solta um item. Obedece à semente, como o "sortear de … a …".',
  },
  {
    type: 'sz_g3k_start_timer',
    placement: 'resource-creator',
    message0: 'Começar a contagem de %1 s',
    args0: [{ type: 'input_value', name: 'SECONDS', check: 'JSValue' }],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Liga o relógio da partida: corrida contra o tempo, bomba, tempo da fase. Ele só corre no estado jogando. Na pausa CONGELA, e recomeçar a partida zera.',
  },
  {
    type: 'sz_g3k_time_left',
    message0: 'tempo que falta',
    output: 'JSValue',
    colour: C,
    tooltip: 'Quantos segundos faltam na contagem (0 quando acabou). Bom no HUD.',
  },
  {
    type: 'sz_g3k_stop_timer',
    placement: 'command',
    message0: 'Parar a contagem',
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'Congela o relógio onde está (a criança pegou o item que dá tempo, por exemplo).',
  },
  {
    type: 'sz_g3k_on_timer_end',
    placement: 'event',
    message0: 'Quando o tempo acabar',
    message1: 'fazer %1',
    args1: [{ type: 'input_statement', name: 'BODY' }],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Roda UMA vez, no instante em que a contagem chega a zero. É onde você acaba o jogo, abre a porta, solta o chefão.',
  },

  // ---- 💬 Caixa de fala ----
  {
    type: 'sz_g3k_say',
    placement: 'command',
    message0: '%1 diz %2 por %3 s',
    args0: [
      { type: 'field_name_picker', name: 'CHAR', text: 'heroi', kind: 'entity3d' },
      { type: 'input_value', name: 'TEXT', check: 'JSValue' },
      { type: 'input_value', name: 'SECONDS', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Um balão de fala em cima da cabeça dela, que ACOMPANHA ela pela tela e some sozinho no fim do tempo. É o que faz o jogo contar história. Uma fala por vez em cada entidade (falar de novo troca a fala).',
  },
  {
    type: 'sz_g3k_hide_say',
    placement: 'command',
    message0: 'Fechar a fala de %1',
    args0: [{ type: 'field_name_picker', name: 'CHAR', text: 'heroi', kind: 'entity3d' }],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'Some com o balão antes do tempo acabar.',
  },

  // ---- 🔊 Música ----
  {
    type: 'sz_g3k_play_music',
    placement: 'command',
    message0: 'Tocar a música %1 sem parar',
    args0: [{ type: 'field_name_picker', name: 'NAME', text: 'musica', kind: 'sound' }],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'A música de fundo: toca em repetição até você mandar parar. Carregue o som primeiro com "Carregar o som". Só toca UMA música por vez. Pedir outra troca.',
  },
  {
    type: 'sz_g3k_stop_music',
    placement: 'command',
    message0: 'Parar a música',
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'Silencia a música de fundo (os efeitos continuam).',
  },

  {
    type: 'sz_g3k_set_physics',
    placement: 'start-only-command',
    message0: 'Fazer o molde %1 ter física de %2',
    args0: [
      { type: 'field_name_picker', name: 'MOLD', text: 'bola', kind: 'mold3d' },
      {
        type: 'field_dropdown',
        name: 'KIND',
        options: [
          ['🏀 bola', 'bola'],
          ['📦 caixa', 'caixa'],
          ['🧍 personagem', 'personagem'],
          ['🧊 gelo', 'gelo'],
          ['🪶 flutuante', 'flutuante'],
        ],
      },
    ],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Um bloco só e o molde já se comporta como a COISA que ele é: formato que colide, quique, atrito e queda, tudo combinando. 🏀 bola quica e rola pelo chão. 📦 caixa quase não quica e freia. 🧍 personagem NÃO quica em chão nenhum e não engancha em quina. 🧊 gelo escorrega. 🪶 flutuante não cai. Depois dá para afinar cada coisa com os blocos de quique, atrito e colidir como.',
  },

  {
    type: 'sz_g3k_set_collider',
    placement: 'start-only-command',
    message0: 'Fazer o molde %1 colidir como %2',
    args0: [
      { type: 'field_name_picker', name: 'MOLD', text: 'heroi', kind: 'mold3d' },
      {
        type: 'field_dropdown',
        name: 'SHAPE',
        options: [
          ['caixa', 'box'],
          ['bola', 'sphere'],
          ['cápsula (gente)', 'capsule'],
        ],
      },
    ],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Muda o formato INVISÍVEL que colide (não muda o desenho). "caixa" é o padrão. "bola" é boa para bolas e tiros. "cápsula" é a melhor para gente e bicho: não engancha em quina e sobe rampa lisinho.',
  },
  {
    type: 'sz_g3k_pass_through',
    placement: 'command',
    message0: 'Fazer %1 atravessar as paredes %2',
    args0: [
      { type: 'field_name_picker', name: 'CHAR', text: 'tiro', kind: 'entity3d' },
      { type: 'field_checkbox', name: 'GHOST', checked: true },
    ],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Ligado, essa entidade vira FANTASMA e passa através de tudo que é sólido. Bom para tiro mágico, fantasma, ou uma câmera que entra na parede. Desligado, ela volta a bater nas paredes.',
  },
  {
    type: 'sz_g3k_make_trigger',
    placement: 'start-only-command',
    message0: 'Fazer o molde %1 ser uma zona (dá para atravessar)',
    args0: [{ type: 'field_name_picker', name: 'MOLD', text: 'moeda', kind: 'mold3d' }],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'A zona NÃO empurra ninguém: dá para passar por dentro. Mas o motor avisa quem entrou, com o bloco "Quando alguém encostar". Boa para moeda, porta, armadilha e linha de chegada.',
  },
  {
    type: 'sz_g3k_on_overlap',
    placement: 'event',
    message0: 'Quando alguém encostar em %1 do molde %2',
    args0: [
      { type: 'field_input', name: 'ZONE', text: 'zona' },
      { type: 'field_name_picker', name: 'MOLD', text: 'moeda', kind: 'mold3d' },
    ],
    message1: 'quem encostou é %1',
    args1: [{ type: 'field_input', name: 'WHO', text: 'quem' }],
    message2: 'fazer %1',
    args2: [{ type: 'input_statement', name: 'BODY', check: 'JSStmt' }],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Roda o "fazer" na hora em que alguém ENTRA na zona. Uma vez por entrada, não a cada quadro. "zona" é a moeda/porta que foi encostada e "quem" é quem encostou nela.',
  },
  {
    type: 'sz_g3k_set_bounce',
    placement: 'start-only-command',
    message0: 'Fazer o molde %1 quicar %2',
    args0: [
      { type: 'field_name_picker', name: 'MOLD', text: 'trampolim', kind: 'mold3d' },
      { type: 'input_value', name: 'AMOUNT', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Quem bater nesse molde sólido volta. 0 = não quica (é o normal), 0.5 = volta com metade da força, 1 = volta com tudo. Faz trampolim e bola pula-pula.',
  },
  {
    type: 'sz_g3k_set_friction',
    placement: 'start-only-command',
    message0: 'Fazer o molde %1 ter atrito %2',
    args0: [
      { type: 'field_name_picker', name: 'MOLD', text: 'gelo', kind: 'mold3d' },
      { type: 'input_value', name: 'AMOUNT', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'O quanto esse chão SEGURA quem está pisando em cima. 0 = escorrega feito gelo (é o normal), 1 = gruda e para rápido. Só vale enquanto a entidade está no chão.',
  },

  // ---- 💡 Luz & céu ----
  {
    type: 'sz_g3k_add_light',
    placement: 'resource-creator',
    message0: 'Pôr uma luz %1 em x %2 y %3 z %4 com força %5',
    args0: [
      { type: 'field_colour_sz', name: 'COLOR', colour: '#fff1b8' },
      { type: 'input_value', name: 'X', check: 'JSValue' },
      { type: 'input_value', name: 'Y', check: 'JSValue' },
      { type: 'input_value', name: 'Z', check: 'JSValue' },
      { type: 'input_value', name: 'INTENSITY', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Acende uma luz colorida num ponto do mundo (tocha, fogueira, lâmpada). Ótima para dar clima. Ponha no começo, não a cada quadro; o mundo aceita até 8 luzes extras para manter o jogo rápido.',
  },
  {
    type: 'sz_g3k_set_ambient',
    placement: 'resource-creator',
    message0: 'Luz do ambiente com força %1 (0 = escuro, 1 = claro)',
    args0: [{ type: 'input_value', name: 'INTENSITY', check: 'JSValue' }],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Muda o quanto o mundo inteiro é iluminado. Baixe para modo noturno/caverna (aí as luzes que você põe fazem diferença). Use na preparação ou em uma reação que acontece uma vez, nunca a cada quadro.',
  },
  {
    type: 'sz_g3k_set_fog',
    placement: 'resource-creator',
    message0: 'Névoa %1 de %2 até %3 de distância',
    args0: [
      { type: 'field_colour_sz', name: 'COLOR', colour: '#9ca3af' },
      { type: 'input_value', name: 'NEAR', check: 'JSValue' },
      { type: 'input_value', name: 'FAR', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Enche o ar de névoa: o que está longe some na cor escolhida. Dá mistério e esconde a borda do mundo. Use na preparação ou em uma reação que acontece uma vez, nunca a cada quadro.',
  },
  {
    type: 'sz_g3k_set_sky_photo',
    placement: 'start-only-command',
    message0: 'Usar o céu de foto %1',
    args0: [
      {
        type: 'field_asset_picker',
        name: 'PHOTO',
        text: 'ceu',
        kind: '3d',
        filter: 'environment3d',
      },
    ],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Troca o céu por uma FOTO 360° de verdade. Escolha um arquivo .hdr do projeto: além de aparecer no fundo, ele ilumina a cena inteira e faz o metal refletir o ambiente.',
  },
  {
    type: 'sz_g3k_set_sky',
    placement: 'command',
    message0: 'Trocar o céu: de %1 no alto até %2 no horizonte',
    args0: [
      { type: 'field_colour_sz', name: 'TOP', colour: '#0b1026' },
      { type: 'field_colour_sz', name: 'BOTTOM', colour: '#93c5fd' },
    ],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'Muda o degradê do céu em qualquer momento (dia, pôr do sol, noite).',
  },

  {
    type: 'sz_g3k_velocity_of',
    message0: 'a velocidade de %1 no eixo %2',
    args0: [
      { type: 'field_name_picker', name: 'CHAR', text: 'ela', kind: 'entity3d' },
      {
        type: 'field_dropdown',
        name: 'AXIS',
        options: [
          ['↔ x', 'x'],
          ['↕ y', 'y'],
          ['⤢ z', 'z'],
        ],
      },
    ],
    output: 'JSValue',
    colour: C,
    tooltip:
      'O quanto ela está andando por segundo naquele eixo. y negativo = está caindo; y positivo = está subindo. Serve para saber se caiu longe demais, se está parada, ou para animar pelo movimento.',
  },
  {
    type: 'sz_g3k_distance_between',
    message0: 'a distância de %1 até %2',
    args0: [
      { type: 'field_name_picker', name: 'A', text: 'heroi', kind: 'entity3d' },
      { type: 'field_name_picker', name: 'B', text: 'alvo', kind: 'entity3d' },
    ],
    inputsInline: true,
    output: 'JSValue',
    colour: C,
    tooltip:
      'Quantos metros separam as duas entidades. Diferente de "encostou", que só responde sim/não, aqui você tem o NÚMERO. Dá para fazer o inimigo correr mais quando está longe, o som ficar mais alto perto, etc.',
  },
  {
    type: 'sz_g3k_max_health_of',
    message0: 'a vida MÁXIMA de %1',
    args0: [{ type: 'field_name_picker', name: 'CHAR', text: 'ela', kind: 'entity3d' }],
    output: 'JSValue',
    colour: C,
    tooltip:
      'A vida com que esse molde nasce. Junto com "a vida de", dá para desenhar a barra de vida na proporção certa (vida ÷ vida máxima).',
  },
  {
    type: 'sz_g3k_state_of',
    message0: 'o estado de %1',
    args0: [{ type: 'field_name_picker', name: 'CHAR', text: 'ela', kind: 'entity3d' }],
    output: 'JSValue',
    colour: C,
    tooltip:
      'O NOME do estado em que ela está agora (parado, mirar, atirar…). O bloco "está no estado?" só responde sim/não para um estado; este devolve o nome, bom para mostrar no HUD ou comparar.',
  },

  // ---- 🖱️ Mira & clique (raycast) + 1ª pessoa ----
  {
    type: 'sz_g3k_pick',
    placement: 'command',
    message0: 'Guardar em %1 a entidade do molde %2 sob o mouse',
    args0: [
      { type: 'field_input', name: 'NAME', text: 'escolhida' },
      { type: 'field_name_picker', name: 'MOLD', text: 'inimigo', kind: 'mold3d' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Dispara um raio da câmera pelo ponteiro e guarda com um apelido a entidade desse molde que estiver embaixo do mouse (ou nada). É o coração de clicar/selecionar: point-and-click, torre por clique, estratégia. Pergunte "ainda está no jogo?" antes de usar.',
  },
  {
    type: 'sz_g3k_pointer_over',
    message0: 'o mouse está sobre %1 ?',
    args0: [{ type: 'field_name_picker', name: 'CHAR', text: 'ela', kind: 'entity3d' }],
    output: 'JSValue',
    colour: C,
    tooltip:
      'Verdadeiro quando o ponteiro está em cima dessa entidade. Para brilhar ao passar o mouse, mostrar dica, etc.',
  },
  {
    type: 'sz_g3k_ground_point',
    message0: 'o ponto do chão sob o mouse, eixo %1',
    args0: [
      {
        type: 'field_dropdown',
        name: 'AXIS',
        options: [
          ['↔ x', 'x'],
          ['↕ y', 'y'],
          ['⤢ z', 'z'],
        ],
      },
    ],
    output: 'JSValue',
    colour: C,
    tooltip:
      'Onde no chão do mundo o mouse está apontando (x, y ou z). Use para mover algo até o clique, mirar no chão ou construir onde a criança apontar.',
  },
  {
    type: 'sz_g3k_mouse_pressed',
    message0: 'o mouse foi clicado agora ?',
    args0: [],
    output: 'JSValue',
    colour: C,
    tooltip:
      'Verdadeiro SÓ no quadro do clique/toque sobre o mundo 3D. Botões das telas não contam. É o gatilho do point-and-click: "se o mouse foi clicado agora, guardar quem está sob o mouse".',
  },
  {
    type: 'sz_g3k_mouse_down',
    message0: 'o mouse está apertado ?',
    args0: [],
    output: 'JSValue',
    colour: C,
    tooltip:
      'Verdadeiro enquanto o botão do mouse (ou o dedo) está SEGURADO. Bom para carregar um tiro, arrastar mirando ou regar uma plantinha sem soltar.',
  },
  {
    type: 'sz_g3k_camera_fps',
    placement: 'command',
    message0: 'Câmera em 1ª pessoa em %1 (olhar com o mouse)',
    args0: [{ type: 'field_name_picker', name: 'CHAR', text: 'heroi', kind: 'entity3d' }],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Vê o mundo pelos olhos da entidade. Clique na tela para capturar o mouse e olhar em volta. Trocar de câmera, pausar ou terminar devolve o cursor. Combine com "mover em 1ª pessoa" para um jogo de explorar/atirar em 1ª pessoa.',
  },
  {
    type: 'sz_g3k_move_fps',
    placement: 'command',
    message0: 'Mover %1 em 1ª pessoa (WASD) a %2',
    args0: [
      { type: 'field_name_picker', name: 'CHAR', text: 'heroi', kind: 'entity3d' },
      { type: 'input_value', name: 'SPEED', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Anda para onde a câmera de 1ª pessoa está olhando: W/S vai e volta, A/D anda de lado. Use dentro do "A cada quadro", junto da câmera em 1ª pessoa.',
  },

  // ---- 🖼️ Telas & HUD ----
  {
    type: 'sz_g3k_set_screen_text',
    placement: 'start-only-command',
    message0: 'Na tela pronta %1, escrever título %2 texto %3 e botão %4',
    args0: [
      {
        type: 'field_dropdown',
        name: 'SCREEN',
        options: [
          ['menu', 'menu'],
          ['pausa', 'pausa'],
          ['carregando', 'carregando'],
          ['fim', 'fim'],
          ['vitória', 'vitoria'],
        ],
      },
      { type: 'input_value', name: 'TITLE', check: 'JSValue' },
      { type: 'input_value', name: 'TEXT', check: 'JSValue' },
      { type: 'input_value', name: 'BTN', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Personaliza uma tela que já vem pronta (menu, pausa, carregando, fim ou vitória): o título, o texto de apoio e o texto do primeiro botão. Deixe em branco o que não quiser mudar.',
  },
  {
    type: 'sz_g3k_create_screen',
    placement: 'start-only-command',
    message0: 'Criar a tela %1 com título %2 e texto %3',
    args0: [
      { type: 'field_input', name: 'NAME', text: 'loja' },
      { type: 'input_value', name: 'TITLE', check: 'JSValue' },
      { type: 'input_value', name: 'TEXT', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Cria uma tela SUA (ex.: loja, instruções), no mesmo estilo das prontas. Começa escondida. Use "Mostrar a tela". Usar o nome de uma pronta faz você ASSUMIR a tela (os botões dela saem).',
  },
  {
    type: 'sz_g3k_add_button',
    placement: 'start-only-command',
    bodyExecution: 'deferred-callback',
    userGesture: true,
    message0: 'Botão %1 na tela %2',
    args0: [
      { type: 'input_value', name: 'LABEL', check: 'JSValue' },
      { type: 'field_name_picker', name: 'SCREEN', text: 'vitoria', kind: 'screen' },
    ],
    message1: 'ao clicar %1',
    args1: [{ type: 'input_statement', name: 'BODY' }],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Põe um botão numa tela (pronta ou sua) e diz o que acontece no clique. Mudar de estado, voltar ao menu, o que você quiser.',
  },
  {
    type: 'sz_g3k_show_screen',
    placement: 'command',
    message0: 'Mostrar a tela %1',
    args0: [{ type: 'field_name_picker', name: 'SCREEN', text: 'vitoria', kind: 'screen' }],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'Mostra uma tela por cima do jogo (e esconde as outras).',
  },
  {
    type: 'sz_g3k_hide_screens',
    placement: 'command',
    message0: 'Esconder todas as telas',
    args0: [],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'Esconde qualquer tela que esteja aparecendo. Sobra só o jogo.',
  },
  {
    type: 'sz_g3k_hud_text',
    placement: 'command',
    message0: 'Escrever no canto %1 da tela: %2',
    args0: [
      {
        type: 'field_dropdown',
        name: 'SLOT',
        options: [
          ['cima-esquerda', 'top-left'],
          ['cima-meio', 'top-center'],
          ['cima-direita', 'top-right'],
          ['baixo-esquerda', 'bottom-left'],
          ['baixo-direita', 'bottom-right'],
        ],
      },
      { type: 'input_value', name: 'TEXT', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Escreve um texto fixo num canto da tela (placar, vida, avisos). O HUD do jogo. Escrever de novo no mesmo canto troca o texto; texto vazio apaga.',
  },

  // ---- 🚦 Estados do jogo ----
  {
    type: 'sz_g3k_set_state',
    placement: 'command',
    message0: 'Mudar o estado do jogo para %1',
    args0: [{ type: 'field_name_picker', name: 'STATE', text: 'jogando', kind: 'gamestate' }],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'O jogo vive em UM estado por vez: menu, jogando, pausado, fim, vitoria… ou um que você inventar. Entrar em "jogando" (fora da pausa) RECOMEÇA a arena; as telas prontas aparecem sozinhas.',
  },
  {
    type: 'sz_g3k_on_enter_state',
    placement: 'event',
    message0: 'Quando o jogo entrar no estado %1',
    args0: [{ type: 'field_name_picker', name: 'STATE', text: 'jogando', kind: 'gamestate' }],
    message1: 'fazer %1',
    args1: [{ type: 'input_statement', name: 'BODY' }],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Roda o "fazer" toda vez que o jogo ENTRAR nesse estado. É onde a partida se monta: fazer nascer o herói e as torres, ligar as fábricas, zerar os pontos.',
  },
  {
    type: 'sz_g3k_state_is',
    message0: 'o estado do jogo é %1 ?',
    args0: [{ type: 'field_name_picker', name: 'STATE', text: 'jogando', kind: 'gamestate' }],
    output: 'JSValue',
    colour: C,
    tooltip: 'Verdadeiro se o jogo está nesse estado agora. Use dentro de um "se".',
  },
  {
    type: 'sz_g3k_game_state',
    message0: 'o estado do jogo',
    args0: [],
    output: 'JSValue',
    colour: C,
    tooltip: 'O nome do estado atual (ex.: "menu", "jogando").',
  },
  {
    type: 'sz_g3k_return_to_menu',
    placement: 'command',
    message0: 'Voltar ao menu',
    args0: [],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'Para o que estiver acontecendo e volta para a tela de menu.',
  },
  {
    type: 'sz_g3k_end_game',
    placement: 'command',
    message0: 'Terminar o jogo (mostra a tela de fim)',
    args0: [],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Muda para o estado "fim" e mostra a tela de fim de jogo (com o botão de jogar de novo).',
  },

  // ---- 📢 Avisos ----
  {
    type: 'sz_g3k_on_event',
    placement: 'event',
    message0: 'Quando chegar o aviso %1',
    args0: [{ type: 'field_name_picker', name: 'NAME', text: 'invasor:caiu', kind: 'event' }],
    message1: 'fazer %1',
    args1: [{ type: 'input_statement', name: 'BODY' }],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'O jeito profissional de ligar as partes do jogo: roda o "fazer" toda vez que alguém "avisar" esse aviso. Quem avisa não precisa conhecer quem escuta.',
  },
  {
    type: 'sz_g3k_emit',
    placement: 'command',
    message0: 'Avisar todo mundo: %1',
    args0: [{ type: 'field_name_picker', name: 'NAME', text: 'invasor:caiu', kind: 'event' }],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Dispara um aviso. Todos os blocos "Quando chegar o aviso" com esse nome rodam. Invente o nome que quiser (ex.: invasor:caiu, onda:acabou).',
  },

  // ---- 🔊 Som ----
  {
    type: 'sz_g3k_load_sound',
    placement: 'start-only-command',
    message0: 'Carregar o som %1 chamando de %2',
    args0: [
      { type: 'field_sound_picker', name: 'SOUND', text: '' },
      { type: 'field_input', name: 'NAME', text: 'explosao' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Prepara um som que você importou (em "Imagens e sons"). Dê um nome; é ele que você usa em "Tocar o som". Use no comecinho, antes de o jogo começar automaticamente.',
  },
  {
    type: 'sz_g3k_play_sound',
    placement: 'command',
    message0: 'Tocar o som %1',
    args0: [{ type: 'field_name_picker', name: 'NAME', text: 'explosao', kind: 'sound' }],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Toca um som que você carregou. Combina com os avisos: "Quando chegar o aviso invasor:caiu, tocar o som explosao".',
  },
  {
    type: 'sz_g3k_play_effect',
    placement: 'command',
    message0: 'Tocar o som pronto %1',
    args0: [
      {
        type: 'field_dropdown',
        name: 'FX',
        options: [
          ['moeda', 'coin'],
          ['batida', 'hit'],
          ['explosão', 'explosion'],
          ['pulo', 'jump'],
          ['laser', 'laser'],
          ['dano', 'hurt'],
          ['poder', 'powerup'],
          ['vitória', 'win'],
          ['fim de jogo', 'gameover'],
          ['clique', 'click'],
        ],
      },
    ],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Toca um efeito sonoro já pronto (feito na hora pelo computador, sem precisar importar arquivo). Ótimo para testar rápido.',
  },
  {
    type: 'sz_g3k_play_tone',
    placement: 'command',
    message0: 'Tocar um som de %1 Hz por %2 ms',
    args0: [
      { type: 'input_value', name: 'FREQ', check: 'JSValue' },
      { type: 'input_value', name: 'MS', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Toca uma notinha: quanto maior o Hz, mais agudo. O motor aceita de 20 a 20000 Hz, até 10 segundos e no máximo 32 notas simultâneas.',
  },
] satisfies BlockDefinition[]

/**
 * Sub-categorias da paleta (a cor de cada uma é um TOM do índigo, derivado
 * abaixo). A ordem segue o fluxo mental do kit: preparar o mundo → o que as
 * coisas SÃO (moldes) → nascer → jogar → câmera → entidades → o cérebro (FSM)
 * → comportamentos → vizinhança → combate → telas → estados → avisos → som.
 */
const SUBCATS: { name: string; colour: string; types: string[] }[] = [
  {
    name: '🧰 O jogo',
    colour: C,
    types: [
      'sz_g3k_setup',
      'sz_g3k_set_effects',
      'sz_g3k_set_seed',
      'sz_g3k_scatter_decor',
      'sz_g3k_world_size',
    ],
  },
  {
    name: '🧊 Moldes & peças',
    colour: C,
    types: ['sz_g3k_define_mold', 'sz_g3k_part'],
  },
  {
    // O molde desenha o boneco; esta categoria faz ele se MEXER por dentro.
    name: '🕺 Animação do modelo',
    colour: C,
    types: ['sz_g3k_state_anim', 'sz_g3k_play_anim', 'sz_g3k_stop_anim'],
  },
  {
    name: '👾 Nascer & fábricas',
    colour: C,
    types: [
      'sz_g3k_spawn',
      'sz_g3k_spawn_named',
      'sz_g3k_spawn_from',
      'sz_g3k_spawn_ring',
      'sz_g3k_start_spawner',
      'sz_g3k_stop_spawner',
    ],
  },
  {
    name: '♻️ Enxame & reciclagem',
    colour: C,
    types: [
      'sz_g3k_for_each_alive',
      'sz_g3k_count_alive',
      'sz_g3k_recycle',
      'sz_g3k_recycle_all',
      'sz_g3k_cull_far',
    ],
  },
  {
    name: '🕹️ Jogar & teclas',
    colour: C,
    types: [
      'sz_g3k_on_update',
      'sz_g3k_move_with_keys',
      'sz_g3k_move_fps',
      'sz_g3k_key_down',
      'sz_g3k_key_pressed',
      'sz_g3k_set_pause_key',
    ],
  },
  {
    name: '🎥 Câmera',
    colour: C,
    types: [
      // Os modos primeiro (escolher a câmera), depois os ajustes (mexer nela).
      'sz_g3k_camera_follow',
      'sz_g3k_camera_orbit',
      'sz_g3k_camera_top',
      'sz_g3k_camera_fps',
      'sz_g3k_camera_angle',
      'sz_g3k_camera_distance',
      'sz_g3k_camera_look_at',
      'sz_g3k_camera_look_at_point',
      'sz_g3k_camera_lens',
      'sz_g3k_camera_smooth',
      'sz_g3k_camera_shake',
    ],
  },
  {
    name: '🤖 Entidades',
    colour: C,
    types: [
      'sz_g3k_place',
      'sz_g3k_set_yaw',
      'sz_g3k_set_velocity',
      'sz_g3k_set_drag',
      'sz_g3k_look_at',
      'sz_g3k_move_forward',
      'sz_g3k_pos_of',
      'sz_g3k_velocity_of',
      'sz_g3k_distance_between',
      'sz_g3k_exists',
      'sz_g3k_is_mold',
    ],
  },
  {
    // A "gaveta" é a VARIÁVEL da criança presa à entidade — outro conceito que
    // transform/movimento. Estava afogada em 🤖 Entidades, que fazia 3 trabalhos.
    name: '🗄️ Dados da entidade',
    colour: C,
    types: ['sz_g3k_set_entity_value', 'sz_g3k_entity_value'],
  },
  {
    name: '🧠 Cérebro da entidade',
    colour: C,
    types: [
      'sz_g3k_on_enter_entity_state',
      'sz_g3k_on_entity_state_update',
      'sz_g3k_on_exit_entity_state',
      'sz_g3k_set_entity_state',
      'sz_g3k_entity_state_is',
      'sz_g3k_state_timer',
      'sz_g3k_state_time',
      'sz_g3k_state_of',
    ],
  },
  {
    name: '🎯 Comportamentos',
    colour: C,
    types: [
      'sz_g3k_seek',
      'sz_g3k_seek_point',
      'sz_g3k_aim_at',
      'sz_g3k_face_velocity',
      'sz_g3k_is_aiming_at',
    ],
  },
  {
    name: '🏃 Física',
    colour: C,
    types: [
      'sz_g3k_fall',
      'sz_g3k_jump',
      'sz_g3k_on_ground',
      'sz_g3k_make_solid',
      'sz_g3k_platformer_keys',
      // O preset vem ANTES dos ajustes finos: é o atalho ("é uma bola") de onde a
      // criança parte; colidir como/quique/atrito são para afinar depois.
      'sz_g3k_set_physics',
      'sz_g3k_set_collider',
      'sz_g3k_pass_through',
      'sz_g3k_make_trigger',
      'sz_g3k_on_overlap',
      'sz_g3k_set_bounce',
      'sz_g3k_set_friction',
    ],
  },
  {
    name: '💡 Luz & céu',
    colour: C,
    types: [
      'sz_g3k_add_light',
      'sz_g3k_set_ambient',
      'sz_g3k_set_fog',
      'sz_g3k_set_sky',
      'sz_g3k_set_sky_photo',
    ],
  },
  {
    name: '🖱️ Mira & clique',
    colour: C,
    types: [
      'sz_g3k_pick',
      'sz_g3k_pointer_over',
      'sz_g3k_ground_point',
      'sz_g3k_mouse_pressed',
      'sz_g3k_mouse_down',
    ],
  },
  {
    name: '🕸️ Vizinhança',
    colour: C,
    types: ['sz_g3k_for_each_near', 'sz_g3k_store_nearest', 'sz_g3k_touches'],
  },
  {
    name: '❤️ Combate',
    colour: C,
    types: [
      'sz_g3k_hurt',
      'sz_g3k_heal',
      'sz_g3k_health_of',
      'sz_g3k_max_health_of',
      'sz_g3k_show_health_bar',
      'sz_g3k_on_entity_death',
      'sz_g3k_on_hurt',
    ],
  },
  {
    name: '💥 Faíscas 3D',
    colour: C,
    types: ['sz_g3k_define_effect', 'sz_g3k_burst_at', 'sz_g3k_burst_on'],
  },
  {
    // Rajada (estoura e acaba) e jorro contínuo (liga e fica) são famílias
    // diferentes — o próprio runtime já as separa nos comentários da API.
    name: '🌊 Emissores & atratores',
    colour: C,
    types: [
      'sz_g3k_define_emitter',
      'sz_g3k_start_emitter',
      'sz_g3k_emitter_on',
      'sz_g3k_stop_emitter',
      'sz_g3k_add_attractor',
    ],
  },
  {
    name: '🖼️ Telas & HUD',
    colour: C,
    types: [
      'sz_g3k_set_screen_text',
      'sz_g3k_create_screen',
      'sz_g3k_add_button',
      'sz_g3k_show_screen',
      'sz_g3k_hide_screens',
      'sz_g3k_hud_text',
    ],
  },
  {
    name: '🚦 Estados do jogo',
    colour: C,
    types: [
      'sz_g3k_set_state',
      'sz_g3k_on_enter_state',
      'sz_g3k_state_is',
      'sz_g3k_game_state',
      'sz_g3k_return_to_menu',
      'sz_g3k_end_game',
    ],
  },
  {
    // O sorteio DO KIT (semeado) + o relógio da criança. O bloco de acaso do
    // núcleo NÃO obedece à semente — por isso o kit tem o seu.
    name: '🎲 Sorteio & tempo',
    colour: C,
    types: [
      'sz_g3k_random_between',
      'sz_g3k_random_chance',
      'sz_g3k_start_timer',
      'sz_g3k_time_left',
      'sz_g3k_stop_timer',
      'sz_g3k_on_timer_end',
    ],
  },
  {
    name: '💬 Fala',
    colour: C,
    types: ['sz_g3k_say', 'sz_g3k_hide_say'],
  },
  {
    name: '📢 Avisos',
    colour: C,
    types: ['sz_g3k_on_event', 'sz_g3k_emit'],
  },
  {
    name: '🔊 Som',
    colour: C,
    types: [
      'sz_g3k_load_sound',
      'sz_g3k_play_music',
      'sz_g3k_stop_music',
      'sz_g3k_play_sound',
      'sz_g3k_play_effect',
      'sz_g3k_play_tone',
    ],
  },
]

// Cada sub-categoria recebe um TOM do índigo da categoria (claro→escuro).
const SUBCAT_SHADES = categoryShades(C, SUBCATS.length)
SUBCATS.forEach((sc, i) => {
  sc.colour = SUBCAT_SHADES[i] ?? C
})
// Cor = navegação: pinta cada bloco com a cor do seu grupo.
const COLOUR_BY_TYPE = new Map<string, string>(
  SUBCATS.flatMap((sc) => sc.types.map((t) => [t, sc.colour] as const)),
)
for (const b of gameKit3DBlocks) {
  const colour = COLOUR_BY_TYPE.get(b.type)
  if (colour) b.colour = colour
}

// Rede de segurança: bloco fora de qualquer sub-categoria cai num grupo "Mais".
const CATEGORIZED = new Set(SUBCATS.flatMap((sc) => sc.types))
const leftover = gameKit3DBlocks
  .filter((block) => !block.hidden)
  .map((block) => block.type)
  .filter((type) => !CATEGORIZED.has(type))

// Sombras pré-preenchidas dos soquetes de VALOR que aparecem na paleta.
const txtShadow = (text: string) => ({ shadow: { type: 'sz_val_text', fields: { TEXT: text } } })
const numShadow = (value: number) => ({ shadow: { type: 'sz_val_number', fields: { NUM: value } } })
export const G3K_SOCKET_SHADOWS: Record<string, Record<string, unknown>> = {
  sz_g3k_setup: { W: numShadow(1280), H: numShadow(720), SIZE: numShadow(80) },
  sz_g3k_set_effects: { STRENGTH: numShadow(1.2) },
  sz_g3k_set_seed: { SEED: numShadow(42) },
  sz_g3k_scatter_decor: { COUNT: numShadow(16) },
  sz_g3k_define_mold: { HEALTH: numShadow(30), SPEED: numShadow(3) },
  // O y 0.5 senta um cubo unitário no chão (peças são autoradas do chão para cima).
  sz_g3k_part: {
    W: numShadow(1),
    H: numShadow(1),
    D: numShadow(1),
    X: numShadow(0),
    Y: numShadow(0.5),
    Z: numShadow(0),
  },
  sz_g3k_spawn: { X: numShadow(0), Y: numShadow(0), Z: numShadow(0) },
  sz_g3k_spawn_named: { X: numShadow(0), Y: numShadow(0), Z: numShadow(0) },
  sz_g3k_start_spawner: { SEC: numShadow(2) },
  sz_g3k_cull_far: { DIST: numShadow(60) },
  sz_g3k_move_with_keys: { SPEED: numShadow(8) },
  sz_g3k_camera_follow: { DIST: numShadow(8), HEIGHT: numShadow(4) },
  sz_g3k_camera_orbit: { DIST: numShadow(25) },
  sz_g3k_camera_top: { HEIGHT: numShadow(40) },
  sz_g3k_camera_angle: { AZ: numShadow(40), EL: numShadow(28) },
  sz_g3k_camera_distance: { DIST: numShadow(25) },
  sz_g3k_camera_shake: { STRENGTH: numShadow(0.5), SECONDS: numShadow(0.3) },
  sz_g3k_camera_lens: { FOV: numShadow(60) },
  sz_g3k_camera_look_at_point: { X: numShadow(0), Y: numShadow(0), Z: numShadow(0) },
  sz_g3k_camera_smooth: { LAMBDA: numShadow(3) },
  sz_g3k_place: { X: numShadow(0), Y: numShadow(0), Z: numShadow(0) },
  sz_g3k_set_yaw: { DEG: numShadow(0) },
  sz_g3k_set_velocity: { X: numShadow(0), Y: numShadow(0), Z: numShadow(0) },
  sz_g3k_set_drag: { DRAG: numShadow(3) },
  sz_g3k_set_entity_value: { VALUE: numShadow(0) },
  sz_g3k_move_forward: { SPEED: numShadow(6) },
  sz_g3k_state_timer: { SEC: numShadow(1.5) },
  sz_g3k_seek_point: { X: numShadow(0), Z: numShadow(0) },
  sz_g3k_aim_at: { SMOOTH: numShadow(5) },
  sz_g3k_fall: { G: numShadow(20) },
  sz_g3k_jump: { FORCE: numShadow(9) },
  sz_g3k_platformer_keys: { SPEED: numShadow(8), JUMP: numShadow(9) },
  sz_g3k_set_bounce: { AMOUNT: numShadow(0.5) },
  sz_g3k_set_friction: { AMOUNT: numShadow(0.5) },
  sz_g3k_add_light: {
    X: numShadow(0),
    Y: numShadow(6),
    Z: numShadow(0),
    INTENSITY: numShadow(1),
  },
  sz_g3k_set_ambient: { INTENSITY: numShadow(0.4) },
  sz_g3k_set_fog: { NEAR: numShadow(8), FAR: numShadow(60) },
  sz_g3k_move_fps: { SPEED: numShadow(6) },
  sz_g3k_for_each_near: { RADIUS: numShadow(10) },
  sz_g3k_touches: { DIST: numShadow(1.5) },
  sz_g3k_hurt: { AMOUNT: numShadow(10) },
  sz_g3k_heal: { AMOUNT: numShadow(20) },
  sz_g3k_spawn_ring: { COUNT: numShadow(8), SPEED: numShadow(6) },
  sz_g3k_define_effect: {
    COUNT: numShadow(24),
    SPREAD: numShadow(6),
    S1: numShadow(0.5),
    S2: numShadow(0),
    LIFE: numShadow(0.8),
    GRAVITY: numShadow(-9),
  },
  sz_g3k_burst_at: { X: numShadow(0), Y: numShadow(1), Z: numShadow(0) },
  sz_g3k_define_emitter: {
    S1: numShadow(0.5),
    S2: numShadow(0),
    RATE: numShadow(30),
    SPEED: numShadow(3),
    CONE: numShadow(20),
    GRAVITY: numShadow(2),
  },
  sz_g3k_start_emitter: { X: numShadow(0), Y: numShadow(1), Z: numShadow(0) },
  sz_g3k_add_attractor: {
    X: numShadow(0),
    Y: numShadow(3),
    Z: numShadow(0),
    INT: numShadow(20),
    RAD: numShadow(5),
  },
  sz_g3k_random_between: { FROM: numShadow(0), TO: numShadow(1) },
  sz_g3k_random_chance: { PERCENT: numShadow(50) },
  sz_g3k_start_timer: { SECONDS: numShadow(30) },
  sz_g3k_say: { TEXT: txtShadow('Olá!'), SECONDS: numShadow(2) },
  sz_g3k_set_screen_text: {
    TITLE: txtShadow('Meu Jogo 3D'),
    TEXT: txtShadow('WASD ou setas para andar'),
    BTN: txtShadow('Jogar'),
  },
  sz_g3k_create_screen: {
    TITLE: txtShadow('Minha loja'),
    TEXT: txtShadow('Bem-vindo!'),
  },
  sz_g3k_add_button: { LABEL: txtShadow('Jogar de novo') },
  sz_g3k_hud_text: { TEXT: txtShadow('Pontos: 0') },
  sz_g3k_play_tone: { FREQ: numShadow(440), MS: numShadow(200) },
}

/**
 * (só p/ teste de drift) Tipo do literal de SOMBRA por soquete da paleta — todo
 * soquete daqui precisa constar em `LEGACY_VALUE_FIELDS` com o kind casado
 * (restaura a shadow-ness na reconstrução IR→blocos).
 */
export const G3K_SOCKET_SHADOW_TYPES: Record<string, Record<string, string>> = Object.fromEntries(
  Object.entries(G3K_SOCKET_SHADOWS).map(([type, slots]) => [
    type,
    Object.fromEntries(
      Object.entries(slots).map(([slot, wrapper]) => [
        slot,
        String((wrapper as { shadow?: { type?: string } }).shadow?.type ?? ''),
      ]),
    ),
  ]),
)

const toolboxBlock = (type: string) => {
  const inputs = G3K_SOCKET_SHADOWS[type]
  return inputs ? { kind: 'block' as const, type, inputs } : { kind: 'block' as const, type }
}

export const gameKit3DToolboxCategory: ExtensionToolboxCategory = {
  kind: 'category',
  name: 'Jogo 3D Avançado',
  colour: C,
  contents: [
    ...SUBCATS.map((sc) => ({
      kind: 'category' as const,
      name: sc.name,
      colour: sc.colour,
      contents: sc.types.map(toolboxBlock),
    })),
    ...(leftover.length > 0
      ? [
          {
            kind: 'category' as const,
            name: 'Mais',
            colour: C,
            contents: leftover.map(toolboxBlock),
          },
        ]
      : []),
  ],
}
