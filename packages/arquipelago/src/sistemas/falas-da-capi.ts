/**
 * O que a Capi fala (só texto, sem regra de amizade: essa fica em `moradores.ts`). A primeira
 * conversa do dia escolhe uma fala do nível de amizade e comenta o que a criança fez; as outras do
 * mesmo dia repetem uma despedida. Regras de texto do jogo: sem travessão, sem exclamação, e a
 * primeira frase nunca é pergunta.
 */

export interface ContextoDaFala {
  /** Corações cheios (0 a 5). */
  coracoes: number
  /** Nunca conversaram antes. */
  primeiroEncontro: boolean
  /** A primeira conversa de hoje (as outras repetem a despedida). */
  primeiraDoDia: boolean
  aniversario: boolean
  /** Quantos bichos já foram achados e quantos são ao todo. */
  achados: number
  total: number
  /** O nome do bicho adotado, se houver. */
  adotado: string | null
  /** O texto do pedido de hoje, se ainda não foi entregue. */
  pedido: string | null
}

export const FALA_DO_PRESENTE_DOS_BICHOS = [
  'Você encontrou os quatro bichos do Bosque. Obrigada por cuidar de cada um.',
  'Preparei uma salada da horta para agradecer. Ela já está na sua mochila.',
] as const

export const FALA_DO_PRESENTE_SEM_ESPACO =
  'Guardei uma salada para agradecer por achar os quatro bichos. Libere espaço na mochila e venha conversar comigo para receber.'

const PRIMEIRO_ENCONTRO = [
  'Oi. Eu sou a Capi, eu cuidava dos bichos deste bosque.',
  'Quando a cor foi embora, eles ficaram com medo e se esconderam no Cinza.',
  'Se você achar algum, traz para o cercadinho perto da minha cabana. Eles vão gostar de ver alguém conhecido.',
]

/** Uma fala por nível de amizade (o índice é o número de corações). */
const POR_NIVEL: readonly (readonly string[])[] = [
  [
    'O bosque fica mais bonito com gente andando por ele.',
    'Eu gosto de começar o dia olhando o lago. Ele muda de cor com o céu.',
  ],
  [
    'Você voltou. Eu estava contando as folhas novas da árvore grande.',
    'Os bichos sentem quando alguém é gentil. Eles não esquecem.',
  ],
  [
    'Eu aprendi uma coisa cuidando dos bichos: cada um tem um jeito de pedir carinho.',
    'Eu guardo milho na cabana para os dias frios. É o meu preferido.',
  ],
  [
    'Antes da cor ir embora, o lago ficava cheio de vagalumes à noite.',
    'Os bichos dormiam todos juntos no cercadinho, um encostado no outro.',
  ],
  [
    'Você é uma das pessoas de quem eu mais gosto neste arquipélago.',
    'Quando eu vejo você chegando pela ponte, o bosque parece mais colorido.',
  ],
  [
    'Melhores amigas e melhores amigos se reconhecem de longe. Eu reconheço você.',
    'Se um dia o bosque ficar cinza de novo, eu sei que você volta para ajudar.',
  ],
]

const DESPEDIDA = [
  'Até amanhã. Hoje eu já contei tudo o que sabia.',
  'Volte amanhã, que eu terei uma história nova.',
]

/** Escolhe uma fala do grupo de forma estável (a mesma para o mesmo dia e número). */
function uma(grupo: readonly string[], escolha: number): string {
  return grupo[Math.abs(escolha) % grupo.length] ?? grupo[0] ?? ''
}

/**
 * As falas desta conversa, na ordem. `escolha` muda a fala dentro do nível (o jogo passa um número
 * do dia, para não repetir sempre a mesma).
 */
export function falasDaCapi(c: ContextoDaFala, escolha: number): string[] {
  if (c.primeiroEncontro) return [...PRIMEIRO_ENCONTRO]
  if (!c.primeiraDoDia) return [uma(DESPEDIDA, escolha)]
  const falas: string[] = []
  if (c.aniversario)
    falas.push('Hoje é o meu aniversário. Você lembrou de vir, e isso já é presente.')
  falas.push(uma(POR_NIVEL[Math.min(5, Math.max(0, c.coracoes))] ?? POR_NIVEL[0] ?? [], escolha))
  if (c.achados === 0)
    falas.push('Os bichos estão escondidos pelo bosque. Procure perto das moitas e das tocas.')
  else if (c.achados < c.total) {
    const faltam = c.total - c.achados
    falas.push(
      faltam === 1
        ? `Você já achou ${c.achados} de ${c.total} bichos. Falta só um, e está por perto.`
        : `Você já achou ${c.achados} de ${c.total} bichos. Faltam ${faltam}, e estão por perto.`,
    )
  } else falas.push('Todos os bichos voltaram para casa. Obrigada por procurar cada um.')
  if (c.adotado)
    falas.push(`Manda um abraço para ${c.adotado}. Bicho bem cuidado fica com o pelo brilhando.`)
  if (c.pedido) falas.push(`Hoje eu queria uma coisa: ${c.pedido.toLowerCase()}.`)
  return falas
}
