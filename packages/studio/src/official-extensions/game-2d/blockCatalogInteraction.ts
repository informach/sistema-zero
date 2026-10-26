import type { BlockDefinition } from '../../blockly/blocks/types'
import {
  GAME_TWO_D_BLOCK_COLOR as C,
  GAME_TWO_D_EVENT_COLOR as EVENT_C,
  GAME_TWO_D_ENEMY_BEHAVIOR_OPTIONS,
  GAME_TWO_D_ENEMY_SMART_OPTIONS,
  GAME_TWO_D_KEY_OPTIONS,
} from './blockCatalogShared'

const currentGameTwoDInteractionBlocks: BlockDefinition[] = [
  // ---- Mouse / toque ----
  {
    type: 'sz_g2d_on_pointer',
    placement: 'event',
    userGesture: true,
    message0: 'Quando clicar/tocar, na posição x %1 y %2',
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
    tooltip: 'Roda o "fazer" a cada clique/toque, com a posição do ponteiro no canvas em px/py.',
  },

  // ---- Eventos "Quando…" (hats) ----
  {
    type: 'sz_g2d_on_key',
    placement: 'event',
    userGesture: true,
    message0: 'Quando apertar a tecla %1',
    args0: [
      {
        type: 'field_dropdown',
        name: 'KEY',
        options: [...GAME_TWO_D_KEY_OPTIONS],
      },
    ],
    message1: 'fazer %1',
    args1: [{ type: 'input_statement', name: 'BODY' }],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: EVENT_C,
    tooltip: 'Roda o que está dentro toda vez que a tecla é apertada (ex.: pular, atirar).',
  },
  {
    type: 'sz_g2d_on_overlap',
    placement: 'event',
    message0: 'Quando o sprite %1 começar a encostar no sprite %2',
    args0: [
      { type: 'field_sprite_picker', name: 'A', text: 'jogador' },
      { type: 'field_sprite_picker', name: 'B', text: 'inimigo' },
    ],
    message1: 'fazer %1',
    args1: [{ type: 'input_statement', name: 'BODY' }],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: EVENT_C,
    tooltip:
      'Roda o que está dentro quando os dois sprites se encostam (ex.: pegar moeda, levar dano). Dispara uma vez a cada vez que começam a encostar.',
  },
  {
    // Sem userGesture: este dispara DENTRO do laço do jogo, não na pilha de um
    // gesto do navegador (≠ do "qualquer tecla ou toque", logo abaixo).
    type: 'sz_g2d_on_jump',
    placement: 'event',
    message0: 'Quando o sprite %1 pular',
    args0: [{ type: 'field_sprite_picker', name: 'SPRITE', text: 'jogador' }],
    message1: 'fazer %1',
    args1: [{ type: 'input_statement', name: 'BODY' }],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: EVENT_C,
    tooltip:
      'Roda o que está dentro toda vez que o sprite pula de verdade (ex.: tocar um som, contar os pulos). Vale para os três jeitos de pular: estilo plataforma, pular no chão e o kit do dinossauro.',
  },
  {
    // COM userGesture: roda dentro do listener de tecla/toque, então o corpo
    // está mesmo num gesto do navegador (é o que libera som e tela cheia).
    // ⚠️ O espelho no IR é a lista de `providesUserGesture` (ir/lifecycle.ts).
    type: 'sz_g2d_on_any_input',
    placement: 'event',
    userGesture: true,
    message0: 'Quando apertar qualquer tecla ou tocar na tela',
    message1: 'fazer %1',
    args1: [{ type: 'input_statement', name: 'BODY' }],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: EVENT_C,
    tooltip:
      'Roda o que está dentro quando a criança aperta qualquer tecla ou toca na tela. É o "aperte qualquer coisa para começar" das telas de início. Segurar a tecla dispara uma vez só.',
  },

  // ---- Perguntas (booleanos) — caem dentro de um "se" ----
  {
    type: 'sz_g2d_key_down',
    message0: 'a tecla %1 está apertada?',
    args0: [
      {
        type: 'field_dropdown',
        name: 'KEY',
        options: [...GAME_TWO_D_KEY_OPTIONS],
      },
    ],
    output: 'JSValue',
    colour: EVENT_C,
    tooltip:
      'Verdadeiro enquanto a tecla está sendo segurada. Use dentro de um "se", no "a cada quadro" (ótimo para mover sem parar).',
  },
  {
    type: 'sz_g2d_pointer_down',
    message0: 'o mouse ou dedo está segurado ?',
    args0: [],
    output: 'JSValue',
    colour: EVENT_C,
    tooltip:
      'Verdadeiro enquanto o botão do mouse ou o dedo está pressionado no jogo. Use dentro de um "se", no "a cada quadro" (ótimo para segurar e soltar).',
  },
  {
    type: 'sz_g2d_touches',
    message0: 'o sprite %1 está encostando no sprite %2 ?',
    args0: [
      { type: 'field_sprite_picker', name: 'A', text: 'jogador' },
      { type: 'field_sprite_picker', name: 'B', text: 'inimigo' },
    ],
    output: 'JSValue',
    colour: EVENT_C,
    tooltip: 'Verdadeiro enquanto os dois sprites estão se encostando. Use dentro de um "se".',
  },

  // ---- Imagens / spritesheet / animação (v0.3.0) ----
  {
    type: 'sz_g2d_create_image_sprite',
    placement: 'start-only-command',
    message0: 'Criar sprite %1 em x %2 y %3 largura %4 altura %5 com imagem %6',
    args0: [
      { type: 'field_input', name: 'NAME', text: 'heroi' },
      { type: 'input_value', name: 'X', check: 'JSValue' },
      { type: 'input_value', name: 'Y', check: 'JSValue' },
      { type: 'input_value', name: 'W', check: 'JSValue' },
      { type: 'input_value', name: 'H', check: 'JSValue' },
      { type: 'field_asset_picker', name: 'IMAGE', text: 'heroi' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Cria um sprite que mostra uma imagem da sua biblioteca. Em "imagem", use o nome do asset (ex.: heroi). Se a imagem ainda não existe, aparece um retângulo até ela carregar.',
  },
  {
    type: 'sz_g2d_set_image',
    placement: 'command',
    message0: 'Trocar imagem do sprite %1 para %2',
    args0: [
      { type: 'field_sprite_picker', name: 'SPRITE', text: 'heroi' },
      { type: 'field_asset_picker', name: 'IMAGE', text: 'heroi' },
    ],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'Troca a imagem que o sprite mostra (e cancela a animação atual dele).',
  },
  {
    type: 'sz_g2d_load_spritesheet',
    placement: 'start-only-command',
    message0: 'Carregar folha de quadros %1 da imagem %2 com quadros de %3 x %4 px',
    args0: [
      { type: 'field_input', name: 'NAME', text: 'andar' },
      { type: 'field_asset_picker', name: 'IMAGE', text: 'heroi-andando' },
      { type: 'input_value', name: 'FW', check: 'JSValue' },
      { type: 'input_value', name: 'FH', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Prepara uma folha de sprites (vários quadros numa única imagem) para animar. Informe o tamanho de CADA quadro em pixels.',
  },
  {
    type: 'sz_g2d_animate_sprite',
    placement: 'command',
    message0: 'Animar sprite %1 com a folha %2 na animação %3, do quadro %4 ao %5 a %6 fps',
    args0: [
      { type: 'field_sprite_picker', name: 'SPRITE', text: 'heroi' },
      { type: 'field_name_picker', name: 'SHEET', text: 'andar', kind: 'spritesheet' },
      { type: 'field_animation_picker', name: 'ANIM', text: 'Escolher' },
      { type: 'input_value', name: 'FROM', check: 'JSValue' },
      { type: 'input_value', name: 'TO', check: 'JSValue' },
      { type: 'input_value', name: 'FPS', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Escolha a animação pelo NOME (vem da sua folha do Pinta) e os quadros/velocidade se preenchem sozinhos. Sem animação nomeada, escreva os números dos quadros (do primeiro ao último).',
  },
  {
    // Irmão do de cima: toca e PARA, em vez de repetir para sempre. Bloco NOVO
    // ao lado (a regra da casa é não mudar a forma de bloco que a criança já
    // usa), espelhando o par que o Jogo 2D Avançado já tem.
    type: 'sz_g2d_animate_once',
    placement: 'command',
    message0:
      'Animar sprite %1 com a folha %2 na animação %3, do quadro %4 ao %5 a %6 fps, uma vez só',
    args0: [
      { type: 'field_sprite_picker', name: 'SPRITE', text: 'estrela' },
      { type: 'field_name_picker', name: 'SHEET', text: 'brilho', kind: 'spritesheet' },
      { type: 'field_animation_picker', name: 'ANIM', text: 'Escolher' },
      { type: 'input_value', name: 'FROM', check: 'JSValue' },
      { type: 'input_value', name: 'TO', check: 'JSValue' },
      { type: 'input_value', name: 'FPS', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Toca a animação UMA vez e PARA no último quadro, em vez de repetir. Bom para estrela cadente, golpe, baú que abre. Pergunte com "a animação acabou?" para fazer algo depois.',
  },
  {
    type: 'sz_g2d_anim_ended',
    output: 'JSValue',
    message0: 'a animação de %1 acabou?',
    args0: [{ type: 'field_sprite_picker', name: 'SPRITE', text: 'estrela' }],
    colour: C,
    tooltip:
      'Responde sim depois que uma animação de uma vez termina; a resposta permanece sim no último quadro. No “se”, troque o estado, a imagem ou remova o sprite para não repetir o efeito.',
  },
  {
    type: 'sz_g2d_set_state_anim',
    placement: 'start-only-command',
    message0: 'Animação do sprite %1 no estado %2',
    args0: [
      { type: 'field_sprite_picker', name: 'SPRITE', text: 'heroi' },
      {
        type: 'field_dropdown',
        name: 'STATE',
        options: [
          ['parado', 'parado'],
          ['andando (para os lados)', 'andando'],
          ['andando (cima/baixo)', 'vertical'],
          ['pulando', 'pulando'],
          ['caindo', 'caindo'],
          ['tomando dano', 'dano'],
        ],
      },
    ],
    message1: 'folha %1 animação %2, quadros %3 a %4, %5 fps',
    args1: [
      { type: 'field_name_picker', name: 'SHEET', text: 'andar', kind: 'spritesheet' },
      { type: 'field_animation_picker', name: 'ANIM', text: 'Escolher' },
      { type: 'input_value', name: 'FROM', check: 'JSValue' },
      { type: 'input_value', name: 'TO', check: 'JSValue' },
      { type: 'input_value', name: 'FPS', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Guarda a animação que o sprite toca NESSE estado (parado, andando, pulando, caindo, tomando dano). Configure uma por estado, FORA do "a cada quadro". Quem troca sozinho é o bloco "Animar e virar o sprite sozinho".',
  },
  {
    type: 'sz_g2d_auto_animate',
    placement: 'command',
    message0: 'Animar e virar o sprite %1 sozinho conforme ele se move',
    args0: [{ type: 'field_sprite_picker', name: 'SPRITE', text: 'heroi' }],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'A cada quadro, escolhe a animação pelo estado: parado, andando, pulando, caindo ou tomando dano. Também vira o desenho para o lado do movimento. Perder vida mostra a animação de dano.',
  },
  // ---- Tipos de inimigo (v0.22.0): classes de inimigo com comportamento pronto ----
  {
    // A VISTA: um grupo montado dos tipos vivos. Não é cópia, então não vaza (o
    // atalho manual, com um grupo comum e "Pôr o sprite no grupo" a cada
    // nascimento, deixava o morto colidindo para sempre).
    type: 'sz_g2d_all_enemies_group',
    placement: 'mold-declaration',
    message0: 'Criar o grupo %1 com os inimigos de todos os tipos',
    args0: [{ type: 'field_input', name: 'NAME', text: 'todos' }],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Em Meus moldes, cria um grupo sempre atualizado com todos os inimigos. Serve para contar, percorrer e detectar contatos. Cada tipo ainda precisa do próprio atualizar e desenhar.',
  },
  {
    type: 'sz_g2d_define_enemy_type',
    placement: 'mold-declaration',
    message0:
      'Criar tipo de inimigo %1 que é %2 cor %3 imagem %4 figura %5 vida %6 velocidade %7 dano %8 tamanho %9 x %10',
    args0: [
      { type: 'field_input', name: 'NAME', text: 'zumbi' },
      { type: 'field_dropdown', name: 'BEHAVIOR', options: [...GAME_TWO_D_ENEMY_BEHAVIOR_OPTIONS] },
      { type: 'field_colour_sz', name: 'COLOR', colour: '#e4573d' },
      { type: 'field_asset_picker', name: 'IMAGE', text: '' },
      // Figura desenhada ("Desenhar a figura … assim") como visual do tipo —
      // vazia = usa imagem/cor. Figura VENCE a imagem (setShape cancela imagem).
      { type: 'field_name_picker', name: 'SHAPE', text: '', kind: 'shape' },
      { type: 'input_value', name: 'HP', check: 'JSValue' },
      { type: 'input_value', name: 'SPEED', check: 'JSValue' },
      { type: 'input_value', name: 'DMG', check: 'JSValue' },
      { type: 'input_value', name: 'W', check: 'JSValue' },
      { type: 'input_value', name: 'H', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Em Meus moldes, define atributos e comportamento sem criar inimigos. Depois solte cópias do tipo. Figura tem prioridade sobre imagem e cor. Raios causam dano somente pelo bloco de contato do raio.',
  },
  {
    // Irmão do de cima, com um campo SÓ no lugar do comportamento: cada
    // inteligência já traz o pacote pronto de andar e atirar. É a porta de
    // entrada para quem quer um inimigo bom sem saber a receita.
    type: 'sz_g2d_define_enemy_smart',
    placement: 'mold-declaration',
    message0:
      'Criar tipo de inimigo %1 com inteligência %2 cor %3 imagem %4 figura %5 vida %6 velocidade %7 dano %8 tamanho %9 x %10',
    args0: [
      { type: 'field_input', name: 'NAME', text: 'alien' },
      { type: 'field_dropdown', name: 'SMART', options: [...GAME_TWO_D_ENEMY_SMART_OPTIONS] },
      { type: 'field_colour_sz', name: 'COLOR', colour: '#e4573d' },
      { type: 'field_asset_picker', name: 'IMAGE', text: '' },
      { type: 'field_name_picker', name: 'SHAPE', text: '', kind: 'shape' },
      { type: 'input_value', name: 'HP', check: 'JSValue' },
      { type: 'input_value', name: 'SPEED', check: 'JSValue' },
      { type: 'input_value', name: 'DMG', check: 'JSValue' },
      { type: 'input_value', name: 'W', check: 'JSValue' },
      { type: 'input_value', name: 'H', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Em Meus moldes, cria um tipo com comportamentos prontos. Acrescentar um modo de andar substitui o anterior; ações se somam. Raios precisam do bloco de contato do raio para causar dano.',
  },
  {
    type: 'sz_g2d_enemy_add_behavior',
    placement: 'mold-command',
    message0: 'O tipo de inimigo %1 também é %2',
    args0: [
      { type: 'field_name_picker', name: 'TYPE', text: 'zumbi', kind: 'enemytype' },
      { type: 'field_dropdown', name: 'BEHAVIOR', options: [...GAME_TWO_D_ENEMY_BEHAVIOR_OPTIONS] },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Soma ações ao tipo; um modo de andar substitui o anterior. Use após definir o tipo em Meus moldes ou num evento para mudar durante a partida. Raios precisam do bloco de contato do raio.',
  },
  {
    type: 'sz_g2d_enemy_state_anim',
    // Consome uma folha carregada no início da partida: a raiz canônica é
    // ⚙️ Ao iniciar, embora continue cabendo em eventos/laços para trocas.
    placement: 'command',
    message0: 'Animação dos inimigos do tipo %1 no estado %2',
    args0: [
      { type: 'field_name_picker', name: 'TYPE', text: 'zumbi', kind: 'enemytype' },
      {
        type: 'field_dropdown',
        name: 'STATE',
        options: [
          ['parado', 'parado'],
          ['andando (para os lados)', 'andando'],
          ['andando (cima/baixo)', 'vertical'],
          ['pulando', 'pulando'],
          ['caindo', 'caindo'],
          ['tomando dano', 'dano'],
        ],
      },
    ],
    message1: 'folha %1 animação %2, quadros %3 a %4, %5 fps',
    args1: [
      { type: 'field_name_picker', name: 'SHEET', text: 'andar', kind: 'spritesheet' },
      { type: 'field_animation_picker', name: 'ANIM', text: 'Escolher' },
      { type: 'input_value', name: 'FROM', check: 'JSValue' },
      { type: 'input_value', name: 'TO', check: 'JSValue' },
      { type: 'input_value', name: 'FPS', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Escolhe a animação de um estado para todas as cópias do tipo. Use depois de carregar a folha, em Ao iniciar, ou num evento para mudar durante o jogo. O atualizador troca as animações sozinho.',
  },
  {
    type: 'sz_g2d_enemy_type_param',
    placement: 'mold-command',
    message0: 'Ajustar no tipo de inimigo %1 o valor de %2 para %3',
    args0: [
      { type: 'field_name_picker', name: 'TYPE', text: 'zumbi', kind: 'enemytype' },
      {
        type: 'field_dropdown',
        name: 'PARAM',
        // ⚠️ O parêntese diz PARA QUE SERVE, não de quem é: quase todo valor
        // aqui serve a vários comportamentos, e nomear só um faz a criança
        // achar que não é ali (o alcance, por exemplo, é de sete deles).
        options: [
          ['força do pulo', 'pulo'],
          ['pular a cada tantos quadros', 'ritmo'],
          ['alcance (o tamanho do voo, ou a distância para reagir)', 'alcance'],
          [
            'a cada tantos quadros ele age (atirar, bombardear, sumir, carregar o raio)',
            'cadencia',
          ],
          ['velocidade do tiro', 'tiro'],
          ['voltar depois de tantos quadros', 'voltar'],
          ['vida dos próximos que nascerem', 'vida'],
          ['o raio fica ligado por tantos quadros', 'duracao'],
        ],
      },
      { type: 'input_value', name: 'VALUE', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Ajusta o comportamento do tipo em Meus moldes ou durante um evento. Cada parâmetro serve a comportamentos específicos; consulte o manual. A vida inicial vale só para as próximas cópias.',
  },
  {
    type: 'sz_g2d_spawn_enemy',
    placement: 'command',
    message0: 'Soltar um inimigo do tipo %1 chamado %2 em x %3 y %4',
    args0: [
      { type: 'field_name_picker', name: 'TYPE', text: 'zumbi', kind: 'enemytype' },
      // Nome OPCIONAL: vazio, a chave nem entra na IR e a saída fica igual à de
      // antes. Preenchido, o bloco DECLARA o inimigo solto, e ela consegue
      // apontar para AQUELE chefão (barra de vida, buff, tela) sem laço nenhum.
      { type: 'field_input', name: 'NAME', text: '' },
      { type: 'input_value', name: 'X', check: 'JSValue' },
      { type: 'input_value', name: 'Y', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Cria uma cópia do tipo em x/y com seus atributos e animações. Para ondas, use uma raiz periódica. O nome é opcional; preencha para referir-se a essa cópia, como a vida de um chefe.',
  },
  {
    type: 'sz_g2d_update_enemy_type',
    placement: 'command',
    message0: 'Atualizar os inimigos do tipo %1 (alvo: o sprite %2)',
    args0: [
      { type: 'field_name_picker', name: 'TYPE', text: 'zumbi', kind: 'enemytype' },
      { type: 'field_sprite_picker', name: 'TARGET', text: 'jogador' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Use DENTRO do "a cada quadro": move cada inimigo conforme o comportamento do tipo, anima, atira (atirador), remove os derrotados (vida 0) e move os tiros. O alvo é quem o perseguidor persegue e o atirador mira.',
  },
  {
    type: 'sz_g2d_draw_enemy_type',
    placement: 'command',
    message0: 'Desenhar os inimigos do tipo %1 (e os tiros deles)',
    args0: [{ type: 'field_name_picker', name: 'TYPE', text: 'zumbi', kind: 'enemytype' }],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'Desenha todos os inimigos do tipo e os tiros deles. Use depois de atualizar.',
  },
  {
    type: 'sz_g2d_on_enemy_defeated',
    placement: 'event',
    message0: 'Quando um inimigo do tipo %1 for derrotado (chamado %2)',
    args0: [
      { type: 'field_name_picker', name: 'TYPE', text: 'zumbi', kind: 'enemytype' },
      { type: 'field_input', name: 'ANAME', text: 'inimigo' },
    ],
    message1: 'fazer %1',
    args1: [{ type: 'input_statement', name: 'BODY' }],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: EVENT_C,
    tooltip:
      'Registre UMA vez, fora do "a cada quadro". Quando a vida de um inimigo do tipo acabar, ele some soltando partículas e o "fazer" roda com ele (ex.: somar pontos).',
  },
  {
    type: 'sz_g2d_on_enemy_shot_hit',
    placement: 'loop-command',
    bodyExecution: 'sync-callback',
    message0: 'Para cada tiro do tipo %1 que acertar o sprite %2',
    args0: [
      { type: 'field_name_picker', name: 'TYPE', text: 'zumbi', kind: 'enemytype' },
      { type: 'field_sprite_picker', name: 'SPRITE', text: 'jogador' },
    ],
    message1: 'chamar o tiro de %1',
    args1: [{ type: 'field_input', name: 'ANAME', text: 'tiro' }],
    message2: 'fazer %1',
    args2: [{ type: 'input_statement', name: 'BODY' }],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: EVENT_C,
    tooltip:
      'A cada quadro, detecta cada tiro que acertou, remove-o e executa o fazer. Dentro, use “Machucar o sprite em … e deixá-lo invencível por … quadros” para definir dano por tiro.',
  },
  {
    type: 'sz_g2d_on_enemy_beam_hit',
    placement: 'loop-command',
    bodyExecution: 'sync-callback',
    message0: 'Para cada raio do tipo %1 que acertar o sprite %2',
    args0: [
      { type: 'field_name_picker', name: 'TYPE', text: 'rei', kind: 'enemytype' },
      { type: 'field_sprite_picker', name: 'SPRITE', text: 'nave' },
    ],
    message1: 'chamar o dono do raio de %1',
    args1: [{ type: 'field_input', name: 'ANAME', text: 'chefe' }],
    message2: 'fazer %1',
    args2: [{ type: 'input_statement', name: 'BODY' }],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: EVENT_C,
    tooltip:
      'A cada quadro, detecta o raio ligado no sprite e entrega seu dono ao fazer. O raio permanece. Use “Machucar o sprite em … e deixá-lo invencível por … quadros” para não tirar vida sem parar.',
  },
  {
    type: 'sz_g2d_on_enemy_hurt',
    placement: 'event',
    message0: 'Quando um inimigo do tipo %1 levar dano (chamado %2)',
    args0: [
      { type: 'field_name_picker', name: 'TYPE', text: 'rei', kind: 'enemytype' },
      { type: 'field_input', name: 'ANAME', text: 'chefe' },
    ],
    message1: 'fazer %1',
    args1: [{ type: 'input_statement', name: 'BODY' }],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: EVENT_C,
    tooltip:
      'Quando um inimigo perde vida e continua vivo, executa o “fazer”. Use a vida dele para mudar o comportamento de um chefe. Se chegar a zero, dispara o evento de derrotado, não este.',
  },
  {
    type: 'sz_g2d_hurt_by_enemy',
    placement: 'command',
    message0: 'Machucar o sprite %1 com o dano de contato do inimigo %2',
    args0: [
      { type: 'field_sprite_picker', name: 'SPRITE', text: 'jogador' },
      { type: 'field_sprite_picker', name: 'ENEMY', text: 'inimigo' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Aplica o dano do tipo e invencibilidade no contato. Para outro dano, use “Machucar o sprite em … e deixá-lo invencível por … quadros”. Encostar num casco parado o chuta.',
  },
  {
    type: 'sz_g2d_stomp_enemy',
    placement: 'command',
    message0:
      'Derrotar os inimigos do tipo %1 quando o sprite %2 pular em cima (dando um pulinho de %3)',
    args0: [
      { type: 'field_name_picker', name: 'TYPE', text: 'zumbi', kind: 'enemytype' },
      { type: 'field_sprite_picker', name: 'SPRITE', text: 'jogador' },
      { type: 'input_value', name: 'BOUNCE', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Se o jogador cair sobre o inimigo, derrota-o e rebate para cima. Encostar de lado não derrota; trate o dano de contato separadamente. Use a cada quadro.',
  },
  {
    type: 'sz_g2d_enemy_damage',
    message0: 'o dano de contato do inimigo %1',
    args0: [{ type: 'field_sprite_picker', name: 'SPRITE', text: 'inimigo' }],
    output: 'JSValue',
    colour: C,
    tooltip:
      'Quanto de dano este inimigo (ou o tiro dele) causa por contato. Sem dano marcado, vale 1.',
  },
  {
    type: 'sz_g2d_draw_frame',
    placement: 'command',
    message0: 'Desenhar quadro %1 da folha de quadros %2 em x %3 y %4 largura %5 altura %6',
    args0: [
      { type: 'input_value', name: 'INDEX', check: 'JSValue' },
      { type: 'field_name_picker', name: 'SHEET', text: 'andar', kind: 'spritesheet' },
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
      'Desenha um quadro específico da folha de quadros na posição escolhida (controle manual).',
  },

  // ---- Movimento (v0.4.0) ----
  {
    type: 'sz_g2d_platformer',
    placement: 'command',
    message0: 'Mover o sprite %1 estilo plataforma na tela (a borda é chão), velocidade %2 pulo %3',
    args0: [
      { type: 'field_sprite_picker', name: 'SPRITE', text: 'heroi' },
      { type: 'input_value', name: 'SPEED', check: 'JSValue' },
      { type: 'input_value', name: 'JUMP', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'A borda da tela funciona como chão. Use “Aplicar a gravidade do mundo” logo antes. Para buracos e mapas, use o movimento sobre terreno e uma colisão de terreno.',
  },
  {
    type: 'sz_g2d_top_down',
    placement: 'command',
    message0: 'Mover sprite %1 em 4 direções com setas, velocidade %2',
    args0: [
      { type: 'field_sprite_picker', name: 'SPRITE', text: 'heroi' },
      { type: 'input_value', name: 'SPEED', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Movimento de cima pra baixo (visão de topo) nas 4 direções. A diagonal não fica mais rápida que andar reto.',
  },
  {
    type: 'sz_g2d_fly_free',
    placement: 'command',
    message0: 'Fazer o sprite %1 voar livre, velocidade %2',
    args0: [
      { type: 'field_sprite_picker', name: 'SPRITE', text: 'heroi' },
      { type: 'input_value', name: 'SPEED', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Voa com as setas, sem gravidade, acelerando e desacelerando aos poucos. Continua planando ao soltar e demora para virar. A velocidade escolhida é a máxima.',
  },
  {
    type: 'sz_g2d_flap',
    placement: 'command',
    message0: 'Fazer o sprite %1 bater as asas, força %2',
    args0: [
      { type: 'field_sprite_picker', name: 'SPRITE', text: 'heroi' },
      { type: 'input_value', name: 'FORCE', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Cada toque em ↑, W, Espaço ou na tela dá um impulso, inclusive no ar. Segurar não repete. Use “Aplicar a gravidade do mundo” logo antes para voltar a cair.',
  },
  {
    type: 'sz_g2d_swim',
    placement: 'command',
    message0: 'Fazer o sprite %1 nadar, velocidade %2',
    args0: [
      { type: 'field_sprite_picker', name: 'SPRITE', text: 'heroi' },
      { type: 'input_value', name: 'SPEED', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Água pesada: controla nas 8 direções com bastante arrasto. Sem aplicar gravidade, o bicho fica boiando; encaixe "Aplicar a gravidade do mundo" logo acima para ele afundar quando estiver solto.',
  },
  {
    type: 'sz_g2d_follow_pointer',
    placement: 'command',
    message0: 'Fazer sprite %1 seguir o ponteiro, velocidade %2',
    args0: [
      { type: 'field_sprite_picker', name: 'SPRITE', text: 'heroi' },
      { type: 'input_value', name: 'SPEED', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'O sprite anda em direção ao mouse/dedo (ponteiro) na velocidade escolhida.',
  },
  {
    type: 'sz_g2d_clamp_to_screen',
    placement: 'command',
    message0: 'Manter o sprite %1 dentro da tela',
    args0: [{ type: 'field_sprite_picker', name: 'SPRITE', text: 'heroi' }],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'Impede o sprite de sair pelas bordas da tela (gruda na borda em vez de sumir).',
  },

  // ---- Efeitos visuais (v0.4.0) ----
  {
    type: 'sz_g2d_flash',
    placement: 'command',
    message0: 'Dar um clarão de cor %1',
    args0: [{ type: 'field_colour_sz', name: 'COLOR', colour: '#ffffff' }],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Pinta a tela inteira com uma cor translúcida (efeito de flash). Use num quadro específico, ex.: ao levar dano.',
  },
  {
    type: 'sz_g2d_shake',
    placement: 'command',
    message0: 'Tremer a tela com intensidade %1',
    args0: [{ type: 'input_value', name: 'INTENSITY', check: 'JSValue' }],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Sacode a tela e para sozinho (o tremor vai diminuindo). Chame uma vez, ex.: numa colisão ou explosão.',
  },
  {
    type: 'sz_g2d_emit_particles',
    placement: 'command',
    message0: 'Soltar %1 partículas de cor %2 em x %3 y %4',
    args0: [
      { type: 'input_value', name: 'COUNT', check: 'JSValue' },
      { type: 'field_colour_sz', name: 'COLOR', colour: '#fbbf24' },
      { type: 'input_value', name: 'X', check: 'JSValue' },
      { type: 'input_value', name: 'Y', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Cria uma explosão de partículas no ponto x/y. Lembre de "atualizar e desenhar as partículas" a cada quadro.',
  },
  {
    type: 'sz_g2d_draw_particles',
    placement: 'command',
    message0: 'Atualizar e desenhar as partículas',
    args0: [],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'Move e desenha as partículas (use dentro do "a cada quadro"); elas somem sozinhas.',
  },

  // ---- Tiles / tilemaps (v0.5.0) ----
  {
    type: 'sz_g2d_create_tilemap_from_asset',
    placement: 'start-only-command',
    message0: 'Criar mapa %1 do meu desenho %2',
    args0: [
      { type: 'field_input', name: 'NAME', text: 'mapa' },
      { type: 'field_asset_picker', name: 'IMAGE', text: 'meu-mapa', filter: 'tilemap' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Lê o mapa do Pinta com grade, peças e colisões. Depois prepare o tamanho e a posição ou crie um Mundo com ele. Para escrever a grade manualmente, use “Criar mapa de tiles”.',
  },
  {
    type: 'sz_g2d_create_tilemap',
    placement: 'start-only-command',
    message0:
      'Criar mapa de tiles %1 com imagem %2, tamanho do tile %3 px, tiles sólidos %4, tiles plataforma %5, grade %6',
    args0: [
      { type: 'field_input', name: 'NAME', text: 'mapa' },
      { type: 'field_asset_picker', name: 'IMAGE', text: 'tileset' },
      { type: 'input_value', name: 'TILE', check: 'JSValue' },
      { type: 'field_solid_tiles_picker', name: 'SOLID', text: '1' },
      { type: 'field_solid_tiles_picker', name: 'PLATFORM', text: '', variant: 'platform' },
      { type: 'field_tile_grid', name: 'GRID', text: '0 0 0 0;0 0 0 0;1 1 1 1' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Cria os dados do mapa; depois prepare posição e tamanho. Os números escolhem peças, “;” separa linhas e “.” deixa vazio. Sólidos bloqueiam todos os lados; plataformas deixam passar por baixo.',
  },

  {
    // Irmão do "Pôr o cenário atrás de tudo" (✨ Aparência): mesma geometria de
    // cobertura, mas quem manda na ordem das camadas é a criança. É
    // "loop-command" — o encaixe só aceita o 🔁, então pegar o bloco errado dá
    // recusa na hora, em vez de um jogo estranho sem explicação.
    type: 'sz_g2d_draw_backdrop',
    placement: 'loop-command',
    message0: 'Desenhar o cenário %1',
    args0: [{ type: 'field_asset_picker', name: 'IMAGE', text: '' }],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Desenha o cenário cobrindo a tela neste quadro. Use logo após limpar para ficar atrás dos sprites. Para reaparecer sozinho em todo quadro, use “Pôr o cenário atrás de tudo” em Ao iniciar.',
  },
  {
    type: 'sz_g2d_tilemap_collide',
    placement: 'command',
    message0: 'Fazer o sprite %1 colidir com os sólidos e plataformas do mapa %2',
    args0: [
      { type: 'field_sprite_picker', name: 'SPRITE', text: 'heroi' },
      { type: 'field_name_picker', name: 'MAP', text: 'mapa', kind: 'tilemap' },
    ],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Tiles sólidos viram chão e paredes; tiles plataforma seguram apenas na face atraída pela gravidade e deixam atravessar pela outra. Use a cada quadro, depois de mover o sprite.',
  },
  {
    type: 'sz_g2d_collide_group',
    placement: 'command',
    message0: 'Impedir o sprite %1 de atravessar os sprites do grupo %2',
    args0: [
      { type: 'field_sprite_picker', name: 'SPRITE', text: 'heroi' },
      { type: 'field_name_picker', name: 'GROUP', text: 'obstaculos', kind: 'group' },
    ],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Cada figura do grupo vira um obstáculo sólido: chão e parede. Bases móveis transportam quem estiver apoiado nelas. Use a cada quadro, depois de mover o grupo e o sprite.',
  },
  {
    type: 'sz_g2d_collide_sprite',
    placement: 'command',
    message0: 'Impedir o sprite %1 de atravessar o sprite %2',
    args0: [
      { type: 'field_sprite_picker', name: 'SPRITE', text: 'heroi' },
      { type: 'field_sprite_picker', name: 'OTHER', text: 'parede' },
    ],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'A outra figura vira um obstáculo sólido: chão e parede. Se ela se mover antes do jogador, transporta quem estiver apoiado. Use a cada quadro, depois de mover as figuras.',
  },
  {
    type: 'sz_g2d_collide_platform',
    placement: 'command',
    message0: 'Fazer o sprite %1 pousar na plataforma %2',
    args0: [
      { type: 'field_sprite_picker', name: 'SPRITE', text: 'heroi' },
      { type: 'field_sprite_picker', name: 'OTHER', text: 'plataforma' },
    ],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'A outra figura vira uma plataforma: segura na face atraída pela gravidade, mas deixa atravessar pelas laterais e pela face oposta. Se ela se mover antes do jogador, transporta quem estiver apoiado.',
  },
  {
    type: 'sz_g2d_collide_platform_group',
    placement: 'command',
    message0: 'Fazer o sprite %1 pousar nas plataformas do grupo %2',
    args0: [
      { type: 'field_sprite_picker', name: 'SPRITE', text: 'heroi' },
      { type: 'field_name_picker', name: 'GROUP', text: 'plataformas', kind: 'group' },
    ],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Cada figura do grupo vira uma plataforma atravessável pelas laterais e pela face oposta à gravidade. Plataformas móveis transportam quem estiver apoiado. Mova o grupo antes do jogador e resolva a colisão depois.',
  },
]

export const gameTwoDInteractionBlocks: BlockDefinition[] = currentGameTwoDInteractionBlocks
