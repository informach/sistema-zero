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
      'Personaliza uma tela que já vem pronta (menu, pausa, carregando ou fim): o título grande, o texto de apoio e o texto do primeiro botão. Deixe em branco o que não quiser mudar.',
  },
  {
    type: 'sz_gk_create_screen',
    message0: 'Criar a tela %1 com título %2 e texto %3',
    args0: [
      { type: 'field_input', name: 'NAME', text: 'vitoria' },
      { type: 'input_value', name: 'TITLE', check: 'JSValue' },
      { type: 'input_value', name: 'TEXT', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Cria uma tela SUA (ex.: vitória, loja, instruções), no mesmo estilo das prontas. Ela começa escondida — use "Mostrar a tela" quando quiser. Dá para pôr botões nela.',
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
      'Tudo o que aparece no jogo é desenhado aqui, a cada quadro: pinte o fundo, desenhe os personagens e o placar. Os blocos de Canvas funcionam aqui dentro, usando esse pincel.',
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
    type: 'sz_gk_set_pause_key',
    message0: 'Usar a tecla %1 para pausar e continuar',
    args0: [{ type: 'field_input', name: 'KEY', text: 'Escape' }],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'Troca a tecla que alterna pausa (o padrão é Esc). Use antes de começar o jogo.',
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
    types: ['sz_gk_on_update', 'sz_gk_on_draw', 'sz_gk_draw_background'],
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
    types: ['sz_gk_key_down', 'sz_gk_set_pause_key'],
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
    TITLE: txtShadow('Você venceu!'),
    TEXT: txtShadow('Parabéns!'),
  },
  sz_gk_add_button: { LABEL: txtShadow('Jogar de novo') },
  sz_gk_create_character: { W: numShadow(64), H: numShadow(64), SPEED: numShadow(300) },
  sz_gk_place_character: { X: numShadow(100), Y: numShadow(100) },
  sz_gk_set_speed_multiplier: { FACTOR: numShadow(2) },
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
