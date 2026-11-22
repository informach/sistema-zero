# I/O regional incremental do Pinta

Base `436976c4f`. O físico local 3 já grava somente chunks diferentes. A transação atual expande todos os payloads de cada mapa aceito antes de aplicar o seletor de documentos. A captura de portas por nome também expande mapas fora do mundo capturado.

## Contratos

- A janela de desenho consulta cabeçalho, espelho, folhas e chunks pedidos numa transação de leitura do namespace. A mesma geometria do pintor seleciona camadas, offsets assinados e interseções. A resposta é um recorte vinculado à revisão e só serve ao pintor da janela.
- A captura completa usa o inventário de cabeçalhos para resolver portas e referências. Cada membro escolhido passa pela decodificação integral e pela autoridade já usada para salvar. Uma situação que pede recuperação ou migração usa a transação existente. Uma leitura incompleta conserva a falha explícita.
- O writer privado conserva o físico 3, a ordem dos chunks, o orçamento de backup de 32 MiB, a sombra causal e a semântica da exclusão. O catálogo regional permanece privado e os formatos públicos conservam suas versões. A quota remota de 1 GiB continua sendo uma regra independente do orçamento local.

## Execução e aceite

- [x] Medir a abertura fria do leitor em IndexedDB nativo e registrar quantos bytes e requisições foram usados, p50/p95 e alocação de buffers. Usar um mapa esparso de 10.000 × 10.000 e uma galeria com outro mapa ocupado. Repetir com CPU 4×.
- [ ] Resolver uma janela por posições validadas do diretório e decodificar apenas os buffers escolhidos. Comparar os bytes RGBA com o pintor existente no mesmo viewport e na Vila real. Provar recusa de chunk inválido, seleção vazia, mudança de janela e sessão.
- [ ] Hidratar apenas o fecho da captura completa depois da seleção por cabeçalhos. Comparar backup e origem com a captura integral. Cobrir portas por ID/nome, alvo ausente, formato futuro e caso com muitas criações fora do mundo.
- [ ] Repetir uma edição regional de uma célula, remoção, abuso de quota, corrida de revisão e interrupção no último PUT. Confirmar requisições de gravação apenas para chunks alterados e verificar a fila causal com os arquivos preservados.

## Linha de base

Dez pares por projeto em novas páginas Chromium, com um worker e IndexedDB nativo. A página que semeou os dois mapas foi fechada. O leitor recomeça sem caches do Pinta, com o mesmo armazenamento e o cache normal do sistema operacional. Os bytes são o total dos `Int16Array` entregues pelo banco. Os tempos são da chamada até o fim da transação.

| Operação | Chunks | Bytes | GETs | p50/p95 desktop | p50/p95 CPU 4× |
| --- | ---: | ---: | ---: | ---: | ---: |
| Abrir um mapa | 2.048 | 4.194.304 | 2.052 | 189,65 / 205,30 ms | 619,75 / 691,20 ms |
| Capturar o mundo | 4.096 | 8.388.608 | 4.102 | 379,50 / 432,90 ms | 1.196,60 / 1.245,30 ms |

A captura fez uma leitura de inventário. No perfil CPU separado do Bun com o adaptador `fake-indexeddb`, os maiores custos próprios foram acesso a typed arrays (29,2%), iteração (14,3%), checagem de buffer (8,8%), cópia estruturada (6,1%) e leitura das regiões (6,0%). O perfil inclui a semeadura. A hipótese a verificar é que pedir apenas os buffers necessários reduz a pressão antes de qualquer mudança no cache de renderização.
