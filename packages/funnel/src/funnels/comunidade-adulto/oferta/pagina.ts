// Copy aprovada em 06/11/2026. Direção: docs/marketing/pro/posicionamento.md.
// Textos agrupados por seção, na ordem de leitura; preços preenchidos pelo catálogo.
import type { PaginaOfertaAdulta } from './types'

export const PAGINA_ADULTO = {
  seoTitle: 'Comunidade dos Criadores para adultos | Sistema Zero',
  description:
    'Ganhe autonomia para realizar suas ideias. Cursos, projetos de jogos, ferramentas e apoio para continuar criando na Comunidade adulta.',
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
    rotulos: ['COMUNIDADE DOS CRIADORES'],
    acoes: ['Como funciona', 'A Jornada', 'Ver planos'],
  },
  hero: {
    titulo: {
      antes: 'Ganhe autonomia para ',
      destaque: 'realizar suas ideias',
      depois: ', criando um jogo de cada vez.',
    },
    texto:
      'Com aulas guiadas e programação em blocos, você aprende a construir jogos e entender como eles funcionam. A assinatura reúne projetos, ferramentas e apoio para continuar praticando e experimentar ideias suas.',
    imagens: [
      {
        src: '/img/desafio-primeiro-jogo/farol-jogo-real.webp',
        alt: 'A Chave do Farol em execução: personagem, chave e farol na ilha',
        width: 1440,
        height: 1080,
      },
    ],
    rotulos: [
      'COMUNIDADE DOS CRIADORES · ADULTOS',
      'Comece do zero ou retome o que já aprendeu.',
      'Monte, teste e personalize os projetos dos cursos.',
      'Publique suas criações e compartilhe o que fez.',
      'UMA IDEIA EM FUNCIONAMENTO',
      'A CHAVE DO FAROL',
    ],
    acoes: ['Quero criar na Comunidade'],
    itens: [
      '<span aria-hidden="true" class="cda-quadradinho"></span>18 anos ou mais',
      '<span aria-hidden="true" class="cda-quadradinho"></span>No navegador do computador',
    ],
    legendas: [
      'Um dos projetos do percurso: você monta as regras, testa a aventura e experimenta suas escolhas.',
    ],
  },
  comeco: {
    titulo: 'Entender o que você fez abre espaço para criar algo diferente.',
    rotulos: ['DA VONTADE À PRÁTICA'],
    paragrafos: [
      'Você pode ter vontade de criar um jogo, entender melhor a tecnologia ou desenvolver um projeto nas horas livres. Um primeiro passo é acompanhar uma construção. O avanço aparece quando você entende uma regra e começa a decidir o que quer mudar nela.',
      'Na Comunidade, os cursos oferecem esse começo: um projeto preparado, explicações e um espaço para montar e testar. Conforme aprende, você experimenta mudanças e usa o que entendeu em outras construções.',
      'Imagine mudar o aviso que aparece antes de abrir uma passagem. Você precisa saber quando ele aparece, qual informação deve trazer e como testar se ficou claro. Uma pequena escolha já pede compreensão do que você está criando.',
      'Você acompanha os cursos, usa as ferramentas liberadas e mantém os projetos na conta para retomá-los. A Jornada, o percurso de cursos e etapas da plataforma, mostra os requisitos para avançar. Há também espaços para compartilhar e enviar dúvidas à equipe.',
      'Já tem uma conta adulta? Use o mesmo e-mail ao assinar. Você pode retomar uma aula, terminar um projeto ou seguir para os próximos passos disponíveis no seu percurso.',
    ],
    destaques: ['Cursos, prática e ajuda no mesmo lugar.'],
  },
  projetos: {
    titulo: 'Cada projeto acrescenta algo ao que você consegue fazer.',
    imagens: [
      {
        src: '/img/cade-todo-mundo/cade-jogo-3.webp',
        alt: 'Cadê Todo Mundo: os animais encontrados aparecem na cena',
        width: 1440,
        height: 810,
      },
      {
        src: '/img/desafio-primeiro-jogo/farol-jogo-real.webp',
        alt: 'A Chave do Farol com a chave no caminho até o farol',
        width: 1440,
        height: 1080,
      },
    ],
    rotulos: ['O QUE MUDA DE UMA CRIAÇÃO PARA OUTRA', 'CADÊ TODO MUNDO', 'A CHAVE DO FAROL'],
    paragrafos: [
      'Veja como duas construções do Sistema Zero trabalham decisões diferentes. Em uma, você liga um clique a uma ação. Na outra, faz o resultado depender de algo que já aconteceu no jogo.',
      'Ao clicar em um esconderijo, um personagem aparece. Você relaciona a ação de quem joga à resposta que programou e confere o contador de encontrados.',
      '<strong>O que essa experiência ajuda a entender:</strong> você descobre como ligar o clique de quem joga a uma ação na cena.',
      'Chegar ao farol só resolve a aventura se a chave já foi encontrada. Você guarda essa informação e monta a condição que decide o que acontece.',
      '<strong>O que essa experiência acrescenta:</strong> você aprende a guardar uma informação e usá-la para decidir o resultado.',
      'A ação de clicar e a regra de conferir um objeto podem se encontrar em outra ideia: uma passagem que só abre quando a pessoa tem a chave. Para construir essa combinação, você precisa adaptar as instruções e testar os caminhos. É nesse tipo de prática que o que aprendeu ganha outro uso.',
      'São exemplos do que você constrói nos cursos. A área de membros mostra quais estão disponíveis e os requisitos para acessá-los.',
    ],
    subtitulos: ['Revelar um personagem ao clicar.', 'Acender o farol só depois de pegar a chave.'],
    legendas: ['Captura real de Cadê Todo Mundo.', 'Captura real da Chave do Farol.'],
    destaques: ['Você começa a reconhecer peças que pode combinar.'],
  },
  programacao: {
    titulo: 'Os blocos ajudam você a enxergar as instruções que fazem o jogo funcionar.',
    imagens: [
      {
        src: '/img/desafio-primeiro-jogo/farol-blocos-reais.webp',
        alt: 'Blocos reais da Chave do Farol: coleta da chave e condição para acender o farol',
        width: 1100,
        height: 1029,
      },
    ],
    rotulos: ['COMPREENDER PARA PODER ESCOLHER'],
    paragrafos: [
      'Para o jogo responder a uma escolha, ele precisa de instruções. Você começa montando essas instruções com blocos, no Estúdio da plataforma. Cada bloco tem um comando escrito; a aula explica o que ele faz e como encaixá-lo na construção.',
      'Você monta a regra, testa os dois casos e confere se a resposta corresponde ao que esperava. Depois, pode personalizar um aviso e observar se ele ajuda quem joga a entender o próximo passo.',
      'Por exemplo: o aviso “Falta a chave” pode ganhar uma pista mais clara sobre o que procurar. Você escolhe as palavras e testa a mensagem no momento em que ela aparece.',
      'Você entende a regra e tem um motivo para fazer a mudança.',
    ],
    legendas: ['Os blocos reais do projeto. Clique para ampliar e ler as instruções.'],
    subtitulos: ['O farol acende com a chave e continua apagado sem ela.'],
  },
  comoFunciona: {
    titulo: 'Assista a um trecho, construa e confira o resultado.',
    imagens: [
      {
        src: '/img/desafio-primeiro-jogo/farol-estudio-real.webp',
        alt: 'Estúdio real da Chave do Farol com blocos e jogo em execução',
        width: 2400,
        height: 1500,
      },
    ],
    rotulos: ['COMO A PRÁTICA ACONTECE'],
    paragrafos: [
      'O vídeo e o espaço de prática ficam na mesma aula. Você pode pausar para montar, rodar o projeto e voltar à explicação. Assim, cada parte apresentada tem uma oportunidade de ser experimentada.',
      'Se o farol acende sem a chave, a condição que controla essa ação é um ponto para investigar. A verificação da atividade ajuda a conferir os objetivos; os materiais da aula e o canal de mensagens da equipe ajudam a retomar a construção.',
    ],
    legendas: [
      'Captura real do Estúdio na aula do Farol. As telas de aula da plataforma foram feitas no Kids, que usa os mesmos cursos e ferramentas.',
    ],
    itens: [
      '<strong>1. Entenda o objetivo.</strong>Veja o que aquela parte do projeto precisa fazer.',
      '<strong>2. Monte e teste.</strong>Acompanhe a construção, rode o jogo e observe o resultado.',
      '<strong>3. Confira e ajuste.</strong>Use os objetivos da atividade e os materiais de apoio para revisar o que falta.',
      '<strong>4. Explique e compartilhe.</strong>Ao concluir, você pode publicar no Mural e mostrar uma escolha que fez.',
    ],
    destaques: ['Quando algo falha, você tem o que conferir.'],
  },
  jornada: {
    titulo: 'Você ganha novas possibilidades ao usar o que aprendeu em situações diferentes.',
    rotulos: [
      'POR QUE CONTINUAR',
      'APRENDER',
      'EXPERIMENTAR',
      'AMPLIAR',
      'CRIAR',
      'COMO O ACESSO É LIBERADO',
    ],
    paragrafos: [
      'Depois de montar uma regra com orientação, vem outra pergunta: como adaptá-la para fazer algo diferente? Novos projetos dão oportunidades de experimentar essa adaptação, perceber o que ainda falta aprender e combinar o que já funciona. A assinatura mantém esse espaço de prática e acesso ao percurso durante o período contratado.',
      'O projeto preparado dá um objetivo: fazer o personagem andar, por exemplo. A explicação mostra as instruções, e você confere o movimento no jogo.',
      'Você muda a posição da chave ou o texto de um aviso. Tem uma intenção para a mudança e testa se o resultado corresponde ao que imaginou.',
      'Uma ação que você já conhece passa a depender de uma condição. Você junta as partes e testa o que acontece em cada situação.',
      'Quando o Estúdio livre é liberado no seu percurso, você pode começar um projeto próprio com os recursos disponíveis. Escolhe uma ideia, divide a construção e testa suas soluções.',
      'A Jornada mostra os cursos, os requisitos de cada etapa e os recursos que você pode liberar. Cumprir esses requisitos abre novos acessos sem cobrança adicional por essa liberação. O catálogo está em expansão: os cursos publicados durante sua assinatura também entram no percurso.',
    ],
    subtitulos: [
      'Começar com um objetivo definido.',
      'Experimentar mudanças com intenção.',
      'Combinar o que já entendeu.',
      'Dar forma a projetos próprios.',
    ],
  },
  habilidades: {
    titulo: 'Planejar, investigar e fazer escolhas entram na construção do seu jogo.',
    rotulos: [
      'O QUE VOCÊ PRATICA AO CRIAR',
      'PLANEJAMENTO',
      'RESOLUÇÃO DE PROBLEMAS',
      'PERSISTÊNCIA',
      'CRIATIVIDADE E COMUNICAÇÃO',
    ],
    paragrafos: [
      'Essas habilidades aparecem em ações que você consegue observar: separar um objetivo em partes, procurar a causa de uma falha e explicar por que fez uma mudança.',
      'A sequência do curso mostra como separar movimento, coleta e condição. Você aprende a conferir cada parte antes de testar a aventura completa.',
      'O personagem chegou ao destino, mas o jogo não terminou. Você observa o que aconteceu, confere a condição de conclusão e testa um ajuste.',
      'Depois de uma tentativa que falhou, você pode rever a explicação, escolher uma parte para ajustar e testar de novo. Há um próximo passo para investigar.',
      'Ao escrever um aviso, você pensa no que a pessoa precisa saber para continuar jogando. Depois, pode mostrar a mensagem e explicar por que escolheu aquelas palavras.',
      'Ver o personagem se mover porque você montou aquela regra. Mostrar a alguém a mensagem que escolheu. Essas pequenas realizações dão um significado próprio ao que você está aprendendo. O desejo de criar jogos pode ganhar espaço nas horas livres, e a curiosidade pode virar uma criação para compartilhar.',
    ],
    subtitulos: [
      'Planejar o que vem primeiro.',
      'Investigar antes de mudar tudo.',
      'Retomar com um próximo passo.',
      'Escolher e explicar o que fez.',
    ],
    destaques: ['Há também o prazer de ter algo seu em construção.'],
  },
  ferramentas: {
    titulo: 'Para programar as regras, criar a arte e explorar novas formas de construir.',
    imagens: [
      {
        src: '/img/comunidade-dos-criadores/tela-codigo.webp',
        alt: 'Modo Ponte real com blocos e código lado a lado no projeto Cadê Todo Mundo',
        width: 1280,
        height: 800,
      },
    ],
    rotulos: ['MAIS RECURSOS PARA DAR FORMA ÀS IDEIAS'],
    paragrafos: [
      'O Estúdio reúne as instruções do jogo. Outros recursos permitem desenhar personagens, modelar objetos e conhecer o código por trás dos blocos. Cada ferramenta é liberada quando você cumpre os requisitos previstos no percurso.',
      'Pensa e Zappy usam inteligência artificial para apoiar o planejamento e a revisão do projeto. São liberados em etapas do percurso e têm limites diários e mensais exibidos na conta. Você confere as sugestões e decide como usá-las.',
    ],
    subtitulos: ['Cada recurso tem um papel na criação.'],
    itens: [
      '<strong>Estúdio</strong>Montar as regras e rodar o jogo para conferir, por exemplo, se o personagem responde ao comando.',
      '<strong>Pinta e Molda</strong>Desenhar um personagem em 2D ou modelar um objeto em 3D para usar nas suas criações.',
      '<strong>Ponte e Estúdio Pro</strong>Na Ponte, ver o código que os blocos geram. No Estúdio Pro, trabalhar também escrevendo esse código, nas etapas correspondentes.',
    ],
    legendas: [
      'O modo Ponte mostra o código gerado pelos blocos. É um recurso de etapas posteriores, sujeito aos requisitos da Jornada. Captura real do Estúdio.',
    ],
  },
  comunidade: {
    titulo: 'Mostrar o que você criou também ajuda a pensar na próxima versão.',
    imagens: [
      {
        src: '/img/comunidade-dos-criadores/tela-mural.webp',
        alt: 'Mural dos Criadores com jogos publicados, botões Jogar, Copiar link e Fazer a minha versão',
        width: 1280,
        height: 800,
      },
    ],
    rotulos: ['CRIAR TAMBÉM PODE SER UMA TROCA'],
    paragrafos: [
      'No Mural dos Criadores, você pode publicar um projeto e compartilhar o link. Quem recebe joga pelo navegador, inclusive no celular. Se essa pessoa não entender um aviso, por exemplo, você tem uma pergunta concreta para revisar: que informação faltou para ela continuar?',
      '<strong>No Clube,</strong> você pode conversar com outros membros adultos e trocar experiências sobre as criações.',
      '<strong>No Desafio do mês,</strong> um tema dá outra oportunidade de experimentar e mostrar uma ideia.',
      '<strong>Nos Recados,</strong> você envia dúvidas à equipe. Os tutoriais e materiais dos cursos também ajudam a retomar a prática.',
      'Você escolhe como participar e quais projetos quer publicar. Um jogo compartilhado pode ser uma oportunidade de conversar sobre o que funcionou e o que você gostaria de mudar.',
    ],
    legendas: [
      'Captura real do Mural Kids, mostrando os recursos de publicação e compartilhamento. A área adulta tem seu próprio Mural e sua própria comunidade.',
    ],
    subtitulos: ['Há espaços para mostrar, conversar e pedir ajuda.'],
  },
  seuRitmo: {
    titulo: 'Você pode parar depois de um teste e retomar o projeto em outro momento.',
    rotulos: [
      'UMA PRÁTICA QUE VOCÊ PODE RETOMAR',
      'Nunca programou e quer um caminho explicado.',
      'Já experimentou criar e quer entender melhor suas escolhas.',
      'Quer desenvolver projetos por interesse, aprendizado e prazer de realizar.',
      'PARA PARTICIPAR',
      'Ter 18 anos ou mais e usar uma conta adulta própria.',
      'Computador com internet, mouse e teclado.',
      'Navegador atualizado. As ferramentas funcionam na plataforma.',
      'Reservar momentos para assistir, construir e testar.',
    ],
    paragrafos: [
      'Em uma sessão, você pode montar o movimento. Na seguinte, conferir a coleta de um objeto. As aulas são gravadas, os projetos ficam salvos e você organiza esses momentos durante o período de acesso.',
      'Os personagens e cenários dos cursos vêm preparados. Você pode começar pela programação e explorar o desenho de elementos próprios quando os recursos correspondentes estiverem liberados.',
      'A orientação acontece nas aulas gravadas e por mensagens. O tempo de conclusão depende do projeto, da prática e do ritmo de cada pessoa.',
    ],
    subtitulos: ['Um caminho para quem quer aprender criando.', 'Prepare seu espaço de criação.'],
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
    rotulos: ['QUEM PREPARA ESSE CAMINHO'],
    paragrafos: [
      'Somos formados em Sistemas de Informação e temos mais de dez anos de experiência criando sistemas. O Sistema Zero começou com os jogos que fizemos com nossos filhos.',
      'Hoje, organizamos projetos, explicações e materiais para que crianças e adultos encontrem um caminho para criar. Os mesmos cursos aparecem nas duas áreas, com contas e espaços de convivência próprios.',
      'Nosso trabalho é ajudar você a compreender as partes, experimentar escolhas e encontrar oportunidades de continuar construindo.',
    ],
  },
  oferta: {
    titulo: 'Escolha seu plano na Comunidade dos Criadores.',
    textoPlanoUnico:
      'O plano disponível inclui os cursos, ferramentas e espaços da comunidade, conforme os requisitos da Jornada. Confira abaixo o período contratado e como o pagamento renova.',
    rotulos: [
      'PARA DAR SEQUÊNCIA ÀS SUAS IDEIAS',
      'COMUNIDADE DOS CRIADORES',
      'ADULTOS · SISTEMA ZERO',
    ],
    paragrafos: [
      'Os dois planos incluem os mesmos cursos, ferramentas e espaços da comunidade. Os requisitos da Jornada valem para ambos. Você escolhe o período contratado e confere abaixo como cada pagamento renova.',
      '{{preco_mensal}}<span>/mês</span>',
      'Cobrança mensal no cartão de crédito. Renova automaticamente até você cancelar.',
      '7 dias de garantia na contratação.',
      '{{economia_anual}} A MENOS QUE 12 MENSALIDADES',
      '{{preco_anual}}<span>/ano</span>',
      'Equivalente a {{equivalente_mensal_anual}} por mês.',
      '12 meses de acesso. No Pix à vista, termina sem renovação automática. No cartão, renova a cada ano até você cancelar.',
      '7 dias de garantia na contratação.',
      'A equivalência mensal do anual serve para comparar os planos; não é uma cobrança mensal de {{equivalente_mensal_anual}}.',
      'O cancelamento interrompe cobranças futuras. Seu acesso continua até o fim do período já pago. Nos primeiros sete dias corridos da contratação, você pode solicitar o reembolso integral.',
      'As instruções de acesso chegam ao e-mail da compra. Na área de membros, você abre a Jornada, escolhe um curso disponível e começa ou retoma a prática.',
      'Já tem uma conta adulta? Use o mesmo e-mail ao contratar para reunir o acesso, os projetos e o progresso nessa conta.',
    ],
    subtitulos: [
      'MENSAL',
      'ANUAL',
      'Você pode cancelar a renovação pela conta.',
      'Depois da aprovação do pagamento.',
    ],
    acoes: ['Assinar o mensal', 'Assinar o anual'],
    inclui: [
      'Cursos disponíveis e os publicados durante o período da assinatura.',
      'Estúdio e ferramentas de criação, com liberação gradual pelo percurso.',
      'Mural, Clube e atividades da comunidade adulta.',
      'Materiais de apoio e orientação por mensagens nos Recados.',
      'Registro de progresso e certificados ao cumprir os requisitos dos cursos.',
    ],
  },
  duvidas: {
    titulo: 'As dúvidas que ajudam a escolher seu próximo passo.',
    rotulos: ['ANTES DE ASSINAR'],
    itens: [
      {
        pergunta: 'Nunca programei. Por onde vou começar?',
        resposta:
          'Pelos projetos iniciais disponíveis no seu percurso. As aulas apresentam os comandos em blocos e explicam a construção passo a passo. Você monta as instruções e confere o resultado na mesma aula. A Jornada mostra por onde começar e os requisitos para avançar.',
      },
      {
        pergunta: 'Preciso ter uma ideia de jogo ou saber desenhar?',
        resposta:
          'Você começa com os projetos, personagens e cenários preparados para os cursos. Ao aprender, experimenta as escolhas propostas nas aulas. Desenhar elementos próprios e criar outros projetos são possibilidades para explorar com os recursos que for liberando.',
      },
      {
        pergunta: 'Preciso fazer o Desafio antes? Qual é a diferença?',
        resposta:
          'Você pode entrar diretamente na Comunidade. O Desafio é uma compra única, com 30 dias de acesso à Chave do Farol e aos recursos incluídos nessa oferta. A Comunidade dá continuidade por assinatura, com cursos, ferramentas e espaços de participação conforme o percurso. Comprar o Desafio não cria uma assinatura.',
      },
      {
        pergunta: 'Todos os cursos e ferramentas abrem no primeiro dia?',
        resposta:
          'A liberação é gradual. Você começa com o que está disponível na sua etapa e avança ao cumprir os requisitos indicados na Jornada. A plataforma está em expansão, e novos cursos publicados durante sua assinatura entram no acesso conforme esses requisitos. A liberação prevista no percurso não tem cobrança adicional.',
      },
      {
        pergunta: 'Posso criar um projeto com uma ideia minha?',
        resposta:
          'Sim. Depois de cumprir os requisitos que liberam o Estúdio livre, você pode iniciar projetos próprios com os recursos disponíveis na sua conta. Os cursos apresentam regras e construções que podem servir de referência para testar suas ideias.',
      },
      {
        pergunta: 'Os cursos são os mesmos oferecidos no Kids?',
        resposta:
          'Sim. Os cursos, projetos e explicações são compartilhados. Os fundamentos da criação são os mesmos, e os exemplos mostram personagens e cenas usados nas aulas. Na área adulta, você participa com conta própria, aparência e espaços de convivência destinados a adultos.',
      },
      {
        pergunta: 'Posso usar a assinatura do meu filho ou trazer um perfil Kids?',
        resposta:
          'A assinatura adulta é separada da Kids e usa uma conta pessoal para quem tem 18 anos ou mais. Projetos de um perfil Kids continuam associados a esse perfil; contratar a área adulta não os transfere automaticamente.',
      },
      {
        pergunta: 'Quanto tempo preciso reservar? Há aulas ao vivo?',
        resposta:
          'As aulas são gravadas, e você organiza os horários. Reserve momentos para assistir, construir e testar; os projetos ficam salvos para continuar depois. O tempo de conclusão varia conforme o projeto e a prática de cada pessoa. A ajuda da equipe acontece por mensagens.',
      },
      {
        pergunta: 'Posso criar pelo celular?',
        resposta:
          'Para construir nas aulas e usar as ferramentas, você precisa de um computador com internet, mouse e teclado. Tudo funciona no navegador. O celular pode ser usado para jogar e mostrar os projetos publicados.',
      },
      {
        pergunta: 'Como recebo ajuda quando travo?',
        resposta:
          'Você pode rever a aula, consultar os materiais e enviar dúvidas à equipe nos Recados. As respostas são por mensagem e podem levar um tempo. Pensa e Zappy entram como apoio nas etapas em que forem liberados, com limites diários e mensais exibidos na conta.',
      },
      {
        pergunta: 'Já tenho uma conta adulta. Meu progresso fica nela?',
        resposta:
          'Use o mesmo e-mail ao contratar. Os projetos e o progresso permanecem associados à conta, conforme a Política de Privacidade. Com a assinatura ativa, você retoma os recursos incluídos no acesso e liberados pela sua Jornada.',
      },
      {
        pergunta: 'Como o plano anual é cobrado?',
        resposta:
          'O plano custa {{preco_anual}} por ano. No Pix, o pagamento é à vista e não renova automaticamente. No cartão, a cobrança renova a cada ano até você cancelar. {{equivalente_mensal_anual}} é o equivalente mensal do total anual, usado para comparar os planos; não é o valor de uma parcela. As condições aparecem no checkout antes do pagamento.',
      },
      {
        pergunta: 'O que acontece se eu cancelar?',
        resposta:
          'O cancelamento da renovação pode ser feito na área de Compras. Ele interrompe as próximas cobranças, e o acesso continua até o fim do período pago. Os projetos e o progresso permanecem armazenados conforme a Política de Privacidade. Publicações continuam acessíveis para visita no Mural enquanto disponíveis.',
      },
      {
        pergunta: 'Como funciona a garantia?',
        resposta:
          'Você pode solicitar o reembolso integral nos primeiros sete dias corridos da contratação. As orientações e o contato estão nos Termos de Uso, no rodapé. Cancelar uma renovação e pedir reembolso são ações diferentes: o cancelamento impede cobranças futuras e mantém o acesso até o fim do período já pago.',
      },
    ],
  },
  fechamento: {
    titulo: 'Dê às suas ideias um lugar para ganhar forma.',
    rotulos: ['UMA CRIAÇÃO DE CADA VEZ'],
    paragrafos: [
      'Escolha o plano, abra um curso disponível e dê o próximo passo na sua criação. As aulas, as ferramentas e os espaços da Comunidade ficam reunidos para você aprender, testar e continuar.',
    ],
    acoes: ['Quero criar na Comunidade'],
  },
} as const satisfies PaginaOfertaAdulta
