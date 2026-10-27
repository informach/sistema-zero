import cert from './desafio-certificado.antes.json'
import d1 from './desafio-dia-1.antes.json'
import d2 from './desafio-dia-2.antes.json'
import d3 from './desafio-dia-3.antes.json'
export const lessons = [d1, d2, d3]
export const items = [
  {
    id: 'quadro',
    key: 'experiencia-quadro',
    day: 'Dia 1',
    title: 'Como o personagem anda',
    short: 'Quadros',
    concept: 'O movimento é uma pequena mudança repetida a cada quadro.',
    change:
      'Monte a regra, use o teclado de teste e avance quantos quadros quiser. Cada ação tem seu próprio controle.',
    invite:
      'Compare o comando na regra, a tecla apertada e a passagem dos quadros. O que faz o personagem andar?',
  },
  {
    id: 'limite',
    key: 'experiencia-limite',
    day: 'Dia 1',
    title: 'Até onde ele pode ir?',
    short: 'Limite da tela',
    concept: 'O limite precisa conferir a posição depois do movimento.',
    change: 'Compare o limite e a ordem dos comandos vendo a borda de pertinho, sem coordenadas.',
    invite:
      'Observe o que acontece na borda quando o jogo tem uma regra para manter o personagem na tela.',
  },
  {
    id: 'memoria',
    key: 'experiencia-memoria',
    day: 'Dia 2',
    title: 'O jogo guardou a chave?',
    short: 'Memória',
    concept: 'Retirar a chave, mostrar um aviso e guardar a coleta são ações diferentes.',
    change:
      'As ações do encontro se destacam; fica visível o que mudou e o que permaneceu guardado.',
    invite: 'Compare o que desaparece da tela com o que fica guardado durante a partida.',
  },
  {
    id: 'porta',
    key: 'experiencia-porta',
    day: 'Dia 3',
    title: 'A porta precisa da chave',
    short: 'Decisão',
    concept: 'A porta consulta uma informação e escolhe uma resposta.',
    change: 'Dois caminhos visuais: a tentativa destaca a resposta escolhida pela porta.',
    invite: 'Teste a mesma porta em duas situações e acompanhe qual resposta ela escolhe.',
  },
  {
    id: 'posicao',
    key: 'experiencia-posicao',
    day: 'Dia 3',
    title: 'Como escolher um lugar para a chave',
    short: 'Posição x/y',
    concept: 'Cada coordenada muda a posição em uma direção.',
    change:
      'Os dois eixos ficam livres desde o início: botões, controles deslizantes e um alvo opcional.',
    invite: 'Mude um número por vez e descubra qual deles leva a chave para cada direção.',
  },
  {
    id: 'quiz',
    day: 'Revisão',
    title: 'As regras do seu jogo',
    short: 'Quiz',
    concept: 'Prever, conferir e explicar as regras que você construiu.',
    change: 'As quatro ideias do quiz atual, com cena e resultado depois da previsão.',
    invite: 'Escolha sua previsão e veja a regra acontecer. Você pode tentar outra vez.',
  },
  {
    id: 'objetivos',
    day: 'Estúdio',
    title: 'Objetivos do projeto',
    short: 'Objetivos',
    concept: 'Conferir o comportamento que você programou.',
    change: 'Conquistas observáveis e um exemplo do valor guardado durante o teste.',
    invite: 'Teste sua regra e acompanhe o que acontece no jogo.',
  },
] as const
export type Part = (typeof items)[number]['id']
export const source = (id: Part) =>
  lessons.flatMap((d) => d.blocks).find((b) => b.key === items.find((i) => i.id === id)?.key)
    ?.content as any
export const quizSource = cert.blocks.find((b) => b.content.kind === 'quiz')!.content as any
export const currentObjectives = d3.sections.find((s) => s.key === 'decisao')!.completion
  .projectChecks!
