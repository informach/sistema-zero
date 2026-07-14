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
    message0: 'Deixar o personagem %1 %2 × mais rápido (turbo)',
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
    message0: 'o personagem %1 encostou em %2 ?',
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
    message0: 'Meus pontos de batalha: vida %1 e força %2',
    args0: [
      { type: 'input_value', name: 'HP', check: 'JSValue' },
      { type: 'input_value', name: 'STR', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Define a vida e a força do SEU lado nas batalhas (cada batalha começa com a vida cheia). Use uma vez, no começo.',
  },
  {
    type: 'sz_gk_rpg_battle_start',
    message0: 'Começar a batalha contra %1 com vida %2 e força %3',
    args0: [
      { type: 'field_input', name: 'NAME', text: 'Dragão' },
      { type: 'input_value', name: 'HP', check: 'JSValue' },
      { type: 'input_value', name: 'STR', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Abre a batalha por TURNOS com o menu pronto: Atacar (dano = força ± 20%), Defender (o próximo dano cai pela metade) e Fugir (50% de chance). O mundo espera a batalha acabar.',
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
]

/**
 * Sub-categorias da paleta (a cor de cada uma é um TOM do teal, derivado
 * abaixo). A ordem segue o fluxo mental do kit: preparar → carregar → telas →
 * estados → o laço do jogo → personagens → teclas.
 */
const SUBCATS: { name: string; colour: string; types: string[] }[] = [
  {
    name: '🧰 O jogo',
    colour: C,
    types: ['sz_gk_setup', 'sz_gk_start', 'sz_gk_game_width', 'sz_gk_game_height'],
  },
  {
    name: '⏳ Carregar',
    colour: C,
    types: ['sz_gk_load_image'],
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
    name: '🚦 Estados',
    colour: C,
    types: [
      'sz_gk_set_state',
      'sz_gk_on_enter_state',
      'sz_gk_state_is',
      'sz_gk_game_state',
      'sz_gk_pause',
      'sz_gk_resume',
      'sz_gk_return_to_menu',
      'sz_gk_end_game',
    ],
  },
  {
    name: '🔁 A cada quadro',
    colour: C,
    types: ['sz_gk_on_update', 'sz_gk_on_draw', 'sz_gk_on_draw_hud', 'sz_gk_draw_background'],
  },
  {
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
      'sz_gk_char_x',
      'sz_gk_char_y',
    ],
  },
  {
    name: '⌨️ Teclas',
    colour: C,
    types: ['sz_gk_key_down', 'sz_gk_key_pressed', 'sz_gk_set_pause_key'],
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
    ],
  },
  {
    name: '🎨 Desenho',
    colour: C,
    types: ['sz_gk_define_look', 'sz_gk_draw_look'],
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
    ],
  },
  {
    name: '🎞️ Quadros & animação',
    colour: C,
    types: ['sz_gk_set_sheet', 'sz_gk_play_anim'],
  },
  {
    name: '🎥 Câmera',
    colour: C,
    types: ['sz_gk_camera_follow', 'sz_gk_camera_stop', 'sz_gk_camera_x', 'sz_gk_camera_y'],
  },
  {
    name: '🖱️ Mouse',
    colour: C,
    types: ['sz_gk_on_game_click', 'sz_gk_mouse_x', 'sz_gk_mouse_y', 'sz_gk_mouse_down'],
  },
  {
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
    name: '🖥️ HUD & Missão',
    colour: C,
    types: [
      'sz_gk_set_mission',
      'sz_gk_mission_kill',
      'sz_gk_draw_timer',
      'sz_gk_draw_bar',
      'sz_gk_time_survived',
      'sz_gk_kills',
    ],
  },
  {
    name: '✨ Faíscas',
    colour: C,
    types: ['sz_gk_define_effect', 'sz_gk_burst', 'sz_gk_draw_effects'],
  },
  {
    name: '🔊 Som',
    colour: C,
    types: ['sz_gk_load_sound', 'sz_gk_play_sound', 'sz_gk_play_effect', 'sz_gk_play_tone'],
  },
  // KITS: açúcar por gênero sobre o MESMO motor (padrão dos kits do game-2d).
  {
    name: '🧙 Kit RPG',
    colour: C,
    types: [
      'sz_gk_rpg_on_map',
      'sz_gk_rpg_go_map',
      'sz_gk_rpg_create_door',
      'sz_gk_rpg_move_grid',
      'sz_gk_rpg_block_cell',
      'sz_gk_rpg_cell',
      'sz_gk_rpg_create_npc',
      'sz_gk_rpg_draw_npcs',
      'sz_gk_rpg_on_talk',
      'sz_gk_rpg_say',
      'sz_gk_rpg_add_flag',
      'sz_gk_rpg_has_flag',
      'sz_gk_rpg_give_item',
      'sz_gk_rpg_has_item',
      'sz_gk_rpg_remove_item',
      'sz_gk_rpg_draw_inventory',
    ],
  },
  {
    name: '⚔️ Kit RPG: batalha',
    colour: C,
    types: [
      'sz_gk_rpg_battle_stats',
      'sz_gk_rpg_battle_start',
      'sz_gk_rpg_on_battle_end',
      'sz_gk_rpg_battle_won',
    ],
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
  sz_gk_rpg_battle_stats: { HP: numShadow(30), STR: numShadow(7) },
  sz_gk_rpg_battle_start: { HP: numShadow(20), STR: numShadow(5) },
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
