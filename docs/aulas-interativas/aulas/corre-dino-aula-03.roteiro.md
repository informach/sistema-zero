# Roteiro de gravação · Corre Dino · Aula 03 · O Dino pisa no chão e pula

## Especificações

- **Formato:** gravação de tela com narração, no Estúdio embutido.
- **Duração:** 235 a 295 segundos de clipes; 522 palavras de narração, cerca de 3.8 minutos a 137 palavras por minuto. As pausas de observação e de trabalho na ferramenta ocupam o restante.
- **Calibração:** `Ao iniciar` com `Preparar o jogo em tela cheia, tela 480 × 270, fundo` e `Criar dinossauro dino em x 110 y 150 tamanho 64 cor`. `Enquanto estiver rodando` com `A cada quadro do jogo` contendo `Limpar a tela`, `Desenhar fundo de floresta (velocidade 5)` e `Desenhar o sprite dino`. Na tela, o Dino corre no lugar na frente da floresta que passa, e não obedece a nada.
- **Conceitos nomeados:** comando de pulo, gravidade, força do pulo, ordem de atualização e desenho.
- **Dor desta aula:** No começo, espaço e seta não fazem nada. Com o controle sem gravidade, o Dino flutua e fica congelado; ambos são sintomas reais do Estúdio.
- **Vitória do dia:** o Dino pisa na grama pela primeira vez e pula quando ela manda, pelo teclado, pelo clique do mouse e pelo dedo na tela. E a altura do salto passa a ser escolha dela.
- **Valores:** Nome dino, força inicial 15; demonstração em 2, 30 e 14; escolha final sugerida de 12 a 18.
- **Campos livres:** Força final de pulo entre 12 e 18.
- **Nota de produção:** Mostrar os pés e a pose travada antes da gravidade. Testar espaço, seta e toque depois do pouso.
- **O que NÃO entra, e por quê:** Não prometer o salto sem retorno do modelo ilustrativo nem trazer o agachamento de outro jogo.

## Seção 1. O que a gente vai fazer hoje

### Clipe `video-abertura` · Ele corre, mas não te obedece
**Duração alvo:** 20 a 30 segundos; recalibrar após gravar.

**Na tela:** Jogo da Aula 2 rodando; clicar na área do jogo e apertar espaço, depois seta para cima.

**Narração:**
> "O Dino já corre no seu jogo. Hoje vamos dar a ele um comando de pulo para você controlar
> a corrida com o teclado."

**Na tela:** Mostrar rapidamente o resultado da aula, com um salto que sobe e volta à grama.

**Narração:**
> "No fim, você vai mandar o Dino pular, ver ele sair do chão e voltar sozinho. Vamos montar
> uma peça de cada vez."

## Seção 2. Dê o comando de pulo

### Clipe `video-comando-de-pulo` · O comando entra e nada acontece
**Duração alvo:** 60 a 70 segundos · **Palavras:** 105

**Na tela:** Enquadrar o motor com floresta seguida de Desenhar o sprite; abrir Jogo 2D > Kits prontos > Dino.

**Narração:**
> "Primeiro o comando. Na categoria **Jogo 2D**, abre **Kits prontos**, depois **Dino**. Pega
> **Controlar o dinossauro**."

**Na tela:** Arrastar o bloco para A cada quadro do jogo, entre Desenhar fundo de floresta e Desenhar o sprite dino.

**Narração:**
> "Encaixa dentro do **A cada quadro do jogo**, entre **Desenhar fundo de floresta** e
> **Desenhar o sprite dino**. Assim o controle acontece antes de o personagem ser desenhado."

**Na tela:** Zoom nos campos do bloco: dino e força 15; manter ambos.

**Narração:**
> "O nome já vem **dino**; deixa. A força do pulo vem em **15**; deixa também, por enquanto.
> Clica na área do jogo e tenta espaço e seta para cima."

**Na tela:** Mostrar pés fora da grama, pose congelada e nenhum salto nos dois testes.

**Narração:**
> "O Dino está flutuando um pouco, com as pernas paradas, e ainda não obedece. O comando entrou
> e não resolveu. Olha os pés: ninguém consegue pular sem um chão para onde voltar."

## Seção 4. A gravidade entra no seu jogo

### Clipe `video-gravidade` · O Dino pisa na grama
**Duração alvo:** 60 a 75 segundos · **Palavras:** 141

**Na tela:** Abrir Jogo 2D > Movimento > Velocidade e gravidade; destacar Aplicar a gravidade do mundo ao sprite.

**Narração:**
> "A peça que falta é a gravidade. Em **Jogo 2D**, abre **Movimento**, depois **Velocidade e
> gravidade**. Pega **Aplicar a gravidade do mundo ao sprite**."

**Na tela:** Encaixar dentro de A cada quadro do jogo, entre Desenhar fundo de floresta e Controlar o dinossauro.

**Narração:**
> "Encaixa **entre Desenhar fundo de floresta e Controlar o dinossauro**, dentro do **A cada
> quadro do jogo**. A gravidade vem antes do controle do pulo."

**Na tela:** Abrir seletor de sprite, trocar jogador por dino. Mostrar o Dino descendo e pousando.

**Narração:**
> "O campo vem como **jogador**. Abre a listinha e escolhe **dino**. Esse bloco não tem número
> para preencher. Olha o seu jogo: o Dino desceu um pouquinho e pousou na grama. Lembra que o y
> cresce para baixo?"

**Na tela:** Clicar na área do jogo; testar espaço, seta para cima e clique na metade de cima, observando cada salto completo.

**Narração:**
> "Agora clica na área do jogo e aperta espaço. Ele sobe e volta. Testa a seta para cima:
> funciona também. E um clique na parte de cima da área faz o mesmo pulo; no celular, esse gesto
> vira o toque do dedo. A gravidade é do mundo, mas age no sprite que você escolheu."

## Seção 6. Ponha a sua força de pulo no jogo

### Clipe `video-forca-do-pulo` · Exagera para os dois lados
**Duração alvo:** 50 a 60 segundos · **Palavras:** 106

**Na tela:** Mostrar o campo força do Controlar o dinossauro; pôr 2, clicar fora, saltar e observar.

**Narração:**
> "Vamos descobrir o que o número da força faz no seu próprio jogo. No **Controlar o
> dinossauro**, troca a força por **2**, clica fora e pula. O Dino mal sai da grama."

**Na tela:** Pôr 30, clicar fora, saltar; enquadrar o Dino saindo da tela e voltando.

**Narração:**
> "Agora põe **30**, confirma e pula outra vez. Ele sobe tanto que quase some. Repara na volta:
> é a gravidade que traz ele para o chão."

**Na tela:** Pôr 14, testar; apontar faixa 12 a 18 sem pedir exploração livre.

**Narração:**
> "Eu volto para **14**. Aqui o salto já cabe na tela e dá tempo de passar por um cacto. Você
> pode ficar com um número entre **12 e 18** que combine com o seu jogo. Exagerar para cada lado
> primeiro ajudou a entender o que esse campo controla."

## Seção 7. Teste, envie e fecha

### Clipe `video-fecho` · A ordem dentro do quadro
**Duração alvo:** 45 a 60 segundos · **Palavras:** 110

**Na tela:** Clicar na área do jogo, saltar com espaço e depois com toque na parte de cima; enquadrar saída e pouso.

**Narração:**
> "Confere dois saltos: um com espaço, outro com um toque na parte de cima da área. Nos dois, o
> Dino sobe, para um instante no alto e volta sozinho para a grama."

**Na tela:** Mostrar a pilha: floresta, gravidade, controle, desenho; conferir objetivos.

**Narração:**
> "Olha a ordem do quadro: a gravidade age, depois o controle recebe o pulo, e só depois o Dino
> é desenhado. A floresta continua atrás. Confere os objetivos e o número de força que você
> escolheu."

**Na tela:** Esperar Salvo; clicar Enviar para o professor; terminar no quiz.

**Narração:**
> "Quando tudo estiver certo, espera **Salvo** e clica em **Enviar para o professor**. Hoje você
> deu o comando, trouxe o Dino de volta para o chão e escolheu a altura do salto. Na próxima
> aula ele ganha som. O quiz vem agora."
