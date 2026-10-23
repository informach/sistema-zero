---
status: resolved
file: packages/studio/src/export/pythonWebTemplates.ts
line: 25
severity: high
author: claude-code
provider_ref:
---

# Issue 001: Servidor Windows recusa arquivos válidos além de MAX_PATH

## Review Comment

O serve.py gerado usa Path(__file__).resolve().parent como raiz comum e entrega arquivos por target.is_file/stat/open sem namespace extended-length no Windows. A composição da pasta extraída com runtime/<SHA64>/turtle/_sz_turtle_backend.py pode ultrapassar MAX_PATH mesmo com paths portáveis válidos. Nesse caso o backend existente retorna404, interrompendo a inicialização do Turtle. Um arquivo autoral no limite portátil de240 caracteres também fica inacessível e impede o loader de reconstruir o snapshot. Os bytes existem e a identidade/hash estão corretos; encurtar o diretório de QA esconderia a incompatibilidade do servidor anunciado para Windows.

Prova independente CPython3.12.10/HTTP em `packages/studio/.cache/review067-long-path.ts`: gera o servidor atual e reconstrói o original removendo somente o novo bloco de namespace Windows. Ambos servem exatamente a mesma pasta e os mesmos arquivos. Com root absoluto158 caracteres, turtle.py absoluto248 e backend absoluto260, original retorna[200,404,404] para turtle/backend/fonte portátil240; corrigido retorna[200,200,200] com bytes exatos. `bun run .cache/review067-long-path.ts`, no pacote Studio:exit0 e JSON verified:true afirmando a comparação causal. Recusa de traversal, listagem e serve.py continua404; CSP sandbox sem allow-same-origin e CORS do runtime permanecem presentes. Não depende de executar CPython/Pyodide do aluno nem qualifica o ZIP em navegador.

Adaptar a raiz física resolvida ao namespace Windows extended-length, inclusive UNC e caminhos já estendidos, preservando resolve/is_relative_to e todas as verificações HTTP. Não encurtar ou renomear caminhos autorais, trocar origem do iframe ou remover a contenção para contornar MAX_PATH. Cobrir servidor HTTP em diretório profundo e fonte no limite portátil.

## Triage

- Decision: `VALID`
- Notes: Implementador confirmou e aplicou a conversão de ROOT no template, preservando resolve/is_relative_to. Revalidação independente `bun run .cache/review067-long-path.ts`:exit0,verified:true,original[200,404,404],corrigido[200,200,200],bytes exatos; ROOT158/backend260/fonte portátil240. Ambos iniciados com script relativo como no README. `bun run .cache/review067-namespace-model.ts`:exit0,24 verificações do bloco exato gerado para drive/UNC/já-estendido/plataforma não Windows, com fronteira de path preservada; é modelo de namespace, não share UNC real. Permanentes pythonWebServer+pythonWeb:9 pass,0 fail,66 verificações,exit0 (servidor Python HTTP real em diretório profundo, fonte longa, CSP/CORS/MIME/HEAD/traversal/Host). Biome3 arquivos:exit0,sem alterações. YAML/meta1/1/0 conferidos. Tentativa adicional com cwd absoluto300 foi bloqueada por uv_spawn/Bun antes de iniciar CPython; não sustenta achado de produto nem alegação de qualificação dessa raiz. Nenhuma produção modificada pelo revisor; navegador/desempenho permanecem fora desta revalidação.
