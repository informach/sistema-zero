# Pintura de pesos: perfil e experimento do lote 121

Baseline e hashes: `skin-paint-l120.md`. Perfil sem alteração de produção:
`bun --cpu-prof-md --cpu-prof-dir ../../.audits/molda-evolution --cpu-prof-name skin-paint-l121-baseline scripts/bench-scene-skin-paint.ts`.
O Bun usa o nome exato, sem acrescentar `.md`; artefato `skin-paint-l121-baseline`.

O perfil de 5,51 s/734 amostras localizou `indexSceneSkins` entre os maiores custos:
18,5% na consulta da linha por chave, 11,1% no teste de propriedade própria,
5,3% na enumeração das chaves e 5,0% na conferência de contagem da geometria.
O perfil inclui montagem/clonagem/conferência da fixture. Tempos percentuais são
amostrados e instrumentados, não os intervalos do benchmark nem precisão de 1 ms.

## Alavanca 1: percorrer entradas de pesos em lote

| Oportunidade | Impacto | Confiança | Esforço | Escore |
| --- | --- | --- | --- | --- |
| Enumeração conjunta de chave/linha no índice de skin | 4 | 4 | 2 | 8 |

Trocar a enumeração de chaves seguida de buscas individuais no mesmo registro
por `Object.entries`. Não retirar nenhuma validação, alterar orçamento ou adicionar
cache global. Risco: pares temporários podem aumentar alocação; medir antes/depois
e descartar a mudança se não houver benefício demonstrável.

Prova prevista para documentos de dados (records autorais, sem getters/proxies):

- Ordem: `Object.entries` e `Object.keys` têm a mesma ordem de chaves próprias
  enumeráveis. Ordem dos ossos e dos resultados Map/Set permanece igual.
- Erros: orçamento/contagem precedem a iteração; por ponto, existência, quantidade
  de influências e pertença ao vínculo permanecem na mesma ordem, com mesmas mensagens.
- Matemática: nenhuma mudança de operações numéricas, matriz, pesos ou soma.
- Empates/aleatoriedade: não se aplicam.
- Ownership: pares são temporários; linhas continuam emprestadas somente para leitura.
  Não capturar documentos, não persistir dados derivados e não modificar registros.
- Hashes: conferir os três goldens fixos no script, além dos testes de inválidos e
  IDs especiais. Não atualizar os goldens para fazer a verificação passar.
- Reversão: recolocar o laço anterior com `apply_patch`; os arquivos ainda não têm
  commit deste trabalho. Não usar reset/checkout na árvore compartilhada.

Experimento descartado. No extremo, a primeira versão levou preparar p50 de
71,597 para 51,774 ms e comando de 157,623 para 121,053 ms; porém passou a materializar
linhas antes da guarda de orçamento. Mantendo a guarda antes das entradas, preparar
ficou em 57,211/95,082 ms p50/p95, comando 143,385/164,555 ms, RSS amostrado 632.115.200
bytes (baseline 572.780.544). A variação de p95 e a alocação adicional não justificaram
manter essa alavanca. O laço original foi restaurado; hashes continuaram idênticos.

## Alavanca 2: confirmar o traço com o contexto que ele já validou

| Oportunidade | Impacto | Confiança | Esforço | Escore |
| --- | --- | --- | --- | --- |
| Evitar duas indexações completas ao confirmar um traço privado | 5 | 4 | 3 | 6,67 |

O traço já indexou a fonte e só pode modificar suas linhas privadas de pesos.
Adicionar confirmação preparada ao próprio traço, mantendo o comando geral com
validação completa. Reutilizar a leitura/cópia esparsa do comando geral. Não aceitar
um patch externo nem um índice fornecido pelo chamador nesta via preparada.

Prova prevista:

- Fonte deve conservar identidade COW de todo o conteúdo; só thumb/updatedAt podem
  variar. Mudança autoral exige novo traço. Contexto é local, sem cache global.
- IDs de pontos, quantidade de linhas, vínculo, juntas, transformações, geometria,
  materiais, imagens e animações não mudam. Cada linha alterada passa pelo mesmo
  leitor normalizado e tem pertença às juntas conferida. Custos estruturais do índice
  inicial continuam válidos. Orçamentos gerais e limites espaciais ainda são conferidos.
- Ordem das linhas, ossos, cópias e aritmética não muda. Nenhuma normalização nova,
  recaptura de IBM, mutação da fonte ou retenção de revisão histórica é introduzida.
- O comando geral `setSceneSkinWeights` mantém sua validação completa e serve como
  oráculo em testes diferenciais. Resultados exportados da prévia não podem alterar
  o patch privado confirmado. Miniaturas são preservadas.
- Medir o fluxo real anterior/novo, incluindo a produção do patch e a confirmação;
  não deslocar validação para fora do cronômetro e contar isso como redução de custo.
  Preparação do traço continua medida separadamente, sem expectativa de ganho nela.

Implementada a segunda alavanca. `patchSceneSkinWeights` é o leitor/cópia esparso
compartilhado; `finishSceneCommand` continua fazendo a indexação completa. O gesto
usa `stroke.commit`, que recusa conteúdo COW diferente, lê somente seu patch privado
e conserva as verificações de orçamento, pertença das influências e bounds.

## Medições sem perfil

Bun 1.3.11, Ryzen 5 5600G, mesmos três aquecimentos, dez execuções medidas e 32
movimentos por traço. Medição anterior feita imediatamente antes desta mudança.
Nenhuma suíte ou build do agente concorria com os benchmarks. Processos externos
já existentes não foram encerrados; GC não foi forçado.

| Caso | Preparar antes p50/p95 | Confirmar antes p50/p95 | Confirmar depois 1 p50/p95 | Confirmar depois 2 p50/p95 |
| --- | --- | --- | --- | --- |
| 1.024 pontos | 0,456/0,739 ms | 1,444/1,958 ms | 0,635/0,990 ms | 0,584/1,215 ms |
| 8.281 pontos | 5,443/9,355 ms | 10,639/12,596 ms | 1,602/6,277 ms | 1,773/3,796 ms |
| 131.072 pontos | 71,597/81,662 ms | 157,623/179,723 ms | 32,020/50,099 ms | 29,708/47,412 ms |

No extremo, preparar depois ficou em 74,037/95,195 ms e 60,998/90,809 ms nas duas
execuções. Primeiro contato na segunda: 23,076/29,728 ms; movimento:
0,027/0,059 ms, p99 0,139 ms. A redução de p95 da confirmação foi de 72,1% e 73,6%.
Com dez amostras, p95 coincide com o maior valor: são observações locais, não
uma estimativa estatística de todos os dispositivos. A primeira execução ainda
ultrapassou 50 ms na confirmação e ambas ultrapassaram na preparação.

RSS extremo antes: 572.780.544 bytes; depois: 559.759.360 e 565.698.560 bytes.
RSS é amostrado em processo compartilhado entre os casos; não prova redução de
memória retida ou ausência de vazamento. O novo perfil `skin-paint-l121-prepared`
tem 3,46 s/485 amostras, incluindo fixture/clonagem/conferência, não apenas interação.

Os três hashes fixos do lote 120 passaram em ambas as medições e no perfil. O
cronômetro de confirmação inclui `result()` e `commit()`; o gesto real só precisa
de `commit()`. Conferência posterior compara também todas as linhas confirmadas
com o patch. Não inclui histórico, React, raycast, autosave, transporte ou GPU.

## Revisão e verificação

- 64 variações diferenciais contra o comando geral, incluindo zeros, forças
  minúsculas, dois vínculos na mesma geometria, identidade de IBMs, fonte intacta,
  saídas próprias e miniatura concorrente. Leitor estrito aceita cada resultado.
- Mudança de conteúdo é recusada mesmo num traço vazio. Orçamento de imagem e
  overflow espacial produzem os mesmos erros do comando geral, sem corromper a prévia.
- Molda: **1.519 testes, zero falhas, 226 arquivos, 93,21 s**, tipos, Biome/685
  arquivos e Vite/1,01 s passaram. Kids: compilação/6,1 s, tipos/9,6 s,
  59 páginas/736 ms, exit 0. Diff check passou.
- Não há homologação de browser/GPU/hardware. A preparação extrema permanece
  pendente; este ganho não encerra a fase de desempenho. Nenhum código Studio mudou.
