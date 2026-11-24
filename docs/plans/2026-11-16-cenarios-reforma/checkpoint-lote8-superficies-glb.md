# Lote 8.2 — Superfícies compartilhadas e primeiro GLB conferido

18/11/2026 · `staging` após `8392175a9` · **8.2 em andamento; lote 8 aberto.** Este recorte ainda não fornece uma exportação completa da cena nem uma interface de download.

## Implementado

- `montarSuperficiesDaCompilacao` usa os construtores existentes de terreno, água e caminhos, sem câmera, renderer ativo ou recorte de LOD. Reutiliza a preparação de 8.1, ignora recursos de elementos ocultos e liga a consulta das partes estruturais aos apoios do núcleo. Falta de recurso ou falha geométrica recusa o resultado. O descarte é idempotente e respeita a propriedade dos recursos. Há um limite conservador de memória antes da construção do terreno.
- `dividirParteEstatica` reaproveita a leitura de partes do motor e a divisão numérica do núcleo. Conserva drawRange, atributos normalizados, UVs, iluminação e winding refletido; não altera o original. Não assa skins/morphs implicitamente. A normalização dos atores animáveis ainda será concluída na integração do compilador.
- `inspecionarGlbDaCompilacao` reaproveita os leitores estruturais do Molda: buffers, accessors, índices, referências, hierarquia, animações e skins. Soma primitivas por instância, mede memória e pixels e limita profundidade. Confere dimensões das imagens antes dos decoders. O teto desses leitores permanece em 32 MiB por GLB; o pacote pode conter várias partes. Extensões materiais suportadas pelo Three são reconhecidas explicitamente; Draco/Meshopt/KTX2, instâncias por extensão, arquivos externos e extensões sem adaptador não são aceitos. Isso é inspeção limitada, não alegação de conformidade completa com todo o formato glTF.
- Novo subpath puro `@sistemazero/molda/gltf`, sem importar a interface do Molda. O importador nativo continua recusando extensões obrigatórias por padrão; o consumidor de runtime pode declarar o suporte que assumirá.
- `ArquivosDaCompilacao` registra bytes próprios, metadados, nomes portáteis e hashes, com limites, cancelamento e descarte. As gravações são sequenciais; uma execução descartada não revive por causa de um hash pendente.
- `gravarDadosDoTerreno` grava Float32 little endian para a física, PNG16 de intercâmbio e máscara de um byte por célula. Preserva origem, escala, cobertura, recortes e fundo. Acrescentou-se `fundo` ao contrato, necessário para consultas fora da grade. O PNG16 não é usado como substituto do campo físico; a quantização Float32 foi comparada com o original, com diferença abaixo de 1 mm no ensaio.
- `gravarGlbCompilado` serializa raízes previamente preparadas com GLTFExporter, verifica os bytes gerados e os registra no inventário. Recusa geometrias ainda não divididas, drawRanges pendentes e instâncias não materializadas. Pintura e efeitos de água precisam de acabamento portátil antes dessa chamada; essa etapa ainda está pendente.

## Falha encontrada e corrigida

O primeiro ensaio no navegador encontrou um PNG cujo `bufferView.byteLength` incluía os três bytes de alinhamento do BIN escritos pelo GLTFExporter instalado. A normalização corrige **a declaração da view**, preservando pixels, conteúdo BIN e offsets. Não afrouxa o leitor de imagens. Os testes recusam remover conteúdo não nulo ou mais de três bytes. A operação é idempotente e não altera o arquivo recebido.

## Verificação e revisão

- Motor completo: **164 testes / 4.019 verificações**, sem falhas. Núcleo: **336 / 10.529**, sem falhas. Tipagem de núcleo, motor e Molda passou; Biome passou nos arquivos alterados.
- Importação do Molda: **795 testes / 149.003 verificações**, sem falhas. Após a normalização, os testes específicos de padding e contratos de importação passaram: **14 / 203**.
- Amostra determinística de **69 GLBs reais** do acervo passou na inspeção de fontes. Isso não equivale a testar todo o acervo nem a aprovar visualmente esses modelos no cenário.
- Chrome headless local, via `verificar-compilacao-glb.mjs`: GLB gerado e reaberto pelo carregador, dimensões **2 × 1 × 3 m**, centro **[4, 2,5, −3]**, 12 triângulos e os quatro pixels RGBA conservados. Sem erro de página. A cena é um fixture próprio, sem arte privada.
- Validador independente Khronos: **zero erros e zero avisos** nesse GLB. [Resultado](evidencias/lote8-materializacao/resultado-glb.json), [validação](evidencias/lote8-materializacao/validacao-khronos.json), [arquivo](evidencias/lote8-materializacao/ensaio.glb).

**Continua exclusivamente em 8.2:** pintura portátil, montagem de objetos/atores e colisões, pacote completo, comparação visual/física e ciclos de compilação/cancelamento/descarte. Só depois seguem 8.3–8.6. Lotes 9–10, composição final da Faísca, full review e implantação/validação de staging continuam pendentes. Não há aprovação artística ou de desempenho em dispositivo físico neste checkpoint.
