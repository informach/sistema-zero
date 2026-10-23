import { integer, name, node, text } from '../../blocks/nodes'
import type { PythonNode } from '../../language/types'

export interface TurtleTeachingLabel {
  title: string
  category: string
  level: 1 | 2 | 3
  help: string
  args?: PythonNode[]
}
const n = (value: number) => integer(String(value))
const callback = () => name('ao_evento')
const pair = (x: number, y: number) => node('Tuple', { elts: [n(x), n(y)], ctx: node('Load') })
const label = (
  title: string,
  category: string,
  level: 1 | 2 | 3,
  help: string,
  args: PythonNode[] = [],
): TurtleTeachingLabel => ({ title, category, level, help, args })

/** Teaching text only. Python names and signatures come from the pinned CPython manifest. */
const common: Record<string, TurtleTeachingLabel> = {
  Shape: label(
    'criar forma composta',
    'Aparência e imagens',
    3,
    'Cria uma forma feita de partes coloridas. Guarde em uma variável, adicione partes e registre a forma na tela.',
    [text('compound')],
  ),
  addcomponent: label(
    'adicionar parte à forma',
    'Aparência e imagens',
    3,
    'Adiciona um polígono com cor de preenchimento e contorno à forma composta. Os pontos são pares de coordenadas Python.',
    [
      node('Tuple', { elts: [pair(0, 10), pair(10, 0), pair(0, -10)], ctx: node('Load') }),
      text('red'),
      text('black'),
    ],
  ),
  Turtle: label(
    'criar tartaruga',
    'Tartarugas',
    1,
    'Cria uma tartaruga. Guarde o resultado em uma variável para controlar essa tartaruga.',
  ),
  Screen: label(
    'abrir tela',
    'Tela',
    1,
    'Obtém a tela compartilhada pelas tartarugas. Guarde o resultado para configurar a tela.',
  ),
  clone: label(
    'copiar tartaruga',
    'Tartarugas',
    2,
    'Cria outra tartaruga com a mesma posição, aparência e estado da caneta.',
  ),
  getscreen: label(
    'tela da tartaruga',
    'Tartarugas',
    2,
    'Devolve a tela à qual esta tartaruga pertence.',
  ),
  forward: label('avançar', 'Movimento', 1, 'Anda na direção atual pela distância escolhida.', [
    n(100),
  ]),
  back: label('recuar', 'Movimento', 1, 'Anda para trás sem mudar a direção para a qual aponta.', [
    n(100),
  ]),
  left: label('virar à esquerda', 'Movimento', 1, 'Gira para a esquerda pelo ângulo em graus.', [
    n(90),
  ]),
  right: label('virar à direita', 'Movimento', 1, 'Gira para a direita pelo ângulo em graus.', [
    n(90),
  ]),
  goto: label(
    'ir para posição',
    'Movimento',
    1,
    'Vai até x e y sem mudar a direção. Também aceita um par de coordenadas.',
    [n(0), n(0)],
  ),
  setx: label('mudar posição x', 'Movimento', 1, 'Muda só a coordenada horizontal.', [n(100)]),
  sety: label('mudar posição y', 'Movimento', 1, 'Muda só a coordenada vertical.', [n(100)]),
  home: label(
    'voltar ao centro',
    'Movimento',
    1,
    'Volta à posição inicial e aponta para a direção inicial.',
  ),
  setheading: label(
    'apontar na direção',
    'Movimento',
    1,
    'Define a direção em graus. Na configuração normal, zero aponta para a direita.',
    [n(90)],
  ),
  pos: label('posição atual', 'Movimento', 1, 'Devolve o par de coordenadas x e y da tartaruga.'),
  xcor: label('posição x', 'Movimento', 1, 'Devolve a coordenada horizontal atual.'),
  ycor: label('posição y', 'Movimento', 1, 'Devolve a coordenada vertical atual.'),
  heading: label(
    'direção atual',
    'Movimento',
    1,
    'Devolve a direção para a qual a tartaruga aponta.',
  ),
  distance: label(
    'distância até',
    'Movimento',
    2,
    'Calcula a distância até uma posição ou outra tartaruga.',
    [n(0), n(0)],
  ),
  towards: label(
    'direção até',
    'Movimento',
    2,
    'Calcula o ângulo que aponta para uma posição ou outra tartaruga.',
    [n(0), n(0)],
  ),
  penup: label(
    'levantar caneta',
    'Caneta e desenho',
    1,
    'Permite mover a tartaruga sem desenhar uma linha.',
  ),
  pendown: label(
    'abaixar caneta',
    'Caneta e desenho',
    1,
    'Faz os próximos movimentos desenharem uma linha.',
  ),
  isdown: label(
    'caneta está abaixada',
    'Caneta e desenho',
    2,
    'Devolve verdadeiro se os movimentos estiverem desenhando.',
  ),
  pensize: label(
    'espessura da caneta',
    'Caneta e desenho',
    1,
    'Com um número define a espessura. Sem argumentos devolve a espessura atual.',
    [n(3)],
  ),
  pencolor: label(
    'cor da caneta',
    'Caneta e desenho',
    1,
    'Define a cor das linhas. Sem argumentos devolve a cor atual.',
    [text('blue')],
  ),
  fillcolor: label(
    'cor do preenchimento',
    'Caneta e desenho',
    1,
    'Define a cor usada para preencher formas. Sem argumentos consulta a cor.',
    [text('gold')],
  ),
  color: label(
    'cores da tartaruga',
    'Caneta e desenho',
    1,
    'Define as cores da caneta e do preenchimento. Sem argumentos devolve as duas cores.',
    [text('blue'), text('gold')],
  ),
  circle: label(
    'desenhar círculo ou arco',
    'Caneta e desenho',
    1,
    'Desenha um círculo pelo raio. Pode receber também o ângulo do arco e o número de lados.',
    [n(50)],
  ),
  dot: label(
    'desenhar ponto',
    'Caneta e desenho',
    1,
    'Desenha um ponto redondo na posição atual, com tamanho e cor opcionais.',
    [n(10), text('red')],
  ),
  begin_fill: label(
    'começar preenchimento',
    'Caneta e desenho',
    1,
    'Marca o início do contorno que será preenchido por end_fill.',
  ),
  end_fill: label(
    'terminar preenchimento',
    'Caneta e desenho',
    1,
    'Fecha e preenche a forma iniciada por begin_fill.',
  ),
  filling: label(
    'está preenchendo',
    'Caneta e desenho',
    2,
    'Devolve verdadeiro entre begin_fill e end_fill.',
  ),
  write: label(
    'escrever no desenho',
    'Caneta e desenho',
    1,
    'Escreve na posição atual. Aceita alinhamento, fonte e a opção de mover a tartaruga.',
    [text('Olá!')],
  ),
  clear: label(
    'apagar desenho da tartaruga',
    'Caneta e desenho',
    1,
    'Apaga os desenhos desta tartaruga sem mudar sua posição ou estado.',
  ),
  reset: label(
    'reiniciar tartaruga',
    'Tartarugas',
    2,
    'Apaga o desenho e restaura a posição e o estado inicial desta tartaruga.',
  ),
  stamp: label(
    'carimbar tartaruga',
    'Caneta e desenho',
    2,
    'Deixa uma cópia da aparência no desenho e devolve o identificador do carimbo.',
  ),
  clearstamp: label(
    'apagar carimbo',
    'Caneta e desenho',
    2,
    'Apaga o carimbo identificado pelo valor devolvido por stamp.',
    [name('carimbo')],
  ),
  clearstamps: label(
    'apagar carimbos',
    'Caneta e desenho',
    2,
    'Sem argumento apaga todos os carimbos desta tartaruga; um número limita quais apagar.',
  ),
  shape: label(
    'aparência da tartaruga',
    'Aparência e imagens',
    1,
    'Escolhe uma forma conhecida ou uma imagem registrada. Sem argumento consulta o nome.',
    [text('turtle')],
  ),
  shapesize: label(
    'tamanho da forma',
    'Aparência e imagens',
    2,
    'Altera a escala da forma geométrica e a espessura do contorno. Não redimensiona imagens.',
    [n(2), n(2)],
  ),
  showturtle: label(
    'mostrar tartaruga',
    'Aparência e imagens',
    1,
    'Mostra a tartaruga sem alterar os desenhos existentes.',
  ),
  hideturtle: label(
    'esconder tartaruga',
    'Aparência e imagens',
    1,
    'Esconde a tartaruga; ela ainda pode mover e desenhar.',
  ),
  isvisible: label(
    'tartaruga está visível',
    'Aparência e imagens',
    2,
    'Devolve verdadeiro se a tartaruga estiver sendo mostrada.',
  ),
  speed: label(
    'velocidade do desenho',
    'Animação e tempo',
    1,
    'Define a velocidade de animação dos movimentos. Zero desenha sem animação intermediária.',
    [n(0)],
  ),
  onclick: label(
    'ao clicar na tartaruga',
    'Eventos',
    2,
    'Recebe uma função com x e y para quando esta tartaruga for clicada. None remove o evento.',
    [callback()],
  ),
  onrelease: label(
    'ao soltar na tartaruga',
    'Eventos',
    2,
    'Recebe uma função com x e y para quando o botão do mouse for solto.',
    [callback()],
  ),
  ondrag: label(
    'ao arrastar tartaruga',
    'Eventos',
    2,
    'Recebe uma função com x e y durante o arrasto com o mouse.',
    [callback()],
  ),
  bgcolor: label(
    'cor do fundo',
    'Tela',
    1,
    'Define a cor do fundo da tela. Sem argumentos consulta a cor.',
    [text('white')],
  ),
  bgpic: label(
    'imagem do fundo',
    'Aparência e imagens',
    2,
    'Usa uma imagem do projeto como fundo. Sem argumento consulta o nome; nopic remove a imagem.',
    [text('fundo.png')],
  ),
  colormode: label(
    'escala de cores',
    'Tela',
    2,
    'Escolhe componentes RGB entre zero e um ou entre zero e 255.',
    [n(255)],
  ),
  delay: label(
    'intervalo de animação',
    'Animação e tempo',
    2,
    'Define em milissegundos o intervalo de animação. Sem argumento consulta o valor.',
    [n(10)],
  ),
  getshapes: label(
    'nomes das formas',
    'Aparência e imagens',
    2,
    'Devolve os nomes de formas e imagens disponíveis na tela.',
  ),
  register_shape: label(
    'registrar forma ou imagem',
    'Aparência e imagens',
    2,
    'Registra uma imagem pelo caminho do projeto ou uma forma com pares de coordenadas.',
    [text('personagem.png')],
  ),
  listen: label(
    'receber teclado',
    'Eventos',
    1,
    'Pede foco para a tela receber as teclas que foram configuradas.',
  ),
  onkey: label(
    'ao soltar tecla',
    'Eventos',
    2,
    'Recebe uma função sem argumentos para quando a tecla for solta. Use listen para receber teclado.',
    [callback(), text('Right')],
  ),
  onkeypress: label(
    'ao pressionar tecla',
    'Eventos',
    2,
    'Recebe uma função sem argumentos para quando uma tecla for pressionada.',
    [callback(), text('Right')],
  ),
  ontimer: label(
    'agendar função',
    'Animação e tempo',
    2,
    'Chama uma função sem argumentos depois do tempo em milissegundos. O agendamento acontece uma vez.',
    [callback(), n(1000)],
  ),
  mainloop: label(
    'manter janela interativa',
    'Eventos',
    1,
    'Mantém o programa recebendo eventos até a tela ser fechada.',
  ),
  tracer: label(
    'controle de atualizações',
    'Animação e tempo',
    2,
    'Zero desativa atualizações automáticas. Nesse caso chame update para mostrar o desenho.',
    [n(0)],
  ),
  update: label(
    'atualizar desenho',
    'Animação e tempo',
    2,
    'Mostra as alterações pendentes e processa eventos da tela.',
  ),
  turtles: label(
    'tartarugas da tela',
    'Tartarugas',
    2,
    'Devolve a lista das tartarugas que pertencem à tela.',
  ),
  window_width: label('largura da janela', 'Tela', 2, 'Devolve a largura atual da área da janela.'),
  window_height: label('altura da janela', 'Tela', 2, 'Devolve a altura atual da área da janela.'),
  setup: label(
    'tamanho da janela',
    'Tela',
    1,
    'Configura largura e altura. Valores fracionários usam uma parte da área disponível.',
    [n(800), n(600)],
  ),
  title: label('título da janela', 'Tela', 1, 'Define o título da janela Turtle.', [
    text('Meu desenho'),
  ]),
  bye: label('fechar janela', 'Tela', 2, 'Fecha a tela Turtle e encerra seu ciclo de eventos.'),
  exitonclick: label(
    'fechar ao clicar',
    'Eventos',
    2,
    'Mantém a janela aberta e a fecha quando você clica no fundo.',
  ),
}
const screen: Record<string, TurtleTeachingLabel> = {
  clear: label(
    'limpar toda a tela',
    'Tela',
    2,
    'Remove as tartarugas, seus desenhos e os eventos da tela; restaura as configurações da tela.',
  ),
  reset: label(
    'reiniciar todas as tartarugas',
    'Tela',
    2,
    'Reinicia cada tartaruga que pertence à tela.',
  ),
  onclick: label(
    'ao clicar na tela',
    'Eventos',
    2,
    'Recebe uma função com x e y quando o fundo da tela for clicado.',
    [callback()],
  ),
}

export function turtleTeachingLabel(
  canonical: string,
  receiver?: string | null,
): TurtleTeachingLabel {
  const result = (receiver === 'Screen' ? screen[canonical] : undefined) ?? common[canonical]
  if (!result) throw new Error(`Falta a descrição pedagógica de Turtle.${canonical}.`)
  return result
}

export const TURTLE_POLYGON_EXAMPLE = node('Tuple', {
  elts: [pair(0, 10), pair(10, 0), pair(0, -10)],
  ctx: node('Load'),
})
