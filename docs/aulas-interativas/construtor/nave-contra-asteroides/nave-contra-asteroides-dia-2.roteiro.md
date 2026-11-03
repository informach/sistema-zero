# Roteiro de produção · Faça a nave atirar

**Produção:** a professora grava toda a fala principal. Na montagem kids, Debinha substitui somente os trechos da tabela, com a mesma frase e sem voz sobreposta. O master funciona sozinho no adulto. Notas e recados da página não são gravados. [Direção de voz e edição](../../../aulas-interativas-tecnico/DIRETRIZES-VOZ-ELEVENLABS.md).

## Seção 1. Quando sai o tiro?

### Clipe `video-tecla-e-repeticao` · Quando sai o tiro?

**Estimativa de gravação:** aproximadamente 1 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Clipe:** `video-tecla-e-repeticao`

**Na tela:** No "Sabe a campainha de casa", mostrar por 2 a 3 segundos o meme ilustrado, desenho nosso com o Zappy ou os personagens do jogo, sem foto de pessoa real nem meme da internet e sem cobrir a experiência: o Zappy tocando a campainha de uma casa e a nave abrindo a porta [na edição: meme da campainha]. No "Agora você vai investigar", ampliar a experiência e mostrar a cena parada, sem tocar nos controles [ampliar experiência]. No "O Zappy ajuda", mostrar o Zappy [apontar zappy]. No "Quando terminar, clique em Próxima parte", voltar ao tamanho da aula [voltar à aula] e clicar em **Próxima parte** [próxima parte]. Não apontar os controles da experiência, não fazer os testes pela criança nem mostrar o resultado de nenhuma comparação: a criança descobre na experiência. Não falar de blocos, áreas do Estúdio, regra nem código (decisões de 01/11 e 02/11/2026).

**Fala para ElevenLabs:**

```text
[engaging, energetic, conversational voice] Sabe a campainha de casa? Ela não toca sem parar, nem toca uma vez só por dia. Ela toca na hora em que alguém chega e encosta o dedo no botão.

[engaging, energetic, conversational voice] No seu jogo, você já viu dois jeitos de o jogo fazer as coisas: uma vez, no começo, e sempre, em todo quadro. Agora tem um terceiro jeito: na hora em que algo acontece, como alguém tocar numa tecla.

[curious] E se o tiro sair sempre, em todo quadro?

[engaging, energetic, conversational voice] O que você acha? Isso você vai testar na experiência.

[upbeat, encouraging voice] Agora você vai investigar em que momento o tiro sai em cada um dos três jeitos. Você escolhe por onde começar e pode repetir os testes. O Zappy ajuda a observar as diferenças. Quando terminar, clique em Próxima parte.
```

**Substituições na edição kids:**

| ID | Personagem | Ocorrência | Âncora anterior | Fala exata substituída | Âncora posterior | Tags |
| --- | --- | --- | --- | --- | --- | --- |
| video-tecla-e-repeticao-K1 | Debinha | 1 | e sempre, em todo quadro. Agora tem um terceiro jeito: na hora em que algo acontece, como alguém tocar numa tecla. | E se o tiro sair sempre, em todo quadro? | O que você acha? Isso você vai testar na experiência. Agora você vai investigar em que momento o tiro sai em cada um | [curious] |

No adulto, manter toda a fala da professora. No kids, silenciar apenas o trecho marcado e substituir pelo áudio do personagem, sem sobrepor vozes.

**Imagem nas substituições kids (não gravar):**

- `video-tecla-e-repeticao-K1`: entrada — Manter o meme da campainha até o fim da frase da professora. Saída — Depois da saída, ampliar a experiência sem escolher nenhum jeito.


**Falas dentro da experiência:** `packages/core/src/learning/scene/guia-livre/once-vs-always.ts`, na tela `packages/member-shell/src/components/scene-livre/once-vs-always.tsx`. A orientação do Zappy sugere comparações pelo estado observado; os controles ficam livres e as descobertas contam em qualquer ordem.

**Recado na página (não gravar):** Sua vez! Investigue em que momento o tiro sai em cada jeito. Você escolhe a ordem dos testes, e o Zappy sugere o que observar. Quando terminar, clique em Próxima parte.

## Seção 2. Faça a barra de espaço disparar

### Clipe `video-criar-tiro` · Faça a barra de espaço disparar

**Estimativa de gravação:** aproximadamente 3 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Clipe:** `video-criar-tiro`

**Na tela:** A parte começa com o Estúdio expandido e o projeto da aula anterior [expandir estúdio]. No "clique na área do jogo e toque na barra de espaço", clicar no jogo [tocar prévia 400 240] e tocar na barra de espaço [tecla Space]. No "deixe à vista um lugar vazio do espaço dos blocos", arrastar um espaço vazio entre os blocos até aparecer um lugar livre. No "Agora abra Áreas do projeto", abrir a categoria [categoria Áreas do projeto], levar **Quando acontecer** até o lugar vazio e soltar. No "É esta área que espera", apontar a área [apontar bloco "Quando acontecer"]. No "Abra Jogo 2D, depois Controles", abrir as categorias [categoria Jogo 2D > Controles > Teclado, ações e toque]. No "Arraste para dentro de Quando acontecer", encaixar o bloco [encaixar "Quando apertar a tecla" em "Quando acontecer"]. No "No menu da tecla, escolha barra de espaço", trocar a tecla [trocar "seta para cima" por "barra de espaço" em "Quando apertar a tecla"]. No "É este bloco que espera a barra de espaço", apontar o bloco [apontar bloco "Quando apertar a tecla"]. No "Agora abra Jogo 2D, depois Som", abrir as categorias [categoria Jogo 2D > Som > Efeitos prontos]. No "pegue o bloco Tocar efeito e solte", encaixar o bloco [encaixar "Tocar efeito" em "Quando apertar a tecla"]. No "No menu, escolha tiro grande", escolher o efeito [abrir campo "pulo" em "Tocar efeito"] [escolher "tiro grande" em "Tocar efeito"]. No "Agora teste: clique na área do jogo", clicar no jogo [tocar prévia 400 240] e, no "toque na barra de espaço", tocar na barra de espaço [tecla Space], deixando o som ser ouvido sem fala por cima. No "Clique em Verificar projeto", verificar [verificar projeto]. No "Quando aparecer Objetivo cumprido!, clique em Próxima parte", voltar ao tamanho da aula [reduzir estúdio] e clicar em **Próxima parte** [próxima parte]. Conferir no Estúdio a tecla e o efeito que os blocos trazem antes de gravar e ajustar as tags de troca se forem outros. Ao terminar, clicar em Verificar projeto, mostrar Objetivo cumprido! e seguir o encaminhamento narrado.

**Fala para ElevenLabs:**

```text
[engaging, energetic, conversational voice] Aqui no seu jogo, clique na área do jogo e toque na barra de espaço. Tá vendo? Nada acontece, porque o jogo ainda não espera essa tecla.

[engaging, energetic, conversational voice] Lembra da experiência da parte anterior? Com a tecla tocada, saía um tiro na hora. Agora a gente vai fazer o seu jogo esperar a barra de espaço!

[engaging, energetic, conversational voice] Tocar numa tecla é um evento, que é algo que acontece no jogo. O que fica dentro de um evento só funciona na hora em que ele acontece.

[engaging, energetic, conversational voice] Os eventos ficam numa área própria, Quando acontecer, que o seu projeto ainda não tem.

[engaging, energetic, conversational voice] Para criar essa área, deixe à vista um lugar vazio do espaço dos blocos. Se não tiver nenhum à vista, é só arrastar um espaço vazio entre os blocos até aparecer um.

[confident, clear, unhurried voice] Agora abra Áreas do projeto, pegue Quando acontecer e solte nesse lugar.

[engaging, energetic, conversational voice] É esta área que espera as coisas acontecerem, como uma tecla tocada.

[confident, clear, unhurried voice] Deixe à vista o espaço de dentro de Quando acontecer. Abra Jogo 2D, depois Controles e depois Teclado, ações e toque, e pegue o bloco Quando apertar a tecla. Arraste para dentro de Quando acontecer e solte quando aparecer o encaixe.

[confident, clear, unhurried voice] No menu da tecla, escolha barra de espaço.

[engaging, energetic, conversational voice] É este bloco que espera a barra de espaço: o que ficar dentro dele acontece na hora em que alguém toca nessa tecla.

[engaging, energetic, conversational voice] Por enquanto, a tecla vai fazer só o som do tiro.

[confident, clear, unhurried voice] Deixe à vista o espaço vazio dentro de Quando apertar a tecla.

[confident, clear, unhurried voice] Agora abra Jogo 2D, depois Som e depois Efeitos prontos, pegue o bloco Tocar efeito e solte dentro de Quando apertar a tecla.

[confident, clear, unhurried voice] No menu, escolha tiro grande.

[upbeat, encouraging voice] Agora teste: clique na área do jogo e toque na barra de espaço. Escute: o som do tiro toca na hora em que você toca na tecla!

[reassuring, encouraging voice] Se algo não funcionou no seu jogo, volte aos blocos e confira se ficou assim: em Quando acontecer está Quando apertar a tecla barra de espaço, e dentro dele está Tocar efeito tiro grande. [reassuring, encouraging voice] Depois de corrigir, teste de novo.

[engaging, energetic, conversational voice] O tiro que sai da nave vem daqui a três partes, depois de mais duas experiências.

[engaging, energetic, conversational voice] Funcionou? Clique em Verificar projeto. Se faltar alguma coisa, corrija os blocos e clique novamente. Quando aparecer Objetivo cumprido!, clique em Próxima parte.
```


**Recado na página (não gravar):** Agora faça a barra de espaço disparar! Crie a área Quando acontecer, coloque a tecla barra de espaço com o som do tiro e clique em Verificar projeto. Depois, clique em Próxima parte.

## Seção 3. Onde o tiro nasce?

### Clipe `video-escrito-e-lido` · Onde o tiro nasce?

**Estimativa de gravação:** aproximadamente 1 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Clipe:** `video-escrito-e-lido`

**Na tela:** No "Tem dois jeitos de dizer onde você está", mostrar por 2 a 3 segundos o meme ilustrado, desenho nosso com o Zappy ou os personagens do jogo, sem foto de pessoa real nem meme da internet e sem cobrir a experiência: o Zappy escrevendo num papelzinho e, ao lado, o Zappy respondendo a um amigo que pergunta onde ele está [na edição: meme do papelzinho e da resposta na hora]. No "Agora você vai investigar", ampliar a experiência e mostrar a cena parada, sem tocar nos controles [ampliar experiência]. No "O Zappy ajuda", mostrar o Zappy [apontar zappy]. No "Quando terminar, clique em Próxima parte", voltar ao tamanho da aula [voltar à aula] e clicar em **Próxima parte** [próxima parte]. Não apontar os controles da experiência, não fazer os testes pela criança nem mostrar o resultado de nenhuma comparação: a criança descobre na experiência. Não falar de blocos, áreas do Estúdio, regra nem código (decisões de 01/11 e 02/11/2026).

**Fala para ElevenLabs:**

```text
[engaging, energetic, conversational voice] Tem dois jeitos de dizer onde você está: escrever num papelzinho ou responder na hora em que alguém pergunta.

[engaging, energetic, conversational voice] O tiro do seu jogo precisa de um número que diga onde ele nasce. Ele também pode ter um número escrito uma vez ou um número lido da nave na hora do tiro.

[curious] E se a nave mudar de lugar, o tiro vai junto?

[engaging, energetic, conversational voice] O que você acha? Isso você vai testar na experiência.

[upbeat, encouraging voice] Agora você vai investigar onde o tiro nasce quando a nave muda de lugar, com o número escrito e com o número lido da nave. Você escolhe por onde começar e pode repetir os testes. O Zappy ajuda a observar as diferenças. Quando terminar, clique em Próxima parte.
```

**Substituições na edição kids:**

| ID | Personagem | Ocorrência | Âncora anterior | Fala exata substituída | Âncora posterior | Tags |
| --- | --- | --- | --- | --- | --- | --- |
| video-escrito-e-lido-K1 | Debinha | 1 | que diga onde ele nasce. Ele também pode ter um número escrito uma vez ou um número lido da nave na hora do tiro. | E se a nave mudar de lugar, o tiro vai junto? | O que você acha? Isso você vai testar na experiência. Agora você vai investigar onde o tiro nasce quando a nave muda de | [curious] |

No adulto, manter toda a fala da professora. No kids, silenciar apenas o trecho marcado e substituir pelo áudio do personagem, sem sobrepor vozes.

**Imagem nas substituições kids (não gravar):**

- `video-escrito-e-lido-K1`: entrada — Manter o meme do papelzinho até o fim da frase da professora. Saída — Depois da saída, ampliar a experiência sem atirar.


**Falas dentro da experiência:** `packages/core/src/learning/scene/guia-livre/fixed-vs-read.ts`, na tela `packages/member-shell/src/components/scene-livre/fixed-vs-read.tsx`. A orientação do Zappy sugere comparações pelo estado observado; os controles ficam livres e as descobertas contam em qualquer ordem.

**Recado na página (não gravar):** Sua vez! Investigue onde o tiro nasce quando a nave muda de lugar. Você escolhe a ordem dos testes, e o Zappy sugere o que observar. Quando terminar, clique em Próxima parte.

## Seção 4. Para que lado o tiro anda?

### Clipe `video-direcao-do-tiro` · Para que lado o tiro anda?

**Estimativa de gravação:** aproximadamente 1 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Clipe:** `video-direcao-do-tiro`

**Na tela:** No "Sabe quando você atravessa a sala", mostrar por 2 a 3 segundos o meme ilustrado, desenho nosso com o Zappy ou os personagens do jogo, sem foto de pessoa real nem meme da internet e sem cobrir a experiência: o Zappy atravessando a sala em passos marcados no chão [na edição: meme dos passos]. No "Agora você vai investigar", ampliar a experiência e mostrar a cena parada, sem tocar nos controles [ampliar experiência]. No "O Zappy ajuda", mostrar o Zappy [apontar zappy]. No "Quando terminar, clique em Próxima parte", voltar ao tamanho da aula [voltar à aula] e clicar em **Próxima parte** [próxima parte]. Não apontar os controles da experiência, não fazer os testes pela criança nem mostrar o resultado de nenhuma comparação: a criança descobre na experiência. Não falar de blocos, áreas do Estúdio, regra nem código (decisões de 01/11 e 02/11/2026).

**Fala para ElevenLabs:**

```text
[engaging, energetic, conversational voice] Sabe quando você atravessa a sala contando passos? Cada passo tem um tamanho e vai para um lado.

[engaging, energetic, conversational voice] No seu jogo, a velocidade do tiro é assim: ela diz quanto o tiro anda em cada quadro, e para que lado. E a velocidade pode ser um número positivo ou um número negativo, com o sinal de menos.

[curious] E com um número negativo, o tiro vai para onde?

[engaging, energetic, conversational voice] O que você acha? Isso você vai testar na experiência.

[upbeat, encouraging voice] Agora você vai investigar para que lado o tiro anda, e o que acontece com o y, com um número positivo e com um número negativo. Você escolhe por onde começar e pode repetir os testes. O Zappy ajuda a observar as diferenças. Quando terminar, clique em Próxima parte.
```

**Substituições na edição kids:**

| ID | Personagem | Ocorrência | Âncora anterior | Fala exata substituída | Âncora posterior | Tags |
| --- | --- | --- | --- | --- | --- | --- |
| video-direcao-do-tiro-K1 | Debinha | 1 | cada quadro, e para que lado. E a velocidade pode ser um número positivo ou um número negativo, com o sinal de menos. | E com um número negativo, o tiro vai para onde? | O que você acha? Isso você vai testar na experiência. Agora você vai investigar para que lado o tiro anda, e o que | [curious] |

No adulto, manter toda a fala da professora. No kids, silenciar apenas o trecho marcado e substituir pelo áudio do personagem, sem sobrepor vozes.

**Imagem nas substituições kids (não gravar):**

- `video-direcao-do-tiro-K1`: entrada — Manter o meme dos passos até o fim da frase da professora. Saída — Depois da saída, ampliar a experiência com o tiro parado.


**Falas dentro da experiência:** `packages/core/src/learning/scene/guia-livre/velocity.ts`, na tela `packages/member-shell/src/components/scene-livre/velocity.tsx`. A orientação do Zappy sugere comparações pelo estado observado; os controles ficam livres e as descobertas contam em qualquer ordem.

**Recado na página (não gravar):** Sua vez! Investigue o que o número da velocidade faz com o tiro e com o y. Você escolhe a ordem dos testes, e o Zappy sugere o que observar. Quando terminar, clique em Próxima parte.

## Seção 5. Faça o tiro nascer na nave

### Clipe `video-tiro-da-nave` · Faça o tiro nascer na nave

**Estimativa de gravação:** aproximadamente 5 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Clipe:** `video-tiro-da-nave`

**Na tela:** A parte começa com o Estúdio expandido e o projeto da parte anterior [expandir estúdio]. No "Deixe à vista o fim de Ao iniciar", apontar o lugar [apontar abaixo de "Criar nave"]. No "Agora abra Jogo 2D, depois Grupos", abrir as categorias [categoria Jogo 2D > Grupos > Criar e percorrer]. No "Arraste e solte logo abaixo de Criar nave", encaixar o bloco [encaixar "Criar grupo de sprites" abaixo de "Criar nave"]. No "Clique em asteroides, troque por tiros", trocar o nome [trocar "asteroides" por "tiros" em "Criar grupo de sprites"]. No "Deixe à vista o bloco Quando apertar a tecla", arrastar até o bloco aparecer [arrastar até "Quando apertar a tecla"]. No "Abra Jogo 2D, depois Grupos e depois Criar e percorrer, e pegue o bloco Criar tiro", abrir a categoria se ela tiver fechado. No "Arraste e solte no começo de Quando apertar a tecla", encaixar o bloco no começo, acima do som [encaixar "Criar tiro no grupo" em "Quando apertar a tecla"]. No "É este bloco que cria um tiro novo", apontar o bloco [apontar bloco "Criar tiro no grupo"]. No "Deixe à vista o 100 do campo x do tiro", abrir as categorias [categoria Jogo 2D > Movimento > Posição e tamanho], levar **o centro x do sprite** com a mão e soltar em cima do 100 do x. No "Nesse bloco, escolha nave", trocar o nome do sprite para nave. No "Deixe à vista o 100 do campo y do tiro", levar **a posição y do sprite** com a mão e soltar em cima do 100 do y, e escolher nave. No "Agora clique no -4 do vy", trocar o número [trocar "-4" por "-9" em "Criar tiro no grupo"]. No "Clique em Verificar projeto", verificar [verificar projeto]. No "Quando aparecer Objetivo cumprido!, clique em Próxima parte", voltar ao tamanho da aula [reduzir estúdio] e clicar em **Próxima parte** [próxima parte]. Ao terminar, clicar em Verificar projeto, mostrar Objetivo cumprido! e seguir o encaminhamento narrado.

**Fala para ElevenLabs:**

```text
[engaging, energetic, conversational voice] Lembra das duas experiências antes desta parte? Com o número lido da nave, o tiro nascia onde ela estava, e com a velocidade negativa ele subia. Agora a gente vai criar o tiro do seu jogo!

[engaging, energetic, conversational voice] Como vão ser muitos tiros, eles ficam juntos num grupo, que é a lista de tiros que o jogo guarda e move de uma vez. O grupo é criado uma vez só, quando o jogo começa. Por isso, ele vai no fim de Ao iniciar.

[confident, clear, unhurried voice] Deixe à vista o fim de Ao iniciar, logo depois de Criar nave.

[confident, clear, unhurried voice] Agora abra Jogo 2D, depois Grupos e depois Criar e percorrer, e pegue o bloco Criar grupo de sprites. Arraste e solte logo abaixo de Criar nave.

[confident, clear, unhurried voice] Repare: o nome chega como asteroides, mas este grupo é o dos tiros. Clique em asteroides, troque por tiros e clique fora do campo.

[engaging, energetic, conversational voice] É este bloco que cria a lista dos tiros, ainda vazia.

[engaging, energetic, conversational voice] O tiro nasce na hora em que alguém toca na barra de espaço. Por isso, ele vai dentro do evento da tecla, logo acima de Tocar efeito.

[confident, clear, unhurried voice] Deixe à vista o bloco Quando apertar a tecla barra de espaço, em Quando acontecer.

[confident, clear, unhurried voice] Abra Jogo 2D, depois Grupos e depois Criar e percorrer, e pegue o bloco Criar tiro no grupo. Arraste e solte no começo de Quando apertar a tecla, logo acima de Tocar efeito, quando aparecer o encaixe.

[engaging, energetic, conversational voice] É este bloco que cria um tiro novo no grupo, cada vez que a tecla é tocada.

[confident, clear, unhurried voice] Repare: o grupo já vem tiros, e o raio já vem em 5, que é o tamanho do tiro. Deixe os dois assim e, se quiser, escolha uma cor que apareça bem no fundo escuro.

[engaging, energetic, conversational voice] Agora o lugar onde o tiro nasce. Na experiência, o número escrito deixava o tiro sempre no mesmo lugar, e o número lido da nave fazia o tiro nascer onde ela estava. Por isso, o x e o y do tiro vão ler o lugar da nave.

[confident, clear, unhurried voice] Deixe à vista o 100 do campo x do tiro. Abra Jogo 2D, depois Movimento e depois Posição e tamanho, pegue o bloco o centro x do sprite e solte em cima do 100. Ele toma o lugar do número.

[engaging, energetic, conversational voice] Nesse bloco, escolha nave. É este bloco que lê, na hora do tiro, o meio da nave, de um lado ao outro.

[curious] E a altura de onde sai o tiro?

[engaging, energetic, conversational voice] O y também vai ler a nave. Deixe à vista o 100 do campo y do tiro. Na mesma categoria Posição e tamanho, pegue o bloco a posição y do sprite, solte em cima do 100 e escolha nave também.

[engaging, energetic, conversational voice] É este bloco que lê a altura da nave na hora do tiro.

[engaging, energetic, conversational voice] Falta a direção. O vx é a velocidade para os lados, e o vy, a velocidade para baixo, como na experiência.

[engaging, energetic, conversational voice] O vx já vem em 0: deixe assim, para o tiro não ir para os lados.

[confident, clear, unhurried voice] Agora clique no -4 do vy, troque por -9, com o sinal de menos, e clique fora do campo. Com o número negativo, o tiro sobe.

[confident, clear, unhurried voice] Confira se ficou assim: no fim de Ao iniciar está Criar grupo de sprites tiros. Em Quando acontecer, dentro de Quando apertar a tecla barra de espaço, vem primeiro Criar tiro no grupo tiros, com o centro x e a posição y da nave, raio 5, vx 0 e vy -9, e logo abaixo vem Tocar efeito tiro grande.

[engaging, energetic, conversational voice] O tiro ainda não aparece na tela, porque o jogo ainda não move nem desenha o grupo tiros. Isso vem na próxima parte.

[engaging, energetic, conversational voice] Funcionou? Clique em Verificar projeto. Se faltar alguma coisa, corrija os blocos e clique novamente. Quando aparecer Objetivo cumprido!, clique em Próxima parte.
```

**Substituições na edição kids:**

| ID | Personagem | Ocorrência | Âncora anterior | Fala exata substituída | Âncora posterior | Tags |
| --- | --- | --- | --- | --- | --- | --- |
| video-tiro-da-nave-K1 | Debinha | 1 | lugar do número. Nesse bloco, escolha nave. É este bloco que lê, na hora do tiro, o meio da nave, de um lado ao outro. | E a altura de onde sai o tiro? | O y também vai ler a nave. Deixe à vista o 100 do campo y do tiro. Na mesma categoria Posição e tamanho, pegue o bloco | [curious] |

No adulto, manter toda a fala da professora. No kids, silenciar apenas o trecho marcado e substituir pelo áudio do personagem, sem sobrepor vozes.

**Imagem nas substituições kids (não gravar):**

- `video-tiro-da-nave-K1`: entrada — Manter à vista o bloco o centro x do sprite nave, encaixado no x do tiro. Saída — Depois da saída, apontar o 100 do campo y do tiro.


**Recado na página (não gravar):** Agora faça o tiro nascer na nave! Crie o grupo tiros e o tiro na barra de espaço, lendo o lugar da nave, e clique em Verificar projeto. Depois, clique em Próxima parte.

## Seção 6. Mova e desenhe os tiros

### Clipe `video-tiros-voam` · Mova e desenhe os tiros

**Estimativa de gravação:** aproximadamente 3 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Clipe:** `video-tiros-voam`

**Na tela:** A parte começa com o Estúdio expandido e o projeto da parte anterior [expandir estúdio]. No "clique na área do jogo e toque na barra de espaço", clicar no jogo [tocar prévia 400 240] e tocar na barra de espaço [tecla Space]. No "Deixe à vista o fim de A cada quadro do jogo", apontar o lugar [apontar abaixo de "Desenhar o sprite"]. No "Agora abra Jogo 2D, depois Grupos e depois Movimento", abrir as categorias [categoria Jogo 2D > Grupos > Movimento]. No "Arraste e solte logo depois de Desenhar o sprite nave", encaixar o bloco [encaixar "Mover os sprites do grupo" abaixo de "Desenhar o sprite"]. No "Nesse bloco, escolha tiros", escolher o grupo tiros no bloco. No "É este bloco que faz cada tiro andar", apontar o bloco [apontar bloco "Mover os sprites do grupo"]. No "Abra Jogo 2D, depois Grupos e depois Desenho e ordem", abrir as categorias [categoria Jogo 2D > Grupos > Desenho e ordem] e, no "pegue o bloco Desenhar o grupo", encaixar o bloco [encaixar "Desenhar o grupo" abaixo de "Mover os sprites do grupo"]. No "Escolha tiros nesse bloco também", escolher o grupo tiros. No "Agora teste: clique na área do jogo", clicar no jogo [tocar prévia 400 240] e tocar na barra de espaço [tecla Space]. No "Agora mova a nave para outro lugar", segurar uma seta do teclado por um instante e tocar de novo na barra de espaço [tecla Space]. No "Clique em Verificar projeto", verificar [verificar projeto]. No "Quando aparecer Objetivo cumprido!, clique em Próxima parte", voltar ao tamanho da aula [reduzir estúdio] e clicar em **Próxima parte** [próxima parte]. Ao terminar, clicar em Verificar projeto, mostrar Objetivo cumprido! e seguir o encaminhamento narrado.

**Fala para ElevenLabs:**

```text
[engaging, energetic, conversational voice] Aqui no seu jogo, clique na área do jogo e toque na barra de espaço. Tá vendo? O som toca, mas nenhum tiro aparece, porque o jogo ainda não move nem desenha o grupo tiros. Agora a gente vai fazer esses tiros aparecerem e subirem!

[engaging, energetic, conversational voice] Os tiros andam e aparecem em todo quadro. Por isso, os dois blocos que cuidam deles, Mover os sprites do grupo e Desenhar o grupo, vão no fim de A cada quadro do jogo, depois do desenho da nave.

[confident, clear, unhurried voice] Deixe à vista o fim de A cada quadro do jogo, logo depois de Desenhar o sprite nave.

[confident, clear, unhurried voice] Agora abra Jogo 2D, depois Grupos e depois Movimento, e pegue o bloco Mover os sprites do grupo usando suas velocidades. Arraste e solte logo depois de Desenhar o sprite nave.

[engaging, energetic, conversational voice] Nesse bloco, escolha tiros.

[engaging, energetic, conversational voice] É este bloco que faz cada tiro andar, em todo quadro, com a velocidade que ele recebeu ao nascer.

[confident, clear, unhurried voice] Deixe à vista o encaixe logo abaixo do movimento dos tiros. Abra Jogo 2D, depois Grupos e depois Desenho e ordem, pegue o bloco Desenhar o grupo e solte nesse encaixe.

[engaging, energetic, conversational voice] Escolha tiros nesse bloco também.

[engaging, energetic, conversational voice] É este bloco que desenha todos os tiros do grupo na tela.

[upbeat, encouraging voice] Agora teste: clique na área do jogo e toque na barra de espaço. [interested, animated voice] Olha só: o tiro sai da nave e sobe!

[engaging, energetic, conversational voice] Agora mova a nave para outro lugar e atire de novo. [confident, clear, unhurried voice] Repare: o tiro nasce na nave outra vez, porque o jogo lê o lugar dela a cada disparo.

[reassuring, encouraging voice] Se algo não funcionou no seu jogo, volte aos blocos e confira se ficou assim: no fim de A cada quadro do jogo, depois de Desenhar o sprite nave, estão Mover os sprites do grupo tiros e, logo abaixo, Desenhar o grupo tiros. E, no disparo da barra de espaço, o tiro nasce no grupo tiros, com vy -9. [reassuring, encouraging voice] Depois de corrigir, teste de novo.

[engaging, energetic, conversational voice] Funcionou? Clique em Verificar projeto. Se faltar alguma coisa, corrija os blocos e clique novamente. Quando aparecer Objetivo cumprido!, clique em Próxima parte.
```


**Recado na página (não gravar):** Agora faça os tiros voarem! Mova e desenhe o grupo tiros em cada quadro, atire de dois lugares e clique em Verificar projeto. Depois, clique em Próxima parte.

## Seção 7. O tiro saiu da tela. E do jogo?

### Clipe `video-tiro-fora-da-tela` · O tiro saiu da tela. E do jogo?

**Estimativa de gravação:** aproximadamente 1 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Clipe:** `video-tiro-fora-da-tela`

**Na tela:** No "Sabe quando uma bola cai no quintal", mostrar por 2 a 3 segundos o meme ilustrado, desenho nosso com o Zappy ou os personagens do jogo, sem foto de pessoa real nem meme da internet e sem cobrir a experiência: a bola passando por cima do muro do vizinho [na edição: meme da bola no quintal]. No "Agora você vai investigar", ampliar a experiência e mostrar a cena parada, sem tocar nos controles [ampliar experiência]. No "O Zappy ajuda", mostrar o Zappy [apontar zappy]. No "Quando terminar, clique em Próxima parte", voltar ao tamanho da aula [voltar à aula] e clicar em **Próxima parte** [próxima parte]. Não apontar os controles da experiência, não fazer os testes pela criança nem mostrar o resultado de nenhuma comparação: a criança descobre na experiência. Não falar de blocos, áreas do Estúdio, regra nem código (decisões de 01/11 e 02/11/2026).

**Fala para ElevenLabs:**

```text
[engaging, energetic, conversational voice] Sabe quando uma bola cai no quintal do vizinho? Você não vê mais a bola.

[engaging, energetic, conversational voice] No seu jogo, os tiros ficam num grupo, que é a lista de tiros que o jogo guarda e move em todo quadro. Quando um tiro passa da borda de cima, ele some da tela.

[curious] E quando o tiro some da tela, ele sai do grupo também?

[engaging, energetic, conversational voice] O que você acha? Isso você vai testar na experiência.

[upbeat, encouraging voice] Agora você vai investigar o grupo de tiros quando o jogo tira do grupo quem sai da tela e quando não tira. Você escolhe por onde começar e pode repetir os testes. O Zappy ajuda a observar as diferenças. Quando terminar, clique em Próxima parte.
```

**Substituições na edição kids:**

| ID | Personagem | Ocorrência | Âncora anterior | Fala exata substituída | Âncora posterior | Tags |
| --- | --- | --- | --- | --- | --- | --- |
| video-tiro-fora-da-tela-K1 | Debinha | 1 | é a lista de tiros que o jogo guarda e move em todo quadro. Quando um tiro passa da borda de cima, ele some da tela. | E quando o tiro some da tela, ele sai do grupo também? | O que você acha? Isso você vai testar na experiência. Agora você vai investigar o grupo de tiros quando o jogo tira do | [curious] |

No adulto, manter toda a fala da professora. No kids, silenciar apenas o trecho marcado e substituir pelo áudio do personagem, sem sobrepor vozes.

**Imagem nas substituições kids (não gravar):**

- `video-tiro-fora-da-tela-K1`: entrada — Manter o meme da bola no quintal até o fim da frase da professora. Saída — Depois da saída, ampliar a experiência com o tempo parado.


**Falas dentro da experiência:** `packages/core/src/learning/scene/guia-livre/cleanup.ts`, na tela `packages/member-shell/src/components/scene-livre/cleanup.tsx`. A orientação do Zappy sugere comparações pelo estado observado; os controles ficam livres e as descobertas contam em qualquer ordem.

**Recado na página (não gravar):** Sua vez! Investigue o que acontece com o tiro que passa da borda da tela. Você escolhe a ordem dos testes, e o Zappy sugere o que observar. Quando terminar, clique em Próxima parte.

## Seção 8. Retire os tiros que saíram

### Clipe `video-faxina` · Retire os tiros que saíram

**Estimativa de gravação:** aproximadamente 3 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Clipe:** `video-faxina`

**Na tela:** A parte começa com o Estúdio expandido e o projeto da parte anterior [expandir estúdio], sem jogar: a retomada só lembra a experiência. No "Deixe à vista o espaço entre esses dois blocos", apontar o lugar [apontar abaixo de "Mover os sprites do grupo"]. No "Agora abra Jogo 2D, depois Grupos e depois Participação e limpeza", abrir as categorias [categoria Jogo 2D > Grupos > Participação e limpeza]. No "Arraste e solte logo abaixo de Mover os sprites do grupo tiros", encaixar o bloco [encaixar "Tirar do grupo quem sair da tela" abaixo de "Mover os sprites do grupo"]. No "No grupo, escolha tiros", escolher o grupo tiros no bloco. No "É este bloco que tira do grupo", apontar o bloco [apontar bloco "Tirar do grupo quem sair da tela"]. No "Agora teste: clique na área do jogo", clicar no jogo [tocar prévia 400 240], tocar na barra de espaço [tecla Space], segurar uma seta por um instante e atirar de novo [tecla Space]. No "Clique em Verificar projeto", verificar [verificar projeto]. No "clique em Enviar meu projeto", enviar e confirmar [enviar projeto]. No "Quando aparecer Projeto enviado!, clique em Concluir aula", voltar ao tamanho da aula [reduzir estúdio] e clicar em **Concluir aula** [concluir aula]. Ao terminar, clicar em Verificar projeto, mostrar Objetivo cumprido! e seguir o encaminhamento narrado.

**Fala para ElevenLabs:**

```text
[engaging, energetic, conversational voice] Lembra da experiência da parte anterior? O tiro sumia da tela, mas continuava no grupo, e o grupo só crescia. No seu jogo isso não aparece na tela, mas está acontecendo. Agora a gente vai fazer o seu jogo tirar esses tiros do grupo!

[engaging, energetic, conversational voice] A limpeza acontece em todo quadro, depois que os tiros andam e antes de eles serem desenhados. Por isso, ela vai entre Mover os sprites do grupo tiros e Desenhar o grupo tiros.

[confident, clear, unhurried voice] Deixe à vista o espaço entre esses dois blocos, dentro de A cada quadro do jogo.

[confident, clear, unhurried voice] Agora abra Jogo 2D, depois Grupos e depois Participação e limpeza, e pegue o bloco Tirar do grupo quem sair da tela. Arraste e solte logo abaixo de Mover os sprites do grupo tiros, quando aparecer o encaixe.

[curious] Qual grupo eu escolho aqui?

[engaging, energetic, conversational voice] O grupo de quem sai da tela: os tiros. No grupo, escolha tiros. [confident, clear, unhurried voice] Repare que o bloco também tem a palavra chamado, seguida de sprite: deixe assim. E deixe vazio o encaixe de fazer, na linha de baixo do bloco.

[engaging, energetic, conversational voice] É este bloco que tira do grupo cada tiro que passa da borda da tela.

[confident, clear, unhurried voice] Confira se ficou assim: dentro de A cada quadro do jogo, a sequência dos tiros é Mover os sprites do grupo tiros, Tirar do grupo tiros quem sair da tela e Desenhar o grupo tiros, nessa ordem.

[upbeat, encouraging voice] Agora teste: clique na área do jogo, atire algumas vezes, mude a nave de lugar e atire de novo. Os tiros têm que nascer na nave e subir, como antes. A limpeza não aparece na tela: quem mostra que ela está lá é a ordem dos blocos que você acabou de conferir.

[engaging, energetic, conversational voice] Funcionou? Clique em Verificar projeto. Se faltar alguma coisa, corrija os blocos e clique novamente. Quando aparecer Objetivo cumprido!, clique em Enviar meu projeto e confirme em Enviar. Quando aparecer Projeto enviado!, clique em Concluir aula.
```

**Substituições na edição kids:**

| ID | Personagem | Ocorrência | Âncora anterior | Fala exata substituída | Âncora posterior | Tags |
| --- | --- | --- | --- | --- | --- | --- |
| video-faxina-K1 | Debinha | 1 | do grupo quem sair da tela. Arraste e solte logo abaixo de Mover os sprites do grupo tiros, quando aparecer o encaixe. | Qual grupo eu escolho aqui? | O grupo de quem sai da tela: os tiros. No grupo, escolha tiros. Repare que o bloco também tem a palavra chamado, | [curious] |

No adulto, manter toda a fala da professora. No kids, silenciar apenas o trecho marcado e substituir pelo áudio do personagem, sem sobrepor vozes.

**Imagem nas substituições kids (não gravar):**

- `video-faxina-K1`: entrada — Manter à vista o bloco de limpeza recém-encaixado. Saída — Depois da saída, escolher tiros no grupo do bloco.


**Recado na página (não gravar):** Agora limpe o grupo dos tiros! Coloque a limpeza entre mover e desenhar os tiros, teste os disparos, clique em Verificar projeto e envie o seu projeto. Depois, clique em Concluir aula.
