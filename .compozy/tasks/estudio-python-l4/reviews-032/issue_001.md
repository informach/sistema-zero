---
status: resolved
file: packages/studio/src/components/assets/ProAssetPaths.tsx
line: 38
severity: medium
author: claude-code
provider_ref:
---

# Issue 001: Usar caminhos Python no painel compartilhado de materiais

## Review Comment

A extração para `ProWorkspace` tornou `ProNavigator` e seu painel `ProAssetPaths` visíveis em projetos Python Pro. Entretanto, o painel continua materializando todos os materiais com `buildProAssetBundle`, exclusivo do JavaScript. Os caminhos copiados e pesquisados deixam de corresponder aos arquivos que `buildPythonAssetBundle` entrega ao executor Python. A orientação da linha 84 também afirma que os arquivos ficam em `public/` e que há um manifesto `studio-assets/manifest.json`, estrutura que esse executor não produz.

Reprodução independente usando o mesmo GIF válido nos dois materializadores: um material com ID `gif-one` e sem `proPath` aparece como `studio-assets/b66acf0718bd8ec11fb107f89a1048a180230a36112f39232ccc9a822b57261b.gif` no painel, mas seu caminho Python é `assets/b66acf0718bd8ec11fb107f89a1048a180230a36112f39232ccc9a822b57261b.gif`. Com `proPath: 'nave.gif'`, o bundle Python aceita e preserva `nave.gif`, enquanto o painel lança `O caminho do material nave não é válido.`. Um material válido não pode ser utilizado pelo caminho recomendado na própria interface.

Selecionar o materializador e a orientação por linguagem na fronteira desse painel, usando os caminhos canônicos do bundle Python e preservando os caminhos/manifesto atuais do JavaScript. Correlacionar também a resposta assíncrona à linguagem/projeto vigente, não apenas à referência do array de materiais. Cobrir material sem caminho explícito e GIF/WAV na raiz, incluindo as ações copiar e buscar caminho. Não é necessário antecipar LSP, exemplos Python ou outras funcionalidades Pro ainda declaradas como futuras nesta fatia.

## Triage

- Decision: `VALID`
- Notes: A causa e o recorte foram confirmados pelo implementador. Correção revalidada independentemente; nenhuma implementação alterada pelo revisor.

## Verification

- Reprodução Bun, chamando os dois materializadores reais sobre `data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==`, confirmou as duas diferenças acima; exit 0.
- Regressão focada em operações, workspace, navegação, ferramentas e materiais: 34 testes passaram, 0 falharam, 106 verificações. Os testes existentes do painel cobrem apenas o caminho JavaScript.
- Biome dos dez arquivos principais desta extração: `Checked 10 files in 49ms. No fixes applied.`

## Revalidation

- `editorAssetEntries` seleciona o materializador Python sob demanda, preserva seu `path` como `url` de apresentação e recebe os caminhos de arquivos/pastas para verificar colisões. A orientação do painel e da promoção agora distingue Python de JavaScript.
- `ProAssetPaths` vincula a leitura a projeto, linguagem, array de materiais e layout. Conteúdo textual não entra nessa identidade, evitando nova decodificação a cada digitação; resposta de escopo anterior não é exibida.
- `bun test src/components/assets/ProAssetPaths.test.tsx src/core/proExamples.test.ts src/modes/pro/workspace/ProNavigator.test.tsx src/state/proWorkspaceOperations.test.ts src/modes/pro/workspace/ProCodeTools.test.tsx`: 25 passaram, 0 falharam, 127 verificações. Inclui os caminhos comparados ao bundle de execução Python, GIF na raiz, caminho automático, colisão e regressão JavaScript.
- Prova independente `.cache/studio-python-l0/review032-assets.test.tsx`: 1 passou, 0 falharam, 7 verificações. Mantém exatamente o mesmo ID de projeto e array de materiais ao alternar JS/Python/JS; bloqueia um digest Python, retorna ao JavaScript e libera a resposta antiga, que não substitui a tela vigente. Depois confirma os caminhos das ações de busca nas duas linguagens e a retirada da orientação `public/` em Python.
- A primeira execução do harness independente não carregou por resolução de JSX no diretório de cache; o harness foi corrigido para `React.createElement`, sem alteração de produto, e a execução acima passou.
- Não foram executados navegador, build ou TSC nesta revalidação. LSP/formatter e Pro Python completo continuam fora do parecer desta rodada.
