# Canvas Survival 6A.2 Implementation Plan

> **For agentic workers:** usar a skill instalada `executing-plans` para executar e verificar cada tarefa. O usuário autorizou trabalho paralelo nesta mesma branch/pasta/worktree; não criar checkout separado. Coordenar arquivos compartilhados com a sessão principal do Studio Pro antes de alterá-los.

**Goal:** entregar o kit próprio `canvas-survival` e integrar seus contratos ao Studio Pro existente.

**Architecture:** modelo puro com passo fixo, fontes TS autorais materializadas pelo factory público, assets no catálogo do projeto e UI/input/lifetime compartilhados. O construtor e a publicação permanente permanecem da sessão principal; este adendo fornece conhecimento e compatibilidade sem duplicar esses pipelines.

**Tech Stack:** TypeScript 5.9.3, Canvas 2D, Vite 8.0.16, Bun e Playwright existentes.

**Spec:** `.audits/studio-pro-canvas-p27-proposta-2026-10-15.md`, revisão 2; achados em `.audits/studio-pro-canvas-p27-review-2026-10-15.md`.

## Restrições globais e coordenação

- Branch `feat/studio-pro-completo`; pasta/worktree `C:/Users/tocha/projects/sistema-zero`.
- Não fazer reset, stash, checkout, limpeza geral, commit abrangente ou push. Não sobrescrever alterações concorrentes.
- Novos arquivos do kit e respectivos testes são desta sessão; catálogo/factory/helpers/store/export exigem divisão explícita com a sessão principal.
- Reusar contratos canônicos. Uma UI, um proprietário de RAF; simulação 60 Hz, delta máximo 50 ms, três ticks por callback; assets PNG próprios, sem copiar o P27.
- Não anunciar C01–C23 aprovados por compilar. Registrar provas e limitações no final deste plano.

## Divisão de trabalho

| Frente | Arquivos próprios | Responsável |
|---|---|---|
| Modelo puro | `packages/studio/pro-kits/canvas-survival/src/config.ts`, `model.ts`, `rules/*`, `tests/model.test.ts` | agente kit_2d_audit |
| Pack, loader e render | `.../src/assets.ts`, `characters.ts`, `render/*`, `.../assets/*`, `.../tests/assets.test.ts`, gerador do pack | agente proposal_consistency |
| Helpers compatíveis | `packages/studio/src/components/code/pro-templates/games/shared.ts` e testes dedicados | agente studio_integration, após coordenação |
| Integração e aceites | factory/catálogo/gerador/controller/store/export/host/E2E/documentação | sessão raiz, após coordenação de arquivos compartilhados |

### Tarefa 1 — Modelo determinístico

Interface inicial: `createArenaState({config?, seed?})`, `stepArena(state, {x, y, pulse})`, eventos de apresentação e resultado lógico imutável; nenhum DOM no modelo. O agente publica os tipos antes de renderer/controller consumirem.

- [x] Criar testes de invariância por ticks, diagonal, pulso/contato/empate, swept AABB, saturação e reinício.
- [x] Implementar configuração validada, PRNG e regras seguindo §5.4.
- [x] Executar os 23 testes do modelo e revisar os limites.

```ts
const a = createArenaState({ seed: 42 })
const b = createArenaState({ seed: 42 })
for (let tick = 0; tick < 120; tick++) {
  const input = { x: 1, y: 1, pulse: tick % 30 === 0 }
  stepArena(a, input)
  stepArena(b, input)
}
expect(a).toEqual(b)
```

### Tarefa 2 — Pack, manifesto e render

- [x] Criar pack PNG original pequeno com estados de personagem, fonte de autoria e permissões/créditos.
- [x] Implementar loader do manifesto canônico, hashes/metadados, limites antes/depois de decode, cancelamento e cleanup.
- [x] Implementar renderer com resize/DPR, corpo fixo/hitbox opcional, animação e efeitos limitados.
- [x] Verificar PNG estático, sheet, atualização por mesmo ID, dados inválidos e resultados tardios; sete testes, incluindo cinco cenários Chromium.

### Tarefa 3 — Contratos compartilhados

- [x] Ampliar disponibilidade/retry/menu/reset com motivo sem quebrar os cinco kits.
- [x] Corrigir input agregado e rearme; parar vozes em pausa/mute/menu/dispose; progresso pendente/ACK/falha.
- [x] Estender snapshot apenas com campos opcionais e preservar observador de leitura já introduzido pela sessão principal.
- [x] Rodar 18 testes do helper; 11 templates compilados e 12 playtests dos seis kits confirmados pela sessão principal.

### Tarefa 4 — Factory e fontes finais

- [x] Gerador determinístico com `--check`, hash dos helpers, composição sem sobrescrita silenciosa e typecheck dos fontes finais.
- [x] Catálogo/dispatch explícito; factory retorna árvore + assets independentes; pack e lock coerente incluídos.
- [x] Controller `createGame(ui,input)` integra modelo/loader/renderer com cleanup disponível desde a criação.
- [x] Validar template público por `parseBuildRequest`, tsc, build e empacotamento; o mesmo projeto alimenta E2E.

### Tarefa 5 — Integração de perfil e Pinta

- [x] Capturar escopo/token/ID antes do primeiro await; persistir no escopo capturado e impedir navegação obsoleta.
- [x] Retry sem duplicação; testes de troca de perfil durante carga/commit e criação fora de ordem.
- [x] Painel Materiais oferece cópia de ID/caminho; loader usa revisão de bytes/metadados. Fluxo autenticado do Pinta ainda requer homologação do host.
- [x] Testar consumo de PNG estático/sheet, atualização sob mesmo ID e roundtrip JSON do projeto.

### Tarefa 6 — Export, limites e ativação

- [x] LEIA-ME Pro e colisões autorais; Dockerfile usa lock antes de instalar; preservar export de projetos antigos sem lock com instrução correta.
- [x] ZIP real fora do monorepo passa npm ci/ls, tipos/build e Chromium; sem symlink/substituição de package.
- [ ] Medir envelopes completos e manter validação no servidor; erro preserva documento e marca preview anterior.
- [ ] Integrar capacidade/allowlist ao contrato acordado com sessão principal; reconhecer projetos antigos independentemente de card ativo.

### Tarefa 7 — Tutor e aceites de navegador

- [x] Guia por arquivos e missão Pensa, sem novo chat/pipeline; contratos e cenários entregues ao lote 7.
- [x] Oito cenários Chromium de controller + cinco de assets; progresso ACK/falha em testes dedicados e isolamento no host em regressões.
- [x] Regressão dos kits atuais confirmada pela sessão principal; limitações de hardware/autenticação explicitadas.
- [ ] Medir desempenho e estabilidade com estado real; não trocar orçamento após falha.

### Tarefa 8 — Revisão e entrega coordenada

- [x] Rever o diff de cada frente, typecheck global Studio e testes relevantes depois da integração.
- [x] Atualizar matriz C01–C23 em `.audits/studio-pro-canvas-implementacao-2026-10-15.md`; entregar contratos/medidas/arquivos à sessão principal.
- [x] Branch/worktree conferidos ao terminar; integração de M2/M3 e homologação permanecem com a sessão principal.

## Registro de execução

- Início: branch/worktree conferidos. Sessão principal localizada pelo contexto local; notificação e propriedade dos arquivos em coordenação.
- Implementação técnica entregue no worktree acordado; sem operações de git destrutivas, commit ou publicação. Revisão independente corrigiu retry após dispose, decode após abort e isolamento da prova de ZIP.
- Typecheck completo do Studio passou após corrigir a tipagem de um mock de navegação. Geradores/verificadores também fazem parte do typecheck.
- Medidas e provas estão em `2026-10-15-studio-canvas-coordenacao.md`; homologação física, fluxo autenticado Pinta, soak de 30 minutos e aceite global de capacidades/envelopes continuam no fechamento integrado. M2/M3 são da sessão principal.
- Fechamento: última suíte exclusiva 53/53, 607 assertions, oito cenários de controller em Chromium incluindo 360 CSS px/paisagem e cinco cenários de assets. Typecheck global e repetição incremental passaram. Arquivos liberados para a sessão principal.
