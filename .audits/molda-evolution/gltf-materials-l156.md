# Materiais glTF nativos, lote 156

## Contrato e review

Conversão da aparência core selecionada; relatório não autoriza gravação e não
substitui revisão das extensões ou dos atributos geométricos. Materiais possuem
mapa esparso de índices da fonte para IDs. Default glTF tem metalness/roughness 1;
usar material existente como fallback do nó quando não há primitive sem material.

Base linear é convertida para sRGB autoral contínuo, conservando branco exato.
Textura de cor recebe fator em espaço linear, com quantização RGBA8 relatada, alfa
linear separado e sem premultiplicação. OPAQUE ignora alfa. Base nativa transparente
evita colocar fundo indevido sob pintura. Normais e superfície mantêm RGB linear,
com alfa 255 porque o glTF não o usa; rugosidade G e metal B compartilham imagem.
Dados 16-bit são quantizados com relatório. Cor base 16-bit viola exigência de
8 bits do formato e é recusada nessa função sem alterar o decoder genérico.

Variantes usam raster + interpretação/fatores, não apenas índice de textura.
Planejar todas antes de buffers. Limites: materiais 20.896, imagens/camadas 20.000,
pixels derivados 32 MiB. Decoder possui seu orçamento separado: não alegar pico
total de memória de 32 MiB. Cache é local e saída própria; aliases de imagens para
o mesmo intervalo recebem uma imagem nativa com identidade colapsada relatada.

Filtros/repetição, occlusion e emissive sem equivalente têm avisos por material.
MASK, UVs distintos entre mapas retidos, imagem core ausente e normalStrength
fora de 0–4 são unsupported antes de ler pixels, não clamp/omissão silenciosos.
Transformação de UV/extensões, câmera, cores de vértice, normais/tangentes e
montagem de clipes não são garantidos por essa etapa.

Fontes: [materiais e textura no glTF](https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html#materials),
contratos locais de composite/material/renderer/exportador. MASK não equivale a
um bitmap binário em BLEND: escrita de profundidade é diferente. O teste do GLB
real registra aviso Khronos de tangentes geradas e compara somente G/B nos mapas
de superfície, pois R não representa aparência nesse papel. RGB completo é
comparado para cor/normal. Testes originais não foram enfraquecidos.

## Otimização: curva por amostra → tabela por canal de 8 bits

Baseline sem profiler: Bun 1.3.11, Windows, Ryzen 5 5600G. Três aquecimentos e dez
amostras, conversão CPU; setup/decodificação/hash/GC explícito fora do intervalo.
RSS amostrado após cada conversão inclui runtime e fixtures, não pico de heap/GPU.

| Caso | p50 ms | p95/p99 ms | MP/s p50 | RSS amostrado máximo bytes |
| --- | ---: | ---: | ---: | ---: |
| 16² × 1 | 0,149 | 0,255 | 1,718 | 187.453.440 |
| 256² × 4 | 37,561 | 43,763 | 6,979 | 210.567.168 |
| 1024² × 8 | 1.246,881 | 1.280,326 | 6,728 | 254.316.544 |

Perfil separado salvo em `gltf-materials-l156-before.cpuprofile.md` e arquivo
cpuprofile correspondente. Materialização domina 96,9% do tempo; quatro entradas
do seu loop são o topo do perfil. Candidata única: memoizar a conversão RGB dos
256 valores possíveis para cada fator não unitário. Impacto 5 × confiança 5 /
esforço 1 = 25. Não mexer em decoder, compartilhamento, alfa ou formato.

Prova antes da alteração: entradas são RGBA8 validadas, portanto cada canal é
inteiro 0–255. Cada célula aplica exatamente a expressão Double e Math.round do
loop original, uma vez; o lookup retorna o mesmo byte. Ordem, desempate e nomes
inalterados; RNG inexistente. Dados 16-bit continuam no caminho original. Tabela
só em imagens com ao menos 256 pixels; menores não fazem trabalho extra de curva.
Até 768 bytes temporários por imagem atual, sem cache global ou persistido.

Goldens SHA-256 de metadados/mapas/relatórios e pixels capturados antes:

- 16² × 1: `d4d8506e808ec52412a2502ba5d5989224847028f825c0bdca4c0bb6fe0e2280`.
- 256² × 4: `a6674a6beaeb71f238d5a8f897ec3d1bc43dee9ac294e6ba120f9e9f3ca615d1`.
- 1024² × 8: `0479216591abf705773d9a2a9da19450a2bdd5615ea87b139c8d28419f7e59c8`.

Reprodução: `bun scripts/bench-gltf-materials.ts` em packages/molda, sem suites
ou builds simultâneos. Rollback, se necessário: remover apenas o lookup de
gltfMaterialImages e voltar à expressão por amostra, por patch; não resetar
worktree WIP. Testar goldens e suíte. Sem commit automático.

Depois, sem profiler, mesmos três hashes e fonte intacta:

| Caso | p50 ms | p95/p99 ms | MP/s p50 | RSS amostrado máximo bytes |
| --- | ---: | ---: | ---: | ---: |
| 16² × 1 | 0,211 | 0,305 | 1,213 | 197.353.472 |
| 256² × 4 | 2,846 | 9,572 | 92,110 | 224.600.064 |
| 1024² × 8 | 85,293 | 96,410 | 98,350 | 279.846.912 |

Caso maior: 14,62× na mediana e 13,28× no p95. Caso menor custa 0,062 ms a mais
na mediana; tradeoff documentado, não afirmar melhoria uniforme. RSS não caiu;
amostras entre processos não isolam memória da tabela. Perfil posterior separado
em `gltf-materials-l156-after.cpuprofile.md`: loop materializador ainda domina,
agora 55,6% self, e hash/GC ocupam parcela maior. Não aplicar outra técnica nesta
mudança. Ainda requer worker/cancelamento na futura importação; 85 ms de CPU não
é prova de atendimento a 50 ms de latência de entrada no navegador.

## Evidência final

Antes da otimização: 12 testes de materiais, zero falhas, 5.286 asserts, 1,136 s;
25 testes materiais/geometria passaram antes das duas últimas regressões adicionais.
Goldens depois da otimização conferidos nos três cenários; fontes intactas.
Tipos passaram. Biome: 813 arquivos. Importação/pureza: 280 passes, zero falhas,
27 arquivos, 31.514 asserts, 7,26 s. Integral: 1.913 passes, zero falhas,
267 arquivos, 8.227.595 asserts, 102,70 s. Vite: 1,06 s; Kids: compilação 5,6 s,
tipos 7,7 s, 59 páginas em 512 ms. Diff check passou. Lote concluído; sem nova
dependência nem mudança do formato público. Chunk Three >500 kB ainda avisado.
Homologação GPU/toque/crianças não foi executada nem substituída por esses testes.
