# Roteiro de gravação · A Chave do Farol · Dia 3

Cinco seções: experiência com a porta, resposta sem chave, resposta com chave, a seção de mexa e veja (Deixe o jogo com a sua cara) e publicação. Manter o projeto enviado no Dia 2 e o mesmo Estúdio nas quatro últimas seções. A verificação intermediária não pede envio; a seção decisao recebe a entrega única do dia. Ajustar as durações no ensaio, sem acelerar encaixes, percursos ou a espera do barco. Não atribuir à pessoa a arte ou a animação preparada. Só a narração é falada.

Toda fala é uma conversa contínua com quem está fazendo a aula: as frases se ligam umas às outras ("por isso", "mas", "ou seja", "agora que"), cada resultado vem junto do porquê e a fala chama a atenção para o que aparece na tela ("Olha aqui", "Olha só", "Repare", "Tá vendo?"). Neste dia, "então" não serve de palavra de ligação: é o nome de uma parte do bloco Se. O que é opcional é oferecido como escolha, sem dizer o que a pessoa não precisa fazer, e o que já vem pronto só entra na fala quando ajuda a ação (Diretrizes, seção 6, revisão de 06/10/2026).

## Seção 1. O que a porta precisa?

### Vídeo `video-d3-condicao` · Quando a porta pode abrir?

**Duração alvo:** 60 a 75 segundos.

**Na tela:** mostrar a cena da porta com o mostrador `temChave`. Clicar em **Testar a porta** sem a chave e, no "Tá vendo?", deixar ver `temChave` em falso e a resposta senão marcada. Clicar em **Levar a chave** e em **Testar a porta**, deixando ver a resposta então marcada. No fim, apontar a experiência para a pessoa repetir. **Meme na comparação:** na frase da porta de casa, a porta do farol trancada quando o personagem chega sem a chave e aberta quando ele chega com a chave. Desenho nosso no formato de meme, com o Zappy ou os personagens do jogo; sem foto de pessoa real nem meme da internet. Fica 2 a 3 segundos na tela, sem cobrir a experiência; a narração explica sozinha.

**Narração:**
> "O seu jogo já guarda se o personagem pegou a chave. Agora, esta é uma experiência para a gente entender como funciona uma condição, que é a pergunta que a porta faz antes de abrir.
>
> Antes de abrir, a porta confere se temChave é verdadeiro, e uma pergunta assim se chama condição. É como a porta da sua casa: ela só abre se você tiver a chave.
>
> Olha aqui: sem levar a chave, eu clico em Testar a porta. Tá vendo? temChave está falso, por isso a porta escolhe a resposta senão e avisa que falta a chave.
>
> Agora eu clico em Levar a chave e em Testar a porta de novo. Olha só: agora temChave está verdadeiro, e por isso a porta escolhe a resposta então, que acende o farol!
>
> Ou seja: a pergunta é sempre a mesma, mas a resposta muda conforme o valor de temChave.
>
> Agora é a sua vez: faça esses mesmos testes na experiência. Quando terminar, clique em Próxima seção."

**Ponte do Zappy na página (não gravar):** Sua vez! Teste a mesma porta sem a chave e com a chave e repare na resposta que fica marcada.

**Conferência de produção:** o vídeo é uma demonstração: o narrador faz cada gesto na primeira pessoa, no ritmo da fala, mostra o resultado real e explica o porquê. Ele não dá ordens antes da vez da pessoa; só no fim passa a vez, e a pessoa repete os testes na experiência, que cobra as metas. A comparação do dia a dia é curta e ligada ao jogo. Sem palpite nem pergunta final.

## Seção 2. Avise quando faltar a chave

### Vídeo `video-d3-sem-chave` · Avise quando faltar a chave

**Duração alvo:** 3 a 4 minutos, incluindo encaixes, teste e verificação.

**Na tela:** retomar o projeto da pessoa. Começar pela retomada, antes de qualquer bloco: levar o personagem até o farol e, no "Tá vendo?", mostrar que nada acontece. Em cada encaixe, primeiro deixar o destino à vista; só então abrir a categoria e pegar o bloco. Mostrar o encontro com a chave já montado e o espaço abaixo dele, na área **Quando acontecer**; se for preciso, arrastar um espaço vazio entre os blocos. Abrir **Jogo 2D → Colisões → Encostar e bloquear**, pegar **Quando o sprite começar a encostar no sprite**, soltar abaixo do encontro com a chave e configurar `personagem` e `farol`.

**Narração:**
> "Lembra da experiência da seção anterior? A porta conferia temChave antes de abrir. Agora a gente vai ensinar o farol do seu jogo a fazer o mesmo!
>
> Primeiro, leve o personagem até o farol. Tá vendo? Não acontece nada, porque o farol ainda não confere nada.
>
> A gente vai começar pela resposta para quando o personagem chega sem a chave: o farol vai avisar que falta a chave.
>
> Chegar ao farol também é um encontro, e os encontros ficam na área Quando acontecer. Encontre lá o encontro com a chave, do Dia 2, e deixe à vista o espaço logo abaixo dele. Se não estiver aparecendo, é só arrastar um espaço vazio entre os blocos até ele aparecer.
>
> Agora abra Jogo 2D, depois Colisões e depois Encostar e bloquear, e pegue o bloco Quando o sprite começar a encostar no sprite.
>
> Arraste e solte abaixo do encontro com a chave, ainda na área Quando acontecer. Não coloque um encontro dentro do outro.
>
> No primeiro nome, escolha personagem e, no segundo, escolha farol."

**Na tela:** com o espaço vazio do novo evento à vista, abrir **Programação → Lógica & Se** e soltar **Se** dentro dele. A pergunta `x > 0` do **Se** é um bloco de verdade: arrastá-la para a lixeira do espaço dos blocos e deixar à vista o lugar vazio ao lado de **Se**. Só então abrir **Programação → Valores**, pegar **valor da variável**, soltar nesse lugar e escolher `temChave`. Conferir antes da gravação onde fica a lixeira.

**Narração:**
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

**Na tela:** apontar a linha logo abaixo do bloco **Se**, com **+ senão se** e **+ senão**, e clicar no **+** de **senão**. Com a parte **senão** à vista, abrir **Programação → Variáveis**, pegar **Alterar variável para**, soltar em **senão** e escolher `aviso`. Em **Programação → Valores**, pegar **texto**, soltar sobre o número, apagar `Olá` e escrever `A porta não abriu. Falta a chave.`.

**Narração:**
> "Agora falta a resposta para quando o personagem chega sem a chave. Olha aqui, na parte de baixo do bloco Se, depois de então. Aparecem duas opções com um sinal de mais: senão se e senão.
>
> Clique no sinal de mais ao lado de senão. Não clique no mais de senão se.
>
> A parte senão guarda a resposta para quando temChave é falso, ou seja, para quando o personagem chega sem a chave. É dentro dela que vai o aviso, por isso deixe a parte senão à vista.
>
> Abra Programação e depois Variáveis, e pegue o bloco Alterar variável para.
>
> Arraste e solte dentro de senão e escolha aviso.
>
> Agora a gente troca o número desse bloco pela mensagem. Abra Programação e depois Valores, pegue o bloco texto e solte em cima do número. Depois, apague Olá e escreva: A porta não abriu. Falta a chave.
>
> A parte então fica vazia por enquanto, porque ela é a resposta para quem chega com a chave.
>
> Confira se ficou assim: dentro do encontro com o farol está o Se com temChave, e dentro de senão está o aviso de que falta a chave."

**Na tela:** clicar em **Atualizar**, na barra logo acima do jogo; em barra estreita, o botão aparece só como ⟳. Levar o personagem ao farol sem passar pela chave e mostrar a mensagem que aparece de verdade. Não programar a parte **então** neste vídeo.

**Narração:**
> "Agora vamos testar! Clique em Atualizar, logo acima do jogo, para começar uma partida nova.
>
> Vá ao farol sem passar pela chave. Repare: a luz continua apagada, e o aviso diz que falta a chave. É a resposta senão funcionando!
>
> Se o aviso não apareceu, confira se o encontro tem personagem e farol, se o Se pergunta temChave e se o aviso está dentro de senão. Depois de corrigir, teste de novo."

**Na tela:** clicar em **Verificar esta etapa** e mostrar o resultado real da verificação intermediária. Esperar **Salvo** e apontar **Próxima seção**. O envio não faz parte desta seção.

**Narração:**
> "Funcionou? Clique em Verificar esta etapa. Se faltar alguma coisa, corrija os blocos e clique novamente.
>
> Quando aparecer Objetivo da etapa cumprido!, espere aparecer Salvo e clique em Próxima seção."

**Ponte do Zappy na página (não gravar):** Agora ensine o farol a avisar quando falta a chave! Monte o aviso, vá ao farol sem pegar a chave e clique em Verificar esta etapa antes de seguir.

**Conferência de produção:** a seção exige o vídeo e a aprovação da verificação intermediária, sem envio. O envio único do dia acontece na seção seguinte.

## Seção 3. Acenda o farol com a chave

### Vídeo `video-d3-decisao` · Acenda o farol com a chave

**Duração alvo:** 4 a 5 minutos, incluindo encaixes, os três testes e o envio. Não acelerar os percursos nem a espera do barco.

**Na tela:** manter o mesmo Estúdio e o mesmo **Se**. Começar pela retomada, antes de qualquer bloco: clicar em **Atualizar**, pegar a chave, ir ao farol e, no "Tá vendo?", mostrar que a luz não acende. Depois deixar à vista o aviso em **senão** e a parte **então**, ainda vazia; só então abrir **Programação → Variáveis**, pegar **Alterar variável para**, soltar em **então** e escolher `ganhou`. Em **Programação → Lógica & Se**, pegar o bloco **verdadeiro**, soltar sobre o número e manter **verdadeiro**. Não recarregar a retomada preparada nem duplicar o evento do farol.

**Narração:**
> "Lembra da experiência da primeira seção desta aula? Quando temChave era verdadeiro, a porta escolhia a resposta então e acendia o farol. Agora a gente vai programar essa resposta no seu jogo!
>
> Primeiro, clique em Atualizar, pegue a chave e vá ao farol. Tá vendo? A luz não acende, porque a parte então ainda está vazia, sem nenhuma ação.
>
> A gente vai continuar no mesmo Se do encontro com o farol. Deixe à vista a parte então, porque é nela que vão as ações para quando o personagem chega com a chave.
>
> Abra Programação e depois Variáveis, e pegue o bloco Alterar variável para.
>
> Arraste e solte dentro de então e escolha ganhou. É essa variável que chama o barco: quando ganhou fica verdadeiro, o barco começa a chegar.
>
> Por isso, troque o número desse bloco por verdadeiro. Abra Programação e depois Lógica e Se, pegue o bloco verdadeiro, solte em cima do número e deixe em verdadeiro."

**Na tela:** com o bloco de `ganhou` à vista dentro de **então**, abrir **Jogo 2D → Sprites → Criar e trocar aparência**, pegar **Trocar imagem do sprite para**, soltar logo abaixo dele e escolher `farol` e `farol-aceso`. Depois, com a troca de imagem à vista, abrir **Programação → Variáveis**, pegar outro **Alterar variável para**, soltar abaixo dela e escolher `aviso`. Em **Programação → Valores**, pegar **texto**, soltar sobre o número, apagar `Olá` e escrever o aviso de chegada.

**Narração:**
> "Agora vamos acender a luz. Para isso, o farol precisa trocar de imagem, do apagado para o aceso. O próximo bloco vai logo abaixo de ganhou, ainda dentro de então, por isso deixe esse lugar à vista.
>
> Abra Jogo 2D, depois Sprites e depois Criar e trocar aparência, e pegue o bloco Trocar imagem do sprite para.
>
> Arraste e solte logo abaixo do bloco de ganhou.
>
> Escolha o sprite farol e a imagem farol-aceso.
>
> Por último, falta avisar quem está jogando. O aviso vai logo abaixo da troca de imagem, ainda dentro de então. Deixe esse lugar à vista.
>
> Abra Programação e depois Variáveis, e pegue outro bloco Alterar variável para.
>
> Arraste e solte logo abaixo da troca de imagem e escolha aviso.
>
> Agora troque o número desse bloco pela mensagem. Abra Programação e depois Valores, pegue o bloco texto e solte em cima do número. Depois, apague Olá e escreva: Você acendeu o farol! Olhe o barco chegando.
>
> Confira se ficou assim: dentro de então estão ganhou verdadeiro, a imagem farol-aceso e o aviso de chegada. E dentro de senão continua o aviso de que falta a chave."

**Na tela:** clicar em **Atualizar**. Visitar o farol sem a chave; afastar-se, buscar a chave e voltar ao farol na mesma partida. Esperar a luz e o barco. Clicar em **Atualizar** depois da vitória e ir ao farol sem a chave. Mostrar esses estados reais, sem edição que simule o funcionamento.

**Narração:**
> "Agora vamos testar a aventura inteira! Clique em Atualizar e vá ao farol sem passar pela chave. A luz tem que continuar apagada, e o aviso tem que dizer que falta a chave.
>
> Agora, sem recomeçar a partida, busque a chave e volte ao farol. Olha só: a luz acende, o aviso muda, e o barco vem chegando! Espere o barco chegar.
>
> Depois, clique em Atualizar de novo. Repare que a chave volta para o chão, porque começou uma partida nova. Vá direto ao farol, sem pegar a chave, e o farol tem que avisar outra vez que falta a chave."

**Na tela:** apontar, um trecho de cada vez, a declaração de `temChave` em **Ao iniciar**, sua mudança na coleta e sua consulta no farol. As correções correspondem aos casos que os três testes distinguem.

**Narração:**
> "Se a luz acendeu sem a chave, confira se temChave começa em falso e se a troca de imagem está dentro de então.
>
> Se a luz não acendeu com a chave, confira se o encontro com a chave muda temChave para verdadeiro e se a imagem é farol-aceso.
>
> E, se a luz acendeu mas o barco não veio, confira se ganhou está verdadeiro dentro de então.
>
> Depois de corrigir, repita os testes."

**Na tela:** clicar em **Verificar esta etapa**, mostrar eventuais pendências reais e corrigir. Depois de **Objetivo da etapa cumprido!**, esperar **Salvo**, clicar em **Enviar para o professor**, confirmar em **Enviar** e aguardar. Apontar **Próxima seção**. Manter o mesmo projeto para publicar.

**Narração:**
> "Funcionou? Clique em Verificar esta etapa. Se faltar alguma coisa, corrija os blocos e clique novamente.
>
> Quando aparecer Objetivo da etapa cumprido!, espere aparecer Salvo. Depois, clique em Enviar para o professor e confirme em Enviar.
>
> Quando o envio terminar, clique em Próxima seção."

**Ponte do Zappy na página (não gravar):** Agora acenda o farol! Complete a parte então e teste sem a chave, com a chave e numa nova partida. Depois clique em Verificar esta etapa e envie para o professor.

**Conferência de produção:** a verificação é cumulativa e confere as regras dos dias anteriores. A seção exige o vídeo, a aprovação e o envio confirmado. A verificação não exige copiar literalmente as frases dos avisos.

## Seção 4. Deixe o jogo com a sua cara

### Vídeo `video-d3-personalizar` · Deixe o jogo com a sua cara

**Duração alvo:** 100 a 130 segundos.

**Na tela:** no mesmo Estúdio, com o projeto já enviado. Trazer à vista a área **Ao iniciar**, arrastando um espaço vazio entre os blocos se for preciso, e o bloco **Criar sprite personagem**. No fim dele, depois de **com imagem**, clicar no nome **personagem**, mostrar a lista de imagens que se abre (sem título; role se for preciso) e escolher a menina. No "Olha só", mostrar a menina no lugar do personagem, do mesmo tamanho. Depois trazer à vista a área **Quando acontecer**, clicar no texto do aviso da chave e trocar por uma frase curta; fazer o mesmo com o aviso de **então**. Clicar em **Atualizar**, ir ao farol sem a chave, pegar a chave, voltar ao farol e mostrar as mensagens novas. Apontar **Próxima seção**.

**Narração:**
> "Agora o jogo vai ficar com a sua cara! Você pode escolher quem vive a aventura e escrever os avisos do seu jeito. E tudo o que você mudar fica no seu jogo.
>
> Vamos começar pelo personagem. Encontre a área Ao iniciar. Se ela não estiver aparecendo, é só arrastar um espaço vazio entre os blocos até ela aparecer. Repare no bloco Criar sprite personagem, que está nela.
>
> Vá até o fim desse bloco. Depois de com imagem, está o nome da imagem: personagem. Clique nesse nome, e vai abrir uma lista com as imagens do jogo. Aí é só escolher outro personagem, como a menina. Se não achar, role a lista.
>
> Olha só: o personagem novo ficou no mesmo lugar e do mesmo tamanho. Isso acontece porque todos os personagens têm o mesmo tamanho. Por isso, ele continua andando, pegando a chave e chegando ao farol do mesmo jeito.
>
> Agora, os avisos. Eles ficam na área Quando acontecer: no encontro com a chave está o aviso de quando a chave é encontrada, e no encontro com o farol, dentro de então e de senão, estão os outros dois. Clique no texto de um aviso e escreva do seu jeito, com uma frase curta.
>
> Se um desenho ficar estranho, é porque a imagem escolhida não é de um personagem. Clique de novo no nome da imagem e escolha um personagem. E, se uma frase passar da tela, deixe a frase mais curta.
>
> Agora teste: clique em Atualizar, vá ao farol sem a chave, depois pegue a chave e volte ao farol. Leia as suas mensagens!
>
> Quando terminar, clique em Próxima seção."

**Ponte do Zappy na página (não gravar):** Hora de deixar o jogo com a sua cara! Escolha outro personagem no bloco Criar sprite e escreva os avisos do seu jeito. Depois teste a aventura e clique em Próxima seção.

**Conferência de produção:** é a seção de mexa e veja do curso: vem depois do envio e antes de publicar, para o jogo publicado ter a cara da criança. As mudanças ficam no jogo; nada aqui vira critério, e a seção conclui pelo vídeo. O bloco é Criar sprite personagem em x ___ y ___ largura ___ altura ___ com imagem ___; a imagem aparece pelo nome, no fim do bloco. Todos os personagens têm a caixa 64 × 64 e a mesma área de contato, então a troca não muda o tamanho, o limite da tela nem os encontros. Uma imagem de outro tamanho (o barco, o farol) muda a caixa; a fala ensina a voltar a um personagem. Projetos salvos antes de 05/10/2026 recebem os personagens novos ao abrir a aula. A verificação não cobra o texto dos avisos.

## Seção 5. Publique seu jogo

### Vídeo `video-d3-fecho` · Publique seu jogo

**Duração alvo:** 60 a 80 segundos, incluindo a publicação, a comemoração e a cópia do link.

**Na tela:** manter o mesmo Estúdio da seção anterior, com o projeto já enviado ao professor. Apontar e abrir **Compartilhar**, no alto do Estúdio; na aula, o botão costuma aparecer só como ícone, e a janela se chama **Compartilhar no Mural dos Criadores**. Mostrar o **Resumo do projeto** preenchido, sem editar; na aula, o título vem do curso e não aparece na janela. Clicar em **Gerar capa**, esperar a imagem e conferir. Não demonstrar upload nem outra capa.

**Narração:**
> "Agora chegou a hora de publicar o seu jogo, para a sua família e os seus amigos jogarem!
>
> Para isso, clique em Compartilhar, no alto do Estúdio. Na aula, ele pode aparecer só como um ícone. Repare que o resumo do projeto já vem preenchido, por isso pode deixar como está.
>
> Depois, clique em Gerar capa e espere a imagem aparecer. Olha só: essa é a capa que vai apresentar o seu jogo!"

**Na tela:** conferir a capa, clicar em **Publicar** e esperar a comemoração do Zappy com **Seu jogo está no Mural!**. Clicar em **Copiar link de jogar** e mostrar **Link copiado!**. Clicar em **Fechar** e apontar **Concluir aula**. Encerrar sem abrir outra aula.

**Narração:**
> "Confira se a capa ficou boa e clique em Publicar. Agora é só esperar um pouquinho…
>
> Seu jogo está no Mural! Que conquista! Agora você, a sua família e os seus amigos podem jogar o jogo que você criou.
>
> Para eles jogarem, clique em Copiar link de jogar e mande esse link para eles. Quem receber pode jogar direto, até no celular. Se precisar, peça ajuda a um adulto para mandar.
>
> Depois de copiar o link, clique em Fechar e, por fim, em Concluir aula."

**Ponte do Zappy na página (não gravar):** Hora de mostrar o seu jogo! Publique no Mural, copie o link de jogar e mande para a sua família e seus amigos. Depois clique em Fechar e em Concluir aula.

Ajuda escrita junto ao vídeo, fora da narração: [Como publicar seu jogo no Mural e copiar o link](/como-fazer/plataforma-publicar-no-mural). O tutorial abre na mesma aba e oferece retorno à aula.

**Conferência de produção:** o envio anterior libera **Compartilhar**. A configuração de publicação fica somente no projeto do Dia 3. Publicar é a tarefa ensinada; o critério técnico desta seção continua sendo o vídeo. Não transformar expiração do acesso ao Mural ou indisponibilidade momentânea em bloqueio de conclusão da aula. Outras capas e solução de problemas ficam no Como fazer. Copiar o link de jogar faz parte da comemoração e aparece no vídeo: o link é público e não mostra o nome da criança, e a fala sugere mandar para a família e os amigos, com ajuda de um adulto se precisar.
