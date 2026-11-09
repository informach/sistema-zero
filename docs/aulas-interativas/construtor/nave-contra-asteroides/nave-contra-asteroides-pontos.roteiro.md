# Roteiro de produção · Conte os acertos

**Produção:** a professora grava toda a fala principal. Na montagem kids, Dedé substitui somente os trechos da tabela, com a mesma frase e sem voz sobreposta. O master funciona sozinho no adulto. Notas e recados da página não são gravados. [Direção de voz e edição](../../../aulas-interativas-tecnico/DIRETRIZES-VOZ-ELEVENLABS.md).

## Seção 1. Guardar e mostrar um número

### Clipe `video-variavel` · Guardar e mostrar um número

**Estimativa de gravação:** aproximadamente 1 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Clipe:** `video-variavel`

**Na tela:** No "Sabe quando alguém vai contando os gols", mostrar por 2 a 3 segundos o meme ilustrado, desenho nosso com o Zappy ou os personagens do jogo, sem foto de pessoa real nem meme da internet e sem cobrir a experiência: o Zappy contando os gols nos dedos e, ao fundo, o placar do campo [na edição: meme dos gols contados de cabeça]. No "Agora você vai investigar", ampliar a experiência e mostrar a cena parada, sem tocar nos controles [ampliar experiência]. No "O Zappy vai te mostrando", mostrar o Zappy [apontar zappy]. No "Quando terminar, clique em Próxima parte", voltar ao tamanho da aula [voltar à aula] e clicar em **Próxima parte** [próxima parte]. Não apontar os controles da experiência, não fazer os testes pela criança nem mostrar o resultado de nenhuma comparação: a criança descobre na experiência. Não falar de blocos, áreas do Estúdio, regra nem código (decisões de 01/11 e 02/11/2026).

**Fala para ElevenLabs:**

```text
[engaging, energetic, conversational voice] Sabe quando alguém vai contando os gols de cabeça durante a partida? E tem também o placar, onde o número aparece para todo mundo.

[engaging, energetic, conversational voice] No seu jogo, o número guardado vai se chamar pontos. E os pontos também vão ter as duas coisas: o número que o jogo guarda e o número que aparece na tela.

[curious] E se o número não estiver na tela, ele continua mudando?

[engaging, energetic, conversational voice] O que você acha? Isso você vai testar na experiência.

[upbeat, encouraging voice] Agora você vai investigar a diferença entre o número que o jogo guarda e o número que aparece na tela, quando a nave acerta um asteroide. O Zappy vai te mostrando o que testar, e você pode repetir quando quiser. Quando terminar, clique em Próxima parte.
```

**Substituições na edição kids:**

| ID | Personagem | Ocorrência | Âncora anterior | Fala exata substituída | Âncora posterior | Tags |
| --- | --- | --- | --- | --- | --- | --- |
| video-variavel-K1 | Dedé | 1 | se chamar pontos. E os pontos também vão ter as duas coisas: o número que o jogo guarda e o número que aparece na tela. | E se o número não estiver na tela, ele continua mudando? | O que você acha? Isso você vai testar na experiência. Agora você vai investigar a diferença entre o número que o jogo | [curious] |

No adulto, manter toda a fala da professora. No kids, silenciar apenas o trecho marcado e substituir pelo áudio do personagem, sem sobrepor vozes.

**Imagem nas substituições kids (não gravar):**

- `video-variavel-K1`: entrada — Manter o meme dos gols contados de cabeça até o fim da frase da professora. Saída — Depois da saída, ampliar a experiência sem clicar em nada.


**Falas dentro da experiência:** `packages/core/src/learning/scene/guia-livre/variable.ts`, na tela `packages/member-shell/src/components/scene-livre/variable.tsx`. A orientação do Zappy sugere comparações pelo estado observado; os controles ficam livres e as descobertas contam em qualquer ordem.

**Recado na página (não gravar):** Sua vez! Investigue a diferença entre guardar um número e mostrar esse número na tela. O Zappy te mostra o que testar, e você pode repetir quando quiser. Quando terminar, clique em Próxima parte.

## Seção 2. Some um ponto a cada acerto

### Clipe `video-pontos-e-placar` · Some um ponto a cada acerto

**Estimativa de gravação:** aproximadamente 5 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Clipe:** `video-pontos-e-placar`

**Na tela:** A parte começa com o Estúdio expandido e o projeto da aula anterior [expandir estúdio]. No "clique na área do jogo e acerte uma pedra", clicar no jogo [tocar prévia 400 240] e atirar [tecla Space] até acertar uma pedra. No "Deixe à vista o fim de Ao iniciar", apontar o lugar [apontar abaixo de "Criar grupo de sprites"]. No "Agora abra Programação e depois Variáveis", abrir as categorias [categoria Programação > Variáveis] e encaixar o bloco no fim de Ao iniciar. No "Clique em contador, troque por pontos", trocar o nome [trocar "contador" por "pontos" em "Criar variável"]. No "É este bloco que cria a caixa pontos", apontar o bloco [apontar bloco "Criar variável"]. No "pegue o bloco Somar em variável e solte", encaixar o bloco [encaixar "Somar em variável" abaixo de "Tocar efeito"] e escolher pontos. No "Abra Jogo 2D, depois Vida e placar", abrir as categorias [categoria Jogo 2D > Vida e placar > Indicadores e texto na tela] e encaixar **Mostrar placar** logo depois da colisão. No "É este bloco que mostra um número na tela", apontar o placar [apontar bloco "Mostrar placar"]. No "Deixe à vista o 0 do campo valor do placar", abrir as categorias [categoria Programação > Valores], levar **valor da variável** com a mão até o 0 do placar, soltar e escolher pontos. No "É este bloco que lê o número guardado em pontos", apontar o valor da variável pontos dentro do placar. No "Agora teste: clique na área do jogo", clicar no jogo [tocar prévia 400 240] e atirar longe das pedras [tecla Space]. No "Depois, acerte uma pedra", atirar [tecla Space] até acertar e apontar o placar [apontar prévia 60 30]. No "Clique em Verificar projeto", verificar [verificar projeto]. No "clique em Enviar meu projeto", enviar e confirmar [enviar projeto]. No "Quando aparecer Projeto enviado!, clique em Concluir aula", voltar ao tamanho da aula [reduzir estúdio] e clicar em **Concluir aula** [concluir aula]. Ao terminar, clicar em Verificar projeto, mostrar Objetivo cumprido! e seguir o encaminhamento narrado.

**Fala para ElevenLabs:**

```text
[engaging, energetic, conversational voice] Aqui no seu jogo, clique na área do jogo e acerte uma pedra. Tá vendo? Nenhum ponto aparece, porque o jogo ainda não guarda nem mostra os acertos.

[engaging, energetic, conversational voice] Lembra da experiência da parte anterior? A caixa pontos guardava o número, e a tela só mostrava. Agora a gente vai contar os pontos no seu jogo!

[engaging, energetic, conversational voice] Uma caixa que guarda um número se chama variável. A variável pontos nasce uma vez, quando o jogo começa. Por isso, ela vai no fim de Ao iniciar.

[confident, clear, unhurried voice] Deixe à vista o fim de Ao iniciar, logo depois de Criar grupo de sprites asteroides.

[confident, clear, unhurried voice] Agora abra Programação e depois Variáveis, e pegue o bloco Criar variável com valor. Arraste e solte logo abaixo de Criar grupo de sprites asteroides.

[confident, clear, unhurried voice] Repare: o nome chega como contador. Clique em contador, troque por pontos e clique fora do campo.

[engaging, energetic, conversational voice] O valor já vem em 0: deixe assim, porque cada partida começa sem pontos.

[engaging, energetic, conversational voice] É este bloco que cria a caixa pontos, guardando 0.

[curious] Onde eu coloco o bloco que soma?

[engaging, energetic, conversational voice] O ponto só pode ser somado quando um tiro acerta uma pedra. Por isso, a soma vai dentro da colisão entre tiros e asteroides, no fim, logo depois de Tocar efeito explosão.

[engaging, energetic, conversational voice] Deixe esse lugar à vista. Ainda em Programação e Variáveis, pegue o bloco Somar em variável e solte logo depois de Tocar efeito explosão, dentro da colisão.

[engaging, energetic, conversational voice] Escolha pontos. O número já vem em 1: deixe assim, porque cada acerto vale um ponto.

[engaging, energetic, conversational voice] É este bloco que muda o número guardado em pontos, a cada acerto.

[engaging, energetic, conversational voice] Agora o placar. Ele precisa aparecer em todo quadro, e não só no acerto. Por isso, ele fica fora da colisão, logo depois dela, ainda dentro de A cada quadro do jogo.

[confident, clear, unhurried voice] Deixe à vista o encaixe logo depois do bloco inteiro da colisão. Abra Jogo 2D, depois Vida e placar e depois Indicadores e texto na tela, pegue o bloco Mostrar placar e solte nesse encaixe.

[engaging, energetic, conversational voice] É este bloco que mostra um número na tela, para quem joga.

[engaging, energetic, conversational voice] O texto já vem Pontos:, que é o que aparece antes do número: deixe assim.

[engaging, energetic, conversational voice] O número do placar precisa ler o que está guardado em pontos, e não mostrar sempre o mesmo número.

[confident, clear, unhurried voice] Deixe à vista o 0 do campo valor do placar. Abra Programação e depois Valores, pegue o bloco valor da variável, solte em cima do 0 e escolha pontos.

[engaging, energetic, conversational voice] É este bloco que lê o número guardado em pontos. Agora o placar mostra esse número.

[engaging, energetic, conversational voice] O placar já vem em x 12, y 30 e tamanho 24: deixe assim. Escolha a cor branca, para aparecer no fundo escuro.

[upbeat, encouraging voice] Agora teste: clique na área do jogo e deixe um tiro passar sem acertar. [confident, clear, unhurried voice] Repare: o placar fica igual, porque nenhum tiro acertou.

[engaging, energetic, conversational voice] Depois, acerte uma pedra. [interested, animated voice] Olha só: Pontos vai para 1! E, se você acertar outra, o placar soma mais 1.

[reassuring, encouraging voice] Se algo não funcionou no seu jogo, volte aos blocos e confira se ficou assim: no fim de Ao iniciar está Criar variável pontos com valor 0. Dentro da colisão entre tiros e asteroides, depois de Tocar efeito explosão, está Somar 1 em variável pontos. E, logo depois da colisão, ainda dentro de A cada quadro do jogo, está Mostrar placar Pontos:, com o valor da variável pontos, em x 12, y 30 e tamanho 24. [reassuring, encouraging voice] Depois de corrigir, teste de novo.

[engaging, energetic, conversational voice] Funcionou? Clique em Verificar projeto. Se faltar alguma coisa, corrija os blocos e clique novamente. Quando aparecer Objetivo cumprido!, clique em Enviar meu projeto e confirme em Enviar. Quando aparecer Projeto enviado!, clique em Concluir aula.
```

**Substituições na edição kids:**

| ID | Personagem | Ocorrência | Âncora anterior | Fala exata substituída | Âncora posterior | Tags |
| --- | --- | --- | --- | --- | --- | --- |
| video-pontos-e-placar-K1 | Dedé | 1 | já vem em 0: deixe assim, porque cada partida começa sem pontos. É este bloco que cria a caixa pontos, guardando 0. | Onde eu coloco o bloco que soma? | O ponto só pode ser somado quando um tiro acerta uma pedra. Por isso, a soma vai dentro da colisão entre tiros e | [curious] |

No adulto, manter toda a fala da professora. No kids, silenciar apenas o trecho marcado e substituir pelo áudio do personagem, sem sobrepor vozes.

**Imagem nas substituições kids (não gravar):**

- `video-pontos-e-placar-K1`: entrada — Manter à vista Criar variável pontos com valor 0, em Ao iniciar. Saída — Depois da saída, mostrar o fim da colisão entre tiros e asteroides.


**Recado na página (não gravar):** Agora faça o seu jogo contar os pontos! Crie pontos, some 1 no acerto e mostre o placar. Depois, teste, clique em Verificar projeto e envie o seu projeto. Por último, clique em Concluir aula.
