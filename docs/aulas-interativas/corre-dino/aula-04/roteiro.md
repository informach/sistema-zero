# O som escuta o pulo

Uma aula, organizada em 8 seções. Público: 9 a 16 anos.

Fonte: `roteiro-aula-04-corre-dino.md`. SHA-256: `7b0c677793fae8c30bcef617c4ecc50ed6173beba622d672907eab8b72b6ab4f`.
O original foi preservado. Este roteiro substitui a sequência didática da aula, sem abrir um curso ou uma área de revisão paralela.

## Estado de entrada e resultado

O dino pula com teclado e clique, mas o salto ainda está silencioso.

**Resultado:** Distinguir o comando de entrada do acontecimento que ele pode causar.

**Ambiente:** o mesmo Estúdio incorporado acompanha as seções. Preservar o projeto inicial, a continuidade e a entrega já configurados na aula.

## 1. A criação de hoje

**Texto para o aluno:**

Oi! O dino pula com teclado e clique, mas o salto ainda está silencioso.

Hoje você vai distinguir o comando de entrada do acontecimento que ele pode causar.

Você pode voltar às seções pelo índice e pedir ajuda ao professor onde surgir a dúvida.

## 2. Descoberta antes da explicação

**Modelo:** prediction. **Essencial:** não; a previsão é um convite, sem punição por hipótese inicial.

**Título:** Som sem pulo?

O som está ligado à barra de espaço. Você aperta espaço quando o dino já está no ar. Faça sua previsão.

**Interação:** usar o bloco funcional do manifesto. Experimentação e HTML guardam estado; a conclusão essencial usa a conferência nativa no servidor. Não pontuar a velocidade nem descontar por pistas.

**Pistas disponíveis:**

- Pergunte ao bloco: ele está escutando a tecla ou o personagem?

## 3. Explicação após observar

**Texto didático (permanece na seção, sem exigir vídeo):**

Apertar espaço é um comando. Pular é algo que o personagem consegue fazer em determinadas condições. No ar, ele pode receber espaço sem realizar outro pulo. E pode pular usando seta ou toque, sem receber espaço. Um som ligado à tecla descreve o comando; um som ligado ao evento de pulo acompanha o acontecimento real. Essa diferença ajuda a criar controles que funcionam com vários dispositivos.

**Condução:** se a criança já percebeu a relação, segue para construir; se ainda não percebeu, pode ler, voltar à experiência ou pedir ajuda. Na gravação prática, retomar apenas a frase necessária para orientar o encaixe.

## Demonstrações e aplicação

Helena narra; a captura mostra uma ação de cada vez. Em arte, Júlio demonstra o desenho dele e as escolhas visuais continuam livres. Cada trecho termina devolvendo a ação ao aluno. A duração é determinada pela demonstração legível, sem acelerar o desenho para cumprir uma meta artificial.

### 1. a área que escuta o teclado

**Narração revisada:**

Em Áreas do projeto, adicione Quando acontecer. Em Jogo 2D, Controles, coloque Quando apertar a tecla dentro dele e escolha barra de espaço.

**Na tela (sequência técnica preservada do original):**

categoria "Áreas do projeto", arrastar "Quando acontecer" e soltar ao lado das outras duas; depois Jogo 2D › Controles, arrastar "Quando apertar a tecla" para dentro dela e escolher "barra de espaço" no menu.

**Depois do trecho:** o aluno realiza a etapa, testa e mantém o trabalho no mesmo projeto. A explicação conceitual está na descoberta e no texto anterior; não repetir um monólogo teórico durante a montagem.

**Produção:** aula-04-passo-01: gravar a demonstração "a área que escuta o teclado" conforme roteiro.md; enviar o vídeo e inserir o bloco nesta seção.

### 2. o som do pulo

**Narração revisada:**

Em Kit dino, coloque Tocar som de pulo dentro do evento da tecla. Clique no jogo e pule com espaço. Agora escute o que acontece nos outros controles.

**Na tela (sequência técnica preservada do original):**

Jogo 2D › Kit dino, arrastar "Tocar som de pulo" para dentro do "Quando apertar a tecla". Rodar e pular com o espaço.

**Depois do trecho:** o aluno realiza a etapa, testa e mantém o trabalho no mesmo projeto. A explicação conceitual está na descoberta e no texto anterior; não repetir um monólogo teórico durante a montagem.

**Produção:** aula-04-passo-02: gravar a demonstração "o som do pulo" conforme roteiro.md; enviar o vídeo e inserir o bloco nesta seção.

### 3. o som está escutando a coisa errada

**Narração revisada:**

Teste espaço, seta para cima, clique e espaço no ar. Em Controles, adicione Quando o sprite pular e escolha dino. Mova o som para esse evento e apague o evento de tecla vazio. Repita os quatro testes.

**Na tela (sequência técnica preservada do original):**

os quatro testes, um a um e sem pressa, com o áudio bem audível: espaço (tem som), seta pra cima (mudo), clique na parte de cima da área do jogo (mudo), e espaço com o dino no ar (som sem pulo). Depois: Jogo 2D › Controles, arrastar "Quando o sprite pular" para dentro do Quando acontecer, trocar "jogador" por "dino", arrastar o "Tocar som de pulo" de dentro do evento de tecla pra dentro do evento novo, e apagar o "Quando apertar a tecla" vazio com o botão direito. Refazer os quatro testes.

**Depois do trecho:** o aluno realiza a etapa, testa e mantém o trabalho no mesmo projeto. A explicação conceitual está na descoberta e no texto anterior; não repetir um monólogo teórico durante a montagem.

**Produção:** aula-04-passo-03: gravar a demonstração "o som está escutando a coisa errada" conforme roteiro.md; enviar o vídeo e inserir o bloco nesta seção.

### 4. escolhe o seu som

**Narração revisada:**

Em Jogo 2D, Som, experimente Tocar efeito dentro do evento de pulo. Tire o som anterior para não tocar dois. Escolha um efeito e pule de novo; o estilo do som é uma decisão sua.

**Na tela (sequência técnica preservada do original):**

Jogo 2D › Som, arrastar o "Tocar efeito" pra dentro do evento de pulo, tirar o "Tocar som de pulo" pra fora, abrir a listinha dos 27 efeitos e testar alguns (quicar, zunido, moeda), pulando depois de cada troca.

**Depois do trecho:** o aluno realiza a etapa, testa e mantém o trabalho no mesmo projeto. A explicação conceitual está na descoberta e no texto anterior; não repetir um monólogo teórico durante a montagem.

**Produção:** aula-04-passo-04: gravar a demonstração "escolhe o seu som" conforme roteiro.md; enviar o vídeo e inserir o bloco nesta seção.

## Fechamento e evidência

**Fala / texto de fechamento:**

O som deve tocar em todo pulo real e não tocar só porque você apertou espaço no ar. Confira teclado e clique e envie.

Na Aula 5, você vai criar os cactos para desviar.

**Professor:** observar as relações escolhidas, os parâmetros testados e a aplicação no projeto. Uma previsão diferente é ponto de partida para conversar; não é diagnóstico de dificuldade. Responder ao pedido de ajuda na seção em que ocorreu.

**Conclusão:** cumprir as atividades essenciais e as entregas já configuradas. Assistir ao vídeo inteiro não é requisito. Não adicionar XP, publicação ou desbloqueio ao clicar na experiência.

## Produção e importação

1. Abrir a aula original em rascunho, carregar `manifesto.json`, vincular ao destino e conferir a prévia. Os slugs são rótulos de autoria; o vínculo explícito usa o curso e a aula reais.
2. Preservar os blocos de projeto, os quizzes, anexos e seus IDs. O importador mantém os materiais não referenciados em uma seção final; reposicionar os quizzes e materiais apropriados antes de publicar.
3. Gravar os trechos acima no estado correto do projeto, enviar no uploader Vimeo já existente no admin e posicionar cada novo bloco na seção indicada. Conferir legibilidade, áudio e legendas. Não há arquivo de vídeo novo neste pacote.
4. Remover cada pendência de mídia apenas depois de vincular e conferir o trecho. Fazer a prévia completa e testar a continuidade para a aula seguinte; publicar somente após essa revisão.

Nenhuma URL, mídia ou minutagem foi inventada. Nenhuma aula publicada foi sobrescrita automaticamente.
