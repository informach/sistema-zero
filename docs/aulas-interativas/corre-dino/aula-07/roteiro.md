# Cada coisa na sua tela

Uma aula, organizada em 7 seções. Público: 9 a 16 anos.

Fonte: `roteiro-aula-07-corre-dino.md`. SHA-256: `7f3962d0ac9c56eae11ecd55631ff082d2ff03e8de476014f204f07b47ba9db5`.
O original foi preservado. Este roteiro substitui a sequência didática da aula, sem abrir um curso ou uma área de revisão paralela.

## Estado de entrada e resultado

O projeto vem da Aula 6 com limpeza dos cactos e sem o contador de diagnóstico.

**Resultado:** Usar uma condição para executar a partida somente na tela jogando.

**Ambiente:** o mesmo Estúdio incorporado acompanha as seções. Preservar o projeto inicial, a continuidade e a entrega já configurados na aula.

## 1. A criação de hoje

**Texto para o aluno:**

Oi! O projeto vem da Aula 6 com limpeza dos cactos e sem o contador de diagnóstico.

Hoje você vai usar uma condição para executar a partida somente na tela jogando.

Você pode voltar às seções pelo índice e pedir ajuda ao professor onde surgir a dúvida.

## 2. Descoberta antes da explicação

**Modelo:** html. **Essencial:** sim

**Título:** O relógio espera a partida?

Teste o relógio em início e em jogando. Observe por que uma ação repetida também precisa de uma condição.

**Interação:** usar o bloco funcional do manifesto. Experimentação e HTML guardam estado; a conclusão essencial usa a conferência nativa no servidor. Não pontuar a velocidade nem descontar por pistas.

**Pistas disponíveis:**

- Compare o contador sem condição quando a tela ainda está em início.

## 3. Explicação após observar

**Texto didático (permanece na seção, sem exigir vídeo):**

Uma condição é uma pergunta que o programa faz antes de agir. A tela atual guarda em que momento estamos. Podemos manter a floresta desenhando e deixar as ações da partida dentro de Se a tela é jogando. O relógio que cria cactos também precisa dessa proteção. Mover uma sequência para dentro de uma condição muda quando ela funciona, sem reconstruir seus blocos. O resultado de hoje pode parecer vazio: é a partida esperando para começar.

**Condução:** se a criança já percebeu a relação, segue para construir; se ainda não percebeu, pode ler, voltar à experiência ou pedir ajuda. Na gravação prática, retomar apenas a frase necessária para orientar o encaixe.

## Demonstrações e aplicação

Helena narra; a captura mostra uma ação de cada vez. Em arte, Júlio demonstra o desenho dele e as escolhas visuais continuam livres. Cada trecho termina devolvendo a ação ao aluno. A duração é determinada pela demonstração legível, sem acelerar o desenho para cumprir uma meta artificial.

### 1. dizer em qual tela o jogo abre

**Narração revisada:**

Em Jogo 2D, Telas e cenas, coloque Ir para a tela em Ao iniciar, como último bloco. Escolha inicio. Agora o jogo sabe em qual tela começa.

**Na tela (sequência técnica preservada do original):**

Jogo 2D › Telas e cenas, arrastar "Ir para a tela" como último bloco do Ao iniciar, logo abaixo do "Criar grupo de sprites", com "inicio" escolhido na listinha.

**Depois do trecho:** o aluno realiza a etapa, testa e mantém o trabalho no mesmo projeto. A explicação conceitual está na descoberta e no texto anterior; não repetir um monólogo teórico durante a montagem.

**Produção:** aula-07-passo-01: gravar a demonstração "dizer em qual tela o jogo abre" conforme roteiro.md; enviar o vídeo e inserir o bloco nesta seção.

### 2. a pergunta da tela "jogando"

**Narração revisada:**

Em Programação, Lógica e Se, coloque Se depois de Desenhar fundo de floresta. Retire a comparação que veio nele e encaixe a tela atual é, de Telas e cenas. Escolha jogando.

**Na tela (sequência técnica preservada do original):**

Programação › Lógica & Se, arrastar o "Se" para dentro do "A cada quadro do jogo", logo abaixo do "Desenhar fundo de floresta"; tirar a comparação de fábrica e jogar na lixeira; encaixar "a tela atual é" (Jogo 2D › Telas e cenas) no lugar e escolher "jogando".

**Depois do trecho:** o aluno realiza a etapa, testa e mantém o trabalho no mesmo projeto. A explicação conceitual está na descoberta e no texto anterior; não repetir um monólogo teórico durante a montagem.

**Produção:** aula-07-passo-02: gravar a demonstração "a pergunta da tela "jogando"" conforme roteiro.md; enviar o vídeo e inserir o bloco nesta seção.

### 3. mudar o jogo pra dentro

**Narração revisada:**

Arraste a sequência a partir de Aplicar a gravidade para dentro do Se: são seis blocos. Limpar a tela e a floresta ficam fora. Envolva também a criação do relógio de 1.4 com Se a tela é jogando. Preserve o evento de pulo.

**Na tela (sequência técnica preservada do original):**

arrastar do "Aplicar a gravidade do mundo" para baixo (6 blocos) para dentro do Se; o Limpar a tela e o fundo de floresta ficam FORA. Cartela na tela com o nome da manobra e as 4 etapas do "embrulhar no Se". Depois, repetir a manobra uma vez: envolver o conteúdo do relógio de 1.4 s num "Se a tela atual é jogando". Mostrar o evento do pulo intacto, sem mexer nele, enquanto explica por que ele não precisa. No fim, rodar e ficar só a floresta.

**Depois do trecho:** o aluno realiza a etapa, testa e mantém o trabalho no mesmo projeto. A explicação conceitual está na descoberta e no texto anterior; não repetir um monólogo teórico durante a montagem.

**Produção:** aula-07-passo-03: gravar a demonstração "mudar o jogo pra dentro" conforme roteiro.md; enviar o vídeo e inserir o bloco nesta seção.

## Fechamento e evidência

**Fala / texto de fechamento:**

Ao recarregar, deve aparecer só a floresta. Confira os dois Se e os blocos que ficaram dentro. A partida ainda não tem comando de início; isso chega na próxima aula. Envie.

Na Aula 8, a tela de início vai convidar o jogador e permitir que ele comece.

**Professor:** observar as relações escolhidas, os parâmetros testados e a aplicação no projeto. Uma previsão diferente é ponto de partida para conversar; não é diagnóstico de dificuldade. Responder ao pedido de ajuda na seção em que ocorreu.

**Conclusão:** concluir as verificações de todas as seções e a entrega do fechamento, quando houver. Assistir ao vídeo inteiro não é requisito. Não adicionar XP, publicação ou desbloqueio ao clicar na experiência.

## Produção e importação

1. Abrir a aula original em rascunho, carregar `manifesto.json`, vincular ao destino e conferir a prévia. Os slugs são rótulos de autoria; o vínculo explícito usa o curso e a aula reais.
2. Preservar os blocos de projeto, os quizzes, anexos e seus IDs. O importador mantém os materiais não referenciados em uma seção final; reposicionar os quizzes e materiais apropriados antes de publicar.
3. Gravar os trechos acima no estado correto do projeto, enviar no uploader Vimeo já existente no admin e posicionar cada novo bloco na seção indicada. Conferir legibilidade, áudio e legendas. Não há arquivo de vídeo novo neste pacote.
4. Remover cada pendência de mídia apenas depois de vincular e conferir o trecho. Fazer a prévia completa e testar a continuidade para a aula seguinte; publicar somente após essa revisão.

Nenhuma URL, mídia ou minutagem foi inventada. Nenhuma aula publicada foi sobrescrita automaticamente.

## Verificações para avançar nas seções

O índice permite revisar seções concluídas. A próxima seção abre ao cumprir os critérios da atual. Pistas e novas tentativas não descontam progresso. A entrega do projeto fica no fechamento.

### A criação de hoje

**Checagem:** O que vamos aprender a fazer nesta aula?

**Resposta e explicação:** Usar uma condição para executar a partida somente na tela jogando.

### O relógio espera a partida?

**Checagem:** Um relógio fora da condição pode executar antes da partida?

**Resposta e explicação:** Pode; ele precisa perguntar se a tela é jogando

### O que aconteceu?

**Checagem:** Para que serve Se a tela é jogando?

**Resposta e explicação:** Executar ações da partida apenas nesse momento.

### dizer em qual tela o jogo abre

**Checagem:** Qual tela deve ser definida ao iniciar?

**Resposta e explicação:** inicio.

### a pergunta da tela "jogando"

**Checagem:** Qual condição deve proteger as ações da partida?

**Resposta e explicação:** A tela atual é jogando.

### mudar o jogo pra dentro

**Checagem:** Além das ações de cada quadro, o que precisa da mesma condição?

**Resposta e explicação:** O relógio que cria cactos.

### Teste e guarde sua criação

Entregar o projeto e atingir a nota mínima configurada, quando houver.
