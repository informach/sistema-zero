# Python: esperar a entrega de eventos antes de testar Desfazer

O job Windows `135904878313` da execução `44621726882` falhou somente em
`fresh parse origins survive value undo without restoring stale ranges from Blockly history`.
Após pedir Desfazer, a comparação semântica ainda recebeu `1000` em vez
de `1`. O teste aguardava 10 ms após montar o workspace e após editar o
campo. Esse tempo não garante a entrega dos eventos assíncronos do Blockly,
especialmente sob carga de CI. Sua API documenta que os eventos são enfileirados.

Foi extraída, sem alterar seu comportamento, a barreira pública que já
existia em `blockly.test.ts`: ela enfileira `FinishedLoading`, observa sua
entrega pelo workspace e remove seu listener. O teste de proveniência agora
usa a mesma barreira nos dois pontos. O deadline de falha de dois segundos
é o helper existente; não é espera fixa nem limite aumentado do produto.
Não foram usados `fireNow`, acesso às filas privadas ou mocks de Desfazer.

Todas as asserções de valor, AST, origem atual e Refazer permanecem.
Nenhum código de produção ou bloco foi alterado.

- Antes: CI Windows vermelha; vinte repetições locais do arquivo passaram.
  Não houve reprodução determinística da falha da CI nesta máquina.
- Depois: **260 testes/8.720 asserções** nos dois arquivos, vinte repetições
  por arquivo; nenhuma falha, sem retries.
- Família inteira de blocos Python: **126 testes/2.034 asserções**, vinte
  arquivos, nenhuma falha. Biome dos três arquivos passou.

A repetição local não substitui a nova qualificação Windows na CI.

```powershell
cd packages/studio
bun test src/python/blocks/provenance.test.ts src/python/blocks/blockly.test.ts --rerun-each=20
bun test src/python/blocks
```
