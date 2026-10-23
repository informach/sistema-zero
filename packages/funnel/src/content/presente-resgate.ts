// Copy do formulário de resgate do presente (`BolsaResgate`), um conjunto por público (Canvas
// "Presente Kids e adulto · proposta", quadros RecebimentoKids, RecebimentoAdulto e Estados de
// 20/10/2026). No Kids quem preenche é o RESPONSÁVEL (o perfil da criança nasce depois, na
// plataforma); no adulto, a própria pessoa, que confirma ter 18 anos ou mais. Módulo client-safe:
// a ilha o importa, então nada de env aqui (as URLs dos apps chegam por prop).
// `{{nome}}` = quem deu o presente, `{{email}}` = o e-mail do cadastro, `{{data}}` = o vencimento.

import type { GiftAudience } from '@sistemazero/core/referrals'

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
        ' (mãe, pai ou tutor). O perfil da criança, com o nome e, se quiser, a data de nascimento, você cria depois, já dentro da plataforma.',
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
    botao: 'Liberar o curso para minha família',
    botaoRetomar: 'Retomar meu cadastro',
    enviando: 'Conferindo seu acesso…',
    rodape:
      'Presente de {{nome}}: o curso Cadê Todo Mundo e o Mural Kids por 7 dias, sem custo e sem cartão.',
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
      muralTrial:
        'O Mural Kids também está liberado até a mesma data: seu filho pode publicar o jogo do curso, comentar e reagir. A aula 2 ensina como publicar, e o link do jogo publicado continua funcionando enquanto a publicação estiver disponível.',
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
      muralTrial:
        'O Mural adulto também está liberado até a mesma data: você pode publicar o jogo do curso, comentar e reagir. O link do jogo publicado continua funcionando enquanto a publicação estiver disponível.',
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
