# Lista A da revisão da proposta v3 (30/10/2026)

Implementa os achados que não dependem de arte do levantamento
`docs/arquipelago-levantamento-proposta-v3-2026-10-30.md` (seção 9, lista A), seguindo as decisões
de `docs/arquipelago-regras.md` §6.28. A dona pediu em 30/10/2026: "implemente os achados da lista
dos que não precisam de ajustes de arte ou arte nova".

Regras de sempre: um lote por vez, ramo `arquipelago/v3-loteN` a partir do staging local, testes
dirigidos, Biome, tipagem conforme a regra de uma sessão só, commit em português, merge no staging
local, sem push. Textos da criança sem travessão, sem exclamação e sem começar por pergunta. O
salvamento V20 está a cerca de 600 bytes do teto: campo novo só se couber no documento cheio, senão
documento próprio ou V21 com a conta registrada.

## Lotes

| Lote | Itens | Área |
| --- | --- | --- |
| 1 | A13, A4, A17, A18, A37, A39 | Mundo e história: Farol, página do Recife, sua ilha cinza, luneta, névoa, carta e páginas extras |
| 2 | A38, A8 | A noite: borrões que desbotam e as ondas de cinza nos ninhos |
| 3 | A12, A14, A20 | Relógios, Lumis com o jogo fechado, humor visível |
| 4 | A6, A22, A25, A31 | Cozinha: peixe com coco, pedidos de pratos, venda na feira, receita do extra, geladeira |
| 5 | A19, A7, A21 | Moradores e companhia: Nico, dino em casa, roupas por amizade e de festa |
| 6 | A9, A40, A41 | Percursos e álbum: estrela do segredo, peixes no álbum, atalhos |
| 7 | A5, A10, A16, A30, A32 | Casa e economia: Pinta no Construtor, quarto nos dois sentidos, salvamento sem Members, criação pelo molde, teto |
| 8 | A3, A24, A23, A26, A2, A1 | Desafios na plataforma: curso para Python e Pro, "Aprenda isso em", desafio de morador, medição, sexto quadro na linguagem, publicação |
| 9 | A15, A42, A43, A44, A45, A46, A29 | Conteúdo dos desafios |
| 10 | A27, A28, A33, A34, A35, A36 | Família e arquitetura |
| 11 | A47 | Documentos defasados |

Cada lote atualiza a linha dele na tabela abaixo ao fechar.

## Registro

| Lote | Situação | Commits | Notas |
| --- | --- | --- | --- |
| 1 | Feito | (este lote) | Farol acende só nos fachos e depois do final; página do Recife da ficha; carta de boas-vindas como página da sua ilha; casa, horta e píer desbotados até porta nova, primeira colheita e primeiro peixe (`sistemas/cor-da-sua-ilha.ts`, `mundo/desbotado.ts`); morador acenando na luneta; névoa na ilha fechada (shader `arq-pintura-2`); páginas extras nos quatro baús. Suíte 1.460, tipos ok, navegador: `verificar-cor-da-sua-ilha-browser.ts` (saturação da casa 0,25 → 0,40, píer 0,42 → 0,73) e `verificar-luneta-browser.ts` |
