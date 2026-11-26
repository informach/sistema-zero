// Copy do formulário de resgate do presente (`BolsaResgate`), um conjunto por público (Canvas
// "Presente Kids e adulto · proposta", quadros RecebimentoKids, RecebimentoAdulto e Estados de
// 20/10/2026). No Kids quem preenche é o RESPONSÁVEL (o perfil da criança nasce depois, na
// plataforma); no adulto, a própria pessoa, que confirma ter 18 anos ou mais. Módulo client-safe:
// a ilha o importa, então nada de env aqui (as URLs dos apps chegam por prop).
// `{{nome}}` = quem deu o presente, `{{email}}` = o e-mail do cadastro, `{{data}}` = o vencimento.

import {
  type GiftAudience,
  giftDurationLabel,
  type ReferralGiftOfferView,
} from '@sistemazero/core/referrals'

/** Qual texto o formulário usa: o do Cadê, o do curso para pais, o do guia para pais ou outro curso. */
export type VarianteResgate = 'cade' | 'pais' | 'guia' | 'curso'

/** A continuidade adulta: para onde vai quem já resgatou e quer seguir. */
export const CONTINUAR_ADULTO_PATH = '/pro/comunidade-dos-criadores/oferta/continuar'

export interface ResgateCopy {
  /** Aviso no topo do formulário; só o Kids tem (os dados são do responsável). */
  aviso: { destaque: string; texto: string } | null
  campos: {
    nome: { rotulo: string; placeholder: string; erro: string }
    email: { rotulo: string; placeholder: string; erro: string }
    telefone: { rotulo: string; opcional: string; placeholder: string }
  }
  botao: string
  botaoRetomar: string
  enviando: string
  rodape: string
  rodapeCampanha: string
  aceite: { antes: string; termos: string; meio: string; privacidade: string; depois: string }
  termosHref: string
  concluido: {
    selo: string
    titulo: string
    conta: string
    ate: string
    emailAceito: string
    emailIncerto: string
    proximo: string
    muralTrial: string
    muralVisitante: string
    entrar: string
    senha: string
    nota: string
  }
  processando: { titulo: string; texto: string; botao: string }
  jaResgatado: {
    titulo: string
    texto: string
    links: { label: string; destino: 'login' | 'senha' | 'continuar' }[]
  }
  erros: {
    expirado: string
    campanha: string
    naoEncontrado: string
    preparando: string
    falhou: string
    limite: string
    generico: string
    rede: string
  }
  linksAposErro: { label: string; destino: 'login' | 'senha' | 'continuar' }[]
}

const ERROS_COMUNS = {
  naoEncontrado: 'Este link de presente não está mais ativo.',
  preparando: 'O cadastro por este link ainda não abriu. Guarde o seu link e volte em alguns dias.',
  falhou:
    'Não conseguimos concluir o resgate para esse e-mail. Escreva para contato@sistemazero.com.br com o e-mail usado e este link, para a equipe verificar.',
  limite: 'O limite de tentativas foi atingido. Aguarde alguns minutos antes de tentar de novo.',
  generico: 'Não foi possível concluir agora. Tente de novo em instantes.',
  rede: 'Não foi possível concluir agora. Confira a conexão e tente de novo.',
}

/**
 * A frase do Mural na confirmação do resgate (`muralAccess: 'trial'`). "Até a mesma data" só
 * quando o presente tem prazo; a aula 2 só no Cadê Kids, o curso que ensina a publicar nela.
 */
function muralTrialTexto(
  audience: GiftAudience,
  { prazo, aulaDoCade }: { prazo: boolean; aulaDoCade: boolean },
): string {
  const liberado = `O Mural ${audience === 'adult' ? 'adulto' : 'Kids'} também está liberado${prazo ? ' até a mesma data' : ''}`
  const quem = audience === 'adult' ? 'você pode' : 'seu filho pode'
  const link =
    'link do jogo publicado continua funcionando enquanto a publicação estiver disponível.'
  return `${liberado}: ${quem} publicar o jogo do curso, comentar e reagir. ${
    aulaDoCade ? `A aula 2 ensina como publicar, e o ${link}` : `O ${link}`
  }`
}

const ACEITE = {
  termos: 'Termos de Uso',
  meio: ' e a ',
  privacidade: 'Política de Privacidade',
  depois: '.',
}

export const RESGATE_COPY: Record<GiftAudience, ResgateCopy> = {
  kids: {
    aviso: {
      destaque: 'Estes dados são do responsável',
      texto:
        ' (mãe, pai ou tutor). O perfil da criança, com o nome e a data de nascimento, você cria depois, já dentro da plataforma.',
    },
    campos: {
      nome: {
        rotulo: 'Nome do responsável',
        placeholder: 'Nome completo do responsável',
        erro: 'Informe o nome do responsável, com até 120 caracteres.',
      },
      email: {
        rotulo: 'E-mail do responsável',
        placeholder: 'voce@email.com',
        erro: 'Informe um e-mail válido.',
      },
      telefone: { rotulo: 'Telefone', opcional: '(opcional)', placeholder: '(11) 99999-9999' },
    },
    botao: 'Liberar o presente para minha família',
    botaoRetomar: 'Retomar meu cadastro',
    enviando: 'Conferindo seu acesso…',
    rodape:
      'Presente de {{nome}}: o curso Cadê Todo Mundo e o Mural Kids por 7 dias, sem custo e sem cartão.',
    rodapeCampanha:
      '{{nome}}: o curso Cadê Todo Mundo e o Mural Kids por 7 dias, sem custo e sem cartão.',
    aceite: {
      antes: 'Ao continuar, você confirma que é o responsável pela criança e aceita os ',
      ...ACEITE,
    },
    termosHref: '/kids/comunidade-dos-criadores/termos',
    concluido: {
      selo: 'Cadastro concluído',
      titulo: 'O presente está liberado para a sua família',
      conta: 'O acesso ficou na conta {{email}}',
      ate: ', até {{data}} (Brasília).',
      emailAceito:
        'O link para entrar está a caminho do seu e-mail. Confira a caixa de entrada e o spam; pode levar alguns minutos.',
      emailIncerto:
        'O acesso está liberado, mas não conseguimos confirmar o envio do e-mail. Entre com a sua senha ou use Criar ou recuperar a senha com o e-mail acima.',
      proximo: 'No primeiro acesso, crie o perfil do seu filho e abra o curso num computador.',
      muralTrial: muralTrialTexto('kids', { prazo: true, aulaDoCade: true }),
      muralVisitante:
        'O seu resgate inclui a visita ao Mural para ver e jogar enquanto a conta existir. Essa modalidade não libera publicar, comentar ou reagir.',
      entrar: 'Entrar na plataforma',
      senha: 'Criar ou recuperar a senha',
      nota: 'O prazo conta do cadastro e não reinicia ao trocar a senha. Este presente não gera cobrança.',
    },
    processando: {
      titulo: 'Quase lá…',
      texto: 'Estamos finalizando o seu resgate. Aguarde alguns segundos e toque no botão abaixo.',
      botao: 'Concluir resgate',
    },
    jaResgatado: {
      titulo: 'Este e-mail já recebeu um presente Kids',
      texto:
        'Cada e-mail resgata um presente Kids. Se o seu filho já começou, entre com esse e-mail e ele continua no mesmo perfil.',
      links: [
        { label: 'Entrar na plataforma', destino: 'login' },
        { label: 'Recuperar a senha', destino: 'senha' },
      ],
    },
    erros: {
      expirado:
        'Os 7 dias contados do seu cadastro já terminaram. Reenviar o formulário ou recuperar a senha não reinicia esse prazo. Você pode entrar na conta para conferir o que continua disponível.',
      campanha:
        'Esta campanha não está aceitando novos cadastros agora. Se você já concluiu o cadastro, entre na plataforma com o mesmo e-mail. O seu prazo continua o informado no resgate.',
      ...ERROS_COMUNS,
    },
    linksAposErro: [
      { label: 'Entrar na plataforma', destino: 'login' },
      { label: 'Recuperar a senha', destino: 'senha' },
    ],
  },
  adult: {
    aviso: null,
    campos: {
      nome: {
        rotulo: 'Seu nome',
        placeholder: 'Seu nome completo',
        erro: 'Informe o seu nome, com até 120 caracteres.',
      },
      email: {
        rotulo: 'Seu e-mail',
        placeholder: 'voce@email.com',
        erro: 'Informe um e-mail válido.',
      },
      telefone: { rotulo: 'Telefone', opcional: '(opcional)', placeholder: '(11) 99999-9999' },
    },
    botao: 'Liberar o meu presente',
    botaoRetomar: 'Retomar meu cadastro',
    enviando: 'Conferindo seu acesso…',
    rodape:
      'Presente de {{nome}}: o curso Cadê Todo Mundo, na versão adulta, e o Mural adulto por 7 dias, sem custo e sem cartão.',
    rodapeCampanha:
      '{{nome}}: o curso Cadê Todo Mundo, na versão adulta, e o Mural adulto por 7 dias, sem custo e sem cartão.',
    aceite: {
      antes: 'Ao continuar, você confirma que tem 18 anos ou mais e aceita os ',
      ...ACEITE,
    },
    termosHref: '/pro/comunidade-dos-criadores/termos',
    concluido: {
      selo: 'PRESENTE LIBERADO',
      titulo: 'Está tudo pronto para o seu primeiro jogo',
      conta: 'O acesso ficou na conta {{email}}',
      ate: ', até {{data}} (Brasília).',
      emailAceito:
        'O link para entrar está a caminho do seu e-mail. Confira a caixa de entrada e o spam; pode levar alguns minutos.',
      emailIncerto:
        'O acesso está liberado, mas não conseguimos confirmar o envio do e-mail. Entre com a sua senha ou use Criar ou recuperar a senha com o e-mail acima.',
      proximo: 'Abra o curso no navegador do computador.',
      muralTrial: muralTrialTexto('adult', { prazo: true, aulaDoCade: false }),
      muralVisitante:
        'O seu resgate inclui a visita ao Mural para ver e jogar enquanto a conta existir. Essa modalidade não libera publicar, comentar ou reagir.',
      entrar: 'Entrar na Comunidade',
      senha: 'Criar ou recuperar a senha',
      nota: 'O prazo conta do cadastro e não reinicia ao trocar a senha. Este presente não gera cobrança.',
    },
    processando: {
      titulo: 'Quase lá…',
      texto: 'Estamos finalizando o seu resgate. Aguarde alguns segundos e toque no botão abaixo.',
      botao: 'Concluir resgate',
    },
    jaResgatado: {
      titulo: 'Este e-mail já recebeu um presente adulto',
      texto:
        'Entre com esse e-mail e continue de onde parou. Se os 7 dias já terminaram, os seus projetos estão guardados na conta.',
      links: [
        { label: 'Entrar na Comunidade', destino: 'login' },
        { label: 'Ver como continuar', destino: 'continuar' },
      ],
    },
    erros: {
      expirado:
        'Os 7 dias contados do seu cadastro já terminaram. Reenviar o formulário ou recuperar a senha não reinicia esse prazo. Os seus projetos continuam guardados na conta.',
      campanha:
        'Esta campanha não está aceitando novos cadastros agora. Se você já concluiu o cadastro, entre na Comunidade com o mesmo e-mail. O seu prazo continua o informado no resgate.',
      ...ERROS_COMUNS,
    },
    linksAposErro: [
      { label: 'Entrar na Comunidade', destino: 'login' },
      { label: 'Ver como continuar', destino: 'continuar' },
    ],
  },
}

/** Os destinos dos links do formulário, montados a partir da URL do app do público. */
export function resgateHref(
  destino: 'login' | 'senha' | 'continuar',
  communityUrl: string,
): string {
  if (destino === 'continuar') return CONTINUAR_ADULTO_PATH
  return `${communityUrl}${destino === 'login' ? '/login' : '/esqueci-senha'}`
}

/** "27/10/2026, às 14h" (ou "às 14h30"), no fuso de Brasília. */
export function dataBrasilia(iso: string, comHora = true): string {
  const instante = new Date(iso)
  const dia = instante.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })
  if (!comHora) return dia
  const [hora, minuto] = instante
    .toLocaleTimeString('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    })
    .split(':')
  return `${dia}, às ${Number(hora)}h${minuto === '00' ? '' : minuto}`
}

/** O nome do curso do presente: o título publicado ou, na falta dele, o nome da oferta. */
export const cursoDoPresente = (gift: Pick<ReferralGiftOfferView, 'courseTitle' | 'offerTitle'>) =>
  gift.courseTitle ?? gift.offerTitle

/**
 * Os marcadores do prazo no texto editorial do Cadê (`presenteKids`/`presenteAdulto`): o prazo em
 * algarismo ("7 dias", "7 DIAS") e por extenso ("sete dias", "Sete dias"). O texto aprovado fala
 * dos sete dias por extenso; com outro prazo, o extenso vira algarismo ("14 dias").
 */
export interface PrazoDoCade {
  dias: string
  diasCaixaAlta: string
  extenso: string
  extensoInicial: string
}
export function prazoDoCade(dias: number): PrazoDoCade {
  const rotulo = giftDurationLabel(dias)
  const extenso = dias === 7 ? 'sete dias' : rotulo
  return {
    dias: rotulo,
    diasCaixaAlta: rotulo.toLocaleUpperCase('pt-BR'),
    extenso,
    extensoInicial: `${extenso.charAt(0).toLocaleUpperCase('pt-BR')}${extenso.slice(1)}`,
  }
}

/**
 * O prazo de uma oferta de VENDA com prazo fixo (25/11/2026: o Cadê vendido tem 1 ano), nos
 * mesmos marcadores do `prazoDoCade`. Em meses: `dias` diz "1 ano" (ou "N meses") e `extenso`
 * diz "12 meses" (ou "N meses"), para as frases com artigo ("durante os 12 meses") seguirem
 * corretas. Em dias, é o `prazoDoCade`.
 */
export function prazoDaOferta(
  access: { durationUnit: 'days' | 'months' | null; durationValue: number | null } | null,
  padraoDias = 7,
): PrazoDoCade {
  if (access?.durationUnit === 'months' && access.durationValue) {
    const meses = access.durationValue
    // As frases com artigo pedem plural ("durante os 30 dias"): 1 mês vira 30 dias nelas.
    const extenso = meses === 1 ? '30 dias' : `${meses} meses`
    const rotulo = meses === 12 ? '1 ano' : meses === 1 ? '1 mês' : extenso
    return {
      dias: rotulo,
      diasCaixaAlta: rotulo.toLocaleUpperCase('pt-BR'),
      extenso,
      extensoInicial: extenso,
    }
  }
  return prazoDoCade(
    access?.durationUnit === 'days' && access.durationValue ? access.durationValue : padraoDias,
  )
}

/** Curso para pais: a página do curso na área dos pais do app Kids. */
export function cursoParaPaisHref(communityUrl: string, courseSlug: string): string {
  return `${communityUrl}/pais/cursos/${encodeURIComponent(courseSlug)}`
}

/**
 * A copy do formulário com o que a oferta do presente entrega (15/11/2026). Sem `gift` (leitura
 * antiga), é a `RESGATE_COPY` de sempre, a do Cadê Todo Mundo. Com `gift`:
 * - o Cadê mantém a copy dele, só com o prazo e o Mural da oferta;
 * - curso para pais (`learner: 'parents'`, só no Kids: a área dos pais é do app Kids): os dados
 *   são do pai ou da mãe, sem perfil do filho e sem Mural, e o próximo passo é abrir o curso em
 *   Cursos para pais; no adulto a variante `pais` vale como `curso`;
 * - guia (`/kids/vilao-em-aliado`, 21/11/2026): o curso para pais apresentado como "guia
 *   gratuito para pais"; é a variante `pais` com "guia" no lugar de "curso", sem chamar o guia de
 *   presente (nessa página, presente é a surpresa da última aula);
 * - outro curso: o nome e o prazo da oferta no lugar do Cadê.
 * A frase do Mural na confirmação só fala da "mesma data" com prazo, e da aula 2 no Cadê Kids.
 */
export function resgateCopy(
  audience: GiftAudience,
  gift?: ReferralGiftOfferView,
  variante: VarianteResgate = 'cade',
): ResgateCopy {
  const base = RESGATE_COPY[audience]
  if (!gift) return base
  const adulto = audience === 'adult'
  const dias = gift.accessDays === null ? null : giftDurationLabel(gift.accessDays)
  const curso =
    variante === 'cade'
      ? adulto
        ? 'o curso Cadê Todo Mundo, na versão adulta,'
        : 'o curso Cadê Todo Mundo'
      : `o curso ${cursoDoPresente(gift)}`
  const mural = gift.includesMural ? (adulto ? ' e o Mural adulto' : ' e o Mural Kids') : ''
  const oQue = `${curso}${mural}`
  const rodape = dias
    ? `${oQue} por ${dias}, sem custo e sem cartão.`
    : `${oQue.replace(/,$/, '')}, sem prazo, sem custo e sem cartão.`
  const prazoTerminou = dias
    ? `Os ${dias} contados do seu cadastro já terminaram.`
    : 'O prazo do seu cadastro já terminou.'
  const copy: ResgateCopy = {
    ...base,
    rodape: `Presente de {{nome}}: ${rodape}`,
    rodapeCampanha: `{{nome}}: ${rodape}`,
    erros: {
      ...base.erros,
      expirado: base.erros.expirado.replace(
        'Os 7 dias contados do seu cadastro já terminaram.',
        prazoTerminou,
      ),
    },
    jaResgatado: {
      ...base.jaResgatado,
      texto: base.jaResgatado.texto.replace(
        'Se os 7 dias já terminaram',
        dias ? `Se os ${dias} já terminaram` : 'Se o prazo já terminou',
      ),
    },
    concluido: {
      ...base.concluido,
      nota: dias ? base.concluido.nota : 'Este presente não tem prazo e não gera cobrança.',
      muralTrial: muralTrialTexto(audience, {
        prazo: dias !== null,
        aulaDoCade: variante === 'cade' && !adulto,
      }),
    },
  }
  if ((variante !== 'pais' && variante !== 'guia') || adulto) return copy
  const pais: ResgateCopy = {
    ...copy,
    aviso: {
      destaque: 'Estes dados são seus',
      texto:
        ' (mãe, pai ou tutor). O curso fica na área dos pais da sua conta, sem perfil de criança.',
    },
    campos: {
      ...copy.campos,
      nome: {
        ...copy.campos.nome,
        rotulo: 'Seu nome',
        placeholder: 'Seu nome completo',
        erro: 'Informe o seu nome, com até 120 caracteres.',
      },
      email: { ...copy.campos.email, rotulo: 'Seu e-mail' },
    },
    botao: 'Liberar o meu curso',
    aceite: {
      ...copy.aceite,
      antes: 'Ao continuar, você confirma que tem 18 anos ou mais e aceita os ',
    },
    concluido: {
      ...copy.concluido,
      titulo: 'O seu curso está liberado',
      proximo:
        'Entre na área dos pais e abra o curso em Cursos para pais. Se a conta é nova, crie a senha primeiro pelo link do e-mail.',
      entrar: 'Abrir o curso',
    },
    jaResgatado: {
      ...copy.jaResgatado,
      texto:
        'Este e-mail já recebeu este curso. Entre com ele e abra o curso em Cursos para pais, na área dos pais.',
    },
  }
  if (variante !== 'guia') return pais
  const fica = `O guia fica na sua conta do Sistema Zero Kids${dias ? ` por ${dias}` : ', sem prazo'}.`
  return {
    ...pais,
    aviso: {
      destaque: 'Estes dados são seus',
      texto:
        ' (mãe, pai ou responsável). Para assistir, você não precisa criar o perfil do seu filho.',
    },
    botao: 'Liberar o meu guia',
    rodape: fica,
    rodapeCampanha: fica,
    concluido: {
      ...pais.concluido,
      titulo: 'O seu guia está liberado',
      proximo:
        'Entre na área dos pais e abra o guia em Cursos para pais. Se a conta é nova, crie a senha primeiro pelo link do e-mail.',
      entrar: 'Abrir o guia',
      nota: dias
        ? 'O prazo conta do cadastro e não reinicia ao trocar a senha. O guia não gera cobrança.'
        : 'O guia fica na sua conta sem prazo e não gera cobrança.',
    },
    jaResgatado: {
      ...pais.jaResgatado,
      titulo: 'Este e-mail já tem o guia',
      texto: 'Entre com ele e abra o guia em Cursos para pais, na área dos pais.',
    },
  }
}
