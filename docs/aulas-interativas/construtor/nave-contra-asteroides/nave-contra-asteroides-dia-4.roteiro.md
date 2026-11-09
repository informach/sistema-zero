# Roteiro de produção · Dê três vidas à nave

**Produção:** a professora grava toda a fala principal. Na montagem kids, Debinha substitui somente os trechos da tabela, com a mesma frase e sem voz sobreposta. O master funciona sozinho no adulto. Notas e recados da página não são gravados. [Direção de voz e edição](../../../aulas-interativas-tecnico/DIRETRIZES-VOZ-ELEVENLABS.md).

## Seção 1. Quando a nave ganha as vidas?

### Clipe `video-vidas-no-comeco` · Quando a nave ganha as vidas?

**Estimativa de gravação:** aproximadamente 1 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Clipe:** `video-vidas-no-comeco`

**Na tela:** No "Sabe quando você ganha três fichas", mostrar por 2 a 3 segundos o meme ilustrado, desenho nosso com o Zappy ou os personagens do jogo, sem foto de pessoa real nem meme da internet e sem cobrir a experiência: o Zappy na entrada do parque com três fichas na mão [na edição: meme das fichas do parque]. No "Agora você vai investigar", ampliar a experiência e mostrar a cena parada, sem tocar nos controles [ampliar experiência]. No "O Zappy vai te mostrando", mostrar o Zappy [apontar zappy]. No "Quando terminar, clique em Próxima parte", voltar ao tamanho da aula [voltar à aula] e clicar em **Próxima parte** [próxima parte]. Não apontar os controles da experiência, não fazer os testes pela criança nem mostrar o resultado de nenhuma comparação: a criança descobre na experiência. Não falar de blocos, áreas do Estúdio, regra nem código (decisões de 01/11 e 02/11/2026).

**Fala para ElevenLabs:**

```text
[curious] Sabe quando você ganha três fichas na entrada do parque, e cada brinquedo gasta uma?

[engaging, energetic, conversational voice] No seu jogo, a nave vai ter três vidas, e cada pedra que bater vai tirar uma. E você já conhece dois jeitos de o jogo fazer as coisas: uma vez, no começo, ou sempre, em todo quadro.

[curious] E se a nave ganhar as três vidas sempre, em todo quadro?

[engaging, energetic, conversational voice] O que você acha? Isso você vai testar na experiência.

[upbeat, encouraging voice] Agora você vai investigar quantas vidas a nave tem depois das batidas quando ela ganha as três vidas uma vez só e quando ganha o tempo todo. O Zappy vai te mostrando o que testar, e você pode repetir quando quiser. Quando terminar, clique em Próxima parte.
```

**Substituições na edição kids:**

| ID | Personagem | Ocorrência | Âncora anterior | Fala exata substituída | Âncora posterior | Tags |
| --- | --- | --- | --- | --- | --- | --- |
| video-vidas-no-comeco-K1 | Debinha | 1 | vai tirar uma. E você já conhece dois jeitos de o jogo fazer as coisas: uma vez, no começo, ou sempre, em todo quadro. | E se a nave ganhar as três vidas sempre, em todo quadro? | O que você acha? Isso você vai testar na experiência. Agora você vai investigar quantas vidas a nave tem depois das | [curious] |

No adulto, manter toda a fala da professora. No kids, silenciar apenas o trecho marcado e substituir pelo áudio do personagem, sem sobrepor vozes.

**Imagem nas substituições kids (não gravar):**

- `video-vidas-no-comeco-K1`: entrada — Manter o meme das fichas do parque até o fim da frase da professora. Saída — Depois da saída, ampliar a experiência sem escolher nenhum jeito.


**Falas dentro da experiência:** `packages/core/src/learning/scene/guia-livre/once-vs-always.ts`, na tela `packages/member-shell/src/components/scene-livre/once-vs-always.tsx`. A orientação do Zappy sugere comparações pelo estado observado; os controles ficam livres e as descobertas contam em qualquer ordem.

**Recado na página (não gravar):** Sua vez! Investigue quando a nave precisa ganhar as três vidas. O Zappy te mostra o que testar, e você pode repetir quando quiser. Quando terminar, clique em Próxima parte.

## Seção 2. Dê e mostre as três vidas

### Clipe `video-vidas` · Dê e mostre as três vidas

**Estimativa de gravação:** aproximadamente 3 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Clipe:** `video-vidas`

**Na tela:** A parte começa com o Estúdio expandido e o projeto da aula anterior [expandir estúdio]. No "Olhe a tela do seu jogo", apontar o canto sem corações [apontar prévia 60 48]. No "Deixe à vista o fim de Ao iniciar", apontar o lugar [apontar abaixo de "Criar variável"]. No "Agora abra Jogo 2D, depois Vida e placar", abrir as categorias [categoria Jogo 2D > Vida e placar > Vida] e encaixar o bloco [encaixar "Dar ao sprite" abaixo de "Criar variável"]. No "Escolha nave. O número já vem em 3", escolher nave no bloco. No "É este bloco que dá as três vidas", apontar o bloco [apontar bloco "Dar ao sprite"]. No "Deixe à vista o fim de A cada quadro do jogo, logo depois de Mostrar placar", apontar o lugar [apontar abaixo de "Mostrar placar"] e encaixar o bloco [encaixar "Desenhar as vidas do sprite" abaixo de "Mostrar placar"]. No "Escolha nave. O formato já vem corações", escolher nave e a cor vermelha. No "Agora olhe a prévia", apontar os corações [apontar prévia 60 48]. No "Clique em Verificar projeto", verificar [verificar projeto]. No "Quando aparecer Objetivo cumprido!, clique em Próxima parte", voltar ao tamanho da aula [reduzir estúdio] e clicar em **Próxima parte** [próxima parte]. Ao terminar, clicar em Verificar projeto, mostrar Objetivo cumprido! e seguir o encaminhamento narrado.

**Fala para ElevenLabs:**

```text
[engaging, energetic, conversational voice] Olhe a tela do seu jogo. Tá vendo? Não tem nenhum coração, porque a nave ainda não tem vidas.

[engaging, energetic, conversational voice] Lembra da experiência da parte anterior? Ganhando as vidas uma vez, no começo, cada batida tirava uma. Agora a gente vai dar três vidas à nave do seu jogo!

[engaging, energetic, conversational voice] As vidas são dadas uma vez, quando o jogo começa. Por isso, elas vão no fim de Ao iniciar.

[confident, clear, unhurried voice] Deixe à vista o fim de Ao iniciar, logo depois de Criar variável pontos.

[confident, clear, unhurried voice] Agora abra Jogo 2D, depois Vida e placar e depois Vida, e pegue o bloco Dar ao sprite de vida. Arraste e solte logo abaixo de Criar variável pontos.

[engaging, energetic, conversational voice] Escolha nave. O número já vem em 3: deixe assim, porque a nave começa com três vidas.

[engaging, energetic, conversational voice] É este bloco que dá as três vidas à nave, uma vez, no começo.

[curious] E como eu vejo quantas vidas eu tenho?

[engaging, energetic, conversational voice] Com os corações na tela. Agora os corações. Eles mostram as vidas e precisam ser desenhados em todo quadro, no fim de A cada quadro do jogo, logo depois do placar.

[confident, clear, unhurried voice] Deixe à vista o fim de A cada quadro do jogo, logo depois de Mostrar placar. Abra Jogo 2D, depois Vida e placar e depois Vida, pegue o bloco Desenhar as vidas do sprite e solte nesse lugar.

[engaging, energetic, conversational voice] Escolha nave. O formato já vem corações, em x 12, y 48 e tamanho 22: deixe assim. Depois, escolha vermelho.

[engaging, energetic, conversational voice] É este bloco que desenha um coração para cada vida da nave.

[engaging, energetic, conversational voice] Agora olhe a prévia. [interested, animated voice] Olha só: aparecem três corações na tela, logo abaixo do placar!

[reassuring, encouraging voice] Se algo não funcionou no seu jogo, volte aos blocos e confira se ficou assim: no fim de Ao iniciar está Dar ao sprite nave 3 de vida, e, no fim de A cada quadro do jogo, depois do placar, está Desenhar as vidas do sprite nave como corações, em x 12, y 48 e tamanho 22. [reassuring, encouraging voice] Depois de corrigir, teste de novo.

[engaging, energetic, conversational voice] Funcionou? Clique em Verificar projeto. Se faltar alguma coisa, corrija os blocos e clique novamente. Quando aparecer Objetivo cumprido!, clique em Próxima parte.
```

**Substituições na edição kids:**

| ID | Personagem | Ocorrência | Âncora anterior | Fala exata substituída | Âncora posterior | Tags |
| --- | --- | --- | --- | --- | --- | --- |
| video-vidas-K1 | Debinha | 1 | em 3: deixe assim, porque a nave começa com três vidas. É este bloco que dá as três vidas à nave, uma vez, no começo. | E como eu vejo quantas vidas eu tenho? | Com os corações na tela. Agora os corações. Eles mostram as vidas e precisam ser desenhados em todo quadro, no fim de A | [curious] |

No adulto, manter toda a fala da professora. No kids, silenciar apenas o trecho marcado e substituir pelo áudio do personagem, sem sobrepor vozes.

**Imagem nas substituições kids (não gravar):**

- `video-vidas-K1`: entrada — Manter à vista o bloco das vidas recém-encaixado. Saída — Depois da saída, mostrar o fim de A cada quadro do jogo.


**Recado na página (não gravar):** Agora dê três vidas à sua nave! Coloque as vidas em Ao iniciar, desenhe os corações em cada quadro e clique em Verificar projeto. Depois, clique em Próxima parte.

## Seção 3. Programe a batida da pedra

### Clipe `video-batida-e-coracoes` · Programe a batida da pedra

**Estimativa de gravação:** aproximadamente 4 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Clipe:** `video-batida-e-coracoes`

**Na tela:** A parte começa com o Estúdio expandido e o projeto da parte anterior [expandir estúdio]. No "Aqui no seu jogo, deixe uma pedra bater na nave", clicar no jogo [tocar prévia 400 240] e esperar uma pedra cair sobre a nave. No "Deixe à vista o espaço entre Mostrar placar", apontar o lugar [apontar abaixo de "Mostrar placar"]. No "Agora abra Jogo 2D, depois Colisões", abrir as categorias [categoria Jogo 2D > Colisões > Encostar e bloquear]. No "Arraste e solte logo abaixo de Mostrar placar", encaixar o bloco [encaixar "Para cada sprite do grupo que colidir" abaixo de "Mostrar placar"]. No "É este bloco que confere", apontar o bloco [apontar bloco "Para cada sprite do grupo que colidir"]. No "Abra Jogo 2D, depois Grupos e depois Participação e limpeza", abrir as categorias [categoria Jogo 2D > Grupos > Participação e limpeza] e encaixar o bloco [encaixar "Tirar o sprite do grupo" em "Para cada sprite do grupo que colidir"]. No "Escolha inimigo como sprite", escolher inimigo e asteroides nos campos. No "Abra Jogo 2D, depois Desenho e efeitos", abrir as categorias [categoria Jogo 2D > Desenho e efeitos > Partículas], encaixar o bloco logo abaixo da retirada e escolher inimigo. No "Agora teste: clique na área do jogo", clicar no jogo [tocar prévia 400 240] e esperar uma pedra bater na nave. No "Clique em Verificar projeto", verificar [verificar projeto]. No "Quando aparecer Objetivo cumprido!, clique em Próxima parte", voltar ao tamanho da aula [reduzir estúdio] e clicar em **Próxima parte** [próxima parte]. Ao terminar, clicar em Verificar projeto, mostrar Objetivo cumprido! e seguir o encaminhamento narrado.

**Fala para ElevenLabs:**

```text
[engaging, energetic, conversational voice] Aqui no seu jogo, deixe uma pedra bater na nave. Tá vendo? A pedra passa pela nave, porque o jogo ainda não confere essa trombada.

[engaging, energetic, conversational voice] Lembra da experiência da trombada? Saíam só o tiro e a pedra que se encostaram. Agora a gente vai tirar do seu jogo só a pedra que bate na nave!

[engaging, energetic, conversational voice] O jogo confere a batida em todo quadro, antes de desenhar os corações, para eles já mostrarem a vida certa. Por isso, a colisão vai entre o placar e os corações.

[confident, clear, unhurried voice] Deixe à vista o espaço entre Mostrar placar e Desenhar as vidas do sprite, dentro de A cada quadro do jogo.

[confident, clear, unhurried voice] Agora abra Jogo 2D, depois Colisões e depois Encostar e bloquear, e pegue o bloco Para cada sprite do grupo que colidir com o sprite. Arraste e solte logo abaixo de Mostrar placar.

[engaging, energetic, conversational voice] É este bloco que confere, em todo quadro, se alguma pedra encostou na nave.

[curious] Qual pedra o jogo vai tirar?

[engaging, energetic, conversational voice] Só a que bateu. [confident, clear, unhurried voice] Repare no apelido dela. [confident, clear, unhurried voice] Repare: o bloco já chega com o grupo asteroides, o sprite nave e, na linha de baixo, chamar o sprite de inimigo. Inimigo é o apelido da pedra que bateu na nave. [confident, clear, unhurried voice] Confira se ficou asteroides, nave e inimigo.

[confident, clear, unhurried voice] Deixe à vista o espaço de dentro dessa colisão. Abra Jogo 2D, depois Grupos e depois Participação e limpeza, pegue o bloco Tirar o sprite do grupo e solte nesse espaço.

[engaging, energetic, conversational voice] Escolha inimigo como sprite e asteroides como grupo, porque quem sai do jogo é a pedra, e não a nave.

[confident, clear, unhurried voice] Deixe à vista o encaixe logo abaixo da retirada. Abra Jogo 2D, depois Desenho e efeitos e depois Partículas, pegue o bloco Soltar explosão no sprite, solte nesse encaixe e escolha inimigo. Depois, escolha uma cor para a explosão.

[upbeat, encouraging voice] Agora teste: clique na área do jogo e deixe uma pedra bater na nave. [interested, animated voice] Olha só: a pedra explode e sai! Mas os corações continuam três, porque a batida ainda não tira vida. Isso vem depois da próxima experiência.

[reassuring, encouraging voice] Se algo não funcionou no seu jogo, volte aos blocos e confira se ficou assim: entre o placar e os corações está a colisão de asteroides com nave, com o apelido inimigo, e dentro dela vêm Tirar o sprite inimigo do grupo asteroides e Soltar explosão no sprite inimigo, nessa ordem. [reassuring, encouraging voice] Depois de corrigir, teste de novo.

[engaging, energetic, conversational voice] Funcionou? Clique em Verificar projeto. Se faltar alguma coisa, corrija os blocos e clique novamente. Quando aparecer Objetivo cumprido!, clique em Próxima parte.
```

**Substituições na edição kids:**

| ID | Personagem | Ocorrência | Âncora anterior | Fala exata substituída | Âncora posterior | Tags |
| --- | --- | --- | --- | --- | --- | --- |
| video-batida-e-coracoes-K1 | Debinha | 1 | e solte logo abaixo de Mostrar placar. É este bloco que confere, em todo quadro, se alguma pedra encostou na nave. | Qual pedra o jogo vai tirar? | Só a que bateu. Repare no apelido dela. Repare: o bloco já chega com o grupo asteroides, o sprite nave e, na linha de | [curious] |

No adulto, manter toda a fala da professora. No kids, silenciar apenas o trecho marcado e substituir pelo áudio do personagem, sem sobrepor vozes.

**Imagem nas substituições kids (não gravar):**

- `video-batida-e-coracoes-K1`: entrada — Manter à vista a colisão da nave recém-encaixada. Saída — Depois da saída, apontar a linha do apelido inimigo.


**Recado na página (não gravar):** Agora programe a batida da pedra! Monte a colisão da nave com as pedras, tire a pedra que bateu, solte a explosão e clique em Verificar projeto. Depois, clique em Próxima parte.

## Seção 4. O tempinho de proteção

### Clipe `video-protecao` · O tempinho de proteção

**Estimativa de gravação:** aproximadamente 1 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Clipe:** `video-protecao`

**Na tela:** No "Sabe quando você brinca de pega-pega", mostrar por 2 a 3 segundos o meme ilustrado, desenho nosso com o Zappy ou os personagens do jogo, sem foto de pessoa real nem meme da internet e sem cobrir a experiência: o Zappy correndo de um amigo, com um reloginho contando o respiro [na edição: meme do respiro no pega-pega]. No "Agora você vai investigar", ampliar a experiência e mostrar a cena parada, sem tocar nos controles [ampliar experiência]. No "O Zappy vai te mostrando", mostrar o Zappy [apontar zappy]. No "Quando terminar, clique em Próxima parte", voltar ao tamanho da aula [voltar à aula] e clicar em **Próxima parte** [próxima parte]. Não apontar os controles da experiência, não fazer os testes pela criança nem mostrar o resultado de nenhuma comparação: a criança descobre na experiência. Não falar de blocos, áreas do Estúdio, regra nem código (decisões de 01/11 e 02/11/2026).

**Fala para ElevenLabs:**

```text
[engaging, energetic, conversational voice] Sabe quando você brinca de pega-pega e, depois de ser pego, tem um tempinho para se afastar antes de poderem pegar você de novo? É um respiro.

[engaging, energetic, conversational voice] No seu jogo, a nave também pode ganhar um tempinho depois de bater. E esse tempinho conta para trás, um quadro de cada vez.

[curious] E se esse tempinho for curto, ou longo? Quantas vidas sobram depois de três pedras?

[engaging, energetic, conversational voice] O que você acha? Isso você vai testar na experiência.

[upbeat, encouraging voice] Agora você vai investigar quantas vidas sobram depois de três pedras sem proteção, com uma proteção curta e com uma proteção longa. O Zappy vai te mostrando o que testar, e você pode repetir quando quiser. Quando terminar, clique em Próxima parte.
```

**Substituições na edição kids:**

| ID | Personagem | Ocorrência | Âncora anterior | Fala exata substituída | Âncora posterior | Tags |
| --- | --- | --- | --- | --- | --- | --- |
| video-protecao-K1 | Debinha | 1 | jogo, a nave também pode ganhar um tempinho depois de bater. E esse tempinho conta para trás, um quadro de cada vez. | E se esse tempinho for curto, ou longo? Quantas vidas sobram depois de três pedras? | O que você acha? Isso você vai testar na experiência. Agora você vai investigar quantas vidas sobram depois de três | [curious] |

No adulto, manter toda a fala da professora. No kids, silenciar apenas o trecho marcado e substituir pelo áudio do personagem, sem sobrepor vozes.

**Imagem nas substituições kids (não gravar):**

- `video-protecao-K1`: entrada — Manter o meme do pega-pega até o fim da frase da professora. Saída — Depois da saída, ampliar a experiência sem avançar.


**Falas dentro da experiência:** `packages/core/src/learning/scene/guia-livre/invincibility.ts`, na tela `packages/member-shell/src/components/scene-livre/invincibility.tsx`. A orientação do Zappy sugere comparações pelo estado observado; os controles ficam livres e as descobertas contam em qualquer ordem.

**Recado na página (não gravar):** Sua vez! Investigue quantas vidas sobram com e sem um tempinho de proteção depois de bater. O Zappy te mostra o que testar, e você pode repetir quando quiser. Quando terminar, clique em Próxima parte.

## Seção 5. Tire uma vida a cada batida

### Clipe `video-dano` · Tire uma vida a cada batida

**Estimativa de gravação:** aproximadamente 3 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Clipe:** `video-dano`

**Na tela:** A parte começa com o Estúdio expandido e o projeto da parte anterior [expandir estúdio]. No "Aqui no seu jogo, deixe uma pedra bater na nave", clicar no jogo [tocar prévia 400 240] e esperar uma pedra bater na nave. No "Deixe à vista o encaixe logo abaixo da explosão", apontar o lugar [apontar abaixo de "Soltar explosão no sprite"]. No "Abra Jogo 2D, depois Vida e placar", abrir as categorias [categoria Jogo 2D > Vida e placar > Vida] e encaixar o bloco [encaixar "Machucar o sprite" abaixo de "Soltar explosão no sprite"]. No "Escolha nave. O dano já vem em 1", escolher nave no bloco. No "É este bloco que tira uma vida", apontar o bloco [apontar bloco "Machucar o sprite"]. No "Deixe à vista o encaixe logo abaixo do dano", abrir as categorias [categoria Jogo 2D > Desenho e efeitos > Efeitos] e encaixar o bloco [encaixar "Tremer a tela" abaixo de "Machucar o sprite"]. No "Agora teste: clique na área do jogo", clicar no jogo [tocar prévia 400 240] e esperar uma pedra bater, apontando os corações [apontar prévia 60 48]. No "Clique em Verificar projeto", verificar [verificar projeto]. No "Quando aparecer Objetivo cumprido!, clique em Próxima parte", voltar ao tamanho da aula [reduzir estúdio] e clicar em **Próxima parte** [próxima parte]. Ao terminar, clicar em Verificar projeto, mostrar Objetivo cumprido! e seguir o encaminhamento narrado.

**Fala para ElevenLabs:**

```text
[engaging, energetic, conversational voice] Aqui no seu jogo, deixe uma pedra bater na nave. Tá vendo? A pedra explode, mas os corações continuam três, porque a batida ainda não tira vida.

[engaging, energetic, conversational voice] Lembra da experiência da parte anterior? Depois de bater, a nave ficava um tempinho protegida. Agora a gente vai pôr a vida e a proteção no seu jogo!

[engaging, energetic, conversational voice] A vida sai na hora da batida, depois da explosão. Por isso, o bloco vai dentro da colisão da nave, logo abaixo de Soltar explosão no sprite.

[confident, clear, unhurried voice] Deixe à vista o encaixe logo abaixo da explosão, dentro da colisão da nave. Abra Jogo 2D, depois Vida e placar e depois Vida, pegue o bloco Machucar o sprite em e deixá-lo invencível por quadros e solte nesse encaixe.

[engaging, energetic, conversational voice] Escolha nave. O dano já vem em 1, e a proteção, em 45 quadros: deixe assim, porque cada batida tira uma vida e depois dá esse respiro.

[engaging, energetic, conversational voice] É este bloco que tira uma vida da nave e liga o tempinho de proteção.

[curious] E a tela pode tremer na batida?

[engaging, energetic, conversational voice] Pode, e é o próximo bloco. Deixe à vista o encaixe logo abaixo do dano. Abra Jogo 2D, depois Desenho e efeitos e depois Efeitos, pegue o bloco Tremer a tela com intensidade e solte nesse encaixe. A intensidade já vem em 8: deixe assim.

[engaging, energetic, conversational voice] É este bloco que faz a tela tremer, para quem joga sentir a batida.

[upbeat, encouraging voice] Agora teste: clique na área do jogo e deixe uma pedra bater na nave. [interested, animated voice] Olha só: a tela treme e um coração apaga!

[engaging, energetic, conversational voice] Espere a proteção acabar e deixe outra pedra bater: outro coração apaga. Por enquanto, ficar sem vidas ainda não encerra a partida. O fim da partida vem mais adiante.

[reassuring, encouraging voice] Se algo não funcionou no seu jogo, volte aos blocos e confira se ficou assim: dentro da colisão da nave vêm Tirar o sprite inimigo do grupo asteroides, Soltar explosão no sprite inimigo, Machucar o sprite nave em 1 e deixá-lo invencível por 45 quadros e Tremer a tela com intensidade 8, nessa ordem. [reassuring, encouraging voice] Depois de corrigir, teste de novo.

[engaging, energetic, conversational voice] Funcionou? Clique em Verificar projeto. Se faltar alguma coisa, corrija os blocos e clique novamente. Quando aparecer Objetivo cumprido!, clique em Próxima parte.
```

**Substituições na edição kids:**

| ID | Personagem | Ocorrência | Âncora anterior | Fala exata substituída | Âncora posterior | Tags |
| --- | --- | --- | --- | --- | --- | --- |
| video-dano-K1 | Debinha | 1 | batida tira uma vida e depois dá esse respiro. É este bloco que tira uma vida da nave e liga o tempinho de proteção. | E a tela pode tremer na batida? | Pode, e é o próximo bloco. Deixe à vista o encaixe logo abaixo do dano. Abra Jogo 2D, depois Desenho e efeitos e depois | [curious] |

No adulto, manter toda a fala da professora. No kids, silenciar apenas o trecho marcado e substituir pelo áudio do personagem, sem sobrepor vozes.

**Imagem nas substituições kids (não gravar):**

- `video-dano-K1`: entrada — Manter à vista o bloco do dano recém-encaixado. Saída — Depois da saída, mostrar o encaixe logo abaixo do dano.


**Recado na página (não gravar):** Agora faça a batida tirar uma vida! Coloque o dano com proteção e o tremor dentro da colisão da nave e clique em Verificar projeto. Depois, clique em Próxima parte.

## Seção 6. Confira o que você construiu

**Recado na página (não gravar):** Hora de conferir o que você construiu! Responda sobre os pontos e a proteção da nave, pensando nos testes do seu jogo. Depois de enviar, leia as explicações e, se errar alguma, corrija e tente de novo. Quando acertar todas, clique em Próxima parte.

Sem vídeo ou ferramenta nesta parte. O quiz vem imediatamente depois do Zappy. Leia a explicação após enviar; tentativas ilimitadas, sem espera.

## Seção 7. Teste os pontos e as vidas

### Clipe `video-fecho` · Teste os pontos e as vidas

**Estimativa de gravação:** aproximadamente 2 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Clipe:** `video-fecho`

**Na tela:** A parte começa com o Estúdio expandido e o projeto da parte anterior [expandir estúdio]. No "Faça um tiro errar", clicar no jogo [tocar prévia 400 240] e atirar longe das pedras [tecla Space]. No "Depois, acerte uma pedra", atirar [tecla Space] até acertar e apontar o placar [apontar prévia 60 30]. No "Por último, deixe uma pedra bater na nave", esperar a batida e apontar os corações [apontar prévia 60 48]. No "Clique em Verificar projeto", verificar [verificar projeto]. No "clique em Enviar meu projeto", enviar e confirmar [enviar projeto]. No "Quando aparecer Projeto enviado!, clique em Concluir aula", voltar ao tamanho da aula [reduzir estúdio] e clicar em **Concluir aula** [concluir aula]. Ao terminar, clicar em Verificar projeto, mostrar Objetivo cumprido! e seguir o encaminhamento narrado.

**Fala para ElevenLabs:**

```text
[upbeat, encouraging voice] Agora teste os pontos e as vidas do seu jogo. Faça um tiro errar: os pontos têm que ficar iguais. Depois, acerte uma pedra e confira se soma um ponto. Por último, deixe uma pedra bater na nave e confira se ela perde uma vida.

[reassuring, encouraging voice] Se algo não funcionou no seu jogo, volte aos blocos e confira se ficou assim: Criar variável pontos e Dar ao sprite nave 3 de vida estão em Ao iniciar, Somar 1 em pontos está na colisão do tiro, Machucar o sprite nave está na colisão da nave, e o placar e os corações estão fora das colisões, em A cada quadro do jogo. [reassuring, encouraging voice] Depois de corrigir, teste de novo.

[engaging, energetic, conversational voice] Funcionou? Clique em Verificar projeto. Se faltar alguma coisa, corrija os blocos e clique novamente. Quando aparecer Objetivo cumprido!, clique em Enviar meu projeto e confirme em Enviar. Quando aparecer Projeto enviado!, clique em Concluir aula.
```


**Recado na página (não gravar):** Hora de testar os pontos e as vidas! Confira um erro, um acerto e uma batida, clique em Verificar projeto e envie o seu projeto. Depois, clique em Concluir aula.
