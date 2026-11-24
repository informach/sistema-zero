# Parte 3.7 — Retratos duráveis e revisão de eficiência

17/11/2026 · `staging`, continuação de `2ccae3067`. Parte interna do lote 3; Testar (3.8) e os lotes seguintes continuam pendentes.

## Resultado implementado

O histórico mostra retratos associados à revisão fotografada, permite ampliá-los e conserva a restauração e seu desfazer existentes. A captura aguarda recursos reais e uma cabeça guardada, sem gesto ativo, estabilizada por 1,6 segundo. Edições sucessivas descartam os pedidos intermediários. Saída e abertura do histórico podem solicitar a fotografia pela mesma fila. Revisões sem imagem apresentam uma reserva explícita; não são preenchidas com fotos de outras versões.

Cada revisão aceita sua primeira imagem válida. Um pedido repetido recebe essa imagem e não confirma outro arquivo. A reserva informa quando já existe retrato, evitando outro envio binário. Uma fotografia antiga enviada depois de uma edição registra apenas a revisão antiga: não troca a capa nem a data da cabeça nova.

`cenario_retratos` guarda digest, revisão, espaço, autor e data, sem outra cópia JSON por gesto. A migration **0161**, gerada por Drizzle, cria a tabela e suas restrições. Confirmação do blob e associação acontecem na mesma transação e trava de espaço. Retratos protegem arquivos contra coleta e são liberados ao apagar cenário, mundo ou fonte de conjunto, desde que nenhuma outra referência os use. Duplicar cenário não inventa histórico fotográfico da nova identidade.

Os hosts HTTP e local compartilham o contrato. No host local, fotos de cenário e miniaturas de conjunto compartilham recursos por conteúdo **dentro do mesmo espaço**, com donos, cota e revogação da URL ao liberar a última referência. Não existe compartilhamento entre contas. O BFF preserva a confirmação pública de revisão/digest e mantém as chaves privadas de limpeza fora da resposta.

## Correções encontradas durante a revisão

- O BFF removia os dados da confirmação ao converter a resposta em `{ok:true}`. O teste que exigiu revisão/digest reproduziu a falha; a resposta agora é validada e preservada, mantendo a limpeza posterior.
- Apagar um mundo no host local não passava pela liberação de retratos. O teste de cota ficou vermelho; a exclusão em lote agora solta os mesmos donos que a exclusão individual.
- Miniaturas estreitas estavam sujeitas ao `object-cover` do componente compartilhado. O componente passou a aceitar ajuste explícito; o histórico usa `contain`, conferido pelo estilo calculado no navegador.
- Uma captura cancelada não pode bloquear um novo pedido da mesma revisão. O deduplicador desconsidera pedidos já abortados.
- O contrato recursivo de armazenamento de publicações de cursos excedia a expansão de tipos com os documentos autorais atuais. A conversão de tipos agora limita-se aos timestamps das linhas, coerente com o codec existente. Testes preservam as strings autorais e hidratam datas ativas e arquivadas. Não houve mudança do formato armazenado.

A primeira metade de 3.7, já commitada, está em [eficiência dos objetos](revisao-lote3-eficiencia-objetos.md): faixas de upload, índice de volumes, picking e alcance de câmera. Não foi reimplementada neste recorte.

## Verificação local

| Verificação | Resultado |
|---|---|
| Núcleo | 155 testes / 3.954 asserções |
| Motor | 53 testes / 2.534 asserções |
| Oficina e hosts | 66 testes / 442 asserções |
| Members: serviço, histórico, HTTP e publicação de cursos | 66 testes / 302 asserções |
| BFF e endereço | 29 testes / 159 asserções |
| Postgres descartável, porta 55439 | 35 testes / 314 asserções |
| Tipagem completa Members, member-shell, motor e oficina | Aprovada |
| Build do playground | Aprovado; aviso de chunk do motor permanece |

O Postgres aplica as migrations até 0161 e testa imagem atrasada, imutabilidade, revisão inválida, referências compartilhadas/coleta e falha até o COMMIT com rollback de blob, associação e capa. O HTTP confere autorização, confirmação exclusiva do BFF, histórico com imagens, reenvio sem upload e duplicação sem histórico alheio. BFF e host recusam confirmações de outra revisão.

`verificar-retratos.mjs` passou em claro/escuro de 1.440 px, claro de 1.024 px e escuro de 390 px com toque emulado. Usa poço GLB real: fotografia estabilizada, três edições próximas sem fotografar os passos intermediários, imagens distintas, inspeção, restauração, desfazer e reentrada. Sem erros de página/console. Capturas foram inspecionadas, incluindo o layout estreito.

Regressões: alças nativas com aceitação/recusa/cancelamento/cabeça nova; oito fotos e descarte; biblioteca de conjuntos e publicação com resposta perdida; raízes, duplicação, separação, clipboard e pincel. Iluminação diurna/noturna conferida na regressão de conjuntos. Os ensaios usam navegador desktop e toque emulado; não aprovam aparelhos físicos.

## Evidências e limites

[Resultados](evidencias/lote3-retratos/resultados.json) · [Histórico desktop](evidencias/lote3-retratos/historico-light-1440.png) · [Histórico estreito](evidencias/lote3-retratos/historico-dark-390.png) · [Vídeo de edição/restauração](evidencias/lote3-retratos/historico-restauracao.webm).

O aviso de chunk do motor permanece em aproximadamente 777 kB (207 kB gzip). As medidas de upload do checkpoint anterior não representam FPS em aparelhos físicos. A captura de histórico é da vista do palco, não uma aprovação da composição artística da Faísca.

Nenhuma implantação, migration remota ou abertura a membros ocorreu. A falha global de tipagem de publicação foi corrigida aqui; a entrada `map-set` do Pinta foi corrigida pelo trabalho paralelo, sem incluir seus arquivos neste commit. As verificações globais serão repetidas no fechamento pertinente.

**Próximo recorte: 3.8, Testar com primeira/terceira pessoa e voo, colisão, avatar de biblioteca e medidor de caminhada. O lote 3 permanece aberto.**
