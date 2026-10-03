# Full review — Jogo 2D após as correções

Data: 02/10/2026. Revisão do conjunto local de mudanças de cenários, perspectiva, sprites e dos três exemplos Descida da Neve, incluindo a rodada de correções anterior.

**Resultado da revisão original: ainda precisava de correções.** Foram confirmados nove achados: três P1 e seis P2. A distinção pedagógica entre as extensões melhorou e os blocos manuais antigos foram removidos, mas a integração com os recursos existentes permanecia incompleta. A afirmação anterior de que todos os problemas estavam resolvidos não se sustentava nestas combinações adicionais. As correções solicitadas depois desta revisão estão registradas ao final, preservando abaixo as reproduções originais.

A rodada original foi somente de revisão. As reproduções exploratórias estão em `packages/studio/.cache/review2-*.test.ts`, fora da suíte permanente. Não houve commit ou deploy.

## Achados

### N1 — P1: o novo motor ultrapassa um orçamento obrigatório do CI

Local: [game-2d/runtime.ts:119](../packages/studio/src/official-extensions/game-2d/runtime.ts#L119), [spriteHosts.ts:46](../packages/studio/src/official-extensions/scene-2d/spriteHosts.ts#L46). Guarda existente: [reino-zero-performance.spec.ts:87](../packages/studio/e2e/reino-zero-performance.spec.ts#L87).

O adaptador de sprites e seu controlador entram incondicionalmente no runtime de todo projeto Jogo 2D. O teste real do Reino Zero mediu **814.919 bytes** no documento do preview, acima do teto de **790.000** em **24.919 bytes**. O caso falhou exatamente nessa asserção; as medidas anteriores a ela foram 1.522 blocos, 16.496 nós, abertura de 5.389 ms e maior tarefa longa de 1.837 ms.

Isso afeta também jogos que não usam perspectiva e reprova um teste executado pelo job Chromium do CI. Aumentar os limites dos testes de bundle unitários não resolveu esse orçamento independente. A documentação anterior já registrava que restavam apenas 57 bytes neste teste.

Correção recomendada: reduzir o código efetivamente injetado ou carregar os recursos por necessidade, preservando o funcionamento dos blocos comuns. Verificar o documento completo do Reino Zero, além do tamanho isolado do bundle. Não tratar o aumento do teto como correção automática.

### N2 — P1: animação por nome congela quando solicitada a cada quadro no Avançado

Local: [spriteHosts.ts:132](../packages/studio/src/official-extensions/scene-2d/spriteHosts.ts#L132). Interação: [animation.ts:8](../packages/studio/src/official-extensions/game-2d-advanced/runtime/animation.ts#L8).

O adaptador chama `setSheet` antes de cada `playAnim`/`playAnimOnce`. `setSheet` zera os dados e o relógio da animação, anulando a proteção que os comandos nativos já têm contra reiniciar a mesma animação a cada quadro.

Reprodução no motor real: colocar **Animar personagem com deslizar** em **A cada quadro**. Depois de 60 quadros, só o primeiro quadro da folha foi desenhado. Na modalidade de uma vez, `animEnded` continua falso. Um controle com a mesma folha, faixa e velocidade, configurada uma vez e tocada pelos comandos nativos a cada quadro, avança e termina normalmente.

O exemplo pronto não revela isso porque escolhe a animação apenas na preparação. A falha aparece no uso comum de regras como “se está andando, animar andando”.

Correção recomendada: mudar a folha somente quando a imagem ou sua geometria mudar; preservar a lógica nativa de transição de animações. Cobrir repetição, uma vez, mudança de estado e retomada.

### N3 — P1: uma cópia reciclada pode reaparecer vinculada à família anterior

Local: [game-2d-advanced/runtime.ts:1425](../packages/studio/src/official-extensions/game-2d-advanced/runtime.ts#L1425), [compact:1503](../packages/studio/src/official-extensions/game-2d-advanced/runtime.ts#L1503) e [cullOffscreen:1559](../packages/studio/src/official-extensions/game-2d-advanced/runtime.ts#L1559).

`recycle` agora desvincula o personagem da pista, mas `cullOffscreen` apenas marca `_active = false` e devolve a instância à reserva por `compact`. A proteção em `spawnFromMold` reconhece as identidades que nomeiam famílias; não protege todas as cópias ainda vinculadas.

Reprodução: criar original e cópia na pista, recolher pela varredura de saída da tela e fazer nascer um personagem comum do mesmo molde antes da próxima limpeza da pista. **Para cada cópia viva** da família antiga inclui o novo personagem. A referência reutilizada voltou a ficar ativa enquanto o vínculo antigo ainda existia.

Consequência: ações, projeção e encontros da família anterior podem atingir um personagem novo. Não basta proteger o original, como faz o teste permanente atual.

Correção recomendada: unificar a liberação dos vínculos nos caminhos de recolhimento/compactação do pool e garantir que a reutilização só ocorra depois da desvinculação. Testar cópias, original e nova instância no mesmo quadro, sem depender de uma passagem posterior de desenho para limpar referências.

### N4 — P2: “Recolher quem saiu da tela” remove personagens visíveis na perspectiva

Local: [game-2d-advanced/runtime.ts:1558](../packages/studio/src/official-extensions/game-2d-advanced/runtime.ts#L1558).

O recolhimento compara `x/y` do personagem com o retângulo de pixels da tela. Na pista, esses valores representam lateral e profundidade, enquanto a posição visível é calculada pela projeção.

Reprodução: três personagens em lateral 80, nas distâncias 400, 900 e 1.400, em uma tela 640 × 720. Os três estão dentro da vista configurada da pista. Chamar `cullOffscreen('alvo', 0)` deixa somente um vivo, porque 900 e 1.400 são tratados como posições verticais fora da tela. A margem padrão também elimina personagens visíveis mais distantes.

É um problema independente de N3: corrigir a identidade após o recolhimento não impede o recolhimento indevido.

Correção recomendada: avaliar a visibilidade no espaço de desenho correto quando o personagem pertence a uma pista. Definir também o tratamento de personagens que ainda vão entrar na vista e dos que já passaram, para que uma onda não seja recolhida antes de se aproximar.

### N5 — P2: novas ondas ainda não conseguem receber regras de encontro pelos blocos

Local: [spriteCatalog.ts:153](../packages/studio/src/official-extensions/scene-2d/spriteCatalog.ts#L153), [spriteRuntime.ts:113](../packages/studio/src/official-extensions/scene-2d/spriteRuntime.ts#L113), [lifecycle.ts:824](../packages/studio/src/ir/lifecycle.ts#L824).

Posicionar e repetir durante a partida passou a funcionar. Porém, o evento de encontro aceita uma instância/família e só pode existir na raiz da área de eventos. O personagem que nasce dentro de **A cada segundo** tem escopo local; não pode receber um evento de encontro dentro desse corpo, e o evento externo associado a outra instância não passa a representar o molde inteiro.

Duas reproduções complementares confirmam a lacuna:

- Acrescentar o evento à receita de nascimento dentro do temporizador faz o schema recusar `gk:sceneEvent`: “deve ficar diretamente na sua Área do projeto”.
- Registrar o evento para a primeira instância, recolhê-la mantendo uma cópia viva e criar uma segunda instância do mesmo molde produz apenas o primeiro encontro; a segunda cruza o jogador sem executar essa regra.

A segunda observação é coerente com o contrato por instância; o defeito de composição está em não existir uma alternativa pelos blocos para as novas instâncias. Os testes anteriores de ondas verificam nascimento e movimento, mas não a interação dessas ondas com o jogador. Os encontros nativos entre retângulos também não substituem a passagem em profundidade, como o próprio manual explica.

Correção recomendada: permitir regras de encontro vinculadas a uma identidade estável de molde/grupo ou outra seleção adequada às ondas. O aluno deve conseguir montar e personalizar a interação sem funções próprias, objetos de dados ou registro manual de callbacks.

### N6 — P2: a barra de vida nativa fica longe do personagem na pista

Local: [visualEffects.ts:14](../packages/studio/src/official-extensions/game-2d-advanced/runtime/visualEffects.ts#L14).

O bloco **Desenhar a barra de vida de** continua usando a geometria bruta do personagem. A nova renderização projeta o sprite por transformação temporária do contexto, mas a barra desenhada no evento normal não recebe essa transformação.

Reprodução no motor real, sem câmera 2D adicional: personagem de 20 × 20 na lateral 80, distância 400; desenhar sua barra no evento **Desenhar o jogo**, como orienta o tooltip. O personagem aparece na metade direita da tela; a barra é desenhada em **(70, 392), largura 20**, usando a coordenada lateral e a profundidade como pixels. Sua posição projetada horizontal é próxima de 360.

Correção recomendada: integrar o desenho associado a personagens à projeção e à ordem de composição, incluindo escala e visibilidade, conservando o comportamento dos personagens comuns. A criança não deve calcular coordenadas projetadas para reaproveitar esse bloco.

### N7 — P2: nome do personagem local pode gerar JavaScript inválido

Local: [codec.ts:167](../packages/studio/src/official-extensions/scene-2d/codec.ts#L167), [ir.ts:78](../packages/studio/src/official-extensions/scene-2d/ir.ts#L78).

O parâmetro do evento/visita é inserido literalmente no código; as referências dentro do corpo passam pelo normalizador de identificadores. O schema aceita palavras reservadas porque verifica apenas o formato por expressão regular.

Reprodução com Blockly: nomear a cópia como `class` e selecionar esse personagem no bloco **Dar vidas**. O workspace passa no schema, mas gera:

```javascript
SZGameKit.forEachTrackSprite(alvo, function (class) {
  SZGameKit.setHealth(class_, 3);
});
```

O programa inteiro deixa de executar por `SyntaxError`. O mesmo caminho atende `onTrackSpriteEncounter`.

Correção recomendada: gerar o parâmetro pelo mesmo resolvedor de nomes usado no corpo e alinhar a validação aos demais nomes do editor. Testar palavras reservadas e nomes que precisam de normalização.

### N8 — P2: o botão de pausa do HUD básico depende silenciosamente de outro bloco

Local: [spriteRuntime.ts:289](../packages/studio/src/official-extensions/scene-2d/spriteRuntime.ts#L289), [spriteHosts.ts:21](../packages/studio/src/official-extensions/scene-2d/spriteHosts.ts#L21), [spriteCatalog.ts:363](../packages/studio/src/official-extensions/scene-2d/spriteCatalog.ts#L363).

**Mostrar vidas e placar** promete e desenha o botão de pausa automaticamente. Entretanto, o tratamento da entrada retorna imediatamente quando **Usar telas prontas** não foi instalado.

Reprodução: retirar apenas `sceneGameScreens` da Descida da Neve básica, mantendo o HUD. O botão `II P` é desenhado, mas tocar nele não pausa (`isPaused() === false`). O caminho da tecla P tem a mesma dependência.

Correção recomendada: fazer a pausa exibida pelo HUD funcionar de forma autossuficiente, ou definir uma composição explícita que não ofereça controles inoperantes. Para a extensão de entrada, a lógica necessária deve permanecer dentro dos blocos.

### N9 — P2: outra pista pode transformar vitória em derrota no mesmo passo

Local: [spriteRuntime.ts:295](../packages/studio/src/official-extensions/scene-2d/spriteRuntime.ts#L295).

O controlador verifica o estado global apenas antes de percorrer as pistas. Entre uma pista e a seguinte, verifica reinício de geração, mas não transição de estado.

Reprodução: duas pistas com as telas prontas habilitadas. A primeira cruza a chegada e muda o jogo para vitória. A segunda ainda processa seu encontro com um obstáculo, tira a última vida e muda o resultado para derrota no mesmo `step`. O estado observado termina em `lost`, depois de a primeira pista já ter encerrado a partida em `won`. Outro teste confirma que o movimento da segunda pista também continua nesse passo.

Correção recomendada: interromper a simulação entre pistas quando uma delas encerrar ou pausar o jogo, preservando as proteções existentes de reinício. Cobrir múltiplas pistas, chegada, encontro e mudanças de estado no Avançado.

## Filosofia das extensões e arquitetura

| Critério | Resultado da revisão |
| --- | --- |
| Básico com lógica embutida | Controles, movimento, distribuição, encontros, placar e telas têm comportamentos prontos; há uma atividade inicial de 18 comandos/eventos. N8 ainda cria uma dependência escondida. |
| Avançado com ações separadas | Câmera, velocidade, entrada, limites e chegada agora são comandos distintos. Vida, estado, placar e telas reaproveitam as operações nativas. |
| Outros gêneros | Movimento sem jogador e nascimento durante a partida funcionam. N3–N6 impedem considerar completa a composição de moldes, ondas e apresentação nativa. |
| Sprites e animações | Sprites nativos entram na pista; metadados e seletor de animações chegam ao preview. N2 impede o uso habitual da animação em regras de quadro. |
| Blocos antigos | Os 19 métodos/blocos manuais antigos não estão registrados nem publicados nas APIs dos motores. Não encontrei categoria legada ou alias de compatibilidade. |
| Exemplos | Os três foram refeitos e suas IRs estão sincronizadas. Básico e Avançado não exigem funções próprias nem objetos de dados para montar o percurso. Canvas mantém a implementação manual. |

Comparei os comandos novos com movimento, vida, estados/telas, personagens/grupos/moldes e desenho já existentes em `game-2d/blockCatalog*`, `palette.ts` e `game-2d-advanced/blocks/definitions*.ts`. A redução na contagem de blocos é real, mas não substitui a análise de composição nem uma atividade observada com crianças.

O catálogo compartilhado agora filtra vocabulários por extensão. As primitivas internas de projeção e camadas continuam usadas pelo novo controlador; não são os antigos blocos escondidos. Os novos arquivos têm consumidores reais, incluindo referências JSDoc nas strings de runtime. Não identifiquei uma remoção adicional de arquivo inteiro que pudesse recomendar com segurança.

A principal fragilidade arquitetural é a divisão de responsabilidade entre o controlador de pista e os motores: ambos conhecem vida útil e geometria do sprite, mas nem todos os consumidores foram adaptados. N3, N4 e N6 são manifestações verificadas dessa integração parcial. A solução deve centralizar os contratos de liberação e apresentação; não transferir as contas para os blocos do aluno.

## Verificação executada nesta rodada

| Verificação | Resultado |
| --- | --- |
| `bun test src` | 8.692 aprovados, zero falhas, 550 arquivos; 163,22 s |
| `bunx tsc --noEmit` no Studio | Código 0, sem diagnósticos |
| `bun run --filter '*' typecheck` na raiz | 27 pacotes concluídos com código 0, incluindo os consumidores do Studio no servidor |
| Biome nos TypeScript alterados e adicionados do Studio | 90 arquivos; sem correções automáticas necessárias |
| `bun run check:snow-descent` | Canvas, básico e Avançado sincronizados |
| `git diff --check -- .` no Studio | Sem erros de whitespace; apenas avisos de normalização CRLF de dois Markdown |
| Exploratório: motores reais, controlador compartilhado e Blockly/schema | 12 casos: um controle aprovado e 11 falhas reproduzindo N2–N9; não são 11 defeitos distintos |
| Chromium: galeria, seletores, neve e orçamento do Reino Zero | 21 casos: 19 aprovados e duas falhas; N1 e aviso de atualizações atrasadas no básico a 960 px |
| Repetição isolada do caso básico a 960 px | Reproduziu o mesmo aviso de atualizações atrasadas; ações e animação passaram, mas o console não ficou limpo |
| Nova execução do caso básico a 960 px após terminar as checagens concorrentes | Aprovado, console limpo; 5,5 s |

O aviso de lentidão no navegador ocorreu duas vezes enquanto havia checagens de tipos concorrentes e não se repetiu depois que terminaram. Isso é compatível com interferência da carga da máquina, mas não identifica a causa por si só. O resultado fica registrado como uma limitação das primeiras execuções, sem ser contado como um décimo defeito confirmado. A falha de tamanho de N1 é determinística e independente dessa ressalva.

A primeira tentativa de levantar automaticamente o servidor do Playwright excedeu o limite de 120 s. O build foi iniciado separadamente e a execução acima usou esse servidor local. Os avisos de chunks grandes e configuração de cores do terminal foram preservados nos logs.

Logs em `packages/studio/.cache`: `review2-full.log`, `review2-typecheck.log`, `review2-biome.log`, `review2-confirmed.log`, `review2-browser.log`, `review2-browser-retry.log`, `review2-browser-isolated.log`, `review2-server.log` e `review2-workspace-typecheck.log`. As reproduções usam o prefixo `R2 probe` apenas para identificar esta segunda revisão, não para se referir ao achado R2 do relatório anterior.

## Escopo e limites

O conjunto do Studio contém 93 arquivos alterados/adicionados: 90 TypeScript e três Markdown. O inventário abaixo abrange código, testes, exemplos gerados, documentação e contratos. Nos arquivos gerados, a verificação incluiu deriva, conversão e execução a partir das fontes; não há alegação de leitura manual de cada linha da serialização. Os dois planos e os relatórios anteriores também foram consultados para conferir o resultado contra a proposta autorizada.

As alterações independentes de marketing, funil e comunidade não fazem parte dos achados. Não foi feita avaliação pedagógica com crianças, nem execução de todo o CI, de todos os testes E2E ou de todos os navegadores.

Ordem recomendada: resolver o orçamento e a animação; unificar ciclo de vida/projeção com os blocos nativos; completar encontros para ondas; corrigir geração de nomes, pausa e transições entre pistas. Depois, promover as reproduções a testes permanentes e validar novamente os exemplos e a composição fora da neve.

## Inventário dos arquivos do Studio

Todos os caminhos abaixo são relativos a `packages/studio/`.

- `CLAUDE.md`
- `docs/game-2d-audit-2026-07-20.md`
- `docs/jogo-2d-cenarios-e-neve.md`
- `e2e/scene-names.spec.ts`
- `e2e/snow-descent.spec.ts`
- `scripts/gen-snow-descent.ts`
- `src/blockly/__tests__/blockContractTestUtils.ts`
- `src/blockly/__tests__/blockContracts.test.ts`
- `src/blockly/__tests__/toolboxLevels.test.ts`
- `src/blockly/blockContracts.ts`
- `src/blockly/blockLevels.ts`
- `src/blockly/blocks/types.ts`
- `src/blockly/fields/FieldAnimationPicker.ts`
- `src/blockly/fields/FieldNamePicker.ts`
- `src/blockly/workspaceState.ts`
- `src/core/assetMeta.test.ts`
- `src/core/project.ts`
- `src/examples/__gen_serverExamplesIndex.ts`
- `src/examples/__gen_snowDescent_canvas.ts`
- `src/examples/__gen_snowDescent_g2d.ts`
- `src/examples/__gen_snowDescent_gk.ts`
- `src/examples/qaContracts.ts`
- `src/examples/snowDescent.test.ts`
- `src/examples/snowDescentAssets.ts`
- `src/examples/snowDescentCanvasSource.ts`
- `src/examples/snowDescentRuntime.test.ts`
- `src/examples/snowDescentSource.ts`
- `src/generators/js.ts`
- `src/ir/helpers.ts`
- `src/ir/lifecycle.ts`
- `src/ir/programmingExecution.ts`
- `src/ir/programmingReferences.ts`
- `src/ir/schema.ts`
- `src/journey/blockProfiles.test.ts`
- `src/journey/blockProfiles.ts`
- `src/official-extensions/examplesLoading.test.ts`
- `src/official-extensions/game-2d-advanced/__tests__/blockAudit.test.ts`
- `src/official-extensions/game-2d-advanced/__tests__/bundle.test.ts`
- `src/official-extensions/game-2d-advanced/__tests__/examples.test.ts`
- `src/official-extensions/game-2d-advanced/__tests__/runtimeArchitecture.test.ts`
- `src/official-extensions/game-2d-advanced/__tests__/runtimeTypecheck.test.ts`
- `src/official-extensions/game-2d-advanced/__tests__/templateGuard.test.ts`
- `src/official-extensions/game-2d-advanced/ai.ts`
- `src/official-extensions/game-2d-advanced/aiSummary.ts`
- `src/official-extensions/game-2d-advanced/blocks.ts`
- `src/official-extensions/game-2d-advanced/blocks/definitions02.ts`
- `src/official-extensions/game-2d-advanced/campaignBlockCodec.ts`
- `src/official-extensions/game-2d-advanced/campaignParserCodec.ts`
- `src/official-extensions/game-2d-advanced/examples/snowDescent.ts`
- `src/official-extensions/game-2d-advanced/manifest.ts`
- `src/official-extensions/game-2d-advanced/runtime.ts`
- `src/official-extensions/game-2d-advanced/runtime/shell.ts`
- `src/official-extensions/game-2d-advanced/runtime/visualEffects.ts`
- `src/official-extensions/game-2d-advanced/runtimeContract.ts`
- `src/official-extensions/game-2d/__tests__/bundle.test.ts`
- `src/official-extensions/game-2d/__tests__/docDrift.test.ts`
- `src/official-extensions/game-2d/__tests__/runtimeArchitecture.test.ts`
- `src/official-extensions/game-2d/__tests__/runtimeTypecheck.test.ts`
- `src/official-extensions/game-2d/__tests__/templateGuard.test.ts`
- `src/official-extensions/game-2d/ai.ts`
- `src/official-extensions/game-2d/aiSummary.ts`
- `src/official-extensions/game-2d/blocks.ts`
- `src/official-extensions/game-2d/classicCodec.ts`
- `src/official-extensions/game-2d/examples/snowDescent.ts`
- `src/official-extensions/game-2d/manifest.ts`
- `src/official-extensions/game-2d/palette.ts`
- `src/official-extensions/game-2d/runtime.ts`
- `src/official-extensions/game-2d/runtime/inputAndMotion.ts`
- `src/official-extensions/game-2d/runtime/lifecycle.ts`
- `src/official-extensions/game-2d/runtime/sprites.ts`
- `src/official-extensions/game-2d/runtime/stage.ts`
- `src/official-extensions/game-2d/runtime/textSprites.ts`
- `src/official-extensions/game-2d/runtime/worldEvents.ts`
- `src/official-extensions/game-2d/runtimeContract.ts`
- `src/official-extensions/scene-2d/blocks.ts`
- `src/official-extensions/scene-2d/catalog.ts`
- `src/official-extensions/scene-2d/codec.test.ts`
- `src/official-extensions/scene-2d/codec.ts`
- `src/official-extensions/scene-2d/contract.ts`
- `src/official-extensions/scene-2d/docs.ts`
- `src/official-extensions/scene-2d/host.ts`
- `src/official-extensions/scene-2d/ir.ts`
- `src/official-extensions/scene-2d/names.test.ts`
- `src/official-extensions/scene-2d/runtime.test.ts`
- `src/official-extensions/scene-2d/runtime.ts`
- `src/official-extensions/scene-2d/spriteCatalog.ts`
- `src/official-extensions/scene-2d/spriteContract.ts`
- `src/official-extensions/scene-2d/spriteHostContract.ts`
- `src/official-extensions/scene-2d/spriteHosts.ts`
- `src/official-extensions/scene-2d/spriteRuntime.test.ts`
- `src/official-extensions/scene-2d/spriteRuntime.ts`
- `src/preview/__tests__/assetsBridge.test.ts`
- `src/preview/assetsBridge.ts`

## Correções solicitadas após a revisão — 02/10/2026

Autorização: “Corrija todos os achados”. Implementação guiada por `docs/superpowers/plans/2026-10-02-jogo-2d-integracao-fixes.md`.

| Achado | Correção implementada | Regressão permanente |
| --- | --- | --- |
| N1 | O Jogo 2D reutiliza `compactOfficialRuntimeSource`, preservando a fonte legível. O documento entregue perde comentários de linha e linhas vazias; o teto E2E permanece em 790.000 bytes. | Equivalência de tokens e fronteiras de linha; budgets isolados e Reino Zero completo. |
| N2 | O adaptador só troca a folha quando a imagem ou suas dimensões mudam. | Animação por nome solicitada a cada quadro, uma vez, término e retorno ao loop. |
| N3 | Recolhimento, compactação e liberação do pool passam pela mesma desvinculação. Eventos por instância são removidos quando a última cópia desaparece. | Reuso no mesmo quadro, original recolhido com cópias vivas, nova instância sem família, velocidade ou evento antigos. |
| N4 | O recolhimento consulta os limites projetados. Preserva personagens visíveis e ondas além da vista; remove quem já saiu. | Profundidades 400/900/1.400, onda a 5.000 e cópia que passou da câmera. |
| N5 | Novo evento separado do Avançado, `onTrackMoldEncounter`, com seletor de molde e personagem local. Propagado ao catálogo, IR, escopo, codecs, contratos e documentação. | Três ondas, nove encontros e nove coletas no motor real; ida e volta pelos blocos, seleção e escopo. |
| N6 | A barra de vida usa a projeção do controlador e é composta junto ao personagem, com escala, visibilidade e ordem por profundidade. | Motor real e controlador: barra projetada, geometria física intacta, câmera atual, mundo/HUD e personagem comum. |
| N7 | O parâmetro local usa o mesmo resolvedor de identificadores das referências no corpo. | Workspace com `class` e `cópia azul`, schema, geração e execução do código resultante. |
| N8 | O HUD básico habilita pausa, continuação e reinício independentemente das telas prontas. | Botão/toque, P, movimento suspenso e retomado, continuar e reinício sem `sceneGameScreens`. |
| N9 | O controlador interrompe o passo entre pistas quando o estado global muda. | Vitória antes de obstáculo em outra pista; pausa, vitória e derrota pelo evento ou chegada sem telas prontas. |

O básico conserva os comportamentos prontos. O Avançado conserva ações separadas e reutilizáveis; o evento por molde evita funções próprias e objetos de dados para novas ondas. Os 19 blocos/APIs antigos continuam removidos. Os três exemplos de neve continuam refeitos e sincronizados.

A suíte completa também cobrou o limite de 5.400 linhas de `game-2d-advanced/runtime.ts` (5.401 antes da extração). Moldes, criação, visitas e reciclagem foram extraídos para `runtime/pools.ts`, sem aumentar o limite. A comparação entre os runtimes compostos antes/depois preservou todas as linhas não vazias.

### Verificação após as correções

**Resultado das correções: N1–N9 resolvidos e cobertos por regressões.**

| Verificação | Resultado final |
| --- | --- |
| `bun test src` | 8.712 aprovados, zero falhas, 550 arquivos; 266,72 s. |
| `bunx tsc --noEmit` no Studio, depois da extração do pool | Código 0, sem diagnósticos. |
| Tipos de todos os pacotes | 26 dos 27 pacotes passaram. `referrals`, alterado paralelamente fora deste trabalho, falhou; detalhes abaixo. |
| Biome | 93 arquivos TypeScript alterados/adicionados; nenhuma correção necessária na verificação final. |
| Sincronização dos exemplos | Canvas, básico e Avançado sincronizados; a suíte completa também conferiu o índice do servidor. |
| Chromium | 10 aprovados, zero falhas, zero repetições: três exemplos na galeria, dois testes de seletores, neve em 960/390 px nos dois motores e Reino Zero. |
| Reino Zero | 734.712 bytes no preview (antes: 814.919), teto original de 790.000; abertura em 3.588 ms, maior tarefa longa de 953 ms, 1.522 blocos e 16.496 nós Blockly. |
| Runtime básico | 456.968 bytes / 121.923 gzip, contra 539.883 bytes da fonte legível. Tokens e fronteiras de linha equivalentes. Tetos reduzidos para 465.000 / 124.500. |
| Arquitetura do Avançado | Entrada principal com 5.083 linhas e pool com 323. Extração sem modificar linhas executáveis nem aumentar limites. |
| Whitespace | `git diff --check` sem erros; somente avisos de CRLF nos dois Markdown históricos. |

A primeira execução completa teve 8.711 aprovações e somente a falha arquitetural de 5.401 linhas. Depois da extração, a entrada principal tem **5.083 linhas** e `runtime/pools.ts` tem **323**; a segunda execução passou integralmente.

A checagem global de tipos encontrou alterações concorrentes em `packages/referrals`: inicialmente faltavam implementações de `findCodeById` e `markWelcomeAccepted`. Elas foram adicionadas durante esta execução por outro trabalho. Uma repetição isolada encontrou `TS2322` em `record-conversion.service.ts:121`, envolvendo o estado `unrewarded`. Não houve edição deste pacote nesta correção do Studio, e não se declara a checagem global inteiramente verde.

Logs finais em `packages/studio/.cache`: `fix2-full-final.log`, `fix2-studio-types-final.log`, `fix2-workspace-types.log`, `fix2-referrals-types-retry.log`, `fix2-biome-final.log`, `fix2-examples.log`, `fix2-whitespace.log`, `fix2-browser.log` e `fix2-browser-results.json`. O resultado JSON contém a medição anexada do preview. `fix2-before-pools-runtime.js` registra a comparação da extração; os testes permanentes de runtime também avaliam o código composto.

O servidor de teste foi construído na porta 5197 porque a 5195 já estava em uso. Os testes de navegador rodaram depois das verificações de tipos e da suíte completa, sem o aviso de atualizações atrasadas visto na revisão original. Avisos de chunks grandes do Vite e de cores do terminal foram mantidos nos logs.

Não houve commit ou deploy. A avaliação pedagógica observada com crianças continua sendo uma etapa de produto; estes resultados comprovam contratos, execução e interação no navegador.
