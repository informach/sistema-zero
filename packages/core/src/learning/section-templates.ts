import type { SectionIntent } from './index'

export const LESSON_SECTION_TEMPLATES: ReadonlyArray<{
  intent: SectionIntent
  label: string
  title: string
  guidance: string
}> = [
  {
    intent: 'exploration',
    label: 'Explorar um conceito',
    title: 'Experimente esta ideia',
    guidance:
      'Vídeo curto, missão do Zappy e cena manipulável. Pode aparecer antes, depois ou entre trechos de criação. Critério: descobertas da missão.',
  },
  {
    intent: 'demonstration',
    label: 'Demonstrar uma ideia',
    title: 'Observe o exemplo',
    guidance:
      'Roteiro com pausas e repetição, sem manipulação pela criança. O critério registra o exemplo acompanhado. Uma experimentação é outro bloco, incluído apenas quando fizer parte do objetivo da aula.',
  },
  {
    intent: 'application',
    label: 'Criar',
    title: 'Crie no seu projeto',
    guidance:
      'Vídeo de orientação e a mesma ferramenta ao lado. Critério: objetivo verificável no projeto. A entrega fica em outra etapa.',
  },
  {
    intent: 'delivery',
    label: 'Entregar',
    title: 'Mostre sua criação',
    guidance:
      'A criança testa o projeto e envia ao professor. Esta etapa pode vir antes do quiz final.',
  },
  {
    intent: 'closing',
    label: 'Quiz de fechamento',
    title: 'O que você descobriu?',
    guidance:
      'Poucas perguntas sobre o que a criança já explorou e criou. Critério: atingir a nota mínima do quiz.',
  },
  {
    intent: 'presentation',
    label: 'Assistir',
    title: 'Conheça por aqui',
    guidance:
      'Para tour, boas-vindas ou orientação: somente o vídeo. Critério: assistir a 90% dos trechos. Não substitui uma entrega feita em ferramenta externa.',
  },
  {
    intent: 'material',
    label: 'Material do curso',
    title: 'Seu caderno de aventuras',
    guidance:
      'Vídeo curto de apresentação, fala do Zappy, livro 3D e PDF juntos. Critério: abrir o caderno ou baixar o PDF, sem quiz nem tempo mínimo.',
  },
]
