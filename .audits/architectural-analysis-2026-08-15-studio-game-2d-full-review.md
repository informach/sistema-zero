# Full review — Studio / Jogo 2D / Chuva de Meteoros

Data: 2026-08-15  
Commit-base: `e06cd030faea1a110b8371a35dba112de6a994ec`  
Escopo: implementação do lote atual do Studio, com foco no exemplo **Chuva de Meteoros**, na extensão **Jogo 2D** clássica e nos trechos compartilhados/avançados alterados no mesmo trabalho.

Atualização de remediação: **os quatro achados foram resolvidos em 2026-08-15**. As seções abaixo preservam a evidência original; o status e a correção aplicada estão resumidos na tabela.

## Resumo executivo

O exemplo Chuva de Meteoros e o caminho clássico da extensão Jogo 2D passaram na bateria completa de testes e no fluxo E2E do navegador. As correções de cooldown, descarte fora da tela, Pong, lifecycle, colisão de raquete/bordas e geração JavaScript estão coerentes com os contratos atuais.

A revisão encontrou quatro achados no snapshot original:

| Prioridade | Área | Achado | Status e correção |
|---|---|---|---|
| P1 — alta | Reino Zero Pro | As fases anunciam natação com `cima`, mas a água tem só uma célula de profundidade e `cima` não produz subida na água. | Resolvido: piscinas de quatro células e controle vertical real por `cima`/`baixo`. |
| P2 — média | Colisão avançada | O índice espacial muda o resultado observável do mesmo programa a partir de exatamente 1.600 pares. | Resolvido: os dois caminhos usam o mesmo snapshot inicial das caixas de B. |
| P2 — média | Instrumentação de performance | A calibração do E2E não participa da asserção e o contador `linhasDeMapa` não consegue registrar o próprio cache miss. | Resolvido: calibração fictícia removida e cache miss contabilizado no ponto da varredura. |
| P3 — baixa | Renderização clássica | A otimização de smoothing deixou de restaurar o estado anterior do contexto e sempre volta para `true`. | Resolvido: estado real preservado em desenho avulso, lote e exceção. |

Na etapa inicial de revisão nenhum arquivo de produção foi alterado. A remediação posterior modificou os runtimes, fases e testes citados acima.

## Achados

### P1 — A mecânica de água prometida não funciona como natação

**Evidência**

- `game-2d-advanced/examples/reinoZeroProLevels.ts:208` preenche o fundo de um poço de água somente em `PRO_STAGE_HEIGHT - 1`. A inspeção das oito fases de água confirmou que todas têm exatamente uma linha de `~`, com 12 a 32 células.
- `game-2d-advanced/examples/reinoZeroProLevels.ts:557-559` ensina: “Na água você nada devagar e cai devagar. Segure para cima para subir.”
- `game-2d-advanced/runtime/campaign.ts:575` considera o herói na água apenas quando o centro dele cruza uma célula `~`.
- `game-2d-advanced/runtime/campaign.ts:580` aplica `cima`/`baixo` apenas em escadas.
- `game-2d-advanced/runtime/campaign.ts:583` só dá impulso para cima na água por meio da ação `pular`.
- Uma sonda determinística de um quadro mediu `vy = 3` segurando `cima` dentro da água e `vy = -120` segurando `pular`: o comando documentado afunda, enquanto outro comando sobe.

**Impacto**

Oito das 32 fases da campanha anunciam uma mecânica que não existe no controle implementado. Como a água ocupa só os 16 px inferiores, o estado aquático também é breve demais para formar uma área navegável: o herói atravessa a faixa e volta à queda normal/morte. As fases podem continuar solucionáveis por salto, mas não entregam o comportamento ensinado ao jogador.

**Correção recomendada**

Modelar volume de água com profundidade útil nos poços e fazer `cima`/`baixo` controlar o deslocamento vertical enquanto `inWater`; alternativamente, mudar explicitamente o contrato de controles e todos os textos para a ação realmente aceita. Cobrir com playthrough dinâmico e invariantes que validem profundidade, entrada, permanência e saída da água.

### P2 — O limiar do índice espacial altera a semântica da colisão

**Evidência**

- `game-2d-advanced/runtime/overlapIndex.ts:12-16` documenta que as células são um snapshot e que teletransportar um item B dentro do callback não será percebido nessa passada.
- `game-2d-advanced/runtime/overlapIndex.ts:33` fixa o limiar em 1.600 pares.
- `game-2d-advanced/runtime.ts:1920-1927` constrói o índice uma vez e o reutiliza para todos os itens A; o callback público em `runtime.ts:1936` pode mover/recriar entidades antes das iterações seguintes.
- Sonda determinística com o mesmo callback: 39 × 40 entidades usa o laço direto e registra 2 contatos; 40 × 40 ativa o índice e registra 1. A única mudança é cruzar o limiar de população.

**Impacto**

Um programa passa a ter resultado diferente quando a quantidade de sprites cresce. Isso torna pontuação, coleta, dano ou teleporte dependentes de um detalhe interno de performance, difícil de explicar e depurar em projetos dos alunos. Documentar a divergência no código não restaura o contrato da API.

**Correção recomendada**

Escolher uma semântica única. A opção mais compatível é versionar posições/pools e invalidar o índice — caindo para leitura viva no restante da passada — quando o callback move ou cria itens de B. Outra opção é tornar ambos os caminhos snapshots imutáveis, desde que a mudança de contrato seja deliberada e coberta por testes nos dois lados do limiar.

### P2 — A suíte de performance contém sinais vacuosos

**Evidência A: calibração sem efeito**

- `e2e/reino-zero-pro-performance.spec.ts:98-110` mede `calibracaoMs` e diz que o relógio do jogo será comparado contra ela.
- `e2e/reino-zero-pro-performance.spec.ts:118-121` verifica apenas `quadrosPorSegundo > 30`; `calibracaoMs` é comparado com o próprio valor, portanto nunca limita nem normaliza a medição.

**Evidência B: contador incapaz de contar**

- `game-2d-advanced/runtime.ts:514-521` faz `_mapCols` marcar `_colsPass = true` antes de retornar.
- `game-2d-advanced/runtime.ts:535` incrementa `linhasDeMapa` apenas quando `_colsPass !== true`, condição que já ficou falsa na linha anterior.
- Não existe outro incremento de `linhasDeMapa` no runtime. Mesmo assim, `game-2d-advanced/__tests__/framePerf.test.ts:255-267` e o E2E em `reino-zero-pro-performance.spec.ts:132-134` só exigem zero.

**Impacto**

O E2E pode passar sem cumprir a normalização descrita e o contador de varredura não consegue acusar a primeira varredura nem uma regressão no ramo RPG. Isso cria confiança indevida precisamente na suíte destinada a proteger desempenho.

**Correção recomendada**

Capturar o cache miss antes de chamar `_mapCols` ou retornar explicitamente a quantidade de linhas varridas, adicionando ao menos um teste positivo que prove que o contador sai de zero. Para o relógio, usar uma razão real contra a calibração da mesma execução ou remover a calibração e descrever `> 30 FPS` como smoke check tolerante.

### P3 — O helper de pixel art não preserva o estado anterior do canvas

**Evidência**

- Antes desta implementação, `_crispDraw` lia `ctx.imageSmoothingEnabled` e restaurava esse valor ao terminar.
- `game-2d/runtime/sprites.ts:86-100` agora usa `_smoothRestore = true` como padrão e `_crispBatchEnd` também força `true`.
- Os testes em `game-2d/__tests__/runtime.test.ts:3276-3368` exercitam apenas o contexto inicialmente em `true`; não cobrem um chamador que já configurou smoothing como `false`.

**Impacto**

Código de Canvas do núcleo ou código livre que configure o contexto para pixel art pode chamar um helper do Jogo 2D e receber o contexto alterado para `true`. Além disso, o cache interno pode ficar divergente se código externo mudar diretamente a propriedade. É uma regressão de composição, embora de alcance menor que os problemas anteriores.

**Correção recomendada**

No desenho avulso, ler e restaurar o estado real do contexto. Em lotes, guardar o estado uma vez na abertura e restaurá-lo no `finally` do fechamento; manter o cache apenas dentro de uma região cujo estado seja controlado pelo runtime. Adicionar teste começando em `false`, incluindo o caso de exceção no callback.

## Comportamentos revisados e aprovados

- **Chuva de Meteoros:** descarte com margem de 40 px preservado do bloco até o JavaScript/runtime; E2E do exemplo passou.
- **Cooldown clássico:** deadline absoluto por `_frameStamp`, duração exata de N quadros, pausa/reinício e valores fracionários cobertos.
- **Pong:** migrado para blocos canônicos de raquete, pares de bordas, controle vertical e dimensões do palco; geração e contratos passaram.
- **Duelo:** janela de acerto e nocaute simultâneo cobertos.
- **Reino Zero Pro:** plataformas antes inalcançáveis foram reposicionadas e ganharam playthrough real; inimigos terrestres abaixo do palco agora são descartados; desenho em lote usa `try/finally`; o contador renomeado para `visitas` reflete melhor o que mede.
- **Documentação/manifesto/toolbox:** testes de deriva confirmam enums, pares de bordas, helpers, categorias e blocos visíveis sincronizados.

## Verificação executada

| Verificação | Resultado |
|---|---|
| Suíte completa `game-2d/__tests__` após a remediação | 1.626 aprovados, 0 falhas |
| Suíte completa `game-2d-advanced/__tests__` após a remediação | 1.144 aprovados, 0 falhas |
| Suíte integral do Studio após a remediação | 7.764 aprovados, 0 falhas, 491 arquivos |
| Playwright Chromium — Chuva de Meteoros | aprovado |
| Playwright Chromium — performance do Reino Zero Pro | aprovado com o relógio explicitamente tratado como smoke check e contadores anti-vácuo |
| TypeScript `tsc --noEmit` | aprovado |
| Biome `biome check .` no snapshot final | 1.213 arquivos, sem erros |
| `git diff --check` no snapshot final | aprovado |

## Observação de escopo

O worktree estava recebendo ajustes concorrentes durante a revisão. As análises e verificações foram reancoradas no conteúdo final observado; mudanças que corrigiram plataformas, descarte de inimigos, `try/finally`, nomenclatura da sonda e contratos de documentação foram reavaliadas e não aparecem como achados abertos.
