# A faxina dos cactos invisíveis

Uma aula, organizada em 8 seções. Público: 9 a 16 anos.

Fonte: `roteiro-aula-06-corre-dino.md`. SHA-256: `3f35c3213866fcd7d6ca59e0e1c34407f370807a410233aeb5ff95b0cd831a5f`.
O original foi preservado. Este roteiro substitui a sequência didática da aula, sem abrir um curso ou uma área de revisão paralela.

## Estado de entrada e resultado

Os cactos chegam em intervalos de 1,4 segundo e saem pela esquerda. O grupo ainda pode guardar os que você não vê.

**Resultado:** Usar uma medida para investigar objetos invisíveis e verificar a remoção do grupo.

**Ambiente:** o mesmo Estúdio incorporado acompanha as seções. Preservar o projeto inicial, a continuidade e a entrega já configurados na aula.

## 1. A criação de hoje

**Texto para o aluno:**

Oi! Os cactos chegam em intervalos de 1,4 segundo e saem pela esquerda. O grupo ainda pode guardar os que você não vê.

Hoje você vai usar uma medida para investigar objetos invisíveis e verificar a remoção do grupo.

Você pode voltar às seções pelo índice e pedir ajuda ao professor onde surgir a dúvida.

## 2. Descoberta antes da explicação

**Modelo:** experiment. **Essencial:** sim

**Título:** Quantos existem e quantos aparecem?

Teste intervalos 0,1 e 1,4. Compare os objetos criados com os que ainda aparecem. Este modelo mostra a diferença; a remoção será conferida no seu jogo.

**Interação:** usar o bloco funcional do manifesto. Experimentação e HTML guardam estado; a conclusão essencial usa a conferência nativa no servidor. Não pontuar a velocidade nem descontar por pistas.

**Pistas disponíveis:**

- Compare o total criado em dez segundos com a quantidade visível no mesmo instante.

## 3. Explicação após observar

**Texto didático (permanece na seção, sem exigir vídeo):**

Sair da imagem não é o mesmo que deixar de existir no grupo. Sem remoção, o total criado cresce mesmo quando poucos cactos aparecem na tela. Um contador ajuda a observar esse estado invisível. No modelo, cada objeto leva três segundos para sair: o total criado em dez segundos pode ser bem maior que os objetos ainda visíveis. A limpeza remove os que saíram e permite estabilizar a quantidade guardada. Primeiro medimos, depois mudamos a regra e medimos novamente.

**Condução:** se a criança já percebeu a relação, segue para construir; se ainda não percebeu, pode ler, voltar à experiência ou pedir ajuda. Na gravação prática, retomar apenas a frase necessária para orientar o encaixe.

## Demonstrações e aplicação

Helena narra; a captura mostra uma ação de cada vez. Em arte, Júlio demonstra o desenho dele e as escolhas visuais continuam livres. Cada trecho termina devolvendo a ação ao aluno. A duração é determinada pela demonstração legível, sem acelerar o desenho para cumprir uma meta artificial.

### 1. montar o medidor

**Narração revisada:**

Em Placar e HUD, coloque Mostrar placar como último bloco de A cada quadro. Escreva Cactos. No valor, encaixe quantos sprites tem no grupo, de Muitos, e escolha cactos. Use uma cor escura para enxergar o número.

**Na tela (sequência técnica preservada do original):**

Jogo 2D › Placar e HUD, arrastar "Mostrar placar __ valor __ em x __ y __ cor __ tamanho __" para dentro do "A cada quadro do jogo", como último bloco, logo abaixo do "Desenhar o grupo". Percorrer os seis campos na ordem do bloco: no texto escrever "Cactos"; por cima do valor, arrastar "quantos sprites tem no grupo __" (Jogo 2D › Muitos) e escolher o grupo cactos; x e y como vieram; cor azul escuro; tamanho como veio.

**Depois do trecho:** o aluno realiza a etapa, testa e mantém o trabalho no mesmo projeto. A explicação conceitual está na descoberta e no texto anterior; não repetir um monólogo teórico durante a montagem.

**Produção:** aula-06-passo-01: gravar a demonstração "montar o medidor" conforme roteiro.md; enviar o vídeo e inserir o bloco nesta seção.

### 2. provocar o problema

**Narração revisada:**

Troque o relógio de 1.4 para 0.1 por um teste curto. Observe o número enquanto os cactos saem da tela. Ele continua crescendo? Essa é a medida do problema que vamos corrigir.

**Na tela (sequência técnica preservada do original):**

trocar o relógio de 1.4 para 0.1, com a câmera fixa no número do medidor subindo sem parar.

**Depois do trecho:** o aluno realiza a etapa, testa e mantém o trabalho no mesmo projeto. A explicação conceitual está na descoberta e no texto anterior; não repetir um monólogo teórico durante a montagem.

**Produção:** aula-06-passo-02: gravar a demonstração "provocar o problema" conforme roteiro.md; enviar o vídeo e inserir o bloco nesta seção.

### 3. a faxina

**Narração revisada:**

Em Muitos, coloque Tirar do grupo quem sair da tela entre o desenho do grupo e o contador. Escolha cactos, use o apelido cacto e deixe fazer vazio. Compare o número com o teste anterior.

**Na tela (sequência técnica preservada do original):**

Jogo 2D › Muitos, encaixar "Tirar do grupo __ quem sair da tela, para cada um (chamado __ )" dentro do "A cada quadro do jogo", ENTRE o "Desenhar o grupo" e o "Mostrar placar" do medidor. Grupo cactos, apelido sprite → cacto, corpo do fazer vazio. Com o relógio ainda em 0.1, mostrar o número subindo e descendo.

**Depois do trecho:** o aluno realiza a etapa, testa e mantém o trabalho no mesmo projeto. A explicação conceitual está na descoberta e no texto anterior; não repetir um monólogo teórico durante a montagem.

**Produção:** aula-06-passo-03: gravar a demonstração "a faxina" conforme roteiro.md; enviar o vídeo e inserir o bloco nesta seção.

### 4. testar dois ritmos, devolver o relógio e aposentar o medidor

**Narração revisada:**

Com o contador ligado, compare 0.1 e 0.5. Depois devolva o relógio para 1.4 e confira um patamar baixo. Remova o Mostrar placar do medidor, junto com o valor encaixado. A limpeza continua; o medidor já cumpriu sua tarefa.

**Na tela (sequência técnica preservada do original):**

com o medidor aceso, jogar com o relógio em 0.1 e depois em 0.5, comparando o patamar do número; devolver o relógio para 1.4 e mostrar o medidor num patamar baixo, subindo e descendo. Por fim, arrastar o "Mostrar placar" do medidor para a lixeira, com o "quantos sprites tem no grupo" indo junto por estar encaixado dentro dele, e mostrar o laço ficando com oito blocos.

**Depois do trecho:** o aluno realiza a etapa, testa e mantém o trabalho no mesmo projeto. A explicação conceitual está na descoberta e no texto anterior; não repetir um monólogo teórico durante a montagem.

**Produção:** aula-06-passo-04: gravar a demonstração "testar dois ritmos, devolver o relógio e aposentar o medidor" conforme roteiro.md; enviar o vídeo e inserir o bloco nesta seção.

## Fechamento e evidência

**Fala / texto de fechamento:**

A limpeza deve permanecer e o relógio voltar a 1.4. O contador de diagnóstico deve sair ao final desta aula. Envie o projeto já sem o medidor.

Na Aula 7, você vai separar o momento de jogar da tela de início.

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

**Resposta e explicação:** Usar uma medida para investigar objetos invisíveis e verificar a remoção do grupo.

### Quantos existem e quantos aparecem?

**Checagem:** Se um cacto saiu da tela, isso prova que ele saiu do grupo?

**Resposta e explicação:** Não, é preciso uma regra para removê-lo

### O que aconteceu?

**Checagem:** Um cacto saiu da tela. Ele necessariamente saiu do grupo?

**Resposta e explicação:** Não; é preciso uma regra que remova os que saíram.

### montar o medidor

**Checagem:** O contador deve mostrar qual informação?

**Resposta e explicação:** Quantos sprites existem no grupo cactos.

### provocar o problema

**Checagem:** O contador cresce mesmo com cactos fora da tela. O que isso indica?

**Resposta e explicação:** Os objetos continuam guardados no grupo.

### a faxina

**Checagem:** Qual regra faz a faxina do grupo?

**Resposta e explicação:** Tirar do grupo quem sair da tela.

### testar dois ritmos, devolver o relógio e aposentar o medidor

**Checagem:** O que deve permanecer ao finalizar o diagnóstico?

**Resposta e explicação:** A limpeza, com o relógio em 1,4; o medidor pode sair.

### Teste e guarde sua criação

Entregar o projeto e atingir a nota mínima configurada, quando houver.
