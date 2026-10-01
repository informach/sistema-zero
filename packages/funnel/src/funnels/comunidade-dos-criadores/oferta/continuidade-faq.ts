import type { ComunidadeFaqEntry } from './types'

// Copy aprovada: docs/marketing/kids/comunidade-dos-criadores/copy/pagina-e-continuidade.md
export const CONTINUIDADE_FAQ = {
  continuidade: {
    question: 'Já temos um curso. O que a assinatura acrescenta?',
    paragraphs: [
      'O acesso de entrada permite usar o curso e os recursos previstos naquela oferta. A assinatura reúne os cursos Kids publicados, as ferramentas de criação conforme as etapas, o Clube e os demais recursos da Comunidade durante o plano, com até dois perfis de criança. Os demais cursos pertencem à Comunidade; você não precisa fazer uma nova compra para cada um. Novos cursos publicados durante o plano também entram no acesso.',
      'O Estúdio e o Pinta livres, por exemplo, permitem desenvolver criações além da tarefa preparada na aula depois da entrada obrigatória e da publicação exigida. Seu filho pode desenhar um personagem, trazê-lo para um projeto e testar uma regra. A [demonstração de continuidade](#proximo-passo) explica essa passagem.',
      'A conta, o perfil e o progresso já registrado permanecem ligados à família. Direitos recebidos anteriormente, como uma visita ao Mural incluída no convite, seguem suas próprias condições.',
    ],
  },
  'proximo-passo': {
    question: 'O que meu filho pode fazer em seguida?',
    paragraphs: [
      'Se está no meio de uma atividade, pode retomá-la durante o acesso e consultar a explicação para continuar a montagem. Se concluiu apenas o Cadê Todo Mundo, o curso obrigatório de entrada e sua publicação exigida são o caminho para chegar ao uso livre das ferramentas.',
      'Com essa entrada concluída, o projeto exigido publicado e a assinatura ativa, o posto Construtor permite usar o Estúdio e o Pinta livres. Uma atividade possível é criar a aparência de um personagem no Pinta, trazê-lo para um projeto no Estúdio e montar uma regra de movimento. Depois, testar uma alteração e guardar a versão para continuar.',
      'Esse exemplo mostra uma possibilidade concreta das ferramentas dessa etapa. Os cursos e recursos posteriores têm sua própria sequência; a [explicação do próximo passo](#proximo-passo) distingue essas situações.',
    ],
  },
  'conta-existente': {
    question: 'Preciso criar outra conta para assinar?',
    paragraphs: [
      'Não, se sua família já tem uma conta. Use o mesmo e-mail do responsável e continue no perfil da criança. A assinatura acrescenta o acesso à conta, mantendo a ligação com o progresso registrado.',
      'Se esqueceu a senha, use a recuperação na tela de entrada. Se o curso ficou numa conta com outro e-mail, fale com o atendimento antes de contratar para esclarecer como continuar. Quem ainda não tem conta pode informar os dados do responsável na contratação e seguir as orientações de acesso.',
    ],
  },
  liberacao: {
    question: 'Todas as ferramentas ficam abertas no primeiro dia?',
    paragraphs: [
      'Não. No começo, seu filho usa os recursos preparados para cada aula. O uso livre do Estúdio e do Pinta começa depois de concluir o curso obrigatório de entrada e publicar o projeto exigido, no posto Construtor, com acesso válido.',
      'No Inventor, entram o Pensa e a ajuda do Zappy no Estúdio. No Explorador de Mundos, começa o acesso ao Molda. Algumas etapas ainda dependem de cursos em preparação. A assinatura inclui os recursos, mas cada ferramenta exige o avanço correspondente e a disponibilidade do percurso que leva até ela.',
    ],
  },
  ajuda: {
    question: 'Meu filho travou numa atividade. Como ele recebe ajuda?',
    paragraphs: [
      'Na seção da aula, ele pode usar “Preciso de ajuda” para contar o que tentou fazer e o que aconteceu. A conversa continua nos Recados, com histórico e referência à atividade. A equipe responde por mensagens, e pode ser necessário aguardar o retorno.',
      'Enquanto isso, a explicação da aula pode ser revista durante o acesso. Se a dificuldade for localizar uma ferramenta ou repetir uma ação, os tutoriais do Como fazer também servem de consulta. Você pode ajudar seu filho a descrever a dúvida, especialmente nas primeiras atividades.',
      'O formato não inclui encontros ao vivo. Se uma dúvida já apareceu no primeiro curso, vale usar os caminhos de ajuda disponíveis naquele acesso e entender onde a criança travou antes de decidir pela continuidade.',
    ],
  },
  aprendizagem: {
    question: 'Como percebo se ele está entendendo o que faz?',
    paragraphs: [
      'O painel do responsável reúne cursos, atividades, entregas e temas explorados. Ele ajuda a localizar uma produção para conhecer com seu filho. O passo seguinte é pedir que ele mostre uma decisão: qual regra usou, o que esperava que acontecesse e como conferiu o resultado.',
      'Por exemplo, se mudou a pontuação de um jogo, pode mostrar o valor no comando e jogar para verificar o placar. Essa ligação entre a escolha e o efeito oferece uma referência concreta sobre o que compreendeu. Uma marca de conclusão registra que a etapa foi cumprida; a explicação, os testes e as alterações acrescentam informações sobre a aprendizagem.',
    ],
  },
  interesse: {
    question: 'Ele começou o curso e perdeu o interesse. O que a assinatura muda?',
    paragraphs: [
      'A assinatura amplia o acesso ao conjunto da Comunidade. Ela não garante, por si só, que a criança passe a gostar da atividade. Antes de contratar, conversem sobre o que seu filho gostaria de construir e relacionem esse interesse a uma possibilidade concreta da plataforma.',
      'Uma criança interessada em personagens pode querer explorar a passagem do Pinta ao Estúdio quando chegar ao posto Construtor. Outra pode preferir experimentar uma regra do jogo. Mostrar a atividade e ouvir o que ela quer tentar ajuda mais do que escolher apenas pela quantidade de recursos.',
      'Se a questão é falta de interesse, essa conversa merece espaço próprio. Se ele quer continuar, mas não consegue realizar uma ação, a resposta sobre [ajuda na atividade](#duvida-ajuda) explica os apoios para essa dificuldade.',
    ],
  },
  'cade-todo-mundo': {
    question: 'Concluir o Cadê Todo Mundo libera o uso livre do Estúdio e do Pinta?',
    paragraphs: [
      'Não. O Cadê Todo Mundo é um curso extra, com uma criação guiada dentro da aula. Se seu filho o concluiu, esse trabalho fica registrado no perfil. Para abrir o Estúdio e o Pinta livres, ele precisa concluir o curso obrigatório de entrada da Jornada e publicar o projeto exigido, chegando ao posto Construtor.',
      'A assinatura inclui essas ferramentas. Cumprir a etapa é o que permite usá-las fora das atividades guiadas. O registro do curso extra permanece, sem substituir a entrada obrigatória.',
    ],
  },
  desafio: {
    question: 'Meu filho já fez o Desafio. Precisa repetir o que concluiu?',
    paragraphs: [
      'Não precisa repetir o que já ficou registrado como concluído no mesmo perfil. A Jornada mostra o que falta para avançar, como uma atividade pendente ou a publicação do projeto exigido.',
      'A assinatura mantém a continuidade na conta. As ferramentas ficam disponíveis conforme o acesso contratado e as etapas cumpridas por seu filho. Se ainda falta terminar ou publicar, ele segue por esse ponto.',
    ],
  },
  'acesso-vencido': {
    question: 'O acesso ao curso venceu. Perdemos o progresso?',
    paragraphs: [
      'O vencimento do acesso não apaga por si só o progresso registrado. As aulas e ferramentas dependem de um acesso válido, mas os registros permanecem armazenados conforme os termos e a política de privacidade.',
      'Use a mesma conta para retomar com um novo acesso que inclua o curso, respeitando as etapas da Jornada. Se não localizar o perfil ou o trabalho esperado, fale com o atendimento antes de fazer outro cadastro. A assinatura não exige começar tudo novamente em outro perfil.',
    ],
  },
  'curso-em-andamento': {
    question: 'Preciso assinar para terminar um curso que ainda está no prazo?',
    paragraphs: [
      'Você pode usar o acesso já concedido dentro do prazo e das condições daquela oferta. O convite para conhecer a Comunidade não retira esse direito nem obriga a antecipar uma contratação.',
      'Se a criança está no meio do curso, essa experiência pode ajudar a avaliar o interesse e o formato. A assinatura é uma escolha para acessar o conjunto da Comunidade e continuar conforme o percurso disponível.',
    ],
  },
  'visita-mural': {
    question: 'A visita ao Mural que recebemos com o curso depende da assinatura?',
    paragraphs: [
      'Se o convite de vocês inclui visita permanente ao Mural, essa visita continua válida depois que o prazo do curso termina. Ela não exige uma assinatura da Comunidade. Convites mais antigos podem ter outras condições; vale o que estava incluído no convite recebido.',
      'A assinatura acrescenta outros acessos e possibilidades. Uma visita já recebida não se torna uma obrigação de pagamento por causa deste convite. Se houver dúvida sobre o acesso da família, o atendimento pode esclarecer o que está incluído na conta.',
    ],
  },
  'idade-continuidade': {
    question:
      'Meu filho recebeu um curso, mas está fora da faixa de 9 a 14 anos. A Comunidade serve para ele?',
    paragraphs: [
      'A recomendação desta oferta é de 9 a 14 anos. Ter recebido um curso de entrada não define, por si só, a adequação de todo o percurso. É preciso considerar a leitura, o uso dos controles, o interesse e o apoio de que a criança precisa.',
      'Conversem com a equipe e conheçam uma atividade representativa antes de contratar. Essa avaliação ajuda a entender o formato disponível e as necessidades da família.',
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
  telas: {
    question: 'A proposta é aumentar o tempo de tela do meu filho?',
    paragraphs: [
      'A proposta é reservar parte do tempo que a família já permite para aprender criando. Vocês continuam definindo os dias e a duração da atividade. As aulas gravadas permitem pausar a explicação e organizar a prática dentro desses combinados.',
      'O que muda é a tarefa naquele período. Ao montar uma regra, testar o jogo e explicar uma escolha, a criança participa de uma construção que vocês podem conhecer. É nesse uso do computador que a Comunidade concentra sua proposta educativa.',
    ],
  },
  catalogo: {
    question: 'Quais cursos entram na assinatura?',
    paragraphs: [
      'Entram os cursos Kids publicados e os que forem acrescentados à assinatura durante o período contratado. Cadê Todo Mundo e Desafio do Primeiro Jogo têm ofertas de entrada próprias; os demais cursos fazem parte da Comunidade e não exigem uma compra separada para cada título.',
      'As atividades seguem os requisitos da Jornada. Os cursos ainda em preparação passam a fazer parte do acesso quando forem publicados durante o plano. Você pode conhecer novos projetos dentro da mesma assinatura, sem depender de uma nova oferta a cada lançamento.',
      'A presença de um recurso no mapa não significa que todos os cursos necessários para alcançá-lo já estejam disponíveis. Para entender uma continuidade concreta nas ferramentas, veja o [exemplo de criação no posto Construtor](#proximo-passo). Dentro da plataforma, a Jornada mostra os cursos e o ponto de cada criança.',
    ],
  },
  custos: {
    question: 'Preciso comprar as ferramentas separadamente?',
    paragraphs: [
      'As ferramentas da Comunidade fazem parte da assinatura, sem uma compra adicional para desbloqueá-las. O que libera cada recurso é a etapa da Jornada e o cumprimento dos requisitos correspondentes.',
      'Os recursos de inteligência artificial têm limites de créditos, consultáveis na área do responsável. Por isso, vale distinguir o que está incluído, quando fica disponível e quanto pode ser usado. Os dois planos seguem o mesmo percurso de liberação.',
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
  certificado: {
    question: 'Os cursos têm certificado?',
    paragraphs: [
      'Há certificado nos cursos que o oferecem, após cumprir os requisitos de conclusão. Consulte essa informação no curso escolhido. O certificado registra a etapa concluída; as produções permitem conhecer o trabalho realizado nela.',
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
      'Para acessar as aulas, a conta, as mensagens e os serviços, é preciso estar conectado. Se a internet cair durante uma criação, confira o aviso de salvamento e evite fechar a ferramenta ou trocar de computador antes de confirmar que o trabalho ficou guardado na conta.',
      'Quando a conexão voltar, confira a sincronização. Se houver apenas um rascunho local, aquela versão pode estar somente no navegador em que seu filho trabalhou.',
    ],
  },
  salvamento: {
    question: 'Como ele guarda uma criação para continuar depois?',
    paragraphs: [
      'Antes de sair da ferramenta, seu filho confere o aviso de salvamento e se a criação ficou guardada na conta. Na próxima sessão, abre o trabalho salvo na galeria e continua. Assim, pode dividir a criação em partes e voltar ao que já fez.',
      'Essa conferência é especialmente importante antes de trocar de computador. Se aparecer um problema de conexão ou o aviso indicar apenas uma cópia local, confirme o salvamento na conta quando a internet voltar. A resposta sobre [uso com internet](#duvida-internet) explica esse cuidado.',
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
  'inicio-assinatura': {
    question: 'Se eu assinar antes de terminar o prazo do curso, quando começa a assinatura?',
    paragraphs: [
      'O período da assinatura começa com a aprovação do pagamento. Os dias que ainda restam do curso de entrada não adiam esse início nem são acrescentados automaticamente ao novo plano.',
      'Você pode continuar usando o curso dentro do prazo recebido antes de decidir pela assinatura. Se contratar enquanto os dois acessos estiverem válidos, cada um segue suas próprias condições. Confira o plano, o período e a renovação no resumo da contratação.',
    ],
  },
  'valor-anterior': {
    question: 'O valor que paguei por um curso vira desconto na assinatura?',
    paragraphs: [
      'Esta oferta não prevê abatimento automático de uma compra anterior. O curso adquirido mantém suas próprias condições, e a assinatura tem os valores e o período apresentados nos planos.',
      'Se vocês receberam alguma condição comercial específica, confiram sua validade e como ela aparece antes de concluir o pagamento. Não considerem um crédito ou uma extensão de prazo que não esteja informado na oferta.',
    ],
  },
  atendimento: {
    question: 'Como falo com a equipe de atendimento?',
    paragraphs: [
      'Na área do responsável, abra o atendimento e descreva o que precisa resolver. O histórico permite consultar a conversa com a equipe. Para entrar em contato antes de contratar ou quando não conseguir acessar a conta, use [contato@sistemazero.com.br](mailto:contato@sistemazero.com.br).',
      'As dúvidas da criança sobre uma atividade seguem por “Preciso de ajuda” e pelos Recados, ligados à experiência de aprendizagem. Informar onde a dificuldade aconteceu ajuda a encaminhar a conversa.',
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
      'Na primeira contratação da Comunidade, você pode pedir o reembolso integral em até sete dias corridos a partir da compra. Envie a solicitação para [contato@sistemazero.com.br](mailto:contato@sistemazero.com.br) e informe o e-mail usado na compra.',
      'Esse prazo também vale para cada nova contratação anual por Pix. As renovações automáticas no cartão seguem as condições dos [termos da assinatura](/kids/termos). Pedir reembolso e cancelar a próxima renovação são ações diferentes; cancelar a renovação, sozinho, não envia um pedido de reembolso.',
    ],
  },
} satisfies Record<string, ComunidadeFaqEntry>
