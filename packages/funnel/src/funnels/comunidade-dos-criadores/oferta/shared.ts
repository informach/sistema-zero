import type { ComunidadeFaqEntry } from './types'

export const SHARED_COPY = {
  founder: {
    id: 'origem',
    title: 'A Comunidade nasceu de uma experiência de criação em família',
    eyebrow: 'Uma experiência em família',
    layout: 'story',
    visuals: [],
    groups: [
      {
        title: null,
        paragraphs: [
          'Somos Helena e Júlio, desenvolvedores de sistemas e formados em Sistemas de Informação. A criação de jogos com nosso filho André trouxe para dentro de casa uma experiência que já fazia parte do nosso trabalho.',
          'Ele passou a nos chamar para testar regras, explicar escolhas e imaginar outra versão. Essa convivência deu origem à Comunidade dos Criadores e à decisão de preparar um começo guiado para outras crianças, em português.',
          'Na Comunidade, essa proposta toma forma nas aulas guiadas, nas ferramentas conectadas e nos projetos que a criança pode apresentar. Queremos que outras famílias possam conhecer o que seus filhos estão construindo: acompanhar uma tentativa, experimentar um jogo e ouvir a explicação de uma escolha.',
        ],
      },
    ],
    actions: [],
  },
  offer: {
    title: 'Um acesso para aprender, criar e acompanhar',
    paragraphs: [
      'A assinatura reúne os cursos publicados, as ferramentas de criação conforme a Jornada, os espaços da comunidade e o acompanhamento da família. Durante o período contratado, seu filho também tem acesso aos cursos que forem acrescentados à assinatura.',
      'Os dois planos permitem até dois perfis de criança, cada um com seus projetos e progresso. As aulas são gravadas, com acesso pelo navegador do computador e apoio por mensagens. O começo e as liberações seguem o mesmo percurso nos dois planos.',
    ],
    monthly: {
      title: 'Plano mensal',
      paragraphs: [
        'Cobrança mensal com renovação automática no cartão. Você pode cancelar a próxima renovação pela área do responsável. O acesso continua até o fim do período pago.',
      ],
      cta: 'Escolher o plano mensal',
    },
    annual: {
      title: 'Plano anual',
      paragraphs: [
        'O valor equivale a {{equivalente_mensal_anual}} por mês, considerando o total anual. O pagamento é anual: Pix à vista ou cobrança anual recorrente no cartão.',
        'No Pix, uma nova contratação é necessária ao fim dos 12 meses. No cartão, a renovação é automática e você pode cancelar a próxima cobrança pela área do responsável.',
      ],
      cta: 'Escolher o plano anual',
    },
    guarantee: {
      title: 'Sete dias para conhecer a experiência',
      paragraphs: [
        'Depois da contratação, vocês podem abrir a atividade de entrada, conhecer a orientação e observar como seu filho acompanha uma tarefa. Esse começo ajuda a avaliar o interesse e o apoio de que ele precisa na rotina de vocês.',
        'Na contratação inicial, você tem sete dias para solicitar o reembolso integral pelo canal indicado nos termos da assinatura. Esse prazo também vale para cada nova contratação anual via Pix. As renovações automáticas no cartão seguem as condições dos termos.',
        'Depois da garantia, cancelar a próxima renovação impede as próximas cobranças e preserva o acesso até o fim do período já pago. O pedido de reembolso é feito separadamente, pelo canal informado nos termos.',
      ],
    },
    checkout:
      'Ao escolher um plano, você informa seus dados, confere as condições e segue para o pagamento. O valor e a forma de renovação aparecem antes de concluir a contratação.',
  },
}

export const FAQ = {
  telas: {
    question: 'A proposta é aumentar o tempo de tela do meu filho?',
    paragraphs: [
      'A proposta é reservar parte do tempo que a família já permite para aprender criando. Vocês continuam definindo os dias e a duração da atividade. As aulas gravadas permitem pausar a explicação e organizar a prática dentro desses combinados.',
      'O que muda é a tarefa naquele período. Ao montar uma regra, testar o jogo e explicar uma escolha, a criança participa de uma construção que vocês podem conhecer. É nesse uso do computador que a Comunidade concentra sua proposta educativa.',
    ],
  },
  aprendizagem: {
    question: 'Como percebo se ele está entendendo o que faz?',
    paragraphs: [
      'O painel do responsável reúne cursos, atividades, entregas e temas explorados. Ele ajuda a localizar uma produção para conhecer com seu filho. O passo seguinte é pedir que ele mostre uma decisão: qual regra usou, o que esperava que acontecesse e como conferiu o resultado.',
      'Por exemplo, se mudou a pontuação de um jogo, pode mostrar o valor no comando e jogar para verificar o placar. Essa ligação entre a escolha e o efeito oferece uma referência concreta sobre o que compreendeu. Uma marca de conclusão registra que a etapa foi cumprida; a explicação, os testes e as alterações acrescentam informações sobre a aprendizagem.',
    ],
  },
  'aulas-gravadas': {
    question: 'Como meu filho acompanha uma aula gravada?',
    paragraphs: [
      'A aula apresenta uma tarefa que seu filho pode acompanhar por partes. Ele vê a ação, pausa para fazê-la e testa o resultado. Se perdeu onde um comando foi colocado, volta àquele trecho. Nas atividades integradas, a explicação fica junto do editor ou do experimento, para consultar durante a prática.',
      'Isso dá espaço para o tempo de cada tentativa. A criança pode rever o que precisa, conferir a montagem e só então continuar. Quando fica com uma dúvida, tem o caminho dos Recados para pedir ajuda por mensagens.',
      'Vocês podem acompanhar a primeira atividade para conhecer os controles e perceber como ele usa a orientação. A independência é construída no uso; algumas crianças precisam de mais companhia no começo. O formato oferece esses apoios, sem exigir que todas consigam fazer tudo sozinhas desde o primeiro acesso.',
    ],
  },
  pais: {
    question: 'Eu preciso saber programação para ajudar meu filho?',
    paragraphs: [
      'Não. A orientação de programação está nas aulas, com os passos da montagem e o resultado que a criança deve observar. As dúvidas da atividade podem ser enviadas pelos Recados. Você pode ajudar a organizar o horário e conhecer os controles com seu filho nas primeiras atividades.',
      'Para participar depois, uma pergunta simples já abre conversa: “Me mostra o que você mudou?”. Ele pode apontar a regra e executar o jogo para explicar. Você conhece o trabalho pelo que ele mostra, sem ter de preparar ou ensinar o conteúdo da aula.',
    ],
  },
  ajuda: {
    question: 'O que ele faz quando fica com uma dúvida na atividade?',
    paragraphs: [
      'Na seção da aula, seu filho pode usar “Preciso de ajuda” para enviar a dúvida. É útil contar o que estava tentando fazer e o que aconteceu. A conversa continua nos Recados, com histórico para consultar quando voltar à tarefa.',
      'Esse caminho ajuda a relacionar a pergunta à atividade em que a dificuldade apareceu. O atendimento acontece por mensagens, de forma assíncrona: a criança pode precisar aguardar o retorno. Enquanto isso, a explicação da aula continua disponível para revisão. Se a dúvida for sobre usar uma ferramenta, o Como fazer reúne tutoriais para consulta.',
    ],
  },
  interesse: {
    question: 'E se ele já começou outras atividades e desistiu?',
    paragraphs: [
      'Vale descobrir o que tornou difícil continuar: a atividade não interessou, a orientação ficou confusa, o nível era inadequado ou o horário não cabia na rotina? Cada motivo pede um apoio diferente.',
      'Aqui, as tarefas guiadas oferecem um começo, a explicação pode ser revista e os Recados permitem pedir ajuda. As aulas gravadas deixam a família escolher o horário. Esses recursos lidam com dificuldades práticas de participação, mas o interesse do seu filho também conta. Mostre a demonstração e conversem sobre uma criação que ele gostaria de tentar, sem transformar uma desistência anterior numa obrigação de acertar agora.',
    ],
  },
  programacao: {
    question: 'Meu filho precisa saber programar para começar?',
    paragraphs: [
      'Não. O começo foi preparado para apresentar programação em blocos. A aula mostra onde encontrar uma instrução, como encaixá-la e o que observar quando o jogo roda. Seu filho pode pausar a explicação para executar cada passo e rever o trecho que precisar.',
      'Os personagens e outros elementos preparados permitem começar por uma tarefa concreta, como montar um movimento. Assim, ele tem uma ação para realizar e um resultado para conferir enquanto conhece os comandos. O requisito inicial é conseguir ler e usar mouse e teclado.',
    ],
  },
  desenho: {
    question: 'Meu filho precisa saber desenhar para criar os jogos?',
    paragraphs: [
      'Não. Seu filho pode usar personagens, objetos e cenários preparados. Isso permite dedicar a atenção às regras: fazer um personagem se mover, responder a uma tecla ou interagir com outro objeto. Ele consegue participar dessa construção usando a arte disponível na atividade.',
      'Se quiser criar a própria aparência, o Pinta oferece ferramentas para experimentar formas, cores e desenhos digitais. Também é possível combinar uma criação própria com elementos prontos. A criança escolhe quanto quer explorar a parte visual conforme a atividade e as ferramentas já liberadas.',
    ],
  },
  'so-desenho': {
    question: 'A Comunidade serve para quem quer apenas desenhar?',
    paragraphs: [
      'A Comunidade combina desenho digital e criação de jogos. Seu filho pode criar a aparência de um personagem no Pinta e aprender, no Estúdio, a regra que faz esse personagem responder a uma tecla ou a um acontecimento da partida.',
      'Essa ligação pode interessar a quem gosta de inventar personagens e quer experimentar o que eles fazem. Vale mostrar as duas partes à criança: a criação visual e a montagem das interações. Se ela procura apenas aulas de desenho, a proposta da Comunidade é mais ampla e precisa combinar com essa disposição para explorar programação.',
    ],
  },
  papel: {
    question: 'Ele pode aproveitar uma ideia que desenhou no papel?',
    paragraphs: [
      'Sim. Uma ideia do caderno pode servir de referência para criar sua versão digital no Pinta. Seu filho pode começar pelo formato do personagem, escolher as cores e ajustar detalhes enquanto conhece as ferramentas. Uma arte compatível pode então ser levada ao Estúdio.',
      'Para participar de um jogo, o personagem precisa de regras: como se move e o que acontece quando encontra um objeto, por exemplo. Essa parte é construída com programação. Fotografar o desenho, por si só, não cria as interações; a graça da proposta está também em aprender a construí-las.',
    ],
  },
  nivel: {
    question: 'A Comunidade combina com uma criança que já programa?',
    paragraphs: [
      'Depende do que ele já conhece e do que quer construir. A entrada apresenta programação em blocos no Estúdio, com orientação para os primeiros projetos. Uma criança que já usa esses conceitos pode achar esse começo familiar.',
      'Comparem uma atividade inicial e o catálogo publicado com a experiência dele: há algo que quer construir ou aprender ali? Os recursos avançados têm requisitos próprios. É importante considerar o que está acessível hoje, pois a presença de uma ferramenta na Jornada não significa liberação imediata.',
    ],
  },
  roblox: {
    question: 'As aulas ensinam a criar no Roblox Studio?',
    paragraphs: [
      'As primeiras construções acontecem no Estúdio da Comunidade, com programação em blocos. Se o objetivo do seu filho é aprender especificamente Roblox Studio, considere essa diferença antes de escolher. A demonstração mostra a ferramenta e o tipo de projeto que ele encontra aqui.',
    ],
  },
  'apoio-especifico': {
    question: 'Como avaliar se meu filho precisa de um apoio que a Comunidade não oferece?',
    paragraphs: [
      'Conheçam uma atividade representativa e observem como seu filho acompanha a leitura, usa os controles e realiza a tarefa. Pausa, revisão e os apoios presentes na aula podem ser úteis, mas a adequação depende da necessidade concreta da criança.',
      'A equipe pode esclarecer os recursos disponíveis para essa avaliação. Se ele precisa de acompanhamento especializado ou adaptações individuais, conversem sobre isso antes de contratar para verificar o que pode ser atendido. A observação de uma tarefa oferece uma referência melhor do que presumir adequação apenas pela idade.',
    ],
  },
  catalogo: {
    question: 'Quais cursos entram na assinatura?',
    paragraphs: [
      'A assinatura inclui os cursos publicados e os que forem acrescentados durante o período contratado. No catálogo, vocês podem conhecer o tema e a sequência disponíveis para começar. A Jornada mostra os requisitos para avançar e liberar ferramentas.',
      'A Comunidade está em lançamento, com outras etapas em preparação. Um recurso aparecer no mapa do percurso não significa que todos os cursos necessários para chegar até ele já estejam disponíveis. Vale escolher considerando as atividades que seu filho pode realizar agora e tratar as próximas publicações como continuidade.',
    ],
  },
  liberacao: {
    question: 'Todas as ferramentas ficam abertas no primeiro dia?',
    paragraphs: [
      'O começo usa os recursos preparados para cada aula. Depois de concluir o curso obrigatório de entrada e publicar o projeto exigido, seu filho alcança o posto Construtor e libera o uso livre do Estúdio e do Pinta. Assim, a primeira experiência oferece orientação antes de ele explorar essas ferramentas por conta própria.',
      'No Inventor, entram o Pensa e a ajuda do Zappy no Estúdio. No Explorador de Mundos, começa o acesso ao Molda. A Jornada mostra os requisitos de cada etapa. Algumas ainda dependem de cursos em preparação, por isso o catálogo publicado é a referência para saber até onde ele pode avançar hoje.',
    ],
  },
  ia: {
    question: 'A inteligência artificial faz o projeto pela criança?',
    paragraphs: [
      'A inteligência artificial pode ajudar a esclarecer uma dúvida, organizar uma ideia e sugerir caminhos. Para aprender criando, a criança precisa participar das decisões: escolher o que quer fazer, experimentar e entender o resultado. Receber uma solução pronta e aceitar tudo sem conferir deixa essas oportunidades de fora.',
      'É por isso que, na Comunidade, o Pensa e o Zappy têm funções de apoio. O Pensa ajuda seu filho a transformar a ideia em um planejamento, fazendo perguntas e organizando suas escolhas. O Zappy, no Estúdio, ajuda a entender comandos e dificuldades da construção; ele não altera o projeto pela criança.',
      'Seu filho continua responsável por escolher, montar e testar. Se uma sugestão aparecer, pode compará-la com o que imaginou e conferir se funciona. A proposta é aprender a usar essa ajuda com critério. A inteligência artificial também pode errar, e suas respostas precisam ser verificadas durante a criação.',
    ],
  },
  pensa: {
    question: 'O que meu filho faz no Pensa?',
    paragraphs: [
      'O Pensa é um espaço para transformar uma ideia de jogo em um plano de criação. Ele conduz uma conversa sobre decisões como o objetivo do jogador, os controles e o que faz a partida terminar. Pode explicar uma pergunta, oferecer alternativas e organizar o que a criança escolheu.',
      'Imagine que seu filho quer criar um jogo de um gato que recolhe estrelas. A conversa ajuda a definir como mover o gato, o que conta como vitória e o que precisa existir na fase. A partir das escolhas registradas, o Pensa ajuda a organizar o trabalho em tarefas, com orientações para seguir às ferramentas de criação.',
      'Seu filho continua fazendo as escolhas sobre a ideia e construindo o projeto. O plano dá uma referência para começar por uma parte, conferir o que fez e decidir o próximo passo. O recurso é liberado no posto Inventor e depende dos requisitos da Jornada, da disponibilidade do serviço e dos créditos de uso.',
    ],
  },
  zappy: {
    question: 'Como o Zappy ajuda durante a criação no Estúdio?',
    paragraphs: [
      'O Zappy oferece ajuda com inteligência artificial dentro do Estúdio. Ele pode considerar os blocos do projeto, o comando selecionado e o erro apresentado para explicar uma dúvida. Conforme a pergunta, também pode apontar uma aula ou um tutorial acessível à criança.',
      'Se o personagem não se move como ela esperava, por exemplo, seu filho pode explicar o que tentou. O Zappy pode ajudar a examinar os comandos e sugerir o que conferir. Ele não muda os blocos nem executa a correção no projeto: a criança faz o ajuste e testa o resultado.',
      'É uma ajuda para investigar a dificuldade. A resposta pode precisar de conferência, e a criança também tem os Recados para pedir apoio à equipe. A ajuda do Zappy no Estúdio é liberada no posto Inventor e depende dos requisitos, da disponibilidade do serviço e dos créditos da família.',
    ],
  },
  creditos: {
    question: 'O uso dos recursos de inteligência artificial é ilimitado?',
    paragraphs: [
      'Não. Os recursos de inteligência artificial usam créditos compartilhados entre os perfis da família. O responsável pode consultar o saldo na sua área. Ter dois perfis, portanto, não significa ter dois saldos independentes.',
      'O acesso ao Pensa e ao Zappy também depende da etapa da Jornada e da disponibilidade do serviço. As aulas, os materiais de consulta e o caminho de ajuda por Recados têm funções próprias; o apoio da inteligência artificial é um recurso adicional dentro dessa experiência.',
    ],
  },
  planejamento: {
    question: 'Duas crianças podem planejar um jogo juntas?',
    paragraphs: [
      'Sim, pelo Pensa, quando os participantes têm acesso ao recurso. Elas podem compartilhar o planejamento para organizar a ideia, as decisões e as tarefas. Isso dá uma referência comum sobre o que querem construir.',
      'Cada criança trabalha nas próprias ferramentas. O compartilhamento se refere ao plano; ele não permite que as duas editem simultaneamente o mesmo jogo. O Clube também oferece espaço para conversar sobre criações por publicações e respostas.',
    ],
  },
  '3d': {
    question: 'Quando ele pode começar a criar em três dimensões?',
    paragraphs: [
      'O Molda abre possibilidades de criação em três dimensões a partir do posto Explorador de Mundos. O acesso depende dos requisitos e dos cursos necessários para alcançar essa etapa. Confira o percurso publicado antes de escolher a assinatura por esse recurso.',
    ],
  },
  codigo: {
    question: 'Ele também pode conhecer a programação por código?',
    paragraphs: [
      'Há recursos que relacionam blocos e código em etapas avançadas da Jornada. O começo da Comunidade acontece com blocos. Para avaliar essa continuidade, confira os requisitos e os cursos publicados que permitem chegar à etapa desejada. A proposta é uma iniciação por projetos, sem equivaler a uma formação profissional completa.',
    ],
  },
  desafio: {
    question: 'Ele já começou pelo Desafio. Precisa repetir o que concluiu?',
    paragraphs: [
      'Pode continuar na mesma conta, do ponto registrado e conforme seu acesso. Se ainda faltar concluir uma etapa ou publicar o projeto exigido, a Jornada indica esse próximo passo.',
    ],
  },
  certificado: {
    question: 'Os cursos têm certificado?',
    paragraphs: [
      'Há certificado nos cursos que o oferecem, após cumprir os requisitos de conclusão. Consulte essa informação no curso escolhido. O certificado registra a etapa concluída; as produções permitem conhecer o trabalho realizado nela.',
    ],
  },
  custos: {
    question: 'Preciso comprar as ferramentas separadamente?',
    paragraphs: [
      'As ferramentas da Comunidade fazem parte da assinatura, sem uma compra adicional para desbloqueá-las. O que libera cada recurso é a etapa da Jornada e o cumprimento dos requisitos correspondentes.',
      'Os recursos de inteligência artificial têm limites de créditos, consultáveis na área do responsável. Por isso, vale distinguir o que está incluído, quando fica disponível e quanto pode ser usado. Os dois planos seguem o mesmo percurso de liberação.',
    ],
  },
  equipamento: {
    question: 'De que equipamento ele precisa?',
    paragraphs: [
      'De um computador com internet, navegador, mouse e teclado. As atividades de criação são pensadas para esse uso; celular e tablet não são os equipamentos indicados para acompanhar o curso. Se houver dúvida sobre o computador da família, descreva o equipamento à equipe antes de contratar.',
    ],
  },
  internet: {
    question: 'A Comunidade funciona sem internet?',
    paragraphs: [
      'A experiência precisa de conexão para acessar aulas, conta, mensagens e serviços. Se a internet cair durante a criação, confira o aviso de salvamento. Quando a conexão voltar, confirme que o trabalho foi guardado na conta antes de fechar ou trocar de computador. Um rascunho local pode estar apenas naquele navegador.',
    ],
  },
  salvamento: {
    question: 'Como ele guarda uma criação para continuar depois?',
    paragraphs: [
      'Antes de sair da ferramenta, seu filho confere o aviso de salvamento e se a criação ficou guardada na conta. Na próxima sessão, pode abrir o trabalho salvo na galeria e continuar. Essa conferência é especialmente importante antes de trocar de computador.',
      'Se o aviso indicar apenas uma cópia local ou um problema de conexão, confirme a sincronização quando a internet voltar. Um rascunho local pode estar apenas naquele navegador. Guardar o projeto na conta é o que permite contar com aquela versão ao acessar por outro aparelho.',
    ],
  },
  exportacao: {
    question: 'É possível baixar uma cópia do que ele criou?',
    paragraphs: [
      'As ferramentas oferecem exportação nos formatos compatíveis com cada trabalho. Vale escolher o arquivo conforme o que vocês querem fazer: uma imagem serve para mostrar a arte; um arquivo editável pode permitir continuar a criação em uma ferramenta compatível.',
      'Baixar uma cópia e manter acesso à Comunidade são coisas diferentes. O acesso às ferramentas acompanha o período da assinatura. Antes de depender de um arquivo fora da plataforma, confira o formato e onde ele pode ser aberto; o download não garante que toda a experiência do projeto funcione em qualquer programa.',
    ],
  },
  ferias: {
    question: 'Como funciona uma pausa durante as férias?',
    paragraphs: [
      'Vocês escolhem quando acessar as aulas durante o período contratado. O modo férias registra uma pausa e protege a sequência de participação da criança. Ele não suspende a cobrança nem acrescenta dias ao plano. Ao voltar, ela encontra o percurso registrado e pode retomar os trabalhos guardados.',
    ],
  },
  pontos: {
    question: 'Meu filho precisa entrar todos os dias para ganhar pontos?',
    paragraphs: [
      'Vocês podem organizar a atividade nos dias combinados em casa. Missões, moedas, pontos e ligas registram formas de participação, e algumas dependem da frequência. Esses elementos dão referências de conquistas e personalização do espaço da criança.',
      'A família continua definindo o tempo de uso. O projeto é uma referência mais útil para conversar sobre aprendizagem: o que ela construiu, o que testou e o que consegue explicar. Uma sequência de acessos ou uma pontuação, sozinha, não responde a essas perguntas.',
    ],
  },
  irmaos: {
    question: 'Uma assinatura atende meus dois filhos?',
    paragraphs: [
      'Sim. Os planos mensal e anual permitem até dois perfis de criança. Cada um mantém seus projetos e seu progresso. Um irmão pode voltar ao desenho enquanto o outro continua a montagem de uma regra, nos horários que a família organizar.',
      'O conjunto de recursos é o mesmo, mas as liberações acompanham o percurso de cada perfil. Os créditos de inteligência artificial são compartilhados pela família. Isso permite acompanhar as crianças separadamente e conhecer o uso desses recursos na mesma área do responsável.',
    ],
  },
  perfil: {
    question: 'Quem decide se o perfil do meu filho aparece para os colegas?',
    paragraphs: [
      'O responsável administra essa opção, que começa desligada para os colegas. Vocês podem revisar a configuração na área da família e combinar o que a criança vai mostrar. Essa escolha se refere ao perfil; os jogos publicados por link têm visibilidade própria.',
    ],
  },
  'jogos-publicos': {
    question: 'Quem pode abrir um jogo que meu filho publica por link?',
    paragraphs: [
      'O link de um jogo publicado é público. Quem o recebe pode abrir a criação em um aparelho compatível com os controles do jogo. Ter o perfil oculto para os colegas não torna esse link privado. Combinem quais projetos publicar e com quem compartilhar.',
    ],
  },
  convivencia: {
    question: 'Como a criança pede ajuda se uma conversa no Clube a incomodar?',
    paragraphs: [
      'O Clube tem combinados de convivência e um caminho para avisar a equipe sobre algo que precise de atenção. Conheçam esses recursos juntos e combinem que seu filho também procure você quando uma conversa o deixar desconfortável.',
      'As publicações e respostas oferecem espaço para falar de ideias e projetos. Os combinados e o canal de aviso apoiam essa participação; acompanhar o que a criança compartilha e com quem conversa continua fazendo parte do cuidado da família.',
    ],
  },
  indicacao: {
    question: 'Como apresento a experiência a outra família?',
    paragraphs: [
      'Na área do responsável, consulte o programa de indicações e copie seu link. O convite e os benefícios seguem as condições da campanha apresentada ali. Confira essas condições antes de dizer à outra família o que ela receberá.',
    ],
  },
  atendimento: {
    question: 'Como falo com a equipe de atendimento?',
    paragraphs: [
      'Use o atendimento na área do responsável e descreva o que precisa resolver. O histórico permite consultar a conversa com a equipe. As dúvidas da criança sobre uma atividade seguem pelos Recados, ligados à experiência de aprendizagem.',
    ],
  },
  senha: {
    question: 'Como recupero a senha da conta?',
    paragraphs: [
      'Na tela de entrada, use a opção de recuperação de senha e informe o e-mail da conta. Siga as instruções recebidas para definir uma nova senha e voltar ao acesso.',
    ],
  },
  cancelamento: {
    question: 'Como cancelo a próxima renovação?',
    paragraphs: [
      'Abra a área do responsável, entre em Minhas compras e use a opção de cancelamento da renovação. O acesso continua até o fim do período já pago. No plano anual por Pix, o acesso termina ao fim dos 12 meses e uma nova contratação é necessária para continuar.',
    ],
  },
  reembolso: {
    question: 'Como solicito o reembolso dentro da garantia?',
    paragraphs: [
      'Na contratação inicial, você tem sete dias para solicitar o reembolso integral pelo canal indicado nos termos, informando o e-mail da compra. O prazo também vale para cada nova contratação anual por Pix. Renovações automáticas no cartão seguem as condições dos termos. O pedido de reembolso é separado do cancelamento da próxima renovação.',
    ],
  },
} satisfies Record<string, ComunidadeFaqEntry>
