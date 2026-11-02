# Nave Contra Asteroides · Aula 1 · Faça a nave aparecer

Fonte editorial: `qa/nave-contra-asteroides.conteudo.json`. Este arquivo, o roteiro e o manifesto são gerados juntos. Para a sequência completa e a implantação, consulte [o mapa do curso](modulos.md).

## Resumo

- Estado de entrada: Projeto vazio, com Programação e Jogo 2D disponíveis.
- Resultado da aula: Tela 800 × 480 e nave visível em x 400, y 410, ainda parada.
- Seções: 9. Vídeos: 9.

**Produção:** a professora grava toda a fala principal. Na montagem kids, Debinha substitui somente os trechos da tabela, com a mesma frase e sem voz sobreposta. O master funciona sozinho no adulto. Notas e recados da página não são gravados. [Direção de voz e edição](../../../aulas-interativas-tecnico/DIRETRIZES-VOZ-ELEVENLABS.md).

## Diagnóstico e decisão

A primeira aula conserva jogo pronto e caderno, mas termina com a nave construída e visível. Preparação, coordenadas, criação e desenho ganham experiências e montagens curtas antes do envio.

**Revisão de 02/11/2026.** As experiências passaram à exploração livre com o Zappy (`setup.freeExploration`): trabalham só a ideia, sem blocos, áreas do Estúdio nem código; o vídeo explica a ideia com uma analogia curta e convida a investigar, sem sequência de cliques e sem contar o resultado; a pergunta do avatar que anteciparia a descoberta vira "O que você acha? Isso você vai testar na experiência."; instrução, ponte, metas (`goalCopy`) e três pistas usam os botões reais da tela livre. Toda fala foi revista: uma ideia por fala, explicação separada do gesto, montagens que começam pelo "Tá vendo?" no jogo, retomam a experiência e ligam cada bloco à ideia ("É este bloco que…"). O Na tela segue a receita da ESPEC-ROTEIRO §9.8. A primeira experiência apresenta a palavra quadro (o desenho animado), que a tela livre usa em "Sempre, em todo quadro". O vídeo de cada experiência segue o molde do Cadê (02/11/2026, decisão da responsável): o conceito, uma analogia curta, o nome no jogo dela, a pergunta do avatar devolvida à criança e um convite de uma frase; sem tour pelos controles nem roteiro de testes, que ficam com o Zappy dentro da experiência.

## Triagem dos conceitos

| Conceito | Como e quando trabalhar | Razão |
| --- | --- | --- |
| Preparação e repetição | once-vs-always antes das áreas | Comparar a mesma ação uma vez e repetida. |
| Coordenadas | coordinates antes de criar a nave | Mudar um eixo por vez e observar a origem. |
| Criar e desenhar | world antes da criação; draw-loop antes do desenho | Separar o objeto guardado de sua imagem e observar a atualização por quadro. |

## Proposta final

### Seção 1. Jogue antes de construir

**Tarefa:** Sua vez! Jogue a versão pronta: Enter começa a partida, as setas movem a nave e a barra de espaço atira. Quando terminar, clique em Próxima parte.

**Blocos na página:** video-abertura → fala-abertura → jogo-pronto.

**Recado na página (não gravar):** Sua vez! Jogue a versão pronta: Enter começa a partida, as setas movem a nave e a barra de espaço atira. Quando terminar, clique em Próxima parte.

Versão completa do mesmo jogo, derivada do marco original 5. Conclusão por participação; vencer não é exigência para conhecer o jogo.

### Seção 2. Seu passo a passo do projeto

**Tarefa:** Este é o seu Passo a passo do projeto! Quando precisar de um passo, você pode ler aqui mesmo ou baixar para guardar. Para continuar, clique em Próxima parte.

**Blocos na página:** video-seu-caderno-do-aluno → fala-seu-caderno-do-aluno → caderno.

**Recado na página (não gravar):** Este é o seu Passo a passo do projeto! Quando precisar de um passo, você pode ler aqui mesmo ou baixar para guardar. Para continuar, clique em Próxima parte.

Anexar somente `docs/aulas-interativas/construtor/nave-contra-asteroides/passo-a-passo-do-projeto.pdf` ao bloco caderno, que aparece na tela como Passo a passo do projeto: Nave Contra Asteroides. Ler aqui mesmo ou clicar em Baixar para guardar são convites e não entram na conclusão. A fala não diz que não precisa baixar ou imprimir: soa como uma ordem para não fazer.

### Seção 3. Uma vez ou sempre?

**Tarefa:** Sua vez! Investigue o que muda quando a nave anda uma vez só ou o tempo todo. Você escolhe a ordem dos testes, e o Zappy sugere o que observar. Quando terminar, clique em Próxima parte.

**Blocos na página:** video-uma-vez-e-sempre → fala-uma-vez-e-sempre → experiencia-areas.

**Recado na página (não gravar):** Sua vez! Investigue o que muda quando a nave anda uma vez só ou o tempo todo. Você escolhe a ordem dos testes, e o Zappy sugere o que observar. Quando terminar, clique em Próxima parte.

**Participação no vídeo:** A professora grava toda a fala. Substituições kids, sem sobrepor vozes:

video-uma-vez-e-sempre-K1: Debinha substitui “E se a nave andar um pouquinho uma vez só, no começo? Ela continua andando?”. Antes: “tem coisa que você faz uma vez, antes de sair, como arrumar a mochila, e tem coisa que você faz o caminho inteiro.”. Depois: “O que você acha? Isso você vai testar na experiência. Agora você vai investigar o que muda na nave quando ela anda uma”.

**Experiência em exploração livre:** `once-vs-always` (`setup.freeExploration`), tela `packages/member-shell/src/components/scene-livre/once-vs-always.tsx` e falas do Zappy em `packages/core/src/learning/scene/guia-livre/once-vs-always.ts`. A experiência trabalha só a ideia, sem blocos, áreas do Estúdio nem código; os blocos ficam para a montagem.

**Instrução:** Compare a nave quando ela anda um pouquinho uma vez, no começo, e quando ela anda sempre, em todo quadro. Você escolhe a ordem e pode repetir quando quiser.

**O que investigar (metas, em qualquer ordem):** Escolha Uma vez, no começo, clique em Começar o jogo e observe a nave e os quadros. Escolha Sempre, em todo quadro, clique em Começar o jogo e observe a nave e os quadros.

**Pistas, do aberto ao direto:** 1) Observe quantas vezes a nave anda enquanto os quadros passam. 2) Compare o que a nave faz depois do primeiro quadro nos dois jeitos. 3) Escolha Uma vez, no começo, e clique em Começar o jogo. Depois escolha Sempre, em todo quadro, e clique em Começar o jogo de novo. Sem palpite e sem pergunta final.

### Seção 4. Prepare a tela do jogo

**Tarefa:** Agora prepare a tela do seu jogo! Coloque Ao iniciar e Enquanto estiver rodando, prepare a tela de 800 por 480 e clique em Verificar projeto. Depois, clique em Próxima parte.

**Blocos na página:** video-montar-areas-tela → fala-montar-areas-e-tela.

**Recado na página (não gravar):** Agora prepare a tela do seu jogo! Coloque Ao iniciar e Enquanto estiver rodando, prepare a tela de 800 por 480 e clique em Verificar projeto. Depois, clique em Próxima parte.

**Conclui quando:** vídeo assistido e critérios conferidos em Verificar projeto.

- Coloque Ao iniciar.
- Coloque Enquanto estiver rodando.
- Prepare a tela em Ao iniciar, com o mundo de 800 por 480 usado neste curso.

### Seção 5. Onde fica a nave?

**Tarefa:** Sua vez! Investigue como dois números dizem o lugar da nave na tela. Você escolhe a ordem dos testes, e o Zappy sugere o que observar. Quando terminar, clique em Próxima parte.

**Blocos na página:** video-coordenadas → fala-coordenadas → experiencia-coordenadas.

**Recado na página (não gravar):** Sua vez! Investigue como dois números dizem o lugar da nave na tela. Você escolhe a ordem dos testes, e o Zappy sugere o que observar. Quando terminar, clique em Próxima parte.

**Experiência em exploração livre:** `coordinates` (`setup.freeExploration`), tela `packages/member-shell/src/components/scene-livre/coordinates.tsx` e falas do Zappy em `packages/core/src/learning/scene/guia-livre/coordinates.ts`. A experiência trabalha só a ideia, sem blocos, áreas do Estúdio nem código; os blocos ficam para a montagem.

**Instrução:** Compare para onde a nave vai quando o x muda e quando o y muda, e onde ela fica com os dois números em zero. Você escolhe a ordem e pode repetir quando quiser.

**O que investigar (metas, em qualquer ordem):** Aumente só o x e observe para onde a nave vai. Aumente só o y e observe para onde a nave vai. Coloque 0 no x e 0 no y e observe em que canto a nave fica.

**Pistas, do aberto ao direto:** 1) Mude um número só e compare o lugar novo da nave com o de antes. 2) Depois de testar o x, faça o mesmo com o y. E onde será que fica o zero dos dois? 3) Aumente o x e observe a nave. Depois aumente o y e observe de novo. Por último, coloque 0 no x e 0 no y. Sem palpite e sem pergunta final.

### Seção 6. Existir e aparecer

**Tarefa:** Sua vez! Investigue se a nave que existe no jogo já aparece na tela. Você escolhe a ordem dos testes, e o Zappy sugere o que observar. Quando terminar, clique em Próxima parte.

**Blocos na página:** video-criar-e-mostrar → fala-criar-e-mostrar → experiencia-criar-mostrar.

**Recado na página (não gravar):** Sua vez! Investigue se a nave que existe no jogo já aparece na tela. Você escolhe a ordem dos testes, e o Zappy sugere o que observar. Quando terminar, clique em Próxima parte.

**Participação no vídeo:** A professora grava toda a fala. Substituições kids, sem sobrepor vozes:

video-criar-e-mostrar-K1: Debinha substitui “E quando a nave passa a existir, ela já aparece na tela?”. Antes: “no jogo é estar nos bastidores, com nome e lugar. Aparecer na tela é estar no palco, onde quem joga consegue ver.”. Depois: “O que você acha? Isso você vai testar na experiência. Agora você vai investigar a diferença entre a nave existir nos”.

**Experiência em exploração livre:** `world` (`setup.freeExploration`), tela `packages/member-shell/src/components/scene-livre/world.tsx` e falas do Zappy em `packages/core/src/learning/scene/guia-livre/world.ts`. A experiência trabalha só a ideia, sem blocos, áreas do Estúdio nem código; os blocos ficam para a montagem.

**Instrução:** Compare os bastidores e a tela do jogo quando a nave passa a existir e quando ela aparece na tela. Você escolhe a ordem e pode repetir quando quiser.

**O que investigar (metas, em qualquer ordem):** Clique em Criar a nave nos bastidores e compare os bastidores com a tela do jogo. Clique em Mostrar a nave na tela e compare os bastidores com a tela do jogo.

**Pistas, do aberto ao direto:** 1) Olhe os dois lados, os bastidores e a tela do jogo, depois de cada botão. 2) Compare a tela antes e depois de mostrar a nave. E se a nave sair da tela, ela continua nos bastidores? 3) Clique em Criar a nave nos bastidores e olhe os dois lados. Depois clique em Mostrar a nave na tela e compare. Por último, clique em Tirar a nave da tela. Sem palpite e sem pergunta final.

### Seção 7. Crie a nave nos bastidores

**Tarefa:** Agora crie a sua nave! Coloque Criar nave em Ao iniciar, com x 400 e y 410, e clique em Verificar projeto. Depois, clique em Próxima parte.

**Blocos na página:** video-criar-nave → fala-criar-nave.

**Recado na página (não gravar):** Agora crie a sua nave! Coloque Criar nave em Ao iniciar, com x 400 e y 410, e clique em Verificar projeto. Depois, clique em Próxima parte.

**Participação no vídeo:** A professora grava toda a fala. Substituições kids, sem sobrepor vozes:

video-criar-nave-K1: Debinha substitui “Para que servem todos esses campos?”. Antes: “Preparar o jogo em tela cheia, quando aparecer o encaixe. É este bloco que faz a nave existir no jogo, nos bastidores.”. Depois: “Cada campo diz uma coisa da nave: o nome, o endereço na tela e o tamanho. Repare: o bloco já chega com o nome nave. É”.

**Conclui quando:** vídeo assistido e critérios conferidos em Verificar projeto.

- Crie uma única nave em Ao iniciar, com posição dentro da tela e tamanho positivo.
- Prepare a tela em Ao iniciar, com o mundo de 800 por 480 usado neste curso.

### Seção 8. O desenho de cada quadro

**Tarefa:** Sua vez! Investigue o que a tela mostra em cada jeito de desenhar a nave. Você escolhe a ordem dos testes, e o Zappy sugere o que observar. Quando terminar, clique em Próxima parte.

**Blocos na página:** video-desenho-por-quadro → fala-desenho-por-quadro → experiencia-quadro.

**Recado na página (não gravar):** Sua vez! Investigue o que a tela mostra em cada jeito de desenhar a nave. Você escolhe a ordem dos testes, e o Zappy sugere o que observar. Quando terminar, clique em Próxima parte.

**Participação no vídeo:** A professora grava toda a fala. Substituições kids, sem sobrepor vozes:

video-desenho-por-quadro-K1: Debinha substitui “E se a nave for desenhada em todo quadro, sem apagar a tela?”. Antes: “na tela. No seu jogo, a nave tem um lugar, e dá para escolher quando o jogo pinta a nave e se ele apaga a tela antes.”. Depois: “O que você acha? Isso você vai testar na experiência. Agora você vai investigar o que a tela mostra quando a nave é”.

**Experiência em exploração livre:** `draw-loop` (`setup.freeExploration`), tela `packages/member-shell/src/components/scene-livre/draw-loop.tsx` e falas do Zappy em `packages/core/src/learning/scene/guia-livre/draw-loop.ts`. A experiência trabalha só a ideia, sem blocos, áreas do Estúdio nem código; os blocos ficam para a montagem.

**Instrução:** Compare o que a tela mostra quando a nave é desenhada só no começo ou em todo quadro, com e sem apagar a tela antes. Você escolhe a ordem e pode repetir quando quiser.

**O que investigar (metas, em qualquer ordem):** Escolha Desenhar só no começo e Não apagar a tela, clique em Avançar 1 quadro e compare a tela com o x da nave. Escolha Desenhar em todo quadro e Não apagar a tela, avance alguns quadros e conte as naves na tela. Escolha Desenhar em todo quadro e Apagar a tela antes de desenhar, avance alguns quadros e conte as naves na tela.

**Pistas, do aberto ao direto:** 1) Depois de cada quadro, compare a tela com o x da nave. 2) Conte quantas naves ficam na tela em cada jeito. 3) Escolha Desenhar só no começo e clique em Avançar 1 quadro. Depois escolha Desenhar em todo quadro e avance alguns quadros. Por último, escolha Apagar a tela antes de desenhar e avance mais quadros. Sem palpite e sem pergunta final.

### Seção 9. Mostre a nave a cada quadro

**Tarefa:** Agora faça a sua nave aparecer! Coloque o desenho da nave dentro de A cada quadro do jogo, clique em Verificar projeto e envie o seu projeto. Depois, clique em Concluir aula.

**Blocos na página:** video-motor-e-nave → fala-motor-e-nave → projeto.

**Recado na página (não gravar):** Agora faça a sua nave aparecer! Coloque o desenho da nave dentro de A cada quadro do jogo, clique em Verificar projeto e envie o seu projeto. Depois, clique em Concluir aula.

**Conclui quando:** vídeo assistido e critérios conferidos em Verificar projeto, com o envio confirmado em Enviar meu projeto → Enviar.

- Crie uma única nave em Ao iniciar, com posição dentro da tela e tamanho positivo.
- Coloque A cada quadro do jogo em Enquanto estiver rodando.
- Desenhe o sprite nave dentro de A cada quadro do jogo.
- Prepare a tela em Ao iniciar, com o mundo de 800 por 480 usado neste curso.

## Blocos disponíveis

| Bloco | Caminho na paleta |
| --- | --- |
| 🔁 Enquanto estiver rodando | 🗂️ Áreas do projeto |
| ⚙️ Ao iniciar | 🗂️ Áreas do projeto |
| Criar nave em x y largura altura , cor do corpo cor das asas | Jogo 2D → Kits prontos → Espaço |
| Desenhar o sprite | Jogo 2D → Sprites → Criar e trocar aparência |
| Preparar o jogo em tela cheia, tela × , fundo | Jogo 2D → Jogo e telas → Preparar a área do jogo |
| A cada quadro do jogo | Jogo 2D → Tempo → Quadros e intervalos |
| Número | Programação → 🔣 Valores |

## Continuidade e produção

Aula 1 na cadeia `nave-contra-asteroides`. Entrada: etapa 0; saída: etapa 1 de `qa/nave-contra-asteroides-etapas.ts`. Os cinco marcos originais e o código do jogo permanecem preservados.

A ordem vídeo → Zappy → atividade é editorial. Configurar videoBeforeActivity no curso e conferir com perfil de aluno; não presumir que a ordem por si só ativa o bloqueio. Gravar os vídeos revisados, anexar o PDF quando aplicável e ensaiar com crianças antes de declarar o percurso validado.
