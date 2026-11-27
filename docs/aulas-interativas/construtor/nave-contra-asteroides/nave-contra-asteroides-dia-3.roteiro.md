# Roteiro de produção · Faça o tiro acertar o asteroide

A professora grava o master integral. Na edição kids, Debinha substitui somente os parágrafos das tabelas de substituição, sem voz sobreposta. A edição adulta conserva o master. As falas prontas e o índice de edição são derivados desta fonte.

Montagem guiada completa no vídeo, um gesto por vez, deixando o destino visível antes de pegar a peça. As telas e o reinício são infraestrutura preparada; as partes ensinam as regras da partida. A personalização muda a aparência.

**Antes de gravar:** use uma sessão de ensaio sem envio anterior, carregue a entrada da parte e dê foco ao jogo antes das teclas. Mostre Objetivo cumprido! e Projeto enviado! somente quando aparecerem. Os tempos de tecla são estimativas a confirmar no Verificar plano. Gravação e publicação pendentes.

## Parte 1. Quem sai do jogo no acerto?

**Clipe:** `video-trombada`

**Na tela:** A cena fica parada enquanto a edição ilustra a comparação narrada, sem mostrar controles nem resolver descobertas. No "Agora você vai explorar essa ideia na experiência", ampliar a experiência [ampliar experiência]. No "O Zappy vai te mostrando", apontar a fala do Zappy [apontar zappy]. No "Quando terminar", voltar ao tamanho da aula [voltar à aula]. No "clique em Próxima parte", avançar [próxima parte].

**Fala para ElevenLabs:**

```text
[engaging, energetic, conversational voice] Um laser pode encontrar um asteroide enquanto outros continuam voando. Pense numa brincadeira com bolas: quando duas se encostam, aquele encontro pertence às duas, não a todas as bolas que estão por perto.

[engaging, energetic, conversational voice] No seu jogo, cada encontro também forma um par: um tiro e um asteroide. Para responder ao acerto, o jogo precisa distinguir esse par dos outros sprites dos grupos.

[curious] Um acerto deve fazer todos os asteroides sumirem?

[engaging, energetic, conversational voice] Antes de testar, pense na sua resposta e diga em voz alta. Depois, a experiência mostra se você acertou.

[upbeat, encouraging voice] Agora você vai explorar essa ideia na experiência. O Zappy vai te mostrando o que testar, e você pode repetir quando quiser. Quando terminar, clique em Próxima parte.
```

**Substituições na edição kids:**

| ID | Personagem | Ocorrência | Âncora anterior | Fala exata substituída | Âncora posterior | Tags |
| --- | --- | --- | --- | --- | --- | --- |
| video-trombada-K1 | Debinha | 1 | um tiro e um asteroide. Para responder ao acerto, o jogo precisa distinguir esse par dos outros sprites dos grupos. | Um acerto deve fazer todos os asteroides sumirem? | Antes de testar, pense na sua resposta e diga em voz alta. Depois, a experiência mostra se você acertou. Agora você vai | [curious] |

No adulto, manter toda a fala da professora. No kids, silenciar apenas o trecho marcado e substituir pelo áudio do personagem, sem sobrepor vozes.

**Falas da experiência:** consulte `zappy-etapas.json`. O vídeo convida; os controles e as comparações continuam livres na bancada.

**Recado na página (não gravar):** Sua vez! Compare retirar o grupo inteiro com retirar só os dois objetos do encontro. O Zappy te mostra o que testar, e você pode repetir quando quiser. Quando terminar, clique em Próxima parte.

## Parte 2. Retire o par que se encontrou

**Clipe:** `video-colisao`

**Na tela:** A parte começa com o Estúdio expandido [expandir estúdio]. No "Comece o jogo e acerte uma pedra com um laser. Eles ainda se atravessam porque o encontro não tem resposta. Na experiência da parte anterior, só o par envolvido precisava sair. Agora programe essa reação.", [tocar prévia 400 300] [tecla Enter] jogar com as setas até alinhar a nave sob uma pedra; a gravação acompanha a pedra que nasceu [tecla Space]. No "Encontre a área Enquanto estiver rodando. Se ela não estiver aparecendo, arraste um espaço vazio entre os blocos até ela aparecer.", [arrastar até "Enquanto estiver rodando"]. No "Dentro de A cada quadro do jogo, encontre Se jogando. Deixe à vista o encaixe depois da retirada dos asteroides.", [apontar abaixo de "Tirar do grupo asteroides"]. No "Abra Jogo 2D, depois Colisões e depois Encostar e bloquear. Pegue Para cada colisão entre os grupos e encaixe nesse lugar.", [abrir categoria Jogo 2D > Colisões > Encostar e bloquear] [encaixar "Para cada colisão entre os grupos" abaixo de "Tirar do grupo asteroides"]. No "Os grupos já são tiros e asteroides. Os nomes do par já são tiro e asteroide. Conserve esses quatro nomes.", [apontar bloco "Para cada colisão entre os grupos tiros e asteroides"]. No "Deixe o fazer desse encontro à vista. Abra Jogo 2D, depois Grupos e depois Participação e limpeza. Pegue Tirar o sprite do grupo e solte dentro do fazer.", [apontar encaixe em "Para cada colisão entre os grupos"] [abrir categoria Jogo 2D > Grupos > Participação e limpeza] [encaixar "Tirar o sprite" em "Para cada colisão entre os grupos"]. No "No sprite que chega como asteroide, escolha tiro. No grupo, escolha tiros. Essa instrução retira o laser que participou do encontro.", [trocar "asteroide" por "tiro" em "Tirar o sprite"] [trocar "asteroides" por "tiros" em "Tirar o sprite tiro"]. No "Deixe o encaixe abaixo dessa retirada à vista. Pegue outro Tirar o sprite do grupo na mesma gaveta e solte ali, ainda dentro do encontro.", [apontar abaixo de "Tirar o sprite tiro"] [abrir categoria Jogo 2D > Grupos > Participação e limpeza] [encaixar "Tirar o sprite" abaixo de "Tirar o sprite tiro"]. No "Nesse segundo bloco, conserve o sprite asteroide e o grupo asteroides. Ele retira somente a pedra do par.", [apontar bloco "Tirar o sprite asteroide"]. No "Comece o jogo e alinhe a nave com uma pedra. Dispare: o laser e a pedra devem sumir no acerto. Observe outra pedra que estava longe desse encontro; ela continua caindo.", [tocar prévia 400 300] [tecla Enter] jogar com as setas até alinhar a nave sob uma pedra; a gravação acompanha a pedra que nasceu [tecla Space] acompanhar outra pedra que permanece na tela [apontar prévia 400 180]. No "confira se ficou assim", mostrar os blocos usados nesta parte [mostrar blocos "Para cada colisão entre os grupos"]. No "clique em Verificar projeto", verificar [verificar projeto]. No "Quando aparecer Objetivo cumprido!", voltar ao tamanho da aula [reduzir estúdio]. No "clique em Próxima parte", sair da parte [próxima parte].

**Fala para ElevenLabs:**

```text
[engaging, energetic, conversational voice] Comece o jogo e acerte uma pedra com um laser. Eles ainda se atravessam porque o encontro não tem resposta. Na experiência da parte anterior, só o par envolvido precisava sair. Agora programe essa reação.

[confident, clear, unhurried voice] Encontre a área Enquanto estiver rodando. Se ela não estiver aparecendo, arraste um espaço vazio entre os blocos até ela aparecer.

[short pause]

[confident, clear, unhurried voice] Dentro de A cada quadro do jogo, encontre Se jogando. Deixe à vista o encaixe depois da retirada dos asteroides.

[short pause]

[confident, clear, unhurried voice] Abra Jogo 2D, depois Colisões e depois Encostar e bloquear. Pegue Para cada colisão entre os grupos e encaixe nesse lugar.

[short pause]

[confident, clear, unhurried voice] Os grupos já são tiros e asteroides. Os nomes do par já são tiro e asteroide. Conserve esses quatro nomes.

[short pause]

[confident, clear, unhurried voice] Deixe o fazer desse encontro à vista. Abra Jogo 2D, depois Grupos e depois Participação e limpeza. Pegue Tirar o sprite do grupo e solte dentro do fazer.

[short pause]

[confident, clear, unhurried voice] No sprite que chega como asteroide, escolha tiro. No grupo, escolha tiros. Essa instrução retira o laser que participou do encontro.

[short pause]

[confident, clear, unhurried voice] Deixe o encaixe abaixo dessa retirada à vista. Pegue outro Tirar o sprite do grupo na mesma gaveta e solte ali, ainda dentro do encontro.

[short pause]

[confident, clear, unhurried voice] Nesse segundo bloco, conserve o sprite asteroide e o grupo asteroides. Ele retira somente a pedra do par.

[short pause]

[upbeat, encouraging voice] Comece o jogo e alinhe a nave com uma pedra. Dispare: o laser e a pedra devem sumir no acerto. Observe outra pedra que estava longe desse encontro; ela continua caindo.

[reassuring, encouraging voice] Se algo não funcionou no seu jogo, volte aos blocos e confira se ficou assim: o encontro compara tiros e asteroides, usa os nomes tiro e asteroide e contém uma retirada para cada um, com seu grupo correspondente. Depois de corrigir, teste de novo.

[engaging, energetic, conversational voice] Funcionou? Clique em Verificar projeto. Se faltar alguma coisa, corrija os blocos e clique novamente.

[engaging, energetic, conversational voice] Quando aparecer Objetivo cumprido!, clique em Próxima parte.
```

**Recado na página (não gravar):** Sua vez! Retire o par que se encontrou. Teste no seu jogo e clique em Verificar projeto. Quando aparecer Objetivo cumprido!, clique em Próxima parte.

## Parte 3. Mostre o acerto

**Clipe:** `video-efeitos`

**Na tela:** A parte começa com o Estúdio expandido [expandir estúdio]. No "O acerto já retira o par. Agora acrescente um brilho e um som nesse mesmo momento, para quem joga perceber a reação com mais facilidade.", [apontar prévia]. No "Encontre a área Enquanto estiver rodando. Se ela não estiver aparecendo, arraste um espaço vazio entre os blocos até ela aparecer.", [arrastar até "Enquanto estiver rodando"]. No "Encontre o encontro entre tiros e asteroides. Dentro do fazer, deixe à vista o encaixe depois das duas retiradas.", [apontar abaixo de "Tirar o sprite asteroide"]. No "Abra Jogo 2D, depois Desenho e efeitos e depois Partículas. Pegue Soltar explosão no sprite e encaixe nesse lugar.", [abrir categoria Jogo 2D > Desenho e efeitos > Partículas] [encaixar "Soltar explosão no sprite" abaixo de "Tirar o sprite asteroide"]. No "Conserve o nome asteroide. Se quiser, clique no quadradinho de cor desse bloco e escolha a cor da explosão na paleta. A cor é escolha sua: ela não muda o jogo.", [apontar bloco "Soltar explosão no sprite asteroide"]. No "Deixe o encaixe logo abaixo da explosão à vista. Abra Jogo 2D, depois Som e depois Efeitos prontos. Encaixe Tocar efeito e escolha explosão.", [apontar abaixo de "Soltar explosão no sprite asteroide"] [abrir categoria Jogo 2D > Som > Efeitos prontos] [encaixar "Tocar efeito" abaixo de "Soltar explosão no sprite asteroide"] [trocar "moeda" por "explosão" em "Tocar efeito dentro de Para cada colisão"]. No "Comece o jogo e acerte uma pedra. Veja o brilho no lugar dela e escute o som. Depois dispare sem acertar: o efeito do acerto deve esperar um encontro.", [tocar prévia 400 300] [tecla Enter] jogar com as setas até alinhar a nave sob uma pedra; a gravação acompanha a pedra que nasceu [tecla Space] aguardar 1 segundo na gravação, sem novo comando usar uma seta para levar a nave a uma coluna sem pedra; a captura acompanha as pedras desta rodada [tecla Space]. No "confira se ficou assim", mostrar os blocos usados nesta parte [mostrar blocos "Para cada colisão entre os grupos"]. No "clique em Verificar projeto", verificar [verificar projeto]. No "Quando aparecer Objetivo cumprido!", voltar ao tamanho da aula [reduzir estúdio]. No "clique em Próxima parte", sair da parte [próxima parte].

**Fala para ElevenLabs:**

```text
[engaging, energetic, conversational voice] O acerto já retira o par. Agora acrescente um brilho e um som nesse mesmo momento, para quem joga perceber a reação com mais facilidade.

[confident, clear, unhurried voice] Encontre a área Enquanto estiver rodando. Se ela não estiver aparecendo, arraste um espaço vazio entre os blocos até ela aparecer.

[short pause]

[confident, clear, unhurried voice] Encontre o encontro entre tiros e asteroides. Dentro do fazer, deixe à vista o encaixe depois das duas retiradas.

[short pause]

[confident, clear, unhurried voice] Abra Jogo 2D, depois Desenho e efeitos e depois Partículas. Pegue Soltar explosão no sprite e encaixe nesse lugar.

[short pause]

[confident, clear, unhurried voice] Conserve o nome asteroide. Se quiser, clique no quadradinho de cor desse bloco e escolha a cor da explosão na paleta. A cor é escolha sua: ela não muda o jogo.

[short pause]

[confident, clear, unhurried voice] Deixe o encaixe logo abaixo da explosão à vista. Abra Jogo 2D, depois Som e depois Efeitos prontos. Encaixe Tocar efeito e escolha explosão.

[short pause]

[upbeat, encouraging voice] Comece o jogo e acerte uma pedra. Veja o brilho no lugar dela e escute o som. Depois dispare sem acertar: o efeito do acerto deve esperar um encontro.

[reassuring, encouraging voice] Se algo não funcionou no seu jogo, volte aos blocos e confira se ficou assim: a explosão usa o asteroide do par e os dois efeitos estão dentro do mesmo encontro, depois das retiradas. Depois de corrigir, teste de novo.

[engaging, energetic, conversational voice] Funcionou? Clique em Verificar projeto. Se faltar alguma coisa, corrija os blocos e clique novamente.

[engaging, energetic, conversational voice] Quando aparecer Objetivo cumprido!, clique em Próxima parte.
```

**Recado na página (não gravar):** Sua vez! Mostre o acerto. Teste no seu jogo e clique em Verificar projeto. Quando aparecer Objetivo cumprido!, clique em Próxima parte.

## Parte 4. Teste e envie os acertos

**Clipe:** `video-entrega`

**Na tela:** A parte começa com o Estúdio expandido [expandir estúdio]. No "Seu laser já muda o que acontece com as pedras. Compare um acerto com um disparo que passa longe antes de enviar.", [apontar prévia]. No "Clique em Rodar de novo e comece com Enter.", [rodar de novo] [tocar prévia 400 300] [tecla Enter]. No "Alinhe um disparo com um asteroide. Confira a retirada do par, o brilho e o som. Os outros asteroides devem continuar na tela.", jogar com as setas até alinhar a nave sob uma pedra; a gravação acompanha a pedra que nasceu [tecla Space] acompanhar outra pedra que permanece na tela [apontar prévia 400 180]. No "Dispare por uma coluna vazia. O laser atravessa a tela sem provocar uma explosão de acerto. Ainda não há placar nesta versão.", usar uma seta para levar a nave a uma coluna sem pedra; a captura acompanha as pedras desta rodada [tecla Space] aguardar 3 segundos na gravação, sem novo comando. No "confira se ficou assim", mostrar os blocos usados nesta parte [mostrar blocos "Para cada colisão entre os grupos"]. No "clique em Verificar projeto", verificar [verificar projeto]. No "clique em Enviar meu projeto", iniciar o envio e confirmar [enviar projeto]. No "Quando aparecer Projeto enviado!", voltar ao tamanho da aula [reduzir estúdio]. No "clique em Concluir aula", sair da parte [concluir aula].

**Fala para ElevenLabs:**

```text
[engaging, energetic, conversational voice] Seu laser já muda o que acontece com as pedras. Compare um acerto com um disparo que passa longe antes de enviar.

[confident, clear, unhurried voice] Clique em Rodar de novo e comece com Enter.

[short pause]

[upbeat, encouraging voice] Alinhe um disparo com um asteroide. Confira a retirada do par, o brilho e o som. Os outros asteroides devem continuar na tela.

[upbeat, encouraging voice] Dispare por uma coluna vazia. O laser atravessa a tela sem provocar uma explosão de acerto. Ainda não há placar nesta versão.

[reassuring, encouraging voice] Se algo não funcionou no seu jogo, volte aos blocos e confira se ficou assim: cada encontro retira só o tiro e a pedra envolvidos e os efeitos estão dentro desse encontro. Depois de corrigir, teste de novo.

[engaging, energetic, conversational voice] Funcionou? Clique em Verificar projeto. Se faltar alguma coisa, corrija os blocos e clique novamente.

[engaging, energetic, conversational voice] Quando aparecer Objetivo cumprido!, clique em Enviar meu projeto e confirme em Enviar.

[pleased, lively voice] Você programou o acerto entre um laser e um asteroide, preservando o resto da partida!

[engaging, energetic, conversational voice] Quando aparecer Projeto enviado!, clique em Concluir aula.
```

**Recado na página (não gravar):** Hora de conferir e enviar! Teste e envie os acertos. Teste no seu jogo e clique em Verificar projeto. Depois, envie o projeto e confirme em Enviar. Quando aparecer Projeto enviado!, clique em Concluir aula.
