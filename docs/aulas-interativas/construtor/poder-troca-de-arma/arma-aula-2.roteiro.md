# Roteiro de produção · A troca de arma na patrulha

A professora grava toda a fala principal. Copie o arquivo .elevenlabs.txt para gerar a voz integral. Na montagem kids, Dedé substitui somente as frases das tabelas de substituição, com a voz do arquivo .dede.elevenlabs.txt e sem voz sobreposta; o adulto usa o master integral. Montagem guiada completa no vídeo, um gesto por vez, com o destino à vista antes da peça. O jogo é de teclado: o robô dá o foco ao jogo (Rodar de novo no Estúdio, ou um toque no jogo pronto) antes das teclas. O item nasce a cada 4 s desde que o jogo abre, pela esquerda no 3D: o robô leva a nave à borda antes de esperar; as esperas no Na tela são estimativas e se acertam no Verificar plano. Gravação e publicação desta revisão ainda não confirmadas.

**Antes de gravar:** use um perfil de ensaio sem envio nesta aula. Mostre o projeto da dimensão correta. Não preencha Recado no envio. Mostre Objetivo cumprido! e Projeto enviado! só quando esses estados aparecerem de verdade.

## Parte 1. A troca chegou à patrulha

**Clipe:** `video-abertura`

**Na tela:** Do "Oi" até o "em três dimensões", a tela mostra o título A troca de arma na patrulha sobre a cena inicial do jogo pronto [na edição: título A troca de arma na patrulha]. No "Clique no jogo e aperte Enter", ampliar o jogo pronto [ampliar jogo], clicar no meio do jogo [tocar jogo] e apertar Enter [tecla Enter]. No "Olha o texto Arma", apontar o texto [apontar jogo 70 24]. No "No espaço em três dimensões", manter a cena parada. No "Agora é a sua vez", voltar ao tamanho da aula [voltar à aula]. No "Quando terminar, clique em Próxima parte", clicar em **Próxima parte** [próxima parte]. Não pegar o item: a partida é da criança.

**Fala para ElevenLabs:**

```text
[upbeat, welcoming voice] Oi! Na Aula 1, você programou a troca de arma no jogo 2D. Agora ela chegou à Patrulha Espacial, em três dimensões!

[engaging, energetic, conversational voice] Clique no jogo e aperte Enter para começar a patrulha.

[interested, animated voice] Olha o texto Arma, no alto à esquerda: ele mostra laser. O item de plasma vem pela esquerda.

[curious] No espaço em três dimensões, a placa da arma muda sozinha?

[engaging, energetic, conversational voice] Isso eu deixo para você descobrir.

[upbeat, encouraging voice] Agora é a sua vez: pegue o item e troque de arma. Quando terminar, clique em Próxima parte.
```

**Substituições na edição kids:**

| ID | Personagem | Ocorrência | Âncora anterior | Fala exata substituída | Âncora posterior | Tags |
| --- | --- | --- | --- | --- | --- | --- |
| video-abertura-K1 | Dedé | 1 | para começar a patrulha. Olha o texto Arma, no alto à esquerda: ele mostra laser. O item de plasma vem pela esquerda. | No espaço em três dimensões, a placa da arma muda sozinha? | Isso eu deixo para você descobrir. Agora é a sua vez: pegue o item e troque de arma. Quando terminar, clique em Próxima | [curious] |

No adulto, manter toda a fala da professora. No kids, silenciar apenas o trecho marcado e substituir pelo áudio do personagem, sem sobrepor vozes.

**Recado na página (não gravar):** Sua vez! Jogue a versão pronta: leve a nave para a esquerda, pegue o item, aperte E e dispare. Quando terminar, clique em Próxima parte.

## Parte 2. O item vem pela esquerda

**Clipe:** `video-item`

**Na tela:** A parte começa com o Estúdio expandido e a entrada correspondente desta montagem [expandir estúdio]. No "Na patrulha, a troca de arma já tem o molde do item, o grupo itensPlasma, o movimento dos itens e as variáveis. Falta o relógio do item e o encontro que libera o plasma.", [apontar prévia]. No "Encontre a área Enquanto estiver rodando. Se ela não estiver aparecendo, arraste um espaço vazio entre os blocos até ela aparecer.", [arrastar até "Enquanto estiver rodando"]. No "Logo abaixo do relógio A cada 1.5 segundos, encaixe A cada segundos, de Jogo 3D, Tempo e sorteio e Tempo, e troque o 2 por 4.", [arrastar até "A cada 1.5 segundos"] [abrir categoria Jogo 3D > Tempo e sorteio > Tempo] [encaixar "A cada 2 segundos" abaixo de "A cada 1.5 segundos"] [trocar "2" por "4" em "A cada 2 segundos"]. No "Dentro de o relógio A cada 4 segundos, deixe à vista o espaço ao lado de fazer.", [apontar encaixe em "A cada 4 segundos"]. No "Abra Programação e depois Lógica e Se.", [abrir categoria Programação > Lógica & Se]. No "Pegue o bloco Se e solte nesse espaço ao lado de fazer.", [encaixar "Se" em "A cada 4 segundos"]. No "Clique no x da pergunta e escolha estado.", [trocar "x" por "estado" em "Se valor da variável x > 0 dentro de A cada 4 segundos"]. No "Clique no sinal de maior e escolha o sinal de igual. Na lista existem dois iguais: escolha o que não tem a palavra solto do lado.", [trocar ">" por "=" em "Se valor da variável estado > 0 dentro de A cada 4 segundos"]. No "Deixe à vista o zero que está do lado direito da pergunta.", [apontar bloco "Se valor da variável estado = 0 dentro de A cada 4 segundos"]. No "Abra Programação, depois Valores, e pegue o bloco texto.", [abrir categoria Programação > Valores]. No "Solte o bloco texto em cima desse zero.", [soltar "texto" em cima do "0" em "Se valor da variável estado = 0 dentro de A cada 4 segundos"]. No "Clique na palavra Olá e escreva jogando, tudo em letras minúsculas.", [trocar "Olá" por "jogando" em "Se valor da variável estado = texto Olá dentro de A cada 4 segundos"]. No "No então, encaixe Criar uma cópia, de Jogo 3D e Grupos. Escolha moldePlasmaItem e o grupo itensPlasma.", [abrir categoria Jogo 3D > Grupos] [encaixar "Criar uma cópia" em "Se valor da variável estado dentro de A cada 4 segundos" no "então"] [trocar "molde" por "moldePlasmaItem" em "Criar uma cópia dentro de A cada 4 segundos"] [trocar "inimigos" por "itensPlasma" em "Criar uma cópia dentro de A cada 4 segundos"]. No "Na posição, coloque menos 4 no x, 1 no y e menos 10 no z. O menos 4 é a faixa da esquerda, e o menos 10 faz o item nascer perto da nave.", [trocar "0" por "-4" em "Criar uma cópia de moldePlasmaItem"] [trocar "0" por "1" em "Criar uma cópia de moldePlasmaItem"] [trocar "0" por "-10" em "Criar uma cópia de moldePlasmaItem"]. No "Encontre a área Quando acontecer. Se ela não estiver aparecendo, arraste um espaço vazio entre os blocos até ela aparecer.", [arrastar até "Quando acontecer"]. No "Logo abaixo do encontro Quando nave encostar em algum do grupo asteroides, encaixe Quando heroi encostar em algum do grupo, de Jogo 3D, Encostar e Encostar. Escolha nave, itensPlasma e chame o item de itemPego.", [arrastar até "Quando nave encostar em algum do grupo asteroides"] [abrir categoria Jogo 3D > Encostar > Encostar] [encaixar "Quando heroi encostar em algum do grupo" abaixo de "Quando nave encostar em algum do grupo asteroides"] [trocar "heroi" por "nave" em "Quando heroi encostar em algum do grupo"] [trocar "estrelas" por "itensPlasma" em "Quando nave encostar em algum do grupo"] [trocar "item" por "itemPego" em "Quando nave encostar em algum do grupo itensPlasma"]. No "Dentro de o encontro da nave com os itens, deixe à vista o espaço ao lado de fazer.", [apontar encaixe em "Quando nave encostar em algum do grupo itensPlasma"]. No "Abra Programação e depois Lógica e Se.", [abrir categoria Programação > Lógica & Se]. No "Pegue o bloco Se e solte nesse espaço ao lado de fazer.", [encaixar "Se" em "Quando nave encostar em algum do grupo itensPlasma"]. No "Clique no x da pergunta e escolha estado.", [trocar "x" por "estado" em "Se valor da variável x > 0 dentro de Quando nave encostar em algum do grupo itensPlasma"]. No "Clique no sinal de maior e escolha o sinal de igual. Na lista existem dois iguais: escolha o que não tem a palavra solto do lado.", [trocar ">" por "=" em "Se valor da variável estado > 0 dentro de Quando nave encostar em algum do grupo itensPlasma"]. No "Deixe à vista o zero que está do lado direito da pergunta.", [apontar bloco "Se valor da variável estado = 0 dentro de Quando nave encostar em algum do grupo itensPlasma"]. No "Abra Programação, depois Valores, e pegue o bloco texto.", [abrir categoria Programação > Valores]. No "Solte o bloco texto em cima desse zero.", [soltar "texto" em cima do "0" em "Se valor da variável estado = 0 dentro de Quando nave encostar em algum do grupo itensPlasma"]. No "Clique na palavra Olá e escreva jogando, tudo em letras minúsculas.", [trocar "Olá" por "jogando" em "Se valor da variável estado = texto Olá dentro de Quando nave encostar em algum do grupo itensPlasma"]. No "No então: Tirar o objeto do grupo, com itemPego e itensPlasma, e logo abaixo Alterar variável plasmaLiberado para verdadeiro.", [abrir categoria Jogo 3D > Grupos] [encaixar "Tirar o objeto inimigo do grupo" em "Se valor da variável estado dentro de Quando nave encostar em algum do grupo itensPlasma" no "então"] [trocar "inimigo" por "itemPego" em "Tirar o objeto inimigo do grupo"] [trocar "asteroides" por "itensPlasma" em "Tirar o objeto itemPego do grupo"] [abrir categoria Programação > Variáveis] [encaixar "Alterar variável contador para" abaixo de "Tirar o objeto itemPego do grupo itensPlasma"] [trocar "contador" por "plasmaLiberado" em "Alterar variável contador para"]. No "Clique em Rodar de novo e aperte Enter. Leve a nave para a borda da esquerda: o item vem, a nave pega e toca o som.", [rodar de novo] [tecla Enter] [segurar tecla ArrowLeft por 0,8 s] [aguardar 7 s]. No "volte aos blocos e confira se ficou assim", deixar bem à vista os blocos conferidos [mostrar blocos "Quando nave encostar em algum do grupo itensPlasma"].  No "Depois de corrigir, teste de novo", voltar a mão para o jogo [apontar prévia]. No "Clique em Verificar projeto", verificar [verificar projeto]. No "Quando aparecer Objetivo cumprido", voltar ao tamanho da aula [reduzir estúdio]. No "clique em Próxima parte", clicar em **Próxima parte** [próxima parte]. Os tempos de espera são estimativas (o item nasce a cada 4 s desde que o jogo abre): acertar no Verificar plano.

**Fala para ElevenLabs:**

```text
[engaging, energetic, conversational voice] Na patrulha, a troca de arma já tem o molde do item, o grupo itensPlasma, o movimento dos itens e as variáveis. Falta o relógio do item e o encontro que libera o plasma.

[confident, clear, unhurried voice] Encontre a área Enquanto estiver rodando. Se ela não estiver aparecendo, arraste um espaço vazio entre os blocos até ela aparecer.

[confident, clear, unhurried voice] Logo abaixo do relógio A cada 1.5 segundos, encaixe A cada segundos, de Jogo 3D, Tempo e sorteio e Tempo, e troque o 2 por 4.

[engaging, energetic, conversational voice] Agora a guarda que você já conhece: estado é igual a jogando?

[confident, clear, unhurried voice] Dentro de o relógio A cada 4 segundos, deixe à vista o espaço ao lado de fazer.

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

[confident, clear, unhurried voice] No então, encaixe Criar uma cópia, de Jogo 3D e Grupos. Escolha moldePlasmaItem e o grupo itensPlasma.

[confident, clear, unhurried voice] Na posição, coloque menos 4 no x, 1 no y e menos 10 no z. O menos 4 é a faixa da esquerda, e o menos 10 faz o item nascer perto da nave.

[confident, clear, unhurried voice] Encontre a área Quando acontecer. Se ela não estiver aparecendo, arraste um espaço vazio entre os blocos até ela aparecer.

[confident, clear, unhurried voice] Logo abaixo do encontro Quando nave encostar em algum do grupo asteroides, encaixe Quando heroi encostar em algum do grupo, de Jogo 3D, Encostar e Encostar. Escolha nave, itensPlasma e chame o item de itemPego.

[engaging, energetic, conversational voice] Agora a guarda que você já conhece: estado é igual a jogando?

[confident, clear, unhurried voice] Dentro de o encontro da nave com os itens, deixe à vista o espaço ao lado de fazer.

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

[confident, clear, unhurried voice] No então: Tirar o objeto do grupo, com itemPego e itensPlasma, e logo abaixo Alterar variável plasmaLiberado para verdadeiro.

[upbeat, encouraging voice] Clique em Rodar de novo e aperte Enter. Leve a nave para a borda da esquerda: o item vem, a nave pega e toca o som.

[reassuring, encouraging voice] Se algo não funcionou no seu jogo, volte aos blocos e confira se ficou assim: o relógio A cada 4 segundos cria a cópia de moldePlasmaItem em x menos 4 só na partida, e o encontro com itensPlasma tira o item e muda plasmaLiberado para verdadeiro.

[reassuring, encouraging voice] Depois de corrigir, teste de novo.

[engaging, energetic, conversational voice] Funcionou? Clique em Verificar projeto. Se faltar alguma coisa, corrija os blocos e clique novamente.

[engaging, energetic, conversational voice] Quando aparecer Objetivo cumprido!, clique em Próxima parte.
```

**Recado na página (não gravar):** Sua vez! Crie o item: a cada 4 segundos, só na partida, uma cópia de moldePlasmaItem em x −4, y 1, z −10; quando a nave encosta nela, o item sai e plasmaLiberado vira verdadeiro. Teste no seu jogo e clique em Verificar projeto. Quando aparecer Objetivo cumprido!, clique em Próxima parte.

## Parte 3. A tecla E troca a arma

**Clipe:** `video-troca`

**Na tela:** A parte começa com o Estúdio expandido e a entrada correspondente desta montagem [expandir estúdio]. No "Encontre a área Quando acontecer. Se ela não estiver aparecendo, arraste um espaço vazio entre os blocos até ela aparecer.", [arrastar até "Quando acontecer"]. No "Logo abaixo do encontro Quando nave encostar em algum do grupo asteroides, encaixe Quando apertar a tecla, de Jogo 3D e Controles. Escolha a tecla E.", [arrastar até "Quando nave encostar em algum do grupo asteroides"] [abrir categoria Jogo 3D > Controles] [encaixar "Quando apertar a tecla" abaixo de "Quando nave encostar em algum do grupo asteroides"] [trocar "W (frente)" por "E" em "Quando apertar a tecla W (frente)"]. No "Dentro de a tecla E, deixe à vista o espaço ao lado de fazer.", [apontar encaixe em "Quando apertar a tecla E"]. No "Abra Programação e depois Lógica e Se.", [abrir categoria Programação > Lógica & Se]. No "Pegue o bloco Se e solte nesse espaço ao lado de fazer.", [encaixar "Se" em "Quando apertar a tecla E"]. No "Clique no x da pergunta e escolha estado.", [trocar "x" por "estado" em "Se valor da variável x > 0 dentro de Quando apertar a tecla E"]. No "Clique no sinal de maior e escolha o sinal de igual. Na lista existem dois iguais: escolha o que não tem a palavra solto do lado.", [trocar ">" por "=" em "Se valor da variável estado > 0 dentro de Quando apertar a tecla E"]. No "Deixe à vista o zero que está do lado direito da pergunta.", [apontar bloco "Se valor da variável estado = 0 dentro de Quando apertar a tecla E"]. No "Abra Programação, depois Valores, e pegue o bloco texto.", [abrir categoria Programação > Valores]. No "Solte o bloco texto em cima desse zero.", [soltar "texto" em cima do "0" em "Se valor da variável estado = 0 dentro de Quando apertar a tecla E"]. No "Clique na palavra Olá e escreva jogando, tudo em letras minúsculas.", [trocar "Olá" por "jogando" em "Se valor da variável estado = texto Olá dentro de Quando apertar a tecla E"]. No "No então da guarda, encaixe outro Se: plasmaLiberado igual ao valor verdadeiro, de Programação e Valores.", [abrir categoria Programação > Lógica & Se] [encaixar "Se" em "Se valor da variável estado dentro de Quando apertar a tecla E" no "então"] [trocar "x" por "plasmaLiberado" em "Se valor da variável x > 0 dentro de Quando apertar a tecla E"] [trocar ">" por "=" em "Se valor da variável plasmaLiberado > 0 dentro de Quando apertar a tecla E"] [abrir categoria Programação > Valores] [soltar "verdadeiro" em cima do "0" em "Se valor da variável plasmaLiberado = 0 dentro de Quando apertar a tecla E"]. No "No então dele, mais um Se: arma igual ao texto laser. Depois, abra o senão desse Se.", [abrir categoria Programação > Lógica & Se] [encaixar "Se" em "Se valor da variável plasmaLiberado dentro de Quando apertar a tecla E" no "então"] [trocar "x" por "arma" em "Se valor da variável x > 0 dentro de Quando apertar a tecla E"] [trocar ">" por "=" em "Se valor da variável arma > 0 dentro de Quando apertar a tecla E"] [abrir categoria Programação > Valores] [soltar "texto" em cima do "0" em "Se valor da variável arma = 0 dentro de Quando apertar a tecla E"] [trocar "Olá" por "laser" em "Se valor da variável arma = texto Olá dentro de Quando apertar a tecla E"] [abrir "senão" em "Se valor da variável arma dentro de Quando apertar a tecla E"]. No "No então, Alterar variável arma para o texto plasma. No senão, Alterar variável arma para o texto laser.", [abrir categoria Programação > Variáveis] [encaixar "Alterar variável contador para" em "Se valor da variável arma dentro de Quando apertar a tecla E" no "então"] [trocar "contador" por "arma" em "Alterar variável contador para"] [abrir categoria Programação > Valores] [soltar "texto" em cima do "1" em "Alterar variável arma para"] [trocar "Olá" por "plasma" em "Alterar variável arma para texto Olá"] [abrir categoria Programação > Variáveis] [encaixar "Alterar variável contador para" em "Se valor da variável arma dentro de Quando apertar a tecla E" no "senão"] [trocar "contador" por "arma" em "Alterar variável contador para"] [abrir categoria Programação > Valores] [soltar "texto" em cima do "1" em "Alterar variável arma para texto Olá"] [trocar "Olá" por "laser" em "Alterar variável arma para texto Olá"]. No "Clique em Rodar de novo, aperte Enter, pegue o item na esquerda e aperte E. A troca acontece, mas o texto ainda não mostra a arma.", [rodar de novo] [tecla Enter] [segurar tecla ArrowLeft por 0,8 s] [aguardar 7 s] [tecla e]. No "volte aos blocos e confira se ficou assim", deixar bem à vista os blocos conferidos [mostrar blocos "Se valor da variável plasmaLiberado dentro de Quando apertar a tecla E"].  No "Depois de corrigir, teste de novo", voltar a mão para o jogo [apontar prévia]. No "Clique em Verificar projeto", verificar [verificar projeto]. No "Quando aparecer Objetivo cumprido", voltar ao tamanho da aula [reduzir estúdio]. No "clique em Próxima parte", clicar em **Próxima parte** [próxima parte]. Os tempos de espera são estimativas (o item nasce a cada 4 s desde que o jogo abre): acertar no Verificar plano.

**Fala para ElevenLabs:**

```text
[engaging, energetic, conversational voice] A mesma troca do jogo 2D. No Jogo 3D, a tecla E também está na lista.

[confident, clear, unhurried voice] Encontre a área Quando acontecer. Se ela não estiver aparecendo, arraste um espaço vazio entre os blocos até ela aparecer.

[confident, clear, unhurried voice] Logo abaixo do encontro Quando nave encostar em algum do grupo asteroides, encaixe Quando apertar a tecla, de Jogo 3D e Controles. Escolha a tecla E.

[engaging, energetic, conversational voice] Agora a guarda que você já conhece: estado é igual a jogando?

[confident, clear, unhurried voice] Dentro de a tecla E, deixe à vista o espaço ao lado de fazer.

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

[confident, clear, unhurried voice] No então da guarda, encaixe outro Se: plasmaLiberado igual ao valor verdadeiro, de Programação e Valores.

[confident, clear, unhurried voice] No então dele, mais um Se: arma igual ao texto laser. Depois, abra o senão desse Se.

[confident, clear, unhurried voice] No então, Alterar variável arma para o texto plasma. No senão, Alterar variável arma para o texto laser.

[upbeat, encouraging voice] Clique em Rodar de novo, aperte Enter, pegue o item na esquerda e aperte E. A troca acontece, mas o texto ainda não mostra a arma.

[curious] Como saber qual é a arma agora, na patrulha?

[engaging, energetic, conversational voice] Por enquanto, não dá para ver. O texto da arma é a próxima parte.

[reassuring, encouraging voice] Se algo não funcionou no seu jogo, volte aos blocos e confira se ficou assim: na tecla E, dentro da guarda da partida, o Se plasmaLiberado igual a verdadeiro troca arma entre laser e plasma.

[reassuring, encouraging voice] Depois de corrigir, teste de novo.

[engaging, energetic, conversational voice] Funcionou? Clique em Verificar projeto. Se faltar alguma coisa, corrija os blocos e clique novamente.

[engaging, energetic, conversational voice] Quando aparecer Objetivo cumprido!, clique em Próxima parte.
```

**Substituições na edição kids:**

| ID | Personagem | Ocorrência | Âncora anterior | Fala exata substituída | Âncora posterior | Tags |
| --- | --- | --- | --- | --- | --- | --- |
| video-troca-K1 | Dedé | 1 | de novo, aperte Enter, pegue o item na esquerda e aperte E. A troca acontece, mas o texto ainda não mostra a arma. | Como saber qual é a arma agora, na patrulha? | Por enquanto, não dá para ver. O texto da arma é a próxima parte. Se algo não funcionou no seu jogo, volte aos blocos e | [curious] |

No adulto, manter toda a fala da professora. No kids, silenciar apenas o trecho marcado e substituir pelo áudio do personagem, sem sobrepor vozes.

**Recado na página (não gravar):** Sua vez! Programe a troca: Quando apertar a tecla E, com a guarda da partida, Se plasmaLiberado = verdadeiro, então Se arma = laser, arma vira plasma; senão, arma vira laser. Teste no seu jogo e clique em Verificar projeto. Quando aparecer Objetivo cumprido!, clique em Próxima parte.

## Parte 4. O texto da arma

**Clipe:** `video-placar`

**Na tela:** A parte começa com o Estúdio expandido e a entrada correspondente desta montagem [expandir estúdio]. No "Encontre a área Ao iniciar. Se ela não estiver aparecendo, arraste um espaço vazio entre os blocos até ela aparecer.", [arrastar até "Ao iniciar"]. No "Logo abaixo do placar dos acertos, Escrever na tela, em cima, à esquerda, com Arma, dois-pontos e um espaço, mais o valor de arma.", [abrir categoria Jogo 3D > Placar, vida e telas > Na tela] [encaixar "Escrever na tela" abaixo de "Escrever na tela em cima, à direita"] [apontar bloco "Escrever na tela abaixo de Escrever na tela em cima, à direita"]. No "Encontre a área Quando acontecer. Se ela não estiver aparecendo, arraste um espaço vazio entre os blocos até ela aparecer.", [arrastar até "Quando acontecer"]. No "Na tecla E, logo abaixo do Se arma igual a laser, ainda dentro do Se plasmaLiberado, escreva o mesmo texto de novo: Escrever na tela, em cima, à esquerda, Arma, dois-pontos, mais o valor de arma.", [abrir categoria Jogo 3D > Placar, vida e telas > Na tela] [encaixar "Escrever na tela" abaixo de "Se valor da variável arma dentro de Quando apertar a tecla E"] [apontar bloco "Escrever na tela abaixo de Se valor da variável arma dentro de Quando apertar a tecla E"]. No "Clique em Rodar de novo. O texto mostra Arma laser. Aperte Enter, pegue o item na esquerda e aperte E: o texto muda para plasma.", [rodar de novo] [apontar prévia 70 24] [tecla Enter] [segurar tecla ArrowLeft por 0,8 s] [aguardar 7 s] [tecla e]. No "volte aos blocos e confira se ficou assim", deixar bem à vista os blocos conferidos [mostrar blocos "Se valor da variável plasmaLiberado dentro de Quando apertar a tecla E"].  No "Depois de corrigir, teste de novo", voltar a mão para o jogo [apontar prévia]. No "Clique em Verificar projeto", verificar [verificar projeto]. No "Quando aparecer Objetivo cumprido", voltar ao tamanho da aula [reduzir estúdio]. No "clique em Próxima parte", clicar em **Próxima parte** [próxima parte]. Os tempos de espera são estimativas (o item nasce a cada 4 s desde que o jogo abre): acertar no Verificar plano.

**Fala para ElevenLabs:**

```text
[engaging, energetic, conversational voice] No Jogo 3D, o texto da tela só muda quando é escrito de novo. Por isso, ele vai em dois lugares.

[confident, clear, unhurried voice] Encontre a área Ao iniciar. Se ela não estiver aparecendo, arraste um espaço vazio entre os blocos até ela aparecer.

[confident, clear, unhurried voice] Logo abaixo do placar dos acertos, Escrever na tela, em cima, à esquerda, com Arma, dois-pontos e um espaço, mais o valor de arma.

[confident, clear, unhurried voice] Encontre a área Quando acontecer. Se ela não estiver aparecendo, arraste um espaço vazio entre os blocos até ela aparecer.

[confident, clear, unhurried voice] Na tecla E, logo abaixo do Se arma igual a laser, ainda dentro do Se plasmaLiberado, escreva o mesmo texto de novo: Escrever na tela, em cima, à esquerda, Arma, dois-pontos, mais o valor de arma.

[upbeat, encouraging voice] Clique em Rodar de novo. O texto mostra Arma laser. Aperte Enter, pegue o item na esquerda e aperte E: o texto muda para plasma.

[reassuring, encouraging voice] Se algo não funcionou no seu jogo, volte aos blocos e confira se ficou assim: o texto Arma está em Ao iniciar e é escrito de novo logo depois da troca.

[reassuring, encouraging voice] Depois de corrigir, teste de novo.

[engaging, energetic, conversational voice] Funcionou? Clique em Verificar projeto. Se faltar alguma coisa, corrija os blocos e clique novamente.

[engaging, energetic, conversational voice] Quando aparecer Objetivo cumprido!, clique em Próxima parte.
```

**Recado na página (não gravar):** Sua vez! Mostre a arma: em Ao iniciar e logo depois da troca, Escrever na tela, em cima, à esquerda, "Arma: " + arma. Teste no seu jogo e clique em Verificar projeto. Quando aparecer Objetivo cumprido!, clique em Próxima parte.

## Parte 5. O Espaço pergunta a arma

**Clipe:** `video-disparo`

**Na tela:** A parte começa com o Estúdio expandido e a entrada correspondente desta montagem [expandir estúdio]. No "Encontre a área Quando acontecer. Se ela não estiver aparecendo, arraste um espaço vazio entre os blocos até ela aparecer.", [arrastar até "Quando acontecer"]. No "Encontre Quando apertar a tecla espaço e encaixe um Se no começo do então do Se jogando. Na pergunta, escolha arma no x, o sinal de igual e, no lugar do zero, o texto plasma.", [arrastar até "Quando apertar a tecla espaço"] [abrir categoria Programação > Lógica & Se] [encaixar "Se" em "Se valor da variável estado dentro de Quando apertar a tecla espaço" no "então"] [trocar "x" por "arma" em "Se valor da variável x > 0 dentro de Quando apertar a tecla espaço"] [trocar ">" por "=" em "Se valor da variável arma > 0 dentro de Quando apertar a tecla espaço"] [abrir categoria Programação > Valores] [soltar "texto" em cima do "0" em "Se valor da variável arma = 0 dentro de Quando apertar a tecla espaço"] [trocar "Olá" por "plasma" em "Se valor da variável arma = texto Olá dentro de Quando apertar a tecla espaço"]. No "Abra o senão e leve a cópia do laser, com a nota, para dentro dele.", [abrir "senão" em "Se valor da variável arma dentro de Quando apertar a tecla espaço"] [mover "Criar uma cópia de moldeTiro" para "Se valor da variável arma dentro de Quando apertar a tecla espaço" no "senão"]. No "Duplique a cópia do laser e leve para o então. Na cópia, troque moldeTiro por moldePlasma e tiros por tirosPlasma.", [apontar bloco "Criar uma cópia de moldeTiro dentro de Se valor da variável arma dentro de Quando apertar a tecla espaço"]. No "Duplique também a nota e leve para baixo da cópia do plasma. Na nota nova, troque 880 por 330 e 60 por 120.", [apontar bloco "Tocar nota 880 Hz por 60 ms dentro de Se valor da variável arma dentro de Quando apertar a tecla espaço"]. No "Clique em Rodar de novo e aperte Enter. Dispare: sai o laser. Pegue o item, aperte E e dispare: sai o plasma.", [rodar de novo] [tecla Enter] [tecla Space] [segurar tecla ArrowLeft por 0,8 s] [aguardar 7 s] [tecla e] [tecla Space]. No "volte aos blocos e confira se ficou assim", deixar bem à vista os blocos conferidos [mostrar blocos "Se valor da variável arma dentro de Quando apertar a tecla espaço"].  No "Depois de corrigir, teste de novo", voltar a mão para o jogo [apontar prévia]. No "Clique em Verificar projeto", verificar [verificar projeto]. No "Quando aparecer Objetivo cumprido!, clique em Enviar meu projeto", clicar em **Enviar meu projeto** [clicar "Enviar meu projeto"]. No "e confirme em Enviar", confirmar em **Enviar**, na janela que abriu [clicar "Enviar"]. No "Pronto, a patrulha também tem duas armas: o texto mostra a arma e o Espaço pergunta antes de criar o tiro!", voltar ao tamanho da aula [reduzir estúdio]. No "Quando aparecer Projeto enviado!, clique em Próxima parte", clicar em **Próxima parte** [próxima parte]. Os tempos de espera são estimativas (o item nasce a cada 4 s desde que o jogo abre): acertar no Verificar plano. Duplicar (botão direito no bloco → Duplicar) e levar a cópia ao lugar, em captura manual: o robô não tem marca para esse gesto.

**Fala para ElevenLabs:**

```text
[engaging, energetic, conversational voice] Agora o Espaço da patrulha também pergunta a arma.

[confident, clear, unhurried voice] Encontre a área Quando acontecer. Se ela não estiver aparecendo, arraste um espaço vazio entre os blocos até ela aparecer.

[confident, clear, unhurried voice] Encontre Quando apertar a tecla espaço e encaixe um Se no começo do então do Se jogando. Na pergunta, escolha arma no x, o sinal de igual e, no lugar do zero, o texto plasma.

[confident, clear, unhurried voice] Abra o senão e leve a cópia do laser, com a nota, para dentro dele.

[confident, clear, unhurried voice] Duplique a cópia do laser e leve para o então. Na cópia, troque moldeTiro por moldePlasma e tiros por tirosPlasma.

[confident, clear, unhurried voice] Duplique também a nota e leve para baixo da cópia do plasma. Na nota nova, troque 880 por 330 e 60 por 120.

[upbeat, encouraging voice] Clique em Rodar de novo e aperte Enter. Dispare: sai o laser. Pegue o item, aperte E e dispare: sai o plasma.

[reassuring, encouraging voice] Se algo não funcionou no seu jogo, volte aos blocos e confira se ficou assim: no Espaço, o Se arma igual a plasma cria a cópia de moldePlasma em tirosPlasma; no senão, o laser de antes.

[reassuring, encouraging voice] Depois de corrigir, teste de novo.

[engaging, energetic, conversational voice] Funcionou? Clique em Verificar projeto. Se faltar alguma coisa, corrija os blocos e clique novamente.

[engaging, energetic, conversational voice] Quando aparecer Objetivo cumprido!, clique em Enviar meu projeto e confirme em Enviar.

[pleased, lively voice] Pronto, a patrulha também tem duas armas: o texto mostra a arma e o Espaço pergunta antes de criar o tiro!

[engaging, energetic, conversational voice] Depois do envio, ainda tem duas perguntas para você pensar na troca de arma. Quando aparecer Projeto enviado!, clique em Próxima parte.
```

**Recado na página (não gravar):** Hora de conferir e enviar! No Espaço, dentro de Se jogando: Se arma = plasma, uma cópia de moldePlasma no grupo tirosPlasma; senão, o laser de sempre. Clique em Verificar projeto, envie o projeto e confirme em Enviar. Quando aparecer Projeto enviado!, clique em Próxima parte.

## Parte 6. Pense na troca de arma da patrulha

Quiz sem vídeo: escolha, demonstração, explicação e nova tentativa. Resposta corrigida pelo servidor.

**Recado na página (não gravar):** Escolha uma resposta e clique em Ver o que acontece ou, nas perguntas sem cena, em Responder. Observe a cena e a explicação. Você pode tentar de novo. Quando terminar, clique em Concluir aula.
