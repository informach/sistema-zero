# Roteiro de produção · Dê três vidas à nave

**Produção:** a professora grava toda a fala principal. Na montagem kids, Debinha substitui somente os trechos da tabela, com a mesma frase e sem voz sobreposta. O master funciona sozinho no adulto. Notas e recados da página não são gravados. [Direção de voz e edição](../../../aulas-interativas-tecnico/DIRETRIZES-VOZ-ELEVENLABS.md).

## Seção 1. Compare quando dar as vidas

### Clipe `video-vidas-no-comeco` · Compare quando dar as vidas

**Estimativa de gravação:** aproximadamente 2 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Clipe:** `video-vidas-no-comeco`

**Na tela:** Demonstração: o narrador faz cada teste no ritmo da fala, na primeira pessoa, e mostra o resultado real. Colocar Dar três vidas à nave em Ao iniciar, clicar em Começar o jogo e acompanhar os corações apagando até Vidas: 0 · Batidas: 3 e Teste encerrado. Levar a peça para Enquanto estiver rodando, clicar em Começar o jogo e mostrar os corações voltando para 3 no quadro depois de cada batida e Vidas: 2 no fim, porque a última batida cai no último quadro. Terminar em Agora é a sua vez e Próxima parte, sem palpite nem pergunta final.

**Fala para ElevenLabs:**

```text
[engaging, energetic, conversational voice] Esta é a mesma experiência da primeira aula, agora para a gente entender onde as vidas da nave devem ser dadas. Aqui, uma pedra bate na nave de tempos em tempos.

[interested, animated voice] Olha aqui: eu coloco Dar três vidas à nave em Ao iniciar e clico em Começar o jogo. A nave começa com 3 vidas, e cada batida apaga um coração. Tá vendo? No fim do teste, a tela mostra Vidas: 0 e Batidas: 3, porque as vidas foram dadas uma vez, no começo, e cada batida tirou uma vida.

[curious] E se eu der as vidas o tempo todo?

[engaging, energetic, conversational voice] Agora eu levo a mesma peça para Enquanto estiver rodando e clico em Começar o jogo. [confident, clear, unhurried voice] Repare: a batida apaga um coração, mas, no quadro seguinte, as vidas voltam para 3. No fim do teste, aparece Vidas: 2, porque a última batida foi bem no último quadro. Ou seja, a peça devolve as vidas o tempo todo, e a nave nunca perderia. Por isso, no seu jogo, as vidas vão ser dadas em Ao iniciar.

[upbeat, encouraging voice] Agora é a sua vez: faça esses mesmos testes na experiência. Quando terminar, clique em Próxima parte.
```

**Substituições na edição kids:**

| ID | Personagem | Ocorrência | Âncora anterior | Fala exata substituída | Âncora posterior | Tags |
| --- | --- | --- | --- | --- | --- | --- |
| video-vidas-no-comeco-K1 | Debinha | 1 | a tela mostra Vidas: 0 e Batidas: 3, porque as vidas foram dadas uma vez, no começo, e cada batida tirou uma vida. | E se eu der as vidas o tempo todo? | Agora eu levo a mesma peça para Enquanto estiver rodando e clico em Começar o jogo. Repare: a batida apaga um coração, | [curious] |

No adulto, manter toda a fala da professora. No kids, silenciar apenas o trecho marcado e substituir pelo áudio do personagem, sem sobrepor vozes.

**Imagem nas substituições kids (não gravar):**

- `video-vidas-no-comeco-K1`: entrada — Concluir o teste em Ao iniciar com Vidas: 0 e Batidas: 3. Saída — Levar a peça para Enquanto estiver rodando e mostrar o resultado real, inclusive Vidas: 2 no último quadro.


**Recado na página (não gravar):** Sua vez! Compare Dar três vidas à nave em Ao iniciar e em Enquanto estiver rodando, esperando cada teste parar e olhando os corações. Quando terminar, clique em Próxima parte.

## Seção 2. Dê e mostre as três vidas

### Clipe `video-vidas` · Dê e mostre as três vidas

**Estimativa de gravação:** aproximadamente 3 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Clipe:** `video-vidas`

**Na tela:** Começar pela retomada: no "Tá vendo?", mostrar a tela sem corações. Dar as vidas em Ao iniciar e desenhar os corações depois do placar. Mostrar três corações. Ainda não montar nem simular perda de vida. Ao terminar, clicar em Verificar projeto, mostrar Objetivo cumprido! e seguir o encaminhamento narrado.

**Fala para ElevenLabs:**

```text
[engaging, energetic, conversational voice] Olhe a tela do seu jogo. Tá vendo? Não tem nenhum coração, porque a nave ainda não tem vidas.

[engaging, energetic, conversational voice] Lembra da experiência da parte anterior? Com as vidas em Ao iniciar, cada batida tirava uma vida, sem devolver depois. Agora a gente vai dar três vidas à nave do seu jogo!

[engaging, energetic, conversational voice] As vidas são dadas uma vez, quando o jogo começa, no fim de Ao iniciar: deixe esse lugar à vista, logo depois de Criar variável pontos.

[confident, clear, unhurried voice] Agora abra Jogo 2D, depois Vida e placar e depois Vida, e pegue o bloco Dar ao sprite de vida. Arraste e solte no fim de Ao iniciar. Escolha nave. O número já vem em 3: mantenha, porque a nave começa com três vidas.

[curious] E como eu vejo quantas vidas tenho?

[engaging, energetic, conversational voice] Agora os corações, que precisam ser desenhados em todo quadro. Deixe à vista o fim de A cada quadro do jogo, logo depois do placar. Abra Jogo 2D, depois Vida e placar e depois Vida, pegue o bloco Desenhar as vidas do sprite e solte nesse lugar.

[engaging, energetic, conversational voice] Escolha nave. O formato já vem corações, em x 12, y 48 e tamanho 22: mantenha. Depois, escolha vermelho.

[interested, animated voice] Olha só: aparecem três corações na tela, logo abaixo do placar!

[reassuring, encouraging voice] Se no seu jogo não aconteceu isso, volte aos blocos e confira se ficou assim: no fim de Ao iniciar está Dar ao sprite nave 3 de vida, e, no fim de A cada quadro do jogo, depois do placar, está Desenhar as vidas do sprite nave como corações, em x 12, y 48 e tamanho 22. [reassuring, encouraging voice] Depois de corrigir, teste de novo.

[engaging, energetic, conversational voice] Funcionou? Clique em Verificar projeto. Se faltar alguma coisa, corrija os blocos e clique novamente. Quando aparecer Objetivo cumprido!, clique em Próxima parte.
```

**Substituições na edição kids:**

| ID | Personagem | Ocorrência | Âncora anterior | Fala exata substituída | Âncora posterior | Tags |
| --- | --- | --- | --- | --- | --- | --- |
| video-vidas-K1 | Debinha | 1 | e solte no fim de Ao iniciar. Escolha nave. O número já vem em 3: mantenha, porque a nave começa com três vidas. | E como eu vejo quantas vidas tenho? | Agora os corações, que precisam ser desenhados em todo quadro. Deixe à vista o fim de A cada quadro do jogo, logo | [curious] |

No adulto, manter toda a fala da professora. No kids, silenciar apenas o trecho marcado e substituir pelo áudio do personagem, sem sobrepor vozes.

**Imagem nas substituições kids (não gravar):**

- `video-vidas-K1`: entrada — Concluir o gesto descrito pela professora e manter à vista o bloco ou o resultado que ela acabou de mostrar. Não iniciar o próximo passo antes da reação. Saída — Retomar a demonstração somente depois da saída do avatar, no ritmo da próxima fala. Manter livres os campos, os encaixes e o resultado do teste.


**Recado na página (não gravar):** Agora dê três vidas à sua nave! Coloque as vidas em Ao iniciar, desenhe os corações em cada quadro e clique em Verificar projeto. Depois, clique em Próxima parte.

## Seção 3. Compare as batidas com proteção

### Clipe `video-protecao` · Compare as batidas com proteção

**Estimativa de gravação:** aproximadamente 2 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Clipe:** `video-protecao`

**Na tela:** Demonstração: o narrador faz cada teste no ritmo da fala, na primeira pessoa, e mostra o resultado real. Apontar 0, 45 e 15 no seletor. A cena tem batidas nos quadros 1, 10 e 30; 15 permite ver expirar. Com 0 quadros, clicar três vezes em Avançar até a próxima pedra e mostrar as vidas de 3 a 0. Voltar ao começo, repetir com 45 e mostrar 36 e 16 quadros restando nas batidas 10 e 30, com 2 vidas no fim. Voltar ao começo, repetir com 15 e mostrar 6 quadros restando na batida 10 e a vida caindo na batida 30. Não prometer que a cena reproduz 45 quadros de jogo real em segundos. Terminar em Agora é a sua vez e Próxima parte, sem palpite nem pergunta final.

**Fala para ElevenLabs:**

```text
[engaging, energetic, conversational voice] Esta é uma experiência para a gente entender a proteção depois de uma batida: um tempinho em que outra batida não tira vida. Aqui, as pedras batem nos quadros 1, 10 e 30.

[interested, animated voice] Olha aqui: eu escolho 0 quadros em Proteção em quadros e clico em Avançar até a próxima pedra três vezes. Tá vendo? Cada batida apaga um coração, e a nave fica sem vidas, porque, sem proteção, as três batidas tiram as três vidas.

[engaging, energetic, conversational voice] Eu clico em Voltar ao começo, escolho 45 quadros e repito as três batidas. A primeira tira uma vida, e a proteção começa com 45 quadros. [confident, clear, unhurried voice] Repare: na batida do quadro 10, ainda restam 36 quadros de proteção, e a vida não cai. Na do quadro 30, ainda restam 16. Ou seja, só a primeira batida tirou vida.

[curious] E quando esse tempinho de proteção acabar?

[engaging, energetic, conversational voice] Por último, eu volto ao começo e escolho 15 quadros. A primeira batida tira uma vida, e, na batida do quadro 10, restam 6 quadros, por isso a vida não cai. Mas, no quadro 30, a proteção já acabou, e olha só: essa batida tira outra vida. Durante esse intervalo, outra batida não tira vida. No seu jogo, a batida vai dar 45 quadros de proteção.

[upbeat, encouraging voice] Agora é a sua vez: faça esses mesmos testes na experiência. Quando terminar, clique em Próxima parte.
```

**Substituições na edição kids:**

| ID | Personagem | Ocorrência | Âncora anterior | Fala exata substituída | Âncora posterior | Tags |
| --- | --- | --- | --- | --- | --- | --- |
| video-protecao-K1 | Debinha | 1 | 36 quadros de proteção, e a vida não cai. Na do quadro 30, ainda restam 16. Ou seja, só a primeira batida tirou vida. | E quando esse tempinho de proteção acabar? | Por último, eu volto ao começo e escolho 15 quadros. A primeira batida tira uma vida, e, na batida do quadro 10, restam | [curious] |

No adulto, manter toda a fala da professora. No kids, silenciar apenas o trecho marcado e substituir pelo áudio do personagem, sem sobrepor vozes.

**Imagem nas substituições kids (não gravar):**

- `video-protecao-K1`: entrada — Concluir as três batidas com proteção de 45 quadros; manter os corações e o tempo restante à vista. Saída — Voltar ao começo, escolher 15 quadros e mostrar a terceira batida tirando vida.


**Recado na página (não gravar):** Sua vez! Teste as três batidas com 0, 45 e 15 quadros de proteção, voltando ao começo entre os testes. Quando terminar, clique em Próxima parte.

## Seção 4. Programe as vidas e a batida

### Clipe `video-batida-e-coracoes` · Programe as vidas e a batida

**Estimativa de gravação:** aproximadamente 5 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Clipe:** `video-batida-e-coracoes`

**Na tela:** Começar pela retomada: deixar uma pedra bater na nave e, no "Tá vendo?", mostrar que os corações continuam três. Encaixar a colisão entre o placar e o desenho dos corações, com o destino à vista antes de abrir a paleta. Confirmar a ordem final original: placar, colisão da nave, corações. Ao terminar, clicar em Verificar projeto, mostrar Objetivo cumprido! e seguir o encaminhamento narrado.

**Fala para ElevenLabs:**

```text
[confident, clear, unhurried voice] Clique no seu jogo e deixe uma pedra bater na nave. Tá vendo? Os corações continuam três, porque a batida ainda não existe no jogo.

[engaging, energetic, conversational voice] Lembra da experiência da parte anterior? Cada batida tirava uma vida e dava um tempo de proteção. Agora a gente vai programar essa batida no seu jogo!

[engaging, energetic, conversational voice] O jogo confere a batida em todo quadro, antes de desenhar os corações, para eles já mostrarem a vida certa. Por isso, deixe à vista o espaço entre Mostrar placar e Desenhar as vidas do sprite, dentro de A cada quadro do jogo.

[confident, clear, unhurried voice] Agora abra Jogo 2D, depois Colisões e depois Encostar e bloquear, e pegue o bloco Para cada sprite do grupo que colidir com o sprite. Arraste e solte entre o placar e o desenho dos corações.

[curious] Qual pedra o jogo vai tirar?

[confident, clear, unhurried voice] Repare: o bloco já chega com o grupo asteroides, o sprite nave e, na linha de baixo, chamar o sprite de inimigo. Inimigo é o apelido da pedra que bateu na nave. [confident, clear, unhurried voice] Confira se ficou asteroides, nave e inimigo.

[engaging, energetic, conversational voice] Agora as ações da batida, que vão dentro dessa colisão. Deixe à vista o espaço de dentro dela. Abra Jogo 2D, depois Grupos e depois Participação e limpeza, pegue o bloco Tirar o sprite do grupo e solte nesse espaço. Escolha inimigo como sprite e asteroides como grupo, porque quem sai do jogo é a pedra, e não a nave.

[confident, clear, unhurried voice] Deixe à vista o encaixe logo abaixo da retirada. Abra Jogo 2D, depois Desenho e efeitos e depois Partículas, pegue o bloco Soltar explosão no sprite, solte nesse encaixe e escolha inimigo. Depois, escolha uma cor para a explosão.

[curious] Falta tirar a vida da nave, né?

[confident, clear, unhurried voice] Deixe à vista o encaixe logo abaixo da explosão. Abra Jogo 2D, depois Vida e placar e depois Vida, pegue o bloco Machucar o sprite em e deixá-lo invencível por quadros e solte nesse encaixe. Escolha nave. O dano já vem em 1, e a proteção, em 45 quadros: mantenha, porque cada batida tira uma vida e depois dá esse respiro.

[confident, clear, unhurried voice] Deixe à vista o encaixe logo abaixo do dano. Abra Jogo 2D, depois Desenho e efeitos e depois Efeitos, pegue o bloco Tremer a tela com intensidade e solte nesse encaixe. A intensidade já vem em 8: mantenha.

[upbeat, encouraging voice] Agora teste: clique na área do jogo e deixe uma pedra atingir a nave. [interested, animated voice] Olha só: a pedra sai, a tela treme e um coração apaga! Espere a proteção acabar e deixe outra pedra bater, para ver outro coração apagar. Por enquanto, ficar sem vidas ainda não encerra a partida: o fim da partida vem mais adiante.

[reassuring, encouraging voice] Se no seu jogo não aconteceu isso, volte aos blocos e confira se ficou assim: entre o placar e os corações está a colisão de asteroides com nave, com o apelido inimigo. Dentro dela vêm Tirar o sprite inimigo do grupo asteroides, Soltar explosão no sprite inimigo, Machucar o sprite nave em 1 e deixá-lo invencível por 45 quadros e Tremer a tela com intensidade 8, nessa ordem. [reassuring, encouraging voice] Depois de corrigir, teste de novo.

[engaging, energetic, conversational voice] Funcionou? Clique em Verificar projeto. Se faltar alguma coisa, corrija os blocos e clique novamente. Quando aparecer Objetivo cumprido!, clique em Próxima parte.
```

**Substituições na edição kids:**

| ID | Personagem | Ocorrência | Âncora anterior | Fala exata substituída | Âncora posterior | Tags |
| --- | --- | --- | --- | --- | --- | --- |
| video-batida-e-coracoes-K1 | Debinha | 1 | o bloco Para cada sprite do grupo que colidir com o sprite. Arraste e solte entre o placar e o desenho dos corações. | Qual pedra o jogo vai tirar? | Repare: o bloco já chega com o grupo asteroides, o sprite nave e, na linha de baixo, chamar o sprite de inimigo. | [curious] |
| video-batida-e-coracoes-K2 | Debinha | 1 | o bloco Soltar explosão no sprite, solte nesse encaixe e escolha inimigo. Depois, escolha uma cor para a explosão. | Falta tirar a vida da nave, né? | Deixe à vista o encaixe logo abaixo da explosão. Abra Jogo 2D, depois Vida e placar e depois Vida, pegue o bloco | [curious] |

No adulto, manter toda a fala da professora. No kids, silenciar apenas o trecho marcado e substituir pelo áudio do personagem, sem sobrepor vozes.

**Imagem nas substituições kids (não gravar):**

- `video-batida-e-coracoes-K1`: entrada — Concluir o gesto descrito pela professora e manter à vista o bloco ou o resultado que ela acabou de mostrar. Não iniciar o próximo passo antes da reação. Saída — Retomar a demonstração somente depois da saída do avatar, no ritmo da próxima fala. Manter livres os campos, os encaixes e o resultado do teste.
- `video-batida-e-coracoes-K2`: entrada — Concluir o gesto descrito pela professora e manter à vista o bloco ou o resultado que ela acabou de mostrar. Não iniciar o próximo passo antes da reação. Saída — Retomar a demonstração somente depois da saída do avatar, no ritmo da próxima fala. Manter livres os campos, os encaixes e o resultado do teste.


**Recado na página (não gravar):** Agora programe a batida na nave! Monte a colisão da nave com as pedras, com explosão, dano e tremor, e clique em Verificar projeto. Depois, clique em Próxima parte.

## Seção 5. Confira o que você construiu

**Recado na página (não gravar):** Hora de conferir o que você construiu! Responda sobre os pontos e a proteção da nave, pensando nos testes do seu jogo. Depois de enviar, leia as explicações e, se errar alguma, corrija e tente de novo. Quando acertar todas, clique em Próxima parte.

Sem vídeo ou ferramenta nesta parte. O quiz vem imediatamente depois do Zappy. Leia a explicação após enviar; tentativas ilimitadas, sem espera.

## Seção 6. Teste os pontos e as vidas

### Clipe `video-fecho` · Teste os pontos e as vidas

**Estimativa de gravação:** aproximadamente 2 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Clipe:** `video-fecho`

**Na tela:** Testar as duas colisões e inspecionar os encaixes, preservando os blocos anteriores. Ao terminar, clicar em Verificar projeto, mostrar Objetivo cumprido! e seguir o encaminhamento narrado.

**Fala para ElevenLabs:**

```text
[upbeat, encouraging voice] Agora teste os pontos e as vidas do seu jogo. Faça um tiro errar: os pontos têm que ficar iguais. Depois, acerte uma pedra e confira se soma um ponto. Por último, deixe uma pedra bater na nave e confira se ela perde uma vida.

[reassuring, encouraging voice] Se no seu jogo não aconteceu isso, volte aos blocos e confira se ficou assim: Criar variável pontos e Dar ao sprite nave 3 de vida estão em Ao iniciar, Somar 1 em pontos está na colisão do tiro, Machucar o sprite nave está na colisão da nave, e o placar e os corações estão fora das colisões, em A cada quadro do jogo. [reassuring, encouraging voice] Depois de corrigir, teste de novo.

[engaging, energetic, conversational voice] Funcionou? Clique em Verificar projeto. Se faltar alguma coisa, corrija os blocos e clique novamente. Quando aparecer Objetivo cumprido!, clique em Enviar meu projeto e confirme em Enviar. Quando aparecer Projeto enviado!, clique em Concluir aula.
```


**Recado na página (não gravar):** Hora de testar os pontos e as vidas! Confira um erro, um acerto e uma batida, clique em Verificar projeto e envie o seu projeto. Depois, clique em Concluir aula.
