# Publicação opcional e conclusão dos cursos existentes

Auditoria de 25/10/2026 das fontes locais oficiais. Nenhuma leitura ou alteração de produção.

| Curso / encerramento | Requisito técnico encontrado | Mural |
| --- | --- | --- |
| Farol / `desafio-dia-3`, seção `fecho` | Vídeo final; a seção anterior exige envio atualizado do projeto | Opcional; três campos de texto corrigidos no manifesto |
| Cadê Todo Mundo / `cade-todo-mundo-aula-2`, seção `conclusao` | Vídeo final; a seção anterior exige envio atualizado do projeto | Opcional; três campos de texto corrigidos no manifesto |
| Nave / `nave-contra-asteroides-dia-5` | Testes, verificação e envio do projeto | O texto já oferece publicação opcional |
| Corre, Dino / `corre-dino-aula-13` | Testes, verificação e envio do projeto | O texto já oferece publicação opcional |
| Meu Jeito / `meu-jeito-aula-08` | Experiência local `published-copy` e critérios de aprendizagem | A experiência ensina cópia/publicação sem publicar no Hub; o convite real é opcional |

`MarkLessonCompleteService` chama `lessonCompletionRequirements`, confere as partes e registra
conclusão. Só depois devolve `showcase` para apresentar o convite de publicação. A publicação
pública não aparece em `LessonRequirementReason`, `SectionCompletion` nem `PlatformAction`.
Um projeto ainda precisa ser verificado/enviado; tornar o Mural opcional não elimina essas
evidências. Curso completo gera o marco que libera seus blocos.

Havia uma segunda trava na autoria: publicar novamente um curso Kids com posição histórica
exigia bloco de vitrine. `CourseAdminService` agora consulta a política e aplica essa proteção
somente sem `curriculum`. A nova política não depende dessa posição histórica. Teste distingue
o comportamento legado da republicação sem Mural na nova jornada.

Nos manifestos oficiais Farol/Cadê foram alterados apenas o diálogo de fechamento e os campos
`title`/`objective` da última seção. As regras `completion`, projetos, IDs, vídeos planejados e
roteiros/gravações foram preservados. Isso não declara que um vídeo foi regravado ou publicado.
O protótipo Cadê e seu conteúdo concorrente não foram usados como fonte desta correção.

O seed não conhece a revisão atual das aulas remotas e não reescreve conteúdo existente.
Seu relatório `editorialReviews` identifica os campos para revisão no Admin, com UUID e versão
do curso. A aplicação remota usa o rascunho atual e CAS da aula: confirmar que o trecho ainda
corresponde ao identificado, alterar só esses campos, conferir o diff e publicar pela autoria
normal. Se o texto divergir ou já estiver correto, revisar sem substituição automática.

Verificação: `tests/unit/creator-journey-sharing-audit.test.ts` inspeciona os cinco manifestos,
confere que o envio continua obrigatório, e testa a sinalização segura no relatório do seed.
`tests/integration/creator-journey-access.test.ts` cobre a republicação com a nova política.

## Execução de projetos de Maestria pela equipe

O escopo Python `mastery-review` recebe o UUID da entrega e a operação executar/analisar.
Members lê a evidência imutável, materializa os assets da cópia da galeria quando necessário,
calcula o digest integral e emite autorização por 30 segundos. Cada reinício revalida conta
própria ativa da equipe, entrega e release do runtime. A análise permite somente representar
o código preservado em blocos; não concede edição, LSP, exportação, REPL ou Zappy. O Admin
separa o preview executável da inspeção somente leitura de código/blocos, sem usar autoria.
