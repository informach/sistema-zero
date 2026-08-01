import type { BlockDefinition } from '../../../blockly/blocks/types'
import { GAME_KIT_COLOUR as C } from './shared'

export const gameKitBlockDefinitions01: BlockDefinition[] = [
  // ---- 🧰 O jogo ----
  {
    type: 'sz_gk_setup',
    placement: 'start-only-command',
    message0: 'Preparar o jogo profissional: tela %1 × %2, fundo %3, destaque %4',
    args0: [
      { type: 'input_value', name: 'W', check: 'JSValue' },
      { type: 'input_value', name: 'H', check: 'JSValue' },
      { type: 'field_colour_sz', name: 'BG', colour: '#1a1a2e' },
      { type: 'field_colour_sz', name: 'ACCENT', colour: '#4a9eff' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'O primeiro bloco do jogo profissional: cria a tela com essa resolução (que nunca muda por dentro) e a ajusta sozinha ao tamanho da janela, mantendo a proporção. Também prepara as telas prontas (menu, pausa, carregando, fim) com as suas cores. Use uma vez, no começo.',
  },

  {
    type: 'sz_gk_setup_full',
    placement: 'start-only-command',
    message0: 'Preparar o jogo para ocupar a tela toda: fundo %1, destaque %2',
    args0: [
      { type: 'field_colour_sz', name: 'BG', colour: '#1a1a2e' },
      { type: 'field_colour_sz', name: 'ACCENT', colour: '#4a9eff' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Como o "Preparar o jogo", mas SEM dimensões: o canvas ocupa a tela inteira e a área do jogo ACOMPANHA o tamanho da janela (sem barras nas laterais). Aqui "a largura/altura do jogo" mudam junto com a tela. Centralize as coisas usando esses blocos, não números fixos. Combine com "entrar em tela cheia" para o jogo tomar o monitor todo. Use um OU o outro "Preparar", no começo.',
  },

  {
    // Moldura no ELEMENTO do canvas (não desenhada por dentro): não gasta pixel
    // do jogo e nada a apaga. Mesma frase do bloco da Jogo 2D básica.
    type: 'sz_gk_stage_border',
    placement: 'start-only-command',
    message0: 'Mostrar a borda da tela, cor %1 espessura %2',
    args0: [
      { type: 'field_colour_sz', name: 'COLOR', colour: '#e2e8f0' },
      { type: 'input_value', name: 'WIDTH', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Desenha uma moldura colorida em volta da tela do jogo, para ver onde começa e termina a área de desenho. Ótimo para explicar o palco. Para tirar, apague o bloco.',
  },

  {
    type: 'sz_gk_start',
    placement: 'start-only-command',
    migration: 'remove-engine-boot',
    message0: 'Começar o jogo (carrega as imagens e mostra o menu)',
    args0: [],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    hidden: true,
    tooltip:
      'Bloco legado mantido para abrir projetos antigos. O Estúdio agora carrega as imagens e liga o jogo automaticamente.',
  },

  {
    type: 'sz_gk_game_width',
    message0: 'a largura do jogo',
    args0: [],
    output: 'JSValue',
    colour: C,
    tooltip:
      'A largura da tela do jogo. Com o "Preparar o jogo" normal não muda com a janela; com "ocupar a tela toda" passa a valer a largura da janela.',
  },

  {
    type: 'sz_gk_game_height',
    message0: 'a altura do jogo',
    args0: [],
    output: 'JSValue',
    colour: C,
    tooltip:
      'A altura da tela do jogo. Com o "Preparar o jogo" normal não muda com a janela; com "ocupar a tela toda" passa a valer a altura da janela.',
  },

  // ---- ⏳ Carregar ----
  {
    type: 'sz_gk_load_image',
    placement: 'start-only-command',
    message0: 'Carregar a imagem %1 chamando de %2',
    args0: [
      { type: 'field_asset_picker', name: 'ASSET', text: 'heroi' },
      { type: 'field_input', name: 'NAME', text: 'heroi' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'OPCIONAL: pré-carrega uma imagem do projeto (a tela de "carregando" espera todas) e dá um apelido a ela. Hoje não é obrigatório. Os blocos de personagem/inimigo/molde já carregam a imagem do Pinta sozinhos ao escolher. Use este bloco só se quiser um apelido diferente do nome do arquivo. Se a imagem falhar, o jogo segue com um retângulo.',
  },

  // ---- 🖼️ Telas ----
  {
    type: 'sz_gk_set_screen_text',
    placement: 'command',
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
      'Personaliza uma tela que já vem pronta (menu, pausa, carregando, fim ou vitória): o título grande, o texto de apoio e o texto do primeiro botão. Deixe em branco o que não quiser mudar.',
  },

  {
    type: 'sz_gk_create_screen',
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
      'Cria uma tela SUA (ex.: loja, instruções), no mesmo estilo das prontas. Ela começa escondida. Use "Mostrar a tela" quando quiser. Dá para pôr botões nela. Usar o nome de uma tela pronta (ex.: vitoria) faz você ASSUMIR a tela: os botões dela saem e os textos passam a ser os seus.',
  },

  {
    type: 'sz_gk_add_button',
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
    type: 'sz_gk_set_screen_bg',
    placement: 'start-only-command',
    message0: 'Na tela %1, pôr fundo cor %2 e imagem %3',
    args0: [
      { type: 'field_name_picker', name: 'SCREEN', text: 'pausa', kind: 'screen' },
      { type: 'field_colour_sz', name: 'COLOR', colour: '#1a1e33' },
      { type: 'field_asset_picker', name: 'IMAGE', text: '' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Deixa uma tela (pronta ou sua) com a SUA cara: uma cor de fundo (o "quadrado colorido por baixo") e, se quiser, uma imagem do Pinta cobrindo o painel. Ótimo para telas de entrada, pausa e fim. Deixe a imagem vazia para usar só a cor.',
  },

  {
    type: 'sz_gk_show_screen',
    placement: 'command',
    message0: 'Mostrar a tela %1',
    args0: [{ type: 'field_name_picker', name: 'SCREEN', text: 'vitoria', kind: 'screen' }],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'Mostra uma tela por cima do jogo (e esconde as outras).',
  },

  {
    type: 'sz_gk_hide_screens',
    placement: 'command',
    message0: 'Esconder todas as telas',
    args0: [],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'Esconde qualquer tela que esteja aparecendo. Sobra só o jogo.',
  },

  // ---- 🚦 Estados ----
  {
    type: 'sz_gk_set_state',
    placement: 'command',
    message0: 'Mudar o estado do jogo para %1',
    args0: [{ type: 'field_name_picker', name: 'STATE', text: 'jogando', kind: 'gamestate' }],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'O jogo profissional vive em UM estado por vez: menu, jogando, pausado, fim… ou um que você inventar (loja, vitória). O "a cada quadro" só roda em "jogando"; as telas prontas aparecem sozinhas nos estados delas.',
  },

  {
    type: 'sz_gk_restart_game',
    placement: 'command',
    message0: 'Começar uma nova partida',
    args0: [],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Limpa completamente a partida anterior e começa em “jogando”. Use em botões Jogar/Jogar de novo; mudar de estado nunca apaga o jogo.',
  },

  {
    type: 'sz_gk_on_game_start',
    placement: 'legacy-start',
    migration: 'unwrap-start',
    message0: 'Quando começar ou recomeçar uma partida',
    args0: [],
    message1: 'fazer %1',
    args1: [{ type: 'input_statement', name: 'BODY' }],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    hidden: true,
    tooltip:
      'Bloco legado mantido para projetos antigos. Em projetos novos, prepare cada partida na área “⚙️ Ao iniciar”.',
  },

  {
    type: 'sz_gk_on_enter_state',
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
      'Roda toda vez que o jogo realmente entrar nesse estado. Para preparar uma partida nova, use a área “⚙️ Ao iniciar”.',
  },

  {
    type: 'sz_gk_state_is',
    message0: 'o estado do jogo é %1 ?',
    args0: [{ type: 'field_name_picker', name: 'STATE', text: 'jogando', kind: 'gamestate' }],
    output: 'JSValue',
    colour: C,
    tooltip: 'Verdadeiro se o jogo está nesse estado agora. Use dentro de um "se".',
  },

  {
    type: 'sz_gk_game_state',
    message0: 'o estado do jogo',
    args0: [],
    output: 'JSValue',
    colour: C,
    tooltip: 'O nome do estado atual (ex.: "menu", "jogando").',
  },

  {
    type: 'sz_gk_pause',
    placement: 'command',
    message0: 'Pausar o jogo',
    args0: [],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'Congela o jogo e mostra a tela de pausa (só funciona enquanto está jogando).',
  },

  {
    type: 'sz_gk_resume',
    placement: 'command',
    message0: 'Continuar o jogo',
    args0: [],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'Sai da pausa e volta a jogar.',
  },

  {
    type: 'sz_gk_return_to_menu',
    placement: 'command',
    message0: 'Voltar ao menu',
    args0: [],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'Para o que estiver acontecendo e volta para a tela de menu.',
  },

  {
    type: 'sz_gk_end_game',
    placement: 'command',
    message0: 'Terminar o jogo (mostra a tela de fim)',
    args0: [],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Muda para o estado "fim" e mostra a tela de fim de jogo (com o botão de jogar de novo).',
  },

  // ---- 🔁 A cada quadro ----
  {
    type: 'sz_gk_on_update',
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
    type: 'sz_gk_on_draw',
    placement: 'loop-draw-world',
    bodyContext: 'draw-world',
    message0: 'Desenhar o jogo com o pincel %1',
    args0: [{ type: 'field_input', name: 'PARAM', text: 'ctx' }],
    message1: 'fazer %1',
    args1: [{ type: 'input_statement', name: 'BODY' }],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Tudo o que aparece no jogo é desenhado aqui, a cada quadro: pinte o fundo, desenhe os personagens e o placar. Os blocos de Canvas funcionam aqui dentro, usando esse pincel. Desenha em "jogando", "pausado", "fim" e nos SEUS estados. Só NÃO no "menu" nem no "carregando" (para um menu desenhado, use um estado inventado). Com a câmera ligada, este desenho é do MUNDO (anda com a câmera).',
  },

  {
    type: 'sz_gk_on_draw_hud',
    placement: 'loop-draw-hud',
    bodyContext: 'draw-hud',
    message0: 'Desenhar por cima (HUD) com o pincel %1',
    args0: [{ type: 'field_input', name: 'PARAM', text: 'ctx' }],
    message1: 'fazer %1',
    args1: [{ type: 'input_statement', name: 'BODY' }],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Desenha DEPOIS de tudo, preso na TELA (a câmera não mexe aqui): placar, barras, avisos. É o jeito profissional de separar o mundo do painel (HUD).',
  },

  {
    type: 'sz_gk_draw_background',
    placement: 'command',
    message0: 'Pintar o fundo do jogo de %1 com grade %2',
    args0: [
      { type: 'field_colour_sz', name: 'COLOR', colour: '#0f3460' },
      { type: 'field_checkbox', name: 'GRID', checked: true },
    ],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Pinta a tela inteira com a cor (apagando o quadro anterior) e, se quiser, desenha uma grade por cima. Use no COMEÇO do "Desenhar o jogo".',
  },

  // ---- 🧍 Personagens ----
  {
    type: 'sz_gk_create_character',
    placement: 'resource-creator',
    message0: 'Criar o personagem %1 com imagem %2 largura %3 altura %4 velocidade %5 e cor %6',
    args0: [
      { type: 'field_input', name: 'NAME', text: 'heroi' },
      { type: 'field_asset_picker', name: 'IMAGE', text: 'heroi' },
      { type: 'input_value', name: 'W', check: 'JSValue' },
      { type: 'input_value', name: 'H', check: 'JSValue' },
      { type: 'input_value', name: 'SPEED', check: 'JSValue' },
      { type: 'field_colour_sz', name: 'COLOR', colour: '#4a9eff' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Cria um personagem do jogo (herói, moeda, inimigo…). Ele nasce no centro da tela. A imagem é um desenho do Pinta. Escolha direto, não precisa "Carregar a imagem" antes; sem imagem, aparece um retângulo da cor escolhida. A velocidade é em pixels por segundo.',
  },

  {
    type: 'sz_gk_move_with_keys',
    placement: 'command',
    message0: 'Mover o personagem %1 pelas teclas (WASD e setas) usando o tempo %2',
    args0: [
      { type: 'field_name_picker', name: 'CHAR', text: 'heroi', kind: 'character' },
      { type: 'field_name_picker', name: 'DT', text: 'dt', kind: 'variable' },
    ],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Movimento profissional pronto: WASD e setas, com a diagonal na mesma velocidade e usando o tempo do quadro. Use DENTRO do "A cada quadro". Quer inventar outro movimento? Troque este bloco pelas suas próprias contas.',
  },

  {
    type: 'sz_gk_keep_on_screen',
    placement: 'command',
    message0: 'Manter o personagem %1 dentro da tela',
    args0: [{ type: 'field_name_picker', name: 'CHAR', text: 'heroi', kind: 'character' }],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'Impede o personagem de sair da tela do jogo. Use depois de mover.',
  },

  {
    type: 'sz_gk_draw_character',
    placement: 'command',
    message0: 'Desenhar o personagem %1',
    args0: [{ type: 'field_name_picker', name: 'CHAR', text: 'heroi', kind: 'character' }],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Desenha o personagem: a imagem dele (se já carregou) ou um retângulo da cor dele. Use dentro do "Desenhar o jogo".',
  },

  {
    type: 'sz_gk_place_character',
    placement: 'command',
    message0: 'Colocar o personagem %1 em x %2 y %3',
    args0: [
      { type: 'field_name_picker', name: 'CHAR', text: 'heroi', kind: 'character' },
      { type: 'input_value', name: 'X', check: 'JSValue' },
      { type: 'input_value', name: 'Y', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'Teletransporta o personagem para essa posição (o canto de cima/esquerda dele).',
  },

  {
    type: 'sz_gk_reset_character',
    placement: 'command',
    message0: 'Recolocar o personagem %1 no centro da tela',
    args0: [{ type: 'field_name_picker', name: 'CHAR', text: 'heroi', kind: 'character' }],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'Volta o personagem ao centro e desliga o turbo. Bom ao começar uma partida.',
  },

  {
    type: 'sz_gk_set_speed_multiplier',
    placement: 'command',
    message0: 'Mudar a velocidade do personagem %1 para %2 × (1 = normal, 2 = dobro, 0.5 = metade)',
    args0: [
      { type: 'field_name_picker', name: 'CHAR', text: 'heroi', kind: 'character' },
      { type: 'input_value', name: 'FACTOR', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Multiplica a velocidade do personagem (2 = dobro; 0.5 = metade; 1 = normal). Perfeito para power-ups.',
  },

  {
    type: 'sz_gk_characters_touch',
    message0: 'o personagem %1 e %2 se encostam ?',
    args0: [
      { type: 'field_name_picker', name: 'A', text: 'heroi', kind: 'character' },
      { type: 'field_name_picker', name: 'B', text: 'moeda', kind: 'character' },
    ],
    output: 'JSValue',
    colour: C,
    tooltip: 'Verdadeiro enquanto os dois personagens estão se encostando. Use dentro de um "se".',
  },

  {
    type: 'sz_gk_char_x',
    message0: 'a posição x do personagem %1',
    args0: [{ type: 'field_name_picker', name: 'CHAR', text: 'heroi', kind: 'character' }],
    output: 'JSValue',
    colour: C,
    tooltip: 'A posição x (borda esquerda) do personagem.',
  },

  {
    type: 'sz_gk_char_y',
    message0: 'a posição y do personagem %1',
    args0: [{ type: 'field_name_picker', name: 'CHAR', text: 'heroi', kind: 'character' }],
    output: 'JSValue',
    colour: C,
    tooltip: 'A posição y (borda de cima) do personagem.',
  },

  // ---- ⌨️ Teclas ----
  {
    type: 'sz_gk_key_down',
    message0: 'a tecla %1 está apertada ?',
    args0: [{ type: 'field_input', name: 'KEY', text: 'w' }],
    output: 'JSValue',
    colour: C,
    tooltip:
      'Verdadeiro enquanto a tecla está sendo segurada. Escreva a letra (w, a, s, d…), ArrowUp/ArrowDown para setas, ou espaço. Use dentro do "A cada quadro".',
  },

  {
    type: 'sz_gk_key_pressed',
    message0: 'a tecla %1 acabou de ser apertada ?',
    args0: [{ type: 'field_input', name: 'KEY', text: 'j' }],
    output: 'JSValue',
    colour: C,
    tooltip:
      'Verdadeiro SÓ no quadro em que a tecla desceu (segurar não repete). Perfeito para golpe/tiro: um aperto = uma ação. Use dentro do "A cada quadro".',
  },

  {
    type: 'sz_gk_set_pause_key',
    placement: 'start-only-command',
    message0: 'Usar a tecla %1 para pausar e continuar',
    args0: [{ type: 'field_input', name: 'KEY', text: 'Escape' }],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'Troca a tecla que alterna pausa (o padrão é Esc). Use em “Ao iniciar”.',
  },

  // ---- 📢 Avisos (event bus) ----
  {
    type: 'sz_gk_on_event',
    placement: 'event',
    message0: 'Quando chegar o aviso %1',
    args0: [{ type: 'field_name_picker', name: 'NAME', text: 'inimigo:morreu', kind: 'event' }],
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
    type: 'sz_gk_emit',
    placement: 'command',
    message0: 'Avisar todo mundo: %1',
    args0: [{ type: 'field_name_picker', name: 'NAME', text: 'inimigo:morreu', kind: 'event' }],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Dispara um aviso. Todos os blocos "Quando chegar o aviso" com esse nome rodam. Invente o nome que quiser (ex.: inimigo:morreu, ponto:feito).',
  },

  // ---- 👾 Moldes & enxames ----
  {
    type: 'sz_gk_define_mold',
    placement: 'start-only-command',
    message0:
      'Criar o molde %1: tamanho %2 × %3, vida %4, velocidade %5, dano %6, cor %7, imagem %8, aparência %9, caixa %10',
    args0: [
      { type: 'field_input', name: 'NAME', text: 'inimigo' },
      { type: 'input_value', name: 'W', check: 'JSValue' },
      { type: 'input_value', name: 'H', check: 'JSValue' },
      { type: 'input_value', name: 'HEALTH', check: 'JSValue' },
      { type: 'input_value', name: 'SPEED', check: 'JSValue' },
      { type: 'input_value', name: 'DAMAGE', check: 'JSValue' },
      { type: 'field_colour_sz', name: 'COLOR', colour: '#e94f4f' },
      { type: 'field_asset_picker', name: 'IMAGE', text: '' },
      { type: 'field_name_picker', name: 'LOOK', text: '', kind: 'look' },
      // Padrão quadrada: quem não mexer gera o MESMO código de antes.
      {
        type: 'field_dropdown',
        name: 'SHAPE',
        options: [
          ['quadrada', 'retangulo'],
          ['redonda', 'circulo'],
        ],
      },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Um MOLDE são os DADOS de um tipo de personagem (inimigo, moeda, tiro…). Defina uma vez; depois faça quantos quiser dele. É como os jogos profissionais organizam muitos personagens iguais. A imagem (pixel) ou a aparência (vetor) são opcionais; sem elas, sai um retângulo da cor. A caixa redonda deixa bola, bolha e moeda encostarem mais justo.',
  },

  {
    type: 'sz_gk_spawn_from_mold',
    placement: 'command',
    message0: 'Nascer 1 do molde %1 em x %2 y %3',
    args0: [
      { type: 'field_name_picker', name: 'MOLD', text: 'inimigo', kind: 'mold' },
      { type: 'input_value', name: 'X', check: 'JSValue' },
      { type: 'input_value', name: 'Y', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Faz nascer 1 personagem do molde nessa posição. O motor reaproveita personagens recolhidos, por isso funciona bem mesmo com muitos.',
  },

  {
    type: 'sz_gk_spawn_named',
    placement: 'command',
    message0: 'Nascer 1 do molde %1 em x %2 y %3 e chamar de %4',
    args0: [
      { type: 'field_name_picker', name: 'MOLD', text: 'tiro', kind: 'mold' },
      { type: 'input_value', name: 'X', check: 'JSValue' },
      { type: 'input_value', name: 'Y', check: 'JSValue' },
      { type: 'field_input', name: 'NAME', text: 'chefe' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Como o "Nascer 1", mas dá um APELIDO ao que nasceu. Aí você pode mexer nele nos blocos de personagem (perseguir, empurrar, machucar…). Perfeito para tiro mirado e chefão.',
  },

  {
    type: 'sz_gk_start_spawner',
    placement: 'resource-creator',
    message0: 'A cada %1 s, nascer 1 do molde %2 numa borda da tela',
    args0: [
      { type: 'input_value', name: 'SEC', check: 'JSValue' },
      { type: 'field_name_picker', name: 'MOLD', text: 'inimigo', kind: 'mold' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Liga uma "fábrica" que faz nascer um do molde a cada tantos segundos, entrando por uma das 4 bordas. É assim que jogos de sobrevivência soltam inimigos sem parar. Ligar de novo só TROCA o ritmo (não duplica).',
  },

  {
    type: 'sz_gk_stop_spawner',
    placement: 'command',
    message0: 'Parar a fábrica do molde %1',
    args0: [{ type: 'field_name_picker', name: 'MOLD', text: 'inimigo', kind: 'mold' }],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Desliga a fábrica desse molde. Nada mais nasce dele (os vivos continuam). Bom para fases, chefões e fim de onda.',
  },

  {
    type: 'sz_gk_for_each_active',
    placement: 'command',
    bodyExecution: 'sync-callback',
    message0: 'Para cada %1 vivo do molde %2',
    args0: [
      { type: 'field_input', name: 'ITEM', text: 'item' },
      { type: 'field_name_picker', name: 'MOLD', text: 'inimigo', kind: 'mold' },
    ],
    message1: 'fazer %1',
    args1: [{ type: 'input_statement', name: 'BODY' }],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Repete o "fazer" para CADA personagem vivo desse molde. Dentro, "item" é o da vez. Use no "A cada quadro" para mover/testar todos (ex.: perseguir o herói, ver se encostou).',
  },

  {
    type: 'sz_gk_cull_offscreen',
    placement: 'command',
    message0: 'Recolher do molde %1 quem saiu %2 px da tela',
    args0: [
      { type: 'field_name_picker', name: 'MOLD', text: 'inimigo', kind: 'mold' },
      { type: 'input_value', name: 'MARGIN', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Recolhe (guarda de volta) os personagens que foram longe demais da tela. O segredo de otimização para o jogo não ficar pesado. Use no "A cada quadro".',
  },

  {
    type: 'sz_gk_recycle',
    placement: 'command',
    message0: 'Recolher %1 (volta pro molde)',
    args0: [{ type: 'field_name_picker', name: 'WHO', text: 'item', kind: 'character' }],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Tira este personagem do jogo e guarda para reaproveitar depois (ex.: quando o inimigo morre). Melhor que "apagar". Não desperdiça.',
  },

  {
    type: 'sz_gk_draw_active',
    placement: 'command',
    message0: 'Desenhar todos vivos do molde %1',
    args0: [{ type: 'field_name_picker', name: 'MOLD', text: 'inimigo', kind: 'mold' }],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Desenha de uma vez todos os personagens vivos desse molde (com a aparência, imagem ou retângulo dele). Use dentro do "Desenhar o jogo".',
  },

  {
    type: 'sz_gk_count_active',
    message0: 'quantos vivos do molde %1',
    args0: [{ type: 'field_name_picker', name: 'MOLD', text: 'inimigo', kind: 'mold' }],
    output: 'JSValue',
    colour: C,
    tooltip: 'Quantos personagens desse molde estão vivos agora. Use numa conta ou num "se".',
  },

  // ---- 🎨 Desenho (aparência vetorial) ----
  {
    type: 'sz_gk_define_look',
    placement: 'start-only-command',
    bodyExecution: 'deferred-callback',
    message0: 'Criar a aparência %1 (tamanho-base %2 × %3), desenhando com o pincel %4 assim:',
    args0: [
      { type: 'field_input', name: 'NAME', text: 'inimigo' },
      { type: 'input_value', name: 'W', check: 'JSValue' },
      { type: 'input_value', name: 'H', check: 'JSValue' },
      { type: 'field_input', name: 'CTX', text: 'ctx' },
    ],
    message1: 'fazer %1',
    args1: [{ type: 'input_statement', name: 'BODY' }],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Desenha uma aparência com formas (retângulo, círculo, linha…) e dá um nome a ela. Do cantinho (0,0) para dentro, no tamanho-base. Quem usar a aparência num tamanho diferente vê o desenho ESTICADO na proporção. Dá para usar os blocos de Canvas aqui dentro.',
  },

  {
    type: 'sz_gk_draw_look',
    placement: 'command',
    message0: 'Desenhar a aparência %1 em x %2 y %3 tamanho %4 × %5',
    args0: [
      { type: 'field_name_picker', name: 'LOOK', text: 'inimigo', kind: 'look' },
      { type: 'input_value', name: 'X', check: 'JSValue' },
      { type: 'input_value', name: 'Y', check: 'JSValue' },
      { type: 'input_value', name: 'W', check: 'JSValue' },
      { type: 'input_value', name: 'H', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Desenha uma aparência criada por você nessa posição e tamanho. Bom para o herói ou qualquer coisa fora de um molde.',
  },

  // ---- 🎯 Comportamentos ----
  {
    type: 'sz_gk_seek',
    placement: 'command',
    message0: 'Fazer %1 perseguir %2 usando o tempo %3',
    args0: [
      { type: 'field_name_picker', name: 'WHO', text: 'item', kind: 'character' },
      { type: 'field_name_picker', name: 'TARGET', text: 'heroi', kind: 'character' },
      { type: 'field_name_picker', name: 'DT', text: 'dt', kind: 'variable' },
    ],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Comportamento pronto de "caçador": faz um personagem andar em direção a outro. Use dentro do "para cada vivo" no "A cada quadro". É o mesmo cálculo que os programadores fazem à mão (ir na direção do alvo × velocidade × tempo).',
  },

  {
    type: 'sz_gk_drift',
    placement: 'command',
    message0: 'Fazer %1 vaguear usando o tempo %2',
    args0: [
      { type: 'field_name_picker', name: 'WHO', text: 'item', kind: 'character' },
      { type: 'field_name_picker', name: 'DT', text: 'dt', kind: 'variable' },
    ],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Comportamento de "vagar": o personagem anda para um lado ao acaso e muda de direção de vez em quando. Bom para inimigos bobos ou bichinhos soltos.',
  },

  {
    type: 'sz_gk_face',
    placement: 'command',
    message0: 'Fazer %1 virar para o lado de %2',
    args0: [
      { type: 'field_name_picker', name: 'WHO', text: 'item', kind: 'character' },
      { type: 'field_name_picker', name: 'TARGET', text: 'heroi', kind: 'character' },
    ],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Espelha o desenho do personagem para ele "olhar" na direção do alvo (esquerda/direita).',
  },

  {
    type: 'sz_gk_launch_towards',
    placement: 'command',
    message0: 'Lançar %1 na direção de %2 com velocidade %3',
    args0: [
      { type: 'field_name_picker', name: 'WHO', text: 'tiro', kind: 'character' },
      { type: 'field_name_picker', name: 'TARGET', text: 'heroi', kind: 'character' },
      { type: 'input_value', name: 'V', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Mira UMA vez: guarda no personagem a velocidade na direção do alvo (a conta do tiro de todo jogo). Depois use "Mover pela velocidade" a cada quadro. O tiro segue RETO mesmo se o alvo sair do lugar.',
  },

  {
    type: 'sz_gk_move_by_velocity',
    placement: 'command',
    message0: 'Mover %1 pela velocidade dele usando o tempo %2',
    args0: [
      { type: 'field_name_picker', name: 'WHO', text: 'tiro', kind: 'character' },
      { type: 'field_name_picker', name: 'DT', text: 'dt', kind: 'variable' },
    ],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Anda o que o "Lançar" mandou: soma a velocidade guardada × o tempo do quadro. Use no "A cada quadro" (ou dentro do "para cada vivo" com o item).',
  },

  {
    type: 'sz_gk_set_angle',
    placement: 'command',
    message0: 'Girar %1 para %2 graus',
    args0: [
      { type: 'field_name_picker', name: 'WHO', text: 'heroi', kind: 'character' },
      { type: 'input_value', name: 'DEG', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Gira o desenho do personagem em volta do centro (0 = normal, 90 = deitado). Bom para naves, setas e rodinhas.',
  },

  // ---- 🎞️ Folha de quadros (animação de pixel art) ----
  {
    type: 'sz_gk_set_sheet',
    placement: 'start-only-command',
    message0: 'Usar a folha de quadros %1 em %2 (cada quadro tem %3 × %4)',
    args0: [
      { type: 'field_asset_picker', name: 'IMAGE', text: '' },
      { type: 'field_name_picker', name: 'CHAR', text: 'heroi', kind: 'character' },
      { type: 'input_value', name: 'FW', check: 'JSValue' },
      { type: 'input_value', name: 'FH', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Cola uma folha de quadros (spritesheet do Pinta ou baixada) no personagem: em vez da imagem inteira, ele mostra UM quadro de cada vez. Carregue a imagem antes com "Carregar a imagem" (mesmo nome).',
  },
]
