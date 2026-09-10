# Uma colisão mais justa

Uma aula, organizada em 8 seções. Público: 9 a 16 anos.

Fonte: `roteiro-aula-10-corre-dino.md`. SHA-256: `bdc328d620c6cb758db35578544f6beb4f2916714bf30bf0e4e6a0aad7f6519c`.
O original foi preservado. Este roteiro substitui a sequência didática da aula, sem abrir um curso ou uma área de revisão paralela.

## Estado de entrada e resultado

Seu jogo já tem começo, partida e fim. Em alguns saltos, o dino parece perder antes de encostar no desenho do cacto.

**Resultado:** Distinguir o desenho da área de colisão e ajustar a tolerância usando evidência visual.

**Ambiente:** o mesmo Estúdio incorporado acompanha as seções. Preservar o projeto inicial, a continuidade e a entrega já configurados na aula.

## 1. A criação de hoje

**Texto para o aluno:**

Oi! Seu jogo já tem começo, partida e fim. Em alguns saltos, o dino parece perder antes de encostar no desenho do cacto.

Hoje você vai distinguir o desenho da área de colisão e ajustar a tolerância usando evidência visual.

Você pode voltar às seções pelo índice e pedir ajuda ao professor onde surgir a dúvida.

## 2. Descoberta antes da explicação

**Modelo:** experiment. **Essencial:** sim

**Título:** Quando as áreas se encontram?

Compare dois tamanhos da área de colisão. Os desenhos ficam no mesmo lugar; só a área muda.

**Interação:** usar o bloco funcional do manifesto. Experimentação e HTML guardam estado; a conclusão essencial usa a conferência nativa no servidor. Não pontuar a velocidade nem descontar por pistas.

**Pistas disponíveis:**

- Olhe as formas tracejadas e compare com a parte preenchida.

## 3. Explicação após observar

**Texto didático (permanece na seção, sem exigir vídeo):**

O computador pode usar uma forma simples para detectar contatos, sem seguir cada detalhe do desenho. Essa área inclui espaços transparentes e pode tocar o obstáculo antes da imagem parecer encostar. Mostrar a caixa de colisão torna essa regra visível. Diminuir a área pode deixar o jogo mais justo, mas diminuir demais permite contatos que parecem impossíveis. O experimento usa círculos para comparar áreas; no seu jogo, confira os retângulos com o raio-X.

**Condução:** se a criança já percebeu a relação, segue para construir; se ainda não percebeu, pode ler, voltar à experiência ou pedir ajuda. Na gravação prática, retomar apenas a frase necessária para orientar o encaixe.

## Demonstrações e aplicação

Helena narra; a captura mostra uma ação de cada vez. Em arte, Júlio demonstra o desenho dele e as escolhas visuais continuam livres. Cada trecho termina devolvendo a ação ao aluno. A duração é determinada pela demonstração legível, sem acelerar o desenho para cumprir uma meta artificial.

### 1. ligar o raio-X

**Narração revisada:**

Em Jogo 2D, Aparência, coloque Mostrar a caixa de colisão do sprite no fim de Se jogando. Escolha dino e rode. O contorno rosa vai mostrar a área que estava invisível.

**Na tela (sequência técnica preservada do original):**

Jogo 2D › Aparência, arrastar "Mostrar a caixa de colisão do sprite" para dentro do "Se a tela atual é jogando", no fim, abaixo do "Tirar do grupo cactos quem sair da tela"; escolher o dino. Rodar e mostrar o contorno rosa em volta do dino.

**Depois do trecho:** o aluno realiza a etapa, testa e mantém o trabalho no mesmo projeto. A explicação conceitual está na descoberta e no texto anterior; não repetir um monólogo teórico durante a montagem.

**Produção:** aula-10-passo-01: gravar a demonstração "ligar o raio-X" conforme roteiro.md; enviar o vídeo e inserir o bloco nesta seção.

### 2. por que a batida pareceu roubada

**Narração revisada:**

Aproxime o dino de um cacto e observe os espaços entre o desenho e o contorno. Compare a batida olhando a imagem e depois a caixa. Essa diferença explica a sensação de perder cedo.

**Na tela (sequência técnica preservada do original):**

com o raio-X ligado, aproximar o zoom no dino; apontar os espaços vazios entre o desenho e as bordas do retângulo (em cima da cabeça, na frente do focinho, embaixo dos pés). Depois mostrar o dino raspando num cacto: os retângulos se tocam antes dos desenhos.

**Depois do trecho:** o aluno realiza a etapa, testa e mantém o trabalho no mesmo projeto. A explicação conceitual está na descoberta e no texto anterior; não repetir um monólogo teórico durante a montagem.

**Produção:** aula-10-passo-02: gravar a demonstração "por que a batida pareceu roubada" conforme roteiro.md; enviar o vídeo e inserir o bloco nesta seção.

### 3. ajustar a área de colisão

**Narração revisada:**

Em Colisões, coloque Usar área de colisão de porcentagem do tamanho em Ao iniciar, como último bloco. Escolha dino e 80. Recomece e confira a caixa menor com o raio-X ainda ligado.

**Na tela (sequência técnica preservada do original):**

Jogo 2D › Colisões, arrastar "Usar área de colisão de __ % do tamanho para o sprite __" para o Ao iniciar, encaixando como **último bloco**, embaixo do "Ir para a tela inicio"; deixar 80 e escolher o dino. Com o raio-X ainda ligado, mostrar a caixa menor.

**Depois do trecho:** o aluno realiza a etapa, testa e mantém o trabalho no mesmo projeto. A explicação conceitual está na descoberta e no texto anterior; não repetir um monólogo teórico durante a montagem.

**Produção:** aula-10-passo-03: gravar a demonstração "ajustar a área de colisão" conforme roteiro.md; enviar o vídeo e inserir o bloco nesta seção.

### 4. você escolhe o quanto perdoar

**Narração revisada:**

Compare 40 e 100. Depois escolha um valor de 70 a 85 observando os saltos. Ao terminar, remova o bloco que mostra a caixa, mas preserve a configuração da área de colisão.

**Na tela (sequência técnica preservada do original):**

trocar o 80 por 40 (jogar e ver como fica fácil demais), depois por 100 (voltar a ser injusto), depois voltar pra um número entre 70 e 85; por fim, apagar o bloco do raio-X.

**Depois do trecho:** o aluno realiza a etapa, testa e mantém o trabalho no mesmo projeto. A explicação conceitual está na descoberta e no texto anterior; não repetir um monólogo teórico durante a montagem.

**Produção:** aula-10-passo-04: gravar a demonstração "você escolhe o quanto perdoar" conforme roteiro.md; enviar o vídeo e inserir o bloco nesta seção.

## Fechamento e evidência

**Fala / texto de fechamento:**

Jogue com o raio-X para justificar sua escolha. Depois desligue o diagnóstico e confira se o jogo parece justo. Envie.

Na Aula 11, você vai medir o resultado da partida com um placar.

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

**Resposta e explicação:** Distinguir o desenho da área de colisão e ajustar a tolerância usando evidência visual.

### Quando as áreas se encontram?

**Checagem:** Por que pode existir colisão antes dos desenhos encostarem?

**Resposta e explicação:** A área usada pelo programa pode ser maior que a parte visível

### O que aconteceu?

**Checagem:** Por que a colisão pode acontecer antes do contato parecer visível?

**Resposta e explicação:** A área de colisão pode incluir espaço transparente do desenho.

### ligar o raio-X

**Checagem:** Para que serve mostrar a caixa de colisão?

**Resposta e explicação:** Tornar visível a área usada para detectar contatos.

### por que a batida pareceu roubada

**Checagem:** O que devemos comparar ao investigar uma batida precoce?

**Resposta e explicação:** O contorno de colisão e o desenho visível.

### ajustar a área de colisão

**Checagem:** Ao usar 80% do tamanho na colisão, o que deve mudar?

**Resposta e explicação:** A área de contato fica menor que a área original.

### você escolhe o quanto perdoar

**Checagem:** Ao terminar o ajuste, o que preservamos?

**Resposta e explicação:** A configuração da área; retiramos apenas o bloco que mostra a caixa.

### Teste e guarde sua criação

Entregar o projeto e atingir a nota mínima configurada, quando houver.
