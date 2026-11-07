// Copy aprovada em 06/11/2026. Direção: docs/marketing/pro/posicionamento.md.
// Textos agrupados por seção, na ordem de leitura; preços preenchidos pelo catálogo.
import type { PaginaOfertaAdulta } from '../../comunidade-adulto/oferta/types'

export const PAGINA_DESAFIO_ADULTO = {
  seoTitle: 'Desafio do Primeiro Jogo para adultos | Sistema Zero',
  description:
    'Ganhe autonomia para criar com tecnologia. Construa A Chave do Farol com aulas guiadas, programação em blocos e 30 dias de acesso.',
  pularParaConteudo: 'Ir para o conteúdo',
  topo: {
    imagens: [
      {
        src: '/logo_dark.svg',
        alt: 'Sistema Zero',
        width: 515,
        height: 44,
      },
    ],
    rotulos: ['PRIMEIRO JOGO'],
    acoes: ['Como funciona', 'O projeto', 'Quero começar'],
  },
  hero: {
    titulo: {
      antes: 'Ganhe autonomia para ',
      destaque: 'criar com tecnologia',
      depois: ', começando pelo seu primeiro jogo.',
    },
    texto:
      'Você começa com um jogo e um caminho preparado. Com aulas guiadas e programação em blocos, aprende a entender as regras, testar suas escolhas e ver uma criação sua funcionar.',
    imagens: [
      {
        src: '/img/desafio-primeiro-jogo/farol-jogo-real.webp',
        alt: 'O jogo A Chave do Farol: personagem, chave e farol em uma ilha',
        width: 1440,
        height: 1080,
      },
    ],
    rotulos: [
      'DESAFIO DO PRIMEIRO JOGO · ADULTOS',
      'Um começo guiado para quem nunca programou.',
      '3 etapas para construir e entender A Chave do Farol.',
      'Vídeo e espaço para construir na mesma aula.',
      'A CHAVE DO FAROL',
      '1P',
      '30 DIAS DE ACESSO',
    ],
    acoes: ['Quero começar meu Desafio', 'Ver como esse começo acontece'],
    paragrafos: ['{{preco}} · pagamento único · 30 dias de acesso · 7 dias de garantia'],
    legendas: ['O projeto do Desafio: você constrói as regras que fazem essa aventura funcionar.'],
  },
  comeco: {
    titulo: 'A vontade de criar ganha um caminho quando o primeiro passo fica claro.',
    imagens: [
      {
        src: '/img/desafio-primeiro-jogo/farol-experiencia-real.webp',
        alt: 'Experiência da Chave do Farol em que a posição da chave muda com os valores de x e y',
        width: 2061,
        height: 1290,
      },
    ],
    rotulos: ['DA VONTADE AO PRIMEIRO PASSO'],
    paragrafos: [
      'Talvez você queira dar vida a um personagem, mudar uma regra de um jogo ou descobrir como criar no computador. No começo, escolher uma ferramenta, aprender os comandos e decidir o que construir pode parecer coisa demais ao mesmo tempo.',
      'Por isso, o Desafio começa com um projeto definido: mover o personagem, encontrar a chave e acender o farol. O cenário e os personagens vêm preparados. Você monta a programação que faz essa aventura acontecer, com explicações para cada parte.',
      'Conforme entende as regras, você experimenta escolhas suas: onde deixar a chave, o que escrever em um aviso, como orientar quem joga. Cada mudança tem um resultado que você pode conferir.',
      'A autonomia começa com uma decisão que você entende.',
    ],
    legendas: [
      'Exploração real do curso: mudar a posição da chave e observar o resultado. As telas de aula foram capturadas no Kids, que oferece o mesmo curso da área adulta.',
    ],
  },
  comoFunciona: {
    titulo: 'Criar um jogo ajuda você a enxergar o resultado das suas escolhas.',
    imagens: [
      {
        src: '/img/desafio-primeiro-jogo/farol-posicao-x160.webp',
        alt: 'Captura real: chave na posição horizontal 160',
        width: 800,
        height: 606,
      },
      {
        src: '/img/desafio-primeiro-jogo/farol-posicao-x280.webp',
        alt: 'Captura real: chave na posição horizontal 280',
        width: 800,
        height: 606,
      },
    ],
    rotulos: ['APRENDER FAZENDO', 'CHAVE À ESQUERDA · X = 160', 'CHAVE À DIREITA · X = 280'],
    paragrafos: [
      'Imagine que você quer colocar a chave mais longe do personagem. Para fazer isso, precisa entender o comando que controla a posição dela. No jogo, você muda um valor, vê o efeito e pode comparar o resultado com o que imaginou.',
      'Quando você entende o que x controla, pode escolher outra posição para a chave e conferir se ela ficou onde queria. O comando passa a servir a uma intenção sua. Essa relação entre decidir, testar e compreender orienta o Desafio.',
    ],
    legendas: [
      'O valor de x indica a posição horizontal da chave.',
      'Você aumenta o valor. A chave se desloca para a direita.',
    ],
    destaques: ['Uma mudança pequena. Uma relação que você consegue explicar.'],
  },
  programacao: {
    titulo: 'Programar é dizer ao jogo o que deve acontecer.',
    imagens: [
      {
        src: '/img/desafio-primeiro-jogo/farol-blocos-reais.webp',
        alt: 'Blocos reais da coleta da chave e da condição que acende o farol',
        width: 1100,
        height: 1029,
      },
    ],
    rotulos: ['AS IDEIAS VIRAM INSTRUÇÕES'],
    paragrafos: [
      'Para o jogo responder às suas escolhas, ele precisa de instruções. Você monta essas instruções encaixando blocos com os comandos escritos no Estúdio, o espaço de criação da plataforma. A aula apresenta o que cada comando faz e como combinar as partes.',
      'Para isso, o jogo precisa guardar uma informação: o personagem já pegou a chave? Quando ele chega ao farol, uma condição consulta essa informação e escolhe a resposta.',
      'O farol continua apagado e aparece o aviso de que falta a chave.',
      'O farol acende, a mensagem muda e o barco chega.',
      'Você monta e testa os dois caminhos. Assim, consegue relacionar o comando àquilo que vê acontecer na tela.',
    ],
    legendas: ['Blocos reais da Chave do Farol. Clique para ler os comandos em tamanho maior.'],
    subtitulos: ['O farol só pode acender depois que a chave foi encontrada.'],
    destaques: ['Sem a chave', 'Com a chave'],
  },
  jogo: {
    titulo: 'Três etapas para juntar as partes e fazer a aventura funcionar.',
    rotulos: ['O SEU PRIMEIRO PROJETO', 'ETAPA 01', 'ETAPA 02', 'ETAPA 03'],
    paragrafos: [
      'Cada etapa acrescenta uma parte do jogo. As explicações e os testes ajudam você a perceber como elas se conectam.',
      'Explore posições e monte o movimento com as setas. Confira o que acontece quando o personagem chega aos limites da tela.',
      '<strong>Você pratica:</strong> organizar comandos e observar seus efeitos.',
      'Monte a coleta e guarde a informação de que a chave foi encontrada. Ela precisa continuar valendo quando o personagem se afasta.',
      '<strong>Você pratica:</strong> conferir se uma ação produziu o resultado esperado.',
      'Monte a condição do farol, faça escolhas de personalização e teste o jogo inteiro antes de concluir e publicar.',
      '<strong>Você pratica:</strong> combinar partes, revisar e concluir um projeto.',
      'O prazo começa com a aprovação do pagamento. As etapas indicam a sequência do projeto: você pode assistir a uma parte, praticar e continuar em outro momento dentro desse período.',
    ],
    subtitulos: [
      'Dê movimento ao personagem.',
      'Faça o jogo lembrar da chave.',
      'Conecte a regra ao final da aventura.',
    ],
    destaques: ['Você distribui as etapas dentro dos 30 dias de acesso.'],
  },
  aula: {
    titulo: 'Você acompanha a explicação e coloca a mão no projeto, na mesma aula.',
    imagens: [
      {
        src: '/img/desafio-primeiro-jogo/farol-estudio-real.webp',
        alt: 'Estúdio real com a programação da Chave do Farol e o jogo em execução',
        width: 2400,
        height: 1500,
      },
      {
        src: '/img/desafio-primeiro-jogo/farol-objetivos-reais.webp',
        alt: 'Lista real de objetivos do projeto e botão Verificar projeto',
        width: 1092,
        height: 530,
      },
    ],
    rotulos: ['ORIENTAÇÃO EM CADA PARTE', '01', '02', '03', '04'],
    paragrafos: [
      'O vídeo fica ao lado do espaço de prática. Você assiste a um trecho, pausa, experimenta e confere o resultado antes de continuar.',
      'Veja o que deve acontecer naquela parte do jogo.',
      'Acompanhe a explicação e teste a construção no projeto.',
      'A verificação da atividade ajuda a identificar os objetivos cumpridos e o que precisa ser revisto.',
      'Reveja a explicação, consulte o Caderno do Aluno ou envie sua dúvida por mensagem.',
      'A chave sumiu, mas o jogo guardou que ela foi coletada? A condição está consultando essa informação? A aula e os testes ajudam a localizar a parte que merece atenção.',
    ],
    legendas: [
      'O Estúdio usado no projeto: os comandos de um lado, o jogo em execução do outro.',
      'A lista de objetivos ajuda a conferir o que já funciona e o que falta revisar.',
    ],
    subtitulos: [
      'Entenda o objetivo.',
      'Monte e experimente.',
      'Confira o que falta.',
      'Retome com apoio.',
      'Se o farol não acendeu, você tem um ponto para investigar.',
    ],
  },
  habilidades: {
    titulo: 'Planejar, resolver problemas e testar ideias faz parte da construção.',
    rotulos: [
      'O QUE VOCÊ PRATICA AO CRIAR',
      'PLANEJAMENTO',
      'RESOLUÇÃO DE PROBLEMAS',
      'PERSISTÊNCIA',
      'CRIATIVIDADE E COMUNICAÇÃO',
    ],
    paragrafos: [
      'Para fazer o jogo funcionar, você precisa dividir o objetivo em partes, investigar um resultado inesperado e explicar suas escolhas. É assim que essas habilidades entram na prática, ligadas a algo que você quer realizar.',
      'A sequência do curso mostra como dividir a aventura em movimento, coleta e condição. Você aprende a conferir cada parte antes de testar tudo junto.',
      'Se o farol acende sem a chave, você verifica a condição que controla essa ação. Faz um ajuste e testa de novo para descobrir se resolveu a causa.',
      'Se a primeira tentativa falha, você compara o que esperava com o que aconteceu. Pode rever a explicação, escolher uma parte para corrigir e repetir o teste.',
      'Você escreve um aviso que ajude quem joga a descobrir o próximo passo. Depois, testa a mensagem e pode explicar por que escolheu aquelas palavras.',
      'Organizar uma viagem também envolve dividir um objetivo em etapas. Investigar por que uma planilha calculou um valor errado também pede conferir regras e testar uma mudança. No Desafio, você pratica esses modos de pensar dentro do jogo e pode observar o que cada tentativa ensina.',
    ],
    subtitulos: [
      'Transformar um objetivo em partes.',
      'Procurar a causa do que aconteceu.',
      'Dar uma direção à próxima tentativa.',
      'Escolher e explicar o que mudou.',
    ],
    destaques: ['Você pode reconhecer esse raciocínio em outros projetos.'],
  },
  realizacao: {
    titulo: 'Há uma satisfação própria em ver funcionar algo que você ajudou a construir.',
    imagens: [
      {
        src: '/img/desafio-adulto/farol-caderno.png',
        alt: 'Página do Caderno do Aluno com os testes do jogo completo',
        width: 1588,
        height: 2246,
      },
    ],
    rotulos: ['O PRAZER DE FAZER'],
    paragrafos: [
      'Quando o farol acende, você consegue apontar a regra que montou para isso acontecer. Ao mudar uma mensagem ou a posição da chave, vê uma escolha sua aparecer na aventura. O resultado tem uma participação que você reconhece.',
      'Ao concluir, você pode publicar no Mural dos Criadores e compartilhar o link para outras pessoas jogarem. Mostrar o que fez e contar como resolveu uma dificuldade também faz parte dessa realização.',
      'Para quem sempre quis criar um jogo, esse desejo ganha um começo possível.',
      'Se você chegou pela curiosidade de aprender, o projeto também pode ser uma forma de ter um tempo seu para experimentar e criar.',
    ],
    legendas: [
      'Um trecho do Caderno do Aluno: os testes ajudam você a reconhecer quando o projeto está funcionando.',
    ],
  },
  paraQuem: {
    titulo: 'Você pode chegar pela curiosidade, por uma ideia ou pela vontade de tentar de novo.',
    rotulos: [
      'UM COMEÇO PARA ADULTOS',
      'PARA FAZER O DESAFIO',
      'Ter 18 anos ou mais e usar a própria conta.',
      'Computador com mouse, teclado e conexão à internet.',
      'Navegador para assistir e construir. As ferramentas ficam na plataforma.',
      'Tempo para praticar e retomar as três etapas dentro dos 30 dias.',
    ],
    itens: [
      '<span class="cda-rotulo">01</span><span>Nunca programou e quer um primeiro caminho explicado.</span>',
      '<span class="cda-rotulo">02</span><span>Já acompanhou tutoriais e quer compreender melhor o que está construindo.</span>',
      '<span class="cda-rotulo">03</span><span>Gosta de aprender, experimentar e ter um projeto criativo seu.</span>',
    ],
    paragrafos: [
      'O Desafio é introdutório, com um projeto definido e orientação. Você começa por essa aventura e conhece uma forma de aprender criando.',
      'As aulas são gravadas. Você escolhe os horários, pausa quando precisa e continua depois.',
    ],
    subtitulos: ['Prepare o seu espaço de prática.'],
  },
  quemCriou: {
    titulo: 'Somos Helena e Júlio. A criação de jogos começou na nossa família.',
    imagens: [
      {
        src: '/img/comunidade-adulto/fundadores-aulas.webp',
        alt: 'Helena e Júlio, fundadores do Sistema Zero, preparando uma aula',
        width: 1280,
        height: 851,
      },
    ],
    rotulos: ['QUEM PREPAROU ESSE CAMINHO'],
    paragrafos: [
      'Somos formados em Sistemas de Informação e temos mais de dez anos de experiência criando sistemas. O Sistema Zero começou com os jogos que fizemos com nossos filhos.',
      'Hoje, organizamos essa experiência em cursos para crianças e adultos. Nosso trabalho é preparar o projeto, explicar suas partes e propor testes que ajudem você a entender o que está construindo.',
      'Queremos que você encontre nesse primeiro jogo uma oportunidade de aprender, fazer escolhas e reconhecer o que conseguiu criar.',
    ],
  },
  oferta: {
    titulo: 'O primeiro projeto e o caminho para construir já estão preparados.',
    rotulos: [
      'O SEU PRIMEIRO PASSO',
      'DESAFIO DO PRIMEIRO JOGO · ADULTOS',
      'As três etapas da Chave do Farol.',
      'Aulas em vídeo e Estúdio nas atividades do curso.',
      'Caderno do Aluno e tutoriais de apoio.',
      'Ajuda por mensagens para suas dúvidas.',
      'Acesso ao Mural para publicar e compartilhar o projeto.',
      'Certificado após cumprir os requisitos do curso.',
    ],
    paragrafos: [
      'Você recebe as três etapas da Chave do Farol, as aulas e o espaço para praticar. Ao longo da construção, aprende o que faz cada parte funcionar e testa suas mudanças, com materiais de consulta e orientação por mensagens.',
      '{{preco}}<span> pagamento único</span>',
      '30 dias de acesso. Sem renovação automática.',
      '<span>7 dias corridos a partir da compra para pedir o reembolso integral.</span>',
      'Pagamento por Pix ou cartão de crédito.',
    ],
    subtitulos: ['DEPOIS DA COMPRA'],
    itens: [
      '<span class="cda-depois__numero">01</span><span>O pagamento é confirmado e as instruções chegam ao seu e-mail.</span>',
      '<span class="cda-depois__numero">02</span><span>Você acessa sua conta e abre a primeira aula.</span>',
      '<span class="cda-depois__numero">03</span><span>Organiza a prática dentro dos 30 dias contados da aprovação do pagamento.</span>',
    ],
    acoes: ['Quero começar meu Desafio'],
  },
  depois: {
    titulo: 'Entender o primeiro projeto dá referências para as próximas ideias.',
    rotulos: ['DEPOIS DO PRIMEIRO PROJETO'],
    paragrafos: [
      'No Farol, você conhece regras para mover, lembrar e decidir. Isso dá referências para imaginar outras situações: um personagem que precisa de um objeto para continuar ou uma mensagem que muda conforme a escolha de quem joga. Desenvolver essas ideias pede novas combinações e prática.',
      'A Comunidade dos Criadores oferece continuidade por assinatura, com cursos e recursos liberados ao longo da jornada. Você pode avaliar esse próximo passo depois de experimentar o Desafio, que é uma compra única com seu próprio projeto completo.',
    ],
  },
  duvidas: {
    titulo: 'O que você precisa saber para começar.',
    rotulos: ['ANTES DE COMEÇAR'],
    itens: [
      {
        pergunta: 'Nunca programei. Como vou começar?',
        resposta:
          'O curso começa com um projeto preparado e instruções em blocos, com os comandos escritos. As explicações apresentam cada parte, e você monta e testa no Estúdio dentro da aula. O percurso foi organizado para iniciantes.',
      },
      {
        pergunta: 'Preciso ter uma ideia de jogo pronta?',
        resposta:
          'Você começa com A Chave do Farol, que já tem um objetivo e um caminho de construção. Ao longo das atividades, faz as escolhas propostas e conhece recursos que podem inspirar suas próximas criações.',
      },
      {
        pergunta: 'O curso também é oferecido no Kids?',
        resposta:
          'Sim. O curso e o projeto são os mesmos, com personagens, cenário e explicações que também aparecem no Kids. Na plataforma adulta, você usa sua própria conta e participa da área adulta. Os fundamentos trabalhados são os mesmos: organizar instruções, guardar informações, criar condições e testar.',
      },
      {
        pergunta: 'Quanto tempo preciso reservar?',
        resposta:
          'Você tem 30 dias de acesso a partir da aprovação do pagamento. As aulas são gravadas e divididas em partes, e seu projeto fica salvo para continuar depois. Reserve momentos para assistir, experimentar e rever o que precisar; o ritmo de conclusão varia de pessoa para pessoa.',
      },
      {
        pergunta: 'Posso fazer pelo celular?',
        resposta:
          'Para assistir e construir nas atividades, use um computador com mouse, teclado e internet. Depois de publicado, o jogo pode ser aberto pelo link no navegador do celular de quem vai jogar.',
      },
      {
        pergunta: 'E se eu travar em alguma parte?',
        resposta:
          'Você pode rever a explicação, consultar o Caderno do Aluno e os tutoriais de apoio. A verificação da atividade ajuda a conferir os objetivos do projeto. Se a dúvida continuar, envie uma mensagem à equipe pela plataforma. As respostas podem levar um tempo.',
      },
      {
        pergunta: 'Vou poder criar qualquer jogo depois do Desafio?',
        resposta:
          'Você começa com um projeto guiado e aprende seus fundamentos: movimento, memória, condições e testes. Também experimenta as mudanças propostas nas aulas. Criar jogos diferentes exige ampliar esse repertório e continuar praticando. No Desafio, o Estúdio é liberado para as atividades do curso.',
      },
      {
        pergunta: 'Essa compra cria uma assinatura?',
        resposta:
          'Não. Você paga {{preco}} uma vez e recebe 30 dias de acesso ao Desafio. A Comunidade dos Criadores é uma assinatura separada, que você escolhe contratar se quiser continuar.',
      },
      {
        pergunta: 'O que acontece depois dos 30 dias?',
        resposta:
          'O acesso às aulas e ao Estúdio das atividades termina. Você continua podendo visitar o Mural para ver e jogar, mas esse acesso de visitante não permite novas publicações, comentários ou reações. O link do seu jogo continua funcionando enquanto a publicação estiver disponível. Seus projetos e progresso ficam guardados conforme a Política de Privacidade e podem ser retomados com uma nova contratação que inclua esse acesso.',
      },
      {
        pergunta: 'Como funciona a garantia?',
        resposta:
          'Você pode solicitar o reembolso integral em até sete dias corridos da compra. As orientações e o contato estão nos Termos de Uso do Desafio, disponíveis no rodapé.',
      },
    ],
  },
  fechamento: {
    titulo: 'Transforme a vontade de criar em um projeto que você pode mostrar.',
    rotulos: ['A PRIMEIRA CRIAÇÃO COMEÇA AQUI'],
    paragrafos: [
      'Comece com a Chave do Farol: monte as regras, experimente suas escolhas e compartilhe o resultado. Um primeiro jogo para praticar o que você veio buscar: entender, criar e realizar.',
      '{{preco}} · pagamento único · 30 dias de acesso · 7 dias de garantia',
    ],
    acoes: ['Quero começar meu Desafio'],
  },
} as const satisfies PaginaOfertaAdulta
