# Pontos, vidas e consequências

Uma aula, organizada em 4 seções. Público: 9 a 16 anos.

Fonte: `roteiro-aula-dia4-desafio-primeiro-jogo.md`. SHA-256: `5920b27b0007ee632bd60f587f59ed06e48fa2167acd5115f5c385d30fc0db1a`.
O original foi preservado. Este roteiro substitui a sequência didática da aula, sem abrir um curso ou uma área de revisão paralela.

## Estado de entrada e resultado

Você já consegue destruir asteroides. Seu jogo ainda não mostra quantos acertou nem o efeito de uma batida na nave.

**Resultado:** Separar o valor guardado, o evento que o altera e o desenho que o mostra.

**Ambiente:** o mesmo Estúdio incorporado acompanha as seções. Preservar o projeto inicial, a continuidade e a entrega já configurados na aula.

## Percurso e ritmo

Cada seção reúne ações que chegam a uma pequena conquista. Não fazer uma prova depois de cada clique. A criança pode consultar o texto, pausar o vídeo, pedir uma pista e tentar novamente. Cores, formas e outros detalhes livres não são critérios de aprovação.

| Etapa | O que libera o avanço |
| --- | --- |
| Quem faz o quê no placar? | Resolver a descoberta. |
| Faça o acerto valer um ponto | Responder uma pergunta de decisão. |
| Cuide das vidas da nave | Responder uma pergunta de decisão. |
| Teste três acontecimentos | Enviar o projeto; atingir a nota automática se o Estúdio exigir. |

## Orientações de produção e acessibilidade

Helena narra; nas aulas de arte, Júlio demonstra as escolhas dele. Mostrar uma ação por vez e devolver o controle à criança. Nomear ferramenta, categoria e encaixe. Manter texto e legendas legíveis, sem exigir rapidez, precisão de arraste ou áudio para compreender a orientação. Nas ordenações, demonstrar também os botões de mover as peças. Não usar somente cor para indicar o que mudou.

Convidar a prever, testar e ajustar. Mostrar o erro e sua recuperação com calma. Se um trecho ficar longo, a criança pode pausar entre os passos da mesma seção; não precisa passar por outra pergunta para cada pausa. As alternativas e gabaritos abaixo orientam a produção, não são texto para revelar antes da resposta.

## 1. Quem faz o quê no placar?

**Intenção e objetivo (professor):** Exploração · Separar o valor guardado, o evento que o altera e o desenho que o mostra.

**Texto para o aluno:**

Oi! Hoje acertar um asteroide vai valer um ponto. A nave também terá vidas. Vamos fazer cada acontecimento mudar a coisa certa.

Você pode fazer uma pausa, voltar às etapas concluídas e usar Preciso de ajuda. Não precisa acertar de primeira.

**Atividade: Quem faz o quê no placar?**

Modelo: `sequence`. Critério desta seção.

Associe cada tarefa ao momento correto. Pense no que muda o número e no que apenas o mostra.

**Peças:** Desenhar o placar · Começar pontos em zero · Somar um ponto

**Gabarito para o professor:**

- Ao preparar uma partida: Começar pontos em zero
- Quando o tiro acerta: Somar um ponto
- Em cada quadro para mostrar o valor: Desenhar o placar

**Pistas:**

- Se desenhar somasse pontos, eles aumentariam mesmo sem acertar nada.

**Texto para o aluno:**

Um placar é como uma janela para um valor guardado. Desenhar a janela não deveria somar pontos.

O ponto muda quando um tiro acerta um asteroide; a imagem do placar só mostra o valor atual. As vidas seguem outra regra: uma batida tira uma vida e dá um pequeno tempo de proteção.

Isso evita que vários quadros do mesmo contato acabem com todas as vidas de uma vez.

**Critério configurado:** `descoberta`. A resposta é corrigida pelo sistema; a criança pode consultar as pistas e tentar de novo.

## 2. Faça o acerto valer um ponto

**Intenção e objetivo (professor):** Aplicação · Separar a alteração dos pontos de sua exibição.

**Ferramenta:** continuar o mesmo Estúdio incorporado. Não criar outra entrega entre os passos.

**Narração revisada / instruções disponíveis em texto:**

### Criar e somar os pontos

Em Programação, Variáveis, crie pontos com valor 0 em Ao iniciar. No final da colisão entre tiro e asteroide, coloque Somar 1 em pontos.

Assim o acerto é o acontecimento que muda o valor.

**Vídeo planejado:** `video-construir-1-1`

**Na tela (sequência técnica preservada):**

categoria "Programação", subcategoria "Variáveis", arrastar "Criar variável" para dentro do Ao iniciar, abaixo do grupo asteroides; nome "pontos", valor 0. Depois, abrir o bloco de colisão do Dia 3 e encaixar "Somar em variável" (Somar 1 em pontos) no final dele, logo depois do Tocar som de explosão.

**Produção:** dia-4-passo-01: gravar a demonstração "criar e somar os pontos" conforme roteiro.md; enviar o vídeo e inserir o bloco nesta seção.

**Narração revisada / instruções disponíveis em texto:**

### Mostrar o placar

Em Jogo 2D, Placar e HUD, coloque Mostrar placar abaixo da colisão. No valor, encaixe valor da variável pontos, de Programação, Valores.

Use x 12, y 30, branco e tamanho 24. Acerte um asteroide para conferir.

**Vídeo planejado:** `video-construir-2-1`

**Na tela (sequência técnica preservada):**

categoria "Jogo 2D", subcategoria "Placar e HUD", arrastar "Mostrar placar" para dentro do A cada quadro do jogo, abaixo do bloco da colisão. Texto "Pontos:"; no valor, encaixar "valor da variável" (Programação, Valores) com pontos; x 12, y 30, cor branca, tamanho 24. Testar rapidinho: explodir um asteroide e ver o placar subir.

**Produção:** dia-4-passo-02: gravar a demonstração "mostrar o placar" conforme roteiro.md; enviar o vídeo e inserir o bloco nesta seção.

**Texto para o aluno:**

**Sua vez:** Fique um instante sem atirar. Depois acerte uma pedra e compare o placar.

**Atividade: Uma decisão para continuar**

Modelo: `checkpoint`. Critério desta seção.

Escolha uma resposta. Se precisar, consulte a explicação ou use uma pista e tente de novo.

**Pergunta:** Os pontos aumentam mesmo sem acertar nada. Onde procurar Somar 1 em pontos?

- Ele deve estar junto do desenho do placar, fora da colisão.
- Ele deve estar na criação da nave.
- Ele deve estar na colisão do tiro com o asteroide.

**Resposta esperada (professor):** Ele deve estar na colisão do tiro com o asteroide.

**Devolutiva:** O ponto nasce do acerto. Desenhar o placar só mostra o valor que já está guardado.

**Pistas:**

- Qual acontecimento você decidiu premiar?

**Critério configurado:** `checar-construir-1`. A resposta é corrigida pelo sistema; a criança pode consultar as pistas e tentar de novo.

## 3. Cuide das vidas da nave

**Intenção e objetivo (professor):** Aplicação · Relacionar uma batida à perda de uma vida e à proteção temporária.

**Ferramenta:** continuar o mesmo Estúdio incorporado. Não criar outra entrega entre os passos.

**Narração revisada / instruções disponíveis em texto:**

### Dar vidas à nave

Em Jogo 2D, Vida, encaixe Dar ao sprite de vida em Ao iniciar. Escolha nave e 3.

Cada nova partida começa com essas três vidas.

**Vídeo planejado:** `video-construir-3-1`

**Na tela (sequência técnica preservada):**

categoria "Jogo 2D", subcategoria "Vida", arrastar "Dar ao sprite de vida" para o Ao iniciar, abaixo do Criar variável pontos (sprite nave, 3).

**Produção:** dia-4-passo-03: gravar a demonstração "dar vidas à nave" conforme roteiro.md; enviar o vídeo e inserir o bloco nesta seção.

**Narração revisada / instruções disponíveis em texto:**

### Fazer a batida machucar

Em Colisões, procure o encontro de cada sprite do grupo com a nave. Use asteroides e o apelido inimigo.

Dentro, remova inimigo, solte a explosão, machuque nave em 1 com 45 quadros de proteção e trema a tela com intensidade 8.

**Vídeo planejado:** `video-construir-4-1`

**Na tela (sequência técnica preservada):**

categoria "Jogo 2D", subcategoria "Colisões", arrastar "Para cada sprite do grupo que colidir com o sprite" para o A cada quadro do jogo, abaixo do Mostrar placar (grupo asteroides, sprite nave, apelido inimigo). Dentro, na ordem: "Tirar o sprite inimigo do grupo asteroides" (Muitos), "Soltar explosão no sprite inimigo" (Kit espaço), "Machucar o sprite nave em 1 e deixá-lo invencível por 45 quadros" (Vida), "Tremer a tela com intensidade 8" (Aparência).

**Produção:** dia-4-passo-04: gravar a demonstração "fazer a batida machucar" conforme roteiro.md; enviar o vídeo e inserir o bloco nesta seção.

**Narração revisada / instruções disponíveis em texto:**

### Mostrar os corações

Em Vida, coloque Desenhar as vidas do sprite depois da batida. Escolha nave, corações, x 12, y 48, tamanho 22 e vermelho.

Esse desenho mostra as vidas que ainda restam.

**Vídeo planejado:** `video-construir-5-1`

**Na tela (sequência técnica preservada):**

categoria "Jogo 2D", subcategoria "Vida", arrastar "Desenhar as vidas do sprite" para o A cada quadro do jogo, abaixo do bloco da batida; sprite nave, jeito "corações", x 12, y 48, tamanho 22, cor vermelha.

**Produção:** dia-4-passo-05: gravar a demonstração "mostrar os corações" conforme roteiro.md; enviar o vídeo e inserir o bloco nesta seção.

**Texto para o aluno:**

**Sua vez:** Deixe um asteroide encostar na nave. Observe os corações e o piscar, além do som.

**Atividade: Uma decisão para continuar**

Modelo: `checkpoint`. Critério desta seção.

Escolha uma resposta. Se precisar, consulte a explicação ou use uma pista e tente de novo.

**Pergunta:** A nave perdeu todas as vidas em um único contato. Que proteção você investigaria?

- A posição do texto do placar.
- Os quadros de proteção depois de receber dano.
- A quantidade de estrelas no fundo.

**Resposta esperada (professor):** Os quadros de proteção depois de receber dano.

**Devolutiva:** A proteção evita descontar várias vidas pelo mesmo contato. Depois de um tempo, a nave pode receber outro dano.

**Pistas:**

- Um contato pode durar mais de um quadro do jogo.

**Critério configurado:** `checar-construir-4`. A resposta é corrigida pelo sistema; a criança pode consultar as pistas e tentar de novo.

## 4. Teste três acontecimentos

**Intenção e objetivo (professor):** Fechamento · Testar e guardar a criação, reconhecendo o próximo passo. Conferir a entrega configurada no Estúdio.

**Ferramenta:** continuar o mesmo Estúdio incorporado. Não criar outra entrega entre os passos.

**Narração revisada / instruções disponíveis em texto:**

### Hora de testar

Acerte um asteroide e observe o ponto. Depois deixe outro bater na nave: uma vida sai, a nave pisca e a tela treme.

Fique alguns instantes sem acertar nada: os pontos devem ficar parados.

**Vídeo planejado:** `video-construir-6-1`

**Na tela (sequência técnica preservada):**

clicar na área do jogo; explodir asteroides vendo o placar subir; deixar um asteroide bater na nave: explosão, tela tremendo, nave piscando, um coração a menos.

**Produção:** dia-4-passo-06: gravar a demonstração "hora de testar" conforme roteiro.md; enviar o vídeo e inserir o bloco nesta seção.

**Texto para o aluno:**

Compare três situações: sem acerto, acerto de tiro e batida na nave. Cada uma deve produzir a consequência certa. Envie seu projeto.

No Dia 5, você vai decidir quando a partida começa, termina e recomeça.

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
- `checar-construir-2`: Confira: mostrar o placar
- `checar-construir-3`: Confira: dar vidas à nave
- `checar-construir-5`: Confira: mostrar os corações
- `checar-construir-6`: Confira: hora de testar

A retirada acontece no rascunho; o histórico persistido não deve ser apagado. Nenhum manifesto desta pasta foi aplicado automaticamente ao staging ou à produção por esta revisão.
