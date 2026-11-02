# Roteiro de produção · Duas peças para abrir

Master integral da professora. Montagem guiada completa no vídeo, um gesto por vez, com o destino à vista antes da peça. Sem intervenções de personagens. Voz, escuta, gravação e publicação pendentes.

**Antes de gravar:** use um perfil de ensaio sem envio nesta aula. Mostre o projeto da dimensão correta. Não preencha Recado no envio. Mostre Objetivo cumprido! e Projeto enviado! só quando esses estados aparecerem de verdade.

## Parte 1. A cabana do faroleiro

**Clipe:** `video-abertura`

**Na tela:** Jogo pronto 2D. Mostrar a chave no gramado de cima, o emblema no de baixo e a cabana no canto, com a porta fechada. Encostar na cabana sem nada e mostrar o aviso; não abrir a cabana nem mostrar os blocos.

**Fala para ElevenLabs:**

```text
[upbeat, welcoming voice] O Farol ganhou um segredo! No canto do gramado tem a cabana do faroleiro, com a porta trancada. Para abrir, ela pede duas peças: a chave, que você já conhece, e um emblema novo, escondido do outro lado do caminho.

[interested, animated voice] Olha aqui: o personagem encostou na cabana sem nada, e o aviso diz que ela pede a chave e o emblema. O farol continua como antes: com a chave, ele acende.

[upbeat, encouraging voice] Agora é a sua vez de jogar. Clique no jogo aqui na página e use as setas do teclado. Tente a cabana sem nada, depois com uma peça só e depois com as duas.

[reassuring, encouraging voice] A tecla R começa uma nova partida. Você pode seguir mesmo sem terminar a partida: é só clicar em Próxima parte.
```

**Recado na página (não gravar):** Sua vez! Clique no jogo e use as setas do teclado. Tente a cabana sem nada, só com uma peça e com as duas. A tecla R começa outra partida. Depois clique em Próxima parte.

## Parte 2. O seu Passo a passo do projeto

**Clipe:** `video-material`

**Na tela:** Abrir o Passo a passo do projeto no bloco Consulte. Mostrar a parte da experiência, a parte 2D e a parte 3D, os títulos das montagens e o botão Baixar. Não inventar anexo antes do PDF produzido.

**Fala para ElevenLabs:**

```text
[engaging, energetic, conversational voice] Olha aqui: este é o seu Passo a passo do projeto! Ele tem o que investigar na experiência e cada montagem das duas aulas, com o caminho na paleta, o nome do bloco, onde encaixar e como testar.

[engaging, energetic, conversational voice] Tem uma parte para o jogo 2D e outra para a ilha em 3D, que você vai fazer na próxima aula.

[reassuring, encouraging voice] Se quiser, você pode ler aqui mesmo. E, se preferir, também pode clicar em Baixar para guardar o material e consultar onde quiser. Depois clique em Próxima parte.
```

**Recado na página (não gravar):** Este é o seu Passo a passo do projeto, com o que investigar na experiência e cada montagem. Se quiser, leia aqui mesmo ou clique em Baixar para guardar. Depois clique em Próxima parte.

## Parte 3. A porta com duas peças

**Clipe:** `video-experiencia`

**Na tela:** Vídeo conceitual. Meme ilustrado por 2 a 3 segundos: o Zappy de capacete, segurando uma bicicleta. Depois mostrar a experiência parada: a cabana fechada, as duas peças no chão, temChave e temEmblema em falso e a pergunta da cabana com as duas respostas ainda em "?". No "Olha aqui", apontar os botões das peças, Encostar na cabana, temChave e temEmblema, a pergunta e os dois botões do pedido [apontar botões das peças; apontar Encostar na cabana; apontar as variáveis; apontar a pergunta; apontar o pedido]. Não encostar na cabana: o que ela faz em cada caso, e se a ordem das peças importa, é a descoberta da criança. Não falar de blocos, regra, Se, então, senão nem dos blocos e e ou: eles ficam para a montagem (decisão de 02/11/2026).

**Fala para ElevenLabs:**

```text
[curious] Sabe quando você vai andar de bicicleta? Para sair, você pega duas coisas: a bicicleta e o capacete.

[engaging, energetic, conversational voice] No seu jogo, a cabana do faroleiro também pede duas coisas: a chave e o emblema.

[engaging, energetic, conversational voice] Para saber o que o personagem já pegou, o jogo guarda duas informações em duas variáveis: temChave e temEmblema. Cada uma vale verdadeiro ou falso.

[interested, animated voice] Quando o personagem encosta na cabana, ela faz uma pergunta. Uma pergunta que ajuda o jogo a decidir se chama condição.

[curious] E a cabana do seu jogo? O que ela faz quando o personagem chega sem nenhuma peça? A ordem em que ele pega as peças importa? E se ela pedisse só uma das peças? O que você acha? Isso você vai testar na experiência.

[interested, animated voice] Olha aqui: nesta atividade, estes botões pegam a chave e o emblema, e este leva o personagem até a cabana. Aqui ficam temChave e temEmblema, e embaixo do jogo fica a pergunta da cabana, com uma resposta para o sim e outra para o não.

[interested, animated voice] E aqui você escolhe o que a cabana pede: as duas peças ou uma das peças.

[upbeat, encouraging voice] Agora é a sua vez de investigar: tente a cabana sem nenhuma peça, com uma e com as duas. Observe temChave, temEmblema e a porta.

[upbeat, encouraging voice] Depois pegue as peças em ordens diferentes. E compare com uma cabana que pede só uma das peças.

[reassuring, encouraging voice] Você escolhe por onde começar, e o Zappy ajuda a observar as diferenças. Quando terminar, clique em Próxima parte.
```

**Falas dentro da experiência:** `packages/core/src/learning/scene/guidance-cabana.ts`, exportadas em `zappy-etapas.json`. A orientação sugere comparações pelo estado observado; os controles permanecem livres.

**Recado na página (não gravar):** Sua vez! Investigue quando a cabana abre e quando continua fechada: sem nenhuma peça, com uma, com as duas e em ordens diferentes. Depois compare com a cabana que pede uma das peças. Você escolhe a ordem dos testes, e o Zappy sugere o que observar. Quando terminar, clique em Próxima parte.

## Parte 4. Guarde o emblema

**Clipe:** `video-emblema`

**Na tela:** Começar pela retomada: levar o personagem até o emblema e, no "Tá vendo?", mostrar que nada acontece. Lembrar a experiência e a chave do Farol. Criar temEmblema no fim de Ao iniciar, com o bloco verdadeiro trocado para falso. Em Quando acontecer, montar o encontro com o emblema, Destruir o sprite, Alterar temEmblema para verdadeiro e Alterar aviso, um bloco por fala, com o destino à vista antes de cada peça. Testar pegando o emblema.

**Fala para ElevenLabs:**

```text
[engaging, energetic, conversational voice] Agora faça o emblema ficar guardado. Clique no jogo e leve o personagem até o emblema, no gramado de baixo.

[engaging, energetic, conversational voice] Tá vendo? Ele passa por cima e não acontece nada, porque o encontro com o emblema ainda não tem nenhuma reação.

[engaging, energetic, conversational voice] Lembra da experiência? A cabana conferia temChave e temEmblema. Só que o seu jogo ainda não guarda o emblema.

[engaging, energetic, conversational voice] Lembra da chave, no Farol? Ela sumia do chão, e o jogo guardava em temChave que ela foi pega. O emblema vai funcionar do mesmo jeito!

[engaging, energetic, conversational voice] Primeiro, a variável temEmblema. Ela precisa existir desde o começo da partida, por isso nasce na área Ao iniciar, que roda quando o jogo começa.

[confident, clear, unhurried voice] Encontre a área Ao iniciar. Se ela não estiver aparecendo, arraste um espaço vazio entre os blocos até ela aparecer. Deixe à vista o fim dela, depois do último bloco.

[confident, clear, unhurried voice] Abra Programação e depois Variáveis, pegue o bloco Criar variável e encaixe no fim de Ao iniciar. É este bloco que cria a variável temEmblema.

[engaging, energetic, conversational voice] Esse bloco chega com o nome contador. Clique em contador, apague e escreva temEmblema, tudo junto e com o E maiúsculo. Depois clique fora do campo.

[engaging, energetic, conversational voice] O valor desse bloco vem com o número 0. Só que temEmblema guarda verdadeiro ou falso. Abra Programação e depois Lógica e Se, pegue o bloco verdadeiro e solte em cima do 0.

[confident, clear, unhurried voice] No menu desse bloco, troque verdadeiro por falso, porque o jogo começa sem o emblema.

[confident, clear, unhurried voice] Agora o encontro. Encontre a área Quando acontecer e deixe à vista um espaço vazio depois do último evento dela, fora do fazer dos outros eventos.

[confident, clear, unhurried voice] Abra Jogo 2D, depois Colisões e depois Encostar e bloquear. Pegue o bloco Quando o sprite começar a encostar no sprite e encaixe nesse espaço. É este bloco que percebe quando o personagem encosta no emblema.

[confident, clear, unhurried voice] Esse bloco chega com jogador e inimigo. Clique em jogador e escolha personagem. Depois clique em inimigo e escolha emblema.

[confident, clear, unhurried voice] Deixe à vista o espaço ao lado da palavra fazer, dentro desse encontro. Abra Jogo 2D, depois Sprites e depois Criar e trocar aparência, pegue o bloco Destruir o sprite e encaixe ali. É este bloco que tira o emblema do chão.

[confident, clear, unhurried voice] Ele chega com o nome resposta: clique em resposta e escolha emblema.

[confident, clear, unhurried voice] Logo abaixo de Destruir o sprite, encaixe Alterar variável, de Programação e Variáveis. Clique em contador e escolha temEmblema. É este bloco que guarda que o emblema foi pego.

[confident, clear, unhurried voice] O valor vem com o número 1. Abra Programação e depois Lógica e Se, pegue o bloco verdadeiro e solte em cima do 1. Desta vez, deixe em verdadeiro.

[confident, clear, unhurried voice] Por último, ainda dentro do fazer, encaixe outro Alterar variável e escolha aviso.

[confident, clear, unhurried voice] Abra Programação e depois Valores, pegue o bloco texto e solte em cima do 1. Clique em Olá, apague e escreva: Você pegou o emblema!

[engaging, energetic, conversational voice] Agora teste. Clique no jogo e leve o personagem até o emblema. Olha só: ele some, e o aviso conta que você pegou o emblema. A cabana ainda não abre: ela vai aprender a perguntar na próxima parte.

[reassuring, encouraging voice] Se algo não funcionou no seu jogo, volte aos blocos e confira se ficou assim: no fim de Ao iniciar está Criar variável temEmblema com valor falso, e no encontro entre personagem e emblema estão Destruir o sprite emblema, Alterar temEmblema para verdadeiro e Alterar aviso. Depois de corrigir, teste de novo.

[confident, clear, unhurried voice] Funcionou? Clique em Verificar projeto. Se faltar alguma coisa, leia a dica, corrija os blocos e clique novamente. Depois clique em Próxima parte.
```

**Recado na página (não gravar):** Agora ensine o seu jogo a guardar o emblema: crie temEmblema começando em falso e, no encontro, faça o emblema sumir, guardar verdadeiro e mudar o aviso. Teste no jogo. Depois clique em Verificar projeto e em Próxima parte.

## Parte 5. A cabana pede as duas

**Clipe:** `video-porta`

**Na tela:** Retomada: pegar as duas peças, encostar na cabana e, no "Tá vendo?", mostrar que nada acontece. Lembrar a experiência. Em Quando acontecer, montar o encontro com a cabana, o Se, levar a condição x maior que 0 para a lixeira, encaixar o bloco e com valor da variável temChave e temEmblema, abrir o senão pelo segundo sinal de mais, e montar o então e o senão, um bloco por fala. Testar sem peças, com uma de cada vez e com as duas.

**Fala para ElevenLabs:**

```text
[engaging, energetic, conversational voice] Agora faça a cabana pedir as duas peças. Clique no jogo, pegue a chave e o emblema e encoste na cabana.

[engaging, energetic, conversational voice] Tá vendo? Não acontece nada, porque o encontro com a cabana ainda não faz nenhuma pergunta.

[engaging, energetic, conversational voice] Lembra da experiência? Quando a cabana pedia as duas peças, sem nenhuma e com uma só ela ficava fechada e avisava.

[engaging, energetic, conversational voice] Com as duas, ela abria, em qualquer ordem. Agora a gente vai montar essa pergunta no seu jogo!

[confident, clear, unhurried voice] Primeiro, encontre a área Quando acontecer e deixe à vista um espaço vazio depois do encontro com o emblema, fora do fazer dele.

[confident, clear, unhurried voice] Abra Jogo 2D, depois Colisões e depois Encostar e bloquear. Pegue o bloco Quando o sprite começar a encostar no sprite e encaixe nesse espaço. É este bloco que percebe quando o personagem encosta na cabana.

[confident, clear, unhurried voice] Clique em jogador e escolha personagem. Depois clique em inimigo e escolha cabana.

[engaging, energetic, conversational voice] Quem faz uma pergunta no jogo é o bloco Se. Deixe à vista o espaço ao lado da palavra fazer, dentro do encontro com a cabana.

[confident, clear, unhurried voice] Abra Programação e depois Lógica e Se, pegue o bloco Se e solte nesse espaço. É este bloco que faz a pergunta da cabana.

[engaging, energetic, conversational voice] Repare que o Se já vem com uma condição pronta: x maior que 0. Condição é a pergunta que o Se faz, e a resposta dela é sim ou não.

[confident, clear, unhurried voice] Não é isso que a cabana precisa perguntar. Por isso, segure essa pergunta pelo sinal de maior e arraste até a lixeira, no canto de baixo, à direita, do espaço dos blocos.

[confident, clear, unhurried voice] O lugar ao lado de Se fica vazio. Deixe esse lugar à vista.

[engaging, energetic, conversational voice] Agora vem o bloco novo, o que junta duas perguntas numa só. Abra Programação e depois Lógica e Se, e pegue o bloco que tem a palavra e no meio. Ele chega assim: 0, e, 0. Solte no lugar vazio ao lado de Se.

[engaging, energetic, conversational voice] É este bloco que faz a cabana pedir as duas peças, como na experiência. Com a palavra e, a resposta só é sim quando as duas perguntas dão sim. A cabana que pedia uma das peças era a palavra ou.

[confident, clear, unhurried voice] Agora as duas perguntas. Abra Programação e depois Valores, pegue o bloco valor da variável e solte em cima do primeiro 0. Clique no x e escolha temChave.

[confident, clear, unhurried voice] Pegue outro valor da variável e solte em cima do segundo 0. Clique no x e escolha temEmblema.

[engaging, energetic, conversational voice] Pronto: agora a pergunta é temChave e temEmblema.

[engaging, energetic, conversational voice] A cabana tem duas respostas, uma para o sim e outra para o não. Por isso o Se precisa do senão, o espaço da resposta não.

[confident, clear, unhurried voice] Olha aqui, na linha de baixo do bloco Se, depois do então: tem dois sinais de mais. Clique no segundo, antes da palavra senão. Não clique no primeiro.

[engaging, energetic, conversational voice] Agora o então, que roda quando a resposta é sim. É este espaço que guarda a resposta sim da experiência: abrir a cabana. Deixe à vista o espaço dentro do então.

[confident, clear, unhurried voice] Abra Jogo 2D, depois Sprites e depois Criar e trocar aparência. Pegue o bloco Trocar imagem do sprite e encaixe ali.

[confident, clear, unhurried voice] Ele chega com heroi duas vezes: clique no primeiro e escolha cabana; clique no segundo e escolha cabana-aberta.

[confident, clear, unhurried voice] Logo abaixo, ainda dentro do então, encaixe Alterar variável, de Programação e Variáveis, e escolha aviso.

[confident, clear, unhurried voice] Solte um texto, de Programação e Valores, em cima do 1, apague Olá e escreva: A cabana abriu! Você tinha as duas peças.

[engaging, energetic, conversational voice] Agora o senão, que roda quando a resposta é não. É este espaço que guarda a resposta não da experiência: avisar o que a cabana pede.

[confident, clear, unhurried voice] Dentro do senão, encaixe outro Alterar variável e escolha aviso. Solte um texto em cima do 1 e escreva: A cabana pede a chave e o emblema.

[engaging, energetic, conversational voice] Agora teste todos os casos. Clique no jogo, toque na tecla R e vá direto à cabana: ela continua fechada e avisa.

[engaging, energetic, conversational voice] Pegue só a chave e encoste: continua fechada. Toque na tecla R de novo, pegue só o emblema e encoste: continua fechada.

[engaging, energetic, conversational voice] Agora pegue as duas peças e encoste. Olha só: a cabana abre! Toque na tecla R mais uma vez, pegue primeiro o emblema e depois a chave: a cabana abre do mesmo jeito.

[reassuring, encouraging voice] Se algo não funcionou no seu jogo, volte aos blocos e confira se ficou assim: o encontro usa personagem e cabana, a pergunta é temChave e temEmblema, com a palavra e no meio, a troca de imagem e o aviso de sucesso estão dentro do então, e o aviso que pede as duas peças está dentro do senão. Depois de corrigir, teste de novo.

[confident, clear, unhurried voice] Funcionou? Clique em Verificar projeto. Se faltar alguma coisa, leia a dica, corrija os blocos e clique novamente. Depois clique em Próxima parte.
```

**Recado na página (não gravar):** Hora de ensinar a cabana a perguntar! Se temChave e temEmblema, ela abre; senão, ela avisa. Teste sem peças, com uma de cada vez e com as duas. Depois clique em Verificar projeto e em Próxima parte.

## Parte 6. Pense na cabana

Sem vídeo: diálogo do Zappy e quiz. Alternativas equivalentes antes da escolha; resposta corrigida pelo servidor.

**Recado na página (não gravar):** Hora de pensar na cabana! As perguntas retomam uma peça só, o "ou", o que pode estar errado e os testes. Em cada uma tem uma explicação, e você pode tentar de novo. Nas perguntas com cena, escolha e clique em Ver o que acontece; nas outras, clique em Responder.

## Parte 7. Envie o seu jogo com a cabana

**Clipe:** `video-entrega`

**Na tela:** Projeto atual, objetivos, Enviar meu projeto, confirmação Enviar e Projeto enviado!. Não preencher Recado nem simular o envio.

**Fala para ElevenLabs:**

```text
[pleased, lively voice] Olha só o que você programou: o jogo guarda as duas peças, e a cabana só abre quando as duas respostas são verdadeiras! Na próxima aula, você leva essa pergunta para a ilha, em três dimensões.

[confident, clear, unhurried voice] Antes de enviar, jogue uma partida inteira: tente a cabana com uma peça só e depois com as duas, e acenda o farol com a chave. Depois toque na tecla R e confira que as peças voltam e a cabana volta fechada.

[confident, clear, unhurried voice] Agora clique em Verificar projeto e corrija o que faltar.

[confident, clear, unhurried voice] Quando os objetivos estiverem cumpridos, clique em Enviar meu projeto e confirme em Enviar. Quando aparecer Projeto enviado!, clique em Concluir aula.
```

**Recado na página (não gravar):** Confira os objetivos e clique em Enviar meu projeto. Confirme em Enviar. Quando aparecer Projeto enviado!, clique em Concluir aula.
