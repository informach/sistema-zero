# Um salto que volta ao chão

Uma aula, organizada em 7 seções. Público: 9 a 16 anos.

Fonte: `roteiro-aula-03-corre-dino.md`. SHA-256: `98f59a849d4d2f0fb36aa23422de7cb453cb6bf39057665cdfc4fac573495b3b`.
O original foi preservado. Este roteiro substitui a sequência didática da aula, sem abrir um curso ou uma área de revisão paralela.

## Estado de entrada e resultado

Seu dino já aparece correndo na floresta, mas ainda não responde a você.

**Resultado:** Relacionar a gravidade à trajetória e ajustar a força do salto pelo resultado.

**Ambiente:** o mesmo Estúdio incorporado acompanha as seções. Preservar o projeto inicial, a continuidade e a entrega já configurados na aula.

## 1. A criação de hoje

**Texto para o aluno:**

Oi! Seu dino já aparece correndo na floresta, mas ainda não responde a você.

Hoje você vai relacionar a gravidade à trajetória e ajustar a força do salto pelo resultado.

Você pode voltar às seções pelo índice e pedir ajuda ao professor onde surgir a dúvida.

## 2. Descoberta antes da explicação

**Modelo:** experiment. **Essencial:** sim

**Título:** O que traz o salto de volta?

Teste gravidade zero e depois um valor maior que zero. Compare a trajetória atual com a anterior.

**Interação:** usar o bloco funcional do manifesto. Experimentação e HTML guardam estado; a conclusão essencial usa a conferência nativa no servidor. Não pontuar a velocidade nem descontar por pistas.

**Pistas disponíveis:**

- Na linha sem gravidade, observe se a direção vertical chega a se inverter.

## 3. Explicação após observar

**Texto didático (permanece na seção, sem exigir vídeo):**

Quando você joga uma bola para cima, ela sobe, perde velocidade, para por um instante e volta. No modelo da descoberta, a gravidade muda a velocidade a cada passo. No Estúdio, a gravidade do mundo só age nos sprites que recebem o bloco que a aplica. A força do pulo e a gravidade têm papéis diferentes: uma inicia o salto; a outra muda seu movimento e o traz de volta. Alterar um valor por vez ajuda a enxergar o efeito de cada um.

**Condução:** se a criança já percebeu a relação, segue para construir; se ainda não percebeu, pode ler, voltar à experiência ou pedir ajuda. Na gravação prática, retomar apenas a frase necessária para orientar o encaixe.

## Demonstrações e aplicação

Helena narra; a captura mostra uma ação de cada vez. Em arte, Júlio demonstra o desenho dele e as escolhas visuais continuam livres. Cada trecho termina devolvendo a ação ao aluno. A duração é determinada pela demonstração legível, sem acelerar o desenho para cumprir uma meta artificial.

### 1. dar o comando de pulo ao dino

**Narração revisada:**

Em Jogo 2D, Kit dino, encaixe Controlar o dinossauro depois da floresta e antes do desenho do dino. Deixe a força em 15. Teste espaço: ele ainda não está pronto para pular do chão.

**Na tela (sequência técnica preservada do original):**

categoria "Jogo 2D", subcategoria "Kit dino", arrastar "Controlar o dinossauro" pra dentro do "A cada quadro do jogo", logo abaixo de "Desenhar fundo de floresta" e logo acima de "Desenhar o sprite dino". Deixar a força do pulo em 15. Aproximar o zoom no dino pra mostrar a pose travada e os pés no ar. Apertar espaço e a seta pra cima várias vezes, mostrando que nada acontece.

**Depois do trecho:** o aluno realiza a etapa, testa e mantém o trabalho no mesmo projeto. A explicação conceitual está na descoberta e no texto anterior; não repetir um monólogo teórico durante a montagem.

**Produção:** aula-03-passo-01: gravar a demonstração "dar o comando de pulo ao dino" conforme roteiro.md; enviar o vídeo e inserir o bloco nesta seção.

### 2. a gravidade traz o dino pro chão

**Narração revisada:**

Em Jogo 2D, Movimento, coloque Aplicar a gravidade do mundo ao sprite antes de Controlar o dinossauro. Troque jogador por dino. Rode e teste espaço, seta para cima e o clique na parte de cima do jogo. Ele precisa voltar ao chão.

**Na tela (sequência técnica preservada do original):**

categoria "Jogo 2D", subcategoria "Movimento", arrastar "Aplicar a gravidade do mundo ao sprite" e encaixar logo ACIMA do "Controlar o dinossauro". Mostrar o campo escrito "jogador", clicar e trocar pra "dino". Mostrar o dino descendo, pousando na grama e as perninhas voltando a correr. Depois pular com espaço, com a seta pra cima, com o clique na parte de cima da área do jogo, e abaixar com a seta pra baixo e com o clique segurado embaixo. Cartela ilustrando a bolinha subindo, perdendo força, parando no alto e voltando.

**Depois do trecho:** o aluno realiza a etapa, testa e mantém o trabalho no mesmo projeto. A explicação conceitual está na descoberta e no texto anterior; não repetir um monólogo teórico durante a montagem.

**Produção:** aula-03-passo-02: gravar a demonstração "a gravidade traz o dino pro chão" conforme roteiro.md; enviar o vídeo e inserir o bloco nesta seção.

### 3. você escolhe a altura

**Narração revisada:**

Na força do pulo, compare 2 e 30. Um quase não sai do lugar, outro vai alto demais. Experimente 14 e depois valores de 12 a 18. Escolha pelo salto que deixa você jogar melhor, sem mudar a gravidade junto.

**Na tela (sequência técnica preservada do original):**

trocar a força do pulo pra 2, clicar na área do jogo e pular; depois pra 30 e pular, mostrando o dino saindo da tela e o tempo que demora pra voltar. Por fim, deixar em 14 e testar pular por cima de um cacto imaginário.

**Depois do trecho:** o aluno realiza a etapa, testa e mantém o trabalho no mesmo projeto. A explicação conceitual está na descoberta e no texto anterior; não repetir um monólogo teórico durante a montagem.

**Produção:** aula-03-passo-03: gravar a demonstração "você escolhe a altura" conforme roteiro.md; enviar o vídeo e inserir o bloco nesta seção.

## Fechamento e evidência

**Fala / texto de fechamento:**

Teste um salto curto e um alto; depois escolha sua força. Confira se o dino volta ao chão e pode pular novamente. Envie o projeto.

Na Aula 4, você vai ligar o som ao acontecimento certo.

**Professor:** observar as relações escolhidas, os parâmetros testados e a aplicação no projeto. Uma previsão diferente é ponto de partida para conversar; não é diagnóstico de dificuldade. Responder ao pedido de ajuda na seção em que ocorreu.

**Conclusão:** cumprir as atividades essenciais e as entregas já configuradas. Assistir ao vídeo inteiro não é requisito. Não adicionar XP, publicação ou desbloqueio ao clicar na experiência.

## Produção e importação

1. Abrir a aula original em rascunho, carregar `manifesto.json`, vincular ao destino e conferir a prévia. Os slugs são rótulos de autoria; o vínculo explícito usa o curso e a aula reais.
2. Preservar os blocos de projeto, os quizzes, anexos e seus IDs. O importador mantém os materiais não referenciados em uma seção final; reposicionar os quizzes e materiais apropriados antes de publicar.
3. Gravar os trechos acima no estado correto do projeto, enviar no uploader Vimeo já existente no admin e posicionar cada novo bloco na seção indicada. Conferir legibilidade, áudio e legendas. Não há arquivo de vídeo novo neste pacote.
4. Remover cada pendência de mídia apenas depois de vincular e conferir o trecho. Fazer a prévia completa e testar a continuidade para a aula seguinte; publicar somente após essa revisão.

Nenhuma URL, mídia ou minutagem foi inventada. Nenhuma aula publicada foi sobrescrita automaticamente.
