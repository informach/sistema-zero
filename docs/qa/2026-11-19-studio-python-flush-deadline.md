# Prazo do salvamento Python antes de parar

## Origem e reprodução

GitHub Actions `44467005728`, revisão `e8a5f942f`, job Windows `135367108565`: `flushSaved(30)` encerrou após 20,6309 ms. A asserção original exigia pelo menos 25 ms e foi mantida. O supervisor usava apenas um disparo de setTimeout, sem conferir o relógio monotônico.

Um teste determinístico chama antecipadamente o callback real registrado pelo supervisor: antes da correção a promessa era resolvida; o teste vermelho foi registrado em `.cache/mission/python-flush-deadline-red.txt`. Outro teste vermelho mostrou que Parar não concluía a espera pendente nem liberava seu timer.

## Correção

O supervisor conserva o prazo original em performance.now(). Se o timer disparar antes, agenda apenas o restante; não aumenta o prazo solicitado. A confirmação do worker conclui imediatamente. Parar/descartar resolve a espera pendente e cancela o timer. Uma marca de conclusão impede um callback já enfileirado de rearmar a espera depois da confirmação ou parada. Durações inválidas não criam um prazo infinito.

Nenhuma exigência temporal do teste foi reduzida. Não foram alterados cursos, estilos, quotas, dados do projeto ou protocolo Python.

## Verificação local

- Supervisor e mensagens do frame: 32 testes / 791 asserções, zero falhas.
- Diretório runtime/python completo: 303 testes / 79.216 asserções / 51 arquivos, 22,92 s, zero falhas.
- Logs ignorados: `.cache/mission/python-flush-*`.

Typecheck completo com cache incremental: saída 0 (`python-flush-typecheck.txt`). A qualificação remota desta correção permanece bloqueante antes de declarar o achado encerrado no Windows da CI.

## Resultado da integração anterior

O run e8a5f942f aprovou 11 de 12 jobs. Passaram todos os navegadores, executor hospedado, isolamento, auditoria e contratos Linux. O job Python executou 81 testes em Chrome, Edge e Chromium, incluindo seis casos dos mundos ligados Pinta 1×/2×. O job linux-chromium-1 executou duas provas contra cada leitor histórico, com checkout/dependências congelados próprios. A falha Windows acima não foi ocultada nem tratada como execução global aprovada.
