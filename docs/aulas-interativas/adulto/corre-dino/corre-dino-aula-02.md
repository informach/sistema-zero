# Corre, Dino! · Aula 2 · Mostre o Dino e a floresta

Fonte editorial: `qa/corre-dino.conteudo.json`. Este arquivo, o roteiro e o manifesto são gerados juntos. Para a sequência completa e a implantação, consulte [o mapa do curso](modulos.md).

## Resumo

- Estado de entrada: Tela e Dino criados na aula 1.
- Resultado da aula: Dino desenhado a cada quadro, floresta em velocidade 5, limpeza e descrição acessível; borda provisória retirada.
- Seções: 9. Vídeos: 9.

**Vozes e gravação:** Só a professora fala nos vídeos; não há avatar nem mascote. O recado da página é texto, sem personagem e sem voz no vídeo. A versão adulta ainda não foi gravada.

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

**Tarefa:** Sua vez: compare o desenho só no começo, o desenho a cada quadro e o desenho com a tela limpa antes. Quando terminar, clique em Próxima seção.

**Blocos na página:** video-quadros → fala-quadros → experiencia-laco.

**Recado na página (não gravar):** Sua vez: compare o desenho só no começo, o desenho a cada quadro e o desenho com a tela limpa antes. Quando terminar, clique em Próxima seção.

**Experiência existente:** `draw-loop`. Nesta experiência, deixe Desenhar o Dino em Só no começo. Clique em Avançar 1 quadro algumas vezes e compare o desenho com o x mostrado. Troque para A cada quadro e avance mais alguns quadros. Por último, ligue Limpar a tela antes e avance de novo. Compare os três jeitos. Sem palpite e sem pergunta final. Os controles e metas foram conferidos no código da cena. O vídeo é uma demonstração: o narrador faz esses testes na primeira pessoa, explica cada resultado e só no fim passa a vez.

### Seção 2. Mostre o Dino a cada quadro

**Tarefa:** Agora faça o seu Dino aparecer. Coloque A cada quadro do jogo em Enquanto estiver rodando e, dentro dele, Desenhar o sprite dino. Depois, clique em Verificar esta etapa e, em seguida, em Próxima seção.

**Blocos na página:** video-motor-e-dino → fala-motor-e-dino.

**Recado na página (não gravar):** Agora faça o seu Dino aparecer. Coloque A cada quadro do jogo em Enquanto estiver rodando e, dentro dele, Desenhar o sprite dino. Depois, clique em Verificar esta etapa e, em seguida, em Próxima seção.

**Conclui quando:** vídeo assistido e critérios conferidos em Verificar esta etapa.

- Encaixe A cada quadro dentro de Enquanto estiver rodando.
- Desenhe o sprite dino dentro de A cada quadro.

### Seção 3. Prepare uma imagem nova em cada quadro

**Tarefa:** Agora prepare uma imagem nova em cada quadro. Coloque Limpar a tela antes de Desenhar o sprite dino. Depois, clique em Verificar esta etapa e, em seguida, em Próxima seção.

**Blocos na página:** video-limpeza → fala-limpeza.

**Recado na página (não gravar):** Agora prepare uma imagem nova em cada quadro. Coloque Limpar a tela antes de Desenhar o sprite dino. Depois, clique em Verificar esta etapa e, em seguida, em Próxima seção.

**Conclui quando:** vídeo assistido e critérios conferidos em Verificar esta etapa.

- Limpe a tela antes de desenhar o Dino.

### Seção 4. Compare a ordem dos desenhos

**Tarefa:** Sua vez: troque a ordem dos dois desenhos, repare em quem fica na frente e termine com o Dino depois da Floresta. Quando terminar, clique em Próxima seção.

**Blocos na página:** video-camadas → fala-camadas → experiencia-camadas.

**Recado na página (não gravar):** Sua vez: troque a ordem dos dois desenhos, repare em quem fica na frente e termine com o Dino depois da Floresta. Quando terminar, clique em Próxima seção.

**Experiência existente:** `layers`. Na lista de desenhos desta experiência, coloque Dino depois de Floresta. Observe a tela. Troque a ordem para desenhar Dino antes de Floresta. Observe de novo e termine com Dino depois de Floresta. Sem palpite e sem pergunta final. Os controles e metas foram conferidos no código da cena. O vídeo é uma demonstração: o narrador faz esses testes na primeira pessoa, explica cada resultado e só no fim passa a vez.

### Seção 5. Coloque a floresta atrás do Dino

**Tarefa:** Agora deixe a floresta atrás do seu Dino. Coloque Desenhar fundo de floresta, com velocidade 5, entre a limpeza e o desenho do Dino. Depois, clique em Verificar esta etapa e, em seguida, em Próxima seção.

**Blocos na página:** video-ordem-certa → fala-ordem-certa.

**Recado na página (não gravar):** Agora deixe a floresta atrás do seu Dino. Coloque Desenhar fundo de floresta, com velocidade 5, entre a limpeza e o desenho do Dino. Depois, clique em Verificar esta etapa e, em seguida, em Próxima seção.

**Conclui quando:** vídeo assistido e critérios conferidos em Verificar esta etapa.

- Limpe a tela antes de desenhar a floresta.
- Desenhe a floresta com velocidade 5 antes do Dino.
- Desenhe o sprite dino dentro de A cada quadro.
- Use uma única floresta.

### Seção 6. Retire a borda provisória

**Tarefa:** Agora retire a borda provisória. Tire só Mostrar a borda da tela e deixe Criar dinossauro em Ao iniciar. Depois, clique em Verificar esta etapa e, em seguida, em Próxima seção.

**Blocos na página:** video-retirar-borda → fala-retirar-borda.

**Recado na página (não gravar):** Agora retire a borda provisória. Tire só Mostrar a borda da tela e deixe Criar dinossauro em Ao iniciar. Depois, clique em Verificar esta etapa e, em seguida, em Próxima seção.

**Conclui quando:** vídeo assistido e critérios conferidos em Verificar esta etapa.

- Retire a borda provisória da tela.
- Mantenha o dinossauro criado em Ao iniciar.

### Seção 7. Ouça a descrição do jogo

**Tarefa:** Sua vez: ouça a tela sem descrição e depois com a frase que diz o que fazer e como jogar. Quando terminar, clique em Próxima seção.

**Blocos na página:** video-descricao → fala-descricao → experiencia-descricao.

**Recado na página (não gravar):** Sua vez: ouça a tela sem descrição e depois com a frase que diz o que fazer e como jogar. Quando terminar, clique em Próxima seção.

**Experiência existente:** `screen-reader`. Clique em Ouvir a tela com o campo vazio. Depois escreva Corra com o dino e pule os cactos apertando espaço e clique em Ouvir a tela novamente. Compare o que foi lido antes e depois da frase. Sem palpite e sem pergunta final. Os controles e metas foram conferidos no código da cena. O vídeo é uma demonstração: o narrador faz esses testes na primeira pessoa, explica cada resultado e só no fim passa a vez.

### Seção 8. Escreva a descrição do jogo

**Tarefa:** Agora conte como se joga o seu jogo. Escreva na descrição a frase Corra com o dino e pule os cactos apertando espaço, sem ponto no fim. Depois, clique em Verificar esta etapa e, em seguida, em Próxima seção.

**Blocos na página:** video-descrever-jogo → fala-descrever-jogo.

**Recado na página (não gravar):** Agora conte como se joga o seu jogo. Escreva na descrição a frase Corra com o dino e pule os cactos apertando espaço, sem ponto no fim. Depois, clique em Verificar esta etapa e, em seguida, em Próxima seção.

**Conclui quando:** vídeo assistido e critérios conferidos em Verificar esta etapa.

- Descreva o jogo em Ao iniciar.

### Seção 9. Teste e envie seu jogo

**Tarefa:** Hora de testar e enviar o seu jogo. Confira o Dino na frente da floresta, clique em Verificar esta etapa e depois em Enviar para o professor. Confirme em Enviar e, quando o envio terminar, clique em Concluir aula.

**Blocos na página:** video-entrega → fala-entrega → projeto.

**Recado na página (não gravar):** Hora de testar e enviar o seu jogo. Confira o Dino na frente da floresta, clique em Verificar esta etapa e depois em Enviar para o professor. Confirme em Enviar e, quando o envio terminar, clique em Concluir aula.

**Conclui quando:** vídeo assistido e critérios conferidos em Verificar esta etapa, com o envio em Enviar para o professor confirmado em Enviar.

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

A ordem vídeo → recado → atividade é editorial. Configurar videoBeforeActivity no curso adulto e conferir com um perfil adulto; não presumir que a ordem por si só ativa o bloqueio. Gravar os vídeos adultos, anexar o PDF do Caderno do Aluno quando existir e ensaiar com adultos antes de declarar o percurso validado.
