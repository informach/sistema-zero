# Roteiro de gravação · Corre Dino · Aula 04 · O som que escuta o Dino

## Especificações

- **Formato:** gravação de tela com narração, no Estúdio embutido.
- **Duração:** 230 a 280 segundos de clipes; 559 palavras de narração, cerca de 4.1 minutos a 137 palavras por minuto. As pausas de observação e de trabalho na ferramenta ocupam o restante.
- **Calibração:** o Dino corre na floresta e pula quando o jogador manda. O projeto tem duas áreas. Em `Ao iniciar`: `Preparar o jogo em tela cheia, tela 480 × 270, fundo azul-claro` e `Criar dinossauro dino em x 110 y 150 tamanho 64`. Em `Enquanto estiver rodando`, um `A cada quadro do jogo` com cinco blocos: `Limpar a tela`, `Desenhar fundo de floresta (velocidade 5)`, `Aplicar a gravidade do mundo ao sprite dino`, `Controlar o dinossauro dino, força do pulo 14` e `Desenhar o sprite dino`. O jogo é mudo.
- **Conceitos nomeados:** evento, som associado ao pulo real, comando de tecla e acontecimento do sprite.
- **Dor desta aula:** O evento da tecla toca som sem pulo e deixa mudos os pulos por seta e toque; os quatro casos reproduzem no jogo.
- **Vitória do dia:** o pulo ganha som nos três jeitos de pular, inclusive no toque na tela, que é como a família vai jogar no celular. E o som para de sair quando não houve pulo nenhum.
- **Valores:** Tecla espaço no evento provisório; Tocar efeito com pulo ou outro efeito escolhido; um único Tocar efeito ao final.
- **Campos livres:** Efeito sonoro de pulo entre as opções oferecidas.
- **Nota de produção:** Deixar dois segundos de silêncio na abertura e marcar visualmente cada som para quem estiver sem áudio. Testar os quatro gestos na mesma ordem antes e depois.
- **O que NÃO entra, e por quê:** Não manter o evento provisório da tecla no projeto final; o som passa a escutar o Dino.

## Seção 1. O que a gente vai fazer hoje

### Clipe `video-abertura` · O pulo ganha som
**Duração alvo:** 25 a 35 segundos · **Palavras:** 57

**Na tela:** Jogo da Aula 3: clicar na área e pular em silêncio; manter dois segundos só com o movimento.

**Narração:**
> "O Dino já corre e já pula, mas faz isso em silêncio. Repara como falta alguma coisa quando
> ele sai do chão."

**Na tela:** Mostrar o mesmo pulo com áudio e uma marca visual a cada som; repetir com toque na parte de cima.

**Narração:**
> "Hoje o pulo ganha som. Ele vai tocar quando você usar espaço, seta para cima ou o dedo na
> tela. A marquinha que aparece aqui mostra cada som, mesmo para quem está assistindo sem
> áudio."

## Seção 3. Monte a área e pendure o primeiro som

### Clipe `video-evento-e-som` · A área nova, a tecla e o som
**Duração alvo:** 60 a 70 segundos · **Palavras:** 164

**Na tela:** Abrir Áreas do projeto; soltar Quando acontecer ao lado de Ao iniciar e Enquanto estiver rodando.

**Narração:**
> "Na categoria **Áreas do projeto**, pega **Quando acontecer** e solta ao lado das outras duas
> áreas, com um espaço. Ela escuta acontecimentos do jogo; não fica dentro de nenhuma outra
> área."

**Na tela:** Abrir Jogo 2D > Controles > Teclado, ações e toque; encaixar Quando apertar a tecla no primeiro lugar de Quando acontecer.

**Narração:**
> "Na categoria **Jogo 2D**, abre **Controles**, depois **Teclado, ações e toque**. Pega
> **Quando apertar a tecla** e encaixa no **Quando acontecer**, que ainda está vazio, no
> primeiro lugar."

**Na tela:** Abrir menu da tecla, escolher barra de espaço, quinta opção da lista.

**Narração:**
> "Esse bloco tem uma lista de teclas. Abre e escolhe **barra de espaço**, a **quinta opção**.
> Confere o nome que ficou no bloco antes de seguir. Agora ele sabe qual aperto vai escutar."

**Na tela:** Abrir Jogo 2D > Som > Efeitos prontos; encaixar Tocar efeito no primeiro lugar dentro do evento.

**Narração:**
> "Em **Jogo 2D**, abre **Som**, depois **Efeitos prontos**. Pega **Tocar efeito** e encaixa
> dentro do **Quando apertar a tecla**, no primeiro lugar. Ele vem com **moeda**; abre a lista e
> escolhe **pulo**, a **décima terceira opção**. Se preferir, um efeito como quicar também vale
> para este Dino."

**Na tela:** Clicar no jogo e apertar espaço; mostrar som e marca visual sincronizados.

**Narração:**
> "Clica na área do jogo e aperta espaço. O Dino pula e o som toca. Você acabou de dar a
> primeira voz ao seu jogo!"

## Seção 4. Quatro jeitos de pular, um som só

### Clipe `video-quatro-testes` · Três jeitos de pular, um som só
**Duração alvo:** 50 a 60 segundos · **Palavras:** 97

**Na tela:** Jogo sem paleta visível; clicar na área, apertar espaço; mostrar pulo, som e marca.

**Narração:**
> "Vamos testar o que esse bloco realmente escuta. Primeiro, espaço: o Dino pula e sai um som.
> Até aqui parece certo."

**Na tela:** Recarregar, apertar seta para cima; depois recarregar e tocar na metade de cima, sem som em ambos.

**Narração:**
> "Agora seta para cima: ele pula, mas fica mudo. E com um toque na parte de cima da tela, como
> no celular? Pula e fica mudo também. Temos três jeitos de pular e som em um só."

**Na tela:** Recarregar, pular; com Dino no ar, apertar espaço cinco vezes; mostrar cinco marcas sem novo salto.

**Narração:**
> "Falta o quarto teste. Com o Dino no alto, aperto espaço cinco vezes. Olha as marcas: cinco
> sons, mas nenhum pulo novo. O som obedece à tecla, mesmo quando o Dino não pula. O conserto
> precisa escutar o Dino."

## Seção 6. Um som que escuta o Dino

### Clipe `video-som-no-pulo` · Agora quem avisa é o Dino
**Duração alvo:** 45 a 55 segundos · **Palavras:** 136

**Na tela:** Abrir Jogo 2D > Controles > Teclado, ações e toque; encaixar Quando o sprite pular dentro de Quando acontecer, logo abaixo de Quando apertar a tecla.

**Narração:**
> "Na categoria **Jogo 2D**, abre **Controles**, depois **Teclado, ações e toque**. Pega
> **Quando o sprite pular** e encaixa no **Quando acontecer**, logo abaixo do evento da tecla.
> No campo que veio como **jogador**, escolhe **dino**."

**Na tela:** Arrastar Tocar efeito do evento da tecla para o primeiro lugar do Quando o sprite dino pular.

**Narração:**
> "Agora pega o mesmo **Tocar efeito** que está dentro do evento da tecla e **arrasta** para
> dentro do **Quando o sprite dino pular**, no primeiro lugar. Não copia: com cópia, os dois
> eventos tocariam som."

**Na tela:** Mostrar evento de tecla vazio; abrir menu contextual e clicar Apagar este bloco.

**Narração:**
> "O evento da tecla ficou vazio. Clica nele com o botão direito e escolhe **Apagar este
> bloco**. Assim sobra um único som no projeto, pendurado no pulo que aconteceu de verdade."

**Na tela:** Refazer espaço, seta, toque e apertos no ar, com marcas visuais.

**Narração:**
> "Testa de novo: espaço, seta e toque fazem o Dino pular, cada um com um som. Aperta espaço com
> ele no ar: silêncio. Agora o som acompanha o pulo, e não o dedo no teclado."

## Seção 7. Teste, envie e fecha

### Clipe `video-teste-e-envio` · Ouvir os três pulos e enviar
**Duração alvo:** 50 a 60 segundos · **Palavras:** 105

**Na tela:** Jogo e marca visual enquadrados; testar espaço, seta e toque, um por vez.

**Narração:**
> "Confere os três pulos comigo. Espaço: um som. Seta para cima: um som. Toque na parte de cima:
> um som. A marquinha confirma cada um, mesmo se o seu vídeo estiver sem áudio."

**Na tela:** Pular e apertar espaço repetidas vezes durante o voo; não mostrar marca.

**Narração:**
> "Agora aperta espaço enquanto o Dino ainda está no ar. Nenhum pulo novo, nenhum som. O bloco
> que toca ficou dentro do evento **Quando o sprite pular**, e só dispara quando ele pula
> mesmo."

**Na tela:** Conferir objetivos; esperar Salvo e clicar Enviar para o professor.

**Narração:**
> "Confere os objetivos, espera aparecer **Salvo** e clica em **Enviar para o professor**. Hoje
> você trocou a pergunta do jogo: antes era qual tecla foi apertada; agora é se o Dino pulou. Na
> próxima aula chegam os cactos."
