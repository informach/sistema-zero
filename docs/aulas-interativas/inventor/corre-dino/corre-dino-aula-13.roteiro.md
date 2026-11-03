# Roteiro de produção · Aumente a dificuldade com um limite

**Produção:** a professora grava toda a fala principal. Na montagem kids, Debinha substitui somente os trechos da tabela, com a mesma frase e sem voz sobreposta. O master funciona sozinho no adulto. Notas e recados da página não são gravados. [Direção de voz e edição](../../../aulas-interativas-tecnico/DIRETRIZES-VOZ-ELEVENLABS.md).

## Seção 1. Até onde a corrida acelera?

### Clipe `video-o-que-o-freio-segura` · Até onde a corrida acelera?

**Estimativa de gravação:** aproximadamente 2 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Clipe:** `video-o-que-o-freio-segura`

**Na tela:** No "Sabe o botão de volume", mostrar por 2 a 3 segundos o meme ilustrado, desenho nosso com o Zappy ou os personagens do jogo, sem foto de pessoa real nem meme da internet e sem cobrir a experiência: o Zappy girando o botão de volume de um rádio, com o Dino dançando ao lado [na edição: meme do botão de volume]. No "No seu jogo", ampliar a experiência [ampliar experiência] e mostrar a cena parada, sem passar o tempo. Não apontar nem clicar nos controles da experiência. No "O Zappy ajuda", mostrar o Zappy [apontar zappy]. No "Quando terminar, clique em Próxima parte", voltar ao tamanho da aula [voltar à aula] e clicar em **Próxima parte** [próxima parte]. Não fazer os testes pela criança nem mostrar o resultado de nenhuma comparação: a criança descobre na experiência. Não falar de blocos, áreas do Estúdio, regra nem código (decisões de 01/11 e 02/11/2026).

**Fala para ElevenLabs:**

```text
[engaging, energetic, conversational voice] Num jogo, a dificuldade pode crescer aos poucos, enquanto a partida acontece.

[engaging, energetic, conversational voice] Sabe o botão de volume? Cada toque deixa o som um pouco mais forte.

[curious] No seu jogo, a corrida fica mais rápida aos poucos, e o número da base vai descendo: -5, -6, -7… Cada cacto nasce com o número dele. E o jogo pode fazer uma pergunta antes de mudar a base: a base é maior que -9?

[curious] E os cactos que já estão na pista também ficam mais rápidos?

[engaging, energetic, conversational voice] O que você acha? Isso você vai testar na experiência.

[upbeat, encouraging voice] Agora você vai investigar o que acontece com a base e com os números dos cactos novos e antigos, com a pergunta ligada e desligada. Você escolhe por onde começar e pode repetir os testes. O Zappy ajuda a observar as diferenças. Quando terminar, clique em Próxima parte.
```

**Substituições na edição kids:**

| ID | Personagem | Ocorrência | Âncora anterior | Fala exata substituída | Âncora posterior | Tags |
| --- | --- | --- | --- | --- | --- | --- |
| video-o-que-o-freio-segura-K1 | Debinha | 1 | -7… Cada cacto nasce com o número dele. E o jogo pode fazer uma pergunta antes de mudar a base: a base é maior que -9? | E os cactos que já estão na pista também ficam mais rápidos? | O que você acha? Isso você vai testar na experiência. Agora você vai investigar o que acontece com a base e com os | [curious] |

No adulto, manter toda a fala da professora. No kids, silenciar apenas o trecho marcado e substituir pelo áudio do personagem, sem sobrepor vozes.

**Imagem nas substituições kids (não gravar):**

- `video-o-que-o-freio-segura-K1`: entrada — Manter a experiência ampliada e parada até a professora terminar a frase. Saída — Depois da saída, seguir com a experiência parada, sem clicar em nada.


**Falas dentro da experiência:** `packages/core/src/learning/scene/guia-livre/acceleration.ts`, na tela `packages/member-shell/src/components/scene-livre/acceleration.tsx`. A orientação do Zappy sugere comparações pelo estado observado; os controles ficam livres e as descobertas contam em qualquer ordem.

**Recado na página (não gravar):** Sua vez! Investigue o que muda nos cactos quando a base muda, com e sem a pergunta. Você escolhe a ordem dos testes, e o Zappy sugere o que observar. Quando terminar, clique em Próxima parte.

## Seção 2. Guarde a velocidade base

### Clipe `video-numero-que-manda` · Guarde a velocidade base

**Estimativa de gravação:** aproximadamente 3 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Clipe:** `video-numero-que-manda`

**Na tela:** Mostrar o projeto no estado de entrada. Na abertura não há teste no jogo, porque o efeito desta parte ainda não aparece: a fala só lembra a experiência e anuncia a montagem. Em cada “Olha aqui”, “Olha só” ou “Repare”, apontar na tela o lugar, o bloco ou o resultado citado. Localizar cada destino antes de buscar a peça. Mostrar campos, encaixes e testes sem cortes. Ao terminar, clicar em Verificar projeto, mostrar Objetivo cumprido! e seguir o encaminhamento narrado (Próxima parte).

**Fala para ElevenLabs:**

```text
[engaging, energetic, conversational voice] Lembra da experiência da parte anterior? A base diminuía com o tempo, e cada cacto novo nascia com a base daquele momento. Agora a gente vai guardar a base numa variável!

[engaging, energetic, conversational voice] A base vai ficar numa variável com o nome velocidade. Ela guarda o número de partida. Já o vx é o número que cada cacto recebe quando nasce.

[engaging, energetic, conversational voice] A variável nasce quando o jogo começa. Por isso, ela vai no fim de Ao iniciar, logo depois de Criar variável pontos.

[confident, clear, unhurried voice] Deixe à vista o fim de Ao iniciar.

[confident, clear, unhurried voice] Agora abra Programação e depois Variáveis, pegue o bloco Criar variável com valor e solte nesse fim.

[confident, clear, unhurried voice] Repare: o nome chega como contador. Clique em contador, troque por velocidade e clique fora do campo.

[confident, clear, unhurried voice] Clique no 0 do valor e troque por -5. É este bloco que guarda a base, começando em -5.

[confident, clear, unhurried voice] Agora deixe à vista o -5 do lado esquerdo da conta, no vx do bloco que cria os cactos.

[confident, clear, unhurried voice] Abra Programação e depois Valores, pegue o bloco valor da variável e solte em cima desse -5.

[confident, clear, unhurried voice] Repare: ele chega com x. Clique em x e escolha velocidade. É este bloco que lê a base na hora em que cada cacto nasce.

[engaging, energetic, conversational voice] Mantenha o sinal de menos e o sorteio de 0 a 1 do lado direito.

[confident, clear, unhurried voice] Confira se ficou assim: em Ao iniciar, está Criar variável velocidade com valor -5, e o vx dos cactos é velocidade menos um número de 0 a 1.

[engaging, energetic, conversational voice] Agora comece uma partida. [confident, clear, unhurried voice] Repare: o jogo continua igual, porque a variável velocidade guarda o mesmo -5 de antes. A diferença é que, agora, essa base pode mudar durante a corrida.

[engaging, energetic, conversational voice] Funcionou? Clique em Verificar projeto. Se faltar alguma coisa, corrija os blocos e clique novamente. Quando aparecer Objetivo cumprido!, clique em Próxima parte.
```


**Recado na página (não gravar):** Agora guarde a velocidade base numa variável! Crie velocidade com -5 em Ao iniciar e use o valor dela na conta do vx dos cactos. Depois, clique em Verificar projeto e, em seguida, em Próxima parte.

## Seção 3. Prepare o relógio da dificuldade

### Clipe `video-relogio-da-dificuldade` · Prepare o relógio da dificuldade

**Estimativa de gravação:** aproximadamente 3 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Clipe:** `video-relogio-da-dificuldade`

**Na tela:** Mostrar o projeto no estado de entrada. Na abertura não há teste no jogo, porque o efeito desta parte ainda não aparece: a fala só lembra a experiência e anuncia a montagem. Em cada “Olha aqui”, “Olha só” ou “Repare”, apontar na tela o lugar, o bloco ou o resultado citado. Localizar cada destino antes de buscar a peça. Mostrar campos, encaixes e testes sem cortes. Ao terminar, clicar em Verificar projeto, mostrar Objetivo cumprido! e seguir o encaminhamento narrado (Próxima parte).

**Fala para ElevenLabs:**

```text
[engaging, energetic, conversational voice] Lembra da experiência da primeira parte desta aula? A cada 5 segundos, a base diminuía 1. Agora a gente vai criar o relógio da dificuldade!

[engaging, energetic, conversational voice] A base muda no próprio ritmo, a cada 5 segundos, separada dos cactos e dos pontos. Por isso, ela ganha um relógio só dela, em Enquanto estiver rodando.

[confident, clear, unhurried voice] Deixe à vista um espaço em Enquanto estiver rodando, fora de A cada quadro do jogo e dos dois relógios que já existem.

[confident, clear, unhurried voice] Agora abra Jogo 2D, depois Tempo e depois Quadros e intervalos, pegue o bloco A cada 2 segundos e solte nesse espaço.

[confident, clear, unhurried voice] Clique no 2 e troque por 5. É este relógio que vai mudar a base de 5 em 5 segundos.

[curious] A base só pode mudar durante a partida. Por isso, o relógio também precisa da pergunta: a partida já começou?

[confident, clear, unhurried voice] Deixe à vista o espaço vazio dentro desse relógio. Abra Programação e depois Lógica e Se, pegue o bloco Se e solte ali.

[confident, clear, unhurried voice] Repare: ele chega com a pergunta x maior que 0. Arraste essa pergunta para a lixeira.

[confident, clear, unhurried voice] Deixe à vista o lugar vazio da pergunta. Abra Jogo 2D, depois Jogo e telas e depois Telas e partida, pegue o bloco o estado do jogo é, solte nesse lugar e escolha jogando.

[engaging, energetic, conversational voice] Esse efeito não aparece no jogo agora. [confident, clear, unhurried voice] Confira se ficou assim: em Enquanto estiver rodando, há três relógios separados: o dos cactos, em 1.4 segundo, o dos pontos, em 1 segundo, e o da dificuldade, em 5 segundos, com o Se jogando. O então do relógio novo ainda está vazio, e por isso a base ainda não muda.

[engaging, energetic, conversational voice] Funcionou? Clique em Verificar projeto. Se faltar alguma coisa, corrija os blocos e clique novamente. Quando aparecer Objetivo cumprido!, clique em Próxima parte.
```


**Recado na página (não gravar):** Agora prepare o relógio da dificuldade! Crie um relógio de 5 segundos com um Se jogando, separado dos outros dois. Depois, clique em Verificar projeto e, em seguida, em Próxima parte.

## Seção 4. Diminua a base até o limite

### Clipe `video-acelerador-e-freio` · Diminua a base até o limite

**Estimativa de gravação:** aproximadamente 4 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Clipe:** `video-acelerador-e-freio`

**Na tela:** Mostrar o projeto no estado de entrada. Na abertura não há teste no jogo, porque o efeito desta parte ainda não aparece: a fala só lembra a experiência e anuncia a montagem. Em cada “Olha aqui”, “Olha só” ou “Repare”, apontar na tela o lugar, o bloco ou o resultado citado. Localizar cada destino antes de buscar a peça. Mostrar campos, encaixes e testes sem cortes. Ao terminar, clicar em Verificar projeto, mostrar Objetivo cumprido! e seguir o encaminhamento narrado (Próxima parte).

**Fala para ElevenLabs:**

```text
[engaging, energetic, conversational voice] Lembra da experiência da primeira parte desta aula? Com a pergunta ligada, a base parou no -9. Agora a gente vai programar esse limite!

[curious] Agora são duas perguntas, uma dentro da outra: primeiro, a partida já começou? Se sim, a base ainda é maior que -9?

[confident, clear, unhurried voice] Deixe à vista o espaço vazio do então de Se jogando, no relógio de 5 segundos.

[confident, clear, unhurried voice] Agora abra Programação e depois Lógica e Se, pegue outro bloco Se e solte nesse espaço.

[engaging, energetic, conversational voice] Desta vez, mantenha a comparação que veio nele, porque você vai usar essa pergunta. É ela que vai perguntar se a base ainda é maior que -9.

[confident, clear, unhurried voice] Agora deixe à vista o x do lado esquerdo da comparação. Abra Programação e depois Valores, pegue o bloco valor da variável e solte em cima desse x.

[engaging, energetic, conversational voice] Ele também chega com x: clique nele e escolha velocidade.

[curious] Até onde a velocidade pode mudar?

[engaging, energetic, conversational voice] Até -9. Por isso, a pergunta vai ser: velocidade maior que -9? O sinal já chega como maior que: mantenha.

[engaging, energetic, conversational voice] No lado direito, clique no 0 e troque por -9.

[engaging, energetic, conversational voice] Lembra da régua da aula anterior? -5 fica à direita de -9, por isso é maior. A resposta é sim enquanto a base não chega em -9, e vira não quando ela chega lá.

[confident, clear, unhurried voice] Agora deixe à vista o espaço vazio do então do Se de dentro. Abra Programação e depois Variáveis, pegue o bloco Somar em variável e solte ali.

[confident, clear, unhurried voice] Repare: ele chega com contador. Clique em contador e escolha velocidade. Depois, clique no 1 e troque por -1.

[engaging, energetic, conversational voice] É este bloco que diminui a base em 1. Somar -1 deixa a base menor, e base menor é cacto mais rápido.

[upbeat, encouraging voice] Agora teste uma partida longa. [confident, clear, unhurried voice] Repare: os cactos novos vão ficando mais rápidos aos poucos, e os que já nasceram guardam a velocidade que receberam. [reassuring, encouraging voice] Se no seu jogo não aconteceu isso, volte aos blocos e confira se ficou assim: no relógio de 5 segundos, o Se jogando tem dentro dele o Se velocidade maior que -9, e só dentro desse Se fica Somar -1 em velocidade, o único bloco de soma dessa variável. [reassuring, encouraging voice] Depois de corrigir, teste de novo.

[engaging, energetic, conversational voice] Se você perder cedo, tudo bem: a comparação completa você já viu na experiência da primeira parte desta aula.

[engaging, energetic, conversational voice] Funcionou? Clique em Verificar projeto. Se faltar alguma coisa, corrija os blocos e clique novamente. Quando aparecer Objetivo cumprido!, clique em Próxima parte.
```

**Substituições na edição kids:**

| ID | Personagem | Ocorrência | Âncora anterior | Fala exata substituída | Âncora posterior | Tags |
| --- | --- | --- | --- | --- | --- | --- |
| video-acelerador-e-freio-K1 | Debinha | 1 | pegue o bloco valor da variável e solte em cima desse x. Ele também chega com x: clique nele e escolha velocidade. | Até onde a velocidade pode mudar? | Até -9. Por isso, a pergunta vai ser: velocidade maior que -9? O sinal já chega como maior que: mantenha. No lado | [curious] |

No adulto, manter toda a fala da professora. No kids, silenciar apenas o trecho marcado e substituir pelo áudio do personagem, sem sobrepor vozes.

**Imagem nas substituições kids (não gravar):**

- `video-acelerador-e-freio-K1`: entrada — Concluir o gesto descrito pela professora e manter à vista o bloco ou o resultado que ela acabou de mostrar. Não iniciar o próximo passo antes da reação. Saída — Retomar a demonstração somente depois da saída do avatar, no ritmo da próxima fala. Manter livres os campos, os encaixes e o resultado do teste.


**Recado na página (não gravar):** Agora faça a corrida acelerar até um limite! No relógio de 5 segundos, some -1 em velocidade só enquanto a base for maior que -9. Depois, clique em Verificar projeto e, em seguida, em Próxima parte.

## Seção 5. Complete a descrição dos controles

### Clipe `video-descricao-completa` · Complete a descrição dos controles

**Estimativa de gravação:** aproximadamente 2 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Clipe:** `video-descricao-completa`

**Na tela:** Mostrar o projeto no estado de entrada. Localizar cada destino antes de buscar a peça. Mostrar campos, encaixes e testes sem cortes. Ao terminar, clicar em Verificar projeto, mostrar Objetivo cumprido! e seguir o encaminhamento narrado (Próxima parte).

**Fala para ElevenLabs:**

```text
[engaging, energetic, conversational voice] O seu jogo aceita três controles de pulo: a barra de espaço, a seta para cima e um toque na parte de cima da tela. Mas repare: a descrição que você escreveu na aula 2 fala só do espaço, e quem usa o leitor de tela não fica sabendo dos outros dois jeitos. Por isso, vamos completar essa frase.

[confident, clear, unhurried voice] Deixe à vista o bloco Descrever o jogo para leitor de tela, em Ao iniciar. No texto, apague a frase antiga e escreva esta, exatamente assim, sem ponto no fim: Corra com o dino e pule os cactos com espaço, seta pra cima ou tocando na tela.

[confident, clear, unhurried voice] Confira se ficou assim: em Ao iniciar, a descrição tem a frase inteira, com o que fazer e os três controles. Depois, teste os três controles no jogo. A descrição só conta como se joga: ela não cria nenhum controle novo.

[engaging, energetic, conversational voice] Funcionou? Clique em Verificar projeto. Se faltar alguma coisa, corrija os blocos e clique novamente. Quando aparecer Objetivo cumprido!, clique em Próxima parte.
```


**Recado na página (não gravar):** Agora complete a descrição do seu jogo! Troque a descrição pela frase Corra com o dino e pule os cactos com espaço, seta pra cima ou tocando na tela, sem ponto no fim. Depois, clique em Verificar projeto e, em seguida, em Próxima parte.

## Seção 6. Confira o que você construiu

**Recado na página (não gravar):** Hora de lembrar o que você construiu! As perguntas falam dos sorteios e da dificuldade da corrida. Depois de clicar em Responder!, leia as explicações: se alguma resposta não estiver certa, é só clicar em Tentar de novo! e responder outra vez. Quando acertar todas, clique em Próxima parte.

Sem vídeo ou ferramenta nesta parte. O quiz vem imediatamente depois do Zappy. Leia a explicação após enviar; tentativas ilimitadas, sem espera.

## Seção 7. Teste e envie seu jogo

### Clipe `video-entrega` · Teste e envie seu jogo

**Estimativa de gravação:** aproximadamente 3 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Clipe:** `video-entrega`

**Na tela:** Mostrar o projeto no estado de entrada. Em cada “Olha aqui”, “Olha só” ou “Repare”, apontar na tela o lugar, o bloco ou o resultado citado. Localizar cada destino antes de buscar a peça. Mostrar campos, encaixes e testes sem cortes. Ao terminar, clicar em Verificar projeto, mostrar Objetivo cumprido! e seguir o encaminhamento narrado (Enviar meu projeto, Enviar, Projeto enviado! e Concluir aula). Na publicação opcional, mostrar Compartilhar com o resumo já preenchido, Gerar capa, Publicar e a comemoração Seu jogo está no Mural!, com o botão Copiar link de jogar.

**Fala para ElevenLabs:**

```text
[interested, animated voice] Olha só: o seu Corre, Dino! já tem começo, pulo com som, cactos, pontos, derrota, recomeço e uma corrida que fica mais rápida! Antes de enviar, teste esse ciclo inteiro, por tecla e por toque, no projeto que você construiu. Para começar por tecla, clique em Atualizar e use a tecla sem clicar no jogo.

[engaging, energetic, conversational voice] O limite segura só a base: o sorteio ainda pode tirar mais 1 e deixar um cacto um pouco mais rápido.

[engaging, energetic, conversational voice] Depois de uma derrota, confira o recomeço: os pontos voltam a zero, a base volta a -5 e a abertura aparece. Comece outra partida e confira os três controles.

[pleased, lively voice] Pronto: você programou o pulo, os cactos, a batida, os pontos e a corrida que acelera, tudo funcionando junto!

[engaging, energetic, conversational voice] Funcionou? Clique em Verificar projeto. Se faltar alguma coisa, corrija os blocos e clique novamente. Quando aparecer Objetivo cumprido!, clique em Enviar meu projeto e confirme em Enviar.

[engaging, energetic, conversational voice] Agora, se quiser, você pode mostrar o seu jogo no Mural, ou deixar para outra hora. Se precisar, peça ajuda a um adulto. Para publicar, clique em Compartilhar depois do envio.

[engaging, energetic, conversational voice] O resumo do projeto já vem preenchido. Deixe como está.

[engaging, energetic, conversational voice] Depois, clique em Gerar capa e confira a imagem.

[engaging, energetic, conversational voice] Com a capa pronta, clique em Publicar e espere a confirmação. [pleased, lively voice] Seu jogo está no Mural! Agora você, sua família e seus amigos podem jogar o jogo que você criou.

[confident, clear, unhurried voice] Clique em Copiar link de jogar e mande o link para a sua família e os seus amigos, porque quem receber pode jogar direto, até no celular. Depois de copiar o link, clique em Fechar. Por último, clique em Concluir aula.
```


**Recado na página (não gravar):** Hora de testar e enviar o seu Corre, Dino! Teste a corrida inteira, clique em Verificar projeto e depois em Enviar meu projeto, confirmando em Enviar. Se quiser, mostre o seu jogo no Mural e, por último, clique em Concluir aula.
