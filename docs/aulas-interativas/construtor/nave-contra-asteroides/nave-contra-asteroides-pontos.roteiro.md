# Roteiro de produção · Conte os acertos

A professora grava o master integral. Na edição kids, Dedé substitui somente os parágrafos das tabelas de substituição, sem voz sobreposta. A edição adulta conserva o master. As falas prontas e o índice de edição são derivados desta fonte.

Montagem guiada completa no vídeo, um gesto por vez, deixando o destino visível antes de pegar a peça. As telas e o reinício são infraestrutura preparada; as partes ensinam as regras da partida. A personalização muda a aparência.

**Antes de gravar:** use uma sessão de ensaio sem envio anterior, carregue a entrada da parte e dê foco ao jogo antes das teclas. Mostre Objetivo cumprido! e Projeto enviado! somente quando aparecerem. Os tempos de tecla são estimativas a confirmar no Verificar plano. Gravação e publicação pendentes.

## Parte 1. Guardar e mostrar um número

**Clipe:** `video-caixa-de-pontos`

**Na tela:** A cena fica parada enquanto a edição ilustra a comparação narrada, sem mostrar controles nem resolver descobertas. No "Agora você vai explorar essa ideia na experiência", ampliar a experiência [ampliar experiência]. No "O Zappy vai te mostrando", apontar a fala do Zappy [apontar zappy]. No "Quando terminar", voltar ao tamanho da aula [voltar à aula]. No "clique em Próxima parte", avançar [próxima parte].

**Fala para ElevenLabs:**

```text
[engaging, energetic, conversational voice] Você já consegue acertar os asteroides. Agora o jogo precisa lembrar quantos acertos aconteceram. Pense no placar de uma partida: ele guarda a contagem para ninguém depender só da memória.

[engaging, energetic, conversational voice] No seu jogo, os pontos também podem ser guardados. Mudar a contagem e mostrar essa contagem na tela são coisas diferentes, como anotar um resultado e levantar uma placa para todo mundo enxergar.

[curious] Se o número mudou nos bastidores, ele aparece sozinho no placar?

[engaging, energetic, conversational voice] Antes de testar, pense na sua resposta e diga em voz alta. Depois, a experiência mostra se você acertou.

[upbeat, encouraging voice] Agora você vai explorar essa ideia na experiência. O Zappy vai te mostrando o que testar, e você pode repetir quando quiser. Quando terminar, clique em Próxima parte.
```

**Substituições na edição kids:**

| ID | Personagem | Ocorrência | Âncora anterior | Fala exata substituída | Âncora posterior | Tags |
| --- | --- | --- | --- | --- | --- | --- |
| video-caixa-de-pontos-K1 | Dedé | 1 | essa contagem na tela são coisas diferentes, como anotar um resultado e levantar uma placa para todo mundo enxergar. | Se o número mudou nos bastidores, ele aparece sozinho no placar? | Antes de testar, pense na sua resposta e diga em voz alta. Depois, a experiência mostra se você acertou. Agora você vai | [curious] |

No adulto, manter toda a fala da professora. No kids, silenciar apenas o trecho marcado e substituir pelo áudio do personagem, sem sobrepor vozes.

**Falas da experiência:** consulte `zappy-etapas.json`. O vídeo convida; os controles e as comparações continuam livres na bancada.

**Recado na página (não gravar):** Sua vez! Compare o número guardado com o número mostrado na tela. O Zappy te mostra o que testar, e você pode repetir quando quiser. Quando terminar, clique em Próxima parte.

## Parte 2. Prepare o placar

**Clipe:** `video-placar`

**Na tela:** A parte começa com o Estúdio expandido [expandir estúdio]. No "Seu jogo já reconhece acertos, mas ainda não guarda uma contagem. Na experiência da parte anterior, guardar e mostrar eram ações diferentes. Faça as duas, começando com zero.", [apontar prévia]. No "Encontre a área Ao iniciar. Se ela não estiver aparecendo, arraste um espaço vazio entre os blocos até ela aparecer.", [arrastar até "Ao iniciar"]. No "Deixe à vista o encaixe depois dos dois grupos, antes de Mudar o estado do jogo para inicio.", [apontar abaixo de "Criar grupo de sprites asteroides"]. No "Abra Programação e depois Variáveis. Pegue Criar variável com valor e encaixe nesse lugar.", [abrir categoria Programação > Variáveis] [encaixar "Criar variável contador com valor" abaixo de "Criar grupo de sprites asteroides"]. No "Troque o nome contador por pontos. O valor já é zero; deixe assim.", [trocar "contador" por "pontos" em "Criar variável contador"] [apontar bloco "Criar variável pontos"]. No "Encontre a área Enquanto estiver rodando. Se ela não estiver aparecendo, arraste um espaço vazio entre os blocos até ela aparecer.", [arrastar até "Enquanto estiver rodando"]. No "Dentro de A cada quadro do jogo, encontre Desenhar o sprite nave. Deixe o encaixe depois dele à vista, antes da legenda e das telas.", [apontar abaixo de "Desenhar o sprite nave"]. No "Abra Jogo 2D, depois Vida e placar e depois Indicadores e texto na tela. Pegue Mostrar placar e encaixe nesse lugar.", [abrir categoria Jogo 2D > Vida e placar > Indicadores e texto na tela] [encaixar "Mostrar placar" abaixo de "Desenhar o sprite nave"]. No "No rótulo que chega como Pontos:, escreva Acertos: com dois-pontos no fim. Coloque 22 no x, 32 no y e 23 no tamanho.", [trocar "Pontos:" por "Acertos:" em "Mostrar placar"] [trocar "12" por "22" em "Mostrar placar Acertos:"] [trocar "30" por "32" em "Mostrar placar Acertos:"] [trocar "24" por "23" em "Mostrar placar Acertos:"]. No "O placar chega branco, que aparece bem no espaço. Se quiser outra cor clara, escolha no quadradinho de cor. Agora deixe o número do valor do placar à vista.", [apontar bloco "Mostrar placar Acertos:"]. No "Abra Programação e depois Valores. Pegue o valor de variável, que chega com x, e encaixe sobre o número do placar. Clique nesse x e escolha pontos.", [abrir categoria Programação > Valores] [soltar "valor da variável" em cima do "0" em "Mostrar placar Acertos:"] [trocar "x" por "pontos" em "valor da variável dentro de Mostrar placar Acertos:"]. No "Comece a partida e olhe o canto superior esquerdo. Acertos deve mostrar zero. Mesmo acertando uma pedra, o zero ainda fica, porque a soma será construída na próxima parte.", [tocar prévia 400 300] [tecla Enter] [apontar prévia 85 25] jogar com as setas até alinhar a nave sob uma pedra; a gravação acompanha a pedra que nasceu [tecla Space]. No "confira se ficou assim", mostrar os blocos usados nesta parte [mostrar blocos "Criar variável pontos", "Mostrar placar Acertos:"]. No "clique em Verificar projeto", verificar [verificar projeto]. No "Quando aparecer Objetivo cumprido!", voltar ao tamanho da aula [reduzir estúdio]. No "clique em Próxima parte", sair da parte [próxima parte].

**Fala para ElevenLabs:**

```text
[engaging, energetic, conversational voice] Seu jogo já reconhece acertos, mas ainda não guarda uma contagem. Na experiência da parte anterior, guardar e mostrar eram ações diferentes. Faça as duas, começando com zero.

[confident, clear, unhurried voice] Encontre a área Ao iniciar. Se ela não estiver aparecendo, arraste um espaço vazio entre os blocos até ela aparecer.

[short pause]

[confident, clear, unhurried voice] Deixe à vista o encaixe depois dos dois grupos, antes de Mudar o estado do jogo para inicio.

[short pause]

[confident, clear, unhurried voice] Abra Programação e depois Variáveis. Pegue Criar variável com valor e encaixe nesse lugar.

[short pause]

[confident, clear, unhurried voice] Troque o nome contador por pontos. O valor já é zero; deixe assim.

[short pause]

[confident, clear, unhurried voice] Encontre a área Enquanto estiver rodando. Se ela não estiver aparecendo, arraste um espaço vazio entre os blocos até ela aparecer.

[short pause]

[confident, clear, unhurried voice] Dentro de A cada quadro do jogo, encontre Desenhar o sprite nave. Deixe o encaixe depois dele à vista, antes da legenda e das telas.

[short pause]

[confident, clear, unhurried voice] Abra Jogo 2D, depois Vida e placar e depois Indicadores e texto na tela. Pegue Mostrar placar e encaixe nesse lugar.

[short pause]

[confident, clear, unhurried voice] No rótulo que chega como Pontos:, escreva Acertos: com dois-pontos no fim. Coloque 22 no x, 32 no y e 23 no tamanho.

[short pause]

[confident, clear, unhurried voice] O placar chega branco, que aparece bem no espaço. Se quiser outra cor clara, escolha no quadradinho de cor. Agora deixe o número do valor do placar à vista.

[short pause]

[confident, clear, unhurried voice] Abra Programação e depois Valores. Pegue o valor de variável, que chega com x, e encaixe sobre o número do placar. Clique nesse x e escolha pontos.

[short pause]

[upbeat, encouraging voice] Comece a partida e olhe o canto superior esquerdo. Acertos deve mostrar zero. Mesmo acertando uma pedra, o zero ainda fica, porque a soma será construída na próxima parte.

[reassuring, encouraging voice] Se algo não funcionou no seu jogo, volte aos blocos e confira se ficou assim: pontos começa em zero em Ao iniciar e o valor do placar lê pontos dentro do desenho de cada quadro. Depois de corrigir, teste de novo.

[engaging, energetic, conversational voice] Funcionou? Clique em Verificar projeto. Se faltar alguma coisa, corrija os blocos e clique novamente.

[engaging, energetic, conversational voice] Quando aparecer Objetivo cumprido!, clique em Próxima parte.
```

**Recado na página (não gravar):** Sua vez! Prepare o placar. Teste no seu jogo e clique em Verificar projeto. Quando aparecer Objetivo cumprido!, clique em Próxima parte.

## Parte 3. Some no lugar do acerto

**Clipe:** `video-somar-acerto`

**Na tela:** A parte começa com o Estúdio expandido [expandir estúdio]. No "Comece o jogo e acerte uma pedra. O par some, mas Acertos continua em zero. A contagem já tem onde ficar e onde aparecer; agora ligue a soma ao mesmo encontro do acerto.", [tocar prévia 400 300] [tecla Enter] jogar com as setas até alinhar a nave sob uma pedra; a gravação acompanha a pedra que nasceu [tecla Space] [apontar prévia 85 25]. No "Encontre a área Enquanto estiver rodando. Se ela não estiver aparecendo, arraste um espaço vazio entre os blocos até ela aparecer.", [arrastar até "Enquanto estiver rodando"]. No "Dentro de Se jogando, encontre o encontro entre tiros e asteroides. Deixe à vista o encaixe no fim do fazer, depois do som da explosão.", [apontar abaixo de "Tocar efeito explosão"]. No "Abra Programação e depois Variáveis. Pegue Somar 1 em variável e encaixe nesse lugar.", [abrir categoria Programação > Variáveis] [encaixar "Somar 1 em variável" abaixo de "Tocar efeito explosão"]. No "Deixe o número em 1. Clique no nome que chega como contador e escolha pontos.", [trocar "contador" por "pontos" em "Somar 1 em variável"]. No "Comece o jogo e acerte uma pedra. Acertos passa de zero para um. Acerte outra: passa para dois.", [tocar prévia 400 300] [tecla Enter] jogar com as setas até alinhar a nave sob uma pedra; a gravação acompanha a pedra que nasceu [tecla Space] [apontar prévia 85 25] registrar o próximo acerto real de laser na mesma partida. No "Dispare sem alvo e deixe uma pedra passar sem acertar. A contagem deve ficar igual nesses dois casos.", usar uma seta para levar a nave a uma coluna sem pedra; a captura acompanha as pedras desta rodada [tecla Space] deixar uma pedra atravessar a tela sem atirar nela [apontar prévia 85 25]. No "confira se ficou assim", mostrar os blocos usados nesta parte [mostrar blocos "Somar 1 em variável pontos"]. No "clique em Verificar projeto", verificar [verificar projeto]. No "Quando aparecer Objetivo cumprido!", voltar ao tamanho da aula [reduzir estúdio]. No "clique em Próxima parte", sair da parte [próxima parte].

**Fala para ElevenLabs:**

```text
[engaging, energetic, conversational voice] Comece o jogo e acerte uma pedra. O par some, mas Acertos continua em zero. A contagem já tem onde ficar e onde aparecer; agora ligue a soma ao mesmo encontro do acerto.

[confident, clear, unhurried voice] Encontre a área Enquanto estiver rodando. Se ela não estiver aparecendo, arraste um espaço vazio entre os blocos até ela aparecer.

[short pause]

[confident, clear, unhurried voice] Dentro de Se jogando, encontre o encontro entre tiros e asteroides. Deixe à vista o encaixe no fim do fazer, depois do som da explosão.

[short pause]

[confident, clear, unhurried voice] Abra Programação e depois Variáveis. Pegue Somar 1 em variável e encaixe nesse lugar.

[short pause]

[confident, clear, unhurried voice] Deixe o número em 1. Clique no nome que chega como contador e escolha pontos.

[short pause]

[upbeat, encouraging voice] Comece o jogo e acerte uma pedra. Acertos passa de zero para um. Acerte outra: passa para dois.

[upbeat, encouraging voice] Dispare sem alvo e deixe uma pedra passar sem acertar. A contagem deve ficar igual nesses dois casos.

[reassuring, encouraging voice] Se algo não funcionou no seu jogo, volte aos blocos e confira se ficou assim: Somar 1 usa pontos e fica dentro do encontro de tiros e asteroides, junto da retirada do par. Depois de corrigir, teste de novo.

[engaging, energetic, conversational voice] Funcionou? Clique em Verificar projeto. Se faltar alguma coisa, corrija os blocos e clique novamente.

[engaging, energetic, conversational voice] Quando aparecer Objetivo cumprido!, clique em Próxima parte.
```

**Recado na página (não gravar):** Sua vez! Some no lugar do acerto. Teste no seu jogo e clique em Verificar projeto. Quando aparecer Objetivo cumprido!, clique em Próxima parte.

## Parte 4. Confira a contagem

Quiz sem vídeo, com resposta corrigida no servidor, explicação e nova tentativa.

**Recado na página (não gravar):** Confira o que ficou claro no seu jogo. Escolha uma resposta em cada pergunta e veja a explicação. Você pode corrigir e tentar de novo. Quando terminar, clique em Próxima parte.

## Parte 5. Teste e envie seu placar

**Clipe:** `video-entrega`

**Na tela:** A parte começa com o Estúdio expandido [expandir estúdio]. No "Agora o placar acompanha seus acertos. Confira o que conta e o que mantém o número antes de enviar.", [apontar prévia 85 25]. No "Clique em Rodar de novo e comece a partida com Enter. Confira Acertos em zero.", [rodar de novo] [tocar prévia 400 300] [tecla Enter] [apontar prévia 85 25]. No "Acerte dois asteroides, um de cada vez, e acompanhe o placar. Ele deve somar um em cada acerto.", jogar até o primeiro acerto desta rodada [apontar prévia 85 25] jogar até o segundo acerto desta rodada [apontar prévia 85 25]. No "Deixe um laser passar sem alvo e uma pedra escapar. O número deve continuar igual. Quando o par já saiu, esperar mais alguns quadros também não soma outro ponto pelo mesmo acerto.", disparar uma vez em uma coluna sem pedra [tecla Space] deixar uma pedra atravessar a tela sem atirar nela [apontar prévia 85 25]. No "confira se ficou assim", mostrar os blocos usados nesta parte [mostrar blocos "Somar 1 em variável pontos"]. No "clique em Verificar projeto", verificar [verificar projeto]. No "clique em Enviar meu projeto", iniciar o envio e confirmar [enviar projeto]. No "Quando aparecer Projeto enviado!", voltar ao tamanho da aula [reduzir estúdio]. No "clique em Concluir aula", sair da parte [concluir aula].

**Fala para ElevenLabs:**

```text
[engaging, energetic, conversational voice] Agora o placar acompanha seus acertos. Confira o que conta e o que mantém o número antes de enviar.

[confident, clear, unhurried voice] Clique em Rodar de novo e comece a partida com Enter. Confira Acertos em zero.

[short pause]

[upbeat, encouraging voice] Acerte dois asteroides, um de cada vez, e acompanhe o placar. Ele deve somar um em cada acerto.

[upbeat, encouraging voice] Deixe um laser passar sem alvo e uma pedra escapar. O número deve continuar igual. Quando o par já saiu, esperar mais alguns quadros também não soma outro ponto pelo mesmo acerto.

[reassuring, encouraging voice] Se algo não funcionou no seu jogo, volte aos blocos e confira se ficou assim: pontos começa em zero, o placar lê pontos e a soma de 1 pertence ao encontro que retira o par. Depois de corrigir, teste de novo.

[engaging, energetic, conversational voice] Funcionou? Clique em Verificar projeto. Se faltar alguma coisa, corrija os blocos e clique novamente.

[engaging, energetic, conversational voice] Quando aparecer Objetivo cumprido!, clique em Enviar meu projeto e confirme em Enviar.

[pleased, lively voice] Você fez o seu jogo lembrar e mostrar cada acerto!

[engaging, energetic, conversational voice] Quando aparecer Projeto enviado!, clique em Concluir aula.
```

**Recado na página (não gravar):** Hora de conferir e enviar! Teste e envie seu placar. Teste no seu jogo e clique em Verificar projeto. Depois, envie o projeto e confirme em Enviar. Quando aparecer Projeto enviado!, clique em Concluir aula.
