# Corre, Dino! · Aula 8 · Comece por tecla ou toque

Fonte editorial: `qa/corre-dino.conteudo.json`. Este arquivo, o roteiro e o manifesto são gerados juntos. Para a sequência completa e a implantação, consulte [o mapa do curso](../modulos-corre-dino.md).

## Resumo

- Estado de entrada: Jogo esperando no estado inicio, com a floresta visível.
- Resultado da aula: Tela de início e um evento de qualquer tecla ou toque que muda inicio para jogando.
- Seções: 4. Vídeos: 4.

## Diagnóstico e decisão

A condição da aula anterior é reaplicada ao ramo inicio. A experiência de controles vem antes do evento, e o evento final é montado diretamente. O convite escrito e os controles aceitos terminam coerentes.

## Triagem dos conceitos

| Conceito | Como e quando trabalhar | Razão |
| --- | --- | --- |
| Ramos da condição | retoma o Se da aula 7 | Mostrar uma tela no estado inicio, sem executar a partida. |
| Entrada ampla | controls antes do evento | Testar tecla e toque e comparar qual evento responde. |

## Proposta final

### Seção 1. Desenhe a tela de início

**Tarefa:** Mostre a abertura no senão se inicio, com título e convite para começar.

**Blocos na página:** video-menu → fala-menu.

**Zappy na página (não gravar):** Mostre a abertura no senão se inicio, com título e convite para começar.

**Conclui quando:** vídeo assistido e critérios conferidos em Verificar esta parte.

- No senão se o estado do jogo é inicio, mostre a tela de início com a dica dos dois jeitos.

### Seção 2. Compare tecla e toque para começar

**Tarefa:** Teste toque e Enter antes e depois de mudar o lugar da peça Começar.

**Blocos na página:** video-convite → fala-convite → experiencia-convite.

**Zappy na página (não gravar):** Teste toque e Enter antes e depois de mudar o lugar da peça Começar.

**Experiência existente:** `controls`. Na experiência, com Começar em Quando apertar a tecla, toque na tela de início e observe. Depois clique em Apertar Enter e, em seguida, em Voltar ao início. Leve Começar para Quando apertar qualquer tecla ou tocar na tela. Teste o toque, volte ao início e teste Enter outra vez. Compare os dois jeitos. Sem palpite e sem pergunta final. Os controles e metas foram conferidos no código da cena. O vídeo é uma demonstração: o narrador faz esses testes na primeira pessoa, explica cada resultado e só no fim passa a vez.

### Seção 3. Ligue a entrada ao início da partida

**Tarefa:** Comece a partida somente quando uma tecla ou toque encontrar o estado inicio.

**Blocos na página:** video-entrada-ampla → fala-entrada-ampla.

**Zappy na página (não gravar):** Comece a partida somente quando uma tecla ou toque encontrar o estado inicio.

**Conclui quando:** vídeo assistido e critérios conferidos em Verificar esta parte.

- Qualquer tecla ou toque começa a partida somente quando o estado do jogo é inicio.
- Use a entrada de qualquer tecla ou toque, sem um evento separado só para Enter.
- A dica da tela de início passa a descrever os dois jeitos de começar.

### Seção 4. Teste e envie seu jogo

**Tarefa:** Teste o seu jogo, clique em Verificar esta parte e envie o projeto para o guia. Confirme em Enviar e clique em Concluir fase.

**Blocos na página:** video-entrega → fala-entrega → projeto.

**Zappy na página (não gravar):** Teste o seu jogo, clique em Verificar esta parte e envie o projeto para o guia. Confirme em Enviar e clique em Concluir fase.

**Conclui quando:** vídeo assistido e critérios conferidos em Verificar esta parte, com o envio em Enviar para o guia confirmado em Enviar.

- No Ao iniciar, o jogo continua abrindo com Mudar o estado do jogo para inicio.
- No senão se o estado do jogo é inicio, mostre a tela de início com a dica dos dois jeitos.
- Qualquer tecla ou toque começa a partida somente quando o estado do jogo é inicio.
- Use a entrada de qualquer tecla ou toque, sem um evento separado só para Enter.
- No A cada 1,4 segundos, o No grupo criar obstáculo continua dentro de um Se o estado do jogo é jogando.

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
| Desenhar o sprite | Jogo 2D → Sprites → Criar e trocar aparência |
| A cada segundos | Jogo 2D → Tempo → Quadros e intervalos |
| Desenhar fundo de floresta (velocidade ) | Jogo 2D → Cenários → Fundos |
| Quando apertar qualquer tecla ou tocar na tela | Jogo 2D → Controles → Teclado, ações e toque |
| Quando o sprite pular | Jogo 2D → Controles → Teclado, ações e toque |
| Quando apertar a tecla | Jogo 2D → Controles → Teclado, ações e toque |
| Tocar efeito | Jogo 2D → Som → Efeitos prontos |
| Tirar do grupo quem sair da tela, para cada um (chamado ) | Jogo 2D → Grupos → Participação e limpeza |
| o estado do jogo é ? | Jogo 2D → Jogo e telas → Telas e partida |
| Mudar o estado do jogo para | Jogo 2D → Jogo e telas → Telas e partida |
| Descrever o jogo para leitor de tela | Jogo 2D → Jogo e telas → Telas e partida |
| Preparar o jogo em tela cheia, tela × , fundo | Jogo 2D → Jogo e telas → Preparar a área do jogo |
| Mostrar tela com título subtítulo dica fundo | Jogo 2D → Jogo e telas → Telas e partida |
| No grupo criar obstáculo em x tamanho com vx | Jogo 2D → Kits prontos → Dino |
| A cada quadro do jogo | Jogo 2D → Tempo → Quadros e intervalos |
| Mover os sprites do grupo usando suas velocidades | Jogo 2D → Grupos → Movimento |
| Condição se, senão se e senão | Programação → ❓ Lógica & Se |
| Número | Programação → 🔣 Valores |
| texto | Programação → 🔣 Valores |

## Continuidade e produção

Aula 8 na cadeia `corre-dino`. Entrada: etapa 7; saída: etapa 8 de `qa/corre-dino-etapas.ts`. Os 13 marcos originais e o código do jogo permanecem preservados.

A ordem vídeo → Zappy → atividade é editorial. Configurar videoBeforeActivity no curso e conferir com perfil de aluno; não presumir que a ordem por si só ativa o bloqueio. Gravar os vídeos revisados, anexar o PDF quando aplicável e ensaiar com crianças antes de declarar o percurso validado.
