# A chuva de asteroides

Uma aula, organizada em 10 seções. Público: 9 a 16 anos.

Fonte: `roteiro-aula-dia3-desafio-primeiro-jogo.md`. SHA-256: `42f032a7ead97c237bcb82ed1b6a97405484801d4de4dc6e9d6598bc41446b55`.
O original foi preservado. Este roteiro substitui a sequência didática da aula, sem abrir um curso ou uma área de revisão paralela.

## Estado de entrada e resultado

Seu projeto já tem nave e tiros. Agora falta algo para desviar e acertar.

**Resultado:** Controlar a frequência de criação e ligar a colisão à remoção dos objetos.

**Ambiente:** o mesmo Estúdio incorporado acompanha as seções. Preservar o projeto inicial, a continuidade e a entrega já configurados na aula.

## 1. A criação de hoje

**Texto para o aluno:**

Oi! Seu projeto já tem nave e tiros. Agora falta algo para desviar e acertar.

Hoje você vai controlar a frequência de criação e ligar a colisão à remoção dos objetos.

Você pode voltar às seções pelo índice e pedir ajuda ao professor onde surgir a dúvida.

## 2. Descoberta antes da explicação

**Modelo:** prediction. **Essencial:** não; a previsão é um convite, sem punição por hipótese inicial.

**Título:** Qual chuva fica mais intensa?

Dois jogos rodam no mesmo ritmo. Um cria um asteroide a cada 20 quadros, outro a cada 80. Faça sua previsão.

**Interação:** usar o bloco funcional do manifesto. Experimentação e HTML guardam estado; a conclusão essencial usa a conferência nativa no servidor. Não pontuar a velocidade nem descontar por pistas.

**Pistas disponíveis:**

- Imagine marcar os quadros 20, 40, 60… e depois 80, 160…

## 3. Explicação após observar

**Texto didático (permanece na seção, sem exigir vídeo):**

Um relógio de quadros decide quando nasce outro asteroide. Esperar menos quadros produz mais objetos no mesmo período: 20 é uma chuva mais frequente que 80. O relógio que cria fica ao lado do que move e desenha, porque são tarefas com ritmos diferentes. A colisão liga duas coisas que se encontram. Ao tirar o tiro e o asteroide dos grupos, aquela mesma batida não continua valendo nos quadros seguintes.

**Condução:** se a criança já percebeu a relação, segue para construir; se ainda não percebeu, pode ler, voltar à experiência ou pedir ajuda. Na gravação prática, retomar apenas a frase necessária para orientar o encaixe.

## Demonstrações e aplicação

Helena narra; a captura mostra uma ação de cada vez. Em arte, Júlio demonstra o desenho dele e as escolhas visuais continuam livres. Cada trecho termina devolvendo a ação ao aluno. A duração é determinada pela demonstração legível, sem acelerar o desenho para cumprir uma meta artificial.

### 1. criar o grupo dos asteroides

**Narração revisada:**

Em Jogo 2D, Muitos, crie o grupo asteroides em Ao iniciar, abaixo de tiros. Agora cada tipo tem seu próprio grupo.

**Na tela (sequência técnica preservada do original):**

categoria "Jogo 2D", subcategoria "Muitos", arrastar "Criar grupo de sprites" para dentro do Ao iniciar, abaixo do grupo tiros; conferir o nome "asteroides".

**Depois do trecho:** o aluno realiza a etapa, testa e mantém o trabalho no mesmo projeto. A explicação conceitual está na descoberta e no texto anterior; não repetir um monólogo teórico durante a montagem.

**Produção:** dia-3-passo-01: gravar a demonstração "criar o grupo dos asteroides" conforme roteiro.md; enviar o vídeo e inserir o bloco nesta seção.

### 2. montar o relógio da chuva

**Narração revisada:**

Em Tempo e repetição, coloque A cada quadros dentro de Enquanto estiver rodando, ao lado de A cada quadro do jogo. Escreva 40. O relógio da criação fica separado do movimento.

**Na tela (sequência técnica preservada do original):**

categoria "Jogo 2D", subcategoria "Tempo e repetição", arrastar "A cada quadros" para dentro do Enquanto estiver rodando, AO LADO do "A cada quadro do jogo" (não dentro), e escrever 40.

**Depois do trecho:** o aluno realiza a etapa, testa e mantém o trabalho no mesmo projeto. A explicação conceitual está na descoberta e no texto anterior; não repetir um monólogo teórico durante a montagem.

**Produção:** dia-3-passo-02: gravar a demonstração "montar o relógio da chuva" conforme roteiro.md; enviar o vídeo e inserir o bloco nesta seção.

### 3. criar o asteroide surpresa

**Narração revisada:**

Em Kit espaço, coloque No grupo criar um asteroide dentro do relógio. Escolha asteroides. No x, use um x aleatório na tela, de Mira e contas. Confira y menos 30, tamanho 40, vx 0 e vy 3.

**Na tela (sequência técnica preservada do original):**

categoria "Jogo 2D", subcategoria "Kit espaço", arrastar "No grupo criar um asteroide" para dentro do "A cada 40 quadros" (grupo asteroides); no x, encaixar "um x aleatório na tela" (Mira e contas); y -30, tamanho 40, cor cinza, vx 0, vy 3.

**Depois do trecho:** o aluno realiza a etapa, testa e mantém o trabalho no mesmo projeto. A explicação conceitual está na descoberta e no texto anterior; não repetir um monólogo teórico durante a montagem.

**Produção:** dia-3-passo-03: gravar a demonstração "criar o asteroide surpresa" conforme roteiro.md; enviar o vídeo e inserir o bloco nesta seção.

### 4. fazer os asteroides caírem e sumirem

**Narração revisada:**

Em A cada quadro, abaixo dos tiros, encaixe Atualizar o grupo asteroides, Tirar do grupo quem sair da tela e Desenhar o grupo asteroides. Deixe vazio o fazer da limpeza. Rode e observe a chuva.

**Na tela (sequência técnica preservada do original):**

dentro do "A cada quadro do jogo", abaixo do "Desenhar o grupo tiros", encaixar na ordem: "Atualizar (mover) o grupo" (asteroides), "Tirar do grupo quem sair da tela" (asteroides, fazer vazio), "Desenhar o grupo" (asteroides). Os asteroides começam a cair na tela.

**Depois do trecho:** o aluno realiza a etapa, testa e mantém o trabalho no mesmo projeto. A explicação conceitual está na descoberta e no texto anterior; não repetir um monólogo teórico durante a montagem.

**Produção:** dia-3-passo-04: gravar a demonstração "fazer os asteroides caírem e sumirem" conforme roteiro.md; enviar o vídeo e inserir o bloco nesta seção.

### 5. explodir asteroide com tiro

**Narração revisada:**

Em Colisões, encaixe Para cada colisão entre os grupos, usando tiros e asteroides. Dentro, tire tiro e asteroide de seus grupos, solte uma explosão no asteroide e toque o som de explosão. Confira os apelidos antes de testar.

**Na tela (sequência técnica preservada do original):**

categoria "Jogo 2D", subcategoria "Colisões", arrastar "Para cada colisão entre os grupos" para dentro do "A cada quadro do jogo", abaixo do "Desenhar o grupo asteroides"; configurar grupos tiros e asteroides (apelidos tiro e asteroide). Dentro, na ordem: "Tirar o sprite tiro do grupo tiros" (Muitos), "Tirar o sprite asteroide do grupo asteroides" (Muitos), "Soltar explosão no sprite asteroide" cor laranja (Kit espaço), "Tocar som de explosão" (Kit espaço).

**Depois do trecho:** o aluno realiza a etapa, testa e mantém o trabalho no mesmo projeto. A explicação conceitual está na descoberta e no texto anterior; não repetir um monólogo teórico durante a montagem.

**Produção:** dia-3-passo-05: gravar a demonstração "explodir asteroide com tiro" conforme roteiro.md; enviar o vídeo e inserir o bloco nesta seção.

### 6. hora de explodir

**Narração revisada:**

Clique no jogo, desvie e atire. Compare o relógio em 20 e em 80. Sua previsão combinou com o resultado? Volte a 40 para seguir com o mesmo ponto de partida.

**Na tela (sequência técnica preservada do original):**

clicar na área do jogo, desviar dos asteroides, atirar e explodir vários; depois trocar o 40 do relógio por 20 e por 80.

**Depois do trecho:** o aluno realiza a etapa, testa e mantém o trabalho no mesmo projeto. A explicação conceitual está na descoberta e no texto anterior; não repetir um monólogo teórico durante a montagem.

**Produção:** dia-3-passo-06: gravar a demonstração "hora de explodir" conforme roteiro.md; enviar o vídeo e inserir o bloco nesta seção.

## Fechamento e evidência

**Fala / texto de fechamento:**

Um tiro que acerta deve desaparecer junto com o asteroide, produzir explosão e som. Observe também os objetos saindo da tela. Envie o projeto.

No Dia 4, essas batidas vão mudar os pontos e as vidas.

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

**Resposta e explicação:** Controlar a frequência de criação e ligar a colisão à remoção dos objetos.

### Qual chuva fica mais intensa?

**Checagem:** Qual intervalo produz mais asteroides no mesmo tempo?

**Resposta e explicação:** 20 quadros produz mais que 80.

### O que aconteceu?

**Checagem:** Qual intervalo produz mais asteroides no mesmo tempo?

**Resposta e explicação:** 20 quadros produz mais que 80.

### criar o grupo dos asteroides

**Checagem:** Por que criar um grupo asteroides separado de tiros?

**Resposta e explicação:** Para cuidar de cada tipo e identificar os grupos nas colisões.

### montar o relógio da chuva

**Checagem:** Onde fica o relógio que cria asteroides?

**Resposta e explicação:** Ao lado do relógio de cada quadro, em Enquanto estiver rodando.

### criar o asteroide surpresa

**Checagem:** Por que usar y menos 30 e vy 3 no asteroide?

**Resposta e explicação:** Ele nasce acima da tela e cai.

### fazer os asteroides caírem e sumirem

**Checagem:** Quais ações mantêm a chuva visível sem acumular objetos fora da tela?

**Resposta e explicação:** Atualizar, limpar quem saiu e desenhar asteroides.

### explodir asteroide com tiro

**Checagem:** Por que remover tiro e asteroide depois do acerto?

**Resposta e explicação:** Para a mesma batida não continuar valendo nos quadros seguintes.

### hora de explodir

**Checagem:** Depois de comparar 20 e 80, qual é o ponto de partida para seguir?

**Resposta e explicação:** 40 quadros.

### Teste e guarde sua criação

Entregar o projeto e atingir a nota mínima configurada, quando houver.
