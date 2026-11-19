# Replay direcionado ao namespace de destino

Base: `be46906bc`, branch de laboratório `estudio-deep-storage-boundary-20261118`.

A promoção CAS, o journal de aplicações e a cópia de conflitos agora recebem a versão de armazenamento como parâmetro interno. O caminho normal mantém seu padrão v3. A recuperação preparada pode direcionar o mesmo motor à v4, com chaves de documento, cabeça, recuperação, histórico, orçamento e proveniência coerentes. Não há nova fila ou armazenamento paralelo.

## Evidência focada

O teste vermelho projetava uma recuperação v3 para v4 e era recusado pelo replay preso ao namespace padrão. Após a mudança, 28 testes de recuperação passaram, com 119 asserções. Os novos casos executam promoção de base v3→v4, replay do rascunho, preservação dos bytes da fonte para confirmação, histórico inverso e orçamento exclusivamente na v4. Um conflito conserva o vencedor e cria uma cópia completa com proveniência na v4, sem recriar partições v3.

Suíte ampliada: 505 testes, 2.669 asserções, 76 arquivos, 52,50 s, zero falhas. Inclui o driver nativo Chromium/WebKit e seu contrato de recarga; isso não equivale a ter testado o novo fluxo v4 completo no navegador. Os seis fluxos do editor, na revisão anterior `be46906bc`, encerraram normalmente em 57,1 s, sem retries; o primeiro comando recusou reutilizar o servidor próprio e foi reexecutado com a opção explícita de reutilização. Logs ignorados em `.cache/mission/versioned-replay-*` e `projected-replay-editor-e2e-reused.txt`.

## Gates ainda abertos

O padrão permanece v3. Faltam coletar/arquivar as fontes antigas, ligar seus reconhecimentos exatos, conectar os carregadores e listas, migrar layouts v1/v2 profundos e qualificar a ativação. Typecheck e bundle desta revisão precisam estar aprovados antes de commit/integração. A missão global permanece aberta.


## Recuperação completa das fontes v3

`recoverLocalV3ProjectWrites` captura o perfil/backend, valida os espelhos, prepara snapshots imutáveis, migra a base e arquiva cada fonte antes de usar o replay v4 existente. A fonte nativa é removida por comparação CAS completa, junto da validação do arquivo de segurança; a fonte síncrona é reconhecida pelos bytes originais exatos. Um token reaproveitado com conteúdo diferente bloqueia a migração antes de mudar a base. Fonte síncrona, espelhos, fonte somente nativa e retorno de aba antiga têm testes de contrato.

O preparo físico de documentos/journals/cópias v4 ocorre antes de abrir o CAS vivo. A captura de saída continua síncrona e não chama esse preparo assíncrono.

A suíte ampliada mais recente passou em 510 testes / 2.702 asserções / 76 arquivos, 57,16 s. Um erro de tipo no construtor de uma fixture (tentativa de alterar tupla readonly) foi corrigido construindo outro snapshot, sem enfraquecer tipos ou contratos.

O driver nativo executou também a promoção completa de 10.000 registros nos dois engines: conferiu grafo inteiro, cabeça, remoção do journal pendente, arquivo de segurança preservado e ausência da fonte síncrona ANTES do teardown. A fixture não remove a fonte para fazer essa asserção passar. Resultado e hashes em `2026-11-19-studio-legacy-replay-native.json`. Os tempos são de migração fria e incluem validações; não são latência de digitação nem comprovação de renderização responsiva.

A ativação, os carregadores/listagem, a migração profunda v1/v2 e a experiência de erro/recuperação ainda bloqueiam a promoção global do laboratório.


Gates finais após revisão e organização dos imports: 510 testes / 2.702 asserções / 57,45 s; typecheck completo incremental com saída 0; lint/formatter dos sete arquivos novos/alterados com saída 0. Bundle inicial: 366211 bytes brutos / 119522 gzip, 1 teste / 35 asserções, limites originais. Logs `legacy-replay-reviewed-*`, `legacy-replay-types-fixed.txt`, `legacy-replay-lint-typecheck.txt` e `legacy-replay-lint-final.txt`.
