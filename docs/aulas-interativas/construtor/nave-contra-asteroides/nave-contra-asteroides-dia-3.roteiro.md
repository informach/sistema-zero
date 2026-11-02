# Roteiro de produção · Faça o tiro acertar o asteroide

**Produção:** a professora grava toda a fala principal. Na montagem kids, Debinha substitui somente os trechos da tabela, com a mesma frase e sem voz sobreposta. O master funciona sozinho no adulto. Notas e recados da página não são gravados. [Direção de voz e edição](../../../aulas-interativas-tecnico/DIRETRIZES-VOZ-ELEVENLABS.md).

## Seção 1. Quem sai do jogo na trombada?

### Clipe `video-apelidos` · Quem sai do jogo na trombada?

**Estimativa de gravação:** aproximadamente 2 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Clipe:** `video-apelidos`

**Na tela:** No "Sabe o jogo de queimada", mostrar por 2 a 3 segundos o meme ilustrado, desenho nosso com o Zappy ou os personagens do jogo, sem foto de pessoa real nem meme da internet e sem cobrir a experiência: a nave e o Zappy jogando queimada, com só um jogador saindo da quadra [na edição: meme da queimada]. No "Olha aqui: nesta experiência", ampliar a experiência [ampliar experiência] e apontar as escolhas, sem clicar [apontar "O grupo dos tiros"] [apontar "O tiro que encostou"]. No "e este botão passa um segundo de jogo", apontar o botão [apontar "Passar 1 segundo"]. No "O Zappy ajuda", mostrar o Zappy [apontar zappy]. No "Quando terminar, clique em Próxima parte", voltar ao tamanho da aula [voltar à aula] e clicar em **Próxima parte** [próxima parte]. Não fazer os testes pela criança nem mostrar o resultado de nenhuma comparação: a criança descobre na experiência. Não falar de blocos, áreas do Estúdio, regra nem código (decisões de 01/11 e 02/11/2026).

**Fala para ElevenLabs:**

```text
[engaging, energetic, conversational voice] Sabe o jogo de queimada? Quando a bola acerta alguém, só quem foi acertado sai da quadra, e o resto do time continua jogando.

[engaging, energetic, conversational voice] No seu jogo, quando um tiro encosta numa pedra, o jogo precisa decidir quem sai: os grupos inteiros, ou só o tiro e a pedra que se encostaram.

[curious] E se o jogo tirar o grupo inteiro?

[engaging, energetic, conversational voice] O que você acha que acontece com os outros tiros e pedras? Isso você vai testar na experiência.

[interested, animated voice] Olha aqui: nesta experiência, você escolhe quem sai do jogo na trombada, de cada lado, e este botão passa um segundo de jogo.

[upbeat, encouraging voice] Agora é a sua vez de investigar: compare quem sai do jogo quando o jogo tira os grupos inteiros e quando tira só o tiro e a pedra que encostaram, e observe as outras pedras depois da trombada. Você escolhe por onde começar e pode repetir os testes. O Zappy ajuda a observar as diferenças. Quando terminar, clique em Próxima parte.
```

**Substituições na edição kids:**

| ID | Personagem | Ocorrência | Âncora anterior | Fala exata substituída | Âncora posterior | Tags |
| --- | --- | --- | --- | --- | --- | --- |
| video-apelidos-K1 | Debinha | 1 | tiro encosta numa pedra, o jogo precisa decidir quem sai: os grupos inteiros, ou só o tiro e a pedra que se encostaram. | E se o jogo tirar o grupo inteiro? | O que você acha que acontece com os outros tiros e pedras? Isso você vai testar na experiência. Olha aqui: nesta | [curious] |

No adulto, manter toda a fala da professora. No kids, silenciar apenas o trecho marcado e substituir pelo áudio do personagem, sem sobrepor vozes.

**Imagem nas substituições kids (não gravar):**

- `video-apelidos-K1`: entrada — Manter o meme da queimada até o fim da frase da professora. Saída — Depois da saída, ampliar a experiência com o tempo parado.


**Falas dentro da experiência:** `packages/core/src/learning/scene/guia-livre/collision-pair.ts`, na tela `packages/member-shell/src/components/scene-livre/collision-pair.tsx`. A orientação do Zappy sugere comparações pelo estado observado; os controles ficam livres e as descobertas contam em qualquer ordem.

**Recado na página (não gravar):** Sua vez! Descubra quem sai do jogo quando um tiro encosta numa pedra. Você escolhe a ordem dos testes, e o Zappy sugere o que observar. Quando terminar, clique em Próxima parte.

## Seção 2. Programe o acerto

### Clipe `video-colisao` · Programe o acerto

**Estimativa de gravação:** aproximadamente 5 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Clipe:** `video-colisao`

**Na tela:** A parte começa com o Estúdio expandido e o projeto da aula anterior [expandir estúdio]. No "clique na área do jogo e atire numa pedra", clicar no jogo [tocar prévia 400 240] e tocar na barra de espaço [tecla Space] quando uma pedra passar acima da nave. No "Deixe à vista o fim de A cada quadro do jogo", apontar o lugar [apontar abaixo de "Desenhar o grupo"]. No "Agora abra Jogo 2D, depois Colisões", abrir as categorias [categoria Jogo 2D > Colisões > Encostar e bloquear]. No "Arraste e solte logo depois de Desenhar o grupo asteroides", encaixar o bloco [encaixar "Para cada colisão entre os grupos" abaixo de "Desenhar o grupo"]. No "É este bloco que confere", apontar o bloco [apontar bloco "Para cada colisão entre os grupos"]. No "Repare na linha de baixo do bloco", apontar os apelidos. No "Abra Jogo 2D, depois Grupos e depois Participação e limpeza", abrir as categorias [categoria Jogo 2D > Grupos > Participação e limpeza] e encaixar o bloco [encaixar "Tirar o sprite do grupo" em "Para cada colisão entre os grupos"]. No "Escolha tiro como sprite", escolher tiro e tiros nos campos. No "Na mesma categoria, pegue outro Tirar o sprite do grupo", encaixar o segundo bloco logo abaixo do primeiro [encaixar "Tirar o sprite do grupo" abaixo de "Tirar o sprite do grupo"]. No "Abra Jogo 2D, depois Desenho e efeitos", abrir as categorias [categoria Jogo 2D > Desenho e efeitos > Partículas] e encaixar o bloco logo abaixo das retiradas. No "Abra Jogo 2D, depois Som", abrir as categorias [categoria Jogo 2D > Som > Efeitos prontos], encaixar o bloco logo abaixo da explosão e escolher explosão no menu. No "Agora teste: clique na área do jogo", clicar no jogo [tocar prévia 400 240] e atirar [tecla Space] até acertar uma pedra. No "Clique em Verificar projeto", verificar [verificar projeto]. No "Quando aparecer Objetivo cumprido!, clique em Próxima parte", voltar ao tamanho da aula [reduzir estúdio] e clicar em **Próxima parte** [próxima parte]. Ao terminar, clicar em Verificar projeto, mostrar Objetivo cumprido! e seguir o encaminhamento narrado.

**Fala para ElevenLabs:**

```text
[engaging, energetic, conversational voice] Aqui no seu jogo, clique na área do jogo e atire numa pedra. Tá vendo? O tiro atravessa, porque o jogo ainda não confere a trombada.

[engaging, energetic, conversational voice] Lembra da experiência da parte anterior? Na trombada, saíam só o tiro e a pedra que encostaram. Agora a gente vai programar esse acerto no seu jogo!

[engaging, energetic, conversational voice] O jogo confere as trombadas em todo quadro, depois que tudo já andou e foi desenhado. Por isso, a colisão vai no fim de A cada quadro do jogo.

[confident, clear, unhurried voice] Deixe à vista o fim de A cada quadro do jogo, logo depois de Desenhar o grupo asteroides.

[confident, clear, unhurried voice] Agora abra Jogo 2D, depois Colisões e depois Encostar e bloquear, e pegue o bloco Para cada colisão entre os grupos. Arraste e solte logo depois de Desenhar o grupo asteroides.

[engaging, energetic, conversational voice] É este bloco que confere, em todo quadro, se algum tiro encostou em alguma pedra. O que fica dentro dele acontece a cada trombada.

[curious] Como ele sabe qual tiro acertou qual pedra?

[engaging, energetic, conversational voice] Pelos apelidos que o bloco dá aos dois. [confident, clear, unhurried voice] Repare na linha de baixo do bloco: chamar os sprites de tiro e asteroide. Esses são os apelidos do tiro e da pedra de cada trombada, e eles valem só dentro da colisão.

[confident, clear, unhurried voice] Confira se os grupos ficaram tiros e asteroides, e os apelidos, tiro e asteroide, nessa ordem.

[engaging, energetic, conversational voice] Na experiência, tirando só quem encostou, os outros continuavam no jogo. Por isso, dentro da colisão, os blocos usam os apelidos.

[confident, clear, unhurried voice] Deixe à vista o espaço de dentro da colisão. Abra Jogo 2D, depois Grupos e depois Participação e limpeza, pegue o bloco Tirar o sprite do grupo e solte nesse espaço. Escolha tiro como sprite e tiros como grupo.

[engaging, energetic, conversational voice] É este bloco que tira do jogo o tiro daquela trombada.

[confident, clear, unhurried voice] Deixe à vista o encaixe logo abaixo dele. Na mesma categoria, pegue outro Tirar o sprite do grupo e solte nesse encaixe. Nesse segundo, o sprite já vem asteroide, e o grupo, asteroides: deixe os dois assim.

[engaging, energetic, conversational voice] É este bloco que tira do jogo a pedra daquela trombada.

[confident, clear, unhurried voice] Deixe à vista o encaixe logo abaixo das duas retiradas, ainda dentro da colisão. Abra Jogo 2D, depois Desenho e efeitos e depois Partículas, pegue o bloco Soltar explosão no sprite e solte nesse encaixe.

[engaging, energetic, conversational voice] O sprite já vem asteroide, para a explosão sair no lugar da pedra: deixe assim e escolha uma cor para a explosão.

[confident, clear, unhurried voice] Deixe à vista o encaixe logo abaixo da explosão. Abra Jogo 2D, depois Som e depois Efeitos prontos, pegue o bloco Tocar efeito, solte nesse encaixe e escolha explosão no menu.

[upbeat, encouraging voice] Agora teste: clique na área do jogo e atire até acertar uma pedra. [interested, animated voice] Olha só: o tiro e a pedra da trombada saem, aparece a explosão, e os outros continuam!

[reassuring, encouraging voice] Se algo não funcionou no seu jogo, volte aos blocos e confira se ficou assim: no fim de A cada quadro do jogo está a colisão entre tiros e asteroides, e dentro dela estão Tirar o sprite tiro do grupo tiros, Tirar o sprite asteroide do grupo asteroides, Soltar explosão no sprite asteroide e Tocar efeito explosão, nessa ordem. [reassuring, encouraging voice] Depois de corrigir, teste de novo.

[engaging, energetic, conversational voice] Funcionou? Clique em Verificar projeto. Se faltar alguma coisa, corrija os blocos e clique novamente. Quando aparecer Objetivo cumprido!, clique em Próxima parte.
```

**Substituições na edição kids:**

| ID | Personagem | Ocorrência | Âncora anterior | Fala exata substituída | Âncora posterior | Tags |
| --- | --- | --- | --- | --- | --- | --- |
| video-colisao-K1 | Debinha | 1 | que confere, em todo quadro, se algum tiro encostou em alguma pedra. O que fica dentro dele acontece a cada trombada. | Como ele sabe qual tiro acertou qual pedra? | Pelos apelidos que o bloco dá aos dois. Repare na linha de baixo do bloco: chamar os sprites de tiro e asteroide. Esses | [curious] |

No adulto, manter toda a fala da professora. No kids, silenciar apenas o trecho marcado e substituir pelo áudio do personagem, sem sobrepor vozes.

**Imagem nas substituições kids (não gravar):**

- `video-colisao-K1`: entrada — Manter à vista o bloco da colisão recém-encaixado. Saída — Depois da saída, apontar a linha dos apelidos do bloco.


**Recado na página (não gravar):** Agora faça o tiro acertar a pedra! Monte a colisão com os apelidos, tire o tiro e a pedra da trombada, coloque a explosão e o som e clique em Verificar projeto. Depois, clique em Próxima parte.

## Seção 3. Confira o que você construiu

**Recado na página (não gravar):** Hora de conferir o que você construiu! Responda sobre o acerto e o lugar de onde o tiro sai, pensando nos testes do seu jogo. Depois de enviar, leia as explicações e, se errar alguma, corrija e tente de novo. Quando acertar todas, clique em Próxima parte.

Sem vídeo ou ferramenta nesta parte. O quiz vem imediatamente depois do Zappy. Leia a explicação após enviar; tentativas ilimitadas, sem espera.

## Seção 4. Confira os acertos e envie

### Clipe `video-fecho` · Confira os acertos e envie

**Estimativa de gravação:** aproximadamente 1 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Clipe:** `video-fecho`

**Na tela:** A parte começa com o Estúdio expandido e o projeto da parte anterior [expandir estúdio]. No "Mova a nave, atire", clicar no jogo [tocar prévia 400 240], segurar uma seta e tocar na barra de espaço [tecla Space]. No "Depois, acerte pedras em lugares diferentes", atirar [tecla Space] até acertar duas pedras em lugares diferentes. No "Clique em Verificar projeto", verificar [verificar projeto]. No "clique em Enviar meu projeto", enviar e confirmar [enviar projeto]. No "Quando aparecer Projeto enviado!, clique em Concluir aula", voltar ao tamanho da aula [reduzir estúdio] e clicar em **Concluir aula** [concluir aula]. Ao terminar, clicar em Verificar projeto, mostrar Objetivo cumprido! e seguir o encaminhamento narrado.

**Fala para ElevenLabs:**

```text
[upbeat, encouraging voice] Agora teste os acertos do seu jogo. Mova a nave, atire e confira se cada tiro nasce nela. Depois, acerte pedras em lugares diferentes da tela.

[confident, clear, unhurried voice] Repare: em cada trombada, saem o tiro e a pedra que se encostaram, aparece a explosão, e o resto do jogo continua, porque os apelidos apontam só para eles.

[reassuring, encouraging voice] Se algo não funcionou no seu jogo, volte aos blocos e confira se ficou assim: dentro da colisão entre tiros e asteroides, as duas retiradas usam os apelidos tiro e asteroide. [reassuring, encouraging voice] Depois de corrigir, teste de novo.

[engaging, energetic, conversational voice] Funcionou? Clique em Verificar projeto. Se faltar alguma coisa, corrija os blocos e clique novamente. Quando aparecer Objetivo cumprido!, clique em Enviar meu projeto e confirme em Enviar. Quando aparecer Projeto enviado!, clique em Concluir aula.
```


**Recado na página (não gravar):** Hora de testar os acertos! Acerte pedras em lugares diferentes, confira se as outras continuam caindo, clique em Verificar projeto e envie o seu projeto. Depois, clique em Concluir aula.
