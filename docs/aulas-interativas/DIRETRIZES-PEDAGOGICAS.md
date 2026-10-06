# Diretrizes pedagógicas das aulas Kids

Referência consolidada em 03/10/2026 a partir das decisões do Cadê Todo Mundo? e de sua aplicação ao Desafio do Primeiro Jogo; atualizada em 05/10/2026 com as correções da revisão do Farol e em 06/10/2026 com o vídeo da experiência como demonstração e com as falas que conversam com a criança e chamam a atenção dela. Leia junto do [BRIEFING](BRIEFING.md), da [especificação do roteiro](ESPEC-ROTEIRO.md) e do [contrato do manifesto](ESPEC-MANIFESTO.md). Este documento organiza as decisões vigentes; modelos antigos não substituem essas decisões.

## Como decidir o formato de um curso

Antes de escrever aulas, registre na proposta do curso: o que a pessoa já sabe, o que vem preparado, o que ela construirá, ferramentas e paletas disponíveis, sequência das conquistas, conceitos que precisam de experiência, distribuição dos quizzes e critérios de conclusão. Mantenha título, descrição curta, descrição, nome e **resumo de cada módulo**, aulas e ordem em `modulos-*.md`.

O Cadê Todo Mundo é referência de clareza, instrução completa e coerência entre materiais. Não é um molde que obriga todo curso a ter o mesmo número de aulas, seções, experiências ou quizzes. Uma diferença precisa de motivo pedagógico explícito e de correspondência nos materiais e na plataforma. Não exige nova autorização para cada decisão rotineira de autoria; instruções do usuário prevalecem.

| Decisão | Regra geral | Aplicação que depende do curso |
| --- | --- | --- |
| Aula | Toda aula termina numa ação prática | Não existe aula só de introdução: a apresentação do jogo e o caderno abrem a primeira aula de construção |
| Seção | Uma ideia por seção | Poucos blocos por aula cabem numa montagem só; mais conceitos pedem mais seções na mesma aula, com verificação intermediária e um envio no fim |
| Contexto | Situar a tarefa antes de pedir uma ação | Uma frase pode bastar; não inventar recapitulação ou agenda |
| Zappy | Orientar a atividade; após vídeo, fazer a ponte imediatamente | Na seção sem vídeo, apresentar diretamente o que fazer |
| Montagem | Ensinar todos os gestos necessários, com o destino à vista antes de pegar o bloco | Artes, cenário e partes prontas podem reduzir a montagem inicial |
| Experiência | Cada conceito novo ganha uma experiência antes de ir para os blocos | Operação de interface (escolher um nome, trocar um texto, abrir um menu) não é conceito e não ganha cena; reaproveitar uma cena existente com o cenário do curso quando ela mostra o mesmo conceito |
| Paletas | Usar apenas ferramentas disponíveis e necessárias | Jogos iniciais: Programação e Jogo 2D; outros cursos podem ensinar outras paletas |
| Quiz | Retomar raciocínio já ensinado, em seção própria | Cursos curtos: revisão final; cursos maiores: revisões distribuídas por aula ou etapa |
| Caderno | Acompanhar a aula, com o mesmo padrão visual | Extensão e conteúdo acompanham o percurso real |
| Entrega | Conferir o trabalho, reconhecer a autoria e encerrar | Publicação, certificado e atividades dependem da proposta do curso |

## 1. Contexto, vídeo, Zappy e atividade

Cada seção tem uma tarefa compreensível e uma saída clara. No ensaio do Cadê Todo Mundo, uma das duas crianças entendeu apenas que o professor apertou botões: o tour havia escondido o convite para jogar. A clareza é avaliada pelo que a pessoa consegue fazer sem receber uma explicação extra do adulto. Na abertura, apresente **qual jogo será construído e o que acontece nele**, antes de convidar a jogar a versão pronta, e diga o objetivo concreto da partida. No Cadê, o objetivo é encontrar os três personagens; no Farol, pegar a chave e levar o personagem até o farol. Não transforme a apresentação em tour da plataforma.

**Toda aula termina numa ação prática; não existe aula só de introdução.** A apresentação do jogo e o caderno são as primeiras seções da primeira aula de construção. Na Aula 1 do Cadê, a ordem é jogo pronto, caderno, experiência e montagem. Uma aula que só apresenta deixa a criança sem nada feito ao final, e a divisão em seções existe justamente para juntar abertura e prática na mesma aula (decisão de 05/10/2026, aplicada ao Farol).

Quando há vídeo, a ordem editorial é **vídeo → diálogo curto do Zappy → atividade ou encaminhamento**. Há no máximo um vídeo e um diálogo externo por seção. A ponte identifica a ação seguinte, sem repetir a aula, dar respostas da experiência ou acrescentar obrigação de conclusão. Registre a fala também na proposta e no roteiro como **texto da página, não gravar**. Consulta opcional continua opcional.

Uma experiência pode ter sua própria fala do Zappy junto aos controles. Ela ensina o gesto específico; a ponte liga o vídeo a essa tarefa. Não repetir o mesmo comando nas duas nem adicionar uma terceira instrução genérica.

Uma seção sem vídeo também precisa de contexto e orientação. No quiz, a fala vem **antes das perguntas** e diz o que será retomado, que haverá explicações e que é possível corrigir. Não inventar um vídeo para preencher o modelo.

Ordem dos blocos não é regra de bloqueio do player. A opção de assistir antes da atividade pertence à configuração do curso (`videoBeforeActivity`). Se estiver ativada, o player libera após o limiar de visualização, e só no jogo pronto e na experiência: uma seção só com Estúdio, Pinta, materiais ou entrega pela galeria não tranca, porque ali a criança faz junto com o vídeo (uma seção mista, com editor e experiência, tranca o painel inteiro; evitar); se estiver desativada, a atividade fica disponível junto do vídeo. Seção de quiz não tem vídeo e não recebe essa espera. Não escrever instruções que contrariem a configuração usada.

## 2. Montagem guiada e conceito concreto

Na montagem, ensinar caminho da paleta, nome literal do bloco, encaixe com referência visível, campo, valor, o que manter, teste e correção do erro provável. **Primeiro o destino, depois a peça:** a fala manda deixar à vista o lugar do encaixe (área, bloco vizinho ou espaço vazio) antes de abrir a paleta, e só então pegar o bloco e arrastar até lá. Com um bloco preso no mouse, a criança não consegue mover o espaço dos blocos para procurar o destino. Quando o lugar pode estar fora da tela, ensinar a arrastar um espaço vazio entre os blocos. Blocos de valor seguem a mesma lógica: nomear o número ou a pergunta que será trocada antes de buscar o bloco que a substitui. Não pedir que a pessoa adivinhe uma peça nem usar “faça como eu fiz” como substituto. Se um valor já está certo, explicar e mantê-lo. Aguardar os gestos; encurtar linguagem não significa acelerar a montagem. Quando a plataforma exige verificação, ensinar a sequência completa: testar o jogo, **Verificar esta etapa**, corrigir e verificar novamente se necessário, conferir **Objetivo da etapa cumprido!**, esperar **Salvo**, **Enviar para o professor**, confirmar **Enviar** e avançar ou concluir. Uma instrução omitida pode impedir a conclusão mesmo com o jogo certo.

Explicar palavras novas quando necessárias e usar o próprio jogo como exemplo.

**A experiência explica enquanto faz, e o vídeo é uma demonstração.** O vídeo da experiência não separa "o que fazer" de "o que significa". Quem faz os testes no vídeo é o narrador: ele mostra e explica na primeira pessoa ("Quando eu toco num esconderijo, Achados vai para 1"). O vídeo não dá ordens à criança antes da vez dela. Mandar "toque", "agora toque" e, no fim, dizer "agora é a sua vez" mistura os dois papéis: ou ela já fez, e a vez sobra, ou ainda não fez, e as ordens não tinham sentido. Nos cursos com a trava do vídeo, a experiência nem está aberta enquanto ela assiste. O vídeo segue esta ordem:

1. Diz qual ideia a experiência ensina, com o nome dela: "Esta é uma experiência para a gente entender como funciona a ação e a reação". Saber o que vai aprender prepara a criança e dá a palavra que ela reencontra na montagem; "Vou te mostrar…" sozinho fica vago (ajuste do responsável, 06/10/2026).
2. Puxa a atenção para a demonstração ("Olha aqui:"), faz cada gesto no ritmo da fala, mostra o resultado real e explica por que ele aconteceu, ligando à regra que a criança vai montar depois, como numa conversa: "Olha aqui: quando eu toco no arbusto, nada acontece. Tá vendo? É que o jogo ainda não sabe o que fazer quando alguém toca no arbusto. Então a gente precisa dizer isso para ele"; "E se eu tocar num espaço vazio do jardim? Tá vendo? O número não muda. Isso acontece porque a regra que soma está ligada aos esconderijos: ela só funciona quando eu toco num esconderijo".
3. Muda a regra e explica a diferença.
4. Só então passa a vez: "Agora é a sua vez: faça esses mesmos testes na experiência. Quando terminar, clique em Próxima seção". A experiência continua cobrando as metas da própria pessoa.

Os passos para a criança ficam nas instruções da própria experiência, no imperativo. A ponte do Zappy, também no imperativo, liga o vídeo à experiência numa frase curta, sem repetir os passos. As **montagens** também seguem no imperativo ("abra", "pegue", "solte"): ali a criança constrói no próprio jogo, fazendo junto com o vídeo. O vídeo do **jogo pronto** segue o mesmo raciocínio: apresenta o jogo, mostra como se joga na primeira pessoa com UM exemplo só ("Olha aqui: quando eu toco num esconderijo, aparece quem estava atrás"), sem resolver a partida nem revelar o resto, porque a graça é descobrir, e só no fim passa a vez: "Agora é a sua vez: jogue até encontrar os três personagens". A trava do vídeo (opção do curso) vale só para a experiência e o jogo pronto, onde a criança precisa ouvir a explicação antes de testar ou brincar; quando ela abre, a plataforma diz "Pronto! Agora é a sua vez". No Estúdio e no Pinta não há trava: a criança monta junto com o vídeo desde a primeira vez. Decisão do responsável em 06/10/2026; vale para todos os cursos.

Uma comparação curta com o dia a dia da criança ajuda a ideia a fazer sentido. Exemplos:

- cócegas e risada, para ação e reação;
- placar de futebol, para variável;
- desenho animado, para quadro;
- tamanho do passo, para velocidade;
- anotar num caderno, para guardar uma informação;
- a porta de casa que só abre com a chave, para condição.

Escolher comparações gentis e próximas da criança. A comparação serve à explicação e não vira assunto. Ela parte de uma regra que a criança já vive e chega ao passo concreto do jogo, com a palavra que aparece no botão ou no bloco, e diz com clareza o que é cada coisa no próprio jogo: "Na vida é assim também: toda ação tem uma reação. Por exemplo, se alguém faz cócegas em você, você ri. A cócega é a ação, e a risada é a reação. No seu jogo, o toque é a ação. E a reação que a gente quer é o arbusto ficar invisível, para aparecer quem está escondido atrás dele. Mas, para o jogo ter essa reação, a gente precisa ligar a reação ao toque". Dizer só "a gente precisa ligar uma reação a essa ação", sem dizer qual é a reação, deixa a ideia no ar (ajuste do responsável, 06/10/2026). Evitar frases abstratas sobre programação, como "na programação, nada é automático": falam do que falta e não dizem o que fazer. Ajuste do responsável em 05/10/2026. Na frase da comparação, o vídeo mostra um meme ilustrado por 2 a 3 segundos, como reforço visual e de humor. O desenho é nosso, no formato de meme, com o Zappy ou os personagens do jogo. Não usar foto de pessoa real nem meme da internet, por direitos de imagem e porque muitos nasceram em contextos impróprios para crianças. O meme não cobre a experiência, e a narração explica sem depender dele. A nota de tela descreve cada meme. Decisão do responsável em 05/10/2026. O tom continua curto e simples. Regra pedida pelo responsável em 05/10/2026; substitui a anterior, que mandava não antecipar o resultado da experiência.

Pistas são ajuda adicional, nunca o único lugar com um passo obrigatório. Palpite só entra quando comparar hipótese e observação ensina algo; não vale nota e não aparece automaticamente em toda seção.

“Dor antes da solução” cabe quando existe um problema reproduzível no jogo; na montagem que aplica uma experiência, é a retomada descrita acima. Conferir se o problema aparece de verdade. Não encenar um defeito encoberto pelo cenário nem usar a sequência como obrigação para qualquer conceito.

**Uma ideia por seção.** Cada seção com Estúdio trabalha uma única ideia: os gestos dessa ideia ficam juntos e ideias diferentes vão para seções diferentes, mesmo que fiquem na mesma aula. O Cadê tem uma montagem por aula porque cada aula acrescenta um ou dois blocos, e esse número não é molde. No Farol, a primeira versão do Dia 1 juntava controles e movimento, repetição a cada quadro, velocidade, limite da tela e ordem num único vídeo de 5 a 6 minutos; a revisão de 05/10/2026 separou essas ideias. As seções intermediárias conferem o trabalho com **Verificar esta etapa**, sem envio; o envio fica para a última montagem da aula.

**Conceito novo, experiência antes.** Todo conceito novo ganha uma experiência que o torna concreto antes de virar bloco no Estúdio: primeiro a criança vê e manipula a ideia, depois monta. Conceito é o que muda o comportamento do jogo, como repetir a cada quadro, quanto anda por quadro, limite da tela, evento, variável e condição. Operação de interface não é conceito e não ganha cena. A experiência vem antes da primeira montagem que aplica o conceito, de preferência na seção imediatamente anterior; uma experiência pode preparar duas montagens seguidas quando mostra as duas ideias. Quando uma cena existente mostra o mesmo conceito, reaproveitá-la com o cenário do curso e escolher as metas pelo `setup`; quando nenhuma mostra, construir a cena antes de gravar a aula.

**Retomar a experiência no próprio jogo antes de montar.** A montagem que aplica um conceito não começa pelo bloco. Primeiro, numa conversa curta:

1. Lembrar o que a experiência mostrou.
2. Pedir um teste no jogo da pessoa que mostre o que ainda falta.
3. Dizer o que a montagem vai fazer.

No Cadê, por exemplo: "Lembra da experiência da seção anterior? O arbusto só ficou invisível depois que você ligou a reação ao toque. Agora a gente vai fazer isso no seu jogo! Primeiro, toque num esconderijo do seu jogo. Tá vendo? Não acontece nada, porque o toque ainda não tem nenhuma reação ligada a ele. Para o jogo responder, a gente precisa ligar uma reação a esse toque. O toque é a ação, e a reação que a gente quer é o esconderijo ficar invisível, para aparecer o personagem que está atrás dele. Então, vamos fazer isso agora!" A versão anterior ("Primeiro, toque num esconderijo. Nada acontece: o toque ainda não tem uma reação. Vamos ligar uma.") soava como texto lido, com frases soltas; a retomada é uma conversa (ajuste do responsável, 06/10/2026). No fim da montagem, o mesmo teste mostra a diferença. A criança não liga sozinha a experiência ao próprio jogo; sem essa ponte, o bloco vira um gesto solto. A retomada é curta e não vira recapitulação. Ela diz onde a experiência foi feita, porque "na experiência" sozinho faz a criança procurá-la na seção em que está. Se a experiência foi na seção logo antes, a fala diz "Lembra da experiência da seção anterior?". A fala não manda clicar em **Anterior** para rever: isso quebra o ritmo e tira a criança da montagem na hora em que ela vai começar; quem quiser rever encontra o botão. A retomada é animada e convida a programar ("Agora a gente vai fazer isso no seu jogo!"), em vez de soar como aviso. Ajuste do responsável em 05/10/2026. Se ela ficou mais atrás, a fala nomeia a seção, como "Lembra da experiência da primeira seção desta aula?". Quando o efeito ainda não aparece no jogo, como uma variável sem mostrador, a fala só lembra a experiência e diz isso com honestidade, sem inventar um teste. A regra veio de pedido do responsável em 05/10/2026 e foi aplicada ao Cadê e ao Farol.

**Mexa e veja numa seção própria, com mudanças que ficam.** O mexa e veja é uma seção separada, nunca um momento dentro da montagem. A montagem tem um caminho só: montar, testar, verificar e enviar. Uma mudança no meio dela tira o foco e pode fazer a verificação reprovar.

A seção só traz mudanças que a criança mantém no jogo: trocar personagens, trocar esconderijos, escrever a mensagem do final ou os avisos, escolher a velocidade. É quando o jogo passa a ser dela. Trocar um valor para ver o efeito e depois voltar ao anterior não é mexa e veja: experimentar é papel da experiência, que já faz isso melhor e sem risco para o projeto. "Mexa e veja" é o nome interno do tipo de seção, para a equipe. Com a criança, a fala vai direto ao que ela pode fazer ("Agora deixe o jogo com a sua cara!", "Agora escolha a velocidade do seu personagem!"), diz que o que ela mudar fica no jogo e termina com um teste. Ajuste do responsável em 06/10/2026. As escolhas não viram critério de conclusão.

A seção de mexa e veja do curso fica depois da última entrega e antes de publicar, como fechamento, para o jogo publicado ter a cara da criança. Uma escolha que é a própria aplicação de um conceito, como a velocidade depois da experiência da velocidade, pode ficar na sua seção de montagem; nesse caso, a verificação aceita qualquer valor razoável e a aula seguinte não depende de um valor fixo. Aplicado em 05/10/2026, a pedido do responsável:

- Cadê: **Deixe o jogo com a sua cara**, na Aula 2, com bichos, esconderijos e a mensagem do final;
- Farol: **Escolha a velocidade**, no Dia 1, e **Deixe o jogo com a sua cara**, no Dia 3, com o personagem e os avisos;
- saíram o "troque 0 por 50 e volte para 0" do Cadê e o "troque 3 por 1 e volte para 3" do Farol.

**Rótulos como aparecem na tela.** Nomear o bloco pela face que a criança vê, conferida no código, e não pelo nome do catálogo: o bloco lógico aparece como **verdadeiro**, com menu, e não como "Verdadeiro ou falso". Dizer o que já vem no bloco e precisa ser trocado: o texto nasce com **Olá**, o Se nasce com a pergunta **x > 0** e os valores nascem como número. Ensinar o controle real que acrescenta uma parte, como o **+** ao lado de **senão**, embaixo do Se. Botão que aparece só como ícone é nomeado e localizado por uma posição estável, como **Compartilhar**, no alto do Estúdio.

**Conferir o projeto preparado antes de mandar procurar algo.** O Estúdio só cria as áreas que têm blocos. Se a montagem precisa de **Quando acontecer** e o projeto ainda não tem eventos, a fala ensina a criar a área: deixar um espaço vazio à vista, abrir **Áreas do projeto**, pegar **Quando acontecer** e soltar. A primeira versão do Dia 2 do Farol mandava procurar uma área que não existia.

Números dentro dos blocos são sombras: o bloco novo solto em cima deles toma o lugar sem sobrar nada. Já a pergunta **x > 0** que nasce no **Se** é um bloco de verdade. Ela vai primeiro para a lixeira, e a pergunta nova entra no lugar vazio. Soltar em cima dela deixa um bloco solto ou monta uma pergunta que a verificação não aceita.

**Artes que a criança pode trocar usam uma caixa única.** O bloco que cria um sprite guarda largura e altura; trocar só a imagem estica o desenho novo para o tamanho antigo. Quando a aula oferece escolher entre desenhos, como bichinhos e esconderijos no Cadê, todos os desenhos de um mesmo tipo têm a mesma caixa e a mesma linha de base, e a caixa do esconderijo cobre a do personagem. Decisão do responsável em 05/10/2026. A troca é ensinada numa seção de fechamento, depois da entrega e antes de publicar: o jogo publicado ganha a cara da criança, a escolha não vira critério e a seção conclui pelo vídeo. Os nomes dos sprites são neutros (bicho1, esconderijo1), para não contradizer a imagem escolhida. Quem já salvou o projeto recebe as imagens novas do curso ao abrir a aula, mas o código dele (nomes e tamanhos dos sprites) continua o antigo: registrar no módulo o que fica diferente para essas crianças.

O estado entregue por uma aula deve ser exatamente o que a seguinte assume, preservando o projeto de quem está aprendendo.

## 3. Projetos iniciais: só Programação e Jogo 2D

Cadê Todo Mundo e Desafio do Primeiro Jogo são jogos iniciais com paleta limitada. Não usar blocos de HTML, CSS, Estrutura, Aparência ou outras paletas indisponíveis. Isso vale para o projeto preparado, a versão pronta para jogar, as retomadas, o projeto final, `allowBlocks`, roteiros, critérios e desenhos no caderno. Esconder a categoria não resolve se o projeto ainda depende de um bloco dela.

As áreas do projeto e os blocos de valor continuam disponíveis como estrutura de Programação. O preparo da tela usa os recursos de Jogo 2D. Não confundir blocos de HTML/CSS que o aluno manipula com os arquivos internos gerados pelo motor para executar o jogo: esses arquivos não são conteúdo a ensinar nem a apagar indiscriminadamente.

Um curso posterior pode ensinar HTML, CSS, Pinta, outras extensões ou código quando isso fizer parte de seu objetivo e estiver liberado naquele ponto da jornada. Registrar a escolha e conferir a paleta real. Não ampliar o acesso só para acomodar um roteiro antigo.

Reconhecer o que veio pronto e o que a pessoa programou. Não atribuir a ela o desenho de artes preparadas ou todas as regras de um jogo que recebeu parcialmente montado. Esse reconhecimento fica na comemoração e no caderno ("O jardim e os personagens já vieram prontos, mas olha só o que você programou…"). Na montagem, não dizer em frase solta o que já está preparado, como "O jardim e os personagens já estão preparados": a criança vê o que já está no projeto, e a frase solta quebra a conversa. O que vem pronto só entra na fala quando ajuda a ação, no momento em que ela o encontra e com o papel que tem ali: "Olha aqui: nessa área já tem o bloco Quando clicar ou tocar num sprite do grupo esconderijos. É ele que percebe quando alguém toca num esconderijo"; "Escolha aviso. É essa variável que mostra a mensagem na tela". Ajuste do responsável em 06/10/2026.

## 4. Quizzes: quantidade, lugar e correção

**A seção do quiz contém exatamente diálogo do Zappy → quiz. Sem vídeo, Estúdio, experiência, texto adicional, materiais ou certificado na mesma seção.**

Nos dois cursos curtos atuais, há **um quiz por curso**, na aula final, imediatamente antes da seção do certificado: três perguntas no Cadê Todo Mundo e quatro no Farol. A publicação já foi ensinada; não é uma nova condição para fazer o quiz ou emitir o certificado.

Em cursos maiores, distribuir quizzes por aula ou etapa quando houver raciocínio novo a retomar. Um por aula pode ser adequado, mas não é obrigação para uma aula de consulta, abertura ou celebração. Justificar quantidade e posição na proposta. Em uma aula de construção, o quiz pode anteceder a entrega ou o teste final; nos dois cursos curtos, antecede o certificado. Não repetir uma pergunta que só duplica o palpite ou a experiência.

Cada questão aborda uma situação concreta ensinada, uma relação ou decisão. Alternativas erradas representam confusões compreensíveis, sem pegadinhas. Não cobrar memória de menu, velocidade de resposta, assunto futuro ou leitura de um tutorial opcional. A explicação mostra **por que** a regra funciona no jogo e ajuda a corrigir.

Nos quizzes finais atuais, a seção exige 100% com tentativas sem limite e sem espera artificial. O quiz entra em `completion.blockIds`, usando a revisão formativa já existente na plataforma. Acertar de primeira não é requisito; a correção é parte da aprendizagem. Não aplicar essa nota automaticamente a todos os cursos nem inventar uma propriedade de manifesto para ativar a revisão. Verificar submissão, retorno à aula, preservação de acertos e avanço ao certificado.

Manter certificados emitidos e aulas já concluídas. Adicionar uma seção não autoriza retirar conquistas anteriores ou recriar a aula com outro identificador.

## 5. Caderno, ajuda e publicação

O caderno acompanha o conteúdo real, com passo a passo completo. Pode conter visão geral, navegação, experiências, testes, publicação, quiz e certificado. Não inventar um “mapa” que a aula não ensina. O mapa separado para responsáveis foi retirado destes cursos.

Usar o padrão visual do Cadê Todo Mundo: tipografia, cartões, ilustrações e blocos com encaixes desenhados. **Cada bloco deve ter a cor exata da definição final no Estúdio**, inclusive áreas, famílias e valores encaixados. Não aproximar pela cor geral da categoria. Gerar e conferir o PDF renderizado, legibilidade e cortes.

Apresentar o caderno na seção 2 da primeira aula; anexar uma vez, com consulta, leitura e download opcionais. O vídeo mostra o caderno à criança e oferece as escolhas como convite: "Olha aqui: este é o seu Caderno do Aluno! (…) Se quiser, você pode ler aqui mesmo, na aula. E, se preferir, também pode clicar em Baixar para guardar o caderno e consultar onde quiser." Não dizer que ela não precisa baixar ou imprimir (seção 6). As outras aulas podem indicar onde encontrá-lo. O caderno não ganha um gabarito antecipado da revisão: orienta a retomar o trabalho e responder na aula.

Como Fazer recebe tutoriais de pausar, rever, ampliar, leitor, download e alternativas de interface. Links dentro das aulas abrem na **mesma aba**, com retorno à aula de origem. Conferir destino e retorno; não exigir visita a toda a biblioteca. Para uma dúvida sobre a atividade, indicar **Preciso de ajuda** no rodapé da aula conforme o fluxo existente.

Se publicar é a tarefa da seção, a aula ensina o caminho mínimo: Compartilhar, título e resumo (no Estúdio da aula o título vem do curso e só o resumo aparece), Gerar capa, conferir, Publicar e aguardar a confirmação. A publicação do primeiro jogo é momento de comemorar: a fala comemora, convida a copiar o link de jogar e a mandar para a família e os amigos, com ajuda de um adulto se precisar, e termina em Fechar e na saída da seção. No Estúdio da aula a confirmação é **Seu jogo está no Mural!** com **Copiar link de jogar**; no Estúdio completo, **Publicado! 🎉** com **Copiar link**. Decisão do responsável em 06/10/2026. Personalização e problemas ficam no Como Fazer. Nos dois cursos atuais, publicação é ensinada sem virar bloqueio técnico adicional. Conferir o acesso real ao Mural durante a oferta; não prometer ação indisponível.

## 6. Linguagem e encerramento

**A voz do Cadê Todo Mundo? vale para todo curso.** Ela foi aplicada ao Farol em 05/10/2026:

- A tarefa vem na primeira frase: "Agora faça o personagem andar pelo mapa."
- Uma ação por parágrafo, com o caminho completo: "Abra Jogo 2D, depois Movimento e depois Movimentos prontos. Pegue o bloco…".
- "Confira se ficou assim:" depois de cada montagem, com os blocos e valores que precisam estar lá.
- O teste diz o resultado esperado e traz uma correção curta para o erro provável.
- A verificação usa sempre a mesma fórmula: "Funcionou? Clique em Verificar esta etapa. Se faltar alguma coisa, corrija os blocos e clique novamente."
- Para botões, "clique em"; no jogo, "toque" ou "segure". Não usar "aperte".
- Palavra nova ganha uma frase ligada ao jogo, no momento do uso: "No jogo, o personagem é um sprite, que é um objeto do jogo que você pode programar."
- Não abrir com "vamos investigar" nem repetir tranquilizações como "não quer dizer que você errou"; dizer o significado concreto do valor.

Falar com “você”, em português brasileiro, com contexto concreto, acentuação e frases naturais. Sem travessões nas falas, metáforas não marcadas, perguntas retóricas que escondem uma ordem, excesso de elogios ou linguagem comercial. A referência de público atual é de 9 a 14 anos; não chamar quem assiste de “criança” na narração.

**Três vozes, cada uma com um papel.** A fala trata quem faz a aula como protagonista e o narrador como parceiro:

- **Você**: o que é da criança, o que ela faz e o que ela conquista. “Você vai construir um jogo chamado Cadê Todo Mundo”, “Toque num esconderijo”, “o seu jogo”, “Olha só o que você programou!”. As ações ficam no imperativo, dirigidas a ela (“Arraste…”, “Clique…”); “a gente arrasta o bloco” deixa dúvida sobre quem faz, porque no vídeo o narrador também arrasta.
- **A gente / vamos**: o raciocínio e o convite, como um amigo ao lado. “Para o jogo responder, a gente precisa ligar uma reação ao toque. Então, vamos fazer isso agora!”
- **Eu**: só o narrador demonstrando no vídeo. “Olha aqui: quando eu toco no arbusto…”

Evitar o “nós” de sala de aula (“Hoje nós vamos aprender…”, “Nesta aula nós vamos…”): é a voz de quem dá aula na frente da turma, o clima que a plataforma não quer. No lugar de “nós”, “a gente”; no lugar de “o nosso jogo”, “o seu jogo”, porque o jogo é dela. Na abertura, a autoria é dela e o convite é junto: “Oi! Você vai construir um jogo chamado Cadê Todo Mundo. Antes de montar o seu, vamos ver como ele funciona…”. Decisão do responsável em 06/10/2026; vale para todos os cursos.

**Toda fala conversa com a criança e chama a atenção dela.** Narração, ponte do Zappy e caderno falam diretamente com quem faz a aula, como alguém sentado ao lado dela: “o seu caderno”, “o seu jogo”, “Sua vez!”. Evitar a frase impessoal que só descreve, como “Este caderno fica aqui para consultar” ou “Os personagens já aparecem, mas a contagem ainda não muda”; dizer “Este é o seu caderno!” e “Seus personagens já aparecem, mas Achados ainda fica em zero”. Nos momentos que importam, a fala puxa o olhar da criança para a tela:

- “Olha aqui:” ao mostrar um lugar, um bloco ou o primeiro gesto da demonstração;
- “Olha só:” quando aparece um resultado (“Olha só: o personagem que estava atrás aparece!”);
- “Repare:” num detalhe que ela precisa notar, como um número que muda ou o nome que já vem no bloco (“Repare: o bloco chega com o nome jogador”);
- “Tá vendo?” logo depois do teste da retomada (“Primeiro, toque num esconderijo do seu jogo. Tá vendo? Não acontece nada, porque…”).

Um chamado por momento importante, variando as expressões; não em toda frase, para não virar fórmula. Cada “aqui” continua precisando de um apontamento visível no vídeo. A ponte do Zappy começa convidando (“Sua vez!” depois de uma demonstração; “Agora…!” ou “Hora de…!” antes de uma montagem) e termina na ação de saída. Pedido do responsável em 06/10/2026, aplicado ao Cadê e ao Farol; vale para todos os cursos.

**A fala é uma conversa contínua, não uma lista de frases soltas.** Quem narra conversa com a criança como alguém ao lado dela, e não lê um texto em voz alta. Na prática:

- cada frase se liga à anterior com palavras de conversa: “então”, “por isso”, “mas”, “é que”, “agora que”, “para isso”, “depois”, “ou seja”;
- todo resultado vem junto do porquê: “Tá vendo? Não acontece nada, porque o toque ainda não tem nenhuma reação ligada a ele”;
- a explicação diz o que é cada coisa no próprio jogo, em vez de deixar a ideia no ar: “O toque é a ação, e a reação que a gente quer é o esconderijo ficar invisível”;
- as três vozes no lugar certo: “você” para o que é dela e o que ela faz, “a gente” para pensar junto e convidar, “eu” só na demonstração;
- trocar sequências de frases curtas e secas (“Nada acontece. O toque ainda não tem uma reação. Vamos ligar uma.”) por uma frase que explica e convida.

Exemplo, na retomada do Cadê: em vez de “Primeiro, toque num esconderijo. Nada acontece: o toque ainda não tem uma reação. Vamos ligar uma.”, dizer “Primeiro, toque num esconderijo do seu jogo. Tá vendo? Não acontece nada, porque o toque ainda não tem nenhuma reação ligada a ele. Para o jogo responder, a gente precisa ligar uma reação a esse toque. O toque é a ação, e a reação que a gente quer é o esconderijo ficar invisível, para aparecer o personagem que está atrás dele. Então, vamos fazer isso agora!”.

A conversa não tira a precisão da montagem: o destino continua vindo antes da peça, o caminho da paleta continua completo e a verificação conserva a fórmula comum a todos os cursos. Explicar mais pode alongar os vídeos de experiência; a duração alvo acompanha a fala, sem acelerar. Num curso em que uma palavra de ligação é também o nome de um bloco, como “então” no bloco Se, usar outra (“por isso”, “ou seja”) para não confundir. Pedido do responsável em 06/10/2026, aplicado ao Cadê e ao Farol; vale para todos os cursos.

**O que é opcional vira convite, nunca negação.** A criança entende “Não precisa baixar nem imprimir” como uma ordem para não baixar. Oferecer a escolha: “Se quiser, você pode ler aqui mesmo, na aula. E, se preferir, também pode clicar em Baixar para guardar o caderno e consultar onde quiser.” Não acrescentar frases que só dizem o que ela não precisa fazer; quando a informação ajuda, dizer o que ela pode fazer (“Você pode seguir mesmo sem terminar a partida”). Uma proibição de verdade, que evita um erro, continua clara e direta: “Não coloque um encontro dentro do outro.” Ajuste do responsável em 06/10/2026.

Encerrar na ação real: Próxima seção, envio e confirmação, ou Concluir aula. Na seção do certificado, orientar Pegar meu certificado; quem já emitiu encontra Baixar certificado (PDF). Não antecipar a próxima tarefa depois da saída, atribuir autoria exagerada ou inserir venda na celebração infantil. Continuidade comercial é dirigida ao responsável fora dessa tarefa.

Não localizar a ferramenta como “aqui ao lado” ou “aí embaixo”: a posição muda com o tamanho da tela. Mostrar e nomear a atividade. Posições internas estáveis e encaixes continuam sendo descritos. Na gravação, conferir que o efeito citado está realmente visível; não fabricá-lo na edição. Na ferramenta externa, comparar o trabalho com sinais observáveis; assistir ao vídeo não comprova a criação.

## 7. Como manter as decisões vivas

1. Ao aprovar uma mudança pedagógica, registrar aqui a regra, motivo e escopo. Toda correção pedida na revisão de um curso que valha para outros cursos entra aqui no mesmo dia, para os próximos já nascerem certos. Se depender do curso, registrar também sua aplicação em `modulos-*.md` e na proposta. Atualizar orientações antigas que a contradigam.
2. Atualizar juntos proposta, roteiro, gerador, manifesto, caderno e critérios. O manifesto gerado não pode ser a única edição: regenerá-lo precisa conservar a decisão.
3. Regras estruturais verificáveis entram no validador e em testes com casos inválidos: ordem do Zappy, isolamento do quiz, paletas e preservação do certificado. Qualidade da explicação e pertinência da experiência exigem leitura humana.
4. Rodar geradores, validadores de manifesto/roteiro/Como Fazer, testes dos cursos e dos fluxos alterados. Conferir cores e diagramação dos PDFs e testar como aluno: revisão, erro, correção, retorno e avanço.
5. Antes de atualizar conteúdo remoto, reconciliar identificadores e anexos. `plannedVideo` e `items: []` são moldes locais, não substitutos para vídeos e PDFs publicados. Conferir a prévia da importação, preservar conteúdo existente e registrar o ambiente atualizado.
6. Marcar o que foi validado localmente, o que foi aplicado no Admin, o que precisa de gravação e o que ainda precisa de ensaio com crianças. Teste automatizado não comprova compreensão infantil.

Os 37 manifestos de Cadê Todo Mundo?, A Chave do Farol, Nave Contra Asteroides, Corre, Dino! e O Jogo do Meu Jeito têm cobertura das regras novas. Nas revisões de 05/10/2026, a apresentação do jogo e o caderno abrem a primeira aula de construção; nenhuma aula é só de introdução. Cobertura editorial e técnica não substitui gravação, importação e ensaio com alunos.

**Aplicação ao trabalho externo, 05/10/2026:** no Pinta e no Estúdio completo, o aluno compara sinais concretos do próprio trabalho e aguarda o salvamento. Assistir ao vídeo não comprova a criação. Toda aplicação externa precisa ter uma entrega obrigatória posterior pela galeria da mesma ferramenta, na mesma aula. Não inventar projectChecks nem platformAction para validar um projeto externo. `platformAction` pertence às ações internas de avatar, quarto e tema. A entrega real usa Escolher no Pinta/Estúdio, seleção, Enviar ao professor e confirmação de recebimento; não acrescentar a confirmação Enviar do workspace embutido. A publicação no Estúdio completo termina em Publicado!, com Abrir o jogo; o host da aula tem outra celebração. Conferir o fluxo da ferramenta usada antes de reutilizar textos.

**Aplicação ao Farol, 04/10/2026:** a experiência de memória separa retirada do objeto, aviso e informação guardada, com o mesmo sumiço e aviso nos dois modos. A experiência da porta torna visíveis valor, pergunta e resposta escolhida. A construção de senão precede a de então, com teste e verificação intermediários no mesmo projeto e envio ao final. As verificações conservam as regras essenciais dos dias anteriores; o teste jogado inclui reiniciar depois da vitória. A edição do aviso é opcional. Essas escolhas respondem às dificuldades deste jogo; não fixam uma quantidade de seções ou experiências para os demais cursos. A comparação de velocidade dentro da montagem do Dia 1 foi revista em 05/10/2026 pelas regras "uma ideia por seção" e "conceito novo, experiência antes".

## Origem das decisões

Consulta histórica opcional; não é preciso reconstruir as regras a partir desses relatos.

- [Revisão de linguagem do Cadê Todo Mundo, 27/09](REVISAO-LINGUAGEM-CADE-TODO-MUNDO-2026-09-27.md): teste com duas crianças, tarefa escondida pelo tour, passos completos, verificação e destino dos tutoriais.
- [Revisão de roteiros, 20/09](REVISAO-ROTEIROS-2026-09-20.md): âncoras, rótulos reais, tempo para gestos, autoconferência e efeitos visíveis.
- [Review pedagógico do Farol, 03/10](qa/review-pedagogico-desafio-2026-10-03.md): continuidade entre projetos, critérios vinculados ao evento e ramo corretos, contextos e caderno.
- [Revisão do Farol, 04/10](qa/revisao-pedagogica-desafio-2026-10-04.md): comparação, memória observável, construção em duas etapas e diagnóstico da coleta; [registro da aplicação local](qa/revisao-desafio-2026-10-04/aplicacao.md).
- Revisão do Farol e do Cadê, 05/10: sem aula só de introdução, experiência que explica enquanto faz, retomada da experiência no próprio jogo antes de montar, mexa e veja, primeiro o destino e depois a peça, uma ideia por seção, experiência para cada conceito novo e rótulos como aparecem na tela; registro em [modulos-desafio-primeiro-jogo.md](modulos-desafio-primeiro-jogo.md).
- Revisão de linguagem do Farol, 05/10: voz do Cadê Todo Mundo? aplicada a roteiros, pontes, experiências, quiz e caderno, com rótulos conferidos no código; registro em [modulos-desafio-primeiro-jogo.md](modulos-desafio-primeiro-jogo.md).
- [Quizzes dos cursos curtos, 03/10](proposta-quizzes-cursos-curtos-2026-10-03.md): aplicação específica da revisão antes do certificado.
- Reestruturação de Nave Contra Asteroides e Corre, Dino!, 05/10: experiências antes da aplicação, montagens por conceito, contexto do próprio jogo, destinos visíveis e quizzes distribuídos; mapas em [Nave](modulos-nave-contra-asteroides.md) e [Corre, Dino!](modulos-corre-dino.md), com verificação local e etapas de produção discriminadas.
- Reestruturação de [O Jogo do Meu Jeito](modulos-o-jogo-do-meu-jeito.md), 05/10: criação autoral no Pinta, integração no Estúdio, experiências antes da aplicação, autoconferência e entregas reais pela galeria; quatro quizzes isolados e publicação opcional.
- Vídeo da experiência como demonstração, 06/10: o narrador faz os testes na primeira pessoa e explica, ligando ao que a criança vai montar; a vez dela começa no "Agora é a sua vez". Aplicado aos cinco cursos (Cadê, Farol, Nave, Corre Dino e Meu Jeito), e o recado da trava do vídeo passou a dizer "Pronto! Agora é a sua vez" nas cenas e no jogo pronto.
- Três vozes, 06/10: "você" para o que é da criança e o que ela faz, "a gente"/"vamos" para pensar junto e convidar, "eu" só na demonstração; sem o "nós" de sala de aula e com "o seu jogo" no lugar de "o nosso jogo". Pedido do responsável depois de perguntar se a fala deveria usar "você" ou "nós".
- Falas que conversam com a criança, 06/10: toda fala diz "você", chama a atenção dela para o que aparece na tela ("Olha aqui", "Olha só", "Repare", "Tá vendo?") e oferece o que é opcional como convite. No mesmo dia, segunda rodada: cada fala virou uma conversa contínua, com o porquê de cada resultado e a ação e a reação ditas no próprio jogo; saíram das montagens as frases soltas sobre o que já vem preparado. Saiu o "não precisa baixar nem imprimir" da apresentação do caderno, que a criança entendia como uma ordem para não baixar. Aplicado ao Cadê e ao Farol (roteiros, pontes do Zappy, caderno e Como Fazer); registro em [modulos-cade-todo-mundo.md](modulos-cade-todo-mundo.md) e [modulos-desafio-primeiro-jogo.md](modulos-desafio-primeiro-jogo.md).
