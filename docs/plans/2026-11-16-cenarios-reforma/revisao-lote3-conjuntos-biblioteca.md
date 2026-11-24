# Lote 3 — biblioteca, edição e publicação de conjuntos

17/11/2026 · Continuação de `0839f74c4` na `staging`. Parte interna 3.6; o lote 3 permanece aberto.

## Comportamento implementado

A escolha de objetos ou de uma pasta pode ser guardada como conjunto, com nome, pasta, etiquetas e retrato. Biblioteca e gaveta oferecem conjuntos sem baixar seus corpos na listagem. Ao escolher uma cópia, a oficina lê a revisão escolhida e fixa o conteúdo no documento. A composição encosta inteira na superfície, conservando contatos e proporções. O nome atual do cartão não reescreve o nome histórico da revisão.

Editar conjunto abre sua fonte persistente na mesma oficina, usando fila, autosave, comandos, histórico e seleção existentes. O cabeçalho distingue rascunho de versão publicada. Somente **Atualizar cópias** publica o rascunho salvo. Alterações entre a partida do pedido e sua resposta não são apagadas por recarregamento automático do controlador.

O retorno à oficina de origem fica na rota. No host da comunidade, o endereço preserva a fonte e o retorno após recarregar; o decodificador aceita somente rotas conhecidas, UUIDs, até oito níveis e 4.096 caracteres. Abrir mundo por identidade usa a autorização já existente. Mundos internos de conjuntos continuam fora da lista normal de jogos.

O retrato usa o próprio palco, isolado da cena aberta, com fundo transparente, câmera enquadrada e sem chão, céu, grade ou alças. A fila fotografa uma composição por vez, aguarda modelos/texturas reais e recusa carga incompleta. Texturas, geometrias, observadores, sombras e contexto do palco de fotografia são liberados em sucesso, falha ou cancelamento. Não há outro motor ou inventário.

O envio guarda a revisão fotografada. Se uma resposta se perde e outra pessoa publica depois, repetir a operação confirma a publicação anterior e envia seu retrato à revisão anterior. A miniatura da publicação mais nova permanece intacta. Falha da fotografia não repete a criação/publicação: a interface oferece tentar somente o retrato.

## Revisão e correções comprovadas

- Arraste recusado: ensaio com alça nativa reproduziu prévia deslocada sem alteração autoral. A recusa restaura o documento; captura sem alças voltou ao mesmo hash.
- Cabeça nova durante arraste: o gesto da cabeça anterior é cancelado, sem publicar sobre a nova. Captura resultante confere com a nova cabeça aplicada diretamente.
- `pointercancel`: teste vermelho demonstrou publicação indevida ao soltar depois do cancelamento. O gesto agora se encerra e restaura a cabeça correta.
- Apoios externos: prévia usa os mesmos contatos do núcleo, incluindo cadeias e seleção simultânea de suporte e apoiado. Vinte transformações XYZ conferidas contra a expansão canônica, sem mover o documento nem transformar um selecionado duas vezes.
- Retrato após resposta perdida: teste vermelho publicou versões 4 e 5, repetiu a operação de 4 e mostrou a foto indo para 5. A correção fixa a revisão da operação; o ensaio passou nos quatro layouts, com foto de 4 e foto de 5 ausente.
- Diálogos: Esc respeita o estado ocupado; campos ficam indisponíveis durante o envio. Repetição de criação conserva operação e corpo; a interface identifica os dados fixados para tentar novamente.
- Troca de oficina/conexão: colocação e fotografia conferem a vida do pedido; retorno atrasado não coloca uma composição em outro mundo.

## Verificação local

| Verificação | Resultado |
|---|---|
| Núcleo | 155 testes, 3.954 asserções |
| Motor | 45 testes, 2.322 asserções |
| Oficina/hosts | 60 testes, 415 asserções |
| Members serviço/histórico/HTTP | 48 testes, 217 asserções |
| BFF e endereço | 28 testes, 155 asserções |
| Gateway | 5 testes, 285 asserções |
| Postgres descartável, porta 55439 | 33 testes, 300 asserções |
| Tipagem núcleo/motor/oficina | Aprovada |

`verificar-conjuntos-biblioteca.mjs`: claro/escuro em 1.440 px, claro em 1.024 px e escuro em 390 px com toque emulado. Criar da seleção, fotografia real, repetir envio, colocar, editar fonte, publicar em duas cenas, retornar, organizar, buscar e apagar catálogo preservando cópias. Sem erros de página/console.

`verificar-gestos-conjuntos.mjs`: alça nativa com aceitação, recusa, troca de cabeça e cancelamento. Falha de modelo recusa fotografia; aborto cancela a fila; oito fotografias válidas consecutivas não deixam canvas auxiliares no documento.

`verificar-conjuntos.mjs`: seleção/transformação/duplicação/separação/undo/reabertura em quatro configurações, com GLB real e iluminação diurna/noturna. Regressões de transferência e pincel também passaram nos quatro layouts. O toque é emulado; não são testes em aparelhos físicos.

Build do playground aprovado. Persiste o aviso de chunk do motor acima de 500 kB, a tratar no trabalho de eficiência. Não há aprovação de desempenho em celulares físicos.

## Pendências globais registradas

A tipagem integral da árvore compartilhada ainda falha em `members/src/domain/course-publication/jobs.ts:65` (`TS2589`) e `member-shell/src/server/pensa/context.ts:37` (entrada `map-set` ausente no mapeamento). Esses arquivos não foram alterados neste recorte; há trabalho paralelo do Pinta na mesma árvore. Não declarar tipagem global aprovada. Repetir e resolver antes do fechamento do lote 3 e do CI final.

Não houve migração ou implantação remota nesta etapa. A DDL 0160 e as anteriores seguem o procedimento de implantação final. As credenciais, catálogos privados, fontes GLB e projetos originais continuam fora do Git.

## Evidências

[Resultados dos quatro layouts](evidencias/lote3-conjuntos-biblioteca/resultados.json) · [Regressão e iluminação](evidencias/lote3-conjuntos-biblioteca/regressao.json) · [Vídeo da edição/publicação](evidencias/lote3-conjuntos-biblioteca/edicao-publicacao.webm).

| Vista | Desktop claro | Toque emulado, escuro |
|---|---|---|
| Cópia no palco | [1.440 px](evidencias/lote3-conjuntos-biblioteca/biblioteca-copia-light-1440.png) | [390 px](evidencias/lote3-conjuntos-biblioteca/biblioteca-copia-dark-390.png) |
| Fonte publicada | [1.440 px](evidencias/lote3-conjuntos-biblioteca/biblioteca-fonte-light-1440.png) | [390 px](evidencias/lote3-conjuntos-biblioteca/biblioteca-fonte-dark-390.png) |
| Catálogo | [1.440 px](evidencias/lote3-conjuntos-biblioteca/biblioteca-catalogo-light-1440.png) | [390 px](evidencias/lote3-conjuntos-biblioteca/biblioteca-catalogo-dark-390.png) |
| Cena noturna | [1.440 px](evidencias/lote3-conjuntos-biblioteca/conjunto-noite-light-1440.png) | [390 px](evidencias/lote3-conjuntos-biblioteca/conjunto-noite-dark-390.png) |

São ensaios da ferramenta com modelos reais e bases geométricas para contato. Não representam composição nem direção de arte final da Faísca.

Próxima parte: 3.7, retratos do histórico e eficiência. Depois 3.8, Testar com avatar e medidor. Lotes 4–10, revisão integral, implantação e validação em staging continuam pendentes.
