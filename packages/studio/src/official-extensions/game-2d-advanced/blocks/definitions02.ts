import type { BlockDefinition } from '../../../blockly/blocks/types'
import { GAME_KIT_COLOUR as C } from './shared'

export const gameKitBlockDefinitions02: BlockDefinition[] = [
  {
    type: 'sz_gk_play_anim',
    placement: 'command',
    message0: 'Tocar em %1 a animação %2 dos quadros %3 a %4 (%5 por segundo)',
    args0: [
      { type: 'field_name_picker', name: 'CHAR', text: 'heroi', kind: 'character' },
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
      'Toca uma faixa de quadros da folha, em loop. Pode rodar TODO quadro sem medo: repetir a mesma animação não a reinicia (guarda de transição, como os profissionais fazem). Desenhou no Pinta? O seletor lista as animações da folha.',
  },

  {
    type: 'sz_gk_set_walk_sheet',
    placement: 'command',
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
    placement: 'command',
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
    // 🌍 Mundo aberto: o tamanho do mundo vem do PRÓPRIO mapa de tiles (colunas ×
    // célula), recalculado a cada quadro — a criança não faz conta nenhuma.
    type: 'sz_gk_camera_follow_map',
    placement: 'command',
    message0: 'Fazer a câmera seguir %1 pelo mapa %2',
    args0: [
      { type: 'field_name_picker', name: 'CHAR', text: 'heroi', kind: 'character' },
      { type: 'field_name_picker', name: 'MAP', text: 'mundo', kind: 'tilemap' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Igual ao "Fazer a câmera seguir", mas o tamanho do mundo é o do MAPA de tiles. A tela vira uma janela andando por ele, e o motor só desenha o pedaço visível (como nos jogos profissionais).',
  },

  {
    type: 'sz_gk_camera_stop',
    placement: 'command',
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
      'Onde começa o pedaço do mundo que aparece na tela (canto esquerdo). Some ao desenhar algo "preso na tela" dentro do "Desenhar o jogo". Ou desenhe no HUD, que já é preso.',
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
      'Onde o mouse (ou o dedo) está, na largura. Já convertido para as coordenadas do JOGO (e do mundo, se a câmera segue).',
  },

  {
    type: 'sz_gk_mouse_y',
    message0: 'o mouse y',
    output: 'JSValue',
    colour: C,
    tooltip: 'Onde o mouse (ou o dedo) está, na altura. Em coordenadas do JOGO.',
  },

  {
    type: 'sz_gk_mouse_screen_x',
    message0: 'o mouse x na tela',
    output: 'JSValue',
    colour: C,
    tooltip:
      'Onde o mouse (ou o dedo) está na largura da TELA. Use para clicar em cartas, botões e painéis desenhados no HUD, mesmo com a câmera ligada.',
  },

  {
    type: 'sz_gk_mouse_screen_y',
    message0: 'o mouse y na tela',
    output: 'JSValue',
    colour: C,
    tooltip:
      'Onde o mouse (ou o dedo) está na altura da TELA. Use junto de “o mouse x na tela” para interagir com o HUD.',
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
    placement: 'event',
    userGesture: true,
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
      'Roda o "fazer" a cada clique/toque, com px e py nas coordenadas do MUNDO. Para cartas, botões e painéis presos no HUD, use “o mouse x/y na tela” dentro deste evento.',
  },

  // ---- ❤️ Combate ----
  {
    type: 'sz_gk_hurt',
    placement: 'command',
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
    placement: 'command',
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
    placement: 'command',
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
      'Verdadeiro quando os dois se encostam medindo por CÍRCULO (mais justo que caixa para bichos redondos). Use dentro de um "se".',
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
      'Verdadeiro enquanto o personagem pisca depois de um dano. O padrão profissional: "se encostou E NÃO está invencível → machucar + empurrar + som". Assim o som e o empurrão só acontecem no dano de verdade.',
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
    placement: 'command',
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
    placement: 'command',
    message0: 'Contar +1 inimigo derrotado',
    args0: [],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'Soma 1 na conta de inimigos derrotados (para a missão e para o placar).',
  },

  {
    type: 'sz_gk_draw_timer',
    placement: 'command',
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
    placement: 'command',
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
    placement: 'command',
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
    placement: 'command',
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
      'Marca uma célula da grade como parede. Ninguém atravessa. Monte as regras dentro de "Quando entrar no mapa" (trocar de mapa limpa as paredes).',
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
    placement: 'command',
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
      'Um morador do mundo: fica parado na célula, bloqueia o caminho e conversa quando o herói aperta ESPAÇO olhando para ele. Sem imagem ou aparência, sai um retângulo lilás.',
  },

  {
    type: 'sz_gk_rpg_draw_npcs',
    placement: 'command',
    message0: 'Desenhar os NPCs',
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'Desenha todos os NPCs do mapa atual. Use dentro do "Desenhar o jogo".',
  },

  {
    type: 'sz_gk_rpg_on_talk',
    placement: 'event',
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
    placement: 'command',
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
    placement: 'command',
    message0: 'Marcar que %1 aconteceu',
    args0: [{ type: 'field_name_picker', name: 'FLAG', text: 'falou-com-ferreiro', kind: 'flag' }],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Anota um acontecimento da história (story flag). É como os RPGs lembram o que você já fez. A conversa e as portas mudam conforme as marcas.',
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
    placement: 'command',
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
    placement: 'command',
    message0: 'Perder o item %1',
    args0: [{ type: 'field_name_picker', name: 'NAME', text: 'chave', kind: 'item' }],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'Tira o item do inventário (gastou/entregou).',
  },

  {
    type: 'sz_gk_rpg_draw_inventory',
    placement: 'command',
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
    type: 'sz_gk_rpg_set_start_map',
    placement: 'start-only-command',
    message0: 'Começar o jogo no mapa %1',
    args0: [{ type: 'field_name_picker', name: 'MAP', text: 'vila', kind: 'map' }],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Escolhe explicitamente o mapa inicial. Se o nome não existir, o jogo avisa e usa o primeiro mapa criado.',
  },

  {
    type: 'sz_gk_rpg_create_map',
    placement: 'start-only-command',
    bodyExecution: 'deferred-callback',
    bodyContext: 'map-draw',
    message0: 'Criar o mapa-cenário %1 com %2 × %3 células',
    args0: [
      { type: 'field_input', name: 'MAP', text: 'vila' },
      { type: 'input_value', name: 'COLS', check: 'JSValue' },
      { type: 'input_value', name: 'ROWS', check: 'JSValue' },
    ],
    message1: 'desenhar com %1 %2',
    args1: [
      { type: 'field_input', name: 'PARAM', text: 'ctx' },
      { type: 'input_statement', name: 'BODY' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Cria o lugar onde a aventura acontece, com até 512 × 512 células. Dentro de “desenhar”, você decide a aparência com formas vetoriais, um mapa de peças feito no Pinta ou uma imagem importada. Nada é criado automaticamente.',
  },

  {
    type: 'sz_gk_rpg_on_enter_map',
    placement: 'event',
    bodyContext: 'map-enter',
    message0: 'Quando entrar no mapa-cenário %1',
    args0: [{ type: 'field_name_picker', name: 'MAP', text: 'vila', kind: 'map' }],
    message1: 'fazer %1',
    args1: [{ type: 'input_statement', name: 'BODY' }],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Define somente o que acontece ao entrar: posição do herói, paredes, NPCs, portas e diálogos. O visual pertence ao bloco “Criar o mapa”.',
  },

  {
    type: 'sz_gk_rpg_go_map',
    placement: 'command',
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
    placement: 'command',
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

  // ---- 🌍 Mundo aberto: bordas ligadas (estilo Zelda) ----
  {
    type: 'sz_gk_rpg_connect_edge',
    placement: 'command',
    message0: 'Ligar a borda %1 deste mapa ao mapa %2',
    args0: [
      {
        type: 'field_dropdown',
        name: 'SIDE',
        options: [
          ['leste (direita)', 'leste'],
          ['oeste (esquerda)', 'oeste'],
          ['norte (cima)', 'norte'],
          ['sul (baixo)', 'sul'],
        ],
      },
      { type: 'field_name_picker', name: 'MAP', text: 'praia', kind: 'map' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Atravessou essa borda → entra no outro mapa pelo lado oposto, na MESMA linha (estilo Zelda). O tamanho vem de “Criar o mapa”; ligue a borda espelhada no outro mapa também.',
  },

  {
    type: 'sz_gk_rpg_current_map',
    message0: 'o nome do mapa de agora',
    output: 'JSValue',
    colour: C,
    tooltip:
      'O nome do mapa em que o herói está. Bom para "se o mapa de agora = praia" e para mostrar no placar.',
  },

  // ---- ⚔️ Kit RPG: batalha por turnos ----
  {
    type: 'sz_gk_rpg_battle_stats',
    placement: 'resource-creator',
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
      'Define a vida, a força e a DEFESA do SEU lado nas batalhas (a defesa reduz o dano recebido). A energia começa cheia; a vida atravessa as batalhas até você curar, perder ou subir de nível. Use uma vez, no começo. É o seu nível 1.',
  },

  {
    type: 'sz_gk_rpg_battle_start',
    placement: 'command',
    message0: 'Começar a batalha contra %1 com vida %2, força %3, defesa %4 e imagem %5',
    args0: [
      { type: 'field_input', name: 'NAME', text: 'Dragão' },
      { type: 'input_value', name: 'HP', check: 'JSValue' },
      { type: 'input_value', name: 'STR', check: 'JSValue' },
      { type: 'input_value', name: 'DEF', check: 'JSValue' },
      { type: 'field_asset_picker', name: 'IMAGE', text: '' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Abre a batalha por TURNOS com o menu pronto: Atacar (força ± 20% − defesa/2), Especial (gasta energia), Item (usa poção), Defender (dano pela metade) e Fugir (50%). A imagem é um desenho do Pinta. Escolha direto, não precisa "Carregar" antes (vazio = retângulo da cor). O mundo espera a batalha acabar. (É a batalha por TURNOS do ⚔️ Kit RPG. Para cartas use o 🃏 Kit Cartas; para bichinhos, o 👾 Kit Monstrinhos.)',
  },

  {
    type: 'sz_gk_rpg_set_special',
    placement: 'resource-creator',
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
    placement: 'resource-creator',
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
      'Põe uma poção no estoque de batalha (empilha até 99). Na luta, o botão "Item" usa uma e recupera vida. Pode ficar no começo, numa reação ou função, mas nunca dentro de um laço.',
  },

  {
    type: 'sz_gk_rpg_heal_hero',
    placement: 'command',
    message0: 'Curar o herói',
    args0: [],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Recupera a vida do herói ao MÁXIMO, FORA da batalha (a estalagem, um save, um checkpoint). Como o herói CARREGA o dano de uma luta para a outra, é assim que ele se recupera. Subir de nível também cura; perder uma batalha recomeça com a vida cheia.',
  },

  {
    type: 'sz_gk_rpg_battle_reward',
    placement: 'command',
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
    placement: 'command',
    message0: 'Aplicar %1 em %2 por %3 turnos',
    args0: [
      {
        type: 'field_dropdown',
        name: 'STATUS',
        options: [
          ['veneno', 'veneno'],
          ['regenerar', 'regenera'],
          ['atrapalhar', 'atrapalha'],
        ],
      },
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
      'Aplica um status na batalha por alguns turnos: VENENO tira 3 de vida por turno, REGENERAR devolve 3, ATRAPALHAR faz o golpe errar às vezes. Use dentro de um golpe especial.',
  },

  {
    type: 'sz_gk_rpg_add_ally',
    placement: 'resource-creator',
    message0: 'Adicionar aliado %1 com vida %2, força %3, defesa %4, cor %5, imagem %6',
    args0: [
      { type: 'field_input', name: 'NAME', text: 'Guerreiro' },
      { type: 'input_value', name: 'HP', check: 'JSValue' },
      { type: 'input_value', name: 'STR', check: 'JSValue' },
      { type: 'input_value', name: 'DEF', check: 'JSValue' },
      { type: 'field_colour_sz', name: 'COLOR', colour: '#4ade80' },
      { type: 'field_asset_picker', name: 'IMAGE', text: '' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Põe um aliado no SEU time de batalha (até 5 além do herói, que já entra sozinho). Na batalha em equipe você comanda cada um: escolhe o golpe e o alvo. A imagem é um desenho do Pinta. Escolha direto, não precisa "Carregar" antes (vazio = retângulo da cor). O time fica salvo entre batalhas. Use no começo, nunca num laço.',
  },

  {
    type: 'sz_gk_rpg_add_foe',
    placement: 'resource-creator',
    message0: 'Adicionar inimigo %1 com vida %2, força %3, defesa %4, cor %5, imagem %6',
    args0: [
      { type: 'field_input', name: 'NAME', text: 'Capanga' },
      { type: 'input_value', name: 'HP', check: 'JSValue' },
      { type: 'input_value', name: 'STR', check: 'JSValue' },
      { type: 'input_value', name: 'DEF', check: 'JSValue' },
      { type: 'field_colour_sz', name: 'COLOR', colour: '#e05a5a' },
      { type: 'field_asset_picker', name: 'IMAGE', text: '' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Adiciona um dos até 5 inimigos extras da PRÓXIMA batalha (além do principal). Assim a luta vira vários contra vários. A imagem é um desenho do Pinta. Escolha direto, não precisa "Carregar" antes (vazio = retângulo da cor). Use antes de "Começar a batalha", nunca num laço.',
  },

  {
    type: 'sz_gk_rpg_teach_move',
    placement: 'resource-creator',
    message0: 'Ensinar o golpe %1 (dano %2, energia %3) para %4',
    args0: [
      { type: 'field_input', name: 'MOVE', text: 'Espadada' },
      { type: 'input_value', name: 'DMG', check: 'JSValue' },
      { type: 'input_value', name: 'COST', check: 'JSValue' },
      { type: 'field_name_picker', name: 'WHO', text: 'Você', kind: 'combatant' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Ensina um golpe NOMEADO ao herói ("Você"), a aliados ou inimigos pelo nome. Cada combatente pode ter vários golpes; o golpe gasta energia quando é usado. Os golpes do time aparecem no painel, e os inimigos escolhem apenas os que conseguem pagar. Use no começo.',
  },

  {
    type: 'sz_gk_rpg_teach_heal',
    placement: 'resource-creator',
    message0: 'Ensinar o golpe de CURA %1 (cura %2, energia %3) para %4',
    args0: [
      { type: 'field_input', name: 'MOVE', text: 'Curar' },
      { type: 'input_value', name: 'AMOUNT', check: 'JSValue' },
      { type: 'input_value', name: 'COST', check: 'JSValue' },
      { type: 'field_name_picker', name: 'WHO', text: 'Você', kind: 'combatant' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Como "Ensinar o golpe", mas de CURA: em vez de ferir, devolve vida a quem usou. Serve para aliados curandeiros e inimigos que se recuperam; aparece no painel do time e gasta energia. Use no começo.',
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
    placement: 'event',
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

  // ---- 👑 R30: chefes e chefões da batalha por turnos ----
  {
    type: 'sz_gk_rpg_add_boss',
    placement: 'resource-creator',
    message0: 'Pôr o CHEFÃO %1 (vida %2, força %3, defesa %4, imagem %5)',
    args0: [
      { type: 'field_input', name: 'NAME', text: 'Dragão' },
      { type: 'input_value', name: 'HP', check: 'JSValue' },
      { type: 'input_value', name: 'STR', check: 'JSValue' },
      { type: 'input_value', name: 'DEF', check: 'JSValue' },
      { type: 'field_asset_picker', name: 'IMAGE', text: '' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Como "Adicionar inimigo", ocupa uma das 5 vagas de inimigos extras, mas aparece MAIOR, com barra de vida grande e o nome com coroa. A imagem é um desenho do Pinta. Ensine golpes a ele pelo nome. Use antes de "Começar a batalha", nunca num laço.',
  },

  // ---- ⚔️ Fichas reutilizáveis: crie o inimigo separado e escolha na hora ----
  {
    type: 'sz_gk_rpg_define_battler',
    placement: 'start-only-command',
    message0:
      'Criar a ficha do inimigo %1: vida %2, força %3, defesa %4, imagem %5, cor %6, chefão %7',
    args0: [
      { type: 'field_input', name: 'NAME', text: 'Dragão' },
      { type: 'input_value', name: 'HP', check: 'JSValue' },
      { type: 'input_value', name: 'STR', check: 'JSValue' },
      { type: 'input_value', name: 'DEF', check: 'JSValue' },
      { type: 'field_asset_picker', name: 'IMAGE', text: '' },
      { type: 'field_colour_sz', name: 'COLOR', colour: '#e05a5a' },
      { type: 'field_checkbox', name: 'BOSS', checked: false },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Cria uma FICHA de inimigo reutilizável: vida, força, defesa, a imagem (um desenho do Pinta, escolha direto) e a cor. Marque "chefão" para ele entrar MAIOR, com barra grande e coroa. Faça a ficha UMA vez no começo; depois é só ESCOLHER com quem batalhar.',
  },

  {
    type: 'sz_gk_rpg_battle_named',
    placement: 'command',
    message0: 'Começar a batalha contra a ficha %1',
    args0: [{ type: 'field_name_picker', name: 'NAME', text: 'Dragão', kind: 'battler' }],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Abre a batalha por turnos ESCOLHENDO um inimigo que você já criou com "Criar a ficha do inimigo". Ele entra com a imagem e os atributos prontos. ⚠️ Crie a ficha ANTES (senão nada acontece + um aviso). Some "Adicionar o inimigo da ficha" antes para lutar contra vários.',
  },
]
