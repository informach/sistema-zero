---
status: resolved
file: packages/member-shell/src/lib/studio-lesson-seed.ts
line: 67
severity: high
author: claude-code
provider_ref:
---

# Issue 003: Conferir caminhos ao completar materiais de projetos Python

## Review Comment

`completeLibraryAssets` agora aceita documentos Python, mas decide a união somente por nome e ID. Python possui caminhos materiais autorais (`proPath`), que também precisam ser únicos e não colidir com arquivos ou pastas. Dois documentos individualmente válidos podem gerar um resultado inválido: uma imagem do aluno e uma imagem nova do curso com nomes/IDs diferentes, ambas em `hero.png`, são acrescentadas juntas e devolvidas como `EditableStudioProject`.

Reprodução executada: `bun .cache/studio-python-l0/review039-continuity.ts` (exit 0), tanto Classic quanto Pro. O rascunho e a semente passam separadamente pelo reader real `refinePythonProjectDocument`. `resolveStudioLessonSeed` retorna dois materiais com o mesmo caminho; reler esse resultado falha com `Há caminhos conflitantes entre os materiais e os arquivos Python.` Isso bloqueia a abertura/execução da composição mesmo sem uma edição inválida do aluno. A mesma classe de problema inclui colisões com fontes/pastas e aliases case-insensitive.

Completar imagens respeitando a política canônica de caminhos e os limites do documento Python, sem renomear silenciosamente materiais referenciados pelo código nem substituir os materiais do aluno. Conferir a composição antes de devolvê-la como projeto válido e usar uma política explícita para um material novo conflitante, preservando o projeto salvo. Manter o comportamento JavaScript existente. Acrescentar provas para material/material, material/arquivo e diferença apenas de caixa.

## Triage

- Decision: `VALID`
- Notes: Corrigido e revalidado independentemente; a composição Python usa o materializador canônico e falha explicitamente antes de devolver um documento inválido.

## Resolution

`completeLibraryAssets` carrega `@sistemazero/studio/python-assets` somente no caminho Python com materiais faltantes. `buildPythonAssetBundle` confere os materiais combinados contra arquivos e diretórios do projeto. A recusa vira `StudioLessonMaterialError`, sem renomear materiais nem alterar os inputs; o caminho JS sem faltantes continua devolvendo o mesmo objeto.

Prova independente: `bun .cache/studio-python-l0/review039-material-revalidate.ts` (exit 0), com PNG real e readers reais. Seis casos Classic/Pro × mesmo caminho, casefold e material/arquivo recusaram explicitamente; ambos os documentos permaneceram iguais ao snapshot anterior. A prova JS conservou a identidade do objeto. Regressões permanentes `bun test tests/studio-lesson-seed.test.ts tests/lesson-draft-persistence.test.ts tests/lesson-draft-outdated.test.ts` em member-shell: 42 pass, 0 fail, 117 assertions. Nenhum browser foi executado nesta revalidação.
