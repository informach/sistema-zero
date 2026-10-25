import type { BlockDefinition } from '../../blockly/blocks/types'
import type { ExtensionToolboxCategory } from '../../extensions/toolboxTypes'
import { buildExtensionPalette } from '../extensionPalette'
import { gameRulesBlocks } from '../game3dRules/blocks'
import { THREE_KEY_OPTIONS } from '../threeKeys'
import { G3K_ANIM_LOOP_OPTIONS } from './modelCodec'
import { GAME_KIT_THREE_D_PALETTE } from './palette'

// Jogo 3D Avançado = UMA cor da categoria: ÍNDIGO. As famílias são TONS dela (derivados por
// categoryShades em `extensionPalette.ts`). Distinta do rosa (Jogo 2D), do teal (Jogo 2D
// Avançado) e do amarelo (Jogo 3D).
const C = '#4f46e5'

/**
 * Vocabulário da criança (review 3D, lote 11): "objeto" (nunca "entidade"), "tirar do jogo"
 * (nunca "recolher"), tempo em segundos, ângulos em graus, "jorro de faíscas", "bordas
 * escuras", "sorteio repetível com o código". Toda dica cabe em 220 caracteres.
 *
 * Os blocos seguem a ordem das famílias da paleta (`palette.ts`); placar, telas prontas, fim
 * de jogo, contagem, sorteio e tremor vêm da fábrica COMPARTILHADA das regras de jogo 3D
 * (`game3dRules/blocks.ts`), com a mesma cara do Jogo 3D e do Mundo 3D.
 */
const PAUSE_KEY_OPTIONS = [['Esc', 'Escape'], ...THREE_KEY_OPTIONS] as const

const gameKit3DBlockDefinitions = [
  // ---- 🌍 Mundo, telas e estados › Preparar ----
  {
    type: 'sz_g3k_setup',
    placement: 'start-only-command',
    message0: 'Criar o mundo 3D: tela %1 × %2, %3 metros de lado, céu %4, chão %5',
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
      'O primeiro bloco do jogo: o tamanho da tela, o lado do chão em metros e as cores do céu e do chão. Luz, sombra, câmera e telas já vêm prontas. Use uma vez, no começo.',
  },
  {
    type: 'sz_g3k_world_size',
    message0: 'o tamanho do mundo',
    args0: [],
    output: 'JSValue',
    colour: C,
    tooltip:
      'Quantos metros tem o lado do chão (o do "Criar o mundo 3D"). Bom para contas de posição.',
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
      'Põe pedras e cristais em lugares sorteados do chão. Use no "Quando o jogo entrar no estado jogando" (chamar de novo troca os enfeites de lugar).',
  },
  {
    type: 'sz_g3k_set_effects',
    placement: 'command',
    message0: 'Efeitos de cinema: sombras %1, brilho %2 com força %3, bordas escuras %4',
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
      'Liga ou desliga as sombras, o brilho nas coisas claras e as bordas escuras da tela. Tudo já vem ligado; desligue para o jogo ficar leve num computador fraco.',
  },
  {
    type: 'sz_g3k_set_pause_key',
    placement: 'start-only-command',
    message0: 'Usar a tecla %1 para pausar e continuar',
    args0: [{ type: 'field_dropdown', name: 'KEY', options: PAUSE_KEY_OPTIONS }],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Troca a tecla que pausa e continua o jogo (o normal é Esc). Use antes de o jogo começar.',
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
      'Bloco antigo mantido para abrir projetos anteriores. O jogo agora começa sozinho depois de preparar moldes, avisos e telas.',
  },

  // ---- 🌍 Mundo, telas e estados › Telas (o "Na tela de …" vem das regras comuns) ----
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
      'Cria uma tela sua (loja, instruções…) no estilo das prontas. Ela começa escondida: use "Mostrar a tela". Com o nome de uma pronta, você assume aquela tela (os botões dela saem).',
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
      'Põe um botão numa tela (pronta ou sua) e diz o que acontece no clique: mudar de estado, voltar ao menu, o que você quiser.',
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

  // ---- 🌍 Mundo, telas e estados › Estados ----
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
      'Roda toda vez que o jogo entra nesse estado. É onde a partida se monta: fazer nascer o herói, começar a nascer inimigos e zerar o que precisa.',
  },
  {
    type: 'sz_g3k_set_state',
    placement: 'command',
    message0: 'Mudar o estado do jogo para %1',
    args0: [{ type: 'field_name_picker', name: 'STATE', text: 'jogando', kind: 'gamestate' }],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'O jogo vive em um estado por vez: menu, jogando, pausado, fim, vitoria ou um seu. Entrar em "jogando" (fora da pausa) recomeça a partida; as telas prontas aparecem sozinhas.',
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

  // ---- 🌍 Mundo, telas e estados › Avisos ----
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
      'Roda toda vez que alguém mandar esse aviso. Quem avisa não precisa conhecer quem escuta: é o jeito de ligar as partes de um jogo grande.',
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
      'Manda um aviso: todos os "Quando chegar o aviso" com esse nome rodam. Invente o nome que quiser (ex.: invasor:caiu, onda:acabou).',
  },

  // ---- 🧩 Moldes › Desenhar o molde ----
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
      'Um molde é a receita de um tipo de coisa do jogo (herói, torre, tiro): a vida, a velocidade e o desenho feito de peças. Depois faça nascer quantos quiser. Sem peças, sai um cubinho.',
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
      'Uma peça do molde: forma, acabamento, cor, tamanho e lugar. O y 0.5 põe um cubo de altura 1 no chão. Com "modelo importado" e um .glb, o modelo cabe inteiro na caixa, sem esticar.',
  },

  // ---- 🧩 Moldes › Corpo do molde ----
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
      'Um bloco só e o molde se comporta como a coisa que ele é: 🏀 bola quica, 📦 caixa freia, 🧍 personagem não quica, 🧊 gelo escorrega e 🪶 flutuante não cai.',
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
          ['pílula (boneco)', 'capsule'],
        ],
      },
    ],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Troca o formato invisível que bate (o desenho não muda). Caixa é o normal; bola serve para bolas e tiros; a pílula é a melhor para gente e bicho: não engancha em quina.',
  },
  {
    type: 'sz_g3k_make_solid',
    placement: 'start-only-command',
    message0: 'Fazer o molde %1 ser sólido (parede, chão ou plataforma)',
    args0: [{ type: 'field_name_picker', name: 'MOLD', text: 'parede', kind: 'mold3d' }],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Quem é desse molde vira parede ou chão: os outros não atravessam, param em cima e podem pular dali. É o que transforma caixas em plataformas.',
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
      'A zona não empurra ninguém: dá para passar por dentro, e o "Quando alguém encostar" avisa quem entrou. Boa para moeda, porta, armadilha e chegada.',
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
      'Quem bate nesse molde volta: 0 não quica (o normal), 0.5 volta com metade da força, 1 volta com tudo. Faz trampolim e bola pula-pula.',
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
      'O quanto esse chão segura quem pisa nele: 0 escorrega como gelo (o normal), 1 gruda e para rápido. Só vale enquanto o objeto está no chão.',
  },

  // ---- 🧩 Moldes › Animação do modelo ----
  {
    type: 'sz_g3k_on_anim_end',
    placement: 'event',
    message0: 'Quando um %1 terminar a animação %2, chamando de %3',
    args0: [
      { type: 'field_name_picker', name: 'MOLD', text: 'heroi', kind: 'mold3d' },
      { type: 'field_model_clip_picker', name: 'CLIP', text: 'Pular' },
      { type: 'field_input', name: 'ITEM', text: 'ela' },
    ],
    message1: 'fazer %1',
    args1: [{ type: 'input_statement', name: 'BODY' }],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Roda quando uma animação tocada "uma vez" chega ao fim num objeto desse molde (ex.: acabou o golpe, voltar a andar). Dentro, o nome escolhido é quem terminou.',
  },
  {
    type: 'sz_g3k_state_anim',
    placement: 'start-only-command',
    message0: 'No molde %1, no estado %2, tocar a animação %3 %4',
    args0: [
      { type: 'field_name_picker', name: 'MOLD', text: 'heroi', kind: 'mold3d' },
      { type: 'field_name_picker', name: 'STATE', text: 'parado', kind: 'entitystate' },
      { type: 'field_model_clip_picker', name: 'CLIP', text: 'Idle' },
      { type: 'field_dropdown', name: 'LOOP', options: G3K_ANIM_LOOP_OPTIONS },
    ],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Amarra uma animação do modelo a um estado: quando o objeto muda para ele, a animação troca sozinha. "uma vez" toca até o fim e para (bom para pulo e golpe). O nome vem do .glb.',
  },
  {
    type: 'sz_g3k_play_anim',
    placement: 'command',
    message0: 'Tocar a animação %1 em %2 %3',
    args0: [
      { type: 'field_model_clip_picker', name: 'CLIP', text: 'Idle' },
      { type: 'field_name_picker', name: 'CHAR', text: 'heroi', kind: 'entity3d' },
      { type: 'field_dropdown', name: 'LOOP', options: G3K_ANIM_LOOP_OPTIONS },
    ],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Toca uma animação do modelo agora. "repetindo" é para andar e ficar parado; "uma vez" é para pular e atacar (para no último quadro). Pedir a que já está tocando não recomeça.',
  },
  {
    type: 'sz_g3k_anim_speed',
    placement: 'command',
    message0: 'Velocidade da animação de %1 %2×',
    args0: [
      { type: 'field_name_picker', name: 'CHAR', text: 'heroi', kind: 'entity3d' },
      { type: 'input_value', name: 'SPEED', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Acelera ou desacelera as animações desse objeto: 1 é o normal, 0.5 é câmera lenta, 2 é o dobro. Vale para a que está tocando e para as próximas.',
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

  // ---- 👾 Nascer e sumir › Nascer ----
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
      'Faz nascer 1 objeto do molde nesse lugar (y 0 = no chão). Ele nasce no estado "parado". O motor reaproveita o desenho de quem saiu do jogo, então dá para ter muitos.',
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
      'Como o "Nascer 1", mas dá um apelido a quem nasceu. Use o apelido nos outros blocos (câmera, teclas, perseguir). Perfeito para o herói e o chefão.',
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
      'Faz nascer 1 do molde no mesmo lugar e virado para o mesmo lado de outro objeto. É assim que o tiro da torre já nasce mirado. Junte com "Mover para frente".',
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
      'Faz nascer vários tiros do molde em círculo em volta do objeto, voando para fora: o ataque clássico de chefão. Junte com "Tirar do jogo quem passar de … do centro".',
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
      'Faz nascer um do molde a cada tantos segundos, sem parar. É assim que os invasores chegam. Usar de novo só troca o ritmo (não duplica).',
  },
  {
    type: 'sz_g3k_stop_spawner',
    placement: 'command',
    message0: 'Parar de nascer do molde %1',
    args0: [{ type: 'field_name_picker', name: 'MOLD', text: 'inimigo', kind: 'mold3d' }],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Para o "A cada … s, nascer" desse molde: nada mais nasce dele, e quem já está no jogo continua. Bom para fases e fim de onda.',
  },

  // ---- 👾 Nascer e sumir › Quem está no jogo ----
  {
    type: 'sz_g3k_for_each_alive',
    placement: 'command',
    bodyExecution: 'sync-callback',
    message0: 'Para cada %1 do molde %2 que está no jogo',
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
      'Repete o "fazer" para cada objeto desse molde que está no jogo. Dentro, o nome escolhido é o da vez. Use no "A cada quadro" para regras que valem para todos.',
  },
  {
    type: 'sz_g3k_count_alive',
    message0: 'quantos do molde %1 estão no jogo',
    args0: [{ type: 'field_name_picker', name: 'MOLD', text: 'inimigo', kind: 'mold3d' }],
    output: 'JSValue',
    colour: C,
    tooltip: 'Quantos objetos desse molde estão no jogo agora. Use numa conta ou num "se".',
  },
  {
    type: 'sz_g3k_exists',
    message0: '%1 ainda está no jogo ?',
    args0: [{ type: 'field_name_picker', name: 'CHAR', text: 'alvo', kind: 'entity3d' }],
    output: 'JSValue',
    colour: C,
    tooltip:
      'Verdadeiro se o objeto ainda está no jogo. Pergunte antes de usar um alvo guardado: ele pode já ter sido derrotado.',
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
      'Pergunta de que molde é o objeto. Na zona, quem encostou pode ser qualquer coisa (herói, bola, tiro): pergunte o molde antes de contar o ponto.',
  },

  // ---- 👾 Nascer e sumir › Sumir ----
  {
    type: 'sz_g3k_recycle',
    placement: 'command',
    message0: 'Tirar %1 do jogo',
    args0: [{ type: 'field_name_picker', name: 'WHO', text: 'ela', kind: 'entity3d' }],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Tira esse objeto do jogo. O motor guarda o desenho para o próximo que nascer, mas quem saiu não volta: os blocos que ainda o chamarem não fazem nada.',
  },
  {
    type: 'sz_g3k_recycle_all',
    placement: 'command',
    message0: 'Tirar do jogo todos do molde %1',
    args0: [{ type: 'field_name_picker', name: 'MOLD', text: 'inimigo', kind: 'mold3d' }],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'Tira do jogo todos os objetos desse molde de uma vez. Bom para limpar a arena.',
  },
  {
    type: 'sz_g3k_cull_far',
    placement: 'command',
    message0: 'Tirar do jogo quem do molde %1 passar de %2 do centro',
    args0: [
      { type: 'field_name_picker', name: 'MOLD', text: 'tiro', kind: 'mold3d' },
      { type: 'input_value', name: 'DIST', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Tira do jogo quem foi longe demais do centro do mundo (ex.: tiros que erraram), em metros. Deixa o jogo leve. Use no "A cada quadro".',
  },

  // ---- 🏃 Movimento › Teclado ----
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
      'Movimento pronto no chão com WASD e setas, para onde a câmera olha. A diagonal tem a mesma velocidade. Use dentro do "A cada quadro".',
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
      'Controle de plataforma pronto: anda com WASD ou setas e pula com o espaço (liga a queda sozinho). Use dentro do "A cada quadro".',
  },
  {
    type: 'sz_g3k_move_fps',
    placement: 'command',
    message0: 'Mover %1 em 1ª pessoa (WASD) a %2 por segundo',
    args0: [
      { type: 'field_name_picker', name: 'CHAR', text: 'heroi', kind: 'entity3d' },
      { type: 'input_value', name: 'SPEED', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Anda para onde a câmera de 1ª pessoa olha: W e S vão e voltam, A e D andam de lado. Use dentro do "A cada quadro", com a câmera em 1ª pessoa.',
  },

  // ---- 🏃 Movimento › Posição e direção ----
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
    tooltip: 'Leva o objeto na hora para esse lugar do mundo (y 0 = no chão).',
  },
  {
    type: 'sz_g3k_set_yaw',
    placement: 'command',
    message0: 'Girar %1 para %2 graus',
    args0: [
      { type: 'field_name_picker', name: 'CHAR', text: 'heroi', kind: 'entity3d' },
      { type: 'input_value', name: 'DEG', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'Vira o objeto para essa direção: 0 = frente, 90 = esquerda, 180 = costas.',
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
      'Vira o objeto na hora para o outro. Para o giro suave de torre, use "Fazer mirar em".',
  },
  {
    type: 'sz_g3k_face_velocity',
    placement: 'command',
    message0: 'Virar %1 para onde anda',
    args0: [{ type: 'field_name_picker', name: 'WHO', text: 'ela', kind: 'entity3d' }],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'Vira o objeto na direção em que ele está andando. Bom junto com "perseguir".',
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
    tooltip: 'A posição do objeto num eixo do mundo (x e z = chão, y = altura).',
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
      'Quantos metros separam os dois objetos. O "encostando" só diz sim ou não; aqui vem o número (ex.: o inimigo corre mais quando está longe).',
  },

  // ---- 🏃 Movimento › Velocidade e freio ----
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
      'A velocidade do objeto em metros por segundo, em cada eixo. O motor move ele sozinho a cada quadro.',
  },
  {
    type: 'sz_g3k_set_drag',
    placement: 'command',
    message0: 'Frear %1 aos poucos (força %2)',
    args0: [
      { type: 'field_name_picker', name: 'CHAR', text: 'heroi', kind: 'entity3d' },
      { type: 'input_value', name: 'DRAG', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'A velocidade do objeto vai diminuindo sozinha (quanto maior a força, mais rápido ele freia). Freia só no plano do chão: a queda continua com a gravidade.',
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
      'Empurra o objeto para onde ele está virado. É o motor do tiro: nasceu virado (com "no lugar de") e é só mover para frente.',
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
      'Quantos metros por segundo o objeto anda naquele eixo. y negativo = caindo, y positivo = subindo. Serve para saber se ele está parado ou caindo.',
  },

  // ---- 🏃 Movimento › Pular e cair ----
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
      'Liga a queda no objeto: ele cai e pousa no chão e nas plataformas sólidas. Quanto maior a gravidade, mais pesado. É a base de plataforma e pulo.',
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
      'Dá um impulso para cima, mas só se o objeto estiver no chão (segurar não faz voar). Precisa da queda ligada.',
  },
  {
    type: 'sz_g3k_on_ground',
    message0: '%1 está no chão ?',
    args0: [{ type: 'field_name_picker', name: 'CHAR', text: 'heroi', kind: 'entity3d' }],
    output: 'JSValue',
    colour: C,
    tooltip: 'Verdadeiro quando o objeto pisa no chão ou numa plataforma. Use para o pulo.',
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
      'Ligado, o objeto vira fantasma e passa através do que é sólido (tiro mágico, fantasma). Desligado, ele volta a bater nas paredes.',
  },

  // ---- 🏃 Movimento › Perseguir e mirar ----
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
      'Aponta a velocidade do objeto para o alvo, com a velocidade do molde dele. Use a cada quadro (ou num estado do objeto).',
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
      'Anda até um lugar do mundo na velocidade do molde e para ao chegar (só no chão). Com "um número de … a …" vira passeio; com vários pontos, patrulha.',
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
      'Gira aos poucos na direção do alvo, como uma torre (suavidade maior = gira mais rápido). Use a cada quadro e pergunte "já está mirando?" para saber a hora de atirar.',
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
      'Verdadeiro quando a frente do objeto aponta quase direto para o alvo: a hora de atirar.',
  },

  // ---- 🎮 Controles ----
  {
    type: 'sz_g3k_key_down',
    message0: 'a tecla %1 está apertada ?',
    args0: [{ type: 'field_dropdown', name: 'KEY', options: THREE_KEY_OPTIONS }],
    output: 'JSValue',
    colour: C,
    tooltip: 'Verdadeiro enquanto a tecla está sendo segurada. Use dentro do "A cada quadro".',
  },
  {
    type: 'sz_g3k_key_pressed',
    message0: 'a tecla %1 acabou de ser apertada ?',
    args0: [{ type: 'field_dropdown', name: 'KEY', options: THREE_KEY_OPTIONS }],
    output: 'JSValue',
    colour: C,
    tooltip:
      'Verdadeiro só no quadro em que a tecla desceu (segurar não repete). Perfeito para atirar: um aperto, uma ação.',
  },
  {
    type: 'sz_g3k_mouse_pressed',
    message0: 'o mouse foi clicado agora ?',
    args0: [],
    output: 'JSValue',
    colour: C,
    tooltip:
      'Verdadeiro só no quadro do clique ou do toque no mundo 3D (os botões das telas não contam). É o gatilho do apontar e clicar.',
  },
  {
    type: 'sz_g3k_mouse_down',
    message0: 'o mouse está apertado ?',
    args0: [],
    output: 'JSValue',
    colour: C,
    tooltip:
      'Verdadeiro enquanto o botão do mouse (ou o dedo) está segurado. Bom para carregar um tiro ou arrastar mirando.',
  },
  {
    type: 'sz_g3k_pick',
    placement: 'command',
    message0: 'Guardar em %1 quem do molde %2 está sob o mouse',
    args0: [
      { type: 'field_input', name: 'NAME', text: 'escolhida' },
      { type: 'field_name_picker', name: 'MOLD', text: 'inimigo', kind: 'mold3d' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Guarda com um apelido o objeto desse molde que está embaixo do mouse (ou nada). É o coração do clicar para escolher. Pergunte "ainda está no jogo?" antes de usar.',
  },
  {
    type: 'sz_g3k_pointer_over',
    message0: 'o mouse está sobre %1 ?',
    args0: [{ type: 'field_name_picker', name: 'CHAR', text: 'ela', kind: 'entity3d' }],
    output: 'JSValue',
    colour: C,
    tooltip:
      'Verdadeiro quando o mouse está em cima desse objeto. Para brilhar ao passar o mouse ou mostrar uma dica.',
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
      'Onde no chão o mouse está apontando (x, y ou z). Use para mover algo até o clique ou construir onde você apontar.',
  },

  // ---- 💥 Encostar ----
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
      'Roda quando alguém entra na zona, uma vez por entrada (não a cada quadro). "zona" é o que foi encostado e "quem" é quem encostou.',
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
      'Verdadeiro enquanto os dois objetos estão a menos dessa distância, em metros. Use dentro de um "se".',
  },
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
      'Repete o "fazer" só para quem está perto (dentro do raio, em metros). Por dentro usa uma grade: o truque para nunca comparar todo mundo com todo mundo.',
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
      'Acha o objeto desse molde mais perto e guarda com um apelido. É como a torre escolhe o alvo. Pergunte "ainda está no jogo?" antes de usar.',
  },

  // ---- 🧠 Comportamento › Estados de cada um ----
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
      'Roda quando qualquer objeto desse molde entra nesse estado. Dentro, o apelido é o objeto da vez. Assim cada torre e cada invasor tem o próprio estado.',
  },
  {
    type: 'sz_g3k_on_entity_state_update',
    placement: 'loop-update',
    message0: 'Enquanto %1 do molde %2 estiver no estado %3, a cada quadro (tempo do quadro em %4)',
    args0: [
      { type: 'field_input', name: 'ITEM', text: 'ela' },
      { type: 'field_name_picker', name: 'MOLD', text: 'torre', kind: 'mold3d' },
      { type: 'field_name_picker', name: 'STATE', text: 'parado', kind: 'entitystate' },
      { type: 'field_input', name: 'DT', text: 'tempo' },
    ],
    message1: 'fazer %1',
    args1: [{ type: 'input_statement', name: 'BODY' }],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Roda a cada quadro para cada objeto do molde nesse estado (a torre procura no "parado" e gira no "mirar"). O último nome é o tempo deste quadro, em segundos.',
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
    tooltip: 'Roda quando o objeto sai desse estado (para arrumar o que ficou para trás).',
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
      'Muda o estado deste objeto: primeiro ele sai do velho, depois entra no novo. Pedir o estado em que ele já está não faz nada.',
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
    tooltip: 'Verdadeiro se o objeto está nesse estado agora. Use dentro de um "se".',
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
      'Troca de estado sozinho pelo tempo: quem fica tantos segundos nesse estado vai para o próximo. É o "recarregar → parado" da torre, sem cronômetro.',
  },
  {
    type: 'sz_g3k_state_time',
    message0: 'há quantos segundos %1 está no estado atual',
    args0: [{ type: 'field_name_picker', name: 'CHAR', text: 'ela', kind: 'entity3d' }],
    output: 'JSValue',
    colour: C,
    tooltip:
      'Há quanto tempo o objeto está no estado atual (zera quando ele muda). Bom para "depois de 2 segundos parado, atacar".',
  },
  {
    type: 'sz_g3k_state_of',
    message0: 'o estado de %1',
    args0: [{ type: 'field_name_picker', name: 'CHAR', text: 'ela', kind: 'entity3d' }],
    output: 'JSValue',
    colour: C,
    tooltip:
      'O nome do estado em que o objeto está agora (parado, mirar…). Bom para mostrar na tela ou para comparar.',
  },

  // ---- 🧠 Comportamento › Dados de cada um (a mesma cara do Jogo 3D) ----
  {
    type: 'sz_g3k_set_entity_value',
    placement: 'command',
    message0: 'guardar %1 em %2 do objeto %3',
    args0: [
      { type: 'input_value', name: 'VALUE', check: 'JSValue' },
      { type: 'field_input', name: 'KEY', text: 'tempo' },
      { type: 'field_name_picker', name: 'CHAR', text: 'ela', kind: 'entity3d' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Guarda um valor no objeto, com um nome: um cronômetro, quantos tiros deu, o alvo que escolheu. Cada objeto tem os seus, e tudo zera quando ele nasce. Leia com "… do objeto".',
  },
  {
    type: 'sz_g3k_entity_value',
    message0: '%1 do objeto %2',
    args0: [
      { type: 'field_input', name: 'KEY', text: 'tempo' },
      { type: 'field_name_picker', name: 'CHAR', text: 'ela', kind: 'entity3d' },
    ],
    output: 'JSValue',
    colour: C,
    tooltip: 'Lê o que esse objeto guardou com esse nome (vazio se ele nunca guardou nada).',
  },

  // ---- 🏆 Placar, vida e telas › Vida ----
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
      'Roda toda vez que um objeto desse molde é machucado. Leia a vida dele ali dentro para trocar a fase do chefão, piscar ou revidar.',
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
      'Roda quando a vida de um objeto desse molde chega a zero (pelo "Machucar"). Depois o motor o tira do jogo sozinho. Bom para somar pontos e tocar um som.',
  },
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
      'Tira vida do objeto. Depois de machucado ele pisca e fica meio segundo sem se machucar de novo. Com a vida no zero ele é derrotado e sai do jogo.',
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
      'Devolve vida ao objeto, sem passar da vida com que ele nasceu (ex.: pegou uma poção ou o chefão se recupera entre as fases).',
  },
  {
    type: 'sz_g3k_health_of',
    message0: 'a vida de %1',
    args0: [{ type: 'field_name_picker', name: 'CHAR', text: 'heroi', kind: 'entity3d' }],
    output: 'JSValue',
    colour: C,
    tooltip: 'Quanta vida o objeto tem agora.',
  },
  {
    type: 'sz_g3k_max_health_of',
    message0: 'a vida máxima de %1',
    args0: [{ type: 'field_name_picker', name: 'CHAR', text: 'ela', kind: 'entity3d' }],
    output: 'JSValue',
    colour: C,
    tooltip:
      'A vida com que o objeto nasceu. Junto com "a vida de", dá a proporção da barra de vida (vida ÷ vida máxima).',
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
      'Cada objeto desse molde ganha uma barrinha de vida sobre a cabeça, que acompanha ele e muda de cor quando a vida cai. Desligue para esconder.',
  },

  // ---- 🏆 Placar, vida e telas › Placar e falas (texto no canto e pontos vêm das regras) ----
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
      'Um balão de fala em cima da cabeça do objeto, que acompanha ele e some no fim do tempo. Uma fala por vez em cada objeto (falar de novo troca a fala).',
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

  // ---- 🎥 Câmera (escolher a câmera primeiro, depois ajustar; o tremor vem das regras) ----
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
      'Câmera em 3ª pessoa: fica atrás do objeto, com suavidade. Se ele virar, a câmera vai junto, por trás.',
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
      'Arraste o mouse para girar em volta do mundo e use a rodinha para aproximar. É a câmera com que o jogo começa.',
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
    tooltip: 'Vista de cima do mundo inteiro. Perfeita para defesa de torre e estratégia.',
  },
  {
    type: 'sz_g3k_camera_fps',
    placement: 'command',
    message0: 'Câmera: 1ª pessoa nos olhos de %1 (olhar com o mouse)',
    args0: [{ type: 'field_name_picker', name: 'CHAR', text: 'heroi', kind: 'entity3d' }],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Vê o mundo pelos olhos do objeto. Clique na tela para olhar em volta com o mouse; trocar de câmera ou pausar devolve o cursor. Junte com "Mover em 1ª pessoa".',
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
      'Gira a câmera de órbita sem esperar o mouse. Girar é em volta do mundo; inclinar vai de quase rente ao chão (5°) a quase de cima (80°).',
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
      'Aproxima ou afasta a câmera, na de órbita e na que segue alguém: perto numa conversa, longe na luta.',
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
      'A câmera de órbita (ou a de cima) gira em volta desse objeto em vez do meio do mundo. Num mundo grande, é o que acompanha o herói.',
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
      'Como o "olhar para", mas para um lugar fixo (a porta, a base, o portal). O ponto 0, 0, 0 volta a olhar para o meio do mundo.',
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
      'O quanto a câmera enxerga (o normal é 60°). Menos (30°) é zoom, como uma luneta; mais (100°) alarga tudo e dá sensação de velocidade.',
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
      'O quanto a câmera que segue gruda em quem ela segue: 1 vem devagar, com cara de cinema; 10 fica colada. O normal é 3.',
  },

  // ---- ✨ Luz, céu e faíscas › Luz e céu ----
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
      'Acende uma luz colorida num ponto (tocha, fogueira, lâmpada). Ponha no começo, não a cada quadro: o mundo aceita até 8 luzes a mais.',
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
      'O quanto o mundo inteiro é iluminado. Baixe para noite ou caverna (aí as suas luzes aparecem). Use no começo ou numa reação que acontece uma vez.',
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
      'O que está longe some na cor da névoa: dá mistério e esconde a borda do mundo. Use no começo ou numa reação que acontece uma vez.',
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
    tooltip: 'Muda o degradê do céu a qualquer hora (dia, pôr do sol, noite).',
  },
  {
    type: 'sz_g3k_set_sky_photo',
    placement: 'start-only-command',
    message0: 'Usar o céu 360° %1',
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
      'Troca o céu por uma foto 360° (um arquivo .hdr do projeto): ela aparece no fundo, ilumina o mundo e faz o metal refletir.',
  },

  // ---- ✨ Luz, céu e faíscas › Faíscas ----
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
    message1: 'tamanho %1 até %2, duração %3 s, gravidade %4',
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
      'A receita de uma explosão de faíscas: quantas, cores, quanto espalham, tamanho, duração e gravidade (negativa cai; positiva sobe, como fogo). Crie uma vez e solte quantas quiser.',
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
    tooltip: 'Estoura as faíscas do efeito nesse ponto do mundo.',
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
    tooltip: 'Estoura o efeito em cima de um objeto. Perfeito no "Quando … for derrotado".',
  },

  // ---- ✨ Luz, céu e faíscas › Jorro de faíscas ----
  {
    type: 'sz_g3k_define_emitter',
    placement: 'mold-declaration',
    message0: 'Criar o jorro de faíscas %1: cor %2 até %3, tamanho %4 até %5',
    args0: [
      { type: 'field_input', name: 'NAME', text: 'fogo' },
      { type: 'field_colour_sz', name: 'C1', colour: '#fde047' },
      { type: 'field_colour_sz', name: 'C2', colour: '#7f1d1d' },
      { type: 'input_value', name: 'S1', check: 'JSValue' },
      { type: 'input_value', name: 'S2', check: 'JSValue' },
    ],
    message1: '%1 por segundo, força %2, abertura %3°, gravidade %4, brilho %5',
    args1: [
      { type: 'input_value', name: 'RATE', check: 'JSValue' },
      { type: 'input_value', name: 'SPEED', check: 'JSValue' },
      { type: 'input_value', name: 'CONE', check: 'JSValue' },
      { type: 'input_value', name: 'GRAVITY', check: 'JSValue' },
      { type: 'field_checkbox', name: 'GLOW', checked: true },
    ],
    message2: 'jeito de nascer e sumir: %1',
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
      'A receita de um jorro sem parar (fogo, fumaça, rastro, magia): cores, tamanho, quantas por segundo, força, abertura (0° reto, 180° para todo lado), gravidade e brilho.',
  },
  {
    type: 'sz_g3k_start_emitter',
    placement: 'command',
    message0: 'Ligar o jorro %1 em x %2 y %3 z %4',
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
      'Liga o jorro num ponto fixo do mundo (uma fogueira, uma tocha na parede). Fica jorrando até você desligar.',
  },
  {
    type: 'sz_g3k_emitter_on',
    placement: 'command',
    message0: 'Ligar o jorro %1 em cima de %2',
    args0: [
      { type: 'field_name_picker', name: 'EFFECT', text: 'fogo', kind: 'effect3d' },
      { type: 'field_name_picker', name: 'WHO', text: 'ela', kind: 'entity3d' },
    ],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Liga o jorro seguindo um objeto: o rastro de fogo da nave, a fumaça do carro, a aura do herói. Ele vai junto aonde o objeto for.',
  },
  {
    type: 'sz_g3k_stop_emitter',
    placement: 'command',
    message0: 'Desligar o jorro %1',
    args0: [{ type: 'field_name_picker', name: 'EFFECT', text: 'fogo', kind: 'effect3d' }],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Para de soltar faíscas novas (as que estão no ar terminam sozinhas). Apaga todos os jorros dessa receita.',
  },
  {
    type: 'sz_g3k_add_attractor',
    placement: 'start-only-command',
    message0: 'Puxar as faíscas do jorro %1 para x %2 y %3 z %4',
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
      'Um ímã que puxa as faíscas para um ponto, como um redemoinho. Use uma vez, fora do "A cada quadro". Cada jorro aceita até 16 ímãs.',
  },

  // ---- ⏱️ Tempo, sorteio e som › Tempo (contagem e sorteio vêm das regras) ----
  {
    type: 'sz_g3k_on_update',
    placement: 'loop-update',
    message0: 'A cada quadro, guardando em %1 o tempo deste quadro (s)',
    args0: [{ type: 'field_input', name: 'DT', text: 'tempo' }],
    message1: 'fazer %1',
    args1: [{ type: 'input_statement', name: 'BODY' }],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Roda a cada quadro, só enquanto o jogo está em "jogando". O nome guarda quanto durou o quadro, em segundos: multiplique a velocidade por ele e o jogo anda igual em qualquer computador.',
  },
  {
    type: 'sz_g3k_set_seed',
    placement: 'command',
    message0: 'Deixar o sorteio repetível com o código %1',
    args0: [{ type: 'input_value', name: 'SEED', check: 'JSValue' }],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Com o mesmo código, o sorteio sai igual toda vez: mesmos enfeites, mesma ordem de inimigos. Bom para testar e para dar o mesmo desafio a todos. O código 0 volta ao sorteio de verdade.',
  },

  // ---- ⏱️ Tempo, sorteio e som › Som ----
  {
    type: 'sz_g3k_load_sound',
    placement: 'start-only-command',
    message0: 'Carregar o som %1 do arquivo %2',
    args0: [
      { type: 'field_input', name: 'NAME', text: 'explosao' },
      { type: 'field_sound_picker', name: 'SOUND', text: '' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Prepara um som que você importou (em "Sons", no menu ⋯) e dá um nome a ele. É esse nome que vai no "Tocar o som". Use no começo.',
  },
  {
    type: 'sz_g3k_play_music',
    placement: 'command',
    message0: 'Tocar a música %1 sem parar',
    args0: [{ type: 'field_name_picker', name: 'NAME', text: 'musica', kind: 'sound' }],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'A música de fundo, repetindo até você mandar parar. Carregue antes com "Carregar o som". Só uma música por vez: pedir outra troca.',
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
      'Toca um efeito sonoro já pronto (feito na hora pelo computador, sem importar arquivo). Ótimo para testar rápido.',
  },
  {
    type: 'sz_g3k_play_tone',
    placement: 'command',
    message0: 'Tocar uma nota de %1 Hz por %2 ms',
    args0: [
      { type: 'input_value', name: 'FREQ', check: 'JSValue' },
      { type: 'input_value', name: 'MS', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Toca uma nota: quanto maior o Hz, mais agudo. Vale de 20 a 20000 Hz, até 10 segundos, e no máximo 32 notas ao mesmo tempo.',
  },
  // ---- Lote 12 do review 3D: patrulhar, mochila, guardar o progresso e fases ----
  // 🏃 Movimento › Perseguir e mirar
  {
    type: 'sz_g3k_patrol',
    placement: 'command',
    message0: 'Fazer %1 patrulhar de x %2 z %3 até x %4 z %5 com velocidade %6',
    args0: [
      { type: 'field_name_picker', name: 'WHO', text: 'ela', kind: 'entity3d' },
      { type: 'input_value', name: 'AX', check: 'JSValue' },
      { type: 'input_value', name: 'AZ', check: 'JSValue' },
      { type: 'input_value', name: 'BX', check: 'JSValue' },
      { type: 'input_value', name: 'BZ', check: 'JSValue' },
      { type: 'input_value', name: 'SPEED', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Vai e volta entre dois pontos do chão, virado para onde anda, e para um pouquinho em cada ponta. Use a cada quadro ou num "Enquanto … estiver no estado".',
  },
  // 🏆 Placar, vida e telas › Mochila 🎒
  {
    type: 'sz_g3k_bag_give',
    placement: 'command',
    message0: 'Pôr %1 %2 na mochila 🎒',
    args0: [
      { type: 'input_value', name: 'N', check: 'JSValue' },
      { type: 'field_input', name: 'ITEM', text: 'chave' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Guarda itens na mochila (chave, moeda, cristal). Ela aparece no canto de baixo, à esquerda, continua de uma fase para a outra e esvazia quando a partida recomeça.',
  },
  {
    type: 'sz_g3k_bag_take',
    placement: 'command',
    message0: 'Tirar %1 %2 da mochila 🎒',
    args0: [
      { type: 'input_value', name: 'N', check: 'JSValue' },
      { type: 'field_name_picker', name: 'ITEM', text: 'chave', kind: 'item' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Tira itens da mochila (nunca fica negativo). Bom para gastar a chave na porta ou as moedas na loja.',
  },
  {
    type: 'sz_g3k_bag_count',
    message0: 'quantas %1 tem na mochila 🎒',
    args0: [{ type: 'field_name_picker', name: 'ITEM', text: 'chave', kind: 'item' }],
    output: 'JSValue',
    colour: C,
    tooltip: 'Quantos desse item estão na mochila agora (0 se nenhum).',
  },
  {
    type: 'sz_g3k_bag_has',
    message0: 'a mochila tem %1 ?',
    args0: [{ type: 'field_name_picker', name: 'ITEM', text: 'chave', kind: 'item' }],
    output: 'JSValue',
    colour: C,
    tooltip:
      'Verdadeiro quando há pelo menos um desse item na mochila. É o "se tem a chave, abre".',
  },
  {
    type: 'sz_g3k_bag_clear',
    placement: 'command',
    message0: 'Esvaziar a mochila 🎒',
    args0: [],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'Tira tudo da mochila. Recomeçar a partida já esvazia sozinho; trocar de fase não.',
  },
  // 🌍 Mundo, telas e estados › Fases
  {
    type: 'sz_g3k_on_level_start',
    placement: 'event',
    message0: 'Quando começar uma fase',
    args0: [],
    message1: 'fazer %1',
    args1: [{ type: 'input_statement', name: 'BODY' }],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Roda no começo da partida (fase 1) e a cada "Ir para a próxima fase". Monte a fase aqui: nascer o herói e os inimigos, a contagem. Use "o número da fase" para cada fase ser diferente.',
  },
  {
    type: 'sz_g3k_next_level',
    placement: 'command',
    message0: 'Ir para a próxima fase',
    args0: [],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Todos saem do jogo, a contagem e o nascer param, as luzes e jorros acesos na fase apagam e roda o "Quando começar uma fase". Pontos, mochila e as luzes de antes da fase 1 ficam.',
  },
  {
    type: 'sz_g3k_level',
    message0: 'o número da fase',
    args0: [],
    output: 'JSValue',
    colour: C,
    tooltip:
      'Em que fase o jogo está: 1 no começo da partida, 2 depois da primeira "próxima fase"…',
  },
  // 🌍 Mundo, telas e estados › Guardar o progresso
  {
    type: 'sz_g3k_save_value',
    placement: 'command',
    message0: 'Guardar %1 com o nome %2 neste computador',
    args0: [
      { type: 'input_value', name: 'VALUE', check: 'JSValue' },
      { type: 'field_input', name: 'NAME', text: 'recorde' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Guarda de verdade: fechar o jogo e abrir de novo, o valor continua lá. Bom para o recorde e a fase destravada. Guarde números e textos.',
  },
  {
    type: 'sz_g3k_saved_value',
    message0: 'o valor guardado %1 (ou %2)',
    args0: [
      { type: 'field_name_picker', name: 'NAME', text: 'recorde', kind: 'stored-value' },
      { type: 'input_value', name: 'FALLBACK', check: 'JSValue' },
    ],
    inputsInline: true,
    output: 'JSValue',
    colour: C,
    tooltip:
      'Lê o que foi guardado neste computador. Se nunca guardou nada com esse nome, devolve o valor do "ou".',
  },
] satisfies BlockDefinition[]

/**
 * Placar, telas prontas, fim de jogo, contagem, sorteio e tremor vêm da fábrica COMPARTILHADA
 * das regras de jogo 3D (`game3dRules/blocks.ts`), com a MESMA cara do Jogo 3D e do Mundo 3D.
 * A vida continua sendo a do Avançado (por objeto, com invencibilidade e derrota), então os
 * blocos de vida, piscar, recomeçar e os "Quando…" de tecla/clique/encostar ficam de fora.
 */
const GAME_KIT_THREE_D_RULES = gameRulesBlocks('g3k', {
  objectPicker: 'entity3d',
  groupPicker: 'mold3d',
  keys: THREE_KEY_OPTIONS,
  only: [
    'hud_text',
    'add_score',
    'score',
    'set_screen_text',
    'end_game',
    'start_timer',
    'time_left',
    'on_timer_end',
    'stop_timer',
    'random_between',
    'random_chance',
    'camera_shake',
  ],
})

// Sombras pré-preenchidas dos soquetes de VALOR que aparecem na paleta.
const txtShadow = (text: string) => ({ shadow: { type: 'sz_val_text', fields: { TEXT: text } } })
const numShadow = (value: number) => ({ shadow: { type: 'sz_val_number', fields: { NUM: value } } })
export const G3K_SOCKET_SHADOWS: Record<string, Record<string, unknown>> = {
  ...GAME_KIT_THREE_D_RULES.shadows,
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
  sz_g3k_anim_speed: { SPEED: numShadow(1) },
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
  sz_g3k_patrol: {
    AX: numShadow(-6),
    AZ: numShadow(0),
    BX: numShadow(6),
    BZ: numShadow(0),
    SPEED: numShadow(3),
  },
  sz_g3k_bag_give: { N: numShadow(1) },
  sz_g3k_bag_take: { N: numShadow(1) },
  sz_g3k_save_value: { VALUE: numShadow(0) },
  sz_g3k_saved_value: { FALLBACK: numShadow(0) },
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
  sz_g3k_say: { TEXT: txtShadow('Olá!'), SECONDS: numShadow(2) },
  sz_g3k_create_screen: {
    TITLE: txtShadow('Minha loja'),
    TEXT: txtShadow('Bem-vindo!'),
  },
  sz_g3k_add_button: { LABEL: txtShadow('Jogar de novo') },
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

// Cor, ordem e toolbox saem da árvore pura em `palette.ts` (ver `extensionPalette.ts`).
const GAME_KIT_THREE_D_PALETTE_VIEW = buildExtensionPalette({
  name: 'Jogo 3D Avançado',
  colour: C,
  tree: GAME_KIT_THREE_D_PALETTE,
  blocks: [...gameKit3DBlockDefinitions, ...GAME_KIT_THREE_D_RULES.blocks],
  shadows: G3K_SOCKET_SHADOWS,
  order: 'palette',
})

export const gameKit3DBlocks = GAME_KIT_THREE_D_PALETTE_VIEW.blocks

export const gameKit3DToolboxCategory: ExtensionToolboxCategory =
  GAME_KIT_THREE_D_PALETTE_VIEW.toolbox
