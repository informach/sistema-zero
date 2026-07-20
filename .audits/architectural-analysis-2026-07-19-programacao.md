# Full review — categoria Programação

Data: 2026-07-19  
Commit de referência: `9c5bb92c`  
Escopo: `packages/studio`, categoria Blockly **Programação** (JavaScript, DOM/Página, Eventos, Matemática, Valores, Funções, Classes e Objetos), incluindo catálogo, flyouts, semântica, IR, geradores, parser, persistência e preview.

## Veredito executivo

A categoria tem boa cobertura unitária e uma base funcional ampla, mas não está pronta para ser considerada robusta em projetos avançados. Foram confirmados **11 achados: 2 críticos, 3 altos, 4 médios e 2 baixos**.

Durante a verificação final, o worktree recebeu alterações concorrentes em contratos centrais e extensões. No estado final auditado, `check`, `typecheck`, a suite unitária e o E2E da galeria também estão vermelhos; esses bloqueios de integração são registrados separadamente porque não foram introduzidos por esta revisão e parte deles está fora da categoria Programação. Em particular, a nova lista de statements exclusivos de “Ao iniciar” invalida manifests oficiais antes de a galeria renderizar.

Os dois riscos prioritários são:

1. projetos com parâmetros contextuais podem reabrir com perda silenciosa da maior parte dos blocos;
2. blocos guiados de DOM conseguem criar e executar um `<script>` cujo loop não passa pelo instrumentador, podendo travar a aba inteira do Studio.

A quantidade de blocos **não é um achado**. A paleta extensa é intencional e o produto já dispõe de `allowBlocks` por aula. As recomendações de organização preservam todos os blocos.

## Inventário auditado

- 156 definições nas famílias da categoria.
- 153 blocos visíveis e 3 ocultos por compatibilidade.
- 148 tipos ofertados pelos flyouts.
- Distribuição pedagógica: 47 `iniciante-2d`, 50 `intermediario-2d`, 59 `avancado-2d`.
- Grupos: Variáveis 5, Lógica & Se 5, Repetições 12, Listas 3, Console 5, Dados/Web 2, Assíncrono 4, Matemática 8, Valores 41, Página 23, Eventos 18, Funções 5, Classes 11 e Objetos 10.
- Não foram encontrados tipos de definição duplicados nem tooltips ausentes nos blocos visíveis.
- Duplicações intencionais: valores de evento em Valores/Eventos e retornos em Funções/Classes.

## Achados

### P0 / Crítico — restauração de projetos com parâmetros perde blocos

**Evidência.** Ao serializar o IR do exemplo Invasores e carregar o `blocksState` em um workspace real, o Blockly lança:

```text
The block "sz_val_arg" ... could not connect ...
Connection checks failed. Output Connection expected JSValue, found JSValue
```

O estado continha cerca de 481 nós de bloco, mas apenas 15 foram carregados. O E2E [`core-example-invaders.spec.ts`](../packages/studio/e2e/core-example-invaders.spec.ts) ainda retorna sucesso porque verifica apenas que algum bloco ficou visível e que o preview executou; o próprio servidor do navegador registra o aviso de falha.

**Causa.** O requisito semântico contextual de `sz_val_arg` em [`htmlConnectionChecker.ts`](../packages/studio/src/blockly/htmlConnectionChecker.ts) é aplicado durante a desserialização, antes de o contexto do mutator/parâmetro estar completamente reconstituído. A checagem física aceita `JSValue`, mas a checagem semântica rejeita a conexão.

**Impacto.** Projetos com funções/classes podem parecer abrir normalmente enquanto o editor perde silenciosamente grande parte da estrutura visual.

**Correção recomendada.** Tornar a validação contextual segura durante o carregamento: restaurar o contexto antes dos filhos ou adiar a validação semântica até o fim da desserialização. O E2E deve falhar em qualquer aviso de `blocksState`, conferir uma contagem mínima determinística e validar blocos contextuais representativos.

### P0 / Crítico — `<script>` dinâmico contorna o guard de loops

**Evidência.** Os blocos guiados permitem criar qualquer tag, definir `textContent` e anexar o elemento. Assim, esta sequência é expressável apenas com blocos de Programação:

```js
const pagina = document.querySelector('body')
const codigo = document.createElement('script')
codigo.textContent = 'while (true) {}'
pagina.appendChild(codigo)
```

O preview instrumenta apenas o JavaScript canônico em [`bootstrap.ts:195`](../packages/studio/src/preview/bootstrap.ts), portanto o loop dentro da string não recebe `__szLoopTick()`. Ao mesmo tempo, a CSP em [`csp.ts:72`](../packages/studio/src/preview/csp.ts) aceita scripts inline com `'unsafe-inline'`. A criação e o append vêm de [`dom.ts`](../packages/studio/src/blockly/blocks/dom.ts) e [`js.ts`](../packages/studio/src/generators/js.ts).

**Impacto.** Uma criança pode travar a aba inteira do Studio usando somente blocos guiados, sem recorrer ao editor de código.

**Correção recomendada.** Bloquear tags executáveis no bloco guiado, na importação/parser e na validação do IR; revisar também SVG executável. Como defesa em profundidade, usar nonce/hash para scripts de infraestrutura e retirar `'unsafe-inline'` de scripts criados pelo projeto. Adicionar E2E que prove que a injeção é recusada e que a IDE continua responsiva.

### P1 / Alto — três contratos semânticos discordam sobre eventos e `this`

**Evidência.** [`lifecycle.ts:437`](../packages/studio/src/ir/lifecycle.ts) admite eventos dentro de corpos de função, enquanto [`blockContracts.ts`](../packages/studio/src/blockly/blockContracts.ts) classifica eventos como raiz e os testes de semântica proíbem essa conexão. Além disso, o tooltip de `sz_val_this` o apresenta como elemento atual do evento, mas [`htmlConnectionChecker.ts:68`](../packages/studio/src/blockly/htmlConnectionChecker.ts) o restringe a corpo de classe. Uma função contendo `sz_val_this` não pode ser conectada ao evento nomeado que promete disponibilizar esse valor.

**Impacto.** Código aceito pela Ponte/importação não é necessariamente remontável por drag-and-drop; exemplos e textos ensinam composições que o editor rejeita.

**Correção recomendada.** Definir um único modelo de contexto para registro de eventos e para `this`. Separar, se necessário, `this` de classe e `currentTarget` de evento, e reutilizar o contrato no schema, checker físico, importação, tooltips e testes de round-trip interativo.

### P1 / Alto — `fetch JSON` considera HTTP 4xx/5xx um sucesso

**Evidência.** [`js.ts:880`](../packages/studio/src/generators/js.ts) encadeia diretamente `resposta.json()` sem testar `resposta.ok`. Com uma resposta simulada `{ ok: false, status: 404 }`, o callback de sucesso é executado. O texto do bloco promete chamar o caminho de erro quando a operação falhar.

**Impacto.** A lógica ensinada para APIs trata erros HTTP como dados válidos, produzindo comportamento incorreto e um modelo mental enganoso.

**Correção recomendada.** Verificar `response.ok`, lançar erro com status antes de ler o JSON e cobrir 404, 500, JSON inválido e falha de rede em testes de execução, além do round-trip textual.

### P1 / Alto — `allowBlocks` não garante uma paleta exata e utilizável

**Evidência.** Quatro blocos OOP legados continuam visíveis no catálogo, mas são filtrados por uma segunda lista local em [`paramsFlyout.ts:87`](../packages/studio/src/blockly/paramsFlyout.ts). Uma aula com `allowBlocks: ['sz_js_call_method']` cria a categoria Classes vazia. Já uma aula que libera apenas função, retorno e argumento pode receber Funções e Classes, com retorno duplicado. `sz_val_arg` está catalogado em Classes embora seja contextual em Funções e Classes.

**Impacto.** A curadoria por aula pode gerar categorias vazias, duplicadas ou diferentes do conjunto solicitado — exatamente o mecanismo que torna viável a paleta extensa.

**Correção recomendada.** Centralizar metadados de ofertabilidade, grupo e contexto. Manter blocos legados registrados para compatibilidade, mas ocultos do catálogo. Só criar categorias dinâmicas quando o flyout efetivo tiver conteúdo. Criar teste exaustivo de `allowBlocks` unitário para todos os tipos ofertáveis.

### P2 / Médio — variável local de `filtrar lista` não aparece no seletor

**Evidência.** [`FieldNamePicker.ts:620`](../packages/studio/src/blockly/fields/FieldNamePicker.ts) registra os binders de `map` e `find`, mas omite `sz_val_array_filter`. Em um bloco `filter` cujo item se chama `inimigo`, um `sz_val_variable` aninhado recebe uma lista de nomes vazia.

**Impacto.** A criança precisa digitar o nome manualmente, perde autocomplete e pode criar erro por digitação no principal valor local do bloco.

**Correção recomendada.** Incluir `sz_val_array_filter: ['ITEM']` e testar paridade de escopo entre map, find e filter.

### P2 / Médio — laços reavaliam limites e não suportam intervalo decrescente

**Evidência.** [`js.ts:779`](../packages/studio/src/generators/js.ts) injeta a expressão de quantidade diretamente na condição do `for`; um valor aleatório ou com efeito colateral é recalculado a cada iteração. [`js.ts:836`](../packages/studio/src/generators/js.ts) sempre usa `<`, mesmo com passo negativo: `3 → 0, passo -1` executa zero vezes, e `0 → 10, passo -1` anda na direção errada até o guard interromper.

**Impacto.** Blocos visualmente simples têm semântica surpreendente; programas corretos não executam e combinações inválidas gastam o limite do guard.

**Correção recomendada.** Avaliar início, fim, passo e repetição exatamente uma vez; escolher `<` ou `>` pela direção; rejeitar/tratar passo zero; cobrir limites com efeitos e intervalos ascendentes/descendentes.

### P2 / Médio — embaralhamento é enviesado e altera a lista de origem

**Evidência.** [`expr.ts:818`](../packages/studio/src/generators/expr.ts) gera `array.sort(() => Math.random() - 0.5)`, algoritmo não uniforme e dependente do motor. A extensão Jogo 2D Avançado já contém Fisher–Yates correto, evidenciando duplicação de solução.

**Impacto.** Jogos de memória/cartas recebem distribuição enviesada, e a mutação implícita da lista pode surpreender o aluno.

**Correção recomendada.** Adotar um helper Fisher–Yates canônico, documentar explicitamente se retorna cópia ou modifica a lista e cobrir invariantes/round-trip.

### P2 / Médio — campos consumidores ainda aceitam texto livre

**Evidência.** Vários blocos que consomem nomes existentes usam `field_input`, apesar da regra de projeto para `FieldNamePicker`: `sz_js_object_assign` (SOURCE/TARGET), `sz_js_on_event_named` (HANDLER), `sz_js_set_timeout_call` (FN), canvas CTX, append PARENT/CHILD e diversos alvos DOM/objeto.

**Impacto.** Erros de digitação viram `ReferenceError` em conceitos introdutórios e a experiência varia entre blocos equivalentes.

**Correção recomendada.** Migrar consumidores para pickers contextuais, mantendo apenas declarações como texto livre. Criar um tipo específico para ID HTML cru quando `#id` não for apropriado.

### P3 / Baixo — progressão pedagógica e textos deixam dependências escondidas

**Evidência.** Há listeners no nível iniciante cujos valores naturais aparecem apenas no intermediário: teclado versus tecla do evento, clique/movimento versus posição do evento e mudança de tela cheia versus estado da tela cheia. O tooltip de retorno fala apenas em método apesar de o bloco estar em Funções, e o de argumento omite uso em funções.

**Impacto.** A aula pode liberar um evento sem liberar o valor que seu próprio texto ensina a consumir.

**Correção recomendada.** Alinhar níveis ou adaptar os textos e ampliar a auditoria de copy para Matemática e Funções.

### P3 / Baixo — pipeline centralizado e testes de contrato incompletos

**Evidência.** Os 19 arquivos centrais revisados somam aproximadamente 55 mil linhas. Os maiores são `parser/js.ts` (~12 mil), `ir/schema.ts` (~11 mil), `blockly/buildIR.ts` (~10,4 mil), `workspaceState.ts` (~8,3 mil) e `generators/js.ts` (~8 mil). Não há uma auditoria gerada que percorra todo bloco visível por definição → Blockly real → IR → JS → parser → reabertura. O falso positivo do exemplo Invasores demonstra a lacuna.

**Impacto.** Contratos duplicados derivam e regressões ficam escondidas atrás de suites verdes.

**Correção recomendada.** Extrair registries/handlers por família de recurso de forma incremental e gerar testes de contrato exaustivos a partir de metadados compartilhados. Não reduzir a quantidade de blocos.

## Pontos fortes

- Todas as definições visíveis têm tooltip e não há tipos duplicados.
- O catálogo por nível e o mecanismo `allowBlocks` já fornecem a base correta para progressão por aula.
- IR, geração, parser e persistência têm cobertura unitária extensa.
- O guard de loops protege o JavaScript canônico e a CSP restringe origens externas; o problema é um caminho dinâmico específico.
- No snapshot inicial, o pacote passava check, tipagem, build e 4.124 testes; o build continuou verde após as alterações concorrentes.

## Ordem sugerida de correção

1. **P0:** restauração contextual e bloqueio de script dinâmico.
2. **P1:** unificar semântica de eventos/`this`, corrigir fetch e tornar `allowBlocks` exato.
3. **P2:** escopo do filter, laços, shuffle e pickers.
4. **P3:** progressão/copy e modularização orientada por contratos.

Cada etapa deve incluir regressão de round-trip e, quando afeta o editor, um E2E que confira ausência de warnings e estrutura completa — não somente preview funcional.

## Verificação executada

Consulte [`verification-report.md`](programacao-review/qa/verification-report.md). Nenhum arquivo de produção foi alterado por esta revisão.
