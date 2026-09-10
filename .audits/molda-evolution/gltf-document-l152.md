# Composição da leitura GLB/glTF, lote 152

## Entrada de fonte, não importação nativa

`readGltfDocument` reúne os leitores existentes em ordem explícita: envelope,
extensões, orçamento conjunto/recursos, accessors, aparência, malhas/UVs, câmeras,
grafo, skins, influências e animações. O resultado `ready` contém uma fonte glTF
própria para as próximas etapas, não um MoldaSceneDocument pronto para gravar.
`missing` reúne paths exatos de recursos sem documento parcial ou fetch implícito.

Reusar os leitores, sem repetir suas regras no coordenador. Isso impede uma
montagem esquecer a quantidade de materiais, a checagem de UV, os papéis numéricos
de views de imagem ou os valores de skin/animação. Câmeras são lidas antes de
validar referências no grafo, não aceitas apenas pelo comprimento do array bruto.

Manter JSON original/extras inertes para relatórios de perdas/extensões. Não
reter `envelope.bin` no resultado: recursos já possuem sua cópia compartilhada
própria. Accessors e recursos pertencem à fonte e são imutáveis por contrato.
Nenhum buffer do arquivo escolhido/documento ativo é transferido ou alterado.

Pixels não são decodificados nesta etapa. `ready` não significa PNG/JPEG já
validado, extensões compreendidas, seleção de cena, conversão ou aceite nativo.
O decoder selecionado mantém o orçamento separado de pixels; seleção de cena
continua explícita e sem mesclar cenas quando falta default. Não é um validador
glTF completo nem uma API que executa payloads externos.

## Extensões

- Listas presentes não vazias, nomes textuais únicos e required contido em used.
  Um nome textual desconhecido permanece desconhecido; não inferir suporte por
  prefixo ou pelo que o Three suporta. Esta implementação ainda é core-only.
- Qualquer extensão obrigatória é `unsupported` antes de abrir os recursos.
  Opcionais ficam em `unhandled` e ocorrências com caminho, para revisão posterior.
  Nenhum fallback automático é aprovado para gravar no projeto.
- Inventariar somente pontos de extensão do schema: raiz/asset/tabelas core,
  primitives, sparse e seus campos, mapas PBR, projeções, samplers/canais/alvos.
  Não percorrer extras ou o interior de payloads desconhecidos procurando chaves
  chamadas extensions; isso geraria falsos usos e interpretação indevida.
- Uso em ponto conhecido precisa estar declarado e possuir payload objeto.
  Objetos core malformados seguem para o leitor estrutural correspondente.
- Tetos: 1.024 nomes por lista e 65.536 ocorrências. Envelope já limita JSON a
  32 MiB, profundidade 128 e um milhão de estruturas. Inventário não copia payloads.

## Câmeras

1.024 projeções no máximo; perspectiva/ortográfica exclusivas. Preservar nome,
fov em radianos, planos e proporção. `aspectRatio` ausente é null (viewport),
`zfar` ausente na perspectiva é null (projeção infinita), sem inventar parâmetros.
Campos exigidos precisam ser finitos; perspectiva positiva, planos em ordem,
znear ortográfico permite zero e magnificação não pode ser zero.

A especificação recomenda, mas não exige, yfov menor que π e magnificação positiva.
Preservar valores válidos fora dessas recomendações. Não clamp, criar matrizes,
alterar câmera da oficina ou materializar objetos nativos. Câmeras importáveis
continuam dependentes da política de conversão/perdas.

## Review e testes

- Câmeras: defaults/ausência, ownership, null/holes/referências, projeções
  exclusivas, planos, números extremos, tipos desconhecidos e teto exato.
  GLB real validado por Khronos e parâmetros confrontados com câmeras Three.
- Inventário de 29 pontos distintos, ignorando extras/payloads aninhados;
  manifestos inválidos e limites exatos. Nenhum executor/mock de extensão.
- GLBs de malha pintada/animada e de IK/poses espelhadas passam por toda a entrada.
  Pixels selecionados e samplers resultantes funcionam nas etapas existentes.
- Três bindings usam uma malha compartilhada, não três cópias. Expectativa inicial
  da fixture corrigida após observar esse contrato real, sem alterar o leitor.
- Recursos externos retornam todos os paths, tentativas seguintes são novas e
  isoladas; bytes fonte não mudam quando os dados retornados são alterados no teste.
- Extensão obrigatória impede getter dos arquivos; extras e chave `__proto__`
  permanecem dados próprios sem modificar protótipos.
- UV obrigatório ausente, view numérica usada como imagem e câmera inválida são
  recusados na entrada composta. Bytes Float32 de tempos e pesos corrompidos em
  GLBs reais são recusados pelos gates de domínio correspondentes.
- Tipo explícito no getter da fixture que lança erro para provar ausência de
  acesso; nenhuma supressão ou enfraquecimento de verificação.

Sem nova dependência, worker/UI/persistência ou alteração do formato público.

## Evidência

Focais: 242 testes, zero falhas, 23 arquivos, 25.046 asserts, 6,07 s. Biome: 796
arquivos sem problemas. Tipos passaram. Integral: 1.867 testes, zero falhas,
262 arquivos, 8.221.041 asserts, 107,36 s. Vite: 1,21 s. Kids: compilação
5,4 s, tipos 9,4 s, 59 páginas em 576 ms. Diff check passou. Avisos conhecidos
de WebGL headless/act e tamanho do chunk Three não equivalem a homologação visual.

Fontes: [schema glTF](https://github.com/KhronosGroup/glTF/blob/main/specification/2.0/schema/glTF.schema.json),
[câmera](https://github.com/KhronosGroup/glTF/blob/main/specification/2.0/schema/camera.schema.json),
[perspectiva](https://github.com/KhronosGroup/glTF/blob/main/specification/2.0/schema/camera.perspective.schema.json),
[ortográfica](https://github.com/KhronosGroup/glTF/blob/main/specification/2.0/schema/camera.orthographic.schema.json).
