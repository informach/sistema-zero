# A nave ganha vida

Uma aula, organizada em 10 seções. Público: 9 a 16 anos.

Fonte: `roteiro-aula-dia1-desafio-primeiro-jogo.md`. SHA-256: `047763b7d5154ab4081c2127d7330c3af9e19495d79832c9028f5453e75ce6e6`.
O original foi preservado. Este roteiro substitui a sequência didática da aula, sem abrir um curso ou uma área de revisão paralela.

## Estado de entrada e resultado

Você está começando um projeto vazio. Ao fim desta aula, terá uma nave que responde às setas.

**Resultado:** Distinguir preparar o jogo de repetir ações em cada quadro.

**Ambiente:** o mesmo Estúdio incorporado acompanha as seções. Preservar o projeto inicial, a continuidade e a entrega já configurados na aula.

## 1. A criação de hoje

**Texto para o aluno:**

Oi! Você está começando um projeto vazio. Ao fim desta aula, terá uma nave que responde às setas.

Hoje você vai distinguir preparar o jogo de repetir ações em cada quadro.

Você pode voltar às seções pelo índice e pedir ajuda ao professor onde surgir a dúvida.

## 2. Descoberta antes da explicação

**Modelo:** html. **Essencial:** sim

**Título:** O rastro da nave

Passe alguns quadros com a limpeza ligada. Desligue e passe outros. O que fica na tela?

**Interação:** usar o bloco funcional do manifesto. Experimentação e HTML guardam estado; a conclusão essencial usa a conferência nativa no servidor. Não pontuar a velocidade nem descontar por pistas.

**Pistas disponíveis:**

- Compare quantos desenhos ficam na tela quando a limpeza está desligada.

## 3. Explicação após observar

**Texto didático (permanece na seção, sem exigir vídeo):**

Pense em montar um palco e depois apresentar uma peça. Preparar a tela e criar a nave acontece no começo. Desenhar e mover acontece muitas vezes enquanto o jogo roda. Cada atualização é um quadro. Limpar antes de desenhar evita que o desenho anterior fique como um rastro. A nave pode existir na memória e ainda não aparecer: criar e desenhar são ações diferentes. No seu jogo, Ao iniciar prepara; Enquanto estiver rodando recebe a repetição.

**Condução:** se a criança já percebeu a relação, segue para construir; se ainda não percebeu, pode ler, voltar à experiência ou pedir ajuda. Na gravação prática, retomar apenas a frase necessária para orientar o encaixe.

## Demonstrações e aplicação

Helena narra; a captura mostra uma ação de cada vez. Em arte, Júlio demonstra o desenho dele e as escolhas visuais continuam livres. Cada trecho termina devolvendo a ação ao aluno. A duração é determinada pela demonstração legível, sem acelerar o desenho para cumprir uma meta artificial.

### 1. montar as áreas do projeto

**Narração revisada:**

Em Áreas do projeto, arraste Ao iniciar. Depois coloque Enquanto estiver rodando ao lado. São duas áreas separadas. A primeira prepara o jogo; a segunda vai receber o que acontece durante a partida.

**Na tela (sequência técnica preservada do original):**

abrir a categoria "Áreas do projeto", arrastar "Ao iniciar" para a área do meio; depois arrastar "Enquanto estiver rodando" e soltar ao lado, com um espacinho.

**Depois do trecho:** o aluno realiza a etapa, testa e mantém o trabalho no mesmo projeto. A explicação conceitual está na descoberta e no texto anterior; não repetir um monólogo teórico durante a montagem.

**Produção:** dia-1-passo-01: gravar a demonstração "montar as áreas do projeto" conforme roteiro.md; enviar o vídeo e inserir o bloco nesta seção.

### 2. preparar a tela do jogo

**Narração revisada:**

Em Jogo 2D, abra Aparência. Encaixe Preparar o jogo em tela cheia dentro de Ao iniciar. Confira 800 por 480 e escolha a cor do espaço. Esse retângulo será o lugar onde seu jogo acontece.

**Na tela (sequência técnica preservada do original):**

categoria "Jogo 2D", subcategoria "Aparência", arrastar "Preparar o jogo em tela cheia" para dentro do Ao iniciar; conferir os números 800 × 480 e escolher a cor de fundo.

**Depois do trecho:** o aluno realiza a etapa, testa e mantém o trabalho no mesmo projeto. A explicação conceitual está na descoberta e no texto anterior; não repetir um monólogo teórico durante a montagem.

**Produção:** dia-1-passo-02: gravar a demonstração "preparar a tela do jogo" conforme roteiro.md; enviar o vídeo e inserir o bloco nesta seção.

### 3. criar a sua nave

**Narração revisada:**

Em Jogo 2D, abra Kit espaço e encaixe Criar nave abaixo da preparação. Use x 400, y 410, largura 54 e altura 62. As cores do corpo e das asas são suas escolhas.

**Na tela (sequência técnica preservada do original):**

categoria "Jogo 2D", subcategoria "Kit espaço", arrastar "Criar nave" para dentro do Ao iniciar, abaixo do Preparar o jogo; ajustar x 400, y 410, largura 54, altura 62; escolher as cores do corpo e das asas.

**Depois do trecho:** o aluno realiza a etapa, testa e mantém o trabalho no mesmo projeto. A explicação conceitual está na descoberta e no texto anterior; não repetir um monólogo teórico durante a montagem.

**Produção:** dia-1-passo-03: gravar a demonstração "criar a sua nave" conforme roteiro.md; enviar o vídeo e inserir o bloco nesta seção.

### 4. ligar o motor do jogo

**Narração revisada:**

Em Jogo 2D, abra Tempo e repetição. Encaixe A cada quadro do jogo dentro de Enquanto estiver rodando. Ele ainda está vazio: vamos colocar a sequência de ações que você acabou de experimentar.

**Na tela (sequência técnica preservada do original):**

categoria "Jogo 2D", subcategoria "Tempo e repetição", arrastar "A cada quadro do jogo" para dentro do Enquanto estiver rodando, ainda vazio.

**Depois do trecho:** o aluno realiza a etapa, testa e mantém o trabalho no mesmo projeto. A explicação conceitual está na descoberta e no texto anterior; não repetir um monólogo teórico durante a montagem.

**Produção:** dia-1-passo-04: gravar a demonstração "ligar o motor do jogo" conforme roteiro.md; enviar o vídeo e inserir o bloco nesta seção.

### 5. desenhar o mundo e dar vida à nave

**Narração revisada:**

Dentro de A cada quadro, encaixe Limpar a tela, o fundo de estrelas, o movimento com as setas, a proteção das bordas e o desenho da nave. No movimento use velocidade 7. Confira o nome nave em todos os blocos que apontam para ela.

**Na tela (sequência técnica preservada do original):**

dentro do "A cada quadro do jogo", na ordem: Limpar a tela (Aparência), Desenhar fundo de estrelas com velocidade 1 (Kit espaço), Mover o sprite nave com as setas com velocidade 7 (Movimento), Manter o sprite dentro da tela (Movimento, corrigindo "heroi" para "nave" pelo iconezinho de alerta do bloco), Desenhar o sprite (Sprites, trocando "jogador" para "nave").

**Depois do trecho:** o aluno realiza a etapa, testa e mantém o trabalho no mesmo projeto. A explicação conceitual está na descoberta e no texto anterior; não repetir um monólogo teórico durante a montagem.

**Produção:** dia-1-passo-05: gravar a demonstração "desenhar o mundo e dar vida à nave" conforme roteiro.md; enviar o vídeo e inserir o bloco nesta seção.

### 6. testar e deixar do seu jeito

**Narração revisada:**

Clique na área do jogo e use as setas. Experimente velocidade 12. Depois de editar o número, clique num espaço vazio dos blocos para confirmar; só então volte ao jogo. Compare e escolha uma velocidade confortável.

**Na tela (sequência técnica preservada do original):**

o espaço estrelado com a nave; mover com as setas. Depois os três passinhos bem devagar, com a velocidade: trocar 7 por 12, **clicar num espaço vazio da área dos blocos** (mostrando que é esse clique que confirma), e só então clicar na área do jogo e testar. Vale mostrar de propósito o erro de ir direto pro jogo sem clicar fora, pra criança ver a nave continuar na velocidade antiga. Por último, as cores da nave.

**Depois do trecho:** o aluno realiza a etapa, testa e mantém o trabalho no mesmo projeto. A explicação conceitual está na descoberta e no texto anterior; não repetir um monólogo teórico durante a montagem.

**Produção:** dia-1-passo-06: gravar a demonstração "testar e deixar do seu jeito" conforme roteiro.md; enviar o vídeo e inserir o bloco nesta seção.

## Fechamento e evidência

**Fala / texto de fechamento:**

Teste as quatro setas e encoste nas bordas. A nave precisa aparecer, responder e permanecer na tela. Envie o projeto quando estiver pronto.

No Dia 2, o mesmo projeto vai ganhar tiros. Não comece um jogo novo.

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

**Resposta e explicação:** Distinguir preparar o jogo de repetir ações em cada quadro.

### O rastro da nave

**Checagem:** O que evita o rastro dos desenhos anteriores?

**Resposta e explicação:** Limpar antes de desenhar a próxima imagem

### O que aconteceu?

**Checagem:** Qual diferença existe entre preparar e desenhar o jogo?

**Resposta e explicação:** Preparar ocorre no começo; desenhar se repete a cada quadro.

### montar as áreas do projeto

Objetivo conferido no projeto pelo servidor: Montar Ao iniciar, Montar Enquanto estiver rodando.

### preparar a tela do jogo

**Checagem:** Qual tamanho de tela vamos usar?

**Resposta e explicação:** 800 por 480.

### criar a sua nave

**Checagem:** O nome nave deve identificar o quê?

**Resposta e explicação:** O personagem usado pelos controles e desenhos.

### ligar o motor do jogo

**Checagem:** Onde entra A cada quadro do jogo?

**Resposta e explicação:** Dentro de Enquanto estiver rodando.

### desenhar o mundo e dar vida à nave

**Checagem:** Qual ação evita rastros antes de desenhar novamente?

**Resposta e explicação:** Limpar a tela.

### testar e deixar do seu jeito

**Checagem:** Depois de editar a velocidade, como testar o novo valor?

**Resposta e explicação:** Confirmar clicando fora do campo e voltar ao jogo.

### Teste e guarde sua criação

Entregar o projeto e atingir a nota mínima configurada, quando houver.
