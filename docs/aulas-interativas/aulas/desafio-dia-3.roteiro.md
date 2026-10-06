# Roteiro de gravação · A Chave do Farol · Dia 3

Cinco seções: experiência com a porta, resposta sem chave, resposta com chave, a seção de mexa e veja (Deixe o jogo com a sua cara) e publicação. Manter o projeto enviado no Dia 2 e o mesmo Estúdio nas quatro últimas seções. A verificação intermediária não pede envio; a seção decisao recebe a entrega única do dia. Ajustar as durações no ensaio, sem acelerar encaixes, percursos ou a espera do barco. Não atribuir à pessoa a arte ou a animação preparada. Só a narração é falada.

## Seção 1. O que a porta precisa?

### Vídeo `video-d3-condicao` · Quando a porta pode abrir?

**Duração alvo:** 45 a 60 segundos.

**Na tela:** mostrar a cena da porta com o mostrador `temChave`. Clicar em **Testar a porta** sem a chave e deixar ver a resposta senão marcada. Clicar em **Levar a chave** e em **Testar a porta**, deixando ver a resposta então marcada. No fim, apontar a experiência para a pessoa repetir. **Meme na comparação:** na frase da porta de casa, a porta do farol trancada quando o personagem chega sem a chave e aberta quando ele chega com a chave. Desenho nosso no formato de meme, com o Zappy ou os personagens do jogo; sem foto de pessoa real nem meme da internet. Fica 2 a 3 segundos na tela, sem cobrir a experiência; a narração explica sozinha.

**Narração:**
> "Seu jogo já guarda a coleta da chave. Esta é uma experiência para a gente entender como funciona uma condição, a pergunta que a porta faz antes de abrir.
>
> Antes de abrir, a porta confere se temChave é verdadeiro. Uma pergunta assim se chama condição. É como a porta de casa: ela só abre se você tiver a chave.
>
> Olha aqui: sem levar a chave, eu clico em Testar a porta. temChave está falso, e a porta escolhe a resposta senão: avisa que falta a chave.
>
> Agora eu clico em Levar a chave e em Testar a porta de novo. temChave está verdadeiro, e a porta escolhe a resposta então: acender o farol.
>
> Agora é a sua vez: faça esses mesmos testes na experiência. Quando terminar, clique em Próxima seção."

**Ponte do Zappy na página (não gravar):** Agora teste a mesma porta sem a chave e com a chave.

**Conferência de produção:** o vídeo é uma demonstração: o narrador faz cada gesto na primeira pessoa, no ritmo da fala, mostra o resultado real e explica o porquê. Ele não dá ordens antes da vez da pessoa; só no fim passa a vez, e a pessoa repete os testes na experiência, que cobra as metas. A comparação do dia a dia é curta e ligada ao jogo. Sem palpite nem pergunta final.

## Seção 2. Avise quando faltar a chave

### Vídeo `video-d3-sem-chave` · Avise quando faltar a chave

**Duração alvo:** 3 a 4 minutos, incluindo encaixes, teste e verificação.

**Na tela:** retomar o projeto da pessoa. Começar pela retomada, antes de qualquer bloco: levar o personagem até o farol e mostrar que nada acontece. Em cada encaixe, primeiro deixar o destino à vista; só então abrir a categoria e pegar o bloco. Mostrar o encontro com a chave já montado e o espaço abaixo dele, na área **Quando acontecer**; se for preciso, arrastar um espaço vazio entre os blocos. Abrir **Jogo 2D → Colisões → Encostar e bloquear**, pegar **Quando o sprite começar a encostar no sprite**, soltar abaixo do encontro com a chave e configurar `personagem` e `farol`.

**Narração:**
> "Na experiência da seção anterior, a porta conferia temChave antes de abrir. Agora vamos ensinar o farol a fazer o mesmo!
>
> Primeiro, leve o personagem até o farol: nada acontece, porque o farol ainda não confere nada.
>
> Vamos começar pelo aviso para quando o personagem chega sem a chave. O encontro com a chave já está pronto no seu projeto.
>
> Encontre esse encontro na área Quando acontecer e deixe à vista o espaço logo abaixo dele. Se não estiver aparecendo, arraste um espaço vazio entre os blocos até ver.
>
> Agora abra Jogo 2D, depois Colisões e depois Encostar e bloquear. Pegue o bloco Quando o sprite começar a encostar no sprite.
>
> Arraste e solte abaixo do encontro com a chave, ainda na área Quando acontecer. Não coloque um encontro dentro do outro.
>
> No primeiro nome, escolha personagem. No segundo, escolha farol."

**Na tela:** com o espaço vazio do novo evento à vista, abrir **Programação → Lógica & Se** e soltar **Se** dentro dele. A pergunta `x > 0` do **Se** é um bloco de verdade: arrastá-la para a lixeira do espaço dos blocos e deixar à vista o lugar vazio ao lado de **Se**. Só então abrir **Programação → Valores**, pegar **valor da variável**, soltar nesse lugar e escolher `temChave`. Conferir antes da gravação onde fica a lixeira.

**Narração:**
> "O próximo bloco vai dentro do encontro com o farol, no espaço vazio. Deixe esse espaço à vista.
>
> Agora abra Programação e depois Lógica e Se. Pegue o bloco Se. Arraste e solte dentro do encontro com o farol.
>
> O Se vem com uma pergunta pronta: x maior que 0. Arraste essa pergunta para a lixeira do espaço dos blocos. O lugar ao lado de Se fica vazio. Deixe esse lugar à vista.
>
> Abra Programação e depois Valores. Pegue o bloco valor da variável.
>
> Arraste e solte no lugar vazio ao lado de Se. Escolha temChave.
>
> Agora, quando o personagem encostar no farol, o jogo confere se temChave é verdadeiro."

**Na tela:** apontar a linha logo abaixo do bloco **Se**, com **+ senão se** e **+ senão**, e clicar no **+** de **senão**. Com a parte **senão** à vista, abrir **Programação → Variáveis**, pegar **Alterar variável para**, soltar em **senão** e escolher `aviso`. Em **Programação → Valores**, pegar **texto**, soltar sobre o número, apagar `Olá` e escrever `A porta não abriu. Falta a chave.`.

**Narração:**
> "Na parte de baixo do bloco Se, depois de então, aparecem duas opções com um sinal de mais: senão se e senão.
>
> Clique no sinal de mais ao lado de senão. Não clique no mais de senão se.
>
> A parte senão recebe a resposta para quando temChave é falso. O próximo bloco vai dentro dela. Deixe a parte senão à vista.
>
> Abra Programação e depois Variáveis. Pegue o bloco Alterar variável para.
>
> Arraste e solte dentro de senão. Escolha aviso.
>
> Agora troque o número desse bloco por um texto. Abra Programação e depois Valores. Pegue o bloco texto e solte em cima do número. Apague Olá e escreva: A porta não abriu. Falta a chave.
>
> A parte então fica vazia por enquanto.
>
> Confira: dentro do encontro com o farol está o Se com temChave. Dentro de senão está o aviso de que falta a chave."

**Na tela:** clicar em **Atualizar**, na barra logo acima do jogo; em barra estreita, o botão aparece só como ⟳. Levar o personagem ao farol sem passar pela chave e mostrar a mensagem que aparece de verdade. Não programar a parte **então** neste vídeo.

**Narração:**
> "Agora teste no seu jogo. Clique em Atualizar, logo acima do jogo, para começar uma partida.
>
> Vá ao farol sem passar pela chave. A luz deve continuar apagada e o aviso deve dizer que falta a chave.
>
> Se o aviso não apareceu, confira personagem e farol no encontro, temChave no Se e o aviso dentro de senão. Corrija e teste de novo."

**Na tela:** clicar em **Verificar esta etapa** e mostrar o resultado real da verificação intermediária. Esperar **Salvo** e apontar **Próxima seção**. O envio não faz parte desta seção.

**Narração:**
> "Funcionou? Clique em Verificar esta etapa. Se faltar alguma coisa, corrija os blocos e clique novamente.
>
> Quando aparecer Objetivo da etapa cumprido!, espere aparecer Salvo. Depois clique em Próxima seção."

**Ponte do Zappy na página (não gravar):** Monte o aviso de que falta a chave. Vá ao farol sem pegar a chave e clique em Verificar esta etapa antes de seguir.

**Conferência de produção:** a seção exige o vídeo e a aprovação da verificação intermediária, sem envio. O envio único do dia acontece na seção seguinte.

## Seção 3. Acenda o farol com a chave

### Vídeo `video-d3-decisao` · Acenda o farol com a chave

**Duração alvo:** 4 a 5 minutos, incluindo encaixes, os três testes e o envio. Não acelerar os percursos nem a espera do barco.

**Na tela:** manter o mesmo Estúdio e o mesmo **Se**. Começar pela retomada, antes de qualquer bloco: clicar em **Atualizar**, pegar a chave, ir ao farol e mostrar que a luz não acende. Depois deixar à vista o aviso em **senão** e a parte **então**, ainda vazia; só então abrir **Programação → Variáveis**, pegar **Alterar variável para**, soltar em **então** e escolher `ganhou`. Em **Programação → Lógica & Se**, pegar o bloco **verdadeiro**, soltar sobre o número e manter **verdadeiro**. Não recarregar a retomada preparada nem duplicar o evento do farol.

**Narração:**
> "Na experiência da primeira seção desta aula, quando temChave era verdadeiro, a porta escolhia então e acendia o farol. Agora vamos programar essa resposta no seu jogo!
>
> Primeiro, clique em Atualizar, pegue a chave e vá ao farol. A luz não acende, porque a parte então ainda não tem nenhuma ação.
>
> Continue no mesmo Se do encontro com o farol e deixe à vista a parte então.
>
> Abra Programação e depois Variáveis. Pegue o bloco Alterar variável para.
>
> Arraste e solte dentro de então. Escolha ganhou.
>
> Agora troque o número desse bloco. Abra Programação e depois Lógica e Se. Pegue o bloco verdadeiro e solte em cima do número. Deixe em verdadeiro.
>
> A variável ganhou já veio preparada. Quando ela fica verdadeira, o barco começa a chegar."

**Na tela:** com o bloco de `ganhou` à vista dentro de **então**, abrir **Jogo 2D → Sprites → Criar e trocar aparência**, pegar **Trocar imagem do sprite para**, soltar logo abaixo dele e escolher `farol` e `farol-aceso`. Depois, com a troca de imagem à vista, abrir **Programação → Variáveis**, pegar outro **Alterar variável para**, soltar abaixo dela e escolher `aviso`. Em **Programação → Valores**, pegar **texto**, soltar sobre o número, apagar `Olá` e escrever o aviso de chegada.

**Narração:**
> "O próximo bloco vai logo abaixo de ganhou, ainda dentro de então. Deixe esse lugar à vista.
>
> Abra Jogo 2D, depois Sprites e depois Criar e trocar aparência. Pegue o bloco Trocar imagem do sprite para.
>
> Arraste e solte logo abaixo do bloco de ganhou.
>
> Escolha o sprite farol e a imagem farol-aceso.
>
> O próximo bloco vai logo abaixo da troca de imagem, ainda dentro de então. Deixe esse lugar à vista.
>
> Abra Programação e depois Variáveis. Pegue outro bloco Alterar variável para.
>
> Arraste e solte logo abaixo da troca de imagem, ainda dentro de então. Escolha aviso.
>
> Agora troque o número desse bloco por um texto. Abra Programação e depois Valores. Pegue o bloco texto e solte em cima do número. Apague Olá e escreva: Você acendeu o farol! Olhe o barco chegando.
>
> Confira: dentro de então estão ganhou verdadeiro, a imagem farol-aceso e o aviso de chegada. Dentro de senão continua o aviso de que falta a chave."

**Na tela:** clicar em **Atualizar**. Visitar o farol sem a chave; afastar-se, buscar a chave e voltar ao farol na mesma partida. Esperar a luz e o barco. Clicar em **Atualizar** depois da vitória e ir ao farol sem a chave. Mostrar esses estados reais, sem edição que simule o funcionamento.

**Narração:**
> "Agora teste a aventura inteira. Clique em Atualizar. Vá ao farol sem passar pela chave. A luz deve continuar apagada e o aviso deve dizer que falta a chave.
>
> Sem recomeçar a partida, busque a chave e volte ao farol. A luz deve acender, o aviso deve mudar e o barco deve chegar. Espere o barco.
>
> Clique em Atualizar de novo. A chave volta ao chão. Vá direto ao farol, sem pegar a chave. O farol deve avisar outra vez que falta a chave."

**Na tela:** apontar, um trecho de cada vez, a declaração de `temChave` em **Ao iniciar**, sua mudança na coleta e sua consulta no farol. As correções correspondem aos casos que os três testes distinguem.

**Narração:**
> "Se a luz acendeu sem a chave, confira se temChave começa em falso e se a troca de imagem está dentro de então.
>
> Se a luz não acendeu com a chave, confira se o encontro com a chave muda temChave para verdadeiro e se a imagem é farol-aceso.
>
> Se a luz acendeu, mas o barco não veio, confira ganhou verdadeiro dentro de então.
>
> Corrija e repita os testes."

**Na tela:** clicar em **Verificar esta etapa**, mostrar eventuais pendências reais e corrigir. Depois de **Objetivo da etapa cumprido!**, esperar **Salvo**, clicar em **Enviar para o professor**, confirmar em **Enviar** e aguardar. Apontar **Próxima seção**. Manter o mesmo projeto para publicar.

**Narração:**
> "Funcionou? Clique em Verificar esta etapa. Se faltar alguma coisa, corrija os blocos e clique novamente.
>
> Quando aparecer Objetivo da etapa cumprido!, espere aparecer Salvo. Clique em Enviar para o professor e confirme em Enviar.
>
> Quando o envio terminar, clique em Próxima seção."

**Ponte do Zappy na página (não gravar):** Complete a parte então para acender o farol. Teste sem a chave, com a chave e numa nova partida. Depois clique em Verificar esta etapa e envie para o professor.

**Conferência de produção:** a verificação é cumulativa e confere as regras dos dias anteriores. A seção exige o vídeo, a aprovação e o envio confirmado. A verificação não exige copiar literalmente as frases dos avisos.

## Seção 4. Deixe o jogo com a sua cara

### Vídeo `video-d3-personalizar` · Deixe o jogo com a sua cara

**Duração alvo:** 90 a 120 segundos.

**Na tela:** no mesmo Estúdio, com o projeto já enviado. Trazer à vista a área **Ao iniciar**, arrastando um espaço vazio entre os blocos se for preciso, e o bloco **Criar sprite personagem**. No fim dele, depois de **com imagem**, clicar no nome **personagem**, mostrar a lista de imagens que se abre (sem título; role se for preciso) e escolher a menina. Depois trazer à vista a área **Quando acontecer**, clicar no texto do aviso da chave e trocar por uma frase curta; fazer o mesmo com o aviso de **então**. Clicar em **Atualizar**, ir ao farol sem a chave, pegar a chave, voltar ao farol e mostrar as mensagens novas. Apontar **Próxima seção**.

**Narração:**
> "Agora deixe o jogo com a sua cara! Você pode escolher quem vive a aventura e escrever os avisos do seu jeito. O que você mudar fica no seu jogo.
>
> Primeiro, o personagem. Encontre a área Ao iniciar. Se ela não estiver aparecendo, arraste um espaço vazio entre os blocos até ver. Nela está o bloco Criar sprite personagem.
>
> Vá até o fim desse bloco. Depois de com imagem, está o nome da imagem: personagem. Clique nesse nome. Abre uma lista com as imagens do jogo. Escolha outro personagem, como a menina. Se não achar, role a lista.
>
> Todos os personagens têm o mesmo tamanho. Por isso, ele continua andando, pegando a chave e chegando ao farol do mesmo jeito.
>
> Agora os avisos. Encontre a área Quando acontecer. No encontro com a chave está o aviso de quando a chave é encontrada. No encontro com o farol, dentro de então e de senão, estão os outros dois. Clique no texto de um aviso e escreva do seu jeito, com uma frase curta.
>
> Se um desenho ficar estranho, clique de novo no nome da imagem e escolha um personagem. Se uma frase passar da tela, deixe mais curta.
>
> Agora teste: clique em Atualizar, vá ao farol sem a chave, pegue a chave e volte ao farol. Leia as suas mensagens.
>
> Quando terminar, clique em Próxima seção."

**Ponte do Zappy na página (não gravar):** Escolha outro personagem no bloco Criar sprite e escreva os avisos do seu jeito. Depois teste a aventura e clique em Próxima seção.

**Conferência de produção:** é a seção de mexa e veja do curso: vem depois do envio e antes de publicar, para o jogo publicado ter a cara da criança. As mudanças ficam no jogo; nada aqui vira critério, e a seção conclui pelo vídeo. O bloco é Criar sprite personagem em x ___ y ___ largura ___ altura ___ com imagem ___; a imagem aparece pelo nome, no fim do bloco. Todos os personagens têm a caixa 64 × 64 e a mesma área de contato, então a troca não muda o tamanho, o limite da tela nem os encontros. Uma imagem de outro tamanho (o barco, o farol) muda a caixa; a fala ensina a voltar a um personagem. Projetos salvos antes de 05/10/2026 recebem os personagens novos ao abrir a aula. A verificação não cobra o texto dos avisos.

## Seção 5. Publique seu jogo

### Vídeo `video-d3-fecho` · Publique seu jogo

**Duração alvo:** 60 a 80 segundos, incluindo a publicação, a comemoração e a cópia do link.

**Na tela:** manter o mesmo Estúdio da seção anterior, com o projeto já enviado ao professor. Apontar e abrir **Compartilhar**, no alto do Estúdio; na aula, o botão costuma aparecer só como ícone, e a janela se chama **Compartilhar no Mural dos Criadores**. Mostrar o **Resumo do projeto** preenchido, sem editar; na aula, o título vem do curso e não aparece na janela. Clicar em **Gerar capa**, esperar a imagem e conferir. Não demonstrar upload nem outra capa.

**Narração:**
> "Agora publique seu jogo para a sua família e seus amigos jogarem.
>
> No alto do Estúdio, clique em Compartilhar. Na aula, ele pode aparecer só como um ícone. O resumo do projeto já vem preenchido. Deixe como está.
>
> Clique em Gerar capa e espere a imagem aparecer. Essa é a imagem que vai apresentar seu jogo."

**Na tela:** conferir a capa, clicar em **Publicar** e esperar a comemoração do Zappy com **Seu jogo está no Mural!**. Clicar em **Copiar link de jogar** e mostrar **Link copiado!**. Clicar em **Fechar** e apontar **Concluir aula**. Encerrar sem abrir outra aula.

**Narração:**
> "Confira a capa e clique em Publicar. Espere um pouquinho…
>
> Seu jogo está no Mural! Que conquista! Agora você, sua família e seus amigos podem jogar o jogo que você criou.
>
> Clique em Copiar link de jogar e mande o link para a sua família e seus amigos. Quem receber pode jogar direto, até no celular. Se precisar, peça ajuda a um adulto para mandar.
>
> Depois de copiar o link, clique em Fechar. Agora clique em Concluir aula."

**Ponte do Zappy na página (não gravar):** Publique seu jogo no Mural, copie o link de jogar e mande para a sua família e seus amigos. Depois clique em Fechar e em Concluir aula.

Ajuda escrita junto ao vídeo, fora da narração: [Como publicar seu jogo no Mural e copiar o link](/como-fazer/plataforma-publicar-no-mural). O tutorial abre na mesma aba e oferece retorno à aula.

**Conferência de produção:** o envio anterior libera **Compartilhar**. A configuração de publicação fica somente no projeto do Dia 3. Publicar é a tarefa ensinada; o critério técnico desta seção continua sendo o vídeo. Não transformar expiração do acesso ao Mural ou indisponibilidade momentânea em bloqueio de conclusão da aula. Outras capas e solução de problemas ficam no Como fazer. Copiar o link de jogar faz parte da comemoração e aparece no vídeo: o link é público e não mostra o nome da criança, e a fala sugere mandar para a família e os amigos, com ajuda de um adulto se precisar.
