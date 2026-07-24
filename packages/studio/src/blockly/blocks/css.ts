import { CSS_TRANSITION_PROPERTY_OPTIONS } from '../../css/motion'
import { CATEGORY_COLORS, categoryShades } from '../theme'
import type { BlockDefinition } from './types'

const C = CATEGORY_COLORS.css

export const CSS_BLOCKS: BlockDefinition[] = [
  // ---- Regra genérica (qualquer seletor + qualquer propriedade) ----
  {
    type: 'sz_css_rule',
    message0: 'Regra de estilo para %1',
    args0: [{ type: 'field_input', name: 'SELECTOR', text: 'body' }],
    message1: 'estilos %1',
    args1: [{ type: 'input_statement', name: 'CHILDREN', check: 'CSSDecl' }],
    previousStatement: 'CSSEntry',
    nextStatement: 'CSSEntry',
    colour: C,
    tooltip:
      'É como apontar para uma parte da página e escolher a roupa dela. No CSS, esse apontador se chama seletor. Coloque as mudanças de estilo dentro.',
  },
  {
    type: 'sz_css_decl',
    message0: '%1: %2',
    args0: [
      { type: 'field_input', name: 'PROP', text: 'background-color' },
      { type: 'field_input', name: 'VALUE', text: '#7c3aed' },
    ],
    previousStatement: 'CSSDecl',
    nextStatement: 'CSSDecl',
    colour: C,
    tooltip:
      'É uma mudança de roupa: primeiro vem o que muda, depois o novo valor. Vai dentro de uma regra de estilo.',
  },
  {
    type: 'sz_css_comment',
    message0: 'comentário %1',
    args0: [{ type: 'field_input', name: 'TEXT', text: ' anotação ' }],
    previousStatement: 'CSSEntry',
    nextStatement: 'CSSEntry',
    colour: C,
    tooltip: 'Uma anotação que não muda o estilo, só o código. Vira /* ... */.',
  },
  {
    type: 'sz_css_body_background',
    message0: 'Pintar o fundo da página de %1',
    args0: [{ type: 'field_colour_sz', name: 'COLOR', colour: '#0b1020' }],
    previousStatement: 'CSSEntry',
    nextStatement: 'CSSEntry',
    colour: C,
    tooltip: 'Pinta o papel de parede da página inteira. No CSS, a página inteira se chama body.',
  },
  {
    type: 'sz_css_body_text_color',
    message0: 'Pintar todo o texto da página de %1',
    args0: [{ type: 'field_colour_sz', name: 'COLOR', colour: '#e6e9f5' }],
    previousStatement: 'CSSEntry',
    nextStatement: 'CSSEntry',
    colour: C,
    tooltip: 'Troca de uma vez a cor dos textos da página inteira, chamada body no CSS.',
  },
  {
    type: 'sz_css_body_center',
    message0: 'Colocar o conteúdo no centro da página',
    previousStatement: 'CSSEntry',
    nextStatement: 'CSSEntry',
    colour: C,
    tooltip:
      'Transforma a página numa bandeja e leva tudo para o meio dela. O nome técnico dessa bandeja é layout flex.',
  },
  {
    type: 'sz_css_width',
    message0: 'Largura de %1 como %2 px',
    args0: [
      { type: 'field_input', name: 'SELECTOR', text: '#caixa' },
      { type: 'field_number', name: 'VALUE', value: 200, min: 0 },
    ],
    previousStatement: 'CSSEntry',
    nextStatement: 'CSSEntry',
    colour: C,
    tooltip:
      'Escolhe o tamanho de uma parte da página de um lado ao outro. px é um pontinho da tela.',
  },
  {
    type: 'sz_css_height',
    message0: 'Altura de %1 como %2 px',
    args0: [
      { type: 'field_input', name: 'SELECTOR', text: '#caixa' },
      { type: 'field_number', name: 'VALUE', value: 200, min: 0 },
    ],
    previousStatement: 'CSSEntry',
    nextStatement: 'CSSEntry',
    colour: C,
    tooltip:
      'Escolhe o tamanho de uma parte da página de cima até embaixo. px é um pontinho da tela.',
  },
  {
    type: 'sz_css_border',
    message0: 'Contorno de %1 com %2 px na cor %3',
    args0: [
      { type: 'field_input', name: 'SELECTOR', text: '#caixa' },
      { type: 'field_number', name: 'WIDTH', value: 2, min: 0 },
      { type: 'field_colour_sz', name: 'COLOR', colour: '#22d3ee' },
    ],
    previousStatement: 'CSSEntry',
    nextStatement: 'CSSEntry',
    colour: C,
    tooltip: 'Desenha uma linha em volta da parte escolhida, como a moldura de um quadro.',
  },
  {
    type: 'sz_css_padding',
    // Par do margin ("Espaço ao redor"): dentro × ao redor — sem metáfora solta.
    message0: 'Espaço por dentro de %1 com %2 px',
    args0: [
      { type: 'field_input', name: 'SELECTOR', text: '#caixa' },
      { type: 'field_number', name: 'VALUE', value: 8, min: 0 },
    ],
    previousStatement: 'CSSEntry',
    nextStatement: 'CSSEntry',
    colour: C,
    tooltip:
      'Afasta o conteúdo da borda, abrindo espaço por dentro. No CSS, esse espaço se chama padding.',
  },
  {
    type: 'sz_css_margin',
    message0: 'Espaço ao redor de %1 com %2 px',
    args0: [
      { type: 'field_input', name: 'SELECTOR', text: '#caixa' },
      { type: 'field_number', name: 'VALUE', value: 8, min: 0 },
    ],
    previousStatement: 'CSSEntry',
    nextStatement: 'CSSEntry',
    colour: C,
    tooltip:
      'Abre espaço do lado de fora, separando uma coisa da outra. No CSS, esse espaço se chama margin.',
  },

  // ---- Layout flex ----
  {
    type: 'sz_css_display_flex',
    message0: 'Organizar os itens de %1',
    args0: [{ type: 'field_input', name: 'SELECTOR', text: '#caixa' }],
    message1: 'em %1',
    args1: [
      {
        type: 'field_dropdown',
        name: 'DIR',
        options: [
          ['linha (lado a lado)', 'row'],
          ['coluna (empilhado)', 'column'],
        ],
      },
    ],
    previousStatement: 'CSSEntry',
    nextStatement: 'CSSEntry',
    colour: C,
    tooltip:
      'Transforma a parte escolhida numa bandeja que organiza seus itens em linha ou coluna. Essa bandeja se chama flex.',
  },
  {
    type: 'sz_css_gap',
    message0: 'Espaço entre os itens de %1 como %2 px',
    args0: [
      { type: 'field_input', name: 'SELECTOR', text: '#caixa' },
      { type: 'field_number', name: 'VALUE', value: 16, min: 0 },
    ],
    previousStatement: 'CSSEntry',
    nextStatement: 'CSSEntry',
    colour: C,
    tooltip:
      'Separa igualmente os itens de uma bandeja flex ou de uma grade. No CSS, isso se chama gap.',
  },
  {
    type: 'sz_css_justify',
    message0: 'eixo principal de %1',
    args0: [{ type: 'field_input', name: 'SELECTOR', text: '#caixa' }],
    message1: 'arrumar no %1',
    args1: [
      {
        type: 'field_dropdown',
        name: 'VALUE',
        options: [
          ['início', 'flex-start'],
          ['centro', 'center'],
          ['fim', 'flex-end'],
          ['espaço entre', 'space-between'],
          ['espaço ao redor', 'space-around'],
        ],
      },
    ],
    previousStatement: 'CSSEntry',
    nextStatement: 'CSSEntry',
    colour: C,
    tooltip:
      'Move os itens no caminho em que a bandeja flex aponta. Esse caminho se chama eixo principal: horizontal em linha e vertical em coluna.',
  },
  {
    type: 'sz_css_align',
    message0: 'eixo transversal de %1',
    args0: [{ type: 'field_input', name: 'SELECTOR', text: '#caixa' }],
    message1: 'arrumar como %1',
    args1: [
      {
        type: 'field_dropdown',
        name: 'VALUE',
        options: [
          ['esticar', 'stretch'],
          ['início', 'flex-start'],
          ['centro', 'center'],
          ['fim', 'flex-end'],
        ],
      },
    ],
    previousStatement: 'CSSEntry',
    nextStatement: 'CSSEntry',
    colour: C,
    tooltip:
      'Move os itens atravessando o caminho da bandeja flex. Esse caminho se chama eixo transversal: vertical em linha e horizontal em coluna.',
  },

  // ---- Tipografia ----
  {
    type: 'sz_css_font_size',
    message0: 'Tamanho das letras de %1 como %2 px',
    args0: [
      { type: 'field_input', name: 'SELECTOR', text: '#caixa' },
      { type: 'field_number', name: 'VALUE', value: 16, min: 1 },
    ],
    previousStatement: 'CSSEntry',
    nextStatement: 'CSSEntry',
    colour: C,
    tooltip: 'Aumenta ou diminui as letras da parte escolhida. px é um pontinho da tela.',
  },
  {
    type: 'sz_css_font_weight',
    message0: 'Traço das letras de %1 como %2',
    args0: [
      { type: 'field_input', name: 'SELECTOR', text: '#caixa' },
      {
        type: 'field_dropdown',
        name: 'VALUE',
        options: [
          ['normal', 'normal'],
          ['negrito', 'bold'],
        ],
      },
    ],
    previousStatement: 'CSSEntry',
    nextStatement: 'CSSEntry',
    colour: C,
    tooltip: 'Escolhe se as letras ficam normais ou mais grossas, como uma canetinha marcadora.',
  },
  {
    type: 'sz_css_text_align',
    message0: 'Encostar o texto de %1 em %2',
    args0: [
      { type: 'field_input', name: 'SELECTOR', text: '#caixa' },
      {
        type: 'field_dropdown',
        name: 'VALUE',
        options: [
          ['esquerda', 'left'],
          ['centro', 'center'],
          ['direita', 'right'],
        ],
      },
    ],
    previousStatement: 'CSSEntry',
    nextStatement: 'CSSEntry',
    colour: C,
    tooltip: 'Leva as linhas de texto para a esquerda, para o centro ou para a direita.',
  },
  {
    type: 'sz_css_text_color',
    message0: 'Pintar o texto de %1 de %2',
    args0: [
      { type: 'field_input', name: 'SELECTOR', text: '#caixa' },
      { type: 'field_colour_sz', name: 'COLOR', colour: '#e6e9f5' },
    ],
    previousStatement: 'CSSEntry',
    nextStatement: 'CSSEntry',
    colour: C,
    tooltip: 'Pinta somente as letras da parte da página que você escolheu.',
  },
  {
    type: 'sz_css_text_transform',
    message0: 'Letras de %1 em %2',
    args0: [
      { type: 'field_input', name: 'SELECTOR', text: '#menu a' },
      {
        type: 'field_dropdown',
        name: 'VALUE',
        options: [
          ['normal', 'none'],
          ['MAIÚSCULAS', 'uppercase'],
          ['minúsculas', 'lowercase'],
          ['Primeira Maiúscula', 'capitalize'],
        ],
      },
    ],
    previousStatement: 'CSSEntry',
    nextStatement: 'CSSEntry',
    colour: C,
    tooltip: 'Troca as letras para MAIÚSCULAS, minúsculas ou só a primeira letra grande.',
  },
  {
    type: 'sz_css_text_decoration',
    message0: 'Sublinhado de %1 %2',
    args0: [
      { type: 'field_input', name: 'SELECTOR', text: '#menu a' },
      {
        type: 'field_dropdown',
        name: 'VALUE',
        options: [
          ['sem sublinhado', 'none'],
          ['com sublinhado', 'underline'],
        ],
      },
    ],
    previousStatement: 'CSSEntry',
    nextStatement: 'CSSEntry',
    colour: C,
    tooltip: 'Liga/desliga o sublinhado (útil para remover o sublinhado de links).',
  },
  {
    type: 'sz_css_letter_spacing',
    message0: 'Espaço entre as letras de %1 como %2 px',
    args0: [
      { type: 'field_input', name: 'SELECTOR', text: '#menu a' },
      { type: 'field_number', name: 'VALUE', value: 1, min: 0 },
    ],
    previousStatement: 'CSSEntry',
    nextStatement: 'CSSEntry',
    colour: C,
    tooltip: 'Aumenta o espaço entre as letras.',
  },

  // ---- Fundo e cor ----
  {
    type: 'sz_css_background_color',
    message0: 'Pintar o fundo de %1 de %2',
    args0: [
      { type: 'field_input', name: 'SELECTOR', text: '#caixa' },
      { type: 'field_colour_sz', name: 'COLOR', colour: '#11162b' },
    ],
    previousStatement: 'CSSEntry',
    nextStatement: 'CSSEntry',
    colour: C,
    tooltip: 'Pinta o fundo da parte escolhida, como preencher uma figura com tinta.',
  },
  {
    type: 'sz_css_gradient',
    message0: 'Fundo de %1 mudando de %2 até %3',
    args0: [
      { type: 'field_input', name: 'SELECTOR', text: '#caixa' },
      { type: 'field_colour_sz', name: 'C1', colour: '#22d3ee' },
      { type: 'field_colour_sz', name: 'C2', colour: '#a78bfa' },
    ],
    previousStatement: 'CSSEntry',
    nextStatement: 'CSSEntry',
    colour: C,
    tooltip: 'Mistura duas cores aos poucos no fundo. Essa passagem suave se chama gradiente.',
  },

  // ---- Caixa e espaço ----
  {
    type: 'sz_css_border_radius',
    message0: 'Arredondar os cantos de %1 em %2 px',
    args0: [
      { type: 'field_input', name: 'SELECTOR', text: '#caixa' },
      { type: 'field_number', name: 'VALUE', value: 12, min: 0 },
    ],
    previousStatement: 'CSSEntry',
    nextStatement: 'CSSEntry',
    colour: C,
    tooltip: 'Lixa as pontas da caixa para deixá-las redondas.',
  },
  {
    type: 'sz_css_shadow',
    message0: 'Sombra de %1 com intensidade %2',
    args0: [
      { type: 'field_input', name: 'SELECTOR', text: '#caixa' },
      {
        type: 'field_dropdown',
        name: 'LEVEL',
        options: [
          ['leve', 'sm'],
          ['média', 'md'],
          ['forte', 'lg'],
        ],
      },
    ],
    previousStatement: 'CSSEntry',
    nextStatement: 'CSSEntry',
    colour: C,
    tooltip: 'Coloca uma sombra atrás da caixa para ela parecer levantada do papel.',
  },
  {
    type: 'sz_css_max_width',
    message0: 'Largura máxima de %1 como %2 px',
    args0: [
      { type: 'field_input', name: 'SELECTOR', text: '#caixa' },
      { type: 'field_number', name: 'VALUE', value: 1100, min: 0 },
    ],
    previousStatement: 'CSSEntry',
    nextStatement: 'CSSEntry',
    colour: C,
    tooltip:
      'Deixa a parte encolher em telas pequenas, mas impede que ela cresça além deste tamanho.',
  },
  {
    type: 'sz_css_width_percent',
    message0: 'Largura de %1',
    args0: [{ type: 'field_input', name: 'SELECTOR', text: '#caixa' }],
    message1: 'usar %1 % da caixa onde está',
    args1: [{ type: 'field_number', name: 'VALUE', value: 100, min: 0, max: 100 }],
    previousStatement: 'CSSEntry',
    nextStatement: 'CSSEntry',
    colour: C,
    tooltip: 'Usa uma fatia do espaço disponível. 100% ocupa tudo; 50% ocupa metade.',
  },

  // ---- Responsividade (media query) ----
  {
    type: 'sz_css_media_query',
    message0: 'Responsivo',
    message1: 'quando a tela tiver %1 %2 px',
    args1: [
      {
        type: 'field_dropdown',
        name: 'DIR',
        options: [
          ['largura máxima', 'max-width'],
          ['largura mínima', 'min-width'],
          ['altura máxima', 'max-height'],
          ['altura mínima', 'min-height'],
        ],
      },
      { type: 'field_number', name: 'PX', value: 768, min: 0 },
    ],
    message2: 'aplicar estas regras %1',
    args2: [{ type: 'input_statement', name: 'RULES', check: 'CSSEntry' }],
    previousStatement: 'CSSEntry',
    nextStatement: 'CSSEntry',
    colour: C,
    tooltip:
      'É uma roupa que se adapta ao tamanho da tela. No CSS, essa regra condicional se chama media query. Coloque os estilos que mudam dentro.',
  },

  // ---- Fonte do Google ----
  {
    type: 'sz_css_google_font',
    message0: 'Buscar a fonte do Google %1',
    args0: [{ type: 'field_input', name: 'FONT', text: 'Press Start 2P' }],
    previousStatement: 'CSSEntry',
    nextStatement: 'CSSEntry',
    colour: C,
    tooltip:
      'Traz uma nova letra para o projeto, como pegar uma canetinha no estojo Google Fonts. Depois use o bloco “Usar a fonte”.',
  },
  {
    type: 'sz_css_use_font',
    message0: 'Usar a fonte %2 em %1',
    args0: [
      { type: 'field_input', name: 'SELECTOR', text: 'body' },
      { type: 'field_name_picker', name: 'FONT', text: 'Press Start 2P', kind: 'font' },
    ],
    previousStatement: 'CSSEntry',
    nextStatement: 'CSSEntry',
    colour: C,
    tooltip:
      'Escolhe qual canetinha desenha as letras da parte selecionada. Primeiro busque a fonte com o bloco do Google.',
  },

  // ---- CSS moderno ----
  {
    type: 'sz_css_transition',
    message0: 'Suavizar %1',
    args0: [
      {
        type: 'field_dropdown',
        name: 'PROPERTY',
        options: CSS_TRANSITION_PROPERTY_OPTIONS.map(([label, value]) => [label, value]),
      },
    ],
    message1: 'em %1 por %2 ms',
    args1: [
      { type: 'field_input', name: 'SELECTOR', text: '#caixa' },
      { type: 'field_number', name: 'MS', value: 300, min: 0 },
    ],
    previousStatement: 'CSSEntry',
    nextStatement: 'CSSEntry',
    colour: C,
    tooltip:
      'Faz uma mudança visual específica acontecer devagar, sem animar o tamanho ou a posição da página por acidente.',
  },
  {
    type: 'sz_css_reduce_motion',
    message0: 'Respeitar menos movimento em %1',
    args0: [{ type: 'field_input', name: 'SELECTOR', text: '#caixa' }],
    previousStatement: 'CSSEntry',
    nextStatement: 'CSSEntry',
    colour: C,
    tooltip:
      'Desliga animações e transições nesta parte quando a pessoa pediu menos movimento no aparelho.',
  },
  {
    type: 'sz_css_hover',
    message0: 'Quando o ponteiro passar por %1',
    args0: [{ type: 'field_input', name: 'SELECTOR', text: '#caixa' }],
    message1: 'mudar o estilo %1',
    args1: [{ type: 'input_statement', name: 'CHILDREN', check: 'CSSDecl' }],
    previousStatement: 'CSSEntry',
    nextStatement: 'CSSEntry',
    colour: C,
    tooltip:
      'É uma reação ao mouse: enquanto a setinha estiver em cima, as mudanças encaixadas aqui aparecem. No CSS, esse estado se chama hover.',
  },
  {
    type: 'sz_css_focus_visible',
    message0: 'Quando %1 receber foco pelo teclado',
    args0: [{ type: 'field_input', name: 'SELECTOR', text: '#caixa' }],
    message1: 'mudar o estilo %1',
    args1: [{ type: 'input_statement', name: 'CHILDREN', check: 'CSSDecl' }],
    previousStatement: 'CSSEntry',
    nextStatement: 'CSSEntry',
    colour: C,
    tooltip:
      'Mostra onde a pessoa está ao navegar com o teclado. Encaixe uma borda de destaque; no CSS, esse estado se chama focus-visible.',
  },
  {
    type: 'sz_css_grid',
    message0: 'Organizar %1 numa grade',
    args0: [{ type: 'field_input', name: 'SELECTOR', text: '#caixa' }],
    message1: '%1 colunas · espaço %2 px',
    args1: [
      { type: 'field_number', name: 'COLS', value: 3, min: 1, precision: 1 },
      { type: 'field_number', name: 'GAP', value: 16, min: 0 },
    ],
    previousStatement: 'CSSEntry',
    nextStatement: 'CSSEntry',
    colour: C,
    tooltip:
      'Arruma os itens como quadrinhos de um tabuleiro. No CSS, esse tabuleiro se chama grid.',
  },
  {
    type: 'sz_css_keyframes',
    message0: 'Criar animação chamada %1',
    args0: [{ type: 'field_input', name: 'NAME', text: 'pulsar' }],
    message1: 'no início %1',
    args1: [{ type: 'input_statement', name: 'FROM', check: 'CSSDecl' }],
    message2: 'no fim %1',
    args2: [{ type: 'input_statement', name: 'TO', check: 'CSSDecl' }],
    previousStatement: 'CSSEntry',
    nextStatement: 'CSSEntry',
    colour: C,
    tooltip:
      'É como desenhar o primeiro e o último quadro de um livrinho animado. Depois ligue o nome com o bloco “Animar”.',
  },
  {
    type: 'sz_css_keyframes_steps',
    message0: 'Criar animação em passos chamada %1',
    args0: [{ type: 'field_input', name: 'NAME', text: 'girar' }],
    message1: 'passos %1',
    args1: [{ type: 'input_statement', name: 'STEPS', check: 'KeyframeStep' }],
    previousStatement: 'CSSEntry',
    nextStatement: 'CSSEntry',
    colour: C,
    tooltip:
      'Monta um livrinho animado com quantos quadros você quiser. Use passos como 0%, 50% e 100%, depois ligue o nome com o bloco “Animar”.',
  },
  {
    type: 'sz_css_keyframe_step',
    message0: 'passo %1',
    args0: [{ type: 'field_input', name: 'AT', text: '50%' }],
    message1: 'estilo %1',
    args1: [{ type: 'input_statement', name: 'DECLS', check: 'CSSDecl' }],
    previousStatement: 'KeyframeStep',
    nextStatement: 'KeyframeStep',
    colour: C,
    tooltip:
      'Um momento da animação (ex.: "0%", "50%", "100%"). Coloque "propriedade: valor" dentro.',
  },
  {
    type: 'sz_css_apply_animation',
    message0: 'Animar %1 com %2',
    args0: [
      { type: 'field_input', name: 'SELECTOR', text: '#caixa' },
      { type: 'field_name_picker', name: 'NAME', text: 'pulsar', kind: 'animation' },
    ],
    message1: 'duração %1 s · repetir %2',
    args1: [
      { type: 'field_number', name: 'SECONDS', value: 1, min: 0.1, precision: 0.1 },
      {
        type: 'field_dropdown',
        name: 'REPEAT',
        options: [
          ['uma vez', '1'],
          ['para sempre', 'infinite'],
        ],
      },
    ],
    previousStatement: 'CSSEntry',
    nextStatement: 'CSSEntry',
    colour: C,
    tooltip:
      'Liga um livrinho animado à parte escolhida. O nome precisa ser igual ao usado em “Criar animação”; o seletor mostra os nomes prontos.',
  },

  // ---- Atalhos: variável CSS, transform, perspectiva e grade ----
  {
    type: 'sz_css_var',
    message0: 'Guardar o estilo --%1 = %2',
    args0: [
      { type: 'field_input', name: 'VARNAME', text: 'cor-principal' },
      { type: 'field_input', name: 'VALUE', text: '#e94560' },
    ],
    message1: 'usar em %1',
    args1: [{ type: 'field_input', name: 'SELECTOR', text: ':root' }],
    previousStatement: 'CSSEntry',
    nextStatement: 'CSSEntry',
    colour: C,
    tooltip:
      'É um potinho com nome para guardar uma cor ou medida e reutilizar depois. No CSS, esse potinho se chama variável e é lido com var(--nome).',
  },
  {
    type: 'sz_css_transform',
    message0: 'Mover, girar ou esticar %1',
    args0: [{ type: 'field_input', name: 'SELECTOR', text: '#caixa' }],
    message1: 'usando %1',
    args1: [{ type: 'field_input', name: 'VALUE', text: 'rotate(10deg)' }],
    previousStatement: 'CSSEntry',
    nextStatement: 'CSSEntry',
    colour: C,
    tooltip:
      'Muda a pose sem empurrar as outras coisas da página. No CSS, isso se chama transform, como rotate(10deg) ou scale(1.2).',
  },
  {
    type: 'sz_css_perspective',
    message0: 'Profundidade da cena de %1 como %2 px',
    args0: [
      { type: 'field_input', name: 'SELECTOR', text: '#cena' },
      { type: 'field_number', name: 'VALUE', value: 600, min: 0 },
    ],
    previousStatement: 'CSSEntry',
    nextStatement: 'CSSEntry',
    colour: C,
    tooltip:
      'É como aproximar a câmera de uma maquete. No CSS, essa sensação de profundidade se chama perspective.',
  },
  {
    type: 'sz_css_grid_template',
    message0: 'Grade de %1',
    args0: [{ type: 'field_input', name: 'SELECTOR', text: '#caixa' }],
    message1: 'colunas %1',
    args1: [{ type: 'field_input', name: 'COLS', text: 'repeat(3, 1fr)' }],
    message2: 'linhas %1',
    args2: [{ type: 'field_input', name: 'ROWS', text: '' }],
    previousStatement: 'CSSEntry',
    nextStatement: 'CSSEntry',
    colour: C,
    tooltip:
      'Monta um tabuleiro com medidas livres para colunas e linhas, como repeat(3, 1fr). É a versão avançada do grid.',
  },

  // ---- 🎮 Posição & jogo (as propriedades que os jogos mais usam) ----
  {
    type: 'sz_css_position',
    message0: 'Posicionamento de %1',
    args0: [{ type: 'field_input', name: 'SELECTOR', text: '#canvas1' }],
    message1: 'usar %1',
    args1: [
      {
        type: 'field_dropdown',
        name: 'VALUE',
        options: [
          ['normal (no fluxo)', 'static'],
          ['relativo', 'relative'],
          ['absoluto (livre)', 'absolute'],
          ['fixo na tela', 'fixed'],
          ['colado ao rolar', 'sticky'],
        ],
      },
    ],
    previousStatement: 'CSSEntry',
    nextStatement: 'CSSEntry',
    colour: C,
    tooltip:
      'Escolhe se a peça fica no caminho normal da página ou solta para você posicionar. O nome técnico dessa regra é position.',
  },
  {
    type: 'sz_css_offset',
    message0: 'Distância do %1 até %2',
    args0: [
      {
        type: 'field_dropdown',
        name: 'SIDE',
        options: [
          ['topo', 'top'],
          ['esquerda', 'left'],
          ['direita', 'right'],
          ['baixo', 'bottom'],
        ],
      },
      { type: 'field_input', name: 'SELECTOR', text: '#canvas1' },
    ],
    message1: 'usar %1',
    args1: [{ type: 'field_input', name: 'VALUE', text: '50%' }],
    previousStatement: 'CSSEntry',
    nextStatement: 'CSSEntry',
    colour: C,
    tooltip:
      'Move uma peça solta a partir de um lado. Atenção: topo 50% + esquerda 50% leva o CANTO ao centro; para centralizar a peça inteira, use também transform: translate(-50%, -50%).',
  },
  {
    type: 'sz_css_display',
    message0: 'Exibir %1 como %2',
    args0: [
      { type: 'field_input', name: 'SELECTOR', text: 'canvas' },
      {
        type: 'field_dropdown',
        name: 'VALUE',
        options: [
          ['bloco', 'block'],
          ['em linha', 'inline'],
          ['bloco em linha', 'inline-block'],
          ['escondido', 'none'],
        ],
      },
    ],
    previousStatement: 'CSSEntry',
    nextStatement: 'CSSEntry',
    colour: C,
    tooltip:
      'Escolhe como a peça ocupa espaço. “bloco” pega uma linha; “escondido” some sem apagar. No CSS, isso se chama display.',
  },
  {
    type: 'sz_css_overflow',
    message0: 'O que passar da borda de %1',
    args0: [{ type: 'field_input', name: 'SELECTOR', text: 'body' }],
    message1: 'deve %1',
    args1: [
      {
        type: 'field_dropdown',
        name: 'VALUE',
        options: [
          ['esconder', 'hidden'],
          ['mostrar', 'visible'],
          ['barra de rolagem', 'scroll'],
          ['automático', 'auto'],
        ],
      },
    ],
    previousStatement: 'CSSEntry',
    nextStatement: 'CSSEntry',
    colour: C,
    tooltip:
      'Decide o que acontece quando o conteúdo transborda da caixa. No CSS, essa torneira se chama overflow.',
  },
  {
    type: 'sz_css_cursor',
    message0: 'Ponteiro do mouse sobre %1',
    args0: [{ type: 'field_input', name: 'SELECTOR', text: 'canvas' }],
    message1: 'mostrar %1',
    args1: [
      {
        type: 'field_dropdown',
        name: 'VALUE',
        options: [
          ['mãozinha (clicável)', 'pointer'],
          ['seta', 'default'],
          ['cruz (mira)', 'crosshair'],
          ['mover', 'move'],
          ['mãozinha aberta', 'grab'],
          ['proibido', 'not-allowed'],
        ],
      },
    ],
    previousStatement: 'CSSEntry',
    nextStatement: 'CSSEntry',
    colour: C,
    tooltip:
      'Troca o desenho da setinha quando ela passa por cima. A mãozinha avisa que dá para clicar; o nome técnico é cursor.',
  },
  {
    type: 'sz_css_image_rendering',
    message0: 'Desenho dos pixels de %1',
    args0: [{ type: 'field_input', name: 'SELECTOR', text: 'canvas' }],
    message1: 'mostrar %1',
    args1: [
      {
        type: 'field_dropdown',
        name: 'VALUE',
        options: [
          ['pixelada (sem borrar)', 'pixelated'],
          ['nítida', 'crisp-edges'],
          ['suave (normal)', 'auto'],
        ],
      },
    ],
    previousStatement: 'CSSEntry',
    nextStatement: 'CSSEntry',
    colour: C,
    tooltip:
      'Escolhe se uma imagem aumentada fica lisinha ou mostra seus quadradinhos. Para pixel art, use “pixelada”.',
  },
  {
    type: 'sz_css_object_fit',
    message0: 'Encaixar a imagem de %1',
    args0: [{ type: 'field_input', name: 'SELECTOR', text: 'img' }],
    message1: 'modo %1',
    args1: [
      {
        type: 'field_dropdown',
        name: 'VALUE',
        options: [
          ['cobrir (corta as sobras)', 'cover'],
          ['conter (mostra tudo)', 'contain'],
          ['esticar', 'fill'],
          ['sem ajuste', 'none'],
        ],
      },
    ],
    previousStatement: 'CSSEntry',
    nextStatement: 'CSSEntry',
    colour: C,
    tooltip:
      'É como encaixar uma foto numa moldura: pode cobrir, caber inteira, esticar ou manter o tamanho.',
  },
  {
    type: 'sz_css_opacity',
    message0: 'Transparência de %1 como %2',
    args0: [
      { type: 'field_input', name: 'SELECTOR', text: '#caixa' },
      { type: 'field_number', name: 'VALUE', value: 0.5, min: 0, max: 1, precision: 0.1 },
    ],
    previousStatement: 'CSSEntry',
    nextStatement: 'CSSEntry',
    colour: C,
    tooltip:
      'Funciona como um vidro: 0 fica invisível e 1 fica totalmente pintado. O nome técnico é opacity.',
  },
  {
    type: 'sz_css_z_index',
    message0: 'Camada de %1 como %2',
    args0: [
      { type: 'field_input', name: 'SELECTOR', text: '#caixa' },
      { type: 'field_number', name: 'VALUE', value: 10, precision: 1 },
    ],
    previousStatement: 'CSSEntry',
    nextStatement: 'CSSEntry',
    colour: C,
    tooltip:
      'É uma pilha de figurinhas: número maior fica por cima. No CSS, essa camada se chama z-index e precisa de posicionamento.',
  },
  {
    type: 'sz_css_background_image',
    message0: 'Imagem de fundo de %1: %2',
    args0: [
      { type: 'field_input', name: 'SELECTOR', text: 'body' },
      { type: 'field_asset_picker', name: 'URL', text: 'fundo.png' },
    ],
    previousStatement: 'CSSEntry',
    nextStatement: 'CSSEntry',
    colour: C,
    tooltip: 'Escolhe uma imagem do projeto e coloca atrás do conteúdo, como papel de parede.',
  },
]

/**
 * Sub-categorias da paleta de CSS (à la Scratch/MakeCode): cada grupo tem ÍCONE e
 * uma cor da FAMÍLIA do CSS (tons do vermelho da categoria), preservando a identidade
 * visual e dando navegação por cor. Cada bloco herda a cor do grupo.
 */
export const CSS_GROUPS: { name: string; colour: string; types: string[] }[] = [
  {
    name: '🧰 Regra',
    colour: '#7c4dff',
    types: ['sz_css_rule', 'sz_css_decl', 'sz_css_var', 'sz_css_comment'],
  },
  {
    name: '🎨 Cores & Fundo',
    colour: '#9466ff',
    types: [
      'sz_css_body_background',
      'sz_css_body_text_color',
      'sz_css_text_color',
      'sz_css_background_color',
      'sz_css_gradient',
    ],
  },
  {
    name: '🔤 Texto',
    colour: '#6a3df0',
    types: [
      'sz_css_font_size',
      'sz_css_font_weight',
      'sz_css_text_align',
      'sz_css_text_transform',
      'sz_css_text_decoration',
      'sz_css_letter_spacing',
      'sz_css_google_font',
      'sz_css_use_font',
    ],
  },
  {
    name: '📐 Tamanho & Caixa',
    colour: '#a87cff',
    types: [
      'sz_css_width',
      'sz_css_height',
      'sz_css_max_width',
      'sz_css_width_percent',
      'sz_css_padding',
      'sz_css_margin',
      'sz_css_border',
      'sz_css_border_radius',
      'sz_css_shadow',
    ],
  },
  {
    name: '🧩 Layout',
    colour: '#5a2fe0',
    types: [
      'sz_css_body_center',
      'sz_css_display_flex',
      'sz_css_gap',
      'sz_css_justify',
      'sz_css_align',
      'sz_css_grid',
      'sz_css_grid_template',
    ],
  },
  {
    name: '✨ Efeitos',
    colour: '#b88cff',
    types: [
      'sz_css_transition',
      'sz_css_hover',
      'sz_css_focus_visible',
      'sz_css_transform',
      'sz_css_perspective',
      'sz_css_keyframes',
      'sz_css_keyframes_steps',
      'sz_css_keyframe_step',
      'sz_css_apply_animation',
    ],
  },
  {
    name: '📱 Responsivo',
    colour: '#8b5cf6',
    types: ['sz_css_media_query', 'sz_css_reduce_motion'],
  },
  {
    name: '🎮 Posição & jogo',
    colour: '#7048e0',
    types: [
      'sz_css_position',
      'sz_css_offset',
      'sz_css_display',
      'sz_css_overflow',
      'sz_css_cursor',
      'sz_css_image_rendering',
      'sz_css_object_fit',
      'sz_css_opacity',
      'sz_css_z_index',
      'sz_css_background_image',
    ],
  },
]

// IDENTIDADE: cada sub-grupo recebe um TOM da cor base da categoria (CSS),
// derivado claro→escuro (categoryShades) — os literais em CSS_GROUPS são placeholders.
const CSS_SHADES = categoryShades(CATEGORY_COLORS.css, CSS_GROUPS.length)
CSS_GROUPS.forEach((g, i) => {
  g.colour = CSS_SHADES[i] ?? CATEGORY_COLORS.css
})
const CSS_COLOUR_BY_TYPE = new Map<string, string>(
  CSS_GROUPS.flatMap((g) => g.types.map((t) => [t, g.colour] as const)),
)

function isFieldDefinition(
  value: unknown,
): value is { name?: unknown; type?: unknown; kind?: unknown } {
  return typeof value === 'object' && value !== null
}

for (const b of CSS_BLOCKS) {
  // Consumidores escolhem uma parte já criada no HTML, mas continuam aceitando
  // texto livre para seletores avançados e round-trip fiel.
  for (const args of [b.args0, b.args1, b.args2]) {
    for (const arg of args ?? []) {
      if (!isFieldDefinition(arg)) continue
      if (arg.name === 'SELECTOR' && arg.type === 'field_input') {
        arg.type = 'field_name_picker'
        arg.kind = 'selector'
      }
    }
  }
  const colour = CSS_COLOUR_BY_TYPE.get(b.type)
  if (colour) b.colour = colour
}
