# Roteiro de produção · Coloque sua nave animada no jogo

**Produção:** a professora grava toda a fala principal. Na montagem kids, Dedé substitui somente os trechos da tabela, com a mesma frase e sem voz sobreposta. O master funciona sozinho no adulto. Notas e recados da página não são gravados. [Direção de voz e edição](../../../aulas-interativas-tecnico/DIRETRIZES-VOZ-ELEVENLABS.md).

## Seção 1. Separe os nomes que os blocos procuram

### Clipe `video-nomes` · Separe os nomes que os blocos procuram

**Estimativa de gravação:** aproximadamente 2 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio.

**Clipe:** `video-nomes`

**Na tela:** No "Nesta aula, a sua nave animada", mostrar a experiência na aula, parada, com o bloco de cima no lugar. No "Imagina um time com duas pessoas", mostrar o meme ilustrado (2 a 3 s) do Zappy de técnico chamando um nome [na edição: meme do time]. No "Agora você vai investigar", ampliar a experiência [ampliar experiência] e mostrar os blocos e a prévia parados, sem tirar o bloco nem trocar nomes: o que cada aviso diz é a descoberta da criança. Nesta parte, o bloco é o próprio conceito e pode ser nomeado. No "O Zappy ajuda", mostrar o Zappy [apontar zappy]. No "Quando terminar, clique em Próxima parte", voltar ao tamanho da aula [voltar à aula] e clicar em **Próxima parte** [próxima parte]. O meme é desenho nosso, com o Zappy ou os personagens do jogo, sem foto de pessoa real nem meme da internet; fica 2 a 3 segundos na tela, sem cobrir a experiência, e a narração explica sem depender dele. Não fazer os testes pela criança nem dizer o resultado antes do teste: a criança descobre na experiência, com o Zappy (convite à investigação, 02/11/2026).

**Fala para ElevenLabs:**

```text
[engaging, energetic, conversational voice] Nesta aula, a sua nave animada vai entrar no jogo. Para isso, o jogo vai usar duas coisas com nome: a nave, que é o personagem que anda na tela, e a folha, que é a imagem com os dois desenhos da sua nave, um do lado do outro.

[engaging, energetic, conversational voice] No Estúdio, um bloco cria a nave com o nome nave, e outro bloco cria a folha, também com um nome. Outros blocos procuram o nome nave para mover, desenhar e conferir a nave. Ou seja, os blocos acham cada coisa pelo nome dela.

[engaging, energetic, conversational voice] Imagina um time com duas pessoas que têm o mesmo nome, e o técnico chama esse nome.

[curious] E se a nave e a folha tiverem o mesmo nome?

[engaging, energetic, conversational voice] O que você acha? Isso você vai testar na experiência.

[upbeat, encouraging voice] Agora você vai investigar o que acontece com os blocos quando o nome nave falta ou aparece duas vezes. Você escolhe por onde começar e pode repetir os testes. O Zappy ajuda a observar as diferenças. Quando terminar, clique em Próxima parte.
```

**Substituições na edição kids:**

| ID | Personagem | Ocorrência | Âncora anterior | Fala exata substituída | Âncora posterior | Tags |
| --- | --- | --- | --- | --- | --- | --- |
| video-nomes-K1 | Dedé | 1 | acham cada coisa pelo nome dela. Imagina um time com duas pessoas que têm o mesmo nome, e o técnico chama esse nome. | E se a nave e a folha tiverem o mesmo nome? | O que você acha? Isso você vai testar na experiência. Agora você vai investigar o que acontece com os blocos quando o | [curious] |

No adulto, manter toda a fala da professora. No kids, silenciar apenas o trecho marcado e substituir pelo áudio do personagem, sem sobrepor vozes.

**Imagem nas substituições kids (não gravar):**

- `video-nomes-K1`: entrada — Manter o meme do time e a experiência com o bloco de cima no lugar. Saída — Seguir sem trocar nomes: a professora só convida a testar.


**Falas dentro da experiência:** `packages/core/src/learning/scene/guia-livre/unique-names.ts`, com a tela em `packages/member-shell/src/components/scene-livre/unique-names.tsx`. O Zappy acompanha o estado real e sugere o próximo teste; os controles ficam livres e as descobertas contam em qualquer ordem.

**Recado na página (não gravar):** Sua vez! Investigue o que acontece com os blocos quando um nome falta ou se repete. Você escolhe a ordem dos testes, e o Zappy sugere o que observar. Quando terminar, clique em Próxima parte.

## Seção 2. Traga seus desenhos para o projeto

### Clipe `video-trazer-artes` · Traga seus desenhos para o projeto

**Estimativa de gravação:** aproximadamente 2 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio.

**Clipe:** `video-trazer-artes`

**Na tela:** Começar pela retomada, antes de qualquer gesto novo, com o trabalho da criança à vista. No "Nesta parte, clique em Abrir meu Estúdio", abrir o Estúdio na outra aba e o cartão do jogo. No "abra Mais opções, Materiais e Imagens", abrir a janela de materiais. No "clique em Trazer do Pinta", mostrar os cartões das artes. No "clique em Adicionar ao projeto", adicionar nave e asteroide e mostrar a marca no projeto. No "Clique na prévia e toque na tecla Enter", começar uma partida. No "Tá vendo?", apontar a nave e as pedras antigas. O trabalho acontece na outra aba: mostrar cada gesto narrado, sem acelerar. No "volte a esta aba e clique em Próxima parte", voltar à aba da aula e clicar em **Próxima parte** [próxima parte].

**Fala para ElevenLabs:**

```text
[engaging, energetic, conversational voice] Lembra da experiência da parte anterior? Os blocos achavam a nave pelo nome, por isso o nome precisava estar certinho. Agora a gente vai trazer os seus desenhos para o jogo, com os nomes que você deu no Pinta: nave e asteroide.

[engaging, energetic, conversational voice] Nesta parte, clique em Abrir meu Estúdio. Em Meus Jogos, abra o cartão que você nomeou e enviou na aula 1.

[engaging, energetic, conversational voice] Depois abra Mais opções, Materiais e Imagens. Na janela Materiais do jogo, clique em Trazer do Pinta.

[engaging, energetic, conversational voice] Nos cartões nave e asteroide, clique em Adicionar ao projeto e confira a marca no projeto nos dois. Depois feche a escolha e a janela de materiais.

[engaging, energetic, conversational voice] Se uma arte não estiver na lista, volte ao Pinta e confira se ela ficou guardada na sua conta.

[curious] Já trouxe os desenhos. Eles já vão aparecer no jogo?

[confident, clear, unhurried voice] Clique na prévia e toque na tecla Enter para começar uma partida. Tá vendo? Os desenhos ainda são os antigos, porque nenhum bloco mandou o jogo usar as suas imagens. É isso que você vai fazer nas próximas partes.

[engaging, energetic, conversational voice] Pause aqui e faça esta parte no seu jogo. Se o Estúdio ainda não estiver aberto, clique em Abrir meu Estúdio. Depois compare o seu jogo com a conferência que a gente acabou de fazer e espere aparecer Salvo, porque é assim que o seu jogo fica guardado para a próxima parte. Quando aparecer, volte a esta aba e clique em Próxima parte.
```

**Substituições na edição kids:**

| ID | Personagem | Ocorrência | Âncora anterior | Fala exata substituída | Âncora posterior | Tags |
| --- | --- | --- | --- | --- | --- | --- |
| video-trazer-artes-K1 | Dedé | 1 | e a janela de materiais. Se uma arte não estiver na lista, volte ao Pinta e confira se ela ficou guardada na sua conta. | Já trouxe os desenhos. Eles já vão aparecer no jogo? | Clique na prévia e toque na tecla Enter para começar uma partida. Tá vendo? Os desenhos ainda são os antigos, porque | [curious] |

No adulto, manter toda a fala da professora. No kids, silenciar apenas o trecho marcado e substituir pelo áudio do personagem, sem sobrepor vozes.

**Imagem nas substituições kids (não gravar):**

- `video-trazer-artes-K1`: entrada — Mostrar a marca no projeto nos cartões nave e asteroide e fechar a janela de materiais. Saída — Começar uma partida na prévia e deixar ver os desenhos antigos.


**Recado na página (não gravar):** Agora traga os seus desenhos para o jogo! Adicione nave e asteroide aos materiais da cópia do seu jogo. Quando aparecer Salvo, volte a esta aba e clique em Próxima parte.

## Seção 3. Separe o quadro do tamanho no jogo

### Clipe `video-recorte` · Separe o quadro do tamanho no jogo

**Estimativa de gravação:** aproximadamente 2 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio.

**Clipe:** `video-recorte`

**Na tela:** No "Lembra da folha?", mostrar a experiência na aula, parada, sem recorte. No "Sabe uma cartela de adesivos", mostrar o meme ilustrado (2 a 3 s) do Zappy destacando um adesivo da nave [na edição: meme da cartela]. No "Agora você vai investigar", ampliar a experiência [ampliar experiência] e mostrar a folha e o jogo parados, sem escolher recorte: o que aparece no jogo é a descoberta da criança. Nesta parte, recorte, folha e quadro da folha são o próprio conceito. No "O Zappy ajuda", mostrar o Zappy [apontar zappy]. No "Quando terminar, clique em Próxima parte", voltar ao tamanho da aula [voltar à aula] e clicar em **Próxima parte** [próxima parte]. O meme é desenho nosso, com o Zappy ou os personagens do jogo, sem foto de pessoa real nem meme da internet; fica 2 a 3 segundos na tela, sem cobrir a experiência, e a narração explica sem depender dele. Não fazer os testes pela criança nem dizer o resultado antes do teste: a criança descobre na experiência, com o Zappy (convite à investigação, 02/11/2026).

**Fala para ElevenLabs:**

```text
[engaging, energetic, conversational voice] Lembra da folha? É a imagem da sua nave com os dois desenhos lado a lado.

[engaging, energetic, conversational voice] Para mostrar um desenho só, o jogo recorta um pedaço da folha. O tamanho desse pedaço se chama recorte.

[engaging, energetic, conversational voice] Sabe uma cartela de adesivos? Para colar um adesivo, você destaca só aquele pedaço da cartela.

[engaging, energetic, conversational voice] Tem mais uma medida: o tamanho da nave no jogo, que diz se a nave aparece grande ou pequena na tela.

[curious] E se o recorte for maior ou menor que um desenho?

[engaging, energetic, conversational voice] O que você acha? Isso você vai testar na experiência.

[upbeat, encouraging voice] Agora você vai investigar qual recorte mostra uma nave inteira e o que o tamanho da nave no jogo muda. Você escolhe por onde começar e pode repetir os testes. O Zappy ajuda a observar as diferenças. Quando terminar, clique em Próxima parte.
```

**Substituições na edição kids:**

| ID | Personagem | Ocorrência | Âncora anterior | Fala exata substituída | Âncora posterior | Tags |
| --- | --- | --- | --- | --- | --- | --- |
| video-recorte-K1 | Dedé | 1 | pedaço da cartela. Tem mais uma medida: o tamanho da nave no jogo, que diz se a nave aparece grande ou pequena na tela. | E se o recorte for maior ou menor que um desenho? | O que você acha? Isso você vai testar na experiência. Agora você vai investigar qual recorte mostra uma nave inteira e | [curious] |

No adulto, manter toda a fala da professora. No kids, silenciar apenas o trecho marcado e substituir pelo áudio do personagem, sem sobrepor vozes.

**Imagem nas substituições kids (não gravar):**

- `video-recorte-K1`: entrada — Mostrar a experiência sem recorte, logo depois do meme da cartela. Saída — Seguir sem escolher recorte: a professora só convida a testar.


**Falas dentro da experiência:** `packages/core/src/learning/scene/guia-livre/sheet-vs-sprite.ts`, com a tela em `packages/member-shell/src/components/scene-livre/sheet-vs-sprite.tsx`. O Zappy acompanha o estado real e sugere o próximo teste; os controles ficam livres e as descobertas contam em qualquer ordem.

**Recado na página (não gravar):** Sua vez! Investigue qual recorte mostra uma nave inteira e o que o tamanho no jogo muda. Você escolhe a ordem dos testes, e o Zappy sugere o que observar. Quando terminar, clique em Próxima parte.

## Seção 4. Use sua imagem no criador da nave

### Clipe `video-trocar-nave` · Use sua imagem no criador da nave

**Estimativa de gravação:** aproximadamente 4 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio.

**Clipe:** `video-trocar-nave`

**Na tela:** Começar pela retomada, antes de qualquer gesto novo, com o trabalho da criança à vista: primeiro o teste, com o resultado que o Tá vendo? cita à vista, e depois a lembrança da experiência. No "No seu Estúdio, comece uma partida", mostrar o Estúdio na outra aba e começar a partida na prévia. No "Tá vendo?", apontar a nave antiga. No "encontre Criar nave", apontar o bloco e o x e o y dele. No "Deixe à vista um espaço livre", mostrar o espaço livre. No "abra Jogo 2D, Sprites e Criar e trocar aparência", abrir as categorias e soltar o bloco no espaço livre. No "No nome, clique em heroi", apontar o heroi do nome e o da imagem, escrever nave no nome e escolher a imagem nave. No "Agora os números", apontar os valores de fábrica e trocar o x, o y, a largura e a altura. No "Clique com o botão direito só nele", apagar o Criar nave antigo. No "Encaixe o novo criador", encaixar abaixo de Preparar o jogo em tela cheia. No "Comece uma partida de novo", começar e apontar a nave espremida e as setas movendo. O trabalho acontece na outra aba: mostrar cada gesto narrado, sem acelerar. No "volte a esta aba e clique em Próxima parte", voltar à aba da aula e clicar em **Próxima parte** [próxima parte].

**Fala para ElevenLabs:**

```text
[engaging, energetic, conversational voice] No seu Estúdio, comece uma partida do seu jogo. Tá vendo? A nave é a antiga, porque o bloco não usa sua imagem. Lembra da experiência da primeira parte desta aula? Os blocos acham a nave pelo nome. Agora a gente vai trocar o bloco, com o mesmo nome!

[engaging, energetic, conversational voice] Em Ao iniciar, encontre Criar nave, que é o bloco que cria a nave hoje. Leia o x e o y dele, porque o bloco novo vai usar os mesmos.

[confident, clear, unhurried voice] Deixe à vista um espaço livre da área de blocos. Depois abra Jogo 2D, Sprites e Criar e trocar aparência, pegue Criar sprite em x y largura altura com imagem e solte nesse espaço livre.

[confident, clear, unhurried voice] Repare: o bloco novo chega com heroi no nome e na imagem. No nome, clique em heroi e escreva nave. Na imagem, clique em heroi e escolha nave.

[engaging, energetic, conversational voice] Agora os números, que chegam com 100 no x e no y e 40 na largura e na altura. Coloque 400 no x e 410 no y, os mesmos do Criar nave. Na largura e na altura, coloque 54. A altura agora é 54, igual à largura, porque o seu desenho é quadrado e assim ele não fica esticado.

[curious] O bloco novo já está preenchido. E o antigo?

[engaging, energetic, conversational voice] Agora o Criar nave antigo sai. Clique com o botão direito só nele e escolha Apagar este bloco. Se apagar outra peça sem querer, use Ctrl+Z para desfazer.

[engaging, energetic, conversational voice] Encaixe o novo criador no lugar do antigo, abaixo de Preparar o jogo em tela cheia e acima dos grupos. É este bloco que cria a nave com a sua imagem.

[engaging, energetic, conversational voice] Comece uma partida de novo. [interested, animated voice] Olha só: a sua nave aparece, mas com os dois desenhos espremidos, porque o bloco usa a folha inteira, como o recorte de 64 na experiência. E as setas continuam movendo a nave, porque o nome continua nave, e é esse nome que os outros blocos procuram.

[reassuring, encouraging voice] Se no seu jogo não aconteceu isso, volte aos blocos e confira se ficou assim: um criador só, com nome nave, x 400, y 410, largura 54, altura 54 e imagem nave, abaixo de Preparar o jogo em tela cheia. [reassuring, encouraging voice] Depois de corrigir, teste de novo.

[engaging, energetic, conversational voice] Pause aqui e faça esta parte no seu jogo. Se o Estúdio ainda não estiver aberto, clique em Abrir meu Estúdio. Depois compare o seu jogo com a conferência que a gente acabou de fazer e espere aparecer Salvo, porque é assim que o seu jogo fica guardado para a próxima parte. Quando aparecer, volte a esta aba e clique em Próxima parte.
```

**Substituições na edição kids:**

| ID | Personagem | Ocorrência | Âncora anterior | Fala exata substituída | Âncora posterior | Tags |
| --- | --- | --- | --- | --- | --- | --- |
| video-trocar-nave-K1 | Dedé | 1 | coloque 54. A altura agora é 54, igual à largura, porque o seu desenho é quadrado e assim ele não fica esticado. | O bloco novo já está preenchido. E o antigo? | Agora o Criar nave antigo sai. Clique com o botão direito só nele e escolha Apagar este bloco. Se apagar outra peça sem | [curious] |

No adulto, manter toda a fala da professora. No kids, silenciar apenas o trecho marcado e substituir pelo áudio do personagem, sem sobrepor vozes.

**Imagem nas substituições kids (não gravar):**

- `video-trocar-nave-K1`: entrada — Mostrar o bloco novo preenchido, ainda solto, ao lado do Criar nave antigo. Saída — Clicar com o botão direito só no Criar nave antigo e apagar.


**Recado na página (não gravar):** Agora use a sua imagem no criador da nave! Troque o criador por um sprite com imagem, conservando o nome nave. Quando aparecer Salvo, volte a esta aba e clique em Próxima parte.

## Seção 5. Prepare o recorte da nave

### Clipe `video-folha-nave` · Prepare o recorte da nave

**Estimativa de gravação:** aproximadamente 3 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio.

**Clipe:** `video-folha-nave`

**Na tela:** Começar pela retomada, antes de qualquer gesto novo, com o trabalho da criança à vista: primeiro o teste, com o resultado que o Tá vendo? cita à vista, e depois a lembrança da experiência. No "No seu Estúdio, comece uma partida", mostrar o Estúdio na outra aba e começar a partida na prévia. No "Tá vendo?", apontar as duas naves espremidas. No "deixe primeiro esse lugar à vista", mostrar o fim de Ao iniciar. No "abra Jogo 2D, Sprites e Animação", abrir as categorias e encaixar o bloco no fim de Ao iniciar. No "Escreva folha-nave no nome da folha", escrever o nome e escolher a imagem nave. No "deixe 32 e 32", apontar os tamanhos. No "Comece uma partida", mostrar a nave ainda espremida. O trabalho acontece na outra aba: mostrar cada gesto narrado, sem acelerar. No "volte a esta aba e clique em Próxima parte", voltar à aba da aula e clicar em **Próxima parte** [próxima parte].

**Fala para ElevenLabs:**

```text
[engaging, energetic, conversational voice] No seu Estúdio, comece uma partida do seu jogo. Tá vendo? Aparecem as duas naves espremidas, porque o bloco usa a folha inteira. Lembra da experiência da terceira parte desta aula? O recorte de 32 mostrou uma nave inteira. Agora a gente vai recortar a sua folha!

[engaging, energetic, conversational voice] A folha vai entrar no fim de Ao iniciar. Por isso, deixe primeiro esse lugar à vista. Se precisar, arraste um espaço vazio da área de blocos até aparecer o último bloco.

[confident, clear, unhurried voice] Agora abra Jogo 2D, Sprites e Animação e pegue Carregar folha de quadros da imagem com quadros de x px. Encaixe esse bloco no fim de Ao iniciar, depois dos blocos que já estavam ali.

[curious] Que nome eu dou para essa folha?

[engaging, energetic, conversational voice] Um nome só dela: folha-nave, como na experiência da primeira parte desta aula. Escreva folha-nave no nome da folha. Na imagem, escolha nave.

[engaging, energetic, conversational voice] Nos tamanhos dos quadros, deixe 32 e 32, porque cada desenho da sua nave tem 32 por 32. É este bloco que recorta a folha em quadros.

[engaging, energetic, conversational voice] Não troque o 54 do criador, porque ele é o tamanho da nave na tela, e não o do recorte.

[engaging, energetic, conversational voice] Comece uma partida. [confident, clear, unhurried voice] Repare: a nave continua espremida, porque a folha está pronta, mas a nave ainda não usa os quadros dela. É isso que você vai fazer na próxima parte.

[engaging, energetic, conversational voice] Pause aqui e faça esta parte no seu jogo. Se o Estúdio ainda não estiver aberto, clique em Abrir meu Estúdio. Depois compare o seu jogo com a conferência que a gente acabou de fazer e espere aparecer Salvo, porque é assim que o seu jogo fica guardado para a próxima parte. Quando aparecer, volte a esta aba e clique em Próxima parte.
```

**Substituições na edição kids:**

| ID | Personagem | Ocorrência | Âncora anterior | Fala exata substituída | Âncora posterior | Tags |
| --- | --- | --- | --- | --- | --- | --- |
| video-folha-nave-K1 | Dedé | 1 | quadros da imagem com quadros de x px. Encaixe esse bloco no fim de Ao iniciar, depois dos blocos que já estavam ali. | Que nome eu dou para essa folha? | Um nome só dela: folha-nave, como na experiência da primeira parte desta aula. Escreva folha-nave no nome da folha. Na | [curious] |

No adulto, manter toda a fala da professora. No kids, silenciar apenas o trecho marcado e substituir pelo áudio do personagem, sem sobrepor vozes.

**Imagem nas substituições kids (não gravar):**

- `video-folha-nave-K1`: entrada — Mostrar o bloco Carregar folha de quadros encaixado no fim de Ao iniciar, com os campos ainda de fábrica. Saída — Escrever folha-nave no nome da folha e escolher a imagem nave.


**Recado na página (não gravar):** Agora prepare o recorte da sua nave! Carregue folha-nave com quadros de 32 por 32 no fim de Ao iniciar. Quando aparecer Salvo, volte a esta aba e clique em Próxima parte.

## Seção 6. Ligue a animação voando

### Clipe `video-animar-nave` · Ligue a animação voando

**Estimativa de gravação:** aproximadamente 3 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio.

**Clipe:** `video-animar-nave`

**Na tela:** No "No seu Estúdio, abra o cartão do seu jogo", mostrar o cartão aberto na outra aba e começar a partida na prévia. No "Tá vendo?", apontar a nave espremida. No "Deixe esse bloco à vista", mostrar Carregar folha de quadros folha-nave. No "Abra Jogo 2D, Sprites e Animação", abrir as categorias e encaixar o bloco logo abaixo. No "No sprite, escolha nave", preencher sprite e folha. No "clique em Escolher", escolher voando. No "Repare nos valores", apontar o 0, o 1 e o 8. No "Agora comece a partida com Enter", jogar um pouco e apontar o fogo pulsando. O trabalho acontece na outra aba: mostrar cada gesto narrado, sem acelerar. No "volte a esta aba e clique em Próxima parte", voltar à aba da aula e clicar em **Próxima parte** [próxima parte].

**Fala para ElevenLabs:**

```text
[engaging, energetic, conversational voice] No seu Estúdio, abra o cartão do seu jogo e comece uma partida na prévia. Tá vendo? A nave ainda aparece espremida, porque ela não usa os quadros da folha-nave. Agora o jogo vai animar a sua nave com esses quadros.

[engaging, energetic, conversational voice] A animação vai logo abaixo de Carregar folha de quadros folha-nave, porque a folha precisa estar carregada antes de a nave usar os quadros dela. Deixe esse bloco à vista.

[confident, clear, unhurried voice] Abra Jogo 2D, Sprites e Animação, pegue Animar sprite com a folha na animação, do quadro ao a fps e encaixe logo abaixo de Carregar folha de quadros folha-nave.

[engaging, energetic, conversational voice] No sprite, escolha nave. Na folha, escolha folha-nave. Depois clique em Escolher, na animação, e selecione voando.

[confident, clear, unhurried voice] Repare nos valores que chegam preenchidos: do quadro 0 ao 1, a 8 fps. Fps quer dizer quadros por segundo.

[curious] No Pinta era um e dois. Por que aqui é zero e um?

[engaging, energetic, conversational voice] É que o bloco começa a contar do zero. Por isso, o quadro 0 é o desenho que o Pinta chama de quadro 1, e o quadro 1 é o quadro 2 do Pinta. São os mesmos dois desenhos.

[engaging, energetic, conversational voice] É este bloco que faz a nave trocar os desenhos da folha.

[engaging, energetic, conversational voice] Agora comece a partida com Enter, mova a nave com as setas e atire com Espaço. [interested, animated voice] Olha só: a nave aparece inteira, com o fogo pulsando.

[reassuring, encouraging voice] Se no seu jogo não aconteceu isso, volte aos blocos e confira se ficou assim: Animar sprite nave com a folha folha-nave na animação voando, do quadro 0 ao 1, a 8 fps, logo abaixo de Carregar folha de quadros folha-nave. [reassuring, encouraging voice] Depois de corrigir, teste de novo. Se voando não aparecer na lista, confira se a animação ficou guardada no Pinta e se a imagem foi trazida ao projeto.

[engaging, energetic, conversational voice] Pause aqui e faça esta parte no seu jogo. Se o Estúdio ainda não estiver aberto, clique em Abrir meu Estúdio. Depois compare o seu jogo com a conferência que a gente acabou de fazer e espere aparecer Salvo, porque é assim que o seu jogo fica guardado para a próxima parte. Quando aparecer, volte a esta aba e clique em Próxima parte.
```

**Substituições na edição kids:**

| ID | Personagem | Ocorrência | Âncora anterior | Fala exata substituída | Âncora posterior | Tags |
| --- | --- | --- | --- | --- | --- | --- |
| video-animar-nave-K1 | Dedé | 1 | voando. Repare nos valores que chegam preenchidos: do quadro 0 ao 1, a 8 fps. Fps quer dizer quadros por segundo. | No Pinta era um e dois. Por que aqui é zero e um? | É que o bloco começa a contar do zero. Por isso, o quadro 0 é o desenho que o Pinta chama de quadro 1, e o quadro 1 é o | [curious] |

No adulto, manter toda a fala da professora. No kids, silenciar apenas o trecho marcado e substituir pelo áudio do personagem, sem sobrepor vozes.

**Imagem nas substituições kids (não gravar):**

- `video-animar-nave-K1`: entrada — Mostrar os campos preenchidos depois de escolher voando, sem alterar os números. Saída — Apontar o 0 e o 1 no bloco durante a explicação.


**Recado na página (não gravar):** Agora ligue a animação voando! Anime nave com folha-nave e confira os dois quadros no jogo. Quando aparecer Salvo, volte a esta aba e clique em Próxima parte.

## Seção 7. Envie o jogo com sua nave

### Clipe `video-entrega` · Envie o jogo com sua nave

**Estimativa de gravação:** aproximadamente 2 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio.

**Clipe:** `video-entrega`

**Na tela:** No "confira no seu jogo", mostrar a nave inteira e animada no jogo. No "espere aparecer Guardado na sua conta", mostrar o aviso no Estúdio. No "clique em Escolher no Estúdio", voltar à aba da aula e abrir a galeria. No "selecione o cartão do seu jogo", marcar o cartão. No "Depois clique em Enviar (1)", clicar e mostrar Recebido!. O trabalho acontece na outra aba: mostrar cada gesto narrado, sem acelerar. No "Por último, clique em Concluir aula", clicar em **Concluir aula**.

**Fala para ElevenLabs:**

```text
[engaging, energetic, conversational voice] Hora de enviar o seu jogo com a sua nave! Antes, confira no seu jogo: a nave aparece inteira, com a sua imagem e a animação voando; as setas e o tiro funcionam; e as pedras continuam as originais por enquanto. Se alguma coisa estiver diferente, volte à parte em que ela foi feita e ajuste. Depois espere aparecer Guardado na sua conta no Estúdio, porque a galeria da aula só mostra o que já está guardado na sua conta.

[engaging, energetic, conversational voice] Agora volte para a aba da aula e clique em Escolher no Estúdio. Na janela Minhas criações do Estúdio, selecione o cartão do seu jogo. Se a sua criação não aparecer, confira se ela ficou guardada na sua conta e clique em Atualizar galeria.

[upbeat, encouraging voice] Se quiser, escreva uma mensagem no campo Recado. Depois clique em Enviar (1) e espere aparecer Recebido!

[engaging, energetic, conversational voice] Esse envio guarda uma cópia deste momento, e você continua criando no Estúdio. Por último, clique em Concluir aula.
```


**Recado na página (não gravar):** Hora de enviar o seu jogo com a sua nave! Confira se a nave aparece inteira, com a sua imagem e o fogo pulsando. Depois clique em Escolher no Estúdio, selecione o cartão do seu jogo e clique em Enviar (1). Quando aparecer Recebido!, clique em Concluir aula.
