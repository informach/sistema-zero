import fs from 'node:fs'

const base = 'docs/marketing/kids/comunidade-dos-criadores/instagram/'
const file = `${base}03-postagens.md`
let calendar = fs
  .readFileSync(file, 'utf8')
  .replace(/^\uFEFF/, '')
  .replace(/\r\n/g, '\n')
let posts = `## 2. Roteiros completos de F04 a F12

As falas e legendas estão nos blocos de citação. Nos carrosséis, usar o título e o corpo de cada slide. A nota de produção indica o que mostrar; ela não vai para a arte. A duração dos vídeos é uma estimativa para uma fala tranquila, com pausas para ver a ação. Ajustar a edição à explicação, sem acelerar para caber no tempo antigo.

### F04 · O que veio pronto, o que seu filho programou · 12/10

**Reel, cerca de 45 a 60 segundos. Capa:** O que seu filho fez neste jogo. **Objetivo:** ajudar a família a reconhecer a parte que ele aprendeu a construir. A data permite um convite à conversa no Dia das Crianças.

**Fala:**

> Quando seu filho mostrar um jogo, peça que conte qual parte ele aprendeu a fazer. Vou dar um exemplo com esta atividade.
>
> O cenário e os personagens já estavam preparados. Nas aulas, ele aprende a montar a regra que faz o personagem aparecer quando recebe um clique.
>
> Usar os desenhos prontos permite se dedicar a esse começo da programação. Depois de montar o comando, ele testa: clica e confere se o personagem aparece como esperava.
>
> Você pode participar desse momento. Peça que ele mostre a regra e jogue para explicar o que ela faz. Conhecer essa parte ajuda você a reconhecer o trabalho que houve para o jogo funcionar.

**Cena:** demonstração da equipe em Cadê Todo Mundo?, com cenário preparado, regra, clique e resultado. O casal faz o convite final. Identificar “Demonstração da equipe” durante a captura e usar legendas da fala. A comparação precisa mostrar os materiais que o aluno recebe e a parte ensinada, sem atribuir a ele a arte preparada.

**Legenda:**

> Conhecer o que seu filho fez começa por dar espaço para ele mostrar.
>
> Neste exemplo, os desenhos já vieram prontos, e a construção ensinada é a regra que faz o personagem aparecer. Saber disso ajuda a entender o que observar: qual comando ele montou, o que esperava que acontecesse e como conferiu o resultado.
>
> Você pode pedir que ele jogue uma vez e conte essa parte. A conversa acompanha algo que os dois conseguem ver, mesmo se você não souber programar.
>
> Neste Dia das Crianças, reserve um momento para conhecer uma criação que seu filho queira mostrar. Pode ser um jogo, um desenho ou algo que montou. Deixe que ele conte o que fez.
>
> O vídeo usa uma demonstração da nossa equipe.

**CTA:** conversar com o filho. **Material:** captura real do projeto e fala do casal. Se a publicação mudar de data, ajustar o parágrafo do Dia das Crianças. Não há promoção comercial ligada à data.

### F05 · Uma conversa sobre o jogo do seu filho · 14/10

**Carrossel de cinco slides. Objetivo:** dar ao responsável maneiras de participar quando o filho quiser mostrar uma criação.

**Slide 1. Título:** Seu filho chamou você para ver o jogo

> Você pode conhecer o que ele fez jogando junto e deixando que conte as escolhas. Estas três sugestões ajudam a começar a conversa.

**Slide 2. Título:** Me mostra como joga

> Deixe que seu filho apresente o objetivo e os controles. Depois, faça uma tentativa. Ao explicar o jogo para você, ele tem uma oportunidade de mostrar como as partes funcionam juntas.

**Slide 3. Título:** Me conta uma escolha sua

> Pode ser a cor de um personagem, a pontuação ou o lugar de um obstáculo. Escute o motivo antes de sugerir uma mudança. Assim, você conhece a ideia que ele estava tentando colocar no jogo.

**Slide 4. Título:** Vamos comparar as versões

> Se ele tiver mudado alguma coisa, peça para ver como era antes e como ficou. Joguem as duas versões e conversem sobre a diferença. O resultado dá um assunto para ele explicar por que quis mudar.

**Slide 5. Título:** Escolha um convite e deixe a conversa acontecer

> Você não precisa fazer todas essas perguntas de uma vez. Comece pela parte que seu filho quer mostrar e acompanhe a curiosidade dele. Salve para lembrar na próxima criação.

**Legenda:**

> Quando seu filho chama você para ver uma criação, ele abre uma oportunidade de conhecer o que está fazendo no computador.
>
> Jogar uma vez já pode render uma conversa. Talvez você não entenda um controle, ache um obstáculo difícil ou repare numa cor. Ele pode explicar o que pensou e mostrar como fez aquela parte.
>
> Você não precisa dominar programação para participar. Escutar a explicação e experimentar o jogo ajudam a dar atenção ao trabalho dele. Se surgir uma ideia de mudança, deixem que ele decida se quer tentar.
>
> Salve as sugestões para a próxima vez que seu filho quiser mostrar uma criação.

**Imagem:** casal ou mãos usando projeto da equipe; detalhes do jogo que ilustrem a conversa. Não inventar fala ou criação de aluno. **CTA:** salvar. A conversa é um convite, sem exigir que a criança apresente ou justifique cada escolha.

### F06 · O personagem que ele desenhou pode entrar no jogo · 16/10

**Reel, cerca de 50 a 70 segundos. Capa:** O desenho do seu filho pode entrar no jogo. **Objetivo:** mostrar como o interesse por desenhar pode se ligar à programação, usando uma criação concreta.

**Fala:**

> Se seu filho gosta de inventar personagens, pode ter vontade de colocar um deles num jogo. Aqui, vou mostrar como essas duas partes se encontram.
>
> Primeiro, desenhamos este personagem no Pinta. Depois, levamos o desenho para o Estúdio e montamos a regra que faz ele andar quando apertamos uma tecla.
>
> O teste pode trazer uma nova ideia. Se ele ficar difícil de enxergar no cenário, por exemplo, seu filho pode voltar ao desenho, mudar uma cor e conferir como ficou no jogo. O que ele desenha passa a fazer parte de uma brincadeira que consegue testar.
>
> O uso livre dessas ferramentas é liberado depois das etapas de entrada. No link da bio, você conhece esse caminho e pode ver se seu filho tem vontade de explorar desenho e programação juntos.

**Cena:** criar o personagem no Pinta → levar a arte ao Estúdio → montar o movimento → testar. Mostrar a comparação de cor se a equipe gravar esse exemplo. Identificar “Demonstração da equipe”. Explicar o acesso na fala, com legenda legível; não esconder essa informação num rodapé.

**Legenda:**

> Um personagem desenhado pelo seu filho pode participar de uma criação que vocês consigam jogar.
>
> Para isso, ele trabalha duas partes. No desenho, escolhe a aparência. Na programação, aprende a fazer o personagem responder a uma tecla ou a um acontecimento. Ao testar o jogo, pode perceber algo que quer ajustar na cor, no tamanho ou no movimento.
>
> Esse caminho pode interessar a quem gosta de desenhar e também tem curiosidade sobre o funcionamento dos jogos. Vale mostrar as duas partes ao seu filho e ouvir o que ele gostaria de experimentar.
>
> A gravação é uma demonstração da equipe. O uso livre do Estúdio e do Pinta é liberado após concluir o curso obrigatório de entrada e publicar o projeto exigido na Jornada. No link da bio, você conhece as aulas e as condições desse acesso.

**CTA:** conhecer o caminho pelo link da bio. **Dependência:** captura real da passagem entre as ferramentas, numa conta com acesso adequado. Não apresentar essa possibilidade como disponível a todo assinante desde o primeiro acesso.

**Alternativa de produção: carrossel de cinco slides.** Usar se a passagem ao Estúdio ainda não puder ser gravada. Esta alternativa trata da escolha visual e substitui o Reel na mesma data.

**Slide 1. Título:** Uma cor pode mudar o jeito de ver o personagem

> Se seu filho gosta de desenhar, talvez já tenha apagado um detalhe para tentar de outro jeito. No desenho digital, ele também pode comparar uma mudança antes de escolher.

**Slide 2. Título:** Este personagem foi desenhado no Pinta

> Fizemos uma primeira versão e guardamos a imagem. Ela vai servir de referência para enxergar o que muda na próxima tentativa.

**Slide 3. Título:** Agora, mudamos a cor

> O desenho continua com a mesma forma. Ao colocar as versões lado a lado, fica mais fácil perceber qual detalhe chama atenção em cada uma.

**Slide 4. Título:** Seu filho pode explicar a escolha dele

> Pergunte qual versão combina com o personagem que ele imaginou. Talvez prefira a primeira ou queira experimentar outra. A comparação dá uma referência para decidir e contar o motivo.

**Slide 5. Título:** Conheça como o desenho entra na Comunidade

> A proposta reúne criação visual e programação de jogos. O uso livre do Pinta depende das etapas de entrada. No link da bio, você conhece as aulas e pode conversar com seu filho sobre o que gostaria de criar.

**Legenda da alternativa:**

> Uma mudança pequena pode dar ao seu filho algo para comparar e uma escolha para explicar.
>
> Nesta demonstração da equipe, fizemos um personagem no Pinta e mudamos a cor. Ver as versões juntas ajuda a perceber o efeito dessa alteração, antes de decidir qual manter.
>
> Você pode participar pedindo que ele conte o que pretendia com a escolha. A resposta pode estar na ideia que tinha para o personagem, num detalhe que queria destacar ou na vontade de tentar outra possibilidade.
>
> Na Comunidade, criação visual e programação fazem parte do percurso. O uso livre do Pinta é liberado depois do curso obrigatório de entrada e da publicação do projeto exigido. Conheça esse caminho no link da bio.

**Imagem da alternativa:** versões reais da equipe, identificadas como demonstração. Esta peça não anuncia uma transferência que não foi mostrada. S06 continua sendo Sobre nós, como previsto no calendário.

### F07 · Prepare o primeiro acesso · 19/10

**Carrossel de seis slides. Objetivo:** ajudar a família a organizar a primeira aula, com uma orientação que possa colocar em prática.

**Slide 1. Título:** Prepare a primeira aula com seu filho

> Conhecer esse começo junto com ele ajuda a organizar o computador, entender a atividade e perceber em que momentos vai precisar de companhia.

**Slide 2. Título:** Separe o computador para esse horário

> Seu filho vai precisar de internet, navegador, mouse e teclado. Se o computador é compartilhado, combinem um período em que ele possa usá-lo para acompanhar a explicação e fazer a atividade.

**Slide 3. Título:** Comecem pelo jogo apresentado na aula

> Conhecer o que ele vai construir dá um sentido aos próximos passos. Deixe que experimente a versão pronta e mostre o que acontece na brincadeira antes de iniciar a montagem.

**Slide 4. Título:** Mostre que ele pode voltar à explicação

> Acompanhem um passo e encontrem juntos os controles de pausa e de retorno. Se ele esquecer onde colocar um comando, pode rever aquele trecho enquanto confere o próprio projeto.

**Slide 5. Título:** Antes de sair, confiram o que ficou salvo

> Verifiquem o aviso de salvamento e conversem sobre a parte que ele quer continuar depois. Ter o trabalho guardado na conta ajuda a retomar a criação no próximo horário combinado.

**Slide 6. Título:** Observe como foi esse começo

> Algumas crianças precisam de mais companhia para conhecer os controles ou acompanhar uma instrução. Vocês podem ajustar esse apoio conforme o uso. No destaque Dúvidas, explicamos os requisitos e como pedir ajuda.

**Legenda:**

> A primeira aula também é um momento para conhecer como seu filho acompanha esse tipo de atividade.
>
> Reserve o computador, abram a aula e vejam o projeto que será construído. Observe se ele encontra a explicação, consegue usar os controles e sabe onde voltar quando se perde num passo.
>
> Esse começo ajuda a decidir o apoio em casa. Talvez precise de companhia para ler uma instrução ou descobrir como pausar. Vocês podem fazer essa parte juntos e observar quando já consegue seguir com menos ajuda.
>
> Antes de encerrar, confiram o salvamento. E, se surgir uma dúvida sobre equipamento, formato ou atendimento, consulte o destaque Dúvidas.

**Imagem:** computador, primeira atividade, controles do vídeo e aviso real de salvamento. **CTA:** destaque Dúvidas. Referência: crianças de 9 a 14 anos, com leitura e uso de mouse e teclado. Não prometer que toda criança acompanha sozinha desde o começo.

### F08 · A explicação acompanha o que seu filho está fazendo · 21/10

**Carrossel de sete slides. Objetivo:** mostrar a orientação ligada a uma tarefa, do primeiro comando até uma dúvida que precisa de ajuda.

**Slide 1. Título:** Seu filho encontra uma explicação enquanto faz

> Para montar um jogo, ele precisa entender o que deve acontecer e como construir essa parte. Vou mostrar como a aula ajuda, usando o movimento de um personagem como exemplo.

**Slide 2. Título:** Primeiro, ele sabe o que vai tentar fazer

> A tarefa é fazer o personagem andar quando uma tecla for apertada. Ao ver essa ação no jogo, seu filho tem um resultado para procurar durante a montagem.

**Slide 3. Título:** A aula explica o comando e o encaixe

> Ele acompanha onde encontrar a instrução e como colocá-la no projeto. Pode pausar a explicação para fazer esse passo e voltar ao trecho se precisar conferir a posição.

**Slide 4. Título:** O teste ajuda a localizar uma dúvida

> Depois da montagem, ele aperta a tecla e observa o movimento. Se o personagem não andar, já tem uma pergunta concreta para investigar: qual parte do comando precisa conferir com a aula?

**Slide 5. Título:** Uma orientação pode ser consultada de novo

> Seu filho pode voltar à explicação e comparar com o que montou. Se a dificuldade for uma ação da ferramenta, como usar um controle, os tutoriais do Como fazer também ficam disponíveis para consulta.

**Slide 6. Título:** Se a dúvida continuar, ele pode escrever para a equipe

> Na aula, “Preciso de ajuda?” abre o caminho para contar o que tentou e o que aconteceu. A conversa segue nos Recados. O atendimento é por mensagens, então pode ser necessário esperar pela resposta.

**Slide 7. Título:** Conheça esse apoio dentro de uma aula

> No destaque Como funciona, mostramos a explicação e a atividade juntas. Você pode ver como seu filho encontra um passo para fazer, um resultado para conferir e uma orientação para consultar.

**Legenda:**

> Uma explicação ajuda mais quando seu filho consegue relacioná-la ao que está tentando fazer.
>
> Se a tarefa é movimentar um personagem, ele precisa conhecer o comando e saber como montá-lo. Depois, aperta a tecla para observar se o movimento acontece. Esse teste dá uma referência para continuar ou voltar a uma parte da explicação.
>
> A orientação começa nessa construção. Os trechos que ele pode rever e os tutoriais ajudam a consultar um passo. Quando a dúvida continua, ele também pode contar para a equipe o que tentou, por mensagens.
>
> No destaque Como funciona, você conhece uma aula por dentro e vê esse apoio junto da prática.

**Imagem:** atividade real que ensine movimento, com comando, tecla e resultado correspondentes; consulta ao vídeo, tutorial e caminho dos Recados. Identificar a demonstração da equipe. **CTA:** destaque Como funciona. Não gravar um tour de ferramentas nem confundir o diálogo preparado da aula com uma resposta de inteligência artificial.

`

posts += `### F09 · O que seu filho pode usar em cada etapa · 23/10

**Carrossel de seis slides. Objetivo:** explicar o começo e as condições para continuar criando, de forma que a família saiba o que está contratando.

**Slide 1. Título:** Seu filho começa com uma criação guiada

> Ao entrar na Comunidade, ele encontra aulas que apresentam os comandos e orientam a montagem de um jogo. Durante essas atividades, usa os materiais e as ferramentas preparados para aquele começo.

**Slide 2. Título:** A Jornada mostra o próximo passo

> Esse é o nome da área que reúne as etapas e seus requisitos. Nela, seu filho confere o que já concluiu, o que falta fazer e quais ferramentas pode usar no momento.

**Slide 3. Título:** A criação livre tem requisitos de entrada

> Depois de concluir o curso obrigatório de entrada e publicar o projeto exigido, ele chega ao posto Construtor. A partir daí, pode usar livremente o Estúdio, para criar jogos, e o Pinta, para desenhar.

**Slide 4. Título:** Ele pode voltar a uma ideia e fazer outra versão

> Nas ferramentas liberadas, seu filho pode mudar uma regra, experimentar um personagem ou começar uma criação própria. O que aprendeu nas aulas dá uma referência para essas novas tentativas.

**Slide 5. Título:** Algumas possibilidades vêm mais adiante

> Recursos como o planejamento com inteligência artificial dependem de outras etapas, de disponibilidade e de créditos de uso. Parte do percurso ainda está em preparação. Assinar o anual não libera automaticamente todas essas ferramentas.

**Slide 6. Título:** Veja o que já está disponível para começar

> No link da bio, você conhece os cursos publicados, o caminho de acesso e os planos. Mostre o começo ao seu filho para conversarem sobre uma criação que ele tenha vontade de tentar.

**Legenda:**

> A assinatura e as etapas de aprendizagem têm funções diferentes. O plano mantém o acesso durante o período contratado; a Jornada mostra quais passos seu filho precisa cumprir para liberar as ferramentas.
>
> Ele começa com uma criação guiada, usando os recursos daquela aula. Para chegar ao uso livre do Estúdio e do Pinta, precisa concluir o curso obrigatório de entrada e publicar o projeto exigido. O curso extra Cadê Todo Mundo? não libera sozinho essa etapa.
>
> Depois, nas ferramentas que já pode usar, ele tem espaço para experimentar outras versões e ideias. Recursos posteriores seguem seus próprios requisitos, e parte do percurso depende de cursos ainda em preparação.
>
> No link da bio, confira o que está disponível hoje e como funciona o acesso antes de escolher um plano para sua família.

**Imagem:** Jornada numa conta de aluno demonstrativa, requisitos de entrada e ferramentas no estado correto. **CTA:** link da bio. Se o catálogo ou os requisitos mudarem antes de produzir, atualizar os slides correspondentes e a legenda. Não usar uma conta administrativa como prova de acesso inicial.

### F10 · Uma mudança na velocidade, outra partida · 26/10

**Reel, cerca de 45 a 60 segundos. Capa:** Mudamos a velocidade. Veja o que acontece. **Objetivo:** mostrar uma decisão de programação que o adulto pode observar e comparar.

**Fala:**

> Neste jogo, o personagem precisa desviar dos obstáculos. Fizemos duas versões: numa ele anda mais devagar; na outra, aumentamos a velocidade. O caminho e os obstáculos continuam iguais.
>
> Repare no tempo que sobra para decidir quando desviar. A mudança no comando aparece na partida, e a gente pode jogar para comparar qual versão funciona melhor para esse desafio.
>
> Seu filho também pode investigar uma escolha assim nas atividades que permitem alterações. Muda um valor, testa e observa o efeito. Depois, tem um motivo para manter a mudança ou tentar de outro jeito.
>
> Conte qual dessas duas versões você escolheria para começar e o que pesou na sua decisão.

**Cena:** duas partidas do mesmo projeto da equipe, com diferença apenas no valor de velocidade. Mostrar o valor alterado e tempo suficiente de cada partida para ver a diferença. Identificar as versões como velocidade menor e maior, e manter “Demonstração da equipe”.

**Legenda:**

> A velocidade de um personagem muda o tempo que o jogador tem para reagir ao caminho.
>
> Neste exemplo da equipe, mantivemos os obstáculos e alteramos um valor do movimento. Jogar as duas versões permite observar o efeito dessa escolha antes de decidir qual usar.
>
> Quando seu filho aprende a fazer uma mudança desse tipo, pode relacionar o comando ao que acontece no jogo. Você participa pedindo que mostre as versões e explique por que prefere uma delas. A comparação dá um assunto concreto para a conversa.
>
> Qual versão você escolheria para começar: a de velocidade menor ou a de velocidade maior? Conte o que levou à sua escolha.

**Condição de produção:** selecionar ou preparar um projeto real com obstáculos que corresponda à fala. A demonstração só fica pronta depois de conferir que as duas versões diferem apenas na velocidade. É uma criação da equipe, sem alegação de que seja um projeto feito por aluno ou um curso incluído.

**Se os comentários estiverem limitados:** manter o argumento e trocar somente a última frase da fala e o último parágrafo da legenda por:

> Compare as duas versões e vote na enquete dos stories. Depois, mostre ao seu filho e conversem sobre qual escolheriam para jogar.

**CTA:** comentário ou enquete S10, conforme a configuração real da conta. A alternativa substitui o convite principal; não acrescenta outra publicação.

### F11 · O que conferir antes de escolher um curso · 28/10

**Carrossel de sete slides. Objetivo:** ajudar a família a comparar propostas pelo que o filho fará e pelo apoio de que precisa.

**Slide 1. Título:** Antes de escolher um curso de programação para seu filho

> Conhecer uma aula ajuda a entender o que ele vai fazer e como poderá acompanhar. Estes cinco pontos dão um começo para comparar as opções.

**Slide 2. Título:** Veja qual é a primeira atividade

> Peça para conhecer o projeto e uma parte da explicação. Seu filho entende a brincadeira? Consegue ler as instruções e usar os controles pedidos? Essa observação ajuda a avaliar o começo para ele.

**Slide 3. Título:** Confira como a aula cabe na rotina

> Se for ao vivo, veja os horários e como funcionam as faltas. Se for gravada, conheça a forma de pausar, praticar e retomar. Pense no computador disponível e no tempo que vocês conseguem combinar em casa.

**Slide 4. Título:** Entenda o que acontece quando surge uma dúvida

> Veja se há explicações para rever, materiais de consulta e contato com a equipe. Pergunte como esse contato funciona e quando a resposta pode chegar. Assim, você compara o apoio com a necessidade do seu filho.

**Slide 5. Título:** Descubra o que ele aprende a construir

> Um jogo pode começar com personagens e cenários preparados. Peça que mostrem qual parte será feita pelo aluno e como ele confere o resultado. Isso ajuda a entender o conteúdo da atividade.

**Slide 6. Título:** Leia o que está incluído no acesso

> Confira o prazo, os cursos disponíveis, as condições das ferramentas e a forma de renovação. Um recurso anunciado pode depender de uma etapa posterior. Saber disso antes evita escolher contando com algo que ainda não poderá usar.

**Slide 7. Título:** Compare pensando no seu filho

> A escolha depende do que ele quer aprender, de como acompanha uma atividade e do apoio que a família procura. Salve estes pontos para consultar quando conhecer as aulas de cada opção.

**Legenda:**

> O nome da ferramenta e a imagem de um jogo pronto contam só uma parte de um curso de programação.
>
> Para entender como seria para seu filho, conheça uma atividade: o que ele recebe pronto, o que aprende a montar e como encontra orientação quando precisa. Pense também no horário e na companhia que vocês conseguem oferecer no começo.
>
> Uma ferramenta gratuita, um curso gravado e uma aula ao vivo podem atender necessidades diferentes. Vale conhecer as condições concretas de cada opção e ouvir o interesse do seu filho, em vez de decidir apenas pela lista de recursos.
>
> Salve os cinco pontos para usar nessa comparação.

**Imagem:** cartões legíveis e exemplos próprios; não usar marcas de concorrentes como endosso. **CTA:** salvar. Não atribuir superioridade à Comunidade nem presumir que uma opção gratuita carece de explicação ou apoio.

### F12 · Como a gente prepara uma explicação · 30/10

**Reel, cerca de 55 a 75 segundos. Capa:** Como a gente prepara uma aula. **Objetivo:** mostrar uma decisão de autoria que ajude a família a conhecer o cuidado com a explicação.

**Fala:**

> Antes de gravar uma aula, a gente escolhe como tornar uma ideia de programação compreensível para seu filho.
>
> No jogo do Farol, por exemplo, o personagem pega uma chave que vai abrir uma porta. A chave some do cenário quando é recolhida, mas o jogo precisa guardar a informação de que o personagem já está com ela.
>
> Por isso, preparamos uma experiência em que seu filho compara o que acontece quando essa informação é guardada e quando não é. A coleta parece igual, mas a resposta da porta muda.
>
> Ele pode observar essa diferença antes de montar a regra. Assim, tem uma situação do próprio jogo para entender por que precisa guardar aquela informação.
>
> Somos Helena e Júlio. No link da bio, mostramos como preparamos esse começo de programação na Comunidade dos Criadores.

**Cena:** casal preparando a explicação → experiência de coleta com memória desligada e ligada → resultado na porta → regra correspondente. O mesmo sumiço da chave e o mesmo aviso de coleta precisam aparecer nos dois modos. Identificar como bastidor atual e demonstração da equipe; não como registro de desempenho de aluno.

**Legenda:**

> Uma parte do nosso trabalho acontece antes de ligar a câmera: decidir o que seu filho precisa experimentar para entender a ideia da aula.
>
> No exemplo da chave, recolher o objeto e guardar a informação de que ele foi recolhido são duas partes diferentes. Ao comparar o que acontece na porta, ele tem um resultado para relacionar à informação que o jogo guardou.
>
> Essa experiência dá um motivo para a regra que vem depois. Quando chegar à montagem, seu filho já terá visto o problema que aquela regra ajuda a resolver. A explicação pode se apoiar no jogo que acabou de testar.
>
> Este é um bastidor de preparação do curso A Chave do Farol. No link da bio, você conhece a proposta de programação da Comunidade dos Criadores e como as aulas ligam explicação e prática.

**CTA:** conhecer a proposta no link da bio. **Material:** experiência real do Farol e roteiro correspondente, conferidos nas [diretrizes pedagógicas](../../../../aulas-interativas/DIRETRIZES-PEDAGOGICAS.md). A peça mostra o método de preparação. O Farol tem oferta de entrada própria; não afirmar aqui que está incluído na assinatura sem conferir o catálogo. Não transformar a comparação num resultado de compreensão garantido para todos os alunos.

`

const stories = `As falas abaixo são a copy completa das sequências complementares. Em vídeo, usar legendas sincronizadas; em cards, dividir o texto quando a leitura pedir. Não substituir a explicação por uma lista de palavras. S08, S10 e S12 não precisam entrar automaticamente nos destaques.

### S08 · Uma dúvida durante a construção

**Story 1.** Mostrar uma atividade real de movimento, a mesma capturada para F08. Identificar a demonstração da equipe.

> Seu filho montou o comando para fazer um personagem andar, mas apertou a tecla e ele ficou parado. Esse resultado dá uma dúvida concreta para investigar: o que precisa conferir na montagem?

**Story 2.** Mostrar o trecho da explicação e a comparação com o projeto. O erro e a correção precisam ser reais.

> Ele pode voltar ao trecho da aula e comparar o comando com o próprio projeto. Se perceber que colocou uma instrução no lugar errado, faz o ajuste e testa outra vez. A explicação ajuda a procurar uma diferença que ele consegue conferir.

**Story 3.** Mostrar o canal de ajuda e os Recados, sem conversa privada de aluno.

> Se a dúvida continuar, ele pode escrever para a equipe pela aula. Contar qual tecla apertou e o que aconteceu ajuda a explicar o problema. A resposta vem pelos Recados, por mensagem, e pode ser necessário aguardar.

**Story 4.** Casal, com caixa dirigida aos responsáveis.

> Na primeira atividade, você pode acompanhar como seu filho usa esses apoios e perceber onde precisa de companhia. Conte pra gente qual dúvida você tem sobre a ajuda durante as aulas.

**Caixa:** “Sua dúvida sobre a ajuda nas aulas”. Responder manualmente às perguntas recebidas, usando a oferta real e sem expor informações de crianças.

### S10 · Qual velocidade vocês escolheriam?

**Story 1.** Usar as duas versões reais de F10. Identificar “Demonstração da equipe”.

> Fizemos duas versões deste jogo. Mudamos só a velocidade do personagem; o caminho e os obstáculos são os mesmos. Veja cada partida e repare no tempo para desviar.

**Story 2.** Deixar as duas versões reconhecíveis ao apresentar a enquete.

> Uma velocidade muda a experiência de quem joga. Pensando em alguém que vai tentar pela primeira vez, escolha qual dessas duas versões você colocaria no começo.

**Enquete:** “Para a primeira partida” · **Velocidade menor / Velocidade maior**.

**Story 3.** Mostrar as partidas novamente, com tempo para observar o efeito.

> Agora compare o que acontece perto dos obstáculos. Na versão mais rápida, o personagem chega até eles em menos tempo. Esse é um efeito que podemos observar para decidir qual velocidade combina com a partida que queremos criar.

**Story 4.** Mostrar o valor alterado e a ação correspondente.

> Quando seu filho aprende a mudar essa regra, pode testar o resultado e explicar por que prefere uma versão. Mostre as duas a ele e conversem sobre o que escolheriam. Vocês podem até ter motivos diferentes.

A votação abre uma conversa sobre escolha. Não anunciar uma resposta certa nem inferir preferência de todas as famílias pelos votos recebidos.

### S12 · Conheça o começo com seu filho

**Story 1.** Reaproveitar o bastidor de F12, identificado como preparação da equipe.

> Ao preparar uma aula, a gente procura uma situação do jogo que ajude a explicar a ideia. No exemplo da chave, seu filho compara duas respostas da porta para entender por que o jogo precisa guardar uma informação.

**Story 2.** Usar uma atividade representativa já disponível, com explicação e construção.

> Depois de conhecer uma ideia, ele tem uma parte para construir e testar. Se precisar de mais tempo, pausa a aula. Se perder um passo, pode voltar à explicação enquanto confere o que montou.

**Story 3.** Casal e uma demonstração, sem simular depoimento de família.

> Para saber como esse formato seria na sua casa, vale mostrar uma aula ao seu filho. Conversem sobre o jogo que ele gostaria de criar e pensem no horário de computador que vocês podem combinar.

**Story 4.** Oferta e condições disponíveis para consulta.

> Se a proposta fizer sentido para vocês, no botão você encontra os planos e as condições da Comunidade. Confira o que está disponível, como funciona a renovação e o prazo de garantia antes de escolher.

**Sticker:** **Conhecer os planos** → L5, utm_content=s12_planos.

`

const start = calendar.indexOf('## 2. Roteiros completos')
const stop = calendar.indexOf('## 3. Stories e formação')
if (start < 0 || stop < 0) throw new Error('Seções de posts não encontradas')
calendar = calendar.slice(0, start) + posts + calendar.slice(stop)
const storyStart = calendar.indexOf('As frases entre aspas abaixo')
const storyStop = calendar.indexOf('## 4. Produção em lotes')
if (storyStart < 0 || storyStop < 0) throw new Error('Seções de stories não encontradas')
calendar = calendar.slice(0, storyStart) + stories + calendar.slice(storyStop)
calendar = calendar.replace(
  '**Consolidado em 04/10/2026 com os destaques e fixados aprovados.**',
  '**Copy integral revisada em 04/10/2026, conforme a nova direção do responsável.** Os temas dos destaques e fixados foram mantidos. As falas, legendas, carrosséis e stories receberam nova redação; não registrar esta copy como já aprovada pelo responsável.',
)
calendar = calendar.replace(
  'manter o roteiro aprovado.',
  'manter a função de mostrar alunos em aula.',
)
calendar = calendar.replace('Família: conhecer uma escolha', 'Conversa sobre a criação do filho')
calendar = calendar.replace(
  'Confiança: orientação durante a criação',
  'Orientação ligada a uma tarefa',
)
calendar = calendar.replace(
  'Passos, Zappy, tutoriais e apoios',
  'Tarefa, explicação, teste, consulta e mensagens',
)
calendar = calendar.replace(
  'Casal, roteiro, experiência |',
  'Casal, roteiro e experiência da chave |',
)
calendar = calendar.replace('S08 · Apoios na prática', 'S08 · Uma dúvida durante a construção')
calendar = calendar.replace('S09 · Dúvidas: contratação', 'S09 · Dúvidas: assinatura')
calendar = calendar.replace(
  'S12 · Bastidor e próximo passo',
  'S12 · Conheça o começo com seu filho',
)
calendar = calendar.replace(
  'A apresentação de Sobre nós já entra na montagem inicial; F12 é um bastidor adicional.',
  'A apresentação de Sobre nós já entra na montagem inicial; F12 aprofunda uma decisão de preparação da aula.',
)
calendar = calendar.replace(
  'Casal, roteiro e bastidor real de uma decisão de aula',
  'Casal, roteiro e experiência da chave no Farol; demonstração de uma atividade disponível',
)
calendar = calendar.replace(
  'Computador, aula, ajuda, área da família, condições e controles',
  'Computador, aula de movimento, ajuda, área da família, condições e controles',
)
calendar = calendar.replace(
  'Duas versões, Pinta, passagem ao Estúdio, Jornada e templates',
  'Jogo de obstáculos em duas velocidades, Pinta, passagem ao Estúdio, Jornada e templates',
)
calendar = calendar.replace(
  'Completar o checklist antes de aprovar.',
  'Completar o checklist de explicação, prova e produção antes de aprovar a peça.',
)
fs.writeFileSync(file, calendar)
console.log('Reescritos F04–F12, alternativa de F06, alternativa de F10 e S08/S10/S12.')
