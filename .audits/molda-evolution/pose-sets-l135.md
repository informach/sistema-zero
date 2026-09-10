# Conjuntos de poses locais, lote 135

Captura e colagem preservam cada alvo explícito, inclusive apoios aninhados. A
colagem antiga de uma pose continua atuando nas raízes escolhidas; não alterar esse
contrato para corrigir o caso de conjuntos.

## Contratos e revisão

- `captureSceneAnimationLocalPoses` indexa hierarquia/trilhas uma vez. A captura
  individual agora usa o mesmo caminho. Clipboard do conjunto possui somente
  IDs, nomes e canais; não retém documento, guia efêmera, recursos ou vínculo vivo.
- `readSceneAnimationPoseSet` valida e copia entradas/canais, com teto de nós,
  IDs únicos, espaço uniforme, números finitos e quaternion aceito pelo contrato
  nativo. Valores autorais exatos não são normalizados ou arredondados para copiar.
- Pares precisam cobrir cada origem uma vez e usar destinos distintos. Origem
  vem do snapshot, não é relida da criação; trocas recíprocas não consomem um valor
  já substituído. Nomes e ordem da lista não determinam correspondência.
- Espelho mantém S * TRS * S local, com escala assinada preservada. Com bases
  simétricas, os testes provam reflexão da cadeia no referencial do pai comum.
  Isso não promete simetria em eixos globais sob pai afim nem retargeting entre
  rigs incompatíveis. Bases, limites de dobra e vínculos não são copiados.
- Único `setSceneAnimationKeys` valida todos os destinos, travas de subárvore e
  orçamento; nenhum documento intermediário por apoio. `sceneAnimationPoseKeys`
  é compartilhado com colagem simples e conserva a interpolação de cada destino.
  Repetição sem alteração mantém identidade. Um commit no editor dá um undo.

## Evidência

Sete testes novos de domínio: três eixos nos dois espaços, Three independente
com pai afim e apoios aninhados, dupla reflexão, trocas recíprocas, precisão e
propriedade, entradas inválidas, travas/orçamentos e captura de 512 nós. Teste
de pureza também cobre a entrada nova. Erros iniciais eram fixtures que incluíam
`kind` numa pose ou `space` numa transformação; corrigidas para respeitar ambos
os leitores estritos. Sem afrouxar leitores para aceitar fixture inválida.

Focais: 15 testes, zero falhas, 475 expectativas. Tipos e Biome/714 passaram.
Integral: 1.632 testes, zero falhas, 240 arquivos, 8.187.245 expectativas, 102,90 s.
Vite passou em 1,25 s; Three segue 579,29 kB com aviso >500 kB. Kids: compilação
21,3 s, tipos 9,7 s, 59 páginas em 876 ms, exit 0. Diff check passou. Controles
com prévia vêm no lote seguinte; formato público permanece 1.
