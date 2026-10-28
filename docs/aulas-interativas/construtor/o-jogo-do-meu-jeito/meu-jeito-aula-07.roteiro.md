# Roteiro de produção · Faça suas pedras nascerem animadas

**Produção:** a professora grava toda a fala principal. Na montagem kids, Debinha substitui somente os trechos da tabela, com a mesma frase e sem voz sobreposta. O master funciona sozinho no adulto. Notas e recados da página não são gravados. [Direção de voz e edição](../../../aulas-interativas-tecnico/DIRETRIZES-VOZ-ELEVENLABS.md).

## Seção 1. Compare nascer e animar

### Clipe `video-dois-relogios` · Compare nascer e animar

**Estimativa de gravação:** aproximadamente 3 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio.

**Clipe:** `video-dois-relogios`

**Na tela:** Demonstração na primeira pessoa: o narrador faz cada teste no ritmo da fala e deixa ver o resultado real antes de explicar; o vídeo não dá ordens antes de passar a vez. A partir do quadro 0, com uma pedra a cada 40 quadros e 8 desenhos por segundo: escolher 20 quadros em A cada quantos quadros nasce uma pedra, deixar 8 por segundo, clicar em Voltar ao começo e no Tempo. Deixar o tempo passar até o contador mostrar Quadro 60 e três pedras, mostrando o quadro 0 em cada pedra ao entrar; parar o Tempo. Escolher 40 quadros e 16 por segundo, dizendo que cada relógio vai para um lado, clicar em Voltar ao começo, ligar o Tempo por três segundos e deixar ver duas pedras com o número trocando mais depressa. Em cada chamado da fala (Olha aqui, Olha só, Repare, Tá vendo?), apontar na tela o que ela mostra. No fim, apontar a experiência para a pessoa repetir os mesmos testes e apontar Próxima parte.

**Fala para ElevenLabs:**

```text
[engaging, energetic, conversational voice] Esta é uma experiência para a gente entender dois relógios que trabalham ao mesmo tempo: um faz as pedras nascerem, e o outro troca os desenhos de cada pedra.

[interested, animated voice] Olha aqui: eu deixo Desenhos por segundo de cada pedra em 8 e coloco A cada quantos quadros nasce uma pedra em 20. Depois clico em Voltar ao começo e no Tempo. Em dois segundos, o contador chega ao quadro 60, e nasceram três pedras, nos quadros 20, 40 e 60. [confident, clear, unhurried voice] Repare: cada pedra entra mostrando o quadro 0, e depois o número em cima dela troca entre 0 e 1.

[engaging, energetic, conversational voice] Eu clico em Tempo para parar. Nasceu uma pedra a cada 20 quadros, e cada uma trocou de desenho 8 vezes por segundo.

[curious] Dá para nascer menos pedra e o desenho trocar mais rápido?

[engaging, energetic, conversational voice] Agora eu mudo os dois relógios, cada um para um lado. Coloco A cada quantos quadros nasce uma pedra em 40, que é mais devagar, e Desenhos por segundo de cada pedra em 16, que é mais depressa. Clico em Voltar ao começo e ligo o Tempo. Tá vendo? Em três segundos, nascem só duas pedras, porque o relógio de nascer ficou mais lento. Mas o número em cima de cada pedra troca entre 0 e 1 bem mais depressa, porque o relógio dos desenhos ficou mais rápido.

[engaging, energetic, conversational voice] Ou seja, cada relógio mudou só o que é dele. E cada pedra começa o próprio giro no quadro 0, na hora em que nasce.

[engaging, energetic, conversational voice] No seu jogo, o bloco A cada 40 quadros faz cada pedra nascer, e a animação chamada girando troca os desenhos de cada pedra 8 vezes por segundo. No bloco, isso aparece como 8 fps.

[upbeat, encouraging voice] Agora é a sua vez: faça esses mesmos testes na experiência. Quando terminar, clique em Próxima parte.
```

**Substituições na edição kids:**

| ID | Personagem | Ocorrência | Âncora anterior | Fala exata substituída | Âncora posterior | Tags |
| --- | --- | --- | --- | --- | --- | --- |
| video-dois-relogios-K1 | Debinha | 1 | 1. Eu clico em Tempo para parar. Nasceu uma pedra a cada 20 quadros, e cada uma trocou de desenho 8 vezes por segundo. | Dá para nascer menos pedra e o desenho trocar mais rápido? | Agora eu mudo os dois relógios, cada um para um lado. Coloco A cada quantos quadros nasce uma pedra em 40, que é mais | [curious] |

No adulto, manter toda a fala da professora. No kids, silenciar apenas o trecho marcado e substituir pelo áudio do personagem, sem sobrepor vozes.

**Imagem nas substituições kids (não gravar):**

- `video-dois-relogios-K1`: entrada — Parar o Tempo após o primeiro teste, com os dois controles e os contadores à vista. Saída — Mudar nascimento para 40 e desenhos por segundo para 16; recomeçar e comparar os dois efeitos.


**Recado na página (não gravar):** Sua vez! Mude os dois relógios e compare as pedras que nascem. Quando terminar, clique em Próxima parte.

## Seção 2. Prepare a folha do asteroide

### Clipe `video-folha-pedra` · Prepare a folha do asteroide

**Estimativa de gravação:** aproximadamente 2 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio.

**Clipe:** `video-folha-pedra`

**Na tela:** Começar pela retomada, antes de qualquer gesto novo, com o trabalho da criança à vista. Mostrar cada gesto narrado e conferir os recortes nas duas folhas. Depois, voltar à prévia, começar uma partida com Enter e apontar as pedras ainda com o desenho antigo. Não pedir para observar as pedras enquanto só os blocos ou a abertura estão na tela. Em cada chamado da fala (Olha aqui, Olha só, Repare, Tá vendo?), apontar na tela o que ela mostra. Mostrar a passagem entre a aba da aula e a ferramenta, o trabalho salvo e o resultado de referência para a autoconferência narrada.

**Fala para ElevenLabs:**

```text
[engaging, energetic, conversational voice] Lembra da experiência da parte anterior? Um relógio fazia as pedras nascerem, e o outro trocava os desenhos de cada pedra. O de nascer já existe no seu jogo, por isso agora a gente vai ligar o dos desenhos, começando pela folha do asteroide.

[confident, clear, unhurried voice] Clique em Abrir meu Estúdio e retome o mesmo cartão da aula anterior. A nova folha vai entrar no fim de Ao iniciar, logo depois da animação da nave, por isso deixe esse lugar à vista.

[engaging, energetic, conversational voice] Agora, em Jogo 2D, Sprites, Animação, pegue Carregar folha de quadros e encaixe no fim de Ao iniciar, depois da animação da nave. Escreva folha-asteroide, escolha a imagem asteroide e coloque 64 nos dois tamanhos do quadro, porque o seu asteroide foi desenhado em 64 por 64.

[confident, clear, unhurried voice] Confira as duas folhas: folha-nave continua 32 por 32, e folha-asteroide usa 64 por 64. Depois, clique na prévia e comece uma partida com Enter. [confident, clear, unhurried voice] Repare que as pedras ainda usam o desenho antigo, porque carregar a folha só deixa os quadros prontos. Ainda falta trocar o criador das pedras.

[engaging, energetic, conversational voice] Pause aqui e faça esta parte no seu jogo. Se o Estúdio ainda não estiver aberto, clique em Abrir meu Estúdio. Depois compare o seu jogo com a conferência que a gente acabou de fazer e espere aparecer Salvo, porque é assim que o seu jogo fica guardado para a próxima parte. Quando aparecer, volte a esta aba e clique em Próxima parte.
```


**Recado na página (não gravar):** Agora prepare a folha do seu asteroide! Carregue folha-asteroide com quadros de 64 por 64 no fim de Ao iniciar. Quando aparecer Salvo, volte a esta aba e clique em Próxima parte.

## Seção 3. Troque a imagem das pedras que nascem

### Clipe `video-trocar-pedra` · Troque a imagem das pedras que nascem

**Estimativa de gravação:** aproximadamente 3 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio.

**Clipe:** `video-trocar-pedra`

**Na tela:** Mostrar cada gesto narrado, os nomes dos controles e o resultado comparável, sem acelerar a execução. Em cada chamado da fala (Olha aqui, Olha só, Repare, Tá vendo?), apontar na tela o que ela mostra. Mostrar a passagem entre a aba da aula e a ferramenta, o trabalho salvo e o resultado de referência para a autoconferência narrada.

**Fala para ElevenLabs:**

```text
[engaging, energetic, conversational voice] Agora a gente vai fazer as pedras nascerem com a sua imagem. Encontre A cada 40 quadros e, dentro dele, Se o estado do jogo é jogando. [interested, animated voice] Olha aqui: este é o criador das pedras. Antes de trocar, observe o grupo asteroides, o sorteio do x, o y e as velocidades, porque o bloco novo vai precisar dos mesmos valores.

[confident, clear, unhurried voice] Deixe à vista um espaço livre da área de blocos. Em Jogo 2D, Grupos, Criar e percorrer, pegue No grupo criar um sprite chamado em x y largura altura com imagem vx vy e solte nesse espaço, sem encaixar ainda. Com o bloco solto, preencha: grupo asteroides, nome asteroide, imagem asteroide, y -30, largura 40, altura 40, vx 0 e vy 3.

[engaging, energetic, conversational voice] Depois mova a peça do sorteio que está no x do criador antigo para o x do novo. Assim você conserva os limites do seu jogo. Agora clique com o botão direito no criador antigo, escolha Apagar este bloco e encaixe o novo no mesmo lugar, dentro do Se jogando do relógio.

[engaging, energetic, conversational voice] Agora comece a partida. [interested, animated voice] Olha só: as suas imagens caem em lugares diferentes, porque o sorteio continua no x.

[curious] Por que a pedra ficou espremida?

[engaging, energetic, conversational voice] Elas ainda aparecem com a folha inteira espremida, porque falta ligar a animação de cada pedra.

[reassuring, encouraging voice] Se no seu jogo não aconteceu isso, volte aos blocos e confira se ficou assim: um criador só, dentro do Se jogando do A cada 40 quadros, com grupo asteroides, nome asteroide, imagem asteroide e o sorteio no x, e os outros blocos ligados. O grupo junta todas as pedras, e o nome é de cada pedra que nasce. [reassuring, encouraging voice] Depois de corrigir, teste de novo.

[engaging, energetic, conversational voice] Pause aqui e faça esta parte no seu jogo. Se o Estúdio ainda não estiver aberto, clique em Abrir meu Estúdio. Depois compare o seu jogo com a conferência que a gente acabou de fazer e espere aparecer Salvo, porque é assim que o seu jogo fica guardado para a próxima parte. Quando aparecer, volte a esta aba e clique em Próxima parte.
```

**Substituições na edição kids:**

| ID | Personagem | Ocorrência | Âncora anterior | Fala exata substituída | Âncora posterior | Tags |
| --- | --- | --- | --- | --- | --- | --- |
| video-trocar-pedra-K1 | Debinha | 1 | relógio. Agora comece a partida. Olha só: as suas imagens caem em lugares diferentes, porque o sorteio continua no x. | Por que a pedra ficou espremida? | Elas ainda aparecem com a folha inteira espremida, porque falta ligar a animação de cada pedra. Se no seu jogo não | [curious] |

No adulto, manter toda a fala da professora. No kids, silenciar apenas o trecho marcado e substituir pelo áudio do personagem, sem sobrepor vozes.

**Imagem nas substituições kids (não gravar):**

- `video-trocar-pedra-K1`: entrada — Concluir a troca do criador e mostrar a folha inteira espremida no teste, sem corrigir o recorte antes da hora. Saída — Apontar a folha inteira espremida e explicar que falta ligar a animação. Depois retomar a conferência do criador e a autoconferência, mantendo a animação para a próxima parte.


**Recado na página (não gravar):** Agora troque a imagem das pedras que nascem! Substitua o criador das pedras, conservando o grupo, o sorteio e a velocidade. Quando aparecer Salvo, volte a esta aba e clique em Próxima parte.

## Seção 4. Anime cada pedra depois de criar

### Clipe `video-animar-pedra` · Anime cada pedra depois de criar

**Estimativa de gravação:** aproximadamente 3 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio.

**Clipe:** `video-animar-pedra`

**Na tela:** Mostrar cada gesto narrado, os nomes dos controles e o resultado comparável, sem acelerar a execução. Em cada chamado da fala (Olha aqui, Olha só, Repare, Tá vendo?), apontar na tela o que ela mostra. Mostrar a passagem entre a aba da aula e a ferramenta, o trabalho salvo e o resultado de referência para a autoconferência narrada.

**Fala para ElevenLabs:**

```text
[engaging, energetic, conversational voice] Agora cada pedra vai ganhar a animação girando. Ela vai ficar logo abaixo do novo criador da pedra, dentro do Se jogando do A cada 40 quadros, porque cada pedra precisa existir antes de receber a animação. Por isso, deixe esse lugar à vista.

[engaging, energetic, conversational voice] Em Jogo 2D, Sprites, Animação, pegue Animar sprite com a folha na animação, do quadro ao a fps e encaixe logo abaixo do criador. Assim, cada pedra recebe a animação na hora em que nasce, como na experiência dos dois relógios.

[engaging, energetic, conversational voice] Escolha sprite asteroide e folha folha-asteroide. Em Escolher, selecione girando, e os valores chegam preenchidos, como na nave. [confident, clear, unhurried voice] Repare: o carregamento da folha continua no Ao iniciar, e o comando de animar fica aqui, depois de cada nascimento.

[engaging, energetic, conversational voice] Agora comece uma partida e observe pelo menos três pedras entrando com a animação. Mova a nave e atire. Acerte uma pedra para conferir os pontos e deixe uma encostar na nave para conferir a perda de vida.

[reassuring, encouraging voice] Se no seu jogo não aconteceu isso, volte aos blocos e confira se ficou assim: Animar sprite asteroide com a folha folha-asteroide na animação girando, do quadro 0 ao 1, a 8 fps, logo abaixo do criador, dentro do mesmo Se, e folha-asteroide com quadros de 64 por 64. [reassuring, encouraging voice] Depois de corrigir, teste de novo.

[engaging, energetic, conversational voice] Pause aqui e faça esta parte no seu jogo. Se o Estúdio ainda não estiver aberto, clique em Abrir meu Estúdio. Depois compare o seu jogo com a conferência que a gente acabou de fazer e espere aparecer Salvo, porque é assim que o seu jogo fica guardado para a próxima parte. Quando aparecer, volte a esta aba e clique em Próxima parte.
```


**Recado na página (não gravar):** Agora anime cada pedra depois de criar! Coloque a animação girando logo abaixo do criador, dentro do mesmo Se. Quando aparecer Salvo, volte a esta aba e clique em Próxima parte.

## Seção 5. Confira as artes dentro do jogo

**Recado na página (não gravar):** Agora vamos relembrar como as suas artes entraram no jogo, com três perguntas! Se errar alguma, leia o porquê, clique em Tentar de novo e responda outra vez. Quando acertar todas, clique em Próxima parte.

Sem vídeo nem ferramenta. O quiz vem imediatamente depois do Zappy. Correção com explicação, tentativas ilimitadas e sem espera.

## Seção 6. Envie o jogo com as duas artes

### Clipe `video-entrega` · Envie o jogo com as duas artes

**Estimativa de gravação:** aproximadamente 2 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio.

**Clipe:** `video-entrega`

**Na tela:** Mostrar cada gesto narrado, os nomes dos controles e o resultado comparável, sem acelerar a execução. Em cada chamado da fala (Olha aqui, Olha só, Repare, Tá vendo?), apontar na tela o que ela mostra. Mostrar a passagem entre a aba da aula e a ferramenta, o trabalho salvo e o resultado de referência para a autoconferência narrada.

**Fala para ElevenLabs:**

```text
[engaging, energetic, conversational voice] Hora de enviar o seu jogo com as duas artes! Antes, confira no seu jogo: a nave e as pedras usam as suas animações, pelo menos três pedras nasceram animadas, e o tiro, os pontos e a perda de vida continuam funcionando. Se alguma coisa estiver diferente, volte à parte em que ela foi feita e ajuste. Depois espere aparecer Guardado na sua conta no Estúdio, porque a galeria da aula só mostra o que já está guardado na sua conta.

[engaging, energetic, conversational voice] Agora volte para a aba da aula e clique em Escolher no Estúdio. Na janela Minhas criações do Estúdio, selecione o cartão do seu jogo. Se a sua criação não aparecer, confira se ela ficou guardada na sua conta e clique em Atualizar galeria.

[upbeat, encouraging voice] Se quiser, escreva uma mensagem no campo Recado. Depois clique em Enviar (1) e espere aparecer Recebido!

[engaging, energetic, conversational voice] Esse envio guarda uma cópia deste momento, e você continua criando no Estúdio. Por último, clique em Concluir aula.
```


**Recado na página (não gravar):** Hora de enviar o seu jogo com as duas artes! Confira se a nave e as pedras usam as suas animações. Depois clique em Escolher no Estúdio, selecione o cartão do seu jogo e clique em Enviar (1). Quando aparecer Recebido!, clique em Concluir aula.
