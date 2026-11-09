# Roteiro de produção · Mova a nave pelo espaço

**Produção:** a professora grava toda a fala principal. Na montagem kids, Dedé substitui somente os trechos da tabela, com a mesma frase e sem voz sobreposta. O master funciona sozinho no adulto. Notas e recados da página não são gravados. [Direção de voz e edição](../../../aulas-interativas-tecnico/DIRETRIZES-VOZ-ELEVENLABS.md).

## Seção 1. A nave em câmera lenta

### Clipe `video-seta-e-velocidade` · A nave em câmera lenta

**Estimativa de gravação:** aproximadamente 1 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Clipe:** `video-seta-e-velocidade`

**Na tela:** Do "Lembra do desenho animado" até o "ela dá só um passinho", a tela fica parada, e a edição troca esse trecho pelo desenho da nave em três quadros seguidos, um passinho em cada [na edição: a nave em três quadros, um passinho em cada]. No "Para saber quando a nave tem que andar", ampliar a experiência e mostrar a cena parada, sem tocar nos controles [ampliar experiência]. No "O Zappy vai te mostrando", mostrar o Zappy [apontar zappy]. No "Quando terminar, clique em Próxima parte", voltar ao tamanho da aula [voltar à aula] e clicar em **Próxima parte** [próxima parte]. Não dizer o que a nave faz com a seta segurada nem com a seta solta. A comparação dos tamanhos de passinho fica na experiência da parte seguinte, O tamanho do passinho. Não apontar os controles da experiência, não fazer os testes pela criança nem mostrar o resultado de nenhuma comparação: a criança descobre na experiência. Não falar de blocos, áreas do Estúdio, regra nem código (decisões de 01/11 e 02/11/2026).

**Fala para ElevenLabs:**

```text
[engaging, energetic, conversational voice] Lembra do desenho animado, com um quadro atrás do outro? Quando a nave anda, ela também não pula de uma vez de um lado da tela para o outro: em cada quadro, ela dá só um passinho.

[engaging, energetic, conversational voice] Para saber quando a nave tem que andar, o jogo olha a seta em cada quadro, antes de mexer a nave.

[curious] E o que a nave faz num quadro em que a seta está solta?

[engaging, energetic, conversational voice] O que você acha? Isso você vai testar na experiência.

[upbeat, encouraging voice] Agora você vai investigar o que a nave faz em cada quadro com a seta segurada e com a seta solta. O Zappy vai te mostrando o que testar, e você pode repetir quando quiser. Quando terminar, clique em Próxima parte.
```

**Substituições na edição kids:**

| ID | Personagem | Ocorrência | Âncora anterior | Fala exata substituída | Âncora posterior | Tags |
| --- | --- | --- | --- | --- | --- | --- |
| video-seta-e-velocidade-K1 | Dedé | 1 | dá só um passinho. Para saber quando a nave tem que andar, o jogo olha a seta em cada quadro, antes de mexer a nave. | E o que a nave faz num quadro em que a seta está solta? | O que você acha? Isso você vai testar na experiência. Agora você vai investigar o que a nave faz em cada quadro com a | [curious] |

No adulto, manter toda a fala da professora. No kids, silenciar apenas o trecho marcado e substituir pelo áudio do personagem, sem sobrepor vozes.

**Imagem nas substituições kids (não gravar):**

- `video-seta-e-velocidade-K1`: entrada — Manter a experiência parada, com o selo da seta à vista. Saída — Depois da saída, continuar com a experiência parada, sem rodar quadros.


**Falas dentro da experiência:** `packages/core/src/learning/scene/discovery-guidance.ts`, na tela `packages/member-shell/src/components/scene-walk-camera-lenta.tsx`. A orientação do Zappy sugere comparações pelo estado observado; os controles ficam livres e as descobertas contam em qualquer ordem.

**Recado na página (não gravar):** Sua vez! Investigue o que a nave faz em cada quadro, e o que a seta tem a ver com isso. O Zappy te mostra o que testar, e você pode repetir quando quiser. Quando terminar, clique em Próxima parte.

## Seção 2. O tamanho do passinho

### Clipe `video-tamanho-do-passinho` · O tamanho do passinho

**Estimativa de gravação:** aproximadamente 1 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Clipe:** `video-tamanho-do-passinho`

**Na tela:** No "Pense em você andando", a tela fica parada, e a edição mostra por 2 a 3 segundos o desenho ilustrado, desenho nosso com o Zappy, sem foto de pessoa real nem meme da internet e sem cobrir a experiência: o Zappy ao lado de uma pegada de formiga e de uma pegada de gigante, soltas, sem fileira [na edição: pegadas de formiga e de gigante]. No "Agora você vai investigar", ampliar a experiência e mostrar a cena parada, sem tocar nos controles [ampliar experiência]. No "O Zappy vai te mostrando", mostrar o Zappy [apontar zappy]. No "Quando terminar, clique em Próxima parte", voltar ao tamanho da aula [voltar à aula] e clicar em **Próxima parte** [próxima parte]. Não dizer o que muda com o passinho grande nem com o pequeno. Não apontar os controles da experiência, não fazer os testes pela criança nem mostrar o resultado de nenhuma comparação: a criança descobre na experiência. Não falar de blocos, áreas do Estúdio, regra, código nem do número da velocidade (decisões de 01/11 e 02/11/2026).

**Fala para ElevenLabs:**

```text
[engaging, energetic, conversational voice] Pense em você andando: dá para dar passinhos de formiga ou passos de gigante. Em cada passo você anda um pouco, e o tamanho de cada passo é você quem escolhe.

[engaging, energetic, conversational voice] No jogo é igual: em cada quadro, a nave dá um passinho, e esse passinho pode ser pequeno ou grande.

[engaging, energetic, conversational voice] E o que muda quando o passinho fica maior? O que você acha? Isso você vai testar na experiência.

[upbeat, encouraging voice] Agora você vai investigar o que muda no caminho da nave quando o passinho é pequeno e quando ele é grande. O Zappy vai te mostrando o que testar, e você pode repetir quando quiser. Quando terminar, clique em Próxima parte.
```


**Falas dentro da experiência:** `packages/core/src/learning/scene/discovery-guidance.ts`, na tela `packages/member-shell/src/components/scene-walk-passinho.tsx`. A orientação do Zappy sugere comparações pelo estado observado; os controles ficam livres e as descobertas contam em qualquer ordem.

**Recado na página (não gravar):** Sua vez! Investigue o que muda quando a nave dá um passinho pequeno ou um passinho grande em cada quadro. O Zappy te mostra o que testar, e você pode repetir quando quiser. Quando terminar, clique em Próxima parte.

## Seção 3. Faça a nave responder às setas

### Clipe `video-setas-e-rastro` · Faça a nave responder às setas

**Estimativa de gravação:** aproximadamente 4 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Clipe:** `video-setas-e-rastro`

**Na tela:** A parte começa com o Estúdio expandido e o projeto da aula anterior [expandir estúdio]. No "clique na área do jogo e segure uma seta", clicar no jogo [tocar prévia 400 240] e segurar a seta da direita do teclado por um instante. No "Tá vendo? A nave fica parada", manter a nave parada à vista. No "Deixe à vista o começo de A cada quadro do jogo", arrastar até o bloco aparecer [arrastar até "A cada quadro do jogo"]. No "Agora abra Jogo 2D, depois Movimento", abrir as categorias [categoria Jogo 2D > Movimento > Movimentos prontos]. No "Arraste e solte no começo de A cada quadro do jogo", encaixar o bloco no começo [encaixar "Mover o sprite com as setas" em "A cada quadro do jogo"]. No "É este bloco que dá o passinho", apontar o bloco [apontar bloco "Mover o sprite com as setas"]. No "é este número que diz", apontar o número da velocidade, sem trocar [apontar bloco "Mover o sprite com as setas"]. No "clique no 6", trocar o número [trocar "6" por "7" em "Mover o sprite com as setas"]. No "Agora teste: clique na área do jogo", clicar no jogo [tocar prévia 400 240] e segurar a seta da direita por um instante, sem chegar à beirada. Não refazer a comparação de duas velocidades: ela é da experiência anterior. No "fica um rastro de naves", apontar o rastro [apontar prévia 400 410]. No "Clique em Verificar projeto", verificar [verificar projeto]. No "Quando aparecer Objetivo cumprido!, clique em Próxima parte", voltar ao tamanho da aula [reduzir estúdio] e clicar em **Próxima parte** [próxima parte]. Ao terminar, clicar em Verificar projeto, mostrar Objetivo cumprido! e seguir o encaminhamento narrado.

**Fala para ElevenLabs:**

```text
[engaging, energetic, conversational voice] Aqui no seu jogo, clique na área do jogo e segure uma seta. Tá vendo? A nave fica parada, porque o jogo ainda não olha a seta.

[engaging, energetic, conversational voice] Lembra da primeira experiência desta aula? Com a seta segurada, a nave dava um passinho em cada quadro. Agora a gente vai pôr esse passinho no seu jogo!

[engaging, energetic, conversational voice] Como o jogo olha a seta em todo quadro, o passinho vai dentro de A cada quadro do jogo. E ele vem antes do desenho, para o desenho já mostrar a nave no lugar novo.

[confident, clear, unhurried voice] Deixe à vista o começo de A cada quadro do jogo, logo acima de Desenhar o sprite nave.

[confident, clear, unhurried voice] Agora abra Jogo 2D, depois Movimento e depois Movimentos prontos, e pegue o bloco Mover o sprite com as setas, que tem as setas para a esquerda e para a direita. Arraste e solte no começo de A cada quadro do jogo, logo acima de Desenhar o sprite, quando aparecer o encaixe.

[engaging, energetic, conversational voice] É este bloco que dá o passinho: em cada quadro, ele olha qual seta você está segurando e leva a nave para aquele lado.

[confident, clear, unhurried voice] Repare: o nome do sprite já vem nave, por isso deixe assim.

[curious] E qual velocidade eu uso?

[engaging, energetic, conversational voice] Você escolhe! Lembra da experiência da parte anterior, do tamanho do passinho? Aqui, o tamanho do passinho se chama velocidade: é este número que diz quanto a nave anda em cada quadro.

[engaging, energetic, conversational voice] Escolha a velocidade da sua nave: clique no 6, troque pelo número que você quiser e clique fora do campo. Aqui, eu troco por 7.

[upbeat, encouraging voice] Agora teste: clique na área do jogo e segure uma seta por um instante. [interested, animated voice] Olha só: em cada quadro, a nave dá o passinho que você escolheu!

[confident, clear, unhurried voice] Repare: fica um rastro de naves, porque o jogo desenha a nave no lugar novo e ainda não apaga o desenho de antes. Isso fica para a próxima parte.

[reassuring, encouraging voice] Se algo não funcionou no seu jogo, volte aos blocos e confira se ficou assim: dentro de A cada quadro do jogo, primeiro vem Mover o sprite nave com as setas, com uma velocidade maior que zero, e logo abaixo vem Desenhar o sprite nave. E clique na área do jogo antes de segurar a seta, porque é assim que o jogo recebe as teclas. [reassuring, encouraging voice] Depois de corrigir, teste de novo.

[engaging, energetic, conversational voice] Funcionou? Clique em Verificar projeto. Se faltar alguma coisa, corrija os blocos e clique novamente. Quando aparecer Objetivo cumprido!, clique em Próxima parte.
```

**Substituições na edição kids:**

| ID | Personagem | Ocorrência | Âncora anterior | Fala exata substituída | Âncora posterior | Tags |
| --- | --- | --- | --- | --- | --- | --- |
| video-setas-e-rastro-K1 | Dedé | 1 | seta você está segurando e leva a nave para aquele lado. Repare: o nome do sprite já vem nave, por isso deixe assim. | E qual velocidade eu uso? | Você escolhe! Lembra da experiência da parte anterior, do tamanho do passinho? Aqui, o tamanho do passinho se chama | [curious] |

No adulto, manter toda a fala da professora. No kids, silenciar apenas o trecho marcado e substituir pelo áudio do personagem, sem sobrepor vozes.

**Imagem nas substituições kids (não gravar):**

- `video-setas-e-rastro-K1`: entrada — Manter à vista o bloco de movimento recém-encaixado. Saída — Depois da saída, apontar o número da velocidade antes de trocá-lo.


**Recado na página (não gravar):** Agora faça a sua nave andar! Coloque o movimento antes do desenho da nave, escolha o tamanho do passinho dela e clique em Verificar projeto. Depois, clique em Próxima parte.

## Seção 4. Tire o rastro da nave

### Clipe `video-limpeza` · Tire o rastro da nave

**Estimativa de gravação:** aproximadamente 3 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Clipe:** `video-limpeza`

**Na tela:** A parte começa com o Estúdio expandido e o projeto da parte anterior [expandir estúdio]. No "clique na área do jogo e segure uma seta", clicar no jogo [tocar prévia 400 240] e segurar a seta da direita por um instante. No "Tá vendo? Fica um rastro", apontar o rastro [apontar prévia 400 410]. No "Deixe à vista o começo de A cada quadro do jogo", arrastar até o bloco aparecer [arrastar até "A cada quadro do jogo"]. No "Agora abra Jogo 2D, depois Desenho e efeitos", abrir as categorias [categoria Jogo 2D > Desenho e efeitos > Efeitos]. No "Arraste e solte no começo de A cada quadro do jogo", encaixar o bloco no começo [encaixar "Limpar a tela" em "A cada quadro do jogo"]. No "É este bloco que apaga a tela", apontar o bloco [apontar bloco "Limpar a tela"]. No "Agora clique na área do jogo e segure a mesma seta", clicar no jogo [tocar prévia 400 240] e segurar a seta da direita. No "Clique em Verificar projeto", verificar [verificar projeto]. No "Quando aparecer Objetivo cumprido!, clique em Próxima parte", voltar ao tamanho da aula [reduzir estúdio] e clicar em **Próxima parte** [próxima parte]. Ao terminar, clicar em Verificar projeto, mostrar Objetivo cumprido! e seguir o encaminhamento narrado.

**Fala para ElevenLabs:**

```text
[engaging, energetic, conversational voice] Aqui no seu jogo, clique na área do jogo e segure uma seta. Tá vendo? Fica um rastro de naves, porque nada apaga o desenho de antes.

[engaging, energetic, conversational voice] Lembra da experiência do desenho, na primeira aula? Apagando a tela antes de desenhar, sobrava uma nave só. Agora a gente vai apagar a tela do seu jogo!

[curious] Isso vai apagar a minha nave?

[engaging, energetic, conversational voice] Só o desenho de antes. A nave continua no jogo e é desenhada de novo, no lugar novo. A tela precisa ser apagada no começo de cada quadro, antes de tudo ser desenhado de novo. Por isso, o bloco Limpar a tela vai no primeiro encaixe de A cada quadro do jogo.

[confident, clear, unhurried voice] Deixe à vista o começo de A cada quadro do jogo, logo acima do bloco de movimento.

[confident, clear, unhurried voice] Agora abra Jogo 2D, depois Desenho e efeitos e depois Efeitos, e pegue o bloco Limpar a tela. Arraste e solte no começo de A cada quadro do jogo, logo acima do movimento, quando aparecer o encaixe.

[engaging, energetic, conversational voice] É este bloco que apaga a tela antes de cada desenho novo.

[confident, clear, unhurried voice] Agora clique na área do jogo e segure a mesma seta. [interested, animated voice] Olha só: aparece uma nave só, andando, porque a tela é apagada antes de cada desenho!

[reassuring, encouraging voice] Se algo não funcionou no seu jogo, volte aos blocos e confira se ficou assim: dentro de A cada quadro do jogo estão Limpar a tela, Mover o sprite nave com as setas e Desenhar o sprite nave, nessa ordem. [reassuring, encouraging voice] Depois de corrigir, teste de novo.

[engaging, energetic, conversational voice] Funcionou? Clique em Verificar projeto. Se faltar alguma coisa, corrija os blocos e clique novamente. Quando aparecer Objetivo cumprido!, clique em Próxima parte.
```

**Substituições na edição kids:**

| ID | Personagem | Ocorrência | Âncora anterior | Fala exata substituída | Âncora posterior | Tags |
| --- | --- | --- | --- | --- | --- | --- |
| video-limpeza-K1 | Dedé | 1 | na primeira aula? Apagando a tela antes de desenhar, sobrava uma nave só. Agora a gente vai apagar a tela do seu jogo! | Isso vai apagar a minha nave? | Só o desenho de antes. A nave continua no jogo e é desenhada de novo, no lugar novo. A tela precisa ser apagada no | [curious] |

No adulto, manter toda a fala da professora. No kids, silenciar apenas o trecho marcado e substituir pelo áudio do personagem, sem sobrepor vozes.

**Imagem nas substituições kids (não gravar):**

- `video-limpeza-K1`: entrada — Manter o rastro de naves à vista na prévia. Saída — Depois da saída, mostrar o começo de A cada quadro do jogo.


**Recado na página (não gravar):** Agora tire o rastro da nave! Coloque Limpar a tela no começo de A cada quadro do jogo, teste a seta de novo e clique em Verificar projeto. Depois, clique em Próxima parte.

## Seção 5. A beirada da tela

### Clipe `video-limite-da-tela` · A beirada da tela

**Estimativa de gravação:** aproximadamente 1 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Clipe:** `video-limite-da-tela`

**Na tela:** No "Sabe quando você olha por uma janela", mostrar por 2 a 3 segundos o meme ilustrado, desenho nosso com o Zappy ou os personagens do jogo, sem foto de pessoa real nem meme da internet e sem cobrir a experiência: o Zappy olhando por uma janela para o céu, sem a nave [na edição: meme da janela]. No "Agora você vai investigar", ampliar a experiência e mostrar a cena parada, sem tocar nos controles [ampliar experiência]. No "O Zappy vai te mostrando", mostrar o Zappy [apontar zappy]. No "Quando terminar, clique em Próxima parte", voltar ao tamanho da aula [voltar à aula] e clicar em **Próxima parte** [próxima parte]. Não responder a pergunta do Dedé nem mostrar o que acontece com a nave na beirada. Não apontar os controles da experiência, não fazer os testes pela criança nem mostrar o resultado de nenhuma comparação: a criança descobre na experiência. Não falar de blocos, áreas do Estúdio, regra nem código (decisões de 01/11 e 02/11/2026).

**Fala para ElevenLabs:**

```text
[engaging, energetic, conversational voice] A tela do jogo tem beiradas: é até ali que a gente vê o jogo.

[engaging, energetic, conversational voice] Sabe quando você olha por uma janela? Você só vê o que está dentro da moldura.

[engaging, energetic, conversational voice] No seu jogo, em cada quadro, o jogo pode conferir se a nave passou da beirada. Essa conferência se chama limite da tela, e o jogo pode ter esse limite ou não.

[curious] E se a nave já estiver fora da tela, o que o limite faz com ela?

[engaging, energetic, conversational voice] O que você acha? Isso você vai testar na experiência.

[upbeat, encouraging voice] Agora você vai investigar o que acontece com a nave na beirada, com e sem o limite. O Zappy vai te mostrando o que testar, e você pode repetir quando quiser. Quando terminar, clique em Próxima parte.
```

**Substituições na edição kids:**

| ID | Personagem | Ocorrência | Âncora anterior | Fala exata substituída | Âncora posterior | Tags |
| --- | --- | --- | --- | --- | --- | --- |
| video-limite-da-tela-K1 | Dedé | 1 | conferir se a nave passou da beirada. Essa conferência se chama limite da tela, e o jogo pode ter esse limite ou não. | E se a nave já estiver fora da tela, o que o limite faz com ela? | O que você acha? Isso você vai testar na experiência. Agora você vai investigar o que acontece com a nave na beirada, | [curious] |

No adulto, manter toda a fala da professora. No kids, silenciar apenas o trecho marcado e substituir pelo áudio do personagem, sem sobrepor vozes.

**Imagem nas substituições kids (não gravar):**

- `video-limite-da-tela-K1`: entrada — Manter a tela parada, sem rodar a experiência na beirada. Saída — Depois da saída, ampliar a experiência parada.


**Falas dentro da experiência:** `packages/core/src/learning/scene/discovery-guidance.ts`, na tela `packages/member-shell/src/components/scene-walk-beirada.tsx`. A orientação do Zappy sugere comparações pelo estado observado; os controles ficam livres e as descobertas contam em qualquer ordem.

**Recado na página (não gravar):** Sua vez! Investigue o que o jogo faz com a nave na beirada da tela, com o limite desligado e ligado. O Zappy te mostra o que testar, e você pode repetir quando quiser. Quando terminar, clique em Próxima parte.

## Seção 6. Mantenha a nave na tela

### Clipe `video-limite-da-nave` · Mantenha a nave na tela

**Estimativa de gravação:** aproximadamente 3 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Clipe:** `video-limite-da-nave`

**Na tela:** A parte começa com o Estúdio expandido e o projeto da parte anterior [expandir estúdio]. No "clique na área do jogo e segure uma seta até a beirada", clicar no jogo [tocar prévia 400 240] e segurar a seta da direita até parte da nave passar da beirada. No "Deixe à vista o espaço entre Mover o sprite", apontar o lugar [apontar abaixo de "Mover o sprite com as setas"]. No "Agora abra Jogo 2D, depois Movimento", abrir as categorias [categoria Jogo 2D > Movimento > Bordas e rebatidas]. No "Arraste e solte logo abaixo de Mover o sprite com as setas", encaixar o bloco [encaixar "Manter o sprite" abaixo de "Mover o sprite com as setas"]. No "Repare: o bloco chega com o nome heroi", apontar o nome [apontar bloco "Manter o sprite"]. No "Clique em heroi", abrir o campo [abrir campo "heroi" em "Manter o sprite"]. No "e escolha nave na lista", escolher [escolher "nave" em "Manter o sprite"]. No "É este bloco que confere a beirada", apontar o bloco [apontar bloco "Manter o sprite"]. No "clique na área do jogo e segure a seta para a esquerda", clicar no jogo [tocar prévia 400 240] e segurar a seta da esquerda até a beirada; no "Depois segure a seta para a direita", segurar a da direita até a outra beirada. No "Clique em Verificar projeto", verificar [verificar projeto]. No "Quando aparecer Objetivo cumprido!, clique em Próxima parte", voltar ao tamanho da aula [reduzir estúdio] e clicar em **Próxima parte** [próxima parte]. Ao terminar, clicar em Verificar projeto, mostrar Objetivo cumprido! e seguir o encaminhamento narrado.

**Fala para ElevenLabs:**

```text
[engaging, energetic, conversational voice] Aqui no seu jogo, clique na área do jogo e segure uma seta até a beirada. Tá vendo? A nave passa e vai sumindo, porque o jogo ainda não tem limite.

[engaging, energetic, conversational voice] Lembra da experiência da parte anterior? Com o limite, a nave voltava. Agora a gente vai pôr esse limite no seu jogo!

[engaging, energetic, conversational voice] O jogo confere a beirada logo depois do passinho e antes do desenho. Por isso, o limite vai entre o movimento e o desenho da nave.

[confident, clear, unhurried voice] Deixe à vista o espaço entre Mover o sprite com as setas e Desenhar o sprite, dentro de A cada quadro do jogo.

[confident, clear, unhurried voice] Agora abra Jogo 2D, depois Movimento e depois Bordas e rebatidas, e pegue o bloco Manter o sprite dentro da tela. Arraste e solte logo abaixo de Mover o sprite com as setas, quando aparecer o encaixe.

[confident, clear, unhurried voice] Repare: o bloco chega com o nome heroi.

[curious] Esse nome heroi é o da minha nave?

[engaging, energetic, conversational voice] Não é: a sua nave se chama nave. Por isso, a gente troca. Clique em heroi e escolha nave na lista.

[engaging, energetic, conversational voice] É este bloco que confere a beirada: se a nave passou dela, ele puxa a nave de volta para dentro.

[upbeat, encouraging voice] Agora teste: clique na área do jogo e segure a seta para a esquerda até a beirada. Depois segure a seta para a direita até a outra beirada. [interested, animated voice] Olha só: a nave para nos dois lados e continua inteira na tela!

[reassuring, encouraging voice] Se algo não funcionou no seu jogo, volte aos blocos e confira se ficou assim: dentro de A cada quadro do jogo estão Limpar a tela, Mover o sprite nave com as setas, Manter o sprite nave dentro da tela e Desenhar o sprite nave, nessa ordem. [reassuring, encouraging voice] Depois de corrigir, teste de novo.

[engaging, energetic, conversational voice] Funcionou? Clique em Verificar projeto. Se faltar alguma coisa, corrija os blocos e clique novamente. Quando aparecer Objetivo cumprido!, clique em Próxima parte.
```

**Substituições na edição kids:**

| ID | Personagem | Ocorrência | Âncora anterior | Fala exata substituída | Âncora posterior | Tags |
| --- | --- | --- | --- | --- | --- | --- |
| video-limite-da-nave-K1 | Dedé | 1 | e solte logo abaixo de Mover o sprite com as setas, quando aparecer o encaixe. Repare: o bloco chega com o nome heroi. | Esse nome heroi é o da minha nave? | Não é: a sua nave se chama nave. Por isso, a gente troca. Clique em heroi e escolha nave na lista. É este bloco que | [curious] |

No adulto, manter toda a fala da professora. No kids, silenciar apenas o trecho marcado e substituir pelo áudio do personagem, sem sobrepor vozes.

**Imagem nas substituições kids (não gravar):**

- `video-limite-da-nave-K1`: entrada — Manter à vista o bloco Manter o sprite com o nome heroi. Saída — Depois da saída, clicar em heroi junto da fala da professora.


**Recado na página (não gravar):** Agora mantenha a sua nave na tela! Coloque o limite entre o movimento e o desenho, teste as duas beiradas e clique em Verificar projeto. Depois, clique em Próxima parte.

## Seção 7. Quem fica na frente?

### Clipe `video-ordem-dos-desenhos` · Quem fica na frente?

**Estimativa de gravação:** aproximadamente 1 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Clipe:** `video-ordem-dos-desenhos`

**Na tela:** No "Sabe quando você cola figurinhas", mostrar por 2 a 3 segundos o meme ilustrado, desenho nosso com o Zappy ou os personagens do jogo, sem foto de pessoa real nem meme da internet e sem cobrir a experiência: o Zappy com as figurinhas da nave e das estrelas na mão, escolhendo qual colar primeiro [na edição: meme das figurinhas]. No "Agora você vai investigar", ampliar a experiência e mostrar a cena parada, sem tocar nos controles [ampliar experiência]. No "O Zappy vai te mostrando", mostrar o Zappy [apontar zappy]. No "Quando terminar, clique em Próxima parte", voltar ao tamanho da aula [voltar à aula] e clicar em **Próxima parte** [próxima parte]. Não apontar os controles da experiência, não fazer os testes pela criança nem mostrar o resultado de nenhuma comparação: a criança descobre na experiência. Não falar de blocos, áreas do Estúdio, regra nem código (decisões de 01/11 e 02/11/2026).

**Fala para ElevenLabs:**

```text
[engaging, energetic, conversational voice] Sabe quando você cola figurinhas num álbum, umas por cima das outras? A ordem em que você cola faz diferença.

[engaging, energetic, conversational voice] A tela do jogo também é montada assim: em cada quadro, o jogo desenha uma coisa depois da outra, na mesma tela. No seu jogo, vão ser desenhados a nave e um fundo de estrelas.

[curious] E se o fundo de estrelas for desenhado depois da nave?

[engaging, energetic, conversational voice] O que você acha? Isso você vai testar na experiência.

[upbeat, encouraging voice] Agora você vai investigar o que muda na tela quando a ordem dos desenhos muda. O Zappy vai te mostrando o que testar, e você pode repetir quando quiser. Quando terminar, clique em Próxima parte.
```

**Substituições na edição kids:**

| ID | Personagem | Ocorrência | Âncora anterior | Fala exata substituída | Âncora posterior | Tags |
| --- | --- | --- | --- | --- | --- | --- |
| video-ordem-dos-desenhos-K1 | Dedé | 1 | o jogo desenha uma coisa depois da outra, na mesma tela. No seu jogo, vão ser desenhados a nave e um fundo de estrelas. | E se o fundo de estrelas for desenhado depois da nave? | O que você acha? Isso você vai testar na experiência. Agora você vai investigar o que muda na tela quando a ordem dos | [curious] |

No adulto, manter toda a fala da professora. No kids, silenciar apenas o trecho marcado e substituir pelo áudio do personagem, sem sobrepor vozes.

**Imagem nas substituições kids (não gravar):**

- `video-ordem-dos-desenhos-K1`: entrada — Manter o meme das figurinhas até o fim da frase da professora. Saída — Depois da saída, ampliar a experiência sem trocar a ordem.


**Falas dentro da experiência:** `packages/core/src/learning/scene/guia-livre/layers.ts`, na tela `packages/member-shell/src/components/scene-livre/layers.tsx`. A orientação do Zappy sugere comparações pelo estado observado; os controles ficam livres e as descobertas contam em qualquer ordem.

**Recado na página (não gravar):** Sua vez! Investigue o que muda na tela quando a ordem dos desenhos muda. O Zappy te mostra o que testar, e você pode repetir quando quiser. Quando terminar, clique em Próxima parte.

## Seção 8. Coloque as estrelas atrás da nave

### Clipe `video-fundo-estrelado` · Coloque as estrelas atrás da nave

**Estimativa de gravação:** aproximadamente 3 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Clipe:** `video-fundo-estrelado`

**Na tela:** A parte começa com o Estúdio expandido e o projeto da parte anterior [expandir estúdio]. No "Olhe o fundo do seu jogo", apontar o fundo liso [apontar prévia 400 120]. No "Deixe à vista o lugar logo depois de Desenhar o sprite nave", apontar o lugar [apontar abaixo de "Desenhar o sprite"]. No "Agora abra Jogo 2D, depois Cenários", abrir as categorias [categoria Jogo 2D > Cenários > Fundos]. No "Arraste e solte logo depois de Desenhar o sprite", encaixar o bloco [encaixar "Desenhar fundo de estrelas" abaixo de "Desenhar o sprite"]. No "Olha só: as estrelas cobriram a nave", apontar a prévia [apontar prévia 400 410]. No "deixe Limpar a tela à vista", apontar o bloco [apontar bloco "Limpar a tela"]. No "Agora arraste o bloco das estrelas", levar **Desenhar fundo de estrelas** com a mão até logo abaixo de **Limpar a tela** e soltar. No "É este bloco que desenha o céu", apontar o bloco [apontar bloco "Desenhar fundo de estrelas"]. No "Agora olhe a prévia", apontar a nave na frente das estrelas [apontar prévia 400 410]. No "Agora teste: clique na área do jogo", clicar no jogo [tocar prévia 400 240] e segurar cada seta até a beirada daquele lado. No "Clique em Verificar projeto", verificar [verificar projeto]. No "Quando aparecer Objetivo cumprido!, clique em Próxima parte", voltar ao tamanho da aula [reduzir estúdio] e clicar em **Próxima parte** [próxima parte]. Ao terminar, clicar em Verificar projeto, mostrar Objetivo cumprido! e seguir o encaminhamento narrado.

**Fala para ElevenLabs:**

```text
[engaging, energetic, conversational voice] Olhe o fundo do seu jogo. Tá vendo? Ele é liso, porque o seu jogo ainda não desenha nenhuma estrela.

[engaging, energetic, conversational voice] Lembra da experiência da parte anterior? Quem era desenhado por último ficava na frente. Agora a gente vai pôr um céu de estrelas no seu jogo!

[engaging, energetic, conversational voice] Primeiro, as estrelas vão no fim de A cada quadro do jogo, para você ver o que acontece. Deixe à vista o lugar logo depois de Desenhar o sprite nave.

[confident, clear, unhurried voice] Agora abra Jogo 2D, depois Cenários e depois Fundos, e pegue o bloco Desenhar fundo de estrelas. Arraste e solte logo depois de Desenhar o sprite, quando aparecer o encaixe. A velocidade já vem em 1: deixe assim.

[curious] Ué, cadê a nave?

[interested, animated voice] Olha só: as estrelas cobriram a nave! É que agora elas são desenhadas por último, depois da nave, e ficam na frente. Mas a nave continua no jogo, e é só mudar a ordem.

[engaging, energetic, conversational voice] Solte qualquer bloco que estiver segurando e deixe Limpar a tela à vista.

[engaging, energetic, conversational voice] Agora arraste o bloco das estrelas e solte logo abaixo de Limpar a tela, antes do movimento.

[engaging, energetic, conversational voice] É este bloco que desenha o céu de estrelas. Logo depois da limpeza, ele é desenhado antes de tudo e fica atrás.

[engaging, energetic, conversational voice] Agora olhe a prévia. [interested, animated voice] Olha só: a nave aparece de novo, na frente das estrelas!

[confident, clear, unhurried voice] Repare que a limpeza continua no começo: ela apaga o quadro anterior antes de o jogo desenhar o quadro novo, com as estrelas e a nave.

[upbeat, encouraging voice] Agora teste: clique na área do jogo e segure as setas mais uma vez. A nave precisa andar na frente das estrelas e parar nas duas beiradas.

[reassuring, encouraging voice] Se algo não funcionou no seu jogo, volte aos blocos e confira se ficou assim: dentro de A cada quadro do jogo estão Limpar a tela, Desenhar fundo de estrelas, Mover o sprite nave com as setas, Manter o sprite nave dentro da tela e Desenhar o sprite nave, nessa ordem. [reassuring, encouraging voice] Depois de corrigir, teste de novo.

[engaging, energetic, conversational voice] Funcionou? Clique em Verificar projeto. Se faltar alguma coisa, corrija os blocos e clique novamente. Quando aparecer Objetivo cumprido!, clique em Próxima parte.
```

**Substituições na edição kids:**

| ID | Personagem | Ocorrência | Âncora anterior | Fala exata substituída | Âncora posterior | Tags |
| --- | --- | --- | --- | --- | --- | --- |
| video-fundo-estrelado-K1 | Dedé | 1 | Arraste e solte logo depois de Desenhar o sprite, quando aparecer o encaixe. A velocidade já vem em 1: deixe assim. | Ué, cadê a nave? | Olha só: as estrelas cobriram a nave! É que agora elas são desenhadas por último, depois da nave, e ficam na frente. | [curious] |

No adulto, manter toda a fala da professora. No kids, silenciar apenas o trecho marcado e substituir pelo áudio do personagem, sem sobrepor vozes.

**Imagem nas substituições kids (não gravar):**

- `video-fundo-estrelado-K1`: entrada — Manter à vista a prévia com as estrelas por cima da nave. Saída — Depois da saída, apontar as estrelas por cima da nave junto do Olha só, antes de mover o bloco.


**Recado na página (não gravar):** Agora coloque as estrelas no seu jogo! Deixe o fundo de estrelas logo abaixo de Limpar a tela, confira a ordem dos cinco blocos e clique em Verificar projeto. Depois, clique em Próxima parte.

## Seção 9. Confira o que você construiu

**Recado na página (não gravar):** Hora de conferir o que você construiu! Responda sobre as estrelas e o limite da tela, pensando nos testes do seu jogo. Depois de enviar, leia as explicações e, se errar alguma, corrija e tente de novo. Quando acertar todas, clique em Próxima parte.

Sem vídeo ou ferramenta nesta parte. O quiz vem imediatamente depois do Zappy. Leia a explicação após enviar; tentativas ilimitadas, sem espera.

## Seção 10. Teste e envie sua nave

### Clipe `video-teste-e-envio` · Teste e envie sua nave

**Estimativa de gravação:** aproximadamente 2 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Clipe:** `video-teste-e-envio`

**Na tela:** A parte começa com o Estúdio expandido e o projeto da parte anterior [expandir estúdio]. No "Clique na área do jogo e leve a nave até cada beirada", clicar no jogo [tocar prévia 400 240] e segurar cada seta até a beirada daquele lado. No "Clique em Verificar projeto", verificar [verificar projeto]. No "clique em Enviar meu projeto", enviar e confirmar [enviar projeto]. No "Quando aparecer Projeto enviado!, clique em Concluir aula", voltar ao tamanho da aula [reduzir estúdio] e clicar em **Concluir aula** [concluir aula]. Ao terminar, clicar em Verificar projeto, mostrar Objetivo cumprido! e seguir o encaminhamento narrado.

**Fala para ElevenLabs:**

```text
[upbeat, encouraging voice] Agora teste a sua nave antes de enviar. Clique na área do jogo e leve a nave até cada beirada: ela tem que parar inteira na tela e continuar na frente das estrelas, porque o limite e a ordem dos desenhos funcionam juntos.

[reassuring, encouraging voice] Se algo não funcionou no seu jogo, volte aos blocos e confira se ficou assim: dentro de A cada quadro do jogo, a sequência começa em Limpar a tela e termina em Desenhar o sprite nave, e os três blocos da nave usam o nome nave. [reassuring, encouraging voice] Depois de corrigir, teste de novo.

[engaging, energetic, conversational voice] Funcionou? Clique em Verificar projeto. Se faltar alguma coisa, corrija os blocos e clique novamente. Quando aparecer Objetivo cumprido!, clique em Enviar meu projeto e confirme em Enviar. Quando aparecer Projeto enviado!, clique em Concluir aula.
```


**Recado na página (não gravar):** Hora de testar a sua nave! Leve a nave até as duas beiradas, confira a ordem dos blocos, clique em Verificar projeto e envie o seu projeto. Depois, clique em Concluir aula.
