# Diretrizes pedagógicas das aulas

Direção comum desde 21/10/2026: uma fonte editorial para adultos e público infantojuvenil. A explicação precisa ser simples para uma criança e o tratamento precisa servir também a adolescentes e adultos. Humor e acolhimento cabem; infantilização não. Leia o [contrato de voz](DIRETRIZES-VOZ-ELEVENLABS.md) e a [especificação de unificação](../plans/2026-10-21-unificacao-aulas-plataforma-design.md).

**Tom de conversa em todas as aulas:** trazer a situação para quem assiste, com frases que alguém falaria ao seu lado. Exemplo aprovado: “Sabe quando alguém faz cócegas em você e você não consegue parar de rir? A cócega é a ação, e a risada é a reação.” Evitar construções distantes como “vem aquela risada” e cabeçalhos como “Uma dúvida possível é”. Variar as entradas conforme a situação, sem repetir uma fórmula. A interpretação tem energia e muda com a intenção: curiosidade, descoberta, instrução precisa e ajuda. Não usar voz calma e uniforme como padrão. Reaproveitar ilustrações claras já produzidas; no Cadê, manter cócegas/risada do Zappy e placar de futebol nos dois públicos.

As decisões de experiência concreta, montagem completa e teste vieram dos ensaios anteriores e continuam. Os relatos datados são contexto histórico; a linguagem e a produção atuais seguem este documento.

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
| Passo a passo do projeto | Acompanhar a aula, com o mesmo padrão visual | Extensão e conteúdo acompanham o percurso real |
| Entrega | Conferir o trabalho, reconhecer a autoria e encerrar | Publicação, certificado e atividades dependem da proposta do curso |

## 1. Contexto, vídeo, Zappy e atividade

Cada seção tem uma tarefa compreensível e uma saída clara. No ensaio do Cadê Todo Mundo, uma das duas crianças entendeu apenas que o professor apertou botões: o tour havia escondido o convite para jogar. A clareza é avaliada pelo que a pessoa consegue fazer sem receber uma explicação extra do adulto. Na abertura, apresente **qual jogo será construído e o que acontece nele**, antes de convidar a jogar a versão pronta, e diga o objetivo concreto da partida. No Cadê, o objetivo é encontrar os três personagens; no Farol, pegar a chave e levar o personagem até o farol. Não transforme a apresentação em tour da plataforma.

**Toda aula termina numa ação prática; não existe aula só de introdução.** A apresentação do jogo e o caderno são as primeiras seções da primeira aula de construção. Na Aula 1 do Cadê, a ordem é jogo pronto, caderno, experiência e montagem. Uma aula que só apresenta deixa a criança sem nada feito ao final, e a divisão em seções existe justamente para juntar abertura e prática na mesma aula (decisão de 05/10/2026, aplicada ao Farol).

Quando há vídeo, a ordem editorial é **vídeo → diálogo curto do Zappy → atividade ou encaminhamento**. Há no máximo um vídeo e um diálogo externo por seção. A ponte identifica a ação seguinte, sem repetir a aula, dar respostas da experiência ou acrescentar obrigação de conclusão. Registre a fala também na proposta e no roteiro como **texto da página, não gravar**. Consulta opcional continua opcional.

Uma experiência pode ter sua própria fala do Zappy junto aos controles. Ela ensina o gesto específico; a ponte liga o vídeo a essa tarefa. Não repetir o mesmo comando nas duas nem adicionar uma terceira instrução genérica.

Uma seção sem vídeo também precisa de contexto e orientação. No quiz, a fala vem **antes das perguntas** e diz o que será retomado, que haverá explicações e que é possível corrigir. Não inventar um vídeo para preencher o modelo.

Ordem dos blocos não é regra de bloqueio do player. A opção de assistir antes da atividade pertence à configuração do curso (`videoBeforeActivity`). Se estiver ativada, o player libera após o limiar de visualização, e só no jogo pronto e na experiência: uma seção só com Estúdio, Pinta, materiais ou entrega pela galeria não tranca, porque ali a criança faz junto com o vídeo (uma seção mista, com editor e experiência, tranca o painel inteiro; evitar); se estiver desativada, a atividade fica disponível junto do vídeo. Seção de quiz não tem vídeo e não recebe essa espera. Não escrever instruções que contrariem a configuração usada.

## 2. Montagem guiada e conceito concreto

Na montagem, ensinar caminho da paleta, nome literal do bloco, encaixe com referência visível, campo, valor, o que manter, teste e correção do erro provável. **Primeiro o destino, depois a peça:** a fala manda deixar à vista o lugar do encaixe (área, bloco vizinho ou espaço vazio) antes de abrir a paleta, e só então pegar o bloco e arrastar até lá. Com um bloco preso no mouse, a criança não consegue mover o espaço dos blocos para procurar o destino. Quando o lugar pode estar fora da tela, ensinar a arrastar um espaço vazio entre os blocos. Blocos de valor seguem a mesma lógica: nomear o número ou a pergunta que será trocada antes de buscar o bloco que a substitui. Não pedir que a pessoa adivinhe uma peça nem usar “faça como eu fiz” como substituto. Se um valor já está certo, explicar e mantê-lo. Aguardar os gestos; encurtar linguagem não significa acelerar a montagem. Quando a plataforma exige verificação, ensinar a sequência completa: testar o jogo, **Verificar projeto**, corrigir e verificar novamente se necessário, conferir **Objetivo cumprido!**, esperar **Salvo**, **Enviar meu projeto**, confirmar **Enviar** e avançar ou concluir. Uma instrução omitida pode impedir a conclusão mesmo com o jogo certo.

Explicar palavras novas quando necessárias e usar o próprio jogo como exemplo.

**O vídeo dá sentido ao conceito; a experiência conduz a investigação.** Desde 25/10/2026, seguir [Conceito, investigação e construção](DESCOBERTA-GUIADA.md). O vídeo nomeia a ideia, usa uma situação concreta e uma analogia quando ajuda, liga-a ao jogo e propõe algo para observar. Uma demonstração breve pode esclarecer a ideia, sem percorrer todos os controles e testes para a pessoa repetir.

As comparações da experiência são orientadas pelo Zappy, em falas curtas determinadas pelo estado e pelas ações realizadas. Os objetivos guiam a investigação; os controles ficam livres e as descobertas contam em qualquer ordem. A pessoa pode repetir e continuar depois de concluir. Cada orientação aparece quando necessária. O botão pedido usa a cor principal do tema; as demais ações continuam reconhecíveis como botões secundários. A cena torna visíveis a regra, a mudança e os casos em que nada muda. A ponte externa convida à investigação e não repete a fala interna.

A montagem do Estúdio continua completa e no imperativo: a pessoa constrói junto com o vídeo, com destino à vista antes de buscar a peça. O vídeo do jogo pronto apresenta como jogar com um exemplo breve e passa a vez, preservando o restante da partida para a descoberta. A trava de vídeo, quando configurada, continua valendo para o jogo pronto e a experiência; não é um mecanismo de avanço das falas internas.

Uma comparação curta com o dia a dia da criança ajuda a ideia a fazer sentido. Exemplos:

- cócegas e risada, para ação e reação;
- placar de futebol, para variável;
- desenho animado, para quadro;
- tamanho do passo, para velocidade;
- anotar num bloquinho, para guardar uma informação (não “caderno”, que lembra a escola);
- a porta de casa que só abre com a chave, para condição.

Escolher comparações gentis e próximas da criança, de casa, da rua, do jogo e da brincadeira; não da escola (lista de chamada, sala de aula, professora, prova). A comparação serve à explicação e não vira assunto. Ela parte de uma regra que a criança já vive e chega ao passo concreto do jogo, com a palavra que aparece no botão ou no bloco, e diz com clareza o que é cada coisa no próprio jogo: "A cócega é a ação, e a risada é a reação. No seu jogo, o toque é a ação. A reação que a gente quer é um esconderijo ficar invisível, para aparecer quem está atrás dele. Essa reação precisa estar ligada ao toque para acontecer". Dizer só "a gente precisa ligar uma reação a essa ação", sem dizer qual é a reação, deixa a ideia no ar (ajuste do responsável, 06/10/2026). Evitar frases abstratas sobre programação, como "na programação, nada é automático": falam do que falta e não dizem o que fazer. Ajuste do responsável em 05/10/2026. Na frase da comparação, o vídeo mostra um meme ilustrado por 2 a 3 segundos, como reforço visual e de humor. O desenho é nosso, no formato de meme, com o Zappy ou os personagens do jogo. Não usar foto de pessoa real nem meme da internet, por direitos de imagem e porque muitos nasceram em contextos impróprios para crianças. O meme não cobre a experiência, e a narração explica sem depender dele. A nota de tela descreve cada meme. Decisão do responsável em 05/10/2026. O tom continua curto e simples. A direção de 25/10/2026 preserva a explicação concreta e reserva a sequência completa de testes para a investigação guiada pela atividade.

Pistas são ajuda adicional, nunca o único lugar com um passo obrigatório. Palpite só entra quando comparar hipótese e observação ensina algo; não vale nota e não aparece automaticamente em toda seção.

“Dor antes da solução” cabe quando existe um problema reproduzível no jogo; na montagem que aplica uma experiência, é a retomada descrita acima. Conferir se o problema aparece de verdade. Não encenar um defeito encoberto pelo cenário nem usar a sequência como obrigação para qualquer conceito.

**Uma ideia por seção.** Cada seção com Estúdio trabalha uma única ideia: os gestos dessa ideia ficam juntos e ideias diferentes vão para seções diferentes, mesmo que fiquem na mesma aula. O Cadê tem uma montagem por aula porque cada aula acrescenta um ou dois blocos, e esse número não é molde. No Farol, a primeira versão do Dia 1 juntava controles e movimento, repetição a cada quadro, velocidade, limite da tela e ordem num único vídeo de 5 a 6 minutos; a revisão de 05/10/2026 separou essas ideias. As seções intermediárias conferem o trabalho com **Verificar projeto**, sem envio; o envio fica para a última parte que muda o projeto. Na Aula 2 do Cadê, desde 11/10/2026, a contagem é verificada na parte 3 e o único envio fica no fim da personalização, na parte 4. O salvamento automático conserva o trabalho entre as partes; enviar é entregar a versão concluída para a equipe.

**Conceito novo, experiência antes.** Todo conceito novo ganha uma experiência que o torna concreto antes de virar bloco no Estúdio: primeiro a criança vê e manipula a ideia, depois monta. Conceito é o que muda o comportamento do jogo, como repetir a cada quadro, quanto anda por quadro, limite da tela, evento, variável e condição. Operação de interface não é conceito e não ganha cena. A experiência vem antes da primeira montagem que aplica o conceito, de preferência na seção imediatamente anterior; uma experiência pode preparar duas montagens seguidas quando mostra as duas ideias. Quando uma cena existente mostra o mesmo conceito, reaproveitá-la com o cenário do curso e escolher as metas pelo `setup`; quando nenhuma mostra, construir a cena antes de gravar a aula.

**Retomar a experiência no próprio jogo antes de montar.** A montagem que aplica um conceito não começa pelo bloco. Primeiro, numa conversa curta:

1. Pedir um teste no jogo da pessoa que mostre o que ainda falta, com o porquê.
2. Lembrar o que a experiência mostrou, como a resposta para essa falta.
3. Dizer o que a montagem vai fazer.

No Cadê, por exemplo: "Aqui no seu jogo, toque num esconderijo. Tá vendo? Nada acontece, porque o toque ainda não tem nenhuma reação ligada a ele. Lembra da experiência da parte anterior? O arbusto só ficou invisível depois que você ligou a reação ao toque. Agora a gente vai fazer isso com os esconderijos do seu jogo!" Como esta é a primeira montagem, antes de "Para começar, encontre a área Quando acontecer", apresentar brevemente os comandos como instruções que dizem ao jogo o que fazer, os bloquinhos e a paleta onde escolhê-los. Apontar a paleta sem pegar nenhum bloco: o destino do encaixe continua vindo antes de buscar a peça. Ajuste aprovado pelo responsável em 09/10/2026; a fala completa está no roteiro da Aula 1.

**Apresentar os blocos no primeiro contato.** A apresentação de comandos, bloquinhos e paleta também entra na primeira montagem do Desafio do Primeiro Jogo (Dia 1, seção 4), depois da retomada e antes de procurar **Ao iniciar**. O Desafio recebe quem nunca programou, sem exigir o Cadê como preparação. A apresentação cabe neste primeiro contato; nas montagens seguintes, a criança já conhece os blocos. Aplicação aprovada pelo responsável em 09/10/2026.

**Primeiro o problema, depois a lembrança.** A retomada começa por uma ação da criança no próprio jogo e pelo que falta ("Tá vendo? Nada acontece, porque…"); só então a experiência volta, como a solução que ela já viu, e o anúncio conduz à montagem. No primeiro contato, apresentar os comandos, os bloquinhos e a paleta antes de pedir para encontrar a área; nas montagens seguintes, seguir direto ao primeiro passo. Assim a fala começa pela tarefa e a lembrança chega quando a criança sente a falta. Proposta do responsável em 06/10/2026, à noite, com a apresentação dos blocos acrescentada em 09/10/2026. Quando o efeito ainda não aparece no jogo (uma variável sem mostrador), não há teste: a retomada é só a lembrança e o anúncio.

**A retomada é uma ponte, não um segundo vídeo da experiência.** Ela cabe em cerca de quatro ou cinco frases curtas (até umas 50 palavras): o teste no jogo da criança com o porquê numa frase só, o resultado da experiência numa frase e o convite com o que vai ser montado. Ela não repete a explicação, a comparação do dia a dia nem a definição que o vídeo anterior acabou de dar ("o toque é a ação, e a reação é…" já foi dito ali), e anuncia a montagem uma vez só, sem "Agora a gente vai…" seguido de "Então, vamos fazer isso agora!". A criança acabou de ver a experiência: repetir tudo cansa e atrasa a hora de montar. Ajuste do responsável em 06/10/2026, à noite, depois de ler a parte 4 da Aula 1 do Cadê ("um pouco prolixo, um pouco repetitivo"); a versão de antes juntava, depois do teste, "Para o jogo responder, a gente precisa ligar uma reação a esse toque. O toque é a ação, e a reação que a gente quer é o esconderijo ficar invisível, para aparecer o personagem que está atrás dele. Então, vamos fazer isso agora!". A versão mais antiga ("Primeiro, toque num esconderijo. Nada acontece: o toque ainda não tem uma reação. Vamos ligar uma.") também não serve: soava como texto lido, com frases soltas e sem o porquê. O meio-termo é curto **e** conversado. No fim da montagem, o mesmo teste mostra a diferença. A criança não liga sozinha a experiência ao próprio jogo; sem essa ponte, o bloco vira um gesto solto. A retomada é curta e não vira recapitulação. Ela diz onde a experiência foi feita, porque "na experiência" sozinho faz a criança procurá-la na seção em que está. Se a experiência foi na seção logo antes, a fala diz "Lembra da experiência da parte anterior?". A fala não manda clicar em **Anterior** para rever: isso quebra o ritmo e tira a criança da montagem na hora em que ela vai começar; quem quiser rever encontra o botão. A retomada é animada e convida a programar ("Agora a gente vai fazer isso no seu jogo!"), em vez de soar como aviso. Ajuste do responsável em 05/10/2026. Se ela ficou mais atrás, a fala nomeia a parte, como "Lembra da experiência da primeira parte desta aula?". Quando o efeito ainda não aparece no jogo, como uma variável sem mostrador, a fala só lembra a experiência e diz isso com honestidade, sem inventar um teste. A regra veio de pedido do responsável em 05/10/2026 e foi aplicada ao Cadê e ao Farol.

**Objetivos do projeto: uma lista curta que a criança entende.** Desde 18/10/2026 o Estúdio da aula não tem nota nem painel de atividade: cada parte com Estúdio tem uma lista de **Objetivos** que o servidor confere em **Verificar projeto**, e a lista aparece embaixo do Estúdio com o estado de cada um ([especificação](../plans/2026-10-18-objetivos-do-estudio.md)). Regras para quem escreve:

- O rótulo é a tarefa no imperativo, com o nome que está na tela: “Faça o personagem andar com as setas”, “Use um bloco de repetir”. Nunca “Objetivo 1” nem a regra técnica.
- A dica só aparece depois de verificar e não passar: diga onde procurar ou o que conferir (“Procure o bloco na gaveta Laços”), não a resposta inteira.
- Obrigatório é o que a parte ensina; **desafio extra** é um passo a mais para quem quiser (não tranca, vale 5 XP uma vez). Parte só com extras não tem critério e a publicação acusa.
- Prefira as ideias de programação e os blocos (conferidos na hora). Os que **rodam o jogo** (“O jogo faz algo”, “A função responde certo”, “Regra em JavaScript”) levam alguns segundos e servem quando o que importa é o comportamento; a Regra em JavaScript é para a equipe que programa e vale só na Ponte e no Pro. Jogos 3D do modo Blocos não rodam no teste (ele roda sem internet).
- Todo objetivo que roda o jogo precisa do **gabarito** no bloco do Estúdio, conferido no **Testar agora** do Admin: o projeto inicial tem que faltar e o gabarito tem que cumprir. O teste segura cada tecla pelo tempo do passo; jogo que lê a tecla a cada quadro precisa de pelo menos alguns décimos de segundo.
- Publicar exige a presença do gabarito e confere sua estrutura; não roda o jogo nem exige comprovante do teste de execução. Confira **Testar agora** antes de publicar. Uma análise incompleta ou um executor indisponível não comprovam que o objetivo pode ser cumprido.
- A fala da montagem ensina a lista: “Funcionou? Clique em Verificar projeto. Se faltar alguma coisa, leia a dica, corrija os blocos e clique novamente.” Mexer no projeto depois de verificar marca o resultado como antigo; a fala não promete que o “cumprido” fica.

**Mexa e veja numa seção própria, com mudanças que ficam.** O mexa e veja é uma seção separada, nunca um momento dentro da montagem. A montagem tem um caminho só: montar, testar, verificar e enviar. Uma mudança no meio dela tira o foco e pode fazer a verificação reprovar.

A seção só traz mudanças que a criança mantém no jogo: trocar personagens e esconderijos, trocar o cenário, o barco, a chave ou o par de imagens do farol, escrever a mensagem do final ou os avisos, escolher onde fica a chave. É quando o jogo passa a ser dela. Trocar um valor para ver o efeito e depois voltar ao anterior não é mexa e veja: experimentar é papel da experiência, que já faz isso melhor e sem risco para o projeto. "Mexa e veja" é o nome interno do tipo de seção, para a equipe. Com a criança, a fala vai direto ao que ela pode fazer ("Agora deixe o jogo com a sua cara!", "Agora escreva os avisos do seu jeito!"), diz que o que ela mudar fica no jogo e termina com um teste. Ajuste do responsável em 06/10/2026. As escolhas não viram critério de conclusão.

**A surpresa do final: só no Cadê Todo Mundo? e na Chave do Farol.** Nesses dois cursos, os primeiros da criança, a personalização que fecha o curso é anunciada desde a abertura como uma surpresa, para ela ter um motivo a mais para chegar ao fim. Não é regra para os outros cursos: depois desses dois, a criança já sabe que pode personalizar o jogo, e não haveria surpresa nenhuma. Nos outros cursos, a personalização não é anunciada como surpresa, e o lugar dela (no fim, como hoje, ou até no começo) é uma decisão de cada curso. Nos dois cursos, são três momentos, cada um uma vez só:

1. **Plantar**, no vídeo do jogo pronto, antes de passar a vez: "Ah, e tem mais uma coisa: no fim da aventura tem uma surpresa esperando por você. Ela vai deixar o seu jogo ainda mais seu." A fala conta que a surpresa existe, sem dizer o que é, mas com uma pista que bate com o que ela vai receber; "tem uma surpresa" sozinho cria uma expectativa que o curso não cumpre. Nos dois cursos, a fala anuncia a surpresa sem pedir que a criança guarde um segredo: não há nada que ela precise esconder ou deixar de contar. Ajuste do responsável em 07/10/2026.
2. **Lembrar**, no fim da aula anterior à revelação, entre o envio e **Concluir aula**, junto da comemoração do que ela programou: "E lembra da surpresa que eu te contei lá no começo da aventura? Pois é, ela está quase chegando! Na próxima aula, você já vai descobrir o que é."
3. **Revelar**, no começo do vídeo da personalização: a fala diz que a surpresa chegou e revela o que o curso tem de próprio, com o Passo a passo do projeto na tela antes de voltar ao Estúdio, e fecha ligando as escolhas à publicação ("é com essa cara que ele vai para o Mural"). No Cadê, a turma nova e os esconderijos: "A surpresa chegou! Olha quem mais pode brincar de se esconder! Agora você vai escolher os bichinhos e preparar os esconderijos da sua brincadeira." No Farol, combinações que transformam a aventura inteira, com duas versões completas do jogo na tela antes de abrir as opções: "Sua missão deu certo! E a surpresa chegou: olha quantas versões essa aventura pode ter: outro personagem, outro cenário, outro barco… Que combinação você vai criar?" A apresentação funciona para quem está começando e para quem já fez o outro curso, sem comparar os dois. A ponte do Zappy da seção começa com "A surpresa chegou!".

O Passo a passo do projeto é aberto na primeira aula e já mostra a galeria. Em vez de esconder, as páginas dela levam o sobretítulo **A surpresa do final**, e a visão geral cita a surpresa: quem espiar fica com mais vontade de chegar lá. Nada mais do curso é chamado de surpresa. Decisão do responsável em 07/10/2026, restrita a esses dois cursos.

**Cada curso anuncia a surpresa com as suas palavras.** As frases acima são as do Cadê Todo Mundo?. Muitas crianças fazem os dois cursos, e ouviriam a mesma frase duas vezes, então a Chave do Farol diz o mesmo de outro jeito, com a mesma pista: "E tem uma coisa esperando por você lá no fim desta aventura: uma surpresa para deixar o jogo do seu jeito." para plantar; "E lembra da surpresa que eu te contei quando a aventura começou? Ela está quase aqui! Na próxima aula você vai descobrir o que é." para lembrar; e a revelação do item 3, que mostra o que cada curso tem de próprio. O Passo a passo do projeto acompanha a fala do curso. Decisão do responsável em 07/10/2026.

A seção de mexa e veja vem antes de publicar, para o jogo publicado ter a cara da criança. No Cadê, desde 11/10/2026, ela também é a seção de entrega: a contagem é verificada antes, sem envio, e o jogo é enviado uma única vez depois das escolhas. No Dia 3 do Farol, desde 11/10/2026, a parte 3 verifica a decisão, as partes seguintes trabalham imagens, avisos e posição, e o único envio fica no fim de **Escolha onde fica a chave**, antes de publicar. Uma escolha que é a própria aplicação de um conceito vem depois da experiência dele, como o lugar da chave do Farol depois da experiência de x e y. Ela pode ficar numa seção própria de fechamento, como no Farol, ou na sua seção de montagem; na montagem, a verificação aceita qualquer valor razoável e a aula seguinte não depende de um valor fixo. Aplicado em 05/10/2026, a pedido do responsável:

- Cadê: **Deixe o jogo com a sua cara**, na Aula 2, com bichos, esconderijos e a mensagem do final;
- Farol, revisão de 06/10/2026: saem `tanto` e `velocidade` do Dia 1; o movimento fica em 3. No Dia 3, uma parte para trocar as imagens (personagem, barco, chave, o par apagado/aceso do farol e cenário), outra curta para escrever os avisos, depois experimentar x/y e escolher o lugar da chave antes de publicar (o par do farol saiu da parte dos avisos para a das imagens no mesmo dia, por decisão do responsável: uma ideia por seção e publicação mais cedo). Cada tipo de imagem conserva tamanho e contato, e o Passo a passo do projeto mostra as opções com os mesmos nomes da lista;
- saíram o "troque 0 por 50 e volte para 0" do Cadê e o "troque 3 por 1 e volte para 3" do Farol.

**Rótulos como aparecem na tela.** Nomear o bloco pela face que a criança vê, conferida no código, e não pelo nome do catálogo: o bloco lógico aparece como **verdadeiro**, com menu, e não como "Verdadeiro ou falso". Dizer o que já vem no bloco e precisa ser trocado: o texto nasce com **Olá**, o Se nasce com a pergunta **x > 0** e os valores nascem como número. Quando o bloco chega com um nome de outro jogo (**heroi**, **jogador**, **inimigo**, **contador**, **resposta**, o **x** do valor da variável), a fala diz a palavra que está na tela e onde clicar, na primeira vez de cada bloco: "Repare que o bloco chega com heroi. Clique em heroi e escolha personagem." "Escolha personagem" sozinho não diz em que clicar, e um nome estranho na tela parece erro. Revisão do Farol de 13/10/2026, com a forma que o Cadê já usava. Ensinar o controle real que acrescenta uma parte, como o **+** que abre o **senão**, embaixo do Se. Quando dois controles iguais ficam lado a lado, a fala diz qual: o rodapé do Se mostra "+ senão se + senão", e "o sinal de mais ao lado de senão" serve para os dois; o Farol diz "o segundo sinal de mais, antes da palavra senão, no fim da linha" (revisão de 13/10/2026, conferida em `ifElseMutator.ts`). Botão que aparece só como ícone é nomeado e localizado por uma posição estável, como **Compartilhar**, no alto do Estúdio.

**Conferir o projeto preparado antes de mandar procurar algo.** O Estúdio só cria as áreas que têm blocos. Se a montagem precisa de **Quando acontecer** e o projeto ainda não tem eventos, a fala ensina a criar a área: deixar um espaço vazio à vista, abrir **Áreas do projeto**, pegar **Quando acontecer** e soltar. A primeira versão do Dia 2 do Farol mandava procurar uma área que não existia.

**Uma busca por vez.** Quando o destino pode estar fora da tela, a fala manda procurar primeiro a área, com o socorro ("Se ela não estiver aparecendo, arraste um espaço vazio entre os blocos até ela aparecer"), e só depois o bloco dentro dela. Juntar as duas buscas numa frase ("encontre na área Quando acontecer o bloco…") deixa a criança procurando duas coisas ao mesmo tempo, sem saber qual falta. O socorro vale também quando a montagem anterior terminou em outra área. Ajuste do responsável no Cadê em 10/10/2026, estendido ao Farol na revisão de 13/10/2026.

Números dentro dos blocos são sombras: o bloco novo solto em cima deles toma o lugar sem sobrar nada. Já a pergunta **x > 0** que nasce no **Se** é um bloco de verdade. Ela vai primeiro para a lixeira, e a pergunta nova entra no lugar vazio. Soltar em cima dela deixa um bloco solto ou monta uma pergunta que a verificação não aceita.

**Artes que a criança pode trocar usam uma caixa única.** O bloco que cria um sprite guarda largura e altura; trocar só a imagem estica o desenho novo para o tamanho antigo. Quando a aula oferece escolher entre desenhos, como bichinhos e esconderijos no Cadê, todos os desenhos de um mesmo tipo têm a mesma caixa e a mesma linha de base, e a caixa do esconderijo cobre a do personagem. Decisão do responsável em 05/10/2026. A troca é ensinada antes de publicar: o jogo publicado ganha a cara da criança, e a escolha não vira critério. No Cadê, essa parte é a única entrega da Aula 2 e exige vídeo e envio, mesmo quando a criança prefere manter as imagens e a mensagem. No Farol, a troca é uma aplicação anterior à entrega, com os critérios próprios de cada parte; o envio fica depois das imagens, dos avisos e da posição. Na última parte que muda o jogo antes de publicar, a seção também pode exigir o envio em dia (10/10/2026): ela só fecha quando o último envio é igual ao projeto de agora, para a equipe receber a versão final; quando já houve envio, a fala pede o reenvio do que mudou e, sem mudança, a parte fecha sem reenvio. No Cadê, o primeiro envio acontece na própria personalização; no Farol, depois da escolha de posição; o envio em dia só evita avançar com uma versão antiga se a criança voltar a editar depois de enviar. No Farol, a parte que troca o farol aceita qualquer imagem dentro de então, inclusive um farol desenhado pela criança; quem confere que o jogo publicado acende é o objetivo que roda o jogo, pela imagem do farol que muda ao vencer (29/10/2026; substitui a exceção de 06/10/2026, que exigia um dos faróis acesos de fábrica). Os nomes dos sprites são neutros (bicho1, esconderijo1), para não contradizer a imagem escolhida.

**Na personalização, cada troca é escolha da criança.** Depois de demonstrar uma troca, a fala diz que ela troca o que quiser e que o que ela gostou pode ficar como está; o teste e a publicação não supõem que tudo mudou. Uma regra de verdade aparece como condição ("se você trocar o farol, troque o par"), não como mais uma ordem. O exemplo da professora vem com "como" ("clique no nome da imagem, como veleiro"; "troque pelo x do lugar que você escolheu, como 160"): uma ordem com nome ou número fixo, logo depois de "você pode escolher", faz a criança copiar o exemplo. O "como" também serve a quem tem projeto salvo com nomes antigos. Ajuste do responsável no Cadê em 10/10/2026, estendido ao Farol em 13/10/2026. Quem já salvou o projeto recebe as imagens novas do curso ao abrir a aula, mas o código dele (nomes e tamanhos dos sprites) continua o antigo: registrar no módulo o que fica diferente para essas crianças.

O estado entregue por uma aula deve ser exatamente o que a seguinte assume, preservando o projeto de quem está aprendendo.

## 3. Projetos iniciais: só Programação e Jogo 2D

Cadê Todo Mundo e Desafio do Primeiro Jogo são jogos iniciais com paleta limitada. Não usar blocos de HTML, CSS, Estrutura, Aparência ou outras paletas indisponíveis. Isso vale para o projeto preparado, a versão pronta para jogar, as retomadas, o projeto final, `allowBlocks`, roteiros, critérios e desenhos no caderno. Esconder a categoria não resolve se o projeto ainda depende de um bloco dela.

As áreas do projeto e os blocos de valor continuam disponíveis como estrutura de Programação. O preparo da tela usa os recursos de Jogo 2D. Não confundir blocos de HTML/CSS que o aluno manipula com os arquivos internos gerados pelo motor para executar o jogo: esses arquivos não são conteúdo a ensinar nem a apagar indiscriminadamente.

Um curso posterior pode ensinar HTML, CSS, Pinta, outras extensões ou código quando isso fizer parte de seu objetivo e estiver liberado naquele ponto da jornada. Registrar a escolha e conferir a paleta real. Não ampliar o acesso só para acomodar um roteiro antigo.

Comemorar o que a pessoa fez e o resultado no jogo, sem atribuir a ela o desenho de artes preparadas ou regras que não montou. O preparo do cenário, dos personagens e das regras iniciais é informação interna da equipe; não usar essa informação como ressalva na comemoração, no caderno ou na descrição do curso. A fala pode dizer "Olha só o que você programou: o toque que faz cada personagem aparecer e a contagem dos achados". Só mencionar um elemento existente quando isso orienta a ação: "Olha aqui: nessa área já tem o bloco Quando clicar ou tocar num sprite do grupo esconderijos. É ele que percebe quando alguém toca num esconderijo"; "Escolha aviso. É essa variável que mostra a mensagem na tela". Explicar o papel do elemento, sem insistir que ele veio pronto. Ajuste do responsável em 10/10/2026.

## 4. Quizzes: quantidade, lugar e correção

**A seção do quiz contém exatamente diálogo do Zappy → quiz. Sem vídeo, Estúdio, experiência, texto adicional, materiais ou certificado na mesma seção.**

Nos dois cursos curtos atuais, há **um quiz por curso**, na aula final, imediatamente antes da seção do certificado: três perguntas no Cadê Todo Mundo e quatro no Farol. A publicação já foi ensinada; não é uma nova condição para fazer o quiz ou emitir o certificado.

Em cursos maiores, distribuir quizzes por aula ou etapa quando houver raciocínio novo a retomar. Um por aula pode ser adequado, mas não é obrigação para uma aula de consulta, abertura ou celebração. Justificar quantidade e posição na proposta. Em uma aula de construção, o quiz pode anteceder a entrega ou o teste final; nos dois cursos curtos, antecede o certificado. Não repetir uma pergunta que só duplica o palpite ou a experiência.

Cada questão aborda uma situação concreta ensinada, uma relação ou decisão. Alternativas erradas representam confusões compreensíveis, sem pegadinhas. Não cobrar memória de menu, velocidade de resposta, assunto futuro ou leitura de um tutorial opcional. A explicação mostra **por que** a regra funciona no jogo e ajuda a corrigir.

Nos quizzes finais atuais, a seção exige 100% com tentativas sem limite e sem espera artificial. O quiz entra em `completion.blockIds`, usando a revisão formativa já existente na plataforma. Acertar de primeira não é requisito; a correção é parte da aprendizagem. Não aplicar essa nota automaticamente a todos os cursos nem inventar uma propriedade de manifesto para ativar a revisão. Verificar submissão, retorno à aula, preservação de acertos e avanço ao certificado.

Manter certificados emitidos e aulas já concluídas. Adicionar uma seção não autoriza retirar conquistas anteriores ou recriar a aula com outro identificador.

## 5. Caderno, ajuda e publicação

O **Passo a passo do projeto** acompanha o conteúdo real, com instruções completas, e tem o mesmo nome nos dois públicos. Pode conter visão geral, navegação, experiências, testes, publicação, quiz e certificado. Não acrescentar um mapa ilustrado de percurso que a aula não ensina. O mapa separado para responsáveis foi retirado destes cursos.

Usar o padrão visual do Cadê Todo Mundo: tipografia, cartões, ilustrações e blocos com encaixes desenhados. **Cada bloco deve ter a cor exata da definição final no Estúdio**, inclusive áreas, famílias e valores encaixados. Não aproximar pela cor geral da categoria. Gerar e conferir o PDF renderizado, legibilidade e cortes.

Apresentar o caderno na seção 2 da primeira aula; anexar uma vez, com consulta, leitura e download opcionais. O vídeo mostra o Passo a passo do projeto à criança e oferece as escolhas como convite: "Olha aqui: este é o seu Passo a passo do projeto! (…) Se quiser, você pode ler aqui mesmo. E, se preferir, também pode clicar em Baixar para guardar o mapa e consultar onde quiser." Não dizer que ela não precisa baixar ou imprimir (seção 6). As outras aulas podem indicar onde encontrá-lo. O caderno não ganha um gabarito antecipado da revisão: orienta a retomar o trabalho e responder na própria aula.

**Um bloco de materiais por aula.** O Passo a passo do projeto, os links do Como Fazer e o que mais a aula oferecer para consultar (arquivo, imagem, vídeo de apoio, recado) ficam juntos, num bloco só, na parte em que aparecem pela primeira vez. Na tela o selo do bloco é **Consulte**: um nome que serve para tudo o que ele junta (decisão do responsável, 07/10/2026; "Baixe" mentia quando o item era um link). O validador dos manifestos recusa aula com dois blocos de materiais.

Como Fazer recebe tutoriais de pausar, rever, ampliar, leitor, download e alternativas de interface. Ele fala como as aulas, com o vocabulário da aventura e “clique em” para botões e controles (seção 6). Links dentro das aulas abrem na **mesma aba**, com retorno à aula de origem. Conferir destino e retorno; não exigir visita a toda a biblioteca. Para uma dúvida sobre a atividade, indicar **Preciso de ajuda** no rodapé da aula conforme o fluxo existente.

Se publicar é a tarefa da seção, a aula ensina o caminho mínimo: Compartilhar, título e resumo (no Estúdio da aula o título vem do curso e só o resumo aparece), Gerar capa, conferir, Publicar e aguardar a confirmação. A publicação do primeiro jogo é momento de comemorar: a fala comemora, convida a copiar o link de jogar e a mandar para a família e os amigos, com ajuda de um adulto se precisar, e termina em Fechar e na saída da seção. No Estúdio da aula a confirmação é **Seu jogo está no Mural!** com **Copiar link de jogar**; no Estúdio completo, **Publicado! 🎉** com **Copiar link**. Decisão do responsável em 06/10/2026. Personalização e problemas ficam no Como Fazer. Nos dois cursos atuais, publicação é ensinada sem virar bloqueio técnico adicional. Conferir o acesso real ao Mural durante a oferta; não prometer ação indisponível.

## 6. Linguagem e encerramento

**A voz do Cadê Todo Mundo? vale para todo curso.** Ela foi aplicada ao Farol em 05/10/2026:

- A tarefa vem na primeira frase: "Agora faça o personagem andar pelo mapa."
- Uma ação por parágrafo, com o caminho completo: "Abra Jogo 2D, depois Movimento e depois Movimentos prontos. Pegue o bloco…".
- Depois de montar, a criança testa direto: o teste diz o resultado esperado. A conferência entra UMA vez, depois do teste, com um gatilho genérico e a lista do que precisa estar lá: "Se algo não funcionou no seu jogo, volte aos blocos e confira se ficou assim: o bloco está dentro de Quando clicar ou tocar, o sprite é escolhido e o número é 0. Depois de corrigir, teste de novo." Quando o resultado aparece, o próprio teste já conferiu. Não acrescentar um caso de erro que repete um item da lista ("se sempre some o mesmo esconderijo, troque para escolhido" já está em "o sprite é escolhido"); um aviso a mais só entra quando diz o que a lista não cobre, como um gesto ou um lugar da tela. Ajuste do responsável em 06/10/2026, à noite, na parte 4 da Aula 1 do Cadê: a lista antes do teste, a mesma lista depois dele e um caso de erro repetindo um item cansavam. Quando o efeito não aparece na tela (uma variável sem mostrador) e não há teste, "Confira se ficou assim:" continua logo depois da montagem, porque é a única conferência. Abertura esclarecida em 09/10/2026, na parte 4 da Aula 1 do Cadê: dizer que algo não funcionou no jogo deixa claro quando conferir, sem depender de a criança retomar a palavra isso. Usar essa formulação nas próximas revisões de roteiros.
- A verificação usa sempre a mesma fórmula: "Funcionou? Clique em Verificar projeto. Se faltar alguma coisa, corrija os blocos e clique novamente."
- Para botões, "clique em"; no jogo, "toque" ou "segure". Não usar "aperte". Vale também para o Como Fazer: botões e controles com "clique em" ("clique no", "clique na"); tocar num objeto dentro do jogo segue como as aulas falam ("toque nos esconderijos"). Decisão do responsável em 06/10/2026.
- Palavra nova ganha uma frase ligada ao jogo, no momento do uso: "No jogo, o personagem é um sprite, que é um objeto do jogo que você pode programar."
- Não abrir com "vamos investigar" nem repetir tranquilizações como "não quer dizer que você errou"; dizer o significado concreto do valor.

Falar com “você”, em português brasileiro, com contexto concreto, acentuação e frases naturais. Sem travessões nas falas, metáforas não marcadas, perguntas retóricas que escondem uma ordem, excesso de elogios ou linguagem comercial. O infantojuvenil é a régua de compreensão e o adulto recebe a mesma explicação clara; não chamar quem assiste de “criança” na narração.

**Três formas de conversar: você, a gente e eu.** São escolhas de linguagem, não três personagens ou vozes de gravação. A fala trata quem faz a aula como protagonista e o narrador como parceiro:

- **Você**: o que é da criança, o que ela faz e o que ela conquista. “Você vai construir um jogo chamado Cadê Todo Mundo”, “Toque num esconderijo”, “o seu jogo”, “Olha só o que você programou!”. As ações ficam no imperativo, dirigidas a ela (“Arraste…”, “Clique…”); “a gente arrasta o bloco” deixa dúvida sobre quem faz, porque no vídeo o narrador também arrasta.
- **A gente / vamos**: o raciocínio e o convite, como um amigo ao lado. “Para o jogo ter essa reação, a gente precisa ligar a reação ao toque.” (na experiência); “Agora a gente vai fazer isso com os esconderijos do seu jogo!” (no fim da retomada)
- **Eu**: o narrador demonstrando no vídeo (“Olha aqui: quando eu toco no arbusto…”) ou retomando algo que contou (“E lembra da surpresa que eu te contei lá no começo da aventura?”). A autoria do jogo continua sendo da criança.

Evitar o “nós” de sala de aula (“Hoje nós vamos aprender…”, “Nesta aula nós vamos…”): é a voz de quem dá aula na frente da turma, o clima que a plataforma não quer. No lugar de “nós”, “a gente”; no lugar de “o nosso jogo”, “o seu jogo”, porque o jogo é dela. Na abertura, a autoria é dela e o convite é junto: “Oi! Você vai construir um jogo chamado Cadê Todo Mundo. Antes de montar o seu, vamos ver como ele funciona…”. Decisão do responsável em 06/10/2026; vale para todos os cursos. No fim do mesmo dia, o responsável mandou aplicá-la já nos cinco cursos (Cadê Todo Mundo?, A Chave do Farol, Nave Contra Asteroides, Corre, Dino! e O Jogo do Meu Jeito), junto com a conversa contínua abaixo.

**Toda fala conversa com quem faz a aula e chama sua atenção.** Narração, ponte do Zappy e material falam diretamente com quem assiste, como alguém sentado ao seu lado: “o seu material”, “o seu jogo”, “Sua vez!”. Evitar a frase impessoal que só descreve, como “Este mapa fica aqui para consultar” ou “Os personagens já aparecem, mas a contagem ainda não muda”; dizer “Este é o seu Passo a passo do projeto!” e “Seus personagens já aparecem, mas Achados ainda fica em zero”. Nos momentos que importam, a fala puxa o olhar da criança para a tela:

- “Olha aqui:” ao mostrar um lugar, um bloco ou o primeiro gesto da demonstração;
- “Olha só:” quando aparece um resultado (“Olha só: o personagem que estava atrás aparece!”);
- “Repare:” num detalhe que ela precisa notar, como um número que muda ou o nome que já vem no bloco (“Repare: o bloco chega com o nome jogador”);
- “Tá vendo?” logo depois do teste da retomada (“Primeiro, toque num esconderijo do seu jogo. Tá vendo? Não acontece nada, porque…”).
- “Escute” ou “Percebeu?” quando o resultado é um som ou a ausência dele; a gravação deixa ouvir esse momento, sem fala nem música por cima.

Um chamado por momento importante, variando as expressões; não em toda frase, para não virar fórmula. Evitar chamados seguidos para o mesmo resultado, como “Olhe a área do jogo. Olha só:…”. O chamado acompanha a ação e a tela daquele momento: depois do envio, reconhecer a conquista em vez de dizer "Olha só" sobre um resultado que a criança já testou. No encerramento da Aula 1 do Cadê, a fala é "Pronto, você já programou a primeira regra do seu jogo!", seguida da lembrança da surpresa. Ajuste do responsável em 07/10/2026. Cada “aqui” continua precisando de um apontamento visível no vídeo. Antes de observar a partida, orientar a volta ao jogo e seu início quando a criança está nos blocos ou na abertura. Não dizer que ela vê um estado interno sem mostrador: um tiro sair da tela, por exemplo, não comprova que foi retirado do grupo. A ponte do Zappy começa convidando (“Sua vez!” depois de uma demonstração; “Agora…!” ou “Hora de…!” antes de uma montagem) e termina na ação de saída. Pedido do responsável em 06/10/2026, aplicado ao Cadê e ao Farol; vale para todos os cursos.

**A fala é uma conversa contínua, não uma lista de frases soltas.** Quem narra conversa com a criança como alguém ao lado dela, e não lê um texto em voz alta. Na prática:

- cada frase se liga à anterior com palavras de conversa: “então”, “por isso”, “mas”, “é que”, “agora que”, “para isso”, “depois”, “ou seja”;
- todo resultado vem junto do porquê: “Tá vendo? Não acontece nada, porque o toque ainda não tem nenhuma reação ligada a ele”;
- a explicação diz o que é cada coisa no próprio jogo, em vez de deixar a ideia no ar: “O toque é a ação, e a reação que a gente quer é o esconderijo ficar invisível”;
- as três vozes no lugar certo: “você” para o que é dela e o que ela faz, “a gente” para pensar junto e convidar, “eu” na demonstração ou ao lembrar algo que o narrador contou;
- trocar sequências de frases curtas e secas (“Nada acontece. O toque ainda não tem uma reação. Vamos ligar uma.”) por uma frase que explica e convida.

Exemplo, na retomada do Cadê: em vez de “Toque num esconderijo. Nada acontece: o toque ainda não tem uma reação. Vamos ligar uma.”, dizer “Toque num esconderijo. Tá vendo? Não acontece nada, porque o toque ainda não tem nenhuma reação ligada a ele.”. Conversar não é falar mais: a frase ganha o porquê e o chamado, e o que a experiência já explicou não volta (veja "A retomada é uma ponte").

A conversa não tira a precisão da montagem: o destino continua vindo antes da peça, o caminho da paleta continua completo e a verificação conserva a fórmula comum a todos os cursos. Explicar mais pode alongar os vídeos de experiência; a duração alvo acompanha a fala, sem acelerar. Em todo curso em que a criança monta o bloco Se (hoje A Chave do Farol, Nave Contra Asteroides e Corre, Dino!), “então” não faz papel de ligação na fala, porque é o nome de uma parte do bloco: usar “por isso” ou “ou seja”. Decisão do responsável em 06/10/2026, para todos esses cursos. Como nome, ele leva artigo: “o então”, “dentro do senão”, “a resposta do senão”. Escrito, “a resposta então, que acende o farol” é claro; falado, soa como “a resposta, então, acende”. Revisão do Farol, 13/10/2026. A conversa contínua foi pedida pelo responsável em 06/10/2026 e aplicada ao Cadê e ao Farol; no fim do mesmo dia, ela e as três vozes passaram a valer nos cinco cursos.

**O que é opcional vira convite, nunca negação.** A criança entende “Não precisa baixar nem imprimir” como uma ordem para não baixar. Oferecer a escolha: “Se quiser, você pode ler aqui mesmo. E, se preferir, também pode clicar em Baixar para guardar o mapa e consultar onde quiser.” Não acrescentar frases que só dizem o que ela não precisa fazer; quando a informação ajuda, dizer o que ela pode fazer (“Você pode seguir mesmo sem terminar a partida”). Uma proibição de verdade, que evita um erro, continua clara e direta: “Não coloque um encontro dentro do outro.” Ajuste do responsável em 06/10/2026.

Encerrar na ação real: Próxima parte, envio e confirmação, ou Concluir aula. Na seção do certificado, orientar Baixar meu certificado e dizer o sinal de seguir: “Quando o certificado baixar, clique em Concluir aula.” Um “depois” sem sinal faz a criança clicar cedo, e o Concluir aula antes da emissão é recusado. Quem já emitiu encontra Baixar certificado (PDF). Não antecipar a próxima tarefa depois da saída, atribuir autoria exagerada ou inserir venda na celebração infantil. Continuidade comercial é dirigida ao responsável fora dessa tarefa.

**Envio obrigatório é o próximo passo da atividade.** A fala orienta diretamente: “Agora, clique em Enviar meu projeto e confirme em Enviar. Quando aparecer Projeto enviado!, clique em Próxima parte.” Não justificar como uma oportunidade de mostrar o jogo à equipe, nem condicionar ao desejo de mostrar: isso faz uma ação necessária parecer opcional. Usar os rótulos e a saída reais de cada seção. Recado, escolhas de personalização e publicação continuam opcionais onde já eram. Decisão do responsável em 11/10/2026, válida para os cinco cursos.

**Mesmos nomes nas duas comunidades.** Curso → aula → parte. Os rótulos são Próxima parte, Partes da aula, Verificar projeto, Objetivos do projeto, Enviar meu projeto, Enviar de novo, Concluir aula e Baixar meu certificado. O material é **Passo a passo do projeto**, tanto no PDF quanto no botão. Quem recebe e responde é a equipe. Use jogar para a atividade; aventura pode descrever a história, e fase pode descrever um nível real do jogo.

Os guardas de linguagem conferem variantes antigas de navegação, concordância e jargão interno. Não proíbem curso e aula. IDs, URLs, nomes internos e etapas do método Pensa não mudam por causa de copy.

Não localizar a ferramenta como “aqui ao lado” ou “aí embaixo”: a posição muda com o tamanho da tela. Mostrar e nomear a atividade. Posições internas estáveis e encaixes continuam sendo descritos. Na gravação, conferir que o efeito citado está realmente visível; não fabricá-lo na edição. Na ferramenta externa, comparar o trabalho com sinais observáveis; assistir ao vídeo não comprova a criação.

### Debinha e Dedé nos vídeos

A professora grava a fala completa, incluindo pensamentos e perguntas que ela mesma apresenta. Na edição kids, substituir somente as frases marcadas pela mesma frase com a voz de Dedé ou Debinha, silenciando a professora nesse intervalo. A explicação e a retomada permanecem idênticas. O master precisa funcionar sozinho, sem vocativos dirigidos ao personagem.

Exemplo: “Talvez você esteja pensando: ‘No meu jogo ainda não funcionou.’ Se aconteceu com você, volte aos blocos e confira estes três pontos…”. Somente “No meu jogo ainda não funcionou.” é candidato à troca. A ajuda continua condicional para quem teve sucesso poder seguir.

Registrar ID, clipe, personagem, frase exata, ocorrência e âncoras anterior/posterior no roteiro de produção. Não colocar essas notas no TXT de voz. Manter um personagem por aula e alternar quando fizer sentido; nenhuma cota de aparições ou intervenção em todo clipe. Os dois podem perguntar, descobrir e corrigir. Não transferir passos essenciais para uma faixa exclusiva do kids.

O [contrato de voz](DIRETRIZES-VOZ-ELEVENLABS.md) define tags, pausas, arquivos e conferência da edição. Zappy permanece na página, separado da gravação.

## 7. Como manter as decisões vivas

**Montagem concreta e avaliação flexível, 20/10/2026:** na montagem guiada, a professora mostra e manda usar um valor, uma cor ou uma imagem específicos, com um comando por vez. Se a velocidade já vem em 3, dizer “A velocidade já vem em 3; deixe assim.”; se precisa mudar, dizer “Coloque 3 na velocidade.” Não acrescentar “você pode escolher outro” nessa montagem. Dar cada gesto e cada teste separadamente, com tempo para acompanhar. As escolhas da seção de personalização continuam seguindo sua orientação própria. Essa precisão da fala não restringe a avaliação ao exemplo da professora.

Ao melhorar os objetivos, preservar as falas gravadas, a sequência, a montagem e os valores ensinados. Só alterar o trecho de verificar objetivos quando o fluxo da tela mudou, com a âncora e a correção mínima registradas. Os casos internos do avaliador não precisam de narração adicional. Essa revisão não pede regravação geral nem revisão global da voz dos cursos.

**Evidência e liberdade na avaliação, 19/10/2026:** uma solução privada é uma possibilidade de cumprir a parte,
não um modelo visual obrigatório. Cores, imagens, mensagens e magnitude da velocidade são livres
na avaliação, quando a intenção continua atendida. Um movimento pedido precisa acontecer na direção coerente:
no Jogo 2D, Y menor sobe e Y maior desce; zero não cumpre um objetivo de movimento. Uma implementação
equivalente que produz o mesmo efeito também deve passar quando o objetivo pede o efeito. Conferir
a convenção de eixos de cada ambiente antes de reutilizar uma regra.

Escolher evidência conforme o que se ensina. `usesBlock` confere estrutura e seu rótulo deve dizer
isso; não certifica sozinho a partida. Objetivos de comportamento exigem observação real do efeito
com cenário e entrada controlados. Testar alternativas válidas e contraexemplos, inclusive ausência,
zero e direção oposta quando houver movimento. Os exemplos privados de entrada e solução pertencem
a cada parte; um estado posterior não substitui a solução transitória de uma parte anterior.
Preservar uma regra aprendida é legítimo; não desmontar o projeto inicial só para fazer todos os
objetivos começarem falsos.

1. Ao aprovar uma mudança pedagógica, registrar aqui a regra, motivo e escopo. Toda correção pedida na revisão de um curso que valha para outros cursos entra aqui no mesmo dia, para os próximos já nascerem certos. Se depender do curso, registrar também sua aplicação em `modulos-*.md` e na proposta. Atualizar orientações antigas que a contradigam.
2. Atualizar juntos proposta, roteiro, gerador, manifesto, caderno e critérios. O manifesto gerado não pode ser a única edição: regenerá-lo precisa conservar a decisão.
3. Regras estruturais verificáveis entram no validador e em testes com casos inválidos: ordem do Zappy, isolamento do quiz, paletas e preservação do certificado. Qualidade da explicação e pertinência da experiência exigem leitura humana.
4. Rodar geradores, validadores de manifesto/roteiro/Como Fazer, testes dos cursos e dos fluxos alterados. O CI roda `validar-manifestos.ts`, `validar-roteiros.py`, `bun test docs/aulas-interativas-tecnico/qa` e `bun docs/como-fazer/validar.ts`. Conferir cores e diagramação dos PDFs e testar como aluno: revisão, erro, correção, retorno e avanço.
5. Antes de atualizar conteúdo remoto, reconciliar identificadores e anexos. `plannedVideo` e `items: []` são moldes locais, não substitutos para vídeos e PDFs publicados. Conferir a prévia da importação, preservar conteúdo existente e registrar o ambiente atualizado.
6. Marcar o que foi validado localmente, o que foi aplicado no Admin, o que precisa de gravação e o que ainda precisa de ensaio com crianças. Teste automatizado não comprova compreensão infantil.

**O que os guardas cobrem nos 37 manifestos** de Cadê Todo Mundo?, A Chave do Farol, Nave Contra Asteroides, Corre, Dino! e O Jogo do Meu Jeito: a estrutura (`qa/validar-manifestos.ts` e `qa/diretrizes-pedagogicas.ts`: ponte do Zappy logo depois do vídeo, no máximo um vídeo e uma fala por seção, quiz isolado e com explicação, entrega externa pela galeria, paletas e projeto dos jogos iniciais), os clipes, as durações e as notas de tela dos roteiros (`validar-roteiros.py`) e o vocabulário comum (variantes antigas de navegação e concordância, nos guardas da seção 6). As regras de fala da seção 6 (três vozes, conversa contínua, chamados de atenção, opcional como convite) e a distribuição entre vídeo conceitual e descoberta guiada da seção 2 não têm guarda automático, salvo alguns trechos fixados pelos testes de cada curso: dependem de leitura humana. Em 06/10/2026, a demonstração na primeira pessoa estava aplicada aos cinco cursos; as três vozes, os chamados de atenção e a conversa contínua, ao Cadê e ao Farol, com a aplicação na Nave, no Corre, Dino! e no Meu Jeito em andamento. Nas revisões de 05/10/2026, a apresentação do jogo e o caderno abrem a primeira aula de construção; nenhuma aula é só de introdução. Cobertura editorial e técnica não substitui gravação, importação e ensaio com alunos.

**Aplicação ao trabalho externo, 05/10/2026:** no Pinta e no Estúdio completo, o aluno compara sinais concretos do próprio trabalho e aguarda o salvamento. Assistir ao vídeo não comprova a criação. Toda aplicação externa precisa ter uma entrega obrigatória posterior pela galeria da mesma ferramenta, na mesma aula. Não inventar projectChecks nem platformAction para validar um projeto externo. `platformAction` pertence às ações internas de avatar, quarto e tema. A entrega real usa Escolher no Pinta/Estúdio, seleção, Enviar (1) e a confirmação Recebido!; não acrescentar a confirmação Enviar do workspace embutido. A publicação no Estúdio completo termina em Publicado!, com Abrir o jogo; o host da aula tem outra celebração. Conferir o fluxo da ferramenta usada antes de reutilizar textos.

**Aplicação ao Farol, 04/10/2026:** a experiência de memória separa retirada do objeto, aviso e informação guardada, com o mesmo sumiço e aviso nos dois modos. A experiência da porta torna visíveis valor, pergunta e resposta escolhida. A construção de senão precede a de então, com teste e verificação intermediários no mesmo projeto e envio ao final. As verificações conservam as regras essenciais dos dias anteriores; o teste jogado inclui reiniciar depois da vitória. A edição do aviso é opcional. Essas escolhas respondem às dificuldades deste jogo; não fixam uma quantidade de seções ou experiências para os demais cursos. A comparação de velocidade foi separada em 05/10/2026 e retirada em 06/10/2026 por decisão do responsável. A nova experiência de posição no Dia 3 antecede a escolha de x/y da chave, preservando a regra "conceito novo, experiência antes".

## Origem das decisões

Consulta histórica opcional; não é preciso reconstruir as regras a partir desses relatos.

- [Continuidade da conversa nos cinco cursos, 07/10](qa/revisao-conversa-2026-10-07.md): revisão das outras 36 aulas após a aprovação da Aula 1 do Cadê; reconhecer a conquista depois do envio, anunciar surpresa sem segredo, chamar a atenção para o resultado presente e distinguir olhar de escutar.
- [Revisão de linguagem do Cadê Todo Mundo, 27/09](REVISAO-LINGUAGEM-CADE-TODO-MUNDO-2026-09-27.md): teste com duas crianças, tarefa escondida pelo tour, passos completos, verificação e destino dos tutoriais.
- [Revisão de roteiros, 20/09](REVISAO-ROTEIROS-2026-09-20.md): âncoras, rótulos reais, tempo para gestos, autoconferência e efeitos visíveis.
- [Review pedagógico do Farol, 03/10](qa/review-pedagogico-desafio-2026-10-03.md): continuidade entre projetos, critérios vinculados ao evento e ramo corretos, contextos e caderno.
- [Revisão do Farol, 04/10](qa/revisao-pedagogica-desafio-2026-10-04.md): comparação, memória observável, construção em duas etapas e diagnóstico da coleta; [registro da aplicação local](qa/revisao-desafio-2026-10-04/aplicacao.md).
- Revisão do Farol e do Cadê, 05/10: sem aula só de introdução, experiência que explica enquanto faz, retomada da experiência no próprio jogo antes de montar, mexa e veja, primeiro o destino e depois a peça, uma ideia por seção, experiência para cada conceito novo e rótulos como aparecem na tela; registro em [modulos-desafio-primeiro-jogo.md](modulos-desafio-primeiro-jogo.md).
- Revisão de linguagem do Farol, 05/10: voz do Cadê Todo Mundo? aplicada a roteiros, pontes, experiências, quiz e caderno, com rótulos conferidos no código; registro em [modulos-desafio-primeiro-jogo.md](modulos-desafio-primeiro-jogo.md).
- [Quizzes dos cursos curtos, 03/10](proposta-quizzes-cursos-curtos-2026-10-03.md): aplicação específica da revisão antes do certificado.
- Reestruturação de Nave Contra Asteroides e Corre, Dino!, 05/10: experiências antes da aplicação, montagens por conceito, contexto do próprio jogo, destinos visíveis e quizzes distribuídos; mapas em [Nave](modulos-nave-contra-asteroides.md) e [Corre, Dino!](modulos-corre-dino.md), com verificação local e etapas de produção discriminadas.
- Reestruturação de [O Jogo do Meu Jeito](modulos-o-jogo-do-meu-jeito.md), 05/10: criação autoral no Pinta, integração no Estúdio, experiências antes da aplicação, autoconferência e entregas reais pela galeria; quatro quizzes isolados e publicação opcional.
- Histórico, substituído pela descoberta guiada em 25/10/2026: vídeo da experiência como demonstração, 06/10: o narrador faz os testes na primeira pessoa e explica, ligando ao que a criança vai montar; a vez dela começa no "Agora é a sua vez". Aplicado aos cinco cursos (Cadê, Farol, Nave, Corre Dino e Meu Jeito), e o recado da trava do vídeo passou a dizer "Pronto! Agora é a sua vez" nas cenas e no jogo pronto.
- Três vozes, 06/10: "você" para o que é da criança e o que ela faz, "a gente"/"vamos" para pensar junto e convidar, "eu" só na demonstração; sem o "nós" de sala de aula e com "o seu jogo" no lugar de "o nosso jogo". Pedido do responsável depois de perguntar se a fala deveria usar "você" ou "nós".
- Vocabulário da aventura, 06/10: o responsável não quer que a plataforma pareça uma extensão da escola. Para a criança, curso virou aventura, aula virou aula, seção virou parte, unidade virou Mundo, o Caderno do Aluno virou Passo a passo do projeto, professor virou guia (à noite, “a equipe”; ver abaixo) e o menu Aprender virou Explorar. Nenhum vídeo tinha sido gravado na versão final, então a troca entrou antes da gravação, nas telas e nos cinco cursos de uma vez.
- Falas que conversam com a criança, 06/10: toda fala diz "você", chama a atenção dela para o que aparece na tela ("Olha aqui", "Olha só", "Repare", "Tá vendo?") e oferece o que é opcional como convite. No mesmo dia, segunda rodada: cada fala virou uma conversa contínua, com o porquê de cada resultado e a ação e a reação ditas no próprio jogo; saíram das montagens as frases soltas sobre o que já vem preparado. Saiu o "não precisa baixar nem imprimir" da apresentação do caderno, que a criança entendia como uma ordem para não baixar. Aplicado ao Cadê e ao Farol (roteiros, pontes do Zappy, caderno e Como Fazer); registro em [modulos-cade-todo-mundo.md](modulos-cade-todo-mundo.md) e [modulos-desafio-primeiro-jogo.md](modulos-desafio-primeiro-jogo.md).
- Full review do vocabulário da aventura, fim do dia 06/10: decisões do responsável sobre o que ainda estava em aberto. No Como Fazer, “clique em” para botões e controles, como nas falas; a grade de perfis pergunta “Quem vai criar hoje?”; “guia” é só a pessoa (revisto na mesma noite: quem recebe passou a ser “a equipe”), e o painel do Pensa é o “Guia do Pensa”; “então” sem papel de ligação em todo curso em que a criança monta o bloco Se (Farol, Nave e Corre, Dino!); três vozes e conversa contínua estendidas aos cinco cursos. No mesmo review, a régua das palavras da escola virou uma só (`qa/palavras-da-escola.ts`), com unidade, atividade, entrega, estudar, trabalho, devolutiva, lição, formatura e diploma e com a concordância de aventura, aula, parte e Mundo; o Como Fazer ganhou o guarda dele, e os testes de `docs/aulas-interativas-tecnico/qa` entraram no CI. Pendências em [2026-10-06-vocabulario-da-aventura-pendencias.md](../plans/2026-10-06-vocabulario-da-aventura-pendencias.md).
- A equipe no lugar do guia, noite de 06/10: “Enviar para o guia” soava estranho para o responsável. O botão de envio passou a dizer o que a criança envia (“Enviar meu projeto”, “Enviar meu desenho”, “Enviar (1)”, “Enviar de novo”), quem recebe e responde passou a ser a equipe (“Recados da equipe”, “Enviar para a equipe” no pedido de ajuda, “Recebido!” na galeria) e “guia” ficou só no Guia do Pensa. Trocado primeiro no código e, na mesma noite, nas falas, pontes, notas de gravação e Mapas da Aventura dos cinco cursos, no Como Fazer (cinco títulos novos) e nestes documentos, com a régua `GUIA_PESSOA` nos guardas.

- A surpresa do final, 07/10, só no Cadê Todo Mundo? e na Chave do Farol (nos outros cursos a criança já sabe que pode personalizar): a personalização do fim do curso é plantada no vídeo do jogo pronto, lembrada no fim da aula anterior e revelada no vídeo da personalização, com a galeria do Passo a passo do projeto sob o título A surpresa do final. Aplicado ao Cadê e ao Farol (roteiros, pontes, gerador, manifestos e Mapa); os seis vídeos envolvidos precisam ser regravados.

- Personalização ampliada do Farol, 06/10: oito personagens, quatro cenários, quatro barcos, três chaves e quatro pares de faróis; quatro avisos e posição da chave. Saiu a escolha de velocidade. As imagens de um mesmo tipo preservam tamanho e contato; o farol usa par apagado/aceso; os projetos salvos recebem as opções sem apagar as anteriores. Registro em [modulos-desafio-primeiro-jogo.md](modulos-desafio-primeiro-jogo.md).

**Salvamento e envio nos cinco cursos, 11/10/2026:** o Estúdio incorporado salva entre as partes; verificar uma montagem não exige enviá-la. Cada aula tem um ponto de envio por projeto, depois das montagens e escolhas. No Farol, ele fica na borda (Dia 1), no aviso da coleta (Dia 2) e na posição da chave (Dia 3). Nave e Corre, Dino! já concentram o envio no fim; os encerramentos deixam de mandar esperar Salvo para avançar entre as partes. Em O Jogo do Meu Jeito, o trabalho ocorre no Pinta ou Estúdio em outra aba: conservar a espera pelo salvamento antes de voltar à aula e a entrega única pela galeria. Salvar, verificar, enviar e publicar continuam ações diferentes. [Auditoria e edição](qa/revisao-envio-unico-2026-10-11.md).

**Revisão do Farol antes da gravação, 13/10/2026:** com o Cadê já gravado e publicado como régua (não como molde), o Farol recebeu só o que o Cadê faz melhor: o nome que o bloco traz e onde clicar, uma busca por vez, a personalização como escolha, a resposta ao avatar começando pelo que ele pediu, o sinal visível para concluir o certificado e as notas de gravação que nasceram da gravação do Cadê (ver [Especificação do roteiro](ESPEC-ROTEIRO.md), seção 7). As correções próprias do Farol (a porta do farol como lugar do teste, "o então" e "o senão" com artigo, o número digitado na experiência de posição, as pontes terminando na saída) ficam registradas em [modulos-desafio-primeiro-jogo.md](modulos-desafio-primeiro-jogo.md).

## Exploração livre e linguagem sem ambiguidade

Aplicar a direção de 26/10/2026 em [Conceito, investigação e construção](DESCOBERTA-GUIADA.md#explorar-para-compreender-direção-de-26102026). Distinguir editar uma regra, dar uma entrada e executar o teste. As palavras do controle precisam dizer qual dessas operações acontece. Não apresentar uma tecla como se fosse um bloco nem apagar uma coleta ao editar a regra depois do encontro.

Simplicidade não significa limitar a experiência a um ou dois cliques. Oferecer repetição suficiente para perceber a relação: muitos quadros para movimento; ida e volta nos eixos; reação ligada/desligada em objetos diferentes; novo achado, vazio e repetição para contagem. Os objetivos são observações que podem ser feitas em qualquer ordem. Manter referências visuais permanentes quando elas tornam a comparação possível.

Não ensinar x/y antes da experiência destinada a posição. Uma palavra do bloco, como velocidade, pode aparecer no bloco literal sem virar um painel de conceitos novos concorrentes. Um desafio adicional deve ser opcional e conservar todos os controles pertinentes.

## Faísca: complexidade também no projeto inicial — 27/10/2026

A Chave do Farol e A Ilha do Farol usam somente blocos básicos, inclusive nas partes que já
vêm prontas. Não usar `allowBlocks` para contornar o nível de listas, objetos de Programação,
propriedades genéricas ou código cru. Se a montagem exigir infraestrutura complexa, criar um
comando reutilizável da extensão com um efeito concreto. Manter a lógica que a aula ensina
visível: encontro, coleta, variável simples, mensagem e se/senão. Elementos visuais 3D podem
ser chamados de objetos da cena; isso não introduz estruturas de objetos na programação.

Verificar todos os projetos progressivos, a conversão código/blocos e a importação do arquivo
entregue à pessoa. Arquivos portáteis levam as artes completas; referências compactas nos
manifestos exigem uma biblioteca compatível e um erro visível quando não puderem carregar.
Testar o enquadramento na prévia estreita, além do jogo em tela ampla. Atualizar montagem,
critérios, roteiros e PDF juntos quando mudar o comando que a pessoa usa.


## Missões de posto: aplicar o repertório, direção de 28/10/2026

O Jardim Secreto é a primeira referência dessa aplicação. A missão exige os conceitos investigados e os comandos efetivamente montados nos cursos-base. Câmera, luz, desenho, modelos, caminhada permitida e reinício que vieram prontos não viram exigências de programação por acidente.

- O vídeo principal apresenta o resultado, relembra a ideia e convida a construir. Não repete todas as experiências nem resolve os encaixes da missão.
- A ajuda é opcional, disponível desde o início e completa: lembrete do resultado, conceito, paleta, nome do bloco, destino, campos, valores, teste e correção. Usa os elementos da própria missão. Consultá-la não reduz mérito nem consome tentativas.
- Um projeto por dimensão permanece entre as partes. Objetivos crescem por etapa; a coleta não cobra a decisão ainda não pedida. Uma entrega atualizada encerra cada dimensão.
- Verificar precisa rodar os dois casos: antes e depois da coleta. A memória pode ter outro nome; a posição não precisa coincidir com a solução da professora. Arte preparada e variáveis declaradas sem uso não comprovam aprendizagem.
- Se a navegação não chega ao alvo, não afirmar que a decisão está errada: indicar que o teste não terminou e orientar a conferir movimento, caminho e altura. Testar erros plausíveis, nomes alternativos e reinício, além da solução correta.
- Quiz de previsão usa uma cena fiel e mostra o resultado depois da escolha. Pergunta de diagnóstico ou de escolha de teste pode ficar sem demonstração; o mesmo quiz pode reunir os dois formatos. Alternativas permanecem equivalentes antes da escolha e a correção pertence ao servidor.
- Reiniciar a partida conserva regras e posições editadas. Restaurar o projeto inicial é outra ação e não deve ser pedido como teste.
- Uma missão não concede certificado nem promove sozinha. A jornada conserva seus outros critérios. Artes, roteiro, manifesto, ajuda, PDF e fontes de voz devem acompanhar a mesma versão; gravação e publicação são etapas verificadas separadamente.

## Poderes do posto: conceito novo nas duas dimensões, direção de 29/10/2026

Moedas no caminho é a primeira referência. Um Poder acrescenta um conceito que os cursos-base não
ensinaram, por isso a **primeira aula** segue o formato de curso: jogo pronto, Passo a passo do
projeto, vídeo conceitual com a experiência do conceito, montagens guiadas por completo no vídeo
(uma ideia por seção, destino antes da peça, retomada no próprio jogo), quiz e entrega. A **segunda
aula** é a transferência para a outra dimensão, como a aula 3D da missão: o vídeo lembra a regra e
convida a construir, e a montagem completa fica no Passo a passo do projeto, com objetivos por etapa.
Não repetir a experiência na segunda aula; o quiz dela pode ter uma previsão com cena da outra
dimensão. O Poder conta com as duas aulas concluídas. Quando o conceito pede um bloco que só uma das
dimensões tinha, conferir o catálogo inteiro antes: descer um bloco existente para o iniciante vem
antes de criar um novo (ver `faisca/README.md`).

## Gatilho de uma vez: a recompensa respeita o estado da partida, direção de 29/10/2026

Relato da dona na Ilha do Farol: depois de pegar a chave, cada volta ao farol reiniciava a
animação da luz. Um encontro só conta quando começa; sair e voltar roda a regra de novo. Uma
recompensa disparada por encontro (acender, abrir, florescer, tocar o sino da vitória) precisa
de uma **guarda de estado**, como nos jogos profissionais: a regra só responde enquanto a
partida não foi ganha (`Se não ganhou`) ou enquanto o objeto ainda está fechado. Pedido da dona:
"do jeito profissional de criar jogos, sem gambiarra". Nada de esconder o objeto, mudar a
mensagem para disfarçar ou mexer no motor para ignorar o pedido repetido.

- Ensinar com o problema primeiro: no próprio jogo, a criança volta ao objeto e vê a animação
  recomeçar; a guarda vem como conserto, numa parte curta (uma ideia por seção).
- Só blocos que o curso já usa: `Se`, `não` e o valor da variável que guarda o estado.
- O objetivo executado sai do objeto, volta e confere que o estado final continua (a luz `aceso`,
  não um `acender` recomeçado).
- **Só no gatilho que fecha o jogo** (decisão da dona, 29/10/2026): "o farol era a finalização do
  jogo. Agora, se for uma coisa intermediária em que eu posso fazer a ação várias vezes, aí não."
  A guarda vale para a vitória (o farol aceso, a flor aberta). Uma ação que faz parte do jogo e
  pode se repetir (a alavanca que baixa a ponte de novo, a sequência dos símbolos tentada outra
  vez) não ganha guarda, nem uma recompensa do meio que não encerra a partida (o baú das Moedas,
  a porta da cabana): o fim continua sendo o farol.
- Aplicado à Ilha do Farol (parte **O farol acende uma vez só**) e ao Jardim Secreto 3D, em que a
  flor é o fim do jogo: a guarda entra na parte **Faça a flor responder**, sem parte nova, porque
  a missão aplica o que a criança já aprendeu na Ilha (ajuda própria "A flor abre uma vez só" no
  Passo a passo). No 2D a troca de imagem para a mesma imagem não muda nada na tela, e o Jardim
  2D fica como está. Nos Poderes 3D (Moedas, Cabana, Ponte e Baú) o farol já vem com a guarda, e
  os gatilhos próprios deles ficam sem guarda, pela regra acima.
