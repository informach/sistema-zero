# Lote 222 — candidatos espaciais, interseção final nativa

Estado: implementado, revisado e verificado. Alavanca única, após perfil do percurso 221.

## Baseline e oportunidade

221/3c45fc, três warmups/dez samples, processos isolados: percurso pequeno
7,637/10,088 ms e grande 79,390/96,773 ms (p50/p95), 38/90 consultas, 232/637
vértices alterados. Goldens fixos no benchmark, fonte/binds/commit conferidos.
Perfil c114cf: checkIntersection self 17,1%/inclusive 35,8%; _computeIntersections
inclusive 38,0%. É trabalho repetido por todos os triângulos, não falta de throttle.

| Alavanca | Impacto | Confiança | Esforço | Pontuação |
| --- | --- | --- | --- | --- |
| Índice derivado para candidatos; narrow phase nativa | 5 | 4 | 4 | 5 |

## Prova planejada antes da mudança

- BVH somente de geometria estática registrada pelo recurso de desenho. Índice
  indireto preserva posições/índices; geometria CPU privada, sem prototype patch,
  sem sobrescrever raycast de meshes de desenho ou modificar atributos autorais.
- Consulta ampla DoubleSide, sem recorte near/far em espaço local (escala/shear).
  Triângulos candidatos únicos, ordenados como os grupos contíguos gerados pelo
  recurso. Consulta final via Mesh.raycast/Raycaster nativos em um proxy privado
  com drawRange de um triângulo. Nada de reimplementar barycentric/UV/normal.
- Materiais, UVs/normais e matriz correntes continuam alimentando a consulta
  nativa; perto/longe são avaliados em mundo pelo código original. Hits remetem ao
  objeto de desenho original. Ordem de objetos e desempate nativo preservados.
- SkinnedMesh e objetos/geometrias não registrados continuam no caminho nativo.
  Cache pertence ao SceneRenderResource; remover junto da geometria e no dispose.
  UV-only e matrizes não precisam reconstruir o índice de posições estáticas.
- Floats dos resultados finais e RNG/ordem autoral não mudam. BVH reduz candidatos,
  não substitui a aritmética da interseção. Sem mudar traço, raio, mistura ou orçamento.
- Oracle nativo diferencial: hits/face/material/UV/normal/objeto/empates, espelhos,
  affine, oclusão, grupos, mudanças UV/pose/geometria e descarte; goldens 120/221.
- Medir primeira consulta fria além de reuso/move/RSS; não esconder a construção
  do índice no warmup. Reperfil separado; rollback somente desta alavanca via patch
  se não houver ganho com comportamento preservado.

## APIs conferidas

Context7 454a72 resolveu /gkjohnson/three-mesh-bvh; 4df9ac/e10b98 consultou API.
Pacote instalado 0.9.2 e Three 0.184.0 inspecionados diretamente (2a3c45/a9c10d).
Não adotar o exemplo de patch global. API local documenta resultado BVH não ordenado,
espaço local e indirect para preservar índices. Narrow phase nativa evita diferenças
de implementação entre getInterpolation da biblioteca e getInterpolatedAttribute
da versão atual do Three; near/far local via escala não é assumido equivalente em shear.

Fontes primárias: [three-mesh-bvh README](https://github.com/gkjohnson/three-mesh-bvh/blob/master/README.md)
e código instalado da própria biblioteca/Three. Nenhuma dependência ou versão nova.

## Implementação e review

SceneSurfaceQuery possui índice lazy por geometria registrada. Proxy CPU privado,
snapshot próprio das posições, índice indireto, grupos nativos preservados e atributos
UV/uv1/normal correntes. Materiais são emprestados só durante a consulta e liberados
em finally, para o cache geométrico não reter texturas de uma revisão anterior.
O recurso de desenho registra/prune geometrias após update e descarta o cache antes
dos buffers de desenho. Form-base reaproveita a base estática; SkinnedMesh usa Three.
A fachada percorre root.children (não a ordem do Map) para preservar empates após
substituições. Objetos externos, mesmo compartilhando geometria, continuam nativos.

ff484c: 3 testes/7.907 asserts de oracle exato, sem tolerâncias para campos dos hits.
648 combinações de posição/matriz/lado, mais near/far no hit e ±1e-10, indexado e
expandido, bordas, grupos, atributos vivos, instâncias, layers e descarte. Nenhum
raycast/prototype de desenho substituído; posição/índice/grupos intactos.

bbdb6e: quatro falhas na fixture integrada, oracle e candidato ambos sem hit.
Causa: raio montado pela orientação do triângulo em mundo ignorava o determinante
negativo da matriz; Three testa o lado em local. Corrigida somente a direção da
fixture, sem mudar material da produção nem aliviar a igualdade. 75377e: **62/0,
12.152 asserts, sete arquivos**, incluindo UV, geometria/undo, espelhos, poses de
mesh/skin, base editável, empates, oclusão e descarte. Tipos 173057 passaram.

## Medição equivalente, incluindo custo frio

0da6c8, baseline novo antes da implementação; 3a8cde, repetição após review. Bun
1.3.11/Ryzen 5 5600G, canvas happy-dom 1024×768, três warmups/dez samples, processos
isolados. p50/p95; p99 é máximo dos dez, não cauda estatística robusta.

| Modo / vértices | Move antes (ms) | Move depois (ms) | Primeiro pick frio antes → depois (ms) | RSS antes → depois (B) |
| --- | --- | --- | --- | --- |
| Ponta / 1.024 | 0,345 / 1,772 | 0,352 / 0,619 | 2,963 → 14,550 | 331.059.200 → 330.555.392 |
| Ponta / 8.281 | 0,895 / 1,974 | 0,339 / 0,574 | 1,646 → 9,634 | 429.797.376 → 445.415.424 |
| Percurso / 1.024 | 5,558 / 12,534 | 3,209 / 11,583 | 4,056 → 10,096 | 328.228.864 → 336.760.832 |
| Percurso / 8.281 | 79,744 / 102,002 | 6,339 / 9,863 | 0,641 → 9,584 | 417.234.944 → 444.862.464 |

Primeira consulta fria é uma observação por malha/processo, não distribuição; inclui
construção lazy e aquecimento da biblioteca. Primeiro sample frio completo antes →
depois: ponta pequena 18,298→22,771, grande 37,681→40,073 ms; percurso pequeno
20,851→19,493, grande 26,713→41,562 ms. Não esconder o aumento de construção/RSS.
Primeiro sample aquecido p50/p95: ponta pequena 2,787/6,695→3,681/8,697, grande
20,373/35,467→23,402/34,624; percurso pequeno 2,523/6,545→3,312/5,010, grande
19,603/41,212→27,513/55,328. Não alegar melhoria na preparação do gesto.

ba7825, primeira execução independente: move pequeno 3,153/6,936 e grande
5,758/14,795 ms; mesma direção de ganho no percurso, sem fazer média com o perfil.
Quatro goldens 221 inalterados em ambas execuções: 38/90 consultas, 232/637 vértices
alterados; ponta 1 consulta/46 alterados. 3a8cde também preservou três goldens antigos
do domínio, fonte/binds/commit intactos. Não mede GPU, eventos reais, overlay ou React;
malhas muito fragmentadas por material e skin em pose continuam exigindo medição.

Reperfil separado 54bb54, surface-picking-l222-after.md: 1,36 s/191 amostras. A
varredura nativa de todos os triângulos deixou de dominar; indexSceneDocument 7,9%,
parseModule 6,8%, structuredClone 4,5%, resolução 4,4%; BVH splitNode 1,6% e raycast
indireto 1,0% self. Inclui montagem/validação do harness e construção fria. Não usar
esses percentuais como perfil de uma sessão de browser nem como tempos de benchmark.

## Gates finais

54bb54/ace37a: tipos do script explícito e tipos do pacote passaram após o review.
- Biome a03575: 1.141 arquivos, sem correções.
- Integral a03575/ad8a16: **2.790/0, 8.501.339 asserts, 373 arquivos, 161,99 s**.
  Sete logs WebGL; nenhum act nesta execução. Isso não diagnostica nem encerra os
  avisos intermitentes históricos registrados em 203/214/216/219/221.
- Vite 4828e8: 1,28 s, 2.285 módulos; SceneViewport 114,77→117,32 kB/35,30 gzip.
  ScenePlayground 211,88, index 363,90, CSS 53,64 e workers inalterados. Three
  579,29 kB ainda avisa >500; limite não foi aumentado.
- Kids 4a2e05/ac4c45: 4,3 s compilação, 9,6 s tipos, 59 páginas/373 ms, exit 0.
- Diff check 0a7f0a passou, somente três avisos CRLF preexistentes.

Lote encerrado. Sem ativação pública, sem alegar aceite de GPU/toque/hardware,
sem afirmar latência constante para qualquer geometria. Browser continua indisponível.
