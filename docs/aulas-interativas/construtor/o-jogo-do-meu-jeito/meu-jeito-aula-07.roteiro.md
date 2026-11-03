# Roteiro de produção · Faça suas pedras nascerem animadas

**Produção:** a professora grava toda a fala principal. Na montagem kids, Debinha substitui somente os trechos da tabela, com a mesma frase e sem voz sobreposta. O master funciona sozinho no adulto. Notas e recados da página não são gravados. [Direção de voz e edição](../../../aulas-interativas-tecnico/DIRETRIZES-VOZ-ELEVENLABS.md).

## Seção 1. Compare nascer e animar

### Clipe `video-dois-relogios` · Compare nascer e animar

**Estimativa de gravação:** aproximadamente 2 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio.

**Clipe:** `video-dois-relogios`

**Na tela:** No "Nas pedras, duas coisas acontecem", mostrar a experiência na aula, parada no começo. No "Pense numa máquina que solta piões", mostrar o meme ilustrado (2 a 3 s) do Zappy ao lado da máquina de piões [na edição: meme dos piões]. No "Agora você vai investigar", ampliar a experiência [ampliar experiência] e mostrar as pedras paradas no começo, sem passar o tempo nem mudar os relógios: o que cada relógio muda é a descoberta da criança. Nesta parte, quadro é só o do jogo; o desenho da animação é desenho 1 e desenho 2. No "O Zappy ajuda", mostrar o Zappy [apontar zappy]. No "Quando terminar, clique em Próxima parte", voltar ao tamanho da aula [voltar à aula] e clicar em **Próxima parte** [próxima parte]. O meme é desenho nosso, com o Zappy ou os personagens do jogo, sem foto de pessoa real nem meme da internet; fica 2 a 3 segundos na tela, sem cobrir a experiência, e a narração explica sem depender dele. Não fazer os testes pela criança nem dizer o resultado antes do teste: a criança descobre na experiência, com o Zappy (convite à investigação, 02/11/2026).

**Fala para ElevenLabs:**

```text
[engaging, energetic, conversational voice] Nas pedras, duas coisas acontecem ao mesmo tempo: pedras novas nascem de tempos em tempos, e cada pedra troca de desenho para parecer que gira. Por isso, o jogo tem dois relógios: um conta quadros do jogo, que são as vezes em que o jogo se desenha de novo, e o outro conta desenhos por segundo.

[engaging, energetic, conversational voice] Pense numa máquina que solta piões: ela solta um pião novo de tempos em tempos, e cada pião gira.

[curious] Se a máquina soltar mais rápido, os piões giram mais rápido também?

[engaging, energetic, conversational voice] O que você acha? Isso você vai testar na experiência.

[upbeat, encouraging voice] Agora você vai investigar o que cada relógio muda nas pedras, e se mexer num muda o que o outro faz. Você escolhe por onde começar e pode repetir os testes. O Zappy ajuda a observar as diferenças. Quando terminar, clique em Próxima parte.
```

**Substituições na edição kids:**

| ID | Personagem | Ocorrência | Âncora anterior | Fala exata substituída | Âncora posterior | Tags |
| --- | --- | --- | --- | --- | --- | --- |
| video-dois-relogios-K1 | Debinha | 1 | desenhos por segundo. Pense numa máquina que solta piões: ela solta um pião novo de tempos em tempos, e cada pião gira. | Se a máquina soltar mais rápido, os piões giram mais rápido também? | O que você acha? Isso você vai testar na experiência. Agora você vai investigar o que cada relógio muda nas pedras, e | [curious] |

No adulto, manter toda a fala da professora. No kids, silenciar apenas o trecho marcado e substituir pelo áudio do personagem, sem sobrepor vozes.

**Imagem nas substituições kids (não gravar):**

- `video-dois-relogios-K1`: entrada — Manter o meme dos piões e a experiência parada no começo. Saída — Seguir sem mudar os relógios: a professora só convida a testar.


**Falas dentro da experiência:** `packages/core/src/learning/scene/guia-livre/two-clocks.ts`, com a tela em `packages/member-shell/src/components/scene-livre/two-clocks.tsx`. O Zappy acompanha o estado real e sugere o próximo teste; os controles ficam livres e as descobertas contam em qualquer ordem.

**Recado na página (não gravar):** Sua vez! Investigue o que cada relógio muda nas pedras. Você escolhe a ordem dos testes, e o Zappy sugere o que observar. Quando terminar, clique em Próxima parte.

## Seção 2. Prepare a folha do asteroide

### Clipe `video-folha-pedra` · Prepare a folha do asteroide

**Estimativa de gravação:** aproximadamente 3 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio.

**Clipe:** `video-folha-pedra`

**Na tela:** Começar pela retomada, antes de qualquer gesto novo, com o trabalho da criança à vista: primeiro o teste, com o resultado que o Tá vendo? cita à vista, e depois a lembrança da experiência. No "Nesta parte, clique em Abrir meu Estúdio", clicar no botão, abrir o cartão do jogo na outra aba e começar a partida na prévia. No "Tá vendo?", apontar as pedras antigas. No "A folha nova vai entrar no fim de Ao iniciar", mostrar o fim de Ao iniciar. No "Abra Jogo 2D, Sprites e Animação", abrir as categorias e encaixar o bloco depois da animação da nave. No "Repare: o bloco fala em quadros", apontar a palavra quadros no bloco. No "Escreva folha-asteroide", preencher o nome, a imagem e os dois 64. No "Confira as duas folhas", apontar 32 por 32 e 64 por 64. No "Repare: as pedras ainda usam", mostrar as pedras ainda com o desenho antigo. O trabalho acontece na outra aba: mostrar cada gesto narrado, sem acelerar. No "volte a esta aba e clique em Próxima parte", voltar à aba da aula e clicar em **Próxima parte** [próxima parte].

**Fala para ElevenLabs:**

```text
[engaging, energetic, conversational voice] Nesta parte, clique em Abrir meu Estúdio, abra o cartão do seu jogo e comece uma partida. Tá vendo? As pedras são as antigas, porque o jogo não usa seu asteroide. Lembra da experiência da parte anterior? Cada pedra girava com dois desenhos. Agora a gente vai preparar esses desenhos.

[engaging, energetic, conversational voice] Para girar, cada pedra vai usar a folha do asteroide, que é a imagem com os dois desenhos da pedra lado a lado. Nesta parte, você prepara essa folha.

[engaging, energetic, conversational voice] A folha nova vai entrar no fim de Ao iniciar, logo depois da animação da nave. Deixe esse lugar à vista.

[confident, clear, unhurried voice] Abra Jogo 2D, Sprites e Animação, pegue Carregar folha de quadros e encaixe no fim de Ao iniciar, depois da animação da nave.

[confident, clear, unhurried voice] Repare: o bloco fala em quadros. Aqui, quadro quer dizer cada desenho da folha, como no Pinta, e não o quadro do jogo que o relógio de nascer conta.

[engaging, energetic, conversational voice] Escreva folha-asteroide no nome da folha e escolha a imagem asteroide. Coloque 64 nos dois tamanhos do quadro, porque o seu asteroide foi desenhado em 64 por 64.

[engaging, energetic, conversational voice] É este bloco que recorta a folha do asteroide nos dois desenhos.

[confident, clear, unhurried voice] Confira as duas folhas: folha-nave continua com 32 por 32, e folha-asteroide usa 64 por 64. Comece uma partida. [confident, clear, unhurried voice] Repare: as pedras ainda usam o desenho antigo, porque carregar a folha só deixa os desenhos prontos. Ainda falta trocar a imagem das pedras.

[engaging, energetic, conversational voice] Pause aqui e faça esta parte no seu jogo. Se o Estúdio ainda não estiver aberto, clique em Abrir meu Estúdio. Depois compare o seu jogo com a conferência que a gente acabou de fazer e espere aparecer Salvo, porque é assim que o seu jogo fica guardado para a próxima parte. Quando aparecer, volte a esta aba e clique em Próxima parte.
```


**Recado na página (não gravar):** Agora prepare a folha do seu asteroide! Carregue folha-asteroide com quadros de 64 por 64 no fim de Ao iniciar. Quando aparecer Salvo, volte a esta aba e clique em Próxima parte.

## Seção 3. Troque a imagem das pedras que nascem

### Clipe `video-trocar-pedra` · Troque a imagem das pedras que nascem

**Estimativa de gravação:** aproximadamente 4 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio.

**Clipe:** `video-trocar-pedra`

**Na tela:** No "No seu Estúdio, abra o cartão do seu jogo", mostrar o cartão aberto na outra aba. No "encontre a área Enquanto estiver rodando", arrastar até a área aparecer. No "Dentro dela está o bloco A cada 40 quadros", apontar o bloco. No "Olha aqui: este é o criador das pedras", apontar o criador e os valores. No "Abra Jogo 2D, Grupos e Criar e percorrer", abrir as categorias e soltar o bloco no espaço livre. No "Clique em inimigos e escolha asteroides", trocar o grupo, escrever o nome e escolher a imagem. No "Agora os números", apontar os valores de fábrica e trocar o y, a largura, a altura e o vy. No "arraste a peça do sorteio", mover o sorteio para o x do novo. No "Clique com o botão direito no criador antigo", apagar e encaixar o novo no lugar. No "Agora comece a partida", jogar e apontar as pedras novas. O trabalho acontece na outra aba: mostrar cada gesto narrado, sem acelerar. No "volte a esta aba e clique em Próxima parte", voltar à aba da aula e clicar em **Próxima parte** [próxima parte].

**Fala para ElevenLabs:**

```text
[engaging, energetic, conversational voice] Agora as pedras vão nascer com a sua imagem. No seu Estúdio, abra o cartão do seu jogo. Depois encontre a área Enquanto estiver rodando. Se ela não estiver aparecendo, arraste um espaço vazio entre os blocos até ela aparecer.

[engaging, energetic, conversational voice] Dentro dela está o bloco A cada 40 quadros. Lembra? É o relógio de nascer. Dentro dele, no Se o estado do jogo é jogando, está o criador das pedras.

[interested, animated voice] Olha aqui: este é o criador das pedras. Antes de trocar, observe o grupo asteroides, o sorteio do x, o y e as velocidades, porque o bloco novo vai precisar dos mesmos valores.

[confident, clear, unhurried voice] Deixe à vista um espaço livre da área de blocos. Abra Jogo 2D, Grupos e Criar e percorrer, pegue No grupo criar um sprite chamado em x y largura altura com imagem vx vy e solte nesse espaço, sem encaixar ainda.

[confident, clear, unhurried voice] Repare: o bloco chega com o grupo inimigos, o nome vazio e a imagem inimigo. Clique em inimigos e escolha asteroides. No nome, escreva asteroide. Na imagem, clique em inimigo e escolha asteroide. O grupo junta todas as pedras, e o nome é de cada pedra que nasce.

[engaging, energetic, conversational voice] Agora os números, que chegam com 100 no x e no y, 32 na largura e na altura e 0 no vx e no vy. O x fica para o próximo passo. Troque o y por -30 e coloque 40 na largura e na altura. O vx já vem em 0; deixe assim. No vy, coloque 3.

[engaging, energetic, conversational voice] Agora arraste a peça do sorteio que está no x do criador antigo para o x do novo. Assim, as pedras continuam nascendo em lugares diferentes.

[confident, clear, unhurried voice] Clique com o botão direito no criador antigo e escolha Apagar este bloco. Depois encaixe o novo no mesmo lugar, dentro do Se jogando. É este bloco que faz cada pedra nascer com a sua imagem.

[engaging, energetic, conversational voice] Agora comece a partida. [interested, animated voice] Olha só: as suas imagens caem em lugares diferentes, porque o sorteio continua no x.

[curious] Por que a pedra ficou espremida?

[engaging, energetic, conversational voice] É que cada pedra ainda mostra a folha inteira, com os dois desenhos. Falta ligar a animação de cada pedra, e isso fica para a próxima parte.

[reassuring, encouraging voice] Se no seu jogo não aconteceu isso, volte aos blocos e confira se ficou assim: um criador só, dentro do Se jogando do A cada 40 quadros, com grupo asteroides, nome asteroide, imagem asteroide e o sorteio no x. [reassuring, encouraging voice] Depois de corrigir, teste de novo.

[engaging, energetic, conversational voice] Pause aqui e faça esta parte no seu jogo. Se o Estúdio ainda não estiver aberto, clique em Abrir meu Estúdio. Depois compare o seu jogo com a conferência que a gente acabou de fazer e espere aparecer Salvo, porque é assim que o seu jogo fica guardado para a próxima parte. Quando aparecer, volte a esta aba e clique em Próxima parte.
```

**Substituições na edição kids:**

| ID | Personagem | Ocorrência | Âncora anterior | Fala exata substituída | Âncora posterior | Tags |
| --- | --- | --- | --- | --- | --- | --- |
| video-trocar-pedra-K1 | Debinha | 1 | imagem. Agora comece a partida. Olha só: as suas imagens caem em lugares diferentes, porque o sorteio continua no x. | Por que a pedra ficou espremida? | É que cada pedra ainda mostra a folha inteira, com os dois desenhos. Falta ligar a animação de cada pedra, e isso fica | [curious] |

No adulto, manter toda a fala da professora. No kids, silenciar apenas o trecho marcado e substituir pelo áudio do personagem, sem sobrepor vozes.

**Imagem nas substituições kids (não gravar):**

- `video-trocar-pedra-K1`: entrada — Mostrar as pedras novas caindo espremidas, sem corrigir antes da hora. Saída — Apontar a folha inteira espremida numa pedra enquanto a professora explica.


**Recado na página (não gravar):** Agora troque a imagem das pedras que nascem! Substitua o criador das pedras, conservando o grupo, o sorteio e a velocidade. Quando aparecer Salvo, volte a esta aba e clique em Próxima parte.

## Seção 4. Anime cada pedra depois de criar

### Clipe `video-animar-pedra` · Anime cada pedra depois de criar

**Estimativa de gravação:** aproximadamente 3 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio.

**Clipe:** `video-animar-pedra`

**Na tela:** No "No seu Estúdio, abra o cartão do seu jogo", mostrar o cartão aberto na outra aba e começar a partida. No "Tá vendo?", apontar as pedras espremidas. No "Deixe esse lugar à vista", mostrar o criador novo dentro do Se jogando. No "Abra Jogo 2D, Sprites e Animação", abrir as categorias e encaixar o bloco logo abaixo do criador. No "Escolha sprite asteroide", preencher sprite, folha e girando. No "Aqui também, quadro 0 e quadro 1", apontar o 0 e o 1. No "Agora comece uma partida e observe", jogar e apontar três pedras girando, um ponto e uma vida perdida. O trabalho acontece na outra aba: mostrar cada gesto narrado, sem acelerar. No "volte a esta aba e clique em Próxima parte", voltar à aba da aula e clicar em **Próxima parte** [próxima parte].

**Fala para ElevenLabs:**

```text
[engaging, energetic, conversational voice] No seu Estúdio, abra o cartão do seu jogo e comece uma partida. Tá vendo? As pedras aparecem espremidas, porque cada pedra ainda mostra a folha inteira. Agora cada pedra vai ganhar a animação girando.

[engaging, energetic, conversational voice] A animação vai logo abaixo do novo criador da pedra, dentro do Se jogando do A cada 40 quadros, porque cada pedra precisa existir antes de receber a animação. Deixe esse lugar à vista.

[confident, clear, unhurried voice] Abra Jogo 2D, Sprites e Animação, pegue Animar sprite com a folha na animação, do quadro ao a fps e encaixe logo abaixo do criador.

[engaging, energetic, conversational voice] Escolha sprite asteroide e folha folha-asteroide. Depois clique em Escolher, na animação, e selecione girando. Os valores chegam preenchidos, como na nave: do quadro 0 ao 1, a 8 fps.

[engaging, energetic, conversational voice] Aqui também, quadro 0 e quadro 1 são os dois desenhos da folha. E os 8 fps são o relógio do giro: oito desenhos por segundo.

[engaging, energetic, conversational voice] É este bloco que faz cada pedra girar. Ele fica junto do criador porque, como na experiência, cada pedra começa o giro na hora em que nasce. O carregamento da folha continua no Ao iniciar.

[engaging, energetic, conversational voice] Agora comece uma partida e observe pelo menos três pedras entrando. [interested, animated voice] Olha só: cada pedra gira com os seus desenhos. Mova a nave, atire e acerte uma pedra para conferir os pontos. Depois deixe uma pedra encostar na nave para conferir a perda de vida.

[reassuring, encouraging voice] Se no seu jogo não aconteceu isso, volte aos blocos e confira se ficou assim: Animar sprite asteroide com a folha folha-asteroide na animação girando, do quadro 0 ao 1, a 8 fps, logo abaixo do criador e dentro do mesmo Se. E folha-asteroide tem quadros de 64 por 64. [reassuring, encouraging voice] Depois de corrigir, teste de novo.

[engaging, energetic, conversational voice] Pause aqui e faça esta parte no seu jogo. Se o Estúdio ainda não estiver aberto, clique em Abrir meu Estúdio. Depois compare o seu jogo com a conferência que a gente acabou de fazer e espere aparecer Salvo, porque é assim que o seu jogo fica guardado para a próxima parte. Quando aparecer, volte a esta aba e clique em Próxima parte.
```


**Recado na página (não gravar):** Agora anime cada pedra depois de criar! Coloque a animação girando logo abaixo do criador, dentro do mesmo Se. Quando aparecer Salvo, volte a esta aba e clique em Próxima parte.

## Seção 5. Confira as artes dentro do jogo

**Recado na página (não gravar):** Agora vamos relembrar como as suas artes entraram no jogo, com três perguntas! Se errar alguma, leia o porquê, clique em Tentar de novo e responda outra vez. Quando acertar todas, clique em Próxima parte.

Sem vídeo nem ferramenta. O quiz vem imediatamente depois do Zappy. Correção com explicação, tentativas ilimitadas e sem espera.

## Seção 6. Envie o jogo com as duas artes

### Clipe `video-entrega` · Envie o jogo com as duas artes

**Estimativa de gravação:** aproximadamente 2 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio.

**Clipe:** `video-entrega`

**Na tela:** No "confira no seu jogo", mostrar a nave e as pedras animadas. No "espere aparecer Guardado na sua conta", mostrar o aviso no Estúdio. No "clique em Escolher no Estúdio", voltar à aba da aula e abrir a galeria. No "selecione o cartão do seu jogo", marcar o cartão. No "Depois clique em Enviar (1)", clicar e mostrar Recebido!. O trabalho acontece na outra aba: mostrar cada gesto narrado, sem acelerar. No "Por último, clique em Concluir aula", clicar em **Concluir aula**.

**Fala para ElevenLabs:**

```text
[engaging, energetic, conversational voice] Hora de enviar o seu jogo com as duas artes! Antes, confira no seu jogo: a nave e as pedras usam as suas animações, pelo menos três pedras nasceram animadas, e o tiro, os pontos e a perda de vida continuam funcionando. Se alguma coisa estiver diferente, volte à parte em que ela foi feita e ajuste. Depois espere aparecer Guardado na sua conta no Estúdio, porque a galeria da aula só mostra o que já está guardado na sua conta.

[engaging, energetic, conversational voice] Agora volte para a aba da aula e clique em Escolher no Estúdio. Na janela Minhas criações do Estúdio, selecione o cartão do seu jogo. Se a sua criação não aparecer, confira se ela ficou guardada na sua conta e clique em Atualizar galeria.

[upbeat, encouraging voice] Se quiser, escreva uma mensagem no campo Recado. Depois clique em Enviar (1) e espere aparecer Recebido!

[engaging, energetic, conversational voice] Esse envio guarda uma cópia deste momento, e você continua criando no Estúdio. Por último, clique em Concluir aula.
```


**Recado na página (não gravar):** Hora de enviar o seu jogo com as duas artes! Confira se a nave e as pedras usam as suas animações. Depois clique em Escolher no Estúdio, selecione o cartão do seu jogo e clique em Enviar (1). Quando aparecer Recebido!, clique em Concluir aula.
