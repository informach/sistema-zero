# Lote 211 — fontes de CSS da oficina

Estado: implementado, revisado e verificado em 09/09/2026.

## Evidência antes de editar estilos

Context7: documentação primária tailwindlabs/tailwindcss.com, detecting-classes-in-source-files
e anúncio v4.1: @source registra caminhos relativos ao stylesheet; @source not
exclui fontes; source(none) desliga detecção automática. Conferidos os .d.ts e a
implementação instalada do plugin Vite 4.3.0, compiler node e Scanner oxide 4.3.0.
O plugin usa Vite root (playground) para root=null, mais compiler.sources.

Todas as fontes com classes da oficina encontradas em src/components; receitas
em .ts também precisam entrar, não apenas JSX. Nenhum pacote novo é necessário:
script de desenvolvimento resolve os mesmos módulos usados pelo plugin instalado.

Baseline 67f178, sem validadores concorrentes, 3 aquecimentos/10 medições novas
do pipeline compiler→scanner→build→optimize por processo (caches de SO aquecidos):

| Métrica | Antes |
| --- | --- |
| Arquivos lidos | 1.078 |
| Bytes de fontes | 6.404.957 |
| Candidatos | 13.377 |
| CSS minificado / gzip Node | 53.993 / 10.585 bytes |
| Setup p50 / p95 (=p99 com 10 amostras) | 4,785 / 11,170 ms |
| Scan p50 / p95 | 86,554 / 100,403 ms |
| Build CSS p50 / p95 | 29,687 / 39,479 ms |
| Optimize p50 / p95 | 7,795 / 10,185 ms |
| Total p50 / p95 | 128,760 / 157,159 ms |
| Maior RSS amostrado após etapas | 373.518.336 bytes |

Scan é a maior etapa (~67% pela razão das medianas, não soma de percentis).
Matriz: impacto 5, confiança 5, esforço 2, score 12,5. Uma alavanca: fontes da UI
no stylesheet exportado, excluindo testes, no lugar da varredura de src inteiro.
Não modificar componentes nem nomes de testes/comentários para reduzir candidatos.

Oracle: 165 fontes de produção, 3.429 candidatos. CSS minificado desse conjunto
antes da mudança SHA-256
035c0a2c9824d7614d9914466072baeb3ea5f709e0ef1673140efb50bf37786b;
lista ordenada de fontes SHA-256
e369451cffe04bb2df36c1b783930c889c6cb4b4b9d1631804ef40f884b30183.
913 arquivos extras incluem codecs, workers, fixtures, testes e metadados.

## Prova exigida

Mesmo CSS para todos os candidatos de produção, usando compiler novo por build
(ele acumula candidatos internamente); SHA antes/depois, cobertura de fontes e
de exclusões nos dois consumidores. Tokens/ordem de regras/cascade mantidos;
tie-breaking, float e RNG não se aplicam. Somente utilitárias de fontes excluídas
podem sair do artefato completo. Sem alegação de FPS, GPU ou latência da criança.
Rollback local: reverter somente os diretivos @source destes três CSS por patch;
não fazer reset/checkout da árvore de trabalho do usuário.

## Resultado após a alavanca de fontes

Molda stylesheet registra ../components e exclui **/*.test.{ts,tsx}; host e
playground não registram mais src inteiro. Mantida a raiz automática do playground
que o plugin já usava (5 arquivos); não foi necessário desligar descoberta global
do host nem mudar fontes dos outros produtos. Tokens/regras de UI não alterados.

Verificação 4c7414: hash de CSS de produção e hash da lista de 165 arquivos
idênticos ao baseline. O compiler do CSS real Kids resolve as mesmas duas fontes.
Novo teste executa o verificador com o compiler/scanner instalados e falha se
reaparecer fonte fora do conjunto de produção ou faltar candidato/registro no host.
Não usa nomes de classes fabricados nem um scanner alternativo simplificado.

Depois, 6a563e (3 warmups/10 runs, sem concorrência):

| Métrica | Depois |
| --- | --- |
| Arquivos / bytes de fontes | 165 / 837.077 |
| Candidatos | 3.429 |
| CSS minificado / gzip Node | 53.188 / 10.433 bytes |
| Setup p50 / p95 (=p99) | 5,686 / 11,856 ms |
| Scan p50 / p95 | 20,164 / 24,163 ms |
| Build CSS p50 / p95 | 14,561 / 23,981 ms |
| Optimize p50 / p95 | 8,126 / 10,163 ms |
| Total p50 / p95 | 49,173 / 63,067 ms |
| Maior RSS amostrado após etapas | 358.785.024 bytes |

913 arquivos e 5.567.880 bytes de entrada deixam de ser varridos; CSS cai 805 bytes
(1,49%), gzip 152 bytes. Scan continua maior etapa, agora muito menor: mediana
-76,7%; pipeline mediano -61,8%. São medições do pipeline isolado com SO aquecido,
dez amostras, não do build Next/Vite inteiro, interação, render ou hardware infantil.
RSS é amostrado, não pico/RSS incremental e não prova de menor memória no navegador.
O artefato final do pipeline coincide com o golden de produção:
035c0a2c9824d7614d9914466072baeb3ea5f709e0ef1673140efb50bf37786b.

## Revisão e verificação final

Primeira integral 901b74/09d774: 2.642 passes, uma falha, 166,20 s. O teste
host-conformance ainda exigia a varredura ampla no Kids. Atualizado para exigir
fontes/exclusões no CSS da biblioteca e ausência da fonte ampla no host; preservados
dependência, transpilePackages e importação/ordem de diretivas. O teste de compiler
real continua cobrindo os dois consumidores; não foi substituído por busca textual.

- Focal final 97c1d2: 10 testes, zero falhas, 30 asserts, 1.455 ms.
- Tipos 20c2ec/486f28: exit 0. Biome 182d6e: 1.088 arquivos; Kids CSS 4ee125: um.
- Integral final 850ad7/b5a8ac: 2.643 passes, zero falhas, 8.346.351 asserts,
  348 arquivos, 165,40 s. Sete logs de criação de contexto WebGL nos testes da
  MoldaApp sem GPU; não suprimidos nem tratados como homologação visual.
- Vite 0432a5: exit 0, 1,16 s. CSS real do build 53,20 kB/gzip 10,01 kB;
  pipeline isolado e build usam estágios de minificação distintos, não confundir
  seus bytes. Índice 360,81 kB, bbmodel worker 214,41, painel 78,83 inalterados.
  Three 579,29 kB mantém aviso >500 kB.
- Kids d4b4a2/70896e: exit 0, compilação 6,9 s, tipos 10,1 s, 59 páginas/546 ms.
- Diff 436920: exit 0, apenas três avisos CRLF já existentes.

Revisão: sem tokens/cores/layout alterados, sem dependências novas, scanner real
inclui receitas TS e exclui testes; fonte relativa no pacote cobre ambos os hosts.
Documentação dos consumidores atualizada. Formato público 1 e oficina interna
inalterados. Homologação de temas/toque/GPU e pendência act do lote 203 permanecem.
