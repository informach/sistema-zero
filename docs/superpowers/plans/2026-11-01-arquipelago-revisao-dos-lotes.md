# Arquipélago: as correções da revisão dos lotes de 31/10

Origem: `.audits/architectural-analysis-2026-10-31-arquipelago-revisao-dos-lotes.md` (base
`542249c2f`). O plano completo (C1 a C3, os lotes 9 a 11 da lista A v3 e a qualificação local)
está no plano aprovado pela dona em 31/10. Os lotes 9 a 11 registram em
`docs/superpowers/plans/2026-10-30-arquipelago-v3-lista-a.md`.

Decisões da dona (31/10):
- **Vale e Nuvens:** publicar como estão; os cursos que ensinam esses blocos chegam antes do
  lançamento.
- **Móveis no andar de cima:** só em cômodos.
- **Objetos com função:** só no térreo.
- **Roupas das festas:** exclusivas da festa.

## Registro

| Lote | Situação | Commit | Notas |
| --- | --- | --- | --- |
| C1 | Feito | (este lote) | N1, obra estendida sem perda: o que foi mandado fica guardado no aparelho antes do PUT (`enviado`), e a releitura e o 409 reconhecem a própria gravação cuja resposta se perdeu (revisão base + 1 e a mesma obra, `mesmosDados`); o que mudou depois vai de novo sobre a revisão nova. Com um envio sem resposta, o próximo primeiro relê e concilia. No conflito de verdade, a obra deste aparelho fica guardada (`recuperacao`) e a barra do Construir oferece "Voltar à deste aparelho" ou "Ficar com a nova". N2: o Desfazer do térreo confere o andar de cima como o `aplicar` (recusa o que tiraria o chão dele) e o Desfazer de cima confere o andar antigo com o térreo de agora; a casa confere o andar com o mesmo lote da loja. Testes: jogo 2007 (1 pulado de antes), com os casos novos em `obra-estendida.test.ts` (resposta perdida e reabertura, edição durante o envio, conflito com recuperação) e `andar-de-cima.test.ts` (Desfazer no térreo depois da escada); tipagem do jogo |
