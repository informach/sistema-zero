# Animações bbmodel — pesquisa e limites do lote 198

Fontes primárias lidas no commit 47e633e4a1338f957ee7baa0acbcf54da11e77df.
Código consultado como referência de formato; não copiado nem executado.

- [Animation](https://github.com/JannisX11/blockbench/blob/47e633e4a1338f957ee7baa0acbcf54da11e77df/js/animations/animation.js):
  serializa UUID, nome, loop, override, length, snapping, seleção, propriedades,
  marcadores e mapa de animadores. Loop admite once/loop/hold. Snapping nasce da
  preferência da sessão e é limitado pelo aplicativo a 10–500; não inferir FPS
  nativo a partir de sua ausência. A duração do aplicativo considera suas chaves
  e limite próprio; leitura de metadata guarda o valor declarado, não aplica esse
  comportamento. Campos temporais Molang incluem anim_time_update, blend_weight,
  start_delay e loop_delay. Path/group_name/scope têm contexto de formato/sessão.
- [GeneralAnimator e derivados](https://github.com/JannisX11/blockbench/blob/47e633e4a1338f957ee7baa0acbcf54da11e77df/js/animations/timeline_animators.js):
  mapa serializa nome/tipo/propriedades e uma lista de chaves. Bone usa rotation,
  position e scale; armature_bone/null_object/effect têm contratos distintos.
  Effects pode trazer sons, partículas e scripts. Não adotar nem executar.
  Flags de rotação global e interpolação quaternion precisam de política posterior.
  Construtor também suporta referências antigas por nome; estrutura não resolve
  essa referência nem escolhe arbitrariamente uma peça.
- [Keyframe](https://github.com/JannisX11/blockbench/blob/47e633e4a1338f957ee7baa0acbcf54da11e77df/js/animations/keyframe.js):
  serializa canal, data_points, UUID e propriedades de tempo/interpolação/Bezier.
  Valores podem ser strings ou números. Ausência/lista vazia de data_points usa
  o caminho legado de propriedades diretas; reservar pelo menos um slot por
  chave, sem interpretar seu valor nesta etapa. Transformações comportam dois
  pontos (descontinuidade); effects permite até mil. A cardinalidade sozinha
  não aprova esses canais ou interpolações.
- [TimelineMarker](https://github.com/JannisX11/blockbench/blob/47e633e4a1338f957ee7baa0acbcf54da11e77df/js/animations/timeline.js):
  marcador guarda tempo, cor e nome. O nome inicial é o número zero; preservar
  esse caso de origem, sem convertê-lo silenciosamente em texto.
- [Property](https://github.com/JannisX11/blockbench/blob/47e633e4a1338f957ee7baa0acbcf54da11e77df/js/util/property.ts):
  propriedades Molang podem conter números ou strings; não usar eval/parser
  Molang na plataforma. Leituras de números finitos preservam F64 e zero assinado.
- [Codec bbmodel](https://github.com/JannisX11/blockbench/blob/47e633e4a1338f957ee7baa0acbcf54da11e77df/js/formats/bbmodel.js):
  migração anterior a 5.0 inverte X em posição/rotação e Y em rotação, incluindo
  handles de valor Bezier. Isso pertence à conversão de valores futura, não à
  leitura imutável dos metadados de origem.

Plano privado: cardinalidades agregadas de clipes, animadores, chaves, slots de
dados e marcadores antes de números/expressões e arrays próprios de chaves.
Tetos de entrada distintos dos limites nativos (64 clipes/65.536 chaves).
Guardar cabeçalhos e referências raw somente leitura para o leitor de chaves
seguinte; não afirmar validação das curvas, target bindings ou cobertura de campos
restantes. A composição estática e as escolhas de omit/reject continuam como antes.

## Chaves e curvas — preparação do lote seguinte

Trechos adicionais dos mesmos arquivos consultados em 09/09/2026:

- `keyframe.js` 1–164 e 554–630: keyframe padrão channel rotation, time zero,
  color -1, interpolation linear. Uniform é preferência de edição para escala,
  não replicação automática do valor X na leitura. Bezier tem linked true,
  left_time (-0,1 nos três eixos), right_time (0,1), handles de valor zero.
  O serializer remove campos Bezier quando a interpolação não é Bezier; campos
  conhecidos presentes ainda precisam de leitura/relatório, não ignorância silenciosa.
- DataPoint usa x/y/z Molang com defaults string '1' na escala e '0' nos demais
  canais de transformação. `values` é alias legado mesclado sobre o point pelo
  aplicativo; não adotar alias silenciosamente na leitura canônica. Efeitos podem
  conter paths/scripts e iniciar IO no aplicativo; não instanciar essas classes.
- `timeline_animators.js` 310–689: transformação de grupo adiciona posição ao
  rest local e graus Euler à rotação-base; não equivale genericamente a base ×
  deltaTRS nativo. Rotação global cancela a orientação do pai. Escala usa produto
  com piso quando zero; não imitar piso imperceptível sem política explícita.
- Interpolação depende dos dois extremos: step anterior mantém a chave; Catmull
  em qualquer extremo tem precedência sobre Bezier. Rotação quaternion tem caminho
  próprio. Há tolerância temporal 1/1200 e tratamento de pre/post no aplicativo;
  não copiar essas aproximações nem prometer identidade sem decisão de conversão.
- `keyframe.js` 177–342: linear usa post do primeiro ponto e pre do próximo.
  Catmull usa SplineCurve 2D com vizinhos e regras de loop/descontinuidade. Bezier
  restringe handles de tempo ao intervalo e aproxima a inversão com 201 amostras;
  aproximação de exibição de origem difere da curva matemática contínua. Curvas
  nativas smooth não equivalem a Catmull-Rom ou a Bezier.
- `timeline_animators.js` 770–831 e 960–1007: armature_bone e null_object derivam
  de BoneAnimator, mas têm comportamento de pose/IK próprio. NullObject só declara
  posição; três canais TRS para bone/armature_bone não autorizam desconhecidos.

## Constantes — preparação do lote 200

Blockbench `package.json` no commit fixado declara molangjs ^1.7.0, e
`js/animations/animation_mode.js` 1–17 instancia esse parser. Nenhuma instância
foi executada no Molda. Npm metadata localizou a fonte
[MolangJS](https://github.com/JannisX11/MolangJS), versão declarada 1.7.0,
commit master resolvido por `git ls-remote` e relido em
`f1cf8548b756c8a2f2f2277cc23099e503f53e49`.

No [leitor de origem](https://github.com/JannisX11/MolangJS/blob/f1cf8548b756c8a2f2f2277cc23099e503f53e49/src/molang.js),
79–122 reconhecem números decimais com parte inteira, menos opcional e fração
opcional (com sufixo f somente após a fração). 613–630 mostram o caminho rápido
para strings curtas e o caminho que remove whitespace/converte lowercase antes
de interpretar. Não confundir toda a gramática Number do JavaScript com literais
desse parser: expoentes, hexadecimal, ponto inicial/final e operadores não têm
aprovação automática. Fonte numérica/resultado do caminho longo normaliza -0 por
fallback `|| 0`, enquanto literal curto pode preservar -0; leitura de origem
continua preservando seus dados, sem afirmar equivalência bit a bit do parser.

Decisão: classificador próprio de subconjunto literal, sem avaliar sequer uma
expressão constante. Whitespace só externo; texto interno permanece não resolvido.
Números/decimais finitos podem virar constantes; overflow literal fica diagnóstico
separado, nunca zero. Strings desconhecidas continuam inertes e explícitas. Sem
copiar a implementação do parser, instalar dependência ou interpretar Molang.

## Vínculos — pesquisa para o lote seguinte

- `animation.js` 33–134: effects é especial pela chave literal. Bone/tipo ausente
  usa UUID quando `isUUID` aceita; caso contrário busca o nome do grupo pela
  chave em lowercase. Tipos não bone procuram elementos com constructor.animator.
  Não usar o nome decorativo declarado como prioridade sobre um UUID existente.
- `math_util.js` 2–20: isUUID exige 36 caracteres, grupos hexadecimais 8/4/4/4/12
  exclusivamente lowercase; sem exigência de bits de versão/variant RFC. Não
  lowercase-normalizar IDs; isso mudaria a referência de origem. O grafo mantém
  IDs literais, mas o formato da referência de animação tem essa regra adicional.
- `animation.js` 357–391: após abertura, getBoneAnimator pode religar um animador
  órfão usando _name em lowercase e ainda sem grupo. É heurística de estado do
  aplicativo, não autorização para adivinhar destinos. Duplicidades/colisões
  precisam ser explícitas; não escolher o primeiro nome silenciosamente.
- `timeline_animators.js` 227–242 e 640–646: BoneAnimator recebe grupos; lookup
  de UUID cru usa OutlinerNode, mas a reprodução chama apenas nós com animator.
  `outliner_element.ts` declara animator opcional e bloqueia seleção de elementos
  não animáveis; mesh.js não declara animator. Não transformar automaticamente
  referências de bone a cubos/malhas em movimentos nativos diretos.
- `formats/generic.ts` completo (31 linhas): free habilita per-animator rotation
  interpolation, bone rig, armature rig e animação. Defaults globais e semântica
  de IK continuam precisando de conferência para conversão, não inferência por
  presença de canal. Não aprovar armature/null apenas por conhecer seus valores.

Revisão 201: `timeline_animators.js` 70–90, em especial addKeyframe, confere o
canal ANTES de instanciar Keyframe; `animation.js` 120–126 carrega usando esse
método. O default rotation do construtor não se aplica a chave sem canal no
arquivo. Corrigido o leitor 199 para exigir declaração string não vazia;
regressão com JSON realmente sem channel, sem geração de movimento.

Preparação de trilhas: `format.ts` registra euler_order default ZYX e booleans
quaternion_interpolation/animation_loop_wrapping sem default explícito; Property
usa false para boolean. Free habilita per_animator_rotation_interpolation, não
os dois booleans globais. `animation.js` 263–290 confirma once/loop/hold distintos
e tolerância de loop própria; 440–455 ignora última chave Catmull de cada animador
no cálculo getMaxLength. Não descartar uma chave fora da duração que ainda serve
de vizinha para uma curva. addKeyframe apenas acrescenta a chave, sem resolver
tempos duplicados automaticamente. Nenhuma dessas regras foi amostrada/executada.

## Trilhas — revisão da migração pré-5 no lote 202

Codec `bbmodel.js` 72–100 (cópia fixada já pesquisada) e `keyframe.js` 65–164
foram conferidos em conjunto. A migração itera `data_points` antes do fallback
direto do construtor: campo ausente não equivale a lista vazia. Lista vazia usa
XYZ direto sem inversão; pontos explícitos têm X/XY invertidos antes do overlay
`values`. Portanto eixos efetivos sobrescritos pelo alias não são invertidos.
Valor-pai truthy incompatível com string/number pode falhar nessa reescrita antes
mesmo do overlay; não esconder esse caso por um alias válido.

Handles de VALOR só são invertidos quando a chave declara interpolation bezier
e bezier_left_value; a origem então acessa também bezier_right_value, sem guard
independente. Left-only antigo é não resolvido; right-only não é invertido,
handles inativos e vetores de TEMPO permanecem intactos. Defaults do construtor
não podem reparar silenciosamente uma falha anterior da migração.

`js/util/molang.ts` 1–85: inversão de string decimal canônica passa por
Number.toString; se produz notação científica, o texto voltaria a uma gramática
não aprovada pelo classificador 200. Preparação sinaliza legacy-literal-rewrite
nesses casos, sem parser nem suposição de resultado zero. Número JSON não passa
por essa serialização. Alias efetivo não passa pela inversão do valor-pai.
Constantes zero mantêm sinal no descritor numérico, sem promessa de identidade
bit a bit com os fallbacks do parser; canonicalização nativa é etapa posterior.

Preparação não aprova sampling: tolerância estrita (`abs(delta) < 1/1200`),
precedência da chave anterior mesmo próxima de uma chave exata, pre/post,
vizinho Catmull com loop e aproximação Bezier seguem sendo questões de conversão.
Trechos 400–640 de timeline_animators e 177–340 de keyframe foram relidos para
o lote seguinte; nenhuma implementação GPL foi incorporada ou executada.

## Poses e reprodução — preparação depois das agendas (204)

`animation.js` 1–177: extend aplica setLength antes de carregar keyframes e não
chama setLength novamente ao terminar. Não confundir length carregado com
getMaxLength, que só considera keys quando consultado depois. Trechos 263–290 e
440–455 foram relidos: modos temporais once/loop/hold, limite setLength e omissão
da última key Catmull de cada animador em getMaxLength. Uma agenda recebe duração
nativa explícita; não decide essas adaptações nem infere FPS de snapping.

`animation_mode.js` 99–117: showDefaultPose restaura fix_rotation/fix_position e
põe escala 1 nos animadores que têm canal de escala. 314–344: stack ordena clipes
tocando (selecionado por último), pula once após length positivo, usa peso 1 para
blend_weight falsy, senão interpreta/clampa peso ao mínimo zero. Logo number 0
e string '0' não seguem o mesmo caminho. Isso não autoriza executar parser.

`timeline_animators.js` 376–428: posição adiciona deslocamento ponderado à base;
rotação adiciona radianos ponderados aos ângulos-base, não multiplica base × delta
quaternion. Escala usa 1+(valor-1)*peso e troca zero por 0,00001; preservar zero
nativo ou aplicar mínimo da origem exige escolha explícita. rotation_global
cancela orientação do pai mesmo se não houver array/chave de rotação, pois o
bloco fica fora da condição arr. Não ignorar esse flag em animador sem keys.

`keyframe.js` busca completa por quaternion_interpolation só encontrou getFixed
(linha 294): no modo per-animator, esse método lê a propriedade da KEY, enquanto
interpolate lê a propriedade do ANIMATOR. Não inferir composição base × delta
para o caminho quaternion sem investigação adicional; parser/plugin/código da
origem não foi executado. A conversão local Euler fica separada dessa aprovação
e da rotação global/IK e da combinação de múltiplos clipes.

## Planejamento de clipes independentes (207)

Relidos `animation_mode.js` 314–348 e ocorrências de campos de tempo em
`animation.js` no mesmo commit fixado. O peso é default 1 para fonte falsy;
caso truthy passa pelo parser/clamp ao mínimo zero. Nosso conversor só classifica
literais, sem executar esse parser. Number 0 e string '0' seguem caminhos distintos.
Os campos anim_time_update/start_delay/loop_delay permanecem conservadoramente
não suportados quando diferentes da string vazia, não descartados como se fossem
defaults ou declarados equivalentes à reprodução nativa.

Reprodução nativa é uma adaptação independente. Relatório guarda once/hold/loop
de origem e nativeLoop; não promete o fim de once, offset de loop ou stack.
Fit-keys é escolha do Molda e inclui a última key Catmull, não imita getMaxLength.
