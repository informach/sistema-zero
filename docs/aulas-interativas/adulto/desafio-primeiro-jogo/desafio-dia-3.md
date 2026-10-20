<!-- Versão adulta gerada por docs/aulas-interativas-tecnico/qa/adulto/gerar-adulto.ts a partir de kids/desafio-primeiro-jogo/desafio-dia-3.md e de qa/adulto/traducoes/desafio-primeiro-jogo/desafio-dia-3.json. Não edite este arquivo: edite a tradução e gere de novo. -->

# A Chave do Farol · Dia 3 · A luz do farol

**Conferência da equipe, 19/10/2026 (não gravar):** exemplos privados por seção, conforme o manifesto e sua fonte geradora. sem-chave tem solução transitória com então vazio; decisao completa o caminho com chave. personalizar reutiliza o jogo funcional: o aviso de objetivos já atendidos não exige trocar uma imagem só para criar uma diferença. O projeto inicial e a continuidade permanecem; a entrada para ensaio não substitui o baseline da verificação. Cores, imagens, textos e magnitude de velocidade do exemplo não são respostas únicas. A direção precisa continuar coerente e zero não demonstra movimento. Os objetivos atuais deste piloto conferem estrutura; os testes jogados do roteiro continuam necessários e não foram certificados automaticamente como comportamento. Não informa gravação, publicação nem ensaio com adultos.

## Resumo

- Estado de entrada: projeto enviado no Dia 2, com movimento, borda e coleta.
- Vitória do dia: a porta confere a chave; sem ela, mostra o motivo; com ela, acende a luz e aciona a chegada do barco. Quem faz a aula troca as imagens (com o par do farol), escreve os avisos, decide onde fica a chave e aprende a publicar seu jogo.
- Seções: 8.
- Clipes: 8.

**Revisão de 06/10/2026:** todas as falas conversam com quem faz a aula e chamam a atenção para o que aparece na tela ("Olha aqui", "Olha só", "Repare", "Percebe?"); os recados da página começam convidando. Cada fala virou uma conversa contínua, com o porquê de cada resultado; neste dia, "então" não é usado como palavra de ligação, porque é o nome de um espaço do Se. Em vez de "a variável ganhou já veio preparada" e "o encontro com a chave já está pronto", a fala diz o que cada um faz no momento em que a pessoa o usa. Seções, blocos e critérios não mudaram.

**Vocabulário do curso:** as retomadas dizem "Lembra da experiência da seção anterior?" e "Lembra da experiência da primeira seção desta aula?"; na publicação, "Na aula, ele pode aparecer só como um ícone" virou "Aqui, ele pode aparecer…"; as falas citam **Próxima seção**, **Verificar esta etapa**, **Objetivo da etapa cumprido!**, **Enviar para o professor** e **Concluir aula**. Os ramos do bloco Se são "o espaço do então" e "o espaço do senão" ("O espaço do então fica vazio por enquanto", "Deixe à vista o espaço do então", "Complete o espaço do então"), do mesmo jeito que o Cadê fala do espaço vazio ao lado de fazer, e "na parte de baixo do bloco Se" virou "na linha de baixo do bloco Se".

**Full review de 06/10/2026:** a regra do "então" passou a valer para o curso inteiro, não só para este dia. A experiência da porta define a condição uma vez só ("Antes de abrir, a porta confere se temChave é verdadeiro. Uma pergunta assim se chama condição."). Quando a fala se refere ao jogo, diz "jogo" ("testar o jogo inteiro", "teste o jogo"). Na troca de personagem, o porquê diz que todos os personagens deste jogo foram desenhados do mesmo tamanho. Na publicação, o **Compartilhar** que aparece só como ícone é descrito como "uma seta para cima", e o link de ajuda usa o título real do tutorial, **Como publicar o seu jogo no Mural**. O recado da experiência termina em "Quando terminar, clique em Próxima seção.". Seções, blocos e critérios não mudaram.

**Personalização ampliada, 06/10/2026:** a seção `personalizar` passa a escolher personagem, cenário, barco e chave. Foram acrescentadas `farol-mensagens`, `posicao` e `posicionar-chave` antes de `fecho`. Os identificadores antigos e o projeto da pessoa são mantidos. Desde 11/10/2026, a entrega passa de `decisao` para `posicionar-chave`. As escolhas de aparência e texto são livres; a experiência de posição exige testar os dois eixos antes de aplicá-los.

**Uma ideia por seção na personalização, 06/10/2026 (decisão da dona):** o par do farol saiu de `farol-mensagens` e foi para `personalizar`, que passou a ser a única seção de troca de imagens (personagem, barco, chave, farol e cenário). `farol-mensagens` ficou só com os quatro avisos, numa seção curta (90 a 120 s), e mudou de título para **Escreva seus avisos**; a chave da seção e as dos blocos continuam as mesmas, para preservar os identificadores no Admin. Em `personalizar`, a verificação confere só que a imagem dentro de então é um farol aceso (qualquer um dos quatro modelos, ou o antigo `farol-aceso`), para o jogo publicado continuar acendendo; nenhuma escolha de modelo vira critério. Os vídeos ficaram enxutos, com a conferência uma vez só, depois do teste. Na revisão de 06/10, o tempo dos vídeos de personalização caiu de cerca de 9 a 12,5 minutos para cerca de 7,5 a 10,5 minutos, e o do dia inteiro, de 18 a 24 minutos para 16,5 a 22,5 minutos.

**Envio único, 11/10/2026:** a seção 3 (**Acenda o farol com a chave**) verifica os quatorze critérios sem enviar. As imagens, os avisos e a posição continuam no mesmo projeto, salvo automaticamente. A seção 7 (**Escolha onde fica a chave**) reúne vídeo, envio do projeto e envio em dia (`submissionUpToDate`), antes de publicar. Mesmo quem mantém as escolhas envia o jogo. Se editar depois de enviar, atualiza a mesma entrega; se já enviou pela versão anterior e o jogo continua igual, o envio existente atende ao critério. O botão de envio fica disponível quando a seção 7 é liberada. IDs, projeto, cadeia e mídia vinculada devem ser preservados.

**Revisão antes da gravação, 13/10/2026 (seções 1 a 4):** a experiência da porta mostra antes de definir: o primeiro teste vem antes da palavra condição, e a fala diz o que são o então e o senão ("a resposta é não, e por isso a porta escolhe o senão"). Os testes levam o personagem até a porta do farol, na base da torre, onde fica o contato do farol (`farol-assets.ts`); encostar só na torre não faz nada acontecer. O senão é aberto pelo segundo sinal de mais, antes da palavra senão, no fim da linha (o rodapé do Se é "+ senão se + senão", conferido em `ifElseMutator.ts`). As falas apresentam o bloco Se, nomeiam o que chega no bloco e precisa ser trocado (o x do valor da variável, o heroi nos dois nomes do Trocar imagem, jogador e inimigo no encontro), dizem onde fica a lixeira (no canto de baixo, à direita, do espaço dos blocos) e falam "o então" e "o senão", com artigo. Na seção 4, a fala deixa claro que o pirata é um exemplo e que a pessoa troca o que quiser; depois da primeira troca vem o "Olha só" com o porquê do mesmo tamanho; barco, chave, farol e cenário usam "clique no nome da imagem, como …"; o farol vira condição ("se você trocar o farol, troque o par"); a lista de imagens do Estúdio mostra a miniatura de cada uma (conferido no seletor de imagem); e a conferência usa a fórmula completa. As duas versões da revelação são gravadas em dois perfis de teste, porque o Estúdio da aula guarda um projeto por perfil. Os recados das seções 2 e 4 terminam na saída. Durações: 80 a 95 s, 5,5 a 6,5 min, 4,5 a 5,5 min e 4,5 a 5,5 min; as seções 5 a 8 ficam em 120 a 150 s, 85 a 105 s, 2 a 3 min e 75 a 95 s. Na versão adulta, sem participações de avatar, medir o dia inteiro no ensaio, sem acelerar nada. Seções, blocos, critérios e identificadores não mudaram.

## Vozes e gravação

Só a professora fala nos vídeos; não há avatar nem mascote. O recado da página é texto, sem personagem e sem voz no vídeo. A versão adulta ainda não foi gravada.

A montagem da resposta com chave segue numa fala contínua da professora, com o resultado à vista antes de cada explicação. As escolhas de imagens, frases e posição continuam livres.

As durações da tabela cobrem a fala estimada a 137 palavras por minuto e, nas montagens, os gestos sem fala. Medir a montagem final sem acelerar. Manter o passo a passo completo, sem cortes durante um arraste.

## Triagem dos conceitos

| O que a aula ensina | Abstrato? | Vira concreto? | Como | Quando | Por quê |
| --- | --- | --- | --- | --- | --- |
| Condição | Sim | Na experiência da porta | Testar sem chave e com chave | Explicação e experiência juntas, antes da montagem | Comparar duas respostas para a mesma pergunta |
| Se, então e senão | Sim | Na experiência e no projeto | Mostrar a pergunta e o ramo escolhido; construir senão antes de então | Duas etapas após a experiência | Conectar a relação observada aos blocos com um teste entre as montagens |
| Persistência da coleta | Sim | No percurso até o farol | Pegar a chave, afastar-se do lugar e chegar ao farol | Teste final | A informação continua guardada depois que a chave sai do chão |
| Ativar consequência preparada | Não exige cena | No barco chegando | Alterar ganhou para verdadeiro | Dentro de então | Reconhecer o que foi preparado e o que a pessoa programa |
| Troca de imagem e avisos | Não | No jogo | Conferir luz, mensagem e barco nos dois caminhos | Depois da montagem | Ver se cada resposta ficou no ramo certo |
| Posição x/y | Sim | Na experiência `lighthouse-position` | Mudar um eixo por vez e observar a chave | Antes de escolher o lugar no próprio jogo | Separar posição de imagem e tamanho |
| Personalização | Não | No mesmo projeto | Catálogos ilustrados com o farol em dois estados; depois os avisos e o novo caminho da chave, cada um na sua seção | Antes do envio e da publicação | Fazer escolhas que permanecem no jogo |
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

**Recado na página (não gravar):** Sua vez: teste a mesma porta sem a chave e com a chave e repare em qual resposta a porta escolhe. Quando terminar, clique em Próxima seção.

Abrir com o estado atual: a chave já pode ser recolhida, mas a porta ainda não responde. Explicar a condição enquanto faz, mostrando antes de definir: o primeiro teste, sem a chave, vem antes da palavra condição, e a fala diz que a resposta é não e a porta escolhe o senão; com a chave, a resposta é sim e ela escolhe o então. O vídeo é uma demonstração, o narrador faz cada gesto na primeira pessoa e só no fim passa a vez; depois, a pessoa repete os testes na experiência, que cobra as metas.

### Seção 2. Avise quando faltar a chave

- **Intenção:** aplicação (`application`).
- **Por que existe:** montar e conferir a primeira resposta antes de ampliar a condição.
- **Conclui quando:** vídeo e dez critérios cumulativos aprovados; não pede envio.
- **Blocos:** novo `video-d3-sem-chave`, `ponte-d3-sem-chave`, Estúdio pela `workspaceKey: projeto`.

**Recado na página (não gravar):** Agora ensine o farol a avisar quando falta a chave. Monte o encontro com o farol, o Se e o aviso no senão. Depois vá até a porta do farol sem pegar a chave e clique em Verificar esta etapa. Quando aparecer Objetivo da etapa cumprido!, clique em Próxima seção.

Criar evento separado personagem/farol (o bloco chega com jogador e inimigo) e Se consultando temChave, encaixado no espaço vazio ao lado da palavra fazer. A pergunta `x > 0` que nasce no Se é um bloco de verdade: vai para a lixeira (no canto de baixo, à direita, do espaço dos blocos) antes de pôr `valor da variável temChave` no lugar vazio, senão sobra um bloco solto ou nasce `temChave > 0`, que o critério `condicao` reprova. O valor da variável chega com x, trocado por temChave; a fala avisa que a palavra verdadeiro não aparece e nem precisa. Na linha de baixo do Se, usar o segundo **+**, antes da palavra **senão**, no fim da linha (não o primeiro, antes de senão se), encaixar aviso com texto nesse ramo; o então fica vazio. Atualizar, ir até a porta do farol, na base da torre, sem chave e conferir luz apagada e mensagem. Verificar, corrigir, seguir em Próxima seção. A checagem aceita então vazio.

### Seção 3. Acenda o farol com a chave

- **Intenção:** aplicação (`application`), com verificação intermediária.
- **Por que existe:** programar a relação observada no jogo da pessoa.
- **Conclui quando:** vídeo e quatorze critérios cumulativos aprovados; não pede envio.
- **Blocos:** `video-d3-decisao`, `ponte-d3-decisao`; Estúdio pela `workspaceKey: projeto`.

**Recado na página (não gravar):** Agora acenda o farol. Complete o espaço do então e teste sem a chave, com a chave e numa nova partida. Depois clique em Verificar esta etapa. Quando aparecer Objetivo da etapa cumprido!, clique em Próxima seção.

Retomar o mesmo Se, preservando o aviso em senão. Dizer de saída que a resposta com a chave tem três blocos e completar o então: ganhou verdadeiro, imagem farol-listrado-aceso (o Trocar imagem chega com heroi nos dois nomes) e aviso de chegada. Não criar outro evento, outra condição ou cópia do projeto. A verificação não exige a frase do exemplo.

Testar o percurso contínuo: Atualizar, visitar a porta do farol sem chave, afastar, buscar a chave e voltar até a porta do farol na mesma partida. Ver o barco entrar (ele chega em cerca de 1 segundo). Atualizar depois da vitória, conferir a chave de volta e ir até a porta do farol sem recolhê-la. Conferir as mensagens e a luz nos três momentos. Terminar em **Verificar esta etapa → Objetivo da etapa cumprido! → Próxima seção**. O Estúdio salva automaticamente; o envio fica no fim da seção 7.

### Seção 4. Deixe o jogo com a sua cara

- **Intenção:** aplicação (`application`), personalização do mesmo projeto antes do envio.
- **Por que existe:** uma ideia só, trocar cada imagem por outra do mesmo tipo: personagem, barco, chave, o par do farol e cenário, com desenhos e nomes reconhecíveis.
- **Conclui quando:** vídeo e a verificação `acender` (a imagem dentro de então é um farol aceso, de qualquer modelo). As escolhas não viram critério.
- **Blocos:** `video-d3-personalizar`, `ponte-d3-personalizar` e o mesmo `projeto` pela workspaceKey.

**Recado na página (não gravar):** A surpresa chegou. Que combinação você vai criar? Troque o que quiser: personagem, barco, chave, farol ou cenário. Se trocar o farol, use o mesmo modelo apagado e aceso. Teste a combinação e clique em Verificar esta etapa. Quando aparecer Objetivo da etapa cumprido!, clique em Próxima seção.

É a revelação da surpresa plantada na abertura do Dia 1 e lembrada no fim do Dia 2 (decisão do responsável, 07/10/2026). A fala começa com "Sua missão deu certo. E a surpresa chegou: olha quantas versões esse jogo pode ter…", mostra duas versões completas do jogo rodando (dois trechos curtos gravados em dois perfis de teste, porque o Estúdio da aula guarda um projeto por perfil) e só então as galerias do caderno do curso (páginas **A surpresa do final**), dizendo que a lista de imagens do Estúdio também mostra um desenho pequeno de cada uma; depois do teste, liga as escolhas à publicação ("é com essa cara que ele vai para o Mural"). Cada troca é escolha da pessoa: a fala diz que o pirata é só o exemplo e que o que ela gostou pode ficar como está.

Em **Ao iniciar**, selecionar a imagem no fim do **Criar sprite** correspondente, clicando no nome da imagem (como aventureiro, veleiro ou chave dourada; se não achar, rolar a lista). O sprite continua personagem, barco, chave ou farol; os nomes dos desenhos mudam. A chave nova aparece no jogo na hora; o barco novo só aparece no teste, porque só chega quando o farol acende. O farol é escolhido em par: o modelo apagado em **Ao iniciar → Criar sprite farol** e o mesmo modelo aceso em **então → Trocar imagem do sprite farol para**. O cenário é escolhido no **Desenhar o cenário** dentro de **A cada quadro do jogo**, em **Enquanto estiver rodando**. Cada categoria mantém dimensões e contato, e os faróis mantêm a porta no mesmo lugar: mudar só imagem, sem compensar posição ou tamanho. Testar o farol sem a chave e com a chave na mesma partida, indo até a porta do farol, ver o barco chegar, conferir uma vez só e terminar em **Verificar esta etapa → Objetivo da etapa cumprido! → Próxima seção**, com a fórmula completa ("Funcionou? Clique em Verificar esta etapa. Se faltar alguma coisa, corrija os blocos e clique novamente.").

| Tipo | Nomes na lista e no caderno do curso |
| --- | --- |
| Personagem | aventureiro, menina-de-laco, marinheira, menino-de-bone, exploradora-de-chapeu, pirata, mergulhador, robo |
| Cenário | praia-tropical, costa-rochosa, ilha-nevada, noite-na-ilha |
| Barco | veleiro, barco-de-pesca, lancha, barco-pirata |
| Chave | chave-dourada, chave-prateada, chave-de-estrela |
| Farol (par) | farol-listrado, farol-de-pedra, farol-de-madeira e farol-colorido, cada um com o fim **-apagado** e **-aceso** |

### Seção 5. Escreva seus avisos

- **Intenção:** fechamento (`closing`) com avisos livres no projeto já verificado, antes do envio.
- **Por que existe:** uma ideia só, escrever a voz do jogo. A chave `farol-mensagens` ficou a mesma quando o farol saiu daqui (06/10/2026).
- **Conclui quando:** vídeo; nenhum texto literal obrigatório.
- **Blocos:** `video-d3-farol-mensagens`, `ponte-d3-farol-mensagens`; mesmo `projeto`.

**Recado na página (não gravar):** Agora escreva os avisos do seu jeito. Mude o texto dos quatro avisos, teste o jogo e clique em Próxima seção.

Editar os quatro textos de aviso: inicial em Ao iniciar, coleta no encontro com a chave, falta da chave no senão e vitória no então. O vídeo narra as quatro edições, cada uma com o lugar e um exemplo, e diz que o que a pessoa escrever fica no jogo (revisão de 13/10/2026). Manter nomes de variáveis e frases curtas. Testar os quatro na mesma partida, indo até a porta do farol, e conferir, uma vez só, que as frases aparecem, cabem e mudaram.

### Seção 6. Como escolher um lugar para a chave

- **Intenção:** exploração (`exploration`) antes da escolha de posição.
- **Por que existe:** tornar x/y observáveis antes de alterar o projeto.
- **Conclui quando:** vídeo e mudanças nos dois eixos da experiência.
- **Blocos:** `video-d3-posicao`, `ponte-d3-posicao`, `experiencia-posicao`; sem workspaceKey.

**Recado na página (não gravar):** Sua vez: mude um número de cada vez e repare para onde a chave vai. Quando terminar, clique em Próxima seção.

Cena `lighthouse-position`, cenário farol, metas `mover-horizontal` e `mover-vertical`. Controles **Posição horizontal x**, **Posição vertical y** e **Recomeçar**. Partir de x 211/y 53, mostrar só x 160 e depois só y 250, digitando no campo e clicando fora dele (o número só vai para a cena depois desse clique; os botões − e + andam de 20 em 20 e não chegam a 160 nem a 250). Demonstrar na primeira pessoa: x aumenta para a direita, y aumenta para baixo, porque a contagem do y começa no 0, no alto da tela, sem mudar desenho ou tamanho; o quadrado pontilhado marca o lugar anterior. Passar a vez no final. As metas exigem ação nos dois eixos, sem obrigar valores iguais à demonstração; sem palpite ou pergunta final. O Estúdio da pessoa não é alterado pela experiência.

### Seção 7. Escolha onde fica a chave

- **Intenção:** entrega (`delivery`) depois da aplicação livre.
- **Por que existe:** a escolha altera o caminho de quem vai jogar.
- **Conclui quando:** vídeo, envio do projeto e envio em dia (`submissionUpToDate`). Sem critério numérico de posição; uma edição após o envio exige atualizar a mesma entrega.
- **Blocos:** `video-d3-posicionar-chave`, `ponte-d3-posicionar-chave`, `projeto`. O bloco passa a pertencer a esta seção, com a mesma chave.

**Recado na página (não gravar):** Agora escolha onde fica a chave. Mude o x e o y no bloco Criar sprite chave, como x 160 e y 250 para a parte de baixo. Teste o caminho até a chave e até a porta do farol. Depois clique em Enviar para o professor e confirme em Enviar. Se mudar alguma coisa depois de enviar, clique em Reenviar ao professor e confirme em Reenviar. Quando aparecer Projeto enviado ao professor, clique em Próxima seção.

Retomar x/y da experiência. Em **Ao iniciar → Criar sprite chave**, editar somente x/y, com o número do lugar escolhido dado como exemplo ("como 160"), não como ordem. O caderno do curso mostra os três pontos de `FAROL_POSICOES_CHAVE`: perto da trilha (211, 53), na parte de baixo (160, 250) e perto da ponte (280, 160). A chave deve aparecer inteira: atrás do farol ou da faixa do aviso ela some (é desenhada antes deles), e em cima do personagem ele já começa com ela; nesses casos, escolher um dos lugares sugeridos. Testar: **Atualizar**, buscar a chave no lugar escolhido, levar até a porta do farol, esperar o barco e **Atualizar** de novo para conferir que a chave volta ao lugar escolhido. Desde 13/10/2026 o teste não repete a ida ao farol sem a chave: a posição não muda a resposta do senão, já testada nas seções 2 a 5. Clicar em **Enviar para o professor**, confirmar em **Enviar** e, depois de **Projeto enviado ao professor**, seguir em **Próxima seção**; se mudar depois de enviar, **Reenviar ao professor** e **Reenviar**.

### Seção 8. Publique seu jogo

- **Intenção:** encerramento com publicação (`closing`).
- **Por que existe:** mostrar o jogo a outras pessoas.
- **Conclui quando:** vídeo; a publicação é a tarefa ensinada, sem requisito técnico novo de publicação.
- **Blocos:** `video-d3-fecho`, `ponte-d3-publicar`, `ajuda-publicar` e o mesmo `projeto` pela workspaceKey.

**Recado na página (não gravar):** Hora de mostrar o seu jogo. Publique no Mural, copie o link e mande para os seus amigos ou para quem você quiser. Depois clique em Fechar e em Concluir aula.

**Compartilhar → manter o resumo → Gerar capa → conferir → Publicar → Publicado! (Seu projeto já está no Mural dos Criadores.) → Copiar link e mandar para os amigos → Fechar → Concluir aula**. O envio anterior libera Compartilhar. Trocar a capa e resolver problemas ficam no tutorial direto `comunidade-publicar-no-mural`, com retorno à aula. Na gravação: depois de publicar, o Compartilhar trava neste navegador ("Você já compartilhou este jogo no Mural. 🎉"); para repetir a tomada, usar outro perfil de ensaio com o projeto enviado e acesso ao Mural. A fala manda o link "para os seus amigos ou para quem você quiser".

## Experiências e demonstrações desta aula

- **Cena:** `lighthouse-key`, O que a porta precisa?
- **Situação:** cena existente, ampliada com informação, pergunta e respostas visíveis.
- **Elenco/cenário:** farol, personagem e chave, com `cenario: farol`.
- **Metas:** `locked-without-key` e `opened-with-key`.
- **Instrução:** "Sem levar a chave, clique em Testar a porta. Depois clique em Levar a chave e em Testar a porta de novo. Compare temChave e a resposta escolhida nas duas vezes." (13/10/2026: o botão se chama só **Testar a porta**, e a marca da tela é **✓ escolhido**).
- **Observação:** trocar o estado da chave sozinho não conclui. Sem palpite obrigatório ou pergunta final redundante; semPerguntaFinal fica no bloco interativo.

## Vídeos

| Chave | O que mostra | Origem | Duração alvo | Reaproveita gravação? |
| --- | --- | --- | --- | --- |
| `video-d3-condicao` | Demonstração explicada: testar a porta sem e com a chave | Cena ampliada | 80 a 95 s | Gravar a versão adulta |
| `video-d3-sem-chave` | Evento, condição, senão, teste e verificação intermediária | Vídeo novo | 5,5 a 6,5 min | Gravar a versão adulta |
| `video-d3-decisao` | Completar então, testar o jogo e verificar | Roteiro revisado | 4,5 a 5,5 min, sem acelerar os percursos | Gravar a versão adulta |
| `video-d3-personalizar` | Revelar a surpresa do final; trocar personagem, barco, chave, o par do farol e cenário; testar e verificar | Mesmo projeto em construção | 4,5 a 5,5 min | Gravar a versão adulta |
| `video-d3-farol-mensagens` | Escrever os quatro avisos e testar | Mesmo projeto em construção | 120 a 150 s | Gravar a versão adulta |
| `video-d3-posicao` | Mudar x e y separadamente na experiência | Cena nova | 85 a 105 s | Gravar a versão adulta |
| `video-d3-posicionar-chave` | Escolher um lugar, testar o percurso e enviar o jogo | Mesmo projeto em construção | 2 a 3 min | Gravar a versão adulta |
| `video-d3-fecho` | Publicar e copiar o link para mandar aos amigos | Mesmo projeto enviado | 75 a 95 s, incluindo espera | Gravar a versão adulta |

## Continuidade

Preservar `condicao`, `sem-chave`, `decisao`, `personalizar`, `fecho`, chave `projeto` e cadeia. Inserir `farol-mensagens` (os avisos), `posicao` e `posicionar-chave` entre personalizar e fecho. O envio fica somente em posicionar-chave; a publicação continua no mesmo Estúdio. Só o Estúdio do Dia 3 tem showcase habilitado, com título e resumo do Farol. Não criar uma cópia para publicar.

Valores: temChave é consultado, ganhou vira verdadeiro apenas na resposta com chave, farol recebe a imagem acesa do modelo escolhido e aviso muda conforme o ramo. O barco preparado não é atribuído à autoria da pessoa.

A oferta vigente já inclui Mural completo durante os 30 dias e modo visitante depois; o review não altera direitos ou prazos. A publicação não bloqueia o certificado por expiração do Mural. Conferir conta elegível na gravação e reconciliar mídia/progresso antes de aplicar no admin.
