# Roteiro de produção · Termine e recomece a partida

**Produção:** a professora grava toda a fala principal. Na montagem kids, Debinha substitui somente os trechos da tabela, com a mesma frase e sem voz sobreposta. O master funciona sozinho no adulto. Notas e recados da página não são gravados. [Direção de voz e edição](../../../aulas-interativas-tecnico/DIRETRIZES-VOZ-ELEVENLABS.md).

## Seção 1. A meta do jogo

### Clipe `video-meta-do-jogo` · A meta do jogo

**Estimativa de gravação:** aproximadamente 2 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Clipe:** `video-meta-do-jogo`

**Na tela:** No "Sabe aquele brinquedo do parque", mostrar por 2 a 3 segundos o meme ilustrado, desenho nosso com o Zappy ou os personagens do jogo, sem foto de pessoa real nem meme da internet e sem cobrir a experiência: o Zappy diante da placa de altura do brinquedo do parque [na edição: meme da placa do parque]. No "Agora você vai investigar", ampliar a experiência e mostrar a cena parada, sem tocar nos controles [ampliar experiência]. No "O Zappy ajuda", mostrar o Zappy [apontar zappy]. No "Quando terminar, clique em Próxima parte", voltar ao tamanho da aula [voltar à aula] e clicar em **Próxima parte** [próxima parte]. Não dizer em que acerto vem a vitória com nenhum dos sinais nem o que acontece com a placa. Não apontar os controles da experiência, não fazer os testes pela criança nem mostrar o resultado de nenhuma comparação: a criança descobre na experiência. Não falar de blocos, áreas do Estúdio, regra nem código (decisões de 01/11 e 02/11/2026).

**Fala para ElevenLabs:**

```text
[engaging, energetic, conversational voice] Sabe aquele brinquedo do parque com uma placa na entrada, com a altura que a criança precisa ter? Cada criança que chega é comparada com o número da placa.

[engaging, energetic, conversational voice] No seu jogo também tem uma placa: a meta de 26 pontos. A cada acerto o placar sobe, e o jogo compara o placar com a meta, com um sinal: maior que, ou maior ou igual.

[curious] Com maior que, chegar a 26 já dá a vitória?

[engaging, energetic, conversational voice] O que você acha? Isso você vai testar na experiência.

[upbeat, encouraging voice] Agora você vai investigar em que acerto vem a vitória com cada sinal, e se a placa da meta pode mudar no meio da partida. Você escolhe por onde começar e pode repetir os testes. O Zappy ajuda a observar as diferenças. Quando terminar, clique em Próxima parte.
```

**Substituições na edição kids:**

| ID | Personagem | Ocorrência | Âncora anterior | Fala exata substituída | Âncora posterior | Tags |
| --- | --- | --- | --- | --- | --- | --- |
| video-meta-do-jogo-K1 | Debinha | 1 | pontos. A cada acerto o placar sobe, e o jogo compara o placar com a meta, com um sinal: maior que, ou maior ou igual. | Com maior que, chegar a 26 já dá a vitória? | O que você acha? Isso você vai testar na experiência. Agora você vai investigar em que acerto vem a vitória com cada | [curious] |

No adulto, manter toda a fala da professora. No kids, silenciar apenas o trecho marcado e substituir pelo áudio do personagem, sem sobrepor vozes.

**Imagem nas substituições kids (não gravar):**

- `video-meta-do-jogo-K1`: entrada — Manter o meme da placa do parque até o fim da frase da professora. Saída — Depois da saída, ampliar a experiência parada, sem acertar nenhuma pedra.


**Falas dentro da experiência:** `packages/core/src/learning/scene/guia-livre/score-goal.ts`, na tela `packages/member-shell/src/components/scene-livre/score-goal.tsx`. A orientação do Zappy sugere comparações pelo estado observado; os controles ficam livres e as descobertas contam em qualquer ordem.

**Recado na página (não gravar):** Sua vez! Investigue em que acerto o jogo dá a vitória com cada sinal, e se a placa da meta muda no meio da partida. Você escolhe a ordem dos testes, e o Zappy sugere o que observar. Quando terminar, clique em Próxima parte.

## Seção 2. Defina quando você ganha

### Clipe `video-finais` · Defina quando você ganha

**Estimativa de gravação:** aproximadamente 5 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Clipe:** `video-finais`

**Na tela:** A parte começa com o Estúdio expandido e o projeto da aula anterior [expandir estúdio]. No "comece uma partida e faça alguns pontos", clicar no jogo [tocar prévia 400 240], tocar em Enter [tecla Enter] e atirar [tecla Space] até acertar uma pedra. No "Lembra da experiência da meta", a tela fica parada, sem refazer a experiência nem mostrar o resultado dela. No "Deixe à vista o espaço entre Dar ao sprite", apontar o lugar [apontar abaixo de "Dar ao sprite"]. No "Agora abra Programação e depois Variáveis", abrir as categorias [categoria Programação > Variáveis] e encaixar o bloco [encaixar "Criar constante" abaixo de "Dar ao sprite"]. No "Clique em PI, troque por alvo", trocar o nome [trocar "PI" por "alvo" em "Criar constante"]. No "Agora clique no 0 do valor", trocar o número [trocar "0" por "26" em "Criar constante"]. No "É este bloco que guarda a meta", apontar o bloco [apontar bloco "Criar constante"]. No "Abra Programação e depois Lógica e Se", abrir as categorias [categoria Programação > Lógica & Se] e soltar o Se logo depois de Desenhar as vidas do sprite. No "No lado esquerdo, clique em x", escolher pontos. No "No meio, clique no sinal de maior", escolher o sinal de maior ou igual. No "Abra Programação e depois Valores", abrir as categorias [categoria Programação > Valores], soltar **valor da variável** em cima do 0 e escolher alvo. No "pegue o bloco Mudar o estado do jogo para, solte dentro desse então", abrir as categorias [categoria Jogo 2D > Jogo e telas > Telas e partida], soltar o bloco e escolher vitoria. No "Clique em Verificar projeto", verificar [verificar projeto]. No "Quando aparecer Objetivo cumprido!, clique em Próxima parte", voltar ao tamanho da aula [reduzir estúdio] e clicar em **Próxima parte** [próxima parte]. Ao terminar, clicar em Verificar projeto, mostrar Objetivo cumprido! e seguir o encaminhamento narrado.

**Fala para ElevenLabs:**

```text
[engaging, energetic, conversational voice] Aqui no seu jogo, comece uma partida e faça alguns pontos. Tá vendo? A partida continua sem fim, porque o jogo ainda não sabe quando você ganha.

[engaging, energetic, conversational voice] Lembra da experiência da meta? A placa nunca mudou, e com maior ou igual o 26 já valia. Agora a gente vai pôr isso no seu jogo!

[engaging, energetic, conversational voice] Um nome que guarda um valor que não muda se chama constante. A meta vai numa constante, criada uma vez, quando o jogo começa. Por isso, ela vai em Ao iniciar.

[confident, clear, unhurried voice] Deixe à vista o espaço entre Dar ao sprite nave 3 de vida e Mudar o estado do jogo para inicio, em Ao iniciar.

[confident, clear, unhurried voice] Agora abra Programação e depois Variáveis, e pegue o bloco Criar constante com valor. Arraste e solte logo abaixo de Dar ao sprite nave 3 de vida.

[confident, clear, unhurried voice] Repare: o nome chega como PI. Clique em PI, troque por alvo e clique fora do campo.

[confident, clear, unhurried voice] Agora clique no 0 do valor, troque por 26 e clique fora do campo.

[engaging, energetic, conversational voice] É este bloco que guarda a meta, 26, com o nome alvo, como a placa da experiência.

[engaging, energetic, conversational voice] Agora a pergunta da vitória. O jogo faz essa pergunta em todo quadro, durante a partida. Por isso, ela vai no fim do então de Se o estado do jogo é jogando, logo depois de Desenhar as vidas do sprite.

[engaging, energetic, conversational voice] Deixe esse lugar à vista. Abra Programação e depois Lógica e Se, pegue o bloco Se e solte nesse lugar.

[engaging, energetic, conversational voice] Desta vez, a pergunta que vem no Se vai ser usada. Ela é uma comparação: um valor, um sinal e outro valor.

[engaging, energetic, conversational voice] No lado esquerdo, clique em x e escolha pontos.

[engaging, energetic, conversational voice] No meio, clique no sinal de maior e escolha o sinal de maior ou igual, o que tem um tracinho embaixo. Esse sinal quer dizer chegou ou passou, como você viu na experiência.

[curious] E do outro lado vai a meta?

[engaging, energetic, conversational voice] Isso: a constante alvo. Deixe à vista o 0, à direita da comparação. Abra Programação e depois Valores, pegue o bloco valor da variável, solte em cima do 0 e escolha alvo.

[curious] Agora a pergunta ficou assim: pontos maior ou igual a alvo. Ou seja, a partida já chegou à meta?

[confident, clear, unhurried voice] Deixe à vista o espaço do então dessa comparação. Abra Jogo 2D, depois Jogo e telas e depois Telas e partida, pegue o bloco Mudar o estado do jogo para, solte dentro desse então e escolha vitoria.

[engaging, energetic, conversational voice] É este bloco que leva o jogo para o estado vitoria quando a meta é alcançada.

[confident, clear, unhurried voice] Confira se ficou assim: em Ao iniciar, entre Dar ao sprite nave 3 de vida e Mudar o estado do jogo para inicio, está Criar constante alvo com valor 26. E, no fim de jogando, depois de Desenhar as vidas do sprite, está o Se pontos maior ou igual a alvo, que muda o estado para vitoria.

[engaging, energetic, conversational voice] A tela da vitória ainda não existe, e chegar a 26 pontos leva tempo. Por isso, desta vez quem confere o que você montou é a verificação. A tela vem daqui a duas partes.

[engaging, energetic, conversational voice] Funcionou? Clique em Verificar projeto. Se faltar alguma coisa, corrija os blocos e clique novamente. Quando aparecer Objetivo cumprido!, clique em Próxima parte.
```

**Substituições na edição kids:**

| ID | Personagem | Ocorrência | Âncora anterior | Fala exata substituída | Âncora posterior | Tags |
| --- | --- | --- | --- | --- | --- | --- |
| video-finais-K1 | Debinha | 1 | de maior ou igual, o que tem um tracinho embaixo. Esse sinal quer dizer chegou ou passou, como você viu na experiência. | E do outro lado vai a meta? | Isso: a constante alvo. Deixe à vista o 0, à direita da comparação. Abra Programação e depois Valores, pegue o bloco | [curious] |

No adulto, manter toda a fala da professora. No kids, silenciar apenas o trecho marcado e substituir pelo áudio do personagem, sem sobrepor vozes.

**Imagem nas substituições kids (não gravar):**

- `video-finais-K1`: entrada — Manter à vista a comparação com pontos e o sinal de maior ou igual. Saída — Depois da saída, apontar o 0 à direita da comparação.


**Recado na página (não gravar):** Agora defina quando você ganha! Crie a meta alvo com 26, monte a pergunta da vitória dentro de jogando e clique em Verificar projeto. Depois, clique em Próxima parte.

## Seção 3. Defina quando você perde

### Clipe `video-derrota` · Defina quando você perde

**Estimativa de gravação:** aproximadamente 3 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Clipe:** `video-derrota`

**Na tela:** A parte começa com o Estúdio expandido e o projeto da parte anterior [expandir estúdio]. No "comece uma partida e deixe as vidas acabarem", clicar no jogo [tocar prévia 400 240], tocar em Enter [tecla Enter] e deixar as pedras baterem na nave. No "Deixe à vista o encaixe logo abaixo do Se da vitória", abrir as categorias [categoria Programação > Lógica & Se] e soltar o Se nesse encaixe. No "Arraste essa pergunta para a lixeira", levar a pergunta x > 0 com a mão até a lixeira. No "pegue o bloco as vidas do sprite acabaram", abrir as categorias [categoria Jogo 2D > Vida e placar > Vida], soltar o bloco ao lado de Se e escolher nave. No "pegue o bloco Mudar o estado do jogo para, solte dentro do então", abrir as categorias [categoria Jogo 2D > Jogo e telas > Telas e partida], soltar o bloco e escolher fim. No "Olha aqui: a ordem no fim de jogando", apontar as duas perguntas, uma depois da outra. No "Agora teste: comece uma partida", clicar no jogo [tocar prévia 400 240], tocar em Enter [tecla Enter] e deixar as vidas acabarem. No "Clique em Verificar projeto", verificar [verificar projeto]. No "Quando aparecer Objetivo cumprido!, clique em Próxima parte", voltar ao tamanho da aula [reduzir estúdio] e clicar em **Próxima parte** [próxima parte]. Ao terminar, clicar em Verificar projeto, mostrar Objetivo cumprido! e seguir o encaminhamento narrado.

**Fala para ElevenLabs:**

```text
[engaging, energetic, conversational voice] Aqui no seu jogo, comece uma partida e deixe as vidas acabarem. Tá vendo? A partida continua, porque o jogo ainda não sabe quando você perde.

[engaging, energetic, conversational voice] A pergunta da derrota é outra: as vidas da nave acabaram? Ela também vai em jogando, logo abaixo da pergunta da vitória.

[confident, clear, unhurried voice] Deixe à vista o encaixe logo abaixo do Se da vitória, ainda dentro de jogando. Abra Programação e depois Lógica e Se, pegue outro Se e solte nesse encaixe.

[engaging, energetic, conversational voice] Desta vez, a pergunta x maior que 0 não serve. Arraste essa pergunta para a lixeira.

[confident, clear, unhurried voice] Deixe à vista o lugar vazio ao lado de Se. Abra Jogo 2D, depois Vida e placar e depois Vida, pegue o bloco as vidas do sprite acabaram?, solte nesse lugar e escolha nave.

[engaging, energetic, conversational voice] É este bloco que pergunta se a nave ficou sem vidas.

[confident, clear, unhurried voice] Deixe à vista o espaço do então desse Se. Abra Jogo 2D, depois Jogo e telas e depois Telas e partida, pegue o bloco Mudar o estado do jogo para, solte dentro do então e escolha fim.

[curious] E se as duas coisas acontecerem juntas?

[interested, animated voice] Olha aqui: a ordem no fim de jogando é primeiro o desenho das vidas, depois a pergunta da vitória e por último a da derrota. Se as duas coisas acontecerem no mesmo quadro, a derrota vem por último, e é ela que vale.

[upbeat, encouraging voice] Agora teste: comece uma partida e deixe as vidas acabarem. [confident, clear, unhurried voice] Repare: a partida para, porque o estado mudou para fim, e o jogo não está mais jogando.

[reassuring, encouraging voice] Se algo não funcionou no seu jogo, volte aos blocos e confira se ficou assim: no fim de jogando, depois do Se da vitória, está o Se as vidas do sprite nave acabaram?, que muda o estado para fim. [reassuring, encouraging voice] Depois de corrigir, teste de novo.

[engaging, energetic, conversational voice] A tela da derrota ainda não aparece. Ela vem na próxima parte.

[engaging, energetic, conversational voice] Funcionou? Clique em Verificar projeto. Se faltar alguma coisa, corrija os blocos e clique novamente. Quando aparecer Objetivo cumprido!, clique em Próxima parte.
```

**Substituições na edição kids:**

| ID | Personagem | Ocorrência | Âncora anterior | Fala exata substituída | Âncora posterior | Tags |
| --- | --- | --- | --- | --- | --- | --- |
| video-derrota-K1 | Debinha | 1 | Jogo e telas e depois Telas e partida, pegue o bloco Mudar o estado do jogo para, solte dentro do então e escolha fim. | E se as duas coisas acontecerem juntas? | Olha aqui: a ordem no fim de jogando é primeiro o desenho das vidas, depois a pergunta da vitória e por último a da | [curious] |

No adulto, manter toda a fala da professora. No kids, silenciar apenas o trecho marcado e substituir pelo áudio do personagem, sem sobrepor vozes.

**Imagem nas substituições kids (não gravar):**

- `video-derrota-K1`: entrada — Manter à vista as duas perguntas, a da vitória e a da derrota. Saída — Depois da saída, apontar a ordem das perguntas no fim de jogando.


**Recado na página (não gravar):** Agora defina quando você perde! Monte a pergunta da derrota logo abaixo da vitória e clique em Verificar projeto. Depois, clique em Próxima parte.

## Seção 4. Mostre a vitória e a derrota

### Clipe `video-mostrar-telas` · Mostre a vitória e a derrota

**Estimativa de gravação:** aproximadamente 4 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Clipe:** `video-mostrar-telas`

**Na tela:** A parte começa com o Estúdio expandido e o projeto da parte anterior [expandir estúdio]. No "comece uma partida e deixe as vidas acabarem", clicar no jogo [tocar prévia 400 240], tocar em Enter [tecla Enter] e deixar as pedras baterem na nave. No "Encontre esse Se", arrastar até o Se aparecer [arrastar até "Se"]. No "clique uma vez no sinal de mais", clicar no sinal de mais que fica antes de senão se. No "arraste essa pergunta para a lixeira", levar a pergunta x > 0 com a mão até a lixeira. No "pegue o bloco o estado do jogo é, solte nesse lugar e escolha vitoria", abrir as categorias [categoria Jogo 2D > Jogo e telas > Telas e partida], soltar o bloco e escolher vitoria. No "pegue o bloco Mostrar tela com título", soltar o bloco no então do ramo vitoria. No "Agora os textos da vitória", escrever Você ganhou! no título, apagar o subtítulo e escrever a dica. No "Agora a derrota, do mesmo jeito", repetir com o estado fim e os textos da derrota. No "Agora teste: clique na área do jogo", clicar no jogo [tocar prévia 400 240], tocar em Enter [tecla Enter] e deixar as vidas acabarem até a tela Você perdeu aparecer. No "Clique em Verificar projeto", verificar [verificar projeto]. No "Quando aparecer Objetivo cumprido!, clique em Próxima parte", voltar ao tamanho da aula [reduzir estúdio] e clicar em **Próxima parte** [próxima parte]. Ao terminar, clicar em Verificar projeto, mostrar Objetivo cumprido! e seguir o encaminhamento narrado.

**Fala para ElevenLabs:**

```text
[engaging, energetic, conversational voice] Aqui no seu jogo, comece uma partida e deixe as vidas acabarem. Tá vendo? A partida para, mas nenhuma tela de fim aparece, porque o Se grande ainda não tem um ramo para fim.

[engaging, energetic, conversational voice] O Se grande de A cada quadro do jogo tem os ramos de jogando e de inicio. Agora ele vai ganhar mais dois: um para vitoria e um para fim.

[engaging, energetic, conversational voice] Encontre esse Se, dentro de A cada quadro do jogo. [interested, animated voice] Olha aqui: na linha de baixo dele, clique uma vez no sinal de mais que fica antes de senão se, para criar o ramo da vitória.

[engaging, energetic, conversational voice] O ramo novo chega com a pergunta x maior que 0: arraste essa pergunta para a lixeira.

[confident, clear, unhurried voice] Deixe à vista o lugar vazio ao lado desse senão se. Abra Jogo 2D, depois Jogo e telas e depois Telas e partida, pegue o bloco o estado do jogo é, solte nesse lugar e escolha vitoria.

[confident, clear, unhurried voice] Deixe à vista o espaço do então do ramo vitoria. Na mesma categoria Telas e partida, pegue o bloco Mostrar tela com título subtítulo dica fundo e solte nesse espaço.

[engaging, energetic, conversational voice] Agora os textos da vitória: no título, escreva Você ganhou!, apague o subtítulo e, na dica, escreva Aperte Enter para voltar ao início. Depois, escolha um fundo escuro com letras legíveis.

[curious] E a tela de quando eu perder?

[engaging, energetic, conversational voice] Ela vem do mesmo jeito. Agora a derrota, do mesmo jeito. Clique de novo no sinal de mais que fica antes de senão se e arraste a pergunta x maior que 0 do ramo novo para a lixeira.

[confident, clear, unhurried voice] Deixe à vista o lugar vazio. Na mesma categoria Telas e partida, pegue o estado do jogo é, solte nesse lugar e escolha fim.

[confident, clear, unhurried voice] Deixe à vista o espaço do então do ramo fim. Pegue outro Mostrar tela com título subtítulo dica fundo, na mesma categoria, e solte nesse espaço.

[engaging, energetic, conversational voice] No título, escreva Você perdeu, apague o subtítulo e, na dica, escreva Aperte Enter para voltar ao início. Depois, escolha um fundo escuro.

[upbeat, encouraging voice] Agora teste: clique na área do jogo, toque em Enter e deixe as vidas acabarem. [interested, animated voice] Olha só: aparece a tela Você perdeu! É que a pergunta das vidas muda o estado para fim, e o ramo fim mostra essa tela.

[engaging, energetic, conversational voice] A dica já fala em voltar ao início, mas o Enter ainda não faz isso: essa resposta vem depois da próxima experiência.

[reassuring, encouraging voice] Se algo não funcionou no seu jogo, volte aos blocos e confira se ficou assim: o Se grande tem os ramos jogando, inicio, vitoria e fim, nessa ordem, e os ramos vitoria e fim mostram as telas Você ganhou! e Você perdeu, com a dica Aperte Enter para voltar ao início. [reassuring, encouraging voice] Depois de corrigir, teste de novo.

[engaging, energetic, conversational voice] Funcionou? Clique em Verificar projeto. Se faltar alguma coisa, corrija os blocos e clique novamente. Quando aparecer Objetivo cumprido!, clique em Próxima parte.
```

**Substituições na edição kids:**

| ID | Personagem | Ocorrência | Âncora anterior | Fala exata substituída | Âncora posterior | Tags |
| --- | --- | --- | --- | --- | --- | --- |
| video-mostrar-telas-K1 | Debinha | 1 | subtítulo e, na dica, escreva Aperte Enter para voltar ao início. Depois, escolha um fundo escuro com letras legíveis. | E a tela de quando eu perder? | Ela vem do mesmo jeito. Agora a derrota, do mesmo jeito. Clique de novo no sinal de mais que fica antes de senão se e | [curious] |

No adulto, manter toda a fala da professora. No kids, silenciar apenas o trecho marcado e substituir pelo áudio do personagem, sem sobrepor vozes.

**Imagem nas substituições kids (não gravar):**

- `video-mostrar-telas-K1`: entrada — Manter à vista a tela da vitória preenchida no bloco. Saída — Depois da saída, apontar a linha dos sinais de mais do Se grande.


**Recado na página (não gravar):** Agora mostre a vitória e a derrota! Crie os ramos vitoria e fim depois do ramo inicio, com os textos de cada tela, e clique em Verificar projeto. Depois, clique em Próxima parte.

## Seção 5. Jogar outra vez

### Clipe `video-reiniciar` · Jogar outra vez

**Estimativa de gravação:** aproximadamente 1 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Clipe:** `video-reiniciar`

**Na tela:** No "Sabe quando você termina um jogo de tabuleiro", mostrar por 2 a 3 segundos o meme ilustrado, desenho nosso com o Zappy ou os personagens do jogo, sem foto de pessoa real nem meme da internet e sem cobrir a experiência: o Zappy diante de um tabuleiro no fim da partida, pensando em como recomeçar [na edição: meme do tabuleiro]. No "Agora você vai investigar", ampliar a experiência e mostrar a cena parada, sem tocar nos controles [ampliar experiência]. No "O Zappy ajuda", mostrar o Zappy [apontar zappy]. No "Quando terminar, clique em Próxima parte", voltar ao tamanho da aula [voltar à aula] e clicar em **Próxima parte** [próxima parte]. Não apontar os controles da experiência, não fazer os testes pela criança nem mostrar o resultado de nenhuma comparação: a criança descobre na experiência. Não falar de blocos, áreas do Estúdio, regra nem código (decisões de 01/11 e 02/11/2026).

**Fala para ElevenLabs:**

```text
[engaging, energetic, conversational voice] Sabe quando você termina um jogo de tabuleiro e quer jogar de novo? Antes de recomeçar, vale olhar como ficou o tabuleiro.

[engaging, energetic, conversational voice] No seu jogo, quando a partida acaba, o Enter pode fazer duas coisas: só voltar para a tela de início, ou começar tudo de novo.

[curious] E a partida nova começa igual nos dois jeitos?

[engaging, energetic, conversational voice] O que você acha? Isso você vai testar na experiência.

[upbeat, encouraging voice] Agora você vai investigar o que muda na partida nova quando o Enter só volta para a tela de início e quando ele começa tudo de novo. Você escolhe por onde começar e pode repetir os testes. O Zappy ajuda a observar as diferenças. Quando terminar, clique em Próxima parte.
```

**Substituições na edição kids:**

| ID | Personagem | Ocorrência | Âncora anterior | Fala exata substituída | Âncora posterior | Tags |
| --- | --- | --- | --- | --- | --- | --- |
| video-reiniciar-K1 | Debinha | 1 | jogo, quando a partida acaba, o Enter pode fazer duas coisas: só voltar para a tela de início, ou começar tudo de novo. | E a partida nova começa igual nos dois jeitos? | O que você acha? Isso você vai testar na experiência. Agora você vai investigar o que muda na partida nova quando o | [curious] |

No adulto, manter toda a fala da professora. No kids, silenciar apenas o trecho marcado e substituir pelo áudio do personagem, sem sobrepor vozes.

**Imagem nas substituições kids (não gravar):**

- `video-reiniciar-K1`: entrada — Manter o meme do tabuleiro até o fim da frase da professora. Saída — Depois da saída, ampliar a experiência sem jogar.


**Falas dentro da experiência:** `packages/core/src/learning/scene/guia-livre/restart.ts`, na tela `packages/member-shell/src/components/scene-livre/restart.tsx`. A orientação do Zappy sugere comparações pelo estado observado; os controles ficam livres e as descobertas contam em qualquer ordem.

**Recado na página (não gravar):** Sua vez! Investigue o que muda na partida nova em cada jeito de o Enter recomeçar. Você escolhe a ordem dos testes, e o Zappy sugere o que observar. Quando terminar, clique em Próxima parte.

## Seção 6. Faça Enter preparar outra partida

### Clipe `video-enter` · Faça Enter preparar outra partida

**Estimativa de gravação:** aproximadamente 4 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Clipe:** `video-enter`

**Na tela:** A parte começa com o Estúdio expandido e o projeto da parte anterior [expandir estúdio]. No "perca uma partida e toque em Enter", clicar no jogo [tocar prévia 400 240], tocar em Enter [tecla Enter], deixar as vidas acabarem e tocar em Enter de novo [tecla Enter]. No "Encontre o evento Enter", arrastar até o evento aparecer [arrastar até "Quando apertar a tecla"]. No "clique uma vez no sinal de mais", clicar no sinal de mais que fica antes de senão se, no Se do evento Enter. No "arraste essa pergunta para a lixeira", levar a pergunta x > 0 com a mão até a lixeira. No "pegue o bloco o estado do jogo é, solte nesse lugar e escolha fim", abrir as categorias [categoria Jogo 2D > Jogo e telas > Telas e partida], soltar o bloco e escolher fim. No "pegue o bloco Reiniciar o jogo", soltar o bloco no então do ramo fim. No "É este bloco que começa tudo de novo", apontar o bloco [apontar bloco "Reiniciar o jogo"]. No "Agora a vitória, do mesmo jeito", repetir com o estado vitoria e outro Reiniciar o jogo. No "Agora teste: perca uma partida e toque em Enter", clicar no jogo [tocar prévia 400 240], tocar em Enter [tecla Enter], deixar as vidas acabarem e tocar em Enter [tecla Enter]. No "Toque em Enter outra vez", tocar em Enter [tecla Enter] e apontar o placar e os corações [apontar prévia 60 40]. No "Clique em Verificar projeto", verificar [verificar projeto]. No "Quando aparecer Objetivo cumprido!, clique em Próxima parte", voltar ao tamanho da aula [reduzir estúdio] e clicar em **Próxima parte** [próxima parte]. Ao terminar, clicar em Verificar projeto, mostrar Objetivo cumprido! e seguir o encaminhamento narrado.

**Fala para ElevenLabs:**

```text
[engaging, energetic, conversational voice] Aqui no seu jogo, perca uma partida e toque em Enter. Tá vendo? Você perdeu continua na tela, porque o Enter só sabe começar a partida.

[engaging, energetic, conversational voice] Lembra da experiência da parte anterior? Começando tudo de novo, os asteroides saíam e a abertura voltava. Agora a gente vai ensinar isso ao Enter do seu jogo!

[engaging, energetic, conversational voice] Encontre o evento Enter em Quando acontecer. A pergunta dentro dele já começa a partida quando o estado é inicio, e esse pedaço fica como está.

[engaging, energetic, conversational voice] Na linha de baixo do Se que está dentro do evento Enter, clique uma vez no sinal de mais que fica antes de senão se.

[engaging, energetic, conversational voice] O ramo novo chega com a pergunta x maior que 0: arraste essa pergunta para a lixeira.

[confident, clear, unhurried voice] Deixe à vista o lugar vazio ao lado de senão se. Abra Jogo 2D, depois Jogo e telas e depois Telas e partida, pegue o bloco o estado do jogo é, solte nesse lugar e escolha fim.

[confident, clear, unhurried voice] Deixe à vista o espaço do então do ramo fim. Na mesma categoria Telas e partida, pegue o bloco Reiniciar o jogo e solte nesse espaço.

[engaging, energetic, conversational voice] É este bloco que começa tudo de novo: o jogo volta ao começo, faz outra vez a preparação de Ao iniciar e mostra a abertura.

[engaging, energetic, conversational voice] E quando eu ganhar? Também quero jogar de novo!

[engaging, energetic, conversational voice] Por isso, a vitória ganha um ramo igual. Agora a vitória, do mesmo jeito. Clique de novo no sinal de mais que fica antes de senão se e arraste a pergunta x maior que 0 do ramo novo para a lixeira.

[confident, clear, unhurried voice] Deixe à vista o lugar vazio. Na mesma categoria, pegue o estado do jogo é, solte nesse lugar e escolha vitoria.

[confident, clear, unhurried voice] Deixe à vista o espaço do então do ramo vitoria, pegue outro Reiniciar o jogo e solte nesse espaço.

[upbeat, encouraging voice] Agora teste: perca uma partida e toque em Enter. [interested, animated voice] Olha só: a abertura volta! Toque em Enter outra vez, porque é esse segundo Enter que começa a partida nova.

[confident, clear, unhurried voice] Repare: o placar está em zero e os três corações voltaram, porque Reiniciar o jogo fez a preparação de novo.

[reassuring, encouraging voice] Se algo não funcionou no seu jogo, volte aos blocos e confira se ficou assim: dentro do evento Enter, o Se tem três ramos. Em inicio, o Enter muda o estado para jogando. Em fim e em vitoria, o Enter reinicia o jogo. E Dar ao sprite nave 3 de vida continua em Ao iniciar. [reassuring, encouraging voice] Depois de corrigir, teste de novo.

[engaging, energetic, conversational voice] Funcionou? Clique em Verificar projeto. Se faltar alguma coisa, corrija os blocos e clique novamente. Quando aparecer Objetivo cumprido!, clique em Próxima parte.
```

**Substituições na edição kids:**

| ID | Personagem | Ocorrência | Âncora anterior | Fala exata substituída | Âncora posterior | Tags |
| --- | --- | --- | --- | --- | --- | --- |
| video-enter-K1 | Debinha | 1 | bloco que começa tudo de novo: o jogo volta ao começo, faz outra vez a preparação de Ao iniciar e mostra a abertura. | E quando eu ganhar? Também quero jogar de novo! | Por isso, a vitória ganha um ramo igual. Agora a vitória, do mesmo jeito. Clique de novo no sinal de mais que fica | [thoughtful] |

No adulto, manter toda a fala da professora. No kids, silenciar apenas o trecho marcado e substituir pelo áudio do personagem, sem sobrepor vozes.

**Imagem nas substituições kids (não gravar):**

- `video-enter-K1`: entrada — Manter à vista Reiniciar o jogo no ramo fim do evento Enter. Saída — Depois da saída, apontar a linha dos sinais de mais do Se do Enter.


**Recado na página (não gravar):** Agora faça o Enter preparar outra partida! Acrescente ao evento Enter os ramos fim e vitoria, com Reiniciar o jogo, e clique em Verificar projeto. Depois, clique em Próxima parte.

## Seção 7. Confira o que você construiu

**Recado na página (não gravar):** Hora de conferir o que você construiu! Responda sobre o Enter, a partida e a vitória, pensando nos testes do seu jogo. Depois de enviar, leia as explicações e, se errar alguma, corrija e tente de novo. Quando acertar todas, clique em Próxima parte.

Sem vídeo ou ferramenta nesta parte. O quiz vem imediatamente depois do Zappy. Leia a explicação após enviar; tentativas ilimitadas, sem espera.

## Seção 8. Teste o jogo completo e compartilhe

### Clipe `video-ciclo-completo` · Teste o jogo completo e compartilhe

**Estimativa de gravação:** aproximadamente 3 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Clipe:** `video-ciclo-completo`

**Na tela:** A parte começa com o Estúdio expandido e o projeto da parte anterior [expandir estúdio]. No "Na abertura, clique na área do jogo e toque na barra de espaço", clicar no jogo [tocar prévia 400 240] e tocar na barra de espaço [tecla Space], deixando ouvir o silêncio. No "Toque em Enter, mova a nave e atire", tocar em Enter [tecla Enter], segurar uma seta e atirar [tecla Space]. No "deixe as três vidas acabarem", esperar a tela Você perdeu. No "Toque em Enter para voltar à abertura", tocar em Enter duas vezes [tecla Enter] [tecla Enter] e apontar o placar e os corações [apontar prévia 60 40]. No "tente chegar a 26 pontos", jogar até a vitória; se a gravação ficar longa, cortar na edição e manter só a chegada à tela Você ganhou!. No "Na vitória, toque na barra de espaço", tocar na barra de espaço [tecla Space] e depois em Enter duas vezes [tecla Enter] [tecla Enter]. No "Olha só o que você programou", mostrar o jogo rodando. No "Clique em Verificar projeto", verificar [verificar projeto]. No "clique em Enviar meu projeto", enviar e confirmar [enviar projeto]. No "clique em Compartilhar depois do envio", abrir o Compartilhar [compartilhar]. No "O resumo do projeto já vem preenchido", mostrar o resumo [apontar "Resumo do projeto"]. No "clique em Gerar capa", gerar a capa [clicar "Gerar capa"]. No "clique em Publicar", publicar [clicar "Publicar"]. No "Clique em Copiar link de jogar", copiar o link [clicar "Copiar link de jogar"]. No "clique em Fechar", fechar [clicar "Fechar"]. No "Por último, clique em Concluir aula", voltar ao tamanho da aula [reduzir estúdio] e clicar em **Concluir aula** [concluir aula]. Ao terminar, clicar em Verificar projeto, mostrar Objetivo cumprido! e seguir o encaminhamento narrado.

**Fala para ElevenLabs:**

```text
[upbeat, encouraging voice] Agora teste o ciclo completo do seu jogo. Na abertura, clique na área do jogo e toque na barra de espaço. [confident, clear, unhurried voice] Repare: não sai som de tiro, porque os tiros só nascem dentro de Se jogando.

[engaging, energetic, conversational voice] Toque em Enter, mova a nave e atire. Depois, deixe as três vidas acabarem e confira a tela Você perdeu.

[engaging, energetic, conversational voice] Toque em Enter para voltar à abertura e mais uma vez para começar. [confident, clear, unhurried voice] Confira se a partida nova começa com zero pontos e três corações.

[engaging, energetic, conversational voice] Nessa partida, tente chegar a 26 pontos para ver a tela da vitória. Se perder antes, recomece e tente de novo.

[engaging, energetic, conversational voice] Na vitória, toque na barra de espaço: nenhum tiro pode sair. Toque em Enter para voltar à abertura e outra vez para jogar, e confira de novo os pontos e as vidas.

[engaging, energetic, conversational voice] Se algum final não funcionou no seu jogo, volte aos blocos e confira a pergunta que muda o estado e o ramo que mostra aquela tela. [reassuring, encouraging voice] Depois de corrigir, teste de novo.

[pleased, lively voice] Olha só o que você programou: os controles, os tiros, os acertos, os pontos, as vidas e as telas! É assim que a sua nave enfrenta os asteroides, do começo ao fim da partida.

[engaging, energetic, conversational voice] Funcionou? Clique em Verificar projeto. Se faltar alguma coisa, corrija os blocos e clique novamente. Quando aparecer Objetivo cumprido!, clique em Enviar meu projeto e confirme em Enviar.

[engaging, energetic, conversational voice] Agora, se quiser, você pode mostrar o seu jogo no Mural, ou deixar para outra hora.

[engaging, energetic, conversational voice] Para publicar, clique em Compartilhar depois do envio. O resumo do projeto já vem preenchido. Deixe como está. Depois, clique em Gerar capa e confira a imagem. Com a capa pronta, clique em Publicar e espere a confirmação.

[pleased, lively voice] Seu jogo está no Mural! Agora a sua família e os seus amigos podem jogar o jogo que você criou. Clique em Copiar link de jogar e mande o link para eles, porque quem receber pode jogar direto, até no celular. Depois de copiar o link, clique em Fechar. Por último, clique em Concluir aula.
```


**Recado na página (não gravar):** Hora do teste final! Confira a derrota, a vitória e o recomeço, clique em Verificar projeto e envie o seu projeto. Se quiser, publique o seu jogo no Mural. Depois, clique em Concluir aula.
