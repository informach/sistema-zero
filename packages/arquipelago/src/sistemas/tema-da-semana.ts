import { semanaDoJogo } from './semana'

/** Convites criativos, sem objetivo obrigatório, recompensa ou aparência exigida. */
export const TEMAS_DE_CONSTRUCAO = [
  {
    id: 'luz',
    nome: 'Uma casa com luz',
    convite: 'Escolha um cantinho da casa e experimente uma janela. Veja como a luz muda o lugar.',
    alternativa: 'Você também pode usar as janelas que já tem e mudar a posição dos móveis.',
  },
  {
    id: 'horta',
    nome: 'Um caminho para a horta',
    convite: 'Faça um caminho da casa até a horta. Deixe espaço para chegar aos canteiros.',
    alternativa: 'Use o chão e as peças que já estão disponíveis. Não precisa comprar nada.',
  },
  {
    id: 'cores',
    nome: 'Um toque da sua cor',
    convite:
      'Escolha um objeto que já tem um projeto azul e experimente uma aparência sua no Pinta.',
    alternativa:
      'Se o Pinta ainda não abriu, experimente combinar as cores dos pisos e janelas disponíveis.',
  },
  {
    id: 'leitura',
    nome: 'Um cantinho para histórias',
    convite:
      'Arrume um cantinho para ler ou contar uma história. Deixe um lugar livre para sentar.',
    alternativa: 'A forma e as cores são suas. Reorganizar o que já existe também vale.',
  },
  {
    id: 'cozinha',
    nome: 'Perto do lanche',
    convite:
      'Organize um espaço perto da cozinha ou da bancada. Deixe um caminho livre para preparar uma receita.',
    alternativa:
      'Você pode começar pelo caminho. A cozinha pode crescer depois, com a sua jornada.',
  },
  {
    id: 'visitas',
    nome: 'Espaço para se encontrar',
    convite:
      'Arrume um cômodo com espaço para receber visitas. Observe a luz, as plantas e a passagem.',
    alternativa: 'No menu Moradores em casa, você encontra as dicas de aconchego. Vá no seu tempo.',
  },
] as const
export type TemaDeConstrucao = (typeof TEMAS_DE_CONSTRUCAO)[number]
/** Todos os convites continuam disponíveis depois que o destaque muda. */
export function temaDaSemana(agora: Date): { semana: string; tema: TemaDeConstrucao } | null {
  const semana = semanaDoJogo(agora)
  if (!semana) return null
  const indice =
    ((semana.numero % TEMAS_DE_CONSTRUCAO.length) + TEMAS_DE_CONSTRUCAO.length) %
    TEMAS_DE_CONSTRUCAO.length
  return { semana: semana.inicio, tema: TEMAS_DE_CONSTRUCAO[indice]! }
}
