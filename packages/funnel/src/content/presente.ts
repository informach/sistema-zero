import type { ComunidadeSection } from '../funnels/comunidade-dos-criadores/oferta/types'

const section = (
  id: string,
  eyebrow: string,
  title: string,
  paragraphs: string[],
  visuals: string[],
): ComunidadeSection => ({
  id,
  eyebrow,
  title,
  layout: 'story',
  groups: [{ title: null, paragraphs }],
  visuals,
  actions: [],
})

/** Mesma experiência para convite pessoal e campanha; a origem muda, os direitos não. */
export const GIFT_SECTIONS = [
  section(
    'experiencia',
    'Um jogo que ele ajuda a fazer funcionar',
    'O personagem apareceu. O que seu filho fez para isso acontecer?',
    [
      'No Cadê Todo Mundo?, seu filho começa explorando uma brincadeira de procurar personagens escondidos em um jardim. Depois, conhece uma das regras por trás dela: quando alguém toca no esconderijo, ele precisa desaparecer para revelar quem estava ali.',
      'A criança monta o comando, testa e observa. Se o esconderijo continua no lugar, há algo para conferir. Quando a regra funciona, o personagem aparece. Mais adiante, ela trabalha a contagem para o jogo registrar cada achado.',
      'Em casa, você pode pedir: “Me mostra o que mudou? Qual comando fez isso acontecer?”. A aprendizagem ganha um exemplo que os dois conseguem ver no jogo.',
    ],
    ['regra', 'contador'],
  ),
  section(
    'comeco',
    'Um primeiro projeto com direção',
    'O jardim está preparado. As regras são a descoberta.',
    [
      'Seu filho não precisa começar diante de uma tela vazia. O cenário e os personagens já estão preparados para a atividade. Há uma tarefa concreta: fazer os esconderijos responderem aos toques e contar os personagens encontrados.',
      'Isso deixa espaço para aprender uma parte da criação de cada vez. Ele acompanha a montagem com blocos, experimenta os comandos apresentados e confere o resultado. Saber programar antes não é requisito, e ele não precisa desenhar os personagens para fazer este curso.',
    ],
    ['aula'],
  ),
  section(
    'aula',
    'Ver, fazer e conferir',
    'A explicação fica ao lado do que seu filho está construindo.',
    [
      'Na tela da aula, seu filho encontra o vídeo com a orientação e a atividade para colocar a ideia em prática. Ele pode assistir a um passo, pausar e fazer a ação no projeto. Se não entendeu um detalhe, volta à explicação antes de continuar.',
      'A orientação e o trabalho ficam juntos. Você consegue olhar a tela com ele e entender o que está tentando fazer; ele consegue comparar o que ouviu com o que aconteceu na própria atividade. O curso usa o Estúdio dentro desse projeto guiado — o presente não libera o editor para criar projetos livres.',
    ],
    ['aula-estudio'],
  ),
  section(
    'rotina',
    'Cabe na vida da sua família',
    'Reserve um momento do tempo de computador que vocês já permitem.',
    [
      'Não é preciso aumentar o tempo de tela para experimentar. Vocês podem combinar que uma parte do período já permitido será usada para construir o jogo e conversar sobre o que aconteceu.',
      'As aulas são gravadas: não há horário de turma para encaixar na agenda. Durante os sete dias de acesso, vocês escolhem quando entrar e podem pausar e rever as explicações. Vale acompanhar o primeiro acesso, ajudar a encontrar os controles e observar de que companhia seu filho precisa.',
      'Algumas crianças seguem com a orientação da tela; outras pedem ajuda para ler uma instrução ou retomar uma etapa. O curso oferece um caminho para começar. A autonomia é construída nesse uso, respeitando o momento de cada criança.',
    ],
    ['pausa'],
  ),
  section(
    'conquista',
    'Do experimento à conclusão',
    'Ao terminar, ele tem uma experiência para mostrar e explicar.',
    [
      'O percurso passa por experimentar o jogo, montar as reações e trabalhar a contagem dos achados. Em cada etapa, seu filho pode testar e perceber como uma regra interfere na brincadeira.',
      'Ao cumprir as atividades de conclusão, ele recebe o certificado do curso. Mais que olhar esse registro, peça para ele mostrar uma parte do projeto e contar o que aprendeu a fazer. Não há promessa de concluir em uma tarde: aproveitem os sete dias para seguir as etapas com atenção.',
    ],
    ['certificado'],
  ),
  section(
    'mural',
    'Um jogo para compartilhar',
    'Ele cria o jogo. Depois, pode convidar a família para jogar.',
    [
      'Durante os sete dias, seu filho pode publicar no Mural dos Criadores o jogo que fez no Cadê Todo Mundo?, seguindo as orientações e atividades do curso. A aula 2 ensina esse caminho. Depois de publicar, ele recebe um link para convidar você, os avós ou os amigos para jogar, sem que eles precisem de uma conta.',
      'Nesse período, ele também pode conhecer os jogos de outras crianças, jogar, comentar e reagir. Você pode acompanhar esse momento: pedir que ele mostre uma regra que criou, experimentar o jogo e conversar sobre o que achou interessante em outra criação.',
      'Quando os sete dias terminam, o curso e as ações de publicar, comentar e reagir deixam de estar liberados por este convite. Sua conta continua podendo ver e jogar no Mural enquanto existir. O link do jogo que ele já publicou continua funcionando enquanto a publicação estiver disponível.',
      'O print mostra o Mural da plataforma. Fazer cópias dos jogos e usar ferramentas de criação livre depende dos acessos e das etapas da Comunidade; esses recursos não fazem parte do presente.',
    ],
    ['mural'],
  ),
  section(
    'gratuito',
    'Conheça nosso jeito de ensinar',
    'É gratuito para sua família experimentar de verdade.',
    [
      'O Sistema Zero é uma plataforma de aprendizagem criativa. Crianças acompanham orientações, fazem atividades e testam suas ideias. Este convite oferece um começo concreto: o curso Cadê Todo Mundo? e a participação no Mural por sete dias, com visita ao Mural depois desse prazo.',
      'Queremos que você veja como seu filho participa dessa experiência antes de decidir se deseja continuar. O cadastro não pede cartão e não cria uma assinatura. Ao fim dos sete dias, o curso deixa de estar disponível por este presente; não começa uma cobrança.',
      'Se depois vocês quiserem seguir com outros cursos e recursos, existe a Comunidade dos Criadores. Essa assinatura é uma escolha separada do responsável. Você pode conhecer o presente agora sem assumir esse compromisso.',
    ],
    [],
  ),
] satisfies ComunidadeSection[]

export const GIFT_FAQ = [
  {
    id: 'programar',
    question: 'Meu filho precisa saber programar?',
    visual: 'aula-estudio',
    paragraphs: [
      'Não precisa chegar sabendo. O curso apresenta os comandos usados neste projeto e mostra como montá-los com blocos. Seu filho recebe uma tarefa definida e pode comparar o resultado com a orientação da aula.',
      'Para começar bem, sente com ele no primeiro acesso e confira se consegue acompanhar as instruções e usar os controles. Essa companhia inicial ajuda a descobrir o que já faz sozinho e em que ainda precisa de você.',
    ],
  },
  {
    id: 'desenhar',
    question: 'Ele precisa saber desenhar?',
    visual: 'aula',
    paragraphs: [
      'Não. Neste projeto, o jardim e os personagens já estão preparados. O trabalho da criança é montar e testar as regras que fazem a brincadeira funcionar.',
      'Assim, ela pode se concentrar na programação sem precisar desenhar antes. O presente não é um curso de desenho e não libera o Pinta para uso livre.',
    ],
  },
  {
    id: 'idade',
    question: 'Como saber se meu filho está pronto para experimentar?',
    visual: 'aula',
    paragraphs: [
      'O Cadê Todo Mundo? é apresentado para crianças e adolescentes de 9 a 14 anos que estão começando. Além da idade, observe se seu filho consegue acompanhar uma instrução curta e usar mouse e teclado, sozinho ou com sua ajuda.',
      'Se ele ainda precisa de companhia para ler ou encontrar os controles, reserve esse primeiro momento para fazerem juntos. Não é preciso chegar com experiência em criação de jogos.',
    ],
  },
  {
    id: 'computador',
    question: 'Dá para fazer o curso pelo celular?',
    visual: 'aula-estudio',
    paragraphs: [
      'Você pode abrir este convite e cadastrar sua conta pelo celular. Para seu filho realizar as atividades de criação, separe um computador ou notebook com internet, mouse e teclado.',
      'A atividade envolve acompanhar a orientação e manipular elementos do projeto. Ter esse equipamento pronto evita que vocês descubram essa necessidade só depois de iniciar o prazo de acesso.',
    ],
  },
  {
    id: 'horario',
    question: 'As aulas têm horário marcado?',
    visual: 'pausa',
    paragraphs: [
      'As aulas são gravadas. Durante o prazo de acesso, vocês escolhem o momento de entrar, podem pausar a explicação para fazer a atividade e voltar a um trecho quando precisarem.',
      'Isso ajuda quando seu filho precisa de mais tempo em um passo ou quando a rotina pede uma pausa. Combine um momento possível dentro dos sete dias; assistir mais rápido não é o objetivo, entender e testar faz parte do percurso.',
    ],
  },
  {
    id: 'ajuda',
    question: 'E se meu filho travar em uma atividade?',
    visual: 'recados',
    paragraphs: [
      'Durante os sete dias de acesso ao curso, seu filho pode pedir orientação pelo botão “Preciso de ajuda”, no rodapé de cada aula. Ao clicar, abre um campo para contar em que parte ficou com dúvida. Se ele precisar de companhia para escrever, vocês podem fazer isso juntos.',
      'Ajude-o a contar o que tentou e o que aconteceu na tela. Por exemplo: “Cliquei no arbusto, mas o personagem não apareceu. O que preciso conferir?”. Depois, é só clicar em “Enviar ao professor”. A plataforma envia junto a identificação da aula e da etapa em que ele está, para o professor saber de onde veio a dúvida.',
      'A resposta chega nos Recados, dentro da própria plataforma. É ali que vocês acompanham a orientação e continuam a conversa se ainda tiverem dúvidas. Esse atendimento acontece por mensagens e pode haver espera pela resposta.',
      'Você não precisa saber programar para participar desse momento. Pode ajudá-lo a mostrar onde parou, rever um trecho da explicação e organizar a pergunta. A dúvida sobre a atividade vai para o professor; você pode acompanhar seu filho sem ter que descobrir a resposta por conta própria.',
    ],
  },
  {
    id: 'prazo',
    question: 'Quando começam e terminam os sete dias?',
    visual: 'pausa',
    paragraphs: [
      'O prazo começa no cadastro aceito por este link, não no primeiro vídeo assistido. Depois da liberação, a confirmação mostra a data e a hora de vencimento. Criar ou recuperar a senha mais tarde não reinicia esse prazo.',
      'Se o convite faz parte de uma campanha, a data de encerramento dela é o limite para novos cadastros. Quem se cadastra dentro do prazo mantém seus sete dias, mesmo que a campanha termine no dia seguinte.',
    ],
  },
  {
    id: 'cartao',
    question: 'Vou precisar pagar ou cadastrar um cartão?',
    visual: null,
    paragraphs: [
      'Não. O presente é gratuito e este cadastro não pede cartão. Ao final dos sete dias, o acesso ao curso termina sem gerar cobrança ou assinatura automática.',
      'Se quiser continuar com a Comunidade dos Criadores, você conhecerá uma oferta separada e decidirá se deseja contratar. Não é preciso assinar para receber este presente.',
    ],
  },
  {
    id: 'publicar',
    question: 'Meu filho pode publicar o jogo dele e compartilhar com a família?',
    visual: 'mural',
    paragraphs: [
      'Sim. Durante os sete dias do presente, ele pode publicar o jogo que está criando no Cadê Todo Mundo?, cumprindo as atividades e seguindo a orientação da aula 2. A publicação faz parte dessa experiência de criar algo que outras pessoas podem jogar.',
      'Depois de publicar, vocês podem compartilhar o link com familiares e amigos. Quem recebe abre o jogo no navegador, sem precisar se cadastrar. Nesse período, seu filho também pode comentar e reagir às criações no Mural.',
      'O fim dos sete dias encerra a participação liberada pelo convite, mas não faz o link do jogo publicado vencer. Vocês continuam podendo jogar e compartilhar esse link enquanto a publicação estiver disponível.',
    ],
  },
  {
    id: 'inclui',
    question: 'O que fica disponível depois do curso?',
    visual: 'mural',
    paragraphs: [
      'Depois dos sete dias, sua conta continua podendo ver e jogar os jogos disponíveis no Mural dos Criadores enquanto ela existir. Publicar, comentar e reagir ficam liberados pelo convite somente durante os sete dias. Se seu filho publicou o jogo nesse período, o link continua funcionando enquanto a publicação estiver disponível, para vocês e para quem receber o link.',
      'Para continuar publicando, comentando e reagindo depois desse prazo, existe a assinatura da Comunidade dos Criadores, contratada separadamente. Ela também oferece outros cursos e ferramentas de criação, conforme os acessos e as etapas da plataforma.',
    ],
  },
  {
    id: 'conta',
    question: 'Já tenho conta ou já recebi esse presente. Posso usar o link?',
    visual: null,
    paragraphs: [
      'Se você tem conta e ainda não resgatou o presente, use o mesmo e-mail no cadastro. O acesso será associado à conta existente, e você entra com sua senha de sempre.',
      'Há um resgate por e-mail, considerando todos os links de convite e campanhas. Usar outro link não concede um novo período nem muda a origem do primeiro cadastro. Se o processo ficou incompleto, repetir o envio com o mesmo e-mail permite retomá-lo sem reiniciar os sete dias.',
    ],
  },
]

export const AMBASSADOR_SECTIONS = [
  section(
    'indicar',
    'Uma indicação que você consegue explicar',
    'Você conhece uma família que gostaria de experimentar isso?',
    [
      'Talvez seja o responsável por uma criança que adora jogos e pergunta como eles são feitos. Ou alguém que procura uma atividade de aprendizagem para parte do tempo de computador do filho. Seu convite pode oferecer um primeiro passo com uma tarefa concreta.',
      'Pelo seu link, a família recebe sete dias de Cadê Todo Mundo?, sem custo e sem cartão. A página apresenta a experiência e orienta o responsável a fazer o cadastro. Você não precisa cadastrar a criança de outra pessoa nem explicar sozinho todos os detalhes.',
    ],
    ['aula-estudio'],
  ),
  section(
    'compartilhar',
    'Do seu convite ao primeiro acesso',
    'Você envia o link. O responsável escolhe quando começar.',
    [
      'Compartilhe o link público do presente com uma família para quem ele faça sentido. Pode mandar uma mensagem pessoal contando por que lembrou daquela criança. Avise que ela precisará de um computador e que os sete dias começam no cadastro, para o adulto escolher um bom momento.',
      'O responsável abre a página, conhece o curso e usa os próprios dados para liberar o acesso. Depois, entra na plataforma com o filho. O seu painel registra os resgates concluídos; ele não expõe o nome ou os dados das crianças convidadas.',
    ],
    ['pausa'],
  ),
  section(
    'condicoes',
    'Um convite claro desde o começo',
    'A família recebe um presente. Continuar é uma escolha dela.',
    [
      'Durante os sete dias contados do cadastro, a criança pode fazer o curso, publicar o jogo que criou nele, comentar e reagir no Mural. Depois, continua podendo ver e jogar enquanto a conta existir. O link do jogo publicado continua funcionando enquanto a publicação estiver disponível. Outros cursos, ferramentas de criação livre e cópias de jogos não fazem parte do presente.',
      'Não há cartão nem assinatura automática. Se a família quiser conhecer a Comunidade dos Criadores depois, decide por conta própria. Essa clareza ajuda você a indicar com confiança e a família a saber exatamente o que está recebendo.',
    ],
    ['mural'],
  ),
] satisfies ComunidadeSection[]
