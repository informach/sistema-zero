# Roteiro de produção · Confira o início e escolha o visual

A professora grava o master integral. Na edição kids, Dedé substitui somente os parágrafos das tabelas de substituição, sem voz sobreposta. A edição adulta conserva o master. As falas prontas e o índice de edição são derivados desta fonte.

Montagem guiada completa no vídeo, um gesto por vez, deixando o destino visível antes de pegar a peça. As telas e o reinício são infraestrutura preparada; as partes ensinam as regras da partida. A personalização muda a aparência.

**Antes de gravar:** use uma sessão de ensaio sem envio anterior, carregue a entrada da parte e dê foco ao jogo antes das teclas. Mostre Objetivo cumprido! e Projeto enviado! somente quando aparecerem. Os tempos de tecla são estimativas a confirmar no Verificar plano. Gravação e publicação pendentes.

## Parte 1. A hora de jogar

**Clipe:** `video-estado-do-jogo`

**Na tela:** A cena fica parada enquanto a edição ilustra a comparação narrada, sem mostrar controles nem resolver descobertas. No "Agora você vai explorar essa ideia na experiência", ampliar a experiência [ampliar experiência]. No "O Zappy vai te mostrando", apontar a fala do Zappy [apontar zappy]. No "Quando terminar", voltar ao tamanho da aula [voltar à aula]. No "clique em Próxima parte", avançar [próxima parte].

**Fala para ElevenLabs:**

```text
[engaging, energetic, conversational voice] Lembra da placa de aberto ou fechado da primeira aula? A porta da loja pode ser a mesma, mas a placa informa se já é hora de entrar.

[engaging, energetic, conversational voice] No jogo, essa placa é o estado. A abertura é um momento, e a partida em andamento é outro. Cada regra nova que você montou ganhou um Se jogando, que confere a placa antes de liberar movimento, tiros e novas pedras.

[curious] O jogo pode desenhar a nave mesmo quando ela ainda não pode se mover?

[engaging, energetic, conversational voice] Antes de testar, pense na sua resposta e diga em voz alta. Depois, a experiência mostra se você acertou.

[upbeat, encouraging voice] Agora você vai explorar essa ideia na experiência. O Zappy vai te mostrando o que testar, e você pode repetir quando quiser. Quando terminar, clique em Próxima parte.
```

**Substituições na edição kids:**

| ID | Personagem | Ocorrência | Âncora anterior | Fala exata substituída | Âncora posterior | Tags |
| --- | --- | --- | --- | --- | --- | --- |
| video-estado-do-jogo-K1 | Dedé | 1 | regra nova que você montou ganhou um Se jogando, que confere a placa antes de liberar movimento, tiros e novas pedras. | O jogo pode desenhar a nave mesmo quando ela ainda não pode se mover? | Antes de testar, pense na sua resposta e diga em voz alta. Depois, a experiência mostra se você acertou. Agora você vai | [curious] |

No adulto, manter toda a fala da professora. No kids, silenciar apenas o trecho marcado e substituir pelo áudio do personagem, sem sobrepor vozes.

**Falas da experiência:** consulte `zappy-etapas.json`. O vídeo convida; os controles e as comparações continuam livres na bancada.

**Recado na página (não gravar):** Sua vez! Compare as ações antes e depois de a partida começar. O Zappy te mostra o que testar, e você pode repetir quando quiser. Quando terminar, clique em Próxima parte.

## Parte 2. Investigue: e se o laser não esperasse a partida?

**Clipe:** `video-teste-inicio`

**Na tela:** A parte começa com o Estúdio expandido [expandir estúdio]. No "Agora você vai fazer uma investigação de verdade: tirar uma guarda, ver o que quebra e consertar.", [apontar bloco "Quando apertar a tecla barra de espaço"]. No "Encontre a área Quando acontecer. Se ela não estiver aparecendo, arraste um espaço vazio entre os blocos até ela aparecer.", [arrastar até "Quando acontecer"]. No "Encontre o evento de Espaço. Dentro dele, o Se jogando guarda a criação do laser e o som.", [mostrar blocos "Quando apertar a tecla barra de espaço", "o estado do jogo é jogando dentro de Quando apertar a tecla barra de espaço"]. No "Arraste No grupo tiros criar um sprite para fora do então e solte logo abaixo do Se, ainda dentro do evento. O som vem junto, grudado embaixo.", [encaixar "No grupo tiros criar um sprite" abaixo de "Se o estado do jogo é jogando dentro de Quando apertar a tecla barra de espaço"]. No "Clique em Rodar de novo. Na abertura, antes do Enter, aperte Espaço algumas vezes. O que aconteceu? O laser sai mesmo com a placa dizendo início: sem a guarda, a regra não espera a partida.", [rodar de novo] [tocar prévia 400 300] [tecla Space] [tecla Space] [apontar prévia 400 300]. No "Agora conserte. Arraste No grupo tiros criar um sprite de volta para dentro do então do Se jogando.", [encaixar "No grupo tiros criar um sprite" em "Se o estado do jogo é jogando dentro de Quando apertar a tecla barra de espaço" no "então"]. No "Encontre a área Enquanto estiver rodando. Se ela não estiver aparecendo, arraste um espaço vazio entre os blocos até ela aparecer.", [arrastar até "Enquanto estiver rodando"]. No "Confira também as outras duas guardas: o Se jogando de A cada quadro do jogo, com o movimento e as colisões, e o Se jogando do relógio A cada 1,5 segundos, com o asteroide.", [mostrar blocos "A cada quadro do jogo", "o estado do jogo é jogando"] [mostrar blocos "A cada 1.5 segundos", "o estado do jogo é jogando dentro de A cada"]. No "Clique em Rodar de novo para voltar à abertura.", [rodar de novo]. No "Antes de pressionar Enter, segure uma seta, toque em Espaço e espere um pouco. Agora a abertura espera de verdade: a nave não anda, não sai laser e não nasce pedra.", [tocar prévia 400 300] [segurar tecla ArrowRight por 0,4 s] [tecla Space] [apontar prévia 400 240]. No "Agora pressione Enter. Confira que as setas, o laser e as pedras funcionam durante a partida.", [tecla Enter] [segurar tecla ArrowRight por 0,4 s] [tecla Space] [apontar prévia 400 240]. No "confira se ficou assim", mostrar os blocos usados nesta parte [mostrar blocos "A cada quadro do jogo", "Quando apertar a tecla barra de espaço", "A cada 1.5 segundos"]. No "clique em Verificar projeto", verificar [verificar projeto]. No "Quando aparecer Objetivo cumprido!", voltar ao tamanho da aula [reduzir estúdio]. No "clique em Próxima parte", sair da parte [próxima parte].

**Fala para ElevenLabs:**

```text
[engaging, energetic, conversational voice] Agora você vai fazer uma investigação de verdade: tirar uma guarda, ver o que quebra e consertar.

[confident, clear, unhurried voice] Encontre a área Quando acontecer. Se ela não estiver aparecendo, arraste um espaço vazio entre os blocos até ela aparecer.

[short pause]

[confident, clear, unhurried voice] Encontre o evento de Espaço. Dentro dele, o Se jogando guarda a criação do laser e o som.

[short pause]

[confident, clear, unhurried voice] Arraste No grupo tiros criar um sprite para fora do então e solte logo abaixo do Se, ainda dentro do evento. O som vem junto, grudado embaixo.

[short pause]

[confident, clear, unhurried voice] Clique em Rodar de novo. Na abertura, antes do Enter, aperte Espaço algumas vezes. O que aconteceu? O laser sai mesmo com a placa dizendo início: sem a guarda, a regra não espera a partida.

[short pause]

[confident, clear, unhurried voice] Agora conserte. Arraste No grupo tiros criar um sprite de volta para dentro do então do Se jogando.

[short pause]

[confident, clear, unhurried voice] Encontre a área Enquanto estiver rodando. Se ela não estiver aparecendo, arraste um espaço vazio entre os blocos até ela aparecer.

[short pause]

[confident, clear, unhurried voice] Confira também as outras duas guardas: o Se jogando de A cada quadro do jogo, com o movimento e as colisões, e o Se jogando do relógio A cada 1,5 segundos, com o asteroide.

[short pause]

[confident, clear, unhurried voice] Clique em Rodar de novo para voltar à abertura.

[short pause]

[upbeat, encouraging voice] Antes de pressionar Enter, segure uma seta, toque em Espaço e espere um pouco. Agora a abertura espera de verdade: a nave não anda, não sai laser e não nasce pedra.

[upbeat, encouraging voice] Agora pressione Enter. Confira que as setas, o laser e as pedras funcionam durante a partida.

[reassuring, encouraging voice] Se algo não funcionou no seu jogo, volte aos blocos e confira se ficou assim: cada grupo de ações está dentro do seu Se jogando: o dos quadros, o do Espaço e o do relógio. Depois de corrigir, teste de novo.

[engaging, energetic, conversational voice] Funcionou? Clique em Verificar projeto. Se faltar alguma coisa, corrija os blocos e clique novamente.

[engaging, energetic, conversational voice] Quando aparecer Objetivo cumprido!, clique em Próxima parte.
```

**Recado na página (não gravar):** Sua vez! Investigue: e se o laser não esperasse a partida?. Teste no seu jogo e clique em Verificar projeto. Quando aparecer Objetivo cumprido!, clique em Próxima parte.

## Parte 3. Escolha a aparência das pedras e dos lasers

**Clipe:** `video-aparencias`

**Na tela:** A parte começa com o Estúdio expandido [expandir estúdio]. No "Agora a combinação visual pode ficar toda do seu jeito. As três imagens de cada elemento ocupam a mesma caixa; escolha o desenho que você gosta e conserve os números da partida.", [apontar prévia 400 240]. No "Encontre a área Enquanto estiver rodando. Se ela não estiver aparecendo, arraste um espaço vazio entre os blocos até ela aparecer.", [arrastar até "Enquanto estiver rodando"]. No "No relógio de um segundo e meio, encontre o bloco que cria um sprite no grupo asteroides. Clique na imagem, como asteroide-rocha-lunar, e escolha rocha lunar, gelo azul ou cristal violeta. Você também pode manter a imagem atual.", [abrir campo "asteroide-rocha-lunar" em "No grupo asteroides criar um sprite"] [escolher "asteroide-cristal-violeta" em "No grupo asteroides criar um sprite"]. No "Conserve largura 48, altura 48, o sorteio da posição, a velocidade e o intervalo. A sua escolha muda só a aparência.", [apontar bloco "No grupo asteroides criar um sprite"]. No "Encontre a área Quando acontecer. Se ela não estiver aparecendo, arraste um espaço vazio entre os blocos até ela aparecer.", [arrastar até "Quando acontecer"]. No "No evento de Espaço, encontre o bloco que cria o sprite no grupo tiros. Clique na imagem, como laser-ciano, e escolha a aparência que quiser entre os três lasers. Manter o atual também vale.", [abrir campo "laser-ciano" em "No grupo tiros criar um sprite"] [escolher "laser-dourado" em "No grupo tiros criar um sprite"]. No "Conserve largura 10, altura 28, a origem lida da nave e as velocidades. Se quiser rever nave e cenário, os dois campos de imagem continuam em Ao iniciar.", [apontar bloco "No grupo tiros criar um sprite"] [arrastar até "Ao iniciar"]. No "Comece a partida e confira sua combinação. Mova, dispare e acerte uma pedra. O jogo continua com as mesmas regras, enquanto os desenhos mostram suas escolhas.", [tocar prévia 400 300] [tecla Enter] [segurar tecla ArrowRight por 0,4 s] [tecla Space] [apontar prévia 400 240]. No "confira se ficou assim", mostrar os blocos usados nesta parte [mostrar blocos "No grupo tiros criar um sprite", "No grupo asteroides criar um sprite"]. No "clique em Verificar projeto", verificar [verificar projeto]. No "Quando aparecer Objetivo cumprido!", voltar ao tamanho da aula [reduzir estúdio]. No "clique em Próxima parte", sair da parte [próxima parte].

**Fala para ElevenLabs:**

```text
[engaging, energetic, conversational voice] Agora a combinação visual pode ficar toda do seu jeito. As três imagens de cada elemento ocupam a mesma caixa; escolha o desenho que você gosta e conserve os números da partida.

[confident, clear, unhurried voice] Encontre a área Enquanto estiver rodando. Se ela não estiver aparecendo, arraste um espaço vazio entre os blocos até ela aparecer.

[short pause]

[confident, clear, unhurried voice] No relógio de um segundo e meio, encontre o bloco que cria um sprite no grupo asteroides. Clique na imagem, como asteroide-rocha-lunar, e escolha rocha lunar, gelo azul ou cristal violeta. Você também pode manter a imagem atual.

[short pause]

[confident, clear, unhurried voice] Conserve largura 48, altura 48, o sorteio da posição, a velocidade e o intervalo. A sua escolha muda só a aparência.

[short pause]

[confident, clear, unhurried voice] Encontre a área Quando acontecer. Se ela não estiver aparecendo, arraste um espaço vazio entre os blocos até ela aparecer.

[short pause]

[confident, clear, unhurried voice] No evento de Espaço, encontre o bloco que cria o sprite no grupo tiros. Clique na imagem, como laser-ciano, e escolha a aparência que quiser entre os três lasers. Manter o atual também vale.

[short pause]

[confident, clear, unhurried voice] Conserve largura 10, altura 28, a origem lida da nave e as velocidades. Se quiser rever nave e cenário, os dois campos de imagem continuam em Ao iniciar.

[short pause]

[upbeat, encouraging voice] Comece a partida e confira sua combinação. Mova, dispare e acerte uma pedra. O jogo continua com as mesmas regras, enquanto os desenhos mostram suas escolhas.

[reassuring, encouraging voice] Se algo não funcionou no seu jogo, volte aos blocos e confira se ficou assim: as trocas ficaram nos campos das imagens, e os nomes, tamanhos, posições, velocidades e intervalo continuam como você construiu. Depois de corrigir, teste de novo.

[engaging, energetic, conversational voice] Funcionou? Clique em Verificar projeto. Se faltar alguma coisa, corrija os blocos e clique novamente.

[engaging, energetic, conversational voice] Quando aparecer Objetivo cumprido!, clique em Próxima parte.
```

**Recado na página (não gravar):** Sua vez! Escolha a aparência das pedras e dos lasers. Teste no seu jogo e clique em Verificar projeto. Quando aparecer Objetivo cumprido!, clique em Próxima parte.

## Parte 4. Confira o começo e envie seu visual

**Clipe:** `video-entrega`

**Na tela:** A parte começa com o Estúdio expandido [expandir estúdio]. No "Sua partida espera a hora certa e ganhou a combinação de imagens que você escolheu. Confira e envie esta versão.", [apontar prévia 400 240]. No "Clique em Rodar de novo. Confira a abertura e pressione Enter para entrar na partida.", [rodar de novo] [tecla Enter]. No "Confira as imagens da nave, do cenário, das pedras e dos lasers. Teste movimento, um acerto que soma ponto e uma batida que tira vida. As regras continuam funcionando juntas.", [apontar prévia 400 240] [tecla Space]. No "confira se ficou assim", mostrar os blocos usados nesta parte [mostrar blocos "No grupo tiros criar um sprite", "No grupo asteroides criar um sprite"]. No "clique em Verificar projeto", verificar [verificar projeto]. No "clique em Enviar meu projeto", iniciar o envio e confirmar [enviar projeto]. No "Quando aparecer Projeto enviado!", voltar ao tamanho da aula [reduzir estúdio]. No "clique em Concluir aula", sair da parte [concluir aula].

**Fala para ElevenLabs:**

```text
[engaging, energetic, conversational voice] Sua partida espera a hora certa e ganhou a combinação de imagens que você escolheu. Confira e envie esta versão.

[confident, clear, unhurried voice] Clique em Rodar de novo. Confira a abertura e pressione Enter para entrar na partida.

[short pause]

[upbeat, encouraging voice] Confira as imagens da nave, do cenário, das pedras e dos lasers. Teste movimento, um acerto que soma ponto e uma batida que tira vida. As regras continuam funcionando juntas.

[reassuring, encouraging voice] Se algo não funcionou no seu jogo, volte aos blocos e confira se ficou assim: os três lugares de ação continuam protegidos por Se jogando e a personalização ficou nas imagens. Depois de corrigir, teste de novo.

[engaging, energetic, conversational voice] Funcionou? Clique em Verificar projeto. Se faltar alguma coisa, corrija os blocos e clique novamente.

[engaging, energetic, conversational voice] Quando aparecer Objetivo cumprido!, clique em Enviar meu projeto e confirme em Enviar.

[pleased, lively voice] Você conferiu o início e deu sua identidade visual à partida!

[engaging, energetic, conversational voice] Quando aparecer Projeto enviado!, clique em Concluir aula.
```

**Recado na página (não gravar):** Hora de conferir e enviar! Confira o começo e envie seu visual. Teste no seu jogo e clique em Verificar projeto. Depois, envie o projeto e confirme em Enviar. Quando aparecer Projeto enviado!, clique em Concluir aula.
