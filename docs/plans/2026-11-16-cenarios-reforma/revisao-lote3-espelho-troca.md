# Lote 3 — Espelho e troca de modelos

Data: 17/11/2026. Branch: `staging`. Parte interna do lote 3; **não encerra o lote**.

## Implementado

- Espelhar a seleção nos eixos locais X/Y/Z, dentro do volume do modelo, sem mover o pivô, alterar as proporções ou perder o apoio.
- Variantes instanciadas com geometria refletida, faces, normais e tangentes corrigidas. Matrizes de instância continuam positivas. A origem GLB não é modificada; variantes equivalentes compartilham recursos e saem da memória quando deixam de ser utilizadas.
- Trocar o modelo de uma seleção pela gaveta existente, conservando a base visual, posição X/Z, rotação, escala e propriedades. Ajuste explícito dos vínculos de terreno, objeto e água para a diferença de pivô.
- Referências de outra revisão ou medidas diferentes recebem identificadores próprios; colocar ou trocar um modelo não sobrescreve a referência de peças fora da seleção.
- Ações passam pela fila e pelo histórico existentes. A conferência de medidas de documentos antigos integra o mesmo lote da ação e não grava apenas ao abrir.
- Cancelamento da troca e proteção contra resultado assíncrono de importação cancelada. Em tela estreita, iniciar a troca recolhe o painel para liberar a biblioteca e o botão de cancelar.

## Verificação e revisão

Núcleo: **67 testes / 273 asserções**. Motor: **26 / 177**. Oficina e hosts: **36 / 237**. Nenhuma falha. Tipagem dos três pacotes aprovada.

Os testes cobrem pivôs diferentes, rotações inclinadas, escalas por eixo, relevo explícito, apoios, bloqueio atômico, isolamento de referências, desfazer/refazer, faces indexadas e não indexadas, UVs intercaladas/compartilhadas, atributos quantizados e descarte. A revisão eliminou duplicação da conferência de medidas entre as ações.

`verificar-espelho-troca.mjs` exercita a oficina com dois GLBs reais (poço e banco), nos temas claro/escuro em 1440 px e escuro em 390 px. Espelho, cancelamento, troca, desfazer, refazer e reentrada passaram nas três vistas; nenhum erro de página ou rolagem horizontal. O primeiro ensaio descobriu o painel interceptando o cancelamento em 390 px: o fluxo foi corrigido e o ensaio repetido sem forçar cliques. Ambiente estreito emulado, sem alegação de teste em aparelho físico. Miniaturas locais são imagens vazias de ensaio; não representam a publicação da biblioteca.

Evidências em [evidencias/lote3-espelho-troca](evidencias/lote3-espelho-troca). Não são aprovação artística da Faísca.

## Próximo trabalho e limites

Continuar o mesmo lote 3 pela grade modular, encaixes e demais itens do [plano detalhado](../../superpowers/plans/2026-11-17-cenarios-lote3-objetos-ensaio.md). Grade configurável, formas, camadas, espalhar, conjuntos vivos, retratos de revisão, otimizações e teste jogável ainda não estão concluídos. Não iniciar as ferramentas dos lotes 4–10. Implantação e validação remota ficam para o encerramento global, conforme orientação da usuária.
