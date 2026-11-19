# Verificação do lote de plataformas

**Claim:** plataformas transformadas e o jogo criado pelo Pinta foram implementados
e verificados localmente, preservando o documento e a programação. Esta afirmação
não é uma liberação completa da missão nem uma ativação em staging.

**Command:** comandos completos, diretórios, variáveis não secretas e códigos em
[comandos.json](comandos.json); tipos em [tipos.json](tipos.json).
**Executed:** 19/11/2026; horários de conclusão dos registros e início das execuções
Playwright constam nos JSONs. Os horários dos arquivos de log são conclusão, não início.
**Exit code:** 0 nos gates finais deste lote.
**Output summary:** 2.108 testes Pinta; 55 Core; 94 Estúdio; 85 publicação;
dez casos de navegador; 12 de integração; 17 Python/Wasm e duas reexecuções
das plataformas com uma nova asserção de NaN; motores nativos no README.
**Warnings:** catálogo/perfil de QA locais; Godot headless; um só aparelho;
desempenho variável registrado anteriormente; CI global e implantação não comprovados
por estes gates locais. A recompilação do vendor Python mantém o aviso conhecido
de CommonJS dentro de ESM, sem alterar o hash qualificado.
**Errors:** nenhum nos gates finais. Reproduções anteriores com falha estão
preservadas e identificadas como demonstração das regressões, não como aprovação.
**Verdict:** PASS para o lote local; publicação/rollout permanecem pendentes.

## Automated Coverage

**Support detected:** sim, nos pacotes Pinta/Estúdio. A descoberta da raiz isolada
não percorre os workspaces; os manifests, arquivos CI e configurações Playwright
dos pacotes determinam os comandos usados. Bun é o gerenciador do repositório.
**Harness:** Playwright existente, sem criar outro framework.

**Canonical commands:**

- `bunx --no-install playwright test --config playwright.pinta.config.ts` com o
  subconjunto explícito dos dois arquivos de cenários afetados, registrado no JSON.
- `bunx --no-install playwright test --config playwright.pinta-integration.config.ts`.
- `bunx --no-install playwright test --config playwright.python-pygame.config.ts`.

**Required flows:**

- Pousar/saltar no editor, salvar e reabrir: `existing-e2e`, ampliado.
- Phaser com gravidade normal, invertida, zero e matriz de formas: `existing-e2e`, ampliado.
- Jogar meu mapa, editar no Pinta, atualizar e reabrir sem perder programa: `existing-e2e`, novo caso.
- Importação/sincronia JavaScript/Python, portas, versões e falha transacional: `existing-e2e`, repetido integralmente.
- Pouso em PNG 4 no Python/Wasm real, 1×/2×: `existing-e2e`, ampliado.
- Rollout, rollback e ciclo autenticado de staging: pendentes da implantação do leitor e runtime; credenciais já fornecidas pelo usuário.

**Specs added or updated:** `pinta-physics-scenes.flow.ts`, `phaser-scenes.flow.ts`,
`pinta-studio.flow.ts` e `python-pinta-physics.spec.ts`. Também há fixtures nativas,
regressões de núcleo/editor/motores/geração do jogo e blocos Python.

## Browser Evidence

**Dev servers:** Pinta `http://127.0.0.1:5312`, pacote Phaser
`http://127.0.0.1:5293`, integração real `http://127.0.0.1:5403` e
Python/Wasm `http://127.0.0.1:5299`.

**Flows tested:** dez casos de cenário e 12 de integração; a suíte Python/Wasm
tem 17 casos distintos. As duas reexecuções de plataformas não são casos novos.

| Fluxo | Entrada → resultado | Verdict | Evidência |
| --- | --- | --- | --- |
| Editor lateral | Galeria → salvar/reabrir → testar/pular | PASS | `plataforma-editor-imagem-desktop.png`, variante touch |
| Phaser | `/platforms/` → pouso normal/invertido e passagem com gravidade zero | PASS | `plataforma-phaser-imagem-desktop.png`, variante touch |
| Jogo do mapa | `/pinta` → `/estudio` → editar altura → atualizar → reabrir | PASS | `plataforma-jogar-imagem-desktop.png`, `medidas.json` |
| Python real | `/provider` → runtime protegido → PNG 4 → 120 quadros de pouso | PASS | `python-1x.png`, `python-2x.png` e seus JSONs |

**Viewports tested:** desktop Chromium, perfil Pixel 7 com toque emulado; integração
desktop 1440 × 1000. O perfil de toque não é um aparelho físico.
**Authentication:** perfil sintético na integração local; os relatórios não contêm
credenciais reais. Os exemplos portáteis rodam sem conta. `agent-browser` não está
instalado; foi usado o harness Playwright do repositório e a inspeção das capturas.
**Blocked flows:** os ensaios autenticados e de implantação são uma categoria
separada no plano; não são substituídos por mocks ou por estas capturas locais.
