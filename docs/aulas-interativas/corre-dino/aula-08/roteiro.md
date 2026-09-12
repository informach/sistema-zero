# Um convite para jogar

Uma aula, organizada em 3 seções. Público: 9 a 16 anos.

Fonte: `roteiro-aula-08-corre-dino.md`. SHA-256: `61a9981e52b892274aeeddc4ae00798d7a534530d5835205722d502f0b901139`.
O original foi preservado. Este roteiro substitui a sequência didática da aula, sem abrir um curso ou uma área de revisão paralela.

## Estado de entrada e resultado

O projeto abre na tela inicio e mostra só a floresta. A partida está protegida pela condição.

**Resultado:** Conectar a instrução mostrada ao jogador com controles que realmente funcionam.

**Ambiente:** o mesmo Estúdio incorporado acompanha as seções. Preservar o projeto inicial, a continuidade e a entrega já configurados na aula.

## Percurso e ritmo

Cada seção reúne ações que chegam a uma pequena conquista. Não fazer uma prova depois de cada clique. A criança pode consultar o texto, pausar o vídeo, pedir uma pista e tentar novamente. Cores, formas e outros detalhes livres não são critérios de aprovação.

| Etapa | O que libera o avanço |
| --- | --- |
| A dica prometeu um toque | Resolver a descoberta. |
| Um convite que funciona | Responder uma pergunta de decisão. |
| Experimente duas entradas | Enviar o projeto; atingir a nota automática se o Estúdio exigir. |

## Orientações de produção e acessibilidade

Helena narra; nas aulas de arte, Júlio demonstra as escolhas dele. Mostrar uma ação por vez e devolver o controle à criança. Nomear ferramenta, categoria e encaixe. Manter texto e legendas legíveis, sem exigir rapidez, precisão de arraste ou áudio para compreender a orientação. Nas ordenações, demonstrar também os botões de mover as peças. Não usar somente cor para indicar o que mudou.

Convidar a prever, testar e ajustar. Mostrar o erro e sua recuperação com calma. Se um trecho ficar longo, a criança pode pausar entre os passos da mesma seção; não precisa passar por outra pergunta para cada pausa. As alternativas e gabaritos abaixo orientam a produção, não são texto para revelar antes da resposta.

## 1. A dica prometeu um toque

**Intenção e objetivo (professor):** Exploração · Conectar a instrução mostrada ao jogador com controles que realmente funcionam.

**Texto para o aluno:**

Oi! Sua floresta está esperando. Vamos criar uma tela que convida a jogar e funciona com teclado e toque.

Você pode fazer uma pausa, voltar às etapas concluídas e usar Preciso de ajuda. Não precisa acertar de primeira.

**Atividade: A dica prometeu um toque**

Modelo: `prediction`. Critério desta seção.

A tela diz “Toque para jogar”, mas o evento escuta somente Enter. O que acontece se o jogador tocar? Sua primeira ideia pode mudar depois da observação.

**Previsões (sem nota):** A partida começa porque o texto diz isso · Nada começa; falta um evento que aceite o toque

**Depois de observar:** O texto não executa o comando. A dica e o evento precisam combinar. Ao usar o evento de qualquer tecla ou toque, você pode anunciar os dois controles.

**Pergunta:** Você trocou o evento por qualquer tecla ou toque. Qual dica combina?

- “Espere, o jogo sempre começa sozinho.”
- “Aperte uma tecla ou toque para começar.”
- “Apenas Enter começa a partida.”

**Resposta esperada (professor):** “Aperte uma tecla ou toque para começar.”

**Devolutiva:** A dica orienta a pessoa usando os controles que o jogo realmente oferece.

**Pistas:**

- A frase precisa descrever os comandos que o evento recebe.

**Texto para o aluno:**

Uma dica é uma promessa: se a tela diz para tocar, o toque precisa começar a partida. Um evento exclusivo de Enter não atende a essa promessa no celular.

A pergunta da tela impede que o mesmo comando comece algo no momento errado. Título, subtítulo e cores podem expressar seu estilo.

A instrução dos controles precisa descrever o comportamento real do jogo.

**Critério configurado:** `descoberta`. A resposta é corrigida pelo sistema; a criança pode consultar as pistas e tentar de novo.

## 2. Um convite que funciona

**Intenção e objetivo (professor):** Aplicação · Fazer a instrução da tela corresponder aos controles implementados.

**Ferramenta:** continuar o mesmo Estúdio incorporado. Não criar outra entrega entre os passos.

**Narração revisada / instruções disponíveis em texto:**

### Desenhar a tela de início

No Se grande, clique em mais senão se. Na pergunta nova, coloque a tela atual é inicio.

Em Telas e cenas, encaixe Mostrar tela. Edite os textos dentro das peças de texto e escolha o título e a cor do seu jogo.

**Vídeo planejado:** `video-construir-1-1`

**Na tela (sequência técnica preservada):**

zoom nos dois botõezinhos "+ senão se" e "+ senão" que ficam embaixo, à esquerda, do "Se a tela atual é jogando". Clicar no "+ senão se" e mostrar o bloco crescendo, com o andar novo e o espacinho de pergunta vazio. Encaixar nele o "a tela atual é" com "inicio" e, dentro, o "Mostrar tela" (Jogo 2D › Telas e cenas). Dar um zoom nos três encaixes de valor do Mostrar tela, mostrando que dentro de cada um tem uma pecinha "texto" separada, com borda própria. Clicar no texto DENTRO da pecinha para editar. Print de conferência com o bloco inteiro: Se jogando em cima, senão se inicio embaixo.

**Produção:** aula-08-passo-01: gravar a demonstração "desenhar a tela de início" conforme roteiro.md; enviar o vídeo e inserir o bloco nesta seção.

**Narração revisada / instruções disponíveis em texto:**

### O jogo começa quando o jogador manda

Em Controles, crie primeiro o evento Enter com Se a tela é inicio e Ir para a tela jogando. Teste Enter e clique.

Depois troque pelo evento Quando apertar qualquer tecla ou tocar na tela, preservando o Se. Ajuste a dica da tela.

**Vídeo planejado:** `video-construir-2-1`

**Na tela (sequência técnica preservada):**

Jogo 2D › Controles, arrastar "Quando apertar a tecla" para dentro do Quando acontecer, ao lado do evento do pulo, e escolher Enter; dentro, um "Se a tela atual é inicio" com "Ir para a tela jogando". Testar com o Enter (funciona) e depois clicar no meio da tela de início várias vezes (não acontece nada), com um zoom no cursor. Depois: trocar o bloco do evento pelo "Quando apertar qualquer tecla ou tocar na tela", arrastando o Se de dentro do antigo pro novo e apagando o antigo com o botão direito. Por fim, voltar no Mostrar tela e trocar o texto da dica.

**Produção:** aula-08-passo-02: gravar a demonstração "o jogo começa quando o jogador manda" conforme roteiro.md; enviar o vídeo e inserir o bloco nesta seção.

**Texto para o aluno:**

**Sua vez:** Personalize o título. Depois confira o evento para que a dica prometa somente os controles que funcionam.

**Atividade: Uma decisão para continuar**

Modelo: `checkpoint`. Critério desta seção.

Escolha uma resposta. Se precisar, consulte a explicação ou use uma pista e tente de novo.

**Pergunta:** A dica diz “toque para jogar”, mas só Enter funciona. O que precisa mudar?

- O jogador precisa adivinhar que deve usar Enter.
- O evento precisa aceitar toque também.
- Só a cor da dica precisa mudar.

**Resposta esperada (professor):** O evento precisa aceitar toque também.

**Devolutiva:** Dica e evento precisam combinar. O evento de qualquer tecla ou toque permite oferecer os dois caminhos.

**Pistas:**

- Texto orienta a pessoa; evento recebe o comando.

**Critério configurado:** `checar-construir-2`. A resposta é corrigida pelo sistema; a criança pode consultar as pistas e tentar de novo.

## 3. Experimente duas entradas

**Intenção e objetivo (professor):** Fechamento · Testar e guardar a criação, reconhecendo o próximo passo. Conferir a entrega configurada no Estúdio.

**Ferramenta:** continuar o mesmo Estúdio incorporado. Não criar outra entrega entre os passos.

**Narração revisada / instruções disponíveis em texto:**

### Testar e deixar com a sua cara

Recarregue e comece clicando. Recarregue outra vez e comece com Enter.

Os dois caminhos devem funcionar. Personalize título, subtítulo e cor, mantendo a dica fiel aos controles.

**Vídeo planejado:** `video-construir-3-1`

**Na tela (sequência técnica preservada):**

recarregar, ver a tela de início, começar clicando na tela, jogar; recarregar e começar com o Enter. Depois a pausa. Na resolução: trocar o título por outro nome, o subtítulo por outra frase, e a cor de fundo, mostrando o antes e o depois lado a lado.

**Produção:** aula-08-passo-03: gravar a demonstração "testar e deixar com a sua cara" conforme roteiro.md; enviar o vídeo e inserir o bloco nesta seção.

**Texto para o aluno:**

Leia a dica como alguém que nunca viu o jogo. Teste cada controle que ela promete e confirme que a partida só começa quando você manda. Envie.

Na Aula 9, uma batida terá consequência e você poderá jogar de novo.

Se algo sair diferente, conte o que tentou em **Preciso de ajuda**. Você pode rever os passos e ajustar seu projeto com calma.

**Estúdio compartilhado:** reutilizar o primeiro Estúdio da aula. A entrega acontece aqui, uma única vez.

**Critério configurado:** entrega do Estúdio. Se houver nota mínima, conferir a atividade vinculada: o manifesto preserva sua configuração. Para exigir aprovação automática na seção, ela precisa usar checagens estruturais compatíveis. O carimbo “já conferi” do professor não controla este avanço.

## Cadastro e validação em staging

1. Abra a aula correspondente no admin de staging. Importe `manifesto.json` no rascunho com **Vincular ao destino aberto** e confira a prévia. Preserve a configuração do Estúdio existente e sua cadeia, quando houver.

2. Confira o quadro de critérios de cada seção. Os nomes acima correspondem ao manifesto. Cada vídeo mantém a chave original: reimportar preserva mídias já vinculadas. Vincule e confira os vídeos planejados pelo uploader Vimeo.

3. Se uma versão anterior deste pacote já foi importada, retire do rascunho os cartões antigos listados abaixo. O importador preserva blocos omitidos e pode levá-los ao fechamento; omitir uma chave no arquivo não apaga o cartão antigo. Confira quizzes e entregas existentes separadamente para manter apenas as exigências intencionais.

4. Use a prévia para revisar apresentação e continuidade. Para testar bloqueios, publique apenas em staging e entre com um perfil de aluno de teste sem conclusão anterior. A prévia navega livremente e marcos concluídos são preservados.

5. Tente uma resposta incorreta ou um projeto sem o requisito, confira o bloqueio e depois cumpra o critério. Verifique liberação, retorno, recarga e continuidade para a próxima aula. Em uma etapa com vários objetivos, cumprir só um não deve liberar.

**Cartões antigos a retirar após reimportação:**

- `checar-comeco`: Confira: A criação de hoje
- `checar-entenda`: Confira: O que aconteceu?
- `checar-construir-1`: Confira: desenhar a tela de início
- `checar-construir-3`: Confira: testar e deixar com a sua cara

A retirada acontece no rascunho; o histórico persistido não deve ser apagado. Nenhum manifesto desta pasta foi aplicado automaticamente ao staging ou à produção por esta revisão.
