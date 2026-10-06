# Corre, Dino! · Aula 7 · Separe a abertura da partida

Fonte editorial: `qa/corre-dino.conteudo.json`. Este arquivo, o roteiro e o manifesto são gerados juntos. Para a sequência completa e a implantação, consulte [o mapa do curso](../modulos-corre-dino.md).

## Resumo

- Estado de entrada: A corrida começa assim que o projeto carrega.
- Resultado da aula: Estado inicial inicio; movimento, desenho do Dino e cactos, limpeza e nascimento protegidos por jogando.
- Seções: 5. Vídeos: 5.

## Diagnóstico e decisão

A experiência antecede a criação do estado. A montagem separa as regras de cada quadro do relógio de nascimento e testa jogando antes de devolver inicio. Esta aula entrega a espera; a interface de começo é construída na aula seguinte.

## Triagem dos conceitos

| Conceito | Como e quando trabalhar | Razão |
| --- | --- | --- |
| Estado e condição | game-state antes dos ramos | Comparar ações fora e dentro de Se jogando, na abertura e durante a partida. |
| Relógios independentes | segunda montagem retoma a mesma experiência | Guardar ações do quadro não move o relógio de nascimento. |

## Proposta final

### Seção 1. Escolha quando o jogo pode agir

**Tarefa:** Compare o início e a partida com a criação fora e dentro da condição.

**Blocos na página:** video-condicao → fala-condicao → experiencia-condicao.

**Zappy na página (não gravar):** Compare o início e a partida com a criação fora e dentro da condição.

**Experiência existente:** `game-state`. Na experiência, deixe Criar cacto fora de Se o estado do jogo é jogando. Sem começar a partida, clique em Tempo e espere nascer pelo menos um cacto. Leve Criar cacto para dentro de Se o estado do jogo é jogando. Na tela de início, deixe o tempo passar três segundos e observe o contador. Depois toque na tela para começar a partida e deixe o tempo passar novamente. Compare os nascimentos nos dois momentos. Sem palpite e sem pergunta final. Os controles e metas foram conferidos no código da cena.

### Seção 2. Guarde em que momento o jogo está

**Tarefa:** Guarde inicio em Ao iniciar e observe que isso sozinho não protege as ações.

**Blocos na página:** video-estado-inicio → fala-estado-inicio.

**Zappy na página (não gravar):** Guarde inicio em Ao iniciar e observe que isso sozinho não protege as ações.

**Conclui quando:** vídeo assistido e critérios conferidos em Verificar esta etapa.

- No Ao iniciar, coloque Mudar o estado do jogo para inicio.

### Seção 3. Separe as ações da partida

**Tarefa:** Proteja as ações da partida e mantenha limpar e floresta antes do Se.

**Blocos na página:** video-embrulhar → fala-embrulhar.

**Zappy na página (não gravar):** Proteja as ações da partida e mantenha limpar e floresta antes do Se.

**Conclui quando:** vídeo assistido e critérios conferidos em Verificar esta etapa.

- Aplicar a gravidade fica no então de Se o estado do jogo é jogando, na ordem da montagem.
- Controlar o dinossauro fica no então de Se o estado do jogo é jogando, na ordem da montagem.
- Desenhar o sprite do dino fica no então de Se o estado do jogo é jogando, na ordem da montagem.
- Mover os sprites do grupo fica no então de Se o estado do jogo é jogando, na ordem da montagem.
- Desenhar o grupo fica no então de Se o estado do jogo é jogando, na ordem da montagem.
- A faxina, que tira do grupo quem saiu da tela, fica por último dentro do então.
- Limpar a tela continua fora do Se, direto no A cada quadro do jogo.
- Desenhar fundo de floresta continua fora do Se, logo acima dele.

### Seção 4. Faça o relógio esperar a partida

**Tarefa:** Proteja também a criação no relógio e termine com inicio em Ao iniciar.

**Blocos na página:** video-relogio → fala-relogio.

**Zappy na página (não gravar):** Proteja também a criação no relógio e termine com inicio em Ao iniciar.

**Conclui quando:** vídeo assistido e critérios conferidos em Verificar esta etapa.

- No A cada 1,4 segundos, o No grupo criar obstáculo fica dentro de um Se o estado do jogo é jogando. Este passo não aparece na tela, e é este critério que confere por você.

### Seção 5. Teste e envie seu jogo

**Tarefa:** Teste o resultado da aula, verifique a etapa e envie o projeto. Confirme em Enviar e clique em Concluir aula.

**Blocos na página:** video-entrega → fala-entrega → projeto.

**Zappy na página (não gravar):** Teste o resultado da aula, verifique a etapa e envie o projeto. Confirme em Enviar e clique em Concluir aula.

**Conclui quando:** vídeo assistido e critérios conferidos em Verificar esta etapa, com envio confirmado ao professor.

- No Ao iniciar, coloque Mudar o estado do jogo para inicio.
- Aplicar a gravidade fica no então de Se o estado do jogo é jogando, na ordem da montagem.
- Controlar o dinossauro fica no então de Se o estado do jogo é jogando, na ordem da montagem.
- Desenhar o sprite do dino fica no então de Se o estado do jogo é jogando, na ordem da montagem.
- Mover os sprites do grupo fica no então de Se o estado do jogo é jogando, na ordem da montagem.
- Desenhar o grupo fica no então de Se o estado do jogo é jogando, na ordem da montagem.
- A faxina, que tira do grupo quem saiu da tela, fica por último dentro do então.
- Mantenha uma única ação Aplicar a gravidade.
- Mantenha uma única ação Controlar o dinossauro.
- Mantenha um único Desenhar o sprite do dino.
- Mantenha um único Mover os sprites do grupo.
- Mantenha um único Desenhar o grupo.
- Mantenha uma única faxina do grupo.
- Limpar a tela continua fora do Se, direto no A cada quadro do jogo.
- Desenhar fundo de floresta continua fora do Se, logo acima dele.
- No A cada 1,4 segundos, o No grupo criar obstáculo fica dentro de um Se o estado do jogo é jogando. Este passo não aparece na tela, e é este critério que confere por você.
- Mantenha um único No grupo criar obstáculo.

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
| Quando o sprite pular | Jogo 2D → Controles → Teclado, ações e toque |
| Tocar efeito | Jogo 2D → Som → Efeitos prontos |
| Tirar do grupo quem sair da tela, para cada um (chamado ) | Jogo 2D → Grupos → Participação e limpeza |
| o estado do jogo é ? | Jogo 2D → Jogo e telas → Telas e partida |
| Mudar o estado do jogo para | Jogo 2D → Jogo e telas → Telas e partida |
| Descrever o jogo para leitor de tela | Jogo 2D → Jogo e telas → Telas e partida |
| Preparar o jogo em tela cheia, tela × , fundo | Jogo 2D → Jogo e telas → Preparar a área do jogo |
| No grupo criar obstáculo em x tamanho com vx | Jogo 2D → Kits prontos → Dino |
| A cada quadro do jogo | Jogo 2D → Tempo → Quadros e intervalos |
| Mover os sprites do grupo usando suas velocidades | Jogo 2D → Grupos → Movimento |
| Condição se, senão se e senão | Programação → ❓ Lógica & Se |
| Número | Programação → 🔣 Valores |

## Continuidade e produção

Aula 7 na cadeia `corre-dino`. Entrada: etapa 6; saída: etapa 7 de `qa/corre-dino-etapas.ts`. Os 13 marcos originais e o código do jogo permanecem preservados.

A ordem vídeo → Zappy → atividade é editorial. Configurar videoBeforeActivity no curso e conferir com perfil de aluno; não presumir que a ordem por si só ativa o bloqueio. Gravar os vídeos revisados, anexar o PDF quando aplicável e ensaiar com crianças antes de declarar o percurso validado.
