import type { BlockDefinition } from '../../../blockly/blocks/types'
import { GAME_KIT_COLOUR as C } from './shared'

export const gameKitBlockDefinitions03: BlockDefinition[] = [
  {
    type: 'sz_gk_rpg_add_foe_named',
    placement: 'resource-creator',
    message0: 'Adicionar o inimigo da ficha %1',
    args0: [{ type: 'field_name_picker', name: 'NAME', text: 'Capanga', kind: 'battler' }],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Põe um dos até 5 inimigos extras da PRÓXIMA batalha escolhendo uma FICHA já criada. Use antes de "Começar a batalha", nunca num laço.',
  },

  {
    type: 'sz_gk_battler_life',
    message0: 'a vida de %1 na batalha',
    args0: [{ type: 'field_name_picker', name: 'NAME', text: 'Dragão', kind: 'combatant' }],
    output: 'JSValue',
    colour: C,
    tooltip:
      'A vida atual daquele combatente (o herói é "Você"; aliados e inimigos pelo nome). É a chave das FASES do chefe: "se a vida do Dragão < metade: fica furioso". Fora da batalha dá 0.',
  },

  {
    type: 'sz_gk_battler_max_life',
    message0: 'a vida máxima de %1 na batalha',
    args0: [{ type: 'field_name_picker', name: 'NAME', text: 'Dragão', kind: 'combatant' }],
    output: 'JSValue',
    colour: C,
    tooltip:
      'A vida CHEIA daquele combatente. Junte com "a vida de …" para achar a fração (metade, um terço) e disparar as fases do chefe.',
  },

  {
    type: 'sz_gk_rpg_on_foe_turn',
    placement: 'event',
    message0: 'Quando for a vez do inimigo %1',
    args0: [{ type: 'field_name_picker', name: 'NAME', text: 'Dragão', kind: 'enemy-combatant' }],
    message1: 'fazer %1',
    args1: [{ type: 'input_statement', name: 'BODY' }],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'A IA do chefe: no turno daquele inimigo, roda os SEUS blocos (no lugar do ataque comum). Dentro, use "o inimigo usa o golpe" / "acerta todo o time" e leia "a vida de …" para mudar de fase.',
  },

  {
    type: 'sz_gk_rpg_foe_use',
    placement: 'command',
    message0: 'O inimigo %1 usa o golpe %2',
    args0: [
      { type: 'field_name_picker', name: 'NAME', text: 'Dragão', kind: 'enemy-combatant' },
      { type: 'field_name_picker', name: 'MOVE', text: 'Baforada', kind: 'combat-move' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'O inimigo usa um golpe que você ENSINOU a ele (com "Ensinar o golpe" para o nome dele), gastando a energia configurada. Sem energia suficiente, o golpe não acontece. Use dentro de "Quando for a vez do inimigo".',
  },

  {
    type: 'sz_gk_rpg_foe_hit_all',
    placement: 'command',
    message0: 'O inimigo %1 acerta TODO o time (dano %2)',
    args0: [
      { type: 'field_name_picker', name: 'NAME', text: 'Dragão', kind: 'enemy-combatant' },
      { type: 'input_value', name: 'DMG', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'O golpe de área do chefão: acerta TODO o seu time de uma vez. Use dentro de "Quando for a vez do inimigo".',
  },

  // ---- 🎬 Cenas (cutscene) & NPCs vivos ----
  {
    type: 'sz_gk_rpg_cutscene',
    placement: 'command',
    bodyExecution: 'sync-callback',
    bodyContext: 'cutscene-steps',
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
    placement: {
      root: [],
      nested: ['cutscene-steps'],
      directNested: true,
      role: 'command',
    },
    message0: 'Esperar %1 s (na cena)',
    args0: [{ type: 'input_value', name: 'SECONDS', check: 'JSValue' }],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Uma pausa na cena. O próximo passo espera esses segundos. Use DENTRO de "Fazer a cena".',
  },

  {
    type: 'sz_gk_rpg_npc_walk_to',
    placement: 'command',
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
    placement: 'command',
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
    placement: 'command',
    message0: 'Fazer o NPC %1 vaguear pela vila',
    args0: [{ type: 'field_name_picker', name: 'NPC', text: 'ferreiro', kind: 'npc' }],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'O NPC anda sozinho por células vizinhas livres, de vez em quando. Dá vida à vila. (Não use dentro de uma cena.)',
  },

  {
    type: 'sz_gk_rpg_on_step',
    placement: { root: [], nested: ['map-enter'], role: 'event' },
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
      'Roda quando o herói ENCAIXA nessa célula: encontro com inimigo, armadilha, começar uma cena automática. Monte dentro de "Quando entrar no mapa".',
  },

  // ---- 💬 Escolhas & 💾 Salvar ----
  {
    type: 'sz_gk_rpg_menu',
    placement: 'command',
    bodyExecution: 'sync-callback',
    bodyContext: 'menu-options',
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
    placement: {
      root: [],
      nested: ['menu-options'],
      directNested: true,
      role: 'command',
    },
    bodyExecution: 'deferred-callback',
    userGesture: true,
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
    placement: 'command',
    message0: 'Salvar o jogo',
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Guarda o progresso (flags da história, itens, mapa atual, posição e atributos). Continua salvo mesmo fechando e abrindo o jogo.',
  },

  {
    type: 'sz_gk_rpg_load',
    placement: 'command',
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
    placement: 'start-only-command',
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
    placement: 'command',
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
    placement: 'command',
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
      'Prepara um som que você importou (em "Imagens e sons"). Dê um nome; é ele que você usa em "Tocar o som". Use em “Ao iniciar”.',
  },

  {
    type: 'sz_gk_play_sound',
    placement: 'command',
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
    type: 'sz_gk_play_tone',
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
    tooltip: 'Toca uma notinha: quanto maior o Hz, mais agudo. Junte várias para uma melodia.',
  },

  // ---- 🗺️ Mundo de tiles & profundidade ----
  {
    type: 'sz_gk_load_tilemap',
    placement: 'start-only-command',
    message0: 'Carregar o mapa de peças %1 do desenho %2',
    args0: [
      { type: 'field_input', name: 'NAME', text: 'mundo' },
      { type: 'field_asset_picker', name: 'IMAGE', text: 'meu-mapa', filter: 'tilemap' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Carrega exatamente a grade que você desenhou no Pinta: peças, sólidos e camadas. Este é um desenho de peças, não um mapa-cenário do RPG. Use-o dentro de “Criar o mapa-cenário”.',
  },

  {
    // Irmão do "Pôr o cenário atrás de tudo" (🧰 O jogo): mesma geometria de
    // cobertura, mas quem manda na ordem das camadas é a criança. O encaixe só
    // aceita corpos de desenho e de laço — em "Ao iniciar" o Blockly recusa a
    // conexão, então pegar o bloco errado dá recusa na hora em vez de um jogo
    // estranho sem explicação.
    type: 'sz_gk_draw_backdrop',
    placement: {
      root: [],
      nested: ['draw-world', 'map-draw', 'loop-body', 'function-body', 'derived-method-body'],
      role: 'command',
    },
    message0: 'Desenhar o cenário %1',
    args0: [{ type: 'field_asset_picker', name: 'IMAGE', text: '' }],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Desenha um desenho seu cobrindo a tela inteira, agora, neste ponto do quadro. Use no começo do “Desenhar o jogo” para o cenário ficar atrás do resto. É o irmão de “Pôr o cenário atrás de tudo”: aquele se põe uma vez em “Ao iniciar” e o jogo repinta sozinho; este você desenha a cada quadro, escolhendo a ordem das camadas.',
  },
  {
    type: 'sz_gk_draw_tilemap',
    placement: 'command',
    message0: 'Desenhar o mapa de peças %1 (camada %2)',
    args0: [
      { type: 'field_name_picker', name: 'MAP', text: 'mundo', kind: 'tilemap' },
      {
        type: 'field_dropdown',
        name: 'LAYER',
        options: [
          ['chão (o fundo, por baixo)', 'chão'],
          ['topos (peças sólidas, por cima)', 'topos'],
          ['frente (a camada da frente, por cima)', 'frente'],
        ],
      },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Desenha o mapa. Desenhe o "chão" ANTES dos personagens; DEPOIS deles desenhe "topos" (só as peças sólidas: muros/telhados) ou "frente" (a camada da frente que você marcou no Pinta, como copas de árvore). Assim o herói passa por trás e a cena ganha profundidade. O mapa encaixa sozinho na tela.',
  },

  {
    type: 'sz_gk_tilemap_solid',
    placement: 'start-only-command',
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
    placement: 'command',
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
    placement: 'command',
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
    placement: 'command',
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
    placement: 'command',
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
      'Puxa o personagem para baixo a cada quadro (2160 é o padrão dos jogos). É o PASSO 1 da receita: gravidade → mover pela velocidade → colidir. Este bloco também DESLIGA o "está no chão". Só o pouso da colisão liga de volta.',
  },

  {
    type: 'sz_gk_jump',
    placement: 'command',
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
      'Só funciona se o personagem estiver NO CHÃO. É isso que impede o pulo infinito (o erro nº 1 dos tutoriais de jogo).',
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
    placement: 'command',
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
    placement: 'command',
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
    placement: 'command',
    message0: 'Fazer %1 quicar nas bordas',
    args0: [{ type: 'field_name_picker', name: 'WHO', text: 'bola', kind: 'character' }],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'Bateu na borda, volta. A bolinha do pong e do breakout.',
  },

  {
    type: 'sz_gk_paddle_bounce',
    placement: 'command',
    message0: 'Rebater %1 na raquete %2',
    args0: [
      { type: 'field_name_picker', name: 'BALL', text: 'bola', kind: 'character' },
      { type: 'field_name_picker', name: 'PADDLE', text: 'raquete', kind: 'character' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Quando a bola encosta na raquete, ela QUICA: a direção pra cima/baixo inverte e a direção de lado vem do PONTO que bateu (na beirada, sai mais de lado). É o coração do Breakout e do Pong. Combine com "quicar nas bordas" (paredes) no "A cada quadro".',
  },

  {
    type: 'sz_gk_wrap_edges',
    placement: 'command',
    message0: 'Fazer %1 atravessar para o outro lado',
    args0: [{ type: 'field_name_picker', name: 'WHO', text: 'nave', kind: 'character' }],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'Saiu por um lado, aparece no outro. O Pac-Man e o Asteroids.',
  },

  // ---- 🧩 Grade (Snake, Match-3, Sokoban, puzzles) ----
  {
    type: 'sz_gk_board_create',
    placement: 'start-only-command',
    message0: 'Criar o tabuleiro %1 com %2 colunas × %3 linhas (vazio = %4)',
    args0: [
      { type: 'field_input', name: 'NAME', text: 'tabuleiro' },
      { type: 'input_value', name: 'COLS', check: 'JSValue' },
      { type: 'input_value', name: 'ROWS', check: 'JSValue' },
      { type: 'input_value', name: 'EMPTY', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Cria uma GRADE de até 512 × 512 células por nome (colunas × linhas), tudo começando com o valor "vazio" (ex.: 0). É o coração dos jogos de grade: Cobrinha, Match-3, Sokoban, campo-minado, quebra-cabeças. Você varre a grade com "repita" e lê/escreve por (coluna, linha).',
  },

  {
    type: 'sz_gk_board_set',
    placement: 'command',
    message0: 'No tabuleiro %1, pôr %2 na coluna %3, linha %4',
    args0: [
      { type: 'field_name_picker', name: 'NAME', text: 'tabuleiro', kind: 'board' },
      { type: 'input_value', name: 'VALUE', check: 'JSValue' },
      { type: 'input_value', name: 'COL', check: 'JSValue' },
      { type: 'input_value', name: 'ROW', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'Escreve um valor numa célula da grade (fora dos limites, não faz nada).',
  },

  {
    type: 'sz_gk_board_get',
    message0: 'o valor do tabuleiro %1 em (coluna %2, linha %3)',
    args0: [
      { type: 'field_name_picker', name: 'NAME', text: 'tabuleiro', kind: 'board' },
      { type: 'input_value', name: 'COL', check: 'JSValue' },
      { type: 'input_value', name: 'ROW', check: 'JSValue' },
    ],
    inputsInline: true,
    output: 'JSValue',
    colour: C,
    tooltip: 'Lê o valor de uma célula. Fora dos limites, devolve o valor "vazio" do tabuleiro.',
  },

  {
    type: 'sz_gk_board_count',
    message0: 'quantas células do tabuleiro %1 têm o valor %2',
    args0: [
      { type: 'field_name_picker', name: 'NAME', text: 'tabuleiro', kind: 'board' },
      { type: 'input_value', name: 'VALUE', check: 'JSValue' },
    ],
    inputsInline: true,
    output: 'JSValue',
    colour: C,
    tooltip: 'Conta quantas células têm um valor. Ex.: quantas minas, quantas peças de uma cor.',
  },

  {
    type: 'sz_gk_board_in',
    message0: 'a (coluna %2, linha %3) cabe no tabuleiro %1 ?',
    args0: [
      { type: 'field_name_picker', name: 'NAME', text: 'tabuleiro', kind: 'board' },
      { type: 'input_value', name: 'COL', check: 'JSValue' },
      { type: 'input_value', name: 'ROW', check: 'JSValue' },
    ],
    inputsInline: true,
    output: 'JSValue',
    colour: C,
    tooltip:
      'Verdadeiro se a célula está DENTRO da grade. O jeito de saber se a cobrinha bateu na parede ou se um movimento sai do tabuleiro.',
  },

  // ---- 🃏 R30: CARTAS (pilha = lista do núcleo; carta de 2 faces; mão clicável) ----
  {
    type: 'sz_gk_pile_move_top',
    placement: 'command',
    message0: 'Mover a carta do topo da pilha %1 para a pilha %2',
    args0: [
      { type: 'field_name_picker', name: 'FROM', text: 'baralho', kind: 'group' },
      { type: 'field_name_picker', name: 'TO', text: 'mao', kind: 'group' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Tira a carta de cima de uma pilha (lista) e põe no topo da outra. É o COMPRAR (baralho → mão) E o DESCARTAR (mão → descarte) num bloco só. As pilhas são listas normais do núcleo.',
  },

  {
    type: 'sz_gk_pile_shuffle_from',
    placement: 'command',
    message0: 'Remontar a pilha %1 juntando %2 e embaralhar',
    args0: [
      { type: 'field_name_picker', name: 'DECK', text: 'baralho', kind: 'group' },
      { type: 'field_name_picker', name: 'DISCARD', text: 'descarte', kind: 'group' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Quando o baralho acaba: joga o descarte de volta no baralho e embaralha. O rebaralhar do deck-battler num bloco.',
  },

  {
    type: 'sz_gk_pile_top',
    message0: 'a carta do topo da pilha %1',
    args0: [{ type: 'field_name_picker', name: 'PILE', text: 'baralho', kind: 'group' }],
    output: 'JSValue',
    colour: C,
    tooltip:
      'Espia a carta de cima SEM tirar (para saber qual é antes de mover). Pilha vazia = nada.',
  },

  {
    type: 'sz_gk_pile_size',
    message0: 'quantas cartas tem a pilha %1',
    args0: [{ type: 'field_name_picker', name: 'PILE', text: 'baralho', kind: 'group' }],
    output: 'JSValue',
    colour: C,
    tooltip: 'Quantas cartas há na pilha (lista). Use para saber se o baralho acabou (= 0).',
  },

  {
    type: 'sz_gk_card',
    message0: 'uma carta: frente %1, verso %2',
    args0: [
      { type: 'input_value', name: 'FRONT', check: 'JSValue' },
      { type: 'input_value', name: 'BACK', check: 'JSValue' },
    ],
    inputsInline: true,
    output: 'JSValue',
    colour: C,
    tooltip:
      'Cria uma carta com duas faces: a FRENTE (o valor/figura) e o VERSO (o que aparece virada pra baixo). Nasce virada pra BAIXO. Ponha várias numa lista para fazer o baralho.',
  },

  {
    type: 'sz_gk_card_flip',
    placement: 'command',
    message0: 'Virar a carta %1',
    args0: [{ type: 'input_value', name: 'CARD', check: 'JSValue' }],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'Vira a carta (de cara pra cima ↔ pra baixo). É o coração do jogo da memória.',
  },

  {
    type: 'sz_gk_card_is_up',
    message0: 'a carta %1 está virada para cima',
    args0: [{ type: 'input_value', name: 'CARD', check: 'JSValue' }],
    inputsInline: true,
    output: 'JSValue',
    colour: C,
    tooltip: 'Verdadeiro se a carta está de cara pra cima (mostrando a frente).',
  },

  {
    type: 'sz_gk_card_face',
    message0: 'o que aparece na carta %1',
    args0: [{ type: 'input_value', name: 'CARD', check: 'JSValue' }],
    inputsInline: true,
    output: 'JSValue',
    colour: C,
    tooltip:
      'O que a carta MOSTRA agora: a frente se estiver virada pra cima, o verso se pra baixo. Use para comparar duas cartas viradas (par!).',
  },

  {
    type: 'sz_gk_hand_draw',
    placement: 'command',
    message0: 'Desenhar a pilha %1 como fileira em x %2 y %3 %4',
    args0: [
      { type: 'field_name_picker', name: 'PILE', text: 'mao', kind: 'group' },
      { type: 'input_value', name: 'X', check: 'JSValue' },
      { type: 'input_value', name: 'Y', check: 'JSValue' },
      { type: 'field_checkbox', name: 'FAN', checked: false },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Desenha as cartas da pilha (lista) numa fileira a partir de x,y (marque a caixinha para um leque). Guarda onde cada carta ficou para o "a carta clicada". Use no "Desenhar o jogo".',
  },

  {
    type: 'sz_gk_card_at',
    message0: 'a carta clicada em x %1 y %2 da pilha %3',
    args0: [
      { type: 'input_value', name: 'X', check: 'JSValue' },
      { type: 'input_value', name: 'Y', check: 'JSValue' },
      { type: 'field_name_picker', name: 'PILE', text: 'mao', kind: 'group' },
    ],
    inputsInline: true,
    output: 'JSValue',
    colour: C,
    tooltip:
      'Qual carta da mão foi clicada (o índice, 0 = a primeira; -1 = nenhuma). No HUD, junte com "o mouse x/y na tela"; no mundo, use "o mouse x/y".',
  },

  // ---- 🃏 R30: KIT CARTAS (o RPG de cartas / deck-battler) ----
  {
    type: 'sz_gk_cards_start',
    placement: 'command',
    message0: 'Começar uma batalha de cartas: você com %1 de vida, inimigo com %2',
    args0: [
      { type: 'input_value', name: 'HERO_HP', check: 'JSValue' },
      { type: 'input_value', name: 'ENEMY_HP', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Abre a arena da batalha de cartas (vida sua e do inimigo). NÃO cria deck nem cartas. Isso é seu: monte o baralho com listas + o bloco "uma carta". ⚠️ Roda SÓ no estado "jogando" (não muda o estado); chame quando já estiver jogando, e já começa o seu 1º turno. Ponha o "Quando começar o meu turno"/"Quando for a vez do inimigo" NO TOPO (não dentro do "quando entrar em jogando"). (Batalha de CARTAS. Para turnos com espada use o ⚔️ Kit RPG; para bichinhos, o 👾 Kit Monstrinhos.)',
  },

  {
    type: 'sz_gk_cards_energy_per_turn',
    placement: 'start-only-command',
    message0: 'A cada turno, começar com %1 de energia',
    args0: [{ type: 'input_value', name: 'N', check: 'JSValue' }],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'A energia RESETA para esse valor a cada turno seu (o gasto das cartas). É o que diferencia o deck-battler do RPG comum (lá a energia acumula).',
  },

  {
    type: 'sz_gk_cards_energy',
    message0: 'a minha energia',
    output: 'JSValue',
    colour: C,
    tooltip: 'Quanta energia você tem agora. Teste antes de jogar uma carta (custa energia).',
  },

  {
    type: 'sz_gk_cards_spend',
    placement: 'command',
    message0: 'Gastar %1 de energia',
    args0: [{ type: 'input_value', name: 'N', check: 'JSValue' }],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'Tira energia (o custo da carta jogada). Não deixa passar de 0.',
  },
]
