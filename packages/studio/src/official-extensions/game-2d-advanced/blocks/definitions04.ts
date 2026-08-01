import type { BlockDefinition } from '../../../blockly/blocks/types'
import { GAME_KIT_COLOUR as C } from './shared'

export const gameKitBlockDefinitions04: BlockDefinition[] = [
  {
    type: 'sz_gk_cards_on_turn',
    placement: 'event',
    message0: 'Quando começar o meu turno',
    message1: 'fazer %1',
    args1: [{ type: 'input_statement', name: 'BODY' }],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Roda no começo de cada turno seu (a energia e o escudo já resetaram). É aqui que você COMPRA a mão (mover N cartas do baralho para a mão; rebaralhar se acabou).',
  },

  {
    type: 'sz_gk_cards_end_turn',
    placement: 'command',
    message0: 'Passar o turno',
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Termina o seu turno: roda o "Quando for a vez do inimigo" e volta para você (novo turno).',
  },

  {
    type: 'sz_gk_cards_draw_hud',
    placement: 'command',
    message0: 'Desenhar o painel da batalha de cartas',
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Desenha as barras de vida (sua e do inimigo), a energia, o escudo e a INTENÇÃO do inimigo. Use no "Desenhar por cima (HUD)"; desenhe a mão no mesmo lugar com "Desenhar a pilha".',
  },

  {
    type: 'sz_gk_cards_hero_life',
    message0: 'a minha vida (na batalha de cartas)',
    output: 'JSValue',
    colour: C,
    tooltip: 'Sua vida na batalha. Vida ≤ 0 = você perdeu (Terminar o jogo).',
  },

  {
    type: 'sz_gk_cards_enemy_life',
    message0: 'a vida do inimigo (na batalha de cartas)',
    output: 'JSValue',
    colour: C,
    tooltip: 'A vida do inimigo. ≤ 0 = você venceu (Mudar o estado para vitória).',
  },

  {
    type: 'sz_gk_cards_hurt_enemy',
    placement: 'command',
    message0: 'Tirar %1 de vida do inimigo',
    args0: [{ type: 'input_value', name: 'N', check: 'JSValue' }],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'O dano de uma carta de ataque. Use dentro do "o que a carta faz".',
  },

  {
    type: 'sz_gk_cards_hurt_me',
    placement: 'command',
    message0: 'Tirar %1 da minha vida (o escudo absorve)',
    args0: [{ type: 'input_value', name: 'N', check: 'JSValue' }],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'O dano do inimigo em você. O ESCUDO absorve primeiro, o resto tira vida. Use no "Quando for a vez do inimigo" para resolver a intenção de ataque.',
  },

  {
    type: 'sz_gk_cards_gain_block',
    placement: 'command',
    message0: 'Ganhar %1 de escudo',
    args0: [{ type: 'input_value', name: 'N', check: 'JSValue' }],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'O escudo (block) apara o próximo dano do inimigo. Some no começo do seu turno, como no gênero. É o efeito das cartas de defesa.',
  },

  {
    type: 'sz_gk_cards_enemy_intent',
    placement: 'command',
    message0: 'O inimigo vai %1 de %2 no próximo turno',
    args0: [
      { type: 'field_input', name: 'ACTION', text: 'atacar' },
      { type: 'input_value', name: 'VALUE', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Anuncia (telegrafa) o que o inimigo VAI fazer. O segredo do gênero: você vê o ataque vindo e se prepara. A ação é uma palavra que VOCÊ inventa (atacar, defender…).',
  },

  {
    type: 'sz_gk_cards_intent_action',
    message0: 'o que o inimigo vai fazer',
    output: 'JSValue',
    colour: C,
    tooltip:
      'A palavra da intenção (a que você anunciou). Teste no "Quando for a vez do inimigo": "se = atacar: tirar a minha vida".',
  },

  {
    type: 'sz_gk_cards_intent_value',
    message0: 'de quanto é a intenção do inimigo',
    output: 'JSValue',
    colour: C,
    tooltip: 'O número da intenção (o dano/escudo que o inimigo vai fazer).',
  },

  {
    type: 'sz_gk_cards_on_enemy_turn',
    placement: 'event',
    message0: 'Quando for a vez do inimigo',
    message1: 'fazer %1',
    args1: [{ type: 'input_statement', name: 'BODY' }],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Roda quando você passa o turno: RESOLVA a intenção telegrafada (ex.: "se o inimigo vai atacar: tirar a minha vida do valor dele") e ANUNCIE a próxima com "O inimigo vai…".',
  },

  {
    type: 'sz_gk_collide_tilemap',
    placement: 'command',
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
      'O personagem PARA nas peças sólidas do mapa (chão, parede, teto). Empurra pelo lado de menor sobreposição, zera a velocidade daquele eixo e marca "no chão" ao pousar. É o PASSO 3 da receita. Ponha depois de mover.',
  },

  {
    type: 'sz_gk_collide_group',
    placement: 'command',
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
      'O mesmo que colidir com o mapa, mas contra os vivos de um molde (plataformas, caixas, pedras). Sem precisar de mapa nenhum.',
  },

  {
    type: 'sz_gk_overlap_groups',
    placement: 'loop-command',
    bodyExecution: 'sync-callback',
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
    placement: 'loop-periodic',
    migration: 'lift-periodic-loop',
    message0: 'A cada %1 s, fazer %2',
    args0: [
      { type: 'input_value', name: 'SECS', check: 'JSValue' },
      { type: 'input_statement', name: 'BODY', check: 'JSStmt' },
    ],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Repete de tempo em tempo (nascer inimigo, piscar). Conta o tempo do JOGO: se pausar, para de contar. Um relógio de parede erraria.',
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
      'O "recarregando" do tiro e do golpe: verdadeiro só quando o tempo passou. E já reinicia a contagem sozinho.',
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
    placement: 'command',
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
    placement: 'command',
    message0: 'Quebrar a peça do mapa %1 onde %2 está',
    args0: [
      { type: 'field_name_picker', name: 'MAP', text: 'mundo', kind: 'tilemap' },
      { type: 'field_name_picker', name: 'WHO', text: 'heroi', kind: 'character' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'Apaga a peça que está no centro do personagem. O mundo destrutível (cavar, minerar).',
  },

  {
    type: 'sz_gk_set_tile_size',
    placement: 'command',
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
    placement: 'command',
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
      'Escreve qualquer coisa do personagem. Mudar x/y aqui é um TELEPORTE (porta, cano). O motor cuida para a colisão não arrastar de volta.',
  },

  {
    type: 'sz_gk_set_facing',
    placement: 'command',
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
    placement: 'resource-creator',
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
    placement: 'command',
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
      'Tudo-em-um do plataforma: gravidade + andar com as setas (ou A/D) + pular (espaço, W ou ↑) + mover. Com o pulo GOSTOSO já embutido (coyote, buffer e pulo variável). Ponha no "A cada quadro" e, LOGO DEPOIS, o bloco de colidir com o mapa (ou com o enxame): é a ordem de verdade.',
  },

  {
    type: 'sz_gk_plat_jump_feel',
    placement: 'command',
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
    placement: 'command',
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
    placement: 'command',
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
      'Encostado numa parede e caindo, o herói escorrega devagarzinho em vez de despencar. Ponha depois do "Herói de plataforma". E o bloco de colidir é quem descobre a parede.',
  },

  {
    type: 'sz_gk_plat_wall_jump',
    placement: 'command',
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
    placement: 'command',
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
    placement: 'command',
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
    placement: 'command',
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
    placement: 'command',
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
    placement: 'command',
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
    placement: 'command',
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
    placement: 'command',
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
      'O inimigo anda para um lado e VIRA ao bater numa parede. Quem manda virar é a colisão, então ele nunca trava na quina. Use dentro do "para cada vivo", com o bloco de colidir logo depois.',
  },

  {
    type: 'sz_gk_plat_checkpoint',
    placement: 'command',
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
    placement: 'command',
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
    placement: 'command',
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
      'Diz quais quadros da folha valem para cada estado do herói. Faça um destes por estado, no comecinho. Depois o "Animar o herói" troca sozinho.',
  },

  {
    type: 'sz_gk_plat_anim',
    placement: 'command',
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
    placement: 'start-only-command',
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
      'De 0 a 100. É o segredo do encontro na grama alta: "se MAIS DA METADE do herói estiver no mato". Só encostar a quina não conta. E é isso que faz o jogo parecer justo.',
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
    placement: 'command',
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
    placement: 'command',
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
      'O par do "Girar para X graus". Aquele só vira o DESENHO, este faz ANDAR de verdade. Use os dois com o mesmo ângulo e você tem o tanque, a nave, o Asteroids.',
  },

  {
    type: 'sz_gk_set_opacity',
    placement: 'command',
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
    placement: 'resource-creator',
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
    placement: 'resource-creator',
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
      'Muda QUALQUER propriedade suavemente (crescer, encolher, drenar a vida, sumir). Ao terminar sai o aviso "deslizou:chegou". Dá para encadear um movimento no outro.',
  },

  {
    type: 'sz_gk_set_hitbox',
    placement: 'command',
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
      'A caixa que COLIDE não precisa ser o desenho todo. Num personagem alto, deixe só os PÉS colidirem (ex.: y 52, altura 16). Senão ele encosta nas paredes com a cabeça. Largura/altura 0 = usar o desenho inteiro.',
  },

  {
    // Irmão do "Caixa de colisão de …": lá se escolhe o TAMANHO, aqui a FORMA.
    type: 'sz_gk_set_hitbox_shape',
    placement: 'command',
    message0: 'Caixa de colisão de %1: forma %2, raio %3',
    args0: [
      { type: 'field_name_picker', name: 'WHO', text: 'heroi', kind: 'character' },
      {
        type: 'field_dropdown',
        name: 'SHAPE',
        options: [
          ['redonda', 'circulo'],
          ['quadrada', 'retangulo'],
        ],
      },
      { type: 'input_value', name: 'RADIUS', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Bicho redondo (bola, bolha, moeda) fica mais justo com a caixa REDONDA: o canto vazio do quadrado deixa de encostar. Vale para encostar, para o par que se encosta, para o golpe, para pisar e para o clique; o empurrão em parede, chão e tiles continua quadrado. Raio 0 = o motor calcula pelo tamanho.',
  },

  {
    // O par do "Caixa de colisão de …": definir a caixa e VER a caixa. Chave
    // GERAL porque na gk quem desenha é o motor, e tiros/inimigos de molde não
    // têm nome para apontar um a um.
    type: 'sz_gk_show_hitboxes',
    placement: 'start-only-command',
    message0: 'Mostrar as caixas de colisão',
    args0: [],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Contorna de verde a caixa que COLIDE de tudo que está vivo: herói, inimigos, tiros e o que nasce de molde. É como conferir se a caixa está no lugar certo (por exemplo, só nos pés). Para tirar, apague o bloco.',
  },

  {
    type: 'sz_gk_fade_screen',
    placement: 'command',
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
      'A tela vai ficando preta (ou volta). O truque de todo jogo: ESCONDER a troca de cena atrás do escuro. Escureça, troque tudo, clareie.',
  },

  {
    type: 'sz_gk_flash_screen',
    placement: 'command',
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
    placement: 'command',
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
    args0: [{ type: 'field_name_picker', name: 'NAME', text: 'recorde', kind: 'stored-value' }],
    output: 'JSValue',
    colour: C,
    tooltip: 'Lê o que você guardou. Nunca guardou nada com esse nome? Devolve 0.',
  },

  {
    type: 'sz_gk_play_music',
    placement: 'command',
    message0: 'Tocar a música %1 sem parar',
    args0: [{ type: 'field_name_picker', name: 'SOUND', text: 'trilha', kind: 'sound' }],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Toca em LOOP (acabou, começa de novo). É a trilha do jogo. Chamar de novo NÃO reinicia. Use "Parar o som" para trocar de música.',
  },
]
