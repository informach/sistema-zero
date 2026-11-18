# Lote 6.2 — Caminhos integrados ao Palco — checkpoint

18/11/2026 · staging · continuação exclusiva do lote 6. Lotes 0–5 fechados; lote 6 ainda aberto.

## Implementado neste recorte

- `CaminhosDoPalco` desenha trilha, praça, estrada, cerca, muro e ponte a partir do documento. Mantém cache por configuração/modelo/textura e recursos próprios; não altera o acervo.
- Pisos de catálogo repetem o comprimento medido, recortam o último módulo e conservam UVs, cores e materiais. A curva usa as mesmas bissetrizes do núcleo; praças preservam contornos côncavos. Medidas/eixo/base são explícitos.
- Pisos e estruturas acompanham a grade física, buracos e recortes do terreno. Alteração de alturas conserva buffers dos pisos e invalida o picking; mudanças topológicas e estruturas com cabeceiras automáticas exigem remontagem.
- Cercas/muros e peças rígidas usam agrupamento por material/layout com `BatchedMesh`. Grupos de material com `drawRange` parcial são compactados antes do agrupamento. Materiais originais não são descartados pelo caminho.
- Cor/textura autorais são overrides privados. Projeção métrica respeita a transformação; textura e GLB originais continuam compartilhados. Decal nativo usa `polygonOffset`, sem deslocamento Y artificial e sem duplicar a colisão do terreno.
- Picking, contorno e enquadramento incluem caminhos. Estruturas devolvem a parte estável para o contrato de apoio existente. Pontes e sólidos de catálogo entram no modo Testar com a geometria desenhada; o vão não recebe piso invisível.
- Caminhos ocultos não desenham nem colidem, mas conservam suas partes para objetos que dependem deles. Reentrada antes da chegada do modelo conserva a pose guardada; novo apoio continua exigindo uma superfície disponível.
- Pilares medem a face inferior real do tabuleiro com a consulta física e conformam suas tampas ao terreno. A prova com modelos arqueados e os encontros de superfícies continuam pendentes; a prova nativa não equivale à aprovação de todos os GLBs.
- O adaptador da Faísca registra por digest o eixo X, base Y=0 e centro Z=0 das lajes do Templo. O motor genérico não adivinha orientação por nomes. A fotografia privada da conversão permanece imutável; a cópia do ensaio recebe a mesma curadoria de uma nova importação.

## Defeitos encontrados durante a integração

**Orçamento de recortes:** cada peça estava pagando também pelos contornos de lagos distantes. A prova com a Faísca atingiu o limite de trabalho. Filtrar contornos pela caixa real da malha antes da triangulação/classificação corrige a origem do custo; o limite permanece igual. Teste com contorno distante de 256 pontos e orçamento de 32 visitas preserva a parede local.

**Juntas das lajes e cápsula:** a regressão real parava em aproximadamente `(-1,65; 4,04; 127,57)`, enquanto a mesma simulação só com terreno alcançava a subida. Sondas mostraram o próximo topo apenas cerca de 6 mm acima dos pés. O autostep exigia 1 cm e uma normal lateral, embora a borda arredondada da cápsula possa produzir normais para cima. Além disso, sua única sonda à frente podia cair numa junta, deixando de reconhecer o topo sob outra parte do pé. A consulta agora confere até dez posições na área do pé, com a mesma folga de 0,1 mm da subida validada. Mantém limite de altura/inclinação, conferência de teto e prova de avanço. Não altera velocidade, gravidade nem altura do personagem. O diagnóstico compara cinco aproximações sobre terreno e sobre as lajes, com a altura nativa real; as dez simulações passaram após a correção e permanecem como regressão executável.

## Verificações registradas

| Verificação | Resultado |
|---|---|
| Núcleo completo | 262 testes / 10.147 asserções; nenhuma falha |
| Motor completo | 115 testes / 3.686 asserções; nenhuma falha |
| Oficina completa | 96 testes / 610 asserções; nenhuma falha |
| Conversão da Faísca | 2 testes / 3.130 asserções; nenhuma falha |
| Tipagem núcleo, motor, oficina e Arquipélago | aprovada |
| Build da oficina | aprovado; aviso conhecido de chunk acima de 500 kB permanece |
| Workers do build em Chrome local | terreno, PNG 16 bits e água aprovados; três workers JavaScript, sem erros |
| Chrome local, seis variantes | render sem erros; personagem de referência de 1,16 m apoiado no tabuleiro |
| Chrome local, caminho de terra real | GLB carregado, material conservado, capturas de dia/noite |
| Recursos, três ciclos | geometrias/texturas estáveis entre ciclos; acervo preservado |
| Regressores de colisão | parede fina, degrau alto, encosta íngreme, teto, salto e queda preservados |
| Percurso completo da Faísca com Cute Characters | aprovado: altura 1,17004 m; casa–praça 12,62 m; praça–horta 19,75 m; horta–ponte 47,00 m; retorno e subida ao Farol em Y=9,61 m, sem erros |

Ensaio isolado das seis variantes: 1.638 triângulos, 11 desenhos, 12 geometrias, 13 texturas. Caminho real de terra: 1.808 triângulos, 4 desenhos, 5 geometrias, 4 texturas. Números do Chrome desktop local; não homologam aparelhos físicos nem a Faísca inteira.

Roteiros: `verificar-caminhos-palco.mjs`, `diagnosticar-caminhos-faisca.mjs` e regressão existente `verificar-teste-faisca.mjs`, no playground da oficina. Capturas/vídeo/JSON em `output/cenarios-reforma/lote6-palco`, sem GLBs versionados.

Capturas de ensaio versionadas: [seis variantes](evidencias/lote6-palco/seis-variantes.png), [catálogo de dia](evidencias/lote6-palco/catalogo-dia.png), [catálogo à noite](evidencias/lote6-palco/catalogo-noite.png) e [medidas do ensaio](evidencias/lote6-palco/resultado.json). São provas de montagem isolada; não representam a composição artística final.

## O que impede fechar 6.2 e o lote 6

- Resolver encontros entre pisos de catálogo: a captura da Faísca evidencia sobreposição entre praça e trilha. Não considerar ausência de erros WebGL como prova de ausência de z-fighting.
- Conferir pilares com tabuleiros reais arqueados, bordas, aproximações, atualização de relevo e colisão em movimento.
- Repetir a regressão do Cute Characters depois do tratamento dos encontros. A versão atual passou até o Farol após a correção das juntas.
- Conferir custo do renderer na cena completa e recursos de dia/noite após ciclos.
- Depois da integração 6.2: autoria/worker/edição de pontos (6.3), aba Caminhos na interface aprovada (6.4) e fechamento técnico/visual do lote (6.5). A estrada ainda não tem sua nova interface de moldagem entregue.

Não há nova aba Caminhos concluída, direção de arte aprovada, implantação remota ou abertura de acesso. Lotes 7–10 permanecem não iniciados. CI, full review, composição final e implantação/validação em staging continuam no fechamento global, conforme a orientação da usuária.
