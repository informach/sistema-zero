# Full review da autoria de aulas no admin

Revisão de 12/09/2026 da [implementação](2026-09-12-admin-autoria-aulas-implementacao.md).
Escopo: formulário da aula, organização de seções, catálogo, critérios, duplicação, vídeo,
capas, demonstrações, salvamento e compatibilidade com os manifestos. As alterações de cursos
e contratos feitas anteriormente pelo usuário foram preservadas.

## Problemas encontrados e corrigidos

| Prioridade | Caso reproduzido | Correção |
| --- | --- | --- |
| Alta | Depois de editar o projeto inicial, mudar o Estúdio para entrega pela galeria recuperava o projeto antigo guardado na abertura do formulário. | Capturar o editor antes da troca e manter seu snapshot atualizado. A troca de projeto usado por outras seções pede confirmação e explica os vínculos que precisarão ser revistos. |
| Alta | Trocar a identidade da aula mantinha o formulário de bloco da aula anterior aberto. | A sessão visual completa, incluindo uploads, agora é identificada por professor, curso e aula. |
| Alta | Escolher a versão do servidor após um conflito mantinha os campos locais abertos, permitindo salvar novamente a versão que o professor havia acabado de descartar. | Descartar os formulários, contexto de edição e tarefas de upload antes de restaurar o servidor. O arquivamento da cópia local existente continua. |
| Média | A revisão de publicação continuava mostrando a pendência de uma seção mesmo depois de configurar corretamente o avanço. | Associar os resultados ao documento que foi validado. Alterações invalidam a revisão antiga; os validadores locais continuam atualizando as pendências. Avisos de seção deixam de ser repetidos globalmente. |
| Média | Aulas novas de certificado recebiam critérios por seção, incompatíveis com o fluxo próprio do certificado, sem uma ação de correção no admin. | Oferecer a escolha explícita do fluxo do certificado, com confirmação para remover os critérios. Novas seções nessa aula respeitam esse fluxo. As restrições de publicação do certificado permanecem. |
| Média | O botão de nova verificação sumia enquanto o vídeo estava processando. Depois de esgotar o polling, não havia como atualizar seu estado sem sair do editor. | Manter a verificação manual durante processamento; ela continua indisponível durante a transferência. |
| Baixa | Buscar “estudio” não encontrava o bloco Estúdio: o catálogo pesquisava apenas a chave interna e a descrição. | Incluir o nome exibido na busca, com a mesma normalização de acentos. |

Os sete casos tiveram testes falhando antes da correção e passando depois. Os testes do formulário
principal usam o componente e a sessão reais, com armazenamento/HTTP isolados e um editor de
projeto controlado para conferir a captura do snapshot sem depender de Blockly.

## Manifestos

**Os manifestos continuam compatíveis.** Não houve alteração no formato, nos parsers, nos
endpoints de importação ou no mapeamento das referências. O acesso permanece em
**Dados da aula → Importar roteiro com seções**, com conferência antes de aplicar ao rascunho.

| Conjunto | Manifestos aceitos pelo validador atual |
| --- | ---: |
| Corre Dino anterior + V6 | 26 |
| Desafio Primeiro Jogo anterior + V6 | 12 |
| O Jogo do Meu Jeito anterior + V6 | 16 |
| Total | 54 de 54 |

Também passaram os **16 testes de importação/reimportação pela fronteira HTTP do Members**:
`learning-import.test.ts`, `desafio-import.test.ts` e `meu-jeito-import.test.ts`, totalizando
206 asserções. Eles conferem a revisão retornada pela prévia, preservação de projetos e galerias,
seções, mídia planejada, pré-requisitos de blocos existentes e reimportação sem duplicação.
Esses testes usam persistência em memória; nenhuma aula publicada foi alterada.

## Verificação final

- Admin: `bun test` — **261 passaram, 0 falhas**, 876 asserções e 65 arquivos, além dos cenários
  executados pelas fixtures isoladas.
- Admin: `bun run typecheck` — passou.
- Admin: `bun run check` — passou, 422 arquivos.
- Admin: `bun run build` — passou; compilação, tipos e geração das 53 páginas estáticas.
- `git diff --check` dos arquivos revisados — sem problemas de whitespace.
- Navegador com editor real e backend local de ensaio: corrigir um avanço removeu os alertas;
  o atalho da revisão abriu a seção correta; a busca “estudio” retornou o Estúdio.
  Evidência local: `.cache/admin-review-criteria.png`.

Foram revisados ainda os contratos de capa e seus guards de autorização, preservação de vídeo
legado, cancelamento de resultados tardios de blocos removidos, identidades/referências nas cópias,
limites de documentos e roteiro visual/JSON. Os testes existentes dessas áreas passaram novamente.

## Limites

Não foram executados uploads reais para Vimeo/R2, importações em banco de produção ou implantação.
Os serviços externos foram verificados por contratos e respostas controladas. A revisão não é uma
garantia de ausência absoluta de bugs; não ficou um defeito reproduzido desta implementação sem
correção dentro do escopo auditado.
