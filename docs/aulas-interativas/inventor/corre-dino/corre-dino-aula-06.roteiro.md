# Roteiro de produção · Retire os cactos que saíram

**Produção:** a professora grava toda a fala principal. Na montagem kids, Dedé substitui somente os trechos da tabela, com a mesma frase e sem voz sobreposta. O master funciona sozinho no adulto. Notas e recados da página não são gravados. [Direção de voz e edição](../../../aulas-interativas-tecnico/DIRETRIZES-VOZ-ELEVENLABS.md).

## Seção 1. Para onde vai o cacto que sai da tela?

### Clipe `video-visivel-guardado` · Para onde vai o cacto que sai da tela?

**Estimativa de gravação:** aproximadamente 1 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Clipe:** `video-visivel-guardado`

**Na tela:** No "Sabe quando uma bola cai no quintal", mostrar por 2 a 3 segundos o meme ilustrado, desenho nosso com o Zappy ou os personagens do jogo, sem foto de pessoa real nem meme da internet e sem cobrir a experiência: a bola passando por cima do muro do vizinho, com o Dino olhando [na edição: meme da bola no quintal]. No "No seu jogo", ampliar a experiência [ampliar experiência] e mostrar a cena parada, com o tempo parado. Não apontar nem clicar nos controles da experiência. No "O Zappy ajuda", mostrar o Zappy [apontar zappy]. No "Quando terminar, clique em Próxima parte", voltar ao tamanho da aula [voltar à aula] e clicar em **Próxima parte** [próxima parte]. Não fazer os testes pela criança nem mostrar o resultado de nenhuma comparação: a criança descobre na experiência. Não falar de blocos, áreas do Estúdio, regra nem código (decisões de 01/11 e 02/11/2026).

**Fala para ElevenLabs:**

```text
[engaging, energetic, conversational voice] Um jogo pode guardar várias coisas parecidas juntas, numa lista que ele move em todo quadro. Essa lista se chama grupo.

[engaging, energetic, conversational voice] Sabe quando uma bola cai no quintal do vizinho? Você não vê mais a bola.

[engaging, energetic, conversational voice] No seu jogo, os cactos ficam num grupo, guardado nos bastidores. Quando um cacto passa da borda da esquerda, ele some da tela.

[curious] E quando o cacto some da tela, ele sai do grupo também?

[engaging, energetic, conversational voice] O que você acha? Isso você vai testar na experiência.

[upbeat, encouraging voice] Agora você vai investigar o que acontece com o grupo de cactos quando o jogo tira quem sai da tela e quando não tira. Você escolhe por onde começar e pode repetir os testes. O Zappy ajuda a observar as diferenças. Quando terminar, clique em Próxima parte.
```

**Substituições na edição kids:**

| ID | Personagem | Ocorrência | Âncora anterior | Fala exata substituída | Âncora posterior | Tags |
| --- | --- | --- | --- | --- | --- | --- |
| video-visivel-guardado-K1 | Dedé | 1 | jogo, os cactos ficam num grupo, guardado nos bastidores. Quando um cacto passa da borda da esquerda, ele some da tela. | E quando o cacto some da tela, ele sai do grupo também? | O que você acha? Isso você vai testar na experiência. Agora você vai investigar o que acontece com o grupo de cactos | [curious] |

No adulto, manter toda a fala da professora. No kids, silenciar apenas o trecho marcado e substituir pelo áudio do personagem, sem sobrepor vozes.

**Imagem nas substituições kids (não gravar):**

- `video-visivel-guardado-K1`: entrada — Manter a experiência ampliada e parada até a professora terminar a frase. Saída — Depois da saída, seguir com a experiência parada, sem clicar em nada.


**Falas dentro da experiência:** `packages/core/src/learning/scene/guia-livre/dino/espelhos.ts`, na tela `packages/member-shell/src/components/scene-livre/dino/cleanup.tsx`. A orientação do Zappy sugere comparações pelo estado observado; os controles ficam livres e as descobertas contam em qualquer ordem.

**Recado na página (não gravar):** Sua vez! Investigue o que acontece com o cacto que passa da borda da tela. Você escolhe a ordem dos testes, e o Zappy sugere o que observar. Quando terminar, clique em Próxima parte.

## Seção 2. Retire do grupo quem já saiu

### Clipe `video-faxina` · Retire do grupo quem já saiu

**Estimativa de gravação:** aproximadamente 3 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Clipe:** `video-faxina`

**Na tela:** Mostrar o projeto no estado de entrada. Na abertura não há teste no jogo, porque o efeito desta parte ainda não aparece: a fala só lembra a experiência e anuncia a montagem. Em cada “Olha aqui”, “Olha só” ou “Repare”, apontar na tela o lugar, o bloco ou o resultado citado. Localizar cada destino antes de buscar a peça. Mostrar campos, encaixes e testes sem cortes. Ao terminar, clicar em Verificar projeto, mostrar Objetivo cumprido! e seguir o encaminhamento narrado (Próxima parte).

**Fala para ElevenLabs:**

```text
[engaging, energetic, conversational voice] Lembra da experiência da parte anterior? Os cactos que saíam da tela continuavam guardados no grupo. Agora a gente vai tirar esses cactos de lá!

[curious] E onde isso entra no jogo?

[engaging, energetic, conversational voice] O jogo confere os cactos em todo quadro, depois que eles andaram e foram desenhados. Por isso, o bloco vai no fim de A cada quadro do jogo, logo depois de Desenhar o grupo cactos.

[confident, clear, unhurried voice] Deixe à vista o fim de A cada quadro do jogo, logo depois de Desenhar o grupo cactos.

[confident, clear, unhurried voice] Agora abra Jogo 2D, depois Grupos e depois Participação e limpeza, pegue o bloco Tirar do grupo quem sair da tela e solte depois do desenho dos cactos.

[engaging, energetic, conversational voice] É este bloco que tira do grupo cada cacto que passa da borda.

[confident, clear, unhurried voice] Repare: o grupo chega como asteroides. Clique em asteroides e escolha cactos.

[engaging, energetic, conversational voice] No fim do bloco, em chamado, vem escrito sprite. Clique em sprite e escreva cacto: é o nome que o bloco dá a cada cacto que ele confere.

[engaging, energetic, conversational voice] E deixe vazio o espaço fazer, na linha de baixo do bloco.

[confident, clear, unhurried voice] Confira se ficou assim: o relógio continua em 1.4 segundo, e Tirar do grupo quem sair da tela está no fim de A cada quadro do jogo, depois do desenho dos cactos. Limpar a tela continua no começo do quadro, porque ela cuida da imagem, e este bloco cuida dos cactos guardados no grupo.

[engaging, energetic, conversational voice] Agora espere alguns cactos atravessarem a tela. Os que chegam pela direita têm que continuar entrando normalmente. A diferença no grupo não aparece no seu jogo, porque ela acontece por dentro, e quem confere esse bloco é a verificação.

[engaging, energetic, conversational voice] Funcionou? Clique em Verificar projeto. Se faltar alguma coisa, corrija os blocos e clique novamente. Quando aparecer Objetivo cumprido!, clique em Próxima parte.
```

**Substituições na edição kids:**

| ID | Personagem | Ocorrência | Âncora anterior | Fala exata substituída | Âncora posterior | Tags |
| --- | --- | --- | --- | --- | --- | --- |
| video-faxina-K1 | Dedé | 1 | parte anterior? Os cactos que saíam da tela continuavam guardados no grupo. Agora a gente vai tirar esses cactos de lá! | E onde isso entra no jogo? | O jogo confere os cactos em todo quadro, depois que eles andaram e foram desenhados. Por isso, o bloco vai no fim de A | [curious] |

No adulto, manter toda a fala da professora. No kids, silenciar apenas o trecho marcado e substituir pelo áudio do personagem, sem sobrepor vozes.

**Imagem nas substituições kids (não gravar):**

- `video-faxina-K1`: entrada — Retomar a experiência com o projeto aberto, sem pegar blocos ainda. Saída — Localizar o fim do quadro, depois do desenho dos cactos, encaixar Tirar do grupo quem sair da tela, escolher cactos e trocar sprite por cacto.


**Recado na página (não gravar):** Agora tire do grupo os cactos que já saíram! Coloque Tirar do grupo quem sair da tela depois do desenho dos cactos e mantenha o relógio em 1.4. Depois, clique em Verificar projeto e, em seguida, em Próxima parte.

## Seção 3. Confira o que você construiu

**Recado na página (não gravar):** Hora de lembrar o que você construiu! As perguntas falam do som do pulo e dos cactos. Depois de clicar em Responder!, leia as explicações: se alguma resposta não estiver certa, é só clicar em Tentar de novo! e responder outra vez. Quando acertar todas, clique em Próxima parte.

Sem vídeo ou ferramenta nesta parte. O quiz vem imediatamente depois do Zappy. Leia a explicação após enviar; tentativas ilimitadas, sem espera.

## Seção 4. Teste e envie seu jogo

### Clipe `video-entrega` · Teste e envie seu jogo

**Estimativa de gravação:** aproximadamente 1 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Clipe:** `video-entrega`

**Na tela:** Mostrar o projeto no estado de entrada. Localizar cada destino antes de buscar a peça. Mostrar campos, encaixes e testes sem cortes. Ao terminar, clicar em Verificar projeto, mostrar Objetivo cumprido! e seguir o encaminhamento narrado (Enviar meu projeto, Enviar, Projeto enviado! e Concluir aula).

**Fala para ElevenLabs:**

```text
[engaging, energetic, conversational voice] Agora a sua corrida tira do grupo os cactos que já saíram! Antes de enviar o seu projeto, espere novos cactos entrarem e passarem pela tela. Eles têm que continuar vindo no mesmo ritmo.

[confident, clear, unhurried voice] Confira o nome cactos na regra que tira do grupo e o relógio em 1.4 segundo. Se um cacto bater no Dino, você pode seguir o teste, porque o jogo ainda não tem a regra da derrota.

[engaging, energetic, conversational voice] Funcionou? Clique em Verificar projeto. Se faltar alguma coisa, corrija os blocos e clique novamente. Quando aparecer Objetivo cumprido!, clique em Enviar meu projeto e confirme em Enviar. Quando aparecer Projeto enviado!, clique em Concluir aula.
```


**Recado na página (não gravar):** Hora de testar e enviar o seu jogo! Espere novos cactos passarem, clique em Verificar projeto e depois em Enviar meu projeto. Confirme em Enviar e, quando o envio terminar, clique em Concluir aula.
