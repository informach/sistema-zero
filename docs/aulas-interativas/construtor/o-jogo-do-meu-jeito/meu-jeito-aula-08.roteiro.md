# Roteiro de produção · Teste e compartilhe sua versão

**Produção:** a professora grava toda a fala principal. Na montagem kids, Dedé substitui somente os trechos da tabela, com a mesma frase e sem voz sobreposta. O master funciona sozinho no adulto. Notas e recados da página não são gravados. [Direção de voz e edição](../../../aulas-interativas-tecnico/DIRETRIZES-VOZ-ELEVENLABS.md).

## Seção 1. Compare projeto e versão publicada

### Clipe `video-copia-publicada` · Compare projeto e versão publicada

**Estimativa de gravação:** aproximadamente 1 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio.

**Clipe:** `video-copia-publicada`

**Na tela:** No "Mais adiante, você vai poder publicar", mostrar a experiência na aula, parada, com o Mural vazio. No "Sabe quando você tira uma foto de um desenho", mostrar o meme ilustrado (2 a 3 s) do Zappy fotografando o desenho da nave [na edição: meme da foto]. No "Agora você vai investigar", ampliar a experiência [ampliar experiência] e mostrar o projeto e o Mural vazio parados, sem publicar nem trocar a cor: o que o Mural guarda é a descoberta da criança. No "O Zappy ajuda", mostrar o Zappy [apontar zappy]. No "Quando terminar, clique em Próxima parte", voltar ao tamanho da aula [voltar à aula] e clicar em **Próxima parte** [próxima parte]. O meme é desenho nosso, com o Zappy ou os personagens do jogo, sem foto de pessoa real nem meme da internet; fica 2 a 3 segundos na tela, sem cobrir a experiência, e a narração explica sem depender dele. Não fazer os testes pela criança nem dizer o resultado antes do teste: a criança descobre na experiência, com o Zappy (convite à investigação, 02/11/2026). Não falar de blocos, áreas do Estúdio, regra nem código: a experiência trabalha só a ideia (01/11/2026).

**Fala para ElevenLabs:**

```text
[engaging, energetic, conversational voice] Mais adiante, você vai poder publicar o seu jogo no Mural, para outras pessoas jogarem. Antes, vale entender o que vai para lá quando você publica.

[curious] Sabe quando você tira uma foto de um desenho e manda para alguém da família?

[curious] E se eu mudar o projeto depois de publicar, o Mural muda junto?

[engaging, energetic, conversational voice] O que você acha? Isso você vai testar na experiência.

[upbeat, encouraging voice] Agora você vai investigar o que o Mural guarda quando você publica e quando você muda o projeto depois. Você escolhe por onde começar e pode repetir os testes. O Zappy ajuda a observar as diferenças. Quando terminar, clique em Próxima parte.
```

**Substituições na edição kids:**

| ID | Personagem | Ocorrência | Âncora anterior | Fala exata substituída | Âncora posterior | Tags |
| --- | --- | --- | --- | --- | --- | --- |
| video-copia-publicada-K1 | Dedé | 1 | o que vai para lá quando você publica. Sabe quando você tira uma foto de um desenho e manda para alguém da família? | E se eu mudar o projeto depois de publicar, o Mural muda junto? | O que você acha? Isso você vai testar na experiência. Agora você vai investigar o que o Mural guarda quando você | [curious] |

No adulto, manter toda a fala da professora. No kids, silenciar apenas o trecho marcado e substituir pelo áudio do personagem, sem sobrepor vozes.

**Imagem nas substituições kids (não gravar):**

- `video-copia-publicada-K1`: entrada — Manter o meme da foto e a experiência com o Mural vazio. Saída — Seguir sem publicar: a professora só convida a testar.


**Falas dentro da experiência:** `packages/core/src/learning/scene/guia-livre/published-copy.ts`, com a tela em `packages/member-shell/src/components/scene-livre/published-copy.tsx`. O Zappy acompanha o estado real e sugere o próximo teste; os controles ficam livres e as descobertas contam em qualquer ordem.

**Recado na página (não gravar):** Sua vez! Investigue o que o Mural guarda quando você publica e quando muda o projeto depois. Você escolhe a ordem dos testes, e o Zappy sugere o que observar. Quando terminar, clique em Próxima parte.

## Seção 2. Jogue do começo ao reinício

### Clipe `video-teste-completo` · Jogue do começo ao reinício

**Estimativa de gravação:** aproximadamente 3 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio.

**Clipe:** `video-teste-completo`

**Na tela:** Começar pela retomada, antes de qualquer gesto novo, com o trabalho da criança à vista. No "Nesta parte, clique em Abrir meu Estúdio", retomar o jogo na outra aba. No "toque na tecla Enter para começar", começar a partida. No "Mova a nave para os lados", mover, atirar e acertar uma pedra. No "deixe as pedras acertarem a nave", perder as vidas. No "Tá vendo?", apontar a tela de fim. No "Toque na tecla Enter para voltar à abertura", recomeçar e apontar os pontos e as vidas. No "clique em Preciso de ajuda", apontar o botão na aba da aula, sem clicar. O trabalho acontece na outra aba: mostrar cada gesto narrado, sem acelerar. No "volte a esta aba e clique em Próxima parte", voltar à aba da aula e clicar em **Próxima parte** [próxima parte].

**Fala para ElevenLabs:**

```text
[engaging, energetic, conversational voice] Lembra da experiência da parte anterior? O Mural guardou o jogo do jeito que ele estava na hora de publicar. Por isso, antes de publicar, vale conferir se o seu jogo inteiro funciona. Agora a gente vai jogar uma partida completa, do começo ao recomeço.

[engaging, energetic, conversational voice] Nesta parte, clique em Abrir meu Estúdio e retome o seu jogo. Clique na prévia e toque na tecla Enter para começar.

[engaging, energetic, conversational voice] Mova a nave para os lados, atire e acerte uma pedra. [confident, clear, unhurried voice] Confira se os pontos mudam e se as duas animações aparecem.

[engaging, energetic, conversational voice] Depois deixe as pedras acertarem a nave até acabar a última vida. Tá vendo? A partida acaba e aparece a tela de fim, porque as vidas acabaram.

[engaging, energetic, conversational voice] Toque na tecla Enter para voltar à abertura e em outro Enter para começar de novo. [confident, clear, unhurried voice] Confira se os pontos e as vidas recomeçam e se não sobrou pedra da partida anterior.

[curious] E se alguma coisa não funcionar?

[engaging, energetic, conversational voice] Volte à aula em que aquela parte funcionava e compare os blocos, sem trocar o projeto inteiro por outro. Se precisar de ajuda, clique em Preciso de ajuda, aqui na aula, e conte o que você queria, o que tentou e o que aconteceu. Depois dos ajustes, teste de novo.

[engaging, energetic, conversational voice] Pause aqui e faça esta parte no seu jogo. Se o Estúdio ainda não estiver aberto, clique em Abrir meu Estúdio. Depois compare o seu jogo com a conferência que a gente acabou de fazer e espere aparecer Salvo, porque é assim que o seu jogo fica guardado para a próxima parte. Quando aparecer, volte a esta aba e clique em Próxima parte.
```

**Substituições na edição kids:**

| ID | Personagem | Ocorrência | Âncora anterior | Fala exata substituída | Âncora posterior | Tags |
| --- | --- | --- | --- | --- | --- | --- |
| video-teste-completo-K1 | Dedé | 1 | outro Enter para começar de novo. Confira se os pontos e as vidas recomeçam e se não sobrou pedra da partida anterior. | E se alguma coisa não funcionar? | Volte à aula em que aquela parte funcionava e compare os blocos, sem trocar o projeto inteiro por outro. Se precisar de | [curious] |

No adulto, manter toda a fala da professora. No kids, silenciar apenas o trecho marcado e substituir pelo áudio do personagem, sem sobrepor vozes.

**Imagem nas substituições kids (não gravar):**

- `video-teste-completo-K1`: entrada — Mostrar a partida nova com os pontos e as vidas recomeçados. Saída — Apontar o botão Preciso de ajuda na aba da aula enquanto a professora explica.


**Recado na página (não gravar):** Agora jogue o seu jogo do começo ao reinício! Teste a partida completa no mesmo cartão, com as suas duas artes. Quando aparecer Salvo, volte a esta aba e clique em Próxima parte.

## Seção 3. Mostre o jogo se quiser

### Clipe `video-compartilhar` · Mostre o jogo se quiser

**Estimativa de gravação:** aproximadamente 2 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio.

**Clipe:** `video-compartilhar`

**Na tela:** No "clique em Compartilhar", abrir o Compartilhar no alto do Estúdio. No "Confira o título", apontar o título e o resumo. No "clique em Gerar capa", gerar e mostrar a capa. No "clique em Publicar", publicar e esperar Seu jogo está no Mural!. No "Clique em Abrir o jogo", abrir a versão publicada, jogar um pouco e voltar. No "Clique em Copiar link de jogar", copiar e mostrar Link copiado!. No "Depois clique em Fechar", fechar a janela. O trabalho acontece na outra aba: mostrar cada gesto narrado, sem acelerar. No "volte a esta aba e clique em Próxima parte", voltar à aba da aula e clicar em **Próxima parte** [próxima parte].

**Fala para ElevenLabs:**

```text
[engaging, energetic, conversational voice] Agora vem uma escolha sua: publicar o seu jogo no Mural. Se quiser mostrar o seu jogo para a família e os amigos, espere aparecer Salvo e clique em Compartilhar, no alto do Estúdio.

[confident, clear, unhurried voice] Confira o título. O resumo pode já vir escrito, por isso leia e deixe do seu jeito, contando como jogar.

[engaging, energetic, conversational voice] Depois clique em Gerar capa e confira se a imagem mostra o seu jogo. Com título, resumo e capa prontos, clique em Publicar.

[engaging, energetic, conversational voice] Espere aparecer Seu jogo está no Mural! Agora você, a sua família e os seus amigos podem jogar o jogo que você criou. Clique em Abrir o jogo, e a versão publicada abre em outra aba. Teste uma partida e volte à aba do Estúdio.

[curious] E para mandar o jogo para alguém?

[confident, clear, unhurried voice] Clique em Copiar link de jogar. [interested, animated voice] Olha só: o botão muda para Link copiado! Mande o link para a sua família e os seus amigos, com a ajuda de um adulto se precisar, porque quem receber pode jogar direto, até no celular. Depois clique em Fechar.

[engaging, energetic, conversational voice] Se preferir guardar o jogo por enquanto, você pode seguir para as perguntas e depois enviar o jogo pela galeria. E, se mudar o projeto depois de publicar, publique de novo para mostrar a mudança, porque o cartão antigo continua com a versão anterior, como na experiência.

[engaging, energetic, conversational voice] Pause aqui se você escolheu publicar. Se o Estúdio ainda não estiver aberto, clique em Abrir meu Estúdio. Depois de clicar em Fechar, volte a esta aba e clique em Próxima parte.
```

**Substituições na edição kids:**

| ID | Personagem | Ocorrência | Âncora anterior | Fala exata substituída | Âncora posterior | Tags |
| --- | --- | --- | --- | --- | --- | --- |
| video-compartilhar-K1 | Dedé | 1 | você criou. Clique em Abrir o jogo, e a versão publicada abre em outra aba. Teste uma partida e volte à aba do Estúdio. | E para mandar o jogo para alguém? | Clique em Copiar link de jogar. Olha só: o botão muda para Link copiado! Mande o link para a sua família e os seus | [curious] |

No adulto, manter toda a fala da professora. No kids, silenciar apenas o trecho marcado e substituir pelo áudio do personagem, sem sobrepor vozes.

**Imagem nas substituições kids (não gravar):**

- `video-compartilhar-K1`: entrada — Esperar Seu jogo está no Mural!, abrir e testar a versão publicada e voltar ao Estúdio, sem copiar o link antes da pergunta. Saída — Clicar em Copiar link de jogar e mostrar Link copiado!.


**Recado na página (não gravar):** Agora, se quiser, publique o seu jogo no Mural e mande o link para a família e os amigos! Você pode seguir mesmo sem publicar. Quando terminar, volte a esta aba e clique em Próxima parte.

## Seção 4. Confira o que você transformou

**Recado na página (não gravar):** Agora vamos relembrar o que você transformou no seu jogo, com três perguntas! Se errar alguma, leia o porquê, clique em Tentar de novo e responda outra vez. Quando acertar todas, clique em Próxima parte.

Sem vídeo nem ferramenta. O quiz vem imediatamente depois do Zappy. Correção com explicação, tentativas ilimitadas e sem espera.

## Seção 5. Envie seu jogo do seu jeito

### Clipe `video-entrega` · Envie seu jogo do seu jeito

**Estimativa de gravação:** aproximadamente 2 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio.

**Clipe:** `video-entrega`

**Na tela:** No "confira no seu jogo", mostrar as duas artes animadas e uma partida completa. No "espere aparecer Guardado na sua conta", mostrar o aviso no Estúdio. No "clique em Escolher no Estúdio", voltar à aba da aula e abrir a galeria. No "selecione o cartão do seu jogo", marcar o cartão. No "Depois clique em Enviar (1)", clicar e mostrar Recebido!. O trabalho acontece na outra aba: mostrar cada gesto narrado, sem acelerar. No "Por último, clique em Concluir aula", clicar em **Concluir aula**.

**Fala para ElevenLabs:**

```text
[engaging, energetic, conversational voice] Hora de enviar o seu jogo do seu jeito! Antes, confira no seu jogo: as duas artes aparecem inteiras e animadas, e uma partida completa termina e recomeça direitinho. Publicar e escrever um recado ficam à sua escolha. Se alguma coisa estiver diferente, volte à parte em que ela foi feita e ajuste. Depois espere aparecer Guardado na sua conta no Estúdio, porque a galeria da aula só mostra o que já está guardado na sua conta.

[engaging, energetic, conversational voice] Agora volte para a aba da aula e clique em Escolher no Estúdio. Na janela Minhas criações do Estúdio, selecione o cartão do seu jogo. Se a sua criação não aparecer, confira se ela ficou guardada na sua conta e clique em Atualizar galeria.

[upbeat, encouraging voice] Se quiser, escreva uma mensagem no campo Recado. Depois clique em Enviar (1) e espere aparecer Recebido!

[engaging, energetic, conversational voice] Esse envio guarda uma cópia deste momento, e você continua criando no Estúdio. Por último, clique em Concluir aula.
```


**Recado na página (não gravar):** Hora de enviar o seu jogo do seu jeito! Confira se uma partida completa termina e recomeça direitinho. Depois clique em Escolher no Estúdio, selecione o cartão do seu jogo e clique em Enviar (1). Quando aparecer Recebido!, clique em Concluir aula.
