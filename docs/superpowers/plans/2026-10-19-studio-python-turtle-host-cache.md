# Experimento G — fontes Turtle pelo cache verificado do host

## Hipótese e limite

Na distribuição D, quatro fontes `.py` do Turtle e `turtle-protocol.mjs` começam por volta de +784 ms e terminam por volta de +1290 ms após editar. O sandbox opaco e o worker novo repetem GETs apesar de URLs imutáveis; probes mínimos confirmaram misses no Chrome sem shaping, inclusive com documento opaco estável. O host já armazena e verifica por SHA três arquivos grandes do Pyodide. G acrescenta **somente as quatro fontes públicas Turtle** a esse canal quando o snapshot tem a extensão oficial. `turtle-protocol.mjs`, VM/FS, iframe opaco, CSP e release pinada não mudam. A hipótese é reduzir a espera de rede nas execuções editadas, não reutilizar estado Python.

## Contrato implementado para prova

- Manifesto derivado da distribuição verificada aceita conjuntos fechados de 3 (sem Turtle) ou 7 (com Turtle) recursos, com nome, MIME, bytes, SHA, orçamento e identidade de release. Conjuntos parciais 4–6 são inválidos. O host valida bytes lidos da rede **e** do CacheStorage antes de transferir; cache corrompido é retirado e falha, sem refetch silencioso.
- Reader/broker por execução aceitam exatamente a contagem escolhida; o reader plain recusa pedido Turtle e o broker de manifesto3 também recusa mensagem forjada. O host deriva a opção Turtle do snapshot que já envia ao frame. O harness direto faz o mesmo; análise e raw worker sem Turtle ficam com3.
- O bootstrap privado configura `boot-reader.mjs` e passa sua função `resourceFetch` ao `startPythonWorker`. Importar `bootResourceReader.ts` diretamente no interpreter criava **outra instância** no `worker.mjs`, pois o builder compila módulos separados; revisão independente encontrou isso antes do build. A função é uma capacidade interna, não uma global nem um fallback HTTP.
- No worker, as fontes Turtle são lidas pelo canal, com cancelamento/limite, em paralelo ao boot Pyodide como antes. Não há fonte de projeto, URL livre nem credencial nesse canal.

## Evidências e critérios ainda abertos

RED inicial: manifesto solicitado com Turtle devolvia só3. GREEN local mais recente: 34 testes de boot/reader/store/fonte, 282 asserções, incluindo dois canais novos que compartilham cache do host. Biome dos arquivos afetados, `git diff --check` e Studio TSC 5.9.3 passaram. A distribuição G pinada foi compilada com hash `b3713e0f404ed8646b8bb4fb6d5b556737e22f7fa391e2f307fced5cf3114bc8`. Os testes reais Chrome+Edge de bootstrap, Turtle, plain, três gerações, Stop, erro de worker, entradas, módulos e canais passaram 48/48 em 1,5 min. A inspeção do bundle confirmou que o worker não inclui uma segunda configuração do boot-reader. Review independente encontrou e root corrigiu harness e instância duplicada. O rereview pós-bundle não encontrou novo achado concreto em canais, permissões, teardown ou compatibilidade plain/análise; foi somente leitura, sem substituir provas de desempenho, export ou player.

## Resultado e reversão

F1 G passou 13/13 fluxos sem retries, com 3 aquecimentos e 10 amostras sob 20 Mbps/80 ms. Todas as attachments tinham hash G. Nas dez amostras: frio p50 8481,4 ms (0/10 falhas), cache p50 1496,5 ms (0/10), editado p50 **1496,8 ms**, 3/10 acima de 1500 ms (máximo 1530,3 ms). D havia alcançado p50 editado 1480,7 ms, 2/10 acima. G reduziu os bytes da fase editada de 826199 para 664797 no cenário, mas não melhorou a experiência medida nem cumpriu o limite estrito. Recibo/log/report em `.cache/studio-python-l0/turtle-host-broker-g-f1-final-20261019T023514958Z*`.

**G rejeitado.** As nove fontes de produto alteradas voltaram byte a byte às cópias anteriores; `worker.ts`, harness e testes novos exclusivos de G voltaram ao HEAD. Build novo com Bun 1.3.11 produziu novamente o SHA D `565bde78c4456704782fd002366b15eeb43c7c599d43e0e37f1927c198126e35`, com os 40 arquivos físicos iguais por SHA ao D guardado. `git diff --check` passou. Nenhum componente de G será integrado. A meta editada, timeout de preparação, frio Ponte, matriz30, integração Auth+BFF+R2+SQL e computador de8GB continuam abertos.
