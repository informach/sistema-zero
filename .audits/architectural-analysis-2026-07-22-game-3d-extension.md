# Full review da extensão Jogo 3D

Data: 22 de julho de 2026

Escopo: extensão `game-3d`, catálogo de blocos, IR, gerador, parser da Ponte, runtime Three.js, preview, exemplos, testes, segurança, acessibilidade e documentação.

## Parecer executivo

> Atualização de 22 de julho de 2026: os onze achados desta revisão foram
> tratados. As evidências detalhadas abaixo preservam o estado anterior para
> explicar a origem de cada correção. A seção "Correções implementadas" registra
> o estado atual.

A extensão tem uma base sólida e um caminho principal bem protegido. O catálogo fecha em 118 blocos, 118 tipos de IR e 118 entradas de paleta, sem duplicações ou referências ausentes. A versão do Three.js está fixada e alinhada ao núcleo. O preview mantém a rede do aluno fechada, limita recursos pesados e libera renderer e contexto WebGL no descarte. A suíte também é ampla: 5.069 testes unitários passaram no pacote, além dos cenários de navegador focados na extensão.

Na avaliação inicial, a extensão ainda não estava pronta para criação livre. Foram confirmados quatro achados de severidade alta. Dois afetavam o ciclo de vida do runtime, um podia alterar silenciosamente código escrito na Ponte e outro criava uma contradição entre o encaixe visual dos blocos e a validação do projeto. Também havia problemas médios em enxames, áudio, seleção de objetos invisíveis, isolamento de controles e exemplos. A rodada de correção abaixo resolveu esses pontos e acrescentou regressões automatizadas para cada contrato crítico.

Resumo dos achados:

| ID | Severidade | Tema | Estado |
| --- | --- | --- | --- |
| G3D-01 | Alta | Remoção e queda deixam objetos presos nos registros | Corrigido |
| G3D-02 | Alta | Câmeras ortográficas acumulam e não respondem ao resize | Corrigido |
| G3D-03 | Alta | Parser da Ponte perde alterações válidas do usuário | Corrigido |
| G3D-04 | Alta | Contrato de posicionamento diverge entre Blockly e IR | Corrigido |
| G3D-05 | Média | Enxames de modelos compartilham materiais | Corrigido |
| G3D-06 | Média | AudioContext não é encerrado no teardown | Corrigido |
| G3D-07 | Média | Objetos invisíveis continuam participando de raycasts | Corrigido |
| G3D-08 | Média | Exemplos têm lacunas de responsividade, acessibilidade e QA | Corrigido |
| G3D-09 | Média | Câmera FPS de dois mundos reage ao mesmo pointer lock | Corrigido |
| G3D-10 | Baixa | Documentação e um teste de ciclo de vida estão defasados | Corrigido |
| G3D-11 | Baixa | Runtime e catálogo concentram complexidade demais | Corrigido |

Não foi encontrado achado crítico.

## Correções implementadas

| ID | Resultado |
| --- | --- |
| G3D-01 | A remoção percorre a árvore inteira, limpa registros, sólidos e enxames. A queda usa o mesmo caminho. |
| G3D-02 | Câmeras ortográficas são reutilizadas, a anterior é desligada e o resize usa a estratégia da câmera ativa. |
| G3D-03 | A Ponte valida aridade e dropdowns. Chamadas que não cabem em blocos são preservadas como código. |
| G3D-04 | O contrato de montagem foi centralizado e coberto por comparação automática com o placement dos blocos. Sons e cópias temporárias de enxame são aceitos no quadro; câmeras de montagem ficam em Ao iniciar. |
| G3D-05 | Cada peça de uma cópia de modelo recebe seu próprio material, com descarte seguro ao sair do enxame. |
| G3D-06 | `disposeAll` encerra e remove a referência do `AudioContext`. |
| G3D-07 | Raycasts ignoram objetos ocultos e objetos com algum ancestral oculto. |
| G3D-08 | Canvases fixos ficaram fluidos, o runtime adiciona semântica acessível e o E2E cobre Jogo 3D e viewport estreito. O contrato de Desvie agora descreve o encerramento real da partida. |
| G3D-09 | Cada câmera FPS reage apenas ao pointer lock do próprio canvas. |
| G3D-10 | A documentação lista as quatro permissões reais e o teste de textura usa uma IR válida antes de provar a regra de ciclo de vida. |
| G3D-11 | Dropdowns, aridades e ciclo de vida compartilham contratos; remoção, câmera e substituição de mundo usam caminhos centralizados. O bootstrap continua sendo um único artefato injetável, mas as regras que causavam drift deixaram de estar duplicadas. |

Verificação após as correções:

```text
bun test com Jogo 3D, parser e contrato central de posicionamento
resultado: 361 testes passaram, 0 falharam, 10.398 asserções

bun run test
resultado: 5.111 testes passaram, 0 falharam, 48.287 asserções, 310 arquivos

bun run typecheck
resultado: exit 0 no checkpoint completo da correção

bun run check
resultado: 782 arquivos verificados, 0 erros

bunx playwright test e2e/examples-gallery.spec.ts --grep "game-3d:"
resultado: 10 cenários passaram, incluindo os 8 exemplos e 2 casos em 390 x 844
```

## Pontos fortes confirmados

- Paridade completa entre os 118 blocos, os 118 tipos de IR e as 118 referências da paleta.
- Tooltips em português em todos os blocos e valores iniciais nos encaixes numéricos.
- Round-trip coberto para as formas canônicas geradas pelos blocos.
- API pública do runtime coberta por teste de um método para cada bloco.
- Three.js fixado em `0.180.0` e compartilhado com o importmap do núcleo.
- Sem `eval`, `new Function`, `document.write`, `fetch` ou WebSocket no runtime de produção.
- Permissão `network` corretamente ausente. A extensão declara apenas `canvas`, `keyboard`, `mouse` e `audio`.
- Limites explícitos para objetos, luzes, enxames, linhas e camadas.
- `pixelRatio` limitado a 2, renderer descartado, loop encerrado e contexto WebGL liberado.
- Oito exemplos válidos no catálogo, todos abrindo sem erro no Playwright focado.
- Nenhum export público sem consumidor foi confirmado.

## Achados detalhados

### G3D-01 Alta: remoção e queda deixam objetos presos nos registros

Evidências:

- `addMesh` registra toda primitiva em `world._objects` em `runtime.ts:268`.
- `addToModel` move a primitiva para dentro de um `Group` em `runtime.ts:353`, mas ela continua no registro do mundo.
- `removeObject` em `runtime.ts:524` remove apenas o objeto recebido das listas. Ao remover um modelo, os filhos não são retirados de `_objects` ou `_solids`.
- `fall` em `runtime.ts:2047` remove e descarta o objeto ao sair da cena, mas também não o retira dos registros.

Reprodução direta contra o runtime:

```text
antes de remover o modelo: _objects.length = 1
depois de remover o modelo: _objects.length = 1
pai da peça depois da remoção: Group

depois de cair abaixo de y = -24:
objeto registrado = true
_objects.length = 1
pai = null
```

Impacto:

- Ciclos de criar e remover podem consumir permanentemente o teto de 300 objetos.
- Partes já descartadas continuam retidas em memória pelo registro.
- Raycasts e física podem receber referências antigas.
- O comentário de higiene de GPU transmite uma garantia que o registro lógico não cumpre.

Correção recomendada:

1. Centralizar o desligamento de um objeto em uma função que percorra a árvore e remova cada nó de `_objects`, `_models`, `_solids`, enxames e demais índices.
2. Fazer `removeObject`, `fall`, inimigos fora da cena e descartes de kits chamarem essa mesma função.
3. Separar remoção lógica de descarte de geometria compartilhada para não invalidar cópias legítimas.
4. Adicionar testes que repitam criação e remoção acima do limite e confirmem que a capacidade volta a ficar disponível.

### G3D-02 Alta: câmeras ortográficas acumulam e não respondem ao resize

Evidências:

- `isometricCamera` em `runtime.ts:1442` cria uma nova câmera em toda chamada.
- `topCamera` em `runtime.ts:1818` faz o mesmo.
- Os blocos são comandos normais em `blocks.ts:352` e `blocks.ts:605`, portanto podem ser encaixados dentro de cada quadro.
- O resize genérico em `runtime.ts:169` atualiza `aspect` de câmera perspectiva ou usa o callback capturado na criação do mundo. Uma câmera ortográfica instalada depois não tem nenhum desses caminhos.
- As funções corretas de resize existem em `runtime.ts:1323` e `runtime.ts:1812`, mas só são ligadas aos kits que criam a câmera junto com o mundo.

Reprodução direta:

```text
duas chamadas de isometricCamera: 2 câmeras continuam na cena

canvas antes: 480 x 360
canvas depois: 960 x 360
limites antes: left=-9.333, right=9.333, top=7, bottom=-7
limites depois: left=-9.333, right=9.333, top=7, bottom=-7
```

Impacto:

- Se o bloco entrar no quadro, a cena ganha aproximadamente 60 câmeras por segundo.
- Em mudança de orientação ou tamanho, a projeção isométrica e de topo fica esticada ou cortada.

Correção recomendada:

1. Reutilizar a câmera existente quando o tipo já for o desejado.
2. Antes de trocar o tipo, desligar a câmera anterior do pai.
3. Guardar no mundo uma estratégia de resize associada à câmera ativa, em vez de capturá-la apenas na criação.
4. Marcar os blocos de configuração de câmera como montagem única, ou tornar a repetição idempotente e barata.
5. Testar chamada repetida, troca entre perspectiva e ortográfica e resize após cada troca.

### G3D-03 Alta: parser da Ponte perde alterações válidas do usuário

O matcher começa em `src/parsers/js.ts:9107`. Ele aceita strings desconhecidas em campos que viram dropdown e não valida a quantidade exata de argumentos. Em câmeras, aceita qualquer segundo argumento, mas guarda apenas identificadores ou `null`.

Reproduções:

```text
SZGame3D.setMaterial(obj, "lava");
vira um bloco com KIND="lava"
Blockly não conhece o valor e troca para "normal"

SZGame3D.playEffect("laser");
volta como SZGame3D.playEffect("coin");

SZGame3D.setBackground(cena, "#000", 123);
perde o argumento 123

SZGame3D.isometricCamera(cena, escolherAlvo());
volta como SZGame3D.isometricCamera(cena, null);

const grupo = SZGame3D.createGroup(123);
perde o argumento 123
```

Isso contradiz o contrato geral do parser descrito em `src/parsers/js.ts:36`, no qual código não representável deve virar `rawJS` para ser preservado. As extensões vizinhas já usam conjuntos de enums e recusam valores desconhecidos, por exemplo em `src/parsers/js.ts:4422` e `src/parsers/js.ts:7925`.

Impacto:

- A criança pode escrever uma alteração no modo Ponte e receber outro código ao voltar aos blocos.
- A perda acontece sem erro claro e sem oportunidade de recuperação.

Correção recomendada:

1. Criar enums compartilhados entre definição de bloco e parser para cada dropdown de Jogo 3D.
2. Rejeitar valor desconhecido e cair em `rawJS`.
3. Validar aridade exata, respeitando apenas os argumentos realmente opcionais.
4. Exigir identificador ou `null` nos alvos opcionais de câmera.
5. Adicionar testes de preservação com valores desconhecidos, argumentos extras e expressões não representáveis.

### G3D-04 Alta: contrato de posicionamento diverge entre Blockly e IR

Três blocos são visualmente aceitos dentro de cada quadro, mas o schema os rejeita como criadores de recursos:

| Bloco | Blockly | IR |
| --- | --- | --- |
| `sz_g3d_spawn_in_swarm` | `command`, `blocks.ts:1662` | proibido pelo contrato, `game3dContract.ts:23` |
| `sz_g3d_play_note` | `command`, `blocks.ts:1741` | proibido pelo contrato, `game3dContract.ts:24` |
| `sz_g3d_play_effect` | `command`, `blocks.ts:1755` | proibido pelo contrato, `game3dContract.ts:25` |

Também existe a divergência inversa. Seis blocos marcados como `start-only-command` no Blockly não aparecem no guard da IR: `createGroup`, `body`, `setSolid`, `addToModel`, `setFog` e `setShadows`, nas linhas 313, 1197, 1225, 1437, 1597 e 1627 de `blocks.ts`.

Impacto:

- A criança consegue encaixar corretamente um bloco no quadro e só depois recebe erro de projeto.
- Código importado ou produzido pela Ponte pode representar montagens que a interface proíbe.
- `moveTowards`, em `blocks.ts:1051`, também fica disponível fora do quadro, embora uma única chamada faça apenas uma pequena interpolação e pareça não funcionar.

Correção recomendada:

1. Ter uma única fonte de verdade para fase e posicionamento, consumida pelo Blockly e pelo validador de IR.
2. Decidir explicitamente a semântica dos sons. Se forem efeitos por evento, devem ser permitidos no corpo correto. Se forem considerados alocação, o bloco deve impedir o encaixe no quadro.
3. Permitir `spawnInSwarm` no quadro apenas se o teto e a poda forem considerados parte do contrato pedagógico, ou movê-lo para montagem e eventos.
4. Adicionar um teste automático que compare todos os 118 blocos com o guard de ciclo de vida.

### G3D-05 Média: enxames de modelos compartilham materiais

`spawnInSwarm` em `runtime.ts:630` clona o material apenas quando o objeto raiz possui `material`. Modelos são `Group`, então os materiais dos filhos continuam compartilhados entre original e cópias.

Reprodução:

```text
modelo com uma peça, duas cópias no enxame
setColor(primeiraCopia, vermelho)
cor do original = ff0000
cor da primeira cópia = ff0000
cor da segunda cópia = ff0000
```

O comportamento contraria o comentário em `runtime.ts:638`, que promete material próprio por cópia.

Correção recomendada: percorrer a árvore clonada e clonar cada material, preservando geometria compartilhada. O descarte do item também precisa percorrer os materiais clonados.

### G3D-06 Média: AudioContext não é encerrado no teardown

O contexto global é criado em `runtime.ts:685`. `disposeAll` em `runtime.ts:1248` limpa mundos e texturas, mas não fecha, suspende ou zera `_audio`.

Reprodução com AudioContext controlado:

```text
playNote()
disposeAll()
chamadas a close() = 0
```

Impacto: atualizações repetidas do preview podem manter contexto e recursos de áudio até o documento inteiro ser destruído. A documentação de extensões pede cobertura explícita para limpeza de áudio.

Correção recomendada: fechar o contexto em `disposeAll`, zerar `_audio` em `finally` e testar teardown após nota e efeito.

### G3D-07 Média: objetos invisíveis continuam participando de raycasts

`setVisible` em `runtime.ts:427` muda apenas `visible`. `pickList` em `runtime.ts:898` devolve todos os objetos registrados. Os blocos de mouse, mira e chão passam essa lista diretamente ao Raycaster.

Reprodução com Three.js real: um mesh com `visible=false` continuou produzindo interseção quando passado explicitamente ao Raycaster. Em modelos, é preciso considerar também a visibilidade dos ancestrais.

Impacto: templates escondidos, como o original usado pelo exemplo de enxame, podem ser clicados, mirados ou detectados por sensores mesmo sem aparecer.

Correção recomendada: filtrar objetos logicamente ativos e efetivamente visíveis em toda a cadeia de pais. A mesma função de atividade deve excluir objetos removidos do G3D-01.

### G3D-08 Média: exemplos têm lacunas de responsividade, acessibilidade e QA

- Quatro exemplos usam canvas fixo de 480 por 360 em `examples.ts:66`, `examples.ts:210`, `examples.ts:295` e `examples.ts:376`, sem regra de `max-width` para telas menores.
- Apenas Travessia, Corrida e Torre possuem regra responsiva para `canvas`, em `examples.ts:518`, `examples.ts:731` e `examples.ts:919`.
- O teste estreito cobre somente Torre maluca, que já é um dos casos responsivos.
- A checagem de `aria-label`, `aria-describedby` e `tabindex` no Playwright é limitada a Jogo 2D em `e2e/examples-gallery.spec.ts:290`. Os canvases de Jogo 3D não recebem esses atributos no gerador nem no runtime.
- O contrato de `Desvie dos blocos` promete colidir e reiniciar em `qaContracts.ts:354`, mas o projeto apenas chama `stop` em `examples.ts:446`. Não há HUD, mensagem ou caminho de reinício.

Correção recomendada:

1. Aplicar largura fluida e limite máximo a todos os canvases fixos.
2. Dar nome, descrição de controles e foco ao canvas de cada jogo interativo.
3. Estender a checagem acessível do E2E para Jogo 3D.
4. Cobrir ao menos um dos quatro exemplos fixos na viewport de 390 por 844.
5. Implementar o reinício prometido em Desvie dos blocos ou ajustar honestamente o contrato de QA.

### G3D-09 Média: câmera FPS de dois mundos reage ao mesmo pointer lock

Cada chamada de `fpsCamera` instala um listener de `mousemove` por mundo em `runtime.ts:1077`. A condição em `runtime.ts:1078` verifica apenas se existe algum elemento com pointer lock, sem confirmar que o elemento é o canvas daquele mundo.

Impacto: se uma página tiver dois mundos com câmera FPS, travar o ponteiro em um canvas movimenta a câmera dos dois mundos. O runtime já aceita mais de um canvas, portanto o isolamento precisa existir.

Correção recomendada: exigir `document.pointerLockElement === world._canvas` e criar um teste com dois mundos.

### G3D-10 Baixa: documentação e um teste de ciclo de vida estão defasados

- `docs/EXTENSIONS.md:110` diz que Jogo 3D declara apenas `['canvas']`.
- O manifesto atual declara `['canvas', 'keyboard', 'mouse', 'audio']` em `manifest.ts:25`.
- `lifecycleSchema.test.ts:40` monta `g3d:setTexture` com `assetName`, mas o schema exige `asset`. O teste passa porque a IR já é inválida antes de chegar à regra que pretendia provar, criando um falso positivo.

Correção recomendada: atualizar a documentação e corrigir o fixture para que o teste demonstre especificamente a rejeição do bloco dentro do laço.

### G3D-11 Baixa: runtime e catálogo concentram complexidade demais

Métricas:

| Arquivo | Linhas |
| --- | ---: |
| `runtime.ts` | 2.399 |
| `blocks.ts` | 2.132 |
| `examples.ts` | 1.047 |
| Demais arquivos da extensão | 340 |
| Total da implementação | 5.918 |
| Total dos testes locais | 2.152 |

O runtime é uma única template string e o catálogo é uma única tabela extensa. Há repetição na troca de mundos por canvas, criação de câmeras, definição de enums entre blocos e parser, e documentação duplicada entre manifesto, contexto da IA e guia geral.

Impacto: mudanças locais ficam difíceis de tipar, revisar e testar isoladamente. A divergência de parser, placement e documentação encontrada nesta revisão é um efeito direto dessa fragmentação de contratos.

Correção recomendada:

1. Extrair metadados compartilhados dos blocos, principalmente enums, fase e efeito de recurso.
2. Dividir o runtime em módulos fonte e gerar o bootstrap no build, mantendo um único artefato final para o preview.
3. Centralizar remoção, troca de câmera e registro de mundo.
4. Gerar trechos repetitivos de documentação e parser a partir dos mesmos metadados quando isso não prejudicar a legibilidade.

## Segurança e robustez

Não encontrei vulnerabilidade crítica no bootstrap. A extensão usa importmap fixado, não solicita rede arbitrária e não contém avaliação dinâmica de código. A CSP e o guard do preview continuam sendo as barreiras corretas. Os limites de recursos e o descarte explícito do contexto WebGL são boas decisões.

O principal risco de robustez está na diferença entre descarte visual/GPU e remoção lógica dos registros. A correção do G3D-01 deve ser tratada antes de aumentar limites, adicionar novos kits ou expor a extensão para criação livre.

## Cobertura e verificações executadas

Comandos e resultados nesta revisão:

```text
bun run typecheck
resultado: exit 0

bun run check
resultado: 780 arquivos verificados, 0 erros, 0 correções

bun run test
resultado: 5.069 testes passaram, 0 falharam, 48.032 asserções, 308 arquivos

bun test com foco em game-3d, parser, Blockly e exportação
resultado: 711 testes passaram, 0 falharam, 28 arquivos

bun x playwright test e2e/examples-gallery.spec.ts --grep game-3d:
resultado: 9 cenários passaram, incluindo os 8 exemplos e Torre maluca em 390 x 844
```

Os testes existentes validam muito bem o caminho canônico. Eles não exercitam remoção de modelos e queda com inspeção dos registros, repetição e resize de câmeras genéricas, valores desconhecidos na Ponte, modelos dentro de enxames, limpeza de áudio, dois mundos FPS ou acessibilidade dos exemplos 3D.

## Ordem recomendada de correção

### P0 antes de liberar criação livre

1. G3D-03, preservação do código da Ponte.
2. G3D-01, ciclo de vida único para objetos e modelos.
3. G3D-02, troca idempotente e resize de câmeras.
4. G3D-04, fonte única para placement e validação.

### P1 antes do lançamento público

1. G3D-05, materiais de modelos em enxames.
2. G3D-06, descarte do áudio.
3. G3D-07, objetos ativos e visíveis nos raycasts.
4. G3D-08, responsividade, acessibilidade e promessa dos exemplos.
5. G3D-09, isolamento da câmera FPS.

### P2 manutenção

1. G3D-10, documentação e fixture de teste.
2. G3D-11, modularização gradual e geração de contratos compartilhados.

## Critério de saída sugerido

A extensão pode ser considerada pronta para criação livre quando os quatro achados altos tiverem regressões automatizadas, os achados médios de ciclo de vida e interação estiverem corrigidos, todos os exemplos interativos tiverem instrução acessível e responsiva, e a suíte completa continuar com zero falhas.
