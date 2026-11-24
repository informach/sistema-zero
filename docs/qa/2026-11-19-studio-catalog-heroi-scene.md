# Referência do catálogo: cenário do Herói do Molda

A CI `44608697451`, no commit `e9ec3b378`, reprovou a suíte isolada Linux
em `examplesLoading.test.ts`: o catálogo do Jogo 3D Avançado já havia sido
alterado por `2932075e4`, mas sua referência integral ainda era a anterior.
A falha foi reproduzida localmente antes da correção.

A integração adicionou ao exemplo Herói do Molda dois nós (`g3k:loadScene`
e `g3k:sceneStart`) e três materiais de cena. Para conferir que nenhuma
outra mudança estava escondida no novo hash, foram carregados os exemplos
pelo loader real (validados, sanitizados e na ordem pública), clonados
somente para a prova e retiradas somente essas cinco adições daquele único
exemplo. O hash voltou a ser exatamente o anterior. O recibo está em
[`studio-catalog-heroi-scene.json`](2026-11-19-studio-catalog-heroi-scene.json).

A referência foi atualizada apenas para esse catálogo. Permanecem o teste
da quantidade de 20 exemplos, a ordem e o hash de todo o conteúdo. Os outros
quatro catálogos conservaram suas referências. Nenhum exemplo, material,
matriz dos cursos ou arquivo gerado foi modificado para corrigir o teste.

Verificação após a correção: 572 testes passaram, 6.482 asserções em 44
arquivos, incluindo catálogo lazy e a suíte completa do Jogo 3D Avançado
(runtime, cenas, contratos, exemplos e round-trips). Isso corrige uma falha
específica; não declara a missão nem toda a CI aprovadas.

```powershell
cd packages/studio
bun test src/official-extensions/examplesLoading.test.ts src/official-extensions/game-3d-advanced/__tests__
```
