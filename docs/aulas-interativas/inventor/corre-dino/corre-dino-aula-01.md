# Corre, Dino! · Aula 1 · Prepare a tela e crie o Dino

Fonte editorial: `qa/corre-dino.conteudo.json`. Este arquivo, o roteiro e o manifesto são gerados juntos. Para a sequência completa e a implantação, consulte [o mapa do curso](modulos.md).

## Resumo

- Estado de entrada: Projeto vazio, com Programação e Jogo 2D disponíveis.
- Resultado da aula: Tela 480 × 270, borda 4 e Dino criado em (110, 150), tamanho 64, ainda sem desenho.
- Seções: 10. Vídeos: 10.

**Produção:** a professora grava toda a fala principal. Na montagem kids, Debinha substitui somente os trechos da tabela, com a mesma frase e sem voz sobreposta. O master funciona sozinho no adulto. Notas e recados da página não são gravados. [Direção de voz e edição](../../../aulas-interativas-tecnico/DIRETRIZES-VOZ-ELEVENLABS.md).

## Diagnóstico e decisão

A abertura e o caderno ficam junto da primeira construção. Preparação, tamanho, coordenadas e criação têm experiências antes da aplicação. O Dino invisível é explicado como resultado da criação sem desenho, sem suspense obrigatório para a aula seguinte.

**Revisão de 02/11/2026.** As quatro experiências passaram à exploração livre com o Zappy (`setup.freeExploration`): o vídeo explica a ideia com uma analogia (desenho animado e tênis, folha de desenho, encontro na praça, teatro), convida a investigar sem apontar os controles e devolve a pergunta da Debinha ("O que você acha? Isso você vai testar na experiência."); a primeira experiência apresenta a palavra quadro. A primeira montagem apresenta os blocos e a paleta, e cada montagem liga o bloco à ideia ("É este bloco que…"), com um gesto ou um campo por fala (a troca 800 → 480 e 480 → 270 virou dois passos). A resposta à pergunta da cor começa pela cor, e o "cadê o Dino?" é respondido com o que a criança vê. A definição de sprite foi para a Aula 2, junto do bloco Desenhar o sprite.

## Triagem dos conceitos

| Conceito | Como e quando trabalhar | Razão |
| --- | --- | --- |
| Preparação e repetição | once-vs-always antes de Ao iniciar | Comparar a mesma ação uma vez e repetida. |
| Tamanho da tela | stage-size antes da tela e da borda | Ver o limite acompanhar largura e altura. |
| Coordenadas | coordinates antes de preencher a posição | Variar um eixo de cada vez. |
| Criar e mostrar | world antes de Criar dinossauro | Distinguir o objeto guardado de seu desenho. |

## Proposta final

### Seção 1. Jogue antes de construir

**Tarefa:** Sua vez! Jogue a versão pronta e pule os cactos com a barra de espaço, a seta para cima ou um toque na parte de cima da tela. Quando terminar, clique em Próxima parte.

**Blocos na página:** video-abertura → fala-apresentacao → jogo-pronto.

**Recado na página (não gravar):** Sua vez! Jogue a versão pronta e pule os cactos com a barra de espaço, a seta para cima ou um toque na parte de cima da tela. Quando terminar, clique em Próxima parte.

Versão completa do mesmo jogo, derivada do marco original 13. Conclusão por participação; vencer não é exigência para conhecer o jogo.

### Seção 2. Seu passo a passo do projeto

**Tarefa:** Este é o seu Passo a passo do projeto! Quando precisar de um passo, você pode ler aqui mesmo ou baixar para guardar. Para continuar, clique em Próxima parte.

**Blocos na página:** video-caderno → fala-caderno → caderno.

**Recado na página (não gravar):** Este é o seu Passo a passo do projeto! Quando precisar de um passo, você pode ler aqui mesmo ou baixar para guardar. Para continuar, clique em Próxima parte.

Anexar somente `docs/aulas-interativas/inventor/corre-dino/passo-a-passo-do-projeto.pdf` ao bloco caderno. Ler, baixar e imprimir são opcionais; não entram na conclusão.

### Seção 3. Uma vez ou sempre?

**Tarefa:** Sua vez! Investigue o que muda quando o Dino dá um passinho uma vez só ou o tempo todo. O Zappy te mostra o que testar, e você pode repetir quando quiser. Quando terminar, clique em Próxima parte.

**Blocos na página:** video-uma-vez-e-sempre → fala-uma-vez-e-sempre → experiencia-uma-vez-e-sempre.

**Recado na página (não gravar):** Sua vez! Investigue o que muda quando o Dino dá um passinho uma vez só ou o tempo todo. O Zappy te mostra o que testar, e você pode repetir quando quiser. Quando terminar, clique em Próxima parte.

**Participação no vídeo:** A professora grava toda a fala. Substituições kids, sem sobrepor vozes:

video-uma-vez-e-sempre-K1: Debinha substitui “E se o Dino der um passinho uma vez só, no começo? Ele continua andando?”. Antes: “jogo, o Dino vai dar um passinho, e você escolhe quando: só no começo, ou o tempo todo, enquanto a corrida acontece.”. Depois: “O que você acha? Isso você vai testar na experiência. Agora você vai investigar o que muda no Dino quando o passinho”.

**Experiência em exploração livre:** `once-vs-always` (`setup.freeExploration`), tela `packages/member-shell/src/components/scene-livre/once-vs-always.tsx` e falas do Zappy em `packages/core/src/learning/scene/guia-livre/dino/once-vs-always.ts`. A experiência trabalha só a ideia, sem blocos, áreas do Estúdio nem código; os blocos ficam para a montagem.

**Instrução:** Compare o Dino quando o passinho acontece uma vez, no começo, e quando acontece sempre, em todo quadro. O Zappy te mostra o que testar, e você pode repetir quando quiser.

**O que investigar (metas, em qualquer ordem):** Escolha Uma vez, no começo, clique em Começar o jogo e observe o Dino e os quadros. Escolha Sempre, em todo quadro, clique em Começar o jogo e observe o Dino e os quadros.

**Pistas, do aberto ao direto:** 1) Observe quantas vezes o Dino anda enquanto os quadros passam. 2) Compare o que o Dino faz depois do primeiro quadro nos dois jeitos. 3) Escolha Uma vez, no começo, e clique em Começar o jogo. Depois escolha Sempre, em todo quadro, e clique em Começar o jogo de novo. Sem palpite e sem pergunta final.

### Seção 4. Qual é o tamanho da tela?

**Tarefa:** Sua vez! Investigue o que a largura e a altura mudam na tela do jogo. O Zappy te mostra o que testar, e você pode repetir quando quiser. Quando terminar, clique em Próxima parte.

**Blocos na página:** video-limite-da-tela → fala-limite-da-tela → experiencia-tela.

**Recado na página (não gravar):** Sua vez! Investigue o que a largura e a altura mudam na tela do jogo. O Zappy te mostra o que testar, e você pode repetir quando quiser. Quando terminar, clique em Próxima parte.

**Participação no vídeo:** A professora grava toda a fala. Substituições kids, sem sobrepor vozes:

video-limite-da-tela-K1: Debinha substitui “E se a largura diminuir, a tela fica mais baixa ou mais estreita?”. Antes: “da tela é feito de dois números, a largura e a altura, e a tela do Corre, Dino tem 480 de largura e 270 de altura.”. Depois: “O que você acha? Isso você vai testar na experiência. Agora você vai investigar o que muda na borda quando muda a”.

**Experiência em exploração livre:** `stage-size` (`setup.freeExploration`), tela `packages/member-shell/src/components/scene-livre/stage-size.tsx` e falas do Zappy em `packages/core/src/learning/scene/guia-livre/stage-size.ts`. A experiência trabalha só a ideia, sem blocos, áreas do Estúdio nem código; os blocos ficam para a montagem.

**Instrução:** Compare a borda quando muda só a largura e quando muda só a altura. A tela do seu jogo tem 480 por 270. O Zappy te mostra o que testar, e você pode repetir quando quiser.

**O que investigar (metas, em qualquer ordem):** Clique em Ligar a borda. Com a borda ligada, clique em outra largura ou altura, como Largura 600. Com a borda ligada, clique em Largura 480 e em Altura 270.

**Pistas, do aberto ao direto:** 1) Olhe o palco antes e depois de ligar a borda: o que aparece? 2) Com a borda ligada, troque a largura e observe o contorno. 3) Clique em Ligar a borda, depois em Largura 600, e por fim em Largura 480 e Altura 270. Sem palpite e sem pergunta final.

### Seção 5. Prepare a tela do jogo

**Tarefa:** Agora prepare a tela do seu jogo! Coloque Ao iniciar no projeto e, dentro dela, a tela de 480 por 270. Depois, clique em Verificar projeto e, em seguida, em Próxima parte.

**Blocos na página:** video-area-e-tela → fala-area-e-tela.

**Recado na página (não gravar):** Agora prepare a tela do seu jogo! Coloque Ao iniciar no projeto e, dentro dela, a tela de 480 por 270. Depois, clique em Verificar projeto e, em seguida, em Próxima parte.

**Conclui quando:** vídeo assistido e critérios conferidos em Verificar projeto.

- Coloque a área Ao iniciar no projeto.
- Prepare a tela em Ao iniciar, com o mundo de 480 por 270 usado neste curso.

### Seção 6. Mostre o limite da tela

**Tarefa:** Agora mostre onde a tela do seu jogo acaba! Coloque Mostrar a borda da tela logo abaixo da preparação, com espessura 4. Depois, clique em Verificar projeto e, em seguida, em Próxima parte.

**Blocos na página:** video-borda → fala-borda.

**Recado na página (não gravar):** Agora mostre onde a tela do seu jogo acaba! Coloque Mostrar a borda da tela logo abaixo da preparação, com espessura 4. Depois, clique em Verificar projeto e, em seguida, em Próxima parte.

**Participação no vídeo:** A professora grava toda a fala. Substituições kids, sem sobrepor vozes:

video-borda-K1: Debinha substitui “Qual cor vai aparecer melhor?”. Antes: “Mostrar a borda da tela e solte logo abaixo da preparação. É este bloco que mostra o contorno de onde a tela acaba.”. Depois: “Uma cor bem diferente do fundo, como branco: com duas cores parecidas, a borda some no azul. Escolha essa cor no bloco.”.

**Conclui quando:** vídeo assistido e critérios conferidos em Verificar projeto.

- Prepare a tela em Ao iniciar, com o mundo de 480 por 270 usado neste curso.
- Coloque a borda da tela com espessura positiva.

### Seção 7. Onde fica o Dino?

**Tarefa:** Sua vez! Investigue como dois números dizem o lugar do Dino na tela. O Zappy te mostra o que testar, e você pode repetir quando quiser. Quando terminar, clique em Próxima parte.

**Blocos na página:** video-coordenadas → fala-coordenadas → experiencia-coordenadas.

**Recado na página (não gravar):** Sua vez! Investigue como dois números dizem o lugar do Dino na tela. O Zappy te mostra o que testar, e você pode repetir quando quiser. Quando terminar, clique em Próxima parte.

**Participação no vídeo:** A professora grava toda a fala. Substituições kids, sem sobrepor vozes:

video-coordenadas-K1: Debinha substitui “E para que lado cada número leva o Dino?”. Antes: “a pessoa acha você. No seu jogo, o endereço do Dino é feito de dois números. Um se chama x, e o outro se chama y.”. Depois: “O que você acha? Isso você vai testar na experiência. Agora você vai investigar para onde o Dino vai quando o x muda,”.

**Experiência em exploração livre:** `coordinates` (`setup.freeExploration`), tela `packages/member-shell/src/components/scene-livre/coordinates.tsx` e falas do Zappy em `packages/core/src/learning/scene/guia-livre/dino/espelhos.ts`. A experiência trabalha só a ideia, sem blocos, áreas do Estúdio nem código; os blocos ficam para a montagem.

**Instrução:** Compare o lugar do Dino quando muda só o x e quando muda só o y, e descubra onde ele fica com x e y em zero. O Zappy te mostra o que testar, e você pode repetir quando quiser.

**O que investigar (metas, em qualquer ordem):** Aumente só o x e observe para onde o Dino vai. Aumente só o y e observe para onde o Dino vai. Coloque 0 no x e 0 no y e observe em que canto o Dino fica.

**Pistas, do aberto ao direto:** 1) Mude um número só e compare o lugar novo do Dino com o de antes. 2) Depois de testar o x, faça o mesmo com o y. E onde será que fica o zero dos dois? 3) Aumente o x e observe o Dino. Depois aumente o y e observe de novo. Por último, coloque 0 no x e 0 no y. Sem palpite e sem pergunta final.

### Seção 8. Existir e aparecer

**Tarefa:** Sua vez! Investigue se o Dino que existe no jogo já aparece na tela. O Zappy te mostra o que testar, e você pode repetir quando quiser. Quando terminar, clique em Próxima parte.

**Blocos na página:** video-criar-e-mostrar → fala-criar-e-mostrar → descoberta.

**Recado na página (não gravar):** Sua vez! Investigue se o Dino que existe no jogo já aparece na tela. O Zappy te mostra o que testar, e você pode repetir quando quiser. Quando terminar, clique em Próxima parte.

**Participação no vídeo:** A professora grava toda a fala. Substituições kids, sem sobrepor vozes:

video-criar-e-mostrar-K1: Debinha substitui “E quando o Dino passa a existir, ele já aparece na tela?”. Antes: “o palco, que a plateia vê. No seu jogo também tem esses dois lugares: os bastidores e a tela do jogo, que é o palco.”. Depois: “O que você acha? Isso você vai testar na experiência. Agora você vai investigar o que muda nos bastidores e na tela do”.

**Experiência em exploração livre:** `world` (`setup.freeExploration`), tela `packages/member-shell/src/components/scene-livre/world.tsx` e falas do Zappy em `packages/core/src/learning/scene/guia-livre/dino/espelhos.ts`. A experiência trabalha só a ideia, sem blocos, áreas do Estúdio nem código; os blocos ficam para a montagem.

**Instrução:** Compare os bastidores e a tela do jogo quando o Dino passa a existir e quando aparece na tela. O Zappy te mostra o que testar, e você pode repetir quando quiser.

**O que investigar (metas, em qualquer ordem):** Clique em Criar o Dino nos bastidores e compare os bastidores com a tela do jogo. Clique em Mostrar o Dino na tela e compare os bastidores com a tela do jogo.

**Pistas, do aberto ao direto:** 1) Olhe os dois lados, os bastidores e a tela do jogo, depois de cada botão. 2) Compare a tela antes e depois de mostrar o Dino. E se o Dino sair da tela, continua nos bastidores? 3) Clique em Criar o Dino nos bastidores e olhe os dois lados. Depois clique em Mostrar o Dino na tela e compare. Por último, clique em Tirar o Dino da tela. Sem palpite e sem pergunta final.

### Seção 9. Crie o Dino nos bastidores

**Tarefa:** Agora crie o seu Dino! Coloque Criar dinossauro logo abaixo da borda, com x 110, y 150 e tamanho 64. Depois, clique em Verificar projeto e, em seguida, em Próxima parte.

**Blocos na página:** video-criar-dino → fala-criar-dino.

**Recado na página (não gravar):** Agora crie o seu Dino! Coloque Criar dinossauro logo abaixo da borda, com x 110, y 150 e tamanho 64. Depois, clique em Verificar projeto e, em seguida, em Próxima parte.

**Participação no vídeo:** A professora grava toda a fala. Substituições kids, sem sobrepor vozes:

video-criar-dino-K1: Debinha substitui “Escolhi a cor, mas cadê o Dino?”. Antes: “no 120 do x e troque por 110. O y já vem 150, e o tamanho, 64: mantenha os dois. Depois, escolha a cor do seu Dino.”. Depois: “O Dino já existe, nos bastidores, mas ainda não foi desenhado na tela, e é isso mesmo: o desenho vem na próxima aula.”.

**Conclui quando:** vídeo assistido e critérios conferidos em Verificar projeto.

- Coloque a borda antes de criar o Dino, com espessura positiva.
- Crie o dinossauro dino em Ao iniciar, com posição dentro da tela e tamanho positivo.

### Seção 10. Teste e envie seu jogo

**Tarefa:** Hora de conferir e enviar o seu jogo! Confira a tela, a borda e o Dino, clique em Verificar projeto e depois em Enviar meu projeto. Confirme em Enviar e, quando o envio terminar, clique em Concluir aula.

**Blocos na página:** video-entrega → fala-entrega → projeto.

**Recado na página (não gravar):** Hora de conferir e enviar o seu jogo! Confira a tela, a borda e o Dino, clique em Verificar projeto e depois em Enviar meu projeto. Confirme em Enviar e, quando o envio terminar, clique em Concluir aula.

**Conclui quando:** vídeo assistido e critérios conferidos em Verificar projeto, com o envio em Enviar meu projeto confirmado em Enviar.

- Coloque a área Ao iniciar no projeto.
- Prepare a tela em Ao iniciar, com o mundo de 480 por 270 usado neste curso.
- Coloque a borda da tela com espessura positiva.
- Crie o dinossauro dino em Ao iniciar, com posição dentro da tela e tamanho positivo.

## Blocos disponíveis

| Bloco | Caminho na paleta |
| --- | --- |
| ⚙️ Ao iniciar | 🗂️ Áreas do projeto |
| Criar dinossauro em x y tamanho cor | Jogo 2D → Kits prontos → Dino |
| Preparar o jogo em tela cheia, tela × , fundo | Jogo 2D → Jogo e telas → Preparar a área do jogo |
| Mostrar a borda da tela, cor espessura | Jogo 2D → Jogo e telas → Preparar a área do jogo |
| Número | Programação → 🔣 Valores |

## Continuidade e produção

Aula 1 na cadeia `corre-dino`. Entrada: etapa 0; saída: etapa 1 de `qa/corre-dino-etapas.ts`. Os 13 marcos originais e o código do jogo permanecem preservados.

A ordem vídeo → Zappy → atividade é editorial. Configurar videoBeforeActivity no curso e conferir com perfil de aluno; não presumir que a ordem por si só ativa o bloqueio. Gravar os vídeos revisados, anexar o PDF quando aplicável e ensaiar com crianças antes de declarar o percurso validado.
