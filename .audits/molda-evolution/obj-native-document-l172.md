# Documento OBJ completo, lote 172

## Montagem e responsabilidade

`convertObjDocument` integra os estágios nativos anteriores. Identidade explícita
do host passa pelo leitor nativo antes da fonte; somente id, nome e timestamps
entram no template comum. Não gerar ID/relógio nem herdar thumb/paleta/campos
arbitrários do host. Todas as opções aninhadas são validadas e copiadas antes
dos dados da origem, inclusive escolhas de imagens e objetos vazios usadas depois.

Ordem: seleção de materiais → aparência/mapas → plano de geometria → objetos →
decisões já conhecidas → geometria real → rasters selecionados → materiais/imagens
→ decisões de materialização → leitor completo → custos/relatório. Plano de
geometria é compartilhado entre organização e conversão, sem refazer a seleção
de faces após os pixels. Os readers/conversores independentes mantêm seus contratos.
Limites e erros de UV/buffers desenhados são conferidos pela geometria antes
de abrir rasters. O leitor final confere referências, índices, buffers próprios
e limites de mundo do domínio; não substituí-lo por uma validação estrutural.

Conjunto completo agora conserva seu entryPath canônico, não os bytes OBJ.
Erros de origem ganham o contexto desse arquivo; paths já contextualizados em
MTL/imagem, native.*, report.* e opções não são prefixados de novo. Exceções
alheias a ObjInputError não viram fallback. Não há IO, editor/session/history,
aprovação implícita, armazenamento, ativação pública ou recuperação automática.

## Relatório composto

Retorno sempre traz `review: required`, mesmo vazio. Seleção, base, mapas,
organização, geometria e materialização permanecem discriminados por estágio,
incluindo detalhes de conflito/omissão/default/interpretação e seus valores.
Base/mapas guardam biblioteca/declaração/targetId; caminhos de bibliotecas ficam
em lista indexada na fonte. Não substituir o relatório anterior pelo último.

Resumo informa declarações de material totais/usadas/não usadas, variantes
nativas, arquivos/bytes de companions referenciados, entryPath e bibliotecas.
Fonte original e metadados auxiliares são explicitamente não arquivados por
documento/relatório. O caller continua responsável por manter arquivos escolhidos,
créditos/licença, revisão e adoção transacional. Material não usado pode ter
parâmetro sem representação nativa; seu valor não é convertido para gerar resumo.

Limite próprio de 65.536 decisões, sem truncar silenciosamente. Decisões já
conhecidas são acrescentadas antes de coordenadas/pixels; materialização pode
acrescentar decisões depois e ainda recusar se exceder o teto. Esse limite é
independente do teto nativo de materiais/imagens: uma entrada que cabe no editor
pode exceder o orçamento de revisão. Caminhos de transporte têm teto preparado
de 8.320 caracteres, com fonte limitada pelos readers; reader do protocolo OBJ
ainda pertence ao próximo estágio, não foi implementado neste lote.

## Reuso e ownership

`importDocumentBase` compartilha o template sob identidade explícita com glTF,
sem incorporar política de parser de formato. `importDocumentCosts` compartilha
as mesmas contagens de malhas/instâncias/triângulos autorais/imagens/skins/clipes.
Tipos e resultados glTF são preservados; adapters traduzem só SceneValidationError
à família correspondente, acrescentando cause. Exceções inesperadas permanecem.
Custos de pixels são bytes finais de camadas, não pico de RAM ou bytes dos PNG.

Normalizadores de seleção/aparência agora podem ser chamados antes da fonte;
`objOptionGroup` conserva contexto/cause de opções aninhadas. Conversão de geometria
tem helper interno para o plano já preparado, mantendo a API independente que
faz seu próprio preflight. Pureza percorre o entrypoint completo sem React/DOM/Three.
Resultado nativo é validado e copiado pelo domínio; suas imagens, nós e relatório
não alteram entrada nem outra conversão. Sem cache entre chamadas.

## Revisão e evidências

Dez testes novos: fluxo texturizado completo com variante sem UV e objeto vazio,
GLB validado; custos do índice nativo; ownership/identidade; vazio/construção;
políticas aninhadas antes de fonte; tetos de nós/triângulos; erro MTL e UV antes
de rasters; retenção de decisões por estágio; teto exato de relatório; excesso
real de decisões com 10 mil materiais antes de coordenadas/pixels; adapters de
custos e causas. Khronos: zero erros e o aviso exato de tangentes geradas quando
o material usa normal. Não alegar homologação GPU a partir desse teste.

Regressão inicial da refatoração: 34 passes/505 asserts em quatro arquivos.
Primeiro focal novo: dez passes/105 asserts, 1,084 s. Focal posterior de documento
OBJ/glTF e pureza: 79 passes/376 asserts em três arquivos. Um padrão de teste de
worker fornecido nessa chamada não correspondia a arquivo; não é evidência de
worker testado. Focal ampliado final, incluindo o arquivo real gltfImport.test.ts:
448 passes, zero falhas, 45 arquivos, 40.055 asserts, 23,74 s. Tipos passaram após
as últimas adições de teste; Biome verificou 897 arquivos sem alterações. Integral:
2.091 passes, zero falhas, 287 arquivos, 8.236.279 asserts, 130,12 s. Vite 1,15 s;
worker glTF 181,55 kB (+0,14), painel 35,60 kB (+0,11), Three 579,29 kB (aviso
>500 kB conservado). Kids: compilação 6,8 s, tipos 9,3 s, 59 páginas/690 ms,
saída zero. Diff check passou com avisos CRLF preexistentes.

Regressão normal de materiais glTF: três hashes preservados, fontes intactas.
p50/p95 (ms): 16²×1 0,153/0,205; 256²×4 4,002/10,625; 1024²×8 81,146/101,725.
RSS amostrado 198.557.696/227.610.624/280.166.400 bytes. Não é medição pareada
nem prova de ganho/perda de desempenho dos novos helpers ou do pipeline OBJ.

Revisão de transporte a seguir: limite por decisão/path sozinho não limita o
volume agregado de texto. Muitos materiais com um caminho de biblioteca longo
podem repetir esse contexto. O protocolo OBJ deverá limitar o volume agregado
do relatório antes de publicá-lo; não confundir 65.536 decisões com limite de bytes.

Worker OBJ, reader estrito de transporte, cancelamento e revisão/adoção visual
seguem nos próximos lotes. Sem dependência nova, deploy, migração ou alegação de
ganho de CPU/RAM neste lote. As nove fases continuam com pendências no plano.
