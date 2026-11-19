# Três erros de estilo após o remoto Pro

O CI `44611610700`, fonte `8c650f667`, recusou dois JSONs de evidências e a
formatação do SDK Pro gerado. Os 304 avisos eram diagnósticos distintos dos
três erros; não houve tentativa de corrigir em massa os demais pacotes.

Os dois JSONs de QA foram formatados, com igualdade estrutural conferida contra
as cópias anteriores. O SDK gerado foi incluído na mesma exclusão de estilo
do SDK gerado já existente. O gerador exige seus bytes exatos e já tem gate
obrigatório no CI: `bun run --cwd packages/studio check:scene3d-runtime`.
Esse gate foi preservado; formatar o arquivo manualmente o tornaria inválido.

O arquivo gerado permaneceu byte a byte igual, e nenhum arquivo de implementação
3D foi modificado. [Integridade](integridade.json), [Biome global](biome.txt).
Esta alteração está limitada à autorização do usuário para QA/CI e artefatos.
A qualificação Linux da imagem com o perfil novo `f11aa057…` será registrada
separadamente; este relatório não afirma implantação ou teste dos motores.
