# Extensões oficiais do Studio

O Sistema Zero Studio **não tem marketplace, loader remoto nem fetch remoto**.
O único caminho para uma extensão existir é estar no array
`OFFICIAL_CATALOG` em `src/official-extensions/index.ts`, bundlada
estaticamente junto com a biblioteca. Manifesto, blocos, toolbox e contrato de
lifecycle entram no catálogo síncrono; o runtime pesado e os exemplos ficam em
chunks locais de `import()`, carregados somente quando usados. Toda extensão é,
portanto, código de primeira-parte que passou por
revisão humana.

Este documento é o **portão de revisão** para adicionar (ou alterar) uma
extensão oficial. Nenhum PR que toca `src/official-extensions/` deve ser
mergeado sem passar por todos os itens abaixo.

## Por que a barra é alta

O texto devolvido por `runtime.loadBootstrapScript()` é **injetado verbatim no
`<head>` do iframe de preview** (`src/components/preview/PreviewIframe.tsx`),
no mesmo contexto onde roda o código do aluno. Ele expõe uma API global (ex.:
`window.SZGame2D`). Não há sandbox de script dentro do iframe além do próprio
sandbox do iframe — o bootstrap roda com acesso total ao DOM do preview, aos
eventos de teclado/mouse, ao `<canvas>`, etc. Tratar o `bootstrapScript` como
**código não-confiável a auditar**, mesmo sendo nosso: um bug nele afeta todo
projeto que instalar a extensão.

## Checklist de revisão

### 1. Auditoria do `bootstrapScript` (script não-confiável)

- [ ] Leia o bootstrap carregado **linha a linha**. Ele é injetado no iframe;
      revise como se fosse código de terceiros.
- [ ] Sem `eval`, `new Function`, `document.write`, nem injeção de `<script
      src>` remoto. O bootstrap deve ser autocontido e estático.
- [ ] Sem chamadas de rede (`fetch`, `XMLHttpRequest`, `WebSocket`,
      `navigator.sendBeacon`) a menos que a permission `network` seja
      declarada e justificada (ver item 3).
- [ ] `localStorage`/`sessionStorage` no preview são SHIMS isolados por projeto
      (ver nota abaixo), não o armazenamento global do navegador; uma extensão que
      os use deve declarar a permission `storage` e justificar.
- [ ] A API global tem **prefixo de namespace próprio** (ex.: `window.SZGame2D`),
      nunca polui o escopo global com nomes genéricos.
- [ ] Listeners de teclado/mouse/áudio só existem se as permissions
      correspondentes (`keyboard`, `mouse`, `audio`) estiverem declaradas.
- [ ] HUDs e telas automáticas reutilizam `gameUiFont.ts`: Baloo 2 fica
      incorporada como `data:` URI, sem CDN, e a licença permanece em
      `official-extensions/fonts/`. Não substitua fontes escolhidas pelo aluno
      nem a tipografia monoespaçada de painéis estritamente técnicos.

### 2. Validação do manifest

- [ ] O `index.ts` da extensão chama `validateManifest(manifest)` em tempo de
      inicialização do módulo (falha cedo). Ver `src/extensions/manifest.ts`
      para o schema Zod completo.
- [ ] `id` em kebab-case, único no `OFFICIAL_CATALOG` (`a-z`, `0-9`, `-`; 2–40
      chars).
- [ ] `version` em semver simples (`MAJOR.MINOR.PATCH`).
- [ ] `official: true` (o catálogo só aceita oficiais).
- [ ] `permissions` lista **apenas** o que o `bootstrapScript` realmente usa —
      nada a mais. Cada permission vem do enum
      (`canvas` | `keyboard` | `mouse` | `audio` | `storage` | `network`).
- [ ] `docs` é markdown para o **usuário final** (não é o prompt da IA — esse
      vive em `ExtensionDefinition.ai.promptContext`). Dentro do teto de
      caracteres do schema.
- [ ] `ExtensionDefinition.examples` usa `defineExtensionExamples(contagem,
      loader)` e o loader faz `import()` relativo de `exampleCatalog.ts` (sem
      importar exemplos pelo manifest). A contagem declarada deve ser exata.
- [ ] Os exemplos carregam e rodam. Cada exemplo declara `experience`, possui
      cenário de QA e tem IR válido contra `SZIRV2Schema`, com `start`, `events`
      e `loops` semanticamente válidos. `loadExtensionExamples()` valida, mantém
      a ordem, congela o catálogo e permite retentativa após falha.
- [ ] Catálogos extensos preenchem os metadados editoriais opcionais
      `difficulty`, `concepts`, `genre`, `recommendedOrder` e `featured`; eles
      alimentam busca, filtros e percursos sem alterar nível ou allowlist de blocos.
- [ ] `runtime.lifecycle` usa um dos contratos oficiais de
      `src/extensions/lifecycle.ts`. O `target`, nome global e métodos existem
      no `bootstrapScript`; o gerador nunca escolhe o motor por `switch` local.
- [ ] `runtime.loadBootstrapScript()` usa `import()` relativo do `runtime.ts`.
      Todo consumidor passa por `loadExtensionBootstrapScript()`, que compartilha
      cargas concorrentes e remove falhas do cache para permitir retry.
- [ ] Use `managedProjectRun: true` somente quando o runtime pode repetir a
      factory do projeto no mesmo documento. Nesse caso, incorpore
      `buildProjectRunContextRuntime()` no `bootstrapScript`: listeners DOM
      inline ou nomeados, timeouts, intervalos e RAFs avulsos emitidos pelo
      gerador serão descartados antes do restart. Recursos próprios do motor
      continuam exigindo teardown no runtime.
- [ ] O boot é automático. Blocos antigos de “começar o jogo” podem continuar
      registrados como `hidden: true` apenas para desserialização e migração.

### 3. Justificativa de permissões

- [ ] Para **cada** permission declarada, escreva no PR uma linha justificando
      por que o `bootstrapScript` precisa dela e onde ela é usada. Permission
      sem uso real = remover. Permission usada mas não declarada = bug de
      segurança (o aluno não vê o aviso correto no painel de extensões).

> **Só a REDE é enforçada em runtime; o resto é declarativo.** O `permissionGuard`
> (`src/preview/permissionGuard.ts`, injetado no `<head>` do preview) neutraliza
> APENAS as APIs de rede — `fetch`/XHR/`WebSocket`/`EventSource`/`sendBeacon` —
> quando a rede não foi concedida. As demais capacidades (`canvas`, `keyboard`,
> `mouse`, `audio`, `storage`) são uma BASELINE sempre liberada ao aluno: **NÃO há
> gate de runtime** para `AudioContext` ou cookie. Essas permissions são
> DECLARATIVAS — alimentam o aviso do painel de extensões e a revisão de PR
> (itens 1 e 3 acima), não um bloqueio efetivo.
>
> **`storage` (localStorage/sessionStorage):** o sandbox tem origem OPACA — o
> `localStorage`/`sessionStorage` REAL do navegador LANÇA `SecurityError` ali. Por
> isso o `storageBridge` (`src/preview/storageBridge.ts`) injeta um SHIM funcional:
> `local` é persistido POR PROJETO (IndexedDB, via `state/gameStorage.ts`) e
> re-semeado a cada execução — sobrevive a "Atualizar" e ao recarregar a IDE;
> `session` é efêmero (zera a cada execução). NÃO é o `localStorage` global do
> navegador (é isolado por projeto, não compartilhado entre projetos/abas), mas dá
> aos blocos "guardar/ler" o comportamento esperado pelo aluno. Limitações
> conhecidas (baixas, aceitas): só a API de MÉTODOS (`getItem/setItem/removeItem/
> clear/key/length`) — acesso por propriedade (`localStorage.x = …`) não persiste;
> e um `location.reload()` DENTRO do programa re-semeia do snapshot do build (uma
> reexecução via "Atualizar"/recarregar a IDE re-semeia do estado já salvo).
> Consequência
> contra-intuitiva: declarar `network` **destrava** o `fetch` do aluno (o guard
> deixa de envolvê-lo); o professor ainda restringe por origem via
> `fetchAllowedOrigins`. Por isso uma extensão que só CARREGA uma lib via CDN
> fixado (ver item 7) **não** declara `network` — o carregamento da lib é
> `script-src`/importmap, não a rede do aluno (`connect-src`). A `game-3d` declara
> `['canvas', 'keyboard', 'mouse', 'audio']`, pois renderiza em WebGL, recebe
> controles e oferece efeitos sonoros. Ela não declara `network`, mesmo
> importando o Three.js de um CDN fixado.

### 7. Entrega de libs ESM via importmap (`esmImports`)

Extensões que dependem de uma biblioteca ESM grande (ex.: Three.js) **não**
embutem a lib no `bootstrapScript` nem usam `<script src>` remoto solto. Em vez
disso declaram `esmImports` na `ExtensionDefinition`:

```ts
// official-extensions/game-3d/index.ts
esmImports: { three: 'https://esm.sh/three@0.180.0' }
```

O `bootstrap.ts` injeta esses pares no **importmap** do iframe e, quando há
algum `esmImports`, promove os scripts de extensão E o script do aluno a
`type="module"` (para a ordem de carregamento dos módulos ser respeitada — o
`bootstrapScript` faz `import * as THREE from 'three'` e define `window.SZGame3D`
antes de o código do aluno rodar). Regras:

- [ ] Versão **fixada** (pin exato, ex.: `three@0.180.0`), nunca `latest`/range.
- [ ] CDN de ESM confiável e estável (usamos `esm.sh`). O entrypoint declarado
      entra no `script-src`; para imports transitivos do `esm.sh`, entra somente
      o prefixo do pacote com versão exata (nunca a origem inteira).
- [ ] A mesma versão deve existir como dep npm no template profissional
      correspondente (`three-ts`), para o código gerado migrar de Blocos →
      Profissional sem ajuste de versão.
- [ ] Higiene de GPU no runtime: `dispose()` de geometrias/materiais/renderer,
      `setPixelRatio(<=2)`, `setAnimationLoop(null)` no teardown.

### 4. Blocos namespaced

- [ ] **Todos** os blocos da extensão usam um prefixo de tipo próprio
      (ex.: `sz_g2d_*`). Nenhum bloco de extensão pode colidir com um
      bloco core (`sz_*`, `html_*`, etc.) nem com outra extensão — o registro
      `Blockly.Blocks` é um global de módulo compartilhado por TODAS as
      instâncias `<Studio>` da página (invariante #5). Um `type` duplicado
      sobrescreveria silenciosamente a definição de outra extensão.
- [ ] O `toolboxCategory.contents` referencia exatamente os `type` definidos em
      `blocks` — sem órfãos.
- [ ] **Cor = identidade da categoria** (paleta arco-íris, igual ao núcleo): a
      extensão tem 1 cor base e as SUB-categorias são TONS dela via
      `categoryShades(base, n)` (`blockly/colorShades.ts`). Um loop
      `COLOUR_BY_TYPE` pinta cada bloco com o tom da sua sub-categoria — NÃO
      hardcode hex por bloco (game-3d já teve uma sub-cat presa em rosa por
      faltar o loop). O texto do bloco é BRANCO, então os tons não podem clarear
      demais (o `categoryShades` já é viés-escuro).
- [ ] Todo bloco executável declara `placement` junto da própria definição.
      `blockly/blockContracts.ts` expande os presets para áreas-raiz (`start`,
      `events`, `loops`), contextos aninhados, papel e fase. Não crie um
      classificador paralelo na toolbox ou no builder. O schema da IR pode
      repetir os tipos de nós para proteger projetos importados, desde que o
      teste cruzado prove que catálogo e IR continuam alinhados.
- [ ] Contêiner cujo corpo interpreta blocos auxiliares declara `bodyContext`.
      Os auxiliares usam `root: []`, o mesmo contexto em `nested` e
      `directNested: true`; a validação da IR deve espelhar a contenção para que
      importações e a Ponte não aceitem uma árvore que o Blockly rejeita.
- [ ] Todo bloco de comando ou preparo com `input_statement` que entrega esse
      corpo a uma função declara `bodyExecution`: `sync-callback` quando o
      runtime chama a função antes de devolver, ou `deferred-callback` quando a
      guarda para evento, quadro, carregamento ou temporizador. Corpos puramente
      sintáticos (`se`, repetição, `switch`) continuam `structural`; eventos e
      loops-raiz já derivam o callback do papel declarado em `placement`. O
      contrato da IR deve enumerar os mesmos statements explicitamente, sem
      inferir pelo prefixo `on`.
- [ ] Um callback disparado diretamente por clique, toque ou `keydown` declara
      `userGesture: true` (ou a condição `{ field, equals }`). Isso é obrigatório
      para comandos que dependem da ativação transitória do navegador, como
      tela cheia. Não marque eventos que apenas observam um estado no próximo
      quadro.
- [ ] Comandos de preparo entram em **⚙️ Ao iniciar**; chapéus “Quando…” entram em
      **⚡ Quando acontecer**; atualizações contínuas e periódicas entram
      em **🔁 Enquanto estiver rodando**. Um passo contínuo usa `loop-command`:
      pode ficar no corpo de um loop ou de uma função/método, nunca diretamente
      em **Ao iniciar** nem no corpo direto de um evento ou construtor. Um loop
      aninhado nesses fluxos continua válido. Eventos e loops-raiz não podem ser aninhados. Um evento pode
      ser filho direto de uma função, método ou construtor para usar parâmetros e `this`, mas nunca pode ficar
      escondido sob `if`, repetição, outro evento ou outro comando. Corpos internos
      usam os checks de contexto (`event-body`, `loop-body`, `function-body`,
      etc.) materializados pelo contrato. Quando um contexto mais amplo também
      for permitido, use `forbiddenNested` para registrar exclusões ancestrais;
      criadores de recursos, por exemplo, proíbem `loop-body` em qualquer profundidade.
      Use `resource-creator` também para comandos que ligam uma configuração
      persistente uma única vez; eles podem nascer em início/evento/função, mas
      nunca dentro de loop.
      Imports, classes e funções são declarações diretas de **Ao iniciar**. Um
      loop do motor chama um callback: ele não torna `break`/`continue` válidos;
      esses controles pertencem apenas a laços sintáticos (`for`/`while`/`repeat`).
- [ ] Blocos de compatibilidade com migração `unwrap-*` ou
      `remove-engine-boot` ficam `hidden: true` e ausentes de toda toolbox.
- [ ] Campo que REFERENCIA um nome já criado noutro bloco (sprite, cena/mundo,
      objeto 3D, grupo/enxame, folha de quadros, mapa de tiles, imagem/textura…)
      usa um **seletor**, não `field_input`: `field_sprite_picker` (sprites, com
      miniatura), `field_asset_picker` (imagens do projeto) ou `field_name_picker`
      com o `kind` certo (`scene3d`/`object3d`/`g3d-object`/`group3d`/`spritesheet`/`tilemap`/…). `object3d` aceita objetos Three.js genéricos; `g3d-object`
      aceita somente objetos ligados a um mundo do Jogo 3D.
      O valor segue string (round-trip intacto). O bloco que DECLARA o nome fica em
      `field_input` E precisa estar registrado no `*_DECL_BLOCKS` correspondente em
      `blockly/fields/FieldNamePicker.ts` (ou `FieldSpritePicker.ts`), senão o
      seletor lista "nenhum ainda". Ver "Padrões já usados → Seletores de NOME" no
      CLAUDE.md. (game-2d/game-3d já seguem isto.)
- [ ] Referências semânticas do Jogo 3D também estão registradas em
      `GAME3D_SEMANTIC_DECLARATION_FIELDS` e `GAME3D_SEMANTIC_REFERENCE_FIELDS`.
      O primeiro catálogo também alimenta o registro geral de variáveis. O schema
      deve distinguir mundo, objeto genérico, objeto ligado ao jogo, grupo e enxame,
      respeitando ordem e escopo, para que um nome inválido apareça no bloco antes
      de gerar JavaScript. Expressões que devolvem objetos nomeáveis ficam em
      `GAME3D_OBJECT_EXPRESSION_TYPES`.

### 5. Re-registro e remoção (invariante #5)

- [ ] Os blocos da extensão são re-registráveis idempotentemente
      (`registerExtensionBlocks` ignora `type` já registrado). Instalar a mesma
      extensão duas vezes não pode duplicar blocos.
- [ ] A remoção por-instância **não** apaga `Blockly.Blocks[type]` — o registro
      é global e outra instância pode ainda estar usando. A categoria some
      porque a toolbox é reconstruída a partir do `installedExtensions` do
      projeto, sem tocar no registro global. Ver `removeExtension` em
      `src/state/extensionsAdapter.ts`.

### 6. Testes

- [ ] A extensão tem testes (`__tests__/`) cobrindo manifest válido, blocos
      registráveis e os catálogos/runtime carregados pelos providers.
- [ ] O teste de bundle prova que nenhum nome/IR de exemplo entrou no chunk
      inicial do `OFFICIAL_CATALOG`; a vitrine cobre carregamento, erro e retry.
- [ ] A guarda exaustiva definição → Blockly → IR → área aceita todas as raízes
      visíveis; round-trip não emite warnings; blocos de migração não aparecem
      na paleta.
- [ ] O runtime cobre execução, reinício/novo jogo quando aplicável, pausa,
      descarte de listeners/timers/áudio/GPU e erro isolado no callback do aluno.
- [ ] `bun test src` continua verde e o typecheck (`bun run typecheck`) limpo.

## Como adicionar

1. Crie `src/official-extensions/<id>/` com `manifest.ts`, `blocks.ts`,
   `runtime.ts`, `ai.ts`, `examples.ts`, `exampleCatalog.ts` e `index.ts`
   (espelhe `game-2d/`).
2. O `index.ts` chama `validateManifest(manifest)`, declara os providers com
   `defineExtensionExamples(contagem, () => import('./exampleCatalog'))` e
   `runtime.loadBootstrapScript: () => import('./runtime')`, e exporta a
   `ExtensionDefinition`.
3. Adicione a definição ao array `OFFICIAL_CATALOG` em
   `src/official-extensions/index.ts`.
4. Abra o PR e percorra **todo** o checklist acima na descrição.
