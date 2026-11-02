# Roteiro de produção · Desenhe um asteroide com formas

**Produção:** a professora grava toda a fala principal. Na montagem kids, Dedé substitui somente os trechos da tabela, com a mesma frase e sem voz sobreposta. O master funciona sozinho no adulto. Notas e recados da página não são gravados. [Direção de voz e edição](../../../aulas-interativas-tecnico/DIRETRIZES-VOZ-ELEVENLABS.md).

## Seção 1. Separe o miolo da borda

### Clipe `video-preenchimento-contorno` · Separe o miolo da borda

**Estimativa de gravação:** aproximadamente 2 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio.

**Clipe:** `video-preenchimento-contorno`

**Na tela:** No "A sua pedra vai ser desenhada em vetor", mostrar a experiência na aula, parada, com as duas partes da pedra coloridas. No "Sabe um livro de colorir", mostrar o meme ilustrado (2 a 3 s) do Zappy pintando um livro de colorir [na edição: meme do livro de colorir]. No "Agora você vai investigar", ampliar a experiência [ampliar experiência] e mostrar a pedra parada, com as duas partes coloridas, sem tirar nenhuma cor: o que sobra da pedra é a descoberta da criança. No "O Zappy ajuda", mostrar o Zappy [apontar zappy]. No "Quando terminar, clique em Próxima parte", voltar ao tamanho da aula [voltar à aula] e clicar em **Próxima parte** [próxima parte]. O meme é desenho nosso, com o Zappy ou os personagens do jogo, sem foto de pessoa real nem meme da internet; fica 2 a 3 segundos na tela, sem cobrir a experiência, e a narração explica sem depender dele. Não fazer os testes pela criança nem dizer o resultado antes do teste: a criança descobre na experiência, com o Zappy (convite à investigação, 02/11/2026). Não falar de blocos, áreas do Estúdio, regra nem código: a experiência trabalha só a ideia (01/11/2026).

**Fala para ElevenLabs:**

```text
[engaging, energetic, conversational voice] A sua pedra vai ser desenhada em vetor, com formas. No vetor, cada forma tem duas partes que recebem cor.

[engaging, energetic, conversational voice] O Preenchimento é a cor de dentro da forma. O Contorno é a linha da borda. No Pinta, cada uma dessas partes tem a sua cor, e cada uma pode ficar em Sem cor.

[engaging, energetic, conversational voice] Sabe um livro de colorir? Você pinta por dentro de cada desenho com uma cor e pode passar outra cor por cima da linha.

[curious] E se uma das partes ficar em Sem cor, o que sobra?

[engaging, energetic, conversational voice] O que você acha? Isso você vai testar na experiência.

[upbeat, encouraging voice] Agora você vai investigar o que sobra da pedra quando o Preenchimento ou o Contorno fica em Sem cor. Você escolhe por onde começar e pode repetir os testes. O Zappy ajuda a observar as diferenças. Quando terminar, clique em Próxima parte.
```

**Substituições na edição kids:**

| ID | Personagem | Ocorrência | Âncora anterior | Fala exata substituída | Âncora posterior | Tags |
| --- | --- | --- | --- | --- | --- | --- |
| video-preenchimento-contorno-K1 | Dedé | 1 | Sabe um livro de colorir? Você pinta por dentro de cada desenho com uma cor e pode passar outra cor por cima da linha. | E se uma das partes ficar em Sem cor, o que sobra? | O que você acha? Isso você vai testar na experiência. Agora você vai investigar o que sobra da pedra quando o | [curious] |

No adulto, manter toda a fala da professora. No kids, silenciar apenas o trecho marcado e substituir pelo áudio do personagem, sem sobrepor vozes.

**Imagem nas substituições kids (não gravar):**

- `video-preenchimento-contorno-K1`: entrada — Manter o meme do livro de colorir e a pedra com as duas partes coloridas. Saída — Seguir sem tirar nenhuma cor: a professora só convida a testar.


**Falas dentro da experiência:** `packages/core/src/learning/scene/guia-livre/fill-stroke.ts`, com a tela em `packages/member-shell/src/components/scene-livre/fill-stroke.tsx`. O Zappy acompanha o estado real e sugere o próximo teste; os controles ficam livres e as descobertas contam em qualquer ordem.

**Recado na página (não gravar):** Sua vez! Investigue o que sobra da pedra quando cada parte fica em Sem cor. Você escolhe a ordem dos testes, e o Zappy sugere o que observar. Quando terminar, clique em Próxima parte.

## Seção 2. Prepare o desenho em vetor

### Clipe `video-novo-asteroide` · Prepare o desenho em vetor

**Estimativa de gravação:** aproximadamente 2 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio.

**Clipe:** `video-novo-asteroide`

**Na tela:** Começar pela retomada, antes de qualquer gesto novo, com o trabalho da criança à vista. No "Nesta parte, clique em Abrir meu Pinta", clicar no botão e mostrar o Pinta na outra aba. No "clique em Criar novo", abrir a escolha. No "escolha Vetor", escolher Vetor, Personagem e Médio, 64 por 64. No "Escreva asteroide", escrever o nome e começar a desenhar. No "Confira o nome asteroide", apontar o nome e a área quadrada. O trabalho acontece na outra aba: mostrar cada gesto narrado, sem acelerar. No "volte a esta aba e clique em Próxima parte", voltar à aba da aula e clicar em **Próxima parte** [próxima parte].

**Fala para ElevenLabs:**

```text
[engaging, energetic, conversational voice] Lembra da experiência da parte anterior? A pedra tinha uma cor no Preenchimento, por dentro, e outra no Contorno, na borda. Por isso, agora a gente vai criar o seu asteroide em Vetor, que é onde as formas têm essas duas partes.

[engaging, energetic, conversational voice] Nesta parte, clique em Abrir meu Pinta. Em Meus desenhos, clique em Criar novo.

[engaging, energetic, conversational voice] Em Como você quer desenhar?, escolha Vetor. Depois escolha Personagem e Médio, 64 por 64. Escreva asteroide e clique em Começar a desenhar.

[engaging, energetic, conversational voice] Se você já começou esse desenho neste curso, retome o mesmo cartão, em vez de criar outro.

[confident, clear, unhurried voice] Confira o nome asteroide e a área quadrada. A pedra vai ocupar o centro e a parte de baixo, por isso deixe a parte de cima livre para as chamas que você vai desenhar depois.

[engaging, energetic, conversational voice] Pause aqui e faça esta parte no seu desenho. Se o Pinta ainda não estiver aberto, clique em Abrir meu Pinta. Depois compare o seu desenho com a conferência que a gente acabou de fazer e espere aparecer Guardado na sua conta, porque é assim que o seu desenho fica guardado para a próxima parte. Quando aparecer, volte a esta aba e clique em Próxima parte.
```


**Recado na página (não gravar):** Agora prepare o desenho do seu asteroide! Crie um personagem em Vetor, tamanho Médio, chamado asteroide. Quando aparecer Guardado na sua conta, volte a esta aba e clique em Próxima parte.

## Seção 3. Feche a forma da pedra

### Clipe `video-forma-pedra` · Feche a forma da pedra

**Estimativa de gravação:** aproximadamente 2 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio.

**Clipe:** `video-forma-pedra`

**Na tela:** No "escolha uma cor em Preenchimento", escolher a cor e deixar o Contorno em Sem cor. No "Pegue a Caneta", marcar seis pontos ao redor da pedra. No "Para fechar, clique no primeiro ponto", fechar a forma. No "Olha só", apontar o interior colorido. O trabalho acontece na outra aba: mostrar cada gesto narrado, sem acelerar. No "volte a esta aba e clique em Próxima parte", voltar à aba da aula e clicar em **Próxima parte** [próxima parte].

**Fala para ElevenLabs:**

```text
[engaging, energetic, conversational voice] Agora desenhe a forma da sua pedra. Primeiro, escolha uma cor em Preenchimento e deixe o Contorno em Sem cor, como na experiência do começo desta aula.

[engaging, energetic, conversational voice] Pegue a Caneta e clique para marcar pontos ao redor da pedra, deixando espaço livre em cima. Seis pontos são um bom começo, e o formato é seu.

[engaging, energetic, conversational voice] Para fechar, clique no primeiro ponto. [interested, animated voice] Olha só: o interior ganha a cor que você escolheu, porque agora a forma está fechada.

[engaging, energetic, conversational voice] Depois confira se toda a pedra ficou dentro da área do desenho.

[engaging, energetic, conversational voice] Pause aqui e faça esta parte no seu desenho. Se o Pinta ainda não estiver aberto, clique em Abrir meu Pinta. Depois compare o seu desenho com a conferência que a gente acabou de fazer e espere aparecer Guardado na sua conta, porque é assim que o seu desenho fica guardado para a próxima parte. Quando aparecer, volte a esta aba e clique em Próxima parte.
```


**Recado na página (não gravar):** Agora feche a forma da sua pedra! Desenhe a pedra com a Caneta e termine no primeiro ponto. Quando aparecer Guardado na sua conta, volte a esta aba e clique em Próxima parte.

## Seção 4. Arredonde os pontos

### Clipe `video-curvas` · Arredonde os pontos

**Estimativa de gravação:** aproximadamente 2 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio.

**Clipe:** `video-curvas`

**Na tela:** No "Escolha Editar os pontos", escolher a ferramenta e clicar na pedra. No "Repare", apontar os pontos. No "clique em Ponto suave", selecionar um ponto e clicar no botão. No "Olha só", apontar as duas alças. No "Arraste uma alça devagar", arredondar um trecho. No "Depois afaste a imagem", afastar e mostrar a pedra inteira. O trabalho acontece na outra aba: mostrar cada gesto narrado, sem acelerar. No "volte a esta aba e clique em Próxima parte", voltar à aba da aula e clicar em **Próxima parte** [próxima parte].

**Fala para ElevenLabs:**

```text
[engaging, energetic, conversational voice] Agora arredonde a sua pedra. Escolha Editar os pontos e clique na pedra. [confident, clear, unhurried voice] Repare: aparecem os pontos que você marcou com a Caneta.

[engaging, energetic, conversational voice] Selecione um ponto da borda da pedra e clique em Ponto suave. O Ponto suave transforma esse canto numa curva.

[interested, animated voice] Olha só: aparecem duas bolinhas ligadas ao ponto por linhas. Essas bolinhas se chamam alças, e são elas que entortam a curva.

[confident, clear, unhurried voice] Arraste uma alça devagar para arredondar o trecho. Faça o mesmo nos cantos que você quiser suavizar.

[engaging, energetic, conversational voice] Depois afaste a imagem e confira a borda. A pedra pode ser irregular, mas precisa continuar fechada, inteira na área do desenho e com espaço em cima.

[engaging, energetic, conversational voice] Se uma curva criou uma ponta comprida, é porque a alça foi puxada demais. Ajuste a alça ou clique em Desfazer e tente uma mudança menor.

[engaging, energetic, conversational voice] Pause aqui e faça esta parte no seu desenho. Se o Pinta ainda não estiver aberto, clique em Abrir meu Pinta. Depois compare o seu desenho com a conferência que a gente acabou de fazer e espere aparecer Guardado na sua conta, porque é assim que o seu desenho fica guardado para a próxima parte. Quando aparecer, volte a esta aba e clique em Próxima parte.
```


**Recado na página (não gravar):** Agora arredonde os pontos da sua pedra! Transforme alguns cantos em curvas para dar forma a ela. Quando aparecer Guardado na sua conta, volte a esta aba e clique em Próxima parte.

## Seção 5. Acrescente crateras

### Clipe `video-crateras` · Acrescente crateras

**Estimativa de gravação:** aproximadamente 2 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio.

**Clipe:** `video-crateras`

**Na tela:** No "clique fora da pedra", tirar a seleção. No "Escolha um tom mais escuro e a ferramenta Círculo", escolher a cor e o Círculo. No "Arraste dentro da pedra", desenhar a cratera. No "Olha só", apontar a cratera por cima da pedra. No "use Ctrl+C e Ctrl+V", copiar e colar a cratera. No "arraste um canto da caixa", mudar o tamanho da cópia. O trabalho acontece na outra aba: mostrar cada gesto narrado, sem acelerar. No "volte a esta aba e clique em Próxima parte", voltar à aba da aula e clicar em **Próxima parte** [próxima parte].

**Fala para ElevenLabs:**

```text
[engaging, energetic, conversational voice] Agora faça crateras na sua pedra. Antes de escolher uma cor nova, clique fora da pedra para tirar a seleção, porque, com a pedra selecionada, a cor nova pintaria a pedra inteira.

[engaging, energetic, conversational voice] Escolha um tom mais escuro e a ferramenta Círculo. Arraste dentro da pedra para criar uma cratera.

[interested, animated voice] Olha só: a cratera aparece por cima da pedra, onde você desenhou.

[curious] Posso fazer uma cratera grande e outra pequena?

[engaging, energetic, conversational voice] Pode, sim. Os tamanhos são escolha sua. Para fazer outras, use Selecionar, clique na cratera e use Ctrl+C e Ctrl+V para copiar e colar.

[engaging, energetic, conversational voice] Leve a cópia para outro lugar dentro da pedra. Para mudar o tamanho dela, arraste um canto da caixa que aparece em volta. Se quiser, faça mais uma.

[engaging, energetic, conversational voice] Para conferir, veja se todas as crateras ficaram dentro do corpo, com tamanhos que dê para diferenciar.

[engaging, energetic, conversational voice] Pause aqui e faça esta parte no seu desenho. Se o Pinta ainda não estiver aberto, clique em Abrir meu Pinta. Depois compare o seu desenho com a conferência que a gente acabou de fazer e espere aparecer Guardado na sua conta, porque é assim que o seu desenho fica guardado para a próxima parte. Quando aparecer, volte a esta aba e clique em Próxima parte.
```

**Substituições na edição kids:**

| ID | Personagem | Ocorrência | Âncora anterior | Fala exata substituída | Âncora posterior | Tags |
| --- | --- | --- | --- | --- | --- | --- |
| video-crateras-K1 | Dedé | 1 | Arraste dentro da pedra para criar uma cratera. Olha só: a cratera aparece por cima da pedra, onde você desenhou. | Posso fazer uma cratera grande e outra pequena? | Pode, sim. Os tamanhos são escolha sua. Para fazer outras, use Selecionar, clique na cratera e use Ctrl+C e Ctrl+V para | [curious] |

No adulto, manter toda a fala da professora. No kids, silenciar apenas o trecho marcado e substituir pelo áudio do personagem, sem sobrepor vozes.

**Imagem nas substituições kids (não gravar):**

- `video-crateras-K1`: entrada — Concluir a primeira cratera e deixar a pedra e o círculo à vista. Saída — Copiar a cratera, mover e mudar o tamanho da cópia pelo canto da caixa.


**Recado na página (não gravar):** Agora acrescente crateras à sua pedra! Desenhe pequenas formas dentro dela. Quando aparecer Guardado na sua conta, volte a esta aba e clique em Próxima parte.

## Seção 6. Envie seu asteroide

### Clipe `video-entrega` · Envie seu asteroide

**Estimativa de gravação:** aproximadamente 2 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio.

**Clipe:** `video-entrega`

**Na tela:** No "confira no seu asteroide", mostrar o asteroide em Vetor com 64 por 64. No "espere aparecer Guardado na sua conta", mostrar o aviso no Pinta. No "clique em Escolher no Pinta", voltar à aba da aula e abrir a galeria. No "selecione o seu asteroide", marcar o asteroide. No "Depois clique em Enviar (1)", clicar e mostrar Recebido!. O trabalho acontece na outra aba: mostrar cada gesto narrado, sem acelerar. No "Por último, clique em Concluir aula", clicar em **Concluir aula**.

**Fala para ElevenLabs:**

```text
[engaging, energetic, conversational voice] Hora de enviar o seu asteroide! Antes, confira no seu asteroide: o asteroide é Vetor de 64 por 64, tem forma fechada, curvas e crateras dentro do corpo, e sobra espaço em cima para as chamas. Se alguma coisa estiver diferente, volte à parte em que ela foi feita e ajuste. Depois espere aparecer Guardado na sua conta no Pinta, porque a galeria da aula só mostra o que já está guardado na sua conta.

[engaging, energetic, conversational voice] Agora volte para a aba da aula e clique em Escolher no Pinta. Na janela Minhas criações do Pinta, selecione o seu asteroide. Se a sua criação não aparecer, confira se ela ficou guardada na sua conta e clique em Atualizar galeria.

[upbeat, encouraging voice] Se quiser, escreva uma mensagem no campo Recado. Depois clique em Enviar (1) e espere aparecer Recebido!

[engaging, energetic, conversational voice] Esse envio guarda uma cópia deste momento, e você continua criando no Pinta. Por último, clique em Concluir aula.
```


**Recado na página (não gravar):** Hora de enviar o seu asteroide! Confira se ele é Vetor de 64 por 64, com forma fechada e crateras dentro do corpo. Depois clique em Escolher no Pinta, selecione o asteroide e clique em Enviar (1). Quando aparecer Recebido!, clique em Concluir aula.
