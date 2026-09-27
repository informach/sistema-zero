# Lote 223 — recorte de transparência nativo

Estado: implementado, revisado e verificado. Design:
`docs/plans/2026-09-09-molda-alpha-mask.md`. Público/cloud continuam v1.

## Contrato e revisão

Campo autoral opcional alphaMask {cutoff,opacity}, leitura fechada e cópias próprias,
patch com null para remover, comparação no-op e histórico existente. Números finitos;
cutoff ≥0 inclusive >1, opacity 0–1, sem arredondar fatores. Ausência mantém blend
automático. Pixel buffers não mudam ao ajustar os parâmetros.

Three mantém fator em opacity, cutoff em alphaTest, sem blending e com depthWrite.
O setter nativo invalida programa ao cruzar zero; mudar valores positivos não recria
textura/shader. Remover restaura blend derivado dos pixels/base. GLB escreve MASK,
cutoff e fator alpha separado, sem inventar shaders/extensões. Importador aceita MASK
somente com esse contrato; alpha não é assado em RGBA8, RGB mantém relatório anterior.

Review detectou RGB perdido em alpha zero, observável quando cutoff=0. Composição
MASK ganhou política explícita de RGB da última camada RGBA participante/base;
composição antiga inalterada. Cache/raster parcial/GLB/flipbook/atlas têm a mesma
política. Atlas worker lê o campo opcional estritamente e o comando conserva máscaras
por material. Não converter cutoffs diferentes em uma única máscara da imagem.

UI contextual em Jeito da superfície, campos exatos/aplicar/remover, bloqueio herdado
do fieldset e do comando. Alvos/tokens existentes. Botão Aplicar não é remontado ao
salvar; remover devolve foco ao summary persistente. Não há hooks/estado paralelo de
domínio nem edição por evento de cada tecla.

## Evidência focal e correções de testes

- 8f0963: 39/0, 5.526 asserts, quatro arquivos após núcleo inicial.
- 84df55: 26/0, 1.185 asserts, regressões de composição/pintura compartilhada/GLB.
- 893ff5: 16/0, 11.869 asserts. 24 pares cutoff/fator × todos os 256 alphas,
  inclusive zero/subnormal/>1, PNG preservado, roundtrip e validator. MASK compartilha
  imagem entre fatores distintos; BLEND/OPAQUE continuam variantes independentes.
- c66858: viewport/GLTFLoader passaram; teste UI esperava identidade do objeto
  após undo, mas o contrato existente atualiza updatedAt. Corrigido teste para
  exigir conteúdo original e timestamp avançado, sem mudar o histórico.
- 077c5e/ebd350: 29/1; matcher toBeDisabled não existe neste runner nem nos tipos.
  Trocado por verificação do fieldset.disabled, padrão local. Nenhuma dependência,
  supressão ou alteração da implementação para acomodar o teste.
- a74eac/882ca3: **42/0, 14.223 asserts, sete arquivos**, tipos passaram.
  Worker real de glTF e atlas, ownership/adoção, UI→undo/redo→blob/read, bloqueios,
  oracle GLTFLoader e retorno ao comportamento sem MASK.
- 9dc58d: 10/0, 199 asserts em quatro arquivos; acrescentado flipbook com cor
  escondida, troca de frame sem recriar textura/programa e regra de depthWrite.
- 9dc58d também preservou três goldens do benchmark de materiais (16/256/1024,
  até 32 MiB de saída), mais dois goldens de percurso 221/222. Sem mutação de fontes.
  Não é otimização de velocidade nem homologação GPU; são provas de regressão.

## Gates finais

- Primeira integral 661d4b/c086cd: 2.799/1, 376 arquivos. O teste antigo de
  preflight em gltfNativeDocument exigia recusar MASK. O gate continua necessário:
  fixture agora usa normalTexture.scale=5 (incompatível), com getters que proíbem
  antecipar accessors/pixels. Não afrouxar o gate; MASK tem cobertura positiva própria.
- 44ef39: 44/0, 12.289 asserts em sete arquivos após atualizar essa fixture.
- Nova integral 44ef39/e5e21b: **2.800/0, 8.508.034 asserts, 376 arquivos,
  161,82 s**. Sete logs WebGL; sem act nesta execução, não é correção dos avisos
  históricos intermitentes. Tipos passaram antes da integral.
- Depois da integral, apenas o literal das classes do summary foi separado em
  array/join, produzindo a mesma string. Focal UI/CSS 6198df: 2/0, 16 asserts.
  Tipos novamente passaram; Biome: 1.146 arquivos, sem correções.
- Vite 6198df/e2bce8: 1,21 s/2.287 módulos. SceneAppearancePanel 28,37→30,01 kB,
  SceneViewport 117,32→117,52, index 363,90→364,39; CSS 53,64 inalterado.
  Workers atlas 8,91, GLB 74,89, glTF 183,55, OBJ 158,11, bbmodel 214,90 kB.
  Three 579,29 kB mantém aviso >500; sem aumentar limite.
- Kids 858575/39fbb5: compilação 6,6 s, tipos 12,0 s, 59 páginas em 656 ms, exit 0.
- Diff check passou, somente três avisos CRLF preexistentes.

Lote encerrado. Skills de interface/Tailwind orientaram seção opcional, tokens mld
da plataforma, alvos de toque, foco e ausência de estados autorais paralelos;
escrita concisa orientou exemplos de folhas e explicação do limite. Sem dependência
de variantes para um componente sem variantes de estilo.

Browser permanece indisponível desde a tentativa documentada no lote 220; nenhuma
homologação visual/toque feita. Fontes oficiais/API conferidas no design; sem cópia
de código do Blockbench ou de implementações externas.
