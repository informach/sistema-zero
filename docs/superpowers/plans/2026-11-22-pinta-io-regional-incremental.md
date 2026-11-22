# I/O regional incremental do Pinta

Base `436976c4f`. O físico local 3 já grava somente chunks diferentes. A transação atual expande todos os payloads de cada mapa aceito antes de aplicar o seletor de documentos. A captura de portas por nome também expande mapas fora do mundo capturado.

## Contratos

- A janela de desenho consulta cabeçalho, espelho, folhas e chunks pedidos numa transação de leitura do namespace. A mesma geometria do pintor seleciona camadas, offsets assinados e interseções. A resposta é um recorte vinculado à revisão e só serve ao pintor da janela.
- A captura completa usa o inventário de cabeçalhos para resolver portas e referências. Cada membro escolhido passa pela decodificação integral e pela autoridade já usada para salvar. Uma situação que pede recuperação ou migração usa a transação existente. Uma leitura incompleta conserva a falha explícita.
- O writer privado conserva o físico 3, a ordem dos chunks, o orçamento de backup de 32 MiB, a sombra causal e a semântica da exclusão. O catálogo regional permanece privado e os formatos públicos conservam suas versões. A quota remota de 1 GiB continua sendo uma regra independente do orçamento local.

## Execução e aceite

- [x] Medir a abertura fria do leitor em IndexedDB nativo e registrar quantos bytes e requisições foram usados, p50/p95 e alocação de buffers. Usar um mapa esparso de 10.000 × 10.000 e uma galeria com outro mapa ocupado. Repetir com CPU 4×.
- [x] Resolver uma janela por posições validadas do diretório e decodificar apenas os buffers escolhidos. Comparar os bytes RGBA com o pintor existente no mesmo viewport e na Vila real. Conferir mudança de câmera, revisão, cancelamento, namespace e chunk selecionado inválido.
- [x] Hidratar o fecho da captura depois da seleção por cabeçalhos. Conferir que Vila e Cabana chegam com seus vínculos íntegros e que um mapa fora do mundo fica no banco. Cobrir formato futuro, recursos faltantes e recusa de um mundo acima do orçamento antes do primeiro GET de chunk.
- [ ] Repetir uma edição regional de uma célula, remoção, abuso de quota, corrida de revisão e interrupção no último PUT. Confirmar requisições de gravação apenas para chunks alterados e verificar a fila causal com os arquivos preservados.
- [ ] Ligar a abertura da oficina e os gestos autorais ao carregamento parcial por revisão.

## Linha de base

Dez pares por projeto, com um worker Chromium e IndexedDB nativo. A página que semeou os dois mapas foi fechada e as chamadas foram feitas em outra página. Cada chamada cria sua própria instância de persistência, com o mesmo armazenamento e os caches normais do navegador e do sistema operacional. Os bytes são o total dos `Int16Array` entregues pelo banco. Os tempos são da chamada até o fim da transação.

Ambiente da medição: Windows 11 Pro, Ryzen 5 5600G, 6 núcleos / 12 threads, 31,8 GiB, Bun 1.3.11 e Chromium 159.0.8154.6 do Playwright 1.65.1. O perfil 4× usa a redução de CPU do DevTools na mesma máquina.

| Operação | Chunks | Bytes | GETs | p50/p95 desktop | p50/p95 CPU 4× |
| --- | ---: | ---: | ---: | ---: | ---: |
| Abrir um mapa | 2.048 | 4.194.304 | 2.052 | 189,65 / 205,30 ms | 619,75 / 691,20 ms |
| Capturar o mundo | 4.096 | 8.388.608 | 4.102 | 379,50 / 432,90 ms | 1.196,60 / 1.245,30 ms |

A captura fez uma leitura de inventário. No perfil CPU separado do Bun com o adaptador `fake-indexeddb`, os maiores custos próprios foram acesso a typed arrays (29,2%), iteração (14,3%), checagem de buffer (8,8%), cópia estruturada (6,1%) e leitura das regiões (6,0%). O perfil inclui a semeadura. A hipótese a verificar é que pedir apenas os buffers necessários reduz a pressão antes de qualquer mudança no cache de renderização.

## Marco privado de leitura e captura

A janela lê a revisão do documento, o espelho compacto, as folhas e o recorte na mesma transação. O retorno possui uma operação de pintura para o viewport apresentado. Uma mudança na câmera invalida essa operação. A captura completa já seleciona os recursos, mapas e conjuntos do mundo pelos cabeçalhos antes de pedir os chunks. A entrada de autoria e o salvamento continuam hidratando documentos integrais e usando a autoridade transacional. O host público mantém o fluxo atual.

Na comparação alternada final, a ordem das leituras integral e por janela foi invertida a cada amostra. A captura pediu só os chunks do mundo selecionado. Os tempos da leitura integral variaram entre rodadas. Sua contagem de buffers permaneceu em 2.048.

| Operação no candidato | Chunks | Bytes | GETs | p50/p95 desktop | p50/p95 CPU 4× |
| --- | ---: | ---: | ---: | ---: | ---: |
| Abrir um mapa completo | 2.048 | 4.194.304 | 2.052 | 225,40 / 251,00 ms | 717,85 / 804,80 ms |
| Ler a janela de pintura | 4 | 8.192 | 8 | 7,35 / 14,30 ms | 46,85 / 75,20 ms |
| Capturar o mundo | 2.048 | 4.194.304 | 2.054 | 214,20 / 241,10 ms | 583,70 / 847,10 ms |

Os relatórios guardam as dez amostras individuais por projeto, com os mesmos contadores da inspeção de IndexedDB. [Antes](../../pinta-cenarios/revisao-2026-11-18/qa/io-regional-incremental-2026-11-22/antes.json) e [depois](../../pinta-cenarios/revisao-2026-11-18/qa/io-regional-incremental-2026-11-22/depois.json).

Os quatro controles funcionais no Chromium passaram em desktop e CPU 4×. Os dois viewports da Vila usaram 64 KiB somados. O primeiro ensaio exigia um valor estritamente menor e já tinha passado nas comparações RGBA. O ensaio seguinte conferiu a soma exata e a edição de uma célula, que gravou um chunk e invalidou a revisão de leitura anterior. Os limites da aplicação são os mesmos.

Para repetir o perfil e os controles nativos, execute a partir de `packages/studio`.

```powershell
$env:PINTA_AUTHORITY_PORT = '5491'
$env:PINTA_PROFILE_REGIONAL_IO = '1'
bun --no-env-file x playwright test pinta-physical-regions.flow.ts --config=playwright.pinta-physical-regions.config.ts --grep='cold regional I/O profile|stored Vila|stored map view'
```
