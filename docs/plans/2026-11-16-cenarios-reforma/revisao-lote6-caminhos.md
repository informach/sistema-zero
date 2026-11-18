# Lote 6 — Caminhos: revisão e fechamento local

18/11/2026 · continuidade de `e0b1af8b9`. **Lote 6 implementado, testado e revisado localmente.** O envio à staging preserva o trabalho; implantação e validação remotas continuam no encerramento global, conforme a orientação da usuária.

## Cobertura da especificação

| Requisito | Implementação e prova |
|---|---|
| Trilha e praça | Pontos no chão, curvas/polígono, dimensões e UV em metros; pisos seguem os mesmos triângulos, máscaras e recortes do terreno |
| Estrada | Molde limitado em uma cópia do campo; estrada e recurso publicados em uma revisão; edição de acabamento pode preservar o relevo |
| Cerca e muro | Módulos medidos em X/Z, parâmetros de altura e comprimento, encaixes e apoios no relevo; colisão da geometria visível |
| Ponte | Cabeceiras e piso medidos, peça nativa ou GLB de catálogo, guardas/pilares, vão sem piso fictício, avisos de invasão e juntas |
| Arte do catálogo | Modelos/texturas pela biblioteca existente, referências por conteúdo, medidas explícitas e preservação dos originais |
| Pontos na cena | Criar, selecionar, arrastar, inserir e remover; órbita, Escape e segundo dedo; coordenadas numéricas e direção/fechamento |
| Autoria | Worker cancelável, dono único da prévia, cabeça antiga recusada, no-op, falha/retomada e undo/redo duráveis |
| Interface | Seis ferramentas no rail, controles Molda, avisos, visibilidade/camada, copiar/colar/remover e reabertura nos layouts previstos |
| Seleção comum | Objetos, caminhos e água no retângulo/laço, soma por teclado/toque, árvore e clipboard; escolha não cria revisão |
| Física e recursos | Desenho, picking e Testar compartilham as malhas; descarte e reconstrução estáveis após três ciclos |

As revisões anteriores preservam os detalhes: [núcleo e apoios](checkpoint-lote6-estruturas-apoios.md), [conformação](checkpoint-lote6-conformacao.md), [encontros sem sobreposição](checkpoint-lote6-encontros.md), [pontes reais](checkpoint-lote6-pontes.md), [relevo e módulos](checkpoint-lote6-renderer-fechamento.md), [gestos/autoria](checkpoint-lote6-pontos-autoria.md) e [interface](checkpoint-lote6-interface.md).

## Correções da revisão integral

O teste com uma tampa inclinada reproduziu um desvio de 10,8 mm num objeto apoiado fora do centro de um pilar ao elevar a ponte. O envelope da peça não descreve a forma de suas tampas. A consulta já existente de partes agora oferece o perfil vertical das mesmas faces usadas na conformação. O contato guarda a fração da altura entre chão e tampa naquele ponto, conservando largura, posição e deslocamento. A consulta é apenas em memória, sem esquema paralelo de persistência. Sem a geometria, a pose publicada é conservada; criar um contato novo exige as tampas carregadas.

O caso passou após a correção. Nos três GLBs reais, 16 contatos por ponte acompanharam uma elevação de 3 m, com erro máximo inferior a 0,001 mm. A conformação, a travessia e os recursos permaneceram estáveis. Não foi alterado o controlador do personagem para acomodar uma peça.

A revisão também encontrou a lacuna de seleção por área de caminhos e águas. O controlador existente conserva esses IDs junto dos objetos; a árvore inclui os descendentes selecionáveis sem mudar o contrato dos objetos transformáveis. A seleção mista pode ser organizada, copiada, duplicada e removida pelo mesmo histórico. O gizmo de objetos fica desligado nessa escolha para não mover silenciosamente apenas parte dela; a geometria de cada caminho continua editável por seus pontos.

Um ensaio adicional reproduziu o comportamento de `waitForFunction(async () => false)` no Playwright usado aqui: retorna um handle para `false`, sem repetir a consulta. As esperas assíncronas dos ensaios afetados passaram a conferir o resultado resolvido em cada tentativa. A prova separada exige três consultas antes de confirmar e também testa a expiração. Os fluxos de interface, seleção, água, workers e moldes foram repetidos com essa espera correta. Não foi adicionada uma pausa fixa para esconder a corrida.

## Verificações

| Verificação | Resultado |
|---|---|
| Núcleo | 276 testes / 10.216 asserções, sem falhas |
| Motor | 126 testes / 3.784 asserções, sem falhas |
| Oficina e hosts | 101 testes / 652 asserções, sem falhas |
| Members serviço, HTTP e histórico | 51 testes / 244 asserções |
| BFF | 37 testes / 197 asserções |
| Gateway e política Kids | 18 testes / 454 asserções |
| PostgreSQL real | 40 testes / 358 asserções |
| Conversão da Faísca | 2 testes / 3.130 asserções |
| Tipagem | núcleo, motor, oficina, Members e member-shell aprovados |
| Build | oficina aprovada; quatro workers JavaScript compilados executados |
| Biome e diff | arquivos alterados conferidos, sem falhas |

A interface criou as seis variantes, arrastou alças, escolheu modelo/textura, cancelou, guardou, ocultou/mostrou, copiou/colou/removeu e reabriu o cenário com a camada conservada. O modelo e a textura são publicados junto do caminho, sem criar uma instância adicional. A troca de camada e a reabertura foram verificadas pelo host e pelos controles da oficina. Quatro layouts (1.440, 1.366, 1.024, 390 px), temas claro/escuro, painel recolhido e valores conservados no celular emulado passaram.

Retângulo/laço de uma escolha com objetos, caminho e lago passaram em 1.440 px claro/escuro e 390 px com toque emulado: somar, ignorar ocultos/trancados, cancelar por Escape/segundo dedo, duplicar, apagar e desfazer sem perder elementos. O núcleo e o host também conferem seleção conservada após salvar/desfazer e referências de clipboard sem duplicação.

As pontes Adventure Land, Reino e Temple foram atravessadas nos dois sentidos, com chegada apoiada. As tampas tiveram 3.192 amostras comparadas com a geometria real do tabuleiro. Nos três ciclos, o ensaio manteve 10 geometrias, 11 texturas, 10 desenhos e 11.023 triângulos. Estrada, cerca e muro no relevo mantiveram 5 geometrias, 11 texturas, 5 desenhos e 31.014 triângulos; foram conferidos 1.774 contatos de base, a colisão do muro e a preservação dos GLBs e do campo original.

## Issue 267 e Faísca

A moldagem de estrada foi aplicada ao mesmo terreno usado para resolver uma montagem e um objeto apoiado nela. Raiz, alça, peça e dependente acompanharam o campo novo; a prévia de mover conservou as relações, sem alterar a definição ou o documento de origem. O teste cobre tanto escultura quanto estrada.

O percurso integral da Faísca convertida foi repetido com o Cute Characters de 1,17004 m. Casa–praça: 12,669 m caminhados; praça–horta: 19,364 m; horta–ponte: 43,233 m. O avatar alcançou o Farol na cota 9,613 m, com o documento autoral preservado e sem erro no navegador. Foram exercitados primeira e terceira pessoa. As provas anteriores de margem, nado e toque permanecem acompanhadas pela regressão de água.

O coração compacto, a geografia, a narrativa, o inventário, a velocidade e a identidade dos aplicativos não foram redefinidos por este lote. O caso da Faísca valida o uso da ferramenta e a circulação. **Não constitui aceite artístico da composição final.**

## Evidências e limites

[Seleção comum](evidencias/lote6-fechamento/selecao.png) · [Toque emulado](evidencias/lote6-fechamento/selecao-toque.png) · [Resultados da seleção](evidencias/lote6-fechamento/selecao.json) · [Pontes e contatos](evidencias/lote6-fechamento/pontes.json) · [Relevo e recursos](evidencias/lote6-fechamento/relevo.json) · [Interface e reabertura](evidencias/lote6-fechamento/interface.json) · [Água](evidencias/lote6-fechamento/agua.json) · [Workers](evidencias/lote6-fechamento/workers.json) · [Percurso medido](evidencias/lote6-fechamento/faisca.json) · [Vídeo integral do percurso](evidencias/lote6-fechamento/percurso-faisca.mp4) · [Chegada ao Farol](evidencias/lote6-fechamento/farol.png).

Provas em Chrome local e emulação, com hosts de laboratório e PostgreSQL local. Não afirmar homologação de aparelhos físicos nem publicação remota. O aviso de chunk acima de 500 kB permanece registrado (motor aproximadamente 905 kB, 243 kB gzip), sem afrouxar o limite para ocultá-lo. Capturas não aprovam animação/IK. O vídeo registra movimento, mas seu aceite perceptivo e a direção de arte continuam sujeitos à avaliação final.

**Próxima frente exclusiva: lote 7 — Jogo, luz e céu.** Depois dele, lotes 8–10, composição final pela ferramenta, full review, CI, implantação e validação em staging. A tarefa global continua aberta.
