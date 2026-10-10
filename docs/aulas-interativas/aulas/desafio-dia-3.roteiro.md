# Roteiro de gravação · A Chave do Farol · Dia 3

**Vozes e produção · 10/10/2026:** **Professora** conduz; **Debinha (avatar)** participa em 8 entradas marcadas para gravação e edição. A sequência do curso é Debinha no Dia 1, Dedé no Dia 2, Debinha no Dia 3 e Dedé no certificado. As falas da criança também são gravadas. **Zappy na página (não gravar)** identifica as instruções da plataforma; ele não tem voz nos vídeos, mesmo quando aparece no meme ou na interface. As notas **Na tela** não são locução.

**Edição:** o avatar entra, fala e sai antes da resposta e do próximo gesto da professora. Não cobrir controles, blocos, mostradores ou resultados nem sobrepor vozes. Esta versão está preparada no roteiro; gravação, edição e publicação ainda não foram confirmadas. As durações são referências para ensaio, incluindo as novas falas; conferir a montagem final sem acelerar. [Entradas e direção dos avatares](../AVATARES-NOS-VIDEOS.md#chave-do-farol).

Oito seções: experiência com a porta, resposta sem chave, resposta com chave, escolha das imagens (com o par do farol), avisos, experiência de posição, posição da chave e publicação. Manter o projeto enviado no Dia 2 e o mesmo Estúdio em todas as montagens e personalizações. A experiência de posição é separada e não modifica o projeto. A verificação intermediária não pede envio; a seção decisao recebe a entrega única do dia. Ajustar as durações no ensaio, sem acelerar encaixes, percursos ou a espera do barco. Não atribuir à pessoa a arte ou a animação preparada.

Toda fala é uma conversa contínua com quem está fazendo a aula: as frases se ligam umas às outras ("por isso", "mas", "ou seja", "agora que"), cada resultado vem junto do porquê e a fala chama a atenção para o que aparece na tela ("Olha aqui", "Olha só", "Repare", "Tá vendo?"). Neste curso, "então" não serve de palavra de ligação: é o nome de um espaço do bloco Se. O que é opcional é oferecido como escolha, sem dizer o que a pessoa não precisa fazer, e o que já vem pronto só entra na fala quando ajuda a ação (Diretrizes, seção 6, revisão de 06/10/2026).

## Seção 1. O que a porta precisa?

### Vídeo `video-d3-condicao` · Quando a porta pode abrir?

**Duração alvo:** 60 a 75 segundos.

**Na tela:** mostrar a cena da porta com o mostrador `temChave`. Clicar em **Testar a porta** sem a chave e, no "Tá vendo?", deixar ver `temChave` em falso e a resposta senão marcada. Manter esse estado até a pergunta da Debinha, sem levar a chave ainda. **Meme na comparação:** na frase da porta de casa, a porta do farol trancada quando o personagem chega sem a chave e aberta quando ele chega com a chave. Desenho nosso no formato de meme, com o Zappy ou os personagens do jogo; sem foto de pessoa real nem meme da internet. Fica 2 a 3 segundos na tela, sem cobrir a experiência; a narração explica sozinha.

**Professora:**

> "O seu jogo já guarda se o personagem pegou a chave. Agora, esta é uma experiência para a gente entender como funciona uma condição.
>
> Antes de abrir, a porta confere se temChave é verdadeiro. Uma pergunta assim se chama condição. É como a porta da sua casa: ela só abre se você tiver a chave.
>
> Olha aqui: sem levar a chave, eu clico em Testar a porta. Tá vendo? temChave está falso, por isso a porta escolhe a resposta senão e avisa que falta a chave."

**Na tela:** **F3P1-D01** · Debinha entra depois do teste sem chave. Manter falso e senão destacados; não mudar a chave antes da pergunta.

**Debinha (avatar):**

> "E se eu trouxer a chave agora?"

**Na tela:** Debinha sai. Levar a chave e testar de novo no ritmo da resposta. Mostrar verdadeiro e então destacados; depois passar a vez.

**Professora:**

> "Vamos ver. Agora eu clico em Levar a chave e em Testar a porta de novo. Olha só: agora temChave está verdadeiro, e por isso a porta escolhe a resposta então, que acende o farol!
>
> Ou seja: a pergunta é sempre a mesma, mas a resposta muda conforme o valor de temChave.
>
> Agora é a sua vez: faça esses mesmos testes na experiência. Quando terminar, clique em Próxima parte."

**Ponte do Zappy na página (não gravar):** Sua vez! Teste a mesma porta sem a chave e com a chave e repare na resposta que fica marcada. Quando terminar, clique em Próxima parte.

**Conferência de produção:** o vídeo é uma demonstração: o narrador faz cada gesto na primeira pessoa, no ritmo da fala, mostra o resultado real e explica o porquê. Ele não dá ordens antes da vez da pessoa; só no fim passa a vez, e a pessoa repete os testes na experiência, que cobra as metas. A comparação do dia a dia é curta e ligada ao jogo. Sem palpite nem pergunta final.

## Seção 2. Avise quando faltar a chave

### Vídeo `video-d3-sem-chave` · Avise quando faltar a chave

**Duração alvo:** 3 a 4 minutos, incluindo encaixes, teste e verificação.

**Na tela:** retomar o projeto da pessoa. Começar pela retomada, antes de qualquer bloco e nesta ordem: primeiro o problema (levar o personagem até o farol e, no "Tá vendo?", mostrar que nada acontece), depois a lembrança e o anúncio. Em cada encaixe, primeiro deixar o destino à vista; só então abrir a categoria e pegar o bloco. Mostrar o encontro com a chave já montado e o espaço abaixo dele, na área **Quando acontecer**; se for preciso, arrastar um espaço vazio entre os blocos. Abrir **Jogo 2D → Colisões → Encostar e bloquear**, pegar **Quando o sprite começar a encostar no sprite**, soltar abaixo do encontro com a chave e configurar `personagem` e `farol`.

**Professora:**

> "Aqui no seu jogo, leve o personagem até o farol. Tá vendo? Nada acontece, porque o farol não confere nada.
>
> Lembra da experiência da parte anterior? A porta conferia temChave antes de abrir. Agora a gente vai ensinar o farol a fazer o mesmo, começando pelo aviso de que falta a chave!
>
> Chegar ao farol também é um encontro, e os encontros ficam na área Quando acontecer. Encontre lá o encontro com a chave, do Dia 2, e deixe à vista o espaço logo abaixo dele. Se não estiver aparecendo, é só arrastar um espaço vazio entre os blocos até ele aparecer.
>
> Agora abra Jogo 2D, depois Colisões e depois Encostar e bloquear, e pegue o bloco Quando o sprite começar a encostar no sprite.
>
> Arraste e solte abaixo do encontro com a chave, ainda na área Quando acontecer. Não coloque um encontro dentro do outro.
>
> No primeiro nome, escolha personagem e, no segundo, escolha farol."

**Na tela:** com o espaço vazio do novo evento à vista, abrir **Programação → Lógica & Se** e soltar **Se** dentro dele. A pergunta `x > 0` do **Se** é um bloco de verdade: arrastá-la para a lixeira do espaço dos blocos e deixar à vista o lugar vazio ao lado de **Se**. Só então abrir **Programação → Valores**, pegar **valor da variável**, soltar nesse lugar e escolher `temChave`. Conferir antes da gravação onde fica a lixeira.

**Professora:**

> "Dentro desse encontro, o farol vai fazer a mesma pergunta da porta. Por isso, deixe à vista o espaço vazio dentro do encontro com o farol.
>
> Agora abra Programação e depois Lógica e Se, pegue o bloco Se e solte dentro do encontro com o farol.
>
> Repare que o Se vem com uma pergunta pronta: x maior que 0. Mas não é isso que o farol precisa perguntar, por isso arraste essa pergunta para a lixeira do espaço dos blocos. O lugar ao lado de Se fica vazio, e é ali que vai a pergunta certa. Deixe esse lugar à vista.
>
> Abra Programação e depois Valores, e pegue o bloco valor da variável.
>
> Arraste e solte no lugar vazio ao lado de Se e escolha temChave.
>
> Pronto: agora, quando o personagem encostar no farol, o jogo confere se temChave é verdadeiro."

**Na tela:** **F3P2-D01** · Debinha entra depois da condição montada. Manter Se com temChave visível; não clicar nos sinais de mais durante a pergunta.

**Debinha (avatar):**

> "E onde eu escrevo que falta a chave?"

**Na tela:** Debinha sai. Apontar a linha logo abaixo do bloco **Se**, com **+ senão se** e **+ senão**, e clicar no **+** de **senão**. Com o espaço do **senão** à vista, abrir **Programação → Variáveis**, pegar **Alterar variável para**, soltar em **senão** e escolher `aviso`. Em **Programação → Valores**, pegar **texto**, soltar sobre o número, apagar `Olá` e escrever `A porta não abriu. Falta a chave.`.

**Professora:**

> "Esse aviso vai no espaço do senão. Olha aqui, na linha de baixo do bloco Se, depois de então. Aparecem duas opções com um sinal de mais: senão se e senão.
>
> Clique no sinal de mais ao lado de senão. Não clique no mais de senão se.
>
> O espaço do senão guarda a resposta para quando temChave é falso, ou seja, para quando o personagem chega sem a chave. É dentro dele que vai o aviso, por isso deixe o espaço do senão à vista.
>
> Abra Programação e depois Variáveis, e pegue o bloco Alterar variável para.
>
> Arraste e solte dentro de senão e escolha aviso.
>
> Agora a gente troca o número desse bloco pela mensagem. Abra Programação e depois Valores, pegue o bloco texto e solte em cima do número. Depois, apague Olá e escreva: A porta não abriu. Falta a chave.
>
> O espaço do então fica vazio por enquanto, porque é nele que vai a resposta para quem chega com a chave."

**Na tela:** clicar em **Atualizar**, na barra logo acima do jogo; em barra estreita, o botão aparece só como ⟳. Levar o personagem ao farol sem passar pela chave e mostrar a mensagem que aparece de verdade. Não programar o espaço do **então** neste vídeo.

**Professora:**

> "Agora vamos testar! Clique em Atualizar, logo acima do jogo, para começar uma partida nova.
>
> Vá ao farol sem passar pela chave. Repare: a luz continua apagada, e o aviso diz que falta a chave. É a resposta senão funcionando!
>
> Se algo não funcionou no seu jogo, volte aos blocos e confira se ficou assim: dentro de Quando acontecer está o encontro entre personagem e farol, dentro dele está o Se com temChave, e dentro de senão está o aviso de que falta a chave. Depois de corrigir, teste de novo."

**Na tela:** clicar em **Verificar esta parte** e mostrar o resultado real da verificação intermediária. Esperar **Salvo** e apontar **Próxima parte**. O envio não faz parte desta seção.

**Professora:**

> "Funcionou? Clique em Verificar esta parte. Se faltar alguma coisa, corrija os blocos e clique novamente.
>
> Quando aparecer Objetivo cumprido!, espere aparecer Salvo e clique em Próxima parte."

**Ponte do Zappy na página (não gravar):** Agora ensine o farol a avisar quando falta a chave! Monte o aviso, vá ao farol sem pegar a chave e clique em Verificar esta parte antes de seguir.

**Conferência de produção:** a seção exige o vídeo e a aprovação da verificação intermediária, sem envio. O envio único do dia acontece na seção seguinte.

## Seção 3. Acenda o farol com a chave

### Vídeo `video-d3-decisao` · Acenda o farol com a chave

**Duração alvo:** 4 a 5 minutos, incluindo encaixes, os três testes e o envio. Não acelerar os percursos nem a espera do barco.

**Na tela:** manter o mesmo Estúdio e o mesmo **Se**. Começar pela retomada, antes de qualquer bloco: clicar em **Atualizar**, pegar a chave e ir ao farol. No "Tá vendo?", mostrar que a luz não acende. Manter esse estado para a reação da Debinha; ainda não montar a resposta.

**Professora:**

> "No seu jogo, clique em Atualizar, pegue a chave e vá ao farol. Tá vendo? A luz não acende."

**Na tela:** **F3P3-D01** · Debinha entra após a visita com a chave e antes da montagem da resposta. O farol ainda apagado é o estado real desta etapa.

**Debinha (avatar):**

> "Mas eu trouxe a chave!"

**Na tela:** Debinha sai. Mostrar o espaço do então vazio ao explicar. Manter a retomada. Depois deixar à vista o aviso em **senão** e o espaço do **então**, ainda vazio; só então abrir **Programação → Variáveis**, pegar **Alterar variável para**, soltar em **então** e escolher `ganhou`. Em **Programação → Lógica & Se**, pegar o bloco **verdadeiro**, soltar sobre o número e manter **verdadeiro**. Não recarregar a retomada preparada nem duplicar o evento do farol.

**Professora:**

> "É que o espaço do então está vazio.
>
> Lembra da experiência da primeira parte desta fase? Com temChave verdadeiro, a porta acendia o farol. Agora a gente vai pôr essa resposta no então!
>
> Continue no mesmo Se do encontro com o farol e deixe à vista o espaço do então.
>
> Abra Programação e depois Variáveis, e pegue o bloco Alterar variável para.
>
> Arraste e solte dentro de então e escolha ganhou. É essa variável que chama o barco: quando ganhou fica verdadeiro, o barco começa a chegar.
>
> Por isso, troque o número desse bloco por verdadeiro. Abra Programação e depois Lógica e Se, pegue o bloco verdadeiro, solte em cima do número e deixe em verdadeiro."

**Na tela:** com o bloco de `ganhou` à vista dentro de **então**, abrir **Jogo 2D → Sprites → Criar e trocar aparência**, pegar **Trocar imagem do sprite para**, soltar logo abaixo dele e escolher `farol` e `farol-listrado-aceso`. Depois, com a troca de imagem à vista, abrir **Programação → Variáveis**, pegar outro **Alterar variável para**, soltar abaixo dela e escolher `aviso`. Em **Programação → Valores**, pegar **texto**, soltar sobre o número, apagar `Olá` e escrever o aviso de chegada.

**Professora:**

> "Agora vamos acender a luz. Para isso, o farol precisa trocar de imagem, do apagado para o aceso. O próximo bloco vai logo abaixo de ganhou, ainda dentro de então, por isso deixe esse lugar à vista.
>
> Abra Jogo 2D, depois Sprites e depois Criar e trocar aparência, e pegue o bloco Trocar imagem do sprite para.
>
> Arraste e solte logo abaixo do bloco de ganhou.
>
> Escolha o sprite farol e a imagem farol listrado aceso.
>
> Por último, falta avisar quem está jogando. O aviso vai logo abaixo da troca de imagem, ainda dentro de então. Deixe esse lugar à vista.
>
> Abra Programação e depois Variáveis, e pegue outro bloco Alterar variável para.
>
> Arraste e solte logo abaixo da troca de imagem e escolha aviso.
>
> Agora troque o número desse bloco pela mensagem. Abra Programação e depois Valores, pegue o bloco texto e solte em cima do número. Depois, apague Olá e escreva: Você acendeu o farol! Olhe o barco chegando."

**Na tela:** clicar em **Atualizar**. Visitar o farol sem a chave; afastar-se, buscar a chave e voltar ao farol na mesma partida. Esperar a luz e o barco. Esperar a entrada da Debinha antes de reiniciar depois da vitória. Mostrar esses estados reais, sem edição que simule o funcionamento.

**Professora:**

> "Agora vamos testar o jogo inteiro! Clique em Atualizar e vá ao farol sem passar pela chave. A luz tem que continuar apagada, e o aviso tem que dizer que falta a chave.
>
> Agora, sem recomeçar a partida, busque a chave e volte ao farol. Olha só: a luz acende, o aviso muda, e o barco vem chegando! Espere o barco chegar."

**Na tela:** **F3P3-D02** · Esperar de verdade o barco chegar. Só então Debinha entra; manter o farol aceso e o barco à vista, sem encurtar a animação.

**Debinha (avatar):**

> "E se eu quiser jogar de novo?"

**Na tela:** Debinha sai. Clicar em Atualizar, mostrar a chave de volta e testar novamente sem ela. Manter a conferência e o envio depois dos testes.

**Professora:**

> "Clique em Atualizar de novo. Repare que a chave volta para o chão, porque começou uma partida nova. Vá direto ao farol, sem pegar a chave, e o farol tem que avisar outra vez que falta a chave."

**Na tela:** apontar, um trecho de cada vez, os espaços do **então** e do **senão**, a declaração de `temChave` em **Ao iniciar** e a mudança dele no encontro com a chave. A lista vem uma vez só, depois dos testes.

**Professora:**

> "Se algo não funcionou no seu jogo, volte aos blocos e confira se ficou assim: dentro de então estão ganhou verdadeiro, a imagem farol listrado aceso e o aviso de chegada, e dentro de senão está o aviso de que falta a chave. Confira também se temChave começa em falso, em Ao iniciar, e se muda para verdadeiro no encontro com a chave.
>
> Depois de corrigir, repita os testes."

**Na tela:** clicar em **Verificar esta parte**, mostrar eventuais pendências reais e corrigir. Depois de **Objetivo cumprido!**, esperar **Salvo**, clicar em **Enviar meu projeto**, confirmar em **Enviar** e aguardar. Apontar **Próxima parte**. Manter o mesmo projeto para publicar.

**Professora:**

> "Funcionou? Clique em Verificar esta parte. Se faltar alguma coisa, corrija os blocos e clique novamente.
>
> Quando aparecer Objetivo cumprido!, espere aparecer Salvo. Depois, clique em Enviar meu projeto e confirme em Enviar.
>
> Quando o envio terminar, clique em Próxima parte."

**Ponte do Zappy na página (não gravar):** Agora acenda o farol! Complete o espaço do então e teste sem a chave, com a chave e numa nova partida. Depois clique em Verificar esta parte e envie o seu projeto.

**Conferência de produção:** a verificação é cumulativa e confere as regras dos dias anteriores. A seção exige o vídeo, a aprovação e o envio confirmado. A verificação não exige copiar literalmente as frases dos avisos.

## Seção 4. Deixe o jogo com a sua cara

### Vídeo `video-d3-personalizar` · Deixe o jogo com a sua cara

**Duração alvo:** 3 a 4 minutos, incluindo as escolhas, o teste e a verificação.

**Na tela:** Antes de gravar, preparar duas versões completas do jogo em duas cópias do projeto, com o farol aceso e o barco chegando: **robo**, **lancha**, **chave-prateada**, o par **farol-colorido** e **ilha-nevada**; e **mergulhador**, **veleiro**, **chave-dourada**, o par **farol-de-madeira** e **costa-rochosa** (nenhuma das duas é a combinação que o vídeo monta depois). No "olha quantas versões essa aventura pode ter", mostrar as duas rodando, alguns segundos cada, antes de abrir as opções. Depois, no "Olha aqui", abrir o Mapa da Aventura na primeira página da surpresa e passar pelas galerias de personagens, cenários, barcos, chaves e faróis, por alguns segundos. Manter a galeria aberta até a fala da Debinha.

**Professora:**

> "Sua missão deu certo! E a surpresa chegou: olha quantas versões essa aventura pode ter: outro personagem, outro cenário, outro barco… Que combinação você vai criar?
>
> Olha aqui: estas são todas as opções que você pode usar. Estão no seu Mapa da Aventura, com o mesmo nome da lista de imagens. E o que você escolher fica no jogo."

**Na tela:** **F3P4-D01** · Debinha entra depois das duas versões e da galeria do Mapa, com o pirata visível entre as opções. Manter as outras escolhas disponíveis, sem tratar o exemplo como obrigação.

**Debinha (avatar):**

> "Quero fazer uma aventura de pirata!"

**Na tela:** Debinha sai. Voltar ao Estúdio, no projeto enviado. Deixar à vista **Ao iniciar** e **Criar sprite personagem**; no campo **com imagem**, abrir a lista em **aventureiro** e escolher **pirata**. Apontar o nome do sprite, que continua personagem, e os campos de posição e tamanho, sem editá-los. Escolher **barco-pirata** em **Criar sprite barco** e **chave-de-estrela** em **Criar sprite chave**. Aguardar a atualização a cada escolha. Não listar as opções antigas de compatibilidade como parte do catálogo novo.

**Professora:**

> "Vamos começar pelo personagem. Em Ao iniciar, deixe à vista o bloco Criar sprite personagem. No fim dele, depois de com imagem, clique em aventureiro para abrir a lista. Olha aqui: eu vou escolher pirata.
>
> Repare que o nome do sprite continua personagem, porque é esse nome que os blocos de movimento e de encontro usam. Por isso, troque só a imagem e deixe o x, o y, a largura e a altura como estão.
>
> Ainda em Ao iniciar, faça o mesmo no Criar sprite barco e no Criar sprite chave. Eu vou escolher barco pirata e chave de estrela."

**Na tela:** ainda em **Ao iniciar**, deixar à vista **Criar sprite farol** e trocar **farol-listrado-apagado** por **farol-de-pedra-apagado**. Em **Quando acontecer**, deixar à vista o encontro personagem/farol, o **Se temChave** e, dentro de **então**, **Trocar imagem do sprite farol para**; escolher **farol-de-pedra-aceso**. Apontar os dois nomes, um de cada vez.

**Professora:**

> "O farol tem duas imagens, porque ele começa apagado e acende quando a chave chega. Por isso a gente escolhe o par. No Criar sprite farol, clique em farol listrado apagado. Eu vou escolher farol de pedra apagado.
>
> Agora encontre Quando acontecer e o encontro do personagem com o farol. Dentro do então do Se está Trocar imagem do sprite farol para. Clique no nome da imagem e escolha o mesmo modelo, aceso: farol de pedra aceso. Repare: de pedra nos dois lugares, apagado no começo e aceso na resposta com chave."

**Na tela:** em **Enquanto estiver rodando**, deixar à vista **A cada quadro do jogo** e **Desenhar o cenário praia-tropical**. Abrir a lista no nome do cenário e escolher **noite-na-ilha**. Mostrar o cenário completo, com ponte, terra e mar nas mesmas posições.

**Professora:**

> "Falta o lugar onde a história acontece. Em Enquanto estiver rodando, dentro de A cada quadro do jogo, clique em praia tropical, no bloco Desenhar o cenário. Olha só: eu vou usar noite na ilha. A ponte e o mar continuam no mesmo lugar."

**Na tela:** clicar em **Atualizar**. Ir ao farol sem a chave; afastar-se, buscar a chave e voltar na mesma partida. Esperar a luz do farol de pedra e a chegada do barco pirata.

**Professora:**

> "Agora teste a sua combinação! Clique em Atualizar e vá ao farol sem a chave: ele continua apagado. Depois busque a chave e volte na mesma partida. Olha só: o farol de pedra acende, e o barco pirata vem chegando! Agora a aventura tem a sua cara, e é com essa cara que o seu jogo vai para o Mural."

**Na tela:** apontar, uma vez só e depois do teste, cada imagem no bloco do mesmo tipo e os dois blocos do farol. Clicar em **Verificar esta parte**; depois de **Objetivo cumprido!**, esperar **Salvo** e apontar **Próxima parte**.

**Professora:**

> "Se algo não funcionou no seu jogo, volte aos blocos e confira se ficou assim: cada imagem está no bloco do mesmo tipo, personagem com personagem, barco com barco, chave com chave e cenário com cenário, e o farol tem o mesmo modelo nos dois blocos, apagado em Ao iniciar e aceso dentro de então.
>
> Depois clique em Verificar esta parte. Quando aparecer Objetivo cumprido!, espere aparecer Salvo e clique em Próxima parte."

**Ponte do Zappy na página (não gravar):** A surpresa chegou! Que combinação você vai criar? Escolha seu personagem, barco, chave, farol e cenário. Teste a combinação, clique em Verificar esta parte e depois em Próxima parte.

**Conferência de produção:** é a revelação da surpresa plantada no vídeo de abertura do Dia 1 e lembrada no fim do Dia 2 (decisão do responsável, 07/10/2026): a fala comemora a missão, diz que a surpresa chegou, mostra duas versões completas do jogo e só então as galerias do Mapa (decisão do responsável, 07/10/2026: cada curso revela o que tem de próprio; no Farol, o quanto a aventura inteira pode mudar). Não chamar de surpresa nenhuma outra coisa do curso. Uma ideia só, trocar imagens pelas do mesmo tipo (decisão da dona, 06/10/2026: o par do farol veio da antiga seção de farol e avisos para cá). O catálogo tem oito personagens, quatro cenários, quatro barcos, três chaves e quatro pares de faróis. Os sprites mantêm os nomes personagem, barco, chave e farol; cada categoria compartilha dimensões e área de contato, e os faróis conservam a porta no mesmo lugar, então não instruir a compensar tamanho ou posição. A conclusão exige o vídeo e a verificação, que confere só que a imagem dentro de então é um farol aceso, de qualquer modelo ou a antiga farol-aceso: nenhuma escolha estética vira critério. Novas imagens são acrescentadas ao projeto salvo sem apagar imagens antigas nem substituir blocos da criança. Caso a gravação use um projeto anterior, o nome da imagem original pode ser personagem, barco, chave, cenario, farol-apagado ou farol-aceso; selecionar a opção nova pelo mesmo campo.

## Seção 5. Escreva seus avisos

### Vídeo `video-d3-farol-mensagens` · Escreva seus avisos

**Duração alvo:** 90 a 120 segundos, incluindo a escrita e o teste.

**Na tela:** mostrar **Criar variável aviso** em **Ao iniciar** e editar apenas o texto inicial. Em **Quando acontecer**, editar o texto do aviso da coleta e os textos em **senão** e **então** do farol. Exemplos curtos: início `Ache a chave da ilha!`; coleta `Chave na mão! Siga até o farol.`; sem chave `Opa! Busque a chave primeiro.`; vitória `Luz acesa! Lá vem o barco!`. Não editar temChave nem ganhou.

**Professora:**

> "Agora o jogo vai conversar com quem joga usando as suas palavras. São quatro avisos, e você muda só o texto de cada um.
>
> O primeiro fica em Ao iniciar, no bloco que cria a variável aviso. Clique no texto Encontre a chave e vá ao farol e escreva uma frase curta que diga o que fazer. Eu vou escrever: Ache a chave da ilha!
>
> Os outros três ficam em Quando acontecer. No encontro com a chave, o aviso conta que a chave foi encontrada. No encontro com o farol, o aviso de senão diz que falta a chave, e o de então comemora a luz acesa e o barco. Clique em cada texto e escreva do seu jeito, mas deixe os nomes das variáveis como estão."

**Na tela:** clicar em **Atualizar**, ler o aviso inicial, ir ao farol sem a chave, buscar a chave e voltar na mesma partida, lendo cada aviso. Depois do teste, esperar **Salvo** e apontar **Próxima parte**.

**Professora:**

> "Agora teste! Clique em Atualizar e leia o aviso do começo. Vá ao farol sem a chave e leia o aviso de senão. Depois busque a chave, leia o aviso da coleta e volte ao farol para ver a comemoração.
>
> Se uma frase não apareceu ou passou da tela, volte ao bloco daquele aviso e deixe a frase mais curta. Quando terminar, espere aparecer Salvo e clique em Próxima parte."

**Ponte do Zappy na página (não gravar):** Agora escreva os avisos do seu jeito! Mude o texto dos quatro avisos, teste o jogo e clique em Próxima parte.

**Conferência de produção:** uma ideia só, os avisos (decisão da dona, 06/10/2026: a troca do farol passou para a seção anterior e esta ficou curta, para a publicação chegar mais cedo). A chave da seção continua `farol-mensagens`, para preservar os identificadores no Admin. Nenhuma frase específica vira critério. A seção conclui pelo vídeo e mantém o projeto já enviado.

## Seção 6. Como escolher um lugar para a chave

### Vídeo `video-d3-posicao` · Como escolher um lugar para a chave

**Duração alvo:** 70 a 90 segundos.

**Na tela:** abrir a cena **lighthouse-position** com x 211 e y 53. Apontar a chave e os controles **Posição horizontal x** e **Posição vertical y**. Mudar apenas x para 160, deixando y 53 à vista. Manter y em 53 até a pergunta da Debinha. Fazer cada mudança no momento da fala e deixar o lugar anterior visível para comparar. A experiência não muda o projeto da criança.

**Professora:**

> "Esta é uma experiência para a gente entender como escolher o lugar da chave. Dois números guardam esse lugar: x e y.
>
> Olha aqui: em Posição horizontal x, o número está em 211. Eu vou trocar só ele por 160. Repare que a chave foi para o lado, sem subir nem descer. O x escolhe o lugar na horizontal: um número menor leva para a esquerda, e um maior leva para a direita."

**Na tela:** **F3P6-D01** · Debinha entra depois da mudança só no x. Manter x 160 e y 53 à vista; não mudar y antes da pergunta.

**Debinha (avatar):**

> "E para subir ou descer?"

**Na tela:** Debinha sai. Manter x em 160 e só agora demonstrar y 250. Mostrar que muda o lugar, mantendo o mesmo desenho e tamanho; depois passar a vez.

**Professora:**

> "A gente muda o y. Agora eu deixo o x em 160 e vou mudar só Posição vertical y. Ele está em 53, e eu vou colocar 250. Olha só: a chave desceu. O y escolhe o lugar na vertical: um número maior leva para baixo, e um menor leva para cima.
>
> A chave continua com o mesmo desenho e do mesmo tamanho. Só o lugar mudou.
>
> Agora é a sua vez: mude primeiro o x e observe. Depois, sem mexer no x, mude o y e compare. Se quiser repetir, clique em Recomeçar. Quando terminar, clique em Próxima parte."

**Ponte do Zappy na página (não gravar):** Sua vez! Mude o x e observe a chave. Depois mude o y, sem mexer no x, e compare. Quando terminar, clique em Próxima parte.

**Conferência de produção:** o narrador demonstra antes de passar a vez. A seção exige vídeo e as metas mover-horizontal e mover-vertical; só assistir não conclui a experiência. As metas conferem as duas mudanças, sem obrigar os valores da demonstração. Sem palpite obrigatório nem pergunta final. É um fechamento com experiência de conceito antes da aplicação livre no mesmo projeto.

## Seção 7. Escolha onde fica a chave

### Vídeo `video-d3-posicionar-chave` · Escolha onde fica a chave

**Duração alvo:** 2 a 3 minutos, incluindo o percurso e o reinício.

**Na tela:** retomar o mesmo projeto, mantendo as escolhas anteriores. Mostrar a chave no lugar atual e deixar à vista **Ao iniciar → Criar sprite chave**. Apontar somente os campos x e y. Mostrar no mapa as três sugestões: perto da trilha x 211/y 53; na parte de baixo x 160/y 250; perto da ponte x 280/y 160. Manter o projeto sem alterações durante a pergunta da Debinha.

**Professora:**

> "Lembra da experiência da parte anterior? O x mudava o lugar para os lados, e o y mudava para cima e para baixo. Agora você pode escolher onde fica a chave do seu jogo!
>
> Encontre Ao iniciar e deixe à vista Criar sprite chave. Olha aqui: esse bloco também tem os campos x e y. São eles que escolhem onde a chave aparece quando a partida começa.
>
> No Mapa da Aventura há três lugares para experimentar: perto da trilha, com x 211 e y 53; na parte de baixo, com x 160 e y 250; ou perto da ponte, com x 280 e y 160."

**Na tela:** **F3P7-D01** · Debinha entra com as três sugestões do Mapa visíveis. A pergunta abre a liberdade de escolha, sem adicionar uma posição obrigatória.

**Debinha (avatar):**

> "Eu tenho que escolher um desses três lugares?"

**Na tela:** Debinha sai. Responder antes de alterar x e y. Demonstrar x 160/y 250 como exemplo da parte de baixo, mantendo nome, largura, altura e imagem. Depois conferir alcance, visibilidade, percurso e reinício e aguardar Salvo como no roteiro.

**Professora:**

> "Você pode escolher um deles ou experimentar outro. Eu vou colocar na parte de baixo. No campo x do bloco, troque o número por 160; no campo y, coloque 250. Depois clique fora do campo e espere o jogo atualizar. Deixe o nome chave, a largura, a altura e a imagem como estão.
>
> Olha só: agora quem joga precisa buscar a chave em outro lugar! Confira se a chave aparece inteira, se está visível e se o personagem consegue chegar até ela. Ela precisa ficar separada do personagem no começo e da porta do farol. Se ficar escondida por outro desenho ou difícil de alcançar, escolha um dos lugares do mapa.
>
> Agora teste o novo caminho. Clique em Atualizar e vá ao farol sem passar pela chave. Ele deve avisar que falta a chave. Afaste-se, busque a chave no lugar escolhido e volte ao farol na mesma partida. A luz deve acender, e o barco deve chegar.
>
> Clique em Atualizar mais uma vez: a chave deve voltar ao lugar que você escolheu. Quando terminar, espere aparecer Salvo e clique em Próxima parte."

**Ponte do Zappy na página (não gravar):** Agora escolha onde fica a chave! Mude o x e o y no bloco Criar sprite chave e teste o caminho até ela e até o farol. Depois clique em Próxima parte.

**Conferência de produção:** as sugestões vêm de FAROL_POSICOES_CHAVE. Conferir os três lugares nos quatro cenários antes de gravar. A posição não vira critério numérico; a pessoa testa legibilidade, alcance e percurso. Não alterar dimensões para compensar a posição. A seção conclui pelo vídeo, sem segundo envio obrigatório.

## Seção 8. Publique seu jogo

### Vídeo `video-d3-fecho` · Publique seu jogo

**Duração alvo:** 60 a 80 segundos, incluindo a publicação, a comemoração e a cópia do link.

**Na tela:** manter o mesmo Estúdio da seção anterior, com o projeto já enviado ao professor. Apontar e abrir **Compartilhar**, no alto do Estúdio; na aula, o botão costuma aparecer só como ícone (uma setinha para cima saindo de uma bandeja), e a janela se chama **Compartilhar no Mural dos Criadores**. Mostrar o **Resumo do projeto** preenchido, sem editar; na aula, o título vem do curso e não aparece na janela. Clicar em **Gerar capa**, esperar a imagem e conferir. Não demonstrar upload nem outra capa.

**Professora:**

> "Agora chegou a hora de publicar o seu jogo, para a sua família e os seus amigos jogarem!
>
> Para isso, clique em Compartilhar, no alto do Estúdio. Aqui, ele pode aparecer só como uma setinha para cima. Repare que o resumo do projeto já vem preenchido, por isso pode deixar como está.
>
> Depois, clique em Gerar capa e espere a imagem aparecer. Olha só: essa é a capa que vai apresentar o seu jogo!"

**Na tela:** conferir a capa, clicar em **Publicar** e esperar a comemoração visual do Zappy com **Seu jogo está no Mural!**, sem voz do mascote no vídeo. Manter Copiar link de jogar à vista e esperar a reação da Debinha antes de copiar.

**Professora:**

> "Confira se a capa ficou boa e clique em Publicar. Agora é só esperar um pouquinho…
>
> Seu jogo está no Mural! Que conquista! Agora você, a sua família e os seus amigos podem jogar o jogo que você criou."

**Na tela:** **F3P8-D01** · Debinha entra depois da confirmação da publicação, antes de copiar o link. Zappy aparece somente na comemoração visual da interface, sem voz no vídeo.

**Debinha (avatar):**

> "Quero mandar o jogo para os meus amigos!"

**Na tela:** Debinha sai. Copiar o link durante a resposta, mostrar Link copiado!, fechar e apontar Concluir fase. Não acrescentar despedida depois da saída.

**Professora:**

> "Para isso, clique em Copiar link de jogar e mande esse link para eles. Quem receber pode jogar direto, até no celular. Se precisar, peça ajuda a um adulto para mandar.
>
> Depois de copiar o link, clique em Fechar e, por fim, em Concluir fase."

**Ponte do Zappy na página (não gravar):** Hora de mostrar o seu jogo! Publique no Mural, copie o link de jogar e mande para a sua família e os seus amigos. Se precisar, peça ajuda a um adulto. Depois clique em Fechar e em Concluir fase.

Ajuda escrita junto ao vídeo, fora da narração: [Como publicar seu jogo no Mural](/como-fazer/plataforma-publicar-no-mural). O tutorial abre na mesma aba e oferece retorno à aula.

**Conferência de produção:** o envio anterior libera **Compartilhar**. A configuração de publicação fica somente no projeto do Dia 3. Publicar é a tarefa ensinada; o critério técnico desta seção continua sendo o vídeo. Não transformar expiração do acesso ao Mural ou indisponibilidade momentânea em bloqueio de conclusão da aula. Outras capas e solução de problemas ficam no Como fazer. Copiar o link de jogar faz parte da comemoração e aparece no vídeo: o link é público e não mostra o nome da criança, e a fala sugere mandar para a família e os amigos, com ajuda de um adulto se precisar.
