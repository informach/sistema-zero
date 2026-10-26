# Roteiro de produção · desafio-dia-3

A professora grava toda a fala principal. Na edição kids, substituir apenas os trechos da tabela. Copie o arquivo .elevenlabs.txt para gerar a voz integral. Gravação e publicação desta revisão ainda não confirmadas.

## Parte 1. O que a porta precisa?

**Clipe:** `video-d3-condicao`

**Na tela:** Mostrar uma porta de casa e a chave como analogia. Apontar a pergunta e os dois caminhos da regra do farol, sem escolher uma resposta na cena. Os botões de dar/tirar a chave preparam situações de teste; não representam comandos de coleta no projeto.

**Fala para ElevenLabs:**

```text
[engaging, energetic, conversational voice] O seu jogo já guarda se o personagem pegou a chave. Agora ele vai usar essa informação para escolher uma resposta. Uma pergunta que ajuda o jogo a decidir se chama condição.

[engaging, energetic, conversational voice] É como a porta da sua casa: para abrir, você precisa da chave. No jogo, a pergunta é: temChave é verdadeiro? Ou seja, o personagem está com a chave?

[curious] E se a resposta for não?

[engaging, energetic, conversational voice] A regra tem dois caminhos. O então diz o que fazer quando a resposta é sim. O senão diz o que fazer quando a resposta é não. A pergunta é a mesma, mas a resposta pode mudar com o valor guardado.

[engaging, energetic, conversational voice] Na experiência, prepare o personagem com ou sem chave e teste a porta. Observe qual caminho a regra escolhe. Você pode começar por qualquer situação e repetir. Quando terminar, clique em Próxima parte.
```

**Substituições na edição kids:**

| ID | Personagem | Ocorrência | Âncora anterior | Fala exata substituída | Âncora posterior | Tags |
| --- | --- | --- | --- | --- | --- | --- |
| video-d3-condicao-K1 | Debinha | 1 | . É como a porta da sua casa: para abrir, você precisa da chave. No jogo, a pergunta é: temChave é verdadeiro? Ou seja, o personagem está com a chave? | E se a resposta for não? | A regra tem dois caminhos. O então diz o que fazer quando a resposta é sim. O senão diz o que fazer quando a resposta é não. A pergunta é a mesma, mas | [curious] |

No adulto, manter toda a fala da professora. No kids, silenciar apenas o trecho marcado e substituir pelo áudio do personagem, sem sobrepor vozes.

**Falas dentro da experiência:** `packages/core/src/learning/scene/discovery-guidance.ts`, exportadas em `zappy-etapas.json`. A orientação sugere comparações pelo estado observado; os controles permanecem livres.

**Recado na página (não gravar):** Sua vez! Teste a mesma porta sem a chave e com a chave e repare em qual resposta a porta escolhe. Quando terminar, clique em Próxima parte.

## Parte 2. Avise quando faltar a chave

**Clipe:** `video-d3-sem-chave`

**Na tela:** retomar o projeto da pessoa. Começar pela retomada, antes de qualquer bloco e nesta ordem: primeiro o problema (levar o personagem até a porta do farol, na base da torre, e, no "Tá vendo?", mostrar que nada acontece), depois a lembrança e o anúncio. Em cada encaixe, primeiro deixar o destino à vista; só então abrir a categoria e pegar o bloco. Mostrar o encontro com a chave já montado e o espaço abaixo dele, na área **Quando acontecer**; se for preciso, arrastar um espaço vazio entre os blocos. Abrir **Jogo 2D → Colisões → Encostar e bloquear**, pegar **Quando o sprite começar a encostar no sprite**, soltar abaixo do encontro com a chave, clicar em `jogador` e escolher `personagem`, depois clicar em `inimigo` e escolher `farol`.

**Fala para ElevenLabs:**

```text
[engaging, energetic, conversational voice] Aqui no seu jogo, leve o personagem até a porta do farol, lá na base da torre. Tá vendo? Nada acontece, porque o seu farol ainda não confere se o personagem está com a chave.

[engaging, energetic, conversational voice] Lembra da experiência da parte anterior? A porta conferia temChave antes de abrir. Agora a gente vai ensinar o farol a fazer o mesmo, começando pelo aviso de que falta a chave!

[engaging, energetic, conversational voice] Chegar ao farol também é um encontro, e os encontros ficam na área Quando acontecer. Procure lá o encontro com a chave, do Dia 2, e deixe à vista o espaço logo abaixo dele. Se não estiver aparecendo, é só arrastar um espaço vazio entre os blocos até ele aparecer.

[confident, clear, unhurried voice] Agora abra Jogo 2D, depois Colisões e depois Encostar e bloquear, e pegue o bloco Quando o sprite começar a encostar no sprite.

[confident, clear, unhurried voice] Arraste e solte abaixo do encontro com a chave, ainda na área Quando acontecer. Não coloque um encontro dentro do outro.

[confident, clear, unhurried voice] Clique em jogador e escolha personagem. Depois clique em inimigo e escolha farol.

[engaging, energetic, conversational voice] Dentro desse encontro, o farol vai fazer a mesma pergunta da porta. Por isso, deixe à vista o espaço vazio ao lado da palavra fazer, dentro do encontro com o farol.

[engaging, energetic, conversational voice] Quem faz uma pergunta no jogo é o bloco Se. Abra Programação e depois Lógica e Se, pegue o bloco Se e solte nesse espaço.

[confident, clear, unhurried voice] Repare que o Se já vem com uma condição pronta: x maior que 0. Mas não é isso que o farol precisa perguntar, por isso segure essa pergunta pelo sinal de maior e arraste até a lixeira, no canto de baixo, à direita, do espaço dos blocos. O lugar ao lado de Se fica vazio, e é ali que vai a pergunta certa. Deixe esse lugar à vista.

[confident, clear, unhurried voice] Abra Programação e depois Valores, e pegue o bloco valor da variável.

[confident, clear, unhurried voice] Arraste e solte no lugar vazio ao lado de Se. [confident, clear, unhurried voice] Repare que esse bloco chega com x: clique no x e escolha temChave.

[engaging, energetic, conversational voice] A palavra verdadeiro não aparece no bloco, e nem precisa: com temChave sozinho ao lado do Se, a pergunta já é essa. Pronto: agora, quando o personagem encostar no farol, o jogo confere se temChave é verdadeiro.

[curious] E onde eu escrevo que falta a chave?

[engaging, energetic, conversational voice] Esse aviso vai no espaço do senão. O senão guarda a resposta para quando temChave é falso, ou seja, para quando o personagem chega sem a chave. Só que o Se chega sem esse espaço.

[engaging, energetic, conversational voice] Olha aqui, na linha de baixo do bloco Se, depois do então: tem dois sinais de mais. O primeiro fica antes de senão se, e o segundo fica antes da palavra senão, no fim da linha. Clique no segundo. Não clique no primeiro.

[confident, clear, unhurried voice] Repare: apareceu o espaço do senão. Deixe esse espaço à vista.

[confident, clear, unhurried voice] Abra Programação e depois Variáveis, e pegue o bloco Alterar variável para.

[confident, clear, unhurried voice] Arraste e solte dentro do senão e escolha aviso.

[confident, clear, unhurried voice] Agora troque o número desse bloco pela mensagem. Abra Programação e depois Valores, pegue o bloco texto e solte em cima do número. Depois, apague Olá e escreva: A porta não abriu. Falta a chave.

[engaging, energetic, conversational voice] O espaço do então fica vazio por enquanto, porque é nele que vai a resposta para quem chega com a chave.

[upbeat, encouraging voice] Agora vamos testar! Clique em Atualizar, logo acima do jogo, para começar uma partida nova. Se o espaço do jogo estiver estreito, esse botão aparece só como uma seta dando a volta.

[engaging, energetic, conversational voice] Vá até a porta do farol sem passar pela chave. [confident, clear, unhurried voice] Repare: a luz continua apagada, e o aviso diz que falta a chave. É a resposta do senão funcionando!

[reassuring, encouraging voice] Se algo não funcionou no seu jogo, volte aos blocos e confira se ficou assim: dentro de Quando acontecer está o encontro entre personagem e farol, dentro dele está o Se com temChave, e dentro do senão está o aviso de que falta a chave. [reassuring, encouraging voice] Depois de corrigir, teste de novo.

[engaging, energetic, conversational voice] Funcionou? Clique em Verificar projeto. Se faltar alguma coisa, corrija os blocos e clique novamente.

[engaging, energetic, conversational voice] Quando aparecer Objetivo cumprido!, clique em Próxima parte.
```

**Substituições na edição kids:**

| ID | Personagem | Ocorrência | Âncora anterior | Fala exata substituída | Âncora posterior | Tags |
| --- | --- | --- | --- | --- | --- | --- |
| video-d3-sem-chave-K2 | Debinha | 1 | a pergunta já é essa. Pronto: agora, quando o personagem encostar no farol, o jogo confere se temChave é verdadeiro. | E onde eu escrevo que falta a chave? | Esse aviso vai no espaço do senão. O senão guarda a resposta para quando temChave é falso, ou seja, para quando o | [curious] |

No adulto, manter toda a fala da professora. No kids, silenciar apenas o trecho marcado e substituir pelo áudio do personagem, sem sobrepor vozes.

**Recado na página (não gravar):** Agora ensine o farol a avisar quando falta a chave! Monte o encontro com o farol, o Se e o aviso no senão. Depois vá até a porta do farol sem pegar a chave e clique em Verificar projeto. Quando aparecer Objetivo cumprido!, clique em Próxima parte.

## Parte 3. Acenda o farol com a chave

**Clipe:** `video-d3-decisao`

**Na tela:** manter o mesmo Estúdio e o mesmo **Se**. Começar pela retomada, antes de qualquer bloco: clicar em **Atualizar**, pegar a chave e ir até a porta do farol, descendo até a base da torre (encostar só na torre não conta). No "Tá vendo?", mostrar que a luz não acende. Manter esse estado para a reação da Debinha; ainda não montar a resposta.

**Fala para ElevenLabs:**

```text
[engaging, energetic, conversational voice] No seu jogo, clique em Atualizar, pegue a chave e vá até a porta do farol. Tá vendo? A luz não acende.

[engaging, energetic, conversational voice] É que o espaço do então está vazio.

[engaging, energetic, conversational voice] Lembra da experiência da primeira parte desta aula? Com temChave verdadeiro, a porta acendia o farol. Agora a gente vai pôr essa resposta no então!

[engaging, energetic, conversational voice] A resposta com a chave vai ter três blocos: um que chama o barco, um que acende a luz e um aviso para quem está jogando. Continue no mesmo Se do encontro com o farol e deixe à vista o espaço do então.

[confident, clear, unhurried voice] Abra Programação e depois Variáveis, e pegue o bloco Alterar variável para.

[confident, clear, unhurried voice] Arraste e solte dentro do então e escolha ganhou. É essa variável que chama o barco: quando ganhou fica verdadeiro, o barco começa a chegar.

[engaging, energetic, conversational voice] Por isso, troque o número desse bloco por verdadeiro. Abra Programação e depois Lógica e Se, pegue o bloco verdadeiro, solte em cima do número e deixe em verdadeiro.

[engaging, energetic, conversational voice] Agora vamos acender a luz. Para isso, o farol precisa trocar de imagem, do apagado para o aceso. O próximo bloco vai logo abaixo de ganhou, ainda dentro do então, por isso deixe esse lugar à vista.

[confident, clear, unhurried voice] Abra Jogo 2D, depois Sprites e depois Criar e trocar aparência, e pegue o bloco Trocar imagem do sprite para.

[confident, clear, unhurried voice] Arraste e solte logo abaixo do bloco de ganhou.

[confident, clear, unhurried voice] Repare que esse bloco chega com heroi nos dois nomes. Clique no primeiro heroi e escolha farol. Depois clique no segundo e escolha a imagem farol listrado aceso. Se não achar, role a lista.

[curious] E quem está jogando vai saber que deu certo?

[engaging, energetic, conversational voice] Vai, sim! É para isso que serve o último bloco: o aviso. Ele vai logo abaixo da troca de imagem, ainda dentro do então. Deixe esse lugar à vista.

[confident, clear, unhurried voice] Abra Programação e depois Variáveis, e pegue outro bloco Alterar variável para.

[confident, clear, unhurried voice] Arraste e solte logo abaixo da troca de imagem e escolha aviso.

[confident, clear, unhurried voice] Agora troque o número desse bloco pela mensagem. Abra Programação e depois Valores, pegue o bloco texto e solte em cima do número. Depois, apague Olá e escreva: Você acendeu o farol! Olhe o barco chegando.

[upbeat, encouraging voice] Agora vamos testar o jogo inteiro! Clique em Atualizar e vá até a porta do farol sem passar pela chave. A luz continua apagada, e o aviso diz que falta a chave.

[engaging, energetic, conversational voice] Agora, sem recomeçar a partida, busque a chave e volte até a porta do farol, lá na base da torre. [interested, animated voice] Olha só: a luz acende, o aviso muda, e o barco já chegou perto do farol!

[curious] Acendeu! E se eu quiser jogar de novo?

[confident, clear, unhurried voice] Clique em Atualizar de novo. [confident, clear, unhurried voice] Repare que a chave volta para o chão, porque começou uma partida nova. Vá direto até a porta do farol, sem pegar a chave, e o farol tem que avisar outra vez que falta a chave.

[reassuring, encouraging voice] Se algo não funcionou no seu jogo, volte aos blocos e confira se ficou assim: dentro do então estão ganhou verdadeiro, a imagem farol listrado aceso e o aviso de chegada, e dentro do senão está o aviso de que falta a chave. [reassuring, encouraging voice] Depois de corrigir, teste de novo.

[engaging, energetic, conversational voice] Funcionou? Clique em Verificar projeto. Se faltar alguma coisa, corrija os blocos e clique novamente.

[engaging, energetic, conversational voice] Seu jogo é salvo automaticamente enquanto você monta. Quando aparecer Objetivo cumprido!, clique em Próxima parte.
```

**Substituições na edição kids:**

| ID | Personagem | Ocorrência | Âncora anterior | Fala exata substituída | Âncora posterior | Tags |
| --- | --- | --- | --- | --- | --- | --- |
| video-d3-decisao-K2 | Debinha | 1 | heroi e escolha farol. Depois clique no segundo e escolha a imagem farol listrado aceso. Se não achar, role a lista. | E quem está jogando vai saber que deu certo? | Vai, sim! É para isso que serve o último bloco: o aviso. Ele vai logo abaixo da troca de imagem, ainda dentro do então. | [curious] |
| video-d3-decisao-K3 | Debinha | 1 | até a porta do farol, lá na base da torre. Olha só: a luz acende, o aviso muda, e o barco já chegou perto do farol! | Acendeu! E se eu quiser jogar de novo? | Clique em Atualizar de novo. Repare que a chave volta para o chão, porque começou uma partida nova. Vá direto até a | [curious] |

No adulto, manter toda a fala da professora. No kids, silenciar apenas o trecho marcado e substituir pelo áudio do personagem, sem sobrepor vozes.

**Recado na página (não gravar):** Agora acenda o farol! Complete o espaço do então e teste sem a chave, com a chave e numa nova partida. Depois clique em Verificar projeto. Quando aparecer Objetivo cumprido!, clique em Próxima parte.

## Parte 4. Deixe o jogo com a sua cara

**Clipe:** `video-d3-personalizar`

**Na tela:** Antes de gravar, preparar as duas versões em dois perfis de teste, cada um com o próprio Estúdio do Dia 3 já verificado (o Estúdio da aula guarda um projeto por perfil; não usar o Estúdio completo, que é vendido à parte e fica fora desta gravação): **robo**, **lancha**, **chave-prateada**, o par **farol-colorido** e **ilha-nevada**; e **mergulhador**, **veleiro**, **chave-dourada**, o par **farol-de-madeira** e **costa-rochosa** (nenhuma das duas é a combinação que o vídeo monta depois). De cada perfil, gravar um trecho de 3 a 4 segundos com a chave já recolhida: o personagem encosta na porta, o farol acende e o barco entra pela direita (ele chega em cerca de 1 segundo, por isso o trecho começa no momento em que o farol acende). Na edição, colocar os dois trechos em seguida no "olha quantas versões o seu jogo pode ter", antes de abrir o material. Conferir que nenhum trecho mostra o nome do perfil de teste. Depois, no "Olha aqui", abrir o Passo a passo do projeto na primeira página da surpresa e passar pelas galerias de personagens, cenários, barcos, chaves e faróis, por alguns segundos. Manter a galeria aberta até a fala da Debinha.

**Fala para ElevenLabs:**

```text
[curious] Sua missão deu certo! E a surpresa chegou: olha quantas versões o seu jogo pode ter: outro personagem, outro cenário, outro barco… Que combinação você vai criar?

[interested, animated voice] Olha aqui: estas são todas as opções. Estão no seu Passo a passo do projeto, e a lista de imagens do Estúdio também mostra um desenho pequeno de cada uma, com o mesmo nome. E o que você escolher fica no jogo.

[engaging, energetic, conversational voice] Eu vou mostrar com o pirata. Você troca o que quiser, e o que você gostou pode ficar como está.

[engaging, energetic, conversational voice] Vamos começar pelo personagem. Em Ao iniciar, deixe à vista o bloco Criar sprite personagem. No fim dele, depois de com imagem, clique no nome da imagem, como aventureiro, para abrir a lista. Se não achar o que quer, role a lista. Eu escolho o pirata. [interested, animated voice] Olha só: ele aparece no mesmo lugar e do mesmo tamanho, porque todos os personagens deste jogo foram desenhados assim.

[confident, clear, unhurried voice] Repare que o nome do sprite continua personagem, porque os outros blocos usam esse nome. Por isso, troque só a imagem e deixe o x, o y, a largura e a altura como estão.

[engaging, energetic, conversational voice] Ainda em Ao iniciar, o Criar sprite barco e o Criar sprite chave funcionam do mesmo jeito: clique no nome da imagem, como veleiro ou chave dourada. Eu vou escolher barco pirata e chave de estrela. A chave nova já aparece no jogo, e o barco novo você vê no teste, porque ele só chega quando o farol acende.

[engaging, energetic, conversational voice] O farol tem duas imagens, apagado e aceso, e as duas precisam ser do mesmo modelo. Por isso, se você trocar o farol, troque o par. No Criar sprite farol, clique no nome da imagem, como farol listrado apagado. Eu vou escolher farol de pedra apagado.

[engaging, energetic, conversational voice] Agora encontre Quando acontecer e o encontro do personagem com o farol. Dentro do então do Se está Trocar imagem do sprite farol para. Clique no nome da imagem, como farol listrado aceso, e escolha o mesmo modelo, aceso: farol de pedra aceso. [confident, clear, unhurried voice] Repare: de pedra nos dois lugares, apagado no começo e aceso na resposta com chave.

[engaging, energetic, conversational voice] Agora falta escolher o lugar onde a história acontece. Em Enquanto estiver rodando, dentro de A cada quadro do jogo, clique no nome do cenário, como praia tropical, no bloco Desenhar o cenário. Eu vou usar noite na ilha. [interested, animated voice] Olha só: a ponte e o mar continuam no mesmo lugar, e o caminho até o farol não muda.

[upbeat, encouraging voice] Agora teste a sua combinação! Clique em Atualizar e vá até a porta do farol sem a chave: ele continua apagado. Depois busque a chave e volte até a porta na mesma partida. [interested, animated voice] Olha só: o farol de pedra acende, e o barco pirata vem chegando!

[engaging, energetic, conversational voice] Agora o jogo tem a sua cara, e é com essa cara que ele vai para o Mural.

[reassuring, encouraging voice] Se algo não funcionou no seu jogo, volte aos blocos e confira se ficou assim: cada imagem está no bloco do mesmo tipo, e o farol tem o mesmo modelo nos dois blocos, apagado em Ao iniciar e aceso dentro do então. [reassuring, encouraging voice] Depois de corrigir, teste de novo.

[engaging, energetic, conversational voice] Funcionou? Clique em Verificar projeto. Se faltar alguma coisa, corrija os blocos e clique novamente.

[engaging, energetic, conversational voice] Quando aparecer Objetivo cumprido!, clique em Próxima parte.
```

**Recado na página (não gravar):** A surpresa chegou! Que combinação você vai criar? Troque o que quiser: personagem, barco, chave, farol ou cenário. Se trocar o farol, use o mesmo modelo apagado e aceso. Teste a combinação e clique em Verificar projeto. Quando aparecer Objetivo cumprido!, clique em Próxima parte.

## Parte 5. Escreva seus avisos

**Clipe:** `video-d3-farol-mensagens`

**Na tela:** mostrar **Criar variável aviso** em **Ao iniciar** e editar apenas o texto inicial. Em **Quando acontecer**, editar o texto do aviso da coleta e os textos em **senão** e **então** do farol. Fazer cada edição no momento da fala que a nomeia, apontando o bloco antes de clicar no texto; se **Quando acontecer** começar fora da tela, arrastar um espaço vazio entre os blocos. Exemplos curtos: início `Ache a chave da ilha!`; coleta `Chave na mão! Siga até o farol.`; sem chave `Opa! Busque a chave primeiro.`; vitória `Luz acesa! Lá vem o barco!`. Não editar temChave nem ganhou.

**Fala para ElevenLabs:**

```text
[engaging, energetic, conversational voice] Agora o jogo vai conversar com quem joga usando as suas palavras. São quatro avisos, e você muda só o texto de cada um. Tudo o que você escrever fica no seu jogo.

[interested, animated voice] Olha aqui: o primeiro fica em Ao iniciar, no bloco que cria a variável aviso. Clique no texto Encontre a chave e vá ao farol e escreva uma frase curta que diga o que fazer. Eu vou escrever: Ache a chave da ilha!

[engaging, energetic, conversational voice] Os outros três ficam em Quando acontecer. Se não estiver aparecendo, arraste um espaço vazio entre os blocos até encontrar. No encontro com a chave está o aviso da coleta. Eu escrevo: Chave na mão! Siga até o farol.

[engaging, energetic, conversational voice] No encontro com o farol, dentro do senão, está o aviso de quando falta a chave. Eu escrevo: Opa! Busque a chave primeiro. E dentro do então está a comemoração: Luz acesa! Lá vem o barco!

[engaging, energetic, conversational voice] Escreva os quatro do seu jeito, mas deixe os nomes das variáveis como estão.

[upbeat, encouraging voice] Agora teste! Clique em Atualizar. [interested, animated voice] Olha só: o aviso do começo já é o seu. Vá até a porta do farol sem a chave e leia o aviso de quando falta a chave. Depois busque a chave, leia o aviso da coleta e volte até a porta do farol para ver a comemoração.

[reassuring, encouraging voice] Se algo não funcionou no seu jogo, volte ao bloco daquele aviso: se a frase passou da tela, deixe mais curta; se o aviso não mudou, confira se você escreveu no texto daquele bloco. [reassuring, encouraging voice] Depois de corrigir, teste de novo. Quando terminar, clique em Próxima parte.
```

**Recado na página (não gravar):** Agora escreva os avisos do seu jeito! Mude o texto dos quatro avisos, teste o jogo e clique em Próxima parte.

## Parte 6. Como escolher um lugar para a chave

**Clipe:** `video-d3-posicao`

**Na tela:** Apresentar somente aqui as coordenadas x/y. Usar setas horizontais e verticais na mesma arte do jogo. Mostrar os dois controles disponíveis e a marca inicial, sem prescrever números, ordem de eixos ou uma sequência obrigatória. O alvo é opcional.

**Fala para ElevenLabs:**

```text
[engaging, energetic, conversational voice] Você pode escolher outro lugar para a chave na sua aventura. Para dizer esse lugar ao jogo, a gente usa dois números: x e y.

[engaging, energetic, conversational voice] O x escolhe o lugar na horizontal, para os lados. Um número menor leva para a esquerda; um maior leva para a direita.

[curious] E para subir ou descer?

[engaging, energetic, conversational voice] A gente muda o y, que escolhe o lugar na vertical. Na tela do jogo, a contagem começa em zero lá em cima e cresce para baixo. Por isso, um y maior leva para baixo, e um menor leva para cima.

[engaging, energetic, conversational voice] Agora explore os dois números na experiência. Mude um por vez e observe a chave. Você pode começar pelo x ou pelo y, ir e voltar, e escolher lugares bem diferentes. Se quiser, tente levar a chave até o alvo. Quando terminar, clique em Próxima parte.
```

**Substituições na edição kids:**

| ID | Personagem | Ocorrência | Âncora anterior | Fala exata substituída | Âncora posterior | Tags |
| --- | --- | --- | --- | --- | --- | --- |
| video-d3-posicao-K1 | Debinha | 1 | a gente usa dois números: x e y. O x escolhe o lugar na horizontal, para os lados. Um número menor leva para a esquerda; um maior leva para a direita. | E para subir ou descer? | A gente muda o y, que escolhe o lugar na vertical. Na tela do jogo, a contagem começa em zero lá em cima e cresce para baixo. Por isso, um y maior lev | [curious] |

No adulto, manter toda a fala da professora. No kids, silenciar apenas o trecho marcado e substituir pelo áudio do personagem, sem sobrepor vozes.

**Falas dentro da experiência:** `packages/core/src/learning/scene/discovery-guidance.ts`, exportadas em `zappy-etapas.json`. A orientação sugere comparações pelo estado observado; os controles permanecem livres.

**Recado na página (não gravar):** Sua vez! Mude um número de cada vez e repare para onde a chave vai. Quando terminar, clique em Próxima parte.

## Parte 7. Escolha onde fica a chave

**Clipe:** `video-d3-posicionar-chave`

**Na tela:** retomar o mesmo projeto, mantendo as escolhas anteriores. Mostrar a chave no lugar atual e deixar à vista **Ao iniciar → Criar sprite chave**. Apontar somente os campos x e y. Abrir o PDF do Passo a passo do projeto (ele fica na parte Seu passo a passo do projeto do Dia 1; o Dia 3 não tem o material) na página **Escolha onde fica a chave**, quadro **Três lugares para experimentar**: perto da trilha x 211/y 53; na parte de baixo x 160/y 250; perto da ponte x 280/y 160. Manter o projeto sem alterações durante a pergunta da Debinha.

**Fala para ElevenLabs:**

```text
[engaging, energetic, conversational voice] Lembra da experiência da parte anterior? O x mudava o lugar para os lados, e o y mudava para cima e para baixo. Agora você pode escolher onde fica a chave do seu jogo!

[engaging, energetic, conversational voice] Encontre Ao iniciar e deixe à vista Criar sprite chave. [interested, animated voice] Olha aqui: esse bloco também tem os campos x e y. São eles que escolhem onde a chave aparece quando a partida começa.

[engaging, energetic, conversational voice] No Passo a passo do projeto, você encontra três lugares para experimentar: perto da trilha, com x 211 e y 53; na parte de baixo, com x 160 e y 250; ou perto da ponte, com x 280 e y 160.

[curious] Preciso escolher um desses três lugares?

[engaging, energetic, conversational voice] Você pode escolher um deles ou experimentar outro. Eu vou colocar na parte de baixo. No campo x do bloco, troque o número pelo x do lugar que você escolheu, como 160; no campo y, coloque o y, como 250. Depois clique fora do campo e espere o jogo atualizar. Deixe o nome chave, a largura, a altura e a imagem como estão.

[interested, animated voice] Olha só: agora quem joga precisa buscar a chave em outro lugar! Repare se ela aparece inteira. Se ficar atrás do farol ou da faixa do aviso, quem joga não vai achar; se ficar em cima do personagem, ele já começa com a chave. Nesses casos, escolha um dos três lugares do Passo a passo do projeto.

[upbeat, encouraging voice] Agora teste o novo caminho. Clique em Atualizar, busque a chave no lugar escolhido e leve até a porta do farol. A luz deve acender, e o barco deve chegar.

[confident, clear, unhurried voice] Clique em Atualizar mais uma vez: a chave deve voltar ao lugar que você escolheu. Agora o jogo está do seu jeito! Clique em Enviar meu projeto e confirme em Enviar. Quando aparecer Projeto enviado!, clique em Próxima parte.
```

**Substituições na edição kids:**

| ID | Personagem | Ocorrência | Âncora anterior | Fala exata substituída | Âncora posterior | Tags |
| --- | --- | --- | --- | --- | --- | --- |
| video-d3-posicionar-chave-K1 | Debinha | 1 | perto da trilha, com x 211 e y 53; na parte de baixo, com x 160 e y 250; ou perto da ponte, com x 280 e y 160. | Preciso escolher um desses três lugares? | Você pode escolher um deles ou experimentar outro. Eu vou colocar na parte de baixo. No campo x do bloco, troque o | [curious] |

No adulto, manter toda a fala da professora. No kids, silenciar apenas o trecho marcado e substituir pelo áudio do personagem, sem sobrepor vozes.

**Recado na página (não gravar):** Agora escolha onde fica a chave! Mude o x e o y no bloco Criar sprite chave, como x 160 e y 250 para a parte de baixo. Teste o caminho até a chave e até a porta do farol. Depois clique em Enviar meu projeto e confirme em Enviar. Se mudar alguma coisa depois de enviar, clique em Enviar de novo e confirme em Reenviar. Quando aparecer Projeto enviado!, clique em Próxima parte.

## Parte 8. Seu jogo está pronto

**Clipe:** `video-d3-fecho`

**Na tela:** manter o mesmo Estúdio da parte anterior, com o projeto já enviado na parte 7. Apontar e abrir **Compartilhar**, no alto do Estúdio; na aula, o botão costuma aparecer só como ícone (uma setinha para cima saindo de uma bandeja), e a janela se chama **Compartilhar no Mural dos Criadores**. Mostrar o **Resumo do projeto** preenchido, sem editar; na aula, o título vem do curso e não aparece na janela. Clicar em **Gerar capa**, esperar a imagem e conferir. Não demonstrar upload nem outra capa.

**Fala para ElevenLabs:**

```text
[engaging, energetic, conversational voice] Seu jogo está pronto! Se quiser, você pode publicar no Mural para a sua família e os seus amigos jogarem. Você também pode clicar em Concluir aula e continuar a jornada sem publicar.

[engaging, energetic, conversational voice] Se escolher compartilhar, clique em Compartilhar, no alto do Estúdio. Aqui, ele pode aparecer só como uma setinha para cima. [confident, clear, unhurried voice] Repare que o resumo do projeto já vem preenchido, por isso pode deixar como está.

[engaging, energetic, conversational voice] Depois, clique em Gerar capa e espere a imagem aparecer. [interested, animated voice] Olha só: essa é a capa que vai apresentar o seu jogo!

[confident, clear, unhurried voice] Confira se a capa ficou boa e clique em Publicar. Agora espere a publicação terminar.

[pleased, lively voice] Seu jogo está no Mural! Agora você, a sua família e os seus amigos podem jogar o jogo que você criou.

[engaging, energetic, conversational voice] Para isso, clique em Copiar link de jogar e mande esse link para os seus amigos e a sua família. Quem receber pode jogar direto, até no celular.

[engaging, energetic, conversational voice] Depois de copiar o link, clique em Fechar e, por fim, em Concluir aula.
```

**Recado na página (não gravar):** Seu jogo está pronto! Se quiser, publique no Mural, copie o link de jogar e compartilhe com a sua família e os seus amigos. Se precisar, peça ajuda a um adulto. Você pode concluir a aula e continuar a jornada sem publicar.
