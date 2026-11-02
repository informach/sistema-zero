# Corre, Dino! · Aula 2 · Mostre o Dino e a floresta

Fonte editorial: `qa/corre-dino.conteudo.json`. Este arquivo, o roteiro e o manifesto são gerados juntos. Para a sequência completa e a implantação, consulte [o mapa do curso](modulos.md).

## Resumo

- Estado de entrada: Tela e Dino criados na aula 1.
- Resultado da aula: Dino desenhado a cada quadro, floresta em velocidade 5, limpeza e descrição acessível; borda provisória retirada.
- Seções: 9. Vídeos: 9.

**Produção:** a professora grava toda a fala principal. Na montagem kids, Dedé substitui somente os trechos da tabela, com a mesma frase e sem voz sobreposta. O master funciona sozinho no adulto. Notas e recados da página não são gravados. [Direção de voz e edição](../../../aulas-interativas-tecnico/DIRETRIZES-VOZ-ELEVENLABS.md).

## Diagnóstico e decisão

O desenho, a limpeza e as camadas ganham montagens separadas. A explicação de uma vez e sempre já aconteceu antes de Ao iniciar. A descrição para o leitor de tela, presente no projeto canônico, agora tem experiência e instrução explícitas.

**Revisão de 02/11/2026.** As três experiências passaram à exploração livre (desenho em todo quadro, ordem dos desenhos e leitor de tela), com a analogia, a pergunta do Dedé devolvida e o convite a investigar, sem apontar os controles; a do álbum de figurinhas não conta mais que a última cobre a anterior. As montagens ganharam "É este bloco que…" e "É esta área que…", a definição de sprite (vinda da Aula 1), o porquê do lugar da floresta, "Repare: o bloco chega com o nome jogador" e um gesto por fala na retirada da borda, agora "borda de teste". A retomada da descrição só lembra a experiência, porque a frase não aparece na tela.

## Triagem dos conceitos

| Conceito | Como e quando trabalhar | Razão |
| --- | --- | --- |
| Desenho por quadro e limpeza | draw-loop antes do desenho e da limpeza | Comparar imagem única, rastro e atualização limpa. |
| Ordem de desenho | layers antes da floresta | Observar quem cobre quem. |
| Descrição acessível | screen-reader antes da descrição | Ouvir a diferença entre uma tela sem frase e uma instrução escrita. |

## Proposta final

### Seção 1. Desenhar uma vez ou em todo quadro?

**Tarefa:** Sua vez! Investigue o que a tela mostra em cada jeito de desenhar o Dino. Você escolhe a ordem dos testes, e o Zappy sugere o que observar. Quando terminar, clique em Próxima parte.

**Blocos na página:** video-quadros → fala-quadros → experiencia-laco.

**Recado na página (não gravar):** Sua vez! Investigue o que a tela mostra em cada jeito de desenhar o Dino. Você escolhe a ordem dos testes, e o Zappy sugere o que observar. Quando terminar, clique em Próxima parte.

**Participação no vídeo:** A professora grava toda a fala. Substituições kids, sem sobrepor vozes:

video-quadros-K1: Dedé substitui “E se o Dino for desenhado em todo quadro, sem apagar a tela?”. Antes: “aparece na tela. No seu jogo, o Dino tem um lugar, o x, e o jogo escolhe quando pintar o Dino e se apaga a tela antes.”. Depois: “O que você acha? Isso você vai testar na experiência. Agora você vai investigar o que a tela mostra em cada jeito de”.

**Experiência em exploração livre:** `draw-loop` (`setup.freeExploration`), tela `packages/member-shell/src/components/scene-livre/draw-loop.tsx` e falas do Zappy em `packages/core/src/learning/scene/guia-livre/dino/espelhos.ts`. A experiência trabalha só a ideia, sem blocos, áreas do Estúdio nem código; os blocos ficam para a montagem.

**Instrução:** Compare o que a tela mostra quando o Dino é desenhado só no começo e em todo quadro, com e sem apagar a tela antes. Você escolhe a ordem e pode repetir quando quiser.

**O que investigar (metas, em qualquer ordem):** Escolha Desenhar só no começo e Não apagar a tela, clique em Avançar 1 quadro e compare a tela com o x do Dino. Escolha Desenhar em todo quadro e Não apagar a tela, clique em Avançar 1 quadro algumas vezes e conte os Dinos na tela. Escolha Desenhar em todo quadro e Apagar a tela antes de desenhar, clique em Avançar 1 quadro algumas vezes e conte os Dinos na tela.

**Pistas, do aberto ao direto:** 1) Depois de cada quadro, compare a tela com o x do Dino. 2) Conte quantos Dinos ficam na tela em cada jeito. 3) Escolha Desenhar só no começo e clique em Avançar 1 quadro. Depois escolha Desenhar em todo quadro e avance alguns quadros. Por último, escolha Apagar a tela antes de desenhar e avance mais quadros. Sem palpite e sem pergunta final.

### Seção 2. Mostre o Dino a cada quadro

**Tarefa:** Agora faça o seu Dino aparecer! Coloque A cada quadro do jogo em Enquanto estiver rodando e, dentro dele, Desenhar o sprite dino. Depois, clique em Verificar projeto e, em seguida, em Próxima parte.

**Blocos na página:** video-motor-e-dino → fala-motor-e-dino.

**Recado na página (não gravar):** Agora faça o seu Dino aparecer! Coloque A cada quadro do jogo em Enquanto estiver rodando e, dentro dele, Desenhar o sprite dino. Depois, clique em Verificar projeto e, em seguida, em Próxima parte.

**Conclui quando:** vídeo assistido e critérios conferidos em Verificar projeto.

- Encaixe A cada quadro dentro de Enquanto estiver rodando.
- Desenhe o sprite dino dentro de A cada quadro.

### Seção 3. Prepare uma imagem nova em cada quadro

**Tarefa:** Agora prepare uma imagem nova em cada quadro! Coloque Limpar a tela antes de Desenhar o sprite dino. Depois, clique em Verificar projeto e, em seguida, em Próxima parte.

**Blocos na página:** video-limpeza → fala-limpeza.

**Recado na página (não gravar):** Agora prepare uma imagem nova em cada quadro! Coloque Limpar a tela antes de Desenhar o sprite dino. Depois, clique em Verificar projeto e, em seguida, em Próxima parte.

**Participação no vídeo:** A professora grava toda a fala. Substituições kids, sem sobrepor vozes:

video-limpeza-K1: Dedé substitui “E como tira essa sombra escura?”. Antes: “no seu jogo, olhe a sombra do Dino. Tá vendo? Ela vai ficando escura, porque cada desenho novo cai em cima do velho.”. Depois: “É isso que a gente vai resolver. Lembra da experiência da primeira parte desta aula? Apagando a tela antes de cada”.

**Conclui quando:** vídeo assistido e critérios conferidos em Verificar projeto.

- Limpe a tela antes de desenhar o Dino.

### Seção 4. Quem fica na frente?

**Tarefa:** Sua vez! Investigue o que muda na tela quando a ordem dos desenhos muda. Você escolhe a ordem dos testes, e o Zappy sugere o que observar. Quando terminar, clique em Próxima parte.

**Blocos na página:** video-camadas → fala-camadas → experiencia-camadas.

**Recado na página (não gravar):** Sua vez! Investigue o que muda na tela quando a ordem dos desenhos muda. Você escolhe a ordem dos testes, e o Zappy sugere o que observar. Quando terminar, clique em Próxima parte.

**Participação no vídeo:** A professora grava toda a fala. Substituições kids, sem sobrepor vozes:

video-camadas-K1: Dedé substitui “E se a floresta for desenhada depois do Dino, quem fica na frente?”. Antes: “umas por cima das outras? A ordem em que você cola faz diferença. No seu jogo, vão ser desenhados o Dino e a floresta.”. Depois: “O que você acha? Isso você vai testar na experiência. Agora você vai investigar o que muda na tela quando muda a ordem”.

**Experiência em exploração livre:** `layers` (`setup.freeExploration`), tela `packages/member-shell/src/components/scene-livre/layers.tsx` e falas do Zappy em `packages/core/src/learning/scene/guia-livre/dino/espelhos.ts`. A experiência trabalha só a ideia, sem blocos, áreas do Estúdio nem código; os blocos ficam para a montagem.

**Instrução:** Compare a tela quando o Dino é desenhado por último e quando a floresta é desenhada por último. Você escolhe a ordem e pode repetir quando quiser.

**O que investigar (metas, em qualquer ordem):** Clique em Desenhar o Dino por último e observe a tela. Depois, clique em Desenhar a floresta por último e observe o Dino. Clique em Desenhar o Dino por último outra vez, como no jogo, e compare.

**Pistas, do aberto ao direto:** 1) Observe quem fica na frente depois de cada troca. 2) Compare o Dino quando ele é desenhado por último e quando a floresta é desenhada por último. 3) Clique em Desenhar o Dino por último. Depois clique em Desenhar a floresta por último. Por último, clique em Desenhar o Dino por último de novo. Sem palpite e sem pergunta final.

### Seção 5. Coloque a floresta atrás do Dino

**Tarefa:** Agora deixe a floresta atrás do seu Dino! Coloque Desenhar fundo de floresta, com velocidade 5, entre a limpeza e o desenho do Dino. Depois, clique em Verificar projeto e, em seguida, em Próxima parte.

**Blocos na página:** video-ordem-certa → fala-ordem-certa.

**Recado na página (não gravar):** Agora deixe a floresta atrás do seu Dino! Coloque Desenhar fundo de floresta, com velocidade 5, entre a limpeza e o desenho do Dino. Depois, clique em Verificar projeto e, em seguida, em Próxima parte.

**Participação no vídeo:** A professora grava toda a fala. Substituições kids, sem sobrepor vozes:

video-ordem-certa-K1: Dedé substitui “A floresta já está andando! Dá para ela andar mais rápido?”. Antes: “e solte entre a limpeza e o desenho do Dino. É este bloco que desenha a floresta, atrás do que vem depois dele.”. Depois: “Dá, sim. Repare: o bloco chega com velocidade 4. Clique no 4 e troque por 5, porque um número maior deixa o fundo mais”.

**Conclui quando:** vídeo assistido e critérios conferidos em Verificar projeto.

- Limpe a tela antes de desenhar a floresta.
- Desenhe a floresta em movimento antes do Dino.
- Desenhe o sprite dino dentro de A cada quadro.
- Use uma única floresta.

### Seção 6. Retire a borda de teste

**Tarefa:** Agora retire a borda de teste! Tire só Mostrar a borda da tela e deixe Criar dinossauro em Ao iniciar. Depois, clique em Verificar projeto e, em seguida, em Próxima parte.

**Blocos na página:** video-retirar-borda → fala-retirar-borda.

**Recado na página (não gravar):** Agora retire a borda de teste! Tire só Mostrar a borda da tela e deixe Criar dinossauro em Ao iniciar. Depois, clique em Verificar projeto e, em seguida, em Próxima parte.

**Conclui quando:** vídeo assistido e critérios conferidos em Verificar projeto.

- Retire a borda provisória da tela.
- Mantenha o dinossauro criado em Ao iniciar.

### Seção 7. O que o leitor de tela conta?

**Tarefa:** Sua vez! Investigue o que uma pessoa que usa leitor de tela ouve do seu jogo. Você escolhe a ordem dos testes, e o Zappy sugere o que observar. Quando terminar, clique em Próxima parte.

**Blocos na página:** video-descricao → fala-descricao → experiencia-descricao.

**Recado na página (não gravar):** Sua vez! Investigue o que uma pessoa que usa leitor de tela ouve do seu jogo. Você escolhe a ordem dos testes, e o Zappy sugere o que observar. Quando terminar, clique em Próxima parte.

**Participação no vídeo:** A professora grava toda a fala. Substituições kids, sem sobrepor vozes:

video-descricao-K1: Dedé substitui “E o leitor de tela consegue contar como se joga o Corre, Dino?”. Antes: “só ouve o que você conta. No seu jogo, você pode escrever uma frase para o leitor de tela ler: a descrição do jogo.”. Depois: “O que você acha? Isso você vai testar na experiência. Agora você vai investigar o que o leitor de tela diz sem”.

**Experiência em exploração livre:** `screen-reader` (`setup.freeExploration`), tela `packages/member-shell/src/components/scene-livre/screen-reader.tsx` e falas do Zappy em `packages/core/src/learning/scene/guia-livre/screen-reader.ts`. A experiência trabalha só a ideia, sem blocos, áreas do Estúdio nem código; os blocos ficam para a montagem.

**Instrução:** Compare o que o leitor de tela diz sem descrição e com uma frase que conta o que fazer e como jogar. Você escolhe a ordem e pode repetir quando quiser.

**O que investigar (metas, em qualquer ordem):** Com o campo vazio, clique em Ouvir a tela. Escreva no campo Descrição do jogo o que se faz no jogo e clique em Ouvir a tela. Escreva também a tecla que se usa no jogo e clique em Ouvir a tela.

**Pistas, do aberto ao direto:** 1) Antes de escrever, clique em Ouvir a tela. O que a pessoa ficou sabendo do jogo? 2) Escreva o que se faz no jogo, como correr e pular os cactos, e ouça de novo. 3) Escreva Corra com o dino e pule os cactos apertando espaço e clique em Ouvir a tela. Sem palpite e sem pergunta final.

### Seção 8. Escreva a descrição do jogo

**Tarefa:** Agora conte como se joga o seu jogo! Escreva na descrição a frase Corra com o dino e pule os cactos apertando espaço, sem ponto no fim. Depois, clique em Verificar projeto e, em seguida, em Próxima parte.

**Blocos na página:** video-descrever-jogo → fala-descrever-jogo.

**Recado na página (não gravar):** Agora conte como se joga o seu jogo! Escreva na descrição a frase Corra com o dino e pule os cactos apertando espaço, sem ponto no fim. Depois, clique em Verificar projeto e, em seguida, em Próxima parte.

**Participação no vídeo:** A professora grava toda a fala. Substituições kids, sem sobrepor vozes:

video-descrever-jogo-K1: Dedé substitui “Essa frase vai ficar escrita no jogo?”. Antes: “depois Jogo e telas e depois Telas e partida, pegue o bloco Descrever o jogo para leitor de tela e solte nesse espaço.”. Depois: “Não, ela não aparece na tela. É este bloco que guarda a frase que o leitor de tela lê em voz alta. No texto, apague a”.

**Conclui quando:** vídeo assistido e critérios conferidos em Verificar projeto.

- Descreva o jogo em Ao iniciar.

### Seção 9. Teste e envie seu jogo

**Tarefa:** Hora de testar e enviar o seu jogo! Confira o Dino na frente da floresta, clique em Verificar projeto e depois em Enviar meu projeto. Confirme em Enviar e, quando o envio terminar, clique em Concluir aula.

**Blocos na página:** video-entrega → fala-entrega → projeto.

**Recado na página (não gravar):** Hora de testar e enviar o seu jogo! Confira o Dino na frente da floresta, clique em Verificar projeto e depois em Enviar meu projeto. Confirme em Enviar e, quando o envio terminar, clique em Concluir aula.

**Conclui quando:** vídeo assistido e critérios conferidos em Verificar projeto, com o envio em Enviar meu projeto confirmado em Enviar.

- Desenhe o sprite dino dentro de A cada quadro.
- Limpe a tela antes de desenhar a floresta.
- Desenhe a floresta em movimento antes do Dino.
- Use uma única floresta.
- Retire a borda provisória da tela.
- Mantenha o dinossauro criado em Ao iniciar.
- Descreva o jogo em Ao iniciar.

## Blocos disponíveis

| Bloco | Caminho na paleta |
| --- | --- |
| 🔁 Enquanto estiver rodando | 🗂️ Áreas do projeto |
| ⚙️ Ao iniciar | 🗂️ Áreas do projeto |
| Limpar a tela | Jogo 2D → Desenho e efeitos → Efeitos |
| Criar dinossauro em x y tamanho cor | Jogo 2D → Kits prontos → Dino |
| Desenhar o sprite | Jogo 2D → Sprites → Criar e trocar aparência |
| Desenhar fundo de floresta (velocidade ) | Jogo 2D → Cenários → Fundos |
| Descrever o jogo para leitor de tela | Jogo 2D → Jogo e telas → Telas e partida |
| Preparar o jogo em tela cheia, tela × , fundo | Jogo 2D → Jogo e telas → Preparar a área do jogo |
| Mostrar a borda da tela, cor espessura | Jogo 2D → Jogo e telas → Preparar a área do jogo |
| A cada quadro do jogo | Jogo 2D → Tempo → Quadros e intervalos |
| Número | Programação → 🔣 Valores |

## Continuidade e produção

Aula 2 na cadeia `corre-dino`. Entrada: etapa 1; saída: etapa 2 de `qa/corre-dino-etapas.ts`. Os 13 marcos originais e o código do jogo permanecem preservados.

A ordem vídeo → Zappy → atividade é editorial. Configurar videoBeforeActivity no curso e conferir com perfil de aluno; não presumir que a ordem por si só ativa o bloqueio. Gravar os vídeos revisados, anexar o PDF quando aplicável e ensaiar com crianças antes de declarar o percurso validado.
