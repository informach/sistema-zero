# Roteiro de produção · Faça os asteroides cair

**Produção:** a professora grava toda a fala principal. Na montagem kids, Dedé substitui somente os trechos da tabela, com a mesma frase e sem voz sobreposta. O master funciona sozinho no adulto. Notas e recados da página não são gravados. [Direção de voz e edição](../../../aulas-interativas-tecnico/DIRETRIZES-VOZ-ELEVENLABS.md).

## Seção 1. Quando nasce uma pedra nova?

### Clipe `video-intervalo-das-pedras` · Quando nasce uma pedra nova?

**Estimativa de gravação:** aproximadamente 1 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Clipe:** `video-intervalo-das-pedras`

**Na tela:** No "Sabe uma torneira pingando", mostrar por 2 a 3 segundos o meme ilustrado, desenho nosso com o Zappy ou os personagens do jogo, sem foto de pessoa real nem meme da internet e sem cobrir a experiência: o Zappy olhando uma torneira pingando [na edição: meme da torneira]. No "Agora você vai investigar", ampliar a experiência e mostrar a cena parada, sem tocar nos controles [ampliar experiência]. No "O Zappy ajuda", mostrar o Zappy [apontar zappy]. No "Quando terminar, clique em Próxima parte", voltar ao tamanho da aula [voltar à aula] e clicar em **Próxima parte** [próxima parte]. Não apontar os controles da experiência, não fazer os testes pela criança nem mostrar o resultado de nenhuma comparação: a criança descobre na experiência. Não falar de blocos, áreas do Estúdio, regra nem código (decisões de 01/11 e 02/11/2026).

**Fala para ElevenLabs:**

```text
[engaging, energetic, conversational voice] Sabe uma torneira pingando? Ela pode pingar sem parar ou esperar um pouco entre uma gota e outra.

[engaging, energetic, conversational voice] No seu jogo, as pedras vão nascer lá em cima e cair. E o jogo pode criar uma pedra nova em todo quadro, ou esperar alguns quadros entre uma pedra e outra.

[curious] E se nascer uma pedra em todo quadro?

[engaging, energetic, conversational voice] O que você acha? Isso você vai testar na experiência.

[upbeat, encouraging voice] Agora você vai investigar o que muda na chuva de pedras quando nasce uma pedra nova em todo quadro e quando cada pedra espera alguns quadros. Você escolhe por onde começar e pode repetir os testes. O Zappy ajuda a observar as diferenças. Quando terminar, clique em Próxima parte.
```

**Substituições na edição kids:**

| ID | Personagem | Ocorrência | Âncora anterior | Fala exata substituída | Âncora posterior | Tags |
| --- | --- | --- | --- | --- | --- | --- |
| video-intervalo-das-pedras-K1 | Dedé | 1 | em cima e cair. E o jogo pode criar uma pedra nova em todo quadro, ou esperar alguns quadros entre uma pedra e outra. | E se nascer uma pedra em todo quadro? | O que você acha? Isso você vai testar na experiência. Agora você vai investigar o que muda na chuva de pedras quando | [curious] |

No adulto, manter toda a fala da professora. No kids, silenciar apenas o trecho marcado e substituir pelo áudio do personagem, sem sobrepor vozes.

**Imagem nas substituições kids (não gravar):**

- `video-intervalo-das-pedras-K1`: entrada — Manter o meme da torneira até o fim da frase da professora. Saída — Depois da saída, ampliar a experiência com o tempo parado.


**Falas dentro da experiência:** `packages/core/src/learning/scene/guia-livre/spawn.ts`, na tela `packages/member-shell/src/components/scene-livre/spawn.tsx`. A orientação do Zappy sugere comparações pelo estado observado; os controles ficam livres e as descobertas contam em qualquer ordem.

**Recado na página (não gravar):** Sua vez! Investigue o que muda na chuva de pedras com e sem uma espera entre elas. Você escolhe a ordem dos testes, e o Zappy sugere o que observar. Quando terminar, clique em Próxima parte.

## Seção 2. Prepare a criação dos asteroides

### Clipe `video-grupo-e-relogio` · Prepare a criação dos asteroides

**Estimativa de gravação:** aproximadamente 4 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Clipe:** `video-grupo-e-relogio`

**Na tela:** A parte começa com o Estúdio expandido e o projeto da aula anterior [expandir estúdio]. No "clique na área do jogo e espere um pouco", clicar no jogo [tocar prévia 400 240] e esperar uns segundos. No "Deixe à vista o fim de Ao iniciar", apontar o lugar [apontar abaixo de "Criar grupo de sprites"]. No "Agora abra Jogo 2D, depois Grupos", abrir as categorias [categoria Jogo 2D > Grupos > Criar e percorrer]. No "Arraste e solte logo abaixo de Criar grupo de sprites tiros", encaixar o bloco [encaixar "Criar grupo de sprites" abaixo de "Criar grupo de sprites"]. No "É este bloco que cria a lista das pedras", apontar o bloco novo. No "Deixe à vista o espaço logo abaixo do bloco inteiro", arrastar até o fim do bloco aparecer [arrastar até "A cada quadro do jogo"]. No "Abra Jogo 2D, depois Tempo", abrir as categorias [categoria Jogo 2D > Tempo > Quadros e intervalos], levar **A cada quadros** com a mão até logo abaixo do bloco inteiro **A cada quadro do jogo**, fora dele, e soltar. No "Clique no 30, troque por 40", trocar o número [trocar "30" por "40" em "A cada"]. No "É este bloco que, de 40 em 40 quadros", apontar o bloco [apontar bloco "A cada 40 quadros"]. No "Clique em Verificar projeto", verificar [verificar projeto]. No "Quando aparecer Objetivo cumprido!, clique em Próxima parte", voltar ao tamanho da aula [reduzir estúdio] e clicar em **Próxima parte** [próxima parte]. Ao terminar, clicar em Verificar projeto, mostrar Objetivo cumprido! e seguir o encaminhamento narrado.

**Fala para ElevenLabs:**

```text
[engaging, energetic, conversational voice] Aqui no seu jogo, clique na área do jogo e espere um pouco. Tá vendo? Nenhuma pedra aparece, porque o jogo ainda não cria pedras.

[engaging, energetic, conversational voice] Lembra da experiência da parte anterior? Esperando 40 quadros entre uma pedra e outra, sobrava espaço. Agora a gente vai preparar as pedras e essa espera no seu jogo!

[engaging, energetic, conversational voice] As pedras também vão ser muitas. Por isso, elas ficam num grupo, criado uma vez, quando o jogo começa, no fim de Ao iniciar.

[confident, clear, unhurried voice] Deixe à vista o fim de Ao iniciar, logo depois de Criar grupo de sprites tiros.

[confident, clear, unhurried voice] Agora abra Jogo 2D, depois Grupos e depois Criar e percorrer, e pegue o bloco Criar grupo de sprites. Arraste e solte logo abaixo de Criar grupo de sprites tiros.

[confident, clear, unhurried voice] Repare: o nome já vem asteroides, que é o nome certo para este grupo. Deixe assim.

[engaging, energetic, conversational voice] É este bloco que cria a lista das pedras, ainda vazia.

[curious] E quando vai nascer cada pedra?

[engaging, energetic, conversational voice] De 40 em 40 quadros, como na experiência. A pedra não nasce em todo quadro, e sim de tempos em tempos. Por isso, ela não fica dentro de A cada quadro do jogo: a espera tem um bloco próprio, que fica logo abaixo de A cada quadro do jogo, fora dele, como vizinho.

[confident, clear, unhurried voice] Deixe à vista o espaço logo abaixo do bloco inteiro A cada quadro do jogo, ainda dentro de Enquanto estiver rodando.

[confident, clear, unhurried voice] Abra Jogo 2D, depois Tempo e depois Quadros e intervalos, e pegue o bloco A cada quadros. Arraste e solte logo abaixo de A cada quadro do jogo, mas fora dele, ainda dentro de Enquanto estiver rodando. Os dois blocos ficam como vizinhos, um embaixo do outro.

[engaging, energetic, conversational voice] O número do intervalo chega em 30. Clique no 30, troque por 40 e clique fora do campo.

[engaging, energetic, conversational voice] É este bloco que, de 40 em 40 quadros, faz o que estiver dentro dele. Enquanto isso, A cada quadro do jogo continua cuidando de cada desenho da partida.

[confident, clear, unhurried voice] Confira se ficou assim: no fim de Ao iniciar está Criar grupo de sprites asteroides, e, dentro de Enquanto estiver rodando, A cada 40 quadros está logo abaixo de A cada quadro do jogo, como vizinho, e não encaixado dentro dele.

[engaging, energetic, conversational voice] Por enquanto, nenhuma pedra cai, porque o bloco da espera ainda está vazio. A pedra entra nele depois da próxima experiência.

[engaging, energetic, conversational voice] Funcionou? Clique em Verificar projeto. Se faltar alguma coisa, corrija os blocos e clique novamente. Quando aparecer Objetivo cumprido!, clique em Próxima parte.
```

**Substituições na edição kids:**

| ID | Personagem | Ocorrência | Âncora anterior | Fala exata substituída | Âncora posterior | Tags |
| --- | --- | --- | --- | --- | --- | --- |
| video-grupo-e-relogio-K1 | Dedé | 1 | vem asteroides, que é o nome certo para este grupo. Deixe assim. É este bloco que cria a lista das pedras, ainda vazia. | E quando vai nascer cada pedra? | De 40 em 40 quadros, como na experiência. A pedra não nasce em todo quadro, e sim de tempos em tempos. Por isso, ela | [curious] |

No adulto, manter toda a fala da professora. No kids, silenciar apenas o trecho marcado e substituir pelo áudio do personagem, sem sobrepor vozes.

**Imagem nas substituições kids (não gravar):**

- `video-grupo-e-relogio-K1`: entrada — Manter à vista o bloco Criar grupo de sprites asteroides recém-encaixado. Saída — Depois da saída, mostrar o fim do bloco A cada quadro do jogo.


**Recado na página (não gravar):** Agora prepare a chuva de pedras! Crie o grupo asteroides, coloque a espera de 40 quadros logo abaixo de A cada quadro do jogo e clique em Verificar projeto. Depois, clique em Próxima parte.

## Seção 3. Onde nasce cada pedra?

### Clipe `video-posicao-sorteada` · Onde nasce cada pedra?

**Estimativa de gravação:** aproximadamente 1 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Clipe:** `video-posicao-sorteada`

**Na tela:** No "Sabe quando você joga um dado", mostrar por 2 a 3 segundos o meme ilustrado, desenho nosso com o Zappy ou os personagens do jogo, sem foto de pessoa real nem meme da internet e sem cobrir a experiência: o Zappy jogando um dado enorme, que rola na frente da nave [na edição: meme do dado]. No "Agora você vai investigar", ampliar a experiência e mostrar a cena parada, sem tocar nos controles [ampliar experiência]. No "O Zappy ajuda", mostrar o Zappy [apontar zappy]. No "Quando terminar, clique em Próxima parte", voltar ao tamanho da aula [voltar à aula] e clicar em **Próxima parte** [próxima parte]. Não apontar os controles da experiência, não fazer os testes pela criança nem mostrar o resultado de nenhuma comparação: a criança descobre na experiência. Não falar de blocos, áreas do Estúdio, regra nem código (decisões de 01/11 e 02/11/2026).

**Fala para ElevenLabs:**

```text
[engaging, energetic, conversational voice] Sabe quando você joga um dado? Ninguém sabe antes qual número vai sair, e cada jogada pode dar um número diferente. Isso é um sorteio.

[engaging, energetic, conversational voice] No seu jogo, se todas as pedras nascessem no mesmo lugar, ficaria fácil demais acertar. Por isso, o jogo pode sortear o x de cada pedra nova, de um lado ao outro da tela.

[curious] E a pedra aparece de repente, no meio da tela?

[engaging, energetic, conversational voice] O que você acha? Isso você vai testar na experiência.

[upbeat, encouraging voice] Agora você vai investigar onde cada pedra nova nasce quando o jogo sorteia o lugar, e de onde ela entra na tela. Você escolhe por onde começar e pode repetir os testes. O Zappy ajuda a observar as diferenças. Quando terminar, clique em Próxima parte.
```

**Substituições na edição kids:**

| ID | Personagem | Ocorrência | Âncora anterior | Fala exata substituída | Âncora posterior | Tags |
| --- | --- | --- | --- | --- | --- | --- |
| video-posicao-sorteada-K1 | Dedé | 1 | lugar, ficaria fácil demais acertar. Por isso, o jogo pode sortear o x de cada pedra nova, de um lado ao outro da tela. | E a pedra aparece de repente, no meio da tela? | O que você acha? Isso você vai testar na experiência. Agora você vai investigar onde cada pedra nova nasce quando o | [curious] |

No adulto, manter toda a fala da professora. No kids, silenciar apenas o trecho marcado e substituir pelo áudio do personagem, sem sobrepor vozes.

**Imagem nas substituições kids (não gravar):**

- `video-posicao-sorteada-K1`: entrada — Manter o meme do dado até o fim da frase da professora. Saída — Depois da saída, ampliar a experiência sem sortear.


**Falas dentro da experiência:** `packages/core/src/learning/scene/guia-livre/random.ts`, na tela `packages/member-shell/src/components/scene-livre/random.tsx`. A orientação do Zappy sugere comparações pelo estado observado; os controles ficam livres e as descobertas contam em qualquer ordem.

**Recado na página (não gravar):** Sua vez! Investigue onde as pedras nascem quando o jogo sorteia o lugar. Você escolhe a ordem dos testes, e o Zappy sugere o que observar. Quando terminar, clique em Próxima parte.

## Seção 4. Crie e mostre as pedras caindo

### Clipe `video-asteroide` · Crie e mostre as pedras caindo

**Estimativa de gravação:** aproximadamente 5 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Clipe:** `video-asteroide`

**Na tela:** A parte começa com o Estúdio expandido e o projeto da parte anterior [expandir estúdio]. No "clique na área do jogo e espere um pouco", clicar no jogo [tocar prévia 400 240] e esperar uns segundos. No "Deixe à vista o espaço vazio dentro de A cada 40 quadros", arrastar até o bloco aparecer [arrastar até "A cada 40 quadros"]. No "Agora abra Jogo 2D, depois Kits prontos", abrir as categorias [categoria Jogo 2D > Kits prontos > Espaço]. No "Arraste para dentro de A cada 40 quadros", encaixar o bloco [encaixar "No grupo criar um asteroide" em "A cada 40 quadros"]. No "É este bloco que cria uma pedra nova", apontar o bloco [apontar bloco "No grupo criar um asteroide"]. No "Deixe à vista o 100 do campo x do asteroide", abrir as categorias [categoria Jogo 2D > Sorteios > Números e posições], levar **um x aleatório na tela** com a mão e soltar em cima do 100 do x. No "Agora clique no 100 do y", trocar o número [trocar "100" por "-30" em "No grupo criar um asteroide"]. No "Clique no 2 do vy", trocar o número [trocar "2" por "3" em "No grupo criar um asteroide"]. No "Deixe à vista o fim de A cada quadro do jogo", apontar o lugar [apontar abaixo de "Desenhar o grupo"], abrir as categorias [categoria Jogo 2D > Grupos > Movimento] e encaixar o bloco no fim da sequência. No "pegue o bloco Tirar do grupo quem sair da tela", abrir a categoria [categoria Jogo 2D > Grupos > Participação e limpeza] e encaixar logo abaixo do movimento dos asteroides. No "pegue o bloco Desenhar o grupo e solte", abrir a categoria [categoria Jogo 2D > Grupos > Desenho e ordem] e encaixar logo abaixo da limpeza dos asteroides. No "Agora teste: clique na área do jogo e espere", clicar no jogo [tocar prévia 400 240] e esperar as pedras caírem. No "Atire numa delas", tocar na barra de espaço [tecla Space] e mostrar o tiro atravessando a pedra. No "Clique em Verificar projeto", verificar [verificar projeto]. No "Quando aparecer Objetivo cumprido!, clique em Próxima parte", voltar ao tamanho da aula [reduzir estúdio] e clicar em **Próxima parte** [próxima parte]. Ao terminar, clicar em Verificar projeto, mostrar Objetivo cumprido! e seguir o encaminhamento narrado.

**Fala para ElevenLabs:**

```text
[engaging, energetic, conversational voice] Aqui no seu jogo, clique na área do jogo e espere um pouco. Tá vendo? Ainda não cai nenhuma pedra, porque o bloco da espera está vazio.

[engaging, energetic, conversational voice] Lembra da experiência da parte anterior? Cada pedra nascia num lugar sorteado, acima da tela. Agora a gente vai pôr a pedra na espera do seu jogo!

[confident, clear, unhurried voice] Deixe à vista o espaço vazio dentro de A cada 40 quadros.

[confident, clear, unhurried voice] Agora abra Jogo 2D, depois Kits prontos e depois Espaço, e pegue o bloco No grupo criar um asteroide. Arraste para dentro de A cada 40 quadros e solte quando aparecer o encaixe.

[engaging, energetic, conversational voice] É este bloco que cria uma pedra nova, cada vez que a espera termina.

[confident, clear, unhurried voice] Repare: o grupo já vem asteroides. Deixe assim.

[engaging, energetic, conversational voice] Agora o lugar onde a pedra nasce. Em vez de um número fixo no x, a pedra vai nascer num lugar sorteado, como na experiência.

[confident, clear, unhurried voice] Deixe à vista o 100 do campo x do asteroide. Abra Jogo 2D, depois Sorteios e depois Números e posições, pegue o bloco um x aleatório na tela e solte em cima do 100.

[engaging, energetic, conversational voice] É este bloco que sorteia um lugar novo, de um lado ao outro da tela, para cada pedra.

[confident, clear, unhurried voice] Agora clique no 100 do y, troque por -30 e clique fora do campo. Assim, a pedra nasce acima da tela e entra caindo.

[engaging, energetic, conversational voice] O tamanho já vem em 40, e o vx já vem em 0, por isso a pedra não anda para os lados: deixe os dois assim.

[confident, clear, unhurried voice] Clique no 2 do vy, troque por 3 e clique fora do campo. Sem o sinal de menos, a pedra desce. Se quiser, escolha uma cor que apareça bem no fundo.

[engaging, energetic, conversational voice] Agora as pedras precisam andar, sair do grupo quando passarem da tela e aparecer, em todo quadro, como os tiros. Por isso, os três blocos que cuidam delas, Mover os sprites do grupo, Tirar do grupo quem sair da tela e Desenhar o grupo, vão no fim de A cada quadro do jogo.

[confident, clear, unhurried voice] Deixe à vista o fim de A cada quadro do jogo, logo depois de Desenhar o grupo tiros. Abra Jogo 2D, depois Grupos e depois Movimento, pegue o bloco Mover os sprites do grupo usando suas velocidades e solte nesse lugar.

[confident, clear, unhurried voice] Repare: o grupo já vem asteroides, e nos dois próximos blocos também. Deixe assim.

[curious] E como tira as pedras que saem da tela?

[engaging, energetic, conversational voice] Do mesmo jeito que os tiros. Deixe à vista o encaixe logo abaixo do movimento dos asteroides. Abra Jogo 2D, depois Grupos e depois Participação e limpeza, pegue o bloco Tirar do grupo quem sair da tela e solte nesse encaixe. [confident, clear, unhurried voice] Repare que o bloco também tem a palavra chamado, seguida de sprite: deixe assim. E deixe vazio o encaixe de fazer, na linha de baixo do bloco.

[confident, clear, unhurried voice] Deixe à vista o encaixe logo abaixo da limpeza dos asteroides. Abra Jogo 2D, depois Grupos e depois Desenho e ordem, pegue o bloco Desenhar o grupo e solte nesse encaixe.

[upbeat, encouraging voice] Agora teste: clique na área do jogo e espere. [interested, animated voice] Olha só: as pedras entram pela parte de cima, cada uma num lugar, e caem!

[engaging, energetic, conversational voice] Atire numa delas. Por enquanto, o tiro atravessa a pedra, porque o acerto ainda não foi programado. Ele vem na próxima aula.

[reassuring, encouraging voice] Se algo não funcionou no seu jogo, volte aos blocos e confira se ficou assim: dentro de A cada 40 quadros está No grupo asteroides criar um asteroide, com um x aleatório na tela, y -30, tamanho 40, vx 0 e vy 3. E, no fim de A cada quadro do jogo, estão Mover os sprites do grupo asteroides, Tirar do grupo asteroides quem sair da tela e Desenhar o grupo asteroides, nessa ordem. [reassuring, encouraging voice] Depois de corrigir, teste de novo.

[engaging, energetic, conversational voice] Funcionou? Clique em Verificar projeto. Se faltar alguma coisa, corrija os blocos e clique novamente. Quando aparecer Objetivo cumprido!, clique em Próxima parte.
```

**Substituições na edição kids:**

| ID | Personagem | Ocorrência | Âncora anterior | Fala exata substituída | Âncora posterior | Tags |
| --- | --- | --- | --- | --- | --- | --- |
| video-asteroide-K1 | Dedé | 1 | velocidades e solte nesse lugar. Repare: o grupo já vem asteroides, e nos dois próximos blocos também. Deixe assim. | E como tira as pedras que saem da tela? | Do mesmo jeito que os tiros. Deixe à vista o encaixe logo abaixo do movimento dos asteroides. Abra Jogo 2D, depois | [curious] |

No adulto, manter toda a fala da professora. No kids, silenciar apenas o trecho marcado e substituir pelo áudio do personagem, sem sobrepor vozes.

**Imagem nas substituições kids (não gravar):**

- `video-asteroide-K1`: entrada — Manter à vista o movimento dos asteroides recém-encaixado. Saída — Depois da saída, mostrar o encaixe logo abaixo do movimento dos asteroides.


**Recado na página (não gravar):** Agora faça as pedras caírem! Crie o asteroide dentro da espera, com o x sorteado, monte o movimento, a limpeza e o desenho do grupo e clique em Verificar projeto. Depois, clique em Próxima parte.

## Seção 5. Teste e envie a sua chuva de pedras

### Clipe `video-entrega` · Teste e envie a sua chuva de pedras

**Estimativa de gravação:** aproximadamente 1 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Clipe:** `video-entrega`

**Na tela:** A parte começa com o Estúdio expandido e o projeto da parte anterior [expandir estúdio]. No "Clique na área do jogo e olhe as pedras", clicar no jogo [tocar prévia 400 240] e esperar as pedras caírem. No "Depois mova a nave e atire", segurar uma seta por um instante e tocar na barra de espaço [tecla Space]. No "Clique em Verificar projeto", verificar [verificar projeto]. No "clique em Enviar meu projeto", enviar e confirmar [enviar projeto]. No "Quando aparecer Projeto enviado!, clique em Concluir aula", voltar ao tamanho da aula [reduzir estúdio] e clicar em **Concluir aula** [concluir aula]. Ao terminar, clicar em Verificar projeto, mostrar Objetivo cumprido! e seguir o encaminhamento narrado.

**Fala para ElevenLabs:**

```text
[upbeat, encouraging voice] Agora teste o seu jogo inteiro. Clique na área do jogo e olhe as pedras: elas entram pela parte de cima, uma a cada 40 quadros, cada uma num lugar sorteado, e caem sempre no mesmo ritmo.

[engaging, energetic, conversational voice] Depois mova a nave e atire. As setas e os tiros precisam continuar funcionando como antes, agora com as pedras caindo. Por enquanto, o tiro atravessa as pedras: o acerto vem na próxima aula.

[engaging, energetic, conversational voice] Funcionou? Clique em Verificar projeto. Se faltar alguma coisa, corrija os blocos e clique novamente. Quando aparecer Objetivo cumprido!, clique em Enviar meu projeto e confirme em Enviar. Quando aparecer Projeto enviado!, clique em Concluir aula.
```


**Recado na página (não gravar):** Hora de testar a sua chuva de pedras! Confira as pedras caindo, as setas e os tiros, clique em Verificar projeto e envie o seu projeto. Depois, clique em Concluir aula.
