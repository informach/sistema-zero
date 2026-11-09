# Corre, Dino! · Aula 12 · Varie o lugar e a velocidade dos cactos

Fonte editorial: `qa/corre-dino.conteudo.json`. Este arquivo, o roteiro e o manifesto são gerados juntos. Para a sequência completa e a implantação, consulte [o mapa do curso](modulos.md).

## Resumo

- Estado de entrada: Cactos nascendo sempre em x 560 e velocidade -5; partida completa com pontos.
- Resultado da aula: Nascimento com x de 500 a 560 e vx igual a -5 menos um número de 0 a 1.
- Seções: 5. Vídeos: 5.

**Produção:** a professora grava toda a fala principal. Na montagem kids, Dedé substitui somente os trechos da tabela, com a mesma frase e sem voz sobreposta. O master funciona sozinho no adulto. Notas e recados da página não são gravados. [Direção de voz e edição](../../../aulas-interativas-tecnico/DIRETRIZES-VOZ-ELEVENLABS.md).

## Diagnóstico e decisão

O sorteio vem antes das duas aplicações. A experiência mostra posições, repetições e as raias das duas velocidades. Lugar e velocidade têm montagens separadas, e a régua dos negativos vem logo antes da velocidade, que faz uma conta com números negativos. A fala não promete partidas sempre diferentes: números podem repetir.

**Revisão de 02/11/2026.** D3 (decisão da coordenação, 02/11/2026): a régua dos números negativos veio da Aula 13 com as mesmas chaves (video-regua-negativos, fala-regua-negativos, experiencia-number-line) e ficou entre o lugar e a velocidade, porque a velocidade sorteada já faz conta com negativos (-5 menos 0 ou 1). A Aula 12 tem agora cinco partes. O sorteio (o dado) e a régua (o termômetro deitado) passaram à exploração livre; as raias ficaram como observação, sem a conta no vídeo nem na nota de tela. A retomada da velocidade liga a régua às raias ("Tirar 1 é o mesmo que somar -1"), e as montagens ganharam "É este bloco que…", um campo por fala e a resposta à pergunta do Dedé ("Por que a conta usa menos?") começando pelo porquê.

## Triagem dos conceitos

| Conceito | Como e quando trabalhar | Razão |
| --- | --- | --- |
| Sorteio e faixa | random antes dos valores sorteados | Ver resultados dentro da faixa, inclusive repetições. |
| Números negativos e comparação | number-line logo antes da velocidade sorteada (D3, 02/11/2026) | Ver que somar -1 leva o número para a esquerda e que -5 é maior que -9, antes de fazer a conta da velocidade. |
| Variação da velocidade | random antes da velocidade; as raias comparam -5 e -6, sem a conta | Relacionar a conta com a direção já observada na aula 5. |

## Proposta final

### Seção 1. Onde nasce o próximo cacto?

**Tarefa:** Sua vez! Investigue onde os cactos nascem e com que velocidade quando o jogo sorteia. O Zappy te mostra o que testar, e você pode repetir quando quiser. Quando terminar, clique em Próxima parte.

**Blocos na página:** video-sorteio-tira-na-hora → fala-sorteio-tira-na-hora → experiencia-random.

**Recado na página (não gravar):** Sua vez! Investigue onde os cactos nascem e com que velocidade quando o jogo sorteia. O Zappy te mostra o que testar, e você pode repetir quando quiser. Quando terminar, clique em Próxima parte.

**Participação no vídeo:** A professora grava toda a fala. Substituições kids, sem sobrepor vozes:

video-sorteio-tira-na-hora-K1: Dedé substitui “E pode sair o mesmo lugar duas vezes?”. Antes: “sempre igual. Por isso, o jogo pode sortear o lugar de cada cacto novo, e também uma pequena diferença na velocidade.”. Depois: “O que você acha? Isso você vai testar na experiência. Agora você vai investigar onde os cactos nascem e com que”.

**Experiência em exploração livre:** `random` (`setup.freeExploration`), tela `packages/member-shell/src/components/scene-livre/dino/random.tsx` e falas do Zappy em `packages/core/src/learning/scene/guia-livre/dino/random.ts`. A experiência trabalha só a ideia, sem blocos, áreas do Estúdio nem código; os blocos ficam para a montagem.

**Instrução:** Compare os lugares sorteados na régua e até onde chegam os cactos de cada velocidade nas raias. O Zappy te mostra o que testar, e você pode repetir quando quiser.

**O que investigar (metas, em qualquer ordem):** Clique em Sortear um lugar algumas vezes e compare as marquinhas na régua. Clique em Sortear um lugar mais algumas vezes até um lugar ganhar duas marquinhas. Clique em Sortear uma velocidade até aparecerem um −5 e um −6 e compare as raias.

**Pistas, do aberto ao direto:** 1) Compare as marquinhas na régua depois de cada sorteio. 2) Sorteie uma coisa por vez: o lugar, depois a velocidade. 3) Clique em Sortear um lugar várias vezes. Depois clique em Sortear uma velocidade até sair um −5 e um −6. Sem palpite e sem pergunta final.

### Seção 2. Sorteie onde cada cacto nasce

**Tarefa:** Agora sorteie onde cada cacto nasce! Troque o x 560 do bloco que cria os cactos por um número de 500 a 560. Depois, clique em Verificar projeto e, em seguida, em Próxima parte.

**Blocos na página:** video-lugar-diferente → fala-lugar-diferente.

**Recado na página (não gravar):** Agora sorteie onde cada cacto nasce! Troque o x 560 do bloco que cria os cactos por um número de 500 a 560. Depois, clique em Verificar projeto e, em seguida, em Próxima parte.

**Participação no vídeo:** A professora grava toda a fala. Substituições kids, sem sobrepor vozes:

video-lugar-diferente-K1: Dedé substitui “Quais números eu coloco no sorteio?”. Antes: “em cima do 560, para ele tomar o lugar do número. É este bloco que sorteia um número, cada vez que um cacto nasce.”. Depois: “Os números do começo e do fim da faixa. Clique no 1 e troque por 500. Agora clique no 6 e troque por 560. A tela”.

**Conclui quando:** vídeo assistido e critérios conferidos em Verificar projeto.

- Sorteie a posição de entrada dos cactos, a partir da direita da pista.
- Preserve o relógio de 1,4 s, com o nascimento protegido pelo estado do jogo é jogando.
- Use um único bloco de criar cacto no projeto inteiro.

### Seção 3. Qual número é maior?

**Tarefa:** Sua vez! Investigue como os números negativos ficam na régua e qual deles é o maior. O Zappy te mostra o que testar, e você pode repetir quando quiser. Quando terminar, clique em Próxima parte.

**Blocos na página:** video-regua-negativos → fala-regua-negativos → experiencia-number-line.

**Recado na página (não gravar):** Sua vez! Investigue como os números negativos ficam na régua e qual deles é o maior. O Zappy te mostra o que testar, e você pode repetir quando quiser. Quando terminar, clique em Próxima parte.

**Participação no vídeo:** A professora grava toda a fala. Substituições kids, sem sobrepor vozes:

video-regua-negativos-K1: Dedé substitui “Qual é maior: menos cinco ou menos nove?”. Antes: “dos cactos são números negativos. E o jogo pode fazer uma pergunta sobre eles, como: o número é maior que -9?”. Depois: “O que você acha? Isso você vai testar na experiência. Agora você vai investigar como os números negativos ficam na reta”.

**Experiência em exploração livre:** `number-line` (`setup.freeExploration`), tela `packages/member-shell/src/components/scene-livre/number-line.tsx` e falas do Zappy em `packages/core/src/learning/scene/guia-livre/number-line.ts`. A experiência trabalha só a ideia, sem blocos, áreas do Estúdio nem código; os blocos ficam para a montagem.

**Instrução:** Compare para que lado o marcador anda quando o número diminui e onde a pergunta responde sim ou não. O Zappy te mostra o que testar, e você pode repetir quando quiser.

**O que investigar (metas, em qualquer ordem):** Clique em Somar -1 três vezes. Com o marcador no -5, clique em > maior que. Com > maior que escolhido, clique em Somar -1 até o marcador chegar no -9. Clique em Voltar ao começo, depois em = igual a, e em Somar -1 quatro vezes.

**Pistas, do aberto ao direto:** 1) Olhe para que lado o marcador anda a cada -1 e onde cada número mora na reta. 2) A reta é parecida com um termômetro deitado. Olhe a resposta embaixo dela: ela muda conforme o marcador anda e o sinal muda. 3) Clique em Voltar ao começo e em > maior que; depois clique em Somar -1 até o -9 e olhe a resposta. Sem palpite e sem pergunta final.

### Seção 4. Sorteie uma variação na velocidade

**Tarefa:** Agora sorteie uma variação na velocidade! No vx do mesmo bloco, use a conta -5 menos um número de 0 a 1. Depois, clique em Verificar projeto e, em seguida, em Próxima parte.

**Blocos na página:** video-velocidade-propria → fala-velocidade-propria.

**Recado na página (não gravar):** Agora sorteie uma variação na velocidade! No vx do mesmo bloco, use a conta -5 menos um número de 0 a 1. Depois, clique em Verificar projeto e, em seguida, em Próxima parte.

**Participação no vídeo:** A professora grava toda a fala. Substituições kids, sem sobrepor vozes:

video-velocidade-propria-K1: Dedé substitui “Por que a conta usa menos?”. Antes: “que faz uma conta com dois números. Clique no primeiro 0 e troque por -5. No sinal, troque + por −, o sinal de menos.”. Depois: “Porque, com o sinal de mais, a conta daria -5 ou -4, e alguns cactos ficariam mais lentos. Com o menos, sai -5 ou -6,”.

**Conclui quando:** vídeo assistido e critérios conferidos em Verificar projeto.

- Sorteie a posição de entrada dos cactos, a partir da direita da pista.
- Use um número negativo menos uma variação não negativa na velocidade dos cactos.
- Use um único bloco de criar cacto no projeto inteiro.

### Seção 5. Teste e envie seu jogo

**Tarefa:** Hora de testar e enviar o seu jogo! Jogue duas partidas e observe os cactos, clique em Verificar projeto e depois em Enviar meu projeto. Confirme em Enviar e, quando o envio terminar, clique em Concluir aula.

**Blocos na página:** video-entrega → fala-entrega → projeto.

**Recado na página (não gravar):** Hora de testar e enviar o seu jogo! Jogue duas partidas e observe os cactos, clique em Verificar projeto e depois em Enviar meu projeto. Confirme em Enviar e, quando o envio terminar, clique em Concluir aula.

**Conclui quando:** vídeo assistido e critérios conferidos em Verificar projeto, com o envio em Enviar meu projeto confirmado em Enviar.

- Sorteie a posição de entrada dos cactos, a partir da direita da pista.
- Use um número negativo menos uma variação não negativa na velocidade dos cactos.
- Preserve o relógio de 1,4 s, com o nascimento protegido pelo estado do jogo é jogando.
- Use um único bloco de criar cacto no projeto inteiro.

## Blocos disponíveis

| Bloco | Caminho na paleta |
| --- | --- |
| ⚡ Quando acontecer | 🗂️ Áreas do projeto |
| 🔁 Enquanto estiver rodando | 🗂️ Áreas do projeto |
| ⚙️ Ao iniciar | 🗂️ Áreas do projeto |
| Aplicar a gravidade do mundo ao sprite | Jogo 2D → Movimento → Velocidade e gravidade |
| Limpar a tela | Jogo 2D → Desenho e efeitos → Efeitos |
| Controlar o dinossauro , força do pulo | Jogo 2D → Kits prontos → Dino |
| Criar dinossauro em x y tamanho cor | Jogo 2D → Kits prontos → Dino |
| Criar grupo de sprites | Jogo 2D → Grupos → Criar e percorrer |
| Desenhar o grupo | Jogo 2D → Grupos → Desenho e ordem |
| Mostrar placar valor em x y cor tamanho | Jogo 2D → Vida e placar → Indicadores e texto na tela |
| Desenhar o sprite | Jogo 2D → Sprites → Criar e trocar aparência |
| A cada segundos | Jogo 2D → Tempo → Quadros e intervalos |
| Soltar explosão no sprite cor | Jogo 2D → Desenho e efeitos → Partículas |
| Desenhar fundo de floresta (velocidade ) | Jogo 2D → Cenários → Fundos |
| Quando apertar qualquer tecla ou tocar na tela | Jogo 2D → Controles → Teclado, ações e toque |
| Quando o sprite pular | Jogo 2D → Controles → Teclado, ações e toque |
| Para cada sprite do grupo que colidir com o sprite | Jogo 2D → Colisões → Encostar e bloquear |
| Tocar efeito | Jogo 2D → Som → Efeitos prontos |
| Tirar do grupo quem sair da tela, para cada um (chamado ) | Jogo 2D → Grupos → Participação e limpeza |
| um número de a | Jogo 2D → Sorteios → Números e posições |
| Reiniciar o jogo | Jogo 2D → Jogo e telas → Telas e partida |
| o estado do jogo é ? | Jogo 2D → Jogo e telas → Telas e partida |
| Usar área de colisão de % do tamanho para o sprite | Jogo 2D → Colisões → Área de contato |
| Mudar o estado do jogo para | Jogo 2D → Jogo e telas → Telas e partida |
| Descrever o jogo para leitor de tela | Jogo 2D → Jogo e telas → Telas e partida |
| Preparar o jogo em tela cheia, tela × , fundo | Jogo 2D → Jogo e telas → Preparar a área do jogo |
| Tremer a tela com intensidade | Jogo 2D → Desenho e efeitos → Efeitos |
| Mostrar tela com título subtítulo dica fundo | Jogo 2D → Jogo e telas → Telas e partida |
| No grupo criar obstáculo em x tamanho com vx | Jogo 2D → Kits prontos → Dino |
| A cada quadro do jogo | Jogo 2D → Tempo → Quadros e intervalos |
| Mover os sprites do grupo usando suas velocidades | Jogo 2D → Grupos → Movimento |
| Condição se, senão se e senão | Programação → ❓ Lógica & Se |
| Criar variável com valor | Programação → 🏷️ Variáveis |
| Somar em variável | Programação → 🏷️ Variáveis |
| Conta matemática | Programação → 🔢 Matemática |
| juntar texto | Programação → 🔣 Valores |
| Número | Programação → 🔣 Valores |
| texto | Programação → 🔣 Valores |
| valor da variável | Programação → 🔣 Valores |

## Continuidade e produção

Aula 12 na cadeia `corre-dino`. Entrada: etapa 11; saída: etapa 12 de `qa/corre-dino-etapas.ts`. Os 13 marcos originais e o código do jogo permanecem preservados.

A ordem vídeo → Zappy → atividade é editorial. Configurar videoBeforeActivity no curso e conferir com perfil de aluno; não presumir que a ordem por si só ativa o bloqueio. Gravar os vídeos revisados, anexar o PDF quando aplicável e ensaiar com crianças antes de declarar o percurso validado.
