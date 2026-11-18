# Journal de saída: contrato para corrigir R3

Estado: desenho em implementação; não é capacidade entregue.

## Evidência

O run `44386420665` capturou `flush:exit-0` e o pedido nativo de commit da
transação 5. Após recarregar, não havia journal recuperável e a cabeça tinha
`sequence:1`, correspondente a `in-flight-0`. Não é captura de buffer antigo.

O ensaio nativo `measure-idb-exit-scheduling.mjs`, com payload completo de 4 MiB,
teve 12/12 escritas preservadas no Chromium em cada topologia. No WebKit local,
foram 0/12 no mesmo store, em store separado e em banco separado. Trocar o banco
não resolve essa perda tardia. A norma IndexedDB também impede abortar uma
transação que já entrou em committing; não tentar contornar isso no SDK.

## Desenho

Evoluir o journal existente, conservando `RecoveryWrite`, as cabeças e o CAS.
Uma cópia síncrona de saída em Web Storage protege o payload quando o navegador
descarta a transação IndexedDB. Não criar outro modelo de projeto, fila de saves
ou caminho de promoção que ignore o coordenador atual.

- Capturar armazenamento e namespace junto do scope; nunca usar o perfil ativo
  no lugar do perfil capturado por uma operação.
- Cada entrada é imutável e usa identidade de scope, projeto, escritor e token.
  Limpeza de uma entrada não pode apagar um token mais recente de outra tarefa.
- Codec fechado e versionado, sem perdas de `undefined`, campos desconhecidos,
  arrays, identificadores ou árvores profundas. Não chamar getters/toJSON nem
  permitir setters de protótipo. Validar limites antes de decodificar referências.
- Gravar a cópia síncrona antes de solicitar o staging IndexedDB. O ACK desse
  staging confirma um rascunho; não significa salvar o documento publicado.
- Antes da recuperação normal, transferir entradas ao journal existente sem
  sobrescrever silenciosamente outra revisão. Só retirar a cópia síncrona depois
  de confirmar sua transferência ou promoção segura. Conflitos seguem pelo fluxo
  atual de cópia recuperada, conservando o original.
- Revisões da mesma sequência com tokens/conteúdos diferentes são ambíguas:
  conservar ambas; não usar ordem de leitura como decisão de autoria.
- Falha de quota, indisponibilidade ou payload incompatível precisa ser explícita,
  conservar dirty/dados e impedir um ACK falso. Considerar a confirmação nativa de
  saída para alterações ainda não confirmadas; ela não substitui a recuperação.
- Não apagar entrada malformada, futura ou irrecuperável para limpar um teste.
  Deixar diagnóstico e caminho de recuperação/exportação.

## Verificação bloqueante

1. Reproduzir a falha atual com o fixture real e o novo trace Linux.
2. Codec: igualdade incluindo campos desconhecidos/undefined, árvore profunda,
   rejeição de ciclos, referências inválidas e orçamento; sem execução de getters.
3. Journal: scope, token imutável, quota, interleaving entre abas e preservação
   de versão futura/corrompida; limpeza só após confirmação.
4. Coordenador: não reverter cabeça mais recente, não perder assets/histórico,
   não sobrescrever escritor concorrente e manter cópia em falha de transferência.
5. Chromium/WebKit reais: recarga imediata sem esperar autosave, CAS já em
   committing e payload grande; repetir conflito entre abas e testes de quota.
6. Linux/Windows, suíte completa, typecheck, revisão de memória/segurança e relatório.

Não declarar R3 fechado com um teste local nem ampliar quotas para caber a cópia.
O orçamento do navegador e os casos sem armazenamento síncrono devem ser medidos
e declarados. O problema de structured clone de pilhas profundas continua um
contrato próprio de persistência e não desaparece por existir um journal.
