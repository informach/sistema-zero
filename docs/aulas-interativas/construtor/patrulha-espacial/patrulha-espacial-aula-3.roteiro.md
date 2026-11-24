# Roteiro de produção · Acertar no espaço

A professora grava o master integral. Na edição kids, Debinha substitui somente os parágrafos das tabelas de substituição, sem voz sobreposta. A edição adulta conserva o master. As falas prontas e o índice de edição são derivados desta fonte.

Montagem guiada completa no vídeo, um gesto por vez, deixando o destino visível antes de pegar a peça. As telas e o reinício são infraestrutura preparada; as partes ensinam as regras da partida. A personalização muda a aparência.

**Antes de gravar:** use uma sessão de ensaio sem envio anterior, carregue a entrada da parte e dê foco ao jogo antes das teclas. Mostre Objetivo cumprido! e Projeto enviado! somente quando aparecerem. Os tempos de tecla são estimativas a confirmar no Verificar plano. Gravação e publicação pendentes.

## Parte 1. Parecer junto ou encostar?

**Clipe:** `video-encontro-no-espaco`

**Na tela:** Na edição, ilustrar os dois carrinhos em alturas diferentes, sem mostrar a solução da experiência. No "Isso você vai testar na experiência", ampliar a experiência [ampliar experiência] e deixar a cena parada, com a chave e o personagem da Ilha; a fala de Zappy continua sendo a investigação original do encontro da chave. No "O Zappy vai te mostrando", apontar o Zappy ao lado da fala dele [apontar zappy]. No "Quando terminar", voltar ao tamanho da aula [voltar à aula]. No "clique em Próxima parte", clicar em **Próxima parte** [próxima parte].

**Fala para ElevenLabs:**

```text
[engaging, energetic, conversational voice] Imagine olhar uma ponte de cima. Um carrinho na ponte pode parecer em cima de outro carrinho que está na rua lá embaixo. Mas existe um espaço entre eles. Eles não bateram.

[interested, animated voice] No jogo em três dimensões, uma imagem também pode dar essa impressão. Para acertar um asteroide, o laser precisa encontrar o asteroide no espaço. Parecer que os desenhos se cruzaram na tela não basta.

[curious] Então duas coisas podem parecer juntas e ainda estar separadas?

[engaging, energetic, conversational voice] Podem! Vamos voltar à Ilha do Farol e observar a chave e o personagem de outro lugar. Isso você vai testar na experiência.

[upbeat, encouraging voice] O Zappy vai te mostrando o que investigar. Compare a separação e o encontro de verdade. Depois, você vai usar essa diferença para programar o acerto do laser na patrulha. Quando terminar, clique em Próxima parte.
```

**Substituições na edição kids:**

| ID | Personagem | Ocorrência | Âncora anterior | Fala exata substituída | Âncora posterior | Tags |
| --- | --- | --- | --- | --- | --- | --- |
| video-encontro-no-espaco-K1 | Debinha | 1 | um asteroide, o laser precisa encontrar o asteroide no espaço. Parecer que os desenhos se cruzaram na tela não basta. | Então duas coisas podem parecer juntas e ainda estar separadas? | Podem! Vamos voltar à Ilha do Farol e observar a chave e o personagem de outro lugar. Isso você vai testar na | [curious] |

No adulto, manter toda a fala da professora. No kids, silenciar apenas o trecho marcado e substituir pelo áudio do personagem, sem sobrepor vozes.

**Falas da experiência:** consulte `zappy-etapas.json`. O vídeo convida; os controles e as comparações continuam livres na bancada.

**Recado na página (não gravar):** Observe o encontro da chave com o personagem na Ilha. Descubra quando eles só parecem juntos e quando realmente encostam. Depois você vai levar essa ideia para o laser e o asteroide.

## Parte 2. Um encontro que acerta

**Clipe:** `video-acerto-do-laser`

**Na tela:** A parte começa com o Estúdio expandido e a entrada correspondente desta montagem [expandir estúdio]. No "Clique em Rodar de novo e pressione Enter. Alinhe a nave com uma pedra e dispare. O laser atravessa a pedra, porque o encontro ainda não tem uma resposta.", [rodar de novo] [tecla Enter] nota de gravação manual: alinhar a nave com uma pedra e disparar para mostrar a passagem sem retirada na etapa de entrada. No "Encontre Enquanto estiver rodando e A cada quadro da cena. Dentro do Se de jogando, procure Para cada objeto asteroide do grupo asteroides. Dentro dele, há Para cada objeto tiro do grupo tiros.", [arrastar até "Para cada objeto asteroide do grupo asteroides abaixo de Mover o grupo asteroides"] [apontar bloco "Para cada objeto tiro do grupo tiros"]. No "Deixe visível o espaço então do Se valor da variável alvoAtivo.", [apontar encaixe em "Se valor da variável alvoAtivo" no "então"]. No "Abra Programação e Lógica e Se. Pegue um Se e encaixe nesse então.", [abrir categoria Programação > Lógica & Se] [encaixar "Se" em "Se valor da variável alvoAtivo" no "então"]. No "O Se novo chega com x maior que zero. Segure essa pergunta pelo sinal de maior e leve até a lixeira.", [jogar na lixeira ">" em "Se dentro de Se valor da variável alvoAtivo"]. No "Deixe visível o espaço que ficou ao lado do Se novo. Abra Jogo 3D, Encostar e Encostar de novo. Pegue o objeto jogador está encostando em e coloque nesse espaço.", [apontar encaixe em "Se dentro de Se valor da variável alvoAtivo" no "Se"] [abrir categoria Jogo 3D > Encostar > Encostar] [encaixar "o objeto jogador está encostando em" em "Se dentro de Se valor da variável alvoAtivo" no "Se"]. No "No primeiro objeto da pergunta, escolha tiro. No segundo, escolha asteroide.", [trocar "jogador" por "tiro" em "o objeto jogador está encostando em"] [trocar "chao" por "asteroide" em "o objeto tiro está encostando em"]. No "Deixe à vista o então dessa pergunta de contato.", [apontar encaixe em "Se o objeto tiro está encostando em asteroide" no "então"]. No "Abra Jogo 3D e Grupos. Pegue Tirar o objeto inimigo do grupo e coloque nesse então. Escolha asteroide no objeto e asteroides no grupo.", [abrir categoria Jogo 3D > Grupos] [encaixar "Tirar o objeto inimigo do grupo" em "Se o objeto tiro está encostando em asteroide" no "então"] [trocar "inimigo" por "asteroide" em "Tirar o objeto inimigo do grupo"] [trocar "inimigos" por "asteroides" em "Tirar o objeto asteroide do grupo"]. No "Deixe o encaixe abaixo dessa retirada visível. Pegue outro Tirar o objeto inimigo do grupo e encaixe logo abaixo. Desta vez, escolha tiro no objeto e tiros no grupo.", [apontar abaixo de "Tirar o objeto asteroide do grupo asteroides"] [abrir categoria Jogo 3D > Grupos] [encaixar "Tirar o objeto inimigo do grupo" abaixo de "Tirar o objeto asteroide do grupo asteroides"] [trocar "inimigo" por "tiro" em "Tirar o objeto inimigo do grupo abaixo de Tirar o objeto asteroide"] [trocar "inimigos" por "tiros" em "Tirar o objeto tiro do grupo"]. No "Deixe visível o encaixe abaixo da retirada do tiro. Abra Programação e Variáveis. Pegue Alterar variável contador para e encaixe ali. No nome, escolha alvoAtivo.", [apontar abaixo de "Tirar o objeto tiro do grupo tiros"] [abrir categoria Programação > Variáveis] [encaixar "Alterar variável contador para" abaixo de "Tirar o objeto tiro do grupo tiros"] [trocar "contador" por "alvoAtivo" em "Alterar variável contador para"]. No "Deixe o número um desse bloco à vista. Abra Programação e Lógica e Se. Pegue verdadeiro, solte em cima do um e escolha falso.", [apontar bloco "Alterar variável alvoAtivo"] [abrir categoria Programação > Lógica & Se] [soltar "verdadeiro" em cima do "1" em "Alterar variável alvoAtivo"] [trocar "verdadeiro" por "falso" em "Alterar variável alvoAtivo"]. No "Deixe o encaixe abaixo de Alterar variável alvoAtivo visível. Abra Jogo 3D e Som. Encaixe Tocar o som pronto abaixo e conserve a opção moeda.", [apontar abaixo de "Alterar variável alvoAtivo"] [abrir categoria Jogo 3D > Som] [encaixar "Tocar o som pronto" abaixo de "Alterar variável alvoAtivo"]. No "Clique em Rodar de novo e pressione Enter. Espere uma pedra se aproximar. Mova a nave para ficar na direção dela e dispare. Quando o laser encosta, os dois desaparecem e você ouve o som do acerto.", [rodar de novo] [tecla Enter] nota de edição: alinhar a nave com uma pedra usando as setas e disparar um laser; marcar o momento do contato no Verificar plano. No "Atire também numa faixa sem pedra. Esse laser continua o caminho normalmente. O acerto só acontece quando os objetos encostam.", nota de edição: mover para uma faixa vazia com as setas e disparar [apontar prévia]. No "volte aos blocos e confira se ficou assim", deixar bem à vista os blocos conferidos [mostrar blocos "Se valor da variável alvoAtivo"].  No "Depois de corrigir, teste de novo", voltar a mão para o jogo [apontar prévia]. No "Clique em Verificar projeto", verificar [verificar projeto]. No "Quando aparecer Objetivo cumprido", voltar ao tamanho da aula [reduzir estúdio]. No "clique em Próxima parte", clicar em **Próxima parte** [próxima parte].

**Fala para ElevenLabs:**

```text
[upbeat, encouraging voice] Clique em Rodar de novo e pressione Enter. Alinhe a nave com uma pedra e dispare. O laser atravessa a pedra, porque o encontro ainda não tem uma resposta.

[engaging, energetic, conversational voice] Lembra da experiência da parte anterior? Na Ilha, parecer junto na imagem não bastava: os objetos precisavam encostar de verdade. Vamos usar essa pergunta no laser e na pedra e programar o que acontece no acerto.

[confident, clear, unhurried voice] Encontre Enquanto estiver rodando e A cada quadro da cena. Dentro do Se de jogando, procure Para cada objeto asteroide do grupo asteroides. Dentro dele, há Para cada objeto tiro do grupo tiros.

[engaging, energetic, conversational voice] Esse percurso preparado apresenta um par de cada vez: um asteroide e um tiro. O Se valor da variável alvoAtivo pergunta se essa pedra ainda pode ser acertada. Você vai colocar a pergunta do contato dentro dele.

[confident, clear, unhurried voice] Deixe visível o espaço então do Se valor da variável alvoAtivo.

[confident, clear, unhurried voice] Abra Programação e Lógica e Se. Pegue um Se e encaixe nesse então.

[confident, clear, unhurried voice] O Se novo chega com x maior que zero. Segure essa pergunta pelo sinal de maior e leve até a lixeira.

[confident, clear, unhurried voice] Deixe visível o espaço que ficou ao lado do Se novo. Abra Jogo 3D, Encostar e Encostar de novo. Pegue o objeto jogador está encostando em e coloque nesse espaço.

[confident, clear, unhurried voice] No primeiro objeto da pergunta, escolha tiro. No segundo, escolha asteroide.

[confident, clear, unhurried voice] Deixe à vista o então dessa pergunta de contato.

[confident, clear, unhurried voice] Abra Jogo 3D e Grupos. Pegue Tirar o objeto inimigo do grupo e coloque nesse então. Escolha asteroide no objeto e asteroides no grupo.

[confident, clear, unhurried voice] Deixe o encaixe abaixo dessa retirada visível. Pegue outro Tirar o objeto inimigo do grupo e encaixe logo abaixo. Desta vez, escolha tiro no objeto e tiros no grupo.

[engaging, energetic, conversational voice] Você está retirando só os dois objetos desse encontro. As outras pedras e os outros lasers continuam na rota.

[confident, clear, unhurried voice] Deixe visível o encaixe abaixo da retirada do tiro. Abra Programação e Variáveis. Pegue Alterar variável contador para e encaixe ali. No nome, escolha alvoAtivo.

[confident, clear, unhurried voice] Deixe o número um desse bloco à vista. Abra Programação e Lógica e Se. Pegue verdadeiro, solte em cima do um e escolha falso.

[interested, animated voice] A pedra que já foi acertada deixa de ser um alvo ativo. Assim, dois lasers muito próximos não contam a mesma pedra duas vezes. O percurso prepara a próxima pedra separadamente.

[confident, clear, unhurried voice] Deixe o encaixe abaixo de Alterar variável alvoAtivo visível. Abra Jogo 3D e Som. Encaixe Tocar o som pronto abaixo e conserve a opção moeda.

[upbeat, encouraging voice] Clique em Rodar de novo e pressione Enter. Espere uma pedra se aproximar. Mova a nave para ficar na direção dela e dispare. Quando o laser encosta, os dois desaparecem e você ouve o som do acerto.

[upbeat, encouraging voice] Atire também numa faixa sem pedra. Esse laser continua o caminho normalmente. O acerto só acontece quando os objetos encostam.

[reassuring, encouraging voice] Se algo não funcionou no seu jogo, volte aos blocos e confira se ficou assim: a pergunta de contato fica dentro de Se alvoAtivo, usa tiro e asteroide, retira os dois objetos dos grupos certos, muda alvoAtivo para falso e toca moeda.

[reassuring, encouraging voice] Depois de corrigir, teste de novo.

[engaging, energetic, conversational voice] Funcionou? Clique em Verificar projeto. Se faltar alguma coisa, corrija os blocos e clique novamente.

[engaging, energetic, conversational voice] Quando aparecer Objetivo cumprido!, clique em Próxima parte.
```

**Recado na página (não gravar):** Use a investigação da Ilha para programar um contato real. Dentro do par preparado, retire o tiro e a pedra envolvidos e marque esse alvo como consumido.

## Parte 3. Um lugar para guardar os pontos

**Clipe:** `video-contador-da-patrulha`

**Na tela:** A parte começa com o Estúdio expandido e a entrada correspondente desta montagem [expandir estúdio]. No "Encontre Ao iniciar e Criar variável velocidadeAsteroides. Deixe o encaixe logo abaixo dele à vista, antes da variável estado.", [arrastar até "Criar variável velocidadeAsteroides"] [apontar abaixo de "Criar variável velocidadeAsteroides"]. No "Abra Programação e Variáveis. Pegue Criar variável contador com valor e encaixe nesse lugar.", [abrir categoria Programação > Variáveis] [encaixar "Criar variável contador com valor" abaixo de "Criar variável velocidadeAsteroides"]. No "No nome contador, escreva pontos, tudo em letras minúsculas. Conserve o valor zero.", [trocar "contador" por "pontos" em "Criar variável contador com valor"]. No "Confira se ficou assim", deixar o trecho à vista [mostrar blocos "Criar variável pontos"]. No "Clique em Verificar projeto", verificar [verificar projeto]. No "Quando aparecer Objetivo cumprido", voltar ao tamanho da aula [reduzir estúdio]. No "clique em Próxima parte", clicar em **Próxima parte** [próxima parte].

**Fala para ElevenLabs:**

```text
[engaging, energetic, conversational voice] O laser já acerta as pedras. Para saber quantas você acertou, vamos guardar uma contagem, como na sua nave em duas dimensões. Ela começa sem acertos: zero.

[confident, clear, unhurried voice] Encontre Ao iniciar e Criar variável velocidadeAsteroides. Deixe o encaixe logo abaixo dele à vista, antes da variável estado.

[confident, clear, unhurried voice] Abra Programação e Variáveis. Pegue Criar variável contador com valor e encaixe nesse lugar.

[confident, clear, unhurried voice] No nome contador, escreva pontos, tudo em letras minúsculas. Conserve o valor zero.

[interested, animated voice] Toda vez que o jogo começa do início, pontos recebe zero. Esse bloco prepara a contagem. Ele ainda não escreve nada na tela e ainda não soma no acerto.

[reassuring, encouraging voice] Confira se ficou assim: Criar variável pontos com valor zero está em Ao iniciar, depois de velocidadeAsteroides.

[engaging, energetic, conversational voice] Agora clique em Verificar projeto. Se faltar alguma coisa, corrija os blocos e clique novamente.

[engaging, energetic, conversational voice] Quando aparecer Objetivo cumprido!, clique em Próxima parte.
```

**Recado na página (não gravar):** Crie pontos com valor 0 em Ao iniciar. O mostrador vem depois; nesta parte, confira onde o contador começa.

## Parte 4. Cada acerto soma um

**Clipe:** `video-um-ponto-por-acerto`

**Na tela:** A parte começa com o Estúdio expandido e a entrada correspondente desta montagem [expandir estúdio]. No "Em Enquanto estiver rodando, encontre Se o objeto tiro está encostando em asteroide. Dentro dele, deixe visível o encaixe depois de Tirar o objeto tiro e antes de Alterar variável alvoAtivo.", [arrastar até "Se o objeto tiro está encostando em asteroide"] [apontar abaixo de "Tirar o objeto tiro do grupo tiros"]. No "Abra Programação e Variáveis. Pegue Somar 1 em variável e encaixe nesse lugar.", [abrir categoria Programação > Variáveis] [encaixar "Somar 1 em variável" abaixo de "Tirar o objeto tiro do grupo tiros"]. No "Conserve a quantidade um. No nome contador, escolha pontos.", [trocar "contador" por "pontos" em "Somar 1 em variável"]. No "Confira se ficou assim", deixar o trecho à vista [mostrar blocos "Se o objeto tiro está encostando em asteroide"]. No "Clique em Verificar projeto", verificar [verificar projeto]. No "Quando aparecer Objetivo cumprido", voltar ao tamanho da aula [reduzir estúdio]. No "clique em Próxima parte", clicar em **Próxima parte** [próxima parte].

**Fala para ElevenLabs:**

```text
[engaging, energetic, conversational voice] Você criou o lugar que guarda a contagem. Agora ela precisa mudar no acontecimento certo: o contato que acerta uma pedra. Disparar sozinho não vale ponto.

[curious] E uma pedra que passa pela nave sem bater, conta como acerto?

[engaging, energetic, conversational voice] Não. O ponto pertence ao encontro do laser com a pedra. Vamos colocar a soma dentro dessa resposta.

[confident, clear, unhurried voice] Em Enquanto estiver rodando, encontre Se o objeto tiro está encostando em asteroide. Dentro dele, deixe visível o encaixe depois de Tirar o objeto tiro e antes de Alterar variável alvoAtivo.

[confident, clear, unhurried voice] Abra Programação e Variáveis. Pegue Somar 1 em variável e encaixe nesse lugar.

[confident, clear, unhurried voice] Conserve a quantidade um. No nome contador, escolha pontos.

[interested, animated voice] O encontro retira o par, soma um ponto e marca a pedra como consumida. Sem esse encontro, a soma não roda. O número ainda está guardado na variável; a próxima parte vai mostrá-lo na tela.

[reassuring, encouraging voice] Confira se ficou assim: Somar um em variável pontos está dentro do acerto, depois de tirar o tiro e antes de mudar alvoAtivo para falso.

[engaging, energetic, conversational voice] Agora clique em Verificar projeto. Se faltar alguma coisa, corrija os blocos e clique novamente.

[engaging, energetic, conversational voice] Quando aparecer Objetivo cumprido!, clique em Próxima parte.
```

**Substituições na edição kids:**

| ID | Personagem | Ocorrência | Âncora anterior | Fala exata substituída | Âncora posterior | Tags |
| --- | --- | --- | --- | --- | --- | --- |
| video-um-ponto-por-acerto-K1 | Debinha | 1 | Agora ela precisa mudar no acontecimento certo: o contato que acerta uma pedra. Disparar sozinho não vale ponto. | E uma pedra que passa pela nave sem bater, conta como acerto? | Não. O ponto pertence ao encontro do laser com a pedra. Vamos colocar a soma dentro dessa resposta. Em Enquanto estiver | [curious] |

No adulto, manter toda a fala da professora. No kids, silenciar apenas o trecho marcado e substituir pelo áudio do personagem, sem sobrepor vozes.

**Recado na página (não gravar):** Coloque a soma dentro do acerto real. Um tiro que passa no vazio não soma. Depois vamos ligar o mostrador à contagem.

## Parte 5. Veja a contagem na tela

**Clipe:** `video-placar-da-patrulha`

**Na tela:** A parte começa com o Estúdio expandido e a entrada correspondente desta montagem [expandir estúdio]. No "Em Ao iniciar, encontre Escrever na tela ↑ em cima, no meio, com o título Patrulha Espacial e Projeto inicial. Deixe o encaixe logo abaixo dele visível.", [arrastar até "Escrever na tela ↑ em cima, no meio"] [apontar abaixo de "Escrever na tela ↑ em cima, no meio"]. No "Abra Jogo 3D, Placar, vida e telas e Na tela. Pegue Escrever na tela e coloque nesse lugar.", [abrir categoria Jogo 3D > Placar, vida e telas > Na tela] [encaixar "Escrever na tela" abaixo de "Escrever na tela ↑ em cima, no meio"]. No "No lugar da tela, escolha em cima, à direita. No texto Pegue as estrelas, escreva Acertos, dois-pontos, espaço, zero, espaço, barra, espaço, vinte.", [trocar "↖ em cima, à esquerda" por "↗ em cima, à direita" em "Escrever na tela abaixo de Escrever na tela ↑ em cima, no meio"] [trocar "Pegue as estrelas!" por "Acertos: 0 / 20" em "Escrever na tela em cima, à direita"]. No "Volte ao contato do tiro com o asteroide. Deixe à vista o encaixe depois de Tocar o som pronto moeda, ainda dentro do então.", [arrastar até "Se o objeto tiro está encostando em asteroide"] [apontar abaixo de "Tocar o som pronto moeda"]. No "Abra de novo Jogo 3D, Placar, vida e telas e Na tela. Encaixe outro Escrever na tela nesse lugar. Escolha em cima, à direita.", [abrir categoria Jogo 3D > Placar, vida e telas > Na tela] [encaixar "Escrever na tela" abaixo de "Tocar o som pronto moeda"] [trocar "↖ em cima, à esquerda" por "↗ em cima, à direita" em "Escrever na tela dentro de Se o objeto tiro está encostando em asteroide"]. No "Deixe visível o texto Pegue as estrelas desse novo bloco. Abra Programação e Matemática. Pegue zero mais zero e solte em cima desse texto.", [apontar bloco "Escrever na tela dentro de Se o objeto tiro está encostando em asteroide"] [abrir categoria Programação > Matemática] [soltar "0 + 0" em cima do "Pegue as estrelas!" em "Escrever na tela dentro de Se o objeto tiro está encostando em asteroide"]. No "Deixe visível o zero da esquerda. Pegue outro zero mais zero em Matemática e solte em cima desse zero.", [apontar bloco "Escrever na tela dentro de Se o objeto tiro está encostando em asteroide"] [abrir categoria Programação > Matemática] nota de gravação manual: soltar "0 + 0" em cima do "0" em "lado esquerdo da conta do placar"; seguir o operando indicado na fala e conferir a expressão no desenho do caderno. No "No bloco de dentro, deixe visível o zero da esquerda. Abra Programação e Valores. Pegue texto e solte sobre esse zero. No lugar de Olá, escreva Acertos com dois-pontos e deixe um espaço depois.", [abrir categoria Programação > Valores] nota de gravação manual: soltar "texto" em cima do "0" em "lado esquerdo da conta interna do placar"; seguir o operando indicado na fala e conferir a expressão no desenho do caderno nota de gravação manual: trocar "Olá" por "Acertos: " em "texto da conta interna do placar"; seguir o operando indicado na fala e conferir a expressão no desenho do caderno. No "Deixe visível o zero à direita desse mesmo mais, o de dentro. Em Valores, pegue valor da variável e solte sobre esse zero. No x, escolha pontos.", [apontar bloco "Escrever na tela dentro de Se o objeto tiro está encostando em asteroide"] [abrir categoria Programação > Valores] nota de gravação manual: soltar "valor da variável" em cima do "0" em "lado direito da conta interna do placar"; seguir o operando indicado na fala e conferir a expressão no desenho do caderno nota de gravação manual: trocar "x" por "pontos" em "valor da variável dentro do placar"; seguir o operando indicado na fala e conferir a expressão no desenho do caderno. No "Falta o zero à direita do mais de fora. Deixe esse zero à vista. Em Valores, pegue outro texto e solte sobre ele. No lugar de Olá, escreva um espaço, barra, outro espaço e vinte.", [apontar bloco "Escrever na tela dentro de Se o objeto tiro está encostando em asteroide"] [abrir categoria Programação > Valores] nota de gravação manual: soltar "texto" em cima do "0" em "lado direito da conta externa do placar"; seguir o operando indicado na fala e conferir a expressão no desenho do caderno nota de gravação manual: trocar "Olá" por " / 20" em "texto à direita do placar"; seguir o operando indicado na fala e conferir a expressão no desenho do caderno. No "Clique em Rodar de novo. O canto de cima, à direita, começa em Acertos zero de vinte. Pressione Enter, alinhe a nave com uma pedra e acerte. O número passa para um.", [rodar de novo] [apontar prévia] [tecla Enter] nota de edição: alinhar e acertar uma pedra; conferir o placar real. No "Dispare numa faixa vazia. A contagem não muda. Acerte outra pedra: agora o placar soma mais um. Ele não deve subir sem um novo acerto.", nota de edição: mostrar um disparo no vazio e depois um novo acerto, sem alterar o projeto [apontar prévia]. No "volte aos blocos e confira se ficou assim", deixar bem à vista os blocos conferidos [mostrar blocos "Escrever na tela em cima, à direita", "Se o objeto tiro está encostando em asteroide"].  No "Depois de corrigir, teste de novo", voltar a mão para o jogo [apontar prévia]. No "Clique em Verificar projeto", verificar [verificar projeto]. No "Quando aparecer Objetivo cumprido!, clique em Enviar meu projeto", clicar em **Enviar meu projeto** [clicar "Enviar meu projeto"]. No "e confirme em Enviar", confirmar em **Enviar**, na janela que abriu [clicar "Enviar"]. No "Você fez cada acerto valer um ponto e aparecer no placar da sua patrulha!", voltar ao tamanho da aula [reduzir estúdio]. No "Quando aparecer Projeto enviado!, clique em Próxima parte", clicar em **Próxima parte** [próxima parte].

**Fala para ElevenLabs:**

```text
[engaging, energetic, conversational voice] A contagem já começa em zero e soma no acerto. Agora o piloto precisa enxergar esse número. Vamos preparar o aviso inicial e atualizar o mesmo lugar depois de cada acerto.

[confident, clear, unhurried voice] Em Ao iniciar, encontre Escrever na tela ↑ em cima, no meio, com o título Patrulha Espacial e Projeto inicial. Deixe o encaixe logo abaixo dele visível.

[confident, clear, unhurried voice] Abra Jogo 3D, Placar, vida e telas e Na tela. Pegue Escrever na tela e coloque nesse lugar.

[confident, clear, unhurried voice] No lugar da tela, escolha em cima, à direita. No texto Pegue as estrelas, escreva Acertos, dois-pontos, espaço, zero, espaço, barra, espaço, vinte.

[engaging, energetic, conversational voice] Esse é o aviso do começo. Agora vamos montar o aviso que acompanha os acertos.

[confident, clear, unhurried voice] Volte ao contato do tiro com o asteroide. Deixe à vista o encaixe depois de Tocar o som pronto moeda, ainda dentro do então.

[confident, clear, unhurried voice] Abra de novo Jogo 3D, Placar, vida e telas e Na tela. Encaixe outro Escrever na tela nesse lugar. Escolha em cima, à direita.

[confident, clear, unhurried voice] Deixe visível o texto Pegue as estrelas desse novo bloco. Abra Programação e Matemática. Pegue zero mais zero e solte em cima desse texto.

[engaging, energetic, conversational voice] Quando uma das partes é texto, o mais junta as partes da mensagem. Vamos juntar Acertos, o valor de pontos e a meta vinte.

[confident, clear, unhurried voice] Deixe visível o zero da esquerda. Pegue outro zero mais zero em Matemática e solte em cima desse zero.

[confident, clear, unhurried voice] No bloco de dentro, deixe visível o zero da esquerda. Abra Programação e Valores. Pegue texto e solte sobre esse zero. No lugar de Olá, escreva Acertos com dois-pontos e deixe um espaço depois.

[confident, clear, unhurried voice] Deixe visível o zero à direita desse mesmo mais, o de dentro. Em Valores, pegue valor da variável e solte sobre esse zero. No x, escolha pontos.

[confident, clear, unhurried voice] Falta o zero à direita do mais de fora. Deixe esse zero à vista. Em Valores, pegue outro texto e solte sobre ele. No lugar de Olá, escreva um espaço, barra, outro espaço e vinte.

[interested, animated voice] A mensagem junta Acertos, o número guardado em pontos e a meta vinte. Como esse aviso vem depois da soma, ele mostra a contagem já atualizada.

[upbeat, encouraging voice] Clique em Rodar de novo. O canto de cima, à direita, começa em Acertos zero de vinte. Pressione Enter, alinhe a nave com uma pedra e acerte. O número passa para um.

[upbeat, encouraging voice] Dispare numa faixa vazia. A contagem não muda. Acerte outra pedra: agora o placar soma mais um. Ele não deve subir sem um novo acerto.

[reassuring, encouraging voice] Se algo não funcionou no seu jogo, volte aos blocos e confira se ficou assim: o aviso inicial fica em Ao iniciar, o aviso com pontos fica dentro do acerto depois da soma, e os dois escrevem em cima, à direita.

[reassuring, encouraging voice] Depois de corrigir, teste de novo.

[engaging, energetic, conversational voice] Funcionou? Clique em Verificar projeto. Se faltar alguma coisa, corrija os blocos e clique novamente.

[engaging, energetic, conversational voice] Quando aparecer Objetivo cumprido!, clique em Enviar meu projeto e confirme em Enviar.

[pleased, lively voice] Você fez cada acerto valer um ponto e aparecer no placar da sua patrulha!

[engaging, energetic, conversational voice] Quando aparecer Projeto enviado!, clique em Próxima parte.
```

**Recado na página (não gravar):** Ligue a contagem ao aviso da tela. Confira o zero inicial, um acerto e um disparo no vazio. Depois envie sua patrulha com placar.

## Parte 6. O que faz o ponto valer?

Quiz sem vídeo, com resposta corrigida no servidor, explicação e nova tentativa.

**Recado na página (não gravar):** Pense nos testes que você acabou de fazer. Escolha uma resposta e leia a explicação. Você pode corrigir e tentar de novo. Quando terminar, clique em Concluir aula.
