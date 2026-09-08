# Cactos no ritmo certo

Uma aula, organizada em 9 seções. Público: 9 a 16 anos.

Fonte: `roteiro-aula-05-corre-dino.md`. SHA-256: `7a103a2dd829c7795d691ef38ec384b3da742f02566db055e311358df080352d`.
O original foi preservado. Este roteiro substitui a sequência didática da aula, sem abrir um curso ou uma área de revisão paralela.

## Estado de entrada e resultado

Seu dino corre, pula e faz som. A pista ainda não tem obstáculos.

**Resultado:** Separar a criação de objetos do movimento contínuo e ajustar o ritmo de nascimento.

**Ambiente:** o mesmo Estúdio incorporado acompanha as seções. Preservar o projeto inicial, a continuidade e a entrega já configurados na aula.

## 1. A criação de hoje

**Texto para o aluno:**

Oi! Seu dino corre, pula e faz som. A pista ainda não tem obstáculos.

Hoje você vai separar a criação de objetos do movimento contínuo e ajustar o ritmo de nascimento.

Você pode voltar às seções pelo índice e pedir ajuda ao professor onde surgir a dúvida.

## 2. Descoberta antes da explicação

**Modelo:** prediction. **Essencial:** não; a previsão é um convite, sem punição por hipótese inicial.

**Título:** Um cacto por quadro

Você colocou Criar cacto dentro de A cada quadro do jogo. O que espera acontecer?

**Interação:** usar o bloco funcional do manifesto. Experimentação e HTML guardam estado; a conclusão essencial usa a conferência nativa no servidor. Não pontuar a velocidade nem descontar por pistas.

**Pistas disponíveis:**

- A cada quadro não significa uma vez por partida.

## 3. Explicação após observar

**Texto didático (permanece na seção, sem exigir vídeo):**

Criar um cacto em cada quadro produz uma avalanche, porque o desenho atualiza muitas vezes por segundo. Um relógio separado deixa você escolher quanto esperar entre nascimentos. O grupo cactos reúne os obstáculos para mover e desenhar juntos. Um x além da borda direita faz o cacto entrar gradualmente; uma velocidade horizontal negativa o leva para a esquerda. Intervalo e velocidade influenciam a dificuldade de formas diferentes.

**Condução:** se a criança já percebeu a relação, segue para construir; se ainda não percebeu, pode ler, voltar à experiência ou pedir ajuda. Na gravação prática, retomar apenas a frase necessária para orientar o encaixe.

## Demonstrações e aplicação

Helena narra; a captura mostra uma ação de cada vez. Em arte, Júlio demonstra o desenho dele e as escolhas visuais continuam livres. Cada trecho termina devolvendo a ação ao aluno. A duração é determinada pela demonstração legível, sem acelerar o desenho para cumprir uma meta artificial.

### 1. criar o grupo dos cactos

**Narração revisada:**

Em Jogo 2D, Muitos, coloque Criar grupo de sprites em Ao iniciar, abaixo do dino. Escreva cactos. Use esse mesmo nome nos próximos blocos.

**Na tela (sequência técnica preservada do original):**

Jogo 2D › Muitos, arrastar "Criar grupo de sprites" para dentro do Ao iniciar, logo ABAIXO do "Criar dinossauro"; trocar o nome para "cactos". (Ele fica sempre abaixo do Criar dinossauro; a partir da Aula 10, abaixo também do "Usar área de colisão".)

**Depois do trecho:** o aluno realiza a etapa, testa e mantém o trabalho no mesmo projeto. A explicação conceitual está na descoberta e no texto anterior; não repetir um monólogo teórico durante a montagem.

**Produção:** aula-05-passo-01: gravar a demonstração "criar o grupo dos cactos" conforme roteiro.md; enviar o vídeo e inserir o bloco nesta seção.

### 2. fazer o cacto nascer, andar e aparecer

**Narração revisada:**

Abaixo do desenho do dino, coloque criar obstáculo do Kit dino, Atualizar o grupo e Desenhar o grupo, de Muitos. Escolha cactos nos três. Rode por pouco tempo para observar a avalanche.

**Na tela (sequência técnica preservada do original):**

dentro do "A cada quadro do jogo", logo abaixo do "Desenhar o sprite dino", encaixar na ordem: "No grupo __ criar obstáculo" (Kit dino, grupo cactos, o resto nos valores de fábrica), "Atualizar (mover) o grupo __" e "Desenhar o grupo __" (Muitos, grupo cactos nos dois). Rodar e mostrar a avalanche.

**Depois do trecho:** o aluno realiza a etapa, testa e mantém o trabalho no mesmo projeto. A explicação conceitual está na descoberta e no texto anterior; não repetir um monólogo teórico durante a montagem.

**Produção:** aula-05-passo-02: gravar a demonstração "fazer o cacto nascer, andar e aparecer" conforme roteiro.md; enviar o vídeo e inserir o bloco nesta seção.

### 3. o relógio

**Narração revisada:**

Em Tempo e repetição, coloque A cada segundos ao lado de A cada quadro, dentro de Enquanto estiver rodando. Use 1.4. Leve somente a criação do cacto para dentro desse relógio.

**Na tela (sequência técnica preservada do original):**

Jogo 2D › Tempo e repetição, arrastar "A cada __ segundos fazer" para dentro do Enquanto estiver rodando, AO LADO do "A cada quadro do jogo"; mover o bloco de criar cacto para dentro dele; trocar o 2 por 1.4. Rodar.

**Depois do trecho:** o aluno realiza a etapa, testa e mantém o trabalho no mesmo projeto. A explicação conceitual está na descoberta e no texto anterior; não repetir um monólogo teórico durante a montagem.

**Produção:** aula-05-passo-03: gravar a demonstração "o relógio" conforme roteiro.md; enviar o vídeo e inserir o bloco nesta seção.

### 4. nascer fora da tela

**Narração revisada:**

No cacto, troque x 400 por 560 e vx menos 3 por menos 5. O tamanho fica 44. Observe que agora ele nasce fora da tela e entra pela direita.

**Na tela (sequência técnica preservada do original):**

apontar o cacto materializando perto da borda direita; trocar o x de 400 para 560; depois trocar o vx de -3 para -5. Rodar.

**Depois do trecho:** o aluno realiza a etapa, testa e mantém o trabalho no mesmo projeto. A explicação conceitual está na descoberta e no texto anterior; não repetir um monólogo teórico durante a montagem.

**Produção:** aula-05-passo-04: gravar a demonstração "nascer fora da tela" conforme roteiro.md; enviar o vídeo e inserir o bloco nesta seção.

### 5. testar

**Narração revisada:**

Compare vx menos 3 e menos 9 mantendo o relógio. Depois compare intervalos 0.8 e 2.5 mantendo a velocidade. Volte ao ponto de partida de 1.4 e menos 5 antes de seguir.

**Na tela (sequência técnica preservada do original):**

clicar na área do jogo, os cactos vindo da direita, o dino pulando; depois a pausa; na resolução, mexer no vx (-3 e -9) e no tempo do relógio (0.8 e 2.5).

**Depois do trecho:** o aluno realiza a etapa, testa e mantém o trabalho no mesmo projeto. A explicação conceitual está na descoberta e no texto anterior; não repetir um monólogo teórico durante a montagem.

**Produção:** aula-05-passo-05: gravar a demonstração "testar" conforme roteiro.md; enviar o vídeo e inserir o bloco nesta seção.

## Fechamento e evidência

**Fala / texto de fechamento:**

Os cactos devem nascer espaçados, entrar pela direita e atravessar a pista. Ainda não há derrota ao encostar neles. Envie seu projeto.

Na Aula 6, você vai investigar o que acontece com os cactos que já saíram da tela.

**Professor:** observar as relações escolhidas, os parâmetros testados e a aplicação no projeto. Uma previsão diferente é ponto de partida para conversar; não é diagnóstico de dificuldade. Responder ao pedido de ajuda na seção em que ocorreu.

**Conclusão:** cumprir as atividades essenciais e as entregas já configuradas. Assistir ao vídeo inteiro não é requisito. Não adicionar XP, publicação ou desbloqueio ao clicar na experiência.

## Produção e importação

1. Abrir a aula original em rascunho, carregar `manifesto.json`, vincular ao destino e conferir a prévia. Os slugs são rótulos de autoria; o vínculo explícito usa o curso e a aula reais.
2. Preservar os blocos de projeto, os quizzes, anexos e seus IDs. O importador mantém os materiais não referenciados em uma seção final; reposicionar os quizzes e materiais apropriados antes de publicar.
3. Gravar os trechos acima no estado correto do projeto, enviar no uploader Vimeo já existente no admin e posicionar cada novo bloco na seção indicada. Conferir legibilidade, áudio e legendas. Não há arquivo de vídeo novo neste pacote.
4. Remover cada pendência de mídia apenas depois de vincular e conferir o trecho. Fazer a prévia completa e testar a continuidade para a aula seguinte; publicar somente após essa revisão.

Nenhuma URL, mídia ou minutagem foi inventada. Nenhuma aula publicada foi sobrescrita automaticamente.
