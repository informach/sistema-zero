# Roteiro de produção · cade-todo-mundo-aula-2

A professora grava toda a fala principal. Na edição kids, substituir apenas os trechos da tabela. Copie o arquivo .elevenlabs.txt para gerar a voz integral. Gravação e publicação desta revisão ainda não confirmadas.

## Parte 1. Volte ao seu jardim

**Clipe:** `video-a2-retomada`

**Na tela:** Do "Olha aqui o jardim" até o "ficou no zero", a tela fica parada, e a edição troca esse trecho pelo jardim do jeito que ficou na Aula 1: um toque num esconderijo, ele fica invisível, o personagem aparece e o número Achados fica no zero [na edição: o jardim da Aula 1, com um toque e Achados em zero]. No "Clique em Próxima", clicar em **Próxima parte** [próxima parte].

**Fala para ElevenLabs:**

```text
[engaging, energetic, conversational voice] Hoje você vai ensinar o seu jogo a contar os personagens que você encontra.

[engaging, energetic, conversational voice] Olha aqui o jardim, do jeito que ficou na Aula 1: quando eu toco num esconderijo, ele fica invisível e o personagem aparece.

[curious] Ué, por que o número ficou no zero?

[engaging, energetic, conversational voice] É que o jogo ainda não conta quem você encontra. Então, agora a gente vai fazer esse número contar cada personagem encontrado. Clique em Próxima parte para começar.
```

**Substituições na edição kids:**

| ID | Personagem | Ocorrência | Âncora anterior | Fala exata substituída | Âncora posterior | Tags |
| --- | --- | --- | --- | --- | --- | --- |
| video-a2-retomada-K1 | Dedé | 1 | aqui o jardim, do jeito que ficou na Aula 1: quando eu toco num esconderijo, ele fica invisível e o personagem aparece. | Ué, por que o número ficou no zero? | É que o jogo ainda não conta quem você encontra. Então, agora a gente vai fazer esse número contar cada personagem | [curious] |

No adulto, manter toda a fala da professora. No kids, silenciar apenas o trecho marcado e substituir pelo áudio do personagem, sem sobrepor vozes.

**Recado na página (não gravar):** Seus personagens já aparecem, mas Achados ainda fica em zero. Então vamos ensinar o jogo a contar: clique em Próxima parte para começar.

## Parte 2. Um número que acompanha a busca

**Clipe:** `video-a2-variavel`

**Na tela:** Do "Para contar os personagens" até o "já estava guardado", a tela fica parada, e a edição troca esse trecho pela explicação da variável, com o placar de futebol [na edição: a variável achados e o placar de futebol]. No "Agora você vai acompanhar uma busca", ampliar a experiência [ampliar experiência]. No "observar quando esse número muda", tocar num esconderijo [tocar "Tocar no arbusto"] e mostrar o valor de Achados [apontar "Valor atual de achados"]. No "ajuda a observar", mostrar o Zappy [apontar zappy]. No "Quando terminar", voltar ao tamanho da aula [voltar à aula]. No "clique em Próxima", clicar em **Próxima parte** [próxima parte].

**Fala para ElevenLabs:**

```text
[engaging, energetic, conversational voice] Para contar os personagens encontrados, o seu jogo precisa guardar um número. A gente chama esse lugar de variável. Ela guarda um valor que pode mudar.

[interested, animated voice] Sabe o placar de um jogo de futebol? Ele mostra quantos gols já aconteceram. Quando sai outro gol, o número aumenta em um.

[confident, clear, unhurried voice] No jardim, a variável achados guarda quantos personagens você encontrou. O placar mostra esse valor. Cada novo personagem acrescenta um ao número que já estava guardado.

[upbeat, encouraging voice] Agora você vai acompanhar uma busca e observar quando esse número muda e quando continua igual. Você escolhe por onde começar e pode repetir os testes. O Zappy ajuda a observar as diferenças. Quando terminar, clique em Próxima parte.
```


**Falas dentro da experiência:** fonte compartilhada `packages/core/src/learning/scene/discovery-guidance.ts`, exportada em `zappy-etapas.json`. Diferenciar valor atual, última operação e leitura no placar. As falas avançam pelos testes realizados, inclusive vazio, repetição e reinício.

**Recado na página (não gravar):** Sua vez! Acompanhe o valor guardado durante a busca. Você escolhe a ordem dos testes, e o Zappy sugere o que observar.

## Parte 3. Cada personagem vale um achado

**Clipe:** `video-a2-contagem`

**Na tela:** A parte começa com o Estúdio expandido [expandir estúdio]. No "Aqui no seu jogo, toque num esconderijo", tocar num esconderijo na Pré-visualização [tocar prévia 137 209]. No "Tá vendo?", mostrar que o personagem aparece, mas Achados continua em zero [apontar prévia 75 26]. Do "Lembra da experiência" até o "contar do mesmo jeito", a tela fica parada, e a edição troca esse trecho pela experiência da parte anterior, com cada personagem somando um em Achados [na edição: a experiência da parte anterior, com Achados somando um]. No "arraste um espaço vazio", arrastar um espaço vazio entre os blocos até a área aparecer [arrastar até "Quando acontecer"]. No "encontre o bloco Quando clicar ou tocar", mostrar o bloco [apontar bloco "Quando clicar ou tocar"]. No "Repare que dentro dele já está o bloco da Aula 1", mostrar o bloco Deixar o sprite escolhido com 0% de visibilidade [apontar bloco "Deixar o sprite"]. No "Ele vai entrar logo abaixo", mostrar o lugar logo abaixo dele [apontar abaixo de "Deixar o sprite"]. No "Agora, abra Programação", abrir Programação [categoria Programação]. No "e depois Variáveis", abrir Variáveis [categoria Variáveis]. No "Arraste e solte", levar o bloco Somar 1 em variável contador para logo abaixo de Deixar o sprite escolhido [encaixar "Somar 1" abaixo de "Deixar o sprite"]. No "Então, clique em contador", abrir o campo contador [abrir campo "contador" em "Somar 1"]. No "e escolha achados", escolher achados [escolher "achados" em "Somar 1"]. No "Agora vamos testar, toque num esconderijo", tocar num esconderijo [tocar prévia 137 209]. No "Olha só: o personagem aparece e Achados vira 1", apontar o número Achados, que vira 1 [apontar prévia 75 26]. No "Toque em outro", tocar no segundo esconderijo [tocar prévia 310 209]. No "Quando você tocar no último", tocar no terceiro [tocar prévia 483 209]. No "E quem faz essa mensagem aparecer", apontar a mensagem Você achou todo mundo! [apontar prévia 310 64]. No "Agora toque de novo no mesmo lugar", tocar de novo no primeiro esconderijo [tocar prévia 137 209]. No "o número continua em 3", apontar o número Achados [apontar prévia 75 26]. No "volte aos blocos e confira", mostrar os dois blocos dentro de Quando clicar ou tocar [apontar bloco "Quando clicar ou tocar"]. No "Clique em Verificar projeto", clicar em **Verificar projeto** e esperar a resposta [verificar projeto]. No "Seu jogo é salvo automaticamente enquanto você monta", voltar ao tamanho da aula [reduzir estúdio]. No "Quando aparecer Objetivo cumprido, clique em Próxima", clicar em **Próxima parte** [próxima parte].

**Fala para ElevenLabs:**

```text
[engaging, energetic, conversational voice] Aqui no seu jogo, toque num esconderijo. Tá vendo? O personagem aparece, mas Achados continua em zero, porque o seu jogo ainda não conta.

[engaging, energetic, conversational voice] Lembra da experiência da parte anterior? Cada personagem encontrado somava um em Achados. Agora a gente vai fazer o seu jogo contar do mesmo jeito!

[engaging, energetic, conversational voice] Para começar, procure a área Quando acontecer. Se ela não estiver aparecendo, arraste um espaço vazio entre os blocos até encontrá-la. Dentro dessa área, encontre o bloco Quando clicar ou tocar num sprite do grupo esconderijos.

[confident, clear, unhurried voice] Repare que dentro dele já está o bloco da Aula 1, Deixar o sprite escolhido com 0% de visibilidade.

[curious] E onde entra o bloco que conta?

[engaging, energetic, conversational voice] Ele vai entrar logo abaixo do bloco de visibilidade, dentro de Quando clicar ou tocar. Então deixe esse lugar à vista.

[confident, clear, unhurried voice] Agora abra Programação e depois Variáveis, e pegue o bloco Somar 1 em variável contador.

[confident, clear, unhurried voice] Arraste e solte logo abaixo de Deixar o sprite escolhido com 0% de visibilidade.

[engaging, energetic, conversational voice] O número 1 já está certo, porque cada personagem vale um achado. Mas o bloco chega com contador, e a variável do seu jogo se chama achados. Então clique em contador e escolha achados.

[upbeat, encouraging voice] Agora vamos testar! Toque num esconderijo. [interested, animated voice] Olha só: o personagem aparece, e Achados vira 1!

[engaging, energetic, conversational voice] Toque em outro, e o número vai para 2. Quando você tocar no último, ele chega a 3 e aparece a mensagem Você achou todo mundo! E quem faz essa mensagem aparecer é a contagem que você acabou de montar: a mensagem aparece quando Achados chega a 3.

[curious] E se eu tocar no mesmo lugar de novo?

[engaging, energetic, conversational voice] Vamos ver. Agora toque de novo no mesmo lugar. [confident, clear, unhurried voice] Repare: o número continua em 3. É que o esconderijo invisível não recebe outro toque, então o mesmo personagem não conta duas vezes.

[reassuring, encouraging voice] Se algo não funcionou no seu jogo, volte aos blocos e confira se ficou assim: os dois blocos estão dentro de Quando clicar ou tocar, primeiro o esconderijo escolhido fica invisível e, logo abaixo, o jogo soma 1 em achados. [reassuring, encouraging voice] Depois de corrigir, teste de novo.

[engaging, energetic, conversational voice] Funcionou? Clique em Verificar projeto. Se faltar alguma coisa, corrija os blocos e clique novamente.

[engaging, energetic, conversational voice] Seu jogo é salvo automaticamente enquanto você monta. Quando aparecer Objetivo cumprido!, clique em Próxima parte.
```

**Substituições na edição kids:**

| ID | Personagem | Ocorrência | Âncora anterior | Fala exata substituída | Âncora posterior | Tags |
| --- | --- | --- | --- | --- | --- | --- |
| video-a2-contagem-K1 | Dedé | 1 | grupo esconderijos. Repare que dentro dele já está o bloco da Aula 1, Deixar o sprite escolhido com 0% de visibilidade. | E onde entra o bloco que conta? | Ele vai entrar logo abaixo do bloco de visibilidade, dentro de Quando clicar ou tocar. Então deixe esse lugar à vista. | [curious] |
| video-a2-contagem-K3 | Dedé | 1 | E quem faz essa mensagem aparecer é a contagem que você acabou de montar: a mensagem aparece quando Achados chega a 3. | E se eu tocar no mesmo lugar de novo? | Vamos ver. Agora toque de novo no mesmo lugar. Repare: o número continua em 3. É que o esconderijo invisível não recebe | [curious] |

No adulto, manter toda a fala da professora. No kids, silenciar apenas o trecho marcado e substituir pelo áudio do personagem, sem sobrepor vozes.

**Recado na página (não gravar):** Agora faça o seu jogo contar os achados! Depois, teste os três esconderijos e clique em Verificar projeto. Quando aparecer Objetivo cumprido!, clique em Próxima parte.

## Parte 4. Deixe o jogo com a sua cara

**Clipe:** `video-a2-personalizar`

**Na tela:** Do "Chegou a surpresa" até o "fica no seu jogo", a tela fica parada, e a edição troca esse trecho pelo Passo a passo do projeto aberto nos bichos e nos esconderijos, com o nome de cada um [na edição: o Passo a passo do projeto nos bichos e esconderijos]. Enquanto a edição mostra o Passo a passo, no "No Passo a passo do projeto", arrumar os blocos que vieram da Parte 3 um por cima do outro, com o botão direito na área de código e **Organizar blocos** [organizar blocos]. No "Vamos começar pelos bichos", expandir o Estúdio [expandir estúdio]. No "é só arrastar um espaço vazio", arrastar um espaço vazio até a área aparecer [arrastar até "Ao iniciar"]. No "Repare nos blocos Criar sprite que estão nela", mostrar os blocos Criar sprite [apontar bloco "Criar sprite"]. No "Clique nesse nome", abrir a lista de imagens [abrir campo "coelho" em "Criar sprite"]. No "Aí é só clicar em outro bicho, como o gato", escolher o gato [escolher "gato" em "Criar sprite"]. No "clique no nome da imagem, como arbusto", abrir a lista do esconderijo [abrir campo "arbusto" em "Criar sprite"]. No "e escolha outro esconderijo, como o toco", escolher o toco [escolher "toco" em "Criar sprite"]. No "Olha só: o esconderijo novo", apontar o esconderijo novo na Pré-visualização [apontar prévia 137 209]. No "Encontre a área Enquanto estiver rodando, arrastando um espaço vazio", arrastar um espaço vazio até a área aparecer [arrastar até "Enquanto estiver rodando"]. No "está o bloco Escrever", trazer o bloco Escrever à vista [arrastar até "Escrever"]. No "Clique nessa frase", abrir a frase [abrir campo "Você achou todo mundo!" em "Escrever"]. No "e escreva uma frase curta", escrever uma frase curta [escolher "Achei todo mundo!" em "Escrever"]. No "dê uma olhada no jardim", mostrar o jardim na Pré-visualização [apontar prévia]. No "encontre todo mundo de novo", tocar no primeiro esconderijo [tocar prévia 137 209]. No "Os bichos vão aparecer", tocar no segundo [tocar prévia 310 209]. No "atrás dos esconderijos", tocar no terceiro [tocar prévia 483 209]. No "do jeito que você deixou", apontar a mensagem do final [apontar prévia 310 64]. No "clique em Enviar meu projeto", enviar e confirmar em **Enviar** [enviar projeto]. No "Quando aparecer Projeto enviado", voltar ao tamanho da aula [reduzir estúdio]. No "clique em Próxima", clicar em **Próxima parte** [próxima parte].

**Fala para ElevenLabs:**

```text
[engaging, energetic, conversational voice] Chegou a surpresa! Agora você pode escolher quais personagens vão se esconder e onde cada um vai ficar.

[engaging, energetic, conversational voice] No Passo a passo do projeto, você encontra os bichos e os esconderijos, com o nome de cada um. E a mensagem do final também pode ser sua. Tudo o que você mudar fica no seu jogo.

[engaging, energetic, conversational voice] Vamos começar pelos bichos. Encontre a área Ao iniciar. Se ela não estiver aparecendo, é só arrastar um espaço vazio entre os blocos até ela aparecer. [confident, clear, unhurried voice] Repare nos blocos Criar sprite que estão nela: cada um cria um bicho ou um esconderijo do jardim.

[engaging, energetic, conversational voice] Olhe o fim de um bloco que cria um bicho. Depois de com imagem, está o nome da imagem, como coelho. Clique nesse nome, e vai abrir uma lista com as imagens do jogo. Aí é só clicar em outro bicho, como o gato. Se não achar, role a lista.

[engaging, energetic, conversational voice] Com os esconderijos é do mesmo jeito: num bloco que cria um esconderijo, clique no nome da imagem, como arbusto, e escolha outro esconderijo, como o toco.

[interested, animated voice] Olha só: o esconderijo novo ficou no mesmo lugar e do mesmo tamanho. Isso acontece porque todos os bichos deste jogo foram desenhados do mesmo tamanho, e todos os esconderijos também. Por isso, o desenho novo cabe certinho no lugar do antigo.

[confident, clear, unhurried voice] Agora troque, nos outros blocos Criar sprite, os bichos e os esconderijos que você quiser, até o jardim ficar do seu jeito. O que você gostou pode ficar como está.

[upbeat, encouraging voice] Se quiser, mude também a mensagem do final. Encontre a área Enquanto estiver rodando, arrastando um espaço vazio entre os blocos se precisar. Dentro de um bloco Se, está o bloco Escrever com a frase Você achou todo mundo! Clique nessa frase e escreva uma frase curta, do seu jeito.

[engaging, energetic, conversational voice] Antes de testar, dê uma olhada no jardim. Se algum bicho aparecer antes do toque, ou se um desenho ficar grande demais, é porque a imagem escolhida é do outro tipo. Aí é só clicar de novo no nome da imagem e escolher um desenho do mesmo tipo: bicho no bloco do bicho, esconderijo no bloco do esconderijo.

[upbeat, encouraging voice] Agora teste: encontre todo mundo de novo. Os bichos vão aparecer atrás dos esconderijos, do jeito que você deixou, e no fim vem a mensagem! Se a frase passar da tela, deixe a frase mais curta e teste de novo.

[engaging, energetic, conversational voice] O jogo ficou com a sua cara! É essa versão que você pode publicar no Mural. Para enviar o projeto, clique em Enviar meu projeto e confirme em Enviar. Quando aparecer Projeto enviado!, clique em Próxima parte.
```

**Recado na página (não gravar):** A surpresa chegou! Escolha os personagens e prepare os esconderijos da sua brincadeira: troque a imagem clicando no nome dela, no fim de cada bloco Criar sprite. Se quiser, escreva também a sua mensagem do final. Depois encontre todo mundo de novo, clique em Enviar meu projeto e confirme em Enviar. Quando aparecer Projeto enviado!, clique em Próxima parte.

## Parte 5. Seu jogo está pronto

**Clipe:** `video-a2-fecho`

**Na tela:** A parte começa com o projeto já enviado na Parte 4 (no palco de gravação, o endereço da parte leva `&enviado=1`) e com o Estúdio expandido [expandir estúdio]. No "clique em Compartilhar", clicar em **Compartilhar**, no alto do Estúdio [compartilhar]. No "Repare que o resumo do projeto", mostrar o **Resumo do projeto** já preenchido [apontar "Resumo do projeto"]. No "clique em Gerar capa", clicar em **Gerar capa** e esperar a imagem [clicar "Gerar capa"]. No "clique em Publicar", clicar em **Publicar** [clicar "Publicar"]. No "Clique em Copiar link de jogar", clicar em **Copiar link de jogar** [clicar "Copiar link de jogar"]. No "clique em Fechar", clicar em **Fechar** [clicar "Fechar"]. No "e por fim", voltar ao tamanho da aula [reduzir estúdio]. No "por fim em Concluir", clicar em **Concluir aula** [concluir aula].

**Fala para ElevenLabs:**

```text
[engaging, energetic, conversational voice] Seu jogo está pronto! Se quiser, você pode publicar no Mural para a sua família e os seus amigos jogarem. Você também pode clicar em Concluir aula e continuar a jornada sem publicar.

[engaging, energetic, conversational voice] Se escolher compartilhar, clique em Compartilhar, no alto do Estúdio. Aqui, ele pode aparecer só como uma setinha para cima. [confident, clear, unhurried voice] Repare que o resumo do projeto já vem preenchido, então pode deixar como está.

[engaging, energetic, conversational voice] Depois, clique em Gerar capa e espere a imagem aparecer. [interested, animated voice] Olha só: essa é a capa que vai apresentar o seu jogo!

[confident, clear, unhurried voice] Confira se a capa ficou boa e clique em Publicar. Agora espere a publicação terminar.

[pleased, lively voice] Seu jogo está no Mural! Agora você, a sua família e os seus amigos podem jogar o jogo que você criou.

[curious] E para mostrar o jogo para alguém?

[confident, clear, unhurried voice] Clique em Copiar link de jogar e mande esse link para a sua família e os seus amigos. Quem receber pode jogar direto, até no celular.

[engaging, energetic, conversational voice] Depois de copiar o link, clique em Fechar e, por fim, em Concluir aula.
```

**Substituições na edição kids:**

| ID | Personagem | Ocorrência | Âncora anterior | Fala exata substituída | Âncora posterior | Tags |
| --- | --- | --- | --- | --- | --- | --- |
| video-a2-fecho-K1 | Dedé | 1 | terminar. Seu jogo está no Mural! Agora você, a sua família e os seus amigos podem jogar o jogo que você criou. | E para mostrar o jogo para alguém? | Clique em Copiar link de jogar e mande esse link para a sua família e os seus amigos. Quem receber pode jogar direto, | [curious] |

No adulto, manter toda a fala da professora. No kids, silenciar apenas o trecho marcado e substituir pelo áudio do personagem, sem sobrepor vozes.

**Recado na página (não gravar):** Seu jogo está pronto! Se quiser, publique no Mural, copie o link de jogar e compartilhe com a sua família e os seus amigos. Se precisar, peça ajuda a um adulto. Você pode concluir a aula e continuar a jornada sem publicar.
