// O que aparece quando alguém COMPARTILHA uma página (WhatsApp, redes): o og:title e o
// og:description (e os do twitter), aprovados pela dona em 26/11/2026. Convidativos, e NUNCA com
// "Pagamento" ou "oferta": o checkout de cada produto compartilha o MESMO texto da página de venda
// (antes saía "Pagamento | …"). O <title> e a meta description de cada página continuam os dela.
// Client-safe.
import { FUNNELS, type FunnelDef } from '../funnels/registry'

export interface TextoDeCompartilhamento {
  titulo: string
  descricao: string
}

export const COMPARTILHAMENTO: Readonly<Record<string, TextoDeCompartilhamento>> = {
  'kids/como-ajudar-seu-filho-autista-nas-frustracoes': {
    titulo: 'Workshop sobre como ajudar seu filho autista a lidar com frustrações e evitar crises',
    descricao:
      'Workshop para pais com a psicóloga Vivianne Lima, da Laopa. Em aulas curtas, você entende o que pesa para o seu filho e aprende o que fazer antes, durante e depois de uma crise.',
  },
  'kids/vilao-em-aliado': {
    titulo: 'Workshop para pais: a tela que vira briga em casa pode ser sua aliada',
    descricao:
      'Workshop para pais com a Helena. Em aulas curtas, você descobre como usar o tempo de tela do seu filho para ele aprender a planejar, seguir um passo a passo e lidar com o erro.',
  },
  'kids/desafio-primeiro-jogo': {
    titulo: 'Desafio do Primeiro Jogo: seu filho cria o primeiro jogo dele em casa',
    descricao:
      'Para crianças e adolescentes de 5 a 17 anos. Em 3 etapas guiadas, ele planeja, programa e testa A Chave do Farol, praticando habilidades para a vida.',
  },
  'pro/desafio-primeiro-jogo': {
    titulo: 'Desafio do Primeiro Jogo: crie o seu primeiro jogo',
    descricao:
      'Para quem sempre quis criar o próprio jogo. Em 3 etapas guiadas, você constrói A Chave do Farol com blocos de programação, do zero.',
  },
  'kids/cade-todo-mundo': {
    titulo: 'Cadê Todo Mundo: o primeiro jogo do seu filho',
    descricao:
      'Em duas aulas curtas e guiadas, seu filho cria um jogo de esconde-esconde e publica no Mural para a família jogar.',
  },
  'pro/cade-todo-mundo': {
    titulo: 'Cadê Todo Mundo: o seu primeiro jogo em duas aulas',
    descricao:
      'Em duas aulas curtas, você cria um jogo de esconde-esconde que funciona no navegador e publica no Mural.',
  },
  'kids/comunidade-dos-criadores': {
    titulo: 'Comunidade dos Criadores: seu filho criando jogos com orientação',
    descricao:
      'Cursos, Estúdio e Mural para crianças e adolescentes de 5 a 17 anos praticarem planejamento, lógica e persistência criando os próprios jogos.',
  },
  'pro/comunidade-dos-criadores': {
    titulo: 'Comunidade dos Criadores: tire suas ideias de jogo do papel',
    descricao:
      'Cursos, projetos e o Estúdio para você aprender a criar seus jogos com autonomia, no seu ritmo.',
  },
  bio: {
    titulo: 'Helena e Júlio: criação de jogos para a família',
    descricao:
      'Ajudamos pais a transformar parte do tempo de tela dos filhos em oportunidades de desenvolver habilidades cognitivas para a vida, por meio da criação de jogos.',
  },
}

/** Palavras que nunca entram no texto de compartilhamento. */
export const PALAVRAS_PROIBIDAS = /pagamento|oferta/i

/** As etapas de cada produto que compartilham o texto da página de venda. */
const ETAPAS_DO_PRODUTO = new Set(['', 'oferta', 'checkout', 'obrigado'])

function funilDoCaminho(caminho: string): FunnelDef | null {
  for (const f of Object.values(FUNNELS)) {
    if (caminho === f.basePath) return f
    if (!caminho.startsWith(`${f.basePath}/`)) continue
    const etapa = caminho.slice(f.basePath.length + 1).split('/')[0] ?? ''
    if (ETAPAS_DO_PRODUTO.has(etapa)) return f
  }
  return null
}

/**
 * O texto de compartilhamento da página pelo caminho: a bio (`/`), a página de venda de cada produto
 * (com as subpáginas da oferta), o checkout e o obrigado. Outras páginas: `null` (usam o próprio
 * título e descrição, desde que sem as palavras proibidas; ver `BaseLayout`).
 */
export function compartilhamentoDoCaminho(caminho: string): TextoDeCompartilhamento | null {
  const limpo = caminho.length > 1 ? caminho.replace(/\/+$/, '') : caminho
  if (limpo === '/') return COMPARTILHAMENTO.bio ?? null
  const f = funilDoCaminho(limpo)
  return f ? (COMPARTILHAMENTO[f.key] ?? null) : null
}
