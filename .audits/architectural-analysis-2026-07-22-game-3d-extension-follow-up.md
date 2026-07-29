# Full review da extensão Jogo 3D, segunda rodada

Data: 22 de julho de 2026

Escopo: extensão `game-3d`, catálogo de blocos, seletores de nomes, IR, ciclo de vida, gerador, parser da Ponte, runtime Three.js, preview, exemplos, testes, segurança, acessibilidade e documentação.

## Status da correção

Todos os nove achados desta rodada foram corrigidos em 22 de julho de 2026.

| ID | Status | Implementação |
| --- | --- | --- |
| G3D2-01 | Corrigido | `group3d` e `swarm3d` agora têm declarações, seletores e mensagens separados. O runtime também rejeita formatos incompatíveis com aviso didático. |
| G3D2-02 | Corrigido | Uma cena mantém uma lista ordenada de callbacks e um único `setAnimationLoop`. Vários blocos de quadro passam a coexistir. |
| G3D2-03 | Corrigido | O seletor separa mundo do Jogo 3D de cena Three.js crua. Remoção usa o proprietário real e modelo, enxame e câmeras recusam objetos de outra cena. |
| G3D2-04 | Corrigido | Cada mundo possui um único modo de câmera ativo. A troca limpa alvos incompatíveis e repetir FPS não zera a orientação. |
| G3D2-05 | Corrigido | Travessia e Corrida congelam controles e simulação após a derrota; os comandos de reset restauram a partida. |
| G3D2-06 | Corrigido | Mira e sensor de chão usam posição mundial e ignoram o objeto consultado e todos os seus descendentes. |
| G3D2-07 | Corrigido | Sons não encaixam diretamente em Ao iniciar, o desbloqueio assíncrono é tratado e há limite de 32 vozes com descarte explícito. |
| G3D2-08 | Corrigido | Geometrias compartilhadas possuem contagem de referências. Remover o molde só libera a geometria depois da última cópia. |
| G3D2-09 | Corrigido | O runtime base ganhou typecheck semântico. Regressões cobrem combinações de seletores, dois loops, derrota, congelamento e reinício dos kits. |

A documentação do manifesto, o contexto da IA e o resumo curto da IA foram atualizados para esses contratos. A versão da extensão passou para `0.13.0`.

## Verificação pós-correção

```text
bun run typecheck
resultado: exit 0

bun run check
resultado: 789 arquivos verificados, 0 erros

recorte focado de Jogo 3D, seletores e contratos Canvas 3D
resultado: 396 testes passaram, 0 falharam, 2.668 asserções, 11 arquivos

regressões transversais de lifecycle, loaders, parser e galeria
resultado: 110 testes passaram, 0 falharam, 2.199 asserções, 5 arquivos

bun run test
resultado: 5.147 testes passaram, 0 falharam, 48.023 asserções, 314 arquivos

bunx playwright test e2e/examples-gallery.spec.ts --grep "game-3d:" --project=chromium
resultado: 10 cenários passaram, incluindo 8 exemplos e 2 viewports estreitos
```

As seções abaixo preservam o estado encontrado durante a revisão para manter a rastreabilidade. As recomendações nelas descritas já foram implementadas conforme a tabela de status acima.

## Parecer executivo da revisão original

A correção da rodada anterior resolveu os onze achados registrados em `architectural-analysis-2026-07-22-game-3d-extension.md`. O caminho canônico está saudável: os 118 blocos têm IR, gerador, parser e helper de runtime; a Ponte preserva código que não cabe em bloco; os exemplos abrem sem erro; o descarte de WebGL, listeners e áudio está presente; e a documentação descreve corretamente a arquitetura atual.

Esta segunda rodada encontrou problemas fora do caminho canônico. Eles aparecem quando a criança combina opções que a própria interface oferece, troca uma configuração durante o jogo ou usa mais de um bloco de atualização. Foram confirmados dois achados de severidade alta, seis médios e um baixo.

Resumo:

| ID | Severidade | Tema |
| --- | --- | --- |
| G3D2-01 | Alta | Grupo de inimigos e enxame usam o mesmo seletor, mas têm formatos incompatíveis |
| G3D2-02 | Alta | Dois blocos “A cada frame 3D” para a mesma cena fazem o primeiro parar em silêncio |
| G3D2-03 | Média | O runtime não preserva a propriedade de objetos entre cenas, modelos e enxames |
| G3D2-04 | Média | Modos de câmera antigos continuam ativos e sobrescrevem a câmera escolhida depois |
| G3D2-05 | Média | Travessia e Corrida registram fim de jogo, mas continuam simulando a partida |
| G3D2-06 | Média | Sensores de mira e chão podem detectar peças do próprio modelo |
| G3D2-07 | Média | Sons podem ser usados fora de gesto e não têm limite de vozes simultâneas |
| G3D2-08 | Média | A geometria compartilhada do enxame perde um dono seguro quando o molde é removido |
| G3D2-09 | Baixa | O runtime base não recebe verificação semântica e os jogos não têm playthrough completo |

Não foi encontrado achado crítico nem vulnerabilidade nova de segurança.

## Pontos fortes confirmados

- 118 blocos únicos, 118 entradas na paleta e 118 métodos do contrato de chamadas.
- Os 118 métodos de bloco existem na API pública. Os outros quatro membros públicos são `runProject`, `dispose`, `disposeAll` e `THREE`.
- Nenhuma referência ausente ou duplicada na paleta.
- Todos os dropdowns canônicos fazem round-trip pela Ponte.
- Chamadas manuais com aridade ou valor não representável são preservadas como código.
- Nenhum export público morto foi confirmado.
- Nenhum helper interno claramente morto foi confirmado.
- Three.js fixado em `0.180.0` e alinhado entre dependência, importmap e extensões 3D.
- Sem `eval`, `new Function`, `document.write`, `fetch`, XHR ou WebSocket no runtime de produção.
- A extensão não pede permissão de rede. Declara somente `canvas`, `keyboard`, `mouse` e `audio`.
- Limites explícitos para primitivas, luzes, enxames, linhas e andares.
- Renderer, contexto WebGL, listeners por mundo, pointer lock, texturas globais e AudioContext são encerrados no teardown.
- Os oito exemplos têm IR válida, round-trip, canvas acessível e layout responsivo.
- A documentação do manifesto, o resumo da IA e o guia de extensões estão atualizados para o estado corrigido.

## Achados detalhados, estado encontrado antes da correção

### G3D2-01 Alta: grupo de inimigos e enxame têm o mesmo tipo visual, mas formatos incompatíveis

Evidências:

- `FieldNamePicker.ts:813` registra `sz_g3d_create_group` e `sz_g3d_create_swarm` no mesmo `kind: group3d`.
- Todos os consumidores recebem a mesma lista de nomes no dropdown.
- `runtime.ts:646` implementa `createGroup()` como um array.
- `runtime.ts:737` implementa `createSwarm()` como `{ items, world }`.
- `runEnemies` em `runtime.ts:880` exige `.length`, `.push()` e índices numéricos.
- `spawnInSwarm` em `runtime.ts:748` exige `.items` e `.world`.

Reprodução confirmada:

```text
spawnInSwarm(grupoSimples, original, 0, 0, 0) = null
countSwarm(grupoSimples) = 0
runEnemies(cena, enxame, chão, 1, 0.02)
TypeError: group.push is not a function
```

Impacto:

- A interface sugere uma combinação válida e pode interromper o loop inteiro com erro.
- Outras combinações não lançam, mas não fazem nada. `moveAcross(enxame)` retorna cedo, `hitAny` não encontra itens e `countSwarm(grupo)` devolve zero.
- O erro é especialmente difícil para uma criança porque ambos aparecem como “grupo” no mesmo seletor.

Correção recomendada:

1. Criar tipos visuais distintos, por exemplo `group3d` para listas do Kit Desvie e `swarm3d` para enxames.
2. Separar os coletores e os campos dos blocos consumidores.
3. Reforçar a fronteira do runtime com validação amigável, sem deixar um `.push()` inválido derrubar o frame.
4. Adicionar testes de todas as combinações oferecidas pelos dois seletores.

### G3D2-02 Alta: múltiplos loops da mesma cena se substituem silenciosamente

Evidências:

- O bloco `sz_g3d_animate` em `blocks.ts:172` é uma raiz de loop e pode aparecer mais de uma vez na área “Enquanto estiver rodando”.
- A IR aceita mais de um `g3d:animate` com o mesmo `worldVar`.
- `animate` em `runtime.ts:1327` chama diretamente `renderer.setAnimationLoop(...)`.
- Uma segunda chamada ao mesmo renderer substitui o callback anterior. Não há composição, diagnóstico nem aviso.

Reprodução confirmada:

```text
SZGame3D.animate(cena, primeiroCallback)
SZGame3D.animate(cena, segundoCallback)
executar um quadro

primeiroCallback = 0 chamadas
segundoCallback = 1 chamada
aviso = nenhum
```

A mesma IR com dois loops para `cena` foi aceita pelo schema.

Impacto:

- Uma criança pode separar movimento, inimigos e placar em blocos de quadro diferentes e perder todo o comportamento do primeiro.
- O projeto continua válido e sem erro visual, o que faz o defeito parecer aleatório.

Correção recomendada:

1. Na IR, agrupar corpos de `g3d:animate` por `worldVar`, preservando a ordem visual, ou rejeitar duplicatas com diagnóstico no bloco.
2. No runtime, emitir ao menos um aviso didático se outro loop já estiver registrado para o mesmo mundo.
3. Adicionar regressão com duas cenas diferentes e dois loops na mesma cena. Duas cenas devem continuar válidas; dois loops do mesmo mundo devem ser compostos ou recusados.

### G3D2-03 Média: propriedade entre cenas, modelos e registros não é garantida

Evidências:

- O seletor de objetos é global e o seletor de cenas também. A interface não filtra objetos pela cena em que foram criados.
- `removeObject(world, mesh)` em `runtime.ts:649` confia no `world` recebido, embora `worldOf(mesh)` exista em `runtime.ts:140`.
- `addToModel(model, part)` em `runtime.ts:478` não verifica se modelo e peça pertencem ao mesmo mundo.

Reproduções confirmadas:

```text
objeto criado na cena A
remove(cenaB, objeto)

objeto saiu visualmente = sim
geometria descartada = sim
objeto ainda está em cenaA._objects = sim
proprietário lógico foi apagado = sim
```

```text
peça criada na cena A
modelo criado na cena B
addToModel(modelo, peça)
remove(cenaB, modelo)

peça ainda está em cenaA._objects = sim
geometria da peça foi descartada = sim
```

Impacto:

- A lista de seleção, sólidos, raycasts e o teto de 300 podem reter objetos já descartados.
- A câmera também pode ser reparentada para um objeto de outra cena, produzindo matriz e renderização incoerentes.
- O problema é sistêmico porque vários blocos recebem cena e objeto em dropdowns independentes.

Correção recomendada:

1. Fazer operações destrutivas resolverem a cena real por `worldOf(obj)` e recusarem conflito explícito.
2. Em `addToModel`, aceitar apenas peças do mesmo mundo ou transferir todos os registros de forma atômica.
3. Filtrar os seletores por cena quando o bloco possui os dois campos e a declaração permite descobrir a relação.
4. Adicionar invariantes de runtime: um objeto ativo pertence a um único mundo e não pode ficar registrado após descarte.

### G3D2-04 Média: trocar o modo de câmera não desativa o anterior

Evidências:

- `orbitCamera` guarda `world._orbit` em `runtime.ts:1244`.
- `thirdPersonCamera` guarda `world._tpObj` em `runtime.ts:1289`.
- `_updateCameras` em `runtime.ts:1322` atualiza orbital e terceira pessoa em toda frame, sempre nesta ordem.
- Nenhum instalador limpa os demais estados ao trocar para FPS, orbital, terceira pessoa, isométrica ou aérea.

Reprodução confirmada:

```text
ativar terceira pessoa
ativar orbital
posição logo após orbital = [15.946, 5.753, 8.692]
posição depois de um frame = [10, 3, 6]

ativar isométrica
posição inicial = [12, 12, 12]
posição depois de um frame = [10, 3, 6]
```

O estado antigo de terceira pessoa vence a câmera escolhida depois. Além disso, chamar `fpsCamera` dentro do quadro redefine a rotação da câmera em toda frame e pode apagar o pitch aplicado pelo mouse.

Correção recomendada:

1. Centralizar a ativação de câmera em um único `world._cameraMode`.
2. Ao trocar o modo, limpar alvos, listeners e estados incompatíveis.
3. Tornar a repetição do mesmo modo idempotente sem zerar a orientação a cada frame.
4. Testar todas as transições entre perspectiva manual, FPS, orbital, terceira pessoa, isométrica e aérea.

### G3D2-05 Média: Travessia e Corrida continuam rodando após o fim de jogo

Evidências:

- `crosserHit` define `cs.gameOver = true` em `runtime.ts:1948`.
- `crosserStep` em `runtime.ts:1805` não consulta esse estado.
- `raceHit` define `rs.gameOver = true` em `runtime.ts:2157`.
- `raceStep` e `runRivals`, em `runtime.ts:2103` e `runtime.ts:2125`, não consultam esse estado.
- Os exemplos apenas mostram o modal em `examples.ts:636` e `examples.ts:833`; o loop continua ativo por trás dele.

Reprodução confirmada:

```text
Travessia: colisão = true, gameOver = true, linha depois de novos passos = 1
Corrida: colisão = true, gameOver = true, ângulo antes = 0, depois = 0.072
Corrida: rival continuou se movendo = sim
```

Impacto:

- Pontuação e posição podem mudar depois do valor final mostrado no modal.
- Teclado e simulação continuam consumindo trabalho enquanto a partida parece encerrada.
- O estado `gameOver` existe, mas não governa o kit. Isso deixa a semântica diferente do Kit Empilhar, que realmente congela a progressão.

Correção recomendada:

1. Fazer os passos de simulação retornarem cedo quando `gameOver` estiver ativo.
2. Manter apenas o render necessário para o modal e a animação final, se houver.
3. Criar playthroughs de colisão, congelamento e reinício para os dois exemplos.

### G3D2-06 Média: mira e sensor de chão podem acertar o próprio modelo

Evidências:

- As peças adicionadas a um modelo continuam em `world._objects` para seleção.
- `aimAhead` em `runtime.ts:1087` ignora apenas quando `topPick(...) === obj`.
- `groundHit` em `runtime.ts:1102` usa a mesma comparação.
- Quando `obj` é o grupo do modelo, `topPick` devolve a peça registrada, não o grupo. A peça é tratada como alvo externo.

Reproduções confirmadas:

```text
modelo com uma peça à frente e um alvo atrás
aimAhead(modelo) devolveu a própria peça = sim
devolveu o alvo = não
```

```text
modelo com uma peça abaixo e chão mais distante
onGround(modelo) = true
altura informada = -0.5
altura real do chão = -2.5
```

Correção recomendada:

1. Excluir o objeto consultado, seus ancestrais e todos os seus descendentes da lista de hits.
2. Usar posição mundial para a origem do raio quando o objeto estiver dentro de outro grupo.
3. Adicionar casos com primitiva, modelo composto e peça aninhada.

### G3D2-07 Média: áudio aceita uso sem gesto e não limita vozes simultâneas

Evidências:

- `sz_g3d_play_note` e `sz_g3d_play_effect`, em `blocks.ts:1669` e `blocks.ts:1683`, usam placement `command`.
- Esse placement permite uso direto em “Ao iniciar”, apesar do próprio tooltip informar que é necessário um clique.
- `_beep` em `runtime.ts:826` cria um novo oscillator e gain para toda chamada.
- Não existe orçamento de vozes, cooldown, deduplicação ou descarte antecipado.
- Os sons também são permitidos dentro do loop. Uma condição verdadeira por vários quadros cria um som por frame.

Reprodução controlada:

```text
600 chamadas de playNote(440, 10000)
oscillators criados = 600
limite de vozes presente = não
```

Impacto:

- Um bloco válido em “Ao iniciar” pode não tocar por causa da política de autoplay.
- Uma colisão ou tecla mantida pode criar dezenas ou centenas de vozes sobrepostas.
- O runtime tem limites para GPU, mas ainda não tem proteção equivalente para áudio.

Correção recomendada:

1. Impedir sons diretamente em “Ao iniciar” e explicar a área correta no encaixe.
2. Definir um limite pequeno de vozes simultâneas e descartar ou reciclar a mais antiga.
3. Oferecer cooldown por efeito ou um bloco de evento que represente a borda da condição.
4. Tratar a Promise de `AudioContext.resume()` e cobrir o caso anterior ao primeiro gesto.

### G3D2-08 Média: o molde removido descarta geometria ainda usada pelo enxame

Evidências:

- `spawnInSwarm` em `runtime.ts:748` clona materiais, mas compartilha geometrias com o original.
- O comentário diz que somente o original descarta a geometria.
- `removeObject` em `runtime.ts:649` permite remover esse original enquanto as cópias continuam vivas.
- As cópias descartam somente seus materiais em `removeFromSwarm`.

Reprodução confirmada:

```text
geometria da cópia === geometria do original = sim
remover o original disparou dispose da geometria = sim
cópia continuou na cena = sim
enxame continuou com 1 item = sim
```

Impacto:

- O renderer pode precisar reenviar uma geometria que acabou de ser descartada.
- Se as cópias forem removidas depois, não existe mais um dono que encerre essa geometria compartilhada antes do teardown do mundo.
- Moldes de outra cena ampliam o problema porque o descarte de um mundo afeta cópias do outro.

Correção recomendada:

1. Manter referência explícita e contagem de uso para geometrias compartilhadas.
2. Impedir remover o molde enquanto houver cópias, ou transferir a propriedade para o enxame.
3. Exigir que molde e enxame pertençam ao mesmo mundo.
4. Testar remoção do molde antes, durante e depois da poda completa.

### G3D2-09 Baixa: a cobertura valida o caminho canônico, mas não os contratos semânticos do runtime

Evidências:

- `runtime.ts` tem 2.565 linhas dentro de uma template string. O TypeScript do pacote enxerga apenas uma string e não verifica semanticamente seu conteúdo.
- O Jogo 3D Avançado já possui `runtimeTypecheck.test.ts`; a extensão base não possui equivalente.
- `blockAudit.test.ts` confirma que cada bloco chega a um método existente, mas não verifica compatibilidade entre tipos de nomes como grupo e enxame.
- `runtimeLifecycle.test.ts` cobre sete contratos focados, com uma interface manual parcial da API.
- O E2E em `examples-gallery.spec.ts:218` abre o cartão, procura primeiro frame, envia controles genéricos e verifica ausência de erro. Ele não joga Travessia, Corrida ou Torre até vitória, derrota e reinício.

Impacto:

- O typecheck verde não protege as 2.565 linhas mais sensíveis do runtime.
- Os achados G3D2-01, G3D2-02 e G3D2-05 passam por toda a suíte porque usam combinações válidas que não fazem parte do cenário canônico.

Correção recomendada:

1. Adotar para o runtime base o mesmo teste semântico usado no Jogo 3D Avançado.
2. Gerar ou declarar tipos distintos para mundo, objeto, grupo e enxame.
3. Adicionar testes combinatórios dos campos relacionados.
4. Criar playthrough determinístico para os quatro jogos, cobrindo fim, congelamento e recomeço.

## Arquitetura, duplicação e código morto antes da correção

Métricas atuais:

| Arquivo | Linhas |
| --- | ---: |
| `runtime.ts` | 2.565 |
| `blocks.ts` | 2.056 |
| `examples.ts` | 1.029 |
| `ai.ts` | 143 |
| `manifest.ts` | 141 |
| `index.ts` + `aiSummary.ts` | 62 |
| Produção local da extensão | 5.996 |
| Testes locais da extensão | 2.517 |

Os contratos centralizados de dropdown, aridade e placement reduziram drift real. Não há recomendação para desfazer essa centralização. A concentração no runtime continua sendo um risco porque o arquivo final precisa permanecer injetável, mas isso não obriga que sua fonte seja uma única string sem tipos. O melhor próximo passo estrutural é compor o bootstrap a partir de módulos fonte verificados e testar o artefato final gerado.

Não encontrei duplicação de bloco, toolbox ou API pública. Também não encontrei função interna claramente inalcançável. A duplicação que ainda importa é conceitual: tipos diferentes são achatados em `group3d`, e modos diferentes de câmera mantêm estados paralelos no mesmo mundo.

## Documentação antes da correção

A documentação está atualizada no caminho principal:

- permissões corretas;
- áreas “Ao iniciar”, “Quando acontecer” e “Enquanto estiver rodando”;
- lifecycle de recursos persistentes;
- resize e reutilização das câmeras ortográficas;
- visibilidade e raycast;
- materiais independentes nas cópias;
- acessibilidade, limites e teardown;
- oito exemplos e ordem sugerida.

Os ajustes documentais necessários dependem das correções:

1. Diferenciar claramente “grupo de inimigos” e “enxame” se eles continuarem sendo estruturas distintas.
2. Explicar que existe um único loop de quadro por cena, caso a implementação escolha rejeitar duplicatas.
3. Documentar a troca exclusiva entre modos de câmera.
4. Alinhar áudio com as áreas em que o navegador realmente permite iniciar som.

## Segurança e robustez antes da correção

Não foi encontrada nova vulnerabilidade de execução remota ou abertura indevida de rede. A extensão mantém import fixado, CSP restritiva para scripts e ausência de APIs de rede ativa no runtime. O carregamento de imagens continua sujeito à política passiva geral do preview.

Os riscos confirmados são de robustez e previsibilidade: tipos visuais incompatíveis, callbacks sobrescritos, registros de mundo corrompidos e recursos sem orçamento. Eles não atravessam a barreira de segurança, mas podem travar ou invalidar um projeto legítimo.

## Verificações executadas durante a revisão original

```text
bun run typecheck
resultado: exit 0

bun run check
resultado: 787 arquivos verificados, 0 erros

recorte de testes de Jogo 3D, parser e lifecycle
resultado: 616 testes passaram, 0 falharam, 4.688 asserções, 26 arquivos

bun run test
resultado: 5.125 testes passaram, 0 falharam, 47.935 asserções, 312 arquivos

bunx playwright test e2e/examples-gallery.spec.ts --grep "game-3d:" --project=chromium
resultado: 10 cenários passaram, incluindo 8 exemplos e 2 viewports estreitos
```

Além da suíte, foram executadas reproduções isoladas com Three.js real para grupo versus enxame, loops duplicados, propriedade entre mundos, transição de câmera, fim de jogo, sensores de modelos e geometria compartilhada. O áudio foi exercitado com um AudioContext instrumentado.

## Ordem de correção original, concluída

### P0 antes de liberar criação livre

1. G3D2-01, separar grupo e enxame.
2. G3D2-02, compor ou diagnosticar loops duplicados por cena.

### P1 antes do lançamento público

1. G3D2-03, estabelecer propriedade única de mundo.
2. G3D2-04, tornar modos de câmera mutuamente exclusivos.
3. G3D2-05, congelar Travessia e Corrida no fim de jogo.
4. G3D2-06, impedir que sensores detectem o próprio modelo.
5. G3D2-07, corrigir placement e orçamento do áudio.
6. G3D2-08, definir propriedade de geometria em enxames.

### P2 manutenção e prevenção

1. G3D2-09, typecheck do runtime e playthroughs completos.

## Critério de saída atingido

A extensão atingiu o critério técnico desta revisão: os seletores não oferecem formatos incompatíveis, os loops e modos de câmera têm comportamento previsível, objetos preservam o mundo de origem, os kits congelam depois do fim de jogo e os recursos compartilhados têm propriedade explícita. Os dois achados altos e os sete demais possuem regressões automatizadas.
