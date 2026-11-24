# Molda Cenários 3D — revisão de 21/11/2026

Revisão de ponta a ponta dos contratos v2, fila de salvamento, histórico, contextos de mundo,
importação, materiais, compilação, exportação, integração com o Estúdio, autorização, banco e CI.
Os achados estão em `qa/issues`; evidências e limites em `qa/verification-report.md`.

A revisão usa o worktree `sistema-zero-molda-full-review-20261121`, inicialmente baseado em
`9d8934d5a`. Alterações de outras frentes no diretório principal foram preservadas.

As regressões de navegador sem acervo privado passam a rodar no job `molda-cenarios-e2e`,
obrigatório antes de `deploy-staging`. A implantação final deve ser conferida na execução do
workflow CI correspondente ao commit integrado em staging, inclusive o job de implantação.

Após a instrução de não rodar testes pesados nesta máquina, builds, compiladores e ensaios
locais foram encerrados; as próximas provas completas são do GitHub Actions.
