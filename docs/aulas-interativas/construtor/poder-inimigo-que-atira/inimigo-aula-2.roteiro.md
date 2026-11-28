# Roteiro de produção · A inimiga na patrulha

A professora grava toda a fala principal. Copie o arquivo .elevenlabs.txt para gerar a voz integral. Na montagem kids, Dedé substitui somente as frases das tabelas de substituição, com a voz do arquivo .dede.elevenlabs.txt e sem voz sobreposta; o adulto usa o master integral. Montagem guiada completa no vídeo, um gesto por vez, com o destino à vista antes da peça. O jogo é de teclado: o robô dá o foco ao jogo (Rodar de novo no Estúdio, ou um toque no jogo pronto) antes das teclas. A inimiga atira a cada 1,5 s desde que o jogo abre; as esperas no Na tela são estimativas e se acertam no Verificar plano. Gravação e publicação desta revisão ainda não confirmadas.

**Antes de gravar:** use um perfil de ensaio sem envio nesta aula. Mostre o projeto da dimensão correta. Não preencha Recado no envio. Mostre Objetivo cumprido! e Projeto enviado! só quando esses estados aparecerem de verdade.

## Parte 1. A inimiga chegou à patrulha

**Clipe:** `video-abertura`

**Na tela:** Do "Oi" até o "em três dimensões", a tela mostra o título A inimiga na patrulha sobre a cena inicial do jogo pronto [na edição: título A inimiga na patrulha]. No "Clique no jogo e aperte Enter", ampliar o jogo pronto [ampliar jogo], clicar no meio do jogo [tocar jogo] e apertar Enter [tecla Enter]. No "Olha lá na frente", apontar a inimiga [apontar jogo 480 240]. No "No espaço em três dimensões", manter a cena parada. No "Agora é a sua vez", voltar ao tamanho da aula [voltar à aula]. No "Quando terminar, clique em Próxima parte", clicar em **Próxima parte** [próxima parte]. Não jogar a partida: ela é da criança.

**Fala para ElevenLabs:**

```text
[upbeat, welcoming voice] Oi! Na Aula 1, você programou a inimiga que atira no jogo 2D. Agora ela chegou à Patrulha Espacial, em três dimensões!

[engaging, energetic, conversational voice] Clique no jogo e aperte Enter para começar a patrulha.

[interested, animated voice] Olha lá na frente: a inimiga vai de um lado para o outro e atira na direção da nave.

[curious] No espaço em três dimensões, de onde vêm os tiros?

[engaging, energetic, conversational voice] Isso eu deixo para você descobrir.

[upbeat, encouraging voice] Agora é a sua vez: desvie dos tiros. Quando terminar, clique em Próxima parte.
```

**Substituições na edição kids:**

| ID | Personagem | Ocorrência | Âncora anterior | Fala exata substituída | Âncora posterior | Tags |
| --- | --- | --- | --- | --- | --- | --- |
| video-abertura-K1 | Dedé | 1 | Enter para começar a patrulha. Olha lá na frente: a inimiga vai de um lado para o outro e atira na direção da nave. | No espaço em três dimensões, de onde vêm os tiros? | Isso eu deixo para você descobrir. Agora é a sua vez: desvie dos tiros. Quando terminar, clique em Próxima parte. | [curious] |

No adulto, manter toda a fala da professora. No kids, silenciar apenas o trecho marcado e substituir pelo áudio do personagem, sem sobrepor vozes.

**Recado na página (não gravar):** Sua vez! Jogue a versão pronta: desvie dos tiros da inimiga na patrulha. Quando terminar, clique em Próxima parte.

## Parte 2. O relógio dos tiros

**Clipe:** `video-tiro`

**Na tela:** A parte começa com o Estúdio expandido e a entrada correspondente desta montagem [expandir estúdio]. No "Na patrulha, a inimiga já anda de um lado para o outro, e os tiros do grupo tirosInimigos já vêm na direção da nave. Falta o relógio.", [apontar prévia]. No "Encontre a área Enquanto estiver rodando. Se ela não estiver aparecendo, arraste um espaço vazio entre os blocos até ela aparecer.", [arrastar até "Enquanto estiver rodando"]. No "Logo abaixo do relógio A cada 1.5 segundos, o dos asteroides, encaixe outro A cada segundos, de Jogo 3D, Tempo e sorteio e Tempo, e troque o 2 por 1.5.", [arrastar até "A cada 1.5 segundos"] [abrir categoria Jogo 3D > Tempo e sorteio > Tempo] [encaixar "A cada 2 segundos" abaixo de "A cada 1.5 segundos"] [trocar "2" por "1.5" em "A cada 2 segundos"]. No "Dentro de o relógio da inimiga, deixe à vista o espaço ao lado de fazer.", [apontar encaixe em "A cada 1.5 segundos abaixo de A cada 1.5 segundos"]. No "Abra Programação e depois Lógica e Se.", [abrir categoria Programação > Lógica & Se]. No "Pegue o bloco Se e solte nesse espaço ao lado de fazer.", [encaixar "Se" em "A cada 1.5 segundos abaixo de A cada 1.5 segundos"]. No "Clique no x da pergunta e escolha estado.", [trocar "x" por "estado" em "Se valor da variável x > 0 dentro de A cada 1.5 segundos abaixo de A cada 1.5 segundos"]. No "Clique no sinal de maior e escolha o sinal de igual. Na lista existem dois iguais: escolha o que não tem a palavra solto do lado.", [trocar ">" por "=" em "Se valor da variável estado > 0 dentro de A cada 1.5 segundos abaixo de A cada 1.5 segundos"]. No "Deixe à vista o zero que está do lado direito da pergunta.", [apontar bloco "Se valor da variável estado = 0 dentro de A cada 1.5 segundos abaixo de A cada 1.5 segundos"]. No "Abra Programação, depois Valores, e pegue o bloco texto.", [abrir categoria Programação > Valores]. No "Solte o bloco texto em cima desse zero.", [soltar "texto" em cima do "0" em "Se valor da variável estado = 0 dentro de A cada 1.5 segundos abaixo de A cada 1.5 segundos"]. No "Clique na palavra Olá e escreva jogando, tudo em letras minúsculas.", [trocar "Olá" por "jogando" em "Se valor da variável estado = texto Olá dentro de A cada 1.5 segundos abaixo de A cada 1.5 segundos"]. No "No então, encaixe Criar uma cópia, de Jogo 3D e Grupos. Escolha moldeTiroInimigo e o grupo tirosInimigos. Na posição: x 0, y 1 e z menos 22.", [abrir categoria Jogo 3D > Grupos] [encaixar "Criar uma cópia" em "Se valor da variável estado dentro de A cada 1.5 segundos abaixo de A cada 1.5 segundos" no "então"] [trocar "molde" por "moldeTiroInimigo" em "Criar uma cópia dentro de A cada 1.5 segundos abaixo de A cada 1.5 segundos"] [trocar "inimigos" por "tirosInimigos" em "Criar uma cópia dentro de A cada 1.5 segundos abaixo de A cada 1.5 segundos"] [trocar "0" por "1" em "Criar uma cópia de moldeTiroInimigo"] [trocar "0" por "-22" em "Criar uma cópia de moldeTiroInimigo"]. No "Clique em Rodar de novo e aperte Enter. A cada um segundo e meio, um tiro vem pelo meio, mesmo com a inimiga longe.", [rodar de novo] [tecla Enter] [aguardar 4 s]. No "volte aos blocos e confira se ficou assim", deixar bem à vista os blocos conferidos [mostrar blocos "A cada 1.5 segundos abaixo de A cada 1.5 segundos"].  No "Depois de corrigir, teste de novo", voltar a mão para o jogo [apontar prévia]. No "Clique em Verificar projeto", verificar [verificar projeto]. No "Quando aparecer Objetivo cumprido", voltar ao tamanho da aula [reduzir estúdio]. No "clique em Próxima parte", clicar em **Próxima parte** [próxima parte].

**Fala para ElevenLabs:**

```text
[engaging, energetic, conversational voice] Na patrulha, a inimiga já anda de um lado para o outro, e os tiros do grupo tirosInimigos já vêm na direção da nave. Falta o relógio.

[confident, clear, unhurried voice] Encontre a área Enquanto estiver rodando. Se ela não estiver aparecendo, arraste um espaço vazio entre os blocos até ela aparecer.

[confident, clear, unhurried voice] Logo abaixo do relógio A cada 1.5 segundos, o dos asteroides, encaixe outro A cada segundos, de Jogo 3D, Tempo e sorteio e Tempo, e troque o 2 por 1.5.

[engaging, energetic, conversational voice] Agora a guarda que você já conhece: estado é igual a jogando?

[confident, clear, unhurried voice] Dentro de o relógio da inimiga, deixe à vista o espaço ao lado de fazer.

[confident, clear, unhurried voice] Abra Programação e depois Lógica e Se.

[confident, clear, unhurried voice] Pegue o bloco Se e solte nesse espaço ao lado de fazer.

[engaging, energetic, conversational voice] A pergunta que veio no bloco é x maior que zero. Vamos conferir o momento da partida.

[confident, clear, unhurried voice] Clique no x da pergunta e escolha estado.

[confident, clear, unhurried voice] Clique no sinal de maior e escolha o sinal de igual. Na lista existem dois iguais: escolha o que não tem a palavra solto do lado.

[confident, clear, unhurried voice] Deixe à vista o zero que está do lado direito da pergunta.

[confident, clear, unhurried voice] Abra Programação, depois Valores, e pegue o bloco texto.

[confident, clear, unhurried voice] Solte o bloco texto em cima desse zero.

[confident, clear, unhurried voice] Clique na palavra Olá e escreva jogando, tudo em letras minúsculas.

[engaging, energetic, conversational voice] Agora o Se pergunta se estado é igual a jogando. As ações vão no então dessa pergunta.

[confident, clear, unhurried voice] No então, encaixe Criar uma cópia, de Jogo 3D e Grupos. Escolha moldeTiroInimigo e o grupo tirosInimigos. Na posição: x 0, y 1 e z menos 22.

[upbeat, encouraging voice] Clique em Rodar de novo e aperte Enter. A cada um segundo e meio, um tiro vem pelo meio, mesmo com a inimiga longe.

[curious] Por que o tiro vem pelo meio, se a inimiga está longe?

[engaging, energetic, conversational voice] Porque o x da cópia é zero, um número fixo. Na próxima parte, o tiro vai sair de onde a inimiga está.

[reassuring, encouraging voice] Se algo não funcionou no seu jogo, volte aos blocos e confira se ficou assim: o relógio da inimiga cria a cópia de moldeTiroInimigo no grupo tirosInimigos só na partida, em z menos 22.

[reassuring, encouraging voice] Depois de corrigir, teste de novo.

[engaging, energetic, conversational voice] Funcionou? Clique em Verificar projeto. Se faltar alguma coisa, corrija os blocos e clique novamente.

[engaging, energetic, conversational voice] Quando aparecer Objetivo cumprido!, clique em Próxima parte.
```

**Substituições na edição kids:**

| ID | Personagem | Ocorrência | Âncora anterior | Fala exata substituída | Âncora posterior | Tags |
| --- | --- | --- | --- | --- | --- | --- |
| video-tiro-K1 | Dedé | 1 | 22. Clique em Rodar de novo e aperte Enter. A cada um segundo e meio, um tiro vem pelo meio, mesmo com a inimiga longe. | Por que o tiro vem pelo meio, se a inimiga está longe? | Porque o x da cópia é zero, um número fixo. Na próxima parte, o tiro vai sair de onde a inimiga está. Se algo não | [curious] |

No adulto, manter toda a fala da professora. No kids, silenciar apenas o trecho marcado e substituir pelo áudio do personagem, sem sobrepor vozes.

**Recado na página (não gravar):** Sua vez! Crie o relógio da inimiga: a cada 1,5 segundo, só na partida, uma cópia de moldeTiroInimigo no grupo tirosInimigos, em x 0, y 1 e z menos 22. Teste no seu jogo e clique em Verificar projeto. Quando aparecer Objetivo cumprido!, clique em Próxima parte.

## Parte 3. O tiro sai da inimiga

**Clipe:** `video-origem`

**Na tela:** A parte começa com o Estúdio expandido e a entrada correspondente desta montagem [expandir estúdio]. No "No x da cópia do tiro, solte posição x do objeto, de Jogo 3D, Objetos e Posição, giro e tamanho, e escolha inimiga.", [arrastar até "Criar uma cópia de moldeTiroInimigo"] [abrir categoria Jogo 3D > Objetos > Posição, giro e tamanho] [soltar "posição x do objeto" em cima do "0" em "Criar uma cópia de moldeTiroInimigo"] [trocar "jogador" por "inimiga" em "posição x do objeto dentro de Criar uma cópia de moldeTiroInimigo"]. No "Clique em Rodar de novo e aperte Enter. Agora os tiros saem da frente da inimiga, onde ela estiver.", [rodar de novo] [tecla Enter] [aguardar 4 s]. No "volte aos blocos e confira se ficou assim", deixar bem à vista os blocos conferidos [mostrar blocos "Criar uma cópia de moldeTiroInimigo"].  No "Depois de corrigir, teste de novo", voltar a mão para o jogo [apontar prévia]. No "Clique em Verificar projeto", verificar [verificar projeto]. No "Quando aparecer Objetivo cumprido", voltar ao tamanho da aula [reduzir estúdio]. No "clique em Próxima parte", clicar em **Próxima parte** [próxima parte].

**Fala para ElevenLabs:**

```text
[engaging, energetic, conversational voice] Como no jogo 2D, o tiro precisa nascer onde a inimiga está. No 3D, basta o x: o y e o z já ficam na frente dela.

[confident, clear, unhurried voice] No x da cópia do tiro, solte posição x do objeto, de Jogo 3D, Objetos e Posição, giro e tamanho, e escolha inimiga.

[upbeat, encouraging voice] Clique em Rodar de novo e aperte Enter. Agora os tiros saem da frente da inimiga, onde ela estiver.

[reassuring, encouraging voice] Se algo não funcionou no seu jogo, volte aos blocos e confira se ficou assim: o x da cópia do tiro é a posição x do objeto inimiga.

[reassuring, encouraging voice] Depois de corrigir, teste de novo.

[engaging, energetic, conversational voice] Funcionou? Clique em Verificar projeto. Se faltar alguma coisa, corrija os blocos e clique novamente.

[engaging, energetic, conversational voice] Quando aparecer Objetivo cumprido!, clique em Próxima parte.
```

**Recado na página (não gravar):** Sua vez! Faça o tiro sair da inimiga: no x da cópia, a posição x do objeto inimiga. Teste no seu jogo e clique em Verificar projeto. Quando aparecer Objetivo cumprido!, clique em Próxima parte.

## Parte 4. O tiro machuca a nave

**Clipe:** `video-dano`

**Na tela:** A parte começa com o Estúdio expandido e a entrada correspondente desta montagem [expandir estúdio]. No "Encontre a área Quando acontecer. Se ela não estiver aparecendo, arraste um espaço vazio entre os blocos até ela aparecer.", [arrastar até "Quando acontecer"]. No "Logo abaixo do encontro Quando nave encostar em algum do grupo asteroides, encaixe Quando heroi encostar em algum do grupo. Escolha nave, tirosInimigos e chame o tiro de tiroQueAcertou.", [arrastar até "Quando nave encostar em algum do grupo asteroides"] [abrir categoria Jogo 3D > Encostar > Encostar] [encaixar "Quando heroi encostar em algum do grupo" abaixo de "Quando nave encostar em algum do grupo asteroides"] [trocar "heroi" por "nave" em "Quando heroi encostar em algum do grupo"] [trocar "estrelas" por "tirosInimigos" em "Quando nave encostar em algum do grupo"] [trocar "item" por "tiroQueAcertou" em "Quando nave encostar em algum do grupo tirosInimigos"]. No "Dentro de o encontro da nave com os tiros inimigos, deixe à vista o espaço ao lado de fazer.", [apontar encaixe em "Quando nave encostar em algum do grupo tirosInimigos"]. No "Abra Programação e depois Lógica e Se.", [abrir categoria Programação > Lógica & Se]. No "Pegue o bloco Se e solte nesse espaço ao lado de fazer.", [encaixar "Se" em "Quando nave encostar em algum do grupo tirosInimigos"]. No "Clique no x da pergunta e escolha estado.", [trocar "x" por "estado" em "Se valor da variável x > 0 dentro de Quando nave encostar em algum do grupo tirosInimigos"]. No "Clique no sinal de maior e escolha o sinal de igual. Na lista existem dois iguais: escolha o que não tem a palavra solto do lado.", [trocar ">" por "=" em "Se valor da variável estado > 0 dentro de Quando nave encostar em algum do grupo tirosInimigos"]. No "Deixe à vista o zero que está do lado direito da pergunta.", [apontar bloco "Se valor da variável estado = 0 dentro de Quando nave encostar em algum do grupo tirosInimigos"]. No "Abra Programação, depois Valores, e pegue o bloco texto.", [abrir categoria Programação > Valores]. No "Solte o bloco texto em cima desse zero.", [soltar "texto" em cima do "0" em "Se valor da variável estado = 0 dentro de Quando nave encostar em algum do grupo tirosInimigos"]. No "Clique na palavra Olá e escreva jogando, tudo em letras minúsculas.", [trocar "Olá" por "jogando" em "Se valor da variável estado = texto Olá dentro de Quando nave encostar em algum do grupo tirosInimigos"]. No "No então: Tirar o objeto do grupo, com tiroQueAcertou e tirosInimigos, e Machucar nave tirando 1 de vida.", [abrir categoria Jogo 3D > Grupos] [encaixar "Tirar o objeto inimigo do grupo" em "Se valor da variável estado dentro de Quando nave encostar em algum do grupo tirosInimigos" no "então"] [trocar "inimigo" por "tiroQueAcertou" em "Tirar o objeto inimigo do grupo"] [trocar "asteroides" por "tirosInimigos" em "Tirar o objeto tiroQueAcertou do grupo"] [abrir categoria Jogo 3D > Placar, vida e telas > Vida] [encaixar "Machucar heroi tirando 1 de vida" abaixo de "Tirar o objeto tiroQueAcertou do grupo tirosInimigos"] [trocar "heroi" por "nave" em "Machucar heroi tirando 1 de vida"]. No "Clique em Rodar de novo, aperte Enter e deixe um tiro encostar na nave: ele some, e a nave perde uma vida.", [rodar de novo] [tecla Enter] [aguardar 5 s]. No "volte aos blocos e confira se ficou assim", deixar bem à vista os blocos conferidos [mostrar blocos "Quando nave encostar em algum do grupo tirosInimigos"].  No "Depois de corrigir, teste de novo", voltar a mão para o jogo [apontar prévia]. No "Clique em Verificar projeto", verificar [verificar projeto]. No "Quando aparecer Objetivo cumprido", voltar ao tamanho da aula [reduzir estúdio]. No "clique em Próxima parte", clicar em **Próxima parte** [próxima parte].

**Fala para ElevenLabs:**

```text
[engaging, energetic, conversational voice] Agora o encontro, como o das pedras: o tiro que encosta na nave sai e tira uma vida.

[confident, clear, unhurried voice] Encontre a área Quando acontecer. Se ela não estiver aparecendo, arraste um espaço vazio entre os blocos até ela aparecer.

[confident, clear, unhurried voice] Logo abaixo do encontro Quando nave encostar em algum do grupo asteroides, encaixe Quando heroi encostar em algum do grupo. Escolha nave, tirosInimigos e chame o tiro de tiroQueAcertou.

[engaging, energetic, conversational voice] Agora a guarda que você já conhece: estado é igual a jogando?

[confident, clear, unhurried voice] Dentro de o encontro da nave com os tiros inimigos, deixe à vista o espaço ao lado de fazer.

[confident, clear, unhurried voice] Abra Programação e depois Lógica e Se.

[confident, clear, unhurried voice] Pegue o bloco Se e solte nesse espaço ao lado de fazer.

[engaging, energetic, conversational voice] A pergunta que veio no bloco é x maior que zero. Vamos conferir o momento da partida.

[confident, clear, unhurried voice] Clique no x da pergunta e escolha estado.

[confident, clear, unhurried voice] Clique no sinal de maior e escolha o sinal de igual. Na lista existem dois iguais: escolha o que não tem a palavra solto do lado.

[confident, clear, unhurried voice] Deixe à vista o zero que está do lado direito da pergunta.

[confident, clear, unhurried voice] Abra Programação, depois Valores, e pegue o bloco texto.

[confident, clear, unhurried voice] Solte o bloco texto em cima desse zero.

[confident, clear, unhurried voice] Clique na palavra Olá e escreva jogando, tudo em letras minúsculas.

[engaging, energetic, conversational voice] Agora o Se pergunta se estado é igual a jogando. As ações vão no então dessa pergunta.

[confident, clear, unhurried voice] No então: Tirar o objeto do grupo, com tiroQueAcertou e tirosInimigos, e Machucar nave tirando 1 de vida.

[upbeat, encouraging voice] Clique em Rodar de novo, aperte Enter e deixe um tiro encostar na nave: ele some, e a nave perde uma vida.

[reassuring, encouraging voice] Se algo não funcionou no seu jogo, volte aos blocos e confira se ficou assim: o encontro da nave com tirosInimigos, com a guarda da partida, tira o tiro do grupo e machuca a nave.

[reassuring, encouraging voice] Depois de corrigir, teste de novo.

[engaging, energetic, conversational voice] Funcionou? Clique em Verificar projeto. Se faltar alguma coisa, corrija os blocos e clique novamente.

[engaging, energetic, conversational voice] Quando aparecer Objetivo cumprido!, clique em Próxima parte.
```

**Recado na página (não gravar):** Sua vez! Programe o dano: quando a nave encosta num tiro inimigo durante a partida, o tiro sai do grupo e a nave perde uma vida. Teste no seu jogo e clique em Verificar projeto. Quando aparecer Objetivo cumprido!, clique em Próxima parte.

## Parte 5. Os tiros saem da tela

**Clipe:** `video-limpeza`

**Na tela:** A parte começa com o Estúdio expandido e a entrada correspondente desta montagem [expandir estúdio]. No "Logo abaixo de No grupo asteroides, tirar quem saiu, encaixe outro, de Jogo 3D e Grupos. Escolha tirosInimigos, conserve o z e use menos 36 e 6.", [arrastar até "No grupo asteroides, tirar quem saiu"] [abrir categoria Jogo 3D > Grupos] [encaixar "No grupo inimigos, tirar quem saiu" abaixo de "No grupo asteroides, tirar quem saiu"] [trocar "inimigos" por "tirosInimigos" em "No grupo inimigos, tirar quem saiu"] [trocar "-20" por "-36" em "No grupo tirosInimigos, tirar quem saiu"] [trocar "20" por "6" em "No grupo tirosInimigos, tirar quem saiu"]. No "Clique em Rodar de novo e aperte Enter. Os tiros passam e saem do grupo.", [rodar de novo] [tecla Enter] [aguardar 5 s]. No "volte aos blocos e confira se ficou assim", deixar bem à vista os blocos conferidos [mostrar blocos "No grupo asteroides, tirar quem saiu"].  No "Depois de corrigir, teste de novo", voltar a mão para o jogo [apontar prévia]. No "Clique em Verificar projeto", verificar [verificar projeto]. No "Quando aparecer Objetivo cumprido!, clique em Enviar meu projeto", clicar em **Enviar meu projeto** [clicar "Enviar meu projeto"]. No "e confirme em Enviar", confirmar em **Enviar**, na janela que abriu [clicar "Enviar"]. No "Pronto, a patrulha também tem inimiga: ela atira de onde está, os tiros machucam e saem!", voltar ao tamanho da aula [reduzir estúdio]. No "Quando aparecer Projeto enviado!, clique em Próxima parte", clicar em **Próxima parte** [próxima parte].

**Fala para ElevenLabs:**

```text
[engaging, energetic, conversational voice] Os tiros que passam pela nave continuam no grupo, atrás da câmera. Eles precisam sair, como as pedras.

[confident, clear, unhurried voice] Logo abaixo de No grupo asteroides, tirar quem saiu, encaixe outro, de Jogo 3D e Grupos. Escolha tirosInimigos, conserve o z e use menos 36 e 6.

[upbeat, encouraging voice] Clique em Rodar de novo e aperte Enter. Os tiros passam e saem do grupo.

[reassuring, encouraging voice] Se algo não funcionou no seu jogo, volte aos blocos e confira se ficou assim: no quadro, o grupo tirosInimigos tira quem sai, no z, de menos 36 até 6.

[reassuring, encouraging voice] Depois de corrigir, teste de novo.

[engaging, energetic, conversational voice] Funcionou? Clique em Verificar projeto. Se faltar alguma coisa, corrija os blocos e clique novamente.

[engaging, energetic, conversational voice] Quando aparecer Objetivo cumprido!, clique em Enviar meu projeto e confirme em Enviar.

[pleased, lively voice] Pronto, a patrulha também tem inimiga: ela atira de onde está, os tiros machucam e saem!

[engaging, energetic, conversational voice] Depois do envio, ainda tem duas perguntas para você pensar na inimiga. Quando aparecer Projeto enviado!, clique em Próxima parte.
```

**Recado na página (não gravar):** Hora de conferir e enviar! Limpe os tiros: no quadro, No grupo tirosInimigos, tirar quem saiu, no z, de menos 36 até 6. Clique em Verificar projeto, envie o projeto e confirme em Enviar. Quando aparecer Projeto enviado!, clique em Próxima parte.

## Parte 6. Pense na inimiga da patrulha

Quiz sem vídeo: escolha, demonstração, explicação e nova tentativa. Resposta corrigida pelo servidor.

**Recado na página (não gravar):** Escolha uma resposta e clique em Ver o que acontece ou, nas perguntas sem cena, em Responder. Observe a cena e a explicação. Você pode tentar de novo. Quando terminar, clique em Concluir aula.
