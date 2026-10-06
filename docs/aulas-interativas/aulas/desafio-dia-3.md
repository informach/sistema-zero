# A Chave do Farol · Dia 3 · A luz do farol

## Resumo

- Estado de entrada: projeto enviado no Dia 2, com movimento, borda e coleta.
- Vitória do dia: a porta confere a chave; sem ela, mostra o motivo; com ela, acende a luz e aciona a chegada do barco. A criança aprende a publicar seu jogo.
- Seções na entrada deste review: 3 · Seções finais: 5.
- Clipes na entrada deste review: 3 · Clipes finais: 5.

**Revisão de 06/10/2026:** todas as falas conversam com a criança e chamam a atenção dela para o que aparece na tela ("Olha aqui", "Olha só", "Repare", "Tá vendo?"); as pontes do Zappy começam convidando. Cada fala virou uma conversa contínua, com o porquê de cada resultado; neste dia, "então" não é usado como palavra de ligação, porque é o nome de uma parte do Se. Em vez de "a variável ganhou já veio preparada" e "o encontro com a chave já está pronto", a fala diz o que cada um faz no momento em que a criança o usa. Seções, blocos e critérios não mudaram.

## Triagem dos conceitos

| O que a aula ensina | Abstrato? | Vira concreto? | Como | Quando | Por quê |
| --- | --- | --- | --- | --- | --- |
| Condição | Sim | Na experiência da porta | Testar sem chave e com chave | Explicação e experiência juntas, antes da montagem | Comparar duas respostas para a mesma pergunta |
| Se, então e senão | Sim | Na experiência e no projeto | Mostrar a pergunta e o ramo escolhido; construir senão antes de então | Duas etapas após a experiência | Conectar a relação observada aos blocos com um teste entre as montagens |
| Persistência da coleta | Sim | No percurso até o farol | Pegar a chave, afastar-se do lugar e chegar ao farol | Teste final | A informação continua guardada depois que a chave sai do chão |
| Ativar consequência preparada | Não exige cena | No barco chegando | Alterar ganhou para verdadeiro | Dentro de então | Reconhecer o que foi preparado e o que a criança programa |
| Troca de imagem e avisos | Não | No jogo | Conferir luz, mensagem e barco nos dois caminhos | Depois da montagem | Ver se cada resposta ficou no ramo certo |
| Publicar | Interface ligada a uma entrega | No Mural | Fluxo mínimo até confirmação | Após enviar ao professor | Disponibilizar a criação sem refazer o projeto |

## Diagnóstico do desenho atual

O review reproduziu aprovação de uma decisão sem aviso em então ou sem ramo senão. Os critérios agora vinculam a condição ao encontro personagem/farol e verificam as ações no ramo correspondente. As mensagens são exigidas como texto, sem cobrar cópia literal da frase.

O encaixe do texto de vitória estava implícito na narração. Agora são nomeados ramo então, campo de aviso e substituição do número inicial. Os testes finais incluem os dois avisos e a permanência de temChave depois de se afastar da coleta.

A revisão de 04/10 torna visíveis temChave, a pergunta e as duas respostas. O destaque só aparece depois de Testar a porta; trocar a chave limpa o destaque anterior. A construção passa a duas seções no mesmo projeto. Os critérios finais conservam movimento, início falso e memória da coleta, além da decisão.

## Proposta final

### Seção 1. O que a porta precisa?

- **Intenção:** exploração (`exploration`).
- **Por que existe:** concretizar a relação da condição antes de programar.
- **Conclui quando:** vídeo e as duas tentativas reais na experiência.
- **Blocos:** `video-d3-condicao`, `ponte-d3-condicao`, `experiencia-porta`.

**Ponte do Zappy na página (não gravar):** Sua vez! Teste a mesma porta sem a chave e com a chave e repare na resposta que fica marcada.

Abrir com o estado atual: a chave já pode ser recolhida, mas a porta ainda não responde. Explicar a condição enquanto faz: o vídeo é uma demonstração, o narrador faz cada gesto na primeira pessoa e só no fim passa a vez; depois, a pessoa repete os testes na experiência, que cobra as metas.

### Seção 2. Avise quando faltar a chave

- **Intenção:** aplicação (`application`).
- **Por que existe:** montar e conferir a primeira resposta antes de ampliar a condição.
- **Conclui quando:** vídeo e dez critérios cumulativos aprovados; não pede envio.
- **Blocos:** novo `video-d3-sem-chave`, `ponte-d3-sem-chave`, Estúdio pela `workspaceKey: projeto`.

**Ponte do Zappy na página (não gravar):** Agora ensine o farol a avisar quando falta a chave! Monte o aviso, vá ao farol sem pegar a chave e clique em Verificar esta etapa antes de seguir.

Criar evento separado personagem/farol e Se consultando temChave. A pergunta `x > 0` que nasce no Se é um bloco de verdade: vai para a lixeira antes de pôr `valor da variável temChave` no lugar vazio, senão sobra um bloco solto ou nasce `temChave > 0`, que o critério `condicao` reprova. Na parte de baixo do Se, usar o **+** de **senão** (não o de senão se), encaixar aviso com texto nesse ramo; então fica vazio. Atualizar, ir ao farol sem chave e conferir luz apagada e mensagem. Verificar, corrigir, esperar Salvo e seguir em Próxima seção. A checagem aceita então vazio.

### Seção 3. Acenda o farol com a chave

- **Intenção:** construção e entrega (`delivery`).
- **Por que existe:** programar a relação observada no jogo da criança.
- **Conclui quando:** vídeo, quatorze critérios cumulativos aprovados e envio único do dia confirmado.
- **Blocos:** `video-d3-decisao`, `ponte-d3-decisao`, Estúdio `projeto`.

**Ponte do Zappy na página (não gravar):** Agora acenda o farol! Complete a parte então e teste sem a chave, com a chave e numa nova partida. Depois clique em Verificar esta etapa e envie para o professor.

Retomar o mesmo Se, preservando o aviso em senão. Completar então: ganhou verdadeiro, imagem farol-aceso e aviso de chegada. Não criar outro evento, outra condição ou cópia do projeto. A verificação não exige a frase do exemplo.

Testar o percurso contínuo: Atualizar, visitar o farol sem chave, afastar, buscar a chave e voltar na mesma partida. Esperar o barco. Atualizar depois da vitória, conferir a chave de volta e ir ao farol sem recolhê-la. Conferir as mensagens e a luz nos três momentos. Terminar em **Verificar esta etapa → Objetivo da etapa cumprido! → Salvo → Enviar para o professor → Enviar → Próxima seção**.

### Seção 4. Deixe o jogo com a sua cara

- **Intenção:** encerramento (`closing`), a seção de mexa e veja do curso.
- **Por que existe:** deixar o jogo publicado com a cara da criança, com mudanças que ficam: o personagem e os avisos.
- **Conclui quando:** vídeo. As escolhas não viram critério.
- **Blocos:** `video-d3-personalizar`, `ponte-d3-personalizar` e o mesmo `projeto` pela workspaceKey.

**Ponte do Zappy na página (não gravar):** Hora de deixar o jogo com a sua cara! Escolha outro personagem no bloco Criar sprite e escreva os avisos do seu jeito. Depois teste a aventura e clique em Próxima seção.

Vem depois do envio e antes de publicar. Começar pelo destino: a área **Ao iniciar** e o bloco **Criar sprite personagem**; no fim dele, clicar no nome da imagem e escolher outro personagem. Todos os personagens têm a caixa 64 × 64 e a mesma área de contato, então andar, pegar a chave e chegar ao farol continuam iguais. Depois, em **Quando acontecer**, escrever os avisos com as próprias palavras. Correção do erro provável: imagem de outro tamanho (barco, farol) muda a caixa; voltar a um personagem. Testar e seguir em **Próxima seção**.

### Seção 5. Publique seu jogo

- **Intenção:** encerramento com publicação (`closing`).
- **Por que existe:** mostrar o jogo a outras pessoas.
- **Conclui quando:** vídeo; a publicação é a tarefa ensinada, sem requisito técnico novo de publicação.
- **Blocos:** `video-d3-fecho`, `ponte-d3-publicar`, `ajuda-publicar` e o mesmo `projeto` pela workspaceKey.

**Ponte do Zappy na página (não gravar):** Hora de mostrar o seu jogo! Publique no Mural, copie o link de jogar e mande para a sua família e seus amigos. Depois clique em Fechar e em Concluir aula.

**Compartilhar → manter o resumo → Gerar capa → conferir → Publicar → comemorar: Seu jogo está no Mural! → Copiar link de jogar e mandar para a família e os amigos → Fechar → Concluir aula**. O envio anterior libera Compartilhar. Trocar a capa e resolver problemas ficam no tutorial direto `plataforma-publicar-no-mural`, com retorno à aula.

## Experiências e demonstrações desta aula

- **Cena:** `lighthouse-key`, O que a porta precisa?
- **Situação:** cena existente, ampliada com informação, pergunta e respostas visíveis.
- **Elenco/cenário:** farol, personagem e chave, com `cenario: farol`.
- **Metas:** `locked-without-key` e `opened-with-key`.
- **Instrução:** Testar a porta sem chave; Levar a chave; Testar a porta outra vez.
- **Observação:** trocar o estado da chave sozinho não conclui. Sem palpite obrigatório ou pergunta final redundante; semPerguntaFinal fica no bloco interativo.

## Vídeos

| Chave | O que mostra | Origem | Duração alvo | Reaproveita gravação? |
| --- | --- | --- | --- | --- |
| `video-d3-condicao` | Demonstração explicada: testar a porta sem e com a chave | Cena ampliada | 60 a 75 s | Regravar |
| `video-d3-sem-chave` | Evento, condição, senão, teste e verificação intermediária | Vídeo novo | 3 a 4 min | Gravar |
| `video-d3-decisao` | Completar então, testar a aventura e enviar | Roteiro revisado | 4 a 5 min, sem acelerar os percursos | Regravar |
| `video-d3-personalizar` | Mexa e veja: trocar o personagem e escrever os avisos | Mesmo projeto enviado | 100 a 130 s | Gravar |
| `video-d3-fecho` | Publicar, comemorar e copiar o link de jogar para a família | Mesmo projeto enviado | 60 a 80 s, incluindo espera | Regravar |

## Continuidade

Preservar `condicao`, `decisao`, `fecho`, chave `projeto` e cadeia. Inserir `sem-chave` entre condicao e decisao e `personalizar` entre decisao e fecho. O envio permanece somente em decisao; a publicação continua no mesmo Estúdio. Só o Estúdio do Dia 3 tem showcase habilitado, com título e resumo do Farol. Não criar uma cópia para publicar.

Valores: temChave é consultado, ganhou vira verdadeiro apenas na resposta com chave, farol recebe farol-aceso e aviso muda conforme o ramo. O barco preparado não é atribuído à autoria da criança.

A oferta vigente já inclui Mural completo durante os 30 dias e modo visitante depois; o review não altera direitos ou prazos. A publicação não bloqueia o certificado por expiração do Mural. Conferir conta elegível na gravação e reconciliar mídia/progresso antes de aplicar no admin.
