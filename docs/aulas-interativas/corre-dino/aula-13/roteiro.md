# Dificuldade que cresce com a partida

Uma aula, organizada em 4 seções. Público: 9 a 16 anos.

Fonte: `roteiro-aula-13-corre-dino.md`. SHA-256: `05eb185cda62071bb736bbdf7461cdfbc0e03e694f8dad6609cf73972550660e`.
O original foi preservado. Este roteiro substitui a sequência didática da aula, sem abrir um curso ou uma área de revisão paralela.

## Estado de entrada e resultado

Retome o projeto com placar e pequenas variações no nascimento dos cactos.

**Resultado:** Acelerar progressivamente com uma variável, uma condição e um limite, e concluir a publicação.

**Ambiente:** o mesmo Estúdio incorporado acompanha as seções. Preservar o projeto inicial, a continuidade e a entrega já configurados na aula.

## Percurso e ritmo

Cada seção reúne ações que chegam a uma pequena conquista. Não fazer uma prova depois de cada clique. A criança pode consultar o texto, pausar o vídeo, pedir uma pista e tentar novamente. Cores, formas e outros detalhes livres não são critérios de aprovação.

| Etapa | O que libera o avanço |
| --- | --- |
| Onde a aceleração para? | Resolver a descoberta. |
| Uma velocidade que pode mudar | Verificar os objetivos do projeto. |
| Coloque um limite na aceleração | Responder uma pergunta de decisão. |
| Sua pista, seu desafio | Enviar o projeto; atingir a nota automática se o Estúdio exigir. |

## Orientações de produção e acessibilidade

Helena narra; nas aulas de arte, Júlio demonstra as escolhas dele. Mostrar uma ação por vez e devolver o controle à criança. Nomear ferramenta, categoria e encaixe. Manter texto e legendas legíveis, sem exigir rapidez, precisão de arraste ou áudio para compreender a orientação. Nas ordenações, demonstrar também os botões de mover as peças. Não usar somente cor para indicar o que mudou.

Convidar a prever, testar e ajustar. Mostrar o erro e sua recuperação com calma. Se um trecho ficar longo, a criança pode pausar entre os passos da mesma seção; não precisa passar por outra pergunta para cada pausa. As alternativas e gabaritos abaixo orientam a produção, não são texto para revelar antes da resposta.

## 1. Onde a aceleração para?

**Intenção e objetivo (professor):** Exploração · Acelerar progressivamente com uma variável, uma condição e um limite, e concluir a publicação.

**Texto para o aluno:**

Oi! A pista vai ficar mais rápida durante a partida. Você vai escolher até onde ela acelera e preparar seu Dino para outras pessoas jogarem.

Você pode fazer uma pausa, voltar às etapas concluídas e usar Preciso de ajuda. Não precisa acertar de primeira.

**Atividade: Onde a aceleração para?**

Modelo: `html`. Critério desta seção.

Avance o relógio até chegar ao limite e tente mais uma vez. Observe o número e a distância para a esquerda.

**Interação:** usar o bloco funcional incorporado ao manifesto. A observação prepara a pergunta; o experimento não avalia o projeto da criança.

**Pergunta:** Com base −9 e regra “se velocidade > −9, somar −1”, o próximo passo…

- Muda a base para −10
- Mantém a base em −9
- Muda o sinal para positivo

**Resposta esperada (professor):** Mantém a base em −9

**Devolutiva:** No limite, −9 > −9 é falso. A condição impede outra redução da velocidade-base.

**Pistas:**

- Compare o valor atual com o limite usando o sinal maior, não maior ou igual.

**Texto para o aluno:**

Uma variável permite mudar a velocidade-base dos próximos cactos. Ela começa em −5.

A cada cinco segundos de partida, subtrair 1 leva a −6, −7, −8 e −9. No limite −9, a pergunta velocidade > −9 fica falsa e a base para de diminuir.

O sorteio de 0 a 1 continua sendo subtraído: −9 é limite da base, não de todo vx final. Os cactos que já nasceram mantêm a velocidade que receberam; os novos usam o valor atualizado.

**Critério configurado:** `descoberta`. A resposta é corrigida pelo sistema; a criança pode consultar as pistas e tentar de novo.

## 2. Uma velocidade que pode mudar

**Intenção e objetivo (professor):** Aplicação · Usar uma variável como base da velocidade de novos obstáculos.

**Ferramenta:** continuar o mesmo Estúdio incorporado. Não criar outra entrega entre os passos.

**Narração revisada / instruções disponíveis em texto:**

### Criar a caixinha da velocidade

Em Programação, Variáveis, crie velocidade com menos 5 em Ao iniciar, depois de pontos e antes da tela inicio. Essa será a base dos próximos cactos.

**Vídeo planejado:** `video-construir-1-1`

**Na tela (sequência técnica preservada):**

Programação › Variáveis, arrastar "Criar variável __ com valor __" para dentro do Ao iniciar, logo abaixo da variável pontos e logo ACIMA do "Ir para a tela inicio"; nome "velocidade", valor -5.

**Produção:** aula-13-passo-01: gravar a demonstração "criar a caixinha da velocidade" conforme roteiro.md; enviar o vídeo e inserir o bloco nesta seção.

**Narração revisada / instruções disponíveis em texto:**

### Fazer o cacto obedecer a caixinha

Na conta do vx do cacto, substitua só o menos 5 pelo valor da variável velocidade, de Programação, Valores. Preserve a subtração do sorteio.

Rode: no começo deve parecer igual.

**Vídeo planejado:** `video-construir-2-1`

**Na tela (sequência técnica preservada):**

no bloco de criar cacto, dentro da conta do vx, arrastar "valor da variável velocidade" (Programação › Valores) por cima do -5. Rodar e mostrar que nada mudou.

**Produção:** aula-13-passo-02: gravar a demonstração "fazer o cacto obedecer a caixinha" conforme roteiro.md; enviar o vídeo e inserir o bloco nesta seção.

**Texto para o aluno:**

**Sua vez:** No início, o jogo deve parecer igual. A diferença é que agora existe um valor guardado para mudar depois.

Depois, use **Verificar esta etapa**. A conferência olha os blocos pedidos. Rode o jogo também para observar o resultado.

**Critérios configurados em Para liberar a próxima seção:** todos os objetivos abaixo precisam passar no mesmo projeto.

- Crie a variável velocidade. Regra de cadastro: `{"type":"declaresVariable","name":"velocidade"}`.

**Limite da conferência:** comprova a estrutura pedida, não executa a partida nem avalia sua qualidade. A observação sugerida na etapa continua necessária para aprender.

## 3. Coloque um limite na aceleração

**Intenção e objetivo (professor):** Aplicação · Interpretar a condição que limita a base e distingui-la da velocidade final.

**Ferramenta:** continuar o mesmo Estúdio incorporado. Não criar outra entrega entre os passos.

**Narração revisada / instruções disponíveis em texto:**

### Fazer a velocidade acelerar sozinha

Em Tempo e repetição, adicione um relógio de 5 segundos. Dentro, Se a tela é jogando.

Dentro dele, outro Se: velocidade maior que menos 9. Troque o sinal da comparação para maior.

Só dentro do segundo Se coloque Somar menos 1 em velocidade.

**Vídeo planejado:** `video-construir-3-1`

**Na tela (sequência técnica preservada):**

Jogo 2D › Tempo e repetição, um novo "A cada __ segundos" no Enquanto estiver rodando, ao lado dos outros dois, com 5; dentro, um "Se" (Programação › Lógica & Se) com a comparação de fábrica retirada e, no lugar dela, "a tela atual é __ ?" (Jogo 2D › Telas e cenas) em "jogando"; dentro dele, um segundo "Se" (Programação › Lógica & Se) aproveitando a comparação de fábrica: "valor da variável velocidade" > -9, **trocando o sinal de `=` para `>` na listinha** (o `>` é o quinto da lista); e dentro desse, "Somar -1 em variável velocidade".

**Produção:** aula-13-passo-03: gravar a demonstração "fazer a velocidade acelerar sozinha" conforme roteiro.md; enviar o vídeo e inserir o bloco nesta seção.

**Texto para o aluno:**

**Sua vez:** Siga a base: −5, −6, −7, −8, −9. Lembre que o sorteio ainda é descontado depois.

**Atividade: Uma decisão para continuar**

Modelo: `checkpoint`. Critério desta seção.

Escolha uma resposta. Se precisar, consulte a explicação ou use uma pista e tente de novo.

**Pergunta:** A base chegou a −9 e o sorteio deu 1. Qual vx o novo cacto recebe?

- −8: o sorteio é somado.
- −10: o limite vale para a base.
- −9: o sorteio deixa de existir.

**Resposta esperada (professor):** −10: o limite vale para a base.

**Devolutiva:** A condição segura a base em −9. Depois, −9 menos 1 dá −10. Os cactos que já nasceram mantêm a velocidade recebida.

**Pistas:**

- A conta continua sendo velocidade menos o sorteio.

**Critério configurado:** `checar-construir-3`. A resposta é corrigida pelo sistema; a criança pode consultar as pistas e tentar de novo.

## 4. Sua pista, seu desafio

**Intenção e objetivo (professor):** Fechamento · Testar e guardar a criação, reconhecendo o próximo passo. Conferir a entrega configurada no Estúdio.

**Ferramenta:** continuar o mesmo Estúdio incorporado. Não criar outra entrega entre os passos.

**Narração revisada / instruções disponíveis em texto:**

### Testar e ajustar o seu jogo

Jogue partidas longas para sentir a mudança. Compare limites menos 7 e menos 14, e ritmos de 2 e 10 segundos.

Escolha um desafio possível. Confira também uma partida nova, que deve voltar à base menos 5.

**Vídeo planejado:** `video-construir-4-1`

**Na tela (sequência técnica preservada):**

jogar partidas longas; depois a pausa, mexendo no limite (-7 e -14) e no ritmo do relógio (2 e 10).

**Produção:** aula-13-passo-04: gravar a demonstração "testar e ajustar o seu jogo" conforme roteiro.md; enviar o vídeo e inserir o bloco nesta seção.

**Texto para o aluno:**

Teste a evolução, o limite e o reinício. Para publicar, envie ao professor, use Compartilhar, escreva o resumo e confira a capa. Abra o link publicado e jogue do começo ao fim.

Você concluiu o Corre, Dino! A Ponte pode mostrar o código dos blocos. Confira na Carreira o próximo curso e as conquistas ligadas à conclusão e à publicação.

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
- `checar-construir-1`: Confira: criar a caixinha da velocidade
- `checar-construir-2`: Confira: fazer o cacto obedecer a caixinha
- `checar-construir-4`: Confira: testar e ajustar o seu jogo

A retirada acontece no rascunho; o histórico persistido não deve ser apagado. Nenhum manifesto desta pasta foi aplicado automaticamente ao staging ou à produção por esta revisão.
