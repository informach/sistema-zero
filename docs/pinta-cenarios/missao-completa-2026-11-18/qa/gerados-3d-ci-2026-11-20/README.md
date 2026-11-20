# Artefatos 3D desatualizados no CI

O CI de staging `44717127188` parou no verificador do runtime portátil.
O gerador seguinte também identificou os carregadores do iframe desatualizados.
O usuário autorizou expressamente a regeneração destes três arquivos, em duas
respostas separadas; nenhuma fonte funcional 3D foi editada nesta correção.

- `packages/molda-cenarios/src/exportar/runtime-three.generated.ts`.
- `packages/studio/src/three/scene3dRuntime.generated.ts`.
- `packages/studio/src/three/scene3dProRuntime.generated.ts`.

Geração oficial com Bun 1.3.11 e verificadores `--check`: aprovados. Imports e
licenças permaneceram iguais. Os resultados coincidem com o diagnóstico gerado
previamente apenas no cache. Fontes publicadas integradas até `88c6dfb50`.

Testes oficiais por pacote: core **370**, motor **262**, oficina **129** e agente
**8**, todos sem falhas/omissões. Estúdio: **150 aprovados**, 585 verificações,
18,50 s. A primeira execução em paralelo com o compilador teve um timeout em
um caso de orçamento; a suíte inteira passou em repetição serial, sem alterar
teste ou timeout. Chromium real: **dois aprovados**, 5,9 s, prévia e site
exportado com carregamento/desenho/liberação em três ciclos cada.

Typecheck integral do Estúdio: saída 0. Biome: saída 0, 16.504 arquivos em
31 s, antes de acrescentar este relatório. Os arquivos de evidência foram
conferidos no fechamento. Isso não declara o CI completo ou a missão do Pinta
concluídos, nem representa validação geral em aparelhos físicos adicionais.
