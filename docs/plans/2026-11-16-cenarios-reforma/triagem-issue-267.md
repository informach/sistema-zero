# Issue 267 — Composição por áreas e teste na escala real

17/11/2026 · conferência da sessão principal sobre staging `5017a94ef` e o fechamento local da parte 3.4.

Lidos a [issue 267](https://github.com/informach/sistema-zero/issues/267) e o [comentário de triagem do Claude](https://github.com/informach/sistema-zero/issues/267#issuecomment-6947450168). Esta conferência incorpora os critérios ao trabalho autorizado em curso; não inicia outra implementação nem muda o Arquipélago publicado. O recurso continua genérico.

## Confronto com o plano e o código

| Critério | Classificação | Encaminhamento e prova exigida |
| --- | --- | --- |
| Salvar seleção como conjunto e reutilizá-la da biblioteca | Já coberto no plano, ainda não implementado | Parte 3.6. Conjunto nomeado com miniatura, usando a biblioteca e oficina existentes. |
| Nome e miniatura do conjunto | Lacuna explícita de aceite | Acrescentado a 3.6. Capturar e associar a imagem à definição correta; conferir reentrada e exclusão. |
| Colocar, mover, girar e duplicar conjuntos sem perder proporções e relações | Já previsto; detalhar o aceite | Parte 3.6. Fluxo real com posições relativas, escala, apoios com contato, vínculos e IDs internos remapeados, incluindo reabertura. Clipboard de objetos não será apresentado como conjunto vivo. |
| Alterar a definição e atualizar cópias sem destruir versões anteriores | Já previsto; detalhar o aceite | Parte 3.6. Reabrir versões anteriores dos cenários e conferir resolução das definições e proteção dos arquivos, não apenas a aparência da cabeça atual. |
| Organização distrito › área | Já coberto e implementado no recorte 3.4 | `GrupoSchema` aninhado e índice de organização existentes. Ensaio usa Vila › Flores › Ada; camada do ancestral oculta os três objetos e tranca a edição do descendente. Conferidos árvore, controles, desfazer e reentrada em 1.440/1.024/390 px. Não requer outro esquema de distrito. |
| Primeira pessoa, terceira pessoa e voo; voltar à mesma vista de edição | Já coberto no plano, ainda não implementado | Parte 3.8. Testes de entrada, saída, controles e câmera; ensaio separado do documento. |
| Cápsula e câmera na altura do personagem escolhido | Lacuna explícita de aceite | Acrescentado a 3.8. Dimensões derivadas do personagem em uso; caso Cute Characters na escala nativa, aproximadamente 1,16 m. Não ampliar o avatar para acomodar cenário. |
| Conferir percursos caminhando e registrar as evidências | Lacuna explícita de aceite | Parte 3.8. Vídeos de caminhada em primeira e terceira pessoa. Voo é complementar. Capturas estáticas não aprovam contato dos pés, câmera ou IK. |
| Medir distâncias durante os percursos | Tarefa adicional no Testar | Parte 3.8 recebe medidor de percurso da sessão, com início/fim, distância direta, distância efetivamente percorrida e tempo. Pausas, voo, teletransporte/retomada e troca de modo não podem inflar a caminhada. A régua autoral continua no lote 7. |
| Conjuntos integrados a relevo, água e entradas de caminhos | Critério dos lotes seguintes | Terreno 4: reassentamento após edição das alturas; Água 5: margens, nado e apoios; Caminhos 6: traçados alcançando as entradas. Usar a numeração do plano aprovado. |
| Praça funcional, espaço da Morada e marcos visíveis da Faísca | Caso de aceite, sem sistema exclusivo | 3.6/3.8 validam o fluxo técnico na Faísca convertida; composição com terreno/água/caminhos depende dos lotes 4–6. Aceite artístico continua manual, separado dos testes técnicos. |
| Precisão do relatório e dos ensaios | Já coberto na prática | Registrar local/genérico/emulado, dados medidos e limitações. Não afirmar aparelho físico, integração publicada ou aceite artístico sem essas provas. |

## Distâncias da Faísca

Os 20/40/60/90 m citados na issue são referências do estudo inicial, não metas para um algoritmo reposicionar a ilha. A sessão já recebeu aprovação para o coração compacto, aproximadamente porta–praça 13 m, praça–horta 20 m e praça–Pátio 25 m. Preservar esse estado e medir os percursos reais, com seus pontos de início e fim, antes de propor qualquer ajuste. O território de aproximadamente 520 m e a reserva da Morada permanecem referências do caso; esta triagem não altera a geografia.

## Algoritmos adiantados pelo Claude

Os commits `29c2ab43c` e `9946171a9`, já presentes na staging, foram conferidos novamente. São módulos puros de terreno, pintura, buracos, PNG de alturas, curvas e água; continuam isolados do contrato público, palco, UI e persistência. Os 30 testes específicos passaram novamente, com 2.802 asserções. Aproveitar esses módulos nos lotes 4, 5 e 6, conferindo contratos e limites quando forem ligados. Isso não muda a ordem nem fecha esses lotes.

Referência técnica: [adiantamento dos núcleos](adiantamento-nucleo-lotes-4-5-6.md). A erosão existente é térmica; o PNG recusa paleta e entrelaçamento; contornos de água saem em coordenadas mundiais e precisam de conversão para o contrato autoral; módulos na curva usam X local. A integração deve respeitar essas características e continuar coberta por testes.

## Sequência

Concluir e registrar 3.4, seguir por 3.5, 3.6, 3.7 e 3.8; só depois abrir o lote 4. A issue permanece em acompanhamento. Nenhum comentário foi publicado e ela não foi encerrada por esta conferência. A conclusão global exige os lotes 0–10, revisão completa, implantação e validação em staging, conforme a usuária.
