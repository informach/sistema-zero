# Roteiro de gravação · Corre Dino · Aula 12 · Duas partidas nunca mais iguais

## Especificações

- **Formato:** gravação de tela com narração, no Estúdio embutido.
- **Duração:** 230 a 285 segundos de clipes; 516 palavras de narração, cerca de 3.8 minutos a 137 palavras por minuto. As pausas de observação e de trabalho na ferramenta ocupam o restante.
- **Calibração:** o jogo completo da Aula 11. Dino que corre, pula e faz barulho, cactos nascendo a cada 1,4 s em x 560 com vx -5, faxina tirando quem saiu, os três estados do jogo, colisão com área de 80%, placar de pontos e tela de fim com a marca. O raio-X da Aula 10 já foi retirado.
- **Conceitos nomeados:** sorteio de posição, conta matemática e sorteio de velocidade.
- **Dor desta aula:** Partidas repetem os mesmos cactos porque x, vx e intervalo têm sempre os mesmos números.
- **Vitória do dia:** o espaço entre um cacto e outro muda a cada nascimento, e uns cactos vêm um pouco mais rápidos que os outros. O jogo dela deixa de ser decorável.
- **Valores:** Conferir base vx -5 e relógio 1.4; x sorteado entre 500 e 560; vx igual a -5 menos sorteio de 0 a 1.
- **Campos livres:** Nenhum campo livre na construção guiada desta aula.
- **Nota de produção:** Mostrar partidas repetidas antes da solução. Manter 500 e 560 à direita do limite 480, na mesma escala.
- **O que NÃO entra, e por quê:** Não mudar o relógio para simular variedade; a diferença vem dos sorteios.

## Seção 1. Dá para decorar o seu jogo

### Clipe `video-padrao-fixo` · Dá para decorar o seu jogo
**Duração alvo:** 60 a 75 segundos · **Palavras:** 114

**Na tela:** Mostrar várias partidas curtas, uma após a outra, com cactos percorrendo lugares e tempos iguais.

**Narração:**
> "Joga de novo e repara nos cactos. Outra partida, o mesmo caminho. Mais uma, e eles chegam na
> mesma ordem. Dá para decorar quando pular, porque o jogo repete sempre a mesma instrução."

**Na tela:** Abrir No grupo criar obstáculo e relógio; apontar x 560, vx -5 e intervalo 1.4.

**Narração:**
> "Olha os três números que mandam nisso: x **560**, vx **menos 5** e relógio **1.4**. Mesmo
> lugar, mesma velocidade, mesmo tempo. O computador está fazendo certinho o que a gente mandou,
> sempre a mesma coisa."

**Na tela:** Conferir no projeto do aluno vx -5 e relógio 1.4, corrigindo se necessário.

**Narração:**
> "Confere no seu projeto: o vx do criador precisa estar em **menos 5** e o relógio dos cactos
> em **1.4**. Se algum estiver diferente, põe esses números agora. Hoje vamos manter o tempo e
> pedir que o jogo sorteie o lugar e a velocidade."

## Seção 3. Cada cacto nasce num lugar diferente

### Clipe `video-sortear-lugar` · Um número sorteado, e o ritmo inteiro muda
**Duração alvo:** 55 a 65 segundos · **Palavras:** 148

**Na tela:** Abrir Jogo 2D > Sorteios > Números e posições; pegar um número de a como bloco de valor.

**Narração:**
> "Primeiro o lugar. Em **Jogo 2D**, abre **Sorteios**, depois **Números e posições**. Pega **um
> número de a**. Essa peça devolve um número diferente dentro da faixa que você escolher."

**Na tela:** Arrastar por cima do 560 no x do No grupo criar obstáculo, dentro do relógio de 1.4.

**Narração:**
> "Arrasta a peça por cima do **560** no campo x do **No grupo criar obstáculo**, dentro do
> relógio de **1.4**. É um bloco de valor: ele substitui o número que estava no espaço, em vez
> de ficar solto na pilha."

**Na tela:** Zoom nos dois campos do sorteio: trocar 1 e 6 por 500 e 560; mostrar limite 480.

**Narração:**
> "A faixa vem de **1 a 6**, como um dado. Troca por **500 a 560**. Os dois ficam depois do
> limite da tela, que é **480**. Todo cacto continua nascendo fora do quadro, só que agora em
> lugares diferentes."

**Na tela:** Jogar sem cortes, mostrando intervalos aparentes diferentes; manter relógio 1.4.

**Narração:**
> "Olha a pista. O relógio continua batendo a cada **1.4 segundo**, mas um cacto nasce mais
> longe e demora mais a chegar; outro nasce mais perto. Um sorteio de lugar mudou a distância
> que você sente entre eles."

## Seção 4. Cada cacto ganha a sua velocidade

### Clipe `video-sortear-velocidade` · Menos 5, menos um pouquinho
**Duração alvo:** 60 a 75 segundos · **Palavras:** 149

**Na tela:** Mostrar vx -5 do criador; abrir Programação > Matemática e pegar Conta matemática.

**Narração:**
> "Agora a velocidade. Em **Programação**, abre **Matemática** e pega **Conta matemática**.
> Arrasta por cima do **menos 5** no campo vx do mesmo bloco que cria cactos."

**Na tela:** Zoom nos três pedaços da conta; abrir menu do sinal, escolher menos; no lado esquerdo, escrever -5.

**Narração:**
> "A conta tem dois espaços e um sinal no meio. O sinal vem no **mais**. Abre a lista e escolhe
> **menos**. No espaço da esquerda, escreve **menos 5** por cima do número de fábrica."

**Na tela:** Abrir Jogo 2D > Sorteios > Números e posições; encaixar outro um número de a no lado direito da conta, por cima do valor; trocar 1 e 6 por 0 e 1.

**Narração:**
> "No espaço da direita entra outro sorteio. Em **Jogo 2D**, abre **Sorteios**, depois **Números
> e posições**. Pega **um número de a**, encaixa por cima do valor da direita e troca a faixa de
> **1 a 6** por **0 a 1**."

**Na tela:** Ler conta montada e mostrar cactos de velocidades diferentes.

**Narração:**
> "Lê o bloco inteiro: **menos 5 menos um número sorteado entre zero e um**. Se sair zero, o vx
> fica menos 5. Se sair um, fica menos 6. Na experiência você já viu qual chega mais longe.
> Agora olha duas partidas: o movimento deixa de repetir o mesmo ritmo."

## Seção 5. Teste, entregue e guarde as duas ideias

### Clipe `video-teste-e-envio` · Dois sorteios em partidas diferentes
**Duração alvo:** 55 a 70 segundos · **Palavras:** 105

**Na tela:** Jogar três partidas curtas sem mexer no relógio; enquadrar a borda direita e dois cactos seguidos.

**Narração:**
> "Vamos conferir os dois sorteios em partidas diferentes. Todo cacto ainda nasce fora da tela e
> anda para a esquerda. Às vezes dois lugares podem se repetir; sorteio permite repetir, e isso
> não é erro."

**Na tela:** Mostrar x 500 a 560 e conta vx -5 menos 0 a 1; conferir objetivos.

**Narração:**
> "Confere as faixas no bloco: x de **500 a 560**, vx com **menos 5 menos um número de zero a
> um**. O relógio continua em **1.4**. O jogo escolhe novos números quando cria cada cacto."

**Na tela:** Esperar Salvo, clicar Enviar para o professor; fechar com jogo rodando.

**Narração:**
> "Quando os objetivos estiverem certos, espera **Salvo** e clica em **Enviar para o
> professor**. Hoje você trocou números fixos por duas faixas. Na última aula, a velocidade base
> vai mudar também enquanto você joga."
