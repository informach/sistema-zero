# Retained observation P2 — commit e evidências para review

Commit: `b763fb6e1773a122188fe37fa044b142c9442f62`, parentb7ec, horizonte produtivo843048. São5arquivos QA/97adições/18remoções, dentro dos13caminhos já existentes. Worktree limpa; sem push/merge adicional/Start/browser/serviços/build/TSC/Docker. A revisão independente deste follow-up continua pendente.

## Causa e reprodução

`Retained-OwnedProcessAlive` tratava erros de Refresh/HasExited/StartTime como false. O monitor omitiria um filho conhecido de liveOwned, sem registrar incerteza; poderia emitir ACK e qualificar término enquanto o filho permanecia vivo.

O controle usa uma árvore Bun real e mantém o SafeHandle real do descendente. Uma facade de Process injeta falha numa operação de observação, sem substituir o helper de liveness. O cenário retorna completion deixando um filho unref vivo. No baselineb7ec, `red-refresh-detached.log` reproduziu exatamente: **completed-owned-tree-exited, ownershipComplete=true, scenarioExit0, processExit0, liveOwned vazio**, apesar do filho vivo. O controle corretamente falhou exit1 e sua própria limpeza tratou apenas o filho inerte identificado. Estado original preservado em `.cache/lessons-qa-controls-r1/supervisor-retained-observation-failure-400b6125284245fd8fc7e6cae0c0f63d/owned-process.json`.

A primeira reprodução, com filho ainda referenciado, chegou ao deadline em vez de falso sucesso; permanece em `red-refresh.log`. Tentativas intermediárias do controle também foram preservadas, não contadas como PASS: cleanup do teste precisava do handle independente em vez de reabrir um filho já encerrado pelo ambiente, o getter HasExited em PowerShell podia devolver null, e saída comprovada posterior precisava de registro explícito.

## Correção operacional

- `Retained-OwnedProcessObservation` distingue alive, exited comprovado por HasExited booleano verdadeiro, e unknown. Falhas, valor de saída não booleano, handle inválido e identidade divergente são unknown. O helper booleano lança em unknown, antes de o monitor alcançar ACK.
- A reconciliação usa essa observação explícita: cada objeto retido permanece vivo, tem saída comprovada em provenExitedProcessIds, ou entra em unconfirmedProcessIds. ownershipComplete/cleanupConfirmed permanecem falsos depois da falha do monitor, mesmo quando uma observação posterior comprova a saída de um processo.
- O cleanup não repete o helper que falhou dentro de seus catches. Continua pelos demais objetos, persiste a falha primária e as incertezas, e libera handles no finally. Erro na observação final do root também fica registrado sem abandonar a persistência NEG.
- `Stop-RetainedOwnedProcess` continua usando somente o mesmo Process/handle retido e agora recusa observação desconhecida. Não foi acrescentado PID/name kill nem ampliada autoridade de parada.
- Conforme pedido separado do Root, `browser-owned.ps1` e o runbook exigem PowerShell>=7.5, coerente com ConvertFrom-Json-DateKindString. Parser e semântica JSON não foram trocados.

## Evidência leve

13controles de processos passaram: Refresh/HasExited/StartTime desconhecidos; retenção/identity-rebinding/handlefechado/saídacomprovada; complete, abrupt, deadline, JSONmalformado, Savefault, CIMfault, pai sem witness, PIDausente vs erro, e ACKlento. Os três novos controles exigem NEG, ownership incompleto, cleanup não confirmado, nenhum ACK e zero Kill no objeto de observação desconhecida. O teste mantém um **segundo handle real**, sob sua própria autoridade de controle, para confirmar/limpar seu filho depois; isso não transforma cleanup do monitor em confirmado.

Um controle adicional da entrada real exige recusa7.4 e passagem da verificação7.5 até o limite de plano ausente, sem iniciar processos. Host real7.6. Quatro parsers PS retornaram0erros e diffcheck passou. Não houve suite ampla/TSC/build ou browser real. Logs e recibos individuais dos13controles, mais o controlePS, estão vinculados em `receipt.json`.

## Artefatos

| Artefato | SHA256 |
| --- | --- |
| delta.patch contra parentb7ec | `db7e1689c50aa00dd3cc73b3577558fbca2f69c1823ec32ec1fe3f9deaecf934` |
| `.cache/lessons-integration-r4/qa-lot.patch` completo contra843048 | `0cd632bb551f900c02e721b253effff09427c2e860d634d920fb7fd8577e4edf` |
| future-composition.json | `ee647fbb73dcd1069264e0033c3ee7b443185f092243e6f21f5bf456fd7c769d` |
| receipt.json | `534ae135a71783356f9125a673b2eb9c154f233482d98f713a23c6085c08933f` |

O patch completo agora soma13QA/1111adições/23remoções,zero produção. Ele contém o r3; não aplicar os dois em sequência. R3, recibos CIM anteriores, composição843048 e sealr4 foram preservados com hashes conferidos.

A composição futura atualiza somente a fonte QA para b763 e os hashes atuais de watcher/owned:12diferenças host históricas e6app,6caminhos adicionais ainda a conciliar e4operadores de fonte. Mantém horizonte843048 e estado de review pendente. Não é plano/env/seal executável; fonte/closure/hoststate/approval/bind novos e janela continuam necessários para o primeiro Admin→Kids real.
