# Pontos, vidas e consequências

Uma aula, organizada em 10 seções. Público: 9 a 16 anos.

Fonte: `roteiro-aula-dia4-desafio-primeiro-jogo.md`. SHA-256: `5920b27b0007ee632bd60f587f59ed06e48fa2167acd5115f5c385d30fc0db1a`.
O original foi preservado. Este roteiro substitui a sequência didática da aula, sem abrir um curso ou uma área de revisão paralela.

## Estado de entrada e resultado

Você já consegue destruir asteroides. Seu jogo ainda não mostra quantos acertou nem o efeito de uma batida na nave.

**Resultado:** Separar o valor guardado, o evento que o altera e o desenho que o mostra.

**Ambiente:** o mesmo Estúdio incorporado acompanha as seções. Preservar o projeto inicial, a continuidade e a entrega já configurados na aula.

## 1. A criação de hoje

**Texto para o aluno:**

Oi! Você já consegue destruir asteroides. Seu jogo ainda não mostra quantos acertou nem o efeito de uma batida na nave.

Hoje você vai separar o valor guardado, o evento que o altera e o desenho que o mostra.

Você pode voltar às seções pelo índice e pedir ajuda ao professor onde surgir a dúvida.

## 2. Descoberta antes da explicação

**Modelo:** sequence. **Essencial:** sim

**Título:** Quem faz o quê no placar?

Associe cada tarefa ao momento correto. Pense no que muda o número e no que apenas o mostra.

**Interação:** usar o bloco funcional do manifesto. Experimentação e HTML guardam estado; a conclusão essencial usa a conferência nativa no servidor. Não pontuar a velocidade nem descontar por pistas.

**Pistas disponíveis:**

- Se desenhar somasse pontos, eles aumentariam mesmo sem acertar nada.

## 3. Explicação após observar

**Texto didático (permanece na seção, sem exigir vídeo):**

Um placar é como uma janela para um valor guardado. Desenhar a janela não deveria somar pontos. O ponto muda quando um tiro acerta um asteroide; a imagem do placar só mostra o valor atual. As vidas seguem outra regra: uma batida tira uma vida e dá um pequeno tempo de proteção. Isso evita que vários quadros do mesmo contato acabem com todas as vidas de uma vez.

**Condução:** se a criança já percebeu a relação, segue para construir; se ainda não percebeu, pode ler, voltar à experiência ou pedir ajuda. Na gravação prática, retomar apenas a frase necessária para orientar o encaixe.

## Demonstrações e aplicação

Helena narra; a captura mostra uma ação de cada vez. Em arte, Júlio demonstra o desenho dele e as escolhas visuais continuam livres. Cada trecho termina devolvendo a ação ao aluno. A duração é determinada pela demonstração legível, sem acelerar o desenho para cumprir uma meta artificial.

### 1. criar e somar os pontos

**Narração revisada:**

Em Programação, Variáveis, crie pontos com valor 0 em Ao iniciar. No final da colisão entre tiro e asteroide, coloque Somar 1 em pontos. Assim o acerto é o acontecimento que muda o valor.

**Na tela (sequência técnica preservada do original):**

categoria "Programação", subcategoria "Variáveis", arrastar "Criar variável" para dentro do Ao iniciar, abaixo do grupo asteroides; nome "pontos", valor 0. Depois, abrir o bloco de colisão do Dia 3 e encaixar "Somar em variável" (Somar 1 em pontos) no final dele, logo depois do Tocar som de explosão.

**Depois do trecho:** o aluno realiza a etapa, testa e mantém o trabalho no mesmo projeto. A explicação conceitual está na descoberta e no texto anterior; não repetir um monólogo teórico durante a montagem.

**Produção:** dia-4-passo-01: gravar a demonstração "criar e somar os pontos" conforme roteiro.md; enviar o vídeo e inserir o bloco nesta seção.

### 2. mostrar o placar

**Narração revisada:**

Em Jogo 2D, Placar e HUD, coloque Mostrar placar abaixo da colisão. No valor, encaixe valor da variável pontos, de Programação, Valores. Use x 12, y 30, branco e tamanho 24. Acerte um asteroide para conferir.

**Na tela (sequência técnica preservada do original):**

categoria "Jogo 2D", subcategoria "Placar e HUD", arrastar "Mostrar placar" para dentro do A cada quadro do jogo, abaixo do bloco da colisão. Texto "Pontos:"; no valor, encaixar "valor da variável" (Programação, Valores) com pontos; x 12, y 30, cor branca, tamanho 24. Testar rapidinho: explodir um asteroide e ver o placar subir.

**Depois do trecho:** o aluno realiza a etapa, testa e mantém o trabalho no mesmo projeto. A explicação conceitual está na descoberta e no texto anterior; não repetir um monólogo teórico durante a montagem.

**Produção:** dia-4-passo-02: gravar a demonstração "mostrar o placar" conforme roteiro.md; enviar o vídeo e inserir o bloco nesta seção.

### 3. dar vidas à nave

**Narração revisada:**

Em Jogo 2D, Vida, encaixe Dar ao sprite de vida em Ao iniciar. Escolha nave e 3. Cada nova partida começa com essas três vidas.

**Na tela (sequência técnica preservada do original):**

categoria "Jogo 2D", subcategoria "Vida", arrastar "Dar ao sprite de vida" para o Ao iniciar, abaixo do Criar variável pontos (sprite nave, 3).

**Depois do trecho:** o aluno realiza a etapa, testa e mantém o trabalho no mesmo projeto. A explicação conceitual está na descoberta e no texto anterior; não repetir um monólogo teórico durante a montagem.

**Produção:** dia-4-passo-03: gravar a demonstração "dar vidas à nave" conforme roteiro.md; enviar o vídeo e inserir o bloco nesta seção.

### 4. fazer a batida machucar

**Narração revisada:**

Em Colisões, procure o encontro de cada sprite do grupo com a nave. Use asteroides e o apelido inimigo. Dentro, remova inimigo, solte a explosão, machuque nave em 1 com 45 quadros de proteção e trema a tela com intensidade 8.

**Na tela (sequência técnica preservada do original):**

categoria "Jogo 2D", subcategoria "Colisões", arrastar "Para cada sprite do grupo que colidir com o sprite" para o A cada quadro do jogo, abaixo do Mostrar placar (grupo asteroides, sprite nave, apelido inimigo). Dentro, na ordem: "Tirar o sprite inimigo do grupo asteroides" (Muitos), "Soltar explosão no sprite inimigo" (Kit espaço), "Machucar o sprite nave em 1 e deixá-lo invencível por 45 quadros" (Vida), "Tremer a tela com intensidade 8" (Aparência).

**Depois do trecho:** o aluno realiza a etapa, testa e mantém o trabalho no mesmo projeto. A explicação conceitual está na descoberta e no texto anterior; não repetir um monólogo teórico durante a montagem.

**Produção:** dia-4-passo-04: gravar a demonstração "fazer a batida machucar" conforme roteiro.md; enviar o vídeo e inserir o bloco nesta seção.

### 5. mostrar os corações

**Narração revisada:**

Em Vida, coloque Desenhar as vidas do sprite depois da batida. Escolha nave, corações, x 12, y 48, tamanho 22 e vermelho. Esse desenho mostra as vidas que ainda restam.

**Na tela (sequência técnica preservada do original):**

categoria "Jogo 2D", subcategoria "Vida", arrastar "Desenhar as vidas do sprite" para o A cada quadro do jogo, abaixo do bloco da batida; sprite nave, jeito "corações", x 12, y 48, tamanho 22, cor vermelha.

**Depois do trecho:** o aluno realiza a etapa, testa e mantém o trabalho no mesmo projeto. A explicação conceitual está na descoberta e no texto anterior; não repetir um monólogo teórico durante a montagem.

**Produção:** dia-4-passo-05: gravar a demonstração "mostrar os corações" conforme roteiro.md; enviar o vídeo e inserir o bloco nesta seção.

### 6. hora de testar

**Narração revisada:**

Acerte um asteroide e observe o ponto. Depois deixe outro bater na nave: uma vida sai, a nave pisca e a tela treme. Fique alguns instantes sem acertar nada: os pontos devem ficar parados.

**Na tela (sequência técnica preservada do original):**

clicar na área do jogo; explodir asteroides vendo o placar subir; deixar um asteroide bater na nave: explosão, tela tremendo, nave piscando, um coração a menos.

**Depois do trecho:** o aluno realiza a etapa, testa e mantém o trabalho no mesmo projeto. A explicação conceitual está na descoberta e no texto anterior; não repetir um monólogo teórico durante a montagem.

**Produção:** dia-4-passo-06: gravar a demonstração "hora de testar" conforme roteiro.md; enviar o vídeo e inserir o bloco nesta seção.

## Fechamento e evidência

**Fala / texto de fechamento:**

Compare três situações: sem acerto, acerto de tiro e batida na nave. Cada uma deve produzir a consequência certa. Envie seu projeto.

No Dia 5, você vai decidir quando a partida começa, termina e recomeça.

**Professor:** observar as relações escolhidas, os parâmetros testados e a aplicação no projeto. Uma previsão diferente é ponto de partida para conversar; não é diagnóstico de dificuldade. Responder ao pedido de ajuda na seção em que ocorreu.

**Conclusão:** cumprir as atividades essenciais e as entregas já configuradas. Assistir ao vídeo inteiro não é requisito. Não adicionar XP, publicação ou desbloqueio ao clicar na experiência.

## Produção e importação

1. Abrir a aula original em rascunho, carregar `manifesto.json`, vincular ao destino e conferir a prévia. Os slugs são rótulos de autoria; o vínculo explícito usa o curso e a aula reais.
2. Preservar os blocos de projeto, os quizzes, anexos e seus IDs. O importador mantém os materiais não referenciados em uma seção final; reposicionar os quizzes e materiais apropriados antes de publicar.
3. Gravar os trechos acima no estado correto do projeto, enviar no uploader Vimeo já existente no admin e posicionar cada novo bloco na seção indicada. Conferir legibilidade, áudio e legendas. Não há arquivo de vídeo novo neste pacote.
4. Remover cada pendência de mídia apenas depois de vincular e conferir o trecho. Fazer a prévia completa e testar a continuidade para a aula seguinte; publicar somente após essa revisão.

Nenhuma URL, mídia ou minutagem foi inventada. Nenhuma aula publicada foi sobrescrita automaticamente.
