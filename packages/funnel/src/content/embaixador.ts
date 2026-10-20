// Copy do painel do embaixador (`/embaixador/<token>`) e das dúvidas do programa, do Canvas
// "Presente Kids e adulto · proposta" (quadro Embaixador, aprovado em 20/10/2026): o embaixador
// escolhe para quem é o presente (uma família, no Kids, ou um adulto) e cada público tem o próprio
// link, a própria mensagem de WhatsApp e o próprio convite por e-mail. Módulo client-safe: as ilhas
// `EmbaixadorPainel` e `EmbaixadorBonus` o importam. O valor do bônus vem SEMPRE do serviço
// (`bonus.amountCents`), nunca daqui. `{{nome}}`, `{{link}}`, `{{email}}`, `{{data}}` e `{{n}}` são
// preenchidos na renderização.

import type { GiftAudience } from '@sistemazero/core/referrals'
import type { ImagemPresente } from './presente'

const IMG_KIDS = '/img/comunidade-dos-criadores'

export interface OpcaoDePublico {
  selo: string
  titulo: string
  texto: string
  imagem: ImagemPresente
}

export const PAINEL_EMBAIXADOR = {
  seoTitle: 'Seu painel de embaixador | Sistema Zero',
  description:
    'Escolha para quem é o presente, uma família ou um adulto, e compartilhe o seu link de 7 dias no Sistema Zero.',
  pular: 'Ir para o conteúdo',
  topo: {
    marcaAria: 'Sistema Zero, voltar ao topo',
    logoAlt: 'Sistema Zero',
    programa: 'Programa de embaixadores',
    navAria: 'Atalhos do painel',
    bonus: 'Bônus',
    inclui: 'O que o presente inclui',
    cta: 'Meus links',
  },
  aviso: {
    destaque: 'Guarde esta página só para você.',
    texto:
      ' Ela abre o seu painel e a sua chave Pix. Para presentear, use os links públicos abaixo.',
  },
  cabeca: {
    etiqueta: 'Seu espaço de embaixador',
    titulo: 'Olá, {{nome}}. Escolha para quem é o presente e mande o seu link.',
    /** Sem nome no cadastro: o título sem a saudação. */
    tituloSemNome: 'Escolha para quem é o presente e mande o seu link.',
    texto:
      'Você pode dar 7 dias no Sistema Zero, sem custo para quem recebe, a uma família com criança de 9 a 14 anos ou a um adulto que quer criar o próprio jogo. Cada um chega a uma página feita para ele.',
  },
  seletor: {
    legenda: 'Para quem é o presente',
    opcoes: {
      kids: {
        selo: 'Para uma família',
        titulo: 'Uma criança de 9 a 14 anos',
        texto:
          'O responsável faz o cadastro. A criança faz o Cadê Todo Mundo e publica o jogo no Mural Kids por 7 dias.',
        imagem: {
          src: `${IMG_KIDS}/tela-regra-ligada.webp`,
          alt: '',
          width: 1280,
          height: 800,
        },
      },
      adult: {
        selo: 'PARA UM ADULTO',
        titulo: 'Alguém de 18 anos ou mais',
        texto:
          'A própria pessoa faz o cadastro, o Cadê Todo Mundo na versão adulta e publica o jogo no Mural adulto por 7 dias.',
        imagem: { src: `${IMG_KIDS}/jogo-cade.webp`, alt: '', width: 1264, height: 723 },
      },
    } satisfies Record<GiftAudience, OpcaoDePublico>,
  },
  link: {
    titulo: {
      kids: 'Link do presente para uma família',
      adult: 'Link do presente para um adulto',
    } satisfies Record<GiftAudience, string>,
    chip: {
      kids: 'Kids · 9 a 14 anos',
      adult: 'Adulto · 18 anos ou mais',
    } satisfies Record<GiftAudience, string>,
    campo: 'Seu link público do presente',
    copiar: 'Copiar link',
    copiado: 'Link copiado',
    ver: 'Ver a página como quem recebe',
    indisponivel:
      'O link deste público ainda não está disponível. Volte a esta página em breve: ele aparece aqui, junto com a mensagem pronta.',
    mensagemRotulo: 'Mensagem pronta para o WhatsApp',
    mensagemAjuda: 'Ajuste o texto para a pessoa que você conhece.',
    whatsapp: 'Abrir meu WhatsApp com a mensagem',
    copiarMensagem: 'Copiar mensagem',
    mensagemCopiada: 'Mensagem copiada',
    nota: 'A mensagem sai do seu WhatsApp. O Sistema Zero não envia mensagens em seu nome.',
    manual: 'A cópia automática não funcionou. Selecione o texto abaixo e copie:',
    manualAria: 'Texto para copiar manualmente',
  },
  mensagens: {
    kids: 'Oi. Lembrei de vocês: no Sistema Zero, a criança faz um jogo de procurar personagens funcionar, com a explicação ao lado. Quero dar 7 dias de presente para vocês, sem custo e sem cartão. É para crianças de 9 a 14 anos, no computador. Você faz o cadastro por este link: {{link}}',
    adult:
      'Oi. Lembrei de você: no Sistema Zero dá para fazer o primeiro jogo no navegador, com o projeto preparado e a aula ao lado. Quero dar 7 dias de presente para você, sem custo e sem cartão. O cadastro é por este link: {{link}}',
  } satisfies Record<GiftAudience, string>,
  convite: {
    titulo: 'Ou mande o convite por e-mail',
    antes: 'O e-mail leva o presente ',
    depois: ', com o seu nome. Cada pessoa recebe o convite uma vez.',
    paraQuem: {
      kids: 'para uma família',
      adult: 'para um adulto',
    } satisfies Record<GiftAudience, string>,
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
    limite: 'Você atingiu o limite de convites de hoje. Amanhã você pode enviar outros.',
    falha: 'Não foi possível enviar agora. Tente de novo em instantes.',
    semLink: 'O convite por e-mail abre junto com o link deste público.',
  },
  resgates: {
    titulo: 'Presentes resgatados pelos seus links',
    convites: {
      um: '{{n}} convite por e-mail enviado',
      varios: '{{n}} convites por e-mail enviados',
    },
    nota: 'O painel conta os resgates, sem mostrar nomes nem dados de quem recebeu.',
  },
  bonus: {
    titulo: 'Um agradecimento quando o presente vira assinatura',
    antes:
      'Quando alguém que recebeu o presente pelo seu link assina a Comunidade dos Criadores, Kids ou adulta, você pode receber ',
    semValor: 'um bônus',
    depois:
      ' por essa indicação, depois da verificação da compra e dos 7 dias de garantia. A equipe faz o pagamento por Pix. O resgate gratuito, sozinho, não gera bônus.',
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
      'O bônus é um agradecimento único por indicação que virar assinatura. Não é salário nem renda garantida e não cria vínculo com a plataforma. Pagamos por Pix na chave acima, após a liberação e a conferência pela equipe. Autoindicação não gera bônus, e estorno dentro da garantia cancela o bônus pendente. Uma renovação da mesma pessoa ou família não gera outro bônus.',
  },
  paraQuem: {
    titulo: 'Para quem o presente faz sentido',
    texto:
      'Pense em uma pessoa e escolha o público dela. O link certo leva a uma página que fala com quem vai usar.',
    kids: {
      titulo: 'Uma família com criança de 9 a 14 anos',
      texto:
        'A criança que adora jogos e pergunta como eles são feitos. Ou a família que procura, para parte do tempo de computador, uma tarefa concreta que o filho consegue mostrar no fim.',
    },
    adult: {
      titulo: 'Um adulto que cresceu jogando',
      texto:
        'Alguém que sempre quis saber como um jogo funciona por dentro. Ou que já tentou começar sozinho, numa ferramenta grande demais, e parou no meio.',
    },
    passos: [
      'Você escolhe o público e manda o link com uma mensagem sua, contando por que lembrou da pessoa.',
      'A pessoa conhece a página e faz o cadastro com os próprios dados. No Kids, quem cadastra é o responsável.',
      'Os 7 dias começam no cadastro. Vale avisar que o curso pede um computador com mouse e teclado.',
    ],
  },
  inclui: {
    titulo: 'O que o presente inclui',
    colunas: { item: 'Item', kids: 'Para uma família', adult: 'Para um adulto' },
    linhas: [
      {
        item: 'O curso',
        kids: 'Cadê Todo Mundo, por 7 dias',
        adult: 'Cadê Todo Mundo na versão adulta, por 7 dias',
      },
      {
        item: 'O Mural',
        kids: 'Publicar o jogo do curso, comentar e reagir no Mural Kids, por 7 dias',
        adult: 'Publicar o jogo do curso, comentar e reagir no Mural adulto, por 7 dias',
      },
      {
        item: 'Depois dos 7 dias',
        kids: 'A conta continua vendo e jogando no Mural, e o link do jogo publicado segue enquanto a publicação estiver no ar',
        adult:
          'Os projetos ficam guardados na conta, e o link do jogo publicado segue enquanto a publicação estiver no ar',
      },
      {
        item: 'Fica para a assinatura',
        kids: 'Outros cursos, o Estúdio livre e as cópias de jogos',
        adult: 'Outros cursos, o Estúdio livre e as cópias de jogos',
      },
      {
        item: 'Custo',
        kids: 'Gratuito, sem cartão e sem assinatura automática',
        adult: 'Gratuito, sem cartão e sem assinatura automática',
      },
    ],
  },
  fechamento: {
    titulo: 'Um convite pessoal abre o primeiro passo',
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

/** As dúvidas do programa: no painel e na página pública `/kids/embaixadores`. */
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
        'Envie o link do presente, que tem /bolsa/ no endereço. No painel há um para uma família e outro para um adulto: escolha o público e copie o link dele. Quem recebe abre a página feita para o seu público e faz o próprio cadastro.',
        'O endereço que tem /embaixador/ é o seu acesso privado. Ele abre o seu painel e a sua chave Pix. Guarde-o para você. Se o compartilhar sem querer, avise a equipe para que ela troque esse acesso.',
      ],
    },
    {
      pergunta: 'Quem recebe precisa assinar alguma coisa?',
      paragrafos: [
        'Não. Quem recebe ganha 7 dias do Cadê Todo Mundo e do Mural do seu público, contados do cadastro, sem cartão e sem assinatura automática. Depois, o link do jogo publicado continua funcionando enquanto a publicação estiver disponível.',
        'Explique isso no convite e lembre que o curso pede um computador com mouse e teclado. Os outros cursos, a criação livre e as cópias de jogos fazem parte da Comunidade dos Criadores, Kids ou adulta, que a pessoa pode escolher contratar depois.',
      ],
    },
    {
      pergunta: 'Quando uma indicação gera bônus?',
      paragrafos: [
        'Primeiro, a pessoa precisa resgatar o presente pelo seu link, Kids ou adulto. Se depois fizer uma compra elegível da Comunidade dos Criadores, a plataforma registra a conversão. O bônus aguarda o período de garantia e a conferência da compra antes de ser liberado.',
        'O valor vigente aparece no seu painel. Depois da liberação, a equipe faz o pagamento manualmente pela chave Pix cadastrada. Só o cadastro gratuito não gera bônus, autoindicação não conta e uma renovação da mesma pessoa ou família não gera outro bônus. Um estorno na garantia cancela o bônus pendente.',
      ],
    },
    {
      pergunta: 'O que eu consigo acompanhar sobre quem convidei?',
      paragrafos: [
        'O seu painel mostra quantos presentes foram resgatados pelos seus links, quantos convites você pediu para enviar por e-mail e a situação dos seus bônus.',
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
