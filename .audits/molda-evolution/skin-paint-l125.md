# Alcance visual do pincel: lote 125

## Entrega

`SceneBrushCursor` desenha uma referência circular no plano tangente atingido,
com raio em mundo. A normal usa a inversa transposta da matriz da instância;
espelhos preservam o acerto visível, enquanto a amostra de pesos desfaz somente
a reflexão para voltar ao espaço-mundo da peça original. Dois arrays próprios
de 384 floats (posição/cor), uma geometria e um material, criados apenas no
primeiro acerto desenhável. Segmentos claros/escuros permitem localizar o círculo
sem usar as cores de força/seleção. Sem preenchimento, textura ou animação.

O círculo é uma referência, não a fronteira exata da propagação pelas faces.
Ajuda contextual explica a diferença; controles numéricos e valores exatos
permanecem disponíveis. Padrões de interface orientaram reaproveitar a faixa
existente e não abrir outro painel. Cursor não é interativo e não muda alvos de
toque, foco, números autorais ou comportamento de forças.

Hover usa uma consulta real da superfície; movimento capturado reutiliza a
consulta do pincel, sem duplicar raycast. Sem escrita de documento/estado React.
Movimentos idênticos não alteram recursos nem pedem quadros. Limpeza cobre saída,
acerto ausente, navegação, troca de raio/alvo/ferramenta, cancelamento, revisão,
blur, contexto, pose e descarte. Miniatura conserva o círculo e o traço.

Guia fora da representação Float32 é ocultado, sem limitar o raio válido do
domínio nem arredondar pesos. Normais são normalizadas por divisão de componentes,
evitando overflow do recíproco em valores subnormais. Recursos têm descarte único.

## Revisão e verificação

- Primeiro teste de hover omitia a seleção exigida para forma-base. Corrigida a
  fixture, sem mudar a regra do produto.
- Vermelho/verde: após blur, o hover podia consultar a matriz anterior da câmera
  antes do próximo frame. `sceneSurfaceHit` agora atualiza matriz de mundo/inversa
  da câmera ao consultar, incluindo ancestrais. O teste retoma antes do render,
  sem inserir espera artificial; cobre também restauração de contexto.
- Focal: 61 testes/5 arquivos, zero falhas, 916 expectativas, 3,08 s. Three real
  verifica plano/raio sob shear/espelho, propriedade, descarte e 11 términos de
  traço. Testes de pintura de imagem cobrem a consulta compartilhada. Happy DOM
  verifica controles/raio/StrictMode; só a fronteira GPU do viewport é substituída.
- Integral: **1.549 testes, zero falhas, 230 arquivos, 98,05 s**. Tipos,
  Biome/693 arquivos e Vite/943 ms passaram. Kids: compilação/6,3 s, tipos/11,9 s,
  59 páginas/656 ms, exit 0. Diff check passou; chunk Three 579,29 kB ainda avisa.

Sem nova medição de latência em hardware, teste visual, GPU ou toque real. O acesso
ao navegador permanece indisponível, como registrado nos lotes anteriores.
Faltam interpolação entre eventos e custo extremo de preparação. Não há alteração
Studio, formato público/cloud ou implantação. A validação completa das fases
continua separada desta entrega interna.

Consulta técnica: documentação oficial Three via Context7, `Matrix3.getNormalMatrix`,
`Vector3.applyNormalMatrix`, `LineSegments` e descarte de buffers/materiais:
https://github.com/mrdoob/three.js/blob/dev/docs/pages/Vector3.html
