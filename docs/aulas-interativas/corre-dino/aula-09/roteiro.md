# Bateu, terminou, recomeçou

Uma aula, organizada em 9 seções. Público: 9 a 16 anos.

Fonte: `roteiro-aula-09-corre-dino.md`. SHA-256: `905dc7206a7ca7fc6264dbd2dc14661ad73e462690ba23b6d9b794d566a3c13b`.
O original foi preservado. Este roteiro substitui a sequência didática da aula, sem abrir um curso ou uma área de revisão paralela.

## Estado de entrada e resultado

A tela de início funciona por teclado e toque. O dino ainda atravessa os cactos sem perder.

**Resultado:** Definir a consequência da colisão e testar o ciclo completo da partida.

**Ambiente:** o mesmo Estúdio incorporado acompanha as seções. Preservar o projeto inicial, a continuidade e a entrega já configurados na aula.

## 1. A criação de hoje

**Texto para o aluno:**

Oi! A tela de início funciona por teclado e toque. O dino ainda atravessa os cactos sem perder.

Hoje você vai definir a consequência da colisão e testar o ciclo completo da partida.

Você pode voltar às seções pelo índice e pedir ajuda ao professor onde surgir a dúvida.

## 2. Descoberta antes da explicação

**Modelo:** sequence. **Essencial:** sim

**Título:** Monte o ciclo da partida

Organize a experiência de alguém que perdeu uma partida e decidiu tentar de novo.

**Interação:** usar o bloco funcional do manifesto. Experimentação e HTML guardam estado; a conclusão essencial usa a conferência nativa no servidor. Não pontuar a velocidade nem descontar por pistas.

**Pistas disponíveis:**

- O fim encerra uma partida; reiniciar prepara a próxima.

## 3. Explicação após observar

**Texto didático (permanece na seção, sem exigir vídeo):**

Detectar um encontro só faz diferença quando escolhemos sua consequência. A colisão pode produzir som, explosão, tremida e uma mudança de tela. Ao ir para fim, as ações protegidas por Se jogando deixam de executar. Reiniciar prepara uma partida nova, passando novamente pelas ações iniciais. Testar só a batida não basta: início, fim e reinício precisam formar um ciclo que o jogador entende.

**Condução:** se a criança já percebeu a relação, segue para construir; se ainda não percebeu, pode ler, voltar à experiência ou pedir ajuda. Na gravação prática, retomar apenas a frase necessária para orientar o encaixe.

## Demonstrações e aplicação

Helena narra; a captura mostra uma ação de cada vez. Em arte, Júlio demonstra o desenho dele e as escolhas visuais continuam livres. Cada trecho termina devolvendo a ação ao aluno. A duração é determinada pela demonstração legível, sem acelerar o desenho para cumprir uma meta artificial.

### 1. a colisão que acaba o jogo

**Narração revisada:**

Em Jogo 2D, Colisões, coloque o evento de cada sprite do grupo que colidir com dino dentro de Se jogando, antes da limpeza. Use cactos e o apelido cacto. Dentro, coloque Ir para a tela fim. Rode e bata.

**Na tela (sequência técnica preservada do original):**

Jogo 2D › Colisões, arrastar "Para cada sprite do grupo __ que colidir com o sprite __ chamar o sprite de __ fazer" (rótulo literal na tela) para dentro do "Se a tela atual é jogando", ENTRE o "Desenhar o grupo" e o "Tirar do grupo quem sair da tela" (grupo cactos, sprite dino, apelido cacto). Dentro dele, só "Ir para a tela", escolhendo "fim" na listinha, que já vem pronta. Rodar e bater.

**Depois do trecho:** o aluno realiza a etapa, testa e mantém o trabalho no mesmo projeto. A explicação conceitual está na descoberta e no texto anterior; não repetir um monólogo teórico durante a montagem.

**Produção:** aula-09-passo-01: gravar a demonstração "a colisão que acaba o jogo" conforme roteiro.md; enviar o vídeo e inserir o bloco nesta seção.

### 2. a tela de fim

**Narração revisada:**

No Se grande, adicione outro senão se com a tela fim. Dentro, coloque Mostrar tela. Use Bateu no cacto! como título e uma dica dizendo que qualquer tecla ou toque permite jogar de novo.

**Na tela (sequência técnica preservada do original):**

no mesmo bloco Se do "A cada quadro", clicar no "+ senão se" de novo e mostrar o terceiro andar nascendo, embaixo do "senão se a tela atual é inicio". Encaixar nele o "a tela atual é" com "fim" e, dentro, o "Mostrar tela" (título "Bateu no cacto!", subtítulo simples, dica "Aperte qualquer tecla ou toque na tela para jogar de novo", fundo escuro de fábrica). Zoom final no bloco inteiro, com os três andares lidos de cima pra baixo.

**Depois do trecho:** o aluno realiza a etapa, testa e mantém o trabalho no mesmo projeto. A explicação conceitual está na descoberta e no texto anterior; não repetir um monólogo teórico durante a montagem.

**Produção:** aula-09-passo-02: gravar a demonstração "a tela de fim" conforme roteiro.md; enviar o vídeo e inserir o bloco nesta seção.

### 3. fazer você sentir a batida

**Narração revisada:**

Dentro da colisão, antes de ir para fim, acrescente explosão no cacto, tremida de intensidade 8 e o efeito de derrota. Escute e observe a batida: esses sinais contam ao jogador o que aconteceu.

**Na tela (sequência técnica preservada do original):**

dentro do espaço de fazer da colisão, ANTES do "Ir para a tela fim", acrescentar na ordem: "Soltar explosão no sprite __ cor __" (Kit espaço, sprite cacto, cor vermelha), "Tremer a tela com intensidade __" (Aparência, 8), "Tocar efeito __" (Som, derrota).

**Depois do trecho:** o aluno realiza a etapa, testa e mantém o trabalho no mesmo projeto. A explicação conceitual está na descoberta e no texto anterior; não repetir um monólogo teórico durante a montagem.

**Produção:** aula-09-passo-03: gravar a demonstração "fazer você sentir a batida" conforme roteiro.md; enviar o vídeo e inserir o bloco nesta seção.

### 4. jogar de novo

**Narração revisada:**

No evento de qualquer tecla ou toque, acrescente senão se a tela é fim. Dentro, coloque Reiniciar o jogo, de Telas e cenas. Preserve o caminho de inicio para jogando que já existe.

**Na tela (sequência técnica preservada do original):**

no "Quando apertar qualquer tecla ou tocar na tela", clicar no "+ senão se" do "Se a tela atual é inicio" que já existe e encaixar no andar novo o "a tela atual é fim", com "Reiniciar o jogo" (Telas e cenas) dentro. Dar um zoom no evento inteiro no fim, mostrando o bloco de dois andares.

**Depois do trecho:** o aluno realiza a etapa, testa e mantém o trabalho no mesmo projeto. A explicação conceitual está na descoberta e no texto anterior; não repetir um monólogo teórico durante a montagem.

**Produção:** aula-09-passo-04: gravar a demonstração "jogar de novo" conforme roteiro.md; enviar o vídeo e inserir o bloco nesta seção.

### 5. testar do começo ao fim

**Narração revisada:**

Jogue desde a tela de início, bata, veja o fim e recomece. Faça isso com clique e depois com Enter. Confira se o novo jogo volta ao estado inicial.

**Na tela (sequência técnica preservada do original):**

recarregar e jogar uma partida completa: tela de início, clique na tela, jogar, bater, tela de fim, clique de novo, recomeçar. No fim, repetir a partida começando pelo Enter, pra mostrar que os dois jeitos valem.

**Depois do trecho:** o aluno realiza a etapa, testa e mantém o trabalho no mesmo projeto. A explicação conceitual está na descoberta e no texto anterior; não repetir um monólogo teórico durante a montagem.

**Produção:** aula-09-passo-05: gravar a demonstração "testar do começo ao fim" conforme roteiro.md; enviar o vídeo e inserir o bloco nesta seção.

## Fechamento e evidência

**Fala / texto de fechamento:**

Complete o ciclo duas vezes, usando controles diferentes. O jogo deve parar ao perder e permitir uma nova tentativa. Envie seu projeto.

Na Aula 10, você vai investigar por que algumas batidas parecem injustas.

**Professor:** observar as relações escolhidas, os parâmetros testados e a aplicação no projeto. Uma previsão diferente é ponto de partida para conversar; não é diagnóstico de dificuldade. Responder ao pedido de ajuda na seção em que ocorreu.

**Conclusão:** cumprir as atividades essenciais e as entregas já configuradas. Assistir ao vídeo inteiro não é requisito. Não adicionar XP, publicação ou desbloqueio ao clicar na experiência.

## Produção e importação

1. Abrir a aula original em rascunho, carregar `manifesto.json`, vincular ao destino e conferir a prévia. Os slugs são rótulos de autoria; o vínculo explícito usa o curso e a aula reais.
2. Preservar os blocos de projeto, os quizzes, anexos e seus IDs. O importador mantém os materiais não referenciados em uma seção final; reposicionar os quizzes e materiais apropriados antes de publicar.
3. Gravar os trechos acima no estado correto do projeto, enviar no uploader Vimeo já existente no admin e posicionar cada novo bloco na seção indicada. Conferir legibilidade, áudio e legendas. Não há arquivo de vídeo novo neste pacote.
4. Remover cada pendência de mídia apenas depois de vincular e conferir o trecho. Fazer a prévia completa e testar a continuidade para a aula seguinte; publicar somente após essa revisão.

Nenhuma URL, mídia ou minutagem foi inventada. Nenhuma aula publicada foi sobrescrita automaticamente.
