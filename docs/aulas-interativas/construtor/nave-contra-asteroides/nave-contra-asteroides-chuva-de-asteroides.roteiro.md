# Roteiro de produção · Faça os asteroides cair

A professora grava o master integral. Na edição kids, Dedé substitui somente os parágrafos das tabelas de substituição, sem voz sobreposta. A edição adulta conserva o master. As falas prontas e o índice de edição são derivados desta fonte.

Montagem guiada completa no vídeo, um gesto por vez, deixando o destino visível antes de pegar a peça. As telas e o reinício são infraestrutura preparada; as partes ensinam as regras da partida. A personalização muda a aparência.

**Antes de gravar:** use uma sessão de ensaio sem envio anterior, carregue a entrada da parte e dê foco ao jogo antes das teclas. Mostre Objetivo cumprido! e Projeto enviado! somente quando aparecerem. Os tempos de tecla são estimativas a confirmar no Verificar plano. Gravação e publicação pendentes.

## Parte 1. Quando nasce outro asteroide?

**Clipe:** `video-intervalo-das-pedras`

**Na tela:** A cena fica parada enquanto a edição ilustra a comparação narrada, sem mostrar controles nem resolver descobertas. No "Agora você vai explorar essa ideia na experiência", ampliar a experiência [ampliar experiência]. No "O Zappy vai te mostrando", apontar a fala do Zappy [apontar zappy]. No "Quando terminar", voltar ao tamanho da aula [voltar à aula]. No "clique em Próxima parte", avançar [próxima parte].

**Fala para ElevenLabs:**

```text
[engaging, energetic, conversational voice] Os asteroides vão chegar um depois do outro. Pense em soltar bolhas de sabão: o espaço de tempo entre os sopros muda a distância entre as bolhas.

[engaging, energetic, conversational voice] No jogo, o intervalo também separa o nascimento dos asteroides. Ele indica quanto tempo esperar antes de criar outro, enquanto os que já nasceram continuam seu caminho.

[curious] E se nascer um asteroide em todo quadro?

[engaging, energetic, conversational voice] Antes de testar, pense na sua resposta e diga em voz alta. Depois, a experiência mostra se você acertou.

[upbeat, encouraging voice] Agora você vai explorar essa ideia na experiência. O Zappy vai te mostrando o que testar, e você pode repetir quando quiser. Quando terminar, clique em Próxima parte.
```

**Substituições na edição kids:**

| ID | Personagem | Ocorrência | Âncora anterior | Fala exata substituída | Âncora posterior | Tags |
| --- | --- | --- | --- | --- | --- | --- |
| video-intervalo-das-pedras-K1 | Dedé | 1 | asteroides. Ele indica quanto tempo esperar antes de criar outro, enquanto os que já nasceram continuam seu caminho. | E se nascer um asteroide em todo quadro? | Antes de testar, pense na sua resposta e diga em voz alta. Depois, a experiência mostra se você acertou. Agora você vai | [curious] |

No adulto, manter toda a fala da professora. No kids, silenciar apenas o trecho marcado e substituir pelo áudio do personagem, sem sobrepor vozes.

**Falas da experiência:** consulte `zappy-etapas.json`. O vídeo convida; os controles e as comparações continuam livres na bancada.

**Recado na página (não gravar):** Sua vez! Compare os nascimentos sem intervalo e com uma espera. Depois, compare quantos nascem em quatro segundos com intervalos de um e de dois segundos. O Zappy te mostra o que testar, e você pode repetir quando quiser. Quando terminar, clique em Próxima parte.

## Parte 2. Prepare o grupo e o relógio

**Clipe:** `video-relogio`

**Na tela:** A parte começa com o Estúdio expandido [expandir estúdio]. No "Seu jogo já dispara, mas ainda não cria asteroides. Na experiência da parte anterior, uma espera separava os nascimentos. Prepare o grupo que vai reunir as pedras e um relógio de um segundo e meio.", [apontar prévia]. No "Encontre a área Ao iniciar. Se ela não estiver aparecendo, arraste um espaço vazio entre os blocos até ela aparecer.", [arrastar até "Ao iniciar"]. No "Deixe à vista o encaixe depois de Criar grupo de sprites tiros. Abra Jogo 2D, depois Grupos e depois Criar e percorrer.", [apontar abaixo de "Criar grupo de sprites tiros"] [abrir categoria Jogo 2D > Grupos > Criar e percorrer]. No "Pegue outro Criar grupo de sprites e encaixe depois do grupo tiros. O nome já é asteroides; conserve esse nome.", [encaixar "Criar grupo de sprites" abaixo de "Criar grupo de sprites tiros"] [apontar bloco "Criar grupo de sprites asteroides"]. No "Encontre a área Enquanto estiver rodando. Se ela não estiver aparecendo, arraste um espaço vazio entre os blocos até ela aparecer.", [arrastar até "Enquanto estiver rodando"]. No "Encontre A cada quadro do jogo e siga até o fim desse bloco. Deixe o encaixe de baixo à vista, fora do fazer. O relógio vai ficar depois dele, como outro bloco da área.", [arrastar até "A cada quadro do jogo"] [apontar abaixo de "A cada quadro do jogo"]. No "Abra Jogo 2D, depois Tempo e depois Quadros e intervalos. Pegue A cada segundos e encaixe fora do laço de quadros, nesse lugar.", [abrir categoria Jogo 2D > Tempo > Quadros e intervalos] [encaixar "A cada 2 segundos" abaixo de "A cada quadro do jogo"]. No "Troque o 2 pelo valor 1.5, com ponto entre o um e o cinco. Isso significa um segundo e meio.", [trocar "2" por "1.5" em "A cada 2 segundos"]. No "Deixe o fazer do relógio à vista. Abra Programação e depois Lógica e Se. Encaixe um Se dentro desse fazer.", [apontar encaixe em "A cada 1.5 segundos"] [abrir categoria Programação > Lógica & Se] [encaixar "Se" em "A cada 1.5 segundos"]. No "Leve a pergunta x maior que zero do Se para a lixeira. Com o espaço da pergunta à vista, abra Jogo 2D, Jogo e telas, Telas e partida, e encaixe o estado do jogo é.", [jogar na lixeira ">" em "Se dentro de A cada 1.5 segundos"] [abrir categoria Jogo 2D > Jogo e telas > Telas e partida] [encaixar "o estado do jogo é" em "Se dentro de A cada 1.5 segundos" no "Se"]. No "Escolha jogando no estado e deixe o então vazio por enquanto. Assim, os futuros nascimentos também vão esperar a partida começar.", [trocar "inicio" por "jogando" em "o estado do jogo é dentro de A cada 1.5 segundos"] [apontar encaixe em "Se o estado do jogo é jogando dentro de A cada 1.5 segundos" no "então"]. No "confira se ficou assim", mostrar os blocos usados nesta parte [mostrar blocos "Criar grupo de sprites asteroides", "A cada 1.5 segundos"]. No "clique em Verificar projeto", verificar [verificar projeto]. No "Quando aparecer Objetivo cumprido!", voltar ao tamanho da aula [reduzir estúdio]. No "clique em Próxima parte", sair da parte [próxima parte].

**Fala para ElevenLabs:**

```text
[engaging, energetic, conversational voice] Seu jogo já dispara, mas ainda não cria asteroides. Na experiência da parte anterior, uma espera separava os nascimentos. Prepare o grupo que vai reunir as pedras e um relógio de um segundo e meio.

[confident, clear, unhurried voice] Encontre a área Ao iniciar. Se ela não estiver aparecendo, arraste um espaço vazio entre os blocos até ela aparecer.

[short pause]

[confident, clear, unhurried voice] Deixe à vista o encaixe depois de Criar grupo de sprites tiros. Abra Jogo 2D, depois Grupos e depois Criar e percorrer.

[short pause]

[confident, clear, unhurried voice] Pegue outro Criar grupo de sprites e encaixe depois do grupo tiros. O nome já é asteroides; conserve esse nome.

[short pause]

[confident, clear, unhurried voice] Encontre a área Enquanto estiver rodando. Se ela não estiver aparecendo, arraste um espaço vazio entre os blocos até ela aparecer.

[short pause]

[confident, clear, unhurried voice] Encontre A cada quadro do jogo e siga até o fim desse bloco. Deixe o encaixe de baixo à vista, fora do fazer. O relógio vai ficar depois dele, como outro bloco da área.

[short pause]

[confident, clear, unhurried voice] Abra Jogo 2D, depois Tempo e depois Quadros e intervalos. Pegue A cada segundos e encaixe fora do laço de quadros, nesse lugar.

[short pause]

[confident, clear, unhurried voice] Troque o 2 pelo valor 1.5, com ponto entre o um e o cinco. Isso significa um segundo e meio.

[short pause]

[confident, clear, unhurried voice] Deixe o fazer do relógio à vista. Abra Programação e depois Lógica e Se. Encaixe um Se dentro desse fazer.

[short pause]

[confident, clear, unhurried voice] Leve a pergunta x maior que zero do Se para a lixeira. Com o espaço da pergunta à vista, abra Jogo 2D, Jogo e telas, Telas e partida, e encaixe o estado do jogo é.

[short pause]

[confident, clear, unhurried voice] Escolha jogando no estado e deixe o então vazio por enquanto. Assim, os futuros nascimentos também vão esperar a partida começar.

[short pause]

[reassuring, encouraging voice] Confira se ficou assim: há um grupo asteroides em Ao iniciar, o relógio usa 1.5 segundos, fica fora de A cada quadro e contém Se jogando.

[engaging, energetic, conversational voice] Agora clique em Verificar projeto. Se faltar alguma coisa, corrija os blocos e clique novamente.

[engaging, energetic, conversational voice] Quando aparecer Objetivo cumprido!, clique em Próxima parte.
```

**Recado na página (não gravar):** Sua vez! Prepare o grupo e o relógio. Teste no seu jogo e clique em Verificar projeto. Quando aparecer Objetivo cumprido!, clique em Próxima parte.

## Parte 3. Onde nasce cada asteroide?

**Clipe:** `video-posicao-sorteada`

**Na tela:** A cena fica parada enquanto a edição ilustra a comparação narrada, sem mostrar controles nem resolver descobertas. No "Agora você vai explorar essa ideia na experiência", ampliar a experiência [ampliar experiência]. No "O Zappy vai te mostrando", apontar a fala do Zappy [apontar zappy]. No "Quando terminar", voltar ao tamanho da aula [voltar à aula]. No "clique em Próxima parte", avançar [próxima parte].

**Fala para ElevenLabs:**

```text
[engaging, energetic, conversational voice] Se todos os asteroides chegassem pelo mesmo lugar, bastaria deixar a nave apontada para aquela coluna. O sorteio permite variar o lugar de cada nova pedra.

[engaging, energetic, conversational voice] É como tirar um número de um saquinho. Você escolhe quais números podem participar, mas não escolhe antecipadamente qual deles vai sair em cada vez. Na tela, o número sorteado vai indicar a posição horizontal do novo asteroide.

[engaging, energetic, conversational voice] A pedra também pode nascer um pouco acima da parte visível e entrar caindo. Isso deixa a chegada acontecer pela beirada, em vez de aparecer no meio do caminho.

[curious] O sorteio precisa dar um lugar diferente todas as vezes?

[engaging, energetic, conversational voice] Antes de testar, pense na sua resposta e diga em voz alta. Depois, a experiência mostra se você acertou.

[upbeat, encouraging voice] Agora você vai explorar essa ideia na experiência. O Zappy vai te mostrando o que testar, e você pode repetir quando quiser. Quando terminar, clique em Próxima parte.
```

**Substituições na edição kids:**

| ID | Personagem | Ocorrência | Âncora anterior | Fala exata substituída | Âncora posterior | Tags |
| --- | --- | --- | --- | --- | --- | --- |
| video-posicao-sorteada-K1 | Dedé | 1 | da parte visível e entrar caindo. Isso deixa a chegada acontecer pela beirada, em vez de aparecer no meio do caminho. | O sorteio precisa dar um lugar diferente todas as vezes? | Antes de testar, pense na sua resposta e diga em voz alta. Depois, a experiência mostra se você acertou. Agora você vai | [curious] |

No adulto, manter toda a fala da professora. No kids, silenciar apenas o trecho marcado e substituir pelo áudio do personagem, sem sobrepor vozes.

**Falas da experiência:** consulte `zappy-etapas.json`. O vídeo convida; os controles e as comparações continuam livres na bancada.

**Recado na página (não gravar):** Sua vez! Observe onde cada sorteio coloca a pedra e como ela entra na tela. O Zappy te mostra o que testar, e você pode repetir quando quiser. Quando terminar, clique em Próxima parte.

## Parte 4. Crie os asteroides caindo

**Clipe:** `video-asteroide`

**Na tela:** A parte começa com o Estúdio expandido [expandir estúdio]. No "O relógio já espera um segundo e meio, mas seu então ainda está vazio. A experiência mostrou que um sorteio pode escolher o lugar de cada nova pedra. Agora coloque a criação dentro do relógio e faça o grupo cair e aparecer.", [apontar encaixe em "Se o estado do jogo é jogando dentro de A cada 1.5 segundos" no "então"]. No "Encontre a área Enquanto estiver rodando. Se ela não estiver aparecendo, arraste um espaço vazio entre os blocos até ela aparecer.", [arrastar até "Enquanto estiver rodando"]. No "Encontre A cada 1.5 segundos. Dentro dele, deixe o então de Se jogando à vista.", [apontar encaixe em "Se o estado do jogo é jogando dentro de A cada 1.5 segundos" no "então"]. No "Abra Jogo 2D, depois Grupos e depois Criar e percorrer. Pegue No grupo criar um sprite com imagem e encaixe nesse então.", [abrir categoria Jogo 2D > Grupos > Criar e percorrer] [encaixar "No grupo inimigos criar um sprite" em "Se o estado do jogo é jogando dentro de A cada 1.5 segundos" no "então"]. No "Troque o grupo inimigos por asteroides. Deixe vazio o nome opcional depois de chamado.", [trocar "inimigos" por "asteroides" em "No grupo inimigos criar um sprite"] [apontar bloco "No grupo asteroides criar um sprite"]. No "Deixe o número do x à vista. Abra Programação e depois Valores. Pegue número aleatório de até e solte sobre esse número.", [apontar bloco "No grupo asteroides criar um sprite"] [abrir categoria Programação > Valores] [soltar "número aleatório de" em cima do "100" em "No grupo asteroides criar um sprite"]. No "No sorteio, coloque 24 no primeiro número e 728 no segundo. Essa faixa deixa espaço para a largura do asteroide, nas duas beiradas.", [trocar "0" por "24" em "número aleatório de"] [trocar "100" por "728" em "número aleatório de"]. No "No y da criação, coloque menos 52. Na largura e na altura, coloque 48.", [trocar "100" por "-52" em "No grupo asteroides criar um sprite"] [trocar "32" por "48" em "No grupo asteroides criar um sprite"] [trocar "32" por "48" em "No grupo asteroides criar um sprite"]. No "Escolha a imagem asteroide-rocha-lunar. Deixe vx em zero. No último número, logo depois de vy, coloque 2, para a pedra seguir para baixo.", [trocar "inimigo" por "asteroide-rocha-lunar" em "No grupo asteroides criar um sprite"] aproximar o fim do bloco; editar somente o zero depois do rótulo vy para 2 e confirmar, em captura manual deste campo [apontar bloco "No grupo asteroides criar um sprite"]. No "Agora encontre A cada quadro do jogo. Dentro de Se jogando, deixe à vista o encaixe depois de Mover os sprites do grupo tiros e antes da retirada dos tiros.", [apontar abaixo de "Mover os sprites do grupo tiros"]. No "Abra Jogo 2D, depois Grupos e depois Movimento. Encaixe Mover os sprites do grupo usando suas velocidades nesse lugar. O grupo já é asteroides; conserve.", [abrir categoria Jogo 2D > Grupos > Movimento] [encaixar "Mover os sprites do grupo" abaixo de "Mover os sprites do grupo tiros"] [apontar bloco "Mover os sprites do grupo asteroides"]. No "Mais abaixo no laço de quadros, deixe à vista o encaixe depois de Limpar a tela e antes de Desenhar o grupo tiros, fora do Se.", [apontar abaixo de "Limpar a tela"]. No "Abra Jogo 2D, depois Grupos e depois Desenho e ordem. Encaixe Desenhar o grupo nesse lugar e conserve o nome asteroides.", [abrir categoria Jogo 2D > Grupos > Desenho e ordem] [encaixar "Desenhar o grupo" abaixo de "Limpar a tela"] [apontar bloco "Desenhar o grupo asteroides"]. No "Clique no jogo e pressione Enter. Espere alguns segundos: novas pedras entram por cima, em lugares sorteados, e caem. Dispare também. Por enquanto, os lasers atravessam os asteroides, porque o acerto ainda será programado.", [tocar prévia 400 300] [tecla Enter] aguardar 5 segundos na gravação, sem novo comando [tecla Space]. No "confira se ficou assim", mostrar os blocos usados nesta parte [mostrar blocos "No grupo asteroides criar um sprite", "Mover os sprites do grupo asteroides", "Desenhar o grupo asteroides"]. No "clique em Verificar projeto", verificar [verificar projeto]. No "Quando aparecer Objetivo cumprido!", voltar ao tamanho da aula [reduzir estúdio]. No "clique em Próxima parte", sair da parte [próxima parte].

**Fala para ElevenLabs:**

```text
[engaging, energetic, conversational voice] O relógio já espera um segundo e meio, mas seu então ainda está vazio. A experiência mostrou que um sorteio pode escolher o lugar de cada nova pedra. Agora coloque a criação dentro do relógio e faça o grupo cair e aparecer.

[confident, clear, unhurried voice] Encontre a área Enquanto estiver rodando. Se ela não estiver aparecendo, arraste um espaço vazio entre os blocos até ela aparecer.

[short pause]

[confident, clear, unhurried voice] Encontre A cada 1.5 segundos. Dentro dele, deixe o então de Se jogando à vista.

[short pause]

[confident, clear, unhurried voice] Abra Jogo 2D, depois Grupos e depois Criar e percorrer. Pegue No grupo criar um sprite com imagem e encaixe nesse então.

[short pause]

[confident, clear, unhurried voice] Troque o grupo inimigos por asteroides. Deixe vazio o nome opcional depois de chamado.

[short pause]

[confident, clear, unhurried voice] Deixe o número do x à vista. Abra Programação e depois Valores. Pegue número aleatório de até e solte sobre esse número.

[short pause]

[confident, clear, unhurried voice] No sorteio, coloque 24 no primeiro número e 728 no segundo. Essa faixa deixa espaço para a largura do asteroide, nas duas beiradas.

[short pause]

[confident, clear, unhurried voice] No y da criação, coloque menos 52. Na largura e na altura, coloque 48.

[short pause]

[confident, clear, unhurried voice] Escolha a imagem asteroide-rocha-lunar. Deixe vx em zero. No último número, logo depois de vy, coloque 2, para a pedra seguir para baixo.

[short pause]

[confident, clear, unhurried voice] Agora encontre A cada quadro do jogo. Dentro de Se jogando, deixe à vista o encaixe depois de Mover os sprites do grupo tiros e antes da retirada dos tiros.

[short pause]

[confident, clear, unhurried voice] Abra Jogo 2D, depois Grupos e depois Movimento. Encaixe Mover os sprites do grupo usando suas velocidades nesse lugar. O grupo já é asteroides; conserve.

[short pause]

[confident, clear, unhurried voice] Mais abaixo no laço de quadros, deixe à vista o encaixe depois de Limpar a tela e antes de Desenhar o grupo tiros, fora do Se.

[short pause]

[confident, clear, unhurried voice] Abra Jogo 2D, depois Grupos e depois Desenho e ordem. Encaixe Desenhar o grupo nesse lugar e conserve o nome asteroides.

[short pause]

[upbeat, encouraging voice] Clique no jogo e pressione Enter. Espere alguns segundos: novas pedras entram por cima, em lugares sorteados, e caem. Dispare também. Por enquanto, os lasers atravessam os asteroides, porque o acerto ainda será programado.

[reassuring, encouraging voice] Se algo não funcionou no seu jogo, volte aos blocos e confira se ficou assim: a criação está no relógio com a guarda jogando, usa asteroides, sorteia o x, começa acima e tem vy positivo; o mesmo grupo é movido e desenhado no laço de quadros. Depois de corrigir, teste de novo.

[engaging, energetic, conversational voice] Funcionou? Clique em Verificar projeto. Se faltar alguma coisa, corrija os blocos e clique novamente.

[engaging, energetic, conversational voice] Quando aparecer Objetivo cumprido!, clique em Próxima parte.
```

**Recado na página (não gravar):** Sua vez! Crie os asteroides caindo. Teste no seu jogo e clique em Verificar projeto. Quando aparecer Objetivo cumprido!, clique em Próxima parte.

## Parte 5. Retire os asteroides que escapam

**Clipe:** `video-retirada`

**Na tela:** A parte começa com o Estúdio expandido [expandir estúdio]. No "As pedras já entram e atravessam a tela. Você usou a retirada nos lasers para encerrar o caminho deles; agora faça o mesmo com os asteroides que passam por baixo.", [apontar prévia]. No "Encontre a área Enquanto estiver rodando. Se ela não estiver aparecendo, arraste um espaço vazio entre os blocos até ela aparecer.", [arrastar até "Enquanto estiver rodando"]. No "Dentro de A cada quadro do jogo e de Se jogando, deixe à vista o encaixe depois de Tirar do grupo tiros quem sair da tela.", [apontar abaixo de "Tirar do grupo tiros"]. No "Abra Jogo 2D, depois Grupos e depois Participação e limpeza. Encaixe outro Tirar do grupo quem sair da tela nesse lugar.", [abrir categoria Jogo 2D > Grupos > Participação e limpeza] [encaixar "Tirar do grupo asteroides quem sair da tela" abaixo de "Tirar do grupo tiros"]. No "O grupo já é asteroides. Conserve esse nome e escreva foraDaTela no nome depois de chamado.", [apontar bloco "Tirar do grupo asteroides"] [trocar "sprite" por "foraDaTela" em "Tirar do grupo asteroides"]. No "Deixe o fazer vazio. Neste jogo, um asteroide que escapa não tira vida e não dá ponto.", [apontar encaixe em "Tirar do grupo asteroides"]. No "Comece a partida e deixe algumas pedras atravessarem a tela. Elas continuam entrando por cima e saindo por baixo. A retirada é conferida nos blocos; ver uma pedra desaparecer da janela não mostra sozinho o que ficou no grupo.", [tocar prévia 400 300] [tecla Enter] aguardar 6 segundos na gravação, sem novo comando [apontar bloco "Tirar do grupo asteroides"]. No "confira se ficou assim", mostrar os blocos usados nesta parte [mostrar blocos "Tirar do grupo asteroides"]. No "clique em Verificar projeto", verificar [verificar projeto]. No "Quando aparecer Objetivo cumprido!", voltar ao tamanho da aula [reduzir estúdio]. No "clique em Próxima parte", sair da parte [próxima parte].

**Fala para ElevenLabs:**

```text
[engaging, energetic, conversational voice] As pedras já entram e atravessam a tela. Você usou a retirada nos lasers para encerrar o caminho deles; agora faça o mesmo com os asteroides que passam por baixo.

[confident, clear, unhurried voice] Encontre a área Enquanto estiver rodando. Se ela não estiver aparecendo, arraste um espaço vazio entre os blocos até ela aparecer.

[short pause]

[confident, clear, unhurried voice] Dentro de A cada quadro do jogo e de Se jogando, deixe à vista o encaixe depois de Tirar do grupo tiros quem sair da tela.

[short pause]

[confident, clear, unhurried voice] Abra Jogo 2D, depois Grupos e depois Participação e limpeza. Encaixe outro Tirar do grupo quem sair da tela nesse lugar.

[short pause]

[confident, clear, unhurried voice] O grupo já é asteroides. Conserve esse nome e escreva foraDaTela no nome depois de chamado.

[short pause]

[confident, clear, unhurried voice] Deixe o fazer vazio. Neste jogo, um asteroide que escapa não tira vida e não dá ponto.

[short pause]

[upbeat, encouraging voice] Comece a partida e deixe algumas pedras atravessarem a tela. Elas continuam entrando por cima e saindo por baixo. A retirada é conferida nos blocos; ver uma pedra desaparecer da janela não mostra sozinho o que ficou no grupo.

[reassuring, encouraging voice] Se algo não funcionou no seu jogo, volte aos blocos e confira se ficou assim: a retirada usa asteroides, vem depois do movimento dos grupos, está dentro de Se jogando e tem o fazer vazio. Depois de corrigir, teste de novo.

[engaging, energetic, conversational voice] Funcionou? Clique em Verificar projeto. Se faltar alguma coisa, corrija os blocos e clique novamente.

[engaging, energetic, conversational voice] Quando aparecer Objetivo cumprido!, clique em Próxima parte.
```

**Recado na página (não gravar):** Sua vez! Retire os asteroides que escapam. Teste no seu jogo e clique em Verificar projeto. Quando aparecer Objetivo cumprido!, clique em Próxima parte.

## Parte 6. Confira tiros e asteroides

Quiz sem vídeo, com resposta corrigida no servidor, explicação e nova tentativa.

**Recado na página (não gravar):** Confira o que ficou claro no seu jogo. Escolha uma resposta em cada pergunta e veja a explicação. Você pode corrigir e tentar de novo. Quando terminar, clique em Próxima parte.

## Parte 7. Teste e envie a chuva de asteroides

**Clipe:** `video-entrega`

**Na tela:** A parte começa com o Estúdio expandido [expandir estúdio]. No "Sua rota agora recebe asteroides. Confira como eles chegam antes de enviar esta versão.", [apontar prévia]. No "Clique em Rodar de novo e observe a abertura por alguns segundos.", [rodar de novo] aguardar 3 segundos na gravação, sem novo comando. No "Nenhuma pedra deve nascer na abertura. Clique no jogo, pressione Enter e espere a chegada dos asteroides.", [tocar prévia 400 300] [tecla Enter] aguardar 4 segundos na gravação, sem novo comando. No "Observe o espaço de tempo entre os nascimentos e os lugares de entrada. O sorteio pode repetir um lugar; ele não precisa alternar entre esquerda e direita.", [apontar prévia] aguardar 4 segundos na gravação, sem novo comando. No "Dispare e acompanhe uma pedra até ela sair por baixo. Nesta versão, o tiro ainda atravessa a pedra, e a saída da tela não tem outra reação.", [tecla Space] aguardar 5 segundos na gravação, sem novo comando. No "confira se ficou assim", mostrar os blocos usados nesta parte [mostrar blocos "Tirar do grupo asteroides"]. No "clique em Verificar projeto", verificar [verificar projeto]. No "clique em Enviar meu projeto", iniciar o envio e confirmar [enviar projeto]. No "Quando aparecer Projeto enviado!", voltar ao tamanho da aula [reduzir estúdio]. No "clique em Concluir aula", sair da parte [concluir aula].

**Fala para ElevenLabs:**

```text
[engaging, energetic, conversational voice] Sua rota agora recebe asteroides. Confira como eles chegam antes de enviar esta versão.

[confident, clear, unhurried voice] Clique em Rodar de novo e observe a abertura por alguns segundos.

[short pause]

[upbeat, encouraging voice] Nenhuma pedra deve nascer na abertura. Clique no jogo, pressione Enter e espere a chegada dos asteroides.

[upbeat, encouraging voice] Observe o espaço de tempo entre os nascimentos e os lugares de entrada. O sorteio pode repetir um lugar; ele não precisa alternar entre esquerda e direita.

[upbeat, encouraging voice] Dispare e acompanhe uma pedra até ela sair por baixo. Nesta versão, o tiro ainda atravessa a pedra, e a saída da tela não tem outra reação.

[reassuring, encouraging voice] Se algo não funcionou no seu jogo, volte aos blocos e confira se ficou assim: o grupo e o relógio estão nos lugares certos, as pedras nascem somente em jogando, descem e têm a retirada fora da tela. Depois de corrigir, teste de novo.

[engaging, energetic, conversational voice] Funcionou? Clique em Verificar projeto. Se faltar alguma coisa, corrija os blocos e clique novamente.

[engaging, energetic, conversational voice] Quando aparecer Objetivo cumprido!, clique em Enviar meu projeto e confirme em Enviar.

[pleased, lively voice] Você construiu a chegada dos asteroides, com ritmo e posições sorteadas!

[engaging, energetic, conversational voice] Quando aparecer Projeto enviado!, clique em Concluir aula.
```

**Recado na página (não gravar):** Hora de conferir e enviar! Teste e envie a chuva de asteroides. Teste no seu jogo e clique em Verificar projeto. Depois, envie o projeto e confirme em Enviar. Quando aparecer Projeto enviado!, clique em Concluir aula.
