// Copy da página de recebimento do presente ADULTO (`/bolsa/<codigo>` com o público `adult`), do
// Canvas "Presente Kids e adulto · proposta" (quadro RecebimentoAdulto, aprovado em 20/10/2026). A
// linguagem é a arcade da oferta adulta (`.cda`, tema `theme-arcade`); `PresenteAdultoOferta.astro`
// renderiza todo texto visível a partir daqui. O que a página adulta já diz (marca do topo, foto dos
// fundadores, prévia do Mural, links legais) vem de `PAGINA_ADULTO` por referência: uma fonte só.
//
// Decisões da dona (20/10/2026): as telas do curso são as capturas da versão Kids, com a legenda
// honesta abaixo; o Mural adulto é a prévia com dados de teste; o link do jogo publicado continua
// depois dos 7 dias, como no Kids. `{{nome}}` é quem deu o presente e `{{data}}` uma data de Brasília.

import { type CorAdulto, PAGINA_ADULTO } from '../funnels/comunidade-adulto/oferta/pagina'
import type { EstadosPresente, ImagemPresente } from './presente'

const IMG_KIDS = '/img/comunidade-dos-criadores'
const LEGENDA_KIDS = 'Tela da versão Kids do curso. Na área adulta, a aparência é outra.'

export const PRESENTE_ADULTO = {
  seoTitle: 'Seu primeiro jogo de presente | Sistema Zero',
  description:
    'Em 7 dias, o seu primeiro jogo funcionando no navegador, com o Cadê Todo Mundo na versão adulta e o Mural adulto. Presente gratuito, sem cartão, para quem tem 18 anos ou mais.',
  previaTitle: 'Prévia da campanha | Sistema Zero',
  pular: PAGINA_ADULTO.pularParaConteudo,
  topo: {
    marcaAria: PAGINA_ADULTO.topo.marcaAria,
    logoAlt: PAGINA_ADULTO.topo.logoAlt,
    selo: PAGINA_ADULTO.topo.selo,
    navAria: PAGINA_ADULTO.topo.navAria,
    links: [
      { href: '#jogo', label: 'O que você faz' },
      { href: '#duvidas', label: 'Antes de começar' },
    ],
    cta: 'Quero o presente',
  },
  origem: {
    pessoal: 'PRESENTE DE {{nome}} · 7 DIAS',
    evento: '{{nome}} · PRESENTE DE 7 DIAS',
    campanha: '{{nome}} · PRESENTE DE 7 DIAS',
  },
  previa:
    'Prévia da campanha. Esta página demonstra a apresentação e não aceita cadastros. O link público da campanha respeita o estado e as datas configurados no Admin.',
  hero: {
    titulo: { antes: 'Em 7 dias, o seu primeiro jogo ', destaque: 'funcionando no navegador.' },
    texto:
      'O Cadê Todo Mundo começa com o jardim e os personagens prontos. Você monta as regras que fazem os esconderijos sumirem e o placar contar cada achado, testa e vê o jogo responder. O projeto é pequeno de propósito, para você chegar ao fim.',
    beneficios: [
      'Um jogo completo, com o vídeo da aula ao lado de onde você monta.',
      '7 dias de curso e de Mural adulto, contados do cadastro.',
      'Gratuito, sem cartão e sem assinatura automática.',
    ],
    cta: 'Quero o meu presente',
    link: 'Ver o que você vai fazer',
    requisitos: [
      { cor: 'verde', texto: 'Para quem tem 18 anos ou mais' },
      { cor: 'azul', texto: 'No navegador do computador, com mouse e teclado' },
      { cor: 'rosa', texto: 'O cadastro pode ser pelo celular' },
    ] satisfies { cor: CorAdulto; texto: string }[],
    prazoCampanha:
      'Novos cadastros até {{data}} (Brasília). Esse prazo é da campanha; o seu presente vale 7 dias a partir do cadastro.',
    tela: {
      rotulo: 'PLAYER 1 · CADÊ TODO MUNDO',
      imagem: {
        src: `${IMG_KIDS}/jogo-cade.webp`,
        alt: 'Cadê Todo Mundo: o jardim com o arbusto, a pedra, as flores e o contador de achados',
        width: 1264,
        height: 723,
      } satisfies ImagemPresente,
      start: 'PRESS START',
      legenda: 'O jogo do presente, na versão que você termina no curso.',
    },
  },
  jogo: {
    rotulo: 'O QUE VOCÊ FAZ',
    titulo: 'Você aprende a montar a regra que faz o jogo reagir ao toque',
    texto:
      'O começo é entender o que acontece quando alguém toca num esconderijo: ele precisa sumir para revelar quem estava ali. Você monta o comando com blocos, testa e observa. Se o esconderijo não sai do lugar, há algo para conferir. Quando funciona, o personagem aparece.',
    imagem: {
      src: `${IMG_KIDS}/tela-regra-ligada.webp`,
      alt: 'Fase do curso: o toque no arbusto revela o coelho, com a explicação ao lado',
      width: 1280,
      height: 800,
    } satisfies ImagemPresente,
    legenda: LEGENDA_KIDS,
    passos: [
      { cor: 'verde', rotulo: 'JOGAR', texto: 'A versão pronta, para ver onde você vai chegar' },
      { cor: 'amarelo', rotulo: 'MONTAR', texto: 'A reação ao toque que revela cada personagem' },
      { cor: 'rosa', rotulo: 'CONTAR', texto: 'O placar que registra cada achado' },
      { cor: 'azul', rotulo: 'PUBLICAR', texto: 'O jogo no Mural, com um link para mandar' },
    ] satisfies { cor: CorAdulto; rotulo: string; texto: string }[],
  },
  aula: {
    rotulo: 'COMO É A AULA',
    titulo: 'A explicação fica ao lado do que você está montando',
    paragrafos: [
      'Você assiste a um passo, pausa e faz no projeto. Cada parte é conferida antes da próxima, então você sabe se a regra funcionou antes de seguir.',
      'As aulas são gravadas, sem horário de turma. Nos 7 dias, você entra quando tiver um tempo livre, inclusive à noite, depois do trabalho.',
    ],
    imagem: {
      src: `${IMG_KIDS}/tela-aula-estudio.webp`,
      alt: 'Aula com o vídeo da explicação ao lado do Estúdio',
      width: 1280,
      height: 800,
    } satisfies ImagemPresente,
    legenda: LEGENDA_KIDS,
  },
  mural: {
    rotulo: 'MURAL ADULTO',
    titulo: 'Publique o jogo e mande o link para quem você quiser',
    paragrafos: [
      'Nos 7 dias, você publica no Mural adulto o jogo que fez no curso. O link abre o jogo no navegador, sem conta, para os amigos jogarem.',
      'No Mural, você também joga o que outros adultos estão criando, comenta e reage.',
    ],
    imagem: {
      ...PAGINA_ADULTO.comunidade.tela.imagem,
      alt: 'Mural adulto com os jogos publicados pela comunidade',
    },
    legenda: 'Prévia do Mural adulto com dados de teste.',
  },
  depois: {
    rotulo: 'DEPOIS DOS 7 DIAS',
    titulo:
      'O presente é o primeiro jogo. Na Comunidade dos Criadores, você segue criando outros, cada vez maiores.',
    paragrafos: [
      'Na assinatura, cada curso ensina uma parte nova, do primeiro jogo ao código. Com o Estúdio, o Pinta e o Molda, você faz as regras, os desenhos e o 3D. No Estúdio livre, você monta o jogo com a sua ideia, e mais adiante o Pensa ajuda a dividi-la em partes. O Mural, o Clube e o Desafio do mês juntam gente que também está criando. Os tutoriais e os Recados ajudam quando você trava. São 7 etapas, e cada uma libera blocos ou ferramentas novas no Estúdio.',
      'Os seus projetos ficam guardados na conta. Se quiser seguir, a assinatura começa quando você decidir.',
    ],
    imagem: {
      ...PAGINA_ADULTO.fundadores.imagem,
      alt: 'Helena e Júlio no computador, preparando uma aula',
    },
    legenda: 'Helena e Júlio, que criaram o Sistema Zero e preparam os projetos e as aulas.',
  },
  condicoes: {
    rotulo: 'O SEU PRESENTE',
    titulo: 'O que o presente inclui',
    cartoes: [
      {
        cor: 'azul',
        rotulo: 'CURSO · 7 DIAS',
        texto: 'O Cadê Todo Mundo inteiro, na versão adulta, contado a partir do cadastro.',
      },
      {
        cor: 'rosa',
        rotulo: 'MURAL · 7 DIAS',
        texto: 'Publicar o jogo do curso, comentar e reagir no Mural adulto.',
      },
      {
        cor: 'verde',
        rotulo: 'R$ 0 · SEM CARTÃO',
        texto: 'Quando os 7 dias terminam, nenhuma cobrança começa.',
      },
    ] satisfies { cor: CorAdulto; rotulo: string; texto: string }[],
    nota: 'Quando os 7 dias terminam, o curso e o Mural fecham para este presente e os projetos ficam guardados na conta. O link do jogo que você publicou continua funcionando enquanto a publicação estiver disponível. Outros cursos, o Estúdio livre e fazer a sua versão de jogos do Mural fazem parte da assinatura.',
    cta: 'Liberar o meu presente',
  },
  duvidas: {
    titulo: 'Antes de começar',
    itens: [
      {
        pergunta: 'Nunca programei. Consigo fazer?',
        resposta:
          'Consegue começar. O curso usa blocos e um projeto preparado, e cada parte é conferida antes da próxima.',
      },
      {
        pergunta: 'Funciona no celular?',
        resposta:
          'As aulas pedem o navegador de um computador, com mouse e teclado. O cadastro pode ser feito pelo celular.',
      },
      {
        pergunta: 'Quando os 7 dias começam?',
        resposta: 'No cadastro. Faça quando tiver alguns dias livres pela frente.',
      },
      {
        pergunta: 'Já tenho conta no Sistema Zero',
        resposta:
          'Use o mesmo e-mail. O presente entra na sua conta e você entra com a senha que já tem. Cada e-mail resgata um presente adulto.',
      },
      {
        pergunta: 'Vou pagar alguma coisa depois?',
        resposta:
          'Não. O presente não pede cartão e não cria assinatura. Continuar é uma escolha sua.',
      },
      {
        pergunta: 'E se eu travar numa parte?',
        resposta:
          'A explicação fica ao lado de cada passo. Se a dúvida continuar, você manda pelos Recados e a equipe responde.',
      },
    ],
  },
  resgatar: {
    rotulo: 'PLAYER 1 · SEUS DADOS',
    titulo: 'Libere o seu presente e escolha a hora de começar',
    texto:
      'O cadastro pede o seu nome e o seu e-mail; o telefone é opcional. O link de acesso chega no e-mail, e os 7 dias começam no cadastro.',
    previa:
      'O formulário aparece no link público quando a campanha estiver aberta e o curso disponível. Nesta prévia, nenhum acesso é criado.',
  },
  barra: { titulo: 'Presente de 7 dias', texto: 'Sem cartão', cta: 'Quero o presente' },
  estados: {
    preparing: {
      etiqueta: 'LOADING',
      titulo: 'O cadastro por este link ainda não abriu',
      texto:
        'Guarde esta página e volte em alguns dias. O presente vale 7 dias contados do cadastro, então nada se perde enquanto isso.',
    },
    scheduled: {
      etiqueta: 'LOADING',
      titulo: 'O cadastro por este link abre em {{data}}',
      texto:
        'Guarde esta página e volte a partir dessa data. O presente vale 7 dias contados do cadastro.',
    },
    paused: {
      etiqueta: 'JOGO PAUSADO',
      titulo: 'Os cadastros por este link estão pausados',
      texto:
        'Quem começou o cadastro antes pode retomar com o mesmo e-mail. Quem já recebeu o presente mantém o prazo informado no cadastro.',
    },
    ended: {
      etiqueta: 'GAME OVER PARA ESTE LINK',
      titulo: 'Os cadastros por este link terminaram em {{data}}',
      texto:
        'Quem começou o cadastro antes pode retomar com o mesmo e-mail. Quem recebeu o presente dentro do período mantém os 7 dias contados do cadastro.',
    },
    endedSemData: 'Os cadastros por este link terminaram',
    retomar: {
      botao: 'Já comecei o cadastro',
      texto:
        'Reenvie com o mesmo e-mail para retomar um cadastro aceito antes. Isso não abre um novo acesso nem reinicia o prazo.',
    },
    naoEncontrado: {
      etiqueta: '404',
      titulo: 'Este convite não está disponível',
      texto:
        'Confira se o link foi copiado por inteiro. Se alguém mandou o convite para você, peça o link de novo.',
    },
    foraDoAr: {
      etiqueta: 'TENTE DE NOVO',
      titulo: 'Não conseguimos abrir o seu convite agora',
      texto:
        'Recarregue a página em alguns instantes. Isso não cria um cadastro nem começa o prazo do curso.',
    },
    contato: 'Falar com a equipe',
  } satisfies EstadosPresente,
  legal: PAGINA_ADULTO.fechamento.legal,
}
