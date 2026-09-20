# Roteiro de gravação · Corre Dino · Aula 06 · O medidor mostra o que ninguém vê

## Especificações

- **Formato:** gravação de tela com narração, no Estúdio embutido.
- **Duração:** 260 a 320 segundos de clipes; 652 palavras de narração, cerca de 4.8 minutos a 137 palavras por minuto. As pausas de observação e de trabalho na ferramenta ocupam o restante.
- **Calibração:** o jogo já parece jogo. Em `Ao iniciar`: `Preparar o jogo em tela cheia, tela 480 × 270, fundo azul-claro`, `Criar dinossauro dino em x 110 y 150 tamanho 64` e `Criar grupo de sprites cactos`. Em `Quando acontecer`: `Quando o sprite dino pular` com `Tocar efeito` com `pulo`. Em `Enquanto estiver rodando`: um `A cada quadro do jogo` com sete blocos e, ao lado dele, um `A cada 1.4 segundos fazer` com `No grupo cactos criar obstáculo cacto em x 560 tamanho 44 com vx -5`. Os cactos entram, passam e somem pela esquerda.
- **Conceitos nomeados:** medidor, quantidade de sprites, faxina e leitura antes e depois da correção.
- **Dor desta aula:** A contagem do grupo sobe sem voltar no ritmo normal; 0.1 segundo só acelera um problema que já existia.
- **Vitória do dia:** o medidor deixa de subir sem parar e passa a subir e descer, equilibrado. É a primeira vez que ela vê um número contando uma coisa que a tela esconde.
- **Valores:** Relógio começa 1.4, vai a 0.1 e 0.5 para comparar, e termina em 1.4. Grupo cactos, apelido cacto.
- **Campos livres:** Cor contrastante do medidor temporário.
- **Nota de produção:** Segurar a leitura em 1.4 antes de acelerar. Não prometer contagem zero. Retirar o medidor, mas manter a faxina.
- **O que NÃO entra, e por quê:** Não deixar o relógio acelerado nem o placar provisório no projeto final.

## Seção 1. O que a gente vai fazer hoje

### Clipe `video-abertura` · Tem uma coisa acontecendo que você não vê
**Duração alvo:** 25 a 35 segundos · **Palavras:** 64

**Na tela:** Deixar o jogo da Aula 5 rodar: cacto entra, Dino pula, nada parece errado.

**Narração:**
> "Olha o seu jogo. Cactos vindo, Dino pulando, tudo funcionando. Só que uma coisa está
> acontecendo aí dentro que a tela não mostra. Hoje vamos construir um medidor para enxergar
> essa coisa."

**Na tela:** Manter a pista em movimento sem revelar o número.

**Narração:**
> "Depois que a gente conseguir ver o que acontece, vai dar para consertar e conferir se o
> conserto funcionou. O jogo pode terminar com a mesma aparência, mas funcionando melhor por
> dentro."

## Seção 2. Um medidor para ver o invisível

### Clipe `video-medidor` · Um medidor para o invisível
**Duração alvo:** 60 a 70 segundos · **Palavras:** 188

**Na tela:** Abrir Jogo 2D > Vida e placar > Indicadores e texto na tela; encaixar Mostrar placar no motor, logo abaixo de Desenhar o grupo cactos.

**Narração:**
> "Vamos pegar um instrumento emprestado. Em **Jogo 2D**, abre **Vida e placar**, depois
> **Indicadores e texto na tela**. Pega **Mostrar placar** e encaixa dentro do **A cada quadro
> do jogo**, logo abaixo do **Desenhar o grupo cactos**."

**Na tela:** Zoom no texto do placar; trocar Pontos: por Cactos.

**Narração:**
> "O primeiro campo é o texto. Apaga o que veio e escreve **Cactos**. Assim o número vai dizer
> claramente o que ele conta. Esse placar é provisório; ele é um medidor para a nossa
> investigação."

**Na tela:** Abrir Jogo 2D > Grupos > Criar e percorrer; arrastar quantos sprites tem no grupo por cima do valor de fábrica do Mostrar placar; escolher cactos.

**Narração:**
> "No valor entra a contagem. Em **Jogo 2D**, abre **Grupos**, depois **Criar e percorrer**.
> Pega **quantos sprites tem no grupo** e arrasta por cima do número que já está no campo do
> valor. Escolhe **cactos** no bloco que contou."

**Na tela:** Zoom nos demais campos do Mostrar placar: x 12, y 30, cor e tamanho 24; escolher azul escuro.

**Narração:**
> "No x vem **12** e no y vem **30**; deixa os dois, que põem o medidor no canto. A cor eu
> escolho azul escuro, porque o céu é claro e preciso ler o número. Escolhe uma que contraste
> com o seu fundo. O tamanho vem em **24**; deixa assim."

**Na tela:** Mostrar o número surgindo no jogo.

**Narração:**
> "Olha o número no canto. O bloco de contar sabe quantos cactos existem, e o Mostrar placar
> sabe escrever isso na tela. Juntos, eles viraram o nosso medidor."

## Seção 3. O número que só sobe

### Clipe `video-provocar` · O número que só sobe
**Duração alvo:** 35 a 45 segundos · **Palavras:** 117

**Na tela:** Com o relógio em 1.4, deixar o medidor à vista por vários segundos, sem cortes.

**Narração:**
> "No ritmo normal do jogo, com o relógio em **1.4**, já dá para ver o problema. O número sobe
> devagar e não desce quando os cactos saem pela esquerda. Vamos observar mais um pouco antes de
> mexer."

**Na tela:** Zoom no relógio; trocar 1.4 por 0.1 e confirmar; manter medidor no quadro.

**Narração:**
> "Vou apressar o relógio de propósito, só para ver em segundos o que demoraria mais. No relógio
> **A cada 1.4 segundos** dos cactos, troca **1.4** por **0.1**. Agora lê o medidor: vinte,
> cinquenta, cem. Continua subindo."

**Na tela:** Mostrar cactos saindo pela esquerda enquanto contagem sobe.

**Narração:**
> "O cacto some da sua vista, mas continua dentro do grupo. O jogo ainda tenta mover e desenhar
> um monte de cactos que ninguém vai ver. Isso já acontecia antes do 0.1. O medidor só tornou o
> problema visível."

## Seção 5. A faxina

### Clipe `video-faxina` · O número sobe e desce
**Duração alvo:** 70 a 85 segundos · **Palavras:** 132

**Na tela:** Abrir Jogo 2D > Grupos > Participação e limpeza; apontar Tirar do grupo quem sair da tela, para cada um.

**Narração:**
> "Agora vem a **faxina**. Em **Jogo 2D**, abre **Grupos**, depois **Participação e limpeza**.
> Pega **Tirar do grupo quem sair da tela, para cada um**."

**Na tela:** Encaixar no A cada quadro do jogo, entre Desenhar o grupo cactos e Mostrar placar do medidor.

**Narração:**
> "Encaixa dentro do **A cada quadro do jogo**, **entre Desenhar o grupo cactos e Mostrar
> placar**. Primeiro a faxina tira quem foi embora; depois o medidor lê o grupo."

**Na tela:** Zoom nos campos e no interior vazio: grupo cactos, apelido de sprite para cacto, espaço fazer vazio.

**Narração:**
> "No grupo, escolhe **cactos**. O apelido vem como **sprite**; troca por **cacto**. O espaço de
> fazer fica vazio nesta aula. Ele está ali para outra ação possível, mas hoje só queremos
> retirar quem saiu da tela."

**Na tela:** Mostrar medidor em 0.1 subindo e descendo, sem zerar; depois trocar relógio para 0.5 e comparar.

**Narração:**
> "Olha o número: agora ele sobe **e desce**. Não precisa chegar a zero, porque novos cactos
> continuam nascendo. Troca o relógio por **0.5** e observa: a contagem oscila mais baixo. Em
> dois ritmos, ela parou de crescer sem fim. O conserto funcionou."

## Seção 6. Devolve o relógio, guarda o medidor e entrega

### Clipe `video-aposentar-medidor` · O instrumento a gente guarda
**Duração alvo:** 70 a 85 segundos · **Palavras:** 151

**Na tela:** No relógio, devolver 0.5 para 1.4, confirmar; ler a contagem baixa e oscilante.

**Narração:**
> "O teste acabou. Devolve o relógio dos cactos para **1.4** e clica fora. Esse é o ritmo do seu
> jogo daqui para a frente. O medidor ainda mostra um número baixo, que sobe e desce devagar."

**Na tela:** Mostrar Mostrar placar com quantos sprites tem no grupo encaixado; arrastar o placar inteiro para a lixeira.

**Narração:**
> "O medidor fez o trabalho dele: revelou o problema e provou o conserto. Agora arrasta
> **Mostrar placar** para a lixeira. O bloco de contar vai junto porque está encaixado nele. A
> faxina, que está na pilha do quadro, fica."

**Na tela:** Mostrar motor final e partida curta, sem número sobreposto.

**Narração:**
> "Olha a pilha: o **A cada quadro do jogo** termina na faxina. No jogo, cactos ainda entram e
> saem, mas nenhum número cobre a partida. Por dentro, quem saiu da tela é descartado."

**Na tela:** Conferir objetivos; esperar Salvo e clicar Enviar para o professor.

**Narração:**
> "Confere os objetivos: relógio em **1.4**, faxina no quadro e medidor retirado. Espera
> **Salvo** e clica em **Enviar para o professor**. Hoje você mediu, consertou e mediu de novo.
> É assim que a gente descobre se uma mudança resolveu de verdade."
