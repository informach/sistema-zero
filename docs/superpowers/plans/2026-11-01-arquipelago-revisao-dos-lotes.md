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
| C1 | Feito | `4bd539dab` | N1, obra estendida sem perda: o que foi mandado fica guardado no aparelho antes do PUT (`enviado`), e a releitura e o 409 reconhecem a própria gravação cuja resposta se perdeu (revisão base + 1 e a mesma obra, `mesmosDados`); o que mudou depois vai de novo sobre a revisão nova. Com um envio sem resposta, o próximo primeiro relê e concilia. No conflito de verdade, a obra deste aparelho fica guardada (`recuperacao`) e a barra do Construir oferece "Voltar à deste aparelho" ou "Ficar com a nova". N2: o Desfazer do térreo confere o andar de cima como o `aplicar` (recusa o que tiraria o chão dele) e o Desfazer de cima confere o andar antigo com o térreo de agora; a casa confere o andar com o mesmo lote da loja. Testes: jogo 2007 (1 pulado de antes), com os casos novos em `obra-estendida.test.ts` (resposta perdida e reabertura, edição durante o envio, conflito com recuperação) e `andar-de-cima.test.ts` (Desfazer no térreo depois da escada); tipagem do jogo |
| C2 | Feito | `b55b5153d` (N3) e (este lote, N4) | N3: `gameCausality` lê as condições com as variáveis que nunca mudam (`constantsOf`: criadas uma vez com valor literal, sem atribuição viva que mude o valor; otimista até estabilizar; nome escondido e código cru tiram da conta), e os moldes entram no comportamento; `collectionMemory` só desce no ramo vivo de uma guarda constante. Negativos no core e no Farol, executor real do Farol passando. N4: a loja do Farol ganhou `entrar` (a porta de baixo, agora "Subir pela escada de dentro", chama o mesmo), e o resultado da subida por fora tem "Entrar na sala do alto". Conserto achado no caminho: o `useFarol` do resultado estava depois do `return` sem resultado (ordem de hooks). Verificador novo `verificar-subida-ate-o-final-browser.ts` (largada, as cinco paradas por teleporte, varanda, resultado, sala do alto, computador e celular) e o `verificar-final-farol-browser.ts` pela porta, passando. Testes: core 1716, jogo 2007 (1 pulado de antes), Farol 11; tipagem do core, do jogo e dos docs do Farol |
