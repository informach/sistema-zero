# O som escuta o pulo

Uma aula, organizada em 4 seções. Público: 9 a 16 anos.

Fonte: `roteiro-aula-04-corre-dino.md`. SHA-256: `7b0c677793fae8c30bcef617c4ecc50ed6173beba622d672907eab8b72b6ab4f`.
O original foi preservado. Este roteiro substitui a sequência didática da aula, sem abrir um curso ou uma área de revisão paralela.

## Estado de entrada e resultado

O dino pula com teclado e clique, mas o salto ainda está silencioso.

**Resultado:** Distinguir o comando de entrada do acontecimento que ele pode causar.

**Ambiente:** o mesmo Estúdio incorporado acompanha as seções. Preservar o projeto inicial, a continuidade e a entrega já configurados na aula.

## Percurso e ritmo

Cada seção reúne ações que chegam a uma pequena conquista. Não fazer uma prova depois de cada clique. A criança pode consultar o texto, pausar o vídeo, pedir uma pista e tentar novamente. Cores, formas e outros detalhes livres não são critérios de aprovação.

| Etapa | O que libera o avanço |
| --- | --- |
| Som sem pulo? | Resolver a descoberta. |
| Investigue o som fora de hora | Responder uma pergunta de decisão. |
| Faça o som seguir o salto | Verificar os objetivos do projeto. |
| O salto com a sua assinatura | Enviar o projeto; atingir a nota automática se o Estúdio exigir. |

## Orientações de produção e acessibilidade

Helena narra; nas aulas de arte, Júlio demonstra as escolhas dele. Mostrar uma ação por vez e devolver o controle à criança. Nomear ferramenta, categoria e encaixe. Manter texto e legendas legíveis, sem exigir rapidez, precisão de arraste ou áudio para compreender a orientação. Nas ordenações, demonstrar também os botões de mover as peças. Não usar somente cor para indicar o que mudou.

Convidar a prever, testar e ajustar. Mostrar o erro e sua recuperação com calma. Se um trecho ficar longo, a criança pode pausar entre os passos da mesma seção; não precisa passar por outra pergunta para cada pausa. As alternativas e gabaritos abaixo orientam a produção, não são texto para revelar antes da resposta.

## 1. Som sem pulo?

**Intenção e objetivo (professor):** Exploração · Distinguir o comando de entrada do acontecimento que ele pode causar.

**Texto para o aluno:**

Oi! Hoje o salto vai ganhar um som. Vamos descobrir por que apertar uma tecla e pular nem sempre são a mesma coisa.

Você pode fazer uma pausa, voltar às etapas concluídas e usar Preciso de ajuda. Não precisa acertar de primeira.

**Atividade: Som sem pulo?**

Modelo: `prediction`. Critério desta seção.

O som está ligado à barra de espaço. Você aperta espaço quando o dino já está no ar. Faça sua previsão. Sua primeira ideia pode mudar depois da observação.

**Previsões (sem nota):** O som toca, mesmo sem novo pulo · O som só toca se houver novo pulo · A gravidade para

**Depois de observar:** O evento da tecla pode tocar o som mesmo sem outro salto. Ao ligar o som a Quando o sprite pular, ele acompanha o salto real, incluindo seta e toque.

**Pergunta:** Você quer que o som acompanhe um salto feito por qualquer controle. O que precisa escutar?

- Somente a barra de espaço.
- Cada quadro do cenário.
- O pulo do personagem.

**Resposta esperada (professor):** O pulo do personagem.

**Devolutiva:** Escutar o pulo acompanha o acontecimento real. Uma tecla pode ser apertada sem causar outro salto.

**Pistas:**

- Qual acontecimento é comum ao salto por tecla e ao salto por toque?

**Texto para o aluno:**

Apertar espaço é um comando. Pular é algo que o personagem consegue fazer em determinadas condições.

No ar, ele pode receber espaço sem realizar outro pulo. E pode pular usando seta ou toque, sem receber espaço.

Um som ligado à tecla descreve o comando; um som ligado ao evento de pulo acompanha o acontecimento real. Essa diferença ajuda a criar controles que funcionam com vários dispositivos.

**Critério configurado:** `descoberta`. A resposta é corrigida pelo sistema; a criança pode consultar as pistas e tentar de novo.

## 2. Investigue o som fora de hora

**Intenção e objetivo (professor):** Aplicação · Comparar comando de teclado e acontecimento do salto.

**Ferramenta:** continuar o mesmo Estúdio incorporado. Não criar outra entrega entre os passos.

**Narração revisada / instruções disponíveis em texto:**

### A área que escuta o teclado

Em Áreas do projeto, adicione Quando acontecer. Em Jogo 2D, Controles, coloque Quando apertar a tecla dentro dele e escolha barra de espaço.

**Vídeo planejado:** `video-construir-1-1`

**Na tela (sequência técnica preservada):**

categoria "Áreas do projeto", arrastar "Quando acontecer" e soltar ao lado das outras duas; depois Jogo 2D › Controles, arrastar "Quando apertar a tecla" para dentro dela e escolher "barra de espaço" no menu.

**Produção:** aula-04-passo-01: gravar a demonstração "a área que escuta o teclado" conforme roteiro.md; enviar o vídeo e inserir o bloco nesta seção.

**Narração revisada / instruções disponíveis em texto:**

### O som do pulo

Em Kit dino, coloque Tocar som de pulo dentro do evento da tecla. Clique no jogo e pule com espaço.

Agora escute o que acontece nos outros controles.

**Vídeo planejado:** `video-construir-2-1`

**Na tela (sequência técnica preservada):**

Jogo 2D › Kit dino, arrastar "Tocar som de pulo" para dentro do "Quando apertar a tecla". Rodar e pular com o espaço.

**Produção:** aula-04-passo-02: gravar a demonstração "o som do pulo" conforme roteiro.md; enviar o vídeo e inserir o bloco nesta seção.

**Texto para o aluno:**

**Sua vez:** Teste espaço e outro controle. Se não usar áudio, acompanhe na demonstração quando o bloco de som é acionado.

**Atividade: Uma decisão para continuar**

Modelo: `checkpoint`. Critério desta seção.

Escolha uma resposta. Se precisar, consulte a explicação ou use uma pista e tente de novo.

**Pergunta:** O som toca com espaço, mas não com clique. O que isso revela?

- O Dino deixou de receber gravidade.
- O fundo está passando depressa demais.
- O som está ligado ao comando de espaço.

**Resposta esperada (professor):** O som está ligado ao comando de espaço.

**Devolutiva:** O evento de espaço conhece essa tecla. Para acompanhar saltos feitos com outros controles, precisamos escutar o pulo do personagem.

**Pistas:**

- Procure o bloco que está envolvendo o som.

**Critério configurado:** `checar-construir-2`. A resposta é corrigida pelo sistema; a criança pode consultar as pistas e tentar de novo.

## 3. Faça o som seguir o salto

**Intenção e objetivo (professor):** Aplicação · Ligar o som ao evento de pulo do personagem.

**Ferramenta:** continuar o mesmo Estúdio incorporado. Não criar outra entrega entre os passos.

**Narração revisada / instruções disponíveis em texto:**

### O som está escutando a coisa errada

Teste espaço, seta para cima, clique e espaço no ar. Em Controles, adicione Quando o sprite pular e escolha dino.

Mova o som para esse evento e apague o evento de tecla vazio. Repita os quatro testes.

**Vídeo planejado:** `video-construir-3-1`

**Na tela (sequência técnica preservada):**

os quatro testes, um a um e sem pressa, com o áudio bem audível: espaço (tem som), seta pra cima (mudo), clique na parte de cima da área do jogo (mudo), e espaço com o dino no ar (som sem pulo). Depois: Jogo 2D › Controles, arrastar "Quando o sprite pular" para dentro do Quando acontecer, trocar "jogador" por "dino", arrastar o "Tocar som de pulo" de dentro do evento de tecla pra dentro do evento novo, e apagar o "Quando apertar a tecla" vazio com o botão direito. Refazer os quatro testes.

**Produção:** aula-04-passo-03: gravar a demonstração "o som está escutando a coisa errada" conforme roteiro.md; enviar o vídeo e inserir o bloco nesta seção.

**Texto para o aluno:**

**Sua vez:** Pule com dois controles. Depois aperte espaço no ar. Observe quais comandos realmente causam outro salto.

Depois, use **Verificar esta etapa**. A conferência olha os blocos pedidos. Rode o jogo também para observar o resultado.

**Critérios configurados em Para liberar a próxima seção:** todos os objetivos abaixo precisam passar no mesmo projeto.

- Use Quando o sprite dino pular em Quando acontecer. Regra de cadastro: `{"type":"usesBlock","blockType":"sz_g2d_on_jump","area":"events","fields":{"SPRITE":"dino"}}`.

**Limite da conferência:** comprova a estrutura pedida, não executa a partida nem avalia sua qualidade. A observação sugerida na etapa continua necessária para aprender.

## 4. O salto com a sua assinatura

**Intenção e objetivo (professor):** Fechamento · Testar e guardar a criação, reconhecendo o próximo passo. Conferir a entrega configurada no Estúdio.

**Ferramenta:** continuar o mesmo Estúdio incorporado. Não criar outra entrega entre os passos.

**Narração revisada / instruções disponíveis em texto:**

### Escolhe o seu som

Em Jogo 2D, Som, experimente Tocar efeito dentro do evento de pulo. Tire o som anterior para não tocar dois.

Escolha um efeito e pule de novo; o estilo do som é uma decisão sua.

**Vídeo planejado:** `video-construir-4-1`

**Na tela (sequência técnica preservada):**

Jogo 2D › Som, arrastar o "Tocar efeito" pra dentro do evento de pulo, tirar o "Tocar som de pulo" pra fora, abrir a listinha dos 27 efeitos e testar alguns (quicar, zunido, moeda), pulando depois de cada troca.

**Produção:** aula-04-passo-04: gravar a demonstração "escolhe o seu som" conforme roteiro.md; enviar o vídeo e inserir o bloco nesta seção.

**Texto para o aluno:**

O som deve tocar em todo pulo real e não tocar só porque você apertou espaço no ar. Confira teclado e clique e envie.

Na Aula 5, você vai criar os cactos para desviar.

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
- `checar-construir-1`: Confira: a área que escuta o teclado
- `checar-construir-3`: Confira: o som está escutando a coisa errada
- `checar-construir-4`: Confira: escolhe o seu som

A retirada acontece no rascunho; o histórico persistido não deve ser apagado. Nenhum manifesto desta pasta foi aplicado automaticamente ao staging ou à produção por esta revisão.
