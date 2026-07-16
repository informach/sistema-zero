import type { ExtensionToolboxCategory } from '#extensions'
import { categoryShades } from '../../blockly/colorShades'

// Mundo 3D = UMA cor da categoria: ESMERALDA (natureza/mundo). As sub-categorias
// são TONS dela (derivados por categoryShades mais abaixo). Distinta do índigo
// (Jogo 3D Avançado), do teal (Jogo 2D Avançado e Canvas 3D do núcleo), do
// amarelo (Jogo 3D) e do verde-folha do SVG (este é mais escuro e azulado).
const C = '#059669'

export const world3DBlocks = [
  // ---- 🌍 Mundo ----
  {
    type: 'sz_w3d_setup',
    message0: 'Criar o mundo 3D: %1 de %2 metros de lado',
    args0: [
      {
        type: 'field_dropdown',
        name: 'STYLE',
        options: [
          ['🌲 floresta', 'floresta'],
          ['🏖️ praia', 'praia'],
          ['❄️ neve', 'neve'],
          ['🏜️ deserto', 'deserto'],
          ['🌸 primavera', 'primavera'],
        ],
      },
      { type: 'input_value', name: 'WORLD', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'O primeiro bloco do mundo: escolhe o ESTILO (as cores do chão, do céu e da natureza combinam sozinhas) e o tamanho (o lado do mundo, em metros — 160 é um bom passeio). O motor monta o céu em degradê, o sol com sombras e a câmera. Use uma vez, no comecinho. ⚠️ Na neve o carrinho escorrega de propósito!',
  },
  {
    type: 'sz_w3d_terrain',
    message0: 'Deixar o chão com morros: altura %1, suavidade %2',
    args0: [
      { type: 'input_value', name: 'H', check: 'JSValue' },
      { type: 'input_value', name: 'S', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Levanta colinas no chão inteiro. Altura = o tamanho dos morros em metros (4 dá colinas gostosas de dirigir; 10 vira montanha-russa). Suavidade = o tamanho de cada morro (maior = morros largos e calmos; menor = terreno nervosinho). O meio do mundo fica plano para o carrinho nascer em paz.',
  },
  {
    type: 'sz_w3d_flatten',
    message0: 'Aplainar o chão perto de x %1 z %2 num raio de %3',
    args0: [
      { type: 'input_value', name: 'X', check: 'JSValue' },
      { type: 'input_value', name: 'Z', check: 'JSValue' },
      { type: 'input_value', name: 'R', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Deixa um pedaço do chão bem plano — a praça da sua cidade, o quintal da casa, o pátio da corrida. Use antes de pôr as coisas em cima (elas pousam no chão já aplainado).',
  },
  {
    type: 'sz_w3d_path',
    message0: 'Desenhar uma trilha de x %1 z %2 até x %3 z %4 (largura %5 )',
    args0: [
      { type: 'input_value', name: 'X1', check: 'JSValue' },
      { type: 'input_value', name: 'Z1', check: 'JSValue' },
      { type: 'input_value', name: 'X2', check: 'JSValue' },
      { type: 'input_value', name: 'Z2', check: 'JSValue' },
      { type: 'input_value', name: 'W', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Abre um caminho plano de um ponto a outro do mundo (aplaina só a faixa da trilha, subindo e descendo com os morros). Ótima para uma estradinha ou a pista da corrida.',
  },
  {
    type: 'sz_w3d_water',
    message0: 'Pôr água na altura %1 da cor %2',
    args0: [
      { type: 'input_value', name: 'Y', check: 'JSValue' },
      { type: 'field_colour_sz', name: 'COLOR', colour: '#2b6cb0' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Enche o mundo de água até uma altura (as partes do chão mais baixas viram lago/mar). A água ondula; o carrinho fica lento na beirada e, se cair fundo, volta para o último lugar seco. Altura 0 alaga só os buracos; altura 3 faz um mundo de ilhas.',
  },
  {
    type: 'sz_w3d_start',
    message0: 'Começar o passeio',
    args0: [],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Liga o mundo: monta o chão, o céu e o carrinho, abre a telinha de "clique para começar" e começa o laço de quadros. Use uma vez, NO FIM, depois de preparar tudo.',
  },
  {
    type: 'sz_w3d_world_size',
    message0: 'o tamanho do mundo',
    args0: [],
    output: 'JSValue',
    colour: C,
    tooltip: 'O lado do mundo em metros (o do "Criar o mundo 3D"). Bom para contas de posição.',
  },
  {
    type: 'sz_w3d_ground_height',
    message0: 'a altura do chão em x %1 z %2',
    args0: [
      { type: 'input_value', name: 'X', check: 'JSValue' },
      { type: 'input_value', name: 'Z', check: 'JSValue' },
    ],
    inputsInline: true,
    output: 'JSValue',
    colour: C,
    tooltip:
      'Quantos metros de altura o chão tem naquele ponto do mundo (os morros contam). Perfeito para pousar as suas coisas em cima do terreno em vez de enterradas.',
  },

  // ---- 🚗 Carrinho ----
  {
    type: 'sz_w3d_car',
    message0: 'Criar o carrinho dirigível: %1 da cor %2',
    args0: [
      {
        type: 'field_dropdown',
        name: 'STYLE',
        options: [
          ['🚗 passeio', 'passeio'],
          ['🚙 jipe', 'jipe'],
          ['🏎️ corrida', 'corrida'],
        ],
      },
      { type: 'field_colour_sz', name: 'COLOR', colour: '#ef4444' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'O bloco mágico: cria o carrinho COMPLETO de uma vez — carroceria, rodas que giram e esterçam, molejo de suspensão, pulo (espaço), a câmera que segue por trás e as teclas (WASD ou setas). Cada estilo tem o seu jeitão: o jipe sobe morro melhor, o de corrida é baixinho e voa.',
  },
  {
    type: 'sz_w3d_car_stats',
    message0: 'Ajustar o carrinho: velocidade %1, curva %2, pulo %3',
    args0: [
      { type: 'input_value', name: 'SPEED', check: 'JSValue' },
      { type: 'input_value', name: 'TURN', check: 'JSValue' },
      { type: 'input_value', name: 'JUMP', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Afina o carrinho do SEU jeito: velocidade máxima (metros por segundo), curva (quantos graus ele vira por segundo — mais = mais esperto) e a força do pulo. Use depois do "Criar o carrinho".',
  },
  {
    type: 'sz_w3d_car_boost',
    message0: 'Ligar o turbo (Shift) com força %1',
    args0: [{ type: 'input_value', name: 'FORCE', check: 'JSValue' }],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Dá um botão de TURBO ao carrinho: segurando Shift, ele acelera mais e chega mais rápido (força 1 = o dobro; até 4). Solte para voltar ao normal.',
  },
  {
    type: 'sz_w3d_engine_sound',
    message0: 'Som do motor %1',
    args0: [
      {
        type: 'field_dropdown',
        name: 'ON',
        options: [
          ['ligado', 'ligado'],
          ['desligado', 'desligado'],
        ],
      },
    ],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Liga o ronco do motor: um som grave que fica mais agudo e forte quando o carrinho acelera (feito na hora, sem arquivo). Vrum!',
  },
  {
    type: 'sz_w3d_car_place',
    message0: 'Levar o carrinho para x %1 z %2, virado para %3 graus',
    args0: [
      { type: 'input_value', name: 'X', check: 'JSValue' },
      { type: 'input_value', name: 'Z', check: 'JSValue' },
      { type: 'input_value', name: 'DEG', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Teleporta o carrinho para aquele ponto do mundo, já pousado no chão e parado, virado para onde você mandar (0 graus olha para o "norte" do mundo). A câmera pula junto.',
  },
  {
    type: 'sz_w3d_car_pos',
    message0: 'onde o carrinho está (eixo %1 )',
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
    ],
    output: 'JSValue',
    colour: C,
    tooltip:
      'A posição do carrinho no mundo, um eixo por vez: x e z andam pelo mapa, y é a altura. Use para saber onde ele está — perto de um lugar, dentro de uma área…',
  },
  {
    type: 'sz_w3d_car_speed',
    message0: 'a velocidade do carrinho',
    args0: [],
    output: 'JSValue',
    colour: C,
    tooltip:
      'A velocidade AGORA, em metros por segundo (sempre positiva, mesmo de ré). Boa para HUD de velocímetro e para efeitos que dependem de correr.',
  },

  // ---- 🌿 Natureza ----
  {
    type: 'sz_w3d_grass',
    message0: 'Grama ao vento: %1',
    args0: [
      {
        type: 'field_dropdown',
        name: 'AMOUNT',
        options: [
          ['pouca', 'pouca'],
          ['média', 'media'],
          ['muita', 'muita'],
        ],
      },
    ],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Cobre o chão de graminha que BALANÇA com o vento e acompanha os morros — o toque de vida do mundo. Ela viaja junto com o carrinho (parece infinita) e custa UM desenho para a placa de vídeo, mesmo com milhares de folhinhas. Em computador fraco, o modo turbo diminui sozinho.',
  },
  {
    type: 'sz_w3d_scatter',
    message0: 'Espalhar %1 %2 pelo mundo',
    args0: [
      { type: 'input_value', name: 'N', check: 'JSValue' },
      {
        type: 'field_dropdown',
        name: 'THING',
        options: [
          ['🌳 árvores', 'arvores'],
          ['🌲 pinheiros', 'pinheiros'],
          ['🪨 pedras', 'pedras'],
          ['🌸 flores', 'flores'],
          ['🍄 cogumelos', 'cogumelos'],
          ['🌵 cactos', 'cactos'],
        ],
      },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Espalha CENTENAS de cópias pelo mundo de uma vez, cada uma pousada no seu morro, com giro e tamanho um pouco diferentes — e sempre nos MESMOS lugares (o seu mundo não muda entre jogadas). Árvores, pedras e cactos são sólidos: o carrinho bate! Flores e cogumelos passam por baixo. Por dentro é instancing profissional: milhares de cópias custam quase nada.',
  },
  {
    type: 'sz_w3d_scatter_model',
    message0: 'Espalhar %1 cópias do modelo %2 (tamanho %3)',
    args0: [
      { type: 'input_value', name: 'N', check: 'JSValue' },
      { type: 'field_input', name: 'MODEL', text: '' },
      { type: 'input_value', name: 'S', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Espalha cópias de um modelo .glb SEU (envie no painel de imagens → modelos 3D e escreva o nome dele aqui). Cada cópia pousa no terreno com giro e tamanho parecidos. Tamanho 1 = o tamanho original do arquivo.',
  },
  {
    type: 'sz_w3d_place_thing',
    message0: 'Pôr 1 %1 em x %2 z %3 (tamanho %4 )',
    args0: [
      {
        type: 'field_dropdown',
        name: 'THING',
        options: [
          ['🌳 árvore', 'arvores'],
          ['🌲 pinheiro', 'pinheiros'],
          ['🪨 pedra', 'pedras'],
          ['🌸 flor', 'flores'],
          ['🍄 cogumelo', 'cogumelos'],
          ['🌵 cacto', 'cactos'],
        ],
      },
      { type: 'input_value', name: 'X', check: 'JSValue' },
      { type: 'input_value', name: 'Z', check: 'JSValue' },
      { type: 'input_value', name: 'S', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Põe UMA coisa num lugar exato do mundo (pousada no morro daquele ponto). Para decorar um cantinho especial — a árvore gigante do topo, a pedra marca-lugar. Tamanho 1 = normal; 3 = gigante.',
  },
  {
    type: 'sz_w3d_place_model',
    message0: 'Pôr o modelo %1 em x %2 z %3 (tamanho %4, girado %5 graus)',
    args0: [
      { type: 'field_input', name: 'MODEL', text: '' },
      { type: 'input_value', name: 'X', check: 'JSValue' },
      { type: 'input_value', name: 'Z', check: 'JSValue' },
      { type: 'input_value', name: 'S', check: 'JSValue' },
      { type: 'input_value', name: 'DEG', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Põe UM modelo .glb seu num lugar exato, pousado no terreno, do tamanho e com o giro que você quiser. A casinha, a estátua, o foguete — o mundo é seu.',
  },
  {
    type: 'sz_w3d_clear_area',
    message0: 'Deixar limpo perto de x %1 z %2 num raio de %3',
    args0: [
      { type: 'input_value', name: 'X', check: 'JSValue' },
      { type: 'input_value', name: 'Z', check: 'JSValue' },
      { type: 'input_value', name: 'R', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Reserva um círculo SEM natureza espalhada — a sua praça, a sua pista, o seu quintal. Use ANTES dos blocos de espalhar (o espalhar respeita as áreas limpas que já existem). O centro do mundo já nasce limpo.',
  },
  {
    type: 'sz_w3d_on_crash',
    message0: 'Quando o carrinho bater forte',
    args0: [],
    message1: 'fazer %1',
    args1: [{ type: 'input_statement', name: 'BODY' }],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Roda o "fazer" quando o carrinho TROMBA numa árvore, pedra ou cacto em boa velocidade (encostadinha devagar não conta). Toque um som, trema a câmera, conte batidas…',
  },

  // ---- 🌦️ Céu & clima ----
  {
    type: 'sz_w3d_daynight',
    message0: 'Ligar o ciclo dia e noite: um dia dura %1 minutos',
    args0: [{ type: 'input_value', name: 'MIN', check: 'JSValue' }],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'O tempo passa DE VERDADE: manhã dourada → meio-dia claro → entardecer laranja → noite estrelada, num ciclo que interpola céu, sol, névoa e estrelas (4 minutos por dia, como no folio do Bruno Simon). O sol enfraquece à noite e as estrelas acendem.',
  },
  {
    type: 'sz_w3d_set_time',
    message0: 'Deixar o céu de %1',
    args0: [
      {
        type: 'field_dropdown',
        name: 'TIME',
        options: [
          ['manhã', 'manha'],
          ['meio-dia', 'meiodia'],
          ['entardecer', 'entardecer'],
          ['noite', 'noite'],
        ],
      },
    ],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Fixa a hora do mundo (sem o ciclo andar): o entardecer alaranjado para a corrida do pôr do sol, a noite estrelada para o mundo de inverno. Combine com o ciclo: este bloco escolhe a hora INICIAL.',
  },
  {
    type: 'sz_w3d_weather',
    message0: 'Fazer %1',
    args0: [
      {
        type: 'field_dropdown',
        name: 'W',
        options: [
          ['☀️ céu limpo', 'limpo'],
          ['🌧️ chuva', 'chuva'],
          ['❄️ neve', 'neve'],
          ['🍂 folhas ao vento', 'folhas'],
        ],
      },
    ],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'O clima do mundo: chuva caindo, neve à deriva ou folhas dançando no vento — as partículas acompanham o carrinho pelo mundo inteiro (e obedecem à força do vento). ☀️ céu limpo desliga.',
  },
  {
    type: 'sz_w3d_wind',
    message0: 'Vento com força %1',
    args0: [{ type: 'input_value', name: 'F', check: 'JSValue' }],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'A força do vento (0 = parado, 1 = brisa, 3 = ventania, até 5): mexe a grama E empurra a chuva/neve/folhas. O vendaval do seu mundo de tempestade.',
  },
  {
    type: 'sz_w3d_on_daynight',
    message0: 'Quando virar %1',
    args0: [
      {
        type: 'field_dropdown',
        name: 'WHEN',
        options: [
          ['noite', 'noite'],
          ['dia', 'dia'],
        ],
      },
    ],
    message1: 'fazer %1',
    args1: [{ type: 'input_statement', name: 'BODY' }],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Roda o "fazer" na VIRADA (dia = das 6h às 18h da hora do mundo): acenda as luzes dos totens à noite, solte os vaga-lumes, toque a música da madrugada. Dispara uma vez por virada.',
  },
  {
    type: 'sz_w3d_time_of_day',
    message0: 'a hora do mundo (0 a 24)',
    args0: [],
    output: 'JSValue',
    colour: C,
    tooltip:
      'A hora do relógio do mundo, de 0 a 24 (12 = meio-dia). Use para inventar as suas regras de horário: "se a hora > 20, …".',
  },

  // ---- 📍 Pontos & placas ----
  {
    type: 'sz_w3d_point',
    message0: 'Criar o ponto interativo %1 em x %2 z %3',
    args0: [
      { type: 'field_input', name: 'NAME', text: 'placa' },
      { type: 'input_value', name: 'X', check: 'JSValue' },
      { type: 'input_value', name: 'Z', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Marca um lugar do mundo com um pilar brilhante e um apelido. Quando o carrinho chega perto, aparece um "E" na tela — aperte E para acontecer algo (veja "Quando apertar E").',
  },
  {
    type: 'sz_w3d_on_point',
    message0: 'Quando apertar E no ponto %1',
    args0: [{ type: 'field_name_picker', name: 'NAME', text: 'placa', kind: 'w3dpoint' }],
    message1: 'fazer %1',
    args1: [{ type: 'input_statement', name: 'BODY' }],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Roda os blocos de dentro quando o carrinho está perto do ponto e a criança aperta E. O jeito clássico de "conversar" com um lugar: abrir uma placa, ganhar um item, começar a corrida.',
  },
  {
    type: 'sz_w3d_zone',
    message0: 'Criar a área mágica %1 em x %2 z %3 com raio %4',
    args0: [
      { type: 'field_input', name: 'NAME', text: 'area' },
      { type: 'input_value', name: 'X', check: 'JSValue' },
      { type: 'input_value', name: 'Z', check: 'JSValue' },
      { type: 'input_value', name: 'R', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Cria um círculo invisível no chão com um apelido. Diferente do ponto (que espera o E), a área dispara sozinha quando o carrinho ENTRA nela (veja "Quando entrar na área").',
  },
  {
    type: 'sz_w3d_on_zone',
    message0: 'Quando o carrinho entrar na área %1',
    args0: [{ type: 'field_name_picker', name: 'NAME', text: 'area', kind: 'w3dpoint' }],
    message1: 'fazer %1',
    args1: [{ type: 'input_statement', name: 'BODY' }],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Roda os blocos de dentro no momento em que o carrinho ENTRA na área (uma vez por entrada). Ótimo para armadilhas, checkpoints, mensagens de boas-vindas.',
  },
  {
    type: 'sz_w3d_totem_text',
    message0: 'Pôr um totem em x %1 z %2 com o título %3 e o texto %4',
    args0: [
      { type: 'input_value', name: 'X', check: 'JSValue' },
      { type: 'input_value', name: 'Z', check: 'JSValue' },
      { type: 'field_input', name: 'TITLE', text: 'Bem-vindo' },
      { type: 'field_input', name: 'BODY', text: 'Ao meu mundo!' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Levanta uma placa de madeira com um título e um textinho — a apresentação do seu mundo, uma dica, o seu nome. O texto vira uma imagem na placa.',
  },
  {
    type: 'sz_w3d_totem_image',
    message0: 'Pôr um quadro em x %1 z %2 com a imagem %3 (largura %4 )',
    args0: [
      { type: 'input_value', name: 'X', check: 'JSValue' },
      { type: 'input_value', name: 'Z', check: 'JSValue' },
      { type: 'field_asset_picker', name: 'IMAGE', text: '', kind: 'image' },
      { type: 'input_value', name: 'W', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Pendura um quadro com uma imagem do projeto (envie em "Imagens") numa moldura, em pé no mundo. A sua foto, o seu desenho, a capa do seu jogo.',
  },

  // ---- 🖼️ Galeria ----
  {
    type: 'sz_w3d_gallery_create',
    message0: 'Criar a galeria de projetos em x %1 z %2 com o título %3',
    args0: [
      { type: 'input_value', name: 'X', check: 'JSValue' },
      { type: 'input_value', name: 'Z', check: 'JSValue' },
      { type: 'field_input', name: 'TITLE', text: 'Meus Projetos' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Cria uma praça de exposição (aplaina o chão e põe um totem com o título). Depois pendure as imagens com "Pendurar a imagem" — elas ficam num arco em volta, e chegando perto a criança aperta E para ver grande.',
  },
  {
    type: 'sz_w3d_gallery_add',
    message0: 'Pendurar a imagem %1 com a legenda %2',
    args0: [
      { type: 'field_asset_picker', name: 'IMAGE', text: '', kind: 'image' },
      { type: 'field_input', name: 'CAPTION', text: 'Meu projeto' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Pendura mais uma imagem na galeria (na ordem que você chamar). Cada quadro ganha um ponto "E: ver" que abre a imagem grande com a legenda. Use depois de "Criar a galeria".',
  },

  // ---- 🎥 Câmera & efeitos ----
  {
    type: 'sz_w3d_effects',
    message0: 'Efeitos de cinema %1 (brilho %2 )',
    args0: [
      {
        type: 'field_dropdown',
        name: 'ON',
        options: [
          ['ligados', 'ligados'],
          ['desligados', 'desligados'],
        ],
      },
      { type: 'input_value', name: 'STRENGTH', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Liga/desliga o look de cinema: brilho (as coisas claras "vazam" luz — bloom) e cantos escurecidos (vinheta). Já vem LIGADO; o brilho 1 é o normal (até 3 = show de luz). Desligue para ganhar velocidade num computador fraco — e o modo turbo desliga sozinho se precisar.',
  },

  // ---- 🔊 Sons ----
  {
    type: 'sz_w3d_load_sound',
    message0: 'Carregar o som %1 do arquivo %2',
    args0: [
      { type: 'field_input', name: 'NAME', text: 'buzina' },
      { type: 'field_asset_picker', name: 'ASSET', text: '', kind: 'audio' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Prepara um som do projeto (envie o arquivo em "Imagens" na barra de cima) e dá um apelido a ele. Depois use "Tocar o som" com esse apelido. Faça no começo.',
  },
  {
    type: 'sz_w3d_play_sound',
    message0: 'Tocar o som %1',
    args0: [{ type: 'field_input', name: 'NAME', text: 'buzina' }],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Toca um som que você carregou (pelo apelido). Perfeito dentro de "Quando o carrinho bater forte" ou "Quando apertar E".',
  },
  {
    type: 'sz_w3d_play_music',
    message0: 'Tocar a música %1 sem parar',
    args0: [{ type: 'field_input', name: 'NAME', text: 'musica' }],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Toca uma música do projeto em loop (repete sem parar) — a trilha sonora do seu mundo. Use o apelido de um som carregado.',
  },
  {
    type: 'sz_w3d_stop_music',
    message0: 'Parar a música',
    args0: [],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'Desliga a música que estava tocando.',
  },

  // ---- ⏱️ Jogo & tela ----
  {
    type: 'sz_w3d_hud',
    message0: 'Escrever %1 no canto %2 da tela',
    args0: [
      { type: 'input_value', name: 'TEXT', check: 'JSValue' },
      {
        type: 'field_dropdown',
        name: 'CORNER',
        options: [
          ['↖ cima-esquerda', 'topo-esquerda'],
          ['↗ cima-direita', 'topo-direita'],
          ['↙ baixo-esquerda', 'baixo-esquerda'],
          ['↘ baixo-direita', 'baixo-direita'],
        ],
      },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Mostra um texto fixo num canto da tela (placar, velocímetro, dica). Escrever um texto vazio apaga o canto. Atualize a cada quadro para um número que muda.',
  },
  {
    type: 'sz_w3d_say',
    message0: 'Mostrar o balão %1 por %2 s',
    args0: [
      { type: 'input_value', name: 'TEXT', check: 'JSValue' },
      { type: 'input_value', name: 'SECS', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Faz um balão de fala aparecer em cima do carrinho por alguns segundos, seguindo ele pela tela. "Cheguei!", "Uau!", o que o seu personagem quiser dizer.',
  },
  {
    type: 'sz_w3d_on_update',
    message0: 'A cada quadro, com o tempo %1 (em segundos)',
    args0: [{ type: 'field_input', name: 'DT', text: 'dt' }],
    message1: 'fazer %1',
    args1: [{ type: 'input_statement', name: 'BODY' }],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'A escotilha para a SUA mecânica: roda o "fazer" a cada quadro do passeio. O tempo (dt) é quanto durou o último quadro, em segundos — multiplique velocidades por ele para o mundo andar igual em qualquer computador.',
  },
  {
    type: 'sz_w3d_key_down',
    message0: 'a tecla %1 está apertada ?',
    args0: [{ type: 'field_input', name: 'KEY', text: 'e' }],
    output: 'JSValue',
    colour: C,
    tooltip:
      'Verdadeiro enquanto a tecla está sendo segurada. Escreva a letra (e, q…), as setas (cima, baixo, esquerda, direita) ou espaco. O W/A/S/D do carrinho já é automático.',
  },
  {
    type: 'sz_w3d_key_pressed',
    message0: 'a tecla %1 acabou de ser apertada ?',
    args0: [{ type: 'field_input', name: 'KEY', text: 'e' }],
    output: 'JSValue',
    colour: C,
    tooltip:
      'Verdadeiro SÓ no quadro em que a tecla desceu (segurar não repete). Perfeito para ações de um toque: buzinar, interagir, soltar fogos.',
  },
]

// ---- Sub-categorias da paleta (a ordem é a ordem de leitura da criança) ----

const SUBCATS: { name: string; colour: string; types: string[] }[] = [
  {
    name: '🌍 Mundo',
    colour: C,
    types: [
      'sz_w3d_setup',
      'sz_w3d_terrain',
      'sz_w3d_flatten',
      'sz_w3d_path',
      'sz_w3d_water',
      'sz_w3d_start',
      'sz_w3d_world_size',
      'sz_w3d_ground_height',
    ],
  },
  {
    name: '🚗 Carrinho',
    colour: C,
    types: [
      'sz_w3d_car',
      'sz_w3d_car_stats',
      'sz_w3d_car_boost',
      'sz_w3d_engine_sound',
      'sz_w3d_car_place',
      'sz_w3d_car_pos',
      'sz_w3d_car_speed',
    ],
  },
  {
    name: '🌿 Natureza',
    colour: C,
    types: [
      'sz_w3d_grass',
      'sz_w3d_scatter',
      'sz_w3d_scatter_model',
      'sz_w3d_place_thing',
      'sz_w3d_place_model',
      'sz_w3d_clear_area',
      'sz_w3d_on_crash',
    ],
  },
  {
    name: '🌦️ Céu & clima',
    colour: C,
    types: [
      'sz_w3d_daynight',
      'sz_w3d_set_time',
      'sz_w3d_weather',
      'sz_w3d_wind',
      'sz_w3d_on_daynight',
      'sz_w3d_time_of_day',
    ],
  },
  {
    name: '📍 Pontos & placas',
    colour: C,
    types: [
      'sz_w3d_point',
      'sz_w3d_on_point',
      'sz_w3d_zone',
      'sz_w3d_on_zone',
      'sz_w3d_totem_text',
      'sz_w3d_totem_image',
    ],
  },
  {
    name: '🖼️ Galeria',
    colour: C,
    types: ['sz_w3d_gallery_create', 'sz_w3d_gallery_add'],
  },
  {
    name: '🎥 Câmera & efeitos',
    colour: C,
    types: ['sz_w3d_effects'],
  },
  {
    name: '🔊 Sons',
    colour: C,
    types: ['sz_w3d_load_sound', 'sz_w3d_play_sound', 'sz_w3d_play_music', 'sz_w3d_stop_music'],
  },
  {
    name: '⏱️ Jogo & tela',
    colour: C,
    types: [
      'sz_w3d_hud',
      'sz_w3d_say',
      'sz_w3d_on_update',
      'sz_w3d_key_down',
      'sz_w3d_key_pressed',
    ],
  },
]

// Cada sub-categoria recebe um TOM do esmeralda da categoria (claro→escuro).
const SUBCAT_SHADES = categoryShades(C, SUBCATS.length)
SUBCATS.forEach((sc, i) => {
  sc.colour = SUBCAT_SHADES[i] ?? C
})
// Cor = navegação: pinta cada bloco com a cor do seu grupo.
const COLOUR_BY_TYPE = new Map<string, string>(
  SUBCATS.flatMap((sc) => sc.types.map((t) => [t, sc.colour] as const)),
)
for (const b of world3DBlocks) {
  const colour = COLOUR_BY_TYPE.get(b.type)
  if (colour) b.colour = colour
}

// Rede de segurança: bloco fora de qualquer sub-categoria cai num grupo "Mais".
const CATEGORIZED = new Set(SUBCATS.flatMap((sc) => sc.types))
const leftover = world3DBlocks.map((b) => b.type).filter((t) => !CATEGORIZED.has(t))

// Sombras pré-preenchidas dos soquetes de VALOR que aparecem na paleta.
const numShadow = (value: number) => ({ shadow: { type: 'sz_val_number', fields: { NUM: value } } })
const txtShadow = (text: string) => ({ shadow: { type: 'sz_val_text', fields: { TEXT: text } } })
export const W3D_SOCKET_SHADOWS: Record<string, Record<string, unknown>> = {
  sz_w3d_setup: { WORLD: numShadow(160) },
  sz_w3d_terrain: { H: numShadow(4), S: numShadow(5) },
  sz_w3d_ground_height: { X: numShadow(0), Z: numShadow(0) },
  sz_w3d_car_stats: { SPEED: numShadow(24), TURN: numShadow(110), JUMP: numShadow(7) },
  sz_w3d_car_place: { X: numShadow(0), Z: numShadow(0), DEG: numShadow(0) },
  sz_w3d_scatter: { N: numShadow(300) },
  sz_w3d_scatter_model: { N: numShadow(30), S: numShadow(1) },
  sz_w3d_place_thing: { X: numShadow(10), Z: numShadow(10), S: numShadow(1) },
  sz_w3d_place_model: { X: numShadow(10), Z: numShadow(10), S: numShadow(1), DEG: numShadow(0) },
  sz_w3d_clear_area: { X: numShadow(0), Z: numShadow(0), R: numShadow(15) },
  sz_w3d_effects: { STRENGTH: numShadow(1) },
  sz_w3d_daynight: { MIN: numShadow(4) },
  sz_w3d_wind: { F: numShadow(1) },
  sz_w3d_flatten: { X: numShadow(0), Z: numShadow(0), R: numShadow(15) },
  sz_w3d_path: {
    X1: numShadow(0),
    Z1: numShadow(0),
    X2: numShadow(0),
    Z2: numShadow(30),
    W: numShadow(6),
  },
  sz_w3d_water: { Y: numShadow(0) },
  sz_w3d_car_boost: { FORCE: numShadow(1) },
  sz_w3d_hud: { TEXT: txtShadow('Pontos: 0') },
  sz_w3d_say: { TEXT: txtShadow('Oi!'), SECS: numShadow(2) },
  sz_w3d_point: { X: numShadow(10), Z: numShadow(10) },
  sz_w3d_zone: { X: numShadow(0), Z: numShadow(30), R: numShadow(8) },
  sz_w3d_totem_text: { X: numShadow(0), Z: numShadow(8) },
  sz_w3d_totem_image: { X: numShadow(0), Z: numShadow(8), W: numShadow(3) },
  sz_w3d_gallery_create: { X: numShadow(0), Z: numShadow(-30) },
}

/**
 * (só p/ teste de drift) Tipo do literal de SOMBRA por soquete da paleta — todo
 * soquete daqui precisa constar em `LEGACY_VALUE_FIELDS` com o kind casado
 * (restaura a shadow-ness na reconstrução IR→blocos).
 */
export const W3D_SOCKET_SHADOW_TYPES: Record<string, Record<string, string>> = Object.fromEntries(
  Object.entries(W3D_SOCKET_SHADOWS).map(([type, slots]) => [
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
  const inputs = W3D_SOCKET_SHADOWS[type]
  return inputs ? { kind: 'block' as const, type, inputs } : { kind: 'block' as const, type }
}

export const world3DToolboxCategory: ExtensionToolboxCategory = {
  kind: 'category',
  name: 'Mundo 3D',
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
