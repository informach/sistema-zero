# Lote 3 — Grade modular e encaixes

Data: 17/11/2026. Continuação após `ae77ee380`, na branch `staging`. **Parte interna do lote 3, que permanece aberto.**

## Implementação

- Painel recolhível de grade e encaixes na aba Objetos, mantendo a identidade do Molda: passo de posição, passo angular (inclusive 90°), origem X/Y/Z, altura/número do andar e encaixe em superfícies.
- Preferências separadas da autoria. Ajustar a grade não cria revisões. Girar a seleção e levar suas bases ao andar são ações explícitas que passam pela fila e pelo histórico existentes.
- A grade usa a origem configurada e acompanha o relevo ou o plano do andar. Em áreas grandes, sua visualização usa múltiplos do passo para limitar os recursos; o encaixe continua usando o passo configurado. A geometria da grade é reaproveitada enquanto seus parâmetros/base não mudarem.
- Colocação em andar respeita o pivô e a base real do modelo. Colocação em superfície usa a malha desenhada, não apenas a caixa envolvente; o ponto real tem prioridade sobre a quantização da grade.
- Consultas usam o `SceneSurfaceQuery` e o MeshBVH já disponíveis no Molda, com descarte próprio e sem escrever `boundsTree` nem alterar a geometria de renderização.
- Novo contato local opcional no apoio de objeto. O objeto apoiado acompanha a posição, rotação, escala e espelho do suporte. Os vínculos antigos, sem contato explícito, mantêm suas coordenadas já resolvidas.
- Ao mover com encaixe de superfície, a prévia e o lote final usam o mesmo apoio. A seleção é excluída da consulta para impedir autoapoio. Terreno continua sendo uma fonte explícita de altura.
- Medidas ausentes em documentos antigos são conferidas pelo GLB e gravadas no mesmo lote da colocação/gesto. A conferência inclui a cadeia dos suportes e pode ser desfeita.
- Movimento de uma pilha processa suportes antes dos dependentes, evitando aplicar a translação duas vezes. Duplicação preserva o deslocamento visível dos objetos com contato local.

## Testes e revisão

Verificação fresca: núcleo **71 testes / 303 asserções**, motor **29 / 470**, oficina e hosts **38 / 254**; **138 testes, nenhuma falha**. Tipagem dos três pacotes aprovada. Biome dos arquivos alterados e `git diff --check` aprovados.

Os testes conferem transformações/inversa com uma referência independente Three, origens negativas, limites de preferências, altura da base no andar, giros inclinados, apoios espelhados, cadeias/ciclos, bloqueios, undo, ausência de mutação e orçamento de grade. A consulta de rampa verifica a altura da malha, diferente do topo de sua caixa.

### Navegador local

- `verificar-espelho-troca.mjs <saída> --encaixes`: Chrome claro/escuro em 1440 px e escuro em 390 px. Preferências sem alteração autoral, giro de 90°, base a 6,25 m, desfazer, troca, cancelamento e reentrada aprovados. Um botão também foi exercitado por toque emulado. Nenhum erro de página ou transbordamento horizontal. O painel estreito foi inspecionado visualmente; os controles usam alvos de toque com checkbox de tamanho adequado.
- `verificar-superficies.mjs`: GLBs reais do banco, Ponte 4 (`ponte_04_pacote`) e Pontilhão de tábuas, inclinados, espelhados e com escala por eixo. Ponto de apoio sobre a malha, origem da grade e plano de andar aprovados. Dois arrastes reais das alças por modelo, com e sem encaixe de superfície, e órbita sem seleção acidental. O pontilhão tem frestas: o teste procura madeira visível, sem preencher os vãos com uma caixa de colisão fictícia.
- Regressão `verificar-terreno.mjs` na Faísca convertida: 523 instâncias, 54 peças de altura; colocação, ajuste e reentrada aprovados nos três tamanhos/temas. Altura do painel 3,999481 m e deslocamento retomado 1,001 m, sem erros.

Evidências sanitizadas: [evidencias/lote3-encaixes](evidencias/lote3-encaixes). GLBs, cabeças privadas e credenciais permanecem fora do Git.

## Limites e sequência

Encaixar não testa a jogabilidade nem garante que qualquer substituição posterior da geometria de um suporte conserve sua superfície original. Essa composição continua visível e editável na oficina. O ensaio com cápsula é parte posterior do mesmo lote 3.

Ainda faltam formas de rascunho, cor/textura por objeto, árvore/camadas/laço/área de transferência, espalhar, conjuntos vivos, retratos de revisão, otimizações e Testar. Não foram iniciados os pincéis do lote 4. Nenhuma aprovação artística da Faísca ou validação em dispositivos físicos foi atribuída a estes testes. Implantação e validação remota permanecem no encerramento global.
