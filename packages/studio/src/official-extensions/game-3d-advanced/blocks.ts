import type { ExtensionToolboxCategory } from '#extensions'
import { categoryShades } from '../../blockly/colorShades'

// Jogo 3D Avançado = UMA cor da categoria: ÍNDIGO. As sub-categorias são TONS
// dela (derivados por categoryShades mais abaixo). Distinta do rosa (Jogo 2D),
// do teal (Jogo 2D Avançado) e do amarelo (Jogo 3D).
const C = '#4f46e5'

export const gameKit3DBlocks = [
  // ---- 🧰 O jogo ----
  {
    type: 'sz_g3k_setup',
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
      'O primeiro bloco do jogo 3D: escolhe a resolução da tela (fixa por dentro, com ajuste automático à janela), o tamanho do mundo (o lado do chão), a cor do céu (vira um degradê) e a do chão. O motor monta sombras, luz, câmera de órbita e as telas prontas sozinho. Use uma vez, no começo.',
  },
  {
    type: 'sz_g3k_set_effects',
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
      'Liga/desliga os efeitos que dão cara de cinema: sombras, brilho (as coisas claras "vazam" luz — bloom) e vinheta (os cantos escurecem). Tudo já vem LIGADO; desligue para ganhar velocidade num computador fraco (modo turbo).',
  },
  {
    type: 'sz_g3k_scatter_decor',
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
    message0: 'Começar o jogo (mostra o menu)',
    args0: [],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Liga o jogo: monta o mundo 3D, espera os sons carregarem, abre o menu e começa o laço de quadros. Use uma vez, DEPOIS de preparar tudo (moldes, ganchos, telas).',
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
    message1: 'deslocada para x %1 y %2 z %3, textura %4',
    args1: [
      { type: 'input_value', name: 'X', check: 'JSValue' },
      { type: 'input_value', name: 'Y', check: 'JSValue' },
      { type: 'input_value', name: 'Z', check: 'JSValue' },
      { type: 'field_asset_picker', name: 'TEXTURE', text: '' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Uma peça do molde: a forma, o acabamento (normal, metal, vidro ou BRILHO — que acende com o efeito de brilho/bloom), a cor, o tamanho (largura × altura × profundidade) e onde ela fica em relação ao centro do molde. O y 0.5 senta um cubo de altura 1 no chão. Só funciona DENTRO de "Criar o molde 3D".',
  },

  // ---- 👾 Nascer & enxames ----
  {
    type: 'sz_g3k_spawn',
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
      'Faz nascer 1 entidade do molde nessa posição do mundo (y 0 = no chão). O motor reaproveita as recolhidas (pooling) — rápido mesmo com muitas. Ela nasce no estado "parado".',
  },
  {
    type: 'sz_g3k_spawn_named',
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
      'Como o "Nascer 1", mas dá um APELIDO ao que nasceu — aí você usa esse nome nos outros blocos (câmera seguir, mover pelas teclas, perseguir…). Perfeito para o herói e o chefão.',
  },
  {
    type: 'sz_g3k_spawn_from',
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
      'Faz nascer 1 do molde na MESMA posição e virado para o MESMO lado de outra entidade. É assim que o tiro da torre nasce já mirado — junte com "Mover para frente".',
  },
  {
    type: 'sz_g3k_start_spawner',
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
    message0: 'Parar a fábrica do molde %1',
    args0: [{ type: 'field_name_picker', name: 'MOLD', text: 'inimigo', kind: 'mold3d' }],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Desliga a fábrica desse molde — nada mais nasce dele (os vivos continuam). Bom para fases e fim de onda.',
  },
  {
    type: 'sz_g3k_for_each_alive',
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
      'Repete o "fazer" para CADA entidade viva desse molde — dentro, "item" é a da vez. Use no "A cada quadro" para regras que valem para todos.',
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
    message0: 'Recolher %1 (volta pro molde)',
    args0: [{ type: 'field_name_picker', name: 'WHO', text: 'ela', kind: 'entity3d' }],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Tira esta entidade do jogo e guarda para reaproveitar depois. Melhor que "apagar" — o motor reusa quando outra nascer (pooling profissional).',
  },
  {
    type: 'sz_g3k_recycle_all',
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
    type: 'sz_g3k_move_with_keys',
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
    message0: 'Câmera: ver de cima, a %1 de altura',
    args0: [{ type: 'input_value', name: 'HEIGHT', check: 'JSValue' }],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'Vista aérea do mundo inteiro — perfeita para tower defense e jogos de estratégia.',
  },

  // ---- 🤖 Entidades ----
  {
    type: 'sz_g3k_place',
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
      'Define a velocidade da entidade (unidades por segundo, em cada eixo). O motor integra sozinho a cada quadro — é a física do curso profissional.',
  },
  {
    type: 'sz_g3k_set_drag',
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
      'Liga o arrasto: a velocidade da entidade vai morrendo sozinha (quanto maior o número, mais rápido freia). Bom para empurrões e derrapadas.',
  },
  {
    type: 'sz_g3k_look_at',
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
      'Verdadeiro se a entidade existe e está viva (não foi recolhida). Use antes de mexer num alvo guardado — ele pode já ter sido derrotado.',
  },
  {
    type: 'sz_g3k_set_entity_value',
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
      'Roda o "fazer" toda vez que QUALQUER entidade desse molde ENTRAR nesse estado — dentro, o apelido é a entidade da vez. É a máquina de estados dos jogos profissionais: cada torre e cada invasor tem o próprio cérebro.',
  },
  {
    type: 'sz_g3k_on_entity_state_update',
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
    message0: 'Mudar %1 para o estado %2',
    args0: [
      { type: 'field_name_picker', name: 'CHAR', text: 'ela', kind: 'entity3d' },
      { type: 'field_name_picker', name: 'STATE', text: 'mirar', kind: 'entitystate' },
    ],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Muda o estado DESTA entidade (roda o "sair" do estado velho e o "entrar" do novo). Mudar para o estado em que ela já está não faz nada — como nos jogos de verdade.',
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
    type: 'sz_g3k_aim_at',
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
      'Verdadeiro quando a frente da entidade aponta quase exatamente para o alvo — a hora de atirar. É a conta da torre profissional (o "mirar → atirar").',
  },

  // ---- 🕸️ Vizinhança (grade espacial) ----
  {
    type: 'sz_g3k_for_each_near',
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
      'Repete o "fazer" só para quem está PERTO (dentro do raio). Por dentro usa uma grade espacial — o truque dos jogos profissionais para nunca comparar todo mundo com todo mundo.',
  },
  {
    type: 'sz_g3k_store_nearest',
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
      'Acha a entidade viva mais próxima desse molde e guarda com um apelido — é como a torre escolhe o alvo. Pergunte "ainda está no jogo?" antes de usar (pode não haver ninguém).',
  },
  {
    type: 'sz_g3k_touches',
    message0: '%1 encostou em %2 (a menos de %3) ?',
    args0: [
      { type: 'field_name_picker', name: 'A', text: 'ela', kind: 'entity3d' },
      { type: 'field_name_picker', name: 'B', text: 'heroi', kind: 'entity3d' },
      { type: 'input_value', name: 'DIST', check: 'JSValue' },
    ],
    inputsInline: true,
    output: 'JSValue',
    colour: C,
    tooltip:
      'Verdadeiro quando as duas entidades estão a menos dessa distância uma da outra. É a colisão dos jogos 3D. Use dentro de um "se".',
  },

  // ---- ❤️ Combate ----
  {
    type: 'sz_g3k_hurt',
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
    type: 'sz_g3k_health_of',
    message0: 'a vida de %1',
    args0: [{ type: 'field_name_picker', name: 'CHAR', text: 'heroi', kind: 'entity3d' }],
    output: 'JSValue',
    colour: C,
    tooltip: 'Quanto de vida a entidade tem agora. Bom para o placar da tela.',
  },
  {
    type: 'sz_g3k_on_entity_death',
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

  // ---- 💥 Faíscas 3D ----
  {
    type: 'sz_g3k_define_effect',
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
      'Um efeito é a RECEITA de uma explosão de faíscas 3D, feita só de dados: quantas, a cor do começo e a do fim, o quanto espalham, o tamanho ao nascer e ao morrer, quanto duram e a gravidade (negativa cai, positiva sobe — fogo). Defina uma vez; solte quantas quiser. É o sistema de partículas dos jogos de verdade.',
  },
  {
    type: 'sz_g3k_burst_at',
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
    message0: 'Soltar o efeito %1 em cima de %2',
    args0: [
      { type: 'field_name_picker', name: 'EFFECT', text: 'explosao', kind: 'effect3d' },
      { type: 'field_name_picker', name: 'WHO', text: 'ela', kind: 'entity3d' },
    ],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'Estoura o efeito em cima de uma entidade — perfeito no "quando for derrotado".',
  },
  {
    type: 'sz_g3k_define_emitter',
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
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'A RECEITA de um jorro contínuo de partículas (fogo, fumaça, magia, rastro): a cor do começo e do fim, o tamanho ao nascer e morrer, quantos grãos por segundo, a força com que saem, a abertura do cone (0° = raio reto para cima, 180° = todas as direções), a gravidade (positiva sobe = fogo/fumaça; negativa cai) e se BRILHA (ligado = fogo/glow; desligado = fumaça com transparência). Depois use "Ligar o jorro".',
  },
  {
    type: 'sz_g3k_start_emitter',
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
    message0: 'Ligar o jorro do efeito %1 em cima de %2',
    args0: [
      { type: 'field_name_picker', name: 'EFFECT', text: 'fogo', kind: 'effect3d' },
      { type: 'field_name_picker', name: 'WHO', text: 'ela', kind: 'entity3d' },
    ],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Liga o jorro contínuo seguindo uma entidade — o rastro de fogo da nave, a fumaça do carro, a aura mágica do herói. Ele acompanha a entidade por onde ela for.',
  },
  {
    type: 'sz_g3k_stop_emitter',
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
      'Cria um ímã que PUXA as partículas desse efeito para um ponto — como um vórtice, um buraco negro ou o vento sugando a fumaça. A força diz o quanto puxa; o alcance, até onde o puxão é forte. Pode pôr mais de um.',
  },

  // ---- 🏃 Física ----
  {
    type: 'sz_g3k_fall',
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
      'Dá um impulso para cima — mas SÓ se a entidade estiver no chão (não dá para voar segurando o pulo). Precisa da gravidade ligada.',
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

  // ---- 💡 Luz & céu ----
  {
    type: 'sz_g3k_add_light',
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
      'Acende uma luz colorida num ponto do mundo (tocha, fogueira, lâmpada). Ótima para dar clima. Ponha no começo, não a cada quadro.',
  },
  {
    type: 'sz_g3k_set_ambient',
    message0: 'Luz do ambiente com força %1 (0 = escuro, 1 = claro)',
    args0: [{ type: 'input_value', name: 'INTENSITY', check: 'JSValue' }],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Muda o quanto o mundo inteiro é iluminado. Baixe para modo noturno/caverna (aí as luzes que você põe fazem diferença).',
  },
  {
    type: 'sz_g3k_set_fog',
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
      'Enche o ar de névoa: o que está longe some na cor escolhida. Dá mistério e esconde a borda do mundo.',
  },
  {
    type: 'sz_g3k_set_sky',
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

  // ---- 🖱️ Mira & clique (raycast) + 1ª pessoa ----
  {
    type: 'sz_g3k_pick',
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
      'Verdadeiro quando o ponteiro está em cima dessa entidade — para brilhar ao passar o mouse, mostrar dica, etc.',
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
    type: 'sz_g3k_camera_fps',
    message0: 'Câmera em 1ª pessoa em %1 (olhar com o mouse)',
    args0: [{ type: 'field_name_picker', name: 'CHAR', text: 'heroi', kind: 'entity3d' }],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Vê o mundo pelos olhos da entidade. Clique na tela para capturar o mouse e olhar em volta. Combine com "mover em 1ª pessoa" para um jogo de explorar/atirar em 1ª pessoa.',
  },
  {
    type: 'sz_g3k_move_fps',
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
      'Cria uma tela SUA (ex.: loja, instruções), no mesmo estilo das prontas. Começa escondida — use "Mostrar a tela". Usar o nome de uma pronta faz você ASSUMIR a tela (os botões dela saem).',
  },
  {
    type: 'sz_g3k_add_button',
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
    type: 'sz_g3k_show_screen',
    message0: 'Mostrar a tela %1',
    args0: [{ type: 'field_name_picker', name: 'SCREEN', text: 'vitoria', kind: 'screen' }],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'Mostra uma tela por cima do jogo (e esconde as outras).',
  },
  {
    type: 'sz_g3k_hide_screens',
    message0: 'Esconder todas as telas',
    args0: [],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'Esconde qualquer tela que esteja aparecendo — sobra só o jogo.',
  },
  {
    type: 'sz_g3k_hud_text',
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
      'Escreve um texto fixo num canto da tela (placar, vida, avisos) — o HUD do jogo. Escrever de novo no mesmo canto troca o texto; texto vazio apaga.',
  },

  // ---- 🚦 Estados do jogo ----
  {
    type: 'sz_g3k_set_state',
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
    message0: 'Voltar ao menu',
    args0: [],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'Para o que estiver acontecendo e volta para a tela de menu.',
  },
  {
    type: 'sz_g3k_end_game',
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
    type: 'sz_g3k_play_sound',
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
      'sz_g3k_scatter_decor',
      'sz_g3k_start',
      'sz_g3k_world_size',
    ],
  },
  {
    name: '🧊 Moldes & peças',
    colour: C,
    types: ['sz_g3k_define_mold', 'sz_g3k_part'],
  },
  {
    name: '👾 Nascer & fábricas',
    colour: C,
    types: [
      'sz_g3k_spawn',
      'sz_g3k_spawn_named',
      'sz_g3k_spawn_from',
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
      'sz_g3k_key_down',
      'sz_g3k_key_pressed',
      'sz_g3k_set_pause_key',
    ],
  },
  {
    name: '🎥 Câmera',
    colour: C,
    types: ['sz_g3k_camera_follow', 'sz_g3k_camera_orbit', 'sz_g3k_camera_top'],
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
      'sz_g3k_exists',
      'sz_g3k_set_entity_value',
      'sz_g3k_entity_value',
    ],
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
    ],
  },
  {
    name: '🎯 Comportamentos',
    colour: C,
    types: ['sz_g3k_seek', 'sz_g3k_aim_at', 'sz_g3k_face_velocity', 'sz_g3k_is_aiming_at'],
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
    ],
  },
  {
    name: '💡 Luz & céu',
    colour: C,
    types: ['sz_g3k_add_light', 'sz_g3k_set_ambient', 'sz_g3k_set_fog', 'sz_g3k_set_sky'],
  },
  {
    name: '🖱️ Mira & 1ª pessoa',
    colour: C,
    types: [
      'sz_g3k_pick',
      'sz_g3k_pointer_over',
      'sz_g3k_ground_point',
      'sz_g3k_camera_fps',
      'sz_g3k_move_fps',
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
    types: ['sz_g3k_hurt', 'sz_g3k_health_of', 'sz_g3k_on_entity_death'],
  },
  {
    name: '💥 Faíscas 3D',
    colour: C,
    types: [
      'sz_g3k_define_effect',
      'sz_g3k_burst_at',
      'sz_g3k_burst_on',
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
    name: '📢 Avisos',
    colour: C,
    types: ['sz_g3k_on_event', 'sz_g3k_emit'],
  },
  {
    name: '🔊 Som',
    colour: C,
    types: ['sz_g3k_load_sound', 'sz_g3k_play_sound', 'sz_g3k_play_effect', 'sz_g3k_play_tone'],
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
const leftover = gameKit3DBlocks.map((b) => b.type).filter((t) => !CATEGORIZED.has(t))

// Sombras pré-preenchidas dos soquetes de VALOR que aparecem na paleta.
const txtShadow = (text: string) => ({ shadow: { type: 'sz_val_text', fields: { TEXT: text } } })
const numShadow = (value: number) => ({ shadow: { type: 'sz_val_number', fields: { NUM: value } } })
export const G3K_SOCKET_SHADOWS: Record<string, Record<string, unknown>> = {
  sz_g3k_setup: { W: numShadow(1280), H: numShadow(720), SIZE: numShadow(80) },
  sz_g3k_set_effects: { STRENGTH: numShadow(1.2) },
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
  sz_g3k_place: { X: numShadow(0), Y: numShadow(0), Z: numShadow(0) },
  sz_g3k_set_yaw: { DEG: numShadow(0) },
  sz_g3k_set_velocity: { X: numShadow(0), Y: numShadow(0), Z: numShadow(0) },
  sz_g3k_set_drag: { DRAG: numShadow(3) },
  sz_g3k_set_entity_value: { VALUE: numShadow(0) },
  sz_g3k_move_forward: { SPEED: numShadow(6) },
  sz_g3k_state_timer: { SEC: numShadow(1.5) },
  sz_g3k_aim_at: { SMOOTH: numShadow(5) },
  sz_g3k_fall: { G: numShadow(20) },
  sz_g3k_jump: { FORCE: numShadow(9) },
  sz_g3k_platformer_keys: { SPEED: numShadow(8), JUMP: numShadow(9) },
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
