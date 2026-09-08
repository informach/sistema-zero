# Um convite para jogar

Uma aula, organizada em 7 seções. Público: 9 a 16 anos.

Fonte: `roteiro-aula-08-corre-dino.md`. SHA-256: `61a9981e52b892274aeeddc4ae00798d7a534530d5835205722d502f0b901139`.
O original foi preservado. Este roteiro substitui a sequência didática da aula, sem abrir um curso ou uma área de revisão paralela.

## Estado de entrada e resultado

O projeto abre na tela inicio e mostra só a floresta. A partida está protegida pela condição.

**Resultado:** Conectar a instrução mostrada ao jogador com controles que realmente funcionam.

**Ambiente:** o mesmo Estúdio incorporado acompanha as seções. Preservar o projeto inicial, a continuidade e a entrega já configurados na aula.

## 1. A criação de hoje

**Texto para o aluno:**

Oi! O projeto abre na tela inicio e mostra só a floresta. A partida está protegida pela condição.

Hoje você vai conectar a instrução mostrada ao jogador com controles que realmente funcionam.

Você pode voltar às seções pelo índice e pedir ajuda ao professor onde surgir a dúvida.

## 2. Descoberta antes da explicação

**Modelo:** prediction. **Essencial:** não; a previsão é um convite, sem punição por hipótese inicial.

**Título:** A dica prometeu um toque

A tela diz “Toque para jogar”, mas o evento escuta somente Enter. O que acontece se o jogador tocar?

**Interação:** usar o bloco funcional do manifesto. Experimentação e HTML guardam estado; a conclusão essencial usa a conferência nativa no servidor. Não pontuar a velocidade nem descontar por pistas.

**Pistas disponíveis:**

- A frase orienta uma pessoa; o bloco de evento orienta o programa.

## 3. Explicação após observar

**Texto didático (permanece na seção, sem exigir vídeo):**

Uma dica é uma promessa: se a tela diz para tocar, o toque precisa começar a partida. Um evento exclusivo de Enter não atende a essa promessa no celular. A pergunta da tela impede que o mesmo comando comece algo no momento errado. Título, subtítulo e cores podem expressar seu estilo. A instrução dos controles precisa descrever o comportamento real do jogo.

**Condução:** se a criança já percebeu a relação, segue para construir; se ainda não percebeu, pode ler, voltar à experiência ou pedir ajuda. Na gravação prática, retomar apenas a frase necessária para orientar o encaixe.

## Demonstrações e aplicação

Helena narra; a captura mostra uma ação de cada vez. Em arte, Júlio demonstra o desenho dele e as escolhas visuais continuam livres. Cada trecho termina devolvendo a ação ao aluno. A duração é determinada pela demonstração legível, sem acelerar o desenho para cumprir uma meta artificial.

### 1. desenhar a tela de início

**Narração revisada:**

No Se grande, clique em mais senão se. Na pergunta nova, coloque a tela atual é inicio. Em Telas e cenas, encaixe Mostrar tela. Edite os textos dentro das peças de texto e escolha o título e a cor do seu jogo.

**Na tela (sequência técnica preservada do original):**

zoom nos dois botõezinhos "+ senão se" e "+ senão" que ficam embaixo, à esquerda, do "Se a tela atual é jogando". Clicar no "+ senão se" e mostrar o bloco crescendo, com o andar novo e o espacinho de pergunta vazio. Encaixar nele o "a tela atual é" com "inicio" e, dentro, o "Mostrar tela" (Jogo 2D › Telas e cenas). Dar um zoom nos três encaixes de valor do Mostrar tela, mostrando que dentro de cada um tem uma pecinha "texto" separada, com borda própria. Clicar no texto DENTRO da pecinha para editar. Print de conferência com o bloco inteiro: Se jogando em cima, senão se inicio embaixo.

**Depois do trecho:** o aluno realiza a etapa, testa e mantém o trabalho no mesmo projeto. A explicação conceitual está na descoberta e no texto anterior; não repetir um monólogo teórico durante a montagem.

**Produção:** aula-08-passo-01: gravar a demonstração "desenhar a tela de início" conforme roteiro.md; enviar o vídeo e inserir o bloco nesta seção.

### 2. o jogo começa quando o jogador manda

**Narração revisada:**

Em Controles, crie primeiro o evento Enter com Se a tela é inicio e Ir para a tela jogando. Teste Enter e clique. Depois troque pelo evento Quando apertar qualquer tecla ou tocar na tela, preservando o Se. Ajuste a dica da tela.

**Na tela (sequência técnica preservada do original):**

Jogo 2D › Controles, arrastar "Quando apertar a tecla" para dentro do Quando acontecer, ao lado do evento do pulo, e escolher Enter; dentro, um "Se a tela atual é inicio" com "Ir para a tela jogando". Testar com o Enter (funciona) e depois clicar no meio da tela de início várias vezes (não acontece nada), com um zoom no cursor. Depois: trocar o bloco do evento pelo "Quando apertar qualquer tecla ou tocar na tela", arrastando o Se de dentro do antigo pro novo e apagando o antigo com o botão direito. Por fim, voltar no Mostrar tela e trocar o texto da dica.

**Depois do trecho:** o aluno realiza a etapa, testa e mantém o trabalho no mesmo projeto. A explicação conceitual está na descoberta e no texto anterior; não repetir um monólogo teórico durante a montagem.

**Produção:** aula-08-passo-02: gravar a demonstração "o jogo começa quando o jogador manda" conforme roteiro.md; enviar o vídeo e inserir o bloco nesta seção.

### 3. testar e deixar com a sua cara

**Narração revisada:**

Recarregue e comece clicando. Recarregue outra vez e comece com Enter. Os dois caminhos devem funcionar. Personalize título, subtítulo e cor, mantendo a dica fiel aos controles.

**Na tela (sequência técnica preservada do original):**

recarregar, ver a tela de início, começar clicando na tela, jogar; recarregar e começar com o Enter. Depois a pausa. Na resolução: trocar o título por outro nome, o subtítulo por outra frase, e a cor de fundo, mostrando o antes e o depois lado a lado.

**Depois do trecho:** o aluno realiza a etapa, testa e mantém o trabalho no mesmo projeto. A explicação conceitual está na descoberta e no texto anterior; não repetir um monólogo teórico durante a montagem.

**Produção:** aula-08-passo-03: gravar a demonstração "testar e deixar com a sua cara" conforme roteiro.md; enviar o vídeo e inserir o bloco nesta seção.

## Fechamento e evidência

**Fala / texto de fechamento:**

Leia a dica como alguém que nunca viu o jogo. Teste cada controle que ela promete e confirme que a partida só começa quando você manda. Envie.

Na Aula 9, uma batida terá consequência e você poderá jogar de novo.

**Professor:** observar as relações escolhidas, os parâmetros testados e a aplicação no projeto. Uma previsão diferente é ponto de partida para conversar; não é diagnóstico de dificuldade. Responder ao pedido de ajuda na seção em que ocorreu.

**Conclusão:** cumprir as atividades essenciais e as entregas já configuradas. Assistir ao vídeo inteiro não é requisito. Não adicionar XP, publicação ou desbloqueio ao clicar na experiência.

## Produção e importação

1. Abrir a aula original em rascunho, carregar `manifesto.json`, vincular ao destino e conferir a prévia. Os slugs são rótulos de autoria; o vínculo explícito usa o curso e a aula reais.
2. Preservar os blocos de projeto, os quizzes, anexos e seus IDs. O importador mantém os materiais não referenciados em uma seção final; reposicionar os quizzes e materiais apropriados antes de publicar.
3. Gravar os trechos acima no estado correto do projeto, enviar no uploader Vimeo já existente no admin e posicionar cada novo bloco na seção indicada. Conferir legibilidade, áudio e legendas. Não há arquivo de vídeo novo neste pacote.
4. Remover cada pendência de mídia apenas depois de vincular e conferir o trecho. Fazer a prévia completa e testar a continuidade para a aula seguinte; publicar somente após essa revisão.

Nenhuma URL, mídia ou minutagem foi inventada. Nenhuma aula publicada foi sobrescrita automaticamente.
