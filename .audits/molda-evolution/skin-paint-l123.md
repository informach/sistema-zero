# Preparação da pintura de pesos: lote 123

Continuação do perfil do lote 121; controles integrados e verificados no lote 122.
Bun 1.3.11, Ryzen 5 5600G, script `scripts/bench-scene-skin-paint.ts`, três
aquecimentos/dez execuções/32 movimentos. Suítes e builds do agente parados durante
as medições. Processos externos antigos não foram modificados.

## Baseline sem instrumentação

| Pontos | Preparar p50/p95 | Primeiro contato p50/p95 | Movimento p50/p95 | Confirmar p50/p95 | RSS amostrado |
| --- | --- | --- | --- | --- | --- |
| 1.024 | 0,719/1,207 ms | 2,519/10,376 ms | 0,033/0,086 ms | 0,690/1,186 ms | 255.889.408 B |
| 8.281 | 5,176/9,490 ms | 23,476/31,616 ms | 0,027/0,064 ms | 2,056/3,050 ms | 326.508.544 B |
| 131.072 | 70,559/86,710 ms | 31,706/33,577 ms | 0,033/0,065 ms | 28,838/40,171 ms | 617.078.784 B |

Os três hashes fixos do lote 120 passaram. Caso extremo: 10.201 pontos na superfície,
restante solto e vinculado; 20.000 triângulos. P95 é o máximo das dez amostras.
Não mede GPU, React, histórico, transporte, raycast ou autosave. RSS não é memória
retida isolada, sem GC forçado; não comparar timings instrumentados com esta tabela.

Perfil novo: `skin-paint-l123-before`, gerado com `bun --cpu-prof-md --cpu-prof-dir
../../.audits/molda-evolution --cpu-prof-name skin-paint-l123-before
scripts/bench-scene-skin-paint.ts`. 3,87 s/503 amostras. Consulta da linha de peso:
9,2%/359,0 ms; pertença do vértice: 7,6%/297,4 ms. Perfil inclui construção da fixture,
clonagem e conferência; não interpretar esses totais como latência de interação.

## Experimento: valores enumerados sem tuplas

| Alavanca | Impacto | Confiança | Esforço | Escore |
| --- | --- | --- | --- | --- |
| Enumerar linhas com `Object.values`, acessar array em vez de consultar o record por chave | 4 | 4 | 2 | 8 |

- Ordem: chaves e valores próprios enumeráveis de records imutáveis de dados têm
  a mesma ordem, inclusive IDs numéricos/especiais. Iterar por índice correspondente.
- Erros: manter orçamento/contagem antes de materializar valores. Por ponto,
  existência, quantidade de influências e pertença continuam na mesma ordem,
  com mesmas mensagens. Não retirar validação nem acrescentar cache.
- Matemática e desempate: nenhuma operação numérica ou ordem de juntas muda.
- Ownership: um array temporário de referências, sem tupla por ponto, sem copiar
  influências e sem escrever ou guardar documento. Getters/proxies com efeitos
  não fazem parte do contrato de documento autoral imutável.
- Risco: enumeração extra/alocação pode anular o ganho. Medir, repetir e descartar
  se p95/memória não justificarem. Não alterar os hashes fixos para passar.
- Reversão: restaurar o laço por chaves com `apply_patch`; sem reset/checkout ou
  alteração de trabalho alheio. Uma alavanca de cada vez.

## Resultado da alavanca

Mantida para verificação integral. `Object.values` materializa somente referências
às linhas depois das guardas de quantidade; não cria uma tupla por ponto como o
experimento descartado do lote 121. Todas as verificações por ponto permanecem.

| Pontos | Preparar depois 1 p50/p95 | Preparar depois 2 p50/p95 | RSS depois 1 / depois 2 |
| --- | --- | --- | --- |
| 1.024 | 0,533/1,115 ms | 0,563/1,065 ms | 242.937.856 / 240.123.904 B |
| 8.281 | 3,803/5,603 ms | 3,991/5,091 ms | 315.387.904 / 310.824.960 B |
| 131.072 | 39,662/65,635 ms | 48,189/71,000 ms | 592.646.144 / 587.653.120 B |

Preparação extrema: p50 -43,8%/-31,7%, p95 -24,3%/-18,1%. Não é prova de redução
de memória retida: o array temporário existe e RSS depende do coletor/processo.
Primeiro contato extremo: 24,002/42,325 e 25,956/58,869 ms; confirmação:
20,220/55,223 e 17,852/38,335 ms. Há variabilidade e excedentes de 50 ms também
nesses intervalos não modificados. Movimento p95: 0,044/0,065 ms; maior amostra
da segunda execução: 3,572 ms. Nenhuma promessa de fluidez completa.

Hashes fixos passaram nas duas medições e no perfil posterior
`skin-paint-l123-values` (3,33 s/462 amostras). O hotspot de consulta da linha por
chave saiu do perfil; pertença do vértice permanece (284,1 ms/8,5%). Enumeração
de valores aparece com 88,3 ms/2,6%. Esses números incluem fixture/conferências.

Revisão focal: **25 testes, zero falhas, 5 arquivos, 1,33 s**, incluindo 64 casos
diferenciais da confirmação, reader/IBMs, orçamento por instância compartilhada,
worker GLB real, IDs numéricos/protótipo e precedência das mensagens de erro.
Tipo do documento inválido de teste foi explicitado, sem casts para contornar
inferência de array vazio. Verificação integral: **1.545 testes, zero falhas,
229 arquivos, 95,34 s**; tipos, Biome/691 arquivos e Vite/1,08 s passaram.
Kids: compilação/5,5 s, tipos/9,7 s, 59 páginas/701 ms, exit 0. Diff check passou.
Permanece aviso de chunk Three. Não houve alteração de código Studio, ativação
pública, homologação visual/GPU ou comprovação do orçamento completo de entrada.
