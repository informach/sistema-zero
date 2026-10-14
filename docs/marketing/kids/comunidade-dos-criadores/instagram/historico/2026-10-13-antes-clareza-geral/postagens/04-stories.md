# Stories: 20 sequências completas

**Revisão: 13/10/2026, noite (revisão 4).** Os stories têm objetivo próprio: **educar** quem já segue. Não pedem para seguir e não levam à oferta. Cada sequência é a segunda camada dos posts da semana: chama o assunto de volta e entrega um bastidor novo, sem repetir o post. A tela 1 prende como uma capa, as telas conversam entre si com conectores, a figurinha tem função e a tela 4 fecha com uma frase para guardar ou um pedido pequeno. As semanas seguem o [calendário](../03-postagens.md) com as cinco trocas de posição (a última, P40 ↔ P54). Na revisão 3, as telas ficaram com até cerca de 25 palavras, os testes passaram a conferir fatos e não recomendações, e quatro sequências falam de uma filha. Na revisão 4, o ST10 tirou o adulto do meio (a própria criança desdobra a próxima missão), o ST17 deixou de tratar a foto do caderno como ponto de volta, as enquetes de quatro opções ganharam alternativa de duas, e as indicações de imagem passaram a separar criança fictícia de Helena e Júlio e a mandar o texto de dentro da imagem para a edição. Régua em [Guia de copy](13-guia-de-copy.md) · [Versão anterior](../historico/2026-10-13-noite-antes-revisao-4/04-stories.md).

Formato 1080 × 1920. Copy integral em citação, com figurinha e visual por tela. Preservar as margens usadas pelos controles do aplicativo. Cada tela tem até cerca de 25 palavras; as poucas que passam disso vão sobre vídeo de 8 a 10 segundos (a captura do jogo serve). Cada sequência tem uma ou duas figurinhas (enquete, teste ou caixa de perguntas), com função definida. Enquete escuta experiências e nunca tem resposta certa; teste confere um fato explicado na sequência ou pede um palpite que a tela seguinte revela, nunca uma recomendação. Texto de figurinha com até cerca de 50 caracteres, a conferir no aplicativo. Resultado real de enquete pode aparecer na tela seguinte; nunca fabricar votos. Demonstrações são jogos da nossa equipe, nunca de aluno. Criança fictícia nunca divide o quadro com Helena ou Júlio; o adulto que aparece ao lado dela também é fictício. Todo texto dentro da imagem (bilhete, nome de arquivo, etiqueta, letreiro) é aplicado na edição ou vem de foto real, nunca escrito pelo gerador de imagem. Enquete de quatro opções usa a enquete de até 4 opções do Instagram; se a conta só oferecer duas, vale a alternativa indicada na Produção. Nenhuma imagem se repete dentro da sequência, e pessoa real aparece com fisionomia fiel ao retrato autorizado (ver [direção visual](05-direcao-visual-e-producao.md)).

<a id="st01"></a>

## ST01 · Quando o jogo comemora um strike, quem comemora é uma frase

**Versão anterior:** “Toda comemoração de jogo tem uma frase escondida”

**Apoio:** [P01](01-p01-a-p10.md#p01), [P07](01-p01-a-p10.md#p07), [P16](02-p11-a-p20.md#p16). **Demonstração:** Boliche na Praça (Mundo 3D), mais uma cópia da equipe sem o bloco do strike.

**Fechamento:** Tudo o que acontece num jogo tem uma frase por trás, e muitas dá para adivinhar.

### Tela 1

> Quando o jogo comemora um strike, quem está comemorando é uma frase que alguém escreveu.

**Visual:** Boliche na Praça: o jipe acelerando contra os dez pinos, um quadro antes do impacto, câmera baixa, atrás do jipe. Enquadrar sem o totem com o nome do exemplo.

### Tela 2

> No boliche do nosso Estúdio, onde a gente monta os jogos, o jipe derruba os dez pinos, aparece STRIKE e a tela treme. Arrisque um palpite.

**Figurinha:** teste · “Quem fez a tela tremer?” · “A batida do jipe” / “Uma frase escrita” · certa: “Uma frase escrita”.

**Visual:** o strike em vídeo, de frente para os pinos, com o aviso e a câmera tremendo.

### Tela 3

> Foi uma frase: quando derrubar todos os pinos, mostrar STRIKE e fazer a tela tremer. Sem ela, os pinos caem e nada treme.

**Visual:** recorte legível do bloco do strike, de perto, ao lado de duas capturas pequenas: com o bloco (aviso e tremor) e na cópia sem ele (pinos caindo, tela parada).

### Tela 4

> Então brinquem disso hoje: escolham algo que acontece num jogo de que ele gosta e tentem escrever juntos a frase por trás.

**Figurinha:** caixinha de perguntas · “Qual frase vocês escreveram?”

**Visual:** fundo limpo, com a frase da tela 3 pequena no canto, como exemplo, escrita à mão num bloco de notas. Texto aplicado na edição.

**Produção:** regra conferida em `world-3d/__gen_boliche.ts`: o strike é o bloco `bowlingOnStrike`, com `say("STRIKE!", 3)` e `cameraShake(0.8, 0.5)`. A exclamação do balão aparece só na captura. A versão sem o bloco é variante da equipe e deve ser declarada; pelo runtime, a batida nos pinos não treme a câmera (`world-3d/runtime.ts`), mas confirmar na captura; se tremer, trocar a pergunta. O totem do exemplo diz “Boliche na Praca”, sem cedilha: enquadrar sem ele ou corrigir na cópia. Saíram o Parque dos Brinquedos e os 6 metros, porque essa distância é fixa no motor da extensão e não existe como bloco. O P10 (semana 15) também fala do strike, 14 semanas depois, e a MC07 usa a mesma comemoração: não publicar a MC07 na semana 1.

<a id="st02"></a>

## ST02 · Muito jogo de computador foi testado primeiro com papel e dado

**Versão anterior:** “Muito jogo de computador foi testado primeiro com papel e dado”

**Apoio:** [P34](09-p31-a-p40.md#p34), [P03](01-p01-a-p10.md#p03), [P51](11-p51-a-p60.md#p51). **Demonstração:** nenhuma; um jogo de tabuleiro da casa, sem marca.

**Fechamento:** Uma regra nova merece duas partidas: uma com a antiga e outra com a nova.

### Tela 1

> Muito jogo de computador foi testado primeiro com papel, cartas e dado, antes de existir uma linha de código.

**Visual:** mesa vista de cima, com folhas, cartas desenhadas à mão e um dado; mãos de um adulto fictício e de uma menina fictícia.

### Tela 2

> Os criadores fazem isso porque mudar uma regra no papel leva um minuto. Assim descobrem se a ideia é divertida antes de passar dias programando.

**Figurinha:** enquete · “Vocês já mudaram a regra de um jogo?” · “Já mudamos” / “Nunca”.

**Visual:** close de uma carta com a regra riscada e outra escrita por cima, a lápis. Texto aplicado na edição.

### Tela 3

> Dá para testar em casa. Escolham um jogo de tabuleiro e troquem uma regra só, daquelas que sua filha vive querendo mudar.

**Visual:** tabuleiro genérico, sem marca, com um bilhete “regra nova” ao lado; a menina fictícia escrevendo o bilhete, de perfil. Texto aplicado na edição.

### Tela 4

> Joguem uma partida com cada regra. Ficou mais justo ou mais divertido? É assim que quem cria jogos decide se a regra fica.

**Figurinha:** caixinha de perguntas · “Qual regra vocês mudaram?”

**Visual:** placar escrito à mão com duas colunas, “antiga” e “nova”. Texto aplicado na edição.

**Produção:** testar regras com papel antes de programar (protótipo de papel) é prática documentada de design de jogos; fonte: *Game Design Workshop*, de Tracy Fullerton (capítulos de protótipo físico). Aprofunda o P34 (propor uma mudança) e o P51 (jogar junto) sem mostrar jogo do Estúdio. Tabuleiro sem marca identificável. Sequência com uma filha: manter menina nas cenas.

<a id="st03"></a>

## ST03 · Toda pasta de escola tem um “trabalho final 2”

**Versão anterior:** “Toda pasta de escola tem um ‘trabalho final 2’”

**Apoio:** [P04](01-p01-a-p10.md#p04), [P37](09-p31-a-p40.md#p37), [P24](03-p21-a-p30.md#p24). **Demonstração:** nenhuma; janela de pastas com nomes fictícios.

**Fechamento:** O nome do arquivo diz o assunto e o número, e a busca acha em dois segundos.

### Tela 1

> Em muita pasta de escola mora um “trabalho final”, um “trabalho final 2” e um “agora vai”. E ninguém sabe qual deles é o certo.

**Visual:** janela de pastas com os três arquivos, nomes fictícios, sem dados pessoais. Texto aplicado na edição.

### Tela 2

> Programadores guardam cada versão com número e descrição. Em casa, isso cabe no nome do arquivo: com “planetas-1” e “planetas-2”, acabou a dúvida.

**Figurinha:** enquete de até 4 opções do Instagram · “Qual nome mais aparece aí em casa?” · “trabalho final” / “sem título” / “agora vai” / “Outro nome”.

**Visual:** os mesmos arquivos renomeados, ao lado dos nomes antigos riscados. Texto aplicado na edição.

### Tela 3

> E tem uma vantagem escondida: com número novo, o trabalho de hoje não apaga o de ontem. Se a versão nova piorar, a antiga continua lá.

**Visual:** duas versões do trabalho abertas lado a lado, uma com um parágrafo a mais.

### Tela 4

> Antes de salvar o próximo trabalho, escolham juntos o nome: o assunto, um traço e o número. Amanhã, é só digitar “planetas” na busca.

**Visual:** a busca do computador mostrando “planetas-1” e “planetas-2”. Texto aplicado na edição.

**Produção:** programadores resolvem a bagunça de versões com controle de versão, que guarda cada versão com número e descrição; o nome com número é a versão caseira disso, e a tela diz assim. O P04 trata de achar o arquivo; esta sequência trata de dar nome e guardar versões, sem repetir o teste de três minutos. O P49 (semana 8) usa a primeira versão como prova de aprendizado; aqui a versão serve para não perder o trabalho. A enquete não tem resposta certa. Se a conta só oferecer enquete de duas opções, usar “trabalho final” / “sem título”.

<a id="st04"></a>

## ST04 · Os melhores jogos quase nunca escrevem “vá para a direita”

**Versão anterior:** “Os melhores jogos quase nunca escrevem ‘vá para a direita’”

**Apoio:** [P14](02-p11-a-p20.md#p14), [P41](10-p41-a-p50.md#p41), [P20](02-p11-a-p20.md#p20). **Demonstração:** nenhuma obrigatória; ilustração editorial de uma fase com moedas formando caminho.

**Fechamento:** Deixe a primeira pista da tarefa no caminho dele.

### Tela 1

> Os melhores jogos quase nunca escrevem “vá para a direita”. Mesmo assim, a maioria das pessoas vai.

**Visual:** fase ilustrada com uma trilha de moedas apontando para a direita, sem seta nem texto.

### Tela 2

> É que os criadores espalham pistas pelo caminho: uma moeda, uma luz acesa, uma porta aberta. O olho segue, e quem joga sente que escolheu sozinho.

**Figurinha:** enquete · “O material da lição dorme onde?” · “À vista” / “Na mochila”.

**Visual:** a mesma fase vista de cima, agora com as pistas circuladas.

### Tela 3

> Em casa, a pista funciona igual. Um caderno aberto na página certa, com o lápis em cima, mostra por onde começar sem ninguém avisar.

**Visual:** mesa com o caderno aberto e o lápis em cima, luz de fim de tarde, sem criança.

### Tela 4

> Hoje à noite, deixe a primeira pista da tarefa de amanhã no caminho dele. Depois, conte para a gente o que aconteceu.

**Figurinha:** caixinha de perguntas · “O que aconteceu com a pista?”

**Visual:** o mesmo caderno de manhã, com um bilhete pequeno: “começa aqui”. Texto aplicado na edição.

**Produção:** guiar quem joga com moedas, luz e caminhos é técnica documentada de design de fases (a fase 1-1 de um clássico de plataforma é o exemplo mais citado); não citar jogo comercial na copy. “Quem joga sente que escolheu sozinho” é interpretação de design, sem dado. Se usar a Ilha dos Criadores no lugar da ilustração, lembrar que um bloco espalha 30 moedas por sorteio e só 8 formam uma roda num lugar escolhido (`world-3d/__gen_ilha.ts`), e que as falas do exemplo estão sem acento. Liga-se ao P14 (o lugar que outra pessoa explora) e ao P41 (acompanhar cada vez menos) sem repetir.

<a id="st05"></a>

## ST05 · Quando ouve “quebrou”, programador pede para quebrar de novo

**Versão anterior:** “Quando ouve ‘quebrou’, programador pede para quebrar de novo”

**Apoio:** [P31](09-p31-a-p40.md#p31), [P12](02-p11-a-p20.md#p12), [P40](09-p31-a-p40.md#p40). **Demonstração:** Salto nas Nuvens, a mesma variante da equipe do P07, agora com três tentativas iguais.

**Fechamento:** Um erro que acontece de novo, do mesmo jeito, já está meio resolvido.

### Tela 1

> Quando alguém diz que o jogo quebrou, programador experiente faz um pedido estranho: “faz quebrar de novo”.

**Visual:** Júlio diante do notebook, com a mão longe do teclado. Pessoa real: fisionomia fiel ao retrato autorizado; comparar lado a lado antes de aprovar.

### Tela 2

> Parece implicância, mas tem motivo. Um erro que aparece uma vez pode ser qualquer coisa. Um erro que se repete igual mostra onde procurar.

**Figurinha:** teste · “O herói caiu. O que o programador faz primeiro?” · “Repete o pulo igual” / “Mexe em tudo” / “Apaga e recomeça” · certa: “Repete o pulo igual”.

**Visual:** o herói pulando e caindo antes da plataforma, até o chão lá embaixo, uma vez, visto de lado.

### Tela 3

> Lembra do herói que não alcançava a plataforma, no post do “nada funciona”? Três pulos iguais, três quedas: a plataforma ficou longe demais.

**Visual:** as três tentativas lado a lado, do mesmo ponto de partida, vistas de cima, com as três quedas marcadas.

### Tela 4

> Quando ouvir “deu ruim”, peça: “faz acontecer de novo para eu ver”. Se acontecer, vocês já sabem onde olhar. Se não acontecer, isso também é pista.

**Visual:** a frase em letra grande sobre a tela do jogo parada, desfocada.

**Produção:** reproduzir o erro antes de consertar é prática padrão de depuração (os “passos para reproduzir” de qualquer relato de defeito); o teste confere essa prática, explicada na tela 2. Gravar três tentativas na variante afastada do P07, com o mesmo pulo 11; se alguma alcançar, ajustar o texto. No Salto nas Nuvens há chão em y 0: o herói cai até o chão, não “no vazio”. Demonstração da equipe. Aprofunda o P12 (“o que você mudou por último?”) com o passo que vem antes. Semana 5 depois da troca P40 ↔ P54: o Apoio traz o P40.

<a id="st06"></a>

## ST06 · Tem equipe de programação que cronometra o tempo de ficar travado

**Versão anterior:** “Tem equipe de programação que cronometra o tempo de ficar travado”

**Apoio:** [P33](09-p31-a-p40.md#p33), [P44](10-p41-a-p50.md#p44), [P17](02-p11-a-p20.md#p17). **Demonstração:** nenhuma; relógio de cozinha.

**Fechamento:** Antes de chamar, tentar um pouco e anotar o que tentou.

### Tela 1

> Tem equipe de programação que combina quanto tempo cada um pode ficar travado sozinho. E o tempo é menor do que muita gente imagina.

**Visual:** relógio de cozinha ao lado de um teclado.

### Tela 2

> A regra é conhecida entre programadores e cabe num relógio de cozinha. Arrisque um palpite antes de passar.

**Figurinha:** teste · “Nessas equipes, quanto tempo antes de pedir ajuda?” · “5 minutos” / “15 minutos” / “1 hora” · certa: “15 minutos”.

**Visual:** o mesmo relógio, de perto, com os ponteiros cobertos por um post-it.

### Tela 3

> São 15 minutos. A pessoa tenta sozinha, anota o que tentou e depois chama alguém, porque uma hora travado não ajuda ninguém.

**Visual:** bilhete “o que eu já tentei” com duas linhas preenchidas. Texto aplicado na edição.

### Tela 4

> Com criança, a gente sugere começar menor: cinco minutos no relógio da cozinha. E, quando ele chamar, a primeira pergunta vira “o que você já tentou?”.

**Figurinha:** enquete · “Quando trava, ele chama…” · “Na hora” / “Depois de tentar”.

**Visual:** criança fictícia, de costas, anotando num bilhete ao lado do computador.

**Produção:** o teste confere um fato sobre essas equipes, não o tempo certo para uma criança. A regra dos 15 minutos está documentada (blog da Intercom, 29/11/2021; Rachel Thomas, fast.ai), e “anotar o que tentou” aparece em neilb.org (23/01/2014). Os cinco minutos para criança são sugestão da equipe, sem dado, e a tela diz isso. Liga-se ao P17 (a vontade às 15h, você às 20h) com o que acontece antes de você chegar. A enquete alimenta a dor D12.

<a id="st07"></a>

## ST07 · Toda pressa que aparece numa tela foi colocada ali por alguém

**Versão anterior:** “Toda pressa que aparece numa tela foi colocada ali por alguém”

**Apoio:** [P05](01-p01-a-p10.md#p05), [P32](09-p31-a-p40.md#p32), [P38](09-p31-a-p40.md#p38). **Demonstração:** nenhuma; balões editoriais fictícios, sem marca.

**Fechamento:** Pedido com pressa é motivo para parar e mostrar para você.

### Tela 1

> Toda pressa que aparece numa tela foi colocada ali por alguém. No jogo, ela está ali para divertir, mas fora dele nem sempre.

**Visual:** cronômetro de jogo piscando ao lado de uma notificação genérica com “só hoje”, sem marca.

### Tela 2

> Nos jogos, a pressa é de propósito: o tempo acabando, a ponte caindo. E golpe usa a mesma ferramenta, com “responda agora” e “só hoje”.

**Figurinha:** teste · “Qual mensagem quer apressar você?” · “500 moedas, só hoje” / “Seu amigo entrou” / “Atualização disponível” · certa: “500 moedas, só hoje”.

**Visual:** três balões de mensagem fictícios, sem marca, em fila.

### Tela 3

> Por isso, o combinado do post desta semana ganha mais uma linha: pedido com pressa é motivo para parar e mostrar para você.

**Visual:** o bilhete de geladeira do P05 com uma linha nova escrita à mão. Texto aplicado na edição.

### Tela 4

> Hoje, procurem juntos uma propaganda com pressa e perguntem: “quem colocou essa pressa aqui, e o que queria que a gente fizesse?”.

**Figurinha:** caixinha de perguntas · “O que ele respondeu?”

**Visual:** celular de adulto com uma propaganda genérica desfocada, sem marca, segurado pela criança fictícia.

**Produção:** urgência como tática de golpe é orientação de segurança digital: os fascículos “Golpes” da Cartilha do CERT.br (31/03/2026) citam medo, pressa, ganância e caridade. Mensagens fictícias, sem marca. Não afirmar nada sobre a segurança da plataforma. “Colocada ali por alguém” substitui “escrita por alguém”, que não vale para texto gerado automaticamente. Depende de o P05 manter o combinado de senha, dinheiro, foto e dados.

<a id="st08"></a>

## ST08 · Muito jogo bonito começou como um quadrado pulando

**Versão anterior:** “Muito jogo bonito começou como um quadrado pulando”

**Apoio:** [P11](02-p11-a-p20.md#p11), [P49](10-p41-a-p50.md#p49), [P22](03-p21-a-p30.md#p22). **Demonstração:** nenhuma obrigatória; ilustração de um quadrado sobre retângulos cinza.

**Fechamento:** Primeiro a regra funciona com formas simples; depois entra o desenho.

### Tela 1

> Muito jogo bonito começou como um quadrado pulando em cima de um retângulo cinza.

**Visual:** um quadrado amarelo no ar sobre três retângulos cinza.

### Tela 2

> É o protótipo: antes de desenhar o herói, quem cria testa o pulo com formas simples. Desenho caprichado em jogo sem graça vira trabalho perdido.

**Figurinha:** enquete · “Sua filha começa pelo desenho ou pela regra?” · “Pelo desenho” / “Pela regra”.

**Visual:** o mesmo quadrado ao lado de um esboço de heroína desenhado a lápis.

### Tela 3

> Na aventura de dragão desta semana, o protótipo seria só o herói andando até a porta, em formas simples. Se funcionar, aí entra o desenho.

**Visual:** a folha do P11 com um quadrado no lugar do herói e um retângulo no lugar da porta.

### Tela 4

> Na próxima ideia da sua filha, peça primeiro a versão “quadrado”. Se o pulo já é gostoso assim, o desenho entra numa base firme.

**Visual:** menina fictícia, de perfil, desenhando a heroína ao lado do quadrado; uma seta entre os dois.

**Produção:** prototipar com formas simples (em inglês, *blockout* ou *greybox*) é prática documentada de design de jogos (Fullerton, *Game Design Workshop*). Não dizer que o Estúdio tem um modo protótipo. Liga-se ao P11 (começar longe do dragão) e ao P22 (piso baixo) sem repetir a Vila do Dragão. Não repete o “guarde a primeira versão” do P49, da mesma semana. Sequência com uma filha: manter menina nas cenas.

<a id="st09"></a>

## ST09 · Na primeira fase de um bom jogo, o primeiro buraco é raso de propósito

**Versão anterior:** “A primeira fase de um bom jogo dá aula sem ninguém perceber”

**Apoio:** [P02](01-p01-a-p10.md#p02), [P35](09-p31-a-p40.md#p35), [P46](10-p41-a-p50.md#p46). **Demonstração:** nenhuma; ilustração de uma fase com o primeiro perigo raso.

**Fechamento:** Primeiro passo de coisa nova: pequeno, num lugar onde cair não dói.

### Tela 1

> Na primeira fase de um bom jogo, o primeiro buraco é raso de propósito.

**Visual:** ilustração de uma fase com um buraco raso logo no começo, vista de lado.

### Tela 2

> O primeiro perigo fica onde cair não faz estrago. Quem erra tenta de novo na hora e aprende o pulo antes do buraco de verdade.

**Figurinha:** teste · “Na primeira fase, o primeiro inimigo costuma ser…” · “Rápido e forte” / “Lento e fácil de ver” / “Escondido” · certa: “Lento e fácil de ver”.

**Visual:** o primeiro inimigo ilustrado, lento e bem à vista, em close.

### Tela 3

> Lento e fácil de ver, porque a primeira fase ensina. Em casa vale igual: a bicicleta começa na grama, e a primeira receita é um sanduíche.

**Visual:** bicicleta infantil sobre a grama, sem criança identificável.

### Tela 4

> Na próxima coisa nova, monte com ele a primeira fase: um passo pequeno, onde cair não dói. O perigo de verdade fica para a fase dois.

**Visual:** a ilustração da fase inteira, com “fase 1” e “fase 2” marcadas. Texto aplicado na edição.

**Produção:** fases que ensinam sem texto são prática documentada de design de jogos; o exemplo mais citado é a primeira fase de um clássico de plataforma, desenhada como tutorial, em que o primeiro inimigo se aproxima devagar (fonte: verbete “World 1-1”). Não citar a marca na copy. O teste confere essa prática, explicada na tela 2. Liga-se ao P46 (o primeiro minuto num programa novo) e ao P35 (a fase que conta a história). Saíram o strike do boliche (P10) e a dica de combinar em partidas (P02).

<a id="st10"></a>

## ST10 · Uma lista de vinte tarefas parece uma montanha, e por isso muito jogo mostra só uma

**Versão anterior:** “Muito jogo mostra uma missão por vez, de propósito”

**Apoio:** [P06](01-p01-a-p10.md#p06), [P53](11-p51-a-p60.md#p53), [P28](03-p21-a-p30.md#p28). **Demonstração:** nenhuma; uma folha dobrada em sanfona.

**Fechamento:** Uma missão à vista por vez, e é ele quem desdobra a próxima.

### Tela 1

> Uma lista de vinte tarefas parece uma montanha, e por isso muito jogo mostra só uma.

**Visual:** canto de tela de jogo ilustrado com uma única missão curta.

### Tela 2

> Uma missão só parece um passo. Por isso, quem faz o jogo mostra a próxima e guarda as outras para depois.

**Figurinha:** enquete · “Como fica a lista de tarefas dele?” · “Inteira à vista” / “Uma por vez”.

**Visual:** uma lista comprida enrolada ao lado de um único bilhete.

### Tela 3

> Vale para a lição de casa também. Escreva as tarefas numa folha, dobre em sanfona e deixe à vista só a primeira.

**Visual:** folha dobrada em sanfona sobre a mesa, com só a primeira tarefa à vista. Texto aplicado na edição.

### Tela 4

> A folha fica com ele: terminou uma, ele desdobra a próxima, e você sai do papel de quem entrega tarefa. Depois, conte para a gente como foi.

**Figurinha:** caixinha de perguntas · “Como foi a folha dobrada aí?”

**Visual:** mãos de uma criança fictícia desdobrando a segunda parte da folha, sem rosto; nenhum adulto no quadro. Texto aplicado na edição.

**Produção:** mostrar um objetivo por vez é escolha comum de design; jogos com diário de missões mostram várias, por isso “muito jogo”. Aprofunda o P06 (trocar “vai estudar” por uma missão) com a ideia seguinte: esconder o resto da lista. Revisão 4: a folha dobrada fica com a criança, que desdobra a próxima missão sozinha; o adulto sai do meio e não precisa ficar entregando tarefa.

<a id="st11"></a>

## ST11 · “Sou ruim nisso” costuma ser sobre uma parte só

**Versão anterior:** “‘Sou ruim nisso’ costuma ser sobre uma parte só”

**Apoio:** [P54](11-p51-a-p60.md#p54), [P08](01-p01-a-p10.md#p08), [P55](11-p51-a-p60.md#p55). **Demonstração:** Defesa da Torre Profissional (Jogo 3D Avançado).

**Fechamento:** “Travei nesta parte” é um problema do tamanho certo para resolver.

### Tela 1

> Quando ele diz “sou ruim nisso”, muitas vezes o “isso” é uma parte pequena de uma coisa grande.

**Visual:** cena encenada: criança fictícia afasta o caderno; adulto fictício ao lado, sem bronca.

### Tela 2

> Se você já ouviu essa frase, conte na enquete. Da próxima vez, divida a tarefa e pergunte em que parte ele travou: ler, fazer ou conferir.

**Figurinha:** enquete · “Já ouviu ‘sou ruim nisso’ aí em casa?” · “Já ouvi” / “Ainda não”.

**Visual:** o caderno com três etiquetas: ler, fazer, conferir. Texto aplicado na edição.

### Tela 3

> Programador faz igual. Na nossa Defesa da Torre Profissional, a torre espera, mira, atira e recarrega. Se falha, a busca começa por uma dessas quatro partes.

**Visual:** Defesa da Torre Profissional vista de cima: as três torres girando para mirar nos invasores que avançam contra o cristal; legenda editorial com os quatro passos.

### Tela 4

> Por isso, troque “sou ruim nisso” por “travei nesta parte”. Dito assim, o problema fica do tamanho certo para resolver.

**Visual:** as duas frases lado a lado, com a primeira riscada.

**Produção:** D08 é hipótese; registrar o resultado da enquete na pesquisa de dores. Os quatro estados (parado, mirar, atirar, recarregar) são da Defesa da Torre Profissional, no Jogo 3D Avançado (`game-3d-advanced/examples.ts`, linhas 7 a 21). A Defesa da Torre básica, do Jogo 3D, tem uma torre só, que gira sem parar, e não serve para esta tela. Semana 11 depois da troca P40 ↔ P54: o Apoio traz o P54.

<a id="st12"></a>

## ST12 · Quarenta minutos escolhendo a cor do slide, e nenhuma frase escrita

**Versão anterior:** “Quarenta minutos escolhendo a cor do slide, e nenhuma frase escrita”

**Apoio:** [P13](02-p11-a-p20.md#p13), [P50](10-p41-a-p50.md#p50), [P29](03-p21-a-p30.md#p29). **Demonstração:** Fazenda Feliz Profissional (Jogo 2D Avançado).

**Fechamento:** Comece pela parte de que as outras dependem.

### Tela 1

> Quarenta minutos depois, a apresentação tem fundo roxo, letra bonita e nenhuma frase sobre o assunto.

**Visual:** slide caprichado e vazio; folha do pedido da escola ao lado, sem dados reais.

### Tela 2

> Começar pela cor é começar pela parte mais gostosa, só que ela depende do resto. Nos jogos também: algumas coisas só funcionam depois de outras.

**Visual:** paleta de cores aberta sobre um slide sem texto.

### Tela 3

> Na nossa fazenda do Estúdio, a semente só entra no canteiro arado, e só cresce o que foi regado. Qual é a ordem?

**Figurinha:** teste · “Qual ordem faz a fazenda funcionar?” · “Semente, enxada, regador” / “Enxada, semente, regador” / “Regador, semente, enxada” · certa: “Enxada, semente, regador”.

**Visual:** Fazenda Feliz Profissional: troca de ferramenta com a tecla Q, canteiro arado, semente plantada, e o regador escolhido (“Ferramenta: regador” no canto) com o canteiro escurecendo ao ser regado.

### Tela 4

> Enxada, semente, regador. Na apresentação, vale a mesma ordem: primeiro três linhas no papel sobre o que precisa ser explicado, e só no fim a cor.

**Visual:** a resposta certa do teste ao lado de uma folha com três linhas escritas. Texto aplicado na edição.

**Produção:** D13 é hipótese; a cena entra como situação reconhecível. Regras conferidas em `game-2d-advanced/__gen_fazendaFelizProfissional.ts`: arar, plantar e regar, e só cresce o que foi regado depois de dormir. A ferramenta não é desenhada na mão do fazendeiro: só aparece o texto “Ferramenta: …”, e o canteiro regado escurece. A Fazenda Feliz Profissional aparece também no P24 (semana 3) e no P56 (semana 17), com outros momentos do jogo; a MC03 também a usa e não deve sair nesta semana.

<a id="st13"></a>

## ST13 · Muitos estúdios de jogos anotam o lugar exato em que as pessoas desistem

**Versão anterior:** “Muitos estúdios de jogos anotam o lugar exato em que as pessoas desistem”

**Apoio:** [P36](09-p31-a-p40.md#p36), [P19](02-p11-a-p20.md#p19), [P52](11-p51-a-p60.md#p52). **Demonstração:** nenhuma; mapa editorial de uma fase com pontos vermelhos.

**Fechamento:** Se ela quer parar sempre no mesmo ponto, quem precisa de ajuste é aquele ponto.

### Tela 1

> Muitos estúdios de jogos anotam o lugar exato em que as pessoas desistem, porque esse lugar diz mais do que qualquer elogio.

**Visual:** mapa editorial de uma fase com pontos vermelhos concentrados num trecho.

### Tela 2

> Quando muita gente larga na mesma fase, a conclusão costuma ser sobre a fase, e não sobre quem jogou. Então quem fez o jogo mexe nela.

**Figurinha:** enquete · “Quando ela quer parar, costuma ser…” · “No mesmo ponto” / “Cada vez num lugar”.

**Visual:** o mesmo mapa, com o trecho vermelho redesenhado.

### Tela 3

> Em casa dá para fazer o mesmo mapa. Quando sua filha disser “quero parar”, anote a tarefa, a parte e a hora.

**Visual:** nota do celular com anotações fictícias, uma por linha.

### Tela 4

> Depois de algumas anotações, veja se é sempre o mesmo ponto. Se for, troque “por que você desiste?” por “o que tem de difícil aqui?”.

**Visual:** adulto fictício e menina fictícia, de costas, olhando juntos a nota do celular.

**Produção:** registrar onde os jogadores caem e desistem (funis de progressão, mapas de calor) é prática de estúdios: GameAnalytics (funis por fase) e os testes do Halo 3 na Microsoft, que levaram a mudar uma área com mortes repetidas (ABC/Wired, 2007). Não citar marca na copy. Sem diagnóstico. A tela 4 diz o que fazer com as anotações e não promete padrão em número fixo de registros. A enquete alimenta a dor D19. Sequência com uma filha: manter menina nas cenas.

<a id="st14"></a>

## ST14 · Um dos códigos de trapaça mais famosos dos videogames nasceu para testar o jogo

**Versão anterior:** “Um dos códigos de trapaça mais famosos dos videogames nasceu para testar o jogo”

**Apoio:** [P09](01-p01-a-p10.md#p09), [P42](10-p41-a-p50.md#p42), [P30](03-p21-a-p30.md#p30). **Demonstração:** nenhuma; ilustração de controle antigo genérico, sem marca.

**Fechamento:** Criar um jogo inclui criar jeitos de testar mais rápido.

### Tela 1

> Um dos códigos de trapaça mais famosos dos videogames foi criado pelo próprio programador do jogo, e ele tinha um bom motivo.

**Visual:** controle de videogame antigo genérico, sem marca, com setas e dois botões.

### Tela 2

> O jogo era difícil demais, até para quem estava programando. Por que ele esconderia uma trapaça ali dentro?

**Figurinha:** teste · “Por que ele criou a trapaça?” · “Para ajudar os fãs” / “Para testar o jogo” / “Por brincadeira” · certa: “Para testar o jogo”.

**Visual:** ilustração de um jogo de nave antigo, genérico, sem marca.

### Tela 3

> Para testar: a sequência de botões dava todos os poderes, e ele chegava ao fim depressa. Só que o código ficou no jogo, e os jogadores descobriram.

**Visual:** a sequência de setas e botões desenhada como um código, sem marca nem nome de jogo.

### Tela 4

> Testar faz parte de criar, e muito criador inventa atalhos para isso. Pergunte a ele: “que trapaça você esconderia no seu jogo para testar?”.

**Figurinha:** caixinha de perguntas · “Qual trapaça ele inventou?”

**Visual:** bilhete escrito à mão, “minha trapaça secreta”, com o espaço em branco. Texto aplicado na edição.

**Produção:** história de Kazuhisa Hashimoto, que criou o código em 1986, ao adaptar um jogo de nave para o console doméstico, porque achava o jogo difícil demais nos testes; o código dava o conjunto completo de poderes (Wikipedia, verbete “Konami Code”; ESPN). As fontes divergem sobre o motivo de o código ter ficado (a ESPN diz que esqueceram de tirar; a Wikipedia, que a equipe notou e decidiu manter), por isso a tela diz só que “o código ficou no jogo”. Não citar marca na copy (regra 5 da vitrine). Liga-se ao P30 (estragar de propósito) e ao P42 (combinar o que é pronto, que se confere testando).

<a id="st15"></a>

## ST15 · Programadores têm uma regra para dois no mesmo computador

**Versão anterior:** “Programadores têm uma regra para dois no mesmo computador”

**Apoio:** [P25](03-p21-a-p30.md#p25), [P10](01-p01-a-p10.md#p10), [P58](11-p51-a-p60.md#p58). **Demonstração:** nenhuma; cena encenada de mãos.

**Fechamento:** Na ajuda, você navega e o mouse fica com ele.

### Tela 1

> Ele pediu sua ajuda e, dois minutos depois, o mouse já está na sua mão.

**Visual:** mão adulta no mouse; criança fictícia encostada na cadeira, só olhando.

### Tela 2

> Programadores têm regra para isso. Na programação em par, um pilota no teclado e no mouse, e o outro navega: olha, aponta e pergunta.

**Figurinha:** enquete · “Quando ele chama, o mouse fica com quem?” · “Comigo” / “Com ele”.

**Visual:** a mesma cena invertida: mão da criança no mouse, adulto fictício apontando a tela.

### Tela 3

> A regra existe porque a mão que mexe é a que aprende o caminho. Quando o mais experiente pilota o tempo todo, o outro só assiste.

**Visual:** close das duas mãos: a da criança no mouse e a do adulto fictício apontando, sem tocar.

### Tela 4

> Na próxima ajuda, seja o navegador: aponte, pergunte “e se você tentar ali?” e deixe o mouse com ele. Se precisar mostrar, mostre uma vez e devolva.

**Visual:** bilhete ao lado do teclado: “navegador aponta e pergunta”. Texto aplicado na edição.

**Produção:** a programação em par, com os papéis de piloto e navegador, vem da Programação Extrema (Martin Fowler, “On Pair Programming”, Böckeler e Siessegger, 15/01/2020). “A mão que mexe é a que aprende” é opinião da equipe, com apoio no *strong-style pairing* descrito na mesma fonte. O P58 põe o pai como quem testa; aqui ele é quem navega, e as duas ideias se completam sem repetir. Saiu o Duelo de Heróis, que já está no P51.

<a id="st16"></a>

## ST16 · Durante a criação, muito jogo tem uma fase que nenhum jogador vai ver

**Versão anterior:** “Durante a criação, muito jogo tem uma fase que nenhum jogador vai ver”

**Apoio:** [P18](02-p11-a-p20.md#p18), [P43](10-p41-a-p50.md#p43), [P45](10-p41-a-p50.md#p45). **Demonstração:** as duas versões do Balão do P45, se a captura existir.

**Fechamento:** O “e se” exagerado vai para a sala de testes, e o jogo de verdade fica inteiro.

### Tela 1

> Durante a criação, muito jogo tem uma fase que nenhum jogador vai ver. É lá que os criadores fazem os testes mais malucos.

**Visual:** ilustração de uma sala de testes vazia, com blocos soltos e um personagem flutuando.

### Tela 2

> É a sala de testes. Lá cabe o “e se” mais exagerado, como pulo gigante ou gravidade zero, e a fase de verdade continua inteira.

**Figurinha:** enquete de até 4 opções do Instagram · “Numa sala secreta, ele testaria…” · “Pulo gigante” / “Velocidade” / “Gravidade zero” / “Inimigo lento”.

**Visual:** personagem ilustrado num pulo gigante, saindo pelo alto da tela.

### Tela 3

> O balão com força 2, do post desta semana, nasceu assim: numa cópia. O jogo original ficou como estava.

**Visual:** os dois balões lado a lado, marcados “original” e “cópia de teste”. Texto aplicado na edição.

### Tela 4

> Pergunte a ele o que testaria numa sala secreta do próprio jogo. A resposta mostra o “e se” favorito dele.

**Figurinha:** caixinha de perguntas · “Qual foi o ‘e se’ dele?”

**Visual:** fundo limpo com a pergunta e um ponto de interrogação desenhado à mão.

**Produção:** fases de teste existem na criação de muitos jogos; há catálogos de salas de teste esquecidas em jogos lançados (The Cutting Room Floor). Não citar marca na copy. A tela 3 vale se a produção do P45 fizer a variante com força 2 numa cópia, como a ficha do P45 manda; se não fizer, reescrever a tela 3 sem afirmar isso. A enquete é de preferência, sem resposta certa. Se a conta só oferecer enquete de duas opções, usar “Pulo gigante” / “Gravidade zero”.

<a id="st17"></a>

## ST17 · Quando um erro manda ele de volta para a primeira página, a vontade vai junto

**Versão anterior:** “Nos jogos, o lugar para onde você volta depois de cair foi escolhido a dedo”

**Apoio:** [P39](09-p31-a-p40.md#p39), [P21](03-p21-a-p30.md#p21), [P56](11-p51-a-p60.md#p56). **Demonstração:** nenhuma; ilustração de fase com uma bandeirinha de volta antes de um trecho difícil.

**Fechamento:** O ponto de volta fica logo antes da parte difícil.

### Tela 1

> Quando um erro manda ele de volta para a primeira página, a vontade costuma ir junto. Os jogos resolvem isso com um truque.

**Visual:** caderno com várias páginas preenchidas e uma mão voltando para a primeira, sem rosto.

### Tela 2

> O truque é o checkpoint, o ponto de volta. Onde ele fica decide se a queda dá vontade de tentar de novo ou de largar.

**Figurinha:** teste · “Onde os criadores põem o ponto de volta?” · “No começo da fase” / “Antes da parte difícil” / “Depois da parte difícil” · certa: “Antes da parte difícil”.

**Visual:** ilustração de fase com três bandeirinhas possíveis, numeradas.

### Tela 3

> Logo antes da parte difícil. Assim, cair custa poucos segundos e a parte difícil continua difícil. Ponto de volta longe demais transforma cada erro em castigo.

**Visual:** a bandeirinha certa destacada, com o trecho de espinhos logo depois.

### Tela 4

> Combinem pontos de volta: no computador, cada parte pronta vira um arquivo novo, e quem erra depois volta até ali. No caderno, a foto serve para comparar.

**Visual:** pasta do computador com “dinossauros-parte1” e “dinossauros-parte2”, nomes fictícios, sem dados pessoais. Texto aplicado na edição.

**Produção:** posicionar o checkpoint antes do trecho difícil é prática comum de design de fases; o teste confere essa prática, explicada na tela 3. Não afirmar que um exemplo do Estúdio tem checkpoint sem conferir: no Parkour do Vulcão, cair volta ao menu e zera as gemas. Aqui “checkpoint” é ponto de volta, diferente dos anéis da Corrida do Pôr do Sol (P40). A tela 1 abre pela casa e não repete o P39 (o preço do erro); a sequência dá nome à ideia sem repetir o trampolim nem o bilhete do P56. Revisão 4: a foto do caderno não devolve a versão anterior, por isso o ponto de volta vale para o trabalho no computador (arquivo novo a cada parte) e a foto só serve para comparar o que mudou.

<a id="st18"></a>

## ST18 · Copiar faz parte. Dizer de onde copiou também.

**Versão anterior:** “Copiar faz parte. Dizer de onde copiou também.”

**Apoio:** [P15](02-p11-a-p20.md#p15), [P48](10-p41-a-p50.md#p48), [P27](03-p21-a-p30.md#p27). **Demonstração:** nenhuma; créditos editoriais com nomes fictícios.

**Fechamento:** Copiar e dizer de onde veio é o jeito honesto de aprender com os outros.

### Tela 1

> Programador copia o tempo todo, como contamos nesta semana. Só que existe uma regra de boa educação que pouca gente explica: dizer de onde copiou.

**Visual:** folha de modelo impressa com um desenho novo feito por cima, mãos de uma menina fictícia.

### Tela 2

> Tem até nome: dar crédito. Muito código aberto pode ser copiado à vontade, desde que o aviso com o nome de quem fez vá junto.

**Figurinha:** enquete · “Ela costuma dizer de onde tirou a ideia?” · “Costuma” / “Ainda não”.

**Visual:** trecho de arquivo ilustrado com a linha “feito por…” destacada, nome fictício. Texto aplicado na edição.

### Tela 3

> E os créditos no fim de um jogo grande, com centenas de nomes, são o mesmo gesto em tamanho maior: mostrar quem ajudou a fazer.

**Visual:** créditos subindo numa tela escura, com nomes inventados. Texto aplicado na edição.

### Tela 4

> Quando sua filha usar um modelo, peça uma linha no canto: “baseado em…”. Copiar e dizer de onde veio é o jeito honesto de aprender.

**Visual:** folha de trabalho com “baseado em…” escrito à mão no canto, e a menina fictícia de perfil. Texto aplicado na edição.

**Produção:** a licença MIT libera o uso e exige que o aviso de autoria e de permissão vá junto nas cópias (opensource.org/license/mit); o aviso pode ficar num arquivo à parte. A tela 2 diz isso sem afirmar que o nome precisa estar “no arquivo”. Sem acusar cópia escolar. D15 segue hipótese; a enquete alimenta a pesquisa. Saiu o Cenário do meu desenho, que é o exemplo do P15. Sequência com uma filha: manter menina nas cenas.

<a id="st19"></a>

## ST19 · Tem jogo que ele larga em uma semana e jogo que joga o ano inteiro

**Versão anterior:** “Um bom chefão fica mais difícil na hora certa”

**Apoio:** [P26](03-p21-a-p30.md#p26), [P59](11-p51-a-p60.md#p59), [P23](03-p21-a-p30.md#p23). **Demonstração:** O Chefão das Sombras (Jogo 3D Avançado).

**Fechamento:** Desafio bom cresce na hora certa, nem antes, nem depois.

### Tela 1

> Tem jogo que ele larga em uma semana e jogo que joga o ano inteiro. A diferença costuma estar na hora em que tudo fica mais difícil.

**Visual:** criança fictícia no sofá deixando de lado um controle, com outro jogo aberto na tela ao fundo, desfocado.

### Tela 2

> No Chefão das Sombras, da nossa equipe, a luta tem três fases. A cada fase, ele fica mais bravo e recupera um pouco de vida.

**Visual:** O Chefão das Sombras na passagem da fase 1 para a 2, com a cura e o anel de tiros crescendo.

### Tela 3

> O tamanho de cada degrau de dificuldade é uma decisão de quem cria. Se fosse você, o que mudaria na terceira fase?

**Figurinha:** enquete · “Para deixar a fase 3 mais difícil…” · “Curar mais” / “Ficar mais bravo”.

**Visual:** três degraus editoriais, um por fase, com o terceiro em destaque.

### Tela 4

> Peça para ele contar qual chefão foi o mais difícil e o que mudava no fim. Ele vai explicar uma curva de dificuldade sem saber o nome.

**Figurinha:** caixinha de perguntas · “Qual chefão ele escolheu?”

**Visual:** criança fictícia gesticulando, explicando para um adulto fictício sentado ao lado.

**Produção:** regras conferidas em `game-3d-advanced/__gen_chefao.ts`: três fases, cura de 8 ao entrar nas fases 2 e 3, e anel de tiros que passa de 6 para 8 e depois 10. A tela 1 abre pela casa e liga o assunto ao P59 (a curva de dificuldade), que foi para esta semana. A enquete é de preferência, sem resposta certa.

<a id="st20"></a>

## ST20 · Todo jogo pronto deixa um monte de ideias de fora

**Versão anterior:** “Todo jogo pronto deixa um monte de ideias de fora”

**Apoio:** [P57](11-p51-a-p60.md#p57), [P47](10-p41-a-p50.md#p47), [P60](11-p51-a-p60.md#p60). **Demonstração:** nenhuma; caderno ou nota do celular.

**Fechamento:** O próximo jogo começa numa lista.

### Tela 1

> Todo jogo pronto deixa um monte de ideias de fora, e os criadores não jogam nenhuma fora.

**Visual:** caderno com várias ideias marcadas “fica para depois”. Texto aplicado na edição.

### Tela 2

> Elas vão para uma lista que equipes de programação chamam de backlog: tudo o que ainda pode entrar. O próximo jogo começa por ali.

**Figurinha:** enquete · “Ele já falou do próximo jogo?” · “Já falou” / “Ainda não”.

**Visual:** nota do celular com o título “próximo jogo”, sem conteúdo de aluno real. Texto aplicado na edição.

### Tela 3

> No post desta semana, o André contou que já quer fazer um jogo maior. E jogo maior começa numa lista: no caderno, no celular ou na geladeira.

**Visual:** caderno aberto com o título “próximo jogo” e linhas vazias. Texto aplicado na edição.

### Tela 4

> Hoje, abram juntos a lista do próximo jogo e escrevam a primeira ideia. Se ele travar, pergunte o que ficou de fora do último.

**Figurinha:** caixinha de perguntas · “Qual foi a primeira ideia da lista?”

**Visual:** porta de geladeira com um bilhete “próximo jogo: 1.” escrito à mão. Texto aplicado na edição.

**Produção:** backlog é o *Product Backlog* do Scrum, explicado na própria frase. A tela 3 retoma o P60 em paráfrase, sem repetir a fala literal do André, que já é a capa do P60 na mesma semana; ele aparece como aluno. “Não jogam nenhuma fora” é brincadeira com a palavra, não dado. Fecha o ciclo de 20 semanas apontando para o próximo jogo.
