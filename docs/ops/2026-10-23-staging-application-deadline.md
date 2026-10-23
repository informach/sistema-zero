# Prazo de observação da onda completa de staging

O run `39902057431`, commit `1394cd9c9`, passou nos dez jobs de teste e falhou
na observação dos deployments às 05:50:41 UTC. Nesse instante, dezesseis dos
dezoito aplicativos já estavam em SUCCESS; Admin e comunidade adulta
continuavam em BUILDING. O encerramento do observador não cancelou os builds
do Railway. Seus resultados devem ser reconciliados pelos IDs originais,
sem reenviar a onda para obter um recibo positivo.

O limite dos aplicativos era de vinte minutos, incluindo a fila compartilhada
de builds. O log mostra Admin em QUEUED até 05:37 e comunidade adulta até
05:38. O tempo do job inteiro já era maior, mas não ampliava esse limite interno.

## Correção

A observação dos aplicativos passa a ter sessenta minutos. O job de deploy de
staging passa de 180 para 240 minutos, cobrindo os 140 minutos da onda canônica,
sessenta dos aplicativos e margem de preparação. Os jobs de teste, limites dos
programas dos alunos e workflow de produção permanecem com seus orçamentos.
Esse teto não é uma garantia de duração do provedor.

Havia também uma saída incompleta sob `set -e`: se o prazo expirasse durante
um round, a função podia retornar o status falso de seu último predicado e
encerrar o shell antes do diagnóstico explícito. Ela agora retorna após coletar
os estados; o chamador continua recusando `FAIL` ou `PENDING`. O prazo excedido
continua sendo falha, com mensagem correspondente.

## Prova

Os testes extraem e executam a função Bash do próprio workflow, com status
sintéticos e relógio lógico. Não fazem HTTP, deploy ou espera real.
Antes do reparo, os dois casos causais falharam: convergência após o antigo
corte de vinte minutos e retorno ao diagnóstico após expiração no round.
Os controles de sucesso, falha do deployment e cinco respostas JSON inválidas
continuaram passando. Esta prova não converte o run remoto anterior em sucesso.

O primeiro ensaio do teste usou rounds sintéticos pequenos demais e atingiu o
prazo do próprio teste no Git Bash; o relógio do teste foi ajustado para modelar
rounds de cinco minutos no caso de fila. Isso não modifica o relógio do produto.

Após o reparo, passaram os onze testes dos dois conjuntos diretamente afetados.
A seleção ampliada dos seis conjuntos de baseline, transporte, backlog,
polling e workflows passou com **106 testes, 289 asserções e zero falhas**.
Biome conferiu os dois arquivos TypeScript; o diff não apresentou erros.

## Reconciliação dos deployments originais

Às 05:56:25 UTC, uma consulta nova confirmou os dezoito aplicativos com ativo
único saudável no commit `1394cd9c93aee904fcdb8454a8bb525308e48f2e`, sem
deployments pendentes. Nenhuma nova tentativa foi enviada para essa conferência.
Às 05:56:56, a consulta separada de Admin, comunidade adulta e Kids também
confirmou que seus três predecessores estavam REMOVED/stopped.

Isso fecha a pendência de builds no Railway, mas o run `39902057431` permanece
reprovado pelo prazo do observador. O reparo do workflow precisa passar por seu
próprio CI; esse resultado posterior não deve substituir o histórico negativo.
