# Arquitetura do Studio

Este é o mapa canônico e curto da arquitetura atual. O `CLAUDE.md` registra
decisões e regressões históricas; quando houver conflito, este documento e o
código/testes atuais prevalecem.

## Fronteiras

- `src/studio/`: composição pública, configuração por instância e ciclo de vida.
- `src/core/` e `src/ir/`: modelo persistido e contratos sem dependência de UI.
- `src/parsers/` e `src/generators/`: conversão código ⇄ IR. Codecs recebem
  callbacks dessas camadas; não devem importá-las em ciclo de runtime.
- `src/blockly/`: IR ⇄ workspace e UI Blockly.
- `src/modes/`: entradas lazy de Blocos, Ponte e Código.
- `src/preview/`: documento sandbox, CSP, runtime e bridges autenticadas.
- `src/official-extensions/`: blocos, codecs, exemplos e runtimes por extensão.
- `src/projects/`, `src/persistence/` e `src/asset-library/`: dados locais e
  operações que podem falhar. Mutações destrutivas exigem confirmação e sucesso
  persistido antes de atualizar a UI.

## Regras verificadas automaticamente

- O carregamento inicial e cada modo têm orçamento bruto e gzip em
  `src/projects/__tests__/initialBundleBudget.test.ts`.
- `src/generators/__tests__/architecture.test.ts` impede ciclos conhecidos e
  dependências sem consumidores.
- A IR dos exemplos do Jogo 3D Avançado é gerada por
  `scripts/gen-game-3d-examples.ts`; `bun run check:game-3d-examples` detecta
  drift sem reescrever arquivos.
- Segurança da imagem do runtime: `bun run audit:image` e `bun run build:image`
  em `packages/studio-runtime`.
- Acessibilidade automatizada: `bun run e2e:a11y`.

## Comandos locais

```sh
bun run test
bun run check
bun run e2e:smoke
bun run e2e:gallery
bun run e2e:security
bun run e2e:a11y
bun run check:game-3d-examples
```

## Arquivos concentrados

`parsers/js.ts`, `ir/schema.ts` e `blockly/buildIR.ts` são fachadas históricas
grandes. Código novo de extensão deve entrar em módulos de codec da própria
extensão e ser injetado nessas fachadas; não acrescente um novo domínio inline.
Ao extrair código existente, mantenha primeiro os testes de parse, geração e
round-trip, mova um domínio por vez e só então reduza a fachada.
