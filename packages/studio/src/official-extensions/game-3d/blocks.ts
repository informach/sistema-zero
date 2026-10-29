import type { BlockDefinition } from '../../blockly/blocks/types'
import type { ExtensionToolboxCategory } from '../../extensions/toolboxTypes'
import { GAME3D_DROPDOWN_OPTIONS } from '../../three/game3dContract'
import { buildExtensionPalette } from '../extensionPalette'
import { gameRulesBlocks } from '../game3dRules/blocks'
import { GAME_THREE_D_PALETTE } from './palette'

// Jogo 3D = UMA cor da categoria: AMARELO/dourado. A categoria inteira fica em
// TONS de amarelo, variando por área/kit.
const C = '#f0b80a' // base (cena/objetos/física)

const AUDIO_ACTION_PLACEMENT = {
  root: [],
  nested: [
    'user-gesture-body',
    'loop-body',
    // Os "Quando…" que o motor dispara com o jogo rodando (vida, contagem, fase).
    'game-event-body',
    'function-body',
    'async-function-body',
    'derived-method-body',
  ],
  role: 'command',
} as const

const gameThreeDBlockDefinitions = [
  {
    type: 'sz_g3d_top_down',
    placement: 'loop-command',
    message0: 'Fazer %1 andar com as setas (ou WASD), velocidade %2',
    args0: [
      { type: 'field_name_picker', name: 'OBJ', text: 'personagem', kind: 'g3d-object' },
      { type: 'input_value', name: 'SPEED', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    tooltip:
      'Move no chão a cada quadro, vira para onde anda e respeita as áreas permitidas. A velocidade é por segundo; não precisa de grupo nem de outro comando para aplicar a velocidade.',
  },
  {
    type: 'sz_g3d_walk_area',
    placement: 'start-only-command',
    message0: 'Permitir %1 andar em x de %2 até %3 e z de %4 até %5',
    args0: [
      { type: 'field_name_picker', name: 'OBJ', text: 'personagem', kind: 'g3d-object' },
      { type: 'input_value', name: 'MINX', check: 'JSValue' },
      { type: 'input_value', name: 'MAXX', check: 'JSValue' },
      { type: 'input_value', name: 'MINZ', check: 'JSValue' },
      { type: 'input_value', name: 'MAXZ', check: 'JSValue' },
    ],
    inputsInline: false,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    tooltip:
      'Delimita uma parte do chão. Use mais de uma área para formar caminhos ligados. O personagem fica nas áreas permitidas ao usar "Fazer … andar com as setas".',
  },
  {
    type: 'sz_g3d_frame_scene',
    placement: 'command',
    message0: 'Mostrar a cena %1 inteira: largura %2 altura %3 profundidade %4',
    args0: [
      { type: 'field_name_picker', name: 'WORLD', text: 'cena', kind: 'g3d-world' },
      { type: 'input_value', name: 'W', check: 'JSValue' },
      { type: 'input_value', name: 'H', check: 'JSValue' },
      { type: 'input_value', name: 'D', check: 'JSValue' },
    ],
    inputsInline: false,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    tooltip:
      'Mostra toda a área de jogo (centro em x e z zero, a partir do chão), mesmo se a prévia mudar de tamanho. Quem joga aproxima com a rodinha ou dois dedos, gira arrastando e volta com duplo clique.',
  },
  {
    type: 'sz_g3d_walk_animations',
    placement: 'start-only-command',
    message0: 'Animar %1: parado toca %2, andando toca %3',
    args0: [
      { type: 'field_name_picker', name: 'OBJ', text: 'personagem', kind: 'g3d-object' },
      { type: 'field_model_clip_picker', name: 'IDLE', text: 'parado' },
      { type: 'field_model_clip_picker', name: 'WALK', text: 'andando' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    tooltip:
      'Escolhe as animações usadas pelo "Fazer … andar com as setas". Um personagem parado toca a primeira; enquanto anda toca a segunda.',
  },
  {
    type: 'sz_g3d_on_touch',
    placement: 'event',
    bodyContext: 'game-event-body',
    message0: 'Quando %1 encostar em %2',
    args0: [
      { type: 'field_name_picker', name: 'OBJ', text: 'personagem', kind: 'g3d-object' },
      { type: 'field_name_picker', name: 'OTHER', text: 'chave', kind: 'g3d-object' },
    ],
    message1: 'fazer %1',
    args1: [{ type: 'input_statement', name: 'BODY' }],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    tooltip:
      'Executa ao começar o encontro entre os dois. Só repete depois de se afastarem e encostarem de novo.',
  },

  {
    type: 'sz_g3d_create_scene',
    placement: 'start-only-command',
    message0: 'Criar cena 3D no canvas %1 e guardar em %2',
    args0: [
      { type: 'field_name_picker', name: 'CANVAS', text: 'tela', kind: 'canvas' },
      { type: 'field_input', name: 'NAME', text: 'cena' },
    ],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    tooltip:
      'Cria cena + câmera + renderizador + luz, prontos para desenhar. Crie um <canvas> no HTML antes.',
  },
  {
    type: 'sz_g3d_create_fullscreen_scene',
    placement: 'start-only-command',
    message0: 'Criar cena 3D em tela cheia e guardar em %1, fundo %2',
    args0: [
      { type: 'field_input', name: 'NAME', text: 'cena' },
      { type: 'field_colour', name: 'BG', colour: '#0b1020' },
    ],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    tooltip:
      'Atalho: cria a tela (canvas) ocupando a janela inteira, já responsiva, mais a cena + câmera + luz. A cor do fundo fica atrás dos objetos da cena. Não precisa criar a tela de desenho no HTML.',
  },
  {
    type: 'sz_g3d_set_background',
    placement: 'command',
    message0: 'Cor de fundo da cena %1 como %2',
    args0: [
      { type: 'field_name_picker', name: 'WORLD', text: 'cena', kind: 'g3d-world' },
      { type: 'field_colour', name: 'COLOR', colour: '#0b1020' },
    ],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    tooltip: 'Troca a cor que aparece atrás de todos os objetos da cena 3D.',
  },
  {
    type: 'sz_g3d_set_camera',
    placement: 'command',
    message0: 'Posicionar câmera da cena %1 em x %2 y %3 z %4',
    args0: [
      { type: 'field_name_picker', name: 'WORLD', text: 'cena', kind: 'g3d-world' },
      { type: 'input_value', name: 'X', check: 'JSValue' },
      { type: 'input_value', name: 'Y', check: 'JSValue' },
      { type: 'input_value', name: 'Z', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    tooltip: 'Move a câmera (ela sempre olha para o centro 0,0,0).',
  },
  {
    type: 'sz_g3d_create_box',
    placement: 'start-only-command',
    message0: 'Criar o cubo %1 na cena %2 tamanho %3 cor %4',
    args0: [
      { type: 'field_input', name: 'NAME', text: 'cubo' },
      { type: 'field_name_picker', name: 'WORLD', text: 'cena', kind: 'g3d-world' },
      { type: 'input_value', name: 'SIZE', check: 'JSValue' },
      { type: 'field_colour', name: 'COLOR', colour: '#22d3ee' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    tooltip: 'Cria um cubo com todos os lados do mesmo tamanho e a cor escolhida.',
  },
  {
    type: 'sz_g3d_create_sphere',
    placement: 'start-only-command',
    message0: 'Criar esfera %1 na cena %2 raio %3 cor %4',
    args0: [
      { type: 'field_input', name: 'NAME', text: 'bola' },
      { type: 'field_name_picker', name: 'WORLD', text: 'cena', kind: 'g3d-world' },
      { type: 'input_value', name: 'RADIUS', check: 'JSValue' },
      { type: 'field_colour', name: 'COLOR', colour: '#f59e0b' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    tooltip: 'Cria uma esfera com o raio e a cor escolhidos.',
  },
  {
    type: 'sz_g3d_create_block',
    placement: 'start-only-command',
    message0: 'Criar a caixa %1 na cena %2 de largura %3 altura %4 profundidade %5 cor %6',
    args0: [
      { type: 'field_input', name: 'NAME', text: 'chao' },
      { type: 'field_name_picker', name: 'WORLD', text: 'cena', kind: 'g3d-world' },
      { type: 'input_value', name: 'W', check: 'JSValue' },
      { type: 'input_value', name: 'H', check: 'JSValue' },
      { type: 'input_value', name: 'D', check: 'JSValue' },
      { type: 'field_colour', name: 'COLOR', colour: '#0369a1' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    tooltip:
      'Uma caixa de medidas livres, boa para chão e paredes. Depois use "Colocar o objeto … em x y z" para colocá-la no lugar.',
  },
  {
    type: 'sz_g3d_set_position',
    placement: 'command',
    message0: 'Colocar o objeto %1 em x %2 y %3 z %4',
    args0: [
      { type: 'field_name_picker', name: 'OBJ', text: 'caixa', kind: 'object3d' },
      { type: 'input_value', name: 'X', check: 'JSValue' },
      { type: 'input_value', name: 'Y', check: 'JSValue' },
      { type: 'input_value', name: 'Z', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    tooltip: 'Coloca o objeto nas coordenadas x, y e z da cena 3D.',
  },
  {
    type: 'sz_g3d_set_rotation',
    placement: 'command',
    message0: 'Giro do objeto %1 em x %2 y %3 z %4 (graus)',
    args0: [
      { type: 'field_name_picker', name: 'OBJ', text: 'caixa', kind: 'object3d' },
      { type: 'input_value', name: 'X', check: 'JSValue' },
      { type: 'input_value', name: 'Y', check: 'JSValue' },
      { type: 'input_value', name: 'Z', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    tooltip: 'Deixa o objeto virado nesses ângulos, em graus (90 = um quarto de volta).',
  },
  {
    type: 'sz_g3d_set_scale',
    placement: 'command',
    message0: 'Tamanho (escala) do objeto %1 em %2',
    args0: [
      { type: 'field_name_picker', name: 'OBJ', text: 'caixa', kind: 'object3d' },
      { type: 'input_value', name: 'FACTOR', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    tooltip: 'Aumenta ou diminui o objeto (1 = tamanho normal, 2 = o dobro).',
  },
  {
    type: 'sz_g3d_animate',
    placement: 'loop-update',
    message0: 'A cada quadro da cena %1',
    args0: [{ type: 'field_name_picker', name: 'WORLD', text: 'cena', kind: 'g3d-world' }],
    message1: 'fazer %1',
    args1: [{ type: 'input_statement', name: 'BODY' }],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    tooltip: 'Laço de animação 3D: roda o "fazer" e redesenha a cena a cada quadro.',
  },

  // ---- Física & controles ----
  {
    type: 'sz_g3d_control_keys',
    placement: 'loop-command',
    message0: 'Mover %1 com o teclado (WASD/setas), %2 por segundo',
    args0: [
      { type: 'field_name_picker', name: 'OBJ', text: 'jogador', kind: 'object3d' },
      { type: 'input_value', name: 'SPEED', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    tooltip:
      'Anda no plano (frente/trás/lados) com W A S D ou as setas. Use dentro de "A cada quadro".',
  },
  {
    type: 'sz_g3d_set_velocity',
    placement: 'command',
    message0: 'Velocidade do objeto %1 em x %2 y %3 z %4 (por segundo)',
    args0: [
      { type: 'field_name_picker', name: 'OBJ', text: 'jogador', kind: 'object3d' },
      { type: 'input_value', name: 'X', check: 'JSValue' },
      { type: 'input_value', name: 'Y', check: 'JSValue' },
      { type: 'input_value', name: 'Z', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    tooltip: 'Quanto o objeto anda a cada segundo em cada eixo.',
  },
  {
    type: 'sz_g3d_jump',
    placement: 'command',
    message0: 'Fazer %1 pular com força %2',
    args0: [
      { type: 'field_name_picker', name: 'OBJ', text: 'jogador', kind: 'object3d' },
      { type: 'input_value', name: 'FORCE', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    tooltip:
      'Impulso para cima, só no chão. A altura depende da gravidade: com o "Mover com gravidade" (7, leve), força 5 sobe uns 1,7; com "Dar corpo físico" (36), a mesma altura pede força 11.',
  },
  {
    type: 'sz_g3d_apply_gravity',
    placement: 'loop-command',
    message0: 'Mover %1 com gravidade (chão: %2)',
    args0: [
      { type: 'field_name_picker', name: 'OBJ', text: 'jogador', kind: 'object3d' },
      { type: 'field_name_picker', name: 'GROUND', text: 'chao', kind: 'object3d' },
    ],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    tooltip:
      'Puxa o objeto para baixo e o faz parar/quicar no chão, andando pela velocidade. Use dentro de "A cada quadro".',
  },
  {
    // Funde as seis câmeras antigas (seguir, 3ª pessoa, de cima, isométrica, 1ª
    // pessoa, orbital): é um MODO, recomposto a cada quadro pelo runtime.
    type: 'sz_g3d_camera_mode',
    placement: 'command',
    message0: 'Câmera da cena %1: %2 %3',
    args0: [
      { type: 'field_name_picker', name: 'WORLD', text: 'cena', kind: 'g3d-world' },
      { type: 'field_dropdown', name: 'MODE', options: GAME3D_DROPDOWN_OPTIONS.cameraMode },
      { type: 'field_name_picker', name: 'OBJ', text: 'jogador', kind: 'g3d-object' },
    ],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    tooltip:
      'Escolhe como a câmera mostra o jogo. Os modos que seguem acompanham o objeto; de cima, isométrica e em volta podem ficar sem objeto e olham o centro.',
  },
  {
    type: 'sz_g3d_camera_distance',
    placement: 'command',
    message0: 'Distância da câmera da cena %1: %2 atrás, %3 de altura',
    args0: [
      { type: 'field_name_picker', name: 'WORLD', text: 'cena', kind: 'g3d-world' },
      { type: 'input_value', name: 'DIST', check: 'JSValue' },
      { type: 'input_value', name: 'HEIGHT', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    tooltip:
      'Quão longe e quão alto fica a câmera que segue o objeto (de trás ou de longe). Na câmera que gira em volta, muda a distância.',
  },

  // ---- Perguntas (booleanos) — caem dentro de um "se" ----
  {
    type: 'sz_g3d_stage_value',
    message0: '%1 da fase da cena %2',
    args0: [
      { type: 'field_dropdown', name: 'FIELD', options: GAME3D_DROPDOWN_OPTIONS.stageField },
      { type: 'field_name_picker', name: 'WORLD', text: 'jogo', kind: 'g3d-world' },
    ],
    output: 'JSValue',
    tooltip: 'Lê o placar da fase: pontos, moedas, vidas, tempo, mundo e fase.',
  },
  {
    type: 'sz_g3d_stage_is',
    message0: 'a fase da cena %1 %2?',
    args0: [
      { type: 'field_name_picker', name: 'WORLD', text: 'jogo', kind: 'g3d-world' },
      { type: 'field_dropdown', name: 'STATUS', options: GAME3D_DROPDOWN_OPTIONS.stageStatus },
    ],
    output: 'JSValue',
    tooltip: 'Pergunta se a fase acabou, foi vencida, foi perdida ou se acabaram as vidas.',
  },
  {
    type: 'sz_g3d_hero_is',
    message0: 'o herói %1 está %2?',
    args0: [
      { type: 'field_name_picker', name: 'OBJ', text: 'heroi', kind: 'g3d-object' },
      { type: 'field_dropdown', name: 'WHAT', options: GAME3D_DROPDOWN_OPTIONS.heroStatus },
    ],
    output: 'JSValue',
    tooltip: 'Pergunta o estado do herói: pequeno, grande, de fogo, invencível ou no chão.',
  },
  {
    type: 'sz_g3d_key_pressed',
    message0: 'a tecla %1 foi apertada agora?',
    args0: [
      {
        type: 'field_dropdown',
        name: 'KEY',
        options: GAME3D_DROPDOWN_OPTIONS.key,
      },
    ],
    output: 'JSValue',
    tooltip:
      'Verdadeiro só no quadro em que a tecla desceu. Segurar a tecla não conta de novo: é o que faz atirar uma vez por toque.',
  },
  {
    type: 'sz_g3d_hit_is',
    message0: 'a batida %1 foi contra %2?',
    args0: [
      { type: 'field_name_picker', name: 'HIT', text: 'batida', kind: 'g3d-object' },
      { type: 'field_name_picker', name: 'OBJ', text: 'bloco', kind: 'object3d' },
    ],
    output: 'JSValue',
    tooltip: 'Diz se aquela batida foi contra este objeto.',
  },
  {
    type: 'sz_g3d_object_value',
    message0: '%1 do objeto %2',
    args0: [
      { type: 'field_input', name: 'KEY', text: 'direcao' },
      { type: 'field_name_picker', name: 'OBJ', text: 'item', kind: 'g3d-object' },
    ],
    output: 'JSValue',
    tooltip: 'Lê o número que esse objeto guardou com esse nome. Vale 0 se ele nunca guardou nada.',
  },
  {
    type: 'sz_g3d_key_down',
    message0: 'a tecla %1 está apertada?',
    args0: [
      {
        type: 'field_dropdown',
        name: 'KEY',
        options: GAME3D_DROPDOWN_OPTIONS.key,
      },
    ],
    output: 'JSValue',
    tooltip:
      'Verdadeiro enquanto a tecla está sendo segurada. Use dentro de um "se", no "A cada quadro".',
  },
  {
    type: 'sz_g3d_collides',
    message0: 'o objeto %1 está encostando em %2 ?',
    args0: [
      { type: 'field_name_picker', name: 'A', text: 'jogador', kind: 'object3d' },
      { type: 'field_name_picker', name: 'B', text: 'chao', kind: 'object3d' },
    ],
    output: 'JSValue',
    tooltip: 'Verdadeiro enquanto os dois objetos 3D estão se encostando. Use dentro de um "se".',
  },
  {
    type: 'sz_g3d_hit_any',
    message0: '%1 está encostando em algum do grupo %2?',
    args0: [
      { type: 'field_name_picker', name: 'OBJ', text: 'jogador', kind: 'object3d' },
      { type: 'field_name_picker', name: 'GROUP', text: 'inimigos', kind: 'group3d' },
    ],
    output: 'JSValue',
    tooltip:
      'Verdadeiro enquanto o objeto encosta em qualquer um do grupo. Mede a caixa real de cada um, então vale para modelos e peças giradas.',
  },

  // ---- 📦 Grupos (genéricos) + ⏱️ Tempo + Kit "Desvie" (soltar 1 inimigo) ----
  // A criança MONTA a lógica (soltar → mover → tirar da tela → colidir → fim);
  // o kit só facilita a mecânica difícil (soltar 1 inimigo 3D).
  {
    type: 'sz_g3d_create_group',
    placement: 'start-only-command',
    message0: 'Criar grupo de objetos %1',
    args0: [{ type: 'field_input', name: 'NAME', text: 'inimigos' }],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    tooltip:
      'Cria um grupo vazio para guardar vários objetos (os inimigos, as moedas, as cópias de um molde).',
  },
  {
    type: 'sz_g3d_update_group',
    placement: 'command',
    message0: 'Atualizar (mover) o grupo %1 com gravidade (chão %2)',
    args0: [
      { type: 'field_name_picker', name: 'GROUP', text: 'inimigos', kind: 'group3d' },
      { type: 'field_name_picker', name: 'GROUND', text: 'chao', kind: 'g3d-object' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    tooltip:
      'Move cada objeto do grupo pela velocidade e o faz cair/parar no chão. Use dentro de "A cada quadro".',
  },
  {
    type: 'sz_g3d_update_group_no_gravity',
    placement: 'command',
    message0: 'Mover o grupo %1',
    args0: [{ type: 'field_name_picker', name: 'GROUP', text: 'inimigos', kind: 'group3d' }],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    tooltip:
      'Move cada objeto do grupo pela velocidade, sem cair (para coisas que voam). Use dentro de "A cada quadro".',
  },
  {
    type: 'sz_g3d_prune_offscreen',
    placement: 'command',
    bodyExecution: 'sync-callback',
    message0: 'Tirar do grupo %1 quem saiu da tela (cena %2), para cada um (chamado %3)',
    args0: [
      { type: 'field_name_picker', name: 'GROUP', text: 'inimigos', kind: 'group3d' },
      { type: 'field_name_picker', name: 'WORLD', text: 'cena', kind: 'g3d-world' },
      { type: 'field_input', name: 'ITEM', text: 'inimigo' },
    ],
    message1: 'fazer %1',
    args1: [{ type: 'input_statement', name: 'BODY' }],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    tooltip:
      'Some com os objetos que saíram da tela e roda o "fazer" para cada um que saiu (ex.: contar quem escapou). Use dentro de "A cada quadro".',
  },
  {
    type: 'sz_g3d_for_each_in_group',
    placement: 'command',
    bodyExecution: 'sync-callback',
    message0: 'Para cada objeto %1 do grupo %2',
    args0: [
      { type: 'field_input', name: 'ITEM', text: 'inimigo' },
      { type: 'field_name_picker', name: 'GROUP', text: 'inimigos', kind: 'group3d' },
    ],
    message1: 'fazer %1',
    args1: [{ type: 'input_statement', name: 'BODY' }],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    tooltip:
      'Roda o "fazer" para cada objeto do grupo (o objeto da vez fica no nome que você escolher).',
  },
  {
    type: 'sz_g3d_count_group',
    message0: 'quantos objetos tem no grupo %1',
    args0: [{ type: 'field_name_picker', name: 'GROUP', text: 'inimigos', kind: 'group3d' }],
    output: 'JSValue',
    tooltip: 'Quantidade de objetos no grupo agora. Use dentro de um "se" ou numa conta.',
  },
  {
    type: 'sz_g3d_remove_from_group',
    placement: 'command',
    message0: 'Tirar o objeto %1 do grupo %2',
    args0: [
      { type: 'field_name_picker', name: 'OBJ', text: 'inimigo', kind: 'object3d' },
      { type: 'field_name_picker', name: 'GROUP', text: 'inimigos', kind: 'group3d' },
    ],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    tooltip: 'Tira um objeto do grupo e some com ele da cena (ex.: o inimigo que foi atingido).',
  },
  {
    type: 'sz_g3d_clear_group',
    placement: 'command',
    message0: 'Esvaziar o grupo %1',
    args0: [{ type: 'field_name_picker', name: 'GROUP', text: 'inimigos', kind: 'group3d' }],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    tooltip:
      'Tira todos os objetos do grupo de uma vez e some com eles da cena (ex.: ao recomeçar).',
  },
  {
    type: 'sz_g3d_every_seconds',
    placement: 'loop-update',
    message0: 'A cada %1 segundos',
    args0: [{ type: 'input_value', name: 'SECS', check: 'JSValue' }],
    message1: 'fazer %1',
    args1: [{ type: 'input_statement', name: 'BODY' }],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    tooltip:
      'Roda o "fazer" de tempos em tempos, a cada N segundos, enquanto o jogo roda. Ótimo para soltar um inimigo sem encher a tela.',
  },
  {
    type: 'sz_g3d_spawn_enemy',
    placement: 'command',
    message0: 'Na cena %1, soltar 1 inimigo no grupo %2, %3 por segundo',
    args0: [
      { type: 'field_name_picker', name: 'WORLD', text: 'cena', kind: 'g3d-world' },
      { type: 'field_name_picker', name: 'GROUP', text: 'inimigos', kind: 'group3d' },
      { type: 'input_value', name: 'SPEED', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    tooltip:
      'Cria 1 inimigo (cubo vermelho) que vem de longe na velocidade escolhida. Use dentro de "A cada N segundos" para soltar de tempos em tempos.',
  },

  // ---- GENÉRICOS de grade (fora do kit, p/ outros jogos) ----
  {
    type: 'sz_g3d_grid_position',
    placement: 'command',
    message0: 'Colocar o objeto %1 na linha %2 coluna %3',
    args0: [
      { type: 'field_name_picker', name: 'OBJ', text: 'caixa', kind: 'object3d' },
      { type: 'input_value', name: 'ROW', check: 'JSValue' },
      { type: 'input_value', name: 'COL', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    tooltip: 'Coloca o objeto numa casa da grade (linha e coluna).',
  },
  {
    type: 'sz_g3d_grid_step',
    placement: 'loop-command',
    message0: 'Mover %1 em grade com as setas (a cada quadro)',
    args0: [{ type: 'field_name_picker', name: 'OBJ', text: 'jogador', kind: 'object3d' }],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    tooltip:
      'Anda uma casa por vez (com um pulinho) ao apertar as setas. Use dentro de "A cada quadro".',
  },
  {
    type: 'sz_g3d_grid_move',
    placement: 'command',
    message0: 'Fazer %1 dar um passo para %2',
    args0: [
      { type: 'field_name_picker', name: 'OBJ', text: 'jogador', kind: 'object3d' },
      {
        type: 'field_dropdown',
        name: 'DIR',
        options: GAME3D_DROPDOWN_OPTIONS.gridDirection,
      },
    ],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    tooltip: 'Enfileira um passo na grade (ótimo para botões na tela).',
  },
  {
    type: 'sz_g3d_move_across',
    placement: 'loop-command',
    message0: 'Mover os objetos do grupo %1 (%2 por segundo, dando a volta de x %3 até %4)',
    args0: [
      { type: 'field_name_picker', name: 'GROUP', text: 'carros', kind: 'group3d' },
      { type: 'input_value', name: 'SPEED', check: 'JSValue' },
      { type: 'input_value', name: 'MIN', check: 'JSValue' },
      { type: 'input_value', name: 'MAX', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    tooltip:
      'Move todos os objetos do grupo numa faixa, dando a volta nas bordas. Velocidade negativa = sentido contrário. Use dentro de "A cada quadro".',
  },

  {
    type: 'sz_g3d_create_fullscreen_kit',
    placement: 'start-only-command',
    message0: 'Criar mundo %1 em tela cheia e guardar em %2, fundo %3',
    args0: [
      {
        type: 'field_dropdown',
        name: 'KIT',
        options: [
          ['Travessia', 'crossing'],
          ['Corrida', 'race'],
          ['Empilhar', 'stack'],
          ['Plataforma', 'platform'],
        ],
      },
      { type: 'field_input', name: 'NAME', text: 'mundo' },
      { type: 'field_colour', name: 'BG', colour: '#0b1020' },
    ],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    tooltip:
      'Cria o mundo, a câmera do kit e uma tela responsiva do próprio jogo. Não precisa de HTML ou CSS.',
  },

  // ---- Kit Travessia (atravessar a rua / Crossy Road) ----
  {
    type: 'sz_g3d_create_crossing_scene',
    placement: 'start-only-command',
    message0: 'Criar mundo Travessia no canvas %1 e guardar em %2',
    args0: [
      { type: 'field_name_picker', name: 'CANVAS', text: 'jogo', kind: 'canvas' },
      { type: 'field_input', name: 'NAME', text: 'mundo' },
    ],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    tooltip:
      'Monta a cena com câmera isométrica e luz, pronta para o jogo de atravessar. Crie um <canvas> no HTML antes.',
  },
  {
    type: 'sz_g3d_create_crosser',
    placement: 'start-only-command',
    message0: 'Criar personagem da Travessia no mundo %1 cor %2 e guardar em %3',
    args0: [
      { type: 'field_name_picker', name: 'WORLD', text: 'mundo', kind: 'g3d-world' },
      { type: 'field_colour', name: 'COLOR', colour: '#ffffff' },
      { type: 'field_input', name: 'NAME', text: 'jogador' },
    ],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    tooltip: 'Cria o personagem (galinha) que pula de casa em casa. A câmera passa a segui-lo.',
  },
  {
    type: 'sz_g3d_crosser_move',
    placement: 'command',
    message0: 'Mover o personagem %1 para %2',
    args0: [
      { type: 'field_name_picker', name: 'OBJ', text: 'jogador', kind: 'object3d' },
      {
        type: 'field_dropdown',
        name: 'DIR',
        options: GAME3D_DROPDOWN_OPTIONS.gridDirection,
      },
    ],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    tooltip:
      'Enfileira um passo do personagem (não sai do tabuleiro nem sobe em árvore). Ótimo para botões na tela.',
  },
  {
    type: 'sz_g3d_crosser_step',
    placement: 'loop-command',
    message0: 'Atualizar o personagem %1 no mundo %2 (a cada quadro)',
    args0: [
      { type: 'field_name_picker', name: 'OBJ', text: 'jogador', kind: 'g3d-object' },
      { type: 'field_name_picker', name: 'WORLD', text: 'mundo', kind: 'g3d-world' },
    ],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    tooltip:
      'Move o personagem com as setas (em grade), gera mais ruas, segue com a câmera e conta a pontuação. Use dentro de "A cada quadro".',
  },
  {
    type: 'sz_g3d_crosser_reset',
    placement: 'command',
    message0: 'Recomeçar a Travessia: personagem %1 no mundo %2',
    args0: [
      { type: 'field_name_picker', name: 'OBJ', text: 'jogador', kind: 'g3d-object' },
      { type: 'field_name_picker', name: 'WORLD', text: 'mundo', kind: 'g3d-world' },
    ],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    tooltip: 'Volta o personagem ao início e recria o mapa (botão Recomeçar).',
  },
  {
    type: 'sz_g3d_add_row',
    placement: 'start-only-command',
    // A velocidade é a antiga (pontos por segundo, 42 pontos = 1 quadrado): o texto diz a régua.
    message0:
      'No mundo %1, na linha %2, criar faixa de %3 indo para %4 velocidade %5 (150 = normal)',
    args0: [
      { type: 'field_name_picker', name: 'WORLD', text: 'mundo', kind: 'g3d-world' },
      { type: 'input_value', name: 'ROW', check: 'JSValue' },
      {
        type: 'field_dropdown',
        name: 'KIND',
        options: GAME3D_DROPDOWN_OPTIONS.rowKind,
      },
      {
        type: 'field_dropdown',
        name: 'DIR',
        options: GAME3D_DROPDOWN_OPTIONS.rowDirection,
      },
      { type: 'input_value', name: 'SPEED', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    tooltip:
      'Cria uma linha do mapa: grama, floresta com árvores, ou uma pista com carros/caminhões andando. A velocidade é em pontos por segundo (42 pontos = 1 quadrado): 150 anda uns 3,5 quadrados por segundo, 300 o dobro.',
  },
  {
    type: 'sz_g3d_generate_rows',
    placement: 'start-only-command',
    message0: 'No mundo %1, gerar %2 linhas aleatórias',
    args0: [
      { type: 'field_name_picker', name: 'WORLD', text: 'mundo', kind: 'g3d-world' },
      { type: 'input_value', name: 'COUNT', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    tooltip:
      'Cria várias linhas sorteadas (grama/floresta/carros/caminhões) à frente do personagem.',
  },
  {
    type: 'sz_g3d_move_traffic',
    placement: 'loop-command',
    message0: 'Mover os veículos do mundo %1 (a cada quadro)',
    args0: [{ type: 'field_name_picker', name: 'WORLD', text: 'mundo', kind: 'g3d-world' }],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    tooltip: 'Faz os carros e caminhões andarem e darem a volta. Use dentro de "A cada quadro".',
  },
  {
    type: 'sz_g3d_crosser_hit',
    message0: 'o personagem %1 bateu num veículo? (mundo %2)',
    args0: [
      { type: 'field_name_picker', name: 'OBJ', text: 'jogador', kind: 'g3d-object' },
      { type: 'field_name_picker', name: 'WORLD', text: 'mundo', kind: 'g3d-world' },
    ],
    output: 'JSValue',
    tooltip:
      'Verdadeiro quando o personagem é atropelado. Use num "se" para mostrar o fim de jogo.',
  },
  {
    type: 'sz_g3d_crosser_row',
    message0: 'a pontuação (linha) do personagem %1',
    args0: [{ type: 'field_name_picker', name: 'OBJ', text: 'jogador', kind: 'object3d' }],
    output: 'JSValue',
    tooltip:
      'Quantas linhas o personagem avançou (a pontuação). Use num "se" ou para mostrar o placar.',
  },

  // ---- GENÉRICOS: movimento circular + distância ----
  {
    type: 'sz_g3d_move_in_circle',
    placement: 'loop-command',
    message0: 'Mover %1 em círculo: raio %2, %3 graus por segundo',
    args0: [
      { type: 'field_name_picker', name: 'OBJ', text: 'carro', kind: 'object3d' },
      { type: 'input_value', name: 'RADIUS', check: 'JSValue' },
      { type: 'input_value', name: 'SPEED', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    tooltip:
      'Faz o objeto girar numa circunferência (centro no meio da cena), virado para a direção do movimento. Use dentro de "A cada quadro".',
  },
  {
    type: 'sz_g3d_distance_to',
    message0: 'a distância entre %1 e %2',
    args0: [
      { type: 'field_name_picker', name: 'A', text: 'carro', kind: 'object3d' },
      { type: 'field_name_picker', name: 'B', text: 'rival', kind: 'object3d' },
    ],
    output: 'JSValue',
    tooltip: 'A distância entre dois objetos (no chão). Use numa conta ou num "se".',
  },
  {
    type: 'sz_g3d_is_near',
    message0: 'o objeto %1 está perto de %2 (menos de %3)?',
    args0: [
      { type: 'field_name_picker', name: 'A', text: 'carro', kind: 'object3d' },
      { type: 'field_name_picker', name: 'B', text: 'rival', kind: 'object3d' },
      { type: 'input_value', name: 'DIST', check: 'JSValue' },
    ],
    inputsInline: true,
    output: 'JSValue',
    tooltip: 'Verdadeiro quando os dois objetos estão a menos da distância dada. Use num "se".',
  },

  // ---- Kit Corrida (correr numa pista) ----
  {
    type: 'sz_g3d_create_race_scene',
    placement: 'start-only-command',
    message0: 'Criar mundo de corrida no canvas %1 e guardar em %2',
    args0: [
      { type: 'field_name_picker', name: 'CANVAS', text: 'pista', kind: 'canvas' },
      { type: 'field_input', name: 'NAME', text: 'mundo' },
    ],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    tooltip:
      'Monta a cena com câmera aérea e luz, pronta para a corrida. Crie um <canvas> no HTML antes.',
  },
  {
    type: 'sz_g3d_create_race_track',
    placement: 'start-only-command',
    message0: 'No mundo %1, criar a pista de corrida',
    args0: [{ type: 'field_name_picker', name: 'WORLD', text: 'mundo', kind: 'g3d-world' }],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    tooltip: 'Cria a pista oval (grama + asfalto + árvores).',
  },
  {
    type: 'sz_g3d_create_race_car',
    placement: 'start-only-command',
    message0: 'Criar carro do jogador no mundo %1 cor %2 e guardar em %3',
    args0: [
      { type: 'field_name_picker', name: 'WORLD', text: 'mundo', kind: 'g3d-world' },
      { type: 'field_colour', name: 'COLOR', colour: '#ef2d56' },
      { type: 'field_input', name: 'NAME', text: 'carro' },
    ],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    tooltip: 'Cria o carro do jogador na largada da pista.',
  },
  {
    type: 'sz_g3d_race_step',
    placement: 'loop-command',
    message0: 'Dirigir o carro %1 no mundo %2 (a cada quadro)',
    args0: [
      { type: 'field_name_picker', name: 'OBJ', text: 'carro', kind: 'g3d-object' },
      { type: 'field_name_picker', name: 'WORLD', text: 'mundo', kind: 'g3d-world' },
    ],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    tooltip:
      'Dá voltas na pista: ↑ acelera, ↓ freia. Conta as voltas. Use dentro de "A cada quadro".',
  },
  {
    type: 'sz_g3d_race_control',
    placement: 'command',
    message0: 'Carro %1: %2',
    args0: [
      { type: 'field_name_picker', name: 'OBJ', text: 'carro', kind: 'object3d' },
      {
        type: 'field_dropdown',
        name: 'MODE',
        options: GAME3D_DROPDOWN_OPTIONS.raceMode,
      },
    ],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    tooltip: 'Muda a marcha do carro (ótimo para botões na tela).',
  },
  {
    type: 'sz_g3d_run_rivals',
    placement: 'loop-command',
    message0: 'No mundo %1, soltar e mover os carros rivais',
    args0: [{ type: 'field_name_picker', name: 'WORLD', text: 'mundo', kind: 'g3d-world' }],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    tooltip: 'Cria e move carros/caminhões rivais pela pista. Use dentro de "A cada quadro".',
  },
  {
    type: 'sz_g3d_race_reset',
    placement: 'command',
    message0: 'Recomeçar a corrida: carro %1 no mundo %2',
    args0: [
      { type: 'field_name_picker', name: 'OBJ', text: 'carro', kind: 'g3d-object' },
      { type: 'field_name_picker', name: 'WORLD', text: 'mundo', kind: 'g3d-world' },
    ],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    tooltip: 'Volta o carro à largada e limpa os rivais (botão Recomeçar).',
  },
  {
    type: 'sz_g3d_race_hit',
    message0: 'o carro %1 bateu num rival? (mundo %2)',
    args0: [
      { type: 'field_name_picker', name: 'OBJ', text: 'carro', kind: 'g3d-object' },
      { type: 'field_name_picker', name: 'WORLD', text: 'mundo', kind: 'g3d-world' },
    ],
    output: 'JSValue',
    tooltip:
      'Verdadeiro quando o carro encosta num rival. Use num "se" para mostrar o fim de jogo.',
  },
  {
    type: 'sz_g3d_race_laps',
    message0: 'as voltas (pontuação) do carro %1',
    args0: [{ type: 'field_name_picker', name: 'OBJ', text: 'carro', kind: 'object3d' }],
    output: 'JSValue',
    tooltip:
      'Quantas voltas o carro completou (a pontuação). Use num "se" ou para mostrar o placar.',
  },

  // ---- GENÉRICOS: cair (com tombo), deslizar e girar (sem lib de física) ----
  {
    type: 'sz_g3d_fall',
    placement: 'loop-command',
    message0: 'fazer %1 cair girando',
    args0: [{ type: 'field_name_picker', name: 'OBJ', text: 'peca', kind: 'object3d' }],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    tooltip:
      'Solta o objeto em queda livre, girando, até sumir da tela (gravidade). Use dentro de "A cada quadro".',
  },
  {
    type: 'sz_g3d_slide_between',
    placement: 'loop-command',
    message0: 'Mover %1 no eixo %2 de %3 até %4 e voltar (%5 por segundo)',
    args0: [
      { type: 'field_name_picker', name: 'OBJ', text: 'plataforma', kind: 'object3d' },
      {
        type: 'field_dropdown',
        name: 'AXIS',
        options: GAME3D_DROPDOWN_OPTIONS.axis,
      },
      { type: 'input_value', name: 'MIN', check: 'JSValue' },
      { type: 'input_value', name: 'MAX', check: 'JSValue' },
      { type: 'input_value', name: 'SPEED', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    tooltip:
      'Faz o objeto ir e voltar entre dois limites num eixo (ótimo para plataformas). Use dentro de "A cada quadro".',
  },
  {
    type: 'sz_g3d_spin',
    placement: 'loop-command',
    message0: 'Girar %1 sem parar no eixo %2, %3 graus por segundo',
    args0: [
      { type: 'field_name_picker', name: 'OBJ', text: 'objeto', kind: 'object3d' },
      {
        type: 'field_dropdown',
        name: 'AXIS',
        options: GAME3D_DROPDOWN_OPTIONS.rotationAxis,
      },
      { type: 'input_value', name: 'SPEED', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    tooltip:
      'Gira o objeto continuamente num eixo (moedas, hélices, planetas). Use dentro de "A cada quadro".',
  },

  // ---- Kit Empilhar (torre de blocos) ----
  {
    type: 'sz_g3d_create_stack_scene',
    placement: 'start-only-command',
    message0: 'Criar mundo de empilhar no canvas %1 e guardar em %2',
    args0: [
      { type: 'field_name_picker', name: 'CANVAS', text: 'jogo', kind: 'canvas' },
      { type: 'field_input', name: 'NAME', text: 'torre' },
    ],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    tooltip:
      'Monta a cena com câmera isométrica (que sobe com a torre) e luz. Crie um <canvas> no HTML antes.',
  },
  {
    type: 'sz_g3d_create_stack_tower',
    placement: 'start-only-command',
    message0: 'No mundo %1, montar a base da torre',
    args0: [{ type: 'field_name_picker', name: 'WORLD', text: 'torre', kind: 'g3d-world' }],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    tooltip: 'Cria a base e o primeiro bloco que desliza, pronto para empilhar.',
  },
  {
    type: 'sz_g3d_stack_drop',
    placement: 'action-command',
    message0: 'Soltar o bloco do mundo %1',
    args0: [{ type: 'field_name_picker', name: 'WORLD', text: 'torre', kind: 'g3d-world' }],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    tooltip:
      'Encaixa o bloco que se move: a parte que sobra é cortada e cai. Errar o encaixe acaba o jogo. Ligue ao clique ou à tecla espaço.',
  },
  {
    type: 'sz_g3d_stack_step',
    placement: 'loop-command',
    message0: 'Atualizar a torre %1 (a cada quadro)',
    args0: [{ type: 'field_name_picker', name: 'WORLD', text: 'torre', kind: 'g3d-world' }],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    tooltip:
      'Desliza o bloco do topo, sobe a câmera e faz as sobras caírem. Use dentro de "A cada quadro".',
  },
  {
    type: 'sz_g3d_stack_reset',
    placement: 'command',
    message0: 'Recomeçar a torre %1',
    args0: [{ type: 'field_name_picker', name: 'WORLD', text: 'torre', kind: 'g3d-world' }],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    tooltip: 'Limpa a torre e começa de novo (botão Recomeçar).',
  },
  {
    type: 'sz_g3d_stack_score',
    message0: 'a pontuação (andares) da torre %1',
    args0: [{ type: 'field_name_picker', name: 'WORLD', text: 'torre', kind: 'g3d-world' }],
    output: 'JSValue',
    tooltip: 'Quantos andares já foram empilhados (a pontuação). Use num "se" ou no placar.',
  },
  {
    type: 'sz_g3d_stack_game_over',
    message0: 'a torre %1 caiu (fim de jogo)?',
    args0: [{ type: 'field_name_picker', name: 'WORLD', text: 'torre', kind: 'g3d-world' }],
    output: 'JSValue',
    tooltip: 'Verdadeiro quando o jogador erra o encaixe. Use num "se" para mostrar o fim de jogo.',
  },

  // ---- GENÉRICOS: ler posição/rotação/escala + tempo do quadro (valores) ----
  {
    type: 'sz_g3d_get_pos',
    message0: 'posição %1 do objeto %2',
    args0: [
      {
        type: 'field_dropdown',
        name: 'AXIS',
        options: GAME3D_DROPDOWN_OPTIONS.propertyAxis,
      },
      { type: 'field_name_picker', name: 'OBJ', text: 'jogador', kind: 'object3d' },
    ],
    output: 'JSValue',
    tooltip: 'Lê uma coordenada da posição do objeto. Use numa conta ou num "se".',
  },
  {
    type: 'sz_g3d_get_rot',
    message0: 'giro %1 do objeto %2 (graus)',
    args0: [
      {
        type: 'field_dropdown',
        name: 'AXIS',
        options: GAME3D_DROPDOWN_OPTIONS.propertyAxis,
      },
      { type: 'field_name_picker', name: 'OBJ', text: 'jogador', kind: 'object3d' },
    ],
    output: 'JSValue',
    tooltip: 'Lê o giro do objeto num eixo, em graus.',
  },
  {
    type: 'sz_g3d_get_scale',
    message0: 'tamanho (escala) do objeto %1',
    args0: [{ type: 'field_name_picker', name: 'OBJ', text: 'jogador', kind: 'object3d' }],
    output: 'JSValue',
    tooltip: 'Lê o tamanho atual do objeto (1 = normal).',
  },
  {
    type: 'sz_g3d_get_vel',
    message0: 'velocidade %1 do objeto %2 (por segundo)',
    args0: [
      {
        type: 'field_dropdown',
        name: 'AXIS',
        options: GAME3D_DROPDOWN_OPTIONS.propertyAxis,
      },
      { type: 'field_name_picker', name: 'OBJ', text: 'jogador', kind: 'object3d' },
    ],
    output: 'JSValue',
    tooltip:
      'Lê quanto o objeto anda por segundo num eixo (a mesma que "Velocidade do objeto" grava). Use numa conta ou num "se".',
  },
  {
    type: 'sz_g3d_get_speed',
    message0: 'velocidade total do objeto %1 (por segundo)',
    args0: [{ type: 'field_name_picker', name: 'OBJ', text: 'jogador', kind: 'object3d' }],
    output: 'JSValue',
    tooltip: 'O quão rápido o objeto se move, juntando os três eixos. É sempre 0 ou positivo.',
  },
  {
    type: 'sz_g3d_is_moving',
    message0: 'o objeto %1 está se movendo?',
    args0: [{ type: 'field_name_picker', name: 'OBJ', text: 'jogador', kind: 'object3d' }],
    output: 'JSValue',
    tooltip: 'Verdadeiro quando o objeto tem alguma velocidade em qualquer eixo. Use num "se".',
  },
  {
    type: 'sz_g3d_dt',
    message0: 'o tempo deste quadro (em segundos) na cena %1',
    args0: [{ type: 'field_name_picker', name: 'WORLD', text: 'cena', kind: 'g3d-world' }],
    output: 'JSValue',
    tooltip:
      'Quantos segundos passaram desde o quadro anterior. Multiplique uma velocidade por segundo por ele para andar o pedaço certo neste quadro.',
  },

  // ---- GENÉRICOS: mover/girar DE UMA VEZ + aproximar ----
  {
    type: 'sz_g3d_move_by',
    placement: 'command',
    message0: 'Mover %1 de uma vez: x %2 y %3 z %4',
    args0: [
      { type: 'field_name_picker', name: 'OBJ', text: 'jogador', kind: 'object3d' },
      { type: 'input_value', name: 'X', check: 'JSValue' },
      { type: 'input_value', name: 'Y', check: 'JSValue' },
      { type: 'input_value', name: 'Z', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    tooltip:
      'Dá um passo: soma esses números à posição de agora, uma vez só. Para andar sem parar, use a velocidade.',
  },
  {
    type: 'sz_g3d_rotate_by',
    placement: 'command',
    message0: 'Girar %1 %3 graus no eixo %2',
    args0: [
      { type: 'field_name_picker', name: 'OBJ', text: 'jogador', kind: 'object3d' },
      {
        type: 'field_dropdown',
        name: 'AXIS',
        options: GAME3D_DROPDOWN_OPTIONS.rotationAxis,
      },
      { type: 'input_value', name: 'AMOUNT', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    tooltip:
      'Gira o objeto de uma vez, a partir de onde ele está (90 = um quarto de volta). Para girar sem parar, use "Girar … sem parar".',
  },
  {
    type: 'sz_g3d_move_towards',
    placement: 'loop-command',
    message0: 'Levar %1 até x %2 y %3 z %4 aos poucos (rapidez %5)',
    args0: [
      { type: 'field_name_picker', name: 'OBJ', text: 'jogador', kind: 'object3d' },
      { type: 'input_value', name: 'X', check: 'JSValue' },
      { type: 'input_value', name: 'Y', check: 'JSValue' },
      { type: 'input_value', name: 'Z', check: 'JSValue' },
      { type: 'input_value', name: 'FACTOR', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    tooltip:
      'Leva o objeto até o ponto aos poucos, freando ao chegar. Rapidez 5 é suave; números maiores chegam mais rápido. Ótimo para perseguir.',
  },

  // ---- GENÉRICOS: olhar / apontar / andar para frente ----
  {
    type: 'sz_g3d_look_at_object',
    placement: 'command',
    message0: 'virar %1 para olhar o objeto %2',
    args0: [
      { type: 'field_name_picker', name: 'A', text: 'canhao', kind: 'object3d' },
      { type: 'field_name_picker', name: 'B', text: 'alvo', kind: 'object3d' },
    ],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    tooltip: 'Faz o primeiro objeto apontar para o segundo (mira/perseguição).',
  },
  {
    type: 'sz_g3d_look_at_point',
    placement: 'command',
    message0: 'virar %1 para o ponto x %2 y %3 z %4',
    args0: [
      { type: 'field_name_picker', name: 'OBJ', text: 'jogador', kind: 'object3d' },
      { type: 'input_value', name: 'X', check: 'JSValue' },
      { type: 'input_value', name: 'Y', check: 'JSValue' },
      { type: 'input_value', name: 'Z', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    tooltip: 'Faz o objeto apontar para um ponto da cena.',
  },
  {
    type: 'sz_g3d_move_forward',
    placement: 'loop-command',
    message0: 'Andar com %1 para a frente, %2 por segundo',
    args0: [
      { type: 'field_name_picker', name: 'OBJ', text: 'jogador', kind: 'object3d' },
      { type: 'input_value', name: 'DIST', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    tooltip:
      'Anda para onde o objeto está virado. Com a câmera em 1ª pessoa nele, anda para onde o jogador olha. Use dentro de "A cada quadro".',
  },
  {
    type: 'sz_g3d_face_velocity',
    placement: 'command',
    message0: 'girar %1 para a direção do movimento',
    args0: [{ type: 'field_name_picker', name: 'OBJ', text: 'jogador', kind: 'object3d' }],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    tooltip: 'Vira o objeto para onde ele está se movendo (use com velocidade/física).',
  },
  {
    type: 'sz_g3d_angle_to',
    message0: 'ângulo de %1 para %2 no chão (graus)',
    args0: [
      { type: 'field_name_picker', name: 'A', text: 'jogador', kind: 'object3d' },
      { type: 'field_name_picker', name: 'B', text: 'alvo', kind: 'object3d' },
    ],
    output: 'JSValue',
    tooltip: 'O ângulo, em graus, de A para B no plano do chão. Use para mirar ou girar.',
  },

  // ---- GENÉRICOS: mira & clique (raycast) ----
  {
    type: 'sz_g3d_pick_at_mouse',
    message0: 'objeto sob o mouse na cena %1',
    args0: [{ type: 'field_name_picker', name: 'WORLD', text: 'cena', kind: 'g3d-world' }],
    output: 'JSValue',
    tooltip:
      'O objeto 3D que está embaixo do ponteiro (ou vazio). Guarde numa variável para usá-lo.',
  },
  {
    type: 'sz_g3d_pointer_over',
    message0: 'o mouse está sobre o objeto %1 (cena %2)?',
    args0: [
      { type: 'field_name_picker', name: 'OBJ', text: 'botao', kind: 'g3d-object' },
      { type: 'field_name_picker', name: 'WORLD', text: 'cena', kind: 'g3d-world' },
    ],
    output: 'JSValue',
    tooltip: 'Verdadeiro quando o ponteiro está em cima daquele objeto. Use num "se".',
  },
  {
    type: 'sz_g3d_aim_ahead',
    message0: 'objeto que %1 está mirando (cena %2, alcance %3)',
    args0: [
      { type: 'field_name_picker', name: 'OBJ', text: 'jogador', kind: 'g3d-object' },
      { type: 'field_name_picker', name: 'WORLD', text: 'cena', kind: 'g3d-world' },
      { type: 'input_value', name: 'DIST', check: 'JSValue' },
    ],
    inputsInline: true,
    output: 'JSValue',
    tooltip:
      'O objeto à frente, na direção que o objeto olha (tiro/mira). Com a câmera em primeira pessoa nesse objeto, mira o que o jogador VÊ (inclui olhar para cima/baixo). Vazio se não houver nada.',
  },
  {
    type: 'sz_g3d_on_ground',
    message0: 'tem chão sob %1 (cena %2)?',
    args0: [
      { type: 'field_name_picker', name: 'OBJ', text: 'jogador', kind: 'g3d-object' },
      { type: 'field_name_picker', name: 'WORLD', text: 'cena', kind: 'g3d-world' },
    ],
    output: 'JSValue',
    tooltip:
      'Verdadeiro quando há um objeto logo abaixo (pisando no chão/plataforma). Use num "se".',
  },
  {
    type: 'sz_g3d_ground_height',
    message0: 'altura do chão sob %1 (cena %2)',
    args0: [
      { type: 'field_name_picker', name: 'OBJ', text: 'jogador', kind: 'g3d-object' },
      { type: 'field_name_picker', name: 'WORLD', text: 'cena', kind: 'g3d-world' },
    ],
    output: 'JSValue',
    tooltip: 'A altura (y) do topo do objeto que está logo abaixo. Útil para encostar no chão.',
  },

  // ---- GENÉRICOS: física avançada (corpo, sólidos, presets) ----
  {
    type: 'sz_g3d_body',
    placement: 'start-only-command',
    message0: 'Dar corpo físico a %1 com gravidade %2',
    args0: [
      { type: 'field_name_picker', name: 'OBJ', text: 'jogador', kind: 'object3d' },
      { type: 'input_value', name: 'GRAVITY', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    tooltip:
      'Liga a física no objeto. A gravidade puxa para baixo: 36 é o normal, menos é mais leve, 0 flutua. (Sem corpo físico, o "Mover com gravidade" usa 7, bem mais leve: o mesmo pulo sobe mais.)',
  },
  {
    type: 'sz_g3d_step_body',
    placement: 'loop-command',
    message0: 'mover %1 com física no mundo %2',
    args0: [
      { type: 'field_name_picker', name: 'OBJ', text: 'jogador', kind: 'g3d-object' },
      { type: 'field_name_picker', name: 'WORLD', text: 'cena', kind: 'g3d-world' },
    ],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    tooltip:
      'Aplica a gravidade e empurra para fora dos objetos sólidos. Use dentro de "A cada quadro".',
  },
  {
    type: 'sz_g3d_set_solid',
    placement: 'start-only-command',
    message0: 'marcar %1 como sólido (não atravessa)',
    args0: [{ type: 'field_name_picker', name: 'OBJ', text: 'chao', kind: 'object3d' }],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    tooltip:
      'Diz que esse objeto é obstáculo (pedra, árvore, parede, chão): quem anda com as setas ou pela física não o atravessa.',
  },
  {
    type: 'sz_g3d_platformer_controls',
    placement: 'loop-command',
    message0: 'Controle de plataforma para %1 no mundo %2 (%3 por segundo, pulo %4)',
    args0: [
      { type: 'field_name_picker', name: 'OBJ', text: 'jogador', kind: 'g3d-object' },
      { type: 'field_name_picker', name: 'WORLD', text: 'cena', kind: 'g3d-world' },
      { type: 'input_value', name: 'SPEED', check: 'JSValue' },
      { type: 'input_value', name: 'JUMP', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    tooltip:
      'Anda com WASD/setas + pula no espaço, com gravidade e colisão. Use dentro de "A cada quadro".',
  },
  // ---- 🍄 Kit Plataforma: correr e pular de lado ----
  {
    type: 'sz_g3d_create_platform_scene',
    placement: 'start-only-command',
    message0: 'Criar cena de plataforma 3D no canvas %1 e guardar em %2',
    args0: [
      // Mesma regra dos outros kits: o canvas é ESCOLHIDO (seletor); o nome é DECLARADO.
      { type: 'field_name_picker', name: 'CANVAS', text: 'tela', kind: 'canvas' },
      { type: 'field_input', name: 'VAR', text: 'jogo' },
    ],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    tooltip: 'Prepara tudo de uma vez para um jogo de correr e pular: céu, luz e a câmera de lado.',
  },
  {
    type: 'sz_g3d_create_hero',
    placement: 'start-only-command',
    message0: 'Criar o herói %1 na cena %2 com a cor %3',
    args0: [
      { type: 'field_input', name: 'VAR', text: 'heroi' },
      { type: 'field_name_picker', name: 'WORLD', text: 'jogo', kind: 'g3d-world' },
      { type: 'field_colour', name: 'COLOR', colour: '#e03010' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    tooltip: 'Cria o personagem que você controla, já com peso e colisão.',
  },
  {
    type: 'sz_g3d_stage_theme',
    placement: 'command',
    message0: 'Na cena %1 usar o cenário %2',
    args0: [
      { type: 'field_name_picker', name: 'WORLD', text: 'jogo', kind: 'g3d-world' },
      { type: 'field_dropdown', name: 'THEME', options: GAME3D_DROPDOWN_OPTIONS.stageTheme },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    tooltip: 'Troca o clima da fase: céu, cores do chão e neblina.',
  },
  {
    type: 'sz_g3d_load_stage',
    placement: 'command',
    message0: 'Na cena %1 montar a fase %2',
    args0: [
      { type: 'field_name_picker', name: 'WORLD', text: 'jogo', kind: 'g3d-world' },
      { type: 'input_value', name: 'MAP', check: 'JSValue' },
    ],
    inputsInline: false,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    tooltip:
      'Desenha a fase a partir do mapa escrito. Cada assunto vem separado por ponto e vírgula: chao, tijolo, surpresa, solido, cano, moeda, inimigo, mastro, castelo, checkpoint, tempo e tema.',
  },
  {
    type: 'sz_g3d_clear_stage',
    placement: 'command',
    message0: 'Limpar a fase da cena %1',
    args0: [{ type: 'field_name_picker', name: 'WORLD', text: 'jogo', kind: 'g3d-world' }],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    tooltip: 'Tira todas as peças da fase da tela (use antes de montar outra).',
  },
  {
    type: 'sz_g3d_stage_reset',
    placement: 'command',
    message0: 'Recomeçar a fase da cena %1',
    args0: [{ type: 'field_name_picker', name: 'WORLD', text: 'jogo', kind: 'g3d-world' }],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    tooltip:
      'Devolve inimigos, moedas e blocos ao começo, e leva o herói para o início ou para o checkpoint.',
  },
  {
    type: 'sz_g3d_stage_step',
    placement: 'loop-command',
    message0: 'Atualizar a fase da cena %1 com o herói %2',
    args0: [
      { type: 'field_name_picker', name: 'WORLD', text: 'jogo', kind: 'g3d-world' },
      { type: 'field_name_picker', name: 'OBJ', text: 'heroi', kind: 'g3d-object' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    tooltip:
      'Um quadro do jogo: move os inimigos, confere as batidas, os itens, o relógio e vai montando a fase à frente. Use dentro de "A cada quadro".',
  },
  {
    type: 'sz_g3d_side_camera',
    placement: 'loop-command',
    message0: 'Câmera de lado na cena %1 seguindo %2',
    args0: [
      { type: 'field_name_picker', name: 'WORLD', text: 'jogo', kind: 'g3d-world' },
      { type: 'field_name_picker', name: 'OBJ', text: 'heroi', kind: 'g3d-object' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    tooltip:
      'Acompanha o herói para a direita e nunca volta para trás, como nos jogos antigos de plataforma.',
  },
  {
    type: 'sz_g3d_shoot_fire',
    placement: 'loop-command',
    message0: 'Soltar uma bola de fogo de %2 na cena %1',
    args0: [
      { type: 'field_name_picker', name: 'WORLD', text: 'jogo', kind: 'g3d-world' },
      { type: 'field_name_picker', name: 'OBJ', text: 'heroi', kind: 'g3d-object' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    tooltip:
      'Só funciona depois da flor de fogo. A bola quica no chão, some longe e derrete o inimigo que encostar (no máximo três de cada vez).',
  },
  {
    type: 'sz_g3d_stage_number',
    placement: 'command',
    message0: 'Na cena %1 é o mundo %2 fase %3',
    args0: [
      { type: 'field_name_picker', name: 'WORLD', text: 'jogo', kind: 'g3d-world' },
      { type: 'input_value', name: 'WORLDN', check: 'JSValue' },
      { type: 'input_value', name: 'STAGEN', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    tooltip: 'Diz em que mundo e em que fase o jogador está (aparece no placar).',
  },
  {
    type: 'sz_g3d_on_stage_event',
    // É um "Quando…": mora em ⚡ Quando acontecer (lote 5 do review 3D; era registrado em
    // "Ao iniciar" antes de a regra de eventos do `ir/lifecycle.ts` incluir o `g3d:`).
    placement: 'event',
    // ⚠️ O corpo roda depois, e sem declarar contexto o corpo não concedia contexto
    // NENHUM: o Blockly recusava qualquer bloco que exija estar dentro de alguma coisa,
    // e o sintoma era o projeto salvo falhar ao RESTAURAR ("could not connect its
    // previous connection"), que é como o exemplo Reino Cogumelo quebrou.
    //
    // É `game-event-body` porque o acontecimento é despachado de DENTRO do laço
    // que já está rodando (`sz_g3d_stage_step` é `loop-command` e a cadeia é
    // stage_step → stepStageCoins → takeCoin → fireStage), mas UMA vez por
    // acontecimento. O áudio (`AUDIO_ACTION_PLACEMENT`) aceita esse contexto, então
    // o som da moeda encaixa e começar áudio fora do jogo rodando segue proibido.
    // ⚠️ Era `loop-body`, e aí o Blockly recusava a música e a torre (que proíbem
    // laço) enquanto a IR aceitava (projeto abria pela metade), e aceitava comando
    // contínuo dentro de um "Se" que a IR recusava. A matriz
    // `game3dRules/__tests__/blocklyIrMatrix.test.ts` trava os dois lados.
    bodyContext: 'game-event-body',
    message0: 'Quando na fase %1 acontecer %2',
    args0: [
      { type: 'field_name_picker', name: 'WORLD', text: 'jogo', kind: 'g3d-world' },
      { type: 'field_dropdown', name: 'EVENT', options: GAME3D_DROPDOWN_OPTIONS.stageEvent },
    ],
    message1: 'fazer %1',
    args1: [{ type: 'input_statement', name: 'BODY' }],
    inputsInline: false,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    tooltip:
      'Roda os blocos de dentro toda vez que aquilo acontecer na fase. Um aviso por acontecimento.',
  },
  {
    type: 'sz_g3d_classic_platformer',
    placement: 'loop-command',
    message0: 'Plataforma clássica para %1 no mundo %2 (%3 por segundo, pulo %4)',
    args0: [
      { type: 'field_name_picker', name: 'OBJ', text: 'jogador', kind: 'g3d-object' },
      { type: 'field_name_picker', name: 'WORLD', text: 'cena', kind: 'g3d-world' },
      { type: 'input_value', name: 'SPEED', check: 'JSValue' },
      { type: 'input_value', name: 'JUMP', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    tooltip:
      'Anda só para os lados, mas com peso: acelera, derrapa ao virar, corre no dobro segurando Shift e pula mais alto quanto mais tempo você segura o botão. Use dentro de "A cada quadro".',
  },
  {
    type: 'sz_g3d_carry_riders',
    placement: 'start-only-command',
    message0: 'fazer %1 carregar quem está em cima',
    args0: [{ type: 'field_name_picker', name: 'OBJ', text: 'plataforma', kind: 'object3d' }],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    tooltip:
      'Quem estiver em pé nessa plataforma anda junto com ela. Serve para elevadores e plataformas que se movem.',
  },
  {
    type: 'sz_g3d_pass_under',
    placement: 'start-only-command',
    message0: 'fazer %1 ser atravessável por baixo',
    args0: [{ type: 'field_name_picker', name: 'OBJ', text: 'plataforma', kind: 'object3d' }],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    tooltip:
      'Dá para pular por dentro dela de baixo para cima, mas dá para pousar em cima. É a plataforma dos jogos de pulo.',
  },
  {
    type: 'sz_g3d_for_each_hit',
    placement: 'command',
    bodyExecution: 'sync-callback',
    message0: 'Para cada batida de %1 com %2, chamando de %3',
    args0: [
      { type: 'field_name_picker', name: 'OBJ', text: 'jogador', kind: 'g3d-object' },
      { type: 'field_dropdown', name: 'SIDE', options: GAME3D_DROPDOWN_OPTIONS.hitSide },
      { type: 'field_input', name: 'ITEM', text: 'batida' },
    ],
    message1: 'fazer %1',
    args1: [{ type: 'input_statement', name: 'BODY' }],
    inputsInline: false,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    tooltip:
      'Repete os blocos de dentro para cada coisa em que o objeto encostou no último passo de física, do lado escolhido. Pisar em cima, bater a cabeça e esbarrar de lado são batidas diferentes.',
  },
  {
    type: 'sz_g3d_set_object_value',
    placement: 'command',
    message0: 'guardar %1 em %2 do objeto %3',
    args0: [
      { type: 'input_value', name: 'VALUE', check: 'JSValue' },
      { type: 'field_input', name: 'KEY', text: 'direcao' },
      { type: 'field_name_picker', name: 'OBJ', text: 'item', kind: 'g3d-object' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    tooltip:
      'Guarda um número no objeto, com um nome: a direção que ele anda, quanto tempo falta, quantas vidas tem. Leia com "… do objeto".',
  },
  {
    type: 'sz_g3d_fps_controls',
    placement: 'loop-command',
    message0: 'Controle de 1ª pessoa para %1 no mundo %2 (%3 por segundo)',
    args0: [
      { type: 'field_name_picker', name: 'OBJ', text: 'jogador', kind: 'g3d-object' },
      { type: 'field_name_picker', name: 'WORLD', text: 'cena', kind: 'g3d-world' },
      { type: 'input_value', name: 'SPEED', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    tooltip:
      'Anda com WASD na direção que o jogador olha (combine com a câmera de primeira pessoa). Use dentro de "A cada quadro".',
  },
  {
    type: 'sz_g3d_resolve_collision',
    placement: 'command',
    message0: 'empurrar %1 para fora de %2',
    args0: [
      { type: 'field_name_picker', name: 'A', text: 'jogador', kind: 'object3d' },
      { type: 'field_name_picker', name: 'B', text: 'parede', kind: 'object3d' },
    ],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    tooltip: 'Se A está dentro de B, empurra A para fora (colisão manual entre dois objetos).',
  },

  // ---- GENÉRICOS: câmera — olhar e lente ----
  {
    type: 'sz_g3d_camera_look_at',
    placement: 'command',
    message0: 'Câmera da cena %1: olhar para %2',
    args0: [
      { type: 'field_name_picker', name: 'WORLD', text: 'cena', kind: 'g3d-world' },
      { type: 'field_name_picker', name: 'OBJ', text: 'jogador', kind: 'g3d-object' },
    ],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    tooltip: 'Aponta a câmera para um objeto.',
  },
  {
    type: 'sz_g3d_set_fov',
    placement: 'command',
    message0: 'Lente da câmera da cena %1: %2 graus',
    args0: [
      { type: 'field_name_picker', name: 'WORLD', text: 'cena', kind: 'g3d-world' },
      { type: 'input_value', name: 'DEG', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    tooltip: 'Muda o "zoom" da câmera (graus): menos = mais zoom, mais = grande angular.',
  },

  // ---- GENÉRICOS: formas, materiais, texturas, modelo (Fase 6) ----
  {
    type: 'sz_g3d_create_cylinder',
    placement: 'start-only-command',
    message0: 'Criar cilindro %1 na cena %2 (raio %3, altura %4, cor %5)',
    args0: [
      { type: 'field_input', name: 'NAME', text: 'cilindro' },
      { type: 'field_name_picker', name: 'WORLD', text: 'cena', kind: 'g3d-world' },
      { type: 'input_value', name: 'RADIUS', check: 'JSValue' },
      { type: 'input_value', name: 'HEIGHT', check: 'JSValue' },
      { type: 'field_colour', name: 'COLOR', colour: '#22d3ee' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    tooltip: 'Cria um cilindro com o raio, a altura e a cor escolhidos.',
  },
  {
    type: 'sz_g3d_create_cone',
    placement: 'start-only-command',
    message0: 'Criar cone %1 na cena %2 (raio %3, altura %4, cor %5)',
    args0: [
      { type: 'field_input', name: 'NAME', text: 'cone' },
      { type: 'field_name_picker', name: 'WORLD', text: 'cena', kind: 'g3d-world' },
      { type: 'input_value', name: 'RADIUS', check: 'JSValue' },
      { type: 'input_value', name: 'HEIGHT', check: 'JSValue' },
      { type: 'field_colour', name: 'COLOR', colour: '#f59e0b' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    tooltip: 'Cria um cone com o raio da base, a altura e a cor escolhidos.',
  },
  {
    type: 'sz_g3d_create_plane',
    placement: 'start-only-command',
    message0: 'Criar plano (chão) %1 na cena %2 (largura %3, profundidade %4, cor %5)',
    args0: [
      { type: 'field_input', name: 'NAME', text: 'chao' },
      { type: 'field_name_picker', name: 'WORLD', text: 'cena', kind: 'g3d-world' },
      { type: 'input_value', name: 'W', check: 'JSValue' },
      { type: 'input_value', name: 'D', check: 'JSValue' },
      { type: 'field_colour', name: 'COLOR', colour: '#67c240' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    tooltip: 'Um plano fino deitado no chão (ótimo para o chão do jogo).',
  },
  {
    type: 'sz_g3d_create_torus',
    placement: 'start-only-command',
    message0: 'Criar rosca (anel) %1 na cena %2 (raio %3, grossura %4, cor %5)',
    args0: [
      { type: 'field_input', name: 'NAME', text: 'anel' },
      { type: 'field_name_picker', name: 'WORLD', text: 'cena', kind: 'g3d-world' },
      { type: 'input_value', name: 'RADIUS', check: 'JSValue' },
      { type: 'input_value', name: 'TUBE', check: 'JSValue' },
      { type: 'field_colour', name: 'COLOR', colour: '#a78bfa' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    tooltip: 'Cria um anel 3D; raio controla o tamanho e grossura controla o tubo.',
  },
  {
    type: 'sz_g3d_create_model',
    placement: 'start-only-command',
    message0: 'Criar modelo %1 na cena %2',
    args0: [
      { type: 'field_input', name: 'NAME', text: 'modelo' },
      { type: 'field_name_picker', name: 'WORLD', text: 'cena', kind: 'g3d-world' },
    ],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    tooltip: 'Um grupo vazio para montar um modelo com várias peças (use "adicionar ao modelo").',
  },
  {
    // Modelo de VERDADE (.glb trazido do Molda ou enviado): nasce como um cubo de
    // reserva e vira o arquivo quando o parse resolve (o `runProject` é síncrono).
    type: 'sz_g3d_create_model_file',
    placement: 'start-only-command',
    message0: 'Criar o objeto %1 com o modelo %2 na cena %3 tamanho %4',
    args0: [
      { type: 'field_input', name: 'NAME', text: 'nave' },
      { type: 'field_asset_picker', name: 'MODEL', text: 'modelo', kind: '3d', filter: 'model3d' },
      { type: 'field_name_picker', name: 'WORLD', text: 'cena', kind: 'g3d-world' },
      { type: 'input_value', name: 'SIZE', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    tooltip:
      'Põe na cena um modelo 3D do Molda (ou enviado em "Modelos 3D"). Nasce como um cubo e ganha a forma assim que carrega; o tamanho é o lado maior, em blocos.',
  },
  // ---- 🎬 Animação do modelo (review 3D, lote 6): os clipes que a criança fez no Molda ----
  {
    type: 'sz_g3d_play_animation',
    placement: 'command',
    message0: 'Tocar a animação %1 em %2 %3',
    args0: [
      { type: 'field_model_clip_picker', name: 'CLIP', text: 'Andar' },
      { type: 'field_name_picker', name: 'OBJ', text: 'heroi', kind: 'g3d-object' },
      { type: 'field_dropdown', name: 'MODE', options: GAME3D_DROPDOWN_OPTIONS.animationMode },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    tooltip:
      'Toca uma animação feita no Molda (escolha o nome na lista). No "A cada quadro" ela continua sem recomeçar; trocar de nome troca de animação suavemente.',
  },
  {
    type: 'sz_g3d_stop_animation',
    placement: 'command',
    message0: 'Parar a animação de %1',
    args0: [{ type: 'field_name_picker', name: 'OBJ', text: 'heroi', kind: 'g3d-object' }],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    tooltip: 'Para a animação do modelo, que fica na pose em que estava.',
  },
  {
    type: 'sz_g3d_animation_done',
    message0: '%1 terminou a animação?',
    args0: [{ type: 'field_name_picker', name: 'OBJ', text: 'heroi', kind: 'g3d-object' }],
    output: 'JSValue',
    tooltip:
      'Verdadeiro quando uma animação tocada "uma vez" chegou ao fim. Use num "se" para emendar outra.',
  },
  {
    type: 'sz_g3d_add_to_model',
    placement: 'start-only-command',
    message0: 'Adicionar %1 ao modelo %2',
    args0: [
      { type: 'field_name_picker', name: 'PART', text: 'peca', kind: 'g3d-object' },
      { type: 'field_name_picker', name: 'MODEL', text: 'modelo', kind: 'g3d-object' },
    ],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    tooltip: 'Junta uma peça (objeto) ao modelo. Mover o modelo move todas as peças juntas.',
  },
  {
    type: 'sz_g3d_set_visible',
    placement: 'command',
    message0: '%1 o objeto %2',
    args0: [
      {
        type: 'field_dropdown',
        name: 'MODE',
        options: GAME3D_DROPDOWN_OPTIONS.visibility,
      },
      { type: 'field_name_picker', name: 'OBJ', text: 'objeto', kind: 'object3d' },
    ],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    tooltip: 'Mostra ou esconde o objeto (continua existindo, só não aparece).',
  },
  {
    type: 'sz_g3d_remove_object',
    placement: 'command',
    message0: 'Remover %1 da cena %2',
    args0: [
      { type: 'field_name_picker', name: 'OBJ', text: 'objeto', kind: 'object3d' },
      { type: 'field_name_picker', name: 'WORLD', text: 'cena', kind: 'g3d-world' },
    ],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    tooltip: 'Tira o objeto da cena de vez (apaga e libera memória).',
  },
  {
    type: 'sz_g3d_set_color',
    placement: 'command',
    message0: 'Pintar %1 de %2',
    args0: [
      { type: 'field_name_picker', name: 'OBJ', text: 'objeto', kind: 'object3d' },
      { type: 'field_colour', name: 'COLOR', colour: '#ff5577' },
    ],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    tooltip: 'Troca a cor do objeto.',
  },
  {
    type: 'sz_g3d_set_opacity',
    placement: 'command',
    // Era "Transparência … (0 a 1)" com 1 = opaco: o nome dizia o contrário do número.
    message0: 'Quanto %1 aparece: %2 (0 = some, 1 = inteiro)',
    args0: [
      { type: 'field_name_picker', name: 'OBJ', text: 'objeto', kind: 'object3d' },
      { type: 'input_value', name: 'OPACITY', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    tooltip: 'Opacidade do objeto: 1 aparece inteiro, 0,5 fica meio transparente, 0 some.',
  },
  {
    type: 'sz_g3d_set_material',
    placement: 'start-only-command',
    message0: 'Deixar %1 com material %2',
    args0: [
      { type: 'field_name_picker', name: 'OBJ', text: 'objeto', kind: 'object3d' },
      {
        type: 'field_dropdown',
        name: 'KIND',
        options: GAME3D_DROPDOWN_OPTIONS.material,
      },
    ],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    tooltip: 'Muda o estilo da superfície (metal, vidro, brilhante ou só linhas).',
  },
  {
    type: 'sz_g3d_set_texture',
    placement: 'start-only-command',
    message0: 'Vestir %1 com a imagem %2 repetindo %3 vezes',
    args0: [
      { type: 'field_name_picker', name: 'OBJ', text: 'objeto', kind: 'object3d' },
      { type: 'field_asset_picker', name: 'ASSET', text: 'textura' },
      { type: 'input_value', name: 'REPEAT', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    tooltip:
      'Põe uma imagem do projeto na superfície do objeto. Repetir mais vezes deixa o desenho menor e lado a lado (bom para chão de grama ou parede de tijolo).',
  },
  {
    type: 'sz_g3d_paint_pattern',
    placement: 'start-only-command',
    message0: 'Pintar %1 com a estampa %2 nas cores %3 e %4',
    args0: [
      { type: 'field_name_picker', name: 'OBJ', text: 'objeto', kind: 'object3d' },
      { type: 'field_dropdown', name: 'PATTERN', options: GAME3D_DROPDOWN_OPTIONS.pattern },
      { type: 'field_colour', name: 'COLOR_A', colour: '#b5651d' },
      { type: 'field_colour', name: 'COLOR_B', colour: '#f2d0a4' },
    ],
    inputsInline: false,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    tooltip:
      'Desenha a estampa na hora, sem precisar de imagem nenhuma, e repete o desenho conforme o tamanho do objeto.',
  },
  {
    type: 'sz_g3d_no_shadow',
    placement: 'start-only-command',
    message0: 'deixar %1 sem sombra',
    args0: [{ type: 'field_name_picker', name: 'OBJ', text: 'objeto', kind: 'object3d' }],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    tooltip:
      'O objeto para de projetar sombra (continua recebendo). Deixa o jogo mais leve quando o cenário tem muitas peças.',
  },

  // ---- GENÉRICOS: luz & céu (Fase 7) ----
  {
    type: 'sz_g3d_add_ambient_light',
    placement: 'start-only-command',
    message0: 'Adicionar luz ambiente na cena %1 (cor %2, força %3)',
    args0: [
      { type: 'field_name_picker', name: 'WORLD', text: 'cena', kind: 'g3d-world' },
      { type: 'field_colour', name: 'COLOR', colour: '#ffffff' },
      { type: 'input_value', name: 'INTENSITY', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    tooltip:
      'Luz suave que clareia tudo por igual (sem sombra). Crie uma vez, fora do "a cada quadro".',
  },
  {
    type: 'sz_g3d_add_sun_light',
    placement: 'start-only-command',
    message0: 'Adicionar luz do sol na cena %1 (cor %2, força %3)',
    args0: [
      { type: 'field_name_picker', name: 'WORLD', text: 'cena', kind: 'g3d-world' },
      { type: 'field_colour', name: 'COLOR', colour: '#fff8e1' },
      { type: 'input_value', name: 'INTENSITY', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    tooltip: 'Luz direcional vinda do alto (como o sol), faz sombras.',
  },
  {
    type: 'sz_g3d_add_point_light',
    placement: 'start-only-command',
    message0: 'Adicionar luz pontual na cena %1 (cor %2, força %3) em x %4 y %5 z %6 %7',
    args0: [
      { type: 'field_name_picker', name: 'WORLD', text: 'cena', kind: 'g3d-world' },
      { type: 'field_colour', name: 'COLOR', colour: '#ffd27f' },
      { type: 'input_value', name: 'INTENSITY', check: 'JSValue' },
      { type: 'input_value', name: 'X', check: 'JSValue' },
      { type: 'input_value', name: 'Y', check: 'JSValue' },
      { type: 'input_value', name: 'Z', check: 'JSValue' },
      { type: 'field_dropdown', name: 'SHADOW', options: GAME3D_DROPDOWN_OPTIONS.pointShadow },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    tooltip:
      'Uma lâmpada/tocha que brilha de um ponto para todos os lados. Sem sombra é mais leve; "com sombra" vale para UMA luz pontual por cena.',
  },
  {
    type: 'sz_g3d_set_fog',
    placement: 'start-only-command',
    message0: 'Neblina na cena %1 (cor %2, perto %3, longe %4)',
    args0: [
      { type: 'field_name_picker', name: 'WORLD', text: 'cena', kind: 'g3d-world' },
      { type: 'field_colour', name: 'COLOR', colour: '#9ca3af' },
      { type: 'input_value', name: 'NEAR', check: 'JSValue' },
      { type: 'input_value', name: 'FAR', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    tooltip: 'Faz o que está longe sumir na névoa (começa em "perto", some em "longe").',
  },
  {
    type: 'sz_g3d_set_sky',
    placement: 'start-only-command',
    message0: 'Céu degradê na cena %1 (topo %2, horizonte %3)',
    args0: [
      { type: 'field_name_picker', name: 'WORLD', text: 'cena', kind: 'g3d-world' },
      { type: 'field_colour', name: 'TOP', colour: '#1e3a8a' },
      { type: 'field_colour', name: 'BOTTOM', colour: '#93c5fd' },
    ],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    tooltip: 'Pinta o fundo com um degradê do topo até o horizonte (céu).',
  },
  {
    type: 'sz_g3d_sky_photo',
    placement: 'start-only-command',
    message0: 'Usar o céu 360° %1 na cena %2',
    args0: [
      {
        type: 'field_asset_picker',
        name: 'PHOTO',
        text: 'ceu',
        kind: '3d',
        filter: 'environment3d',
      },
      { type: 'field_name_picker', name: 'WORLD', text: 'cena', kind: 'g3d-world' },
    ],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    tooltip:
      'Troca o fundo pelo céu 360° (arquivo .hdr que você trouxe do Molda ou enviou). Ele também ilumina a cena e dá reflexo aos objetos.',
  },
  {
    type: 'sz_g3d_set_shadows',
    placement: 'start-only-command',
    message0: '%1 as sombras na cena %2',
    args0: [
      {
        type: 'field_dropdown',
        name: 'MODE',
        options: GAME3D_DROPDOWN_OPTIONS.shadows,
      },
      { type: 'field_name_picker', name: 'WORLD', text: 'cena', kind: 'g3d-world' },
    ],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    tooltip: 'Liga ou desliga as sombras da cena (desligar deixa o jogo mais leve).',
  },

  // ---- GENÉRICOS: cópias de um molde num grupo + som (Fase 8) ----
  {
    type: 'sz_g3d_spawn_copy',
    placement: 'command',
    message0: 'Criar uma cópia de %1 no grupo %2 em x %3 y %4 z %5',
    args0: [
      { type: 'field_name_picker', name: 'ORIGINAL', text: 'molde', kind: 'g3d-object' },
      { type: 'field_name_picker', name: 'GROUP', text: 'inimigos', kind: 'group3d' },
      { type: 'input_value', name: 'X', check: 'JSValue' },
      { type: 'input_value', name: 'Y', check: 'JSValue' },
      { type: 'input_value', name: 'Z', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    tooltip:
      'Copia o objeto (o molde) e põe a cópia no grupo, nessa posição. Esconda o molde para ele servir só de modelo.',
  },
  {
    type: 'sz_g3d_prune_area',
    placement: 'command',
    message0: 'No grupo %1, tirar quem saiu de %2 a %3 no eixo %4',
    args0: [
      { type: 'field_name_picker', name: 'GROUP', text: 'inimigos', kind: 'group3d' },
      { type: 'input_value', name: 'MIN', check: 'JSValue' },
      { type: 'input_value', name: 'MAX', check: 'JSValue' },
      {
        type: 'field_dropdown',
        name: 'AXIS',
        options: GAME3D_DROPDOWN_OPTIONS.axis,
      },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    tooltip:
      'Tira do grupo (e da cena) quem passou desses limites no eixo. Deixa o jogo leve quando as coisas saem da área.',
  },
  {
    type: 'sz_g3d_play_note',
    placement: AUDIO_ACTION_PLACEMENT,
    message0: 'Tocar nota %1 Hz por %2 ms',
    args0: [
      { type: 'input_value', name: 'FREQ', check: 'JSValue' },
      { type: 'input_value', name: 'MS', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    tooltip: 'Toca um bip (mais Hz = mais agudo). Precisa de um clique antes (o navegador exige).',
  },
  {
    type: 'sz_g3d_play_effect',
    placement: AUDIO_ACTION_PLACEMENT,
    message0: 'Tocar o som pronto %1',
    args0: [
      {
        type: 'field_dropdown',
        name: 'KIND',
        options: GAME3D_DROPDOWN_OPTIONS.effect,
      },
    ],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    tooltip: 'Toca um efeito sonoro pronto (moeda, pulo, explosão ou acerto).',
  },
  // ---- 🔊 Som do projeto (os arquivos que a criança enviou) ----
  // Os dois blocos acima sintetizam o som na hora; estes tocam o mp3/wav que ela
  // importou. Molde copiado do Mundo 3D (`sz_w3d_load_sound` e cia.), inclusive
  // os rótulos — é o mesmo gesto, e a criança não deveria reaprender por app.
  {
    type: 'sz_g3d_load_sound',
    // Carregar não toca nada, então não precisa de gesto: prepara no início.
    placement: 'start-only-command',
    message0: 'Carregar o som %1 do arquivo %2',
    args0: [
      { type: 'field_input', name: 'NAME', text: 'moeda' },
      { type: 'field_asset_picker', name: 'ASSET', text: '', kind: 'audio' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    tooltip:
      'Prepara um som do projeto (envie o arquivo em "Sons", no menu ⋯) e dá um apelido a ele. Depois use "Tocar o som" com esse apelido. Faça no começo.',
  },
  {
    type: 'sz_g3d_play_sound',
    placement: AUDIO_ACTION_PLACEMENT,
    message0: 'Tocar o som %1',
    args0: [{ type: 'field_name_picker', name: 'NAME', text: 'moeda', kind: 'sound' }],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    tooltip: 'Toca um som que você carregou, pelo apelido. Use quando algo acontecer no jogo.',
  },
  {
    type: 'sz_g3d_stop_sound',
    placement: AUDIO_ACTION_PLACEMENT,
    message0: 'Parar o som %1',
    args0: [{ type: 'field_name_picker', name: 'NAME', text: 'moeda', kind: 'sound' }],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    tooltip: 'Para o som e volta ele para o começo.',
  },
  {
    type: 'sz_g3d_play_music',
    // `resource-creator`: dentro de um laço a faixa recomeçaria a cada quadro.
    placement: 'resource-creator',
    message0: 'Tocar a música %1 sem parar',
    args0: [{ type: 'field_name_picker', name: 'NAME', text: 'musica', kind: 'sound' }],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    tooltip:
      'Toca uma música do projeto em loop. Só uma música toca por vez: começar outra troca a que estava tocando. Repetir a mesma não recomeça a faixa.',
  },
  {
    type: 'sz_g3d_stop_music',
    placement: AUDIO_ACTION_PLACEMENT,
    message0: 'Parar a música',
    args0: [],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    tooltip: 'Desliga a música que estava tocando.',
  },
  {
    type: 'sz_g3d_set_volume',
    placement: AUDIO_ACTION_PLACEMENT,
    message0: 'Pôr o volume em %1',
    args0: [{ type: 'input_value', name: 'LEVEL', check: 'JSValue' }],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    tooltip: 'Volume de 0 (mudo) a 10 (bem alto). Vale para todos os sons do projeto.',
  },
] satisfies BlockDefinition[]

/**
 * As regras de jogo (placar, vida, telas, contagem, sorteio, tremer, piscar, tecla, clique e
 * encostar) vêm da fábrica COMPARTILHADA pelas três extensões 3D (`game3dRules/blocks.ts`).
 */
const GAME_THREE_D_RULES = gameRulesBlocks('g3d', {
  objectPicker: 'g3d-object',
  groupPicker: 'group3d',
  keys: GAME3D_DROPDOWN_OPTIONS.key,
})

const STACKED_INPUT_TYPES = new Set([
  'sz_g3d_create_block',
  'sz_g3d_add_row',
  'sz_g3d_slide_between',
  'sz_g3d_move_towards',
  'sz_g3d_create_cylinder',
  'sz_g3d_create_cone',
  'sz_g3d_create_plane',
  'sz_g3d_create_torus',
  'sz_g3d_add_point_light',
  'sz_g3d_spawn_copy',
])
const gameThreeDAllBlockDefinitions = [...gameThreeDBlockDefinitions, ...GAME_THREE_D_RULES.blocks]
for (const b of gameThreeDAllBlockDefinitions as BlockDefinition[]) {
  if (STACKED_INPUT_TYPES.has(b.type)) (b as { inputsInline?: boolean }).inputsInline = false
}

const numShadow = (value: number) => ({ shadow: { type: 'sz_val_number', fields: { NUM: value } } })
const txtShadow = (text: string) => ({ shadow: { type: 'sz_val_text', fields: { TEXT: text } } })

/**
 * Sombras dos soquetes de valor do Jogo 3D na paleta (espelho do `G2D_SOCKET_SHADOWS`):
 * tipo do bloco → { input → sombra de número editável }. Faz o oval já vir com o
 * valor padrão preenchido ao arrastar da paleta. Cresce a cada campo convertido.
 */
const G3D_SOCKET_SHADOWS: Record<string, Record<string, unknown>> = {
  sz_g3d_top_down: { SPEED: numShadow(3) },
  sz_g3d_walk_area: {
    MINX: numShadow(-10),
    MAXX: numShadow(10),
    MINZ: numShadow(-5),
    MAXZ: numShadow(5),
  },
  sz_g3d_frame_scene: { W: numShadow(24), H: numShadow(8), D: numShadow(16) },
  sz_g3d_set_camera: { X: numShadow(4), Y: numShadow(3), Z: numShadow(6) },
  sz_g3d_create_box: { SIZE: numShadow(1) },
  sz_g3d_create_model_file: { SIZE: numShadow(1) },
  sz_g3d_set_texture: { REPEAT: numShadow(1) },
  sz_g3d_create_sphere: { RADIUS: numShadow(0.5) },
  sz_g3d_create_block: { W: numShadow(10), H: numShadow(0.5), D: numShadow(50) },
  sz_g3d_set_position: { X: numShadow(0), Y: numShadow(0), Z: numShadow(0) },
  sz_g3d_set_rotation: { X: numShadow(0), Y: numShadow(0), Z: numShadow(0) },
  sz_g3d_set_scale: { FACTOR: numShadow(1) },
  sz_g3d_create_cylinder: { RADIUS: numShadow(0.5), HEIGHT: numShadow(1) },
  sz_g3d_create_cone: { RADIUS: numShadow(0.5), HEIGHT: numShadow(1) },
  sz_g3d_create_plane: { W: numShadow(10), D: numShadow(10) },
  sz_g3d_create_torus: { RADIUS: numShadow(0.5), TUBE: numShadow(0.2) },
  sz_g3d_control_keys: { SPEED: numShadow(3) },
  sz_g3d_set_velocity: { X: numShadow(0), Y: numShadow(0), Z: numShadow(0) },
  sz_g3d_jump: { FORCE: numShadow(5) },
  sz_g3d_grid_position: { ROW: numShadow(0), COL: numShadow(0) },
  sz_g3d_move_in_circle: { RADIUS: numShadow(7), SPEED: numShadow(60) },
  sz_g3d_slide_between: { MIN: numShadow(-5), MAX: numShadow(5), SPEED: numShadow(3) },
  sz_g3d_spin: { SPEED: numShadow(120) },
  sz_g3d_move_towards: {
    X: numShadow(0),
    Y: numShadow(0),
    Z: numShadow(0),
    FACTOR: numShadow(5),
  },
  sz_g3d_move_by: { X: numShadow(1), Y: numShadow(0), Z: numShadow(0) },
  sz_g3d_rotate_by: { AMOUNT: numShadow(90) },
  sz_g3d_look_at_point: { X: numShadow(0), Y: numShadow(0), Z: numShadow(0) },
  sz_g3d_move_forward: { DIST: numShadow(3) },
  // 36 = a gravidade antiga de -0.01 por quadro: o pulo de plataforma (11) sobe o mesmo.
  sz_g3d_body: { GRAVITY: numShadow(36) },
  sz_g3d_platformer_controls: { SPEED: numShadow(5), JUMP: numShadow(11) },
  sz_g3d_classic_platformer: { SPEED: numShadow(5), JUMP: numShadow(12) },
  sz_g3d_set_object_value: { VALUE: numShadow(1) },
  sz_g3d_stage_number: { WORLDN: numShadow(1), STAGEN: numShadow(1) },
  // O mapa é SOQUETE, não campo: assim o programa guarda as 32 fases numa lista
  // e escolhe pelo número da fase, em vez de empilhar 32 blocos iguais.
  sz_g3d_load_stage: { MAP: txtShadow('chao=0-40;mastro=36;castelo=38') },
  sz_g3d_fps_controls: { SPEED: numShadow(5) },
  sz_g3d_camera_distance: { DIST: numShadow(6), HEIGHT: numShadow(3) },
  sz_g3d_set_fov: { DEG: numShadow(60) },
  sz_g3d_set_opacity: { OPACITY: numShadow(1) },
  sz_g3d_add_ambient_light: { INTENSITY: numShadow(0.6) },
  sz_g3d_add_sun_light: { INTENSITY: numShadow(0.9) },
  sz_g3d_add_point_light: {
    INTENSITY: numShadow(1),
    X: numShadow(0),
    Y: numShadow(2),
    Z: numShadow(0),
  },
  sz_g3d_set_fog: { NEAR: numShadow(1), FAR: numShadow(30) },
  sz_g3d_spawn_enemy: { SPEED: numShadow(6) },
  sz_g3d_every_seconds: { SECS: numShadow(2) },
  sz_g3d_add_row: { ROW: numShadow(1), SPEED: numShadow(150) },
  sz_g3d_generate_rows: { COUNT: numShadow(20) },
  sz_g3d_move_across: { SPEED: numShadow(6), MIN: numShadow(-10), MAX: numShadow(10) },
  sz_g3d_spawn_copy: { X: numShadow(0), Y: numShadow(0), Z: numShadow(0) },
  sz_g3d_prune_area: { MIN: numShadow(-20), MAX: numShadow(20) },
  sz_g3d_play_note: { FREQ: numShadow(440), MS: numShadow(200) },
  sz_g3d_set_volume: { LEVEL: numShadow(8) },
  sz_g3d_is_near: { DIST: numShadow(2) },
  sz_g3d_aim_ahead: { DIST: numShadow(100) },
  ...GAME_THREE_D_RULES.shadows,
}

/** (só p/ teste de drift) espelho do G2D_SOCKET_SHADOW_TYPES — ver o comentário lá. */
export const G3D_SOCKET_SHADOW_TYPES: Record<string, Record<string, string>> = Object.fromEntries(
  Object.entries(G3D_SOCKET_SHADOWS).map(([type, slots]) => [
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
const GAME_THREE_D_PALETTE_VIEW = buildExtensionPalette({
  name: 'Jogo 3D',
  colour: C,
  tree: GAME_THREE_D_PALETTE,
  blocks: gameThreeDAllBlockDefinitions,
  shadows: G3D_SOCKET_SHADOWS,
  order: 'source',
})

export const gameThreeDBlocks = GAME_THREE_D_PALETTE_VIEW.blocks

export const gameThreeDToolboxCategory: ExtensionToolboxCategory = GAME_THREE_D_PALETTE_VIEW.toolbox
