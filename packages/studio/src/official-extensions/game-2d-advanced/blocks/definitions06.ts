import type { BlockDefinition } from '../../../blockly/blocks/types'
import { GAME_KIT_COLOUR as C } from './shared'

export const gameKitBlockDefinitions06: BlockDefinition[] = [
  {
    type: 'sz_gk_on_turn_change',
    placement: 'event',
    message0: 'Quando a vez mudar',
    message1: 'fazer %1',
    args1: [{ type: 'input_statement', name: 'BODY' }],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Roda toda vez que "passar a vez" muda o jogador. Bom para anunciar de quem é a vez e reposicionar a câmera na peça dele.',
  },

  {
    type: 'sz_gk_move_along_track',
    placement: 'command',
    message0: 'Andar %1 %2 casas na trilha %3',
    args0: [
      { type: 'field_name_picker', name: 'WHO', text: 'peao', kind: 'character' },
      { type: 'input_value', name: 'SPACES', check: 'JSValue' },
      { type: 'field_name_picker', name: 'PATH', text: 'trilha', kind: 'path' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Anda a peça N casas pela trilha (cada "ponto" do caminho é uma casa) e PARA na casa. Avisa "casa:parou" e roda o "Quando um peão parar numa casa".',
  },

  {
    type: 'sz_gk_space_of',
    message0: 'a casa de %1',
    args0: [{ type: 'field_name_picker', name: 'WHO', text: 'peao', kind: 'character' }],
    output: 'JSValue',
    colour: C,
    tooltip:
      'Em qual casa a peça está (0 = a primeira). Use para ligar "se a casa de peao = 7: pague aluguel".',
  },

  {
    type: 'sz_gk_on_land_space',
    placement: 'event',
    message0: 'Quando um peão parar numa casa',
    message1: 'fazer %1',
    args1: [{ type: 'input_statement', name: 'BODY' }],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Roda quando qualquer peça termina de andar numa casa. Dentro, use "a casa de …" para saber onde parou e dar/tirar pontos, mandar voltar, etc.',
  },

  {
    type: 'sz_gk_pick_active',
    message0: 'o vivo do molde %1 com %2 %3',
    args0: [
      { type: 'field_name_picker', name: 'MOLD', text: 'inimigo', kind: 'mold' },
      {
        type: 'field_dropdown',
        name: 'MODE',
        options: [
          ['a maior', 'maior'],
          ['a menor', 'menor'],
        ],
      },
      {
        type: 'field_dropdown',
        name: 'PROP',
        options: [
          ['posição x', 'x'],
          ['posição y', 'y'],
          ['velocidade x', 'vx'],
          ['velocidade y', 'vy'],
          ['velocidade', 'speed'],
          ['largura', 'w'],
          ['altura', 'h'],
          ['vida', 'health'],
          ['vida máxima', 'maxHealth'],
          ['dano', 'damage'],
          ['progresso no caminho', 'pathProgress'],
        ],
      },
    ],
    output: 'JSValue',
    tooltip:
      'O vivo do molde com o MAIOR (ou menor) valor de uma propriedade. É como a torre escolhe o alvo "mais avançado no caminho", o mago escolhe o mais fraco, etc. Nada vivo = devolve nada.',
  },

  {
    type: 'sz_gk_parallax_layer',
    placement: 'command',
    message0: 'Pintar o fundo %1 preso à câmera (fator x %2 y %3)',
    args0: [
      { type: 'field_asset_picker', name: 'IMAGE', text: '' },
      { type: 'input_value', name: 'FX', check: 'JSValue' },
      { type: 'input_value', name: 'FY', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    tooltip:
      'Um fundo que acompanha a CÂMERA a um fator (0 = céu ao longe, quase parado; 1 = colado no mundo). Duas camadas com fatores diferentes = profundidade. (O "Pintar o fundo rolando" anda por velocidade, para tela fixa.)',
  },

  {
    type: 'sz_gk_sheet_burst',
    placement: 'command',
    message0: 'Estourar a folha %1 (%2 quadros, a %3 por s) em x %4 y %5 tamanho %6',
    args0: [
      { type: 'field_asset_picker', name: 'IMAGE', text: '' },
      { type: 'input_value', name: 'FRAMES', check: 'JSValue' },
      { type: 'input_value', name: 'FPS', check: 'JSValue' },
      { type: 'input_value', name: 'X', check: 'JSValue' },
      { type: 'input_value', name: 'Y', check: 'JSValue' },
      { type: 'input_value', name: 'SIZE', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    tooltip:
      'Toca uma folha de explosão UMA vez e some (a imagem tem os quadros lado a lado). É a explosão de spritesheet num bloco só. Sem precisar de molde nem de "Tocar uma vez".',
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
    placement: 'command',
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
    placement: 'command',
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
      'Um poder TEMPORÁRIO: acaba sozinho. Na hora de atirar, pergunte "o poder de tiro de…". Metralhadora = atire mais rápido (recarga menor); leque = "Atirar um leque".',
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
    placement: 'command',
    message0:
      'Invadir: onda do molde %1 com %2 colunas × %3 linhas (espaço %4 px), a %5 px/s: desce %6 px e acelera %7 % na borda',
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
      'A formação clássica: nasce em grade e o MOTOR marcha o bloco inteiro. Bate na borda, desce e acelera. Derrotar todos avisa "onda:limpa"; alcançar a linha avisa "onda:invadiu". Não mova os invasores você mesmo: a marcha é do motor.',
  },

  {
    type: 'sz_gk_nave_wave_shooter',
    placement: 'resource-creator',
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
      'A chuva de tiros da formação: um invasor SORTEADO atira (ligue 1 vez; religar troca o ritmo). O tiro nasce andando. Recolha com "Recolher quem saiu da tela" e trate o acerto com "Quando se tocarem".',
  },

  {
    type: 'sz_gk_nave_invasion_line',
    placement: 'command',
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
    placement: 'command',
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
    placement: 'command',
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
      'A bomba-prêmio: quica pela tela; quando o SEU tiro a recolher (no "Quando se tocarem": Recolher a bomba), o motor explode. Onda de choque + recolhe o molde-alvo no raio + avisa "bomba:acertou" por vítima (some os pontos lá). No máximo 3 no ar.',
  },

  // ==========================================================================
  // KIT LUTA — o atalho do gênero
  // ==========================================================================
  {
    type: 'sz_gk_luta_match',
    placement: 'command',
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
      'Casa os dois lutadores em uma partida de 1 a 9 rounds. Ponha DEPOIS de "Posicionar o personagem": é dali que sai o lugar onde cada um volta a cada round. Ganha quem levar a maioria (melhor de 3 = quem fizer 2).',
  },

  {
    type: 'sz_gk_luta_fighter',
    placement: 'command',
    message0: 'Lutador %1: andar %2 %3, pular %4, agachar %5',
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
      'Faz TUDO: gravidade, andar, pular, agachar, defender. E virar de frente sozinho. Cada lutador tem as teclas DELE, então dois destes = dois jogadores no mesmo teclado. Use no "A cada quadro".',
  },

  {
    type: 'sz_gk_luta_ai',
    placement: 'command',
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
      'Põe no LUGAR do bloco "Lutador" daquele lutador. Trocar um pelo outro é a diferença entre jogar sozinho e jogar com um amigo. Fácil quase não defende; difícil defende quase sempre, espera você errar o golpe e usa o especial quando a barra enche.',
  },

  {
    type: 'sz_gk_luta_move',
    placement: 'command',
    message0: 'Golpe %1 de %2: %3, dano %4, alcance %5',
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
      'A palavra escolhe o RITMO do golpe: rápido sai antes mas machuca pouco; pesado demora, mas se acertar o outro fica travado tempo bastante para você emendar outro golpe. É assim que nasce o combo. "Atravessa a defesa" vence quem só fica defendendo.',
  },

  {
    type: 'sz_gk_luta_move_anim',
    placement: 'command',
    message0: 'A animação do golpe %1 de %2 são os quadros %3 a %4',
    args0: [
      { type: 'field_name_picker', name: 'NAME', text: 'soco', kind: 'fight-move' },
      { type: 'field_name_picker', name: 'WHO', text: 'jogador1', kind: 'character' },
      { type: 'input_value', name: 'FROM', check: 'JSValue' },
      { type: 'input_value', name: 'TO', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    tooltip:
      'Os quadros da folha que tocam durante o golpe. A velocidade é calculada para a animação durar exatamente o golpe. Você não precisa acertar nenhum número.',
  },

  {
    type: 'sz_gk_luta_attack',
    placement: 'command',
    message0: 'Fazer %1 dar o golpe %2',
    args0: [
      { type: 'field_name_picker', name: 'WHO', text: 'jogador1', kind: 'character' },
      { type: 'field_name_picker', name: 'MOVE', text: 'soco', kind: 'fight-move' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    tooltip:
      'Use junto com "se a tecla foi apertada". Não sai se ele estiver travado, já golpeando, ou se for o especial e a barra não estiver cheia.',
  },

  {
    type: 'sz_gk_luta_draw_hud',
    placement: 'command',
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
      'A barra de especial. Enche batendo e apanhando (defender não enche), e ATRAVESSA os rounds. Por isso o último round é o mais tenso.',
  },

  {
    type: 'sz_gk_luta_is_guarding',
    message0: 'o lutador %1 está defendendo?',
    args0: [{ type: 'field_name_picker', name: 'WHO', text: 'jogador1', kind: 'character' }],
    output: 'JSValue',
    tooltip: 'Verdadeiro enquanto ele segura a tecla de defender. Bom para som e faísca.',
  },

  // ==========================================================================
  // 🏰 KIT DEFESA DE TORRE — o atalho do gênero (tower defense)
  // ==========================================================================
  // Pela REGRA: só o ESPECÍFICO do gênero mora aqui. O caminho e o alvo "mais
  // avançado" já são GERAIS (🛤️ Caminhos + "o vivo do molde com maior…"); o
  // tiro da torre, a barra de vida, os corações e a explosão saem de blocos
  // gerais (a receita está nas docs). SÓ existe em tower defense: o LUGAR de
  // torre (a grade de compra sob o mouse), a compra que valida moeda+lugar, a
  // ONDA que nasce espaçada pelo caminho e a carteira de moedas.
  {
    type: 'sz_gk_td_slot',
    placement: 'start-only-command',
    message0: 'Marcar um lugar de torre em x %1 y %2, tamanho %3',
    args0: [
      { type: 'input_value', name: 'X', check: 'JSValue' },
      { type: 'input_value', name: 'Y', check: 'JSValue' },
      { type: 'input_value', name: 'SIZE', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    tooltip:
      'Um lugar onde cabe uma torre (faça no "Preparar"). A criança clica nele para comprar. Marque vários flanqueando o caminho.',
  },

  {
    type: 'sz_gk_td_draw_slots',
    placement: 'command',
    message0: 'Desenhar os lugares de torre (o livre sob o mouse acende)',
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    tooltip:
      'Mostra os lugares livres (o de baixo do mouse fica mais forte, convidando ao clique). Os ocupados não aparecem. Use no "Ao desenhar".',
  },

  {
    type: 'sz_gk_td_on_buy',
    placement: 'event',
    userGesture: true,
    message0: 'Quando clicar num lugar livre, pagando %1 moedas: com o lugar em x %2 y %3:',
    args0: [
      { type: 'input_value', name: 'COST', check: 'JSValue' },
      { type: 'field_input', name: 'PX', text: 'lugarX' },
      { type: 'field_input', name: 'PY', text: 'lugarY' },
    ],
    message1: 'fazer %1',
    args1: [{ type: 'input_statement', name: 'BODY' }],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    tooltip:
      'Toda vez que a criança clica num lugar livre e tem moedas: cobra o preço, ocupa o lugar e roda o "fazer" com o centro dele em lugarX/lugarY (nasça a torre aí). Sem moedas, avisa "compra:negada" e nada acontece.',
  },

  {
    type: 'sz_gk_td_free_slot',
    placement: 'command',
    message0: 'Liberar o lugar de torre em x %1 y %2',
    args0: [
      { type: 'input_value', name: 'X', check: 'JSValue' },
      { type: 'input_value', name: 'Y', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    tooltip:
      'Solta o lugar que contém esse ponto (a torre foi vendida ou destruída), deixando comprar de novo ali.',
  },

  {
    type: 'sz_gk_td_draw_range',
    placement: 'command',
    message0: 'Desenhar o alcance de %1 (raio %2)',
    args0: [
      { type: 'field_name_picker', name: 'WHO', text: 'torre', kind: 'character' },
      { type: 'input_value', name: 'RADIUS', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    tooltip:
      'Um círculo suave mostrando até onde a torre acerta. Bom para desenhar sob a torre que o mouse está tocando.',
  },

  {
    type: 'sz_gk_td_wave',
    placement: 'command',
    message0: 'Invadir pelo caminho %1: %2 inimigos do molde %3, %4 px entre eles, a %5 px/s',
    args0: [
      { type: 'field_name_picker', name: 'PATH', text: 'trilha', kind: 'path' },
      { type: 'input_value', name: 'COUNT', check: 'JSValue' },
      { type: 'field_name_picker', name: 'MOLD', text: 'invasor', kind: 'mold' },
      { type: 'input_value', name: 'GAP', check: 'JSValue' },
      { type: 'input_value', name: 'SPEED', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    tooltip:
      'Solta uma fila de inimigos entrando pelo começo do caminho, espaçados, andando até o fim. Chegou algum ao fim? Avisa "invasor:passou". Acabou a onda? Avisa "onda:limpa" (aí solte a próxima, maior).',
  },

  {
    type: 'sz_gk_td_set_coins',
    placement: 'resource-creator',
    message0: 'Começar com %1 moedas',
    args0: [{ type: 'input_value', name: 'N', check: 'JSValue' }],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    tooltip:
      'Enche a carteira no início (e no "Jogar de novo" a economia volta a esse valor). Use no "Preparar".',
  },

  {
    type: 'sz_gk_td_add_coins',
    placement: 'command',
    message0: 'Ganhar %1 moedas',
    args0: [{ type: 'input_value', name: 'N', check: 'JSValue' }],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    tooltip:
      'Soma moedas à carteira (por inimigo derrotado, por onda vencida…). Um número negativo GASTA moedas.',
  },

  {
    type: 'sz_gk_td_coins',
    message0: 'as moedas',
    output: 'JSValue',
    tooltip:
      'Quantas moedas a criança tem agora. Mostre no placar e teste antes de deixar comprar.',
  },
]
