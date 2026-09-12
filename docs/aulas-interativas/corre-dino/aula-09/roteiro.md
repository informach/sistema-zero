# Bateu, terminou, recomeçou

Uma aula, organizada em 4 seções. Público: 9 a 16 anos.

Fonte: `roteiro-aula-09-corre-dino.md`. SHA-256: `905dc7206a7ca7fc6264dbd2dc14661ad73e462690ba23b6d9b794d566a3c13b`.
O original foi preservado. Este roteiro substitui a sequência didática da aula, sem abrir um curso ou uma área de revisão paralela.

## Estado de entrada e resultado

A tela de início funciona por teclado e toque. O dino ainda atravessa os cactos sem perder.

**Resultado:** Definir a consequência da colisão e testar o ciclo completo da partida.

**Ambiente:** o mesmo Estúdio incorporado acompanha as seções. Preservar o projeto inicial, a continuidade e a entrega já configurados na aula.

## Percurso e ritmo

Cada seção reúne ações que chegam a uma pequena conquista. Não fazer uma prova depois de cada clique. A criança pode consultar o texto, pausar o vídeo, pedir uma pista e tentar novamente. Cores, formas e outros detalhes livres não são critérios de aprovação.

| Etapa | O que libera o avanço |
| --- | --- |
| Monte o ciclo da partida | Resolver a descoberta. |
| Conte o que aconteceu na batida | Responder uma pergunta de decisão. |
| Prepare outra tentativa | Responder uma pergunta de decisão. |
| Jogue, perca e tente de novo | Enviar o projeto; atingir a nota automática se o Estúdio exigir. |

## Orientações de produção e acessibilidade

Helena narra; nas aulas de arte, Júlio demonstra as escolhas dele. Mostrar uma ação por vez e devolver o controle à criança. Nomear ferramenta, categoria e encaixe. Manter texto e legendas legíveis, sem exigir rapidez, precisão de arraste ou áudio para compreender a orientação. Nas ordenações, demonstrar também os botões de mover as peças. Não usar somente cor para indicar o que mudou.

Convidar a prever, testar e ajustar. Mostrar o erro e sua recuperação com calma. Se um trecho ficar longo, a criança pode pausar entre os passos da mesma seção; não precisa passar por outra pergunta para cada pausa. As alternativas e gabaritos abaixo orientam a produção, não são texto para revelar antes da resposta.

## 1. Monte o ciclo da partida

**Intenção e objetivo (professor):** Exploração · Definir a consequência da colisão e testar o ciclo completo da partida.

**Texto para o aluno:**

Oi! Hoje uma batida vai encerrar a partida. E o jogador vai poder tentar outra vez, sem mexer nos blocos.

Você pode fazer uma pausa, voltar às etapas concluídas e usar Preciso de ajuda. Não precisa acertar de primeira.

**Atividade: Monte o ciclo da partida**

Modelo: `sequence`. Critério desta seção.

Organize a experiência de alguém que perdeu uma partida e decidiu tentar de novo.

**Peças:** Ver a tela de fim · Começar na tela de início · Jogar e colidir com um cacto · Reiniciar e preparar outra partida

**Ordem para o professor:** Começar na tela de início → Jogar e colidir com um cacto → Ver a tela de fim → Reiniciar e preparar outra partida

**Pistas:**

- O fim encerra uma partida; reiniciar prepara a próxima.

**Texto para o aluno:**

Detectar um encontro só faz diferença quando escolhemos sua consequência. A colisão pode produzir som, explosão, tremida e uma mudança de tela.

Ao ir para fim, as ações protegidas por Se jogando deixam de executar. Reiniciar prepara uma partida nova, passando novamente pelas ações iniciais.

Testar só a batida não basta: início, fim e reinício precisam formar um ciclo que o jogador entende.

**Critério configurado:** `descoberta`. A resposta é corrigida pelo sistema; a criança pode consultar as pistas e tentar de novo.

## 2. Conte o que aconteceu na batida

**Intenção e objetivo (professor):** Aplicação · Comunicar a colisão com mudança de tela e sinais visuais e sonoros.

**Ferramenta:** continuar o mesmo Estúdio incorporado. Não criar outra entrega entre os passos.

**Narração revisada / instruções disponíveis em texto:**

### A colisão que acaba o jogo

Em Jogo 2D, Colisões, coloque o evento de cada sprite do grupo que colidir com dino dentro de Se jogando, antes da limpeza. Use cactos e o apelido cacto.

Dentro, coloque Ir para a tela fim. Rode e bata.

**Vídeo planejado:** `video-construir-1-1`

**Na tela (sequência técnica preservada):**

Jogo 2D › Colisões, arrastar "Para cada sprite do grupo __ que colidir com o sprite __ chamar o sprite de __ fazer" (rótulo literal na tela) para dentro do "Se a tela atual é jogando", ENTRE o "Desenhar o grupo" e o "Tirar do grupo quem sair da tela" (grupo cactos, sprite dino, apelido cacto). Dentro dele, só "Ir para a tela", escolhendo "fim" na listinha, que já vem pronta. Rodar e bater.

**Produção:** aula-09-passo-01: gravar a demonstração "a colisão que acaba o jogo" conforme roteiro.md; enviar o vídeo e inserir o bloco nesta seção.

**Narração revisada / instruções disponíveis em texto:**

### A tela de fim

No Se grande, adicione outro senão se com a tela fim. Dentro, coloque Mostrar tela.

Use Bateu no cacto! como título e uma dica dizendo que qualquer tecla ou toque permite jogar de novo.

**Vídeo planejado:** `video-construir-2-1`

**Na tela (sequência técnica preservada):**

no mesmo bloco Se do "A cada quadro", clicar no "+ senão se" de novo e mostrar o terceiro andar nascendo, embaixo do "senão se a tela atual é inicio". Encaixar nele o "a tela atual é" com "fim" e, dentro, o "Mostrar tela" (título "Bateu no cacto!", subtítulo simples, dica "Aperte qualquer tecla ou toque na tela para jogar de novo", fundo escuro de fábrica). Zoom final no bloco inteiro, com os três andares lidos de cima pra baixo.

**Produção:** aula-09-passo-02: gravar a demonstração "a tela de fim" conforme roteiro.md; enviar o vídeo e inserir o bloco nesta seção.

**Narração revisada / instruções disponíveis em texto:**

### Fazer você sentir a batida

Dentro da colisão, antes de ir para fim, acrescente explosão no cacto, tremida de intensidade 8 e o efeito de derrota. Escute e observe a batida: esses sinais contam ao jogador o que aconteceu.

**Vídeo planejado:** `video-construir-3-1`

**Na tela (sequência técnica preservada):**

dentro do espaço de fazer da colisão, ANTES do "Ir para a tela fim", acrescentar na ordem: "Soltar explosão no sprite __ cor __" (Kit espaço, sprite cacto, cor vermelha), "Tremer a tela com intensidade __" (Aparência, 8), "Tocar efeito __" (Som, derrota).

**Produção:** aula-09-passo-03: gravar a demonstração "fazer você sentir a batida" conforme roteiro.md; enviar o vídeo e inserir o bloco nesta seção.

**Texto para o aluno:**

**Sua vez:** Bata em um cacto. Veja a tela de fim e os efeitos. A mensagem deve explicar o que aconteceu mesmo com o som desligado.

**Atividade: Uma decisão para continuar**

Modelo: `checkpoint`. Critério desta seção.

Escolha uma resposta. Se precisar, consulte a explicação ou use uma pista e tente de novo.

**Pergunta:** O jogo está sem som. Como a pessoa ainda pode perceber que perdeu?

- Pela tela de fim, pela mensagem e pelos efeitos visuais.
- Apenas adivinhando por que o controle parou.
- Aumentando o volume do computador.

**Resposta esperada (professor):** Pela tela de fim, pela mensagem e pelos efeitos visuais.

**Devolutiva:** Uma informação importante pode chegar por mais de um caminho. Texto e imagem ajudam a explicar a batida junto com o som.

**Pistas:**

- Pense no que continua disponível quando não ouvimos.

**Critério configurado:** `checar-construir-3`. A resposta é corrigida pelo sistema; a criança pode consultar as pistas e tentar de novo.

## 3. Prepare outra tentativa

**Intenção e objetivo (professor):** Aplicação · Reiniciar o jogo no comando da tela fim.

**Ferramenta:** continuar o mesmo Estúdio incorporado. Não criar outra entrega entre os passos.

**Narração revisada / instruções disponíveis em texto:**

### Jogar de novo

No evento de qualquer tecla ou toque, acrescente senão se a tela é fim. Dentro, coloque Reiniciar o jogo, de Telas e cenas.

Preserve o caminho de inicio para jogando que já existe.

**Vídeo planejado:** `video-construir-4-1`

**Na tela (sequência técnica preservada):**

no "Quando apertar qualquer tecla ou tocar na tela", clicar no "+ senão se" do "Se a tela atual é inicio" que já existe e encaixar no andar novo o "a tela atual é fim", com "Reiniciar o jogo" (Telas e cenas) dentro. Dar um zoom no evento inteiro no fim, mostrando o bloco de dois andares.

**Produção:** aula-09-passo-04: gravar a demonstração "jogar de novo" conforme roteiro.md; enviar o vídeo e inserir o bloco nesta seção.

**Texto para o aluno:**

**Sua vez:** Preserve o caminho que começa a partida e acrescente o caminho para jogar de novo.

**Atividade: Uma decisão para continuar**

Modelo: `checkpoint`. Critério desta seção.

Escolha uma resposta. Se precisar, consulte a explicação ou use uma pista e tente de novo.

**Pergunta:** Após perder, mudar só para jogando deixou objetos da partida antiga. Que ação falta?

- Desenhar outra vez a tela de fim.
- Trocar o título da tela inicial.
- Reiniciar o jogo.

**Resposta esperada (professor):** Reiniciar o jogo.

**Devolutiva:** Reiniciar executa a preparação da partida. Só trocar de tela pode deixar valores e objetos do jogo anterior.

**Pistas:**

- Uma partida nova precisa preparar o estado inicial de novo.

**Critério configurado:** `checar-construir-4`. A resposta é corrigida pelo sistema; a criança pode consultar as pistas e tentar de novo.

## 4. Jogue, perca e tente de novo

**Intenção e objetivo (professor):** Fechamento · Testar e guardar a criação, reconhecendo o próximo passo. Conferir a entrega configurada no Estúdio.

**Ferramenta:** continuar o mesmo Estúdio incorporado. Não criar outra entrega entre os passos.

**Narração revisada / instruções disponíveis em texto:**

### Testar do começo ao fim

Jogue desde a tela de início, bata, veja o fim e recomece. Faça isso com clique e depois com Enter.

Confira se o novo jogo volta ao estado inicial.

**Vídeo planejado:** `video-construir-5-1`

**Na tela (sequência técnica preservada):**

recarregar e jogar uma partida completa: tela de início, clique na tela, jogar, bater, tela de fim, clique de novo, recomeçar. No fim, repetir a partida começando pelo Enter, pra mostrar que os dois jeitos valem.

**Produção:** aula-09-passo-05: gravar a demonstração "testar do começo ao fim" conforme roteiro.md; enviar o vídeo e inserir o bloco nesta seção.

**Texto para o aluno:**

Complete o ciclo duas vezes, usando controles diferentes. O jogo deve parar ao perder e permitir uma nova tentativa. Envie seu projeto.

Na Aula 10, você vai investigar por que algumas batidas parecem injustas.

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
- `checar-construir-1`: Confira: a colisão que acaba o jogo
- `checar-construir-2`: Confira: a tela de fim
- `checar-construir-5`: Confira: testar do começo ao fim

A retirada acontece no rascunho; o histórico persistido não deve ser apagado. Nenhum manifesto desta pasta foi aplicado automaticamente ao staging ou à produção por esta revisão.
