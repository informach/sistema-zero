# Roteiro de produção · Termine e recomece a partida

A professora grava o master integral. Na edição kids, Debinha substitui somente os parágrafos das tabelas de substituição, sem voz sobreposta. A edição adulta conserva o master. As falas prontas e o índice de edição são derivados desta fonte.

Montagem guiada completa no vídeo, um gesto por vez, deixando o destino visível antes de pegar a peça. As telas e o reinício são infraestrutura preparada; as partes ensinam as regras da partida. A personalização muda a aparência.

**Antes de gravar:** use uma sessão de ensaio sem envio anterior, carregue a entrada da parte e dê foco ao jogo antes das teclas. Mostre Objetivo cumprido! e Projeto enviado! somente quando aparecerem. Os tempos de tecla são estimativas a confirmar no Verificar plano. Gravação e publicação pendentes.

## Parte 1. O acerto que completa a missão

**Clipe:** `video-meta-do-jogo`

**Na tela:** A cena fica parada enquanto a edição ilustra a comparação narrada, sem mostrar controles nem resolver descobertas. No "Agora você vai explorar essa ideia na experiência", ampliar a experiência [ampliar experiência]. No "O Zappy vai te mostrando", apontar a fala do Zappy [apontar zappy]. No "Quando terminar", voltar ao tamanho da aula [voltar à aula]. No "clique em Próxima parte", avançar [próxima parte].

**Fala para ElevenLabs:**

```text
[engaging, energetic, conversational voice] Sua missão é abrir a rota acertando vinte asteroides. Pense numa coleção que fica completa quando você reúne a quantidade combinada. A contagem pode crescer, enquanto a quantidade necessária continua a mesma.

[engaging, energetic, conversational voice] No jogo, a contagem guarda quantos acertos você já fez. A meta informa os vinte que você quer alcançar. A pergunta de vitória compara esses dois valores, para reconhecer que a missão foi completada.

[curious] Se a contagem passar de vinte, a missão deixa de estar completa?

[engaging, energetic, conversational voice] Antes de testar, pense na sua resposta e diga em voz alta. Depois, a experiência mostra se você acertou.

[upbeat, encouraging voice] Agora você vai explorar essa ideia na experiência. O Zappy vai te mostrando o que testar, e você pode repetir quando quiser. Quando terminar, clique em Próxima parte.
```

**Substituições na edição kids:**

| ID | Personagem | Ocorrência | Âncora anterior | Fala exata substituída | Âncora posterior | Tags |
| --- | --- | --- | --- | --- | --- | --- |
| video-meta-do-jogo-K1 | Debinha | 1 | que você quer alcançar. A pergunta de vitória compara esses dois valores, para reconhecer que a missão foi completada. | Se a contagem passar de vinte, a missão deixa de estar completa? | Antes de testar, pense na sua resposta e diga em voz alta. Depois, a experiência mostra se você acertou. Agora você vai | [curious] |

No adulto, manter toda a fala da professora. No kids, silenciar apenas o trecho marcado e substituir pelo áudio do personagem, sem sobrepor vozes.

**Falas da experiência:** consulte `zappy-etapas.json`. O vídeo convida; os controles e as comparações continuam livres na bancada.

**Recado na página (não gravar):** Sua vez! Compare os acertos com a meta de vinte e descubra quando a missão está completa. O Zappy te mostra o que testar, e você pode repetir quando quiser. Quando terminar, clique em Próxima parte.

## Parte 2. Prepare a meta e mostre o progresso

**Clipe:** `video-meta`

**Na tela:** A parte começa com o Estúdio expandido [expandir estúdio]. No "Seu placar já conta os acertos. Agora prepare a meta de vinte e mostre quanto falta para a missão.", [apontar prévia 60 32]. No "Encontre a área Ao iniciar. Se ela não estiver aparecendo, arraste um espaço vazio entre os blocos até ela aparecer.", [arrastar até "Ao iniciar"]. No "Encontre Criar variável pontos. Deixe à vista o encaixe depois dela e antes de dar vidas à nave.", [apontar abaixo de "Criar variável pontos"]. No "Abra Programação e depois Variáveis. Pegue Criar variável e solte nesse encaixe. Troque contador por meta e o valor 0 por 20.", [abrir categoria Programação > Variáveis] [encaixar "Criar variável" abaixo de "Criar variável pontos"] [trocar "contador" por "meta" em "Criar variável contador"] [trocar "0" por "20" em "Criar variável meta"]. No "Encontre a área Enquanto estiver rodando. Se ela não estiver aparecendo, arraste um espaço vazio entre os blocos até ela aparecer.", [arrastar até "Enquanto estiver rodando"]. No "Encontre o placar Acertos. Deixe o encaixe depois dele à vista. Abra Jogo 2D, depois Vida e placar e depois Indicadores e texto na tela.", [apontar abaixo de "Mostrar placar Acertos:"] [abrir categoria Jogo 2D > Vida e placar > Indicadores e texto na tela]. No "Pegue Mostrar placar e solte depois de Acertos, antes dos corações. Troque Pontos: por Meta:. No x, coloque 650; no y, 32; e no tamanho, 21.", [encaixar "Mostrar placar" abaixo de "Mostrar placar Acertos:"] [trocar "Pontos:" por "Meta:" em "Mostrar placar Pontos:"] [trocar "12" por "650" em "Mostrar placar Meta:"] [trocar "30" por "32" em "Mostrar placar Meta:"] [trocar "24" por "21" em "Mostrar placar Meta:"]. No "Abra Programação e depois Valores. Pegue valor da variável e solte em cima do número do placar Meta. Troque x por meta nesse bloco de valor.", [abrir categoria Programação > Valores] [soltar "valor da variável" em cima do "0" em "Mostrar placar Meta:"] [trocar "x" por "meta" em "valor da variável dentro de Mostrar placar Meta:"]. No "Deixe à vista o encaixe depois de Desenhar as vidas e antes da legenda. Volte a Jogo 2D, Vida e placar, Indicadores e texto na tela. Pegue Barra de e solte nesse encaixe.", [apontar abaixo de "Desenhar as vidas"] [abrir categoria Jogo 2D > Vida e placar > Indicadores e texto na tela] [encaixar "Barra de" abaixo de "Desenhar as vidas"]. No "Na barra, coloque x 280, y 23, largura 240 e altura 11.", [trocar "12" por "280" em "Barra de"] [trocar "48" por "23" em "Barra de"] [trocar "160" por "240" em "Barra de"] [trocar "14" por "11" em "Barra de"]. No "Clique no quadradinho de cor da barra e escolha na paleta uma cor bem viva: é ela que vai encher conforme você acerta.", [apontar bloco "Barra de"]. No "Abra Programação, Valores. Encaixe valor da variável no valor da barra e escolha pontos. Encaixe outro valor da variável no total e escolha meta. A barra vai comparar o que você já conseguiu com a missão completa.", [abrir categoria Programação > Valores] [soltar "valor da variável" em cima do "0" em "Barra de"] [trocar "x" por "pontos" em "valor da variável dentro de Barra de"] [soltar "valor da variável" em cima do "100" em "Barra de"] [trocar "x" por "meta" em "valor da variável dentro de Barra de"]. No "Comece e acerte algumas pedras. Acertos aumenta, a barra vai preenchendo e Meta continua em 20. Ainda falta construir a pergunta que termina a partida.", [tocar prévia 400 300] [tecla Enter] [tecla Space] [apontar prévia 680 32]. No "confira se ficou assim", mostrar os blocos usados nesta parte [mostrar blocos "Criar variável meta", "Mostrar placar Meta:", "Barra de"]. No "clique em Verificar projeto", verificar [verificar projeto]. No "Quando aparecer Objetivo cumprido!", voltar ao tamanho da aula [reduzir estúdio]. No "clique em Próxima parte", sair da parte [próxima parte].

**Fala para ElevenLabs:**

```text
[engaging, energetic, conversational voice] Seu placar já conta os acertos. Agora prepare a meta de vinte e mostre quanto falta para a missão.

[confident, clear, unhurried voice] Encontre a área Ao iniciar. Se ela não estiver aparecendo, arraste um espaço vazio entre os blocos até ela aparecer.

[short pause]

[confident, clear, unhurried voice] Encontre Criar variável pontos. Deixe à vista o encaixe depois dela e antes de dar vidas à nave.

[short pause]

[confident, clear, unhurried voice] Abra Programação e depois Variáveis. Pegue Criar variável e solte nesse encaixe. Troque contador por meta e o valor 0 por 20.

[short pause]

[confident, clear, unhurried voice] Encontre a área Enquanto estiver rodando. Se ela não estiver aparecendo, arraste um espaço vazio entre os blocos até ela aparecer.

[short pause]

[confident, clear, unhurried voice] Encontre o placar Acertos. Deixe o encaixe depois dele à vista. Abra Jogo 2D, depois Vida e placar e depois Indicadores e texto na tela.

[short pause]

[confident, clear, unhurried voice] Pegue Mostrar placar e solte depois de Acertos, antes dos corações. Troque Pontos: por Meta:. No x, coloque 650; no y, 32; e no tamanho, 21.

[short pause]

[confident, clear, unhurried voice] Abra Programação e depois Valores. Pegue valor da variável e solte em cima do número do placar Meta. Troque x por meta nesse bloco de valor.

[short pause]

[confident, clear, unhurried voice] Deixe à vista o encaixe depois de Desenhar as vidas e antes da legenda. Volte a Jogo 2D, Vida e placar, Indicadores e texto na tela. Pegue Barra de e solte nesse encaixe.

[short pause]

[confident, clear, unhurried voice] Na barra, coloque x 280, y 23, largura 240 e altura 11.

[short pause]

[confident, clear, unhurried voice] Clique no quadradinho de cor da barra e escolha na paleta uma cor bem viva: é ela que vai encher conforme você acerta.

[short pause]

[confident, clear, unhurried voice] Abra Programação, Valores. Encaixe valor da variável no valor da barra e escolha pontos. Encaixe outro valor da variável no total e escolha meta. A barra vai comparar o que você já conseguiu com a missão completa.

[short pause]

[upbeat, encouraging voice] Comece e acerte algumas pedras. Acertos aumenta, a barra vai preenchendo e Meta continua em 20. Ainda falta construir a pergunta que termina a partida.

[reassuring, encouraging voice] Se algo não funcionou no seu jogo, volte aos blocos e confira se ficou assim: meta começa em 20, o novo placar lê meta e a barra lê pontos como valor e meta como total. Depois de corrigir, teste de novo.

[engaging, energetic, conversational voice] Funcionou? Clique em Verificar projeto. Se faltar alguma coisa, corrija os blocos e clique novamente.

[engaging, energetic, conversational voice] Quando aparecer Objetivo cumprido!, clique em Próxima parte.
```

**Recado na página (não gravar):** Sua vez! Prepare a meta e mostre o progresso. Teste no seu jogo e clique em Verificar projeto. Quando aparecer Objetivo cumprido!, clique em Próxima parte.

## Parte 3. Chame a vitória ao completar a meta

**Clipe:** `video-finais`

**Na tela:** A parte começa com o Estúdio expandido [expandir estúdio]. No "A tela de vitória já está preparada. Sua construção agora é decidir quando o jogo deve chegar nela.", [apontar bloco "o estado do jogo é vitoria"]. No "Encontre a área Enquanto estiver rodando. Se ela não estiver aparecendo, arraste um espaço vazio entre os blocos até ela aparecer.", [arrastar até "Enquanto estiver rodando"]. No "Dentro de A cada quadro do jogo, encontre o então de Se jogando. Deixe à vista o encaixe depois do bloco inteiro da colisão da nave.", [apontar abaixo de "Para cada sprite do grupo"]. No "Abra Programação e depois Lógica & Se. Pegue Se e solte depois da colisão, ainda dentro de Se jogando.", [abrir categoria Programação > Lógica & Se] [encaixar "Se" abaixo de "Para cada sprite do grupo"]. No "Na pergunta que chegou com x maior que 0, clique no sinal de maior e escolha maior ou igual. Abra Programação, Valores, e encaixe valor da variável no lugar de x. Escolha pontos.", [trocar ">" por "≥" em "Se abaixo de Para cada sprite do grupo"] [abrir categoria Programação > Valores] [soltar "valor da variável" em cima do "x" em "Se abaixo de Para cada sprite do grupo"] [trocar "x" por "pontos" em "valor da variável dentro de Se abaixo de Para cada sprite do grupo"]. No "Encaixe outro valor da variável no lugar do 0 do lado direito e escolha meta. A pergunta fica: pontos é maior ou igual a meta?", [soltar "valor da variável" em cima do "0" em "Se abaixo de Para cada sprite do grupo"] [trocar "x" por "meta" em "valor da variável dentro de Se abaixo de Para cada sprite do grupo"]. No "Deixe o então desse novo Se à vista. Abra Jogo 2D, depois Jogo e telas e depois Telas e partida. Pegue Mudar o estado do jogo e solte dentro desse então.", [apontar encaixe em "Se valor da variável pontos" no "então"] [abrir categoria Jogo 2D > Jogo e telas > Telas e partida] [encaixar "Mudar o estado do jogo" em "Se valor da variável pontos" no "então"]. No "Troque inicio por vitoria, sem acento, nesse bloco. A regra seleciona a tela pronta quando você completa a missão.", [trocar "inicio" por "vitoria" em "Mudar o estado do jogo dentro de Se valor da variável pontos"]. No "Comece a partida e acerte vinte asteroides. Quando a contagem alcançar a meta, aparece Rota aberta!. Depois da vitória, setas e Espaço não continuam a partida. Pressione Enter para voltar ao início. A derrota será acrescentada na próxima parte.", [tocar prévia 400 300] [tecla Enter] [apontar prévia 400 240]. No "confira se ficou assim", mostrar os blocos usados nesta parte [mostrar blocos "Se valor da variável pontos"]. No "clique em Verificar projeto", verificar [verificar projeto]. No "Quando aparecer Objetivo cumprido!", voltar ao tamanho da aula [reduzir estúdio]. No "clique em Próxima parte", sair da parte [próxima parte].

**Fala para ElevenLabs:**

```text
[engaging, energetic, conversational voice] A tela de vitória já está preparada. Sua construção agora é decidir quando o jogo deve chegar nela.

[confident, clear, unhurried voice] Encontre a área Enquanto estiver rodando. Se ela não estiver aparecendo, arraste um espaço vazio entre os blocos até ela aparecer.

[short pause]

[confident, clear, unhurried voice] Dentro de A cada quadro do jogo, encontre o então de Se jogando. Deixe à vista o encaixe depois do bloco inteiro da colisão da nave.

[short pause]

[confident, clear, unhurried voice] Abra Programação e depois Lógica & Se. Pegue Se e solte depois da colisão, ainda dentro de Se jogando.

[short pause]

[confident, clear, unhurried voice] Na pergunta que chegou com x maior que 0, clique no sinal de maior e escolha maior ou igual. Abra Programação, Valores, e encaixe valor da variável no lugar de x. Escolha pontos.

[short pause]

[confident, clear, unhurried voice] Encaixe outro valor da variável no lugar do 0 do lado direito e escolha meta. A pergunta fica: pontos é maior ou igual a meta?

[short pause]

[confident, clear, unhurried voice] Deixe o então desse novo Se à vista. Abra Jogo 2D, depois Jogo e telas e depois Telas e partida. Pegue Mudar o estado do jogo e solte dentro desse então.

[short pause]

[confident, clear, unhurried voice] Troque inicio por vitoria, sem acento, nesse bloco. A regra seleciona a tela pronta quando você completa a missão.

[short pause]

[upbeat, encouraging voice] Comece a partida e acerte vinte asteroides. Quando a contagem alcançar a meta, aparece Rota aberta!. Depois da vitória, setas e Espaço não continuam a partida. Pressione Enter para voltar ao início. A derrota será acrescentada na próxima parte.

[reassuring, encouraging voice] Se algo não funcionou no seu jogo, volte aos blocos e confira se ficou assim: a pergunta pontos maior ou igual a meta fica depois das colisões, dentro de Se jogando, e seu então muda o estado para vitoria. Depois de corrigir, teste de novo.

[engaging, energetic, conversational voice] Funcionou? Clique em Verificar projeto. Se faltar alguma coisa, corrija os blocos e clique novamente.

[engaging, energetic, conversational voice] Quando aparecer Objetivo cumprido!, clique em Próxima parte.
```

**Recado na página (não gravar):** Sua vez! Chame a vitória ao completar a meta. Teste no seu jogo e clique em Verificar projeto. Quando aparecer Objetivo cumprido!, clique em Próxima parte.

## Parte 4. Escolha um único resultado

**Clipe:** `video-derrota`

**Na tela:** A parte começa com o Estúdio expandido [expandir estúdio]. No "Se as vidas acabarem, a missão termina com a tela de nova tentativa. O jogo precisa escolher um resultado por vez. A ordem será: conferir as vidas; se ainda houver vida, conferir a vitória.", [apontar bloco "Se valor da variável pontos"]. No "Encontre a área Enquanto estiver rodando. Se ela não estiver aparecendo, arraste um espaço vazio entre os blocos até ela aparecer.", [arrastar até "Enquanto estiver rodando"]. No "Dentro de Se jogando, encontre a pergunta de vitória que você acabou de construir. Deixe à vista o encaixe antes dela, logo depois da colisão da nave.", [apontar abaixo de "Para cada sprite do grupo"]. No "Abra Programação, Lógica & Se. Pegue outro Se e solte entre a colisão da nave e a pergunta de vitória.", [abrir categoria Programação > Lógica & Se] [encaixar "Se" abaixo de "Para cada sprite do grupo"]. No "Esse novo Se chega com x maior que 0. Pegue essa pergunta pelo sinal de maior e leve à lixeira. Conserve o Se.", [jogar na lixeira ">" em "Se abaixo de Para cada sprite do grupo"]. No "Abra Jogo 2D, Vida e placar, Vida. Pegue as vidas do sprite acabaram? e solte no espaço da pergunta vazia. Troque jogador por nave.", [abrir categoria Jogo 2D > Vida e placar > Vida] [encaixar "as vidas do sprite" em "Se abaixo de Para cada sprite do grupo" no "se"] [trocar "jogador" por "nave" em "as vidas do sprite"]. No "Deixe o então desse Se à vista. Abra Jogo 2D, Jogo e telas, Telas e partida. Pegue Mudar o estado do jogo e solte no então. Troque inicio por derrota.", [apontar encaixe em "Se as vidas do sprite" no "então"] [abrir categoria Jogo 2D > Jogo e telas > Telas e partida] [encaixar "Mudar o estado do jogo" em "Se as vidas do sprite" no "então"] [trocar "inicio" por "derrota" em "Mudar o estado do jogo dentro de Se as vidas do sprite"]. No "No Se das vidas, encontre os dois sinais de mais. Clique no segundo mais, o que fica antes da palavra senão. Isso abre o espaço que será usado quando as vidas ainda não acabaram.", [apontar mais de "senão" em "Se as vidas do sprite"] [abrir "senão" em "Se as vidas do sprite"]. No "Pegue a pergunta de vitória inteira pela palavra Se. Leve esse bloco, com o Mudar para vitoria que está dentro, para o espaço do senão do Se das vidas.", [mover "Se valor da variável pontos" para "Se as vidas do sprite" no "senão"]. No "Comece uma partida e deixe a nave perder as três vidas, esperando a proteção entre as batidas. Aparece a tela Tente outra rota. Setas e Espaço devem parar de agir.", [tocar prévia 400 300] [tecla Enter] [apontar prévia 400 240]. No "Pressione Enter para voltar à abertura e Enter outra vez para começar. Confira a vitória numa partida em que você completa vinte acertos com vida. Só um resultado deve aparecer.", [tecla Enter] [tecla Enter] [apontar prévia 400 240]. No "confira se ficou assim", mostrar os blocos usados nesta parte [mostrar blocos "Se as vidas do sprite nave"]. No "clique em Verificar projeto", verificar [verificar projeto]. No "Quando aparecer Objetivo cumprido!", voltar ao tamanho da aula [reduzir estúdio]. No "clique em Próxima parte", sair da parte [próxima parte].

**Fala para ElevenLabs:**

```text
[engaging, energetic, conversational voice] Se as vidas acabarem, a missão termina com a tela de nova tentativa. O jogo precisa escolher um resultado por vez. A ordem será: conferir as vidas; se ainda houver vida, conferir a vitória.

[confident, clear, unhurried voice] Encontre a área Enquanto estiver rodando. Se ela não estiver aparecendo, arraste um espaço vazio entre os blocos até ela aparecer.

[short pause]

[confident, clear, unhurried voice] Dentro de Se jogando, encontre a pergunta de vitória que você acabou de construir. Deixe à vista o encaixe antes dela, logo depois da colisão da nave.

[short pause]

[confident, clear, unhurried voice] Abra Programação, Lógica & Se. Pegue outro Se e solte entre a colisão da nave e a pergunta de vitória.

[short pause]

[confident, clear, unhurried voice] Esse novo Se chega com x maior que 0. Pegue essa pergunta pelo sinal de maior e leve à lixeira. Conserve o Se.

[short pause]

[confident, clear, unhurried voice] Abra Jogo 2D, Vida e placar, Vida. Pegue as vidas do sprite acabaram? e solte no espaço da pergunta vazia. Troque jogador por nave.

[short pause]

[confident, clear, unhurried voice] Deixe o então desse Se à vista. Abra Jogo 2D, Jogo e telas, Telas e partida. Pegue Mudar o estado do jogo e solte no então. Troque inicio por derrota.

[short pause]

[confident, clear, unhurried voice] No Se das vidas, encontre os dois sinais de mais. Clique no segundo mais, o que fica antes da palavra senão. Isso abre o espaço que será usado quando as vidas ainda não acabaram.

[short pause]

[confident, clear, unhurried voice] Pegue a pergunta de vitória inteira pela palavra Se. Leve esse bloco, com o Mudar para vitoria que está dentro, para o espaço do senão do Se das vidas.

[short pause]

[upbeat, encouraging voice] Comece uma partida e deixe a nave perder as três vidas, esperando a proteção entre as batidas. Aparece a tela Tente outra rota. Setas e Espaço devem parar de agir.

[upbeat, encouraging voice] Pressione Enter para voltar à abertura e Enter outra vez para começar. Confira a vitória numa partida em que você completa vinte acertos com vida. Só um resultado deve aparecer.

[reassuring, encouraging voice] Se algo não funcionou no seu jogo, volte aos blocos e confira se ficou assim: o primeiro Se pergunta se as vidas da nave acabaram e chama derrota; o Se da vitória ficou inteiro dentro do senão desse primeiro Se. Depois de corrigir, teste de novo.

[engaging, energetic, conversational voice] Funcionou? Clique em Verificar projeto. Se faltar alguma coisa, corrija os blocos e clique novamente.

[engaging, energetic, conversational voice] Quando aparecer Objetivo cumprido!, clique em Próxima parte.
```

**Recado na página (não gravar):** Sua vez! Escolha um único resultado. Teste no seu jogo e clique em Verificar projeto. Quando aparecer Objetivo cumprido!, clique em Próxima parte.

## Parte 5. Uma partida de verdade começa de novo

**Clipe:** `video-reiniciar`

**Na tela:** A cena fica parada enquanto a edição ilustra a comparação narrada, sem mostrar controles nem resolver descobertas. No "Agora você vai explorar essa ideia na experiência", ampliar a experiência [ampliar experiência]. No "O Zappy vai te mostrando", apontar a fala do Zappy [apontar zappy]. No "Quando terminar", voltar ao tamanho da aula [voltar à aula]. No "clique em Próxima parte", avançar [próxima parte].

**Fala para ElevenLabs:**

```text
[engaging, energetic, conversational voice] Quando uma rodada de jogo de tabuleiro acaba, você pode olhar para a placa do começo e para as peças que ficaram na mesa. A placa diz que uma rodada vai começar; as peças mostram como a mesa está preparada.

[engaging, energetic, conversational voice] No seu jogo, também há a imagem da abertura e as coisas que pertencem à partida: nave, pedras, lasers, pontos e vidas. O reinício já está preparado. Agora você vai investigar a diferença entre mudar só a imagem e preparar a rodada inteira.

[curious] Se eu voltar ao começo com pontos antigos, será mesmo uma nova partida?

[engaging, energetic, conversational voice] Antes de testar, pense na sua resposta e diga em voz alta. Depois, a experiência mostra se você acertou.

[upbeat, encouraging voice] Agora você vai explorar essa ideia na experiência. O Zappy vai te mostrando o que testar, e você pode repetir quando quiser. Quando terminar, clique em Próxima parte.
```

**Substituições na edição kids:**

| ID | Personagem | Ocorrência | Âncora anterior | Fala exata substituída | Âncora posterior | Tags |
| --- | --- | --- | --- | --- | --- | --- |
| video-reiniciar-K1 | Debinha | 1 | reinício já está preparado. Agora você vai investigar a diferença entre mudar só a imagem e preparar a rodada inteira. | Se eu voltar ao começo com pontos antigos, será mesmo uma nova partida? | Antes de testar, pense na sua resposta e diga em voz alta. Depois, a experiência mostra se você acertou. Agora você vai | [curious] |

No adulto, manter toda a fala da professora. No kids, silenciar apenas o trecho marcado e substituir pelo áudio do personagem, sem sobrepor vozes.

**Falas da experiência:** consulte `zappy-etapas.json`. O vídeo convida; os controles e as comparações continuam livres na bancada.

**Recado na página (não gravar):** Sua vez! Compare voltar só à tela inicial com preparar uma nova partida. O Zappy te mostra o que testar, e você pode repetir quando quiser. Quando terminar, clique em Próxima parte.

## Parte 6. Confira as regras da missão

Quiz sem vídeo, com resposta corrigida no servidor, explicação e nova tentativa.

**Recado na página (não gravar):** Confira o que ficou claro no seu jogo. Escolha uma resposta em cada pergunta e veja a explicação. Você pode corrigir e tentar de novo. Quando terminar, clique em Próxima parte.

## Parte 7. Teste a missão completa e envie

**Clipe:** `video-entrega`

**Na tela:** A parte começa com o Estúdio expandido [expandir estúdio]. No "A missão está completa. Falta atualizar a descrição do jogo e conferir uma rodada nova, os dois resultados e o reinício.", [apontar prévia 400 240]. No "Encontre a área Ao iniciar. Se ela não estiver aparecendo, arraste um espaço vazio entre os blocos até ela aparecer.", [arrastar até "Ao iniciar"]. No "Encontre o bloco que descreve o jogo para quem usa leitor de tela. No texto, escreva: Nave Contra Asteroides. Enter começa. Setas esquerda e direita movem a nave. Cada aperto de Espaço dispara um laser. Acerte 20 asteroides antes de perder as três vidas. Asteroides que passam sem bater não tiram vida. Enter, depois do resultado, volta ao início.", [trocar "Projeto inicial de Nave Contra Asteroides. Enter começa. Cenário, nave, telas e reinício preparados; movimento e regras serão construídos nas aulas." por "Nave Contra Asteroides. Enter começa. Setas esquerda e direita movem a nave. Cada aperto de Espaço dispara um laser. Acerte 20 asteroides antes de perder as três vidas. Asteroides que passam sem bater não tiram vida. Enter, depois do resultado, volta ao início." em "Descrever o jogo"]. No "Clique em Rodar de novo para testar desde a abertura.", [rodar de novo]. No "Antes de Enter, confira que setas e Espaço aguardam. Comece. Teste as duas direções, um laser por aperto, acertos somando pontos e batidas tirando vida com proteção.", [tocar prévia 400 300] [segurar tecla ArrowRight por 0,3 s] [tecla Space] [tecla Enter] [segurar tecla ArrowLeft por 0,4 s] [tecla Space]. No "Teste uma partida com vitória e outra com derrota. Depois de cada resultado, confira que a nave não continua a se mover, atirar ou receber novas pedras.", [apontar prévia 400 240]. No "Depois do resultado, pressione Enter. A abertura volta. Pressione Enter outra vez. Confira zero acertos, três vidas e uma partida sem tiros ou pedras da rodada anterior. Sua combinação de imagens continua a mesma.", [tecla Enter] [tecla Enter] [apontar prévia 60 32] [apontar prévia 60 62]. No "confira se ficou assim", mostrar os blocos usados nesta parte [mostrar blocos "Se as vidas do sprite nave", "Quando apertar a tecla Enter"]. No "clique em Verificar projeto", verificar [verificar projeto]. No "clique em Enviar meu projeto", iniciar o envio e confirmar [enviar projeto]. No "Quando aparecer Projeto enviado!", voltar ao tamanho da aula [reduzir estúdio]. No "clique em Próxima parte", sair da parte [próxima parte].

**Fala para ElevenLabs:**

```text
[engaging, energetic, conversational voice] A missão está completa. Falta atualizar a descrição do jogo e conferir uma rodada nova, os dois resultados e o reinício.

[confident, clear, unhurried voice] Encontre a área Ao iniciar. Se ela não estiver aparecendo, arraste um espaço vazio entre os blocos até ela aparecer.

[short pause]

[confident, clear, unhurried voice] Encontre o bloco que descreve o jogo para quem usa leitor de tela. No texto, escreva: Nave Contra Asteroides. Enter começa. Setas esquerda e direita movem a nave. Cada aperto de Espaço dispara um laser. Acerte 20 asteroides antes de perder as três vidas. Asteroides que passam sem bater não tiram vida. Enter, depois do resultado, volta ao início.

[short pause]

[confident, clear, unhurried voice] Clique em Rodar de novo para testar desde a abertura.

[short pause]

[upbeat, encouraging voice] Antes de Enter, confira que setas e Espaço aguardam. Comece. Teste as duas direções, um laser por aperto, acertos somando pontos e batidas tirando vida com proteção.

[upbeat, encouraging voice] Teste uma partida com vitória e outra com derrota. Depois de cada resultado, confira que a nave não continua a se mover, atirar ou receber novas pedras.

[upbeat, encouraging voice] Depois do resultado, pressione Enter. A abertura volta. Pressione Enter outra vez. Confira zero acertos, três vidas e uma partida sem tiros ou pedras da rodada anterior. Sua combinação de imagens continua a mesma.

[reassuring, encouraging voice] Se algo não funcionou no seu jogo, volte aos blocos e confira se ficou assim: as regras de resultado estão depois das colisões, dentro de Se jogando; a vitória está no senão das vidas, e os blocos preparados de Enter e reinício continuam no projeto. Depois de corrigir, teste de novo.

[engaging, energetic, conversational voice] Funcionou? Clique em Verificar projeto. Se faltar alguma coisa, corrija os blocos e clique novamente.

[engaging, energetic, conversational voice] Quando aparecer Objetivo cumprido!, clique em Enviar meu projeto e confirme em Enviar.

[pleased, lively voice] Você construiu a missão da nave: movimento, lasers, asteroides, acertos, vidas e o resultado da partida!

[engaging, energetic, conversational voice] Quando aparecer Projeto enviado!, clique em Próxima parte.
```

**Recado na página (não gravar):** Hora de conferir e enviar! Teste a missão completa e envie. Teste no seu jogo e clique em Verificar projeto. Depois, envie o projeto e confirme em Enviar. Quando aparecer Projeto enviado!, clique em Próxima parte.

## Parte 8. Mostre sua rota espacial

**Clipe:** `video-compartilhar`

**Na tela:** A parte começa com o Estúdio à vista. No "clique em Compartilhar", abrir a revisão [compartilhar]. No "Confira o título e a descrição", apontar a revisão sem editar dados da criança. No "Clique em Gerar capa", gerar a capa de exemplo [tocar "Gerar capa"]. No "clique em Publicar", mostrar a publicação simulada do palco [tocar "Publicar"]. No "Clique em Copiar link de jogar", copiar o link de demonstração [tocar "Copiar link de jogar"]. No "Feche a janela", fechar [tocar "Fechar"]. No "clique em Concluir aula", concluir [concluir aula].

**Fala para ElevenLabs:**

```text
[pleased, lively voice] Olha quanta coisa você construiu! A nave responde, os lasers saem dela, as pedras chegam, os acertos contam e a partida sabe quando terminar. Agora alguém pode conhecer a rota que você preparou.

[engaging, energetic, conversational voice] Seu projeto já foi enviado na parte anterior. Se quiser compartilhar, clique em Compartilhar no Estúdio. Confira o título e a descrição que aparecem. Clique em Gerar capa e veja se a imagem representa o seu jogo.

[confident, clear, unhurried voice] Quando estiver pronto, clique em Publicar. Espere aparecer Seu jogo está no Mural!. Clique em Copiar link de jogar. Você pode pedir ajuda a um adulto para mostrar esse link à sua família.

[reassuring, encouraging voice] Compartilhar é uma escolha sua. Se preferir, você pode guardar o projeto sem publicar agora.

[upbeat, encouraging voice] Feche a janela quando terminar e clique em Concluir aula. A sua nave já tem uma missão para jogar de novo!
```

**Recado na página (não gravar):** Seu projeto já foi enviado! Se quiser, compartilhe o jogo no Mural e copie o link para mostrar à sua família. Você também pode concluir a aula sem publicar. Quando terminar, clique em Concluir aula.
