# Extensões oficiais do Studio

O Sistema Zero Studio **não tem marketplace, loader dinâmico nem fetch remoto**.
O único caminho para uma extensão existir é estar no array
`OFFICIAL_CATALOG` em `src/official-extensions/index.ts`, bundlada
estaticamente junto com a biblioteca. Toda extensão é, portanto, código de
primeira-parte que passou por revisão humana.

Este documento é o **portão de revisão** para adicionar (ou alterar) uma
extensão oficial. Nenhum PR que toca `src/official-extensions/` deve ser
mergeado sem passar por todos os itens abaixo.

## Por que a barra é alta

O campo `runtime.bootstrapScript` de uma extensão é **injetado verbatim no
`<head>` do iframe de preview** (`src/components/preview/PreviewIframe.tsx`),
no mesmo contexto onde roda o código do aluno. Ele expõe uma API global (ex.:
`window.SZGame2D`). Não há sandbox de script dentro do iframe além do próprio
sandbox do iframe — o bootstrap roda com acesso total ao DOM do preview, aos
eventos de teclado/mouse, ao `<canvas>`, etc. Tratar o `bootstrapScript` como
**código não-confiável a auditar**, mesmo sendo nosso: um bug nele afeta todo
projeto que instalar a extensão.

## Checklist de revisão

### 1. Auditoria do `bootstrapScript` (script não-confiável)

- [ ] Leia o `bootstrapScript` **linha a linha**. Ele é injetado no iframe;
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
- [ ] `examples` carregam e rodam. Cada exemplo declara `experience`, possui
      cenário de QA e tem IR válido contra `SZIRV2Schema`, com `start`,
      `events` e `loops` semanticamente válidos.
- [ ] `runtime.lifecycle` usa um dos contratos oficiais de
      `src/extensions/lifecycle.ts`. O `target`, nome global e métodos existem
      no `bootstrapScript`; o gerador nunca escolhe o motor por `switch` local.
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
> apenas `['canvas']` mesmo importando o Three.js de um CDN.

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
- [ ] CDN de ESM confiável e estável (usamos `esm.sh`). A origem do `esmImports`
      é adicionada ao `script-src` do CSP do preview — revise-a.
- [ ] A mesma versão deve existir como dep npm no template profissional
      correspondente (`three-ts`), para o código gerado migrar de Blocos →
      Profissional sem ajuste de versão.
- [ ] Higiene de GPU no runtime: `dispose()` de geometrias/materiais/renderer,
      `setPixelRatio(<=2)`, `setAnimationLoop(null)` no teardown.

### 4. Blocos namespaced

- [ ] **Todos** os blocos da extensão usam um prefixo de tipo próprio
      (ex.: `g2d:createSprite`). Nenhum bloco de extensão pode colidir com um
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
- [ ] Todo bloco executável possui contrato de `placement` materializado em
      `blockly/blockContracts.ts`: áreas-raiz (`start`, `events`, `loops`),
      contextos aninhados, papel e fase. Não crie checks ou classificadores
      paralelos no toolbox, builder ou schema.
- [ ] Comandos de preparo entram em **⚙️ Ao iniciar**; chapéus “Quando…” entram em
      **⚡ Quando acontecer — Eventos**; atualizações contínuas e periódicas entram
      em **🔁 Enquanto estiver rodando — Loops**. Eventos e loops-raiz não podem ser aninhados. Corpos internos
      usam os checks de contexto (`event-body`, `loop-body`, `function-body`,
      etc.) materializados pelo contrato.
- [ ] Blocos de compatibilidade com migração `unwrap-*` ou
      `remove-engine-boot` ficam `hidden: true` e ausentes de toda toolbox.
- [ ] Campo que REFERENCIA um nome já criado noutro bloco (sprite, cena/mundo,
      objeto 3D, grupo/enxame, folha de quadros, mapa de tiles, imagem/textura…)
      usa um **seletor**, não `field_input`: `field_sprite_picker` (sprites, com
      miniatura), `field_asset_picker` (imagens do projeto) ou `field_name_picker`
      com o `kind` certo (`scene3d`/`object3d`/`group3d`/`spritesheet`/`tilemap`/…).
      O valor segue string (round-trip intacto). O bloco que DECLARA o nome fica em
      `field_input` E precisa estar registrado no `*_DECL_BLOCKS` correspondente em
      `blockly/fields/FieldNamePicker.ts` (ou `FieldSpritePicker.ts`), senão o
      seletor lista "nenhum ainda". Ver "Padrões já usados → Seletores de NOME" no
      CLAUDE.md. (game-2d/game-3d já seguem isto.)

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
      registráveis e os exemplos do manifest.
- [ ] A guarda exaustiva definição → Blockly → IR → área aceita todas as raízes
      visíveis; round-trip não emite warnings; blocos de migração não aparecem
      na paleta.
- [ ] O runtime cobre execução, reinício/novo jogo quando aplicável, pausa,
      descarte de listeners/timers/áudio/GPU e erro isolado no callback do aluno.
- [ ] `bun test src` continua verde e o typecheck (`bun run typecheck`) limpo.

## Como adicionar

1. Crie `src/official-extensions/<id>/` com `manifest.ts`, `blocks.ts`,
   `runtime.ts`, `ai.ts`, `examples.ts` e `index.ts` (espelhe `game-2d/`).
2. O `index.ts` chama `validateManifest(manifest)` e exporta a
   `ExtensionDefinition`.
3. Adicione a definição ao array `OFFICIAL_CATALOG` em
   `src/official-extensions/index.ts`.
4. Abra o PR e percorra **todo** o checklist acima na descrição.
