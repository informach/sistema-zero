// Copy do painel do embaixador (`/embaixador/<token>`) e das dúvidas do programa. Desde 25/11/2026 o
// painel segue o Canvas da frente de embaixadores e campanhas (quadro embaixador-painel): os
// números (pessoas, convites e bônus), o passo 1 (dar um presente ou indicar uma oferta), o passo 2
// (as ofertas que o Admin liberou para o público) e o passo 3 (o link, com o destino na oferta, o
// cartão, a mensagem de WhatsApp e o convite por e-mail). Módulo client-safe: as ilhas
// `EmbaixadorPainel` e `EmbaixadorBonus` o importam. Nenhum valor em dinheiro escrito aqui: o bônus
// vem de `bonus.amountCents`, e os cartões de oferta não citam preço (o preço é do catálogo).
// `{{nome}}`, `{{link}}`, `{{email}}`, `{{data}}` e `{{n}}` são preenchidos na renderização.

import { type GiftAudience, giftDurationLabel } from '@sistemazero/core/referrals'
import type { ImagemPresente } from './presente'

const IMG_KIDS = '/img/comunidade-dos-criadores'

export const PAINEL_EMBAIXADOR = {
  seoTitle: 'Seu painel de embaixador | Sistema Zero',
  description:
    'Escolha o que mandar, um presente ou uma oferta, e compartilhe o seu link do Sistema Zero.',
  pular: 'Ir para o conteúdo',
  topo: {
    marcaAria: 'Sistema Zero, voltar ao topo',
    logoAlt: 'Sistema Zero',
    programa: 'Programa de embaixadores',
    navAria: 'Atalhos do painel',
    links: 'Seus links',
    bonus: 'Bônus',
    campanhas: 'Minhas campanhas',
    duvidas: 'Dúvidas',
  },
  aviso: {
    destaque: 'Guarde esta página só para você.',
    texto:
      ' Ela abre o seu painel e a sua chave Pix. Para presentear ou indicar, use os links que você gera aqui.',
  },
  cabeca: {
    etiqueta: 'Seu espaço de embaixador',
    titulo: 'Olá, {{nome}}. Escolha o que mandar e copie o seu link.',
    /** Sem nome no cadastro: o título sem a saudação. */
    tituloSemNome: 'Escolha o que mandar e copie o seu link.',
    texto:
      'Você pode dar um presente, sem custo para quem recebe, ou indicar um curso ou a assinatura. Quem entrar pelo seu link fica marcado como vindo de você.',
  },
  numeros: {
    pessoas: {
      titulo: 'Pessoas que entraram pelos seus links',
      presentes: { um: '{{n}} ganhou um presente', varios: '{{n}} ganharam um presente' },
      compras: {
        um: '{{n}} comprou algo que você indicou',
        varios: '{{n}} compraram algo que você indicou',
      },
      /** O referrals anterior a 25/11/2026 só conta os resgates. */
      tituloAntigo: 'Presentes resgatados pelos seus links',
    },
    convites: {
      titulo: 'Convites por e-mail enviados',
      texto: 'Cada pessoa recebe o convite uma vez.',
    },
    bonus: {
      titulo: 'Assinaturas que viraram bônus',
      antes: 'Os detalhes estão em ',
      link: 'Bônus',
      depois: '.',
    },
    nota: 'O painel mostra quantas pessoas, sem nomes nem dados de quem entrou.',
  },
  passo1: {
    titulo: 'O que você quer mandar?',
    presente: 'Dar um presente',
    oferta: 'Indicar uma oferta',
    explica: {
      presente: 'Quem recebe ganha o acesso sem pagar nada.',
      oferta: 'Quem recebe vê a página de venda. A compra fica registrada como vinda de você.',
    },
  },
  passo2: {
    titulo: { presente: 'Escolha o presente', oferta: 'Escolha a oferta' },
    bonus: 'Pode render um bônus para você',
    vazio:
      'Ainda não há ofertas liberadas para esta escolha. Volte a esta página em breve: elas aparecem aqui assim que a equipe liberar.',
  },
  passo3: {
    titulo: 'Mande o seu link',
    destino: {
      rotulo: 'Para onde o link leva',
      pagina: 'Página da oferta',
      pagamento: 'Direto para o pagamento',
      explica: {
        pagina: 'Para quem ainda está conhecendo: a pessoa lê sobre a oferta antes de decidir.',
        pagamento:
          'Para quem já decidiu: o link abre o pagamento com a oferta escolhida, e a pessoa preenche os dados ali mesmo.',
      },
    },
    campo: 'Seu link para compartilhar',
    copiar: 'Copiar link',
    copiado: 'Link copiado',
    ver: 'Ver a página como quem recebe',
    indisponivel:
      'O link desta escolha ainda não está disponível. Volte a esta página em breve: ele aparece aqui, junto com a mensagem pronta.',
    mensagemRotulo: 'Mensagem pronta para o WhatsApp',
    mensagemAjuda: 'Ajuste o texto para a pessoa que você conhece.',
    whatsapp: 'Abrir meu WhatsApp com a mensagem',
    copiarMensagem: 'Copiar mensagem',
    mensagemCopiada: 'Mensagem copiada',
    nota: 'A mensagem sai do seu WhatsApp. O Sistema Zero não envia mensagens em seu nome.',
    manual: 'A cópia automática não funcionou. Selecione o texto abaixo e copie:',
    manualAria: 'Texto para copiar manualmente',
    /** O aviso do cartão de divulgação, por estilo da escolha. */
    cartao: {
      kids: 'Acesse o link e faça o cadastro como responsável pela criança.',
      pais: 'Acesse o link e faça o seu cadastro.',
      adult: 'Acesse o link e faça seu cadastro. Para pessoas de 18 anos ou mais.',
      oferta: 'Acesse o link para conhecer a oferta.',
    },
  },
  convite: {
    titulo: 'Ou mande o convite por e-mail',
    antes: 'O e-mail leva ',
    depois: ', com o seu nome. Cada pessoa recebe o convite uma vez.',
    nome: 'Nome de quem vai receber',
    nomePlaceholder: 'Ana',
    email: 'E-mail',
    emailPlaceholder: 'ana@email.com',
    enviar: 'Enviar convite',
    enviando: 'Enviando…',
    enviado: 'Convite enviado para {{email}}.',
    invalido: 'Preencha o nome e um e-mail válido.',
    jaEnviado: 'Esse e-mail já recebeu o convite.',
    jaResgatou: {
      kids: 'Esse e-mail já resgatou o presente Kids.',
      adult: 'Esse e-mail já resgatou o presente adulto.',
    } satisfies Record<GiftAudience, string>,
    ofertaIndisponivel:
      'Esta oferta saiu da lista de convites. Recarregue a página e escolha outra.',
    limite: 'Você atingiu o limite de convites de hoje. Amanhã você pode enviar outros.',
    falha: 'Não foi possível enviar agora. Tente de novo em instantes.',
    semLink: 'O convite por e-mail abre junto com o link desta escolha.',
  },
  bonus: {
    titulo: 'Um agradecimento quando alguém do seu link assina',
    antes:
      'Quando uma pessoa que entrou por um dos seus links, por presente ou por indicação, assina a Comunidade dos Criadores, Kids ou adulta, em até 45 dias, você recebe ',
    semValor: 'um bônus',
    depois:
      ', depois dos 7 dias de garantia. A equipe paga por Pix. Ganhar o presente ou comprar um curso, sozinho, não gera bônus.',
    regras:
      'Bônus único pela primeira assinatura, sem bônus nas renovações. Se a pessoa já tinha vindo por outro embaixador nesses 45 dias, o bônus é de quem veio primeiro. Campanhas seguem as condições delas.',
    item: 'Assinatura em {{data}}',
    estados: {
      pago: 'pago',
      pagoEm: 'pago em {{data}}',
      liberadoComChave: 'liberado, aguardando pagamento manual',
      liberadoSemChave: 'liberado, falta a sua chave Pix',
      garantia: 'aguardando a garantia de 7 dias',
    },
    vazio:
      'Ainda não há bônus registrados. Você já pode compartilhar os seus links e cadastrar a sua chave Pix.',
    pixRotulo: 'Sua chave Pix para receber',
    pixPlaceholder: 'CPF, e-mail, telefone ou chave aleatória',
    pixFalta: 'Cadastre a sua chave para o dinheiro sair: sem ela o pagamento fica parado.',
    salvar: 'Salvar chave',
    salvando: 'Salvando…',
    salvo: 'Chave Pix salva.',
    pixTamanho:
      'Confira a chave: ela parece incompleta ou longa demais. Vale CPF, e-mail, telefone ou chave aleatória.',
    pixRecusada:
      'Essa chave não passou. Confira se ela está completa e tente com outra se precisar.',
    pixFalha: 'Não foi possível salvar agora. Tente de novo em instantes.',
    resumo: 'O agradecimento é pago uma vez por assinatura, sem vínculo de trabalho.',
    termos:
      'O bônus é um agradecimento único por indicação que virar assinatura. Não é salário nem renda garantida e não cria vínculo com a plataforma. Autoindicação não gera bônus, e estorno dentro da garantia cancela o bônus pendente.',
  },
  fechamento: {
    titulo: 'Um convite seu ajuda a pessoa a começar',
    texto:
      'Conte por que você lembrou daquela pessoa e deixe a página explicar o resto com calma. Começar, e continuar depois, é decisão de quem recebe.',
    cta: 'Voltar aos meus links',
  },
  indisponivel: {
    naoEncontrado: {
      titulo: 'Esta página não está disponível',
      texto:
        'Confira se o link do e-mail foi copiado por inteiro. Você também pode abrir o painel pela sua conta: no app adulto, em Meu perfil; no Kids, na Área dos pais, em Conta.',
    },
    foraDoAr: {
      titulo: 'Não conseguimos abrir o seu painel agora',
      texto: 'Recarregue em alguns instantes. Não é preciso fazer outro cadastro.',
    },
    contato: 'Pedir ajuda à equipe',
  },
}

// ── As escolhas do passo 2 ─────────────────────────────────────────────────────

export type ModoEmbaixador = 'presente' | 'oferta'
/** A língua do cartão: Kids (família), pais (curso para o responsável) ou adulto (arcade). */
export type EstiloDeOpcao = 'kids' | 'pais' | 'adult'

/** Uma oferta da lista do público, como o referrals a manda na página do embaixador. */
export interface OfertaDoEmbaixador {
  kind: 'gift' | 'referral'
  offerId: string
  offerSlug: string
  name: string
  audience: GiftAudience
  courseSlug: string | null
  accessDays: number | null
  /** Prazo em meses da oferta de venda (o Cadê vendido: 12 = "1 ano"); ausente nas antigas. */
  accessMonths?: number | null
  /** SKU do produto da oferta: dá o apelido do link curto (`/i/<código>/<apelido>`). */
  productSku?: string | null
  includesMural: boolean
  subscription: boolean
  link: string
  checkoutLink: string | null
}

/** O cartão de uma escolha, com a copy do Canvas quando a oferta é uma das conhecidas. */
export interface OpcaoDoEmbaixador {
  id: string
  modo: ModoEmbaixador
  estilo: EstiloDeOpcao
  audience: GiftAudience
  chip: string
  titulo: string
  texto: string
  imagem: ImagemPresente
  /** O que o e-mail leva ("o presente para uma família", "a indicação de…"). */
  convite: string
  /** A mensagem de WhatsApp, com `{{link}}` no fim. */
  mensagem: string
  bonus: boolean
  link: string
  checkoutLink: string | null
  /** O slug que vai no convite por e-mail (`null` = o convite do presente padrão, o do Cadê). */
  conviteOferta: string | null
}

const CHIPS: Record<EstiloDeOpcao, string> = {
  kids: 'Para uma família',
  pais: 'Para pais e mães',
  adult: 'PARA UM ADULTO',
}

const IMAGENS = {
  cadeKids: { src: `${IMG_KIDS}/tela-regra-ligada.webp`, alt: '', width: 1280, height: 800 },
  cadeAdulto: { src: `${IMG_KIDS}/jogo-cade.webp`, alt: '', width: 1264, height: 723 },
  vilao: {
    src: '/img/transformando-o-vilao-em-aliado/vilao-em-aliado.webp',
    alt: '',
    width: 1049,
    height: 711,
  },
  autismo: {
    src: '/img/como-ajudar-seu-filho-autista/capa-do-curso.webp',
    alt: '',
    width: 1200,
    height: 675,
  },
  comunidadeKids: { src: `${IMG_KIDS}/hero.webp`, alt: '', width: 940, height: 1366 },
  desafio: { src: '/img/desafio-primeiro-jogo/farol-capa.webp', alt: '', width: 1280, height: 960 },
  comunidadeAdulto: {
    src: '/img/comunidade-adulto/previa-aula.webp',
    alt: '',
    width: 1600,
    height: 800,
  },
} satisfies Record<string, ImagemPresente>

const CURSO_PAIS = 'transformando-o-vilao-em-aliado'
const CURSO_PAIS_AUTISMO = 'como-ajudar-seu-filho-autista-nas-frustracoes'
/** Os cursos para pais: o cartão leva o estilo `pais` (quem assiste é o adulto). */
const CURSOS_PARA_PAIS: readonly string[] = [CURSO_PAIS, CURSO_PAIS_AUTISMO]

/** Os cursos de que o Canvas tem a copy própria (a frase do curso, sem prazo e sem custo). */
const CURSOS: Record<
  string,
  { titulo: string; texto: string; imagem: ImagemPresente; mensagem?: string }
> = {
  'cade-todo-mundo': {
    titulo: 'Cadê Todo Mundo',
    texto: 'A criança de 5 a 17 anos faz o curso e publica o jogo no Mural Kids.',
    imagem: IMAGENS.cadeKids,
  },
  'cade-todo-mundo-adulto': {
    titulo: 'Cadê Todo Mundo, versão adulta',
    texto: 'Alguém de 18 anos ou mais faz o primeiro jogo no navegador e publica no Mural adulto.',
    imagem: IMAGENS.cadeAdulto,
  },
  [CURSO_PAIS]: {
    titulo: 'Transformando o vilão em aliado',
    texto: 'Um curso para o pai ou a mãe usar a seu favor o tempo de tela que o filho já tem.',
    imagem: IMAGENS.vilao,
  },
  [CURSO_PAIS_AUTISMO]: {
    titulo: 'Como ajudar seu filho autista a lidar com frustrações e evitar crises',
    texto:
      'Um curso para o pai ou a mãe de uma criança autista, com a psicóloga Vivianne Lima, sobre o que fazer antes, durante e depois de uma crise.',
    imagem: IMAGENS.autismo,
  },
  'desafio-primeiro-jogo': {
    titulo: 'Desafio do Primeiro Jogo',
    texto: 'O curso em que a criança faz o primeiro jogo, no computador, com as aulas ao lado.',
    imagem: IMAGENS.desafio,
  },
  'desafio-primeiro-jogo-adulto': {
    titulo: 'Desafio do Primeiro Jogo, versão adulta',
    texto:
      'O curso em que alguém de 18 anos ou mais faz o primeiro jogo no navegador, com as aulas ao lado.',
    imagem: IMAGENS.desafio,
  },
}

/** As mensagens do Canvas, por curso e modo (o resto usa a mensagem genérica). */
const MENSAGENS: Record<string, Partial<Record<ModoEmbaixador, (prazo: string) => string>>> = {
  'cade-todo-mundo': {
    presente: (prazo) =>
      `Oi. Lembrei de vocês: no Sistema Zero, a criança faz um jogo de procurar personagens funcionar, com a explicação ao lado. Quero dar ${prazo} de presente para vocês, sem custo e sem cartão. É para crianças de 5 a 17 anos (abaixo de 9, com um acompanhante), no computador. Você faz o cadastro por este link: {{link}}`,
  },
  'cade-todo-mundo-adulto': {
    presente: (prazo) =>
      `Oi. Lembrei de você: no Sistema Zero dá para fazer o primeiro jogo no navegador, com o projeto preparado e a aula ao lado. Quero dar ${prazo} de presente para você, sem custo e sem cartão. O cadastro é por este link: {{link}}`,
  },
  [CURSO_PAIS]: {
    presente: () =>
      'Oi. Lembrei de você quando falamos sobre tempo de tela em casa. Quero te dar de presente um curso curto do Sistema Zero, para pais e mães, sobre como a tela pode ajudar o filho a planejar e lidar com o erro. É gratuito para você. O cadastro é por este link: {{link}}',
  },
  [CURSO_PAIS_AUTISMO]: {
    presente: () =>
      'Oi. Lembrei de você: quero te dar de presente um curso curto do Sistema Zero, para pais e mães de crianças autistas, com a psicóloga Vivianne Lima. Ela mostra o que fazer antes, durante e depois de uma crise. É gratuito para você. O cadastro é por este link: {{link}}',
    oferta: () =>
      'Oi. Lembrei de você: no Sistema Zero tem um curso curto para pais e mães de crianças autistas, com a psicóloga Vivianne Lima, sobre o que fazer antes, durante e depois de uma crise. Dá uma olhada por este link: {{link}}',
  },
  'desafio-primeiro-jogo': {
    oferta: (prazo) =>
      `Oi. Lembrei de vocês: no Desafio do Primeiro Jogo, do Sistema Zero, a criança faz o primeiro jogo dela em ${prazo}, no computador, com as aulas ao lado. Dá uma olhada por este link: {{link}}`,
  },
}

/** "7 dias", "1 ano" ou "6 meses"; sem prazo, null (a copy não fala de duração). */
function prazoDe(accessDays: number | null, accessMonths?: number | null): string | null {
  if (accessMonths)
    return accessMonths === 12 ? '1 ano' : accessMonths === 1 ? '1 mês' : `${accessMonths} meses`
  return accessDays === null ? null : giftDurationLabel(accessDays)
}

function maiuscula(texto: string): string {
  return texto.charAt(0).toLocaleUpperCase('pt-BR') + texto.slice(1)
}

/**
 * O cartão de uma oferta da lista: a assinatura (Comunidade Kids ou adulta), um curso conhecido
 * (a copy do Canvas) ou qualquer outra oferta (texto montado do nome e do prazo).
 */
export function opcaoDeOferta(oferta: OfertaDoEmbaixador): OpcaoDoEmbaixador {
  const modo: ModoEmbaixador = oferta.kind === 'gift' ? 'presente' : 'oferta'
  const adulto = oferta.audience === 'adult'
  const estilo: EstiloDeOpcao = adulto
    ? 'adult'
    : oferta.courseSlug && CURSOS_PARA_PAIS.includes(oferta.courseSlug)
      ? 'pais'
      : 'kids'
  const prazo = prazoDe(oferta.accessDays, oferta.accessMonths)
  const base = {
    id: `${oferta.kind}:${oferta.audience}:${oferta.offerSlug}`,
    modo,
    estilo,
    audience: oferta.audience,
    chip: CHIPS[estilo],
    bonus: oferta.subscription,
    link: oferta.link,
    checkoutLink: oferta.kind === 'referral' ? oferta.checkoutLink : null,
  }

  if (oferta.subscription) {
    return adulto
      ? {
          ...base,
          titulo: 'Comunidade dos Criadores, versão adulta',
          texto:
            'A assinatura adulta, com cursos, Estúdio e Mural para quem quer criar os próprios jogos.',
          imagem: IMAGENS.comunidadeAdulto,
          convite: 'a indicação da Comunidade adulta',
          mensagem:
            'Oi. Lembrei de você: na Comunidade dos Criadores, do Sistema Zero, dá para aprender a criar os próprios jogos no navegador, com cursos e um Mural para publicar. Dá uma olhada por este link: {{link}}',
          conviteOferta: oferta.offerSlug,
        }
      : {
          ...base,
          titulo: 'Comunidade dos Criadores',
          texto:
            'A assinatura com os cursos de criação de jogos, o Estúdio e o Mural, para crianças de 5 a 17 anos.',
          imagem: IMAGENS.comunidadeKids,
          convite: 'a indicação da Comunidade dos Criadores',
          mensagem:
            'Oi. Meu filho cria jogos na Comunidade dos Criadores, do Sistema Zero, e lembrei de vocês. São cursos de criação de jogos para crianças de 5 a 17 anos, com o Estúdio e um Mural para publicar. Dá uma olhada por este link: {{link}}',
          conviteOferta: oferta.offerSlug,
        }
  }

  const curso = oferta.courseSlug ? CURSOS[oferta.courseSlug] : undefined
  const titulo = curso?.titulo ?? oferta.name
  const frase = curso?.texto ?? ''
  // O fim do texto diz o prazo e, no presente, que não custa nada para quem recebe.
  const fim =
    modo === 'presente'
      ? `${prazo ? maiuscula(prazo) : 'Sem prazo'}, sem custo${estilo === 'kids' ? ' para a família' : ''}.`
      : prazo
        ? `${maiuscula(prazo)} de acesso.`
        : 'Acesso sem prazo.'
  const especifica = oferta.courseSlug ? MENSAGENS[oferta.courseSlug]?.[modo] : undefined
  const prazoNaMensagem = prazo ?? 'acesso ao curso'
  const mensagem =
    especifica?.(prazoNaMensagem) ??
    (modo === 'presente'
      ? adulto
        ? `Oi. Lembrei de você: quero te dar de presente ${titulo}, do Sistema Zero, sem custo e sem cartão. O cadastro é por este link: {{link}}`
        : `Oi. Lembrei de vocês: quero dar de presente ${titulo}, do Sistema Zero, sem custo e sem cartão. Você faz o cadastro por este link: {{link}}`
      : adulto
        ? `Oi. Lembrei de você: no Sistema Zero tem ${titulo}, e acho que combina com você. Dá uma olhada por este link: {{link}}`
        : `Oi. Lembrei de vocês: no Sistema Zero tem ${titulo}, e acho que combina com vocês. Dá uma olhada por este link: {{link}}`)
  return {
    ...base,
    titulo,
    texto: frase ? `${frase} ${fim}` : fim,
    imagem:
      curso?.imagem ??
      (estilo === 'adult'
        ? IMAGENS.comunidadeAdulto
        : estilo === 'pais'
          ? IMAGENS.vilao
          : IMAGENS.comunidadeKids),
    convite:
      modo === 'presente'
        ? estilo === 'pais'
          ? 'o curso de presente para pais e mães'
          : adulto
            ? 'o presente para um adulto'
            : 'o presente para uma família'
        : `a indicação de ${titulo}`,
    mensagem,
    // Toda oferta da lista vai no convite: o presente do Cadê sai no e-mail aprovado de sempre
    // (o referrals escolhe), mas com a oferta ESCOLHIDA no link, nunca a padrão.
    conviteOferta: oferta.offerSlug,
  }
}

/**
 * Sem lista do Admin (referrals anterior a 25/11/2026 ou listas vazias): o presente padrão de cada
 * público, com os links de sempre (`shareUrls`).
 */
export function opcoesPadrao(links: Record<GiftAudience, string | null>): OpcaoDoEmbaixador[] {
  const opcoes: OpcaoDoEmbaixador[] = []
  for (const audience of ['kids', 'adult'] as const) {
    const link = links[audience]
    if (!link) continue
    const opcao = opcaoDeOferta({
      kind: 'gift',
      offerId: `padrao-${audience}`,
      offerSlug: `padrao-${audience}`,
      name: audience === 'kids' ? 'Cadê Todo Mundo' : 'Cadê Todo Mundo, versão adulta',
      audience,
      courseSlug: audience === 'kids' ? 'cade-todo-mundo' : 'cade-todo-mundo-adulto',
      accessDays: 7,
      includesMural: true,
      subscription: false,
      link,
      checkoutLink: null,
    })
    opcoes.push({ ...opcao, conviteOferta: null })
  }
  return opcoes
}

/** As dúvidas do painel (Canvas de 25/11/2026). */
export const PAINEL_DUVIDAS = {
  etiqueta: 'Para indicar com tranquilidade',
  titulo: 'Sobre participar e compartilhar',
  itens: [
    {
      pergunta: 'Qual link devo mandar?',
      paragrafos: [
        'Pense na pessoa. Para quem ainda não conhece, um presente é o jeito mais leve de começar. Para quem já conhece e quer mais, indique o curso ou a assinatura. Cada link leva a uma página feita para quem vai usar.',
      ],
    },
    {
      pergunta: 'E se a pessoa comprar um curso pelo meu link?',
      paragrafos: [
        'A compra fica registrada como vinda de você. Se depois ela assinar a Comunidade em até 45 dias, você recebe o bônus da assinatura.',
      ],
    },
    {
      pergunta: 'Quem recebe precisa pagar alguma coisa?',
      paragrafos: [
        'O presente é gratuito, sem cartão e sem assinatura automática. Na indicação, a pessoa paga o preço da oferta.',
      ],
    },
    {
      pergunta: 'Quando uma indicação gera bônus?',
      paragrafos: [
        'Quando alguém que entrou por um dos seus links assina a Comunidade em até 45 dias, depois da garantia de 7 dias.',
      ],
    },
    {
      pergunta: 'O que eu consigo acompanhar sobre quem convidei?',
      paragrafos: [
        'Quantas pessoas entraram pelos seus links, quantos convites você mandou e os seus bônus, sem nomes nem dados de quem entrou.',
      ],
    },
    {
      pergunta: 'E se a pessoa já veio por outro link?',
      paragrafos: [
        'Vale quem trouxe primeiro. Se ela entrou por outro embaixador nos últimos 45 dias, o bônus da assinatura é dele.',
      ],
    },
    {
      pergunta: 'Posso criar ou alterar as minhas campanhas?',
      paragrafos: [
        'As campanhas são criadas pela equipe do Sistema Zero. Aqui você consulta e prepara a divulgação.',
      ],
    },
  ],
}

/** As dúvidas do programa na página pública `/kids/embaixadores`. */
export const EMBAIXADOR_DUVIDAS = {
  etiqueta: 'Para indicar com tranquilidade',
  titulo: 'Sobre participar e compartilhar',
  itens: [
    {
      pergunta: 'Como faço para participar?',
      paragrafos: [
        'No app adulto, abra Meu perfil e a seção Embaixador. Na área Kids, entre como responsável, abra a Área dos pais, clique em Conta e procure o cartão Seja um embaixador do Sistema Zero. Nos dois, você participa com os dados da própria conta, e os seus links e o acesso ao painel ficam ali.',
        'Se a equipe cadastrou você manualmente, o acesso ao painel chega pelo seu e-mail. Se já existe um cadastro com esse e-mail, a plataforma pode pedir que você abra o link enviado à caixa de entrada, para proteger o painel e a chave Pix.',
      ],
    },
    {
      pergunta: 'Qual dos links devo mandar?',
      paragrafos: [
        'No painel, escolha se quer dar um presente ou indicar uma oferta e copie o link que ele gera. Quem recebe abre a página feita para aquele público e faz o próprio cadastro.',
        'Para divulgar um encontro específico, use o link em Minhas campanhas. Ele conserva o prazo e as condições daquela ação. O cartão de divulgação tem o QR code desse mesmo link.',
        'O endereço que tem /embaixador/ é o seu acesso privado. Ele abre o seu painel e a sua chave Pix. Guarde-o para você. Se o compartilhar sem querer, avise a equipe para que ela troque esse acesso.',
      ],
    },
    {
      pergunta: 'Posso criar ou alterar as minhas campanhas?',
      paragrafos: [
        'A equipe do Sistema Zero cadastra e altera campanhas, datas, cupons e comissões. Em Minhas campanhas, você consulta as ações vinculadas a você e copia os links ou baixa os cartões para divulgar.',
        'O presente gratuito e o cupom são benefícios separados, com links e prazos próprios. Confira o curso, o desconto, o prazo de compra e o tempo de acesso no cartão do cupom. O fim do prazo para resgatar não reduz os dias de acesso de quem já recebeu o presente.',
        'Cada campanha informa se há comissão, os valores por plano e o prazo para a primeira assinatura paga. O presente gratuito e a compra de um curso avulso com cupom não geram, por si só, comissão de assinatura.',
      ],
    },
    {
      pergunta: 'Quem recebe precisa assinar alguma coisa?',
      paragrafos: [
        'Não. Quem recebe ganha 7 dias do Cadê Todo Mundo e do Mural do seu público, contados do cadastro, sem cartão e sem assinatura automática. Depois, o link do jogo publicado continua funcionando enquanto a publicação estiver disponível.',
        'Explique isso no convite e lembre que o curso pede um computador com mouse e teclado. Os outros cursos, a criação livre e a opção de fazer a própria versão de um jogo do Mural fazem parte da Comunidade dos Criadores, Kids ou adulta, que a pessoa pode escolher contratar depois.',
      ],
    },
    {
      pergunta: 'Quando uma indicação gera bônus?',
      paragrafos: [
        'Quando alguém que entrou por um dos seus links, por presente ou por indicação, assina a Comunidade dos Criadores em até 45 dias. O bônus aguarda o período de garantia e a conferência da compra antes de ser liberado.',
        'O valor vigente aparece no seu painel. Depois da liberação, a equipe faz o pagamento manualmente pela chave Pix cadastrada. Só o cadastro gratuito não gera bônus, autoindicação não conta e uma renovação da mesma pessoa ou família não gera outro bônus. Um estorno na garantia cancela o bônus pendente.',
      ],
    },
    {
      pergunta: 'O que eu consigo acompanhar sobre quem convidei?',
      paragrafos: [
        'O seu painel mostra quantas pessoas entraram pelos seus links, quantos convites você pediu para enviar por e-mail e a situação dos seus bônus.',
        'Você não recebe o nome nem o progresso de quem recebeu. No Kids, o acompanhamento da criança continua com o responsável daquela família. Se quiser saber como foi a experiência, pode conversar com a pessoa, sem acesso aos dados privados da conta.',
      ],
    },
    {
      pergunta: 'E se a pessoa já recebeu esse presente por outro link?',
      paragrafos: [
        'Cada e-mail resgata um presente Kids e um presente adulto, considerando convites pessoais e campanhas. Trocar de link não dá novos 7 dias nem muda a origem do cadastro já aceito.',
        'Se ela já tem conta, mas ainda não recebeu o presente daquele público, pode usar o mesmo e-mail para resgatar pelo seu link. O curso entra na conta que já existe, sem outro cadastro.',
      ],
    },
  ],
}
