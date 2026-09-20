# Roteiro de gravação · Corre Dino · Aula 07 · O jogo aprende a esperar

## Especificações

- **Formato:** gravação de tela com narração, no Estúdio embutido.
- **Duração:** 280 a 345 segundos de clipes; 694 palavras de narração, cerca de 5.1 minutos a 137 palavras por minuto. As pausas de observação e de trabalho na ferramenta ocupam o restante.
- **Calibração:** o jogo roda sem começo. O dino corre, pula e faz som, os cactos nascem a cada 1,4 segundo, andam e saem do grupo pela faxina. O medidor da Aula 6 e o `Mostrar placar` emprestado já saíram. Nada no jogo sabe que existe um antes e um depois: quem recarrega a página cai no meio da correria.
- **Conceitos nomeados:** estados do jogo, pergunta de estado, embrulhar no Se.
- **Dor desta aula:** Ao recarregar, a partida começa sozinha. Depois de guardar inicio, nada muda até o motor e o relógio perguntarem o estado.
- **Vitória do dia:** o jogo passa a saber onde está. No fim, ela aperta espaço cinco vezes, espera dez segundos, e nada acontece. É a primeira vez no curso em que dar certo é uma coisa parar de acontecer na hora errada, e a aula diz isso com todas as letras.
- **Valores:** Estado inicial inicio; jogo ativo jogando; relógio dos cactos permanece em 1.4 segundo.
- **Campos livres:** Nenhum campo livre nesta aula.
- **Nota de produção:** Mostrar dez segundos de espera sem cacto e sem corte. Contar os seis blocos movidos para o Se e conferir o Se do relógio separadamente.
- **O que NÃO entra, e por quê:** O estado fim entra na Aula 9. Não prometer uma tela de início escrita nesta aula.

## Seção 1. Hoje o seu jogo aprende a esperar

### Clipe `video-abertura` · O jogo já começou sem você
**Duração alvo:** 25 a 35 segundos · **Palavras:** 64

**Na tela:** Recarregar a página do projeto da Aula 6; manter Dino e cactos rodando por cinco segundos sem comando.

**Narração:**
> "Recarrega a página e olha o seu jogo. O Dino já está correndo e o primeiro cacto vem vindo.
> Ninguém apertou nada para começar. A partida começou sozinha."

**Na tela:** Mostrar apenas o jogo em movimento, sem paleta.

**Narração:**
> "Um jogo precisa de um momento antes da corrida. Hoje vamos fazer o seu esperar. No fim, a
> floresta continua passando, mas o Dino e os cactos só entram quando o jogo estiver no estado
> certo."

## Seção 2. O jogo passa a saber onde está

### Clipe `video-estado-inicio` · O bloco que não muda nada
**Duração alvo:** 35 a 45 segundos · **Palavras:** 112

**Na tela:** Abrir Jogo 2D > Jogo e telas > Telas e partida; arrastar Mudar o estado do jogo para ao fim do Ao iniciar, logo abaixo de Criar grupo de sprites cactos.

**Narração:**
> "Na categoria **Jogo 2D**, abre **Jogo e telas**, depois **Telas e partida**. Pega **Mudar o
> estado do jogo para** e encaixa no **Ao iniciar**, logo abaixo do **Criar grupo de sprites
> cactos**."

**Na tela:** Abrir lista de estados e escolher inicio; manter área do jogo à vista sem corte.

**Narração:**
> "Esse bloco guarda em que parte do jogo estamos. Abre a lista e escolhe **inicio**. Olha a
> área do jogo por alguns segundos. O Dino continua correndo, e os cactos continuam chegando.
> Não mudou nada, e está certo."

**Na tela:** Apontar o bloco e depois as ações ainda sem condição.

**Narração:**
> "O jogo já sabe que está em **inicio**. Essa palavra é um **estado do jogo**. Só que os blocos
> que movem e desenham ainda não perguntam qual é o estado. Guardar a palavra foi o primeiro
> passo; agora vamos usar essa informação."

## Seção 4. Embrulhe o jogo no Se

### Clipe `video-embrulhar` · A manobra de embrulhar no Se
**Duração alvo:** 100 a 120 segundos · **Palavras:** 233

**Na tela:** Enquadrar A cada quadro do jogo com Limpar, floresta e seis blocos seguintes; abrir Programação > Lógica e Se.

**Narração:**
> "Vamos **embrulhar no Se** os seis comandos da partida. O **Limpar a tela** e o **Desenhar
> fundo de floresta** ficam fora, no alto do quadro. Em **Programação**, abre **Lógica e Se** e
> pega **Condição se, senão se e senão**."

**Na tela:** Encaixar Condição se, senão se e senão logo abaixo de Desenhar fundo de floresta, antes de Aplicar a gravidade; mostrar comparação de fábrica.

**Narração:**
> "Encaixa dentro do **A cada quadro do jogo**, entre **Desenhar fundo de floresta** e **Aplicar
> a gravidade do mundo ao sprite**. Primeiro movimento feito. O Se já vem com uma comparação
> dentro, mas ainda não é a pergunta que queremos."

**Na tela:** Tirar comparação de fábrica; abrir Jogo 2D > Jogo e telas > Telas e partida; encaixar o estado do jogo é __ ? e escolher jogando.

**Narração:**
> "Segundo movimento: arrasta a comparação de fábrica para a lixeira. Terceiro: em **Jogo 2D**,
> abre **Jogo e telas**, depois **Telas e partida**. Pega **o estado do jogo é __ ?**, encaixa
> no espaço da pergunta do Se e escolhe **jogando**."

**Na tela:** Destacar formato pontudo da pergunta e o espaço então vazio.

**Narração:**
> "A pergunta tem o formato certo para esse espaço. Ela diz: o estado do jogo é jogando? Se for,
> o que estiver dentro do **então** acontece. Se não for, essa parte espera."

**Na tela:** Arrastar a pilha de seis blocos, a partir de Aplicar a gravidade, para o então; mostrar todos na ordem.

**Narração:**
> "Quarto movimento: arrasta **Aplicar a gravidade do mundo ao sprite** com os cinco blocos que
> estão abaixo dele para dentro do **então**. Sem Control aqui, porque queremos levar os seis
> juntos. Arrasta, não copia: duas pilhas fariam dois jogos acontecerem ao mesmo tempo."

**Na tela:** Enquadrar pilha completa; mostrar só a floresta no jogo.

**Narração:**
> "Confere a ordem lá dentro: gravidade, controle do Dino, desenho do Dino, movimento do grupo,
> desenho do grupo e faxina. Fora do Se ficam limpar e floresta. Olha o jogo: sobrou a floresta.
> O resto está esperando o estado virar jogando."

## Seção 5. O relógio não foi junto

### Clipe `video-relogio` · O relógio ficou de fora
**Duração alvo:** 55 a 65 segundos · **Palavras:** 137

**Na tela:** Mostrar A cada 1.4 segundos fazer ao lado do A cada quadro do jogo, com No grupo criar obstáculo dentro.

**Narração:**
> "Falta um lugar. O relógio dos cactos mora ao lado do quadro, então o Se que acabamos de
> montar não alcança o bloco de criação. Ele precisa da própria pergunta."

**Na tela:** Abrir Programação > Lógica e Se; pôr Condição se, senão se e senão dentro do relógio, logo acima de No grupo criar obstáculo.

**Narração:**
> "Em **Programação**, abre **Lógica e Se** e pega outro **Condição se, senão se e senão**.
> Encaixa dentro do **A cada 1.4 segundos fazer**, logo acima do **No grupo criar obstáculo**.
> Tira a comparação de fábrica."

**Na tela:** Abrir Jogo 2D > Jogo e telas > Telas e partida; encaixar o estado do jogo é __ ? com jogando; arrastar criador para então.

**Narração:**
> "Em **Jogo 2D**, abre **Jogo e telas**, depois **Telas e partida**. Encaixa **o estado do jogo
> é __ ?** na pergunta e escolhe **jogando**. Arrasta **No grupo criar obstáculo** para dentro
> do **então**. Não faz cópia."

**Na tela:** Enquadrar os dois Se, um no quadro e outro no relógio.

**Narração:**
> "Agora os dois lugares perguntam **jogando**. Este segundo Se quase não dá para conferir pela
> imagem: sem ele, cactos poderiam nascer invisíveis enquanto a tela parece parada. Por isso a
> conferência da seção olha dentro do relógio."

## Seção 6. Teste, envie e fecha

### Clipe `video-teste-e-envio` · O teste do silêncio e o envio
**Duração alvo:** 65 a 80 segundos · **Palavras:** 148

**Na tela:** Recarregar a página, clicar no jogo e apertar espaço cinco vezes; manter área e áudio em silêncio.

**Narração:**
> "Recarrega a página. Clica na área do jogo e aperta espaço algumas vezes. O Dino não pula, e o
> som não toca. O estado é **inicio**, então o controle do Dino está esperando dentro do Se."

**Na tela:** Segurar dez segundos sem cortes, com borda direita à vista e só a floresta andando.

**Narração:**
> "Vamos esperar dez segundos sem tocar em nada. A floresta passa, mas nenhum cacto entra pela
> direita. O relógio dos cactos também está protegido por outro Se. Esse é o sinal de que o jogo
> sabe esperar."

**Na tela:** Mostrar blocos de som e controle lado a lado; conferir objetivos; esperar Salvo e enviar.

**Narração:**
> "A gente não mexeu no som hoje. Ele escuta o pulo do Dino, e sem controle o Dino não pula; por
> isso ele fica quieto. Confere os dois Se e os objetivos. Depois espera **Salvo** e clica em
> **Enviar para o professor**."

**Na tela:** Fechar com floresta sozinha e quiz.

**Narração:**
> "O jogo ganhou dois estados: **inicio** e **jogando**. Hoje você fez a parte do jogo esperar.
> Na próxima aula, essa espera ganha o nome do seu jogo na tela. Agora responde ao quiz."
