# Roteiro de gravação · Corre Dino · Aula 08 · O jogo abre com o nome que você deu

## Especificações

- **Formato:** gravação de tela com narração, no Estúdio embutido.
- **Duração:** 275 a 345 segundos de clipes; 674 palavras de narração, cerca de 4.9 minutos a 137 palavras por minuto. As pausas de observação e de trabalho na ferramenta ocupam o restante.
- **Calibração:** o jogo sabe onde está e não faz nada fora de hora. Ao recarregar a página, a área do jogo mostra só a floresta passando. O estado `inicio` existe, e não tem rosto: nenhuma letra, nenhum convite, nenhum jeito de sair dele.
- **Conceitos nomeados:** tela de início, senão se, texto encaixado, promessa da dica e entrada por tecla ou toque.
- **Dor desta aula:** O início espera sem texto. Depois de ligar só Enter, o clique na tela não começa a partida.
- **Vitória do dia:** o jogo abre numa tela com o nome que ela deu, e começa quando o jogador manda, de qualquer jeito que ele tentar: tecla, clique ou dedo na tela.
- **Valores:** Estado inicio para a tela; jogando para a partida. Dica final: Aperte qualquer tecla ou toque na tela para começar.
- **Campos livres:** Título, subtítulo e cor de fundo da tela de início.
- **Nota de produção:** Mostrar o clique morto antes de trocar o evento. Testar clique, Enter, espaço e letra qualquer, recarregando entre testes.
- **O que NÃO entra, e por quê:** Não manter evento exclusivo de Enter; a dica precisa descrever o controle final.

## Seção 1. Hoje o jogo abre com o nome que você deu

### Clipe `video-abertura` · A cara do seu jogo
**Duração alvo:** 25 a 35 segundos · **Palavras:** 61

**Na tela:** Mostrar tela de início pronta sobre a floresta, com nome e dica; tocar e começar a partida.

**Narração:**
> "Na aula passada o jogo aprendeu a esperar, mas a espera era uma floresta sem nada escrito.
> Hoje ela ganha a cara do seu jogo: um nome grande, uma frase e uma dica para começar."

**Na tela:** Mostrar uma tecla e um toque iniciando em tomadas separadas.

**Narração:**
> "No fim, quem joga pode usar teclado ou tocar na tela. O texto vai contar exatamente isso,
> para ninguém ficar procurando um controle que não precisa."

## Seção 2. O estado inicio ganha uma tela

### Clipe `video-menu` · O andar novo do Se e as pecinhas de texto
**Duração alvo:** 80 a 95 segundos · **Palavras:** 207

**Na tela:** Mostrar Se do quadro com o estado jogando; clicar mais senão se e mostrar andar novo vazio.

**Narração:**
> "Olha o Se que você montou ontem. Na parte de baixo tem o botão **mais senão se**. Clica nele.
> Nasceu outro andar. **Senão se** quer dizer: se a pergunta de cima deu não, aí o jogo olha
> esta. Se deu sim, ele já resolveu e não entra aqui."

**Na tela:** Abrir Jogo 2D > Jogo e telas > Telas e partida; encaixar o estado do jogo é __ ? no andar novo; escolher inicio.

**Narração:**
> "Em **Jogo 2D**, abre **Jogo e telas**, depois **Telas e partida**. Pega **o estado do jogo é
> __ ?** e encaixa na pergunta vazia do **senão se**. Escolhe **inicio**. Aqui não há comparação
> de fábrica para tirar: o andar já nasceu vazio."

**Na tela:** Na mesma seção da paleta, pegar Mostrar tela com título subtítulo dica fundo; encaixar no então do estado inicio, primeiro lugar.

**Narração:**
> "Na mesma gaveta, pega **Mostrar tela com título subtítulo dica fundo**. Encaixa dentro do
> **então** do estado **inicio**, que está vazio, no primeiro lugar. A tela de início vai
> aparecer quando o jogo estiver esperando."

**Na tela:** Zoom nas três peças de texto com borda e no campo de cor; mudar título e subtítulo escolhidos, dica combinada.

**Narração:**
> "Título, subtítulo e dica são três pecinhas de **texto** encaixadas, uma em cada espaço. Você
> pode escrever nelas. No título põe o nome do seu jogo; no subtítulo, uma frase sobre pular
> cactos. Na dica escreve **Aperte Enter para começar**, por enquanto."

**Na tela:** Mostrar cor escura de fábrica e resultado com nome sobre floresta.

**Narração:**
> "O fundo vem escuro e pode ficar assim. Se quiser, escolhe outra cor em que os textos
> apareçam. Olha a tela do jogo: agora o estado **inicio** tem uma imagem. Aperta Enter e
> repara: ainda não começa, porque falta ensinar a entrada."

## Seção 3. Faça o Enter começar a partida

### Clipe `video-enter` · O Enter funciona, o clique não
**Duração alvo:** 55 a 70 segundos · **Palavras:** 155

**Na tela:** Abrir Jogo 2D > Controles > Teclado, ações e toque; encaixar Quando apertar a tecla em Quando acontecer, ao lado do evento do pulo.

**Narração:**
> "Em **Jogo 2D**, abre **Controles**, depois **Teclado, ações e toque**. Pega **Quando apertar
> a tecla** e solta no **Quando acontecer**, ao lado do evento do pulo. Na lista da tecla,
> escolhe **Enter**, a **sexta opção**."

**Na tela:** Abrir Programação > Lógica e Se; encaixar Condição se, senão se e senão dentro do evento, primeiro lugar; remover comparação de fábrica.

**Narração:**
> "Em **Programação**, abre **Lógica e Se** e pega **Condição se, senão se e senão**. Encaixa no
> evento de Enter, que está vazio, no primeiro lugar. Tira a comparação de fábrica da pergunta."

**Na tela:** Abrir Jogo 2D > Jogo e telas > Telas e partida; pôr o estado do jogo é __ ? com inicio na pergunta; Mudar o estado do jogo para com jogando no então.

**Narração:**
> "Em **Jogo 2D**, abre **Jogo e telas**, depois **Telas e partida**. Encaixa **o estado do jogo
> é __ ?** na pergunta e escolhe **inicio**. Da mesma gaveta, pega **Mudar o estado do jogo
> para** e põe dentro do **então**, no primeiro lugar. Escolhe **jogando**."

**Na tela:** Recarregar, clicar na área do jogo, apertar Enter; recarregar e clicar no nome várias vezes sem efeito.

**Narração:**
> "Recarrega, clica na área do jogo e aperta Enter. A partida começa. Agora recarrega de novo e
> clica bem no nome do jogo. Nada. Clica outra vez: nada. Só escutamos Enter, mas muita gente
> vai tentar tocar na tela, especialmente no celular. Vamos abrir esse convite."

## Seção 5. Faça o jogo aceitar tecla e toque

### Clipe `video-entrada-ampla` · Um convite que vale para os dois jeitos
**Duração alvo:** 60 a 75 segundos · **Palavras:** 151

**Na tela:** Abrir Jogo 2D > Controles > Teclado, ações e toque; soltar Quando apertar qualquer tecla ou tocar na tela em Quando acontecer, ao lado do evento do Enter.

**Narração:**
> "Em **Jogo 2D**, abre **Controles**, depois **Teclado, ações e toque**. Pega **Quando apertar
> qualquer tecla ou tocar na tela** e solta no **Quando acontecer**, ao lado do evento do Enter.
> Esse bloco não tem campo para escolher uma tecla."

**Na tela:** Arrastar o Se completo de dentro do evento Enter para o evento novo, primeiro lugar; apagar evento Enter vazio.

**Narração:**
> "Arrasta o Se inteiro, com a pergunta **inicio** e a mudança para **jogando**, para dentro do
> evento novo, no primeiro lugar. Arrasta, não copia, para não deixar dois caminhos ativos. O
> evento Enter ficou vazio: botão direito nele, **Apagar este bloco**."

**Na tela:** Recarregar para cada teste: clique, Enter, espaço e letra; mostrar todos iniciando.

**Narração:**
> "Testa recarregando entre uma tentativa e outra. Um clique começa. Enter começa. Espaço
> começa. Uma letra também começa. Agora o jogo atende ao teclado e ao toque."

**Na tela:** Zoom na dica do Mostrar tela; substituir texto antigo pela frase final.

**Narração:**
> "Volta ao **Mostrar tela** do estado **inicio**. A dica ainda promete só Enter. Troca por
> **Aperte qualquer tecla ou toque na tela para começar**. O texto que o jogador lê precisa
> combinar com o que o jogo faz. A dica agora cumpre essa promessa."

## Seção 6. Teste, envie e fecha

### Clipe `video-teste-e-envio` · Entrar pelos dois caminhos e enviar
**Duração alvo:** 55 a 70 segundos · **Palavras:** 100

**Na tela:** Recarregar; segurar menu por dez segundos, com borda direita sem cacto e dica legível.

**Narração:**
> "Recarrega e lê a tela de início. Espera dez segundos: nenhum cacto entra. O nome é seu, e a
> dica diz que tecla ou toque começam. O jogo está esperando mesmo."

**Na tela:** Tocar o menu para iniciar; recarregar e iniciar com tecla qualquer.

**Narração:**
> "Agora toca no meio da tela: começou. Recarrega e tenta uma tecla qualquer: começou também. O
> menu não promete um controle que ficou faltando."

**Na tela:** Enquadrar os dois ramos do Se, conferir objetivos, esperar Salvo e enviar.

**Narração:**
> "Confere o **senão se** de inicio com os textos, o evento amplo e a dica. Depois espera
> **Salvo** e clica em **Enviar para o professor**. Hoje o jogo ganhou uma porta de entrada. Na
> próxima aula vamos fazer o Dino parar de atravessar os cactos."
