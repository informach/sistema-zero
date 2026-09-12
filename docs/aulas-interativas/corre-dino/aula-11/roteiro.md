# Quanto tempo você resistiu?

Uma aula, organizada em 4 seções. Público: 9 a 16 anos.

Fonte: `roteiro-aula-11-corre-dino.md`. SHA-256: `b30f94be234e9fb0da4db2fd54da6d3d070b01e51b7b5c0569f6db7568006c6e`.
O original foi preservado. Este roteiro substitui a sequência didática da aula, sem abrir um curso ou uma área de revisão paralela.

## Estado de entrada e resultado

Seu jogo completo ainda não tem um número para comparar duas partidas.

**Resultado:** Guardar pontos, contar somente durante a partida e mostrar o resultado com contraste.

**Ambiente:** o mesmo Estúdio incorporado acompanha as seções. Preservar o projeto inicial, a continuidade e a entrega já configurados na aula.

## Percurso e ritmo

Cada seção reúne ações que chegam a uma pequena conquista. Não fazer uma prova depois de cada clique. A criança pode consultar o texto, pausar o vídeo, pedir uma pista e tentar novamente. Cores, formas e outros detalhes livres não são critérios de aprovação.

| Etapa | O que libera o avanço |
| --- | --- |
| O placar conta na hora certa? | Resolver a descoberta. |
| Dê um lugar aos pontos | Verificar os objetivos do projeto. |
| Conte só durante a corrida | Responder uma pergunta de decisão. |
| Tente uma nova marca | Enviar o projeto; atingir a nota automática se o Estúdio exigir. |

## Orientações de produção e acessibilidade

Helena narra; nas aulas de arte, Júlio demonstra as escolhas dele. Mostrar uma ação por vez e devolver o controle à criança. Nomear ferramenta, categoria e encaixe. Manter texto e legendas legíveis, sem exigir rapidez, precisão de arraste ou áudio para compreender a orientação. Nas ordenações, demonstrar também os botões de mover as peças. Não usar somente cor para indicar o que mudou.

Convidar a prever, testar e ajustar. Mostrar o erro e sua recuperação com calma. Se um trecho ficar longo, a criança pode pausar entre os passos da mesma seção; não precisa passar por outra pergunta para cada pausa. As alternativas e gabaritos abaixo orientam a produção, não são texto para revelar antes da resposta.

## 1. O placar conta na hora certa?

**Intenção e objetivo (professor):** Exploração · Guardar pontos, contar somente durante a partida e mostrar o resultado com contraste.

**Texto para o aluno:**

Oi! Quanto tempo você consegue continuar na pista? Hoje vamos guardar esse resultado e mostrar um placar fácil de ler.

Você pode fazer uma pausa, voltar às etapas concluídas e usar Preciso de ajuda. Não precisa acertar de primeira.

**Atividade: O placar conta na hora certa?**

Modelo: `html`. Critério desta seção.

Avance o relógio nas três telas. Descubra qual contador serve para medir somente o tempo de partida.

**Interação:** usar o bloco funcional incorporado ao manifesto. A observação prepara a pergunta; o experimento não avalia o projeto da criança.

**Pergunta:** Qual contador mede o tempo de jogo sem contar início e fim?

- O que soma sempre
- O que soma somente em jogando

**Resposta esperada (professor):** O que soma somente em jogando

**Devolutiva:** A condição preserva o significado do placar: tempo sobrevivido durante a partida.

**Pistas:**

- Fique na tela fim e avance mais um segundo. Qual número deveria ficar parado?

**Texto para o aluno:**

A variável pontos guarda um número que muda. Mostrar placar apenas lê esse valor e o desenha.

Neste jogo, sobreviver mais um segundo soma um ponto, mas apenas enquanto a tela é jogando. Se o relógio não tiver essa condição, o placar pode crescer antes de começar ou depois de perder.

Um número correto também precisa ser legível: a cor do texto deve contrastar com o fundo.

**Critério configurado:** `descoberta`. A resposta é corrigida pelo sistema; a criança pode consultar as pistas e tentar de novo.

## 2. Dê um lugar aos pontos

**Intenção e objetivo (professor):** Aplicação · Inicializar pontos e mostrar um placar legível.

**Ferramenta:** continuar o mesmo Estúdio incorporado. Não criar outra entrega entre os passos.

**Narração revisada / instruções disponíveis em texto:**

### Criar a caixinha dos pontos

Em Programação, Variáveis, crie pontos com 0 em Ao iniciar, antes de Ir para a tela inicio. Reiniciar vai preparar o placar outra vez.

**Vídeo planejado:** `video-construir-1-1`

**Na tela (sequência técnica preservada):**

Programação › Variáveis, arrastar "Criar variável __ com valor __" para dentro do Ao iniciar, logo ACIMA do "Ir para a tela inicio"; nome "pontos", valor 0.

**Produção:** aula-11-passo-01: gravar a demonstração "criar a caixinha dos pontos" conforme roteiro.md; enviar o vídeo e inserir o bloco nesta seção.

**Narração revisada / instruções disponíveis em texto:**

### Mostrar o placar

Em Jogo 2D, Placar e HUD, coloque Mostrar placar no fim de Se jogando. No valor, encaixe valor da variável pontos.

Confira x 12, y 30 e tamanho 24. Compare branco no céu e depois azul escuro.

**Vídeo planejado:** `video-construir-2-1`

**Na tela (sequência técnica preservada):**

Jogo 2D › Placar e HUD, arrastar "Mostrar placar" para dentro do "Se a tela atual é jogando", lá embaixo de tudo. O texto já nasce "Pontos:". Por cima do valor, arrastar "valor da variável" (Programação › Valores) e escolher pontos. Conferir que o x, o y e o tamanho já vêm em 12, 30 e 24, sem mexer em nenhum. **Rodar e mostrar o placar branco quase sumindo no céu claro**, e só então trocar a cor de branco para azul escuro e rodar de novo. A dor do contraste é o ponto desta parte, então filmar as duas rodadas.

**Produção:** aula-11-passo-02: gravar a demonstração "mostrar o placar" conforme roteiro.md; enviar o vídeo e inserir o bloco nesta seção.

**Texto para o aluno:**

**Sua vez:** Olhe o placar sobre o céu. Escolha uma cor que deixe o número fácil de enxergar.

Depois, use **Verificar esta etapa**. A conferência olha os blocos pedidos. Rode o jogo também para observar o resultado.

**Critérios configurados em Para liberar a próxima seção:** todos os objetivos abaixo precisam passar no mesmo projeto.

- Crie a variável pontos. Regra de cadastro: `{"type":"declaresVariable","name":"pontos"}`.

**Limite da conferência:** comprova a estrutura pedida, não executa a partida nem avalia sua qualidade. A observação sugerida na etapa continua necessária para aprender.

## 3. Conte só durante a corrida

**Intenção e objetivo (professor):** Aplicação · Restringir a contagem à partida e apresentar o resultado no fim.

**Ferramenta:** continuar o mesmo Estúdio incorporado. Não criar outra entrega entre os passos.

**Narração revisada / instruções disponíveis em texto:**

### Fazer o número subir

Em Tempo e repetição, adicione um relógio de 1 segundo ao lado dos outros. Dentro, coloque Se a tela atual é jogando.

Só dentro desse Se encaixe Somar 1 em pontos, de Variáveis.

**Vídeo planejado:** `video-construir-3-1`

**Na tela (sequência técnica preservada):**

primeiro a pausa; depois a resolução: Jogo 2D › Tempo e repetição, um "A cada __ segundos" novo no Enquanto estiver rodando, ao lado dos outros, com 1; dentro dele, um "Se" (Programação › Lógica & Se) com a comparação de fábrica retirada e, no lugar dela, "a tela atual é __ ?" (Jogo 2D › Telas e cenas) em "jogando"; dentro do Se, "Somar 1 em variável pontos" (Programação › Variáveis).

**Produção:** aula-11-passo-03: gravar a demonstração "fazer o número subir" conforme roteiro.md; enviar o vídeo e inserir o bloco nesta seção.

**Narração revisada / instruções disponíveis em texto:**

### Contar os pontos na tela de fim

Na tela fim, substitua o subtítulo por juntar texto, em Programação, Valores. Junte Você fez, o valor de pontos e pontos.

Tente bater essa marca! Confira se aparece o número da sua partida.

**Vídeo planejado:** `video-construir-4-1`

**Na tela (sequência técnica preservada):**

no "Mostrar tela" da tela fim: arrastar o "juntar texto" (Programação › Valores) por cima do subtítulo; dar zoom no bloco vazio e clicar três vezes no "+", mostrando os espaços nascendo com o "0" de sombra; encaixar, em ordem, "texto Você fez", "valor da variável pontos" e "texto pontos. Tente bater essa marca!".

**Produção:** aula-11-passo-04: gravar a demonstração "contar os pontos na tela de fim" conforme roteiro.md; enviar o vídeo e inserir o bloco nesta seção.

**Texto para o aluno:**

**Sua vez:** Espere na tela inicial, jogue e depois perca. Observe quando o número muda.

**Atividade: Uma decisão para continuar**

Modelo: `checkpoint`. Critério desta seção.

Escolha uma resposta. Se precisar, consulte a explicação ou use uma pista e tente de novo.

**Pergunta:** Os pontos crescem enquanto você espera na tela inicial. O que falta no relógio?

- Verificar se a tela atual é jogando antes de somar.
- Uma cor mais escura para o placar.
- Um título maior na tela de início.

**Resposta esperada (professor):** Verificar se a tela atual é jogando antes de somar.

**Devolutiva:** A condição protege a soma. O placar pode mostrar um número, mas o relógio só deve aumentá-lo durante a partida.

**Pistas:**

- O relógio precisa saber em qual momento deve contar.

**Critério configurado:** `checar-construir-3`. A resposta é corrigida pelo sistema; a criança pode consultar as pistas e tentar de novo.

## 4. Tente uma nova marca

**Intenção e objetivo (professor):** Fechamento · Testar e guardar a criação, reconhecendo o próximo passo. Conferir a entrega configurada no Estúdio.

**Ferramenta:** continuar o mesmo Estúdio incorporado. Não criar outra entrega entre os passos.

**Narração revisada / instruções disponíveis em texto:**

### Testar

Compare partidas e observe o placar antes, durante e depois de jogar. Experimente intervalos 0.5 e 3 no relógio dos pontos e depois volte a 1.

A regra do placar deve ficar clara para quem joga.

**Vídeo planejado:** `video-construir-5-1`

**Na tela (sequência técnica preservada):**

jogar algumas partidas seguidas, comparando os números; depois mexer no relógio do ponto (0.5 e 3).

**Produção:** aula-11-passo-05: gravar a demonstração "testar" conforme roteiro.md; enviar o vídeo e inserir o bloco nesta seção.

**Texto para o aluno:**

O placar começa em zero, cresce só em jogando, para no fim e aparece legível. Recomece para conferir a volta a zero. Envie.

Na Aula 12, os cactos deixarão de chegar sempre do mesmo jeito.

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
- `checar-construir-1`: Confira: criar a caixinha dos pontos
- `checar-construir-2`: Confira: mostrar o placar
- `checar-construir-4`: Confira: contar os pontos na tela de fim
- `checar-construir-5`: Confira: testar

A retirada acontece no rascunho; o histórico persistido não deve ser apagado. Nenhum manifesto desta pasta foi aplicado automaticamente ao staging ou à produção por esta revisão.
