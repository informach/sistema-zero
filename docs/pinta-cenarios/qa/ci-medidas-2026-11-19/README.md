# Limites de QA após integrar o remoto

O CI de staging `44580674373`, fonte `386eb685b`, terminou com quatro falhas
no job principal: duas contagens sintáticas de parâmetros e dois orçamentos do
payload do Jogo 3D. Os demais jobs passaram. Nenhum motor é alterado nesta correção.

## Causas verificadas

O ciclo de vida compartilhado passou a distinguir `pagehide` com
`event.persisted`, preservando a execução no BFCache. O callback `pageHide(event)`
acrescenta exatamente um parâmetro aos dois runtimes 2D. O contador inclui
parâmetros tipados; as verificações semânticas e de assinatura permanecem ativas.

O commit remoto `97028f4f3` acrescentou a integração dos cenários Molda no Jogo 3D.
O crescimento das duas variantes é idêntico: 10.179 caracteres. Os limites estavam
anteriores à implementação. A autorização do usuário permite esta correção de
QA/CI, preservando a implementação 3D.

## Medições reproduzíveis

Linux Ubuntu 24.04, Bun 1.3.11, instalação congelada, execução
[44586083565](https://github.com/informach/sistema-zero/actions/runs/44586083565).
As duas fontes foram medidas em jobs separados pelo mesmo script. Windows usa
Bun 1.3.11 nesta máquina; os hashes dos textos atuais são idênticos aos do Linux.

| Fonte / variante | Caracteres | Gzip Linux | Gzip Windows |
| --- | ---: | ---: | ---: |
| e193c8f8f / completa | 238.497 | 64.810 | 67.291 |
| 386eb685b / completa | 248.676 | 67.504 | 70.105 |
| e193c8f8f / sem Kit Plataforma | 204.415 | 55.387 | 57.577 |
| 386eb685b / sem Kit Plataforma | 214.594 | 58.082 | 60.393 |

Os valores antigos de Windows já estavam documentados na guarda; os atuais
foram medidos novamente. Os tetos novos têm margem de 6–46 caracteres/bytes sobre
as medidas, sem folga para funcionalidades adicionais. As outras variantes não mudam.

## Verificação local da correção

`bun test` nos dois arquivos `runtimeTypecheck.test.ts`, em
`runtimePayloadBudget.test.ts` e `projectRunContext.test.ts`: **20 testes passaram,
zero falhas, 46 asserções**. Inclui análise semântica dos runtimes compostos,
assinaturas e regressão do ciclo de vida. Log adjacente `testes-locais.txt`.

Esta evidência é de QA local e medição em CI; não representa publicação do novo
Worker, ativação do runtime Python ou homologação autenticada da missão inteira.
