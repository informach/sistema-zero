import { CONTINUIDADE_FAQ } from './continuidade-faq'
import { FAQ, FAQ_EXTRA, FOUNDER_SEM_RELATO, SHARED_COPY } from './shared'
import type { ComunidadePage } from './types'
import { FAQ_VISUALS } from './visuals'

// Proposta aprovada em 16/10/2026: docs/marketing/kids/comunidade-dos-criadores/copy/
// proposta-melhoria-2026-10-16/e-continuar.md. Espelho editorial em copy/pagina-e-continuidade.md.

const FAQ_GROUPS: ComunidadePage['faqGroups'] = [
  {
    title: 'Para continuar',
    questions: [
      'continuidade',
      'conta-existente',
      'desafio',
      'cade-todo-mundo',
      'liberacao',
      'interesse',
      'idade-continuidade',
    ],
  },
  {
    title: 'Prazo, progresso e valor',
    questions: [
      'acesso-vencido',
      'curso-em-andamento',
      'inicio-assinatura',
      'valor-anterior',
      'visita-mural',
    ],
  },
  {
    title: 'Aula e ferramentas',
    questions: ['ajuda', 'ao-vivo', 'pais', 'desenho', 'catalogo', 'ia', 'creditos', 'avancado'],
  },
  {
    title: 'Família e conta',
    questions: ['irmaos', 'perfil', 'cancelamento', 'reembolso', 'atendimento'],
  },
]

// As telas das respostas próprias; as comuns vêm de `FAQ_VISUALS`.
const VISUAIS_PROPRIOS: Record<string, readonly string[]> = {
  continuidade: ['catalogo', 'integracao'],
  'conta-existente': ['conta'],
  'cade-todo-mundo': ['contador', 'jornada'],
  'acesso-vencido': ['conta'],
  'curso-em-andamento': ['aula'],
  'inicio-assinatura': ['compras'],
  'valor-anterior': [],
  'visita-mural': ['mural'],
  'idade-continuidade': ['aula'],
  // A resposta da E fala do Estúdio e do Pinta livres, e não do jogo pronto da primeira aula.
  interesse: ['integracao'],
}

export const PAGE_E: ComunidadePage = {
  id: 'continuar',
  label: 'Continuidade',
  seoTitle: 'Continue criando jogos na Comunidade dos Criadores | Sistema Zero',
  description:
    'Seu filho continua no mesmo perfil, com tudo o que já fez. Veja o que a assinatura acrescenta, quando ela começa e qual é o próximo passo dele na Jornada.',
  emphasis: 'para o jogo que ele inventa',
  heroVisual: 'estudio',
  heroChip: 'Continuar no mesmo perfil',
  hero: {
    title: 'Do jogo que seu filho seguiu passo a passo para o jogo que ele inventa',
    description:
      'Tudo o que ele fez no Cadê Todo Mundo, no Desafio ou no curso que vocês receberam continua no mesmo perfil. Na Comunidade dos Criadores, ele segue para os outros cursos, e depois de concluir A Chave do Farol e publicar o jogo, o Estúdio e o Pinta ficam livres para as ideias dele: desenhar um personagem, levar para o jogo e decidir o que ele faz.',
    benefits: [
      'Os cursos publicados e os próximos lançamentos, sem comprar um por um.',
      'Estúdio e Pinta livres depois de A Chave do Farol, para a segunda versão ter a cara dele.',
      'Até dois perfis de criança, cada um com os próprios jogos e o próprio progresso.',
    ],
    requirements:
      'Para crianças de 9 a 14 anos, no navegador do computador, com internet, mouse e teclado. Assinem com o mesmo e-mail do responsável para continuar no perfil de sempre.',
    primary: {
      label: 'Escolher um plano para continuar',
      href: '#planos',
    },
    secondary: {
      label: 'Ver o próximo passo do meu filho',
      href: '#proximo-passo',
    },
  },
  sections: [
    {
      id: 'ideia',
      title: 'O fim do primeiro jogo é o momento em que aparece a ideia do segundo',
      eyebrow: 'Uma ideia em aberto',
      layout: 'story',
      visuals: ['regra'],
      groups: [
        {
          title: null,
          paragraphs: [
            'Terminar um jogo muda o jeito como a criança olha para ele. Com o jogo na mão de outra pessoa, aparecem as ideias da segunda versão: trocar o personagem, deixar a fase mais difícil, colocar um inimigo que antes ele não sabia programar.',
            'Só que essa vontade precisa de um próximo passo. Quando ele não sabe o que fazer depois, o jogo fica do jeito que estava e a ideia esfria. Por isso, a seção abaixo parte da situação em que seu filho está.',
            'Na segunda versão, ele usa o que já aprendeu (encontrar o comando, montar a regra, testar), com uma diferença: agora a ideia é dele. E você vai reconhecer o jogo antigo e perceber, na primeira partida, o que ele resolveu mudar.',
          ],
        },
      ],
      falas: ['AV02'],
      actions: [],
    },
    {
      id: 'proximo-passo',
      title:
        'Terminar, publicar ou criar a segunda versão: o próximo passo depende de onde ele parou',
      eyebrow: 'A partir de onde seu filho está',
      layout: 'cases',
      visuals: ['aula-estudio', 'contador', 'jornada', 'publicacao'],
      groups: [
        {
          title: null,
          paragraphs: [
            'A assinatura abre os recursos da Comunidade, e a Jornada mostra a ordem para usá-los. Encontre a situação do seu filho.',
          ],
        },
        {
          title: 'Se ainda está no primeiro projeto',
          paragraphs: [
            'Ele volta à atividade, revê o trecho da aula e continua a montagem do ponto em que parou, porque o trabalho está guardado no perfil. Se o curso de vocês ainda está no prazo, dá para terminar com esse acesso e decidir depois.',
          ],
        },
        {
          title: 'Se fez o Cadê Todo Mundo',
          paragraphs: [
            'O jogo de procurar personagens escondidos, com a contagem de achados, fica registrado no perfil como curso extra. Ele não abre o Estúdio livre; para isso, o próximo passo é A Chave do Farol, o curso de entrada da Jornada, e publicar o jogo dele.',
          ],
        },
        {
          title: 'Se já concluiu A Chave do Farol e publicou o jogo',
          paragraphs: [
            'Ele já é Construtor, e com a assinatura o Estúdio e o Pinta ficam livres. Pode desenhar um personagem no Pinta, levar para o Estúdio, montar a regra que faz ele andar e testar duas velocidades até escolher a melhor. Cada escolha dessa sequência é dele, e a seção abaixo mostra como desenho e programação se encontram.',
          ],
        },
        {
          title: 'Se terminou as aulas, mas não publicou',
          paragraphs: [
            'A Jornada separa concluir e publicar. Publicar o jogo é o passo que falta para chegar ao Construtor, e a Jornada mostra onde ele está.',
          ],
        },
      ],
      actions: [],
    },
    {
      id: 'acrescenta',
      title: 'Do curso que vocês receberam para todos os cursos da Comunidade',
      eyebrow: 'O que entra na assinatura',
      layout: 'story',
      visuals: ['catalogo'],
      groups: [
        {
          title: null,
          paragraphs: [
            'O curso que vocês receberam mostrou como a aula funciona e o que seu filho consegue fazer com ela. A assinatura amplia o acesso para o resto: os outros cursos, as ferramentas livres e o lugar de mostrar os jogos.',
            'Comprado sozinho, o Desafio do Primeiro Jogo dá 30 dias de acesso ao curso A Chave do Farol. Na assinatura entram esse e todos os outros cursos publicados, e os que vierem depois, e o que vocês já receberam fica como está: se o convite inclui visita permanente ao Mural, ela continua valendo com ou sem assinatura.',
          ],
          comparison: {
            headers: ['O que vocês já têm', 'O que a assinatura acrescenta'],
            rows: [
              [
                'As aulas do curso que veio no convite ou na compra',
                'Todos os cursos publicados, inclusive A Chave do Farol, e os que forem lançados durante o plano, sem compra separada',
              ],
              [
                'Os recursos previstos para aquelas aulas',
                'Estúdio e Pinta livres no posto Construtor; Pensa e a ajuda do Zappy no Inventor; Molda no Explorador de Mundos',
              ],
              [
                'A conta e o perfil da criança',
                'Clube, Mural, desafio do mês e até dois perfis de criança',
              ],
            ],
          },
        },
      ],
      actions: [],
    },
    {
      id: 'experiencia',
      title: 'No posto Construtor, o personagem que ele desenha entra no jogo que ele programa',
      eyebrow: 'Do desenho ao jogo',
      layout: 'story',
      visuals: ['integracao', 'mural'],
      groups: [
        {
          title: null,
          paragraphs: [
            'Imagine um personagem que recolhe estrelas. No Pinta, seu filho escolhe as cores e o tamanho. No Estúdio, traz essa arte para o projeto e monta a regra que faz o personagem andar. Uma mudança no desenho muda o que aparece no jogo, e uma mudança no bloco muda o que o personagem faz.',
            'Se o personagem some no fundo, ele volta ao desenho e troca a cor; se anda rápido demais, muda o valor e testa de novo. Quando aparece o aviso Guardado na sua conta, a versão fica salva para o dia seguinte.',
            'Depois ele publica no Mural e ganha um link e um cartão com código QR para mandar à família. É aí que você entra: abre o jogo, joga e pergunta por que ele mudou aquela regra. Até o Construtor, as aulas trazem personagens prontos, então saber desenhar nunca foi condição para continuar.',
          ],
        },
      ],
      actions: [],
    },
    {
      id: 'mesma-conta',
      title: 'Nada do que ele fez fica para trás quando vocês assinam',
      eyebrow: 'Mesma conta, mesmo perfil',
      layout: 'journey',
      visuals: ['molda'],
      groups: [
        {
          title: null,
          paragraphs: [
            'Assinem com o mesmo e-mail do responsável, e seu filho continua no perfil de sempre, com os jogos e o progresso que já tem. O que ele concluiu no Desafio continua concluído; ninguém refaz aula por causa da assinatura.',
            'A assinatura dá o acesso, e a Jornada decide a ordem: cada ferramenta abre quando ele chega ao posto dela. Os cursos novos entram na assinatura assim que saem, sem custo extra. No mapa da Jornada, ele vê o posto seguinte e a ferramenta que vem com ele, o que dá à próxima aula um motivo claro.',
          ],
        },
      ],
      actions: [],
    },
    {
      id: 'familias',
      title: 'Quem fez o primeiro jogo já pensa no próximo',
      eyebrow: 'O que contam sobre as aulas',
      layout: 'relatos',
      visuals: [],
      groups: [
        {
          title: null,
          paragraphs: ['Alunos e pais contam, com as palavras deles, como foram as aulas.'],
        },
      ],
      falas: ['AV04', 'N19', 'N7', 'N15'],
      actions: [],
    },
  ],
  faqTitle: 'Sobre os próximos passos do seu filho',
  faqGroups: FAQ_GROUPS,
  faqLinks: [
    {
      label: 'Planos',
      href: '#planos',
    },
    {
      label: 'Garantia',
      href: '#garantia',
    },
    {
      label: 'Cancelar a próxima renovação',
      href: '#duvida-cancelamento',
    },
    {
      label: 'Solicitar reembolso',
      href: '#duvida-reembolso',
    },
  ],
  offer: {
    title: 'Escolham o plano, e ele continua no mesmo perfil',
    paragraphs: [
      'Os dois planos abrem a mesma coisa: os cursos publicados e os próximos lançamentos, as ferramentas que a Jornada vai liberando, o Clube e o Mural, com até dois perfis de criança.',
      'Os cursos que vêm depois do que ele fez. Cada curso é um jogo guiado do começo ao fim, e os lançamentos entram no acesso assim que saem.',
      // A área dos pais já existe para quem tem conta: na E ela não entra como novidade da assinatura.
      ...SHARED_COPY.offer.paragraphs.slice(2, 5),
      ...SHARED_COPY.offer.paragraphs.slice(6),
    ],
    falas: ['N6'],
    monthly: SHARED_COPY.offer.monthly,
    annual: SHARED_COPY.offer.annual,
    period: {
      title: 'A assinatura começa quando o pagamento é aprovado',
      paragraphs: [
        'Se ainda restam dias do curso que vocês receberam, eles não se somam ao plano.',
      ],
    },
    guarantee: {
      title: 'Sete dias para ver como ele segue no próximo curso',
      paragraphs: [
        'Assinem e vejam, nos primeiros dias, como seu filho se sai no próximo curso: se ele se anima com o passo seguinte, se usa o que já aprendeu, se a atividade continua cabendo na rotina de vocês. Se em sete dias vocês acharem que não é para ele, devolvemos o valor.',
        ...SHARED_COPY.offer.guarantee.paragraphs.slice(1),
      ],
    },
    checkout:
      'Ao escolher o plano, use o mesmo e-mail do responsável que já está na conta, porque é ele que liga a assinatura ao perfil do seu filho. Antes de pagar, você confere o valor, o período e a renovação. Se ainda não tem conta, preencha os dados do responsável; o perfil da criança é criado depois, na plataforma.',
  },
  founder: FOUNDER_SEM_RELATO,
  closing: {
    id: 'convite',
    title:
      'Peça para ele contar o que mudaria no primeiro jogo, porque é por aí que o segundo começa',
    eyebrow: 'Para continuar',
    layout: 'band',
    visuals: [],
    groups: [
      {
        title: null,
        paragraphs: [
          'Pode ser uma cor diferente, um inimigo novo ou uma fase mais difícil, e seja qual for a resposta, agora ele tem onde tentar, no mesmo perfil e com tudo o que já fez.',
          'Escolham o plano e continuem do ponto em que ele parou. E se em sete dias vocês acharem que não é para ele, devolvemos o valor.',
        ],
      },
    ],
    actions: [
      {
        label: 'Escolher um plano para continuar',
        href: '#planos',
      },
    ],
  },
  faq: { ...FAQ, ...FAQ_EXTRA, ...CONTINUIDADE_FAQ },
  faqVisuals: Object.fromEntries(
    FAQ_GROUPS.flatMap((group) => group.questions).map((id) => [
      id,
      VISUAIS_PROPRIOS[id] ?? FAQ_VISUALS[id] ?? [],
    ]),
  ),
}
