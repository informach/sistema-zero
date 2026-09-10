# Tiros que saem da nave

Uma aula, organizada em 10 seções. Público: 9 a 16 anos.

Fonte: `roteiro-aula-dia2-desafio-primeiro-jogo.md`. SHA-256: `f86024679543a69d6ac450ee09f6985e2275921c0bf72eb876eec1220036f5e9`.
O original foi preservado. Este roteiro substitui a sequência didática da aula, sem abrir um curso ou uma área de revisão paralela.

## Estado de entrada e resultado

Continue o projeto do Dia 1, com a nave se movendo e as estrelas ao fundo.

**Resultado:** Relacionar a posição da nave, o evento de tecla e a direção da velocidade do tiro.

**Ambiente:** o mesmo Estúdio incorporado acompanha as seções. Preservar o projeto inicial, a continuidade e a entrega já configurados na aula.

## 1. A criação de hoje

**Texto para o aluno:**

Oi! Continue o projeto do Dia 1, com a nave se movendo e as estrelas ao fundo.

Hoje você vai relacionar a posição da nave, o evento de tecla e a direção da velocidade do tiro.

Você pode voltar às seções pelo índice e pedir ajuda ao professor onde surgir a dúvida.

## 2. Descoberta antes da explicação

**Modelo:** html. **Essencial:** sim

**Título:** Para onde o tiro vai?

Teste uma velocidade positiva e outra negativa, mantendo o ponto de partida. Depois explique o que mudou.

**Interação:** usar o bloco funcional do manifesto. Experimentação e HTML guardam estado; a conclusão essencial usa a conferência nativa no servidor. Não pontuar a velocidade nem descontar por pistas.

**Pistas disponíveis:**

- Olhe a seta do eixo y. Ela indica em que direção os valores aumentam.

## 3. Explicação após observar

**Texto didático (permanece na seção, sem exigir vídeo):**

Uma ação pode esperar um acontecimento: a tecla pressionada. Quando isso acontece, nasce um tiro no lugar em que a nave está agora. Um grupo reúne todos os tiros para mover, desenhar e remover cada um. Na tela, o eixo y cresce para baixo. Por isso uma velocidade vertical negativa move o tiro para cima. A velocidade é mudança de posição; não é o lugar onde ele nasce.

**Condução:** se a criança já percebeu a relação, segue para construir; se ainda não percebeu, pode ler, voltar à experiência ou pedir ajuda. Na gravação prática, retomar apenas a frase necessária para orientar o encaixe.

## Demonstrações e aplicação

Helena narra; a captura mostra uma ação de cada vez. Em arte, Júlio demonstra o desenho dele e as escolhas visuais continuam livres. Cada trecho termina devolvendo a ação ao aluno. A duração é determinada pela demonstração legível, sem acelerar o desenho para cumprir uma meta artificial.

### 1. criar o grupo dos tiros

**Narração revisada:**

Em Jogo 2D, abra Muitos. Coloque Criar grupo de sprites em Ao iniciar, abaixo da nave, e escreva tiros. Esse nome vai ligar os blocos que cuidam dos tiros.

**Na tela (sequência técnica preservada do original):**

categoria "Jogo 2D", subcategoria "Muitos", arrastar "Criar grupo de sprites" para dentro do Ao iniciar, abaixo do Criar nave; trocar o nome para "tiros".

**Depois do trecho:** o aluno realiza a etapa, testa e mantém o trabalho no mesmo projeto. A explicação conceitual está na descoberta e no texto anterior; não repetir um monólogo teórico durante a montagem.

**Produção:** dia-2-passo-01: gravar a demonstração "criar o grupo dos tiros" conforme roteiro.md; enviar o vídeo e inserir o bloco nesta seção.

### 2. a área que escuta o teclado

**Narração revisada:**

Em Áreas do projeto, coloque Quando acontecer ao lado das outras áreas. Em Jogo 2D, Controles, encaixe Quando apertar a tecla dentro dele e escolha barra de espaço.

**Na tela (sequência técnica preservada do original):**

categoria "Áreas do projeto", arrastar "Quando acontecer" para o lado das outras duas áreas. Depois, categoria "Jogo 2D", subcategoria "Controles", arrastar "Quando apertar a tecla" para dentro do Quando acontecer e escolher "barra de espaço" no menu.

**Depois do trecho:** o aluno realiza a etapa, testa e mantém o trabalho no mesmo projeto. A explicação conceitual está na descoberta e no texto anterior; não repetir um monólogo teórico durante a montagem.

**Produção:** dia-2-passo-02: gravar a demonstração "a área que escuta o teclado" conforme roteiro.md; enviar o vídeo e inserir o bloco nesta seção.

### 3. fazer o tiro nascer na nave

**Narração revisada:**

Em Jogo 2D, Muitos, coloque Criar tiro no grupo dentro do evento. Escolha tiros. No x encaixe o centro x da nave; no y, a posição y da nave, em Posição e tamanho. Use raio 5 e escolha uma cor.

**Na tela (sequência técnica preservada do original):**

categoria "Jogo 2D", subcategoria "Muitos", arrastar "Criar tiro no grupo" para dentro do Quando apertar a tecla (grupo "tiros"). No x, encaixar "o centro x do sprite" (Posição e tamanho, selecionar nave); no y, "a posição y do sprite" (Posição e tamanho, selecionar nave); raio 5, escolher a cor.

**Depois do trecho:** o aluno realiza a etapa, testa e mantém o trabalho no mesmo projeto. A explicação conceitual está na descoberta e no texto anterior; não repetir um monólogo teórico durante a montagem.

**Produção:** dia-2-passo-03: gravar a demonstração "fazer o tiro nascer na nave" conforme roteiro.md; enviar o vídeo e inserir o bloco nesta seção.

### 4. a velocidade e o som do tiro

**Narração revisada:**

No tiro, deixe vx em 0 e vy em menos 9. Ele deve subir, como na descoberta. Em Kit espaço, coloque Tocar som de tiro logo abaixo, no mesmo evento.

**Na tela (sequência técnica preservada do original):**

ainda no "Criar tiro no grupo": vx 0, vy -9. Depois, categoria "Jogo 2D", subcategoria "Kit espaço", "Tocar som de tiro" logo abaixo, dentro do Quando apertar a tecla.

**Depois do trecho:** o aluno realiza a etapa, testa e mantém o trabalho no mesmo projeto. A explicação conceitual está na descoberta e no texto anterior; não repetir um monólogo teórico durante a montagem.

**Produção:** dia-2-passo-04: gravar a demonstração "a velocidade e o som do tiro" conforme roteiro.md; enviar o vídeo e inserir o bloco nesta seção.

### 5. fazer os tiros voarem pela tela

**Narração revisada:**

Volte a A cada quadro. Abaixo do desenho da nave, em Muitos, encaixe Atualizar o grupo tiros, Tirar do grupo quem sair da tela e Desenhar o grupo tiros. O espaço fazer da limpeza fica vazio.

**Na tela (sequência técnica preservada do original):**

dentro do "A cada quadro do jogo", abaixo do Desenhar o sprite nave, encaixar na ordem: "Atualizar (mover) o grupo" (Muitos, grupo tiros), "Tirar do grupo quem sair da tela" (Muitos, grupo tiros, espaço do fazer vazio), "Desenhar o grupo" (Muitos, grupo tiros).

**Depois do trecho:** o aluno realiza a etapa, testa e mantém o trabalho no mesmo projeto. A explicação conceitual está na descoberta e no texto anterior; não repetir um monólogo teórico durante a montagem.

**Produção:** dia-2-passo-05: gravar a demonstração "fazer os tiros voarem pela tela" conforme roteiro.md; enviar o vídeo e inserir o bloco nesta seção.

### 6. hora de atirar

**Narração revisada:**

Mova a nave e aperte espaço de lugares diferentes. O tiro deve nascer junto dela. Compare vy menos 9 e menos 15: confirme o número clicando fora do campo antes de testar.

**Na tela (sequência técnica preservada do original):**

clicar na área do jogo, apertar a barra de espaço várias vezes, andar com as setas e atirar de posições diferentes. Depois demonstrar os três passinhos bem devagar, com o vy: trocar menos 9 por menos 15, **clicar num espaço vazio da área dos blocos** (mostrando que é esse clique que confirma), e só então clicar na área do jogo e testar. Vale mostrar de propósito o erro de clicar direto no jogo sem ter clicado fora antes, pra criança ver o jogo continuar com o valor antigo.

**Depois do trecho:** o aluno realiza a etapa, testa e mantém o trabalho no mesmo projeto. A explicação conceitual está na descoberta e no texto anterior; não repetir um monólogo teórico durante a montagem.

**Produção:** dia-2-passo-06: gravar a demonstração "hora de atirar" conforme roteiro.md; enviar o vídeo e inserir o bloco nesta seção.

## Fechamento e evidência

**Fala / texto de fechamento:**

Atire da esquerda, do centro e da direita. Os tiros devem acompanhar a nave, subir e sair da tela. Confira os nomes do grupo e envie seu projeto.

No Dia 3, os tiros vão encontrar asteroides.

**Professor:** observar as relações escolhidas, os parâmetros testados e a aplicação no projeto. Uma previsão diferente é ponto de partida para conversar; não é diagnóstico de dificuldade. Responder ao pedido de ajuda na seção em que ocorreu.

**Conclusão:** cumprir as atividades essenciais e as entregas já configuradas. Assistir ao vídeo inteiro não é requisito. Não adicionar XP, publicação ou desbloqueio ao clicar na experiência.

## Produção e importação

1. Abrir a aula original em rascunho, carregar `manifesto.json`, vincular ao destino e conferir a prévia. Os slugs são rótulos de autoria; o vínculo explícito usa o curso e a aula reais.
2. Preservar os blocos de projeto, os quizzes, anexos e seus IDs. O importador mantém os materiais não referenciados em uma seção final; reposicionar os quizzes e materiais apropriados antes de publicar.
3. Gravar os trechos acima no estado correto do projeto, enviar no uploader Vimeo já existente no admin e posicionar cada novo bloco na seção indicada. Conferir legibilidade, áudio e legendas. Não há arquivo de vídeo novo neste pacote.
4. Remover cada pendência de mídia apenas depois de vincular e conferir o trecho. Fazer a prévia completa e testar a continuidade para a aula seguinte; publicar somente após essa revisão.

Nenhuma URL, mídia ou minutagem foi inventada. Nenhuma aula publicada foi sobrescrita automaticamente.
