# Verificações da revisão

Referência: `37f4d4e3aa82244688438bbec04034fb9fbd6f63`. Windows local, não aparelho
de entrada: Ryzen 5 5600G, aproximadamente 32 GB de RAM e RTX 3050. Ambiente detalhado em
`environment.json`. Nenhuma referência de aula foi regravada.

## Resultados

| Comando/ensaio | Resultado |
|---|---|
| `bun install --frozen-lockfile` na raiz | Saída 0 |
| `npm ci --ignore-scripts --no-audit --no-fund --prefix packages/studio-runtime/runtime` | Saída 0; dependências do teste de build/conversão |
| `node scripts/test-isolated.mjs` em packages/studio | Saída 0; 852 arquivos, 162 processos, 11.412 casos diretos aprovados, nenhuma falha |
| `bun test docs/aulas-interativas-tecnico/qa/matriz-compatibilidade.test.ts` na raiz | 43 aprovados, 192 asserts |
| `bun test ./src/state/studioStores.profile-review.test.tsx` em packages/studio | 1 aprovado, 4 asserts; ação real setFile, conflito explícito e dados preservados |
| `bunx biome check src/state/studioStores.profile-review.test.tsx` | Aprovado para o teste adicionado; não é lint completo do monorepo |
| `bunx tsc --noEmit`, NODE_OPTIONS=--max-old-space-size=8192 | Saída 0; rodada final incremental após ajuste do teste adicional também terminou com saída 0 |
| Build de produção pelo `scripts/serve-e2e.ts` | Saída de build aprovada; servidor local 5298 |
| Chromium completo: hostile-programs, classic-offscreen, reload-flush e blockly-media | 11 aprovados, 1,7 min |
| Chromium completo: protected-lessons e pro-workspace-performance | 7 aprovados em 9 min; cinco aulas, 399 gestos, 13 partes e 66 objetivos aprovados (17 executáveis) |
| Firefox: preview-executes-user-code e preview-security; WebKit: reload-flush | 8 aprovados, 1,3 min; não cobrem todos os testes hostis |
| `bun test ./src/studio/pinta-image.test.ts ./src/studio/pinta-limits.test.ts ./src/studio/pinta-source-ref.test.ts` em packages/core | 10 aprovados, 147 asserts |
| Experimento mínimo de isolamento: Chromium/Firefox/WebKit, três arranjos, com/sem cabeçalhos | Saída 0; 18 medições, com bloqueio reproduzido no srcdoc de Firefox/WebKit; não interpretar exit 0 como aprovação de isolamento |
| `git diff --check` | Sem erros nas alterações rastreadas; conferir novamente no commit |

O teste adicional de perfil foi criado depois da seleção inicial do runner completo: por isso
seu resultado separado não está embutido nos 11.412. Nenhum teste de produção foi removido,
nenhum timeout da suíte foi ampliado e nenhum orçamento foi aumentado.

O teste adicional também foi executado junto aos dois casos de persistência existentes:
`bun test ./src/state/studioStores.persistence.test.tsx ./src/state/studioStores.profile-review.test.tsx`:
3 aprovados, 12 asserts. São reexecuções, não três casos novos para somar ao total da suíte.

As 13 capturas novas e os 13 resultados de objetivos estão em `courses/`, com hashes em
`courses-manifest.json`. Inspeção visual representativa nesta revisão: Cadê/contar-achados e
Farol/sem-chave. Não é comparação pixel a pixel de todos os hosts. Os registros completos estão
nos arquivos `*-output.txt` dentro de `outputs.zip` (bytes originais, sem limpar a saída dos testes);
o relatório principal diferencia regressão, requisito ausente e
limitação de prova.

## Reprodução no PowerShell

Na raiz da worktree:

```powershell
bun install --frozen-lockfile
npm ci --ignore-scripts --no-audit --no-fund --prefix packages/studio-runtime/runtime
bun test docs/aulas-interativas-tecnico/qa/matriz-compatibilidade.test.ts
```

Em `packages/studio`:

```powershell
node scripts/test-isolated.mjs
bun test ./src/state/studioStores.profile-review.test.tsx
$env:NODE_OPTIONS='--max-old-space-size=8192'
bunx tsc --noEmit
$env:E2E_PORT='5298'
bun scripts/serve-e2e.ts
```

Depois de o build e servidor ficarem prontos, em outro terminal no mesmo pacote:

```powershell
$env:E2E_PORT='5298'
$env:PW_REUSE_SERVER='1'
$env:PW_CHROMIUM=node -p "require('playwright-core').chromium.executablePath()"
$env:SZ_CHECK_CHROMIUM=$env:PW_CHROMIUM
bunx playwright test e2e/preview-hostile-programs.spec.ts e2e/classic-offscreen.spec.ts e2e/reload-flush.spec.ts e2e/blockly-media.spec.ts --project=chromium --trace off
bunx playwright test e2e/protected-lessons.spec.ts e2e/pro-workspace-performance.spec.ts --project=chromium --trace off
bunx playwright test --project=firefox --project=webkit --trace off
$env:SZ_MEASURE_BROWSERS='chromium,firefox,webkit'
node scripts/measure-preview-isolation.mjs --json
```

Os navegadores Playwright precisam estar instalados. `PW_CHROMIUM` usa o executável completo,
não headless shell; trocar a variante altera o resultado de isolamento e deve ser registrado.
Não definir `PROTECTED_LESSONS_UPDATE` durante revisão.

## Alcance e ocorrências de execução

Uma chamada inicial dos testes de componente foi feita a partir da raiz, sem o preload DOM do
pacote; falhou por `document is not defined`. O runner canônico por pacote passou em seguida.
O primeiro local do reprodutor em `.audits` também não resolvia dependências privadas do pacote;
o teste foi colocado em `src/state`, executado e aprovado. Essas ocorrências de harness não são
regressões do produto e não foram contadas como testes aprovados.

O benchmark Pro usa serviços controlados e quadros de apresentação como proxy. Dados em
`pro-workspace-windows.json`; não certificam build real, IA real, GPU pesada, INP nem máquina de
8 GB. Outras verificações também rodavam na máquina. Não comparar esses tempos diretamente com
Linux histórico nem usar a rodada para prometer FPS universais.

Não foram executados: produção, contas reais de alunos, publicação de materiais, testes físicos
de entrada/tablet/celular, sessão gráfica prolongada de todos os runtimes, homologação D/E completa,
auditoria de infraestrutura remota em execução ou build/lint completos de todos os pacotes do
monorepo. São lacunas explícitas de homologação, não aprovações implícitas.
