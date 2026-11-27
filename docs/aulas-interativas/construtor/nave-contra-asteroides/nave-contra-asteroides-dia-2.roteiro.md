# Roteiro de produção · Faça os lasers voar e sair do jogo

A professora grava o master integral. Na edição kids, Debinha substitui somente os parágrafos das tabelas de substituição, sem voz sobreposta. A edição adulta conserva o master. As falas prontas e o índice de edição são derivados desta fonte.

Montagem guiada completa no vídeo, um gesto por vez, deixando o destino visível antes de pegar a peça. As telas e o reinício são infraestrutura preparada; as partes ensinam as regras da partida. A personalização muda a aparência.

**Antes de gravar:** use uma sessão de ensaio sem envio anterior, carregue a entrada da parte e dê foco ao jogo antes das teclas. Mostre Objetivo cumprido! e Projeto enviado! somente quando aparecerem. Os tempos de tecla são estimativas a confirmar no Verificar plano. Gravação e publicação pendentes.

## Parte 1. Para que lado o laser anda?

**Clipe:** `video-direcao-do-tiro`

**Na tela:** A cena fica parada enquanto a edição ilustra a comparação narrada, sem mostrar controles nem resolver descobertas. No "Agora você vai explorar essa ideia na experiência", ampliar a experiência [ampliar experiência]. No "O Zappy vai te mostrando", apontar a fala do Zappy [apontar zappy]. No "Quando terminar", voltar ao tamanho da aula [voltar à aula]. No "clique em Próxima parte", avançar [próxima parte].

**Fala para ElevenLabs:**

```text
[engaging, energetic, conversational voice] Seu laser precisa seguir para cima. Num elevador, subir e descer são sentidos diferentes, mesmo quando o tamanho de cada passo é parecido.

[engaging, energetic, conversational voice] Na tela 2D, o y cresce de cima para baixo. A velocidade vertical diz quanto esse y muda em cada passinho. O sinal do número participa dessa direção.

[curious] Um número negativo deixa o laser mais fraco?

[engaging, energetic, conversational voice] Antes de testar, pense na sua resposta e diga em voz alta. Depois, a experiência mostra se você acertou.

[upbeat, encouraging voice] Agora você vai explorar essa ideia na experiência. O Zappy vai te mostrando o que testar, e você pode repetir quando quiser. Quando terminar, clique em Próxima parte.
```

**Substituições na edição kids:**

| ID | Personagem | Ocorrência | Âncora anterior | Fala exata substituída | Âncora posterior | Tags |
| --- | --- | --- | --- | --- | --- | --- |
| video-direcao-do-tiro-K1 | Debinha | 1 | para baixo. A velocidade vertical diz quanto esse y muda em cada passinho. O sinal do número participa dessa direção. | Um número negativo deixa o laser mais fraco? | Antes de testar, pense na sua resposta e diga em voz alta. Depois, a experiência mostra se você acertou. Agora você vai | [curious] |

No adulto, manter toda a fala da professora. No kids, silenciar apenas o trecho marcado e substituir pelo áudio do personagem, sem sobrepor vozes.

**Falas da experiência:** consulte `zappy-etapas.json`. O vídeo convida; os controles e as comparações continuam livres na bancada.

**Recado na página (não gravar):** Sua vez! Compare o sentido do laser com velocidades verticais positivas e negativas. O Zappy te mostra o que testar, e você pode repetir quando quiser. Quando terminar, clique em Próxima parte.

## Parte 2. Faça os lasers voar

**Clipe:** `video-tiros-voam`

**Na tela:** A parte começa com o Estúdio expandido [expandir estúdio]. No "Comece o jogo e dispare. O laser aparece, mas continua parado. A experiência da parte anterior mostrou o sinal que faz o y diminuir. Agora dê essa velocidade aos lasers e faça o grupo se mover em cada quadro.", [tocar prévia 400 300] [tecla Enter] [tecla Space]. No "Encontre a área Quando acontecer. Se ela não estiver aparecendo, arraste um espaço vazio entre os blocos até ela aparecer.", [arrastar até "Quando acontecer"]. No "No bloco que cria o laser, encontre o último número, logo depois de vy. Troque esse zero por menos 7. Deixe vx em zero, porque o laser não deve andar para os lados.", aproximar o fim de No grupo tiros criar um sprite; editar somente o zero depois do rótulo vy para -7 e confirmar, em captura manual deste campo [apontar bloco "No grupo tiros criar um sprite"]. No "Encontre a área Enquanto estiver rodando. Se ela não estiver aparecendo, arraste um espaço vazio entre os blocos até ela aparecer.", [arrastar até "Enquanto estiver rodando"]. No "Dentro de A cada quadro do jogo, encontre Se jogando e deixe o encaixe depois do limite da nave à vista.", [apontar abaixo de "Manter o sprite nave"]. No "Abra Jogo 2D, depois Grupos e depois Movimento. Pegue Mover os sprites do grupo usando suas velocidades e encaixe nesse lugar.", [abrir categoria Jogo 2D > Grupos > Movimento] [encaixar "Mover os sprites do grupo" abaixo de "Manter o sprite nave"]. No "O grupo chega como asteroides. Clique nesse nome e escolha tiros.", [trocar "asteroides" por "tiros" em "Mover os sprites do grupo"]. No "Comece o jogo e toque em Espaço. O laser deve subir. Segure Espaço por um instante: esse toque cria um laser, sem uma rajada automática. Solte e toque novamente para criar outro.", [tocar prévia 400 300] [tecla Enter] [segurar tecla Space por 0,6 s]  [tecla Space]. No "confira se ficou assim", mostrar os blocos usados nesta parte [mostrar blocos "No grupo tiros criar um sprite", "Mover os sprites do grupo tiros"]. No "clique em Verificar projeto", verificar [verificar projeto]. No "Quando aparecer Objetivo cumprido!", voltar ao tamanho da aula [reduzir estúdio]. No "clique em Próxima parte", sair da parte [próxima parte].

**Fala para ElevenLabs:**

```text
[engaging, energetic, conversational voice] Comece o jogo e dispare. O laser aparece, mas continua parado. A experiência da parte anterior mostrou o sinal que faz o y diminuir. Agora dê essa velocidade aos lasers e faça o grupo se mover em cada quadro.

[confident, clear, unhurried voice] Encontre a área Quando acontecer. Se ela não estiver aparecendo, arraste um espaço vazio entre os blocos até ela aparecer.

[short pause]

[confident, clear, unhurried voice] No bloco que cria o laser, encontre o último número, logo depois de vy. Troque esse zero por menos 7. Deixe vx em zero, porque o laser não deve andar para os lados.

[short pause]

[confident, clear, unhurried voice] Encontre a área Enquanto estiver rodando. Se ela não estiver aparecendo, arraste um espaço vazio entre os blocos até ela aparecer.

[short pause]

[confident, clear, unhurried voice] Dentro de A cada quadro do jogo, encontre Se jogando e deixe o encaixe depois do limite da nave à vista.

[short pause]

[confident, clear, unhurried voice] Abra Jogo 2D, depois Grupos e depois Movimento. Pegue Mover os sprites do grupo usando suas velocidades e encaixe nesse lugar.

[short pause]

[confident, clear, unhurried voice] O grupo chega como asteroides. Clique nesse nome e escolha tiros.

[short pause]

[upbeat, encouraging voice] Comece o jogo e toque em Espaço. O laser deve subir. Segure Espaço por um instante: esse toque cria um laser, sem uma rajada automática. Solte e toque novamente para criar outro.

[reassuring, encouraging voice] Se algo não funcionou no seu jogo, volte aos blocos e confira se ficou assim: o laser tem vx zero e vy menos 7, o movimento do grupo usa tiros e fica dentro de Se jogando. Depois de corrigir, teste de novo.

[engaging, energetic, conversational voice] Funcionou? Clique em Verificar projeto. Se faltar alguma coisa, corrija os blocos e clique novamente.

[engaging, energetic, conversational voice] Quando aparecer Objetivo cumprido!, clique em Próxima parte.
```

**Recado na página (não gravar):** Sua vez! Faça os lasers voar. Teste no seu jogo e clique em Verificar projeto. Quando aparecer Objetivo cumprido!, clique em Próxima parte.

## Parte 3. Retire os lasers que saíram

**Clipe:** `video-faxina`

**Na tela:** A parte começa com o Estúdio expandido [expandir estúdio]. No "Os lasers já atravessam a tela. Lembra da experiência Objetos que entram e saem? Sumir da janela não retirava um objeto do grupo. Agora acrescente a retirada de quem terminou o caminho.", [apontar prévia]. No "Encontre a área Enquanto estiver rodando. Se ela não estiver aparecendo, arraste um espaço vazio entre os blocos até ela aparecer.", [arrastar até "Enquanto estiver rodando"]. No "Dentro de Se jogando, deixe à vista o encaixe depois de Mover os sprites do grupo tiros.", [apontar abaixo de "Mover os sprites do grupo tiros"]. No "Abra Jogo 2D, depois Grupos e depois Participação e limpeza. Pegue Tirar do grupo quem sair da tela e encaixe nesse lugar.", [abrir categoria Jogo 2D > Grupos > Participação e limpeza] [encaixar "Tirar do grupo asteroides quem sair da tela" abaixo de "Mover os sprites do grupo tiros"]. No "Troque o grupo asteroides por tiros. No nome depois de chamado, escreva foraDaTela.", [trocar "asteroides" por "tiros" em "Tirar do grupo"] [trocar "sprite" por "foraDaTela" em "Tirar do grupo tiros"]. No "Deixe o fazer desse bloco vazio. Retirar já é a ação do bloco; não há outra resposta para executar quando um laser sai.", [apontar encaixe em "Tirar do grupo tiros"]. No "Comece o jogo, dispare alguns lasers e espere eles atravessarem a tela. O voo continua igual. A retirada do grupo acontece nos bastidores e será conferida em Verificar projeto.", [tocar prévia 400 300] [tecla Enter] [tecla Space] aguardar 0,2 segundos na gravação, sem novo comando [tecla Space] aguardar 3 segundos na gravação, sem novo comando. No "confira se ficou assim", mostrar os blocos usados nesta parte [mostrar blocos "Tirar do grupo tiros"]. No "clique em Verificar projeto", verificar [verificar projeto]. No "Quando aparecer Objetivo cumprido!", voltar ao tamanho da aula [reduzir estúdio]. No "clique em Próxima parte", sair da parte [próxima parte].

**Fala para ElevenLabs:**

```text
[engaging, energetic, conversational voice] Os lasers já atravessam a tela. Lembra da experiência Objetos que entram e saem? Sumir da janela não retirava um objeto do grupo. Agora acrescente a retirada de quem terminou o caminho.

[confident, clear, unhurried voice] Encontre a área Enquanto estiver rodando. Se ela não estiver aparecendo, arraste um espaço vazio entre os blocos até ela aparecer.

[short pause]

[confident, clear, unhurried voice] Dentro de Se jogando, deixe à vista o encaixe depois de Mover os sprites do grupo tiros.

[short pause]

[confident, clear, unhurried voice] Abra Jogo 2D, depois Grupos e depois Participação e limpeza. Pegue Tirar do grupo quem sair da tela e encaixe nesse lugar.

[short pause]

[confident, clear, unhurried voice] Troque o grupo asteroides por tiros. No nome depois de chamado, escreva foraDaTela.

[short pause]

[confident, clear, unhurried voice] Deixe o fazer desse bloco vazio. Retirar já é a ação do bloco; não há outra resposta para executar quando um laser sai.

[short pause]

[upbeat, encouraging voice] Comece o jogo, dispare alguns lasers e espere eles atravessarem a tela. O voo continua igual. A retirada do grupo acontece nos bastidores e será conferida em Verificar projeto.

[reassuring, encouraging voice] Se algo não funcionou no seu jogo, volte aos blocos e confira se ficou assim: a retirada usa o grupo tiros, está depois de mover esse grupo e tem o fazer vazio. Depois de corrigir, teste de novo.

[engaging, energetic, conversational voice] Funcionou? Clique em Verificar projeto. Se faltar alguma coisa, corrija os blocos e clique novamente.

[engaging, energetic, conversational voice] Quando aparecer Objetivo cumprido!, clique em Próxima parte.
```

**Recado na página (não gravar):** Sua vez! Retire os lasers que saíram. Teste no seu jogo e clique em Verificar projeto. Quando aparecer Objetivo cumprido!, clique em Próxima parte.

## Parte 4. Teste e envie os lasers

**Clipe:** `video-entrega`

**Na tela:** A parte começa com o Estúdio expandido [expandir estúdio]. No "Seu disparo já tem momento, origem e caminho. Faça uma sequência curta para conferir essas três coisas juntas.", [apontar prévia]. No "Clique em Rodar de novo para começar o teste na abertura.", [rodar de novo]. No "Antes de Enter, toque em Espaço. Nenhum laser deve nascer. Pressione Enter e dispare uma vez no centro.", [tocar prévia 400 300] [tecla Space] [tecla Enter] [tecla Space]. No "Mova para a esquerda e dispare. Depois vá para a direita e dispare novamente. Os novos lasers devem sair da nave e subir.", [segurar tecla ArrowLeft por 0,5 s]  [tecla Space] [segurar tecla ArrowRight por 1 s]  [tecla Space]. No "Espere os lasers saírem da tela e confira o bloco que os retira do grupo. A verificação também vai acompanhar essa retirada.", aguardar 4 segundos na gravação, sem novo comando [apontar bloco "Tirar do grupo tiros"]. No "confira se ficou assim", mostrar os blocos usados nesta parte [mostrar blocos "Tirar do grupo tiros"]. No "clique em Verificar projeto", verificar [verificar projeto]. No "clique em Enviar meu projeto", iniciar o envio e confirmar [enviar projeto]. No "Quando aparecer Projeto enviado!", voltar ao tamanho da aula [reduzir estúdio]. No "clique em Concluir aula", sair da parte [concluir aula].

**Fala para ElevenLabs:**

```text
[engaging, energetic, conversational voice] Seu disparo já tem momento, origem e caminho. Faça uma sequência curta para conferir essas três coisas juntas.

[confident, clear, unhurried voice] Clique em Rodar de novo para começar o teste na abertura.

[short pause]

[upbeat, encouraging voice] Antes de Enter, toque em Espaço. Nenhum laser deve nascer. Pressione Enter e dispare uma vez no centro.

[upbeat, encouraging voice] Mova para a esquerda e dispare. Depois vá para a direita e dispare novamente. Os novos lasers devem sair da nave e subir.

[upbeat, encouraging voice] Espere os lasers saírem da tela e confira o bloco que os retira do grupo. A verificação também vai acompanhar essa retirada.

[reassuring, encouraging voice] Se algo não funcionou no seu jogo, volte aos blocos e confira se ficou assim: Espaço tem a guarda jogando, a origem lê a nave, vy é negativo, o grupo é movido, desenhado e tem retirada fora da tela. Depois de corrigir, teste de novo.

[engaging, energetic, conversational voice] Funcionou? Clique em Verificar projeto. Se faltar alguma coisa, corrija os blocos e clique novamente.

[engaging, energetic, conversational voice] Quando aparecer Objetivo cumprido!, clique em Enviar meu projeto e confirme em Enviar.

[pleased, lively voice] Você programou lasers que saem da sua nave, voam e deixam a partida ao terminar o caminho!

[engaging, energetic, conversational voice] Quando aparecer Projeto enviado!, clique em Concluir aula.
```

**Recado na página (não gravar):** Hora de conferir e enviar! Teste e envie os lasers. Teste no seu jogo e clique em Verificar projeto. Depois, envie o projeto e confirme em Enviar. Quando aparecer Projeto enviado!, clique em Concluir aula.
