# Contrato portátil do Molda

`molda-articulated.json` contém o GLB real emitido pelo encoder nativo, suas
estatísticas e poses de referência calculadas pelo domínio do Molda, sem Three.
O Studio consome somente esses dados: não importa código do pacote Molda.

Para conferir a origem, em `packages/molda`:

```sh
bun scripts/print-scene-studio-contract.ts
bun test src/testing/sceneStudioContract.test.ts
```

O primeiro comando imprime, não sobrescreve arquivos. Atualizar a fixture exige
revisar a diferença e editar o JSON explicitamente. O teste compara todo o
artefato com uma nova geração e executa o validador Khronos.

A cena tem uma geometria compartilhada, grupo afim com shear, articulação,
espelho de mundo e dois clipes: Saltar (delta local) e Posar (local absoluto).
Ambos duram um segundo e têm poses finais distintas da posição original.
As matrizes registradas representam cada peça no espaço do modelo, antes do
posicionamento da entidade no jogo. Não há texturas ou esqueleto nesta fixture.

`moldaArticulated.test.ts` executa o runtime do Studio com GLTFLoader,
SkeletonUtils e AnimationMixer reais, substituindo apenas a fronteira GPU.
Compara matrizes já atualizadas pelo render, sem forçar uma atualização que
poderia ocultar uma transformação congelada. Cobre cópias independentes,
troca de espaços dos clipes, parada/restauração, pausa por Escape,
reciclagem, handles antigos e descarte único de recursos compartilhados.

Isso não homologa aparência, desempenho GPU, sandbox/CSP ou interação real no
navegador. A ponte pública de documentos nativos continua pendente.

## Contrato com pesos (lote 117)

`molda-skinned.json` vem de `bun scripts/print-scene-studio-contract.ts --skin`
no Molda. Conserva matrizes iniciais afins, pesos distintos por ponto, juntas
ocultas e dois espelhos em planos diferentes. Acenar usa deltas locais; Esticar
usa valores locais, incluindo escala zero de uma junta. O oráculo registra os
pontos deformados em Float64 no espaço do modelo e o referencial de cada peça.
Khronos retorna zero erros e três avisos esperados `NODE_SKINNED_MESH_NON_ROOT`,
já sujeitos ao aceite do relatório de exportação, não suprimidos nos testes.

`moldaSkinned.test.ts` compara posições observadas no runtime avançado com esse
oráculo. Cobre entidades independentes, pausa, troca/parada de clipes, reciclagem,
handles antigos, reinício e descarte. Texturas reais de ossos são alocadas na
fronteira GPU simulada para observar sua liberação, sem afirmar render WebGL real.

`modelOwnership.test.ts` controla apenas resolução do addon e alocação GPU para
testar falhas, cache, templates substituídos e conclusões tardias. O parser,
matemática, recursos e clonagem bem-sucedida continuam sendo os do Three real.
Skin nunca pode cair em clone comum; reserva sem modelo instalado não tem mixer.
