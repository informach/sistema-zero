# Lote 220 — equivalência no preflight de metadata

Estado: implementado e verificado, 09/09/2026. Uma alavanca; somente writer interno.

## Baseline, perfil e decisão

Baseline final 219 (786d13): cinco cenários/goldens 215, três warmups/dez samples
em processos isolados, sem validadores paralelos. Teto metadata p50/p95
105,175/122,265 ms, pintura 103,135/115,295, leitura 44,148/51,401.
RSS amostrado 4.017.623.040 B no harness Bun/fake-IDB, não navegador.
Perfil 3642ca: structuredClone 47,9%, Uint8Array 13,9%, digest 13,6% self.
O writer prepara a entrada e ainda hidrata a cena corrente, cujos pixels/documento
não são consumidos pelo commit. Essa hidratação repete cópia/hash/leitor nativo.

| Alavanca | Impacto | Confiança | Esforço | Pontuação |
| --- | --- | --- | --- | --- |
| Provar equivalência com a preparação privada em saves só de metadata | 4 | 4 | 3 | 5,33 |

## Prova e limites, registrados antes da implementação

- Inspeção estrutural compartilhada continua verificando formato fechado, índice,
  referências/custos físicos, recibos e representações dos pixels. Retorna um tipo
  explicitamente estrutural, não um documento ativo nem autorização de escrita.
- Somente o writer detém a preparação recém-criada, validada e hashada, nunca
  exposta a callbacks. Não aceitar preparação fornecida externamente como prova.
- Comparar corpo completo exceto name/createdAt/updatedAt/thumb. Igualdade exata
  inclui imagens/referências, geometria, paleta, animação, skin, IDs e ordenação.
- Cada blob corrente deve coincidir byte a byte com o blob privado de mesmo hash.
  Logo seu digest é o já calculado; não basta comparar identificadores declarados.
- Metadata corrente precisa concordar com o manifesto. Custo lógico é o custo
  nativo preparado, ajustado pela diferença de structuredBytes dos quatro campos;
  sem estimar bytes dos pixels nem contar somente referências únicas.
- Qualquer diferença no corpo/pixels mantém hidratação completa. Índice/custo
  incorretos nunca se tornam permissão para substituir a criação.
- CAS relê e compara as mesmas dependências no commit; quota/GC/receipts intactos.
  Leitor público ainda hidrata uma cópia própria e verifica todos os hashes.
- Ordenação e tie-break preservados; CAS é primeiro commit, não FIFO de chamadas.
  Floats idênticos, RNG inexistente, limites/formatos/erros de domínio mantidos.
- Cinco goldens 215, testes de metadata/adulteração/races e perfil depois da mudança.
  Reverter somente esta alavanca por patch se os resultados não sustentarem mantê-la.

Sem cache global, marca de confiança pública, hash fraco, workers ou mudança de IO
neste lote. Sem alegar latência/memória de navegador, homologação infantil ou rollout.

## Implementação e revisão focal

Inspeção estrutural síncrona compartilhada; o caminho completo mantém aquisição
própria antes do primeiro await. Writer compara corpo completo após separar quatro
campos escalares; a separação também mantém a ordem quando thumb entra/sai.
matchesPreparedBody é privado e só recebe a preparação criada dentro da mesma chamada.
Nenhum consumidor público, transação, quota ou coleta foi alterado.

- 7d95f4: 85/0, 486 asserts, cinco arquivos existentes.
- a0d4b3: 57/1. Fixture esperava que translação 1e12 fosse inválida, mas o contrato
  aceita coordenadas finitas; bounds recusa overflow, não distância arbitrária.
  Corrigida a fixture para MAX_VALUE + escala MAX_VALUE (composição da posição
  excede Number), sem restringir dados válidos nem mudar código produtivo.
- e2a84e: 99/0, 626 asserts, seis arquivos. Quatro famílias (indexed/RGBA/sem pixels/
  skin), metadata com/sem thumb, custos, ownership, adulteração do índice, pai/clipe
  ausente, overflow e hash honesto com índice de paleta inválido.
- 19754b/ba3eee: tipos detectaram duas keys IDB não estreitadas no teste novo;
  adicionar typeof string antes de startsWith, sem cast/any.

## Medição posterior

98e874: cinco processos isolados, todas as provas/goldens 215 e requests/payloads
219 inalterados. Valores p50/p95 em ms; p99 é o mesmo máximo com dez amostras.

| Cenário | Save metadata | Save pixel | Read | List |
| --- | --- | --- | --- | --- |
| Pequeno | 2,766 / 3,214 | 2,582 / 3,369 | 1,038 / 2,395 | 0,179 / 0,325 |
| 8 MiB repetidos | 13,461 / 18,671 | 16,557 / 18,601 | 3,878 / 5,238 | 0,297 / 0,373 |
| 8 MiB distintos | 21,936 / 31,493 | 33,339 / 37,966 | 15,453 / 18,949 | 0,299 / 0,594 |
| Galeria 4 × 8 MiB | 14,597 / 18,127 | 16,496 / 21,578 | 4,565 / 6,209 | 0,339 / 0,648 |
| Teto 32 MiB | 72,619 / 101,595 | 110,695 / 124,419 | 53,714 / 73,861 | 0,661 / 4,129 |

RSS/heap amostrados, bytes na mesma ordem: 220.409.856/5.234.105;
609.955.840/255.077.940; 1.068.208.128/618.394.331;
634.765.312/240.546.818; 3.602.468.864/2.694.685.238.
Throughput metadata/s a p50: 361,533 / 74,289 / 45,587 / 68,507 / 13,771.

Metadata no teto caiu 105,175→72,619 ms; 8 MiB distintos 31,666→21,936 ms.
Pintura/leitura do teto ficaram mais lentas nesta execução e o pequeno não melhora;
não atribuir ganho geral a uma alavanca restrita a metadata, nem descartar variação.
A latência do teto segue acima do inline 215, agora com integridade/CAS adicionais.

Perfil separado cf40b3, `blob-preflight-l220-ceiling.md`: 4,22 s/416 amostras,
structuredClone 33,8%, Uint8Array 18,8%, comparação exata 16,4%, digest 10,2% self.
O perfil inclui pintura/leitura e o harness; deepEquals 4,7%, GC 2,5%, hash de prova
2,1% não são código a otimizar no produto. Não misturar os tempos instrumentados
com a tabela. Permanecem cópias de IDB/captura, obrigatórias aos contratos atuais.

Tipos 56d3cc/d6d5d8 passaram. b67c30: 100/0, 200 asserts nas cinco mudanças raw
concorrentes (20 repetições por caso). Biome bd6f95: 1.133 arquivos, sem correções.
Verificações finais abaixo; não há evidência de hardware/browser ainda.

## Fechamento

- Integral f8c895/ba3fbc: **2.765/0, 8.493.205 asserts, 369 arquivos, 161,50 s**.
  Sete logs WebGL, nenhum act nesta execução. Isso não resolve os avisos históricos.
- Vite 5adff0: 1,29 s, ScenePlayground 211,88 kB (+1,01); index 363,90 kB,
  CSS 53,64 kB e workers inalterados. Three 579,29 kB, limite não elevado.
- Kids 994915/97ddf5: compilação 3,8 s, tipos 10,6 s, 59 páginas/635 ms, exit 0.
- Diff check 5c463a: exit 0, três avisos CRLF preexistentes.
- Revisão: inspeção estrutural não vira documento; prova privada inclui corpo e
  pixels exatos, metadata escalar validada e custo lógico canônico. Diferenças
  mantêm hidratação completa; CAS e GC permanecem iguais ao lote 219.
- Nova tentativa de Browser oficial: getForUrl retornou “No browser is available”;
  troubleshooting consultado e list retornou []. Sem fallback CDP/Playwright ou
  alegação de revisão visual. A limitação não impede os próximos lotes de código.

Ganhos restritos a metadata no simulador, sem declarar a fase 2 aceita. Pintura,
hardware, integração pública/Studio e homologação infantil continuam pendentes.
