# Stories: 20 sequências completas

**Revisão: 13/10/2026, noite.** Os stories têm objetivo próprio: **educar** quem já segue. Não pedem para seguir e não levam à oferta. Cada sequência é a segunda camada dos posts da semana: chama o assunto de volta e entrega um bastidor novo, sem repetir o post. A tela 1 prende como uma capa, as telas conversam entre si com conectores, a figurinha tem função e a tela 4 fecha com uma frase para guardar ou um pedido pequeno. As semanas seguem o [calendário](../03-postagens.md) atualizado em 13/10 à noite, com as trocas de posição. Régua em [Guia de copy](13-guia-de-copy.md) · [Versão anterior](../historico/2026-10-13-noite-antes-revisao-2/04-stories.md).

Formato 1080 × 1920. Copy integral em citação, com figurinha e visual por tela. Preservar as margens usadas pelos controles do aplicativo. Tela com mais de 22 palavras vai sobre vídeo de 8 a 10 segundos (a captura do jogo serve). Enquete escuta experiências e nunca tem resposta certa; teste confere algo explicado ou pede um palpite que a tela seguinte revela. Texto de figurinha com cerca de 50 caracteres, a conferir no aplicativo. Resultado real de enquete pode aparecer na tela seguinte; nunca fabricar votos. Demonstrações são jogos da nossa equipe, nunca de aluno. Nenhuma imagem se repete dentro da sequência, e pessoa real aparece com fisionomia fiel ao retrato autorizado (ver [direção visual](05-direcao-visual-e-producao.md)).

<a id="st01"></a>

## ST01 · Toda comemoração de jogo tem uma frase escondida

**Versão anterior:** “Toda explosão de jogo tem uma frase escondida”

**Apoio:** [P01](01-p01-a-p10.md#p01), [P07](01-p01-a-p10.md#p07), [P16](02-p11-a-p20.md#p16). **Demonstração:** Boliche na Praça (Mundo 3D), mais uma cópia da equipe sem o bloco do strike.

**Fechamento:** Tudo o que acontece num jogo tem uma frase por trás, e dá para adivinhar muitas delas.

### Tela 1

> Toda comemoração de jogo tem uma frase escondida, e hoje a gente mostra uma.

**Visual:** Boliche na Praça: o jipe acelerando contra os dez pinos, um quadro antes do impacto. Enquadrar sem o totem com o nome do exemplo.

### Tela 2

> Neste boliche que a gente montou no Estúdio, o jipe derruba os dez pinos, aparece STRIKE e a tela treme. Antes de passar para a próxima, dá um palpite.

**Figurinha:** teste · “Quem fez a tela tremer?” · “A batida do jipe” / “Uma frase escrita” · certa: “Uma frase escrita”.

**Visual:** o strike em vídeo, com o aviso e a câmera tremendo.

### Tela 3

> Foi uma frase escrita, que diz mais ou menos isto: quando derrubar todos os pinos, mostrar STRIKE e tremer a câmera. Por isso, numa cópia sem essa frase, os pinos caem e a tela continua parada.

**Visual:** recorte legível do bloco do strike ao lado de duas capturas lado a lado: com o bloco (aviso e tremor) e sem ele (pinos caindo, tela parada).

### Tela 4

> Então faça o jogo com ele hoje: escolham uma coisa que acontece num jogo de que ele gosta e tentem escrever juntos a frase que está por trás.

**Figurinha:** caixinha de perguntas · “Qual frase vocês escreveram?”

**Visual:** fundo limpo, com a frase da tela 3 pequena no canto, como exemplo.

**Produção:** regra conferida em `world-3d/__gen_boliche.ts`: o strike é o bloco `bowlingOnStrike`, com `say("STRIKE!", 3)` e `cameraShake(0.8, 0.5)`. A exclamação do balão aparece só na captura. A versão sem o bloco é variante da equipe e deve ser declarada; confirmar na captura que a batida do jipe, sozinha, não treme a câmera; se tremer, trocar a pergunta. O totem do exemplo diz “Boliche na Praca”, sem cedilha: enquadrar sem ele ou corrigir na cópia. Saíram a Parque dos Brinquedos e os 6 metros, porque essa distância é fixa no motor da extensão (`world-3d/runtime.ts`) e não existe como bloco. O P10 (semana 15) também fala do strike, 14 semanas depois.

<a id="st02"></a>

## ST02 · Muito jogo de computador foi testado primeiro com papel e dado

**Versão anterior:** “Duas frases para o mesmo problema. Só uma ajuda a consertar.”

**Apoio:** [P34](09-p31-a-p40.md#p34), [P03](01-p01-a-p10.md#p03), [P51](11-p51-a-p60.md#p51). **Demonstração:** nenhuma; um jogo de tabuleiro da casa, sem marca.

**Fechamento:** Uma regra nova merece duas partidas: uma com a antiga e outra com a nova.

### Tela 1

> Muito jogo de computador foi testado primeiro com papel, cartas e dado, antes de existir uma linha de programação.

**Visual:** mesa com folhas, cartas desenhadas à mão e um dado; mãos de um adulto e de uma criança fictícia.

### Tela 2

> Os criadores fazem isso porque mudar uma regra no papel leva um minuto. Assim eles descobrem se a ideia é divertida antes de passar dias programando.

**Figurinha:** enquete · “Vocês já mudaram a regra de um jogo?” · “Já mudamos” / “Nunca”.

**Visual:** a mesma mesa, agora com uma regra riscada e outra escrita por cima.

### Tela 3

> Dá para fazer o mesmo teste em casa nesta semana. Escolham um jogo de tabuleiro que vocês já têm e mudem uma regra só, daquelas que ele vive querendo mudar.

**Visual:** tabuleiro genérico, sem marca, com um bilhete “regra nova” ao lado.

### Tela 4

> Depois joguem duas partidas, uma com a regra antiga e outra com a nova, e perguntem juntos: ficou mais justo, mais difícil ou mais divertido? É assim que quem cria jogos decide.

**Figurinha:** caixinha de perguntas · “Qual regra vocês mudaram?”

**Visual:** placar escrito à mão com duas colunas, “antiga” e “nova”.

**Produção:** testar regras com papel antes de programar (protótipo de papel) é prática conhecida de design de jogos; registrar uma fonte antes de publicar, por exemplo o livro *Game Design Workshop*, de Tracy Fullerton. Aprofunda o P34 (propor uma mudança) e o P51 (jogar junto) sem mostrar jogo do Estúdio. Tabuleiro sem marca identificável.

<a id="st03"></a>

## ST03 · Toda pasta de escola tem um “trabalho final 2”

**Versão anterior:** “No celular, ninguém escolhe onde as coisas ficam guardadas”

**Apoio:** [P04](01-p01-a-p10.md#p04), [P37](09-p31-a-p40.md#p37), [P24](03-p21-a-p30.md#p24). **Demonstração:** nenhuma; janela de pastas com nomes fictícios.

**Fechamento:** O nome do arquivo diz o assunto e o número, e a busca acha em dois segundos.

### Tela 1

> Em muita pasta de escola mora um “trabalho final”, um “trabalho final 2” e um “agora vai”. E ninguém sabe qual deles é o certo.

**Visual:** janela de pastas com os três arquivos, nomes fictícios, sem dados pessoais.

### Tela 2

> Programadores também já passaram por essa bagunça, por isso seguem uma regra simples: o nome diz o assunto e o número. Com “planetas-1” e “planetas-2”, acabou a dúvida.

**Figurinha:** enquete · “Qual nome mais aparece aí em casa?” · “trabalho final” / “sem título” / “agora vai” / “outro”.

**Visual:** os mesmos arquivos renomeados, ao lado dos nomes antigos.

### Tela 3

> E tem uma vantagem escondida. Quando ele salva com um número novo, o trabalho de hoje não apaga o de ontem, então, se a versão nova ficar pior, a antiga continua lá, inteira.

**Visual:** duas versões do trabalho abertas lado a lado, uma com um parágrafo a mais.

### Tela 4

> Hoje, antes de salvar o próximo trabalho, escolham juntos o nome: o assunto, um traço e o número. Amanhã ele digita “planetas” na busca e acha na hora.

**Visual:** a busca do computador mostrando “planetas-1” e “planetas-2”.

**Produção:** o P04 trata de achar o arquivo; esta sequência trata de dar nome e guardar versões, sem repetir o teste de três minutos. O P49 (semana 8) usa a primeira versão como prova de aprendizado; aqui a versão serve para não perder o trabalho. A enquete não tem resposta certa.

<a id="st04"></a>

## ST04 · Os melhores jogos quase nunca escrevem “vá para a direita”

**Versão anterior:** “Todo jogo de explorar esconde uma ordem”

**Apoio:** [P14](02-p11-a-p20.md#p14), [P41](10-p41-a-p50.md#p41), [P20](02-p11-a-p20.md#p20). **Demonstração:** nenhuma obrigatória; ilustração editorial de uma fase com moedas formando caminho.

**Fechamento:** Deixe a primeira pista da tarefa no caminho dele.

### Tela 1

> Os melhores jogos quase nunca escrevem “vá para a direita”. Mesmo assim, quase todo mundo vai.

**Visual:** fase ilustrada com uma trilha de moedas apontando para a direita, sem seta nem texto.

### Tela 2

> É que os criadores espalham pistas pelo caminho: uma moeda, uma luz acesa, uma porta aberta. O olho segue as pistas, e quem joga sente que escolheu sozinho.

**Figurinha:** enquete · “Aí em casa, o material da lição fica…” · “À vista” / “Na mochila”.

**Visual:** a mesma fase, agora com as pistas circuladas.

### Tela 3

> Em casa, a pista funciona parecido. Um caderno aberto na página certa, com o lápis em cima, mostra por onde começar antes de alguém precisar falar.

**Visual:** mesa com o caderno aberto e o lápis em cima, luz de fim de tarde, sem criança.

### Tela 4

> Hoje à noite, deixe a primeira pista da tarefa de amanhã no caminho dele. Depois conta para a gente o que aconteceu.

**Figurinha:** caixinha de perguntas · “O que aconteceu com a pista?”

**Visual:** o mesmo caderno de manhã, com um bilhete pequeno: “começa aqui”.

**Produção:** guiar quem joga com moedas, luz e caminhos é técnica conhecida de design de fases; não citar jogo comercial. “Quem joga sente que escolheu sozinho” é interpretação de design, sem dado. Se usar a Ilha dos Criadores no lugar da ilustração, lembrar que um bloco espalha 30 moedas por sorteio e só 8 formam uma roda num lugar escolhido (`world-3d/__gen_ilha.ts`), e que as falas do exemplo estão sem acento. Liga-se ao P14 (o lugar que outra pessoa explora) e ao P41 (acompanhar cada vez menos) sem repetir.

<a id="st05"></a>

## ST05 · Quando ouve “quebrou”, programador pede para quebrar de novo

**Versão anterior:** “‘Ontem funcionava’ é uma pista de ouro”

**Apoio:** [P31](09-p31-a-p40.md#p31), [P12](02-p11-a-p20.md#p12), [P54](11-p51-a-p60.md#p54). **Demonstração:** Salto nas Nuvens, a mesma variante da equipe do P07, agora com três tentativas iguais.

**Fechamento:** Um erro que acontece de novo, do mesmo jeito, já está meio resolvido.

### Tela 1

> Quando alguém diz que o jogo quebrou, programador experiente faz um pedido estranho: “faz quebrar de novo”.

**Visual:** Júlio diante do notebook, com a mão longe do teclado. Pessoa real: fisionomia fiel ao retrato autorizado; comparar lado a lado antes de aprovar.

### Tela 2

> Parece implicância, só que tem motivo. Um erro que apareceu uma vez pode ser qualquer coisa, mas um erro que se repete do mesmo jeito mostra onde procurar.

**Figurinha:** teste · “O herói caiu. O que ajuda a achar o erro?” · “Pular de novo igual” / “Mexer em tudo” / “Apagar e recomeçar” · certa: “Pular de novo igual”.

**Visual:** o herói caindo no vazio, uma vez.

### Tela 3

> Lembra do herói que caía no vazio, no post do “nada funciona”? O teste é pular de novo, igual: mesmo lugar, mesma tecla, três vezes. Se ele cai nas três, a suspeita se confirma, e a plataforma está longe mesmo.

**Visual:** as três tentativas lado a lado, do mesmo ponto de partida, com as três quedas.

### Tela 4

> Então, na próxima vez que ouvir “deu ruim”, peça: “faz acontecer de novo para eu ver”. Se acontecer, vocês já sabem onde olhar, e se não acontecer, isso também é uma pista.

**Visual:** a frase em letra grande sobre a tela do jogo parada.

**Produção:** reproduzir o erro antes de consertar é prática padrão de depuração (os “passos para reproduzir” de qualquer relato de defeito). Gravar três tentativas na variante afastada do P07, com o mesmo pulo 11; se alguma alcançar, ajustar o texto. Demonstração da equipe. Aprofunda o P12 (“o que você mudou por último?”) com o passo que vem antes.

<a id="st06"></a>

## ST06 · Tem equipe de programação que cronometra o tempo de ficar travado

**Versão anterior:** “Às 20h, você tem cinco minutos. Três perguntas cabem neles.”

**Apoio:** [P33](09-p31-a-p40.md#p33), [P44](10-p41-a-p50.md#p44), [P17](02-p11-a-p20.md#p17). **Demonstração:** nenhuma; relógio de cozinha.

**Fechamento:** Antes de chamar, tentar um pouco e anotar o que tentou.

### Tela 1

> Tem equipe de programação que combina quanto tempo alguém pode ficar travado sozinho antes de pedir ajuda. E o número é bem menor do que parece.

**Visual:** relógio de cozinha ao lado de um teclado.

### Tela 2

> A regra é conhecida entre programadores e cabe num relógio de cozinha. Antes de passar, dá um palpite.

**Figurinha:** teste · “Quanto tempo tentar antes de pedir ajuda?” · “5 minutos” / “15 minutos” / “1 hora” · certa: “15 minutos”.

**Visual:** o mesmo relógio, com os ponteiros cobertos por um post-it.

### Tela 3

> São 15 minutos. A pessoa tenta sozinha, anota o que tentou e, passado esse tempo, chama alguém, porque ficar uma hora travado também não ajuda ninguém.

**Visual:** bilhete “o que eu já tentei” com duas linhas preenchidas.

### Tela 4

> Com criança, dá para começar menor: cinco minutos no relógio da cozinha, enquanto você ainda não chegou. E, quando ele chamar, a primeira pergunta passa a ser “o que você já tentou?”.

**Figurinha:** enquete · “Aí em casa, ele costuma chamar…” · “Na hora” / “Depois de tentar”.

**Visual:** criança fictícia, de costas, anotando num bilhete ao lado do computador.

**Produção:** a regra dos 15 minutos está documentada (blog da Intercom; Rachel Thomas, fast.ai); registrar a fonte. Os cinco minutos para criança são sugestão da equipe, sem dado. Liga-se ao P17 (a vontade às 15h, você às 20h) com o que acontece antes de você chegar. A enquete alimenta a dor D12.

<a id="st07"></a>

## ST07 · Toda pressa que aparece numa tela foi colocada ali por alguém

**Versão anterior:** “Toda mensagem que aparece na tela foi escrita por alguém”

**Apoio:** [P05](01-p01-a-p10.md#p05), [P32](09-p31-a-p40.md#p32), [P38](09-p31-a-p40.md#p38). **Demonstração:** nenhuma; balões editoriais fictícios, sem marca.

**Fechamento:** Pedido com pressa é motivo para parar e mostrar para você.

### Tela 1

> Toda pressa que aparece numa tela foi colocada ali por alguém. No jogo, é para ficar divertido, mas fora dele nem sempre.

**Visual:** cronômetro de jogo piscando ao lado de uma notificação genérica com “só hoje”, sem marca.

### Tela 2

> Nos jogos, a pressa vem de propósito: o tempo acabando, a ponte caindo, o chefão chegando. E quem aplica golpe usa a mesma ferramenta, com “responda agora” e “só hoje”.

**Figurinha:** teste · “Qual mensagem quer apressar você?” · “500 moedas, só hoje” / “Seu amigo entrou” / “Atualização disponível” · certa: “500 moedas, só hoje”.

**Visual:** três balões de mensagem fictícios, sem marca.

### Tela 3

> Por isso o combinado do post desta semana ganha mais uma linha: pedido com pressa é motivo para parar e mostrar para você antes de responder.

**Visual:** o bilhete de geladeira do P05 com uma linha nova escrita à mão.

### Tela 4

> Hoje, procurem juntos uma propaganda com pressa e perguntem: “quem colocou essa pressa aqui, e o que queria que a gente fizesse?”.

**Figurinha:** caixinha de perguntas · “O que ele respondeu?”

**Visual:** celular de adulto com uma propaganda genérica desfocada, sem marca.

**Produção:** urgência como tática de golpe é orientação corrente de segurança digital; registrar uma fonte, por exemplo a cartilha do CERT.br. Mensagens fictícias, sem marca. Não afirmar nada sobre a segurança da plataforma. “Colocada ali por alguém” substitui “escrita por alguém”, que não vale para texto gerado automaticamente.

<a id="st08"></a>

## ST08 · Muito jogo bonito começou como um quadrado pulando

**Versão anterior:** “Guarde o dragão para depois”

**Apoio:** [P11](02-p11-a-p20.md#p11), [P49](10-p41-a-p50.md#p49), [P22](03-p21-a-p30.md#p22). **Demonstração:** nenhuma obrigatória; ilustração de um quadrado sobre retângulos cinza.

**Fechamento:** Primeiro a regra funciona com formas simples; depois entra o desenho.

### Tela 1

> Muito jogo bonito começou como um quadrado pulando em cima de um retângulo cinza.

**Visual:** um quadrado amarelo no ar sobre três retângulos cinza.

### Tela 2

> Os criadores chamam isso de protótipo. Antes de desenhar o herói, eles testam se o pulo é gostoso com formas simples, porque desenho caprichado num jogo sem graça vira trabalho perdido.

**Figurinha:** enquete · “Ele começa pelo desenho ou pela regra?” · “Pelo desenho” / “Pela regra”.

**Visual:** o mesmo quadrado ao lado de um esboço do herói desenhado a lápis.

### Tela 3

> Na aventura de dragão desta semana, o protótipo seria o herói andando até a porta da caverna, ainda sem caverna desenhada. Se funcionou, aí o desenho entra.

**Visual:** a folha do P11 com um quadrado no lugar do herói e um retângulo no lugar da porta.

### Tela 4

> Na próxima ideia dele, peça a versão “quadrado” antes de qualquer desenho. Se o pulo ficar gostoso com um quadrado, vai ficar ótimo com o herói.

**Visual:** o quadrado e o herói desenhado lado a lado, com uma seta entre eles.

**Produção:** prototipar com formas simples (em inglês, *blockout* ou *greybox*) é prática conhecida de design de jogos. Não dizer que o Estúdio tem um modo protótipo. Liga-se ao P11 (começar longe do dragão) e ao P22 (piso baixo) sem repetir a Vila do Dragão. Não repete o “guarde a primeira versão” do P49, da mesma semana.

<a id="st09"></a>

## ST09 · A primeira fase de um bom jogo dá aula sem ninguém perceber

**Versão anterior:** “Dez minutos acabam no meio da partida. Uma partida acaba no fim dela.”

**Apoio:** [P02](01-p01-a-p10.md#p02), [P35](09-p31-a-p40.md#p35), [P46](10-p41-a-p50.md#p46). **Demonstração:** nenhuma; ilustração de uma fase com o primeiro perigo raso.

**Fechamento:** Primeiro passo de coisa nova: pequeno, num lugar onde cair não dói.

### Tela 1

> A primeira fase de um bom jogo dá aula o tempo todo, e quem joga nem percebe que está aprendendo.

**Visual:** ilustração de uma fase com um buraco raso logo no começo.

### Tela 2

> Os criadores colocam o primeiro perigo num lugar onde cair não faz estrago. Assim, quem pula errado tenta de novo na hora e aprende o pulo antes do primeiro buraco de verdade.

**Figurinha:** teste · “Num bom jogo, o primeiro inimigo é…” · “Rápido e forte” / “Lento e fácil de ver” / “Escondido” · certa: “Lento e fácil de ver”.

**Visual:** o primeiro inimigo ilustrado, lento e bem à vista.

### Tela 3

> Lento e fácil de ver, porque a primeira fase serve para ensinar. E dá para montar uma fase assim em casa: a bicicleta começa na grama, e a primeira receita é um sanduíche.

**Visual:** bicicleta infantil sobre a grama, sem criança identificável.

### Tela 4

> Na próxima coisa nova que ele for aprender, monte a primeira fase junto com ele: um passo pequeno, num lugar onde cair não dói. O perigo de verdade fica para a fase dois.

**Visual:** a ilustração da fase com “fase 1” e “fase 2” marcadas.

**Produção:** fases que ensinam sem texto são prática conhecida de design de jogos. A pergunta do teste é uma regra de design, não uma estatística. Liga-se ao P46 (o primeiro minuto num programa novo) e ao P35 (a fase que conta a história). Saíram o strike do boliche (P10) e a dica de combinar em partidas (P02).

<a id="st10"></a>

## ST10 · Muito jogo mostra uma missão por vez, de propósito

**Versão anterior:** “A primeira missão de um jogo tem um formato que dá para copiar em casa”

**Apoio:** [P06](01-p01-a-p10.md#p06), [P53](11-p51-a-p60.md#p53), [P28](03-p21-a-p30.md#p28). **Demonstração:** nenhuma; bilhetes de papel.

**Fechamento:** Uma missão por vez; a próxima aparece quando a primeira termina.

### Tela 1

> Muito jogo mostra uma missão por vez, de propósito. Esconder o resto da lista foi uma escolha de quem fez.

**Visual:** canto de tela de jogo ilustrado com uma única missão curta.

### Tela 2

> É que uma lista de vinte coisas parece uma montanha, e uma missão só parece um passo. Por isso os criadores mostram a próxima e guardam as outras para depois.

**Figurinha:** enquete · “Aí em casa, a lista de tarefas fica…” · “Inteira à vista” / “Uma de cada vez”.

**Visual:** uma lista comprida enrolada ao lado de um único bilhete.

### Tela 3

> Vale para a lição de casa também. Quando ele terminar a primeira missão, aí sim aparece a segunda, num bilhete novo.

**Visual:** dois bilhetes, um sobre o outro, o de cima com “exercício 2”.

### Tela 4

> Hoje, guarde a lista inteira e entregue uma missão por vez. Depois conta para a gente como foi.

**Figurinha:** caixinha de perguntas · “Como foi a missão por vez?”

**Visual:** mão de adulto entregando um bilhete a uma criança fictícia, sem rosto.

**Produção:** mostrar um objetivo por vez é escolha comum de design; jogos com diário de missões mostram várias, por isso “muito jogo”. Aprofunda o P06 (trocar “vai estudar” por uma missão) com a ideia seguinte: uma missão por vez.

<a id="st11"></a>

## ST11 · “Sou ruim nisso” costuma ser sobre uma parte só

**Versão anterior:** “‘Sou ruim nisso’ costuma ser sobre uma parte só” (ajuste)

**Apoio:** [P40](09-p31-a-p40.md#p40), [P08](01-p01-a-p10.md#p08), [P55](11-p51-a-p60.md#p55). **Demonstração:** Defesa da Torre Profissional (Jogo 3D Avançado).

**Fechamento:** “Travei nesta parte” é um problema do tamanho certo para resolver.

### Tela 1

> Quando ele diz “sou ruim nisso”, muitas vezes o “isso” é uma parte pequena de uma coisa grande.

**Visual:** cena encenada: criança fictícia afasta o caderno; adulto ao lado, sem bronca.

### Tela 2

> Se você já ouviu essa frase, conta na enquete. E, quando ouvir de novo, divida a tarefa em pedaços e pergunte em qual ele travou: ler o enunciado, fazer a conta ou conferir.

**Figurinha:** enquete · “Já ouviu ‘sou ruim nisso’ aí em casa?” · “Já ouvi” / “Ainda não”.

**Visual:** o caderno com três etiquetas: ler, fazer, conferir.

### Tela 3

> Programador faz igual quando algo dá errado. Na Defesa da Torre Profissional, um dos jogos da nossa equipe, cada torre espera, mira, atira e recarrega, e quando ela não faz o que devia, a busca começa por uma dessas quatro partes.

**Visual:** Defesa da Torre Profissional: as três torres girando para mirar nos invasores que avançam contra o cristal; legenda editorial com os quatro passos.

### Tela 4

> Por isso vale trocar “sou ruim nisso” por “travei nesta parte”. Dito assim, o problema fica do tamanho certo para resolver.

**Visual:** as duas frases lado a lado, com a primeira riscada.

**Produção:** D08 é hipótese; registrar o resultado da enquete na pesquisa de dores. Os quatro estados (parado, mirar, atirar, recarregar) são da Defesa da Torre Profissional, no Jogo 3D Avançado (`game-3d-advanced/examples.ts`, linhas 7 a 21). A Defesa da Torre básica, do Jogo 3D, tem uma torre só, que gira sem parar, e não serve para esta tela.

<a id="st12"></a>

## ST12 · Quarenta minutos escolhendo a cor do slide, e nenhuma frase escrita

**Versão anterior:** “Quarenta minutos escolhendo a cor do slide. Nenhuma frase escrita.”

**Apoio:** [P13](02-p11-a-p20.md#p13), [P50](10-p41-a-p50.md#p50), [P29](03-p21-a-p30.md#p29). **Demonstração:** Fazenda Feliz Profissional (Jogo 2D Avançado).

**Fechamento:** Comece pela parte de que as outras dependem.

### Tela 1

> Quarenta minutos depois, a apresentação tem fundo roxo, letra bonita e nenhuma frase sobre o assunto.

**Visual:** slide caprichado e vazio; folha do pedido da escola ao lado, sem dados reais.

### Tela 2

> Começar pela cor é começar pela parte mais gostosa, só que ela depende do resto. E nos jogos é igual: algumas coisas só funcionam depois de outras.

**Visual:** paleta de cores aberta sobre um slide sem texto.

### Tela 3

> Na fazenda que a gente montou no Estúdio, a semente só entra no canteiro arado, e só cresce o que foi regado. Dá um palpite: qual é a ordem?

**Figurinha:** teste · “Qual ordem faz a fazenda funcionar?” · “Semente, enxada, regador” / “Enxada, semente, regador” / “Regador, semente, enxada” · certa: “Enxada, semente, regador”.

**Visual:** Fazenda Feliz Profissional: troca de ferramenta com a tecla Q, canteiro arado, semente plantada e regador em uso.

### Tela 4

> Enxada, semente, regador, nessa ordem. Na apresentação é igual: primeiro, três linhas no papel sobre o que precisa ser explicado, e só no fim a cor.

**Visual:** a resposta certa do teste ao lado de uma folha com três linhas escritas.

**Produção:** D13 é hipótese; a cena entra como situação reconhecível. Regras conferidas em `game-2d-advanced/__gen_fazendaFelizProfissional.ts`: arar, plantar e regar, e só cresce o que foi regado depois de dormir. A Fazenda Feliz Profissional aparece também no P24 (semana 3) e no P56 (semana 17), com outros momentos do jogo.

<a id="st13"></a>

## ST13 · Muitos estúdios de jogos anotam o lugar exato em que as pessoas desistem

**Versão anterior:** “Três respostas para ‘quero parar’. Cada uma pede uma coisa diferente de você.”

**Apoio:** [P36](09-p31-a-p40.md#p36), [P19](02-p11-a-p20.md#p19), [P52](11-p51-a-p60.md#p52). **Demonstração:** nenhuma; mapa editorial de uma fase com pontos vermelhos.

**Fechamento:** Se ele quer parar sempre no mesmo ponto, quem precisa de ajuste é aquele ponto.

### Tela 1

> Muitos estúdios de jogos anotam o lugar exato em que as pessoas desistem, porque esse lugar diz mais do que qualquer elogio.

**Visual:** mapa editorial de uma fase com pontos vermelhos concentrados num trecho.

### Tela 2

> Quando muita gente larga na mesma fase, a conclusão costuma ser sobre a fase, e quase nunca sobre quem jogou. Então eles mexem nela.

**Figurinha:** enquete · “Quando ele quer parar, costuma ser…” · “No mesmo ponto” / “Cada vez num lugar”.

**Visual:** o mesmo mapa, com o trecho vermelho redesenhado.

### Tela 3

> Em casa dá para fazer o mesmo mapa. Na próxima vez que ouvir “quero parar”, anote onde foi: qual tarefa, qual parte e que horas. Depois de três anotações, ou aparece um padrão, ou fica claro que não tem nenhum.

**Visual:** nota do celular com três anotações fictícias.

### Tela 4

> Se for sempre o mesmo ponto, quem precisa de ajuste é aquela parte, como uma fase que todo mundo larga. E a conversa muda de “por que você desiste?” para “o que tem de difícil aqui?”.

**Visual:** adulto e criança fictícia, de costas, olhando juntos a nota do celular.

**Produção:** registrar onde os jogadores caem e desistem (telemetria, mapas de calor) é prática de estúdios; registrar uma fonte antes de publicar e não citar marca na copy. Sem diagnóstico. A enquete alimenta a dor D19. Saíram o Inverno Mágico e a sugestão de trocar o tema, que insinuava uma promessa.

<a id="st14"></a>

## ST14 · Um dos códigos de trapaça mais famosos dos videogames nasceu para testar o jogo

**Versão anterior:** “Todo número de um jogo foi escolhido por alguém”

**Apoio:** [P09](01-p01-a-p10.md#p09), [P42](10-p41-a-p50.md#p42), [P30](03-p21-a-p30.md#p30). **Demonstração:** nenhuma; ilustração de controle antigo genérico, sem marca.

**Fechamento:** Criar um jogo inclui criar jeitos de testar mais rápido.

### Tela 1

> Um dos códigos de trapaça mais famosos dos videogames foi criado pelo próprio programador do jogo, e ele tinha um bom motivo.

**Visual:** controle de videogame antigo genérico, sem marca, com setas e dois botões.

### Tela 2

> O jogo era difícil demais, até para quem estava programando. Antes de passar, dá um palpite.

**Figurinha:** teste · “Por que ele criou a trapaça?” · “Para ajudar os fãs” / “Para testar o jogo” / “Por brincadeira” · certa: “Para testar o jogo”.

**Visual:** ilustração de um jogo de nave antigo, genérico, sem marca.

### Tela 3

> Foi para testar. Ele escondeu uma sequência de botões que dava todos os poderes de uma vez e assim chegava ao fim depressa. Só que esqueceu de tirar, os jogadores descobriram, e a trapaça virou lenda.

**Visual:** a sequência de setas e botões desenhada como um código, sem marca nem nome de jogo.

### Tela 4

> Testar faz parte de criar, e muito criador inventa atalhos para testar mais rápido. Pergunte hoje a ele: “se você pudesse esconder uma trapaça no seu jogo para testar, qual seria?”.

**Figurinha:** caixinha de perguntas · “Qual trapaça ele inventou?”

**Visual:** bilhete escrito à mão, “minha trapaça secreta”, com o espaço em branco.

**Produção:** história de Kazuhisa Hashimoto, que criou o código em 1986, ao adaptar um jogo de nave para o console doméstico, porque não conseguia terminá-lo nos testes, e esqueceu de removê-lo (Wikipedia, verbete “Konami Code”; ESPN). O código dava o conjunto completo de poderes. Não citar marca na copy (regra 5 da vitrine). Liga-se ao P30 (estragar de propósito) e ao P42 (combinar o que é pronto, que se confere testando). Saiu a quarta repetição de “fogo tira o dobro da planta”.

<a id="st15"></a>

## ST15 · Programadores têm uma regra para dois no mesmo computador

**Versão anterior:** “O melhor testador de jogos não encosta no código”

**Apoio:** [P25](03-p21-a-p30.md#p25), [P10](01-p01-a-p10.md#p10), [P58](11-p51-a-p60.md#p58). **Demonstração:** nenhuma; cena encenada de mãos.

**Fechamento:** Na ajuda, você navega e o mouse fica com ele.

### Tela 1

> Ele chamou para ajudar e, dois minutos depois, o mouse já está na sua mão.

**Visual:** mão adulta no mouse; criança fictícia encostada na cadeira, só olhando.

### Tela 2

> Entre programadores, essa cena tem nome e tem regra. Na programação em par, um fica no teclado e pilota, enquanto o outro navega: olha, pergunta, aponta e não encosta no mouse.

**Figurinha:** enquete · “Quando ele chama, o mouse fica com quem?” · “Comigo” / “Com ele”.

**Visual:** a mesma cena invertida: mão da criança no mouse, adulto apontando a tela.

### Tela 3

> A regra existe porque a mão que mexe é a que aprende o caminho. Quando o mais experiente pilota o tempo todo, o outro só assiste.

**Visual:** close das duas mãos: a da criança no mouse e a do adulto apontando, sem tocar.

### Tela 4

> Na próxima ajuda, vire navegador: aponte na tela, pergunte “e se você tentar ali?” e deixe o mouse com ele. Se precisar mostrar, mostre uma vez e devolva.

**Visual:** bilhete ao lado do teclado: “navegador aponta e pergunta”.

**Produção:** a programação em par, com os papéis de piloto e navegador, vem da Programação Extrema. “A mão que mexe é a que aprende” é opinião da equipe. O P58 põe o pai como quem testa; aqui ele é quem navega, e as duas ideias se completam sem repetir. Saiu o Duelo de Heróis, que já está no P51.

<a id="st16"></a>

## ST16 · Durante a criação, muito jogo tem uma fase que nenhum jogador vai ver

**Versão anterior:** “Um bom chefão fica mais difícil na hora certa”

**Apoio:** [P18](02-p11-a-p20.md#p18), [P43](10-p41-a-p50.md#p43), [P45](10-p41-a-p50.md#p45). **Demonstração:** as duas versões do Balão do P45, se a captura existir.

**Fechamento:** O “e se” exagerado vai para a sala de testes, e o jogo de verdade fica inteiro.

### Tela 1

> Durante a criação, muito jogo tem uma fase que nenhum jogador vai ver, e é lá que os criadores fazem os testes mais malucos.

**Visual:** ilustração de uma sala de testes vazia, com blocos soltos e um personagem flutuando.

### Tela 2

> Eles chamam de sala de testes. Lá dá para fazer o “e se” mais exagerado, como pulo gigante ou gravidade zero, e a fase de verdade continua inteira.

**Figurinha:** enquete · “Numa sala de testes, ele testaria…” · “Pulo gigante” / “Velocidade” / “Gravidade zero” / “Inimigo lento”.

**Visual:** personagem ilustrado num pulo gigante, saindo pelo alto da tela.

### Tela 3

> As duas versões do balão, no post desta semana, saíram de um teste assim: a força 2 foi para uma cópia, e o jogo original ficou do jeito que era.

**Visual:** os dois balões lado a lado, marcados “original” e “cópia de teste”.

### Tela 4

> Pergunte hoje a ele: “se você tivesse uma sala secreta de testes no seu jogo, o que testaria lá?”. A resposta mostra o “e se” favorito dele.

**Figurinha:** caixinha de perguntas · “O que ele testaria?”

**Visual:** fundo limpo com a pergunta e um ponto de interrogação desenhado à mão.

**Produção:** fases de teste existem na criação de muitos jogos (há catálogos de fases de teste esquecidas em jogos lançados); registrar uma fonte e não citar marca na copy. Confirmar que a variante com força 2 do P45 foi feita numa cópia; se não foi, reescrever a tela 3 sem afirmar isso. A enquete é de preferência, sem resposta certa.

<a id="st17"></a>

## ST17 · Nos jogos, o lugar para onde você volta depois de cair foi escolhido a dedo

**Versão anterior:** “O bilhete que faz a próxima sessão começar em um minuto”

**Apoio:** [P39](09-p31-a-p40.md#p39), [P21](03-p21-a-p30.md#p21), [P56](11-p51-a-p60.md#p56). **Demonstração:** nenhuma; ilustração de fase com uma bandeirinha de volta antes de um trecho difícil.

**Fechamento:** O ponto de volta fica logo antes da parte difícil.

### Tela 1

> Nos jogos, o lugar para onde você volta depois de cair foi escolhido a dedo, e um passo para lá ou para cá muda tudo.

**Visual:** ilustração de fase com uma bandeirinha antes de um trecho de espinhos.

### Tela 2

> Os criadores chamam esse lugar de checkpoint, o ponto de volta. A posição dele decide se a queda dá vontade de tentar de novo ou de largar o jogo.

**Figurinha:** teste · “Onde fica um bom ponto de volta?” · “No começo da fase” / “Antes da parte difícil” / “Depois da parte difícil” · certa: “Antes da parte difícil”.

**Visual:** três bandeirinhas possíveis no mapa, numeradas.

### Tela 3

> Fica logo antes da parte difícil. Assim, cair custa poucos segundos e a parte difícil continua difícil. Já um ponto de volta longe demais transforma cada erro em castigo.

**Visual:** a bandeirinha certa destacada, com o trecho de espinhos logo depois.

### Tela 4

> Em trabalho longo, combine pontos de volta com ele: terminou uma parte, salva com nome novo ou tira foto do caderno. Se errar depois, ele volta para lá, e não para a primeira página.

**Visual:** celular fotografando uma página pronta do caderno.

**Produção:** posicionar o checkpoint antes do trecho difícil é prática comum de design de fases. Não afirmar que um exemplo do Estúdio tem checkpoint sem conferir: no Parkour do Vulcão, cair volta ao menu e zera as gemas. Aqui “checkpoint” é ponto de volta, diferente dos anéis da Corrida do Pôr do Sol (P40). Dá nome à ideia do P39 sem repetir o trampolim e sem repetir o bilhete do P56.

<a id="st18"></a>

## ST18 · Copiar faz parte. Dizer de onde copiou também.

**Versão anterior:** “Num modelo bom, dá para apontar o que é dele”

**Apoio:** [P15](02-p11-a-p20.md#p15), [P48](10-p41-a-p50.md#p48), [P27](03-p21-a-p30.md#p27). **Demonstração:** nenhuma; créditos editoriais com nomes fictícios.

**Fechamento:** Copiar e dizer de onde veio é o jeito honesto de aprender com os outros.

### Tela 1

> Programador copia o tempo todo, como a gente contou nesta semana. Só que existe uma etiqueta que pouca gente explica: dizer de onde copiou.

**Visual:** folha de modelo impressa com um desenho novo feito por cima, mãos de uma criança fictícia.

### Tela 2

> Entre programadores, isso tem nome: dar crédito. Muito código aberto só pode ser usado se o nome de quem fez continuar lá, escrito no arquivo.

**Figurinha:** enquete · “Ele costuma dizer de onde tirou a ideia?” · “Costuma” / “Ainda não”.

**Visual:** trecho de arquivo ilustrado com a linha “feito por…” destacada, nome fictício.

### Tela 3

> E os créditos no fim de um jogo grande, com centenas de nomes, são o mesmo gesto em tamanho maior: mostrar quem ajudou a fazer.

**Visual:** créditos subindo numa tela escura, com nomes inventados.

### Tela 4

> Na próxima vez que ele usar um modelo, peça uma linha no canto: “baseado em…”. Copiar e dizer de onde veio é o jeito honesto de aprender com os outros.

**Visual:** folha de trabalho com “baseado em…” escrito à mão no canto.

**Produção:** licenças como a MIT exigem manter o aviso de autoria nas cópias; conferir a redação antes de publicar. Sem acusar cópia escolar. D15 segue hipótese; a enquete alimenta a pesquisa. Saiu o Cenário do meu desenho, que é o exemplo do P15.

<a id="st19"></a>

## ST19 · Um bom chefão fica mais difícil na hora certa

**Versão anterior:** “Antes de ele apertar jogar, peça um palpite”

**Apoio:** [P26](03-p21-a-p30.md#p26), [P59](11-p51-a-p60.md#p59), [P23](03-p21-a-p30.md#p23). **Demonstração:** O Chefão das Sombras (Jogo 3D Avançado).

**Fechamento:** Desafio bom cresce na hora certa, nem antes, nem depois.

### Tela 1

> Um bom chefão fica mais difícil na hora certa, nem antes, nem depois.

**Visual:** O Chefão das Sombras no começo da luta.

### Tela 2

> Neste chefão que a gente montou no Estúdio, a luta tem três fases, e a cada fase ele fica mais bravo e recupera um pouco de vida.

**Visual:** O Chefão das Sombras na passagem da fase 1 para a 2, com a cura e o anel de tiros crescendo.

### Tela 3

> O tamanho de cada degrau é uma decisão de quem cria. Se fosse você, o que mudaria para a terceira fase?

**Figurinha:** enquete · “Para deixar a fase 3 mais difícil…” · “Curar mais” / “Ficar mais bravo”.

**Visual:** três degraus editoriais, um por fase, com o terceiro em destaque.

### Tela 4

> Pergunte hoje a ele qual foi o chefão mais difícil que já enfrentou e o que mudava na última fase. Ele vai explicar uma curva de dificuldade inteira sem nem saber o nome.

**Figurinha:** caixinha de perguntas · “Qual chefão ele escolheu?”

**Visual:** criança fictícia gesticulando, explicando para um adulto sentado ao lado.

**Produção:** regras conferidas em `game-3d-advanced/__gen_chefao.ts`: três fases, cura de 8 ao entrar nas fases 2 e 3, e anel de tiros que passa de 6 para 8 e depois 10. A enquete é de preferência, sem resposta certa. Acompanha o P59 (a curva de dificuldade), que foi para esta semana.

<a id="st20"></a>

## ST20 · Todo jogo pronto deixa um monte de ideias de fora

**Versão anterior:** “A primeira aula é festa. O que importa aparece nas semanas seguintes.”

**Apoio:** [P57](11-p51-a-p60.md#p57), [P47](10-p41-a-p50.md#p47), [P60](11-p51-a-p60.md#p60). **Demonstração:** nenhuma; caderno ou nota do celular.

**Fechamento:** O próximo jogo começa numa lista.

### Tela 1

> Todo jogo pronto deixa um monte de ideias de fora, e os criadores não jogam nenhuma fora.

**Visual:** caderno com várias ideias marcadas “fica para depois”.

### Tela 2

> Elas vão para uma lista que equipes de programação chamam de backlog, que quer dizer tudo o que ainda pode entrar. Quando um jogo termina, o próximo começa por ali.

**Figurinha:** enquete · “Ele já falou do próximo jogo?” · “Já falou” / “Ainda não”.

**Visual:** nota do celular com o título “próximo jogo”, sem conteúdo de aluno real.

### Tela 3

> No post desta semana, o André disse: “Esse foi o primeiro e já quero fazer um maior.” E um jogo maior começa numa lista, que pode ser um caderno, uma nota no celular ou a porta da geladeira.

**Visual:** caderno aberto com o título “próximo jogo” e linhas vazias.

### Tela 4

> Hoje, abram juntos a lista do próximo jogo e escrevam a primeira ideia. Se ele travar, pergunte o que ficou de fora do último.

**Figurinha:** caixinha de perguntas · “Qual foi a primeira ideia da lista?”

**Visual:** porta de geladeira com um bilhete “próximo jogo: 1.” escrito à mão.

**Produção:** backlog é termo do Scrum, explicado na própria frase. A fala do André é trecho literal do registro autorizado, usado no P60; ele aparece como aluno. “Não jogam nenhuma fora” é brincadeira com a palavra, não dado. Fecha o ciclo de 20 semanas apontando para o próximo jogo.
