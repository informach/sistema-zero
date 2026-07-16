import type { ExtensionToolboxCategory } from '#extensions'
import { categoryShades } from '../../blockly/colorShades'

// Jogo 2D Avançado = UMA cor da categoria: TEAL (verde-água). As sub-categorias
// são TONS dela (derivados por categoryShades mais abaixo). É o furo que restava
// no arco-íris das categorias (rosa = Jogo 2D, amarelo = Jogo 3D).
const C = '#14b8a6'

export const gameKitBlocks = [
  // ---- 🧰 O jogo ----
  {
    type: 'sz_gk_setup',
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
    type: 'sz_gk_start',
    message0: 'Começar o jogo (carrega as imagens e mostra o menu)',
    args0: [],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Liga o jogo: mostra a tela de carregando, espera as imagens, abre o menu e começa o laço de quadros. Use uma vez, DEPOIS de preparar tudo (ganchos, personagens, telas).',
  },
  {
    type: 'sz_gk_game_width',
    message0: 'a largura do jogo',
    args0: [],
    output: 'JSValue',
    colour: C,
    tooltip: 'A largura interna da tela do jogo (a do "Preparar o jogo"). Não muda com a janela.',
  },
  {
    type: 'sz_gk_game_height',
    message0: 'a altura do jogo',
    args0: [],
    output: 'JSValue',
    colour: C,
    tooltip: 'A altura interna da tela do jogo (a do "Preparar o jogo"). Não muda com a janela.',
  },

  // ---- ⏳ Carregar ----
  {
    type: 'sz_gk_load_image',
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
      'Coloca uma imagem do projeto na fila de carregamento (a tela de "carregando" espera todas). O nome é como o jogo chama essa imagem — use o mesmo nome no personagem. Se a imagem falhar, o jogo segue com um retângulo no lugar.',
  },

  // ---- 🖼️ Telas ----
  {
    type: 'sz_gk_set_screen_text',
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
      'Cria uma tela SUA (ex.: loja, instruções), no mesmo estilo das prontas. Ela começa escondida — use "Mostrar a tela" quando quiser. Dá para pôr botões nela. Usar o nome de uma tela pronta (ex.: vitoria) faz você ASSUMIR a tela: os botões dela saem e os textos passam a ser os seus.',
  },
  {
    type: 'sz_gk_add_button',
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
      'Põe um botão numa tela (pronta ou sua) e diz o que acontece no clique — mudar de estado, voltar ao menu, o que você quiser.',
  },
  {
    type: 'sz_gk_show_screen',
    message0: 'Mostrar a tela %1',
    args0: [{ type: 'field_name_picker', name: 'SCREEN', text: 'vitoria', kind: 'screen' }],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'Mostra uma tela por cima do jogo (e esconde as outras).',
  },
  {
    type: 'sz_gk_hide_screens',
    message0: 'Esconder todas as telas',
    args0: [],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'Esconde qualquer tela que esteja aparecendo — sobra só o jogo.',
  },

  // ---- 🚦 Estados ----
  {
    type: 'sz_gk_set_state',
    message0: 'Mudar o estado do jogo para %1',
    args0: [{ type: 'field_name_picker', name: 'STATE', text: 'jogando', kind: 'gamestate' }],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'O jogo profissional vive em UM estado por vez: menu, jogando, pausado, fim… ou um que você inventar (loja, vitória). O "a cada quadro" só roda em "jogando"; as telas prontas aparecem sozinhas nos estados delas.',
  },
  {
    type: 'sz_gk_on_enter_state',
    message0: 'Quando o jogo entrar no estado %1',
    args0: [{ type: 'field_name_picker', name: 'STATE', text: 'jogando', kind: 'gamestate' }],
    message1: 'fazer %1',
    args1: [{ type: 'input_statement', name: 'BODY' }],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Roda o "fazer" toda vez que o jogo ENTRAR nesse estado. Ótimo para zerar pontos e recolocar personagens quando começar a jogar.',
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
    message0: 'Pausar o jogo',
    args0: [],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'Congela o jogo e mostra a tela de pausa (só funciona enquanto está jogando).',
  },
  {
    type: 'sz_gk_resume',
    message0: 'Continuar o jogo',
    args0: [],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'Sai da pausa e volta a jogar.',
  },
  {
    type: 'sz_gk_return_to_menu',
    message0: 'Voltar ao menu',
    args0: [],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'Para o que estiver acontecendo e volta para a tela de menu.',
  },
  {
    type: 'sz_gk_end_game',
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
    message0: 'A cada quadro, com o tempo %1 (em segundos)',
    args0: [{ type: 'field_input', name: 'DT', text: 'dt' }],
    message1: 'fazer %1',
    args1: [{ type: 'input_statement', name: 'BODY' }],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'O coração do jogo: roda o "fazer" a cada quadro, SÓ enquanto o estado é "jogando". O tempo (dt) é quanto durou o último quadro, em segundos — multiplique a velocidade por ele para o jogo andar igual em qualquer computador.',
  },
  {
    type: 'sz_gk_on_draw',
    message0: 'Desenhar o jogo com o pincel %1',
    args0: [{ type: 'field_input', name: 'PARAM', text: 'ctx' }],
    message1: 'fazer %1',
    args1: [{ type: 'input_statement', name: 'BODY' }],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Tudo o que aparece no jogo é desenhado aqui, a cada quadro: pinte o fundo, desenhe os personagens e o placar. Os blocos de Canvas funcionam aqui dentro, usando esse pincel. Com a câmera ligada, este desenho é do MUNDO (anda com a câmera).',
  },
  {
    type: 'sz_gk_on_draw_hud',
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
      'Cria um personagem do jogo (herói, moeda, inimigo…). Ele nasce no centro da tela. A imagem é a que você carregou (pelo nome); sem imagem, aparece um retângulo da cor escolhida. A velocidade é em pixels por segundo.',
  },
  {
    type: 'sz_gk_move_with_keys',
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
    message0: 'Manter o personagem %1 dentro da tela',
    args0: [{ type: 'field_name_picker', name: 'CHAR', text: 'heroi', kind: 'character' }],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'Impede o personagem de sair da tela do jogo. Use depois de mover.',
  },
  {
    type: 'sz_gk_draw_character',
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
    message0: 'Recolocar o personagem %1 no centro da tela',
    args0: [{ type: 'field_name_picker', name: 'CHAR', text: 'heroi', kind: 'character' }],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'Volta o personagem ao centro e desliga o turbo — bom ao começar uma partida.',
  },
  {
    type: 'sz_gk_set_speed_multiplier',
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
    tooltip: 'Verdadeiro enquanto os dois personagens estão se tocando. Use dentro de um "se".',
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
    message0: 'Usar a tecla %1 para pausar e continuar',
    args0: [{ type: 'field_input', name: 'KEY', text: 'Escape' }],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'Troca a tecla que alterna pausa (o padrão é Esc). Use antes de começar o jogo.',
  },

  // ---- 📢 Avisos (event bus) ----
  {
    type: 'sz_gk_on_event',
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
    message0:
      'Criar o molde %1: tamanho %2 × %3, vida %4, velocidade %5, dano %6, cor %7, imagem %8, aparência %9',
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
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Um MOLDE são os DADOS de um tipo de personagem (inimigo, moeda, tiro…). Defina uma vez; depois faça quantos quiser dele. É como os jogos profissionais organizam muitos personagens iguais. A imagem (pixel) ou a aparência (vetor) são opcionais; sem elas, sai um retângulo da cor.',
  },
  {
    type: 'sz_gk_spawn_from_mold',
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
      'Faz nascer 1 personagem do molde nessa posição. O motor reaproveita personagens recolhidos (pooling) — rápido mesmo com muitos.',
  },
  {
    type: 'sz_gk_spawn_named',
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
      'Como o "Nascer 1", mas dá um APELIDO ao que nasceu — aí você pode mexer nele nos blocos de personagem (perseguir, empurrar, machucar…). Perfeito para tiro mirado e chefão.',
  },
  {
    type: 'sz_gk_start_spawner',
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
    message0: 'Parar a fábrica do molde %1',
    args0: [{ type: 'field_name_picker', name: 'MOLD', text: 'inimigo', kind: 'mold' }],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Desliga a fábrica desse molde — nada mais nasce dele (os vivos continuam). Bom para fases, chefões e fim de onda.',
  },
  {
    type: 'sz_gk_for_each_active',
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
      'Repete o "fazer" para CADA personagem vivo desse molde — dentro, "item" é o da vez. Use no "A cada quadro" para mover/testar todos (ex.: perseguir o herói, ver se encostou).',
  },
  {
    type: 'sz_gk_cull_offscreen',
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
      'Recolhe (guarda de volta) os personagens que foram longe demais da tela — o segredo de otimização para o jogo não ficar pesado. Use no "A cada quadro".',
  },
  {
    type: 'sz_gk_recycle',
    message0: 'Recolher %1 (volta pro molde)',
    args0: [{ type: 'field_name_picker', name: 'WHO', text: 'item', kind: 'character' }],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Tira este personagem do jogo e guarda para reaproveitar depois (ex.: quando o inimigo morre). Melhor que "apagar" — não desperdiça.',
  },
  {
    type: 'sz_gk_draw_active',
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
      'Desenha uma aparência com formas (retângulo, círculo, linha…) e dá um nome a ela — do cantinho (0,0) para dentro, no tamanho-base. Quem usar a aparência num tamanho diferente vê o desenho ESTICADO na proporção. Dá para usar os blocos de Canvas aqui dentro.',
  },
  {
    type: 'sz_gk_draw_look',
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
      'Mira UMA vez: guarda no personagem a velocidade na direção do alvo (a conta do tiro de todo jogo). Depois use "Mover pela velocidade" a cada quadro — o tiro segue RETO mesmo se o alvo sair do lugar.',
  },
  {
    type: 'sz_gk_move_by_velocity',
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
  {
    type: 'sz_gk_play_anim',
    message0: 'Tocar em %1 a animação %2 dos quadros %3 a %4 (%5 por segundo)',
    args0: [
      { type: 'field_name_picker', name: 'CHAR', text: 'heroi', kind: 'character' },
      { type: 'field_animation_picker', name: 'ANIM', text: '— escolher —' },
      { type: 'input_value', name: 'FROM', check: 'JSValue' },
      { type: 'input_value', name: 'TO', check: 'JSValue' },
      { type: 'input_value', name: 'FPS', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Toca uma faixa de quadros da folha, em loop. Pode rodar TODO quadro sem medo: repetir a mesma animação não a reinicia (guarda de transição, como os profissionais fazem). Desenhou no Pinta? O seletor lista as animações da folha.',
  },
  {
    type: 'sz_gk_set_walk_sheet',
    message0: 'Usar a folha de ANDAR %1 em %2 (cada quadro tem %3 × %4)',
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
      'Cola uma folha de ANDAR no personagem: 4 linhas (baixo, cima, esquerda, direita), cada uma com os quadros do passo. O motor escolhe a linha pela direção que ele olha e anima quando anda (parado = 1º quadro). É o personagem de RPG vivo, andando em qualquer direção.',
  },

  // ---- 🎥 Câmera ----
  {
    type: 'sz_gk_camera_follow',
    message0: 'Fazer a câmera seguir %1 num mundo de %2 × %3',
    args0: [
      { type: 'field_name_picker', name: 'CHAR', text: 'heroi', kind: 'character' },
      { type: 'input_value', name: 'W', check: 'JSValue' },
      { type: 'input_value', name: 'H', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Liga a câmera: o mundo fica MAIOR que a tela e a câmera acompanha o personagem (presa nas bordas do mundo, como nos jogos de aventura). "Manter dentro da tela" passa a valer o MUNDO.',
  },
  {
    type: 'sz_gk_camera_stop',
    message0: 'Parar a câmera (tela fixa)',
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'Desliga a câmera: a tela volta a ser fixa (coordenadas do jogo = da tela).',
  },
  {
    type: 'sz_gk_camera_x',
    message0: 'o canto x da câmera',
    output: 'JSValue',
    colour: C,
    tooltip:
      'Onde começa o pedaço do mundo que aparece na tela (canto esquerdo). Some ao desenhar algo "preso na tela" dentro do "Desenhar o jogo" — ou desenhe no HUD, que já é preso.',
  },
  {
    type: 'sz_gk_camera_y',
    message0: 'o canto y da câmera',
    output: 'JSValue',
    colour: C,
    tooltip: 'Onde começa o pedaço visível do mundo (canto de cima). Par do "canto x da câmera".',
  },

  // ---- 🖱️ Mouse ----
  {
    type: 'sz_gk_mouse_x',
    message0: 'o mouse x',
    output: 'JSValue',
    colour: C,
    tooltip:
      'Onde o mouse (ou o dedo) está, na largura — já convertido para as coordenadas do JOGO (e do mundo, se a câmera segue).',
  },
  {
    type: 'sz_gk_mouse_y',
    message0: 'o mouse y',
    output: 'JSValue',
    colour: C,
    tooltip: 'Onde o mouse (ou o dedo) está, na altura — em coordenadas do JOGO.',
  },
  {
    type: 'sz_gk_mouse_down',
    message0: 'o mouse está apertado ?',
    output: 'JSValue',
    colour: C,
    tooltip: 'Verdadeiro enquanto o botão do mouse (ou o dedo) está pressionado no jogo.',
  },
  {
    type: 'sz_gk_on_game_click',
    message0: 'Quando clicar no jogo, na posição x %1 y %2',
    args0: [
      { type: 'field_input', name: 'PX', text: 'px' },
      { type: 'field_input', name: 'PY', text: 'py' },
    ],
    message1: 'fazer %1',
    args1: [{ type: 'input_statement', name: 'BODY' }],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Roda o "fazer" a cada clique/toque no jogo, com a posição já nas coordenadas do JOGO (px e py). É a base de tower defense, point-and-click e botões desenhados.',
  },

  // ---- ❤️ Combate ----
  {
    type: 'sz_gk_hurt',
    message0: 'Machucar %1 tirando %2 de vida (invencível por %3 s)',
    args0: [
      { type: 'field_name_picker', name: 'WHO', text: 'heroi', kind: 'character' },
      { type: 'input_value', name: 'AMOUNT', check: 'JSValue' },
      { type: 'input_value', name: 'IFRAMES', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Tira vida de um personagem e o deixa piscando e invencível por um tempinho (para não perder tudo de uma vez). É o "dano com invencibilidade" dos jogos de ação.',
  },
  {
    type: 'sz_gk_knockback',
    message0: 'Empurrar %1 para longe de %2 com força %3',
    args0: [
      { type: 'field_name_picker', name: 'WHO', text: 'heroi', kind: 'character' },
      { type: 'field_name_picker', name: 'FROM', text: 'item', kind: 'character' },
      { type: 'input_value', name: 'FORCE', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Dá um empurrão no personagem para longe do outro, que vai diminuindo sozinho. Dá aquele "solavanco" gostoso quando toma dano.',
  },
  {
    type: 'sz_gk_draw_health_bar',
    message0: 'Desenhar a barra de vida de %1 (vida cheia = %2)',
    args0: [
      { type: 'field_name_picker', name: 'WHO', text: 'heroi', kind: 'character' },
      { type: 'input_value', name: 'MAX', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Desenha uma barrinha de vida em cima do personagem. Vida cheia 0 = usa a vida máxima dele sozinho. Use dentro do "Desenhar o jogo".',
  },
  {
    type: 'sz_gk_touching_circle',
    message0: '%1 e %2 se encostam (círculo) ?',
    args0: [
      { type: 'field_name_picker', name: 'A', text: 'heroi', kind: 'character' },
      { type: 'field_name_picker', name: 'B', text: 'item', kind: 'character' },
    ],
    output: 'JSValue',
    colour: C,
    tooltip:
      'Verdadeiro quando os dois se tocam medindo por CÍRCULO (mais justo que caixa para bichos redondos). Use dentro de um "se".',
  },
  {
    type: 'sz_gk_is_dead',
    message0: 'a vida de %1 acabou ?',
    args0: [{ type: 'field_name_picker', name: 'CHAR', text: 'heroi', kind: 'character' }],
    output: 'JSValue',
    colour: C,
    tooltip: 'Verdadeiro quando a vida do personagem chegou a zero. Use dentro de um "se".',
  },
  {
    type: 'sz_gk_is_invincible',
    message0: '%1 está invencível ?',
    args0: [{ type: 'field_name_picker', name: 'CHAR', text: 'heroi', kind: 'character' }],
    output: 'JSValue',
    colour: C,
    tooltip:
      'Verdadeiro enquanto o personagem pisca depois de um dano. O padrão profissional: "se encostou E NÃO está invencível → machucar + empurrar + som" — assim o som e o empurrão só acontecem no dano de verdade.',
  },
  {
    type: 'sz_gk_health_of',
    message0: 'a vida de %1',
    args0: [{ type: 'field_name_picker', name: 'CHAR', text: 'heroi', kind: 'character' }],
    output: 'JSValue',
    colour: C,
    tooltip: 'Quanto de vida o personagem tem agora. Use numa conta ou na barra de vida.',
  },

  // ---- 🖥️ HUD & Missão ----
  {
    type: 'sz_gk_set_mission',
    message0: 'Vencer quando sobreviver %1 s ou derrotar %2 inimigos',
    args0: [
      { type: 'input_value', name: 'SEC', check: 'JSValue' },
      { type: 'input_value', name: 'KILLS', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Define a MISSÃO: o jogo termina em vitória (estado "fim" + aviso "missao:completa") quando a criança sobreviver esse tempo OU derrotar essa quantidade. Use "Contar +1 inimigo derrotado" quando um cair.',
  },
  {
    type: 'sz_gk_mission_kill',
    message0: 'Contar +1 inimigo derrotado',
    args0: [],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'Soma 1 na conta de inimigos derrotados (para a missão e para o placar).',
  },
  {
    type: 'sz_gk_draw_timer',
    message0: 'Desenhar o cronômetro em x %1 y %2',
    args0: [
      { type: 'input_value', name: 'X', check: 'JSValue' },
      { type: 'input_value', name: 'Y', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'Escreve o tempo de jogo (min:seg) nessa posição. Use dentro do "Desenhar o jogo".',
  },
  {
    type: 'sz_gk_draw_bar',
    message0: 'Desenhar uma barra de %1 / %2 em x %3 y %4 tamanho %5 × %6 cor %7',
    args0: [
      { type: 'input_value', name: 'CUR', check: 'JSValue' },
      { type: 'input_value', name: 'MAX', check: 'JSValue' },
      { type: 'input_value', name: 'X', check: 'JSValue' },
      { type: 'input_value', name: 'Y', check: 'JSValue' },
      { type: 'input_value', name: 'W', check: 'JSValue' },
      { type: 'input_value', name: 'H', check: 'JSValue' },
      { type: 'field_colour_sz', name: 'COLOR', colour: '#4a9eff' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Uma barra que enche na proporção atual/máximo: vida grande do herói, energia, progresso da fase. Fica ótima no "Desenhar por cima (HUD)".',
  },

  // ---- 🧙 Kit RPG: mundo em grade ----
  {
    type: 'sz_gk_rpg_move_grid',
    message0: 'Mover %1 pela grade (célula de %2 px) usando o tempo %3',
    args0: [
      { type: 'field_name_picker', name: 'CHAR', text: 'heroi', kind: 'character' },
      { type: 'input_value', name: 'CELL', check: 'JSValue' },
      { type: 'field_name_picker', name: 'DT', text: 'dt', kind: 'variable' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'O andar de RPG: uma célula por vez (setas/WASD), parando ENCAIXADO na grade. Paredes e NPCs bloqueiam; portas levam a outro mapa; o ESPAÇO conversa com o NPC à frente. Use no "A cada quadro".',
  },
  {
    type: 'sz_gk_rpg_block_cell',
    message0: 'Bloquear a célula %1 , %2 (parede)',
    args0: [
      { type: 'input_value', name: 'CX', check: 'JSValue' },
      { type: 'input_value', name: 'CY', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Marca uma célula da grade como parede — ninguém atravessa. Monte o cenário dentro do "Quando chegar no mapa" (trocar de mapa limpa as paredes).',
  },
  {
    type: 'sz_gk_rpg_cell',
    message0: 'a célula %1 (em px)',
    args0: [{ type: 'input_value', name: 'N', check: 'JSValue' }],
    inputsInline: true,
    output: 'JSValue',
    colour: C,
    tooltip:
      'Converte número de células em pixels (célula × tamanho da grade). Útil para posicionar na grade: "Colocar em x: a célula 3".',
  },

  // ---- 🧙 Kit RPG: NPCs e fala ----
  {
    type: 'sz_gk_rpg_create_npc',
    message0: 'Criar o NPC %1 na célula %2 , %3 com imagem %4 ou aparência %5',
    args0: [
      { type: 'field_input', name: 'NAME', text: 'ferreiro' },
      { type: 'input_value', name: 'CX', check: 'JSValue' },
      { type: 'input_value', name: 'CY', check: 'JSValue' },
      { type: 'field_asset_picker', name: 'IMAGE', text: '' },
      { type: 'field_name_picker', name: 'LOOK', text: '', kind: 'look' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Um morador do mundo: fica parado na célula (sólido — bloqueia o caminho) e conversa quando o herói aperta ESPAÇO olhando para ele. Sem imagem/aparência sai um retângulo lilás.',
  },
  {
    type: 'sz_gk_rpg_draw_npcs',
    message0: 'Desenhar os NPCs',
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'Desenha todos os NPCs do mapa atual. Use dentro do "Desenhar o jogo".',
  },
  {
    type: 'sz_gk_rpg_on_talk',
    message0: 'Quando conversar com o NPC %1',
    args0: [{ type: 'field_name_picker', name: 'NPC', text: 'ferreiro', kind: 'npc' }],
    message1: 'fazer %1',
    args1: [{ type: 'input_statement', name: 'BODY' }],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Roda quando o herói aperta ESPAÇO olhando para esse NPC. Combine com flags para a conversa MUDAR conforme a história ("se já aconteceu…, falar outra coisa").',
  },
  {
    type: 'sz_gk_rpg_say',
    message0: 'Mostrar a fala %1 de %2',
    args0: [
      { type: 'input_value', name: 'TEXT', check: 'JSValue' },
      { type: 'input_value', name: 'NAME', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Abre a caixa de fala com efeito de máquina de escrever (o herói fica parado). ESPAÇO completa e avança; várias falas seguidas viram uma conversa. Ao acabar, sai o aviso "fala:terminada".',
  },

  // ---- 🧙 Kit RPG: história e inventário ----
  {
    type: 'sz_gk_rpg_add_flag',
    message0: 'Marcar que %1 aconteceu',
    args0: [{ type: 'field_name_picker', name: 'FLAG', text: 'falou-com-ferreiro', kind: 'flag' }],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Anota um acontecimento da história (story flag). É como os RPGs lembram o que você já fez — a conversa e as portas mudam conforme as marcas.',
  },
  {
    type: 'sz_gk_rpg_has_flag',
    message0: 'já aconteceu %1 ?',
    args0: [{ type: 'field_name_picker', name: 'FLAG', text: 'falou-com-ferreiro', kind: 'flag' }],
    output: 'JSValue',
    colour: C,
    tooltip: 'Verdadeiro se essa marca da história já foi feita. Use num "se".',
  },
  {
    type: 'sz_gk_rpg_give_item',
    message0: 'Ganhar o item %1 com imagem %2',
    args0: [
      { type: 'field_input', name: 'NAME', text: 'chave' },
      { type: 'field_asset_picker', name: 'IMAGE', text: '' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Põe um item no inventário (sem duplicar). Sem imagem, o inventário mostra a inicial do nome.',
  },
  {
    type: 'sz_gk_rpg_has_item',
    message0: 'tenho o item %1 ?',
    args0: [{ type: 'field_name_picker', name: 'NAME', text: 'chave', kind: 'item' }],
    output: 'JSValue',
    colour: C,
    tooltip: 'Verdadeiro se o item está no inventário. "Se tenho a chave: abrir a porta…".',
  },
  {
    type: 'sz_gk_rpg_remove_item',
    message0: 'Perder o item %1',
    args0: [{ type: 'field_name_picker', name: 'NAME', text: 'chave', kind: 'item' }],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'Tira o item do inventário (gastou/entregou).',
  },
  {
    type: 'sz_gk_rpg_draw_inventory',
    message0: 'Desenhar o inventário em x %1 y %2',
    args0: [
      { type: 'input_value', name: 'X', check: 'JSValue' },
      { type: 'input_value', name: 'Y', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'Desenha os itens em fila (ícones). Fica ótimo no "Desenhar por cima (HUD)".',
  },

  // ---- 🧙 Kit RPG: mapas ----
  {
    type: 'sz_gk_rpg_on_map',
    message0: 'Quando chegar no mapa %1',
    args0: [{ type: 'field_input', name: 'MAP', text: 'vila' }],
    message1: 'montar %1',
    args1: [{ type: 'input_statement', name: 'BODY' }],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Monta o cenário do mapa: paredes, NPCs, portas e a posição do herói. O PRIMEIRO mapa criado é onde o jogo começa. Trocar de mapa limpa o anterior e roda esta montagem.',
  },
  {
    type: 'sz_gk_rpg_go_map',
    message0: 'Ir para o mapa %1',
    args0: [{ type: 'field_name_picker', name: 'MAP', text: 'vila', kind: 'map' }],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Troca de mapa agora (limpa paredes/NPCs/portas e monta o destino). Também sai o aviso "mapa:<nome>".',
  },
  {
    type: 'sz_gk_rpg_create_door',
    message0: 'Criar a porta na célula %1 , %2 para o mapa %3',
    args0: [
      { type: 'input_value', name: 'CX', check: 'JSValue' },
      { type: 'input_value', name: 'CY', check: 'JSValue' },
      { type: 'field_name_picker', name: 'MAP', text: 'caverna', kind: 'map' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Pisou na célula → vai para o outro mapa. Lembre de posicionar o herói na montagem do mapa de destino.',
  },

  // ---- ⚔️ Kit RPG: batalha por turnos ----
  {
    type: 'sz_gk_rpg_battle_stats',
    message0: 'Meus pontos de batalha: vida %1 , força %2 e defesa %3',
    args0: [
      { type: 'input_value', name: 'HP', check: 'JSValue' },
      { type: 'input_value', name: 'STR', check: 'JSValue' },
      { type: 'input_value', name: 'DEF', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Define a vida, a força e a DEFESA do SEU lado nas batalhas (a defesa reduz o dano recebido). Cada batalha começa com a vida e a energia cheias. Use uma vez, no começo — é o seu nível 1.',
  },
  {
    type: 'sz_gk_rpg_battle_start',
    message0: 'Começar a batalha contra %1 com vida %2 , força %3 e defesa %4',
    args0: [
      { type: 'field_input', name: 'NAME', text: 'Dragão' },
      { type: 'input_value', name: 'HP', check: 'JSValue' },
      { type: 'input_value', name: 'STR', check: 'JSValue' },
      { type: 'input_value', name: 'DEF', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Abre a batalha por TURNOS com o menu pronto: Atacar (força ± 20% − defesa/2), Especial (gasta energia), Item (usa poção), Defender (dano pela metade) e Fugir (50%). O mundo espera a batalha acabar.',
  },
  {
    type: 'sz_gk_rpg_set_special',
    message0: 'Golpe especial %1 com dano %2 e custo de energia %3',
    args0: [
      { type: 'field_input', name: 'NAME', text: 'Bola de fogo' },
      { type: 'input_value', name: 'DMG', check: 'JSValue' },
      { type: 'input_value', name: 'COST', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Ensina um golpe ESPECIAL: dano forte que gasta energia (a energia começa cheia e recupera um pouco a cada turno). O botão "Especial" aparece na batalha. Use uma vez, no começo.',
  },
  {
    type: 'sz_gk_rpg_give_potion',
    message0: 'Ganhar a poção %1 que cura %2',
    args0: [
      { type: 'field_input', name: 'NAME', text: 'Poção' },
      { type: 'input_value', name: 'HEAL', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Põe uma poção no estoque de batalha (empilha). Na luta, o botão "Item" usa uma e recupera vida.',
  },
  {
    type: 'sz_gk_rpg_battle_reward',
    message0: 'Ganhar %1 de experiência (XP)',
    args0: [{ type: 'input_value', name: 'XP', check: 'JSValue' }],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Dá XP ao herói (ex.: no "quando a batalha terminar", se venceu). Juntando XP suficiente, ele SOBE DE NÍVEL: mais vida, força e defesa, e o aviso "subiu:nivel". A cara da progressão de RPG.',
  },
  {
    type: 'sz_gk_rpg_inflict',
    message0: 'Envenenar %1 por %2 turnos',
    args0: [
      {
        type: 'field_dropdown',
        name: 'WHO',
        options: [
          ['o inimigo', 'inimigo'],
          ['eu (herói)', 'heroi'],
        ],
      },
      { type: 'input_value', name: 'TURNS', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Aplica VENENO: quem está envenenado perde vida no fim de cada turno, por alguns turnos. Use na batalha (ex.: dentro de um golpe especial de veneno).',
  },
  {
    type: 'sz_gk_rpg_level',
    message0: 'meu nível',
    output: 'JSValue',
    colour: C,
    tooltip: 'O nível atual do herói (sobe ganhando XP). Use no HUD ou num "se".',
  },
  {
    type: 'sz_gk_rpg_xp',
    message0: 'meu XP',
    output: 'JSValue',
    colour: C,
    tooltip: 'Quanta experiência o herói já juntou para o próximo nível.',
  },
  {
    type: 'sz_gk_rpg_on_battle_end',
    message0: 'Quando a batalha terminar',
    message1: 'fazer %1',
    args1: [{ type: 'input_statement', name: 'BODY' }],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Roda quando qualquer batalha fecha (vitória, derrota ou fuga). Pergunte "ganhei a batalha?" para decidir o que acontece.',
  },
  {
    type: 'sz_gk_rpg_battle_won',
    message0: 'ganhei a batalha ?',
    output: 'JSValue',
    colour: C,
    tooltip:
      'Verdadeiro se a ÚLTIMA batalha terminou em vitória. Use no "quando a batalha terminar".',
  },

  // ---- 🎬 Cenas (cutscene) & NPCs vivos ----
  {
    type: 'sz_gk_rpg_cutscene',
    message0: 'Fazer a cena:',
    message1: 'passo a passo %1',
    args1: [{ type: 'input_statement', name: 'BODY' }],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Uma cena de história: os passos acontecem UM DE CADA VEZ (falar, esperar, o NPC andar, ir para outro mapa, começar uma batalha). O motor espera cada passo terminar antes do próximo, e o herói fica parado até a cena acabar. É o jeito profissional de contar história.',
  },
  {
    type: 'sz_gk_rpg_wait',
    message0: 'Esperar %1 s (na cena)',
    args0: [{ type: 'input_value', name: 'SECONDS', check: 'JSValue' }],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Uma pausa na cena — o próximo passo espera esses segundos. Use DENTRO de "Fazer a cena".',
  },
  {
    type: 'sz_gk_rpg_npc_walk_to',
    message0: 'Fazer o NPC %1 andar até a célula %2 , %3',
    args0: [
      { type: 'field_name_picker', name: 'NPC', text: 'ferreiro', kind: 'npc' },
      { type: 'input_value', name: 'CX', check: 'JSValue' },
      { type: 'input_value', name: 'CY', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'O NPC caminha (célula a célula, desviando de paredes) até a célula-alvo. Ótimo dentro de "Fazer a cena": a cena espera ele chegar antes do próximo passo.',
  },
  {
    type: 'sz_gk_rpg_face',
    message0: 'Virar o NPC %1 para %2',
    args0: [
      { type: 'field_name_picker', name: 'NPC', text: 'ferreiro', kind: 'npc' },
      {
        type: 'field_dropdown',
        name: 'DIR',
        options: [
          ['baixo', 'down'],
          ['cima', 'up'],
          ['esquerda', 'left'],
          ['direita', 'right'],
        ],
      },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'Faz o NPC olhar para um lado (baixo/cima/esquerda/direita).',
  },
  {
    type: 'sz_gk_rpg_npc_wander',
    message0: 'Fazer o NPC %1 vaguear pela vila',
    args0: [{ type: 'field_name_picker', name: 'NPC', text: 'ferreiro', kind: 'npc' }],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'O NPC anda sozinho por células vizinhas livres, de vez em quando — dá vida à vila. (Não use dentro de uma cena.)',
  },
  {
    type: 'sz_gk_rpg_on_step',
    message0: 'Quando o herói pisar na célula %1 , %2',
    args0: [
      { type: 'input_value', name: 'CX', check: 'JSValue' },
      { type: 'input_value', name: 'CY', check: 'JSValue' },
    ],
    message1: 'fazer %1',
    args1: [{ type: 'input_statement', name: 'BODY' }],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Roda quando o herói ENCAIXA nessa célula: encontro com inimigo, armadilha, começar uma cena automática. Monte dentro de "Quando chegar no mapa".',
  },

  // ---- 💬 Escolhas & 💾 Salvar ----
  {
    type: 'sz_gk_rpg_menu',
    message0: 'Menu de escolha %1',
    args0: [{ type: 'input_value', name: 'TITLE', check: 'JSValue' }],
    message1: 'opções %1',
    args1: [{ type: 'input_statement', name: 'BODY' }],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Mostra uma pergunta com opções (setas escolhem, espaço ou clique confirma) e roda a opção escolhida. É a árvore de diálogo, a loja, o sim/não. Ponha blocos "Opção" dentro. Ótimo no "Quando conversar" ou numa cena.',
  },
  {
    type: 'sz_gk_rpg_option',
    message0: 'Opção %1',
    args0: [{ type: 'input_value', name: 'LABEL', check: 'JSValue' }],
    message1: 'fazer %1',
    args1: [{ type: 'input_statement', name: 'BODY' }],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Uma escolha do menu: o texto que aparece + o que acontece se a criança escolher. Use DENTRO de "Menu de escolha".',
  },
  {
    type: 'sz_gk_rpg_save',
    message0: 'Salvar o jogo',
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Guarda o progresso (flags da história, itens, mapa atual, posição e atributos) — continua salvo mesmo fechando e abrindo o jogo.',
  },
  {
    type: 'sz_gk_rpg_load',
    message0: 'Continuar o jogo salvo',
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Volta o progresso que você salvou e vai para o mapa onde parou. Ligue ao botão "Continuar" (só quando "tem jogo salvo?" for verdadeiro).',
  },
  {
    type: 'sz_gk_rpg_has_save',
    message0: 'tem jogo salvo ?',
    output: 'JSValue',
    colour: C,
    tooltip:
      'Verdadeiro se existe um jogo salvo. Use para só mostrar o "Continuar" quando fizer sentido.',
  },
  {
    type: 'sz_gk_time_survived',
    message0: 'há quantos segundos estou jogando',
    args0: [],
    output: 'JSValue',
    colour: C,
    tooltip: 'Quantos segundos se passaram desde que a partida começou.',
  },
  {
    type: 'sz_gk_kills',
    message0: 'quantos inimigos derrotei',
    args0: [],
    output: 'JSValue',
    colour: C,
    tooltip: 'Quantos inimigos você já derrotou nesta partida (a conta do "Contar +1").',
  },

  // ---- ✨ Faíscas (partículas) ----
  {
    type: 'sz_gk_define_effect',
    message0:
      'Criar o efeito %1: %2 faíscas, cor %3, tamanho %4, vida %5 s, velocidade %6, gravidade %7',
    args0: [
      { type: 'field_input', name: 'NAME', text: 'explosao' },
      { type: 'input_value', name: 'COUNT', check: 'JSValue' },
      { type: 'field_colour_sz', name: 'COLOR', colour: '#ffd166' },
      { type: 'input_value', name: 'SIZE', check: 'JSValue' },
      { type: 'input_value', name: 'LIFE', check: 'JSValue' },
      { type: 'input_value', name: 'SPEED', check: 'JSValue' },
      { type: 'input_value', name: 'GRAVITY', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Um efeito é a RECEITA de uma explosão de faíscas (feita de dados: quantas, cor, tamanho, quanto duram, velocidade, gravidade). Defina uma vez; solte quantas quiser. "Menos código, mais efeitos".',
  },
  {
    type: 'sz_gk_burst',
    message0: 'Soltar o efeito %1 em x %2 y %3',
    args0: [
      { type: 'field_name_picker', name: 'EFFECT', text: 'explosao', kind: 'effect' },
      { type: 'input_value', name: 'X', check: 'JSValue' },
      { type: 'input_value', name: 'Y', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Estoura uma explosão de faíscas do efeito nessa posição (ex.: quando um inimigo morre).',
  },
  {
    type: 'sz_gk_draw_effects',
    message0: 'Desenhar todas as faíscas',
    args0: [],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Atualiza e desenha todas as faíscas soltas (elas caem com a gravidade e somem sozinhas). Use dentro do "Desenhar o jogo".',
  },

  // ---- 🔊 Som ----
  {
    type: 'sz_gk_load_sound',
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
      'Prepara um som que você importou (em "Imagens e sons"). Dê um nome; é ele que você usa em "Tocar o som". Use no comecinho, antes de "Começar o jogo".',
  },
  {
    type: 'sz_gk_play_sound',
    message0: 'Tocar o som %1',
    args0: [{ type: 'field_name_picker', name: 'NAME', text: 'explosao', kind: 'sound' }],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Toca um som que você carregou. Combina com os avisos: "Quando chegar o aviso inimigo:morreu, tocar o som explosao".',
  },
  {
    type: 'sz_gk_play_effect',
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
    type: 'sz_gk_play_tone',
    message0: 'Tocar um som de %1 Hz por %2 ms',
    args0: [
      { type: 'input_value', name: 'FREQ', check: 'JSValue' },
      { type: 'input_value', name: 'MS', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'Toca uma notinha: quanto maior o Hz, mais agudo. Junte várias para uma melodia.',
  },

  // ---- 🗺️ Mundo de tiles & profundidade ----
  {
    type: 'sz_gk_load_tilemap',
    message0: 'Carregar o mapa %1 do meu desenho %2',
    args0: [
      { type: 'field_input', name: 'NAME', text: 'mundo' },
      { type: 'field_asset_picker', name: 'IMAGE', text: 'meu-mapa', filter: 'tilemap' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Monta um mapa de tiles que você desenhou no Pinta (a grade, as peças e os sólidos já vêm juntos no desenho). Dê um nome ao mapa; é ele que você usa em "Desenhar o mapa". Use no comecinho, antes de "Começar o jogo".',
  },
  {
    type: 'sz_gk_draw_tilemap',
    message0: 'Desenhar o mapa %1 (camada %2)',
    args0: [
      { type: 'field_name_picker', name: 'MAP', text: 'mundo', kind: 'tilemap' },
      {
        type: 'field_dropdown',
        name: 'LAYER',
        options: [
          ['chão (o fundo, por baixo)', 'chão'],
          ['topos (árvores/telhados, por cima)', 'topos'],
        ],
      },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Desenha o mapa. Desenhe o "chão" ANTES dos personagens e os "topos" (árvores, telhados, muros) DEPOIS, dentro do "Desenhar o jogo" — assim o herói passa por trás das copas das árvores e a cena ganha profundidade. O mapa encaixa sozinho na tela.',
  },
  {
    type: 'sz_gk_tilemap_solid',
    message0: 'Deixar sólidas as peças do mapa %1',
    args0: [{ type: 'field_name_picker', name: 'MAP', text: 'mundo', kind: 'tilemap' }],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Transforma as peças sólidas do mapa (as que você marcou no Pinta) em paredes: o herói e os NPCs da grade não conseguem atravessá-las. Use uma vez, depois de carregar o mapa.',
  },
  {
    type: 'sz_gk_draw_shadow',
    message0: 'Desenhar a sombra de %1',
    args0: [{ type: 'field_name_picker', name: 'CHAR', text: 'heroi', kind: 'character' }],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Desenha uma sombrinha suave embaixo do personagem (ele "gruda" no chão em vez de flutuar). Use ANTES de desenhar o personagem, dentro do "Desenhar o jogo".',
  },
  {
    type: 'sz_gk_draw_by_depth',
    message0: 'Desenhar %1 e os personagens por profundidade',
    args0: [{ type: 'field_name_picker', name: 'CHAR', text: 'heroi', kind: 'character' }],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Desenha o herói e todos os NPCs na ordem certa de profundidade: quem está mais embaixo na tela aparece na FRENTE de quem está mais em cima (como na vida real). Troca o "Desenhar o personagem" + "Desenhar os NPCs" por um só, já ordenado.',
  },
  {
    type: 'sz_gk_camera_shake',
    message0: 'Tremer a câmera com força %1 por %2 s',
    args0: [
      { type: 'input_value', name: 'INT', check: 'JSValue' },
      { type: 'input_value', name: 'SEC', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Dá um tremor na tela por alguns instantes (impacto, explosão, o chefe pisando). A "força" é o quanto sacode em pixels. Funciona com a câmera ligada ou desligada.',
  },

  // ==========================================================================
  // ⚙️ FÍSICA GERAL + 🧱 COLISÃO + ⏱️ TEMPO + 🗺️ PEÇAS + 🔧 PROPRIEDADES
  // Primitivos que valem em QUALQUER jogo — ficam FORA de todo kit. É com eles
  // que se faz plataforma/quicar/arco "na unha", com mais blocos e mais lógica.
  // ==========================================================================
  {
    type: 'sz_gk_apply_gravity',
    message0: 'Aplicar a gravidade em %1 com força %2 usando o tempo %3',
    args0: [
      { type: 'field_name_picker', name: 'WHO', text: 'heroi', kind: 'character' },
      { type: 'input_value', name: 'G', check: 'JSValue' },
      { type: 'field_name_picker', name: 'DT', text: 'dt', kind: 'variable' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Puxa o personagem para baixo a cada quadro (2160 é o padrão dos jogos). É o PASSO 1 da receita: gravidade → mover pela velocidade → colidir. Este bloco também DESLIGA o "está no chão" — só o pouso da colisão liga de volta.',
  },
  {
    type: 'sz_gk_jump',
    message0: 'Fazer %1 pular com força %2',
    args0: [
      { type: 'field_name_picker', name: 'WHO', text: 'heroi', kind: 'character' },
      { type: 'input_value', name: 'FORCE', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Só funciona se o personagem estiver NO CHÃO — é isso que impede o pulo infinito (o erro nº 1 dos tutoriais de jogo).',
  },
  {
    type: 'sz_gk_is_on_ground',
    message0: '%1 está no chão?',
    args0: [{ type: 'field_name_picker', name: 'WHO', text: 'heroi', kind: 'character' }],
    output: 'JSValue',
    colour: C,
    tooltip:
      'Verdadeiro no quadro em que o personagem pousou. Quem liga é o bloco de colidir; quem desliga é a gravidade.',
  },
  {
    type: 'sz_gk_set_velocity',
    message0: 'Definir a velocidade de %1: x %2 y %3',
    args0: [
      { type: 'field_name_picker', name: 'WHO', text: 'heroi', kind: 'character' },
      { type: 'input_value', name: 'VX', check: 'JSValue' },
      { type: 'input_value', name: 'VY', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Escreve para onde o personagem vai (em pixels por segundo). Depois use "Mover pela velocidade" para ele andar de verdade.',
  },
  {
    type: 'sz_gk_velocity_of',
    message0: 'a velocidade %2 de %1',
    args0: [
      { type: 'field_name_picker', name: 'WHO', text: 'heroi', kind: 'character' },
      {
        type: 'field_dropdown',
        name: 'AXIS',
        options: [
          ['x', 'x'],
          ['y', 'y'],
        ],
      },
    ],
    output: 'JSValue',
    colour: C,
    tooltip:
      'LÊ a velocidade. É o que destrava o resto: "se a velocidade y de heroi > 0, tocar a animação de cair", quicar, saber para que lado o tiro vai.',
  },
  {
    type: 'sz_gk_set_terminal_velocity',
    message0: 'Velocidade máxima de queda de %1: %2',
    args0: [
      { type: 'field_name_picker', name: 'WHO', text: 'heroi', kind: 'character' },
      { type: 'input_value', name: 'MAX', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'O limite da queda livre (padrão 900). Existe nos jogos de verdade e também impede o personagem de atravessar o chão numa queda muito longa.',
  },
  {
    type: 'sz_gk_bounce_on_edges',
    message0: 'Fazer %1 quicar nas bordas',
    args0: [{ type: 'field_name_picker', name: 'WHO', text: 'bola', kind: 'character' }],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'Bateu na borda, volta — a bolinha do pong e do breakout.',
  },
  {
    type: 'sz_gk_wrap_edges',
    message0: 'Fazer %1 atravessar para o outro lado',
    args0: [{ type: 'field_name_picker', name: 'WHO', text: 'nave', kind: 'character' }],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'Saiu por um lado, aparece no outro — o Pac-Man e o Asteroids.',
  },
  {
    type: 'sz_gk_collide_tilemap',
    message0: 'Fazer %1 colidir com o mapa %2',
    args0: [
      { type: 'field_name_picker', name: 'WHO', text: 'heroi', kind: 'character' },
      { type: 'field_name_picker', name: 'MAP', text: 'mundo', kind: 'tilemap' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'O personagem PARA nas peças sólidas do mapa (chão, parede, teto). Empurra pelo lado de menor sobreposição, zera a velocidade daquele eixo e marca "no chão" ao pousar. É o PASSO 3 da receita — ponha depois de mover.',
  },
  {
    type: 'sz_gk_collide_group',
    message0: 'Fazer %1 colidir com o enxame %2',
    args0: [
      { type: 'field_name_picker', name: 'WHO', text: 'heroi', kind: 'character' },
      { type: 'field_name_picker', name: 'MOLD', text: 'chao', kind: 'mold' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'O mesmo que colidir com o mapa, mas contra os vivos de um molde (plataformas, caixas, pedras) — sem precisar de mapa nenhum.',
  },
  {
    type: 'sz_gk_overlap_groups',
    message0: 'Para cada %1 do molde %2 que encostar em %3 do molde %4, fazer %5',
    args0: [
      { type: 'field_input', name: 'A_NAME', text: 'tiro' },
      { type: 'field_name_picker', name: 'MOLD_A', text: 'tiro', kind: 'mold' },
      { type: 'field_input', name: 'B_NAME', text: 'alvo' },
      { type: 'field_name_picker', name: 'MOLD_B', text: 'inimigo', kind: 'mold' },
      { type: 'input_statement', name: 'BODY', check: 'JSStmt' },
    ],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Roda os blocos para o PAR que se tocou (tiro × inimigo, herói × moeda). Pode recolher os dois lá dentro com segurança.',
  },
  {
    type: 'sz_gk_every_seconds',
    message0: 'A cada %1 s, fazer %2',
    args0: [
      { type: 'input_value', name: 'SECS', check: 'JSValue' },
      { type: 'input_statement', name: 'BODY', check: 'JSStmt' },
    ],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Repete de tempo em tempo (nascer inimigo, piscar). Conta o tempo do JOGO: se pausar, para de contar — um relógio de parede erraria.',
  },
  {
    type: 'sz_gk_cooldown_ready',
    message0: '%1 pode agir de novo (a cada %2 s)?',
    args0: [
      { type: 'field_name_picker', name: 'WHO', text: 'heroi', kind: 'character' },
      { type: 'input_value', name: 'SECS', check: 'JSValue' },
    ],
    inputsInline: true,
    output: 'JSValue',
    colour: C,
    tooltip:
      'O "recarregando" do tiro e do golpe: verdadeiro só quando o tempo passou — e já reinicia a contagem sozinho.',
  },
  {
    type: 'sz_gk_tile_at',
    message0: 'a peça do mapa %1 em x %2 y %3',
    args0: [
      { type: 'field_name_picker', name: 'MAP', text: 'mundo', kind: 'tilemap' },
      { type: 'input_value', name: 'X', check: 'JSValue' },
      { type: 'input_value', name: 'Y', check: 'JSValue' },
    ],
    inputsInline: true,
    output: 'JSValue',
    colour: C,
    tooltip:
      'Que peça está naquele ponto do mundo (-1 = vazio). Ex.: "se a peça em x/y é 3 (espinho), machucar".',
  },
  {
    type: 'sz_gk_set_tile_at',
    message0: 'Trocar a peça do mapa %1 em x %2 y %3 para %4',
    args0: [
      { type: 'field_name_picker', name: 'MAP', text: 'mundo', kind: 'tilemap' },
      { type: 'input_value', name: 'X', check: 'JSValue' },
      { type: 'input_value', name: 'Y', check: 'JSValue' },
      { type: 'input_value', name: 'INDEX', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'Muda o mapa em jogo: a porta que abre, o bloco que vira escada, o chão que racha.',
  },
  {
    type: 'sz_gk_break_tile_at',
    message0: 'Quebrar a peça do mapa %1 onde %2 está',
    args0: [
      { type: 'field_name_picker', name: 'MAP', text: 'mundo', kind: 'tilemap' },
      { type: 'field_name_picker', name: 'WHO', text: 'heroi', kind: 'character' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Apaga a peça que está no centro do personagem — o mundo destrutível (cavar, minerar).',
  },
  {
    type: 'sz_gk_set_tile_size',
    message0: 'Tamanho da peça do mapa: %1',
    args0: [{ type: 'input_value', name: 'PX', check: 'JSValue' }],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'A escala do mapa em pixels (padrão 64). Vale para desenhar, colidir e ler as peças.',
  },
  {
    type: 'sz_gk_property_of',
    message0: 'a propriedade %2 de %1',
    args0: [
      { type: 'field_name_picker', name: 'WHO', text: 'heroi', kind: 'character' },
      {
        type: 'field_dropdown',
        name: 'PROP',
        options: [
          ['x', 'x'],
          ['y', 'y'],
          ['velocidade x', 'vx'],
          ['velocidade y', 'vy'],
          ['velocidade', 'speed'],
          ['largura', 'w'],
          ['altura', 'h'],
          ['vida', 'health'],
          ['vida máxima', 'maxHealth'],
          ['dano', 'damage'],
        ],
      },
    ],
    output: 'JSValue',
    colour: C,
    tooltip:
      'Lê qualquer coisa do personagem. É a chave-mestra: o que não tem bloco pronto, sai daqui.',
  },
  {
    type: 'sz_gk_set_property',
    message0: 'Mudar a propriedade %2 de %1 para %3',
    args0: [
      { type: 'field_name_picker', name: 'WHO', text: 'heroi', kind: 'character' },
      {
        type: 'field_dropdown',
        name: 'PROP',
        options: [
          ['x', 'x'],
          ['y', 'y'],
          ['velocidade x', 'vx'],
          ['velocidade y', 'vy'],
          ['velocidade', 'speed'],
          ['largura', 'w'],
          ['altura', 'h'],
          ['vida', 'health'],
          ['vida máxima', 'maxHealth'],
          ['dano', 'damage'],
        ],
      },
      { type: 'input_value', name: 'VALUE', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Escreve qualquer coisa do personagem. Mudar x/y aqui é um TELEPORTE (porta, cano) — o motor cuida para a colisão não arrastar de volta.',
  },
  {
    type: 'sz_gk_set_facing',
    message0: 'Fazer %1 olhar para %2',
    args0: [
      { type: 'field_name_picker', name: 'WHO', text: 'heroi', kind: 'character' },
      {
        type: 'field_dropdown',
        name: 'DIR',
        options: [
          ['baixo', 'down'],
          ['cima', 'up'],
          ['esquerda', 'left'],
          ['direita', 'right'],
        ],
      },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'A direção move DUAS coisas de uma vez: a linha da folha de andar e a caixa do golpe. Por isso existe um bloco só para ela.',
  },
  {
    type: 'sz_gk_facing_of',
    message0: '%1 está olhando para onde?',
    args0: [{ type: 'field_name_picker', name: 'WHO', text: 'heroi', kind: 'character' }],
    output: 'JSValue',
    colour: C,
    tooltip: 'Devolve "baixo", "cima", "esquerda" ou "direita".',
  },
  {
    type: 'sz_gk_tween_to',
    message0: 'Mover %1 suavemente até x %2 y %3 em %4 s',
    args0: [
      { type: 'field_name_picker', name: 'WHO', text: 'heroi', kind: 'character' },
      { type: 'input_value', name: 'X', check: 'JSValue' },
      { type: 'input_value', name: 'Y', check: 'JSValue' },
      { type: 'input_value', name: 'SECS', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Desliza o personagem até o ponto, começando e terminando devagarzinho (não é um teleporte). Ótimo para trocar peças de lugar, mover a plataforma, animar o menu. Chame UMA vez.',
  },
  // ==========================================================================
  // 🏃 Kit Plataforma — o atalho do gênero. Pela REGRA: o que é geral (gravidade,
  // colidir, pular, tiles) mora FORA, em ⚙️ Física / 🧱 Colisão; aqui só entra o
  // que SÓ existe em jogo de plataforma.
  // ==========================================================================
  {
    type: 'sz_gk_plat_hero',
    message0: 'Herói de plataforma %1 velocidade %2 pulo %3 usando o tempo %4',
    args0: [
      { type: 'field_name_picker', name: 'WHO', text: 'heroi', kind: 'character' },
      { type: 'input_value', name: 'SPEED', check: 'JSValue' },
      { type: 'input_value', name: 'JUMP', check: 'JSValue' },
      { type: 'field_name_picker', name: 'DT', text: 'dt', kind: 'variable' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Tudo-em-um do plataforma: gravidade + andar com as setas (ou A/D) + pular (espaço, W ou ↑) + mover — com o pulo GOSTOSO já embutido (coyote, buffer e pulo variável). Ponha no "A cada quadro" e, LOGO DEPOIS, o bloco de colidir com o mapa (ou com o enxame): é a ordem de verdade.',
  },
  {
    type: 'sz_gk_plat_jump_feel',
    message0: 'Regular o pulo: coyote %1 s, buffer %2 s, segurar %3 s, gravidade %4',
    args0: [
      { type: 'input_value', name: 'COYOTE', check: 'JSValue' },
      { type: 'input_value', name: 'BUFFER', check: 'JSValue' },
      { type: 'input_value', name: 'HOLD', check: 'JSValue' },
      { type: 'input_value', name: 'GRAVITY', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Os botõezinhos do "pulo gostoso". COYOTE: quanto tempo ainda dá para pular depois de sair da beirada. BUFFER: apertar antes de pousar continua valendo. SEGURAR: até quanto tempo segurar deixa o pulo mais alto. GRAVIDADE: 2160 é o normal; menos = Lua.',
  },
  {
    type: 'sz_gk_plat_double_jump',
    message0: 'Deixar %1 pular no ar (força %2, até %3 vezes)',
    args0: [
      { type: 'field_name_picker', name: 'WHO', text: 'heroi', kind: 'character' },
      { type: 'input_value', name: 'FORCE', check: 'JSValue' },
      { type: 'input_value', name: 'TIMES', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'O pulo duplo: mais pulos enquanto está no AR, e pousar devolve todos. Ponha LOGO DEPOIS do "Herói de plataforma".',
  },
  {
    type: 'sz_gk_plat_wall_slide',
    message0: 'Fazer %1 deslizar na parede (velocidade %2)',
    args0: [
      { type: 'field_name_picker', name: 'WHO', text: 'heroi', kind: 'character' },
      { type: 'input_value', name: 'SPEED', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Encostado numa parede e caindo, o herói escorrega devagarzinho em vez de despencar. Ponha depois do "Herói de plataforma" — e o bloco de colidir é quem descobre a parede.',
  },
  {
    type: 'sz_gk_plat_wall_jump',
    message0: 'Deixar %1 pular da parede (para o lado %2, para cima %3)',
    args0: [
      { type: 'field_name_picker', name: 'WHO', text: 'heroi', kind: 'character' },
      { type: 'input_value', name: 'FX', check: 'JSValue' },
      { type: 'input_value', name: 'FY', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'O pulo de parede do Celeste: apertar pulo encostado numa parede joga o herói para LONGE dela. O empurrão manda por um tiquinho (a seta não apaga ele) e a parede devolve o pulo no ar.',
  },
  {
    type: 'sz_gk_plat_ladder',
    message0: 'Deixar %1 subir a escada (peça %3 do mapa %2) na velocidade %4',
    args0: [
      { type: 'field_name_picker', name: 'WHO', text: 'heroi', kind: 'character' },
      { type: 'field_name_picker', name: 'MAP', text: 'mundo', kind: 'tilemap' },
      { type: 'input_value', name: 'TILE', check: 'JSValue' },
      { type: 'input_value', name: 'SPEED', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Em cima da peça de escada, ↑ e ↓ sobem e descem, a gravidade não vale e parar deixa pendurado. O espaço pula da escada. Ponha depois do "Herói de plataforma" e ANTES de colidir.',
  },
  {
    type: 'sz_gk_plat_one_way',
    message0: 'Fazer %1 pousar nas plataformas do molde %2 (atravessa por baixo) usando o tempo %3',
    args0: [
      { type: 'field_name_picker', name: 'WHO', text: 'heroi', kind: 'character' },
      { type: 'field_name_picker', name: 'MOLD', text: 'tabua', kind: 'mold' },
      { type: 'field_name_picker', name: 'DT', text: 'dt', kind: 'variable' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'A tábua clássica: subindo, o herói passa DIRETO por baixo; caindo, ele POUSA em cima. Não fura nem numa queda rápida.',
  },
  {
    type: 'sz_gk_plat_drop_through',
    message0: 'Deixar %1 descer da plataforma com ↓ e pulo',
    args0: [{ type: 'field_name_picker', name: 'WHO', text: 'heroi', kind: 'character' }],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Segurar ↓ (ou S) e apertar pulo faz o herói cair pela tábua em que está. Ponha ANTES do "pousar nas plataformas".',
  },
  {
    type: 'sz_gk_plat_moving',
    message0: 'Fazer a plataforma %1 ir de x %2 y %3 até x %4 y %5 em %6 s, usando o tempo %7',
    args0: [
      { type: 'field_name_picker', name: 'WHO', text: 'plataforma', kind: 'character' },
      { type: 'input_value', name: 'X1', check: 'JSValue' },
      { type: 'input_value', name: 'Y1', check: 'JSValue' },
      { type: 'input_value', name: 'X2', check: 'JSValue' },
      { type: 'input_value', name: 'Y2', check: 'JSValue' },
      { type: 'input_value', name: 'SECS', check: 'JSValue' },
      { type: 'field_name_picker', name: 'DT', text: 'dt', kind: 'variable' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'A plataforma vai e volta sozinha entre os dois pontos, devagarzinho nas pontas. Use com o "pegar carona" para o herói andar junto em vez de escorregar dela.',
  },
  {
    type: 'sz_gk_plat_ride_on',
    message0: 'Fazer %1 pegar carona nas plataformas do molde %2',
    args0: [
      { type: 'field_name_picker', name: 'WHO', text: 'heroi', kind: 'character' },
      { type: 'field_name_picker', name: 'MOLD', text: 'movel', kind: 'mold' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Quem está EM CIMA de uma plataforma que anda vai junto com ela. Sem isso o herói fica parado no lugar e a plataforma escorrega debaixo dele.',
  },
  {
    type: 'sz_gk_plat_stomp',
    message0: 'Fazer %1 derrotar o molde %2 pisando (quicar %3)',
    args0: [
      { type: 'field_name_picker', name: 'WHO', text: 'heroi', kind: 'character' },
      { type: 'field_name_picker', name: 'MOLD', text: 'inimigo', kind: 'mold' },
      { type: 'input_value', name: 'BOUNCE', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'O pulo na cabeça do Mario: se o herói estiver CAINDO mais rápido que o inimigo, o inimigo é derrotado, o herói quica e sai o aviso "plataforma:pisou". Comparar a velocidade (e não o lado) é o segredo de funcionar em qualquer ângulo.',
  },
  {
    type: 'sz_gk_plat_patrol_wall',
    message0: 'Fazer %1 patrulhar virando na parede (velocidade %2)',
    args0: [
      { type: 'field_name_picker', name: 'WHO', text: 'item', kind: 'character' },
      { type: 'input_value', name: 'SPEED', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'O inimigo anda para um lado e VIRA ao bater numa parede — quem manda virar é a colisão, então ele nunca trava na quina. Use dentro do "para cada vivo", com o bloco de colidir logo depois.',
  },
  {
    type: 'sz_gk_plat_checkpoint',
    message0: 'Marcar o ponto de renascer em x %1 y %2',
    args0: [
      { type: 'input_value', name: 'X', check: 'JSValue' },
      { type: 'input_value', name: 'Y', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'A bandeirinha da fase: guarda onde o herói volta quando morrer. Chame quando ele encostar na bandeira.',
  },
  {
    type: 'sz_gk_plat_respawn',
    message0: 'Fazer %1 renascer',
    args0: [{ type: 'field_name_picker', name: 'WHO', text: 'heroi', kind: 'character' }],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Volta o herói para o último ponto marcado (ou para onde ele nasceu, se não marcou nenhum) e zera a queda. Use quando ele cair no buraco ou encostar no espinho.',
  },
  {
    type: 'sz_gk_plat_state_frames',
    message0: 'Quando %1 estiver %2, usar os quadros %3 a %4 (fps %5)',
    args0: [
      { type: 'field_name_picker', name: 'WHO', text: 'heroi', kind: 'character' },
      {
        type: 'field_dropdown',
        name: 'STATE',
        options: [
          ['parado', 'parado'],
          ['andando', 'andando'],
          ['pulando', 'pulando'],
          ['caindo', 'caindo'],
        ],
      },
      { type: 'input_value', name: 'FROM', check: 'JSValue' },
      { type: 'input_value', name: 'TO', check: 'JSValue' },
      { type: 'input_value', name: 'FPS', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Diz quais quadros da folha valem para cada estado do herói. Faça um destes por estado, no comecinho — depois o "Animar o herói" troca sozinho.',
  },
  {
    type: 'sz_gk_plat_anim',
    message0: 'Animar o herói %1 pelo que ele está fazendo',
    args0: [{ type: 'field_name_picker', name: 'WHO', text: 'heroi', kind: 'character' }],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Olha a FÍSICA (está no chão? está indo para os lados? subindo ou caindo?) e toca a animação certa sozinho: parado, andando, pulando ou caindo. Chame todo quadro, depois de mover.',
  },
  // ==========================================================================
  // 🧭 R15 — primitivos GERAIS (fora de todo kit): região, sorte, mira, música,
  // memória, opacidade, transição. É o "lado de fora" que faz qualquer gênero.
  // ==========================================================================
  {
    type: 'sz_gk_define_region',
    message0: 'Criar a região %1 em x %2 y %3, largura %4 altura %5',
    args0: [
      { type: 'field_input', name: 'NAME', text: 'grama' },
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
      'Um retângulo com NOME no mundo: a grama alta, a porta, a zona de dano, a área segura, a bandeirinha. Crie no comecinho e depois pergunte quem está lá dentro.',
  },
  {
    type: 'sz_gk_is_inside',
    message0: '%1 está dentro da região %2?',
    args0: [
      { type: 'field_name_picker', name: 'WHO', text: 'heroi', kind: 'character' },
      { type: 'field_name_picker', name: 'REGION', text: 'grama', kind: 'region' },
    ],
    inputsInline: true,
    output: 'JSValue',
    colour: C,
    tooltip: 'Verdadeiro se o personagem encostar na região (nem que seja um pouquinho).',
  },
  {
    type: 'sz_gk_overlap_percent',
    message0: 'quanto de %1 está dentro da região %2 (em %)',
    args0: [
      { type: 'field_name_picker', name: 'WHO', text: 'heroi', kind: 'character' },
      { type: 'field_name_picker', name: 'REGION', text: 'grama', kind: 'region' },
    ],
    inputsInline: true,
    output: 'JSValue',
    colour: C,
    tooltip:
      'De 0 a 100. É o segredo do encontro na grama alta: "se MAIS DA METADE do herói estiver no mato". Só encostar a quina não conta — e é isso que faz o jogo parecer justo.',
  },
  {
    type: 'sz_gk_chance',
    message0: 'com chance de %1 %',
    args0: [{ type: 'input_value', name: 'PCT', check: 'JSValue' }],
    inputsInline: true,
    output: 'JSValue',
    colour: C,
    tooltip: 'Um sorteio: verdadeiro nessa porcentagem das vezes. 0 = nunca, 100 = sempre.',
  },
  {
    type: 'sz_gk_distance_between',
    message0: 'a distância entre %1 e %2',
    args0: [
      { type: 'field_name_picker', name: 'A', text: 'heroi', kind: 'character' },
      { type: 'field_name_picker', name: 'B', text: 'inimigo', kind: 'character' },
    ],
    inputsInline: true,
    output: 'JSValue',
    colour: C,
    tooltip:
      'Em pixels, de centro a centro. É a conta central do stealth (raio de detecção), da torre (alcance) e do inimigo que "só persegue se estiver perto".',
  },
  {
    type: 'sz_gk_point_in',
    message0: 'o ponto x %1 y %2 está dentro de %3?',
    args0: [
      { type: 'input_value', name: 'X', check: 'JSValue' },
      { type: 'input_value', name: 'Y', check: 'JSValue' },
      { type: 'field_name_picker', name: 'WHO', text: 'carta', kind: 'character' },
    ],
    inputsInline: true,
    output: 'JSValue',
    colour: C,
    tooltip:
      'Para saber se o clique caiu NAQUELE personagem: junte com "o mouse x/y". É o que destrava point-and-click, cartas, match-3 e tower defense.',
  },
  {
    type: 'sz_gk_launch_to_point',
    message0: 'Lançar %1 até o ponto x %2 y %3 com velocidade %4',
    args0: [
      { type: 'field_name_picker', name: 'WHO', text: 'tiro', kind: 'character' },
      { type: 'input_value', name: 'X', check: 'JSValue' },
      { type: 'input_value', name: 'Y', check: 'JSValue' },
      { type: 'input_value', name: 'SPEED', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Mira num PONTO (o "Lançar na direção" só mira em personagem). Junte com "o mouse x/y" e o tiro vai onde você clicar. Depois use "Mover pela velocidade".',
  },
  {
    type: 'sz_gk_set_velocity_angle',
    message0: 'Fazer %1 andar no ângulo %2 graus com força %3',
    args0: [
      { type: 'field_name_picker', name: 'WHO', text: 'nave', kind: 'character' },
      { type: 'input_value', name: 'DEG', check: 'JSValue' },
      { type: 'input_value', name: 'FORCE', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'O par do "Girar para X graus" — aquele só vira o DESENHO, este faz ANDAR de verdade. Use os dois com o mesmo ângulo e você tem o tanque, a nave, o Asteroids.',
  },
  {
    type: 'sz_gk_set_opacity',
    message0: 'Deixar %1 com %2 % de opacidade',
    args0: [
      { type: 'field_name_picker', name: 'WHO', text: 'heroi', kind: 'character' },
      { type: 'input_value', name: 'PCT', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: '100 = normal, 0 = invisível. O fantasma, o escudo, o que está desligado.',
  },
  {
    type: 'sz_gk_opacity_of',
    message0: 'a opacidade de %1',
    args0: [{ type: 'field_name_picker', name: 'WHO', text: 'heroi', kind: 'character' }],
    output: 'JSValue',
    colour: C,
    tooltip: 'De 0 a 100.',
  },
  {
    type: 'sz_gk_fade_to',
    message0: 'Fazer %1 sumir até %2 % em %3 s',
    args0: [
      { type: 'field_name_picker', name: 'WHO', text: 'inimigo', kind: 'character' },
      { type: 'input_value', name: 'PCT', check: 'JSValue' },
      { type: 'input_value', name: 'SECS', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Some (ou aparece) devagarzinho. O jeito clássico de o inimigo derrotado desaparecer. Chame UMA vez.',
  },
  {
    type: 'sz_gk_tween_property',
    message0: 'Deslizar a propriedade %2 de %1 até %3 em %4 s',
    args0: [
      { type: 'field_name_picker', name: 'WHO', text: 'heroi', kind: 'character' },
      {
        type: 'field_dropdown',
        name: 'PROP',
        options: [
          ['x', 'x'],
          ['y', 'y'],
          ['velocidade x', 'vx'],
          ['velocidade y', 'vy'],
          ['velocidade', 'speed'],
          ['largura', 'w'],
          ['altura', 'h'],
          ['vida', 'health'],
          ['opacidade', 'opacity'],
        ],
      },
      { type: 'input_value', name: 'TO', check: 'JSValue' },
      { type: 'input_value', name: 'SECS', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Muda QUALQUER propriedade suavemente (crescer, encolher, drenar a vida, sumir). Ao terminar sai o aviso "deslizou:chegou" — dá para encadear um movimento no outro.',
  },
  {
    type: 'sz_gk_set_hitbox',
    message0: 'Caixa de colisão de %1: deslocada x %2 y %3, largura %4 altura %5',
    args0: [
      { type: 'field_name_picker', name: 'WHO', text: 'heroi', kind: 'character' },
      { type: 'input_value', name: 'OX', check: 'JSValue' },
      { type: 'input_value', name: 'OY', check: 'JSValue' },
      { type: 'input_value', name: 'W', check: 'JSValue' },
      { type: 'input_value', name: 'H', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'A caixa que COLIDE não precisa ser o desenho todo. Num personagem alto, deixe só os PÉS colidirem (ex.: y 52, altura 16) — senão ele encosta nas paredes com a cabeça. Largura/altura 0 = usar o desenho inteiro.',
  },
  {
    type: 'sz_gk_fade_screen',
    message0: 'Tela: %1 na cor %2 em %3 s',
    args0: [
      {
        type: 'field_dropdown',
        name: 'DIR',
        options: [
          ['escurecer', 'escurecer'],
          ['clarear', 'clarear'],
        ],
      },
      { type: 'field_colour_sz', name: 'COLOR', colour: '#000000' },
      { type: 'input_value', name: 'SECS', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'A tela vai ficando preta (ou volta). O truque de todo jogo: ESCONDER a troca de cena atrás do escuro — escureça, troque tudo, clareie.',
  },
  {
    type: 'sz_gk_flash_screen',
    message0: 'Piscar a tela %2 vezes na cor %1',
    args0: [
      { type: 'field_colour_sz', name: 'COLOR', colour: '#ffffff' },
      { type: 'input_value', name: 'TIMES', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'O susto: a tela pisca. Perfeito para "apareceu um inimigo!" e para o dano grande.',
  },
  {
    type: 'sz_gk_save_value',
    message0: 'Guardar o valor %2 com o nome %1',
    args0: [
      { type: 'field_input', name: 'NAME', text: 'recorde' },
      { type: 'input_value', name: 'VALUE', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Guarda de verdade: fechar o jogo e abrir de novo, o valor continua lá. O recorde, a fase destravada, o nome do jogador.',
  },
  {
    type: 'sz_gk_saved_value',
    message0: 'o valor guardado %1',
    args0: [{ type: 'field_input', name: 'NAME', text: 'recorde' }],
    output: 'JSValue',
    colour: C,
    tooltip: 'Lê o que você guardou. Nunca guardou nada com esse nome? Devolve 0.',
  },
  {
    type: 'sz_gk_play_music',
    message0: 'Tocar a música %1 sem parar',
    args0: [{ type: 'field_name_picker', name: 'SOUND', text: 'trilha', kind: 'sound' }],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Toca em LOOP (acabou, começa de novo) — é a trilha do jogo. Chamar de novo NÃO reinicia. Use "Parar o som" para trocar de música.',
  },
  {
    type: 'sz_gk_stop_sound',
    message0: 'Parar o som %1',
    args0: [{ type: 'field_name_picker', name: 'SOUND', text: 'trilha', kind: 'sound' }],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'Para e volta ao começo. Use antes de tocar outra música.',
  },
  {
    type: 'sz_gk_set_volume',
    message0: 'Volume do som %1: %2',
    args0: [
      { type: 'field_name_picker', name: 'SOUND', text: 'trilha', kind: 'sound' },
      { type: 'input_value', name: 'LEVEL', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'De 0 (mudo) a 1 (máximo). A música costuma ficar baixinha (0.2) atrás dos efeitos.',
  },
  {
    type: 'sz_gk_create_empty_tilemap',
    message0: 'Criar o mapa vazio %1: %2 colunas × %3 linhas, peça %4, folha %5',
    args0: [
      { type: 'field_input', name: 'NAME', text: 'masmorra' },
      { type: 'input_value', name: 'COLS', check: 'JSValue' },
      { type: 'input_value', name: 'ROWS', check: 'JSValue' },
      { type: 'input_value', name: 'FILL', check: 'JSValue' },
      { type: 'field_asset_picker', name: 'ASSET', text: '' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Um mapa feito por CÓDIGO, não desenhado — é assim que se faz masmorra sorteada e mundo gerado. Depois use "Trocar a peça" num laço para cavar os corredores. Peça -1 = vazio.',
  },
  {
    type: 'sz_gk_move_with_custom_keys',
    message0: 'Mover %1 com as teclas: cima %2 baixo %3 esquerda %4 direita %5, usando o tempo %6',
    args0: [
      { type: 'field_name_picker', name: 'WHO', text: 'jogador2', kind: 'character' },
      { type: 'field_input', name: 'UP', text: 'i' },
      { type: 'field_input', name: 'DOWN', text: 'k' },
      { type: 'field_input', name: 'LEFT', text: 'j' },
      { type: 'field_input', name: 'RIGHT', text: 'l' },
      { type: 'field_name_picker', name: 'DT', text: 'dt', kind: 'variable' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'O "Mover pelas teclas" usa WASD E as setas no MESMO personagem — com este você escolhe as teclas e tem DOIS jogadores. Ganha a diagonal certinha de graça.',
  },
  // ==========================================================================
  // 👾 KIT MONSTRINHOS — o atalho do gênero "pegue e treine bichinhos".
  // ⭐ A TESE: este jogo É um jogo do Kit RPG com OUTRA batalha. O mundo (grade,
  // NPC, fala, mapa, flags, salvar) JÁ existe — aqui só entram as criaturas, os
  // encontros e a batalha criatura-vs-criatura.
  // ==========================================================================
  {
    type: 'sz_gk_pkm_creature',
    message0:
      'Criatura %1 do tipo %2: vida %3, força %4, defesa %5, velocidade %6, imagem %7, aparência %8',
    args0: [
      { type: 'field_input', name: 'NAME', text: 'Fogoso' },
      { type: 'field_name_picker', name: 'TYPE', text: 'fogo', kind: 'pkmtype' },
      { type: 'input_value', name: 'HP', check: 'JSValue' },
      { type: 'input_value', name: 'STR', check: 'JSValue' },
      { type: 'input_value', name: 'DEF', check: 'JSValue' },
      { type: 'input_value', name: 'SPD', check: 'JSValue' },
      { type: 'field_asset_picker', name: 'IMAGE', text: '' },
      { type: 'field_name_picker', name: 'LOOK', text: '', kind: 'look' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Os DADOS de uma espécie — os pontos são do NÍVEL 1; cada nível dá +8 de vida, +2 de força e +1 de defesa. O TIPO você inventa (fogo, gelo, doce, dinossauro…). Sem imagem nem aparência, vira um retângulo. Use uma vez por bicho.',
  },
  {
    type: 'sz_gk_pkm_move',
    message0: 'Ensinar o golpe %1 para %2: tipo %3, dano %4, acerto %5 %, efeito %6 na cor %7',
    args0: [
      { type: 'field_input', name: 'MOVE', text: 'Brasa' },
      { type: 'field_name_picker', name: 'CREATURE', text: 'Fogoso', kind: 'pkmcreature' },
      { type: 'field_name_picker', name: 'TYPE', text: 'fogo', kind: 'pkmtype' },
      { type: 'input_value', name: 'DMG', check: 'JSValue' },
      { type: 'input_value', name: 'ACC', check: 'JSValue' },
      {
        type: 'field_dropdown',
        name: 'FX',
        options: [
          ['investida', 'investida'],
          ['bola', 'bola'],
          ['raio', 'raio'],
          ['onda', 'onda'],
        ],
      },
      { type: 'field_colour_sz', name: 'COLOR', colour: '#ff8800' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Um golpe da criatura (até 4 por bicho). O TIPO dele é quem enfrenta a tabela de tipos. Acerto 100 = nunca erra; 70 = erra às vezes — golpe forte com acerto baixo é o risco que vale a pena. O efeito é a animação.',
  },
  {
    type: 'sz_gk_pkm_type_chart',
    message0: 'Tabela de tipos: %1 contra %2 causa %3 × de dano',
    args0: [
      { type: 'field_name_picker', name: 'A', text: 'fogo', kind: 'pkmtype' },
      { type: 'field_name_picker', name: 'B', text: 'planta', kind: 'pkmtype' },
      { type: 'input_value', name: 'MULT', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'VOCÊ inventa a regra: 2 = super efetivo, 0.5 = fraquinho, 0 = não teve efeito. Três destes fazem o triângulo clássico (fogo > planta > água > fogo) — e aí a batalha vira ESCOLHER o golpe certo, que é a graça do gênero. Sem tabela, todo golpe vale 1×.',
  },
  {
    type: 'sz_gk_pkm_evolve',
    message0: '%1 evolui para %2 no nível %3',
    args0: [
      { type: 'field_name_picker', name: 'FROM', text: 'Fogoso', kind: 'pkmcreature' },
      { type: 'field_name_picker', name: 'TO', text: 'Fogozão', kind: 'pkmcreature' },
      { type: 'input_value', name: 'LEVEL', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Ao subir para esse nível, a criatura VIRA outra espécie — mantendo o nível e a experiência dela. O jogo anuncia "está evoluindo!" sozinho.',
  },
  {
    type: 'sz_gk_pkm_catch_difficulty',
    message0: '%1 é %2 de pegar',
    args0: [
      { type: 'field_name_picker', name: 'NAME', text: 'Fogoso', kind: 'pkmcreature' },
      {
        type: 'field_dropdown',
        name: 'LEVEL',
        options: [
          ['fácil', 'fácil'],
          ['normal', 'normal'],
          ['difícil', 'difícil'],
          ['raríssimo', 'raríssimo'],
        ],
      },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'O lendário. Sem este bloco, toda criatura é "normal".',
  },
  {
    type: 'sz_gk_pkm_level_of',
    message0: 'o nível de %1',
    args0: [{ type: 'field_name_picker', name: 'CREATURE', text: 'Fogoso', kind: 'pkmcreature' }],
    output: 'JSValue',
    colour: C,
    tooltip: 'O nível da SUA criatura (0 se você não tem essa). Bom p/ portões: "se o nível ≥ 10".',
  },
  {
    type: 'sz_gk_pkm_give',
    message0: 'Ganhar a criatura %1 no nível %2',
    args0: [
      { type: 'field_name_picker', name: 'CREATURE', text: 'Fogoso', kind: 'pkmcreature' },
      { type: 'input_value', name: 'LEVEL', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Entra no seu time (até 6). O inicial que a professora dá, o presente, o ovo que chocou. Pendure num "Quando conversar com…".',
  },
  {
    type: 'sz_gk_pkm_give_ball',
    message0: 'Ganhar %1 bola(s) de captura de força %2 %',
    args0: [
      { type: 'input_value', name: 'COUNT', check: 'JSValue' },
      { type: 'input_value', name: 'POWER', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'A força é a chance base de pegar. 60 é a bola comum; 100 é a bola mestra (pega quase sempre). Bola melhor = recompensa/loja = progressão.',
  },
  {
    type: 'sz_gk_pkm_heal_team',
    message0: 'Curar todas as minhas criaturas',
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'O Centro de Cura inteiro num bloco: pendure num "Quando conversar com a enfermeira".',
  },
  {
    type: 'sz_gk_pkm_has',
    message0: 'eu tenho a criatura %1?',
    args0: [{ type: 'field_name_picker', name: 'CREATURE', text: 'Fogoso', kind: 'pkmcreature' }],
    output: 'JSValue',
    colour: C,
    tooltip: 'O portão da coleção: "se eu tenho o Fogoso, o guarda deixa passar".',
  },
  {
    type: 'sz_gk_pkm_team_size',
    message0: 'quantas criaturas eu tenho',
    output: 'JSValue',
    colour: C,
    tooltip: 'De 0 a 6. Vira a condição de vitória: "se eu tenho 3, ganhei!".',
  },
  {
    type: 'sz_gk_pkm_ball_count',
    message0: 'quantas bolas eu tenho',
    output: 'JSValue',
    colour: C,
    tooltip: 'Sem bolas, o botão "Bola" nem aparece na batalha.',
  },
  {
    type: 'sz_gk_pkm_draw_team',
    message0: 'Desenhar o meu time em x %1 y %2',
    args0: [
      { type: 'input_value', name: 'X', check: 'JSValue' },
      { type: 'input_value', name: 'Y', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'Nome, nível e barrinha de vida de cada uma. Fica ótimo no "Desenhar por cima (HUD)".',
  },
  {
    type: 'sz_gk_pkm_grass_cells',
    message0: 'Grama alta da célula %1 , %2 até %3 , %4',
    args0: [
      { type: 'input_value', name: 'X1', check: 'JSValue' },
      { type: 'input_value', name: 'Y1', check: 'JSValue' },
      { type: 'input_value', name: 'X2', check: 'JSValue' },
      { type: 'input_value', name: 'Y2', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'O retângulo de mato onde os bichos aparecem, em CÉLULAS da grade (como o "Bloquear a célula"). Monte dentro do "Quando chegar no mapa" e cada mapa tem a sua grama.',
  },
  {
    type: 'sz_gk_pkm_grass_tiles',
    message0: 'Grama alta: a peça %1 do mapa %2',
    args0: [
      { type: 'input_value', name: 'INDEX', check: 'JSValue' },
      { type: 'field_name_picker', name: 'MAP', text: 'mundo', kind: 'tilemap' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Desenhou o mato no Pinta? Diga QUAL peça é grama e ela vira mato em todo o mapa — sem marcar célula por célula.',
  },
  {
    type: 'sz_gk_pkm_wild',
    message0: 'Na grama alta deste mapa pode aparecer %1 do nível %2 ao %3',
    args0: [
      { type: 'field_name_picker', name: 'CREATURE', text: 'Folhinha', kind: 'pkmcreature' },
      { type: 'input_value', name: 'MIN', check: 'JSValue' },
      { type: 'input_value', name: 'MAX', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Um destes por bicho = a tabela de encontros (todos com a mesma chance). Monte no "Quando chegar no mapa" e cada rota tem os bichos dela.',
  },
  {
    type: 'sz_gk_pkm_encounter_rate',
    message0: 'Chance de encontro na grama: %1 % (a cada passo)',
    args0: [{ type: 'input_value', name: 'PCT', check: 'JSValue' }],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'O sorteio é por PASSO na grama (é como o jogo de verdade faz — e dá para sentir). 20% é o normal; 100% é para testar.',
  },
  {
    type: 'sz_gk_pkm_battle_wild',
    message0: 'Começar a batalha contra a criatura selvagem %1 no nível %2',
    args0: [
      { type: 'field_name_picker', name: 'CREATURE', text: 'Folhinha', kind: 'pkmcreature' },
      { type: 'input_value', name: 'LEVEL', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'A grama chama isto sozinha — use direto para o LENDÁRIO ou dentro de uma cena. Quem luta é a sua criatura, não você.',
  },
  {
    type: 'sz_gk_pkm_battle_trainer',
    message0: 'Começar a batalha contra o treinador %1, com o time dele %2',
    args0: [
      { type: 'field_input', name: 'NAME', text: 'Rival' },
      { type: 'input_statement', name: 'BODY', check: 'JSStmt' },
    ],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'O rival e o ginásio: ele troca de criatura sozinho quando a dele cai, e não dá para fugir nem jogar bola. Ponha "Criatura do treinador" lá dentro, uma por bicho.',
  },
  {
    type: 'sz_gk_pkm_trainer_creature',
    message0: 'Criatura do treinador: %1 no nível %2',
    args0: [
      { type: 'field_name_picker', name: 'CREATURE', text: 'Folhinha', kind: 'pkmcreature' },
      { type: 'input_value', name: 'LEVEL', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'Vai DENTRO do "batalha contra o treinador". A ordem é a ordem que ele manda.',
  },
  {
    type: 'sz_gk_pkm_caught',
    message0: 'peguei a criatura?',
    output: 'JSValue',
    colour: C,
    tooltip:
      'Verdadeiro se a última batalha terminou com uma captura. Use no "Quando a batalha terminar" (o mesmo do Kit RPG).',
  },
  // ---- 🥷 Ação em tempo real (estilo Zelda) ----
  {
    type: 'sz_gk_attack_facing',
    message0: 'Fazer %1 golpear na frente (alcance %2, por %3 s)',
    args0: [
      { type: 'field_name_picker', name: 'WHO', text: 'heroi', kind: 'character' },
      { type: 'input_value', name: 'RANGE', check: 'JSValue' },
      { type: 'input_value', name: 'DUR', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Dá um golpe na direção que o personagem olha: cria uma área de acerto na frente dele por um tempinho. Combina com "o golpe acertou?" para machucar o inimigo. Chame quando o jogador apertar o botão de ataque (ex.: "se a tecla espaço foi apertada").',
  },
  {
    type: 'sz_gk_did_hit',
    message0: 'o golpe de %1 acertou %2 ?',
    args0: [
      { type: 'field_name_picker', name: 'WHO', text: 'heroi', kind: 'character' },
      { type: 'field_name_picker', name: 'TARGET', text: 'inimigo', kind: 'character' },
    ],
    inputsInline: true,
    output: 'JSValue',
    colour: C,
    tooltip:
      'Verdadeiro quando a área do golpe encosta no alvo — e só UMA vez por golpe (não machuca 60 vezes por segundo). Padrão: "se o golpe de heroi acertou inimigo: machucar o inimigo".',
  },
  {
    type: 'sz_gk_patrol_around',
    message0: 'Fazer %1 patrulhar em volta de x %2 y %3 (raio %4)',
    args0: [
      { type: 'field_name_picker', name: 'WHO', text: 'inimigo', kind: 'character' },
      { type: 'input_value', name: 'OX', check: 'JSValue' },
      { type: 'input_value', name: 'OY', check: 'JSValue' },
      { type: 'input_value', name: 'RADIUS', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'O inimigo vagueia sozinho por perto do posto (x, y): anda para pontos aleatórios dentro do raio e nunca se afasta demais. Use no "A cada quadro". A velocidade é a do próprio personagem.',
  },
  {
    type: 'sz_gk_draw_hearts',
    message0: 'Desenhar corações: %1 de %2, em x %3 y %4',
    args0: [
      { type: 'input_value', name: 'CUR', check: 'JSValue' },
      { type: 'input_value', name: 'MAX', check: 'JSValue' },
      { type: 'input_value', name: 'X', check: 'JSValue' },
      { type: 'input_value', name: 'Y', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Desenha uma fileira de corações (os cheios = vida atual, os apagados = vida que falta). É a "vidinha" dos jogos de aventura. Fica ótimo no "Desenhar por cima (HUD)".',
  },
  // ---- 🥷 Ação: a JANELA do golpe (recuo + ativo) ----
  {
    type: 'sz_gk_swing_window',
    message0: 'Regular o golpe de %1: recuo %2 s, acerta por %3 s',
    args0: [
      { type: 'field_name_picker', name: 'WHO', text: 'heroi', kind: 'character' },
      { type: 'input_value', name: 'START', check: 'JSValue' },
      { type: 'input_value', name: 'ACTIVE', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    tooltip:
      'O golpe não machuca no instante em que você aperta: primeiro vem o RECUO (o braço indo) e só depois a janela em que ele acerta. Sem isso, quem aperta primeiro sempre ganha. O retângulo branco aparece só enquanto machuca. 0 e 0 = machuca o golpe inteiro.',
  },
  // ---- 🎬 Animação ----
  {
    type: 'sz_gk_play_anim_once',
    message0: 'Tocar a animação de %1: quadros %2 a %3, %4 por segundo, uma vez só',
    args0: [
      { type: 'field_name_picker', name: 'WHO', text: 'heroi', kind: 'character' },
      { type: 'input_value', name: 'FROM', check: 'JSValue' },
      { type: 'input_value', name: 'TO', check: 'JSValue' },
      { type: 'input_value', name: 'FPS', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    tooltip:
      'Toca e PARA no último quadro, em vez de repetir. Bom para golpe, morrer, abrir o baú.',
  },
  {
    type: 'sz_gk_anim_ended',
    message0: 'a animação de %1 acabou?',
    args0: [{ type: 'field_name_picker', name: 'WHO', text: 'heroi', kind: 'character' }],
    output: 'JSValue',
    tooltip:
      'Verdadeiro quando a animação de "uma vez só" já tocou tudo. (A que repete nunca acaba.)',
  },
  {
    type: 'sz_gk_set_entity_state',
    message0: 'Pôr %1 no estado %2 por %3 s',
    args0: [
      { type: 'field_name_picker', name: 'WHO', text: 'heroi', kind: 'character' },
      {
        type: 'field_dropdown',
        name: 'STATE',
        options: [
          ['parado', 'parado'],
          ['andando', 'andando'],
          ['pulando', 'pulando'],
          ['caindo', 'caindo'],
          ['levando dano', 'dano'],
          ['golpeando', 'golpe'],
          ['morrendo', 'morte'],
        ],
      },
      { type: 'input_value', name: 'SECS', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    tooltip:
      'Trava o estado por um tempo: enquanto durar, o "Animar sozinho" NÃO deixa a física roubar a animação. É o que impede a animação de andar de apagar o seu golpe.',
  },
  {
    type: 'sz_gk_entity_state',
    message0: 'o estado de %1',
    args0: [{ type: 'field_name_picker', name: 'WHO', text: 'heroi', kind: 'character' }],
    output: 'JSValue',
    tooltip:
      'O que ele está fazendo agora: parado, andando, pulando, caindo, dano, golpe ou morte.',
  },
  {
    type: 'sz_gk_state_anim',
    message0: 'Animação de %1 no estado %2: quadros %3 a %4, %5 por segundo %6',
    args0: [
      { type: 'field_name_picker', name: 'WHO', text: 'heroi', kind: 'character' },
      {
        type: 'field_dropdown',
        name: 'STATE',
        options: [
          ['parado', 'parado'],
          ['andando', 'andando'],
          ['pulando', 'pulando'],
          ['caindo', 'caindo'],
          ['levando dano', 'dano'],
          ['golpeando', 'golpe'],
          ['morrendo', 'morte'],
        ],
      },
      { type: 'input_value', name: 'FROM', check: 'JSValue' },
      { type: 'input_value', name: 'TO', check: 'JSValue' },
      { type: 'input_value', name: 'FPS', check: 'JSValue' },
      { type: 'field_checkbox', name: 'ONCE', checked: false },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    tooltip:
      'Diga uma vez qual animação é de cada estado; o "Animar sozinho" troca na hora certa. Marque a caixinha para ela NÃO poder ser interrompida (golpe, morrer).',
  },
  {
    type: 'sz_gk_state_look',
    message0: 'Aparência de %1 no estado %2 é %3',
    args0: [
      { type: 'field_name_picker', name: 'WHO', text: 'heroi', kind: 'character' },
      {
        type: 'field_dropdown',
        name: 'STATE',
        options: [
          ['parado', 'parado'],
          ['andando', 'andando'],
          ['pulando', 'pulando'],
          ['caindo', 'caindo'],
          ['levando dano', 'dano'],
          ['golpeando', 'golpe'],
          ['morrendo', 'morte'],
        ],
      },
      { type: 'field_name_picker', name: 'LOOK', text: 'parado', kind: 'look' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    tooltip: 'O mesmo que a animação por estado, mas com DESENHO (sem folha de imagens).',
  },
  {
    type: 'sz_gk_auto_animate',
    message0: 'Animar %1 sozinho (pelo que ele está fazendo)',
    args0: [{ type: 'field_name_picker', name: 'WHO', text: 'heroi', kind: 'character' }],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    tooltip:
      'Use todo quadro. Escolhe a animação pela ordem morte > golpe > dano > no ar > andando > parado, e vira o desenho para o lado que ele anda. Sem nada declarado, não faz nada.',
  },
  // ---- 🔧 Propriedades & direção: LER o ângulo ----
  {
    type: 'sz_gk_angle_of',
    message0: 'o ângulo de %1',
    args0: [{ type: 'field_name_picker', name: 'WHO', text: 'heroi', kind: 'character' }],
    output: 'JSValue',
    tooltip: 'Para onde ele está apontando, em graus (0 = direita).',
  },
  {
    type: 'sz_gk_angle_to',
    message0: 'o ângulo de %1 até %2',
    args0: [
      { type: 'field_name_picker', name: 'WHO', text: 'torre', kind: 'character' },
      { type: 'field_name_picker', name: 'TARGET', text: 'inimigo', kind: 'character' },
    ],
    inputsInline: true,
    output: 'JSValue',
    tooltip:
      'O ângulo que aponta de um para o outro. Junte com "Girar" para a torre acompanhar o alvo.',
  },
  // ---- ⚙️ Física: inércia e atrito ----
  {
    type: 'sz_gk_thrust',
    message0: 'Empurrar %1 no ângulo %2 com força %3',
    args0: [
      { type: 'field_name_picker', name: 'WHO', text: 'nave', kind: 'character' },
      { type: 'input_value', name: 'DEG', check: 'JSValue' },
      { type: 'input_value', name: 'FORCE', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    tooltip:
      'SOMA velocidade no ângulo, em vez de trocar — é isso que dá INÉRCIA: a nave continua andando depois que você solta. Use no "A cada quadro": a força é por segundo (px/s²). (O "Mover no ângulo" apaga a velocidade de antes.)',
  },
  {
    type: 'sz_gk_apply_friction',
    message0: 'Frear %1 com atrito %2 usando o tempo %3',
    args0: [
      { type: 'field_name_picker', name: 'WHO', text: 'nave', kind: 'character' },
      { type: 'input_value', name: 'FACTOR', check: 'JSValue' },
      { type: 'field_name_picker', name: 'DT', text: 'dt', kind: 'variable' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    tooltip:
      'Vai tirando a velocidade aos poucos. 0.9 = perde quase tudo em 1 segundo (chão normal); 0.1 = escorrega muito (gelo).',
  },
  // ---- ⏱️ Tempo: esperar UMA vez ----
  {
    type: 'sz_gk_wait',
    message0: 'Esperar %1 segundos e então',
    args0: [{ type: 'input_value', name: 'SECS', check: 'JSValue' }],
    message1: '%1',
    args1: [{ type: 'input_statement', name: 'DO', check: 'JSStmt' }],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    tooltip:
      'Faz o que estiver dentro DEPOIS do tempo, uma vez só. ("A cada N segundos" repete para sempre.) Conta no relógio do jogo: se pausar, para de contar.',
  },
  // ---- 👾 Moldes & enxames: o mais perto ----
  {
    type: 'sz_gk_nearest_active',
    message0: 'o mais perto de x %2 y %3 no molde %1',
    args0: [
      { type: 'field_name_picker', name: 'MOLD', text: 'inimigo', kind: 'mold' },
      { type: 'input_value', name: 'X', check: 'JSValue' },
      { type: 'input_value', name: 'Y', check: 'JSValue' },
    ],
    inputsInline: true,
    output: 'JSValue',
    tooltip:
      'O vivo do molde que está mais perto daquele ponto. É como a torre escolhe em quem atirar.',
  },
  // ---- 🎒 Itens: quantos ----
  {
    type: 'sz_gk_count_item',
    message0: 'quantos %1 eu tenho',
    args0: [{ type: 'field_input', name: 'NAME', text: 'madeira' }],
    output: 'JSValue',
    tooltip:
      'A quantidade daquele item (0 = nenhum). "Ganhar o item" soma de um em um, então dá para pedir 3 madeiras para construir.',
  },
  // ==========================================================================
  // R21 — primitivos GERAIS (do review do Space Invaders; fora de todo kit)
  // ==========================================================================
  {
    // O "um invasor ALEATÓRIO atira" do Space Invaders, generalizado: sorteio
    // num pool é de qualquer gênero (loot, horda, surpresa) — irmão do
    // "o mais perto de", por isso mora na 🎲 Sorte & medida.
    type: 'sz_gk_random_active',
    message0: 'um vivo qualquer do molde %1',
    args0: [{ type: 'field_name_picker', name: 'MOLD', text: 'inimigo', kind: 'mold' }],
    output: 'JSValue',
    tooltip:
      'Sorteia um dos vivos do molde (ou nada, se não houver nenhum). É como o jogo de nave escolhe qual inimigo atira — e serve para prêmio surpresa e horda.',
  },
  {
    type: 'sz_gk_float_text',
    message0: 'Soltar o texto %1 em x %2 y %3, cor %4, tamanho %5',
    args0: [
      { type: 'input_value', name: 'TEXT', check: 'JSValue' },
      { type: 'input_value', name: 'X', check: 'JSValue' },
      { type: 'input_value', name: 'Y', check: 'JSValue' },
      { type: 'field_colour_sz', name: 'COLOR', colour: '#ffffff' },
      { type: 'input_value', name: 'SIZE', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    tooltip:
      'Um texto que sobe e some sozinho — o "+100" de todo arcade. Solte na posição de quem morreu; para pontos, junte "+" com a variável.',
  },
  {
    type: 'sz_gk_trail_on',
    message0: 'Ligar o rastro de %1: cor %2, tamanho %3, %4 por segundo, dura %5 s',
    args0: [
      { type: 'field_name_picker', name: 'WHO', text: 'nave', kind: 'character' },
      { type: 'field_colour_sz', name: 'COLOR', colour: '#ffffff' },
      { type: 'input_value', name: 'SIZE', check: 'JSValue' },
      { type: 'input_value', name: 'RATE', check: 'JSValue' },
      { type: 'input_value', name: 'LIFE', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    tooltip:
      'Faíscas contínuas saindo de quem anda: jato da nave, cauda de cometa, escapamento. Ligue UMA vez; "Desligar o rastro" para. (O "Explodir faíscas" é um estouro único.)',
  },
  {
    type: 'sz_gk_trail_off',
    message0: 'Desligar o rastro de %1',
    args0: [{ type: 'field_name_picker', name: 'WHO', text: 'nave', kind: 'character' }],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    tooltip: 'Para o rastro contínuo daquele personagem.',
  },
  {
    type: 'sz_gk_shockwave',
    message0: 'Soltar uma onda de choque em x %1 y %2: até o raio %3 em %4 s, cor %5',
    args0: [
      { type: 'input_value', name: 'X', check: 'JSValue' },
      { type: 'input_value', name: 'Y', check: 'JSValue' },
      { type: 'input_value', name: 'RADIUS', check: 'JSValue' },
      { type: 'input_value', name: 'SECS', check: 'JSValue' },
      { type: 'field_colour_sz', name: 'COLOR', colour: '#ffffff' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    tooltip:
      'Um círculo que cresce e some — a cara de explosão grande. É SÓ desenho: para machucar, use "para cada vivo" + "a distância entre" + "machucar" (a regra é sua).',
  },
  {
    type: 'sz_gk_scroll_image',
    message0: 'Pintar o fundo rolando: imagem %1, velocidade x %2 y %3',
    args0: [
      { type: 'field_asset_picker', name: 'IMAGE', text: '' },
      { type: 'input_value', name: 'VX', check: 'JSValue' },
      { type: 'input_value', name: 'VY', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    tooltip:
      'Repete a imagem cobrindo a tela e rola na velocidade dada (px/s). Use no "Desenhar o jogo", como primeira camada; duas imagens em velocidades diferentes = paralaxe.',
  },
  {
    type: 'sz_gk_lean_on_move',
    message0: 'Inclinar %1 ao andar de lado (até %2 graus)',
    args0: [
      { type: 'field_name_picker', name: 'WHO', text: 'nave', kind: 'character' },
      { type: 'input_value', name: 'DEG', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    tooltip:
      'O desenho tomba suavemente na direção do movimento — a nave que "deita" ao desviar, o peixe, o carro. Ligue UMA vez; 0 graus desliga.',
  },
  {
    type: 'sz_gk_fan_shot',
    message0: 'Atirar de %1 um leque do molde %2: %3 tiros num arco de %4 °, rumo %5 °, a %6 px/s',
    args0: [
      { type: 'field_name_picker', name: 'WHO', text: 'nave', kind: 'character' },
      { type: 'field_name_picker', name: 'MOLD', text: 'tiro', kind: 'mold' },
      { type: 'input_value', name: 'COUNT', check: 'JSValue' },
      { type: 'input_value', name: 'ARC', check: 'JSValue' },
      { type: 'input_value', name: 'DEG', check: 'JSValue' },
      { type: 'input_value', name: 'SPEED', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    tooltip:
      'Nascem N tiros do molde em leque, já com velocidade. Rumo -90 = para cima (como o "Mover no ângulo"). Depois mova-os com "Mover pela velocidade" + "Recolher quem saiu".',
  },
  // ==========================================================================
  // 🚀 KIT NAVE — o atalho do gênero (Space Invaders / shoot-'em-up)
  // ==========================================================================
  // Pela REGRA: só o ESPECÍFICO do gênero mora aqui. O tiro do jogador, a
  // colisão tiro×invasor, o placar, o som e as telas são do motor GERAL — o kit
  // CHAMA (o exemplo mostra a receita). O que SÓ existe em jogo de nave:
  // a FORMAÇÃO que marcha em bloco (inverte na borda COLETIVA, desce, acelera —
  // impossível de compor com blocos por-entidade), o atirador aleatório dela,
  // a linha de invasão, o céu de estrelas e a bomba que quica.
  {
    type: 'sz_gk_nave_ship',
    message0:
      'Pilotar a nave %1: anda de lado a %2 px/s (setas ou A/D), inclina até %3 °, usando o tempo %4',
    args0: [
      { type: 'field_name_picker', name: 'WHO', text: 'nave', kind: 'character' },
      { type: 'input_value', name: 'SPEED', check: 'JSValue' },
      { type: 'input_value', name: 'LEAN', check: 'JSValue' },
      { type: 'field_name_picker', name: 'DT', text: 'dt', kind: 'variable' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    tooltip:
      'O piloto do gênero: anda só de lado, preso na tela, e o desenho tomba na curva. Use no "A cada quadro". O tiro é seu: "apertou espaço?" + nascer do molde.',
  },
  {
    type: 'sz_gk_nave_powerup',
    message0: 'Dar o poder de tiro %1 a %2 por %3 s',
    args0: [
      {
        type: 'field_dropdown',
        name: 'POWER',
        options: [
          ['metralhadora', 'metralhadora'],
          ['leque', 'leque'],
        ],
      },
      { type: 'field_name_picker', name: 'WHO', text: 'nave', kind: 'character' },
      { type: 'input_value', name: 'SECS', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    tooltip:
      'Um poder TEMPORÁRIO: acaba sozinho. Na hora de atirar, pergunte "o poder de tiro de…" — metralhadora = atire mais rápido (recarga menor); leque = "Atirar um leque".',
  },
  {
    type: 'sz_gk_nave_power_of',
    message0: 'o poder de tiro de %1',
    args0: [{ type: 'field_name_picker', name: 'WHO', text: 'nave', kind: 'character' }],
    output: 'JSValue',
    tooltip:
      'O poder valendo agora: "normal", "metralhadora" ou "leque". É o galho do "se" na hora de atirar.',
  },
  {
    type: 'sz_gk_nave_wave',
    message0:
      'Invadir: onda do molde %1 com %2 colunas × %3 linhas (espaço %4 px), a %5 px/s — desce %6 px e acelera %7 % na borda',
    args0: [
      { type: 'field_name_picker', name: 'MOLD', text: 'ovni', kind: 'mold' },
      { type: 'input_value', name: 'COLS', check: 'JSValue' },
      { type: 'input_value', name: 'ROWS', check: 'JSValue' },
      { type: 'input_value', name: 'GAP', check: 'JSValue' },
      { type: 'input_value', name: 'SPEED', check: 'JSValue' },
      { type: 'input_value', name: 'DROP', check: 'JSValue' },
      { type: 'input_value', name: 'ACCEL', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    tooltip:
      'A formação clássica: nasce em grade e o MOTOR marcha o bloco inteiro — bate na borda, desce e acelera. Derrotar todos avisa "onda:limpa"; alcançar a linha avisa "onda:invadiu". Não mova os invasores você mesmo: a marcha é do motor.',
  },
  {
    type: 'sz_gk_nave_wave_shooter',
    message0: 'A cada %1 s, um invasor do molde %2 atira 1 do molde %3 para baixo a %4 px/s',
    args0: [
      { type: 'input_value', name: 'SECS', check: 'JSValue' },
      { type: 'field_name_picker', name: 'MOLD', text: 'ovni', kind: 'mold' },
      { type: 'field_name_picker', name: 'BULLET', text: 'tiro-ovni', kind: 'mold' },
      { type: 'input_value', name: 'SPEED', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    tooltip:
      'A chuva de tiros da formação: um invasor SORTEADO atira (ligue 1 vez; religar troca o ritmo). O tiro nasce andando — recolha com "Recolher quem saiu da tela" e trate o acerto com "Quando se tocarem".',
  },
  {
    type: 'sz_gk_nave_invasion_line',
    message0: 'Marcar a linha de invasão na altura y %1 (avisa onda:invadiu)',
    args0: [{ type: 'input_value', name: 'Y', check: 'JSValue' }],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    tooltip:
      'A derrota clássica: se a formação DESCER até essa altura, sai o aviso "onda:invadiu" (escute com "Quando o aviso chegar" e termine o jogo). 0 = o fundo da tela.',
  },
  {
    type: 'sz_gk_nave_starfield',
    message0: 'Desenhar o céu de estrelas: %1 estrelas caindo a %2 px/s',
    args0: [
      { type: 'input_value', name: 'COUNT', check: 'JSValue' },
      { type: 'input_value', name: 'SPEED', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    tooltip:
      'O espaço rolando: estrelas descem e renascem no topo, para sempre. Use como a PRIMEIRA linha do "Desenhar o jogo". (Para um fundo com IMAGEM, use "Pintar o fundo rolando".)',
  },
  {
    type: 'sz_gk_nave_bomb',
    message0:
      'Soltar uma bomba do molde %1 quicando; recolhida, explode no raio %2 e recolhe o molde %3 (avisa bomba:acertou)',
    args0: [
      { type: 'field_name_picker', name: 'MOLD', text: 'bomba', kind: 'mold' },
      { type: 'input_value', name: 'RADIUS', check: 'JSValue' },
      { type: 'field_name_picker', name: 'TARGET', text: 'ovni', kind: 'mold' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    tooltip:
      'A bomba-prêmio: quica pela tela; quando o SEU tiro a recolher (no "Quando se tocarem": Recolher a bomba), o motor explode — onda de choque + recolhe o molde-alvo no raio + avisa "bomba:acertou" por vítima (some os pontos lá). No máximo 3 no ar.',
  },
  // ==========================================================================
  // KIT LUTA — o atalho do gênero
  // ==========================================================================
  {
    type: 'sz_gk_luta_match',
    message0: 'Luta de %1 × %2, melhor de %3 rounds de %4 s',
    args0: [
      { type: 'field_name_picker', name: 'P1', text: 'jogador1', kind: 'character' },
      { type: 'field_name_picker', name: 'P2', text: 'jogador2', kind: 'character' },
      { type: 'input_value', name: 'ROUNDS', check: 'JSValue' },
      { type: 'input_value', name: 'SECS', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    tooltip:
      'Casa os dois lutadores. Ponha DEPOIS de "Posicionar o personagem": é dali que sai o lugar onde cada um volta a cada round. Ganha quem levar a maioria (melhor de 3 = quem fizer 2).',
  },
  {
    type: 'sz_gk_luta_fighter',
    message0: 'Lutador %1 — andar %2 %3, pular %4, agachar %5',
    args0: [
      { type: 'field_name_picker', name: 'WHO', text: 'jogador1', kind: 'character' },
      { type: 'field_input', name: 'LEFT', text: 'a' },
      { type: 'field_input', name: 'RIGHT', text: 'd' },
      { type: 'field_input', name: 'JUMP', text: 'w' },
      { type: 'field_input', name: 'CROUCH', text: 's' },
    ],
    message1: 'defender %1 · usando o tempo %2',
    args1: [
      { type: 'field_input', name: 'GUARD', text: 'f' },
      { type: 'field_name_picker', name: 'DT', text: 'dt', kind: 'variable' },
    ],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    tooltip:
      'Faz TUDO: gravidade, andar, pular, agachar, defender — e virar de frente sozinho. Cada lutador tem as teclas DELE, então dois destes = dois jogadores no mesmo teclado. Use no "A cada quadro".',
  },
  {
    type: 'sz_gk_luta_ai',
    message0: 'Fazer %1 ser controlado pelo computador (dificuldade %2)',
    args0: [
      { type: 'field_name_picker', name: 'WHO', text: 'jogador2', kind: 'character' },
      {
        type: 'field_dropdown',
        name: 'LEVEL',
        options: [
          ['fácil', 'fácil'],
          ['normal', 'normal'],
          ['difícil', 'difícil'],
        ],
      },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    tooltip:
      'Põe no LUGAR do bloco "Lutador" daquele lutador — trocar um pelo outro é a diferença entre jogar sozinho e jogar com um amigo. Fácil quase não defende; difícil defende quase sempre, espera você errar o golpe e usa o especial quando a barra enche.',
  },
  {
    type: 'sz_gk_luta_move',
    message0: 'Golpe %1 de %2 — %3, dano %4, alcance %5',
    args0: [
      { type: 'field_input', name: 'NAME', text: 'soco' },
      { type: 'field_name_picker', name: 'WHO', text: 'jogador1', kind: 'character' },
      {
        type: 'field_dropdown',
        name: 'SPEED',
        options: [
          ['rápido', 'rápido'],
          ['médio', 'médio'],
          ['pesado', 'pesado'],
        ],
      },
      { type: 'input_value', name: 'DMG', check: 'JSValue' },
      { type: 'input_value', name: 'RANGE', check: 'JSValue' },
    ],
    message1: 'atravessa a defesa %1 · gasta o especial %2',
    args1: [
      { type: 'field_checkbox', name: 'PIERCE', checked: false },
      { type: 'field_checkbox', name: 'SPECIAL', checked: false },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    tooltip:
      'A palavra escolhe o RITMO do golpe: rápido sai antes mas machuca pouco; pesado demora, mas se acertar o outro fica travado tempo bastante para você emendar outro golpe — é assim que nasce o combo. "Atravessa a defesa" vence quem só fica defendendo.',
  },
  {
    type: 'sz_gk_luta_move_anim',
    message0: 'A animação do golpe %1 de %2 são os quadros %3 a %4',
    args0: [
      { type: 'field_input', name: 'NAME', text: 'soco' },
      { type: 'field_name_picker', name: 'WHO', text: 'jogador1', kind: 'character' },
      { type: 'input_value', name: 'FROM', check: 'JSValue' },
      { type: 'input_value', name: 'TO', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    tooltip:
      'Os quadros da folha que tocam durante o golpe. A velocidade é calculada para a animação durar exatamente o golpe — você não precisa acertar nenhum número.',
  },
  {
    type: 'sz_gk_luta_attack',
    message0: 'Fazer %1 dar o golpe %2',
    args0: [
      { type: 'field_name_picker', name: 'WHO', text: 'jogador1', kind: 'character' },
      { type: 'field_input', name: 'MOVE', text: 'soco' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    tooltip:
      'Use junto com "se a tecla foi apertada". Não sai se ele estiver travado, já golpeando, ou se for o especial e a barra não estiver cheia.',
  },
  {
    type: 'sz_gk_luta_draw_hud',
    message0: 'Desenhar o placar da luta',
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    tooltip:
      'As duas barras de vida, as barras de especial, o cronômetro, as bolinhas de round ganho e os letreiros (ROUND 2, K.O.!, TEMPO!). Ponha no "Desenhar por cima (HUD)".',
  },
  {
    type: 'sz_gk_luta_winner',
    message0: 'o vencedor da luta',
    output: 'JSValue',
    tooltip: '"jogador 1", "jogador 2" ou "empate". Use no aviso "luta:acabou".',
  },
  {
    type: 'sz_gk_luta_round',
    message0: 'o round de agora',
    output: 'JSValue',
    tooltip: 'Em que round a luta está (1, 2, 3…).',
  },
  {
    type: 'sz_gk_luta_wins_of',
    message0: 'os rounds ganhos por %1',
    args0: [{ type: 'field_name_picker', name: 'WHO', text: 'jogador1', kind: 'character' }],
    output: 'JSValue',
    tooltip: 'Quantos rounds aquele lutador já ganhou.',
  },
  {
    type: 'sz_gk_luta_combo',
    message0: 'o combo de %1',
    args0: [{ type: 'field_name_picker', name: 'WHO', text: 'jogador1', kind: 'character' }],
    output: 'JSValue',
    tooltip:
      'Quantos golpes ele encaixou em seguida, sem o outro se recuperar. Zera sozinho quando o outro volta a se mexer.',
  },
  {
    type: 'sz_gk_luta_special',
    message0: 'o especial de %1 (de 0 a 100)',
    args0: [{ type: 'field_name_picker', name: 'WHO', text: 'jogador1', kind: 'character' }],
    output: 'JSValue',
    tooltip:
      'A barra de especial. Enche batendo e apanhando (defender não enche), e ATRAVESSA os rounds — por isso o último round é o mais tenso.',
  },
  {
    type: 'sz_gk_luta_is_guarding',
    message0: 'o lutador %1 está defendendo?',
    args0: [{ type: 'field_name_picker', name: 'WHO', text: 'jogador1', kind: 'character' }],
    output: 'JSValue',
    tooltip: 'Verdadeiro enquanto ele segura a tecla de defender. Bom para som e faísca.',
  },
]

/**
 * Sub-categorias da paleta (a cor de cada uma é um TOM do teal, derivado abaixo).
 *
 * REGRA de organização: o motor GERAL (faz qualquer jogo, inclusive um RPG na
 * unha) vem PRIMEIRO; o 🧙 Kit RPG (o atalho facilitado, SÓ para RPG — acoplado
 * ao mundo `rpg.*`) vem por ÚLTIMO, com todas as suas categorias prefixadas
 * "Kit RPG:". O que é genérico (tiles/profundidade, ação em tempo real) fica FORA
 * do Kit RPG. A ordem geral segue o fluxo mental: preparar/carregar → telas →
 * estados → laço → personagens → entrada (teclas/mouse) → arquitetura (avisos/
 * moldes/aparência/comportamentos/animação/câmera/mundo) → combate/ação → HUD →
 * faíscas → som.
 */
const SUBCATS: { name: string; colour: string; types: string[] }[] = [
  {
    // "Carregar" (só load_image) foi fundido aqui: preparar + carregar imagens.
    name: '🧰 O jogo',
    colour: C,
    types: [
      'sz_gk_setup',
      'sz_gk_start',
      'sz_gk_load_image',
      'sz_gk_game_width',
      'sz_gk_game_height',
    ],
  },
  {
    name: '🖼️ Telas',
    colour: C,
    types: [
      'sz_gk_set_screen_text',
      'sz_gk_create_screen',
      'sz_gk_add_button',
      'sz_gk_show_screen',
      'sz_gk_hide_screens',
    ],
  },
  {
    // GERAL, apesar do prefixo `rpg` nos types (renomear type quebra projeto
    // salvo): o motor desenha a fala e o menu no canvas e navega neles em
    // QUALQUER jogo — o stepUiInput roda no stepSystems, fora do Kit RPG.
    name: '💬 Fala & escolhas',
    colour: C,
    types: ['sz_gk_rpg_say', 'sz_gk_rpg_menu', 'sz_gk_rpg_option'],
  },
  {
    name: '🚦 Estados',
    colour: C,
    types: [
      'sz_gk_set_state',
      'sz_gk_on_enter_state',
      'sz_gk_game_state',
      'sz_gk_state_is',
      'sz_gk_pause',
      'sz_gk_resume',
      'sz_gk_return_to_menu',
      'sz_gk_end_game',
    ],
  },
  {
    name: '🔁 A cada quadro',
    colour: C,
    types: [
      'sz_gk_on_update',
      'sz_gk_on_draw',
      'sz_gk_on_draw_hud',
      'sz_gk_draw_background',
      'sz_gk_scroll_image',
    ],
  },
  {
    // Era a única categoria inchada (14). Ficou com o CICLO DE VIDA do
    // personagem: criar, mover, posicionar, desenhar — e o renascer, que veio do
    // Kit Plataforma (o runtime dele não tem NADA de plataforma: é "guardar um
    // ponto" + teleporte, e vale em RPG, top-down, corrida, bullet hell).
    name: '🧍 Personagens',
    colour: C,
    types: [
      'sz_gk_create_character',
      'sz_gk_move_with_keys',
      'sz_gk_keep_on_screen',
      'sz_gk_draw_character',
      'sz_gk_place_character',
      'sz_gk_reset_character',
      'sz_gk_set_speed_multiplier',
      'sz_gk_characters_touch',
      'sz_gk_plat_checkpoint',
      'sz_gk_plat_respawn',
    ],
  },
  {
    // A "chave-mestra": ler/escrever qualquer coisa do personagem. Saiu de 🧍
    // porque é outro assunto (a doc já tratava como seção separada) e porque é o
    // que a criança procura quando o bloco pronto não existe.
    name: '🔧 Propriedades & direção',
    colour: C,
    types: [
      'sz_gk_char_x',
      'sz_gk_char_y',
      'sz_gk_property_of',
      'sz_gk_set_property',
      'sz_gk_set_facing',
      'sz_gk_facing_of',
      'sz_gk_set_hitbox',
      'sz_gk_angle_of',
      'sz_gk_angle_to',
    ],
  },
  {
    // Teclado e mouse são a MESMA ideia (a entrada do jogador) — viviam
    // separados em 3+4 blocos.
    name: '🎮 Controles',
    colour: C,
    types: [
      'sz_gk_key_down',
      'sz_gk_key_pressed',
      'sz_gk_set_pause_key',
      'sz_gk_on_game_click',
      'sz_gk_mouse_x',
      'sz_gk_mouse_y',
      'sz_gk_mouse_down',
      'sz_gk_move_with_custom_keys',
    ],
  },
  {
    name: '📢 Avisos',
    colour: C,
    types: ['sz_gk_on_event', 'sz_gk_emit'],
  },
  {
    name: '👾 Moldes & enxames',
    colour: C,
    types: [
      'sz_gk_define_mold',
      'sz_gk_spawn_from_mold',
      'sz_gk_spawn_named',
      'sz_gk_start_spawner',
      'sz_gk_stop_spawner',
      'sz_gk_for_each_active',
      'sz_gk_cull_offscreen',
      'sz_gk_recycle',
      'sz_gk_draw_active',
      'sz_gk_count_active',
      'sz_gk_nearest_active',
    ],
  },
  {
    // "Aparência" (não "Desenho"): o visual VETORIAL + a folha de quadros. As
    // duas respondem "com o que esse personagem se parece" (viviam em 2+3).
    name: '🎨 Aparência',
    colour: C,
    types: [
      'sz_gk_define_look',
      'sz_gk_draw_look',
      'sz_gk_set_sheet',
      'sz_gk_set_walk_sheet',
      'sz_gk_lean_on_move',
    ],
  },
  {
    // ⭐ Categoria NOVA (R18). A animação era um apêndice da aparência com 5
    // blocos; com a TRAVA por estado ela virou assunto próprio (e iria a 12 num
    // chip só, acima do teto de 10).
    //
    // ⚠️ A trava é o que faltava nos TRÊS sistemas de animação da extensão (folha
    // manual · folha de andar · quadros por física): sem ela a criança manda
    // golpear e a animação de andar apaga o golpe no quadro seguinte.
    name: '🎬 Animação',
    colour: C,
    types: [
      'sz_gk_play_anim',
      'sz_gk_play_anim_once',
      'sz_gk_anim_ended',
      'sz_gk_state_anim',
      'sz_gk_state_look',
      'sz_gk_auto_animate',
      'sz_gk_set_entity_state',
      'sz_gk_entity_state',
    ],
  },
  {
    name: '🎯 Comportamentos',
    colour: C,
    types: [
      'sz_gk_seek',
      'sz_gk_drift',
      'sz_gk_face',
      'sz_gk_launch_towards',
      'sz_gk_move_by_velocity',
      'sz_gk_set_angle',
      'sz_gk_launch_to_point',
      'sz_gk_set_velocity_angle',
      'sz_gk_fan_shot',
      'sz_gk_tween_to',
    ],
  },
  {
    name: '🎥 Câmera',
    colour: C,
    types: [
      'sz_gk_camera_follow',
      'sz_gk_camera_stop',
      'sz_gk_camera_shake',
      'sz_gk_camera_x',
      'sz_gk_camera_y',
    ],
  },
  {
    // GERAIS: carregar/desenhar o mapa, profundidade, sombra e as peças por
    // célula valem em qualquer jogo. (O "deixar sólidas as peças" alimenta a
    // GRADE do RPG — por isso vive no Kit RPG; fora dele a colisão é a do 🧱.)
    name: '🗺️ Mundo & profundidade',
    colour: C,
    types: [
      'sz_gk_load_tilemap',
      'sz_gk_draw_tilemap',
      'sz_gk_draw_shadow',
      'sz_gk_draw_by_depth',
      'sz_gk_set_tile_size',
      'sz_gk_tile_at',
      'sz_gk_set_tile_at',
      'sz_gk_break_tile_at',
      'sz_gk_create_empty_tilemap',
    ],
  },
  {
    // ⚙️ GERAL: a física que faz plataforma/corrida/flappy/breakout existirem.
    // A receita é sempre: gravidade → mover pela velocidade → colidir.
    name: '⚙️ Física',
    colour: C,
    types: [
      'sz_gk_apply_gravity',
      'sz_gk_jump',
      'sz_gk_is_on_ground',
      'sz_gk_set_velocity',
      'sz_gk_velocity_of',
      'sz_gk_set_terminal_velocity',
      'sz_gk_thrust',
      'sz_gk_apply_friction',
      'sz_gk_bounce_on_edges',
      'sz_gk_wrap_edges',
    ],
  },
  {
    name: '🧱 Colisão sólida',
    colour: C,
    types: ['sz_gk_collide_tilemap', 'sz_gk_collide_group', 'sz_gk_overlap_groups'],
  },
  {
    name: '⏱️ Tempo',
    colour: C,
    types: ['sz_gk_every_seconds', 'sz_gk_wait', 'sz_gk_cooldown_ready'],
  },
  {
    // Combate ANTES de Ação: a ação em tempo real usa hurt/i-frames/knockback.
    name: '❤️ Combate',
    colour: C,
    types: [
      'sz_gk_hurt',
      'sz_gk_knockback',
      'sz_gk_draw_health_bar',
      'sz_gk_touching_circle',
      'sz_gk_is_dead',
      'sz_gk_is_invincible',
      'sz_gk_health_of',
    ],
  },
  {
    // GERAL (não Kit RPG): golpe/hitbox/patrulha valem em qualquer jogo de ação.
    name: '🥷 Ação em tempo real',
    colour: C,
    types: [
      'sz_gk_attack_facing',
      'sz_gk_swing_window',
      'sz_gk_did_hit',
      'sz_gk_patrol_around',
      // ⭐ HONRAR A REGRA: o "virar na parede" não tem NADA de plataforma — não lê
      // onGround, nem gravidade, nem plat.*: lê "meu vx zerou depois de eu andar =
      // bati". Funciona igual num dungeon de topo ou num Frogger, e o irmão
      // "patrulhar em volta" já era geral. Kit = o atalho de UM gênero; isto é de
      // todos.
      'sz_gk_plat_patrol_wall',
    ],
  },
  {
    // Os 3 jeitos de mostrar a vida moram JUNTOS aqui (a barra automática em
    // cima do personagem fica no ❤️ Combate, que é onde a vida muda).
    name: '🖥️ HUD & Missão',
    colour: C,
    types: [
      'sz_gk_set_mission',
      'sz_gk_mission_kill',
      'sz_gk_draw_timer',
      'sz_gk_draw_bar',
      'sz_gk_draw_hearts',
      'sz_gk_float_text',
      'sz_gk_time_survived',
      'sz_gk_kills',
    ],
  },
  {
    name: '✨ Faíscas',
    colour: C,
    types: [
      'sz_gk_define_effect',
      'sz_gk_burst',
      'sz_gk_draw_effects',
      'sz_gk_trail_on',
      'sz_gk_trail_off',
      'sz_gk_shockwave',
    ],
  },
  {
    name: '🔊 Som',
    colour: C,
    types: [
      'sz_gk_load_sound',
      'sz_gk_play_sound',
      'sz_gk_play_music',
      'sz_gk_stop_sound',
      'sz_gk_set_volume',
      'sz_gk_play_effect',
      'sz_gk_play_tone',
    ],
  },
  {
    // Um retângulo com nome no mundo. É o gatilho de TODO gênero (grama alta,
    // porta, zona de dano, área segura) — e o "quanto está dentro" é a joia que
    // faz o encontro na grama parecer justo.
    name: '🧭 Regiões',
    colour: C,
    types: ['sz_gk_define_region', 'sz_gk_is_inside', 'sz_gk_overlap_percent'],
  },
  {
    name: '🎲 Sorte & medida',
    colour: C,
    types: ['sz_gk_chance', 'sz_gk_distance_between', 'sz_gk_point_in', 'sz_gk_random_active'],
  },
  {
    name: '🌫️ Sumir & transição',
    colour: C,
    types: [
      'sz_gk_set_opacity',
      'sz_gk_opacity_of',
      'sz_gk_fade_to',
      'sz_gk_tween_property',
      'sz_gk_fade_screen',
      'sz_gk_flash_screen',
    ],
  },
  {
    // ⭐ HONRAR A REGRA (o R18 decidiu que itens são GERAIS; o R20 trouxe a
    // categoria para cá): dar/ter/contar itens é de QUALQUER jogo — coleta,
    // loja, crafting. Só o nome dos types segue "rpg_*" (renomear quebraria
    // projeto salvo). Vive colada na 💾 Memória: inventário e persistência
    // andam juntos.
    name: '🎒 Itens',
    colour: C,
    types: [
      'sz_gk_rpg_give_item',
      'sz_gk_rpg_has_item',
      'sz_gk_count_item',
      'sz_gk_rpg_remove_item',
      'sz_gk_rpg_draw_inventory',
    ],
  },
  {
    name: '💾 Memória',
    colour: C,
    types: [
      'sz_gk_save_value',
      'sz_gk_saved_value',
      // ⭐ HONRAR A REGRA: uma flag de história é um BOOLEANO COM NOME ("já viu a
      // intro", "destravou a fase 2"). Não tem grade, NPC nem parede: nada de RPG.
      // Ficam coladas aqui, e o contraste vive no tooltip — a flag morre com a
      // partida; o "valor guardado" sobrevive a fechar o jogo. Criança nenhuma
      // adivinha essa diferença sozinha.
      'sz_gk_rpg_add_flag',
      'sz_gk_rpg_has_flag',
    ],
  },
  // ---- 🏃 KIT PLATAFORMA (o atalho do gênero) ----
  // Pela REGRA: só o ESPECÍFICO de plataforma mora aqui. Gravidade, colidir,
  // pular, tiles e o renascer são GERAIS e vivem lá em cima.
  {
    name: '🏃 Kit Plataforma: herói',
    colour: C,
    types: [
      'sz_gk_plat_hero',
      'sz_gk_plat_jump_feel',
      'sz_gk_plat_double_jump',
      'sz_gk_plat_wall_slide',
      'sz_gk_plat_wall_jump',
      'sz_gk_plat_ladder',
      'sz_gk_plat_state_frames',
      'sz_gk_plat_anim',
    ],
  },
  {
    name: '🧗 Kit Plataforma: mundo',
    colour: C,
    types: [
      'sz_gk_plat_one_way',
      'sz_gk_plat_drop_through',
      'sz_gk_plat_moving',
      'sz_gk_plat_ride_on',
      // Os inimigos eram uma categoria de 2 — nome próprio custa mais navegação
      // do que economiza.
      'sz_gk_plat_stomp',
    ],
  },
  // ---- 🥊 KIT LUTA (o atalho do gênero) ----
  {
    // ⭐ O Kit Luta. Pela REGRA: só o que é ESPECÍFICO de luta mora aqui. Gravidade,
    // pulo (o "Regular o pulo" regula o coyote e a gravidade da luta de graça;
    // a força do impulso é fixa do kit), caixa de golpe, recuo,
    // dano, empurrão, invencibilidade, trava de animação, telas de fim, tremor e
    // faíscas são do motor GERAL — o kit CHAMA, não copia.
    //
    // ⚠️ O chão também é geral: "Criar o molde" + "Nascer" + "Colidir com o
    // enxame". Um bloco "Chão da luta em y N" seria exatamente o position.y = 330
    // hard-coded da base, e chão não é de luta — é de todo jogo de lado. O Kit
    // Plataforma também não tem chão próprio.
    name: '🥊 Kit Luta: a partida',
    colour: C,
    types: [
      'sz_gk_luta_match',
      'sz_gk_luta_draw_hud',
      'sz_gk_luta_winner',
      'sz_gk_luta_round',
      'sz_gk_luta_wins_of',
    ],
  },
  {
    name: '🥊 Kit Luta: os lutadores',
    colour: C,
    types: ['sz_gk_luta_fighter', 'sz_gk_luta_ai', 'sz_gk_luta_is_guarding'],
  },
  {
    // ⭐ O COMBO não é bloco: é consequência da tabela de tempos que a palavra
    // (rápido/médio/pesado) escolhe. Um "pesado" trava o outro por mais tempo do
    // que leva para você se recuperar — sobra uma frestinha, e a criança DESCOBRE
    // que chute→soco encaixa. E o agarrão é um checkbox ("atravessa a defesa"):
    // o que o agarrão FAZ no jogo é uma coisa só — vencer quem só defende.
    name: '🥊 Kit Luta: golpes & combo',
    colour: C,
    types: [
      'sz_gk_luta_move',
      'sz_gk_luta_move_anim',
      'sz_gk_luta_attack',
      'sz_gk_luta_combo',
      'sz_gk_luta_special',
    ],
  },
  // ---- 🧙 KIT RPG (o kit facilitado, SÓ para montar um RPG) ----
  // Tudo aqui é acoplado ao mundo `rpg.*` (grade/NPCs/mapas/batalha) — por isso
  // as categorias levam o prefixo "Kit RPG:". A FALA e o MENU saíram para o
  // geral (💬 Fala & escolhas), e os ITENS para 🎒 Itens (gerais): o motor os
  // serve em qualquer jogo.
  {
    name: '🧙 Kit RPG: mundo',
    colour: C,
    types: [
      'sz_gk_rpg_on_map',
      'sz_gk_rpg_go_map',
      'sz_gk_rpg_create_door',
      'sz_gk_rpg_move_grid',
      'sz_gk_rpg_block_cell',
      // Alimenta a GRADE do RPG (rpg.walls) — só o "Mover pela grade" lê isso,
      // por isso é RPG e não geral. O type mantém o nome antigo (renomear
      // quebraria projeto salvo); só a categoria mudou.
      'sz_gk_tilemap_solid',
      'sz_gk_rpg_cell',
    ],
  },
  {
    name: '💬 Kit RPG: NPCs',
    colour: C,
    types: ['sz_gk_rpg_create_npc', 'sz_gk_rpg_draw_npcs', 'sz_gk_rpg_on_talk'],
  },
  {
    name: '🎬 Kit RPG: cenas',
    colour: C,
    types: [
      'sz_gk_rpg_cutscene',
      'sz_gk_rpg_wait',
      'sz_gk_rpg_npc_walk_to',
      'sz_gk_rpg_face',
      'sz_gk_rpg_npc_wander',
      'sz_gk_rpg_on_step',
    ],
  },
  {
    // Só o SALVAR fica no kit: ele serializa o estado do RPG (flags/itens/mapa/
    // atributos). O menu de escolha saiu p/ o geral (💬 Fala & escolhas).
    name: '💾 Kit RPG: salvar',
    colour: C,
    types: ['sz_gk_rpg_save', 'sz_gk_rpg_load', 'sz_gk_rpg_has_save'],
  },
  {
    // A batalha fecha o cluster do RPG DE PROPÓSITO: o Kit Monstrinhos (logo
    // abaixo) é "um jogo do Kit RPG com OUTRA batalha" — a vizinhança conta a
    // história. (Ela morava órfã no FIM do array, depois do Monstrinhos inteiro.)
    name: '⚔️ Kit RPG: batalha',
    colour: C,
    types: [
      'sz_gk_rpg_battle_stats',
      'sz_gk_rpg_battle_start',
      'sz_gk_rpg_set_special',
      'sz_gk_rpg_give_potion',
      'sz_gk_rpg_battle_reward',
      'sz_gk_rpg_inflict',
      'sz_gk_rpg_on_battle_end',
      'sz_gk_rpg_battle_won',
      'sz_gk_rpg_level',
      'sz_gk_rpg_xp',
    ],
  },
  // ---- 👾 KIT MONSTRINHOS (o atalho do gênero "pegue e treine bichinhos") ----
  // ⭐ É um jogo do Kit RPG com OUTRA batalha: o mundo (grade/NPC/fala/mapa/
  // flags/salvar) vem de lá. Aqui só o que é do gênero.
  {
    name: '👾 Kit Monstrinhos: criaturas',
    colour: C,
    types: [
      'sz_gk_pkm_creature',
      'sz_gk_pkm_move',
      'sz_gk_pkm_type_chart',
      'sz_gk_pkm_evolve',
      'sz_gk_pkm_catch_difficulty',
      'sz_gk_pkm_level_of',
    ],
  },
  {
    name: '🎒 Kit Monstrinhos: meu time',
    colour: C,
    types: [
      'sz_gk_pkm_give',
      'sz_gk_pkm_give_ball',
      'sz_gk_pkm_heal_team',
      'sz_gk_pkm_has',
      'sz_gk_pkm_team_size',
      'sz_gk_pkm_ball_count',
      'sz_gk_pkm_draw_team',
    ],
  },
  {
    name: '🌿 Kit Monstrinhos: encontros & batalha',
    colour: C,
    types: [
      'sz_gk_pkm_grass_cells',
      'sz_gk_pkm_grass_tiles',
      'sz_gk_pkm_wild',
      'sz_gk_pkm_encounter_rate',
      'sz_gk_pkm_battle_wild',
      'sz_gk_pkm_battle_trainer',
      'sz_gk_pkm_trainer_creature',
      'sz_gk_pkm_caught',
    ],
  },
  // ---- 🚀 KIT NAVE (o atalho do gênero) ----
  // A formação que marcha em bloco é o coração intransferível do Space Invaders;
  // tiro do jogador/colisão/placar/som são GERAIS — o kit chama, não copia.
  {
    name: '🚀 Kit Nave: a nave',
    colour: C,
    types: ['sz_gk_nave_ship', 'sz_gk_nave_powerup', 'sz_gk_nave_power_of'],
  },
  {
    name: '🛸 Kit Nave: a invasão',
    colour: C,
    types: ['sz_gk_nave_wave', 'sz_gk_nave_wave_shooter', 'sz_gk_nave_invasion_line'],
  },
  {
    name: '🌌 Kit Nave: o espaço',
    colour: C,
    types: ['sz_gk_nave_starfield', 'sz_gk_nave_bomb'],
  },
]

// Cada sub-categoria recebe um TOM do teal da categoria (claro→escuro).
const SUBCAT_SHADES = categoryShades(C, SUBCATS.length)
SUBCATS.forEach((sc, i) => {
  sc.colour = SUBCAT_SHADES[i] ?? C
})
// Cor = navegação: pinta cada bloco com a cor do seu grupo.
const COLOUR_BY_TYPE = new Map<string, string>(
  SUBCATS.flatMap((sc) => sc.types.map((t) => [t, sc.colour] as const)),
)
for (const b of gameKitBlocks) {
  const colour = COLOUR_BY_TYPE.get(b.type)
  if (colour) b.colour = colour
}

// Rede de segurança: bloco fora de qualquer sub-categoria cai num grupo "Mais".
const CATEGORIZED = new Set(SUBCATS.flatMap((sc) => sc.types))
const leftover = gameKitBlocks.map((b) => b.type).filter((t) => !CATEGORIZED.has(t))

// Sombras pré-preenchidas dos soquetes de VALOR que aparecem na paleta.
const txtShadow = (text: string) => ({ shadow: { type: 'sz_val_text', fields: { TEXT: text } } })
const numShadow = (value: number) => ({ shadow: { type: 'sz_val_number', fields: { NUM: value } } })
export const GK_SOCKET_SHADOWS: Record<string, Record<string, unknown>> = {
  sz_gk_setup: { W: numShadow(1280), H: numShadow(720) },
  sz_gk_set_screen_text: {
    TITLE: txtShadow('Meu Jogo'),
    TEXT: txtShadow('WASD ou setas para andar'),
    BTN: txtShadow('Jogar'),
  },
  sz_gk_create_screen: {
    TITLE: txtShadow('Minha loja'),
    TEXT: txtShadow('Bem-vindo!'),
  },
  sz_gk_add_button: { LABEL: txtShadow('Jogar de novo') },
  sz_gk_create_character: { W: numShadow(64), H: numShadow(64), SPEED: numShadow(300) },
  sz_gk_place_character: { X: numShadow(100), Y: numShadow(100) },
  sz_gk_set_speed_multiplier: { FACTOR: numShadow(2) },
  // P24
  sz_gk_define_mold: {
    W: numShadow(40),
    H: numShadow(40),
    HEALTH: numShadow(20),
    SPEED: numShadow(120),
    DAMAGE: numShadow(10),
  },
  sz_gk_spawn_from_mold: { X: numShadow(100), Y: numShadow(100) },
  sz_gk_spawn_named: { X: numShadow(100), Y: numShadow(100) },
  sz_gk_start_spawner: { SEC: numShadow(1.5) },
  // 200 = o despawn do P24 (2× a margem de spawn de 100 — quem nasce na borda
  // não é recolhido no quadro seguinte).
  sz_gk_cull_offscreen: { MARGIN: numShadow(200) },
  sz_gk_define_look: { W: numShadow(40), H: numShadow(40) },
  sz_gk_draw_look: { X: numShadow(100), Y: numShadow(100), W: numShadow(40), H: numShadow(40) },
  sz_gk_hurt: { AMOUNT: numShadow(10), IFRAMES: numShadow(1) },
  sz_gk_knockback: { FORCE: numShadow(400) },
  // R2
  sz_gk_set_sheet: { FW: numShadow(32), FH: numShadow(32) },
  sz_gk_play_anim: { FROM: numShadow(0), TO: numShadow(3), FPS: numShadow(8) },
  sz_gk_camera_follow: { W: numShadow(1920), H: numShadow(1080) },
  sz_gk_launch_towards: { V: numShadow(400) },
  sz_gk_set_angle: { DEG: numShadow(0) },
  sz_gk_draw_bar: {
    CUR: numShadow(50),
    MAX: numShadow(100),
    X: numShadow(20),
    Y: numShadow(20),
    W: numShadow(200),
    H: numShadow(16),
  },
  // 0 = automático (usa a vida máxima do personagem — o runtime resolve).
  sz_gk_draw_health_bar: { MAX: numShadow(0) },
  sz_gk_set_mission: { SEC: numShadow(30), KILLS: numShadow(10) },
  sz_gk_draw_timer: { X: numShadow(20), Y: numShadow(40) },
  sz_gk_define_effect: {
    COUNT: numShadow(16),
    SIZE: numShadow(4),
    LIFE: numShadow(0.6),
    SPEED: numShadow(200),
    GRAVITY: numShadow(300),
  },
  sz_gk_burst: { X: numShadow(100), Y: numShadow(100) },
  sz_gk_play_tone: { FREQ: numShadow(440), MS: numShadow(200) },
  // 🧙 Kit RPG
  sz_gk_rpg_move_grid: { CELL: numShadow(64) },
  sz_gk_rpg_block_cell: { CX: numShadow(0), CY: numShadow(0) },
  sz_gk_rpg_cell: { N: numShadow(3) },
  sz_gk_rpg_create_npc: { CX: numShadow(3), CY: numShadow(3) },
  sz_gk_rpg_say: { TEXT: txtShadow('Olá, viajante!'), NAME: txtShadow('Ferreiro') },
  sz_gk_rpg_draw_inventory: { X: numShadow(20), Y: numShadow(20) },
  sz_gk_rpg_create_door: { CX: numShadow(5), CY: numShadow(5) },
  sz_gk_rpg_battle_stats: { HP: numShadow(30), STR: numShadow(7), DEF: numShadow(3) },
  sz_gk_rpg_battle_start: { HP: numShadow(20), STR: numShadow(5), DEF: numShadow(2) },
  sz_gk_rpg_set_special: { DMG: numShadow(14), COST: numShadow(4) },
  sz_gk_rpg_give_potion: { HEAL: numShadow(20) },
  sz_gk_rpg_battle_reward: { XP: numShadow(20) },
  sz_gk_rpg_inflict: { TURNS: numShadow(3) },
  // 🎬 V6 — cenas & NPCs vivos
  sz_gk_set_walk_sheet: { FW: numShadow(16), FH: numShadow(16) },
  sz_gk_rpg_wait: { SECONDS: numShadow(1) },
  sz_gk_rpg_npc_walk_to: { CX: numShadow(5), CY: numShadow(5) },
  sz_gk_rpg_on_step: { CX: numShadow(5), CY: numShadow(5) },
  sz_gk_rpg_menu: { TITLE: txtShadow('O que fazer?') },
  sz_gk_rpg_option: { LABEL: txtShadow('Sim') },
  // 🗺️ V9 — mundo de tiles & profundidade
  sz_gk_camera_shake: { INT: numShadow(8), SEC: numShadow(0.3) },
  // ⚙️ R11 — física geral
  sz_gk_apply_gravity: { G: numShadow(2160) },
  sz_gk_jump: { FORCE: numShadow(660) },
  sz_gk_set_velocity: { VX: numShadow(0), VY: numShadow(0) },
  sz_gk_set_terminal_velocity: { MAX: numShadow(900) },
  sz_gk_every_seconds: { SECS: numShadow(1) },
  sz_gk_cooldown_ready: { SECS: numShadow(0.5) },
  sz_gk_tile_at: { X: numShadow(0), Y: numShadow(0) },
  sz_gk_set_tile_at: { X: numShadow(0), Y: numShadow(0), INDEX: numShadow(0) },
  sz_gk_set_tile_size: { PX: numShadow(64) },
  sz_gk_set_property: { VALUE: numShadow(0) },
  sz_gk_tween_to: { X: numShadow(100), Y: numShadow(100), SECS: numShadow(0.5) },
  // 👾 R16 — Kit Monstrinhos
  sz_gk_pkm_creature: {
    HP: numShadow(30),
    STR: numShadow(8),
    DEF: numShadow(4),
    SPD: numShadow(5),
  },
  sz_gk_pkm_move: { DMG: numShadow(20), ACC: numShadow(100) },
  sz_gk_pkm_type_chart: { MULT: numShadow(2) },
  sz_gk_pkm_evolve: { LEVEL: numShadow(8) },
  sz_gk_pkm_give: { LEVEL: numShadow(5) },
  sz_gk_pkm_give_ball: { COUNT: numShadow(5), POWER: numShadow(60) },
  sz_gk_pkm_draw_team: { X: numShadow(10), Y: numShadow(10) },
  sz_gk_pkm_grass_cells: {
    X1: numShadow(5),
    Y1: numShadow(6),
    X2: numShadow(13),
    Y2: numShadow(10),
  },
  sz_gk_pkm_grass_tiles: { INDEX: numShadow(3) },
  sz_gk_pkm_wild: { MIN: numShadow(3), MAX: numShadow(6) },
  sz_gk_pkm_encounter_rate: { PCT: numShadow(20) },
  sz_gk_pkm_battle_wild: { LEVEL: numShadow(5) },
  sz_gk_pkm_trainer_creature: { LEVEL: numShadow(5) },
  // 🧭 R15 — primitivos gerais
  sz_gk_define_region: {
    X: numShadow(100),
    Y: numShadow(100),
    W: numShadow(200),
    H: numShadow(200),
  },
  sz_gk_chance: { PCT: numShadow(50) },
  sz_gk_point_in: { X: numShadow(0), Y: numShadow(0) },
  sz_gk_launch_to_point: { X: numShadow(0), Y: numShadow(0), SPEED: numShadow(400) },
  sz_gk_set_velocity_angle: { DEG: numShadow(0), FORCE: numShadow(200) },
  sz_gk_set_opacity: { PCT: numShadow(100) },
  sz_gk_fade_to: { PCT: numShadow(0), SECS: numShadow(0.5) },
  sz_gk_tween_property: { TO: numShadow(100), SECS: numShadow(0.5) },
  sz_gk_set_hitbox: { OX: numShadow(0), OY: numShadow(0), W: numShadow(0), H: numShadow(0) },
  sz_gk_swing_window: { START: numShadow(0.08), ACTIVE: numShadow(0.08) },
  sz_gk_luta_match: { ROUNDS: numShadow(3), SECS: numShadow(60) },
  sz_gk_luta_move: { DMG: numShadow(10), RANGE: numShadow(50) },
  sz_gk_luta_move_anim: { FROM: numShadow(0), TO: numShadow(3) },
  sz_gk_play_anim_once: { FROM: numShadow(0), TO: numShadow(3), FPS: numShadow(10) },
  sz_gk_set_entity_state: { SECS: numShadow(0.3) },
  sz_gk_state_anim: { FROM: numShadow(0), TO: numShadow(3), FPS: numShadow(8) },
  sz_gk_thrust: { DEG: numShadow(0), FORCE: numShadow(6000) },
  sz_gk_apply_friction: { FACTOR: numShadow(0.9) },
  sz_gk_wait: { SECS: numShadow(1) },
  sz_gk_nearest_active: { X: numShadow(0), Y: numShadow(0) },
  // R21 — primitivos gerais
  sz_gk_float_text: {
    TEXT: txtShadow('+100'),
    X: numShadow(100),
    Y: numShadow(100),
    SIZE: numShadow(24),
  },
  sz_gk_trail_on: { SIZE: numShadow(3), RATE: numShadow(30), LIFE: numShadow(0.4) },
  sz_gk_shockwave: {
    X: numShadow(100),
    Y: numShadow(100),
    RADIUS: numShadow(200),
    SECS: numShadow(0.4),
  },
  sz_gk_scroll_image: { VX: numShadow(0), VY: numShadow(20) },
  sz_gk_lean_on_move: { DEG: numShadow(10) },
  sz_gk_fan_shot: {
    COUNT: numShadow(3),
    ARC: numShadow(30),
    DEG: numShadow(-90),
    SPEED: numShadow(600),
  },
  // 🚀 R22 — Kit Nave
  sz_gk_nave_ship: { SPEED: numShadow(420), LEAN: numShadow(10) },
  sz_gk_nave_powerup: { SECS: numShadow(5) },
  sz_gk_nave_wave: {
    COLS: numShadow(8),
    ROWS: numShadow(3),
    GAP: numShadow(60),
    SPEED: numShadow(150),
    DROP: numShadow(30),
    ACCEL: numShadow(15),
  },
  sz_gk_nave_wave_shooter: { SECS: numShadow(1.5), SPEED: numShadow(300) },
  sz_gk_nave_invasion_line: { Y: numShadow(0) },
  sz_gk_nave_starfield: { COUNT: numShadow(100), SPEED: numShadow(20) },
  sz_gk_nave_bomb: { RADIUS: numShadow(200) },
  sz_gk_fade_screen: { SECS: numShadow(0.4) },
  sz_gk_flash_screen: { TIMES: numShadow(3) },
  sz_gk_save_value: { VALUE: numShadow(0) },
  sz_gk_set_volume: { LEVEL: numShadow(1) },
  sz_gk_create_empty_tilemap: { COLS: numShadow(20), ROWS: numShadow(15), FILL: numShadow(-1) },
  // 🏃 R12 — Kit Plataforma
  sz_gk_plat_hero: { SPEED: numShadow(240), JUMP: numShadow(660) },
  sz_gk_plat_jump_feel: {
    COYOTE: numShadow(0.1),
    BUFFER: numShadow(0.1),
    HOLD: numShadow(0.3),
    GRAVITY: numShadow(2160),
  },
  sz_gk_plat_double_jump: { FORCE: numShadow(600), TIMES: numShadow(1) },
  sz_gk_plat_wall_slide: { SPEED: numShadow(90) },
  sz_gk_plat_wall_jump: { FX: numShadow(300), FY: numShadow(660) },
  sz_gk_plat_ladder: { TILE: numShadow(2), SPEED: numShadow(160) },
  sz_gk_plat_moving: {
    X1: numShadow(100),
    Y1: numShadow(300),
    X2: numShadow(400),
    Y2: numShadow(300),
    SECS: numShadow(2),
  },
  sz_gk_plat_stomp: { BOUNCE: numShadow(400) },
  sz_gk_plat_patrol_wall: { SPEED: numShadow(60) },
  sz_gk_plat_checkpoint: { X: numShadow(100), Y: numShadow(100) },
  sz_gk_plat_state_frames: { FROM: numShadow(0), TO: numShadow(3), FPS: numShadow(8) },
  // 🥷 V10 — ação em tempo real
  sz_gk_attack_facing: { RANGE: numShadow(40), DUR: numShadow(0.3) },
  sz_gk_patrol_around: { OX: numShadow(400), OY: numShadow(300), RADIUS: numShadow(80) },
  sz_gk_draw_hearts: { CUR: numShadow(3), MAX: numShadow(3), X: numShadow(20), Y: numShadow(20) },
}

/**
 * (só p/ teste de drift) Tipo do literal de SOMBRA por soquete da paleta — todo
 * soquete daqui precisa constar em `LEGACY_VALUE_FIELDS` com o kind casado
 * (restaura a shadow-ness na reconstrução IR→blocos).
 */
export const GK_SOCKET_SHADOW_TYPES: Record<string, Record<string, string>> = Object.fromEntries(
  Object.entries(GK_SOCKET_SHADOWS).map(([type, slots]) => [
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
  const inputs = GK_SOCKET_SHADOWS[type]
  return inputs ? { kind: 'block' as const, type, inputs } : { kind: 'block' as const, type }
}

export const gameKitToolboxCategory: ExtensionToolboxCategory = {
  kind: 'category',
  name: 'Jogo 2D Avançado',
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
