---
status: resolved
file: packages/studio/scripts/python-activity-browser.mjs
line: 52
severity: medium
author: claude-code
provider_ref:
---

# Issue 001: Arquivo QA perde chaves do critério pela serialização browser

## Review Comment

O driver retorna diretamente o objeto runCase de page.evaluate e depois o arquiva com JSON.stringify no Node. O serializador instalado do Playwright1.60 ignora chaves próprias __proto__ ao reconstruir objetos. Assim a atividade arquivada difere da atividade realmente executada, precisamente no caso de regressão JSON especial que o harness pretende qualificar. Os asserts atuais só conferem flags passed e não detectam perda dos valores de args/expected/globalEquals.

Prova independente leve `bun ./.cache/review089-serializer.ts`, cwd Studio, exit0/verifiedtrue. Executa a função exata parseEvaluationResultValue da biblioteca instalada `node_modules/.bun/playwright-core@1.60.0/node_modules/playwright-core/lib/coreBundle.js` (aprox15359, guard k===__proto__→continue), sem lançar browser. Objeto wire com chave própria válida perde a chave; devolver a string JSON e fazer JSON.parse preserva. Os artefatos reais browser2 e9241af6-ba50-4a5c-9612-f1bd23070b28 confirmam em Chrome/Edge: activity.dict.value perdeu __proto__, echo.args/expected viraram objetos vazios, mas feedbackdict e codequeacessaPython__proto__ passaram. Isso distingue execução correta de arquivo de evidência alterado, não é regressão do contrato087 nem prototype pollution do produto.

Devolver JSON.stringify(awaitrunCase(...)) dentro de page.evaluate e JSON.parse nativo no driver antes de arquivar. Conferir explicitamente Object.hasOwn nos três valores e SHA/tamanho da fonte arquivada contra snapshot. Preservar asserts negativos, captura, timeout/stop e ordem. Não declarar browser2 artefato lossless; repetir o mesmo cenário após corrigir somente o transporte QA.

## Triage

- Decision: `VALID`
- Notes: Implementador confirmou e passou JSON.stringify dentro de page.evaluate/JSON.parse nativo no driver, com Object.hasOwn nos três valores e sourceSHA. Revalidação independente do browser3 real083fc977-c711-4fe3-a747-3bef39b32d88: probe artefatos exit0/verifiedtrue, oito casos Chrome/Edge com fonte arquivada SHA/tamanho/revisão exatos e atividade inteira igual ao fixture normalizado Core, incluindo chaves especiais. Unicode ação/Kelvin e multiline/backslash em WASM passaram, captura/wake/watchdog/stop preservados. Biome3 QA exit0; nenhum browser/heavy próprio nem fonte/teste permanente alterado pelo revisor. Browser2 continua histórico com perda conhecida; não reinterpretado como lossless. Sem autoridade servidor/consumidoresC/performance/Cloudflare remoto qualificados.
