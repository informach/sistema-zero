# Corre, Dino! · Aula 2 · Mostre o Dino e a floresta

Fonte editorial: `qa/corre-dino.conteudo.json`. Este arquivo, o roteiro e o manifesto são gerados juntos. Para a sequência completa e a implantação, consulte [o mapa do curso](../modulos-corre-dino.md).

## Resumo

- Estado de entrada: Tela e Dino criados na aula 1.
- Resultado da aula: Dino desenhado a cada quadro, floresta em velocidade 5, limpeza e descrição acessível; borda provisória retirada.
- Seções: 9. Vídeos: 9.

## Diagnóstico e decisão

O desenho, a limpeza e as camadas ganham montagens separadas. A explicação de uma vez e sempre já aconteceu antes de Ao iniciar. A descrição para o leitor de tela, presente no projeto canônico, agora tem experiência e instrução explícitas.

## Triagem dos conceitos

| Conceito | Como e quando trabalhar | Razão |
| --- | --- | --- |
| Desenho por quadro e limpeza | draw-loop antes do desenho e da limpeza | Comparar imagem única, rastro e atualização limpa. |
| Ordem de desenho | layers antes da floresta | Observar quem cobre quem. |
| Descrição acessível | screen-reader antes da descrição | Ouvir a diferença entre uma tela sem frase e uma instrução escrita. |

## Proposta final

### Seção 1. Compare o desenho no começo e a cada quadro

**Tarefa:** Compare desenho único, desenho a cada quadro e desenho com limpeza.

**Blocos na página:** video-quadros → fala-quadros → experiencia-laco.

**Zappy na página (não gravar):** Compare desenho único, desenho a cada quadro e desenho com limpeza.

**Experiência existente:** `draw-loop`. Nesta experiência, deixe Desenhar o Dino em Só no começo. Clique em Avançar 1 quadro algumas vezes e compare o desenho com o x mostrado. Troque para A cada quadro e avance mais alguns quadros. Por último, ligue Limpar a tela antes e avance de novo. Compare os três jeitos. Sem palpite e sem pergunta final. Os controles e metas foram conferidos no código da cena. O vídeo é uma demonstração: o narrador faz esses testes na primeira pessoa, explica cada resultado e só no fim passa a vez.

### Seção 2. Mostre o Dino a cada quadro

**Tarefa:** Desenhe dino dentro de A cada quadro do jogo.

**Blocos na página:** video-motor-e-dino → fala-motor-e-dino.

**Zappy na página (não gravar):** Desenhe dino dentro de A cada quadro do jogo.

**Conclui quando:** vídeo assistido e critérios conferidos em Verificar esta parte.

- Encaixe A cada quadro dentro de Enquanto estiver rodando.
- Desenhe o sprite dino dentro de A cada quadro.

### Seção 3. Prepare uma imagem nova em cada quadro

**Tarefa:** Limpe a tela antes de desenhar dino.

**Blocos na página:** video-limpeza → fala-limpeza.

**Zappy na página (não gravar):** Limpe a tela antes de desenhar dino.

**Conclui quando:** vídeo assistido e critérios conferidos em Verificar esta parte.

- Limpe a tela antes de desenhar o Dino.

### Seção 4. Compare a ordem dos desenhos

**Tarefa:** Troque a ordem dos dois desenhos e compare o que fica visível.

**Blocos na página:** video-camadas → fala-camadas → experiencia-camadas.

**Zappy na página (não gravar):** Troque a ordem dos dois desenhos e compare o que fica visível.

**Experiência existente:** `layers`. Na lista de desenhos desta experiência, coloque Dino depois de Floresta. Observe a tela. Troque a ordem para desenhar Dino antes de Floresta. Observe de novo e termine com Dino depois de Floresta. Sem palpite e sem pergunta final. Os controles e metas foram conferidos no código da cena. O vídeo é uma demonstração: o narrador faz esses testes na primeira pessoa, explica cada resultado e só no fim passa a vez.

### Seção 5. Coloque a floresta atrás do Dino

**Tarefa:** Desenhe uma floresta em velocidade 5 antes do Dino.

**Blocos na página:** video-ordem-certa → fala-ordem-certa.

**Zappy na página (não gravar):** Desenhe uma floresta em velocidade 5 antes do Dino.

**Conclui quando:** vídeo assistido e critérios conferidos em Verificar esta parte.

- Limpe a tela antes de desenhar a floresta.
- Desenhe a floresta com velocidade 5 antes do Dino.
- Desenhe o sprite dino dentro de A cada quadro.
- Use uma única floresta.

### Seção 6. Retire a borda provisória

**Tarefa:** Retire a borda e preserve a criação do Dino.

**Blocos na página:** video-retirar-borda → fala-retirar-borda.

**Zappy na página (não gravar):** Retire a borda e preserve a criação do Dino.

**Conclui quando:** vídeo assistido e critérios conferidos em Verificar esta parte.

- Retire a borda provisória da tela.
- Mantenha o dinossauro criado em Ao iniciar.

### Seção 7. Ouça a descrição do jogo

**Tarefa:** Ouça a tela sem descrição e depois com a tarefa e o controle escritos.

**Blocos na página:** video-descricao → fala-descricao → experiencia-descricao.

**Zappy na página (não gravar):** Ouça a tela sem descrição e depois com a tarefa e o controle escritos.

**Experiência existente:** `screen-reader`. Clique em Ouvir a tela com o campo vazio. Depois escreva Corra com o dino e pule os cactos apertando espaço e clique em Ouvir a tela novamente. Compare o que foi lido antes e depois da frase. Sem palpite e sem pergunta final. Os controles e metas foram conferidos no código da cena. O vídeo é uma demonstração: o narrador faz esses testes na primeira pessoa, explica cada resultado e só no fim passa a vez.

### Seção 8. Escreva a descrição do jogo

**Tarefa:** Escreva a tarefa e o controle na descrição para o leitor de tela.

**Blocos na página:** video-descrever-jogo → fala-descrever-jogo.

**Zappy na página (não gravar):** Escreva a tarefa e o controle na descrição para o leitor de tela.

**Conclui quando:** vídeo assistido e critérios conferidos em Verificar esta parte.

- Descreva o jogo em Ao iniciar.

### Seção 9. Teste e envie seu jogo

**Tarefa:** Teste o seu jogo, clique em Verificar esta parte e envie o projeto para o guia. Confirme em Enviar e clique em Concluir fase.

**Blocos na página:** video-entrega → fala-entrega → projeto.

**Zappy na página (não gravar):** Teste o seu jogo, clique em Verificar esta parte e envie o projeto para o guia. Confirme em Enviar e clique em Concluir fase.

**Conclui quando:** vídeo assistido e critérios conferidos em Verificar esta parte, com o envio em Enviar para o guia confirmado em Enviar.

- Desenhe o sprite dino dentro de A cada quadro.
- Limpe a tela antes de desenhar a floresta.
- Desenhe a floresta com velocidade 5 antes do Dino.
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
