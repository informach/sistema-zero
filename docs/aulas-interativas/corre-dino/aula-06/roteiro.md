# A faxina dos cactos invisíveis

Uma aula, organizada em 4 seções. Público: 9 a 16 anos.

Fonte: `roteiro-aula-06-corre-dino.md`. SHA-256: `3f35c3213866fcd7d6ca59e0e1c34407f370807a410233aeb5ff95b0cd831a5f`.
O original foi preservado. Este roteiro substitui a sequência didática da aula, sem abrir um curso ou uma área de revisão paralela.

## Estado de entrada e resultado

Os cactos chegam em intervalos de 1,4 segundo e saem pela esquerda. O grupo ainda pode guardar os que você não vê.

**Resultado:** Usar uma medida para investigar objetos invisíveis e verificar a remoção do grupo.

**Ambiente:** o mesmo Estúdio incorporado acompanha as seções. Preservar o projeto inicial, a continuidade e a entrega já configurados na aula.

## Percurso e ritmo

Cada seção reúne ações que chegam a uma pequena conquista. Não fazer uma prova depois de cada clique. A criança pode consultar o texto, pausar o vídeo, pedir uma pista e tentar novamente. Cores, formas e outros detalhes livres não são critérios de aprovação.

| Etapa | O que libera o avanço |
| --- | --- |
| Quantos existem e quantos aparecem? | Resolver a descoberta. |
| Espie o que ficou guardado | Responder uma pergunta de decisão. |
| Faça a faxina do grupo | Verificar os objetivos do projeto. |
| Guarde a solução, retire o medidor | Enviar o projeto; atingir a nota automática se o Estúdio exigir. |

## Orientações de produção e acessibilidade

Helena narra; nas aulas de arte, Júlio demonstra as escolhas dele. Mostrar uma ação por vez e devolver o controle à criança. Nomear ferramenta, categoria e encaixe. Manter texto e legendas legíveis, sem exigir rapidez, precisão de arraste ou áudio para compreender a orientação. Nas ordenações, demonstrar também os botões de mover as peças. Não usar somente cor para indicar o que mudou.

Convidar a prever, testar e ajustar. Mostrar o erro e sua recuperação com calma. Se um trecho ficar longo, a criança pode pausar entre os passos da mesma seção; não precisa passar por outra pergunta para cada pausa. As alternativas e gabaritos abaixo orientam a produção, não são texto para revelar antes da resposta.

## 1. Quantos existem e quantos aparecem?

**Intenção e objetivo (professor):** Exploração · Usar uma medida para investigar objetos invisíveis e verificar a remoção do grupo.

**Texto para o aluno:**

Oi! Um cacto saiu da tela. Será que ele saiu também do grupo? Hoje você vai ser detetive do que ficou escondido.

Você pode fazer uma pausa, voltar às etapas concluídas e usar Preciso de ajuda. Não precisa acertar de primeira.

**Atividade: Quantos existem e quantos aparecem?**

Modelo: `experiment`. Critério desta seção.

Teste intervalos 0,1 e 1,4. Compare os objetos criados com os que ainda aparecem. Este modelo mostra a diferença; a remoção será conferida no seu jogo.

**Interação:** usar o bloco funcional incorporado ao manifesto. A observação prepara a pergunta; o experimento não avalia o projeto da criança.

**Pergunta:** Se um cacto saiu da tela, isso prova que ele saiu do grupo?

- Sim, imagem e grupo sempre têm os mesmos objetos
- Não, é preciso uma regra para removê-lo

**Resposta esperada (professor):** Não, é preciso uma regra para removê-lo

**Devolutiva:** A quantidade no grupo é um estado do programa. O desenho mostra apenas a parte visível.

**Pistas:**

- Compare o total criado em dez segundos com a quantidade visível no mesmo instante.

**Texto para o aluno:**

Sair da imagem não é o mesmo que deixar de existir no grupo. Sem remoção, o total criado cresce mesmo quando poucos cactos aparecem na tela.

Um contador ajuda a observar esse estado invisível. No modelo, cada objeto leva três segundos para sair: o total criado em dez segundos pode ser bem maior que os objetos ainda visíveis.

A limpeza remove os que saíram e permite estabilizar a quantidade guardada. Primeiro medimos, depois mudamos a regra e medimos novamente.

**Critério configurado:** `descoberta`. A resposta é corrigida pelo sistema; a criança pode consultar as pistas e tentar de novo.

## 2. Espie o que ficou guardado

**Intenção e objetivo (professor):** Aplicação · Usar um contador para observar objetos fora da tela.

**Ferramenta:** continuar o mesmo Estúdio incorporado. Não criar outra entrega entre os passos.

**Narração revisada / instruções disponíveis em texto:**

### Montar o medidor

Em Placar e HUD, coloque Mostrar placar como último bloco de A cada quadro. Escreva Cactos.

No valor, encaixe quantos sprites tem no grupo, de Muitos, e escolha cactos. Use uma cor escura para enxergar o número.

**Vídeo planejado:** `video-construir-1-1`

**Na tela (sequência técnica preservada):**

Jogo 2D › Placar e HUD, arrastar "Mostrar placar __ valor __ em x __ y __ cor __ tamanho __" para dentro do "A cada quadro do jogo", como último bloco, logo abaixo do "Desenhar o grupo". Percorrer os seis campos na ordem do bloco: no texto escrever "Cactos"; por cima do valor, arrastar "quantos sprites tem no grupo __" (Jogo 2D › Muitos) e escolher o grupo cactos; x e y como vieram; cor azul escuro; tamanho como veio.

**Produção:** aula-06-passo-01: gravar a demonstração "montar o medidor" conforme roteiro.md; enviar o vídeo e inserir o bloco nesta seção.

**Narração revisada / instruções disponíveis em texto:**

### Provocar o problema

Troque o relógio de 1.4 para 0.1 por um teste curto. Observe o número enquanto os cactos saem da tela.

Ele continua crescendo? Essa é a medida do problema que vamos corrigir.

**Vídeo planejado:** `video-construir-2-1`

**Na tela (sequência técnica preservada):**

trocar o relógio de 1.4 para 0.1, com a câmera fixa no número do medidor subindo sem parar.

**Produção:** aula-06-passo-02: gravar a demonstração "provocar o problema" conforme roteiro.md; enviar o vídeo e inserir o bloco nesta seção.

**Texto para o aluno:**

**Sua vez:** Deixe alguns cactos saírem. Compare a pista com o número do contador.

**Atividade: Uma decisão para continuar**

Modelo: `checkpoint`. Critério desta seção.

Escolha uma resposta. Se precisar, consulte a explicação ou use uma pista e tente de novo.

**Pergunta:** Você vê poucos cactos, mas o contador continua crescendo. O que investigar?

- Se os cactos fora da tela continuam no grupo.
- Se a cor do Dino está clara demais.
- Se o título da aula mudou.

**Resposta esperada (professor):** Se os cactos fora da tela continuam no grupo.

**Devolutiva:** Sair da tela só muda o que você vê. O grupo precisa de uma regra para remover os objetos que já passaram.

**Pistas:**

- O contador mostra o grupo inteiro, inclusive o que está fora da imagem.

**Critério configurado:** `checar-construir-2`. A resposta é corrigida pelo sistema; a criança pode consultar as pistas e tentar de novo.

## 3. Faça a faxina do grupo

**Intenção e objetivo (professor):** Aplicação · Adicionar a remoção de objetos que saíram da tela.

**Ferramenta:** continuar o mesmo Estúdio incorporado. Não criar outra entrega entre os passos.

**Narração revisada / instruções disponíveis em texto:**

### A faxina

Em Muitos, coloque Tirar do grupo quem sair da tela entre o desenho do grupo e o contador. Escolha cactos, use o apelido cacto e deixe fazer vazio.

Compare o número com o teste anterior.

**Vídeo planejado:** `video-construir-3-1`

**Na tela (sequência técnica preservada):**

Jogo 2D › Muitos, encaixar "Tirar do grupo __ quem sair da tela, para cada um (chamado __ )" dentro do "A cada quadro do jogo", ENTRE o "Desenhar o grupo" e o "Mostrar placar" do medidor. Grupo cactos, apelido sprite → cacto, corpo do fazer vazio. Com o relógio ainda em 0.1, mostrar o número subindo e descendo.

**Produção:** aula-06-passo-03: gravar a demonstração "a faxina" conforme roteiro.md; enviar o vídeo e inserir o bloco nesta seção.

**Texto para o aluno:**

**Sua vez:** Compare o contador antes e depois da limpeza. A quantidade deve deixar de crescer sem parar.

Depois, use **Verificar esta etapa**. A conferência olha os blocos pedidos. Rode o jogo também para observar o resultado.

**Critérios configurados em Para liberar a próxima seção:** todos os objetivos abaixo precisam passar no mesmo projeto.

- Tire do grupo cactos quem sair da tela, em A cada quadro do jogo. Regra de cadastro: `{"type":"usesBlock","blockType":"sz_g2d_prune_offscreen","area":"loops","fields":{"GROUP":"cactos"},"withinBlock":"sz_g2d_update_each_frame"}`.

**Limite da conferência:** comprova a estrutura pedida, não executa a partida nem avalia sua qualidade. A observação sugerida na etapa continua necessária para aprender.

## 4. Guarde a solução, retire o medidor

**Intenção e objetivo (professor):** Fechamento · Testar e guardar a criação, reconhecendo o próximo passo. Conferir a entrega configurada no Estúdio.

**Ferramenta:** continuar o mesmo Estúdio incorporado. Não criar outra entrega entre os passos.

**Narração revisada / instruções disponíveis em texto:**

### Testar dois ritmos, devolver o relógio e aposentar o medidor

Com o contador ligado, compare 0.1 e 0.5. Depois devolva o relógio para 1.4 e confira um patamar baixo.

Remova o Mostrar placar do medidor, junto com o valor encaixado. A limpeza continua; o medidor já cumpriu sua tarefa.

**Vídeo planejado:** `video-construir-4-1`

**Na tela (sequência técnica preservada):**

com o medidor aceso, jogar com o relógio em 0.1 e depois em 0.5, comparando o patamar do número; devolver o relógio para 1.4 e mostrar o medidor num patamar baixo, subindo e descendo. Por fim, arrastar o "Mostrar placar" do medidor para a lixeira, com o "quantos sprites tem no grupo" indo junto por estar encaixado dentro dele, e mostrar o laço ficando com oito blocos.

**Produção:** aula-06-passo-04: gravar a demonstração "testar dois ritmos, devolver o relógio e aposentar o medidor" conforme roteiro.md; enviar o vídeo e inserir o bloco nesta seção.

**Texto para o aluno:**

A limpeza deve permanecer e o relógio voltar a 1.4. O contador de diagnóstico deve sair ao final desta aula. Envie o projeto já sem o medidor.

Na Aula 7, você vai separar o momento de jogar da tela de início.

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
- `checar-construir-1`: Confira: montar o medidor
- `checar-construir-3`: Confira: a faxina
- `checar-construir-4`: Confira: testar dois ritmos, devolver o relógio e aposentar o medidor

A retirada acontece no rascunho; o histórico persistido não deve ser apagado. Nenhum manifesto desta pasta foi aplicado automaticamente ao staging ou à produção por esta revisão.
