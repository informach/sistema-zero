# Transação de saída no turno do evento

O run `44348035213` (SHA `b40a335dd`) reproduziu uma perda na restauração real
do WebKit: após gravar `in-flight-2`, editar `exit-2` e recarregar imediatamente,
a abertura retornou `in-flight-2`. O caso não foi pulado nem teve sua expectativa
reduzida. O teste de conflitos entre abas continua obrigatório.

## Causa reproduzida

Mesmo com a conexão já aberta, `idb-keyval.createStore` executa o callback via
`getDB().then(...)`. Consequentemente, chamar o staging de saída ainda não tinha
emitido os pedidos ou `commit()` no próprio turno do evento de fechamento.

O novo teste usa IndexedDB real de `fake-indexeddb`, com a mesma fronteira assíncrona
do adapter. Depois da chamada de gravação, abre um leitor independente e síncrono
no banco. Antes da correção, esse leitor via `previous`; a transação da saída só
nascia na microtask seguinte. A expectativa de ler `latest draft` falhou antes e
passou depois, sem mocks de transação, timers ou alteração do valor esperado.

## Correção e integridade

`idbTransaction` registra a conexão e o nome de object store usados pelo adapter.
Com a conexão aquecida, cria a transação e coloca seus pedidos imediatamente,
conservando o commit explícito já existente. Não abre outro banco, não duplica
documentos e não altera chaves, quotas, revisões ou regras de CAS.

O cache é fraco e pertence à função de store capturada, portanto não troca o
perfil de uma operação em andamento. Close/versionchange invalidam a entrada.
Se abrir uma transação falhar por conexão fechada, somente o adapter proprietário
pode reabri-la; uma operação que já emitiu pedidos nunca é repetida. Falhas de
pedidos continuam abortando a transação inteira. Uma conexão fria ainda precisa
da abertura assíncrona; a correção não promete que o navegador permita abrir um
banco novo durante a destruição da página.

## Evidências

- Regressão de ordenação falhou antes (`previous`) e passou depois (`latest draft`).
- Transações, ordenação e coordenador: 18 testes aprovados no conjunto selecionado,
  incluindo os casos isolados de mocks existentes.
- Estado e persistência completos: 348 testes, zero falhas, 1.991 asserts (38,58 s).
- WebKit real no Windows: três execuções do teste de navegador, cada uma com 12
  reloads imediatos e duas abas independentes; 36 reloads aprovados e os conflitos
  corretamente recusados. Autosave continua retido em 600 segundos na fixture.
- Typecheck completo e confirmação nos runners continuam exigidos para o novo SHA.

Não foi removida a asserção que encontrou a perda, reduzido o material grande,
introduzido sleep antes do reload ou contado um resultado histórico como prova
da correção. Os logs locais ficam em `.cache-idb-*` e `.cache-exit-state-suite.log`
da worktree isolada. Não houve acesso a dados ou serviços de produção.
