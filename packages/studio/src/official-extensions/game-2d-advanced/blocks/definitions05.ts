import type { BlockDefinition } from '../../../blockly/blocks/types'
import { GAME_KIT_COLOUR as C } from './shared'

export const gameKitBlockDefinitions05: BlockDefinition[] = [
  {
    type: 'sz_gk_stop_sound',
    placement: 'command',
    message0: 'Parar o som %1',
    args0: [{ type: 'field_name_picker', name: 'SOUND', text: 'trilha', kind: 'sound' }],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'Para e volta ao começo. Use antes de tocar outra música.',
  },

  {
    type: 'sz_gk_set_volume',
    placement: 'command',
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
    placement: 'start-only-command',
    message0: 'Criar o mapa de peças vazio %1: %2 colunas × %3 linhas, peça %4, folha %5',
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
      'Um mapa de até 512 × 512 peças feito por CÓDIGO, não desenhado. É assim que se faz masmorra sorteada e mundo gerado. Depois use "Trocar a peça" num laço para cavar os corredores. Peça -1 = vazio.',
  },

  {
    type: 'sz_gk_move_with_custom_keys',
    placement: 'command',
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
      'O "Mover pelas teclas" usa WASD E as setas no MESMO personagem. Com este você escolhe as teclas e tem DOIS jogadores. Ganha a diagonal certinha de graça.',
  },

  // ==========================================================================
  // 👾 KIT MONSTRINHOS — o atalho do gênero "pegue e treine bichinhos".
  // ⭐ A TESE: este jogo É um jogo do Kit RPG com OUTRA batalha. O mundo (grade,
  // NPC, fala, mapa, flags, salvar) JÁ existe — aqui só entram as criaturas, os
  // encontros e a batalha criatura-vs-criatura.
  // ==========================================================================
  {
    type: 'sz_gk_pkm_creature',
    placement: 'start-only-command',
    message0:
      'Criar a criatura %1 do tipo %2: vida %3, força %4, defesa %5, velocidade %6, imagem %7, aparência %8',
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
      'Os DADOS de uma espécie. Os pontos são do NÍVEL 1; cada nível dá +8 de vida, +2 de força e +1 de defesa. O TIPO você inventa (fogo, gelo, doce, dinossauro…). Sem imagem nem aparência, vira um retângulo. Use uma vez por bicho.',
  },

  {
    type: 'sz_gk_pkm_move',
    placement: 'start-only-command',
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
      'Um golpe da criatura (até 4 por bicho). O TIPO dele é quem enfrenta a tabela de tipos. Acerto 100 = nunca erra; 70 = erra às vezes. Golpe forte com acerto baixo é o risco que vale a pena. O efeito é a animação.',
  },

  {
    type: 'sz_gk_pkm_type_chart',
    placement: 'start-only-command',
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
      'VOCÊ inventa a regra: 2 = super efetivo, 0.5 = fraquinho, 0 = não teve efeito. Três destes fazem o triângulo clássico (fogo > planta > água > fogo). E aí a batalha vira ESCOLHER o golpe certo, que é a graça do gênero. Sem tabela, todo golpe vale 1×.',
  },

  {
    type: 'sz_gk_pkm_evolve',
    placement: 'start-only-command',
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
      'Ao subir para esse nível, a criatura VIRA outra espécie. Mantendo o nível e a experiência dela. O jogo anuncia "está evoluindo!" sozinho.',
  },

  {
    type: 'sz_gk_pkm_catch_difficulty',
    placement: 'start-only-command',
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
    placement: 'command',
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
    placement: 'command',
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
      'A força é a chance base de pegar. 60 é a bola comum; 100 é a bola mestra (pega quase sempre). A mochila guarda até 999 bolas. Bola melhor = recompensa/loja = progressão.',
  },

  {
    type: 'sz_gk_pkm_heal_team',
    placement: 'command',
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
    placement: 'command',
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
    placement: 'resource-creator',
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
      'O retângulo de mato onde os bichos aparecem, em CÉLULAS da grade (como o "Bloquear a célula"). Monte dentro do "Quando entrar no mapa" e cada mapa tem a sua grama.',
  },

  {
    type: 'sz_gk_pkm_grass_tiles',
    placement: 'resource-creator',
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
      'Desenhou o mato no Pinta? Diga QUAL peça é grama e ela vira mato em todo o mapa. Sem marcar célula por célula.',
  },

  {
    type: 'sz_gk_pkm_wild',
    placement: 'resource-creator',
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
      'Um destes por bicho = a tabela de encontros (todos com a mesma chance). Monte no "Quando entrar no mapa" e cada rota tem os bichos dela.',
  },

  {
    type: 'sz_gk_pkm_encounter_rate',
    placement: 'start-only-command',
    message0: 'Chance de encontro na grama: %1 % (a cada passo)',
    args0: [{ type: 'input_value', name: 'PCT', check: 'JSValue' }],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'O sorteio acontece a cada PASSO na grama, como no jogo de verdade. Dá para sentir. 20% é o normal; 100% é para testar.',
  },

  {
    type: 'sz_gk_pkm_battle_wild',
    placement: 'command',
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
      'A grama chama isto sozinha. Use direto para o LENDÁRIO ou dentro de uma cena. Quem luta é a sua criatura, não você.',
  },

  {
    type: 'sz_gk_pkm_battle_trainer',
    placement: 'command',
    bodyExecution: 'sync-callback',
    bodyContext: 'trainer-team',
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
    placement: {
      root: [],
      nested: ['trainer-team'],
      directNested: true,
      role: 'command',
    },
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
    placement: 'command',
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
      'Verdadeiro quando a área do golpe encosta no alvo. E só UMA vez por golpe (não machuca 60 vezes por segundo). Padrão: "se o golpe de heroi acertou inimigo: machucar o inimigo".',
  },

  {
    type: 'sz_gk_patrol_around',
    placement: 'command',
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
    placement: 'command',
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
      'Desenha até 100 corações (os cheios = vida atual, os apagados = vida que falta). É a "vidinha" dos jogos de aventura. Fica ótimo no "Desenhar por cima (HUD)".',
  },

  // ---- 🥷 Ação: a JANELA do golpe (recuo + ativo) ----
  {
    type: 'sz_gk_swing_window',
    placement: 'command',
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
    placement: 'command',
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
    placement: 'command',
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
    placement: 'start-only-command',
    message0: 'Animação de %1 no estado %2: quadros %3 a %4, %5 por segundo, uma vez? %6',
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
      'Diga uma vez qual animação é de cada estado; o "Animar sozinho" troca na hora certa. Marque a caixinha para tocar uma vez e parar no último quadro. Para impedir que outro estado interrompa, use "Pôr no estado por N segundos".',
  },

  {
    type: 'sz_gk_state_look',
    placement: 'command',
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
    placement: 'command',
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
    placement: 'command',
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
      'SOMA velocidade no ângulo, em vez de trocar. É isso que dá INÉRCIA: a nave continua andando depois que você solta. Use no "A cada quadro": a força é por segundo (px/s²). (O "Mover no ângulo" apaga a velocidade de antes.)',
  },

  {
    type: 'sz_gk_apply_friction',
    placement: 'command',
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
    placement: 'resource-creator',
    bodyExecution: 'deferred-callback',
    message0: 'Esperar %1 segundos e então',
    args0: [{ type: 'input_value', name: 'SECS', check: 'JSValue' }],
    message1: '%1',
    args1: [{ type: 'input_statement', name: 'DO', check: 'JSStmt' }],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    tooltip:
      'Faz o que estiver dentro DEPOIS do tempo, uma vez só. Use na preparação, num evento ou numa função; não dentro de um laço. ("A cada N segundos" repete para sempre.) Conta no relógio do jogo: se pausar, para de contar.',
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
    args0: [{ type: 'field_name_picker', name: 'NAME', text: 'madeira', kind: 'item' }],
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
      'Sorteia um dos vivos do molde (ou nada, se não houver nenhum). É como o jogo de nave escolhe qual inimigo atira. E serve para prêmio surpresa e horda.',
  },

  {
    type: 'sz_gk_float_text',
    placement: 'command',
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
      'Um texto que sobe e some sozinho. O "+100" de todo arcade. Solte na posição de quem morreu; para pontos, junte "+" com a variável.',
  },

  {
    type: 'sz_gk_trail_on',
    placement: 'resource-creator',
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
    placement: 'command',
    message0: 'Desligar o rastro de %1',
    args0: [{ type: 'field_name_picker', name: 'WHO', text: 'nave', kind: 'character' }],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    tooltip: 'Para o rastro contínuo daquele personagem.',
  },

  {
    type: 'sz_gk_shockwave',
    placement: 'command',
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
      'Um círculo que cresce e some. A cara de explosão grande. É SÓ desenho: para machucar, use "para cada vivo" + "a distância entre" + "machucar" (a regra é sua).',
  },

  {
    type: 'sz_gk_scroll_image',
    placement: 'command',
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
    placement: 'resource-creator',
    message0: 'Inclinar %1 ao andar de lado (até %2 graus)',
    args0: [
      { type: 'field_name_picker', name: 'WHO', text: 'nave', kind: 'character' },
      { type: 'input_value', name: 'DEG', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    tooltip:
      'O desenho tomba suavemente na direção do movimento. A nave que "deita" ao desviar, o peixe, o carro. Ligue UMA vez; 0 graus desliga.',
  },

  {
    type: 'sz_gk_fan_shot',
    placement: 'command',
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
  // 🛤️ R25 — Caminhos (waypoints) + escolher-vivo + paralaxe + folha one-shot
  // ==========================================================================
  {
    // O container (declara o NOME — segue field_input, regra de ouro). Espelho
    // do "Menu de escolha": os "ponto" viram a polilinha.
    type: 'sz_gk_define_path',
    placement: 'start-only-command',
    bodyExecution: 'sync-callback',
    bodyContext: 'path-builder',
    message0: 'Criar o caminho %1, passando pelos pontos:',
    args0: [{ type: 'field_input', name: 'NAME', text: 'trilha' }],
    message1: 'fazer %1',
    args1: [{ type: 'input_statement', name: 'BODY' }],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    tooltip:
      'Desenha uma trilha nomeada com uma lista de pontos (ponha blocos "ponto" dentro). O inimigo de defesa de torre, a patrulha, o NPC num trilho de cutscene seguem por ela. Os pontos podem ficar fora da tela.',
  },

  {
    type: 'sz_gk_path_point',
    placement: {
      root: [],
      nested: ['path-builder'],
      directNested: true,
      role: 'command',
    },
    message0: 'ponto x %1 y %2',
    args0: [
      { type: 'input_value', name: 'X', check: 'JSValue' },
      { type: 'input_value', name: 'Y', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    tooltip: 'Um ponto do caminho. Use DENTRO de "Criar o caminho".',
  },

  {
    type: 'sz_gk_follow_path',
    placement: 'command',
    message0: 'Fazer %1 seguir o caminho %2 a %3 px/s, usando o tempo %4',
    args0: [
      { type: 'field_name_picker', name: 'WHO', text: 'item', kind: 'character' },
      { type: 'field_name_picker', name: 'PATH', text: 'trilha', kind: 'path' },
      { type: 'input_value', name: 'SPEED', check: 'JSValue' },
      { type: 'field_name_picker', name: 'DT', text: 'dt', kind: 'variable' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    tooltip:
      'Anda pela trilha, ponto a ponto (use no "A cada quadro", dentro do "para cada vivo"). Chegou ao fim? Avisa "caminho:fim" e para. Para saber SE chegou, teste "o progresso … no caminho = 100".',
  },

  {
    type: 'sz_gk_path_progress',
    message0: 'o progresso de %1 no caminho (0 a 100)',
    args0: [{ type: 'field_name_picker', name: 'WHO', text: 'item', kind: 'character' }],
    output: 'JSValue',
    tooltip:
      'Quanto do caminho aquele personagem já andou, de 0 (começo) a 100 (fim). 0 se ele não segue caminho nenhum.',
  },

  // ---- 🎲 R30: jogos de TABULEIRO (dado + ordem de turno + trilha de casas) ----
  {
    type: 'sz_gk_roll_dice',
    message0: 'rolar um dado de %1 lados',
    args0: [{ type: 'input_value', name: 'FACES', check: 'JSValue' }],
    inputsInline: true,
    output: 'JSValue',
    colour: C,
    tooltip:
      'Sorteia um número de 1 até o número de lados (um dado de 6 dá 1 a 6). O coração dos jogos de tabuleiro: role e ande esse tanto de casas.',
  },

  {
    type: 'sz_gk_players_setup',
    placement: 'start-only-command',
    message0: 'começar com %1 jogadores',
    args0: [{ type: 'input_value', name: 'N', check: 'JSValue' }],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Prepara a ordem de turno para N jogadores (a vez começa no jogador 1). Use no "Preparar". Depois "passar a vez" roda o rodízio 1 → 2 → … → 1.',
  },

  {
    type: 'sz_gk_current_player',
    message0: 'o jogador da vez',
    output: 'JSValue',
    colour: C,
    tooltip:
      'De quem é a vez agora (1, 2, 3…). Use para mostrar "Vez do jogador X" e para decidir quem move a peça.',
  },

  {
    type: 'sz_gk_next_player',
    placement: 'command',
    message0: 'passar a vez',
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Passa para o próximo jogador (volta ao 1 depois do último). Dispara o "Quando a vez mudar".',
  },
]
