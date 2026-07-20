# Full review — extensão Jogo 2D do Studio

**Data:** 2026-07-20 13:29 (America/Sao_Paulo)  
**Escopo:** `packages/studio/src/official-extensions/game-2d` e integrações necessárias em Blockly, IR, geradores, catálogo, galeria e CI  
**Snapshot:** árvore de trabalho local, com alterações não commitadas anteriores a esta auditoria  
**Método:** revisão arquitetural completa, revisão pedagógica, análise estática, testes Bun e Playwright no Chromium  
**Alterações de produto feitas pela auditoria:** nenhuma

## Veredito

A extensão está tecnicamente madura, tem uma superfície funcional incomum para um ambiente infantil e apresenta boa engenharia defensiva: contratos explícitos, linguagem em português, erros didáticos, runtime sem rede ou armazenamento, 14 exemplos executáveis e cobertura ponta a ponta real no Chromium.

Eu ainda **não aprovaria este snapshot para merge/release**. Há um teste da própria extensão quebrado e uma regressão funcional de acessibilidade que depende da ordem em que a criança encaixa dois blocos válidos em `Ao iniciar`. Ambos são localizados e de correção pequena, mas o primeiro deixa o gate vermelho e o segundo elimina objetivo e controles para leitores de tela.

Resumo dos achados abertos:

| Severidade | Quantidade | Síntese |
|---|---:|---|
| Crítica | 0 | Nenhuma |
| Alta | 1 | A suíte focada falha por um guard de template desatualizado |
| Média | 2 | Descrição acessível é apagada; E2E de browser não roda no CI |
| Baixa | 1 | Documento de auditoria contém métricas antigas |

Após corrigir A1 e M1, o risco residual é baixo. M2 e B1 são importantes para impedir recorrência, mas não indicam falha do runtime atual no Chromium.

## Inventário auditado

- 42 arquivos TypeScript no módulo: 24 de produto e 18 de teste.
- 12.999 linhas de produto e 7.268 linhas de testes.
- 195 definições de blocos: 193 visíveis e 2 legadas ocultas.
- 24 subcategorias, com cada bloco visível presente exatamente uma vez.
- 193 chaves públicas tipadas em `SZGame2D`.
- 14 exemplos oficiais.
- Runtime composto com 5.028 linhas e 199.273 caracteres.
- Integrações revisadas: definição Blockly, placement contract, transformação para IR, schema Zod, geração JS, allowlist de extensão, manifest, prompts da IA, exemplos, galeria E2E e workflow de CI.

Não encontrei bloco visível sem tooltip, ID de bloco duplicado, API pública sem correspondência, `any` no código de produto, `TODO`/`FIXME` relevante, uso de `eval`, `innerHTML`, `fetch`, XHR, WebSocket, storage ou `postMessage` dentro do runtime da extensão. O `new Function` usado pelos testes/preview avalia o bootstrap controlado pelo projeto, não texto fornecido diretamente ao runtime.

## Achados altos

### A1. O guard do runtime composto ficou desatualizado e quebra a suíte da extensão

**Evidência**

- `runtime.ts:21-23` passou a prefixar `buildProjectRunContextRuntime()` ao IIFE do Jogo 2D.
- A composição agora contém três template literals, portanto seis limites.
- `__tests__/templateGuard.test.ts:80` ainda chama `composedTemplateHazards(..., 4)`.
- Execução fresca: 754 testes passaram e 1 falhou no escopo relevante; o valor recebido foi 6 e o esperado foi 4.
- O teste final que compila o runtime com `new Function` passou, e os 24 testes Playwright também passaram. Portanto a falha é do guard, não evidência de runtime sintaticamente inválido.

**Impacto**

O pacote não possui uma suíte verde para o Jogo 2D. Em CI, `bun run --filter '*' test` executa o script `bun test src`, então esse guard impede aprovação mesmo que o browser funcione.

**Recomendação**

Atualizar o guard para a composição atual e evitar novo número mágico. O teste deve derivar ou explicar os três literais esperados, mantendo a checagem de `${` acidental e a prova final de parse. Executar novamente toda a suíte focada.

## Achados médios

### M1. `Preparar o jogo` apaga silenciosamente a descrição para leitor de tela

**Evidência**

- `runtime/stage.ts:54-66` aplica a descrição recebida ou o texto genérico.
- `runtime/stage.ts:217` e `runtime/stage.ts:248` chamam `_setStageDescription()` sem argumento em `setupStage` e `setupStageFull`.
- `blockCatalog.ts:1812-1823` marca `Descrever o jogo para leitor de tela` como `start-only-command`, mas o tooltip apenas diz para colocá-lo em `Ao iniciar`.
- `Preparar o jogo` também é um comando válido de início. Não há contrato que imponha a ordem entre os dois.
- Reprodução com o runtime real em happy-dom:

```text
custom=Colete 4 moedas. Use as setas.
afterSecondSetup=Jogo 2D interativo
```

- O teste existente em `__tests__/lifecycle.test.ts:310-326` verifica somente a ordem feliz: primeiro preparar, depois descrever.

**Impacto pedagógico e funcional**

Uma criança pode encaixar primeiro a descrição e depois preparar a tela, uma sequência perfeitamente plausível. O jogo continua visualmente normal, mas o leitor de tela perde objetivo e controles sem aviso. Repetir um bloco de preparação também apaga uma descrição que já funcionava.

**Recomendação**

Preservar uma descrição explícita durante preparações posteriores. Uma solução simples é distinguir descrição padrão de descrição personalizada e só recalcular o padrão enquanto não houver valor explícito. Adicionar testes para ambas as ordens e para uma segunda chamada de `setupStage`/`setupStageFull`.

### M2. Os melhores testes de experiência real não estão protegendo o CI

**Evidência**

- `packages/studio/package.json:31` expõe `e2e: playwright test`.
- `.github/workflows/ci.yml:60-72` executa lint, `test` e `typecheck`, mas não Playwright.
- A auditoria executou manualmente 24 cenários do Jogo 2D em Chromium. Todos passaram, incluindo os 14 cartões, teclado/controles, primeiro frame, DPR 1/2/3 e viewport 390×844.

**Impacto**

Falhas que só aparecem no DOM/canvas real, no carregamento da galeria, no dimensionamento por DPR ou em viewport estreita podem entrar mesmo com CI verde. Para uma ferramenta infantil visual, esse é o principal caminho de uso, não uma borda exótica.

**Recomendação**

Adicionar ao CI pelo menos o subconjunto `examples-gallery.spec.ts --grep "game-2d:"`. Se o tempo total for impeditivo, usar job separado, cache de browsers e execução condicionada a mudanças em Studio/Jogo 2D. O conjunto atual levou cerca de 100 segundos em um worker.

## Achados baixos

### B1. O documento de auditoria vigente já divergiu das fontes reais

**Evidência**

- `docs/game-2d-audit-2026-07-20.md:9-10` registra 190 blocos, 189 visíveis e 1 oculto.
- O mesmo documento registra 188 APIs nas linhas 21, 133 e 236.
- O código atual possui 195 blocos, 193 visíveis, 2 ocultos e 193 APIs públicas.
- A versão 0.35.0 está correta no documento e em `manifest.ts:23`; o drift é de contagem e status da suíte.

**Impacto**

Não afeta a criança durante a execução, mas reduz a confiabilidade da documentação usada para release, manutenção e próximos reviews. O documento também transmite uma fotografia mais verde do que a verificação fresca.

**Recomendação**

Atualizar as métricas e remover contagens voláteis do texto quando não forem essenciais. Para números que precisam permanecer, gerar a seção ou criar um teste que compare o snapshot documental com `gameTwoDBlocks` e `GAME_TWO_D_API_KEYS`.

## Revisão da auditoria anterior

A auditoria de 2026-07-19 registrou 2 achados altos, 6 médios e 2 baixos. O snapshot atual resolveu a maior parte do débito:

| Achado anterior | Estado atual |
|---|---|
| A1 — duas arquiteturas de ciclo de vida | Resolvido: orientação canônica compartilhada e contratos de placement |
| A2 — 12/14 exemplos sem cenário executável | Resolvido: 14 playthroughs exatos e 14 contratos de QA |
| M1 — categorias contradizem as áreas pedagógicas | Resolvido: 24 categorias por assunto e sem balde `Mais` |
| M2 — warning após pausa normal do browser | Resolvido: atraso precisa ser sustentado; teste cobre pausa isolada |
| M3 — blocos fundamentais sem tooltip | Resolvido: 193/193 blocos visíveis têm tooltip |
| M4 — canvas sem nome/alternativa | Melhorado, mas parcialmente reaberto por M1 deste relatório |
| M5 — módulos monolíticos | Parcialmente resolvido: runtime e exemplos foram fragmentados; ainda há arquivos grandes |
| M6 — semântica duplicada em docs/IA/tooltips | Parcialmente resolvido: lifecycle foi centralizado; B1 mostra que snapshots ainda divergem |
| B1 — demos sem controles no preview | Resolvido nos exemplos e descrições acessíveis |
| B2 — Aventura semanticamente abstrata | Resolvido pelo playthrough e descrição de objetivo/controles |

## Arquitetura e qualidade interna

### Pontos fortes confirmados

- O catálogo usa uma única definição por bloco e testa presença única na toolbox.
- A allowlist de extensões coincide com as 195 definições.
- As 193 chaves do runtime são comparadas exatamente com o contrato público.
- `runtimeContract.ts` contém interfaces explícitas, sem reduzir a API a funções genéricas ou `any`.
- O runtime foi separado por domínio: stage, lifecycle, input/motion, physics, sprites, world, audio, utilities e kits.
- Callbacks de começo, quadro e eventos são isolados para que um erro de projeto não derrube todos os demais blocos.
- O loop trata pausa de aba, atraso sustentado e teardown; os recursos do projeto usam um contexto de execução compartilhado.
- DPR e redimensionamento foram verificados em DOM e em browser real.
- Não encontrei dependência circular, função interna claramente órfã nem arquivo morto no escopo.

### Riscos de manutenção remanescentes

Não são bugs isolados, mas merecem acompanhamento:

- `blockCatalog.ts` tem 2.795 linhas e concentra as 195 definições.
- `runtime/arcadeKits.ts` tem 1.627 linhas.
- `examples/arcade.ts` tem 1.461 linhas.
- O bootstrap final tem 5.028 linhas; sua forma string/ES5 é necessária ao sandbox, mas torna refactors sensíveis a escapes e composição.

O fracionamento atual já melhorou bastante o desenho. Próximos recortes devem seguir domínio pedagógico/funcional e preservar os testes de contrato; não recomendo uma reescrita ampla.

## Revisão pedagógica e de experiência infantil

### O que funciona bem

- Vocabulário direto em português, com exemplos concretos nos campos e tooltips.
- Blocos de alto nível permitem produzir Pong, plataforma, Asteroids, Dino, Gorilas, balão e aventura sem exigir física manual.
- Separação visual em 24 assuntos reduz a busca dentro de uma superfície muito grande.
- O modelo `Ao iniciar` / `A cada quadro` / eventos está consistente entre blocos, docs e IA.
- Mensagens do runtime explicam ações corretivas em vez de expor stack traces à criança.
- Os 14 exemplos têm descrição, objetivo e controles; nenhum usa `rawJS`.
- Compatibilidade com teclado, ponteiro, toque, viewport estreita e diferentes DPR foi exercitada.
- Há caminho acessível: canvas focável, nome, descrição associada, foco visível e anúncios de tela.

### Decisão de produto que precisa de validação com crianças

A extensão inteira fica disponível em `iniciante-2d`: 193 blocos em 24 categorias. O código documenta que a aula seleciona o subconjunto apresentado, então isso é uma decisão explícita, não um defeito arquitetural. Ainda assim, fora de uma aula filtrada a carga de escolha é alta. Recomendo medir com crianças o tempo para localizar blocos básicos, taxa de abandono e necessidade de ajuda, comparando paleta completa com progressão por projeto. Não há evidência no repositório que substitua esse teste de usabilidade.

## Segurança e privacidade

- Nenhuma chamada de rede no runtime da extensão.
- Nenhum acesso a local/session storage, cookies ou IndexedDB.
- Nenhum `postMessage` próprio.
- Nenhuma injeção por `innerHTML`, `eval` ou `new Function` dentro do runtime montado.
- Assets são consumidos pelo contexto do projeto; avisos de recurso ausente são fail-soft.
- Áudio depende de gesto/contexto do navegador e falha sem derrubar o jogo.

Não encontrei achado de segurança no escopo revisado.

## Evidência de verificação fresca

| Verificação | Resultado |
|---|---|
| Testes focados do Jogo 2D + integrações | **754 passaram, 1 falhou** — A1 |
| Playwright `examples-gallery` filtrado para `game-2d:` | **24/24 passaram** em Chromium |
| Biome apenas em `src/official-extensions/game-2d` | **42 arquivos aprovados** |
| `git diff --check` no escopo | Aprovado |
| `bun test src` no Studio | 4.517 passaram, 45 falharam; 1 falha pertence ao Jogo 2D, as demais são de áreas externas no snapshot sujo |
| `bun run typecheck` no Studio | Falhou em `programmingAccessibility.test.ts:28`, fora do Jogo 2D; nenhum erro do módulo foi reportado |
| `bun run check` no Studio | Falhou em arquivos externos; a checagem Biome focada passou |
| Reprodução da ordem de descrição acessível | Falhou funcionalmente — M1 |

O relatório detalhado de QA está em `.audits/game-2d-full-review-2026-07-20/qa/verification-report.md`.

## Ordem recomendada de correção

1. Corrigir o guard de template e restaurar 755/755 testes focados.
2. Preservar a descrição acessível independentemente da ordem dos blocos e adicionar testes de regressão.
3. Colocar o subconjunto Playwright do Jogo 2D no CI.
4. Atualizar/automatizar as métricas do documento de auditoria.
5. Planejar teste de usabilidade infantil para a paleta completa versus progressiva.

## Critério de aprovação sugerido

- 755/755 testes focados verdes ou contagem maior sem regressões.
- Testes novos cobrindo descrição antes/depois de ambos os blocos de preparação.
- 24/24 cenários atuais de Chromium verdes.
- Biome focado e `git diff --check` verdes.
- Nenhum novo erro de tipo no escopo.

