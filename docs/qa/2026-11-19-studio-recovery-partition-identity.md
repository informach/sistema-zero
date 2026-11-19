# Identidade interna das partições recuperadas

Dois testes vermelhos reproduziram promoção de um journal nativo incompatível:
uma partição de arquivos com `id` de outro projeto, apesar da chave correta, e
um meta com `storageVersion: 9999` dentro do namespace atual. A montagem do
documento substituía o ID pelo ID solicitado e removia o marcador local antes
da validação do formato portátil; por isso a validação posterior não detectava
essas incompatibilidades.

A guarda compartilhada agora exige a identidade do projeto nas partições de
meta, arquivos, estado, blocos e materiais, além do marcador de layout esperado
no meta. A miniatura continua seguindo seu contrato próprio. Verifica esses
campos antes de montar ou promover o documento. Registros incompatíveis ficam
preservados no journal e o documento confirmado continua intacto.

Não há migração implícita, coerção de versão, mudança de namespace, nova cota ou
alteração nos arquivos/blocos do aluno. A guarda também protege os espelhos
síncronos; o laboratório passa explicitamente a versão 3/4 no preparo de migração.

Regressão local: **457 testes, 2.437 asserções, 71 arquivos, zero falhas**,
45,16 s. Inclui o navegador real com IndexedDB, aborto de saída, conflitos,
quota e recarga. Typecheck completo aprovado. Os testes verificam que ambas as
fontes incompatíveis continuam estruturalmente preservadas e que o conteúdo
confirmado permanece `initial`.

Esta qualificação de armazenamento não conclui a migração v4 nem a missão global.

Bundle inicial: 367.285 bytes brutos, 119.477 gzip, dois arquivos.
A guarda passou com 35 asserções em 18,10 s, mantendo os tetos e o prazo.
