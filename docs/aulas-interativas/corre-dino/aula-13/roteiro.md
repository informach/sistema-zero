# Dificuldade que cresce com a partida

Uma aula, organizada em 8 seções. Público: 9 a 16 anos.

Fonte: `roteiro-aula-13-corre-dino.md`. SHA-256: `05eb185cda62071bb736bbdf7461cdfbc0e03e694f8dad6609cf73972550660e`.
O original foi preservado. Este roteiro substitui a sequência didática da aula, sem abrir um curso ou uma área de revisão paralela.

## Estado de entrada e resultado

Retome o projeto com placar e pequenas variações no nascimento dos cactos.

**Resultado:** Acelerar progressivamente com uma variável, uma condição e um limite, e concluir a publicação.

**Ambiente:** o mesmo Estúdio incorporado acompanha as seções. Preservar o projeto inicial, a continuidade e a entrega já configurados na aula.

## 1. A criação de hoje

**Texto para o aluno:**

Oi! Retome o projeto com placar e pequenas variações no nascimento dos cactos.

Hoje você vai acelerar progressivamente com uma variável, uma condição e um limite, e concluir a publicação.

Você pode voltar às seções pelo índice e pedir ajuda ao professor onde surgir a dúvida.

## 2. Descoberta antes da explicação

**Modelo:** html. **Essencial:** sim

**Título:** Onde a aceleração para?

Avance o relógio até chegar ao limite e tente mais uma vez. Observe o número e a distância para a esquerda.

**Interação:** usar o bloco funcional do manifesto. Experimentação e HTML guardam estado; a conclusão essencial usa a conferência nativa no servidor. Não pontuar a velocidade nem descontar por pistas.

**Pistas disponíveis:**

- Compare o valor atual com o limite usando o sinal maior, não maior ou igual.

## 3. Explicação após observar

**Texto didático (permanece na seção, sem exigir vídeo):**

Uma variável permite mudar a velocidade-base dos próximos cactos. Ela começa em −5. A cada cinco segundos de partida, subtrair 1 leva a −6, −7, −8 e −9. No limite −9, a pergunta velocidade > −9 fica falsa e a base para de diminuir. O sorteio de 0 a 1 continua sendo subtraído: −9 é limite da base, não de todo vx final. Os cactos que já nasceram mantêm a velocidade que receberam; os novos usam o valor atualizado.

**Condução:** se a criança já percebeu a relação, segue para construir; se ainda não percebeu, pode ler, voltar à experiência ou pedir ajuda. Na gravação prática, retomar apenas a frase necessária para orientar o encaixe.

## Demonstrações e aplicação

Helena narra; a captura mostra uma ação de cada vez. Em arte, Júlio demonstra o desenho dele e as escolhas visuais continuam livres. Cada trecho termina devolvendo a ação ao aluno. A duração é determinada pela demonstração legível, sem acelerar o desenho para cumprir uma meta artificial.

### 1. criar a caixinha da velocidade

**Narração revisada:**

Em Programação, Variáveis, crie velocidade com menos 5 em Ao iniciar, depois de pontos e antes da tela inicio. Essa será a base dos próximos cactos.

**Na tela (sequência técnica preservada do original):**

Programação › Variáveis, arrastar "Criar variável __ com valor __" para dentro do Ao iniciar, logo abaixo da variável pontos e logo ACIMA do "Ir para a tela inicio"; nome "velocidade", valor -5.

**Depois do trecho:** o aluno realiza a etapa, testa e mantém o trabalho no mesmo projeto. A explicação conceitual está na descoberta e no texto anterior; não repetir um monólogo teórico durante a montagem.

**Produção:** aula-13-passo-01: gravar a demonstração "criar a caixinha da velocidade" conforme roteiro.md; enviar o vídeo e inserir o bloco nesta seção.

### 2. fazer o cacto obedecer a caixinha

**Narração revisada:**

Na conta do vx do cacto, substitua só o menos 5 pelo valor da variável velocidade, de Programação, Valores. Preserve a subtração do sorteio. Rode: no começo deve parecer igual.

**Na tela (sequência técnica preservada do original):**

no bloco de criar cacto, dentro da conta do vx, arrastar "valor da variável velocidade" (Programação › Valores) por cima do -5. Rodar e mostrar que nada mudou.

**Depois do trecho:** o aluno realiza a etapa, testa e mantém o trabalho no mesmo projeto. A explicação conceitual está na descoberta e no texto anterior; não repetir um monólogo teórico durante a montagem.

**Produção:** aula-13-passo-02: gravar a demonstração "fazer o cacto obedecer a caixinha" conforme roteiro.md; enviar o vídeo e inserir o bloco nesta seção.

### 3. fazer a velocidade acelerar sozinha

**Narração revisada:**

Em Tempo e repetição, adicione um relógio de 5 segundos. Dentro, Se a tela é jogando. Dentro dele, outro Se: velocidade maior que menos 9. Troque o sinal da comparação para maior. Só dentro do segundo Se coloque Somar menos 1 em velocidade.

**Na tela (sequência técnica preservada do original):**

Jogo 2D › Tempo e repetição, um novo "A cada __ segundos" no Enquanto estiver rodando, ao lado dos outros dois, com 5; dentro, um "Se" (Programação › Lógica & Se) com a comparação de fábrica retirada e, no lugar dela, "a tela atual é __ ?" (Jogo 2D › Telas e cenas) em "jogando"; dentro dele, um segundo "Se" (Programação › Lógica & Se) aproveitando a comparação de fábrica: "valor da variável velocidade" > -9, **trocando o sinal de `=` para `>` na listinha** (o `>` é o quinto da lista); e dentro desse, "Somar -1 em variável velocidade".

**Depois do trecho:** o aluno realiza a etapa, testa e mantém o trabalho no mesmo projeto. A explicação conceitual está na descoberta e no texto anterior; não repetir um monólogo teórico durante a montagem.

**Produção:** aula-13-passo-03: gravar a demonstração "fazer a velocidade acelerar sozinha" conforme roteiro.md; enviar o vídeo e inserir o bloco nesta seção.

### 4. testar e ajustar o seu jogo

**Narração revisada:**

Jogue partidas longas para sentir a mudança. Compare limites menos 7 e menos 14, e ritmos de 2 e 10 segundos. Escolha um desafio possível. Confira também uma partida nova, que deve voltar à base menos 5.

**Na tela (sequência técnica preservada do original):**

jogar partidas longas; depois a pausa, mexendo no limite (-7 e -14) e no ritmo do relógio (2 e 10).

**Depois do trecho:** o aluno realiza a etapa, testa e mantém o trabalho no mesmo projeto. A explicação conceitual está na descoberta e no texto anterior; não repetir um monólogo teórico durante a montagem.

**Produção:** aula-13-passo-04: gravar a demonstração "testar e ajustar o seu jogo" conforme roteiro.md; enviar o vídeo e inserir o bloco nesta seção.

## Fechamento e evidência

**Fala / texto de fechamento:**

Teste a evolução, o limite e o reinício. Para publicar, envie ao professor, use Compartilhar, escreva o resumo e confira a capa. Abra o link publicado e jogue do começo ao fim.

Você concluiu o Corre, Dino! A Ponte pode mostrar o código dos blocos. Confira na Carreira o próximo curso e as conquistas ligadas à conclusão e à publicação.

**Professor:** observar as relações escolhidas, os parâmetros testados e a aplicação no projeto. Uma previsão diferente é ponto de partida para conversar; não é diagnóstico de dificuldade. Responder ao pedido de ajuda na seção em que ocorreu.

**Conclusão:** cumprir as atividades essenciais e as entregas já configuradas. Assistir ao vídeo inteiro não é requisito. Não adicionar XP, publicação ou desbloqueio ao clicar na experiência.

## Produção e importação

1. Abrir a aula original em rascunho, carregar `manifesto.json`, vincular ao destino e conferir a prévia. Os slugs são rótulos de autoria; o vínculo explícito usa o curso e a aula reais.
2. Preservar os blocos de projeto, os quizzes, anexos e seus IDs. O importador mantém os materiais não referenciados em uma seção final; reposicionar os quizzes e materiais apropriados antes de publicar.
3. Gravar os trechos acima no estado correto do projeto, enviar no uploader Vimeo já existente no admin e posicionar cada novo bloco na seção indicada. Conferir legibilidade, áudio e legendas. Não há arquivo de vídeo novo neste pacote.
4. Remover cada pendência de mídia apenas depois de vincular e conferir o trecho. Fazer a prévia completa e testar a continuidade para a aula seguinte; publicar somente após essa revisão.

Nenhuma URL, mídia ou minutagem foi inventada. Nenhuma aula publicada foi sobrescrita automaticamente.
