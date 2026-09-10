# Quanto tempo você resistiu?

Uma aula, organizada em 9 seções. Público: 9 a 16 anos.

Fonte: `roteiro-aula-11-corre-dino.md`. SHA-256: `b30f94be234e9fb0da4db2fd54da6d3d070b01e51b7b5c0569f6db7568006c6e`.
O original foi preservado. Este roteiro substitui a sequência didática da aula, sem abrir um curso ou uma área de revisão paralela.

## Estado de entrada e resultado

Seu jogo completo ainda não tem um número para comparar duas partidas.

**Resultado:** Guardar pontos, contar somente durante a partida e mostrar o resultado com contraste.

**Ambiente:** o mesmo Estúdio incorporado acompanha as seções. Preservar o projeto inicial, a continuidade e a entrega já configurados na aula.

## 1. A criação de hoje

**Texto para o aluno:**

Oi! Seu jogo completo ainda não tem um número para comparar duas partidas.

Hoje você vai guardar pontos, contar somente durante a partida e mostrar o resultado com contraste.

Você pode voltar às seções pelo índice e pedir ajuda ao professor onde surgir a dúvida.

## 2. Descoberta antes da explicação

**Modelo:** html. **Essencial:** sim

**Título:** O placar conta na hora certa?

Avance o relógio nas três telas. Descubra qual contador serve para medir somente o tempo de partida.

**Interação:** usar o bloco funcional do manifesto. Experimentação e HTML guardam estado; a conclusão essencial usa a conferência nativa no servidor. Não pontuar a velocidade nem descontar por pistas.

**Pistas disponíveis:**

- Fique na tela fim e avance mais um segundo. Qual número deveria ficar parado?

## 3. Explicação após observar

**Texto didático (permanece na seção, sem exigir vídeo):**

A variável pontos guarda um número que muda. Mostrar placar apenas lê esse valor e o desenha. Neste jogo, sobreviver mais um segundo soma um ponto, mas apenas enquanto a tela é jogando. Se o relógio não tiver essa condição, o placar pode crescer antes de começar ou depois de perder. Um número correto também precisa ser legível: a cor do texto deve contrastar com o fundo.

**Condução:** se a criança já percebeu a relação, segue para construir; se ainda não percebeu, pode ler, voltar à experiência ou pedir ajuda. Na gravação prática, retomar apenas a frase necessária para orientar o encaixe.

## Demonstrações e aplicação

Helena narra; a captura mostra uma ação de cada vez. Em arte, Júlio demonstra o desenho dele e as escolhas visuais continuam livres. Cada trecho termina devolvendo a ação ao aluno. A duração é determinada pela demonstração legível, sem acelerar o desenho para cumprir uma meta artificial.

### 1. criar a caixinha dos pontos

**Narração revisada:**

Em Programação, Variáveis, crie pontos com 0 em Ao iniciar, antes de Ir para a tela inicio. Reiniciar vai preparar o placar outra vez.

**Na tela (sequência técnica preservada do original):**

Programação › Variáveis, arrastar "Criar variável __ com valor __" para dentro do Ao iniciar, logo ACIMA do "Ir para a tela inicio"; nome "pontos", valor 0.

**Depois do trecho:** o aluno realiza a etapa, testa e mantém o trabalho no mesmo projeto. A explicação conceitual está na descoberta e no texto anterior; não repetir um monólogo teórico durante a montagem.

**Produção:** aula-11-passo-01: gravar a demonstração "criar a caixinha dos pontos" conforme roteiro.md; enviar o vídeo e inserir o bloco nesta seção.

### 2. mostrar o placar

**Narração revisada:**

Em Jogo 2D, Placar e HUD, coloque Mostrar placar no fim de Se jogando. No valor, encaixe valor da variável pontos. Confira x 12, y 30 e tamanho 24. Compare branco no céu e depois azul escuro.

**Na tela (sequência técnica preservada do original):**

Jogo 2D › Placar e HUD, arrastar "Mostrar placar" para dentro do "Se a tela atual é jogando", lá embaixo de tudo. O texto já nasce "Pontos:". Por cima do valor, arrastar "valor da variável" (Programação › Valores) e escolher pontos. Conferir que o x, o y e o tamanho já vêm em 12, 30 e 24, sem mexer em nenhum. **Rodar e mostrar o placar branco quase sumindo no céu claro**, e só então trocar a cor de branco para azul escuro e rodar de novo. A dor do contraste é o ponto desta parte, então filmar as duas rodadas.

**Depois do trecho:** o aluno realiza a etapa, testa e mantém o trabalho no mesmo projeto. A explicação conceitual está na descoberta e no texto anterior; não repetir um monólogo teórico durante a montagem.

**Produção:** aula-11-passo-02: gravar a demonstração "mostrar o placar" conforme roteiro.md; enviar o vídeo e inserir o bloco nesta seção.

### 3. fazer o número subir

**Narração revisada:**

Em Tempo e repetição, adicione um relógio de 1 segundo ao lado dos outros. Dentro, coloque Se a tela atual é jogando. Só dentro desse Se encaixe Somar 1 em pontos, de Variáveis.

**Na tela (sequência técnica preservada do original):**

primeiro a pausa; depois a resolução: Jogo 2D › Tempo e repetição, um "A cada __ segundos" novo no Enquanto estiver rodando, ao lado dos outros, com 1; dentro dele, um "Se" (Programação › Lógica & Se) com a comparação de fábrica retirada e, no lugar dela, "a tela atual é __ ?" (Jogo 2D › Telas e cenas) em "jogando"; dentro do Se, "Somar 1 em variável pontos" (Programação › Variáveis).

**Depois do trecho:** o aluno realiza a etapa, testa e mantém o trabalho no mesmo projeto. A explicação conceitual está na descoberta e no texto anterior; não repetir um monólogo teórico durante a montagem.

**Produção:** aula-11-passo-03: gravar a demonstração "fazer o número subir" conforme roteiro.md; enviar o vídeo e inserir o bloco nesta seção.

### 4. contar os pontos na tela de fim

**Narração revisada:**

Na tela fim, substitua o subtítulo por juntar texto, em Programação, Valores. Junte Você fez, o valor de pontos e pontos. Tente bater essa marca! Confira se aparece o número da sua partida.

**Na tela (sequência técnica preservada do original):**

no "Mostrar tela" da tela fim: arrastar o "juntar texto" (Programação › Valores) por cima do subtítulo; dar zoom no bloco vazio e clicar três vezes no "+", mostrando os espaços nascendo com o "0" de sombra; encaixar, em ordem, "texto Você fez", "valor da variável pontos" e "texto pontos. Tente bater essa marca!".

**Depois do trecho:** o aluno realiza a etapa, testa e mantém o trabalho no mesmo projeto. A explicação conceitual está na descoberta e no texto anterior; não repetir um monólogo teórico durante a montagem.

**Produção:** aula-11-passo-04: gravar a demonstração "contar os pontos na tela de fim" conforme roteiro.md; enviar o vídeo e inserir o bloco nesta seção.

### 5. testar

**Narração revisada:**

Compare partidas e observe o placar antes, durante e depois de jogar. Experimente intervalos 0.5 e 3 no relógio dos pontos e depois volte a 1. A regra do placar deve ficar clara para quem joga.

**Na tela (sequência técnica preservada do original):**

jogar algumas partidas seguidas, comparando os números; depois mexer no relógio do ponto (0.5 e 3).

**Depois do trecho:** o aluno realiza a etapa, testa e mantém o trabalho no mesmo projeto. A explicação conceitual está na descoberta e no texto anterior; não repetir um monólogo teórico durante a montagem.

**Produção:** aula-11-passo-05: gravar a demonstração "testar" conforme roteiro.md; enviar o vídeo e inserir o bloco nesta seção.

## Fechamento e evidência

**Fala / texto de fechamento:**

O placar começa em zero, cresce só em jogando, para no fim e aparece legível. Recomece para conferir a volta a zero. Envie.

Na Aula 12, os cactos deixarão de chegar sempre do mesmo jeito.

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

**Resposta e explicação:** Guardar pontos, contar somente durante a partida e mostrar o resultado com contraste.

### O placar conta na hora certa?

**Checagem:** Qual contador mede o tempo de jogo sem contar início e fim?

**Resposta e explicação:** O que soma somente em jogando

### O que aconteceu?

**Checagem:** Mostrar placar deve somar pontos?

**Resposta e explicação:** Não; ele só mostra o valor guardado.

### criar a caixinha dos pontos

**Checagem:** Com qual valor pontos começa a partida?

**Resposta e explicação:** 0.

### mostrar o placar

**Checagem:** Por que comparar branco e azul escuro no placar?

**Resposta e explicação:** Para escolher contraste que permita ler o número.

### fazer o número subir

**Checagem:** Quando o relógio deve somar um ponto?

**Resposta e explicação:** A cada segundo, somente na tela jogando.

### contar os pontos na tela de fim

**Checagem:** Como mostrar o resultado real na tela fim?

**Resposta e explicação:** Juntar o texto com o valor da variável pontos.

### testar

**Checagem:** Qual teste confirma a regra de pontuação?

**Resposta e explicação:** Observar o placar antes, durante e depois da partida.

### Teste e guarde sua criação

Entregar o projeto e atingir a nota mínima configurada, quando houver.
