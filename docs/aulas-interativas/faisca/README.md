# Faísca

Promessa do posto: **Eu faço o jogo lembrar e decidir.** Gênero: aventura de coleta e decisão, em blocos com Jogo 2D e Jogo 3D.

| Papel | Curso | Estado da autoria local |
| --- | --- | --- |
| Curso da trilha 2D | [A Chave do Farol](desafio-primeiro-jogo/README.md) | Aulas e materiais |
| Curso da trilha 3D | [A Ilha do Farol](a-ilha-do-farol/README.md) | Aulas e materiais |
| Missão 2D e 3D | [O Jardim Secreto](o-jardim-secreto/README.md) | Aulas e materiais; revisado no padrão da trilha em 23/11/2026; mídia/publicação pendentes |
| Extra | [Cadê Todo Mundo?](cade-todo-mundo/README.md) | Aulas e materiais |
| Extra | [Meu primeiro desenho no Pinta](meu-primeiro-desenho-no-pinta/README.md) | Aula e materiais; revisado no padrão da trilha em 23/11/2026; mídia/publicação pendentes |
| Poder (2D e 3D) | [Moedas no caminho](poder-moedas-no-caminho/README.md) | Aulas e materiais; revisado no padrão da trilha em 23/11/2026; mídia/publicação pendentes |
| Poder (2D e 3D) | [O segredo da cabana](poder-o-segredo-da-cabana/README.md) | Aulas e materiais; revisado no padrão da trilha em 23/11/2026; mídia/publicação pendentes |
| Poder (2D e 3D) | [A ponte apressada](poder-a-ponte-apressada/README.md) | Aulas e materiais; revisado no padrão da trilha em 23/11/2026; mídia/publicação pendentes |
| Poder (2D e 3D) | [O baú dos símbolos](poder-o-bau-dos-simbolos/README.md) | Aulas e materiais; revisado no padrão da trilha em 23/11/2026; mídia/publicação pendentes |

Depois dos dois cursos da trilha, missão, Poderes e extras abrem juntos. Promoção exige os dois cursos, a missão nas duas dimensões e um Poder distinto aplicado. O Jardim não exige um Poder nem o Cadê como pré-requisito. Existência de arquivos locais não comprova publicação.

**Revisão de 23/11/2026:** a missão, o extra do Pinta e os quatro Poderes seguem o padrão do Cadê, da Chave do Farol e da Ilha (falas, estrutura com o envio na última construção, Na tela com os verbos do palco, recados, Debinha e Dedé). O gerador comum dos Poderes e do Jardim é `qa/poder-gerador.ts`; as peças comuns dos roteiros estão em `qa/faisca-comum.ts`; o teste `qa/faisca-padrao.test.ts` confere todos.

**Partes longas divididas (24/11/2026):** antes da gravação dos Poderes, as partes com mais de 900 palavras de fala viraram duas (a pergunta com o então; o senão, os avisos e o envio). Nenhuma parte dos quatro Poderes passa de 870 palavras. Detalhes em cada README.

**Blocos (regra da dona, 29/10/2026):** antes de pedir um bloco novo, conferir o catálogo INTEIRO
da extensão (todos os `blockCatalog*.ts`, a paleta e os degraus em `blockly/blockLevels.ts`). Se o
bloco existe num degrau acima, a proposta é descê-lo para o iniciante; bloco novo só quando ele
realmente não existe. No Jogo 2D, todo `sz_g2d_*` já é `iniciante-2d` (o `initialCore.ts` é só o
recorte editorial de entrada); no Jogo 3D, o iniciante é o conjunto `INICIANTE_3D_G3D`.
Como cada Poder vem nas duas dimensões, comparar também 2D com 3D: quando a mesma ideia tem bloco
num lado e não no outro, a escolha dela é alinhar (29/10/2026: o evento "Quando começar a encostar
em algum do grupo" ganhou o par no Jogo 2D).

[Todos os postos](../README.md) · [Regras da jornada](../../jornada-do-criador.md)
