# Roteiro de produção · Faça o laser nascer na nave

A professora grava o master integral. Na edição kids, Dedé substitui somente os parágrafos das tabelas de substituição, sem voz sobreposta. A edição adulta conserva o master. As falas prontas e o índice de edição são derivados desta fonte.

Montagem guiada completa no vídeo, um gesto por vez, deixando o destino visível antes de pegar a peça. As telas e o reinício são infraestrutura preparada; as partes ensinam as regras da partida. A personalização muda a aparência.

**Antes de gravar:** use uma sessão de ensaio sem envio anterior, carregue a entrada da parte e dê foco ao jogo antes das teclas. Mostre Objetivo cumprido! e Projeto enviado! somente quando aparecerem. Os tempos de tecla são estimativas a confirmar no Verificar plano. Gravação e publicação pendentes.

## Parte 1. Quando sai o tiro?

**Clipe:** `video-tecla-e-repeticao`

**Na tela:** A cena fica parada enquanto a edição ilustra a comparação narrada, sem mostrar controles nem resolver descobertas. No "Agora você vai explorar essa ideia", ampliar a experiência [ampliar experiência]. No "O Zappy vai te mostrando", apontar a fala do Zappy [apontar zappy]. No "Quando terminar", voltar ao tamanho da aula [voltar à aula]. No "clique em Próxima parte", avançar [próxima parte].

**Fala para ElevenLabs:**

```text
[engaging, energetic, conversational voice] Você vai escolher o momento em que o laser sai da nave. Pense numa campainha: cada toque é um acontecimento ao qual ela pode responder.

[engaging, energetic, conversational voice] No jogo, tocar na tecla Espaço também é um acontecimento. Isso é diferente de repetir algo em todos os quadros enquanto o jogo está rodando.

[curious] Esperar já faz sair um tiro?

[engaging, energetic, conversational voice] O que você acha? Isso você vai testar na experiência.

[upbeat, encouraging voice] Agora você vai explorar essa ideia na experiência da aula. O Zappy vai te mostrando o que testar, e você pode repetir quando quiser. Quando terminar, clique em Próxima parte.
```

**Substituições na edição kids:**

| ID | Personagem | Ocorrência | Âncora anterior | Fala exata substituída | Âncora posterior | Tags |
| --- | --- | --- | --- | --- | --- | --- |
| video-tecla-e-repeticao-K1 | Dedé | 1 | Espaço também é um acontecimento. Isso é diferente de repetir algo em todos os quadros enquanto o jogo está rodando. | Esperar já faz sair um tiro? | O que você acha? Isso você vai testar na experiência. Agora você vai explorar essa ideia na experiência da aula. O | [curious] |

No adulto, manter toda a fala da professora. No kids, silenciar apenas o trecho marcado e substituir pelo áudio do personagem, sem sobrepor vozes.

**Falas da experiência:** consulte `zappy-etapas.json`. O vídeo convida; os controles e as comparações continuam livres na bancada.

**Recado na página (não gravar):** Sua vez! Compare o disparo ligado à tecla com a criação repetida em todo quadro. O Zappy te mostra o que testar, e você pode repetir quando quiser. Quando terminar, clique em Próxima parte.

## Parte 2. Faça Espaço responder

**Clipe:** `video-criar-tiro`

**Na tela:** A parte começa com o Estúdio expandido [expandir estúdio]. No "Comece seu jogo e toque em Espaço. Ainda não há uma resposta ligada a essa tecla. Na experiência da parte anterior, o acontecimento indicava o momento da resposta; agora você vai ligar um som ao Espaço.", [tocar prévia 400 300] [tecla Enter] [tecla Space]. No "Encontre a área Quando acontecer. Se ela não estiver aparecendo, arraste um espaço vazio entre os blocos até ela aparecer.", [arrastar até "Quando acontecer"]. No "Deixe à vista o encaixe depois do evento de Enter, fora do fazer dele. O novo evento vai ser um vizinho do Enter.", [apontar abaixo de "Quando apertar a tecla Enter"]. No "Abra Jogo 2D, depois Controles e depois Teclado, ações e toque. Pegue Quando apertar a tecla e encaixe no lugar separado que você deixou à vista.", [abrir categoria Jogo 2D > Controles > Teclado, ações e toque] [encaixar "Quando apertar a tecla" abaixo de "Quando apertar a tecla Enter"]. No "Clique no campo da tecla e escolha barra de espaço.", [trocar "→ seta direita" por "barra de espaço" em "Quando apertar a tecla → seta direita"]. No "Deixe à vista o espaço fazer do evento de Espaço. Abra Programação e depois Lógica e Se. Pegue Se e solte dentro desse fazer.", [apontar encaixe em "Quando apertar a tecla barra de espaço"] [abrir categoria Programação > Lógica & Se] [encaixar "Se" em "Quando apertar a tecla barra de espaço"]. No "Retire a pergunta x maior que zero que nasceu no Se e leve só essa pergunta para a lixeira.", [jogar na lixeira ">" em "Se dentro de Quando apertar a tecla barra de espaço"]. No "Com o lugar da pergunta à vista, abra Jogo 2D, depois Jogo e telas e depois Telas e partida. Pegue o estado do jogo é e encaixe no lugar vazio.", [abrir categoria Jogo 2D > Jogo e telas > Telas e partida] [encaixar "o estado do jogo é" em "Se dentro de Quando apertar a tecla barra de espaço" no "Se"]. No "No nome do estado, escolha jogando. Esse é o mesmo cuidado usado no movimento.", [trocar "inicio" por "jogando" em "o estado do jogo é dentro de Quando apertar a tecla barra de espaço"]. No "Deixe à vista o então desse Se. Abra Jogo 2D, depois Som e depois Efeitos prontos. Encaixe Tocar efeito dentro do então e escolha tiro grande.", [apontar encaixe em "Se o estado do jogo é jogando dentro de Quando apertar a tecla barra de espaço" no "então"] [abrir categoria Jogo 2D > Som > Efeitos prontos] [encaixar "Tocar efeito" em "Se o estado do jogo é jogando dentro de Quando apertar a tecla barra de espaço" no "então"] [trocar "moeda" por "tiro grande" em "Tocar efeito dentro de Quando apertar a tecla barra de espaço"]. No "Clique em Rodar de novo. Na abertura, toque em Espaço e escute. Depois, pressione Enter e toque em Espaço novamente. O som do tiro deve responder durante a partida. Deixe o som do aparelho ligado para ouvir.", [rodar de novo] [tocar prévia 400 300] [tecla Space] aguardar 1 segundo na gravação, sem novo comando [tecla Enter] [tecla Space] aguardar 1 segundo na gravação, sem novo comando. No "confira se ficou assim", mostrar os blocos usados nesta parte [mostrar blocos "Quando apertar a tecla barra de espaço"]. No "clique em Verificar projeto", verificar [verificar projeto]. No "Quando aparecer Objetivo cumprido!", voltar ao tamanho da aula [reduzir estúdio]. No "clique em Próxima parte", sair da parte [próxima parte].

**Fala para ElevenLabs:**

```text
[engaging, energetic, conversational voice] Comece seu jogo e toque em Espaço. Ainda não há uma resposta ligada a essa tecla. Na experiência da parte anterior, o acontecimento indicava o momento da resposta; agora você vai ligar um som ao Espaço.

[confident, clear, unhurried voice] Encontre a área Quando acontecer. Se ela não estiver aparecendo, arraste um espaço vazio entre os blocos até ela aparecer.

[short pause]

[confident, clear, unhurried voice] Deixe à vista o encaixe depois do evento de Enter, fora do fazer dele. O novo evento vai ser um vizinho do Enter.

[short pause]

[confident, clear, unhurried voice] Abra Jogo 2D, depois Controles e depois Teclado, ações e toque. Pegue Quando apertar a tecla e encaixe no lugar separado que você deixou à vista.

[short pause]

[confident, clear, unhurried voice] Clique no campo da tecla e escolha barra de espaço.

[short pause]

[confident, clear, unhurried voice] Deixe à vista o espaço fazer do evento de Espaço. Abra Programação e depois Lógica e Se. Pegue Se e solte dentro desse fazer.

[short pause]

[confident, clear, unhurried voice] Retire a pergunta x maior que zero que nasceu no Se e leve só essa pergunta para a lixeira.

[short pause]

[confident, clear, unhurried voice] Com o lugar da pergunta à vista, abra Jogo 2D, depois Jogo e telas e depois Telas e partida. Pegue o estado do jogo é e encaixe no lugar vazio.

[short pause]

[confident, clear, unhurried voice] No nome do estado, escolha jogando. Esse é o mesmo cuidado usado no movimento.

[short pause]

[confident, clear, unhurried voice] Deixe à vista o então desse Se. Abra Jogo 2D, depois Som e depois Efeitos prontos. Encaixe Tocar efeito dentro do então e escolha tiro grande.

[short pause]

[upbeat, encouraging voice] Clique em Rodar de novo. Na abertura, toque em Espaço e escute. Depois, pressione Enter e toque em Espaço novamente. O som do tiro deve responder durante a partida. Deixe o som do aparelho ligado para ouvir.

[reassuring, encouraging voice] Se algo não funcionou no seu jogo, volte aos blocos e confira se ficou assim: o evento usa barra de espaço, sua pergunta é jogando e o efeito tiro grande fica no então. Depois de corrigir, teste de novo.

[engaging, energetic, conversational voice] Funcionou? Clique em Verificar projeto. Se faltar alguma coisa, corrija os blocos e clique novamente.

[engaging, energetic, conversational voice] Quando aparecer Objetivo cumprido!, clique em Próxima parte.
```

**Recado na página (não gravar):** Sua vez! Faça Espaço responder. Teste no seu jogo e clique em Verificar projeto. Quando aparecer Objetivo cumprido!, clique em Próxima parte.

## Parte 3. Objetos que entram e saem

**Clipe:** `video-objetos-no-grupo`

**Na tela:** A cena fica parada enquanto a edição ilustra a comparação narrada, sem mostrar controles nem resolver descobertas. No "Agora você vai explorar essa ideia", ampliar a experiência [ampliar experiência]. No "O Zappy vai te mostrando", apontar a fala do Zappy [apontar zappy]. No "Quando terminar", voltar ao tamanho da aula [voltar à aula]. No "clique em Próxima parte", avançar [próxima parte].

**Fala para ElevenLabs:**

```text
[engaging, energetic, conversational voice] Cada disparo cria um laser novo. O jogo precisa acompanhar todos eles, mesmo quando há vários ao mesmo tempo. Pense numa caixa com seus carrinhos: cada carrinho é uma coisa, e a caixa reúne a turma toda.

[engaging, energetic, conversational voice] No seu jogo, um grupo reúne os lasers que ainda participam da partida. A tela mostra só a parte do espaço que você consegue ver. Estar fora dessa janela e deixar de participar do grupo são coisas diferentes.

[curious] Se eu não vejo mais o laser, ele já saiu do grupo?

[engaging, energetic, conversational voice] O que você acha? Isso você vai testar na experiência.

[upbeat, encouraging voice] Agora você vai explorar essa ideia na experiência da aula. O Zappy vai te mostrando o que testar, e você pode repetir quando quiser. Quando terminar, clique em Próxima parte.
```

**Substituições na edição kids:**

| ID | Personagem | Ocorrência | Âncora anterior | Fala exata substituída | Âncora posterior | Tags |
| --- | --- | --- | --- | --- | --- | --- |
| video-objetos-no-grupo-K1 | Dedé | 1 | a parte do espaço que você consegue ver. Estar fora dessa janela e deixar de participar do grupo são coisas diferentes. | Se eu não vejo mais o laser, ele já saiu do grupo? | O que você acha? Isso você vai testar na experiência. Agora você vai explorar essa ideia na experiência da aula. O | [curious] |

No adulto, manter toda a fala da professora. No kids, silenciar apenas o trecho marcado e substituir pelo áudio do personagem, sem sobrepor vozes.

**Falas da experiência:** consulte `zappy-etapas.json`. O vídeo convida; os controles e as comparações continuam livres na bancada.

**Recado na página (não gravar):** Sua vez! Compare o que aparece na tela com os objetos que continuam guardados no grupo. O Zappy te mostra o que testar, e você pode repetir quando quiser. Quando terminar, clique em Próxima parte.

## Parte 4. Crie e mostre os lasers

**Clipe:** `video-grupo-tiros`

**Na tela:** A parte começa com o Estúdio expandido [expandir estúdio]. No "Seu Espaço já toca o som, mas ainda falta um laser para aparecer. A experiência mostrou um grupo acompanhando os objetos da partida. Agora crie o grupo tiros, coloque cada novo laser nele e desenhe esse grupo.", [tocar prévia 400 300] [tecla Enter] [tecla Space]. No "Encontre a área Ao iniciar. Se ela não estiver aparecendo, arraste um espaço vazio entre os blocos até ela aparecer.", [arrastar até "Ao iniciar"]. No "Deixe à vista o encaixe depois de Criar sprite painelMensagem e antes de Mudar o estado do jogo para inicio. Abra Jogo 2D, depois Grupos e depois Criar e percorrer.", [apontar abaixo de "Criar sprite painelMensagem"] [abrir categoria Jogo 2D > Grupos > Criar e percorrer]. No "Pegue Criar grupo de sprites e encaixe ali. No nome que chega como asteroides, escreva tiros.", [encaixar "Criar grupo de sprites" abaixo de "Criar sprite painelMensagem"] [trocar "asteroides" por "tiros" em "Criar grupo de sprites"]. No "Encontre a área Quando acontecer. Se ela não estiver aparecendo, arraste um espaço vazio entre os blocos até ela aparecer.", [arrastar até "Quando acontecer"]. No "No evento de Espaço, encontre o então de Se jogando e deixe o encaixe antes do som à vista.", [apontar encaixe em "Se o estado do jogo é jogando dentro de Quando apertar a tecla barra de espaço" no "então"]. No "Em Jogo 2D, Grupos, Criar e percorrer, pegue No grupo criar um sprite com imagem. Solte antes do som, dentro do mesmo então.", [abrir categoria Jogo 2D > Grupos > Criar e percorrer] [encaixar "No grupo inimigos criar um sprite" em "Se o estado do jogo é jogando dentro de Quando apertar a tecla barra de espaço" no "então"]. No "O grupo chega como inimigos. Clique nele e escolha tiros. Deixe vazio o nome opcional depois de chamado.", [trocar "inimigos" por "tiros" em "No grupo inimigos criar um sprite"] [apontar bloco "No grupo tiros criar um sprite"]. No "Coloque 395 no x e 372 no y. Esses números vão deixar o primeiro laser na frente da posição inicial da nave.", [trocar "100" por "395" em "No grupo tiros criar um sprite"] [trocar "100" por "372" em "No grupo tiros criar um sprite"]. No "Coloque 10 na largura e 28 na altura. No campo da imagem, escolha laser-ciano. Deixe vx e vy em zero por enquanto.", [trocar "32" por "10" em "No grupo tiros criar um sprite"] [trocar "32" por "28" em "No grupo tiros criar um sprite"] [trocar "inimigo" por "laser-ciano" em "No grupo tiros criar um sprite"]. No "Encontre a área Enquanto estiver rodando. Se ela não estiver aparecendo, arraste um espaço vazio entre os blocos até ela aparecer.", [arrastar até "Enquanto estiver rodando"]. No "Dentro de A cada quadro do jogo, deixe à vista o encaixe depois de Limpar a tela e antes de Desenhar o sprite nave. Esse lugar fica fora do Se jogando.", [apontar abaixo de "Limpar a tela"]. No "Abra Jogo 2D, depois Grupos e depois Desenho e ordem. Pegue Desenhar o grupo, encaixe nesse lugar e troque asteroides por tiros.", [abrir categoria Jogo 2D > Grupos > Desenho e ordem] [encaixar "Desenhar o grupo" abaixo de "Limpar a tela"] [trocar "asteroides" por "tiros" em "Desenhar o grupo"]. No "Comece a partida e toque em Espaço. Um laser aparece na frente da posição inicial da nave, ainda parado. Mova a nave e dispare de novo: por enquanto, o laser continua nascendo no mesmo lugar.", [tocar prévia 400 300] [tecla Enter] [tecla Space] [segurar tecla ArrowRight por 0,4 s]  [tecla Space]. No "confira se ficou assim", mostrar os blocos usados nesta parte [mostrar blocos "Criar grupo de sprites tiros", "No grupo tiros criar um sprite", "Desenhar o grupo tiros"]. No "clique em Verificar projeto", verificar [verificar projeto]. No "Quando aparecer Objetivo cumprido!", voltar ao tamanho da aula [reduzir estúdio]. No "clique em Próxima parte", sair da parte [próxima parte].

**Fala para ElevenLabs:**

```text
[engaging, energetic, conversational voice] Seu Espaço já toca o som, mas ainda falta um laser para aparecer. A experiência mostrou um grupo acompanhando os objetos da partida. Agora crie o grupo tiros, coloque cada novo laser nele e desenhe esse grupo.

[confident, clear, unhurried voice] Encontre a área Ao iniciar. Se ela não estiver aparecendo, arraste um espaço vazio entre os blocos até ela aparecer.

[short pause]

[confident, clear, unhurried voice] Deixe à vista o encaixe depois de Criar sprite painelMensagem e antes de Mudar o estado do jogo para inicio. Abra Jogo 2D, depois Grupos e depois Criar e percorrer.

[short pause]

[confident, clear, unhurried voice] Pegue Criar grupo de sprites e encaixe ali. No nome que chega como asteroides, escreva tiros.

[short pause]

[confident, clear, unhurried voice] Encontre a área Quando acontecer. Se ela não estiver aparecendo, arraste um espaço vazio entre os blocos até ela aparecer.

[short pause]

[confident, clear, unhurried voice] No evento de Espaço, encontre o então de Se jogando e deixe o encaixe antes do som à vista.

[short pause]

[confident, clear, unhurried voice] Em Jogo 2D, Grupos, Criar e percorrer, pegue No grupo criar um sprite com imagem. Solte antes do som, dentro do mesmo então.

[short pause]

[confident, clear, unhurried voice] O grupo chega como inimigos. Clique nele e escolha tiros. Deixe vazio o nome opcional depois de chamado.

[short pause]

[confident, clear, unhurried voice] Coloque 395 no x e 372 no y. Esses números vão deixar o primeiro laser na frente da posição inicial da nave.

[short pause]

[confident, clear, unhurried voice] Coloque 10 na largura e 28 na altura. No campo da imagem, escolha laser-ciano. Deixe vx e vy em zero por enquanto.

[short pause]

[confident, clear, unhurried voice] Encontre a área Enquanto estiver rodando. Se ela não estiver aparecendo, arraste um espaço vazio entre os blocos até ela aparecer.

[short pause]

[confident, clear, unhurried voice] Dentro de A cada quadro do jogo, deixe à vista o encaixe depois de Limpar a tela e antes de Desenhar o sprite nave. Esse lugar fica fora do Se jogando.

[short pause]

[confident, clear, unhurried voice] Abra Jogo 2D, depois Grupos e depois Desenho e ordem. Pegue Desenhar o grupo, encaixe nesse lugar e troque asteroides por tiros.

[short pause]

[upbeat, encouraging voice] Comece a partida e toque em Espaço. Um laser aparece na frente da posição inicial da nave, ainda parado. Mova a nave e dispare de novo: por enquanto, o laser continua nascendo no mesmo lugar.

[reassuring, encouraging voice] Se algo não funcionou no seu jogo, volte aos blocos e confira se ficou assim: o grupo tiros é criado em Ao iniciar, a imagem nasce no grupo tiros dentro de Espaço e o grupo é desenhado depois da limpeza. Depois de corrigir, teste de novo.

[engaging, energetic, conversational voice] Funcionou? Clique em Verificar projeto. Se faltar alguma coisa, corrija os blocos e clique novamente.

[engaging, energetic, conversational voice] Quando aparecer Objetivo cumprido!, clique em Próxima parte.
```

**Recado na página (não gravar):** Sua vez! Crie e mostre os lasers. Teste no seu jogo e clique em Verificar projeto. Quando aparecer Objetivo cumprido!, clique em Próxima parte.

## Parte 5. Onde o laser nasce?

**Clipe:** `video-escrito-e-lido`

**Na tela:** A cena fica parada enquanto a edição ilustra a comparação narrada, sem mostrar controles nem resolver descobertas. No "Agora você vai explorar essa ideia", ampliar a experiência [ampliar experiência]. No "O Zappy vai te mostrando", apontar a fala do Zappy [apontar zappy]. No "Quando terminar", voltar ao tamanho da aula [voltar à aula]. No "clique em Próxima parte", avançar [próxima parte].

**Fala para ElevenLabs:**

```text
[engaging, energetic, conversational voice] A nave muda de lugar, mas o laser precisa continuar saindo dela. Imagine fotografar onde alguém está: a foto mostra um momento; olhar de novo mostra a posição de agora.

[engaging, energetic, conversational voice] Um número escrito indica sempre o mesmo lugar. Ler a posição da nave permite usar o lugar em que ela está no momento de cada disparo. A caixa da nave tem um centro e uma beirada de cima que ajudam a encontrar a saída do laser.

[curious] O laser vai acompanhar a nave se eu escrever só um número?

[engaging, energetic, conversational voice] O que você acha? Isso você vai testar na experiência.

[upbeat, encouraging voice] Agora você vai explorar essa ideia na experiência da aula. O Zappy vai te mostrando o que testar, e você pode repetir quando quiser. Quando terminar, clique em Próxima parte.
```

**Substituições na edição kids:**

| ID | Personagem | Ocorrência | Âncora anterior | Fala exata substituída | Âncora posterior | Tags |
| --- | --- | --- | --- | --- | --- | --- |
| video-escrito-e-lido-K1 | Dedé | 1 | momento de cada disparo. A caixa da nave tem um centro e uma beirada de cima que ajudam a encontrar a saída do laser. | O laser vai acompanhar a nave se eu escrever só um número? | O que você acha? Isso você vai testar na experiência. Agora você vai explorar essa ideia na experiência da aula. O | [curious] |

No adulto, manter toda a fala da professora. No kids, silenciar apenas o trecho marcado e substituir pelo áudio do personagem, sem sobrepor vozes.

**Falas da experiência:** consulte `zappy-etapas.json`. O vídeo convida; os controles e as comparações continuam livres na bancada.

**Recado na página (não gravar):** Sua vez! Compare a origem dos disparos quando o lugar é fixo e quando acompanha a nave. O Zappy te mostra o que testar, e você pode repetir quando quiser. Quando terminar, clique em Próxima parte.

## Parte 6. Faça o laser nascer na nave

**Clipe:** `video-tiro-da-nave`

**Na tela:** A parte começa com o Estúdio expandido [expandir estúdio]. No "Comece o jogo, leve a nave para o lado e dispare. O laser ainda nasce no lugar antigo porque x e y são números escritos. Na experiência da parte anterior, ler a nave fazia a origem acompanhar sua posição. Agora troque esses dois números por leituras.", [tocar prévia 400 300] [tecla Enter] [segurar tecla ArrowRight por 0,4 s]  [tecla Space]. No "Encontre a área Quando acontecer. Se ela não estiver aparecendo, arraste um espaço vazio entre os blocos até ela aparecer.", [arrastar até "Quando acontecer"]. No "Encontre o bloco que cria o laser no evento de Espaço. Deixe o número 395 do x à vista.", [apontar bloco "No grupo tiros criar um sprite"]. No "Abra Programação e depois Matemática. Pegue a conta com dois números e um sinal no meio e encaixe sobre 395.", [abrir categoria Programação > Matemática] [soltar "0 + 0" em cima do "395" em "No grupo tiros criar um sprite"]. No "Clique no sinal da conta e escolha menos. Deixe os dois números em zero por enquanto.", [trocar "+" por "−" em "0 + 0 dentro de No grupo tiros"]. No "Deixe o zero da esquerda da conta à vista. Abra Jogo 2D, depois Movimento e depois Posição e tamanho. Pegue o centro x do sprite e encaixe sobre esse primeiro zero.", [apontar bloco "0 − 0 dentro de No grupo tiros"] [abrir categoria Jogo 2D > Movimento > Posição e tamanho] [soltar "o centro x do sprite" em cima do "0" em "0 − 0 dentro de No grupo tiros"]. No "No nome do sprite desse valor, troque jogador por nave. No zero que ficou à direita da conta, coloque 5. Como o laser tem dez de largura, tirar cinco coloca o centro dele no centro da nave.", [trocar "jogador" por "nave" em "o centro x do sprite"] [trocar "0" por "5" em "o centro x do sprite nave − 0 dentro de No grupo tiros"]. No "Agora deixe o número 372 do y do laser à vista. Abra Programação e depois Matemática. Encaixe outra conta sobre esse número e escolha menos.", [apontar bloco "No grupo tiros criar um sprite"] [abrir categoria Programação > Matemática] [soltar "0 + 0" em cima do "372" em "No grupo tiros criar um sprite"] [trocar "+" por "−" em "0 + 0 dentro de No grupo tiros"]. No "No zero da esquerda, encaixe a posição y do sprite, em Jogo 2D, Movimento, Posição e tamanho. Troque jogador por nave. No zero que ficou à direita da conta, coloque 24.", [abrir categoria Jogo 2D > Movimento > Posição e tamanho] [soltar "a posição y do sprite" em cima do "0" em "0 − 0 dentro de No grupo tiros"] [trocar "jogador" por "nave" em "a posição y do sprite"] [trocar "0" por "24" em "a posição y do sprite nave − 0 dentro de No grupo tiros"]. No "A posição y menos 24 deixa a maior parte do laser acima da nave. Conserve largura 10, altura 28 e as velocidades zero nesta parte.", [apontar bloco "No grupo tiros criar um sprite"]. No "Comece o jogo e dispare com a nave no centro, depois à esquerda e depois à direita. Cada novo laser nasce na frente da nave. Eles ainda ficam parados, porque o voo será a próxima construção.", [tocar prévia 400 300] [tecla Enter] [tecla Space] [segurar tecla ArrowLeft por 0,5 s]  [tecla Space] [segurar tecla ArrowRight por 1 s]  [tecla Space]. No "confira se ficou assim", mostrar os blocos usados nesta parte [mostrar blocos "No grupo tiros criar um sprite"]. No "clique em Verificar projeto", verificar [verificar projeto]. No "Quando aparecer Objetivo cumprido!", voltar ao tamanho da aula [reduzir estúdio]. No "clique em Próxima parte", sair da parte [próxima parte].

**Fala para ElevenLabs:**

```text
[engaging, energetic, conversational voice] Comece o jogo, leve a nave para o lado e dispare. O laser ainda nasce no lugar antigo porque x e y são números escritos. Na experiência da parte anterior, ler a nave fazia a origem acompanhar sua posição. Agora troque esses dois números por leituras.

[confident, clear, unhurried voice] Encontre a área Quando acontecer. Se ela não estiver aparecendo, arraste um espaço vazio entre os blocos até ela aparecer.

[short pause]

[confident, clear, unhurried voice] Encontre o bloco que cria o laser no evento de Espaço. Deixe o número 395 do x à vista.

[short pause]

[confident, clear, unhurried voice] Abra Programação e depois Matemática. Pegue a conta com dois números e um sinal no meio e encaixe sobre 395.

[short pause]

[confident, clear, unhurried voice] Clique no sinal da conta e escolha menos. Deixe os dois números em zero por enquanto.

[short pause]

[confident, clear, unhurried voice] Deixe o zero da esquerda da conta à vista. Abra Jogo 2D, depois Movimento e depois Posição e tamanho. Pegue o centro x do sprite e encaixe sobre esse primeiro zero.

[short pause]

[confident, clear, unhurried voice] No nome do sprite desse valor, troque jogador por nave. No zero que ficou à direita da conta, coloque 5. Como o laser tem dez de largura, tirar cinco coloca o centro dele no centro da nave.

[short pause]

[confident, clear, unhurried voice] Agora deixe o número 372 do y do laser à vista. Abra Programação e depois Matemática. Encaixe outra conta sobre esse número e escolha menos.

[short pause]

[confident, clear, unhurried voice] No zero da esquerda, encaixe a posição y do sprite, em Jogo 2D, Movimento, Posição e tamanho. Troque jogador por nave. No zero que ficou à direita da conta, coloque 24.

[short pause]

[confident, clear, unhurried voice] A posição y menos 24 deixa a maior parte do laser acima da nave. Conserve largura 10, altura 28 e as velocidades zero nesta parte.

[short pause]

[upbeat, encouraging voice] Comece o jogo e dispare com a nave no centro, depois à esquerda e depois à direita. Cada novo laser nasce na frente da nave. Eles ainda ficam parados, porque o voo será a próxima construção.

[reassuring, encouraging voice] Se algo não funcionou no seu jogo, volte aos blocos e confira se ficou assim: o x lê centro x da nave menos 5, o y lê posição y da nave menos 24 e as duas contas estão dentro da criação do laser. Depois de corrigir, teste de novo.

[engaging, energetic, conversational voice] Funcionou? Clique em Verificar projeto. Se faltar alguma coisa, corrija os blocos e clique novamente.

[engaging, energetic, conversational voice] Quando aparecer Objetivo cumprido!, clique em Próxima parte.
```

**Recado na página (não gravar):** Sua vez! Faça o laser nascer na nave. Teste no seu jogo e clique em Verificar projeto. Quando aparecer Objetivo cumprido!, clique em Próxima parte.

## Parte 7. Confira e envie a origem dos lasers

**Clipe:** `video-entrega`

**Na tela:** A parte começa com o Estúdio expandido [expandir estúdio]. No "Seu disparo já responde ao Espaço e acompanha o lugar da nave. Agora confira onde cada novo laser nasce antes de enviar.", [apontar prévia]. No "Clique em Rodar de novo para começar o teste na abertura.", [rodar de novo]. No "Antes de Enter, toque em Espaço. Nenhum laser deve aparecer. Pressione Enter e dispare uma vez no centro.", [tocar prévia 400 300] [tecla Space] [tecla Enter] [tecla Space]. No "Leve a nave para a esquerda e dispare. Depois vá para a direita e dispare novamente. Cada novo laser deve nascer na frente da nave; os anteriores continuam onde nasceram.", [segurar tecla ArrowLeft por 0,5 s] [tecla Space] [segurar tecla ArrowRight por 1 s] [tecla Space]. No "Nesta versão, os lasers ainda ficam parados. Na próxima aula você vai construir o voo deles e a retirada quando saírem da tela.", [apontar prévia]. No "confira se ficou assim", mostrar os blocos usados nesta parte [mostrar blocos "No grupo tiros criar um sprite"]. No "clique em Verificar projeto", verificar [verificar projeto]. No "clique em Enviar meu projeto", iniciar o envio e confirmar [enviar projeto]. No "Quando aparecer Projeto enviado!", voltar ao tamanho da aula [reduzir estúdio]. No "clique em Concluir aula", sair da parte [concluir aula].

**Fala para ElevenLabs:**

```text
[engaging, energetic, conversational voice] Seu disparo já responde ao Espaço e acompanha o lugar da nave. Agora confira onde cada novo laser nasce antes de enviar.

[confident, clear, unhurried voice] Clique em Rodar de novo para começar o teste na abertura.

[short pause]

[upbeat, encouraging voice] Antes de Enter, toque em Espaço. Nenhum laser deve aparecer. Pressione Enter e dispare uma vez no centro.

[upbeat, encouraging voice] Leve a nave para a esquerda e dispare. Depois vá para a direita e dispare novamente. Cada novo laser deve nascer na frente da nave; os anteriores continuam onde nasceram.

[upbeat, encouraging voice] Nesta versão, os lasers ainda ficam parados. Na próxima aula você vai construir o voo deles e a retirada quando saírem da tela.

[reassuring, encouraging voice] Se algo não funcionou no seu jogo, volte aos blocos e confira se ficou assim: Espaço tem a guarda jogando, a origem lê a nave, os lasers entram no grupo tiros e esse grupo é desenhado; vx e vy ainda estão em zero. Depois de corrigir, teste de novo.

[engaging, energetic, conversational voice] Funcionou? Clique em Verificar projeto. Se faltar alguma coisa, corrija os blocos e clique novamente.

[engaging, energetic, conversational voice] Quando aparecer Objetivo cumprido!, clique em Enviar meu projeto e confirme em Enviar.

[pleased, lively voice] Você programou um disparo que nasce no lugar atual da sua nave!

[engaging, energetic, conversational voice] Quando aparecer Projeto enviado!, clique em Concluir aula.
```

**Recado na página (não gravar):** Hora de conferir e enviar! Confira e envie a origem dos lasers. Teste no seu jogo e clique em Verificar projeto. Depois, envie o projeto e confirme em Enviar. Quando aparecer Projeto enviado!, clique em Concluir aula.
