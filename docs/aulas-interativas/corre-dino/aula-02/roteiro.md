# O Dino aparece e corre

Uma aula, organizada em 7 seções. Público: 9 a 16 anos.

Fonte: `roteiro-aula-02-corre-dino.md`. SHA-256: `c93882dd5de5ee1c27966f6c98e86bf301e5066acc3d059cf1c07cf38a8bd2a1`.
O original foi preservado. Este roteiro substitui a sequência didática da aula, sem abrir um curso ou uma área de revisão paralela.

## Estado de entrada e resultado

Retome o projeto da Aula 1: tela preparada e dino criado, ainda sem aparecer.

**Resultado:** Organizar a ordem de desenho em cada quadro e reconhecer o efeito das camadas.

**Ambiente:** o mesmo Estúdio incorporado acompanha as seções. Preservar o projeto inicial, a continuidade e a entrega já configurados na aula.

## 1. A criação de hoje

**Texto para o aluno:**

Oi! Retome o projeto da Aula 1: tela preparada e dino criado, ainda sem aparecer.

Hoje você vai organizar a ordem de desenho em cada quadro e reconhecer o efeito das camadas.

Você pode voltar às seções pelo índice e pedir ajuda ao professor onde surgir a dúvida.

## 2. Descoberta antes da explicação

**Modelo:** sequence. **Essencial:** sim

**Título:** Quem fica na frente?

Ordene as ações para mostrar o dino na frente da floresta, sem rastros do quadro anterior.

**Interação:** usar o bloco funcional do manifesto. Experimentação e HTML guardam estado; a conclusão essencial usa a conferência nativa no servidor. Não pontuar a velocidade nem descontar por pistas.

**Pistas disponíveis:**

- O fundo precisa aparecer antes do personagem; a limpeza precisa acontecer antes dos desenhos.

## 3. Explicação após observar

**Texto didático (permanece na seção, sem exigir vídeo):**

Imagine desenhar um personagem num papel e depois cobri-lo com outro papel de floresta. Ele continua lá, mas fica escondido. No jogo, a ordem de desenho produz esse efeito: quem é desenhado por último aparece por cima. A cada quadro, limpamos e desenhamos de novo. O dino parece correr enquanto o fundo passa; o movimento percebido pode vir do cenário, mesmo quando a posição horizontal do personagem muda pouco.

**Condução:** se a criança já percebeu a relação, segue para construir; se ainda não percebeu, pode ler, voltar à experiência ou pedir ajuda. Na gravação prática, retomar apenas a frase necessária para orientar o encaixe.

## Demonstrações e aplicação

Helena narra; a captura mostra uma ação de cada vez. Em arte, Júlio demonstra o desenho dele e as escolhas visuais continuam livres. Cada trecho termina devolvendo a ação ao aluno. A duração é determinada pela demonstração legível, sem acelerar o desenho para cumprir uma meta artificial.

### 1. ligar o motor do jogo

**Narração revisada:**

Em Áreas do projeto, coloque Enquanto estiver rodando ao lado de Ao iniciar. Em Jogo 2D, Tempo e repetição, encaixe A cada quadro do jogo dentro dele. Esse será o motor do desenho.

**Na tela (sequência técnica preservada do original):**

primeiro a categoria "Áreas do projeto": pegar o bloco "Enquanto estiver rodando" e soltar ao lado do "Ao iniciar", com um espacinho, mostrando que ficam lado a lado e nunca uma dentro da outra. Depois Jogo 2D › Tempo e repetição, arrastar "A cada quadro do jogo" para dentro dela, ainda vazia.

**Depois do trecho:** o aluno realiza a etapa, testa e mantém o trabalho no mesmo projeto. A explicação conceitual está na descoberta e no texto anterior; não repetir um monólogo teórico durante a montagem.

**Produção:** aula-02-passo-01: gravar a demonstração "ligar o motor do jogo" conforme roteiro.md; enviar o vídeo e inserir o bloco nesta seção.

### 2. desenhar o mundo

**Narração revisada:**

Em Sprites, comece com Desenhar o sprite e escolha dino. Em Aparência, encaixe Limpar a tela no topo. Em Kit dino, experimente colocar a floresta depois do dino: ele some. Mova a floresta para antes dele. Use velocidade 5 e remova só o bloco da borda, preservando os vizinhos.

**Na tela (sequência técnica preservada do original):**

(no fim da Parte, a sequência das ferramentas: arrastar o "Mostrar a borda da tela" pra lixeira do jeito normal e mostrar os três blocos indo junto; apertar Ctrl+Z e mostrar os três voltando; depois botão direito no bloco, menu de contexto aberto, escolher "Apagar este bloco" e mostrar a pilha se fechando sozinha). Dentro do "A cada quadro do jogo", encaixar primeiro só "Desenhar o sprite dino" (Sprites, trocando "jogador" por "dino") e rodar; depois encaixar "Limpar a tela" (Aparência) no topo; depois encaixar "Desenhar fundo de floresta" (Kit dino, trocar 4 por 5) **abaixo** do dino, de propósito, e rodar (o dino some); por fim mover a floresta para o meio, na ordem certa.

**Depois do trecho:** o aluno realiza a etapa, testa e mantém o trabalho no mesmo projeto. A explicação conceitual está na descoberta e no texto anterior; não repetir um monólogo teórico durante a montagem.

**Produção:** aula-02-passo-02: gravar a demonstração "desenhar o mundo" conforme roteiro.md; enviar o vídeo e inserir o bloco nesta seção.

### 3. testar e deixar do seu jeito

**Narração revisada:**

Clique no jogo e observe a floresta passando. Teste velocidades 2 e 9 para o fundo. Compare a sensação de corrida e escolha seu ritmo. Se apagar uma pilha sem querer, use Ctrl+Z; para remover um bloco isolado, use Apagar este bloco no botão direito.

**Na tela (sequência técnica preservada do original):**

clicar na área do jogo; a floresta passa e o dino corre; depois trocar a velocidade da floresta de 5 para 2 e para 9, e voltar para a escolhida.

**Depois do trecho:** o aluno realiza a etapa, testa e mantém o trabalho no mesmo projeto. A explicação conceitual está na descoberta e no texto anterior; não repetir um monólogo teórico durante a montagem.

**Produção:** aula-02-passo-03: gravar a demonstração "testar e deixar do seu jeito" conforme roteiro.md; enviar o vídeo e inserir o bloco nesta seção.

## Fechamento e evidência

**Fala / texto de fechamento:**

Confirme a ordem limpar, floresta e dino. O personagem precisa aparecer por cima do cenário, sem rastros. Envie o projeto.

Na Aula 3, o dino vai responder ao pulo e voltar ao chão.

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

**Resposta e explicação:** Organizar a ordem de desenho em cada quadro e reconhecer o efeito das camadas.

### Quem fica na frente?

Resolver a ordenação ou associação desta descoberta; a resposta é conferida no servidor.

### O que aconteceu?

**Checagem:** Por que o dino some quando a floresta é desenhada depois dele?

**Resposta e explicação:** O desenho posterior cobre o anterior.

### ligar o motor do jogo

**Checagem:** O que A cada quadro faz nesta etapa?

**Resposta e explicação:** Repete as ações de desenho durante o jogo.

### desenhar o mundo

**Checagem:** Qual ordem mantém o dino visível e sem rastros?

**Resposta e explicação:** Limpar, desenhar a floresta e desenhar o dino.

### testar e deixar do seu jeito

**Checagem:** Ao comparar velocidades 2 e 9 do fundo, o que muda?

**Resposta e explicação:** A sensação de velocidade da corrida.

### Teste e guarde sua criação

Entregar o projeto e atingir a nota mínima configurada, quando houver.
