# Lote 8.3 — Runtime e distribuição Three: checkpoint

18/11/2026. Continuação de `staging`, base `2ab6ff947`. **8.3 continua aberta.** Este checkpoint entrega o carregador compartilhado e o pacote Three programático; GLB único, preparação autorizada e interface de exportação ainda precisam ser concluídos. Lotes 0–7 e etapas 8.1/8.2 permanecem fechados localmente. Não foi feita validação remota de implantação neste recorte.

## Implementação

`motor/compilar` expõe `carregarCenaNoThree`, `lerPacoteDoEndereco` e `carregarCenaDoEndereco`. O carregador confere manifesto, tamanhos, hashes, malhas, imagens e alturas antes de entregar uma cena. Reutiliza `lerGlb`, `MundoDoTeste`, consultas de alturas/nado e os materiais de água/ambiente existentes. Não abre Palco, conta da plataforma ou outro gerador de terreno/caminhos.

Geometria/material são compartilhados por arquivo; ossos, morphs e canais de animação pertencem a cada cópia. O picking conserva entidades após junção estática. Matrizes finais permanecem as do compilador. Luzes recebem as posições resolvidas, sem fabricar documento autoral. UVs e profundidades originais de água são restaurados nos nomes de atributos efetivamente entregues pelo GLTFLoader. O fundo físico do lago utiliza apenas suas próprias margens, não casas ou pontes que passam por cima.

O orçamento inclui nós/extras/canais repetidos por instância, antes de clonar. Há teste com um arquivo pequeno repetido 4.000 vezes que seria caro em memória. Objetos estáticos conservam suas matrizes e não têm TRS recomposto em cada quadro. O carregador também recusa a imagem que o decoder nativo não consegue ler: o GLTFLoader costuma convertê-la em textura `null`, o que antes podia esconder perda de arte.

O pacote Three leva `cenario.json`, recursos do manifesto, `carregar-cenario.js`, `index.html`, CSS/JS do exemplo, LEIA-ME e licenças dos modelos e componentes. O ZIP reutiliza o escritor incremental do Molda, com caminhos/duplicatas, limites e cancelamento conferidos; o backup da galeria conserva seu comportamento.

O módulo portátil é gerado da mesma fonte TypeScript por Bun **1.3.11**, a versão do CI. `env: 'disable'`, sem imports externos, sourcemap ou dependência de Vite/Next. São distribuídos Three 0.184.0, three-mesh-bvh 0.9.2 e Zod 4.3.6, com seus textos de licença. `conferir:runtime` refaz a geração e compara o resultado; o passo foi incluído no CI. A API de empacotamento foi conferida na [documentação oficial do Bun](https://github.com/oven-sh/bun/blob/bun-v1.3.14/docs/bundler/index.mdx) e executada na versão instalada.

O exemplo usa `SessaoDoTeste`, `MovimentoDoTeste`, câmera, entrada por toque e figura neutra de **1,16 m** existentes. Não incorpora avatar privado, inventário ou regras de campanha. O jogo conectará seus sistemas no perfil previsto em 8.5.

## Evidências locais

[Resultados do runtime](evidencias/lote8-runtime/resultado.json), [imagem inválida](evidencias/lote8-runtime/imagem-invalida.json), [exploração independente](evidencias/lote8-runtime/portatil.json), [desktop](evidencias/lote8-runtime/exemplo-desktop.png), [móvel](evidencias/lote8-runtime/exemplo-movel.png), [visão geral](evidencias/lote8-runtime/catalogo-juncao-dia.png) e [vídeo](evidencias/lote8-runtime/exploracao.mp4).

Quatro casos: plano e terreno/acervo, cada um com/sem junção. Três ciclos de carregamento/renderização/descarte e três cancelamentos por caso; picking e alturas/colisões iguais às provas de 8.2. Quatro clipes reais do Cute comparados ao GLTFLoader independente em 12 instantes cada: erro máximo aproximadamente **1,08 × 10⁻⁷ m**. Isso verifica reprodução, não aprova IK, atuação ou direção de arte.

Após cada descarte, memória GPU retorna ao renderer aquecido: uma geometria e uma textura internas do Three (fundo equiretangular e LUT). `renderer.dispose()` termina em zero/zero. O caso de acervo usa 34 chamadas de desenho e o agrupado 32, incluindo ambiente/sombras desse ensaio; não são medidas de FPS em aparelhos físicos.

O ZIP extraído foi servido por HTTP local com CSP restritiva e sem serviço da plataforma. Foram conferidos **36 arquivos**, bytes idênticos após descompactar, nenhuma origem externa e 87 leituras de recursos sem cookie/autorização, mesmo com um cookie de ensaio presente na origem. Caminhada, pausa, retorno e controles de movimento passaram em desktop e viewport móvel. O exemplo percorreu aproximadamente **1,70 m** no trecho medido, usando a velocidade nativa do Testar; não se alterou a velocidade do jogo.

As cenas são fixtures técnicas com lago/ponte/caminho/Cute reais e volumes de referência, inclusive peças suspensas intencionais. **Não são a composição final da Faísca nem aceite artístico.** GLBs licenciados e ZIP ficam em `output`; somente capturas, vídeo e dados dos ensaios são versionados.

## Revisão e regressão

Motor e oficina passaram integralmente; exportadores existentes do Molda: **131 testes** aprovados. Tipagem de motor, oficina e Molda aprovada. Build da oficina/workers com Vite instalado **8.3.4** aprovado; permanece o aviso anterior de chunks acima de 500 kB. Geração e conferência do runtime passaram tanto a partir da raiz quanto pelo script do pacote. Biome e `git diff --check` conferidos.

Revisados posse e descarte de recursos, instâncias/esqueletos/clipes, transformação de luzes, água e física, referências/caminhos, limites de leitura e de cópias, cancelamento e separação autoria/distribuição. Permissões reais ainda serão conectadas no preparo Members; o download não foi exposto na oficina antes desse contrato.

## Medição que impede fechar o recorte agora

O perfil da geração real separou preparação e reabertura:

| Operação | Ensaio local com perfil CPU |
|---|---:|
| Conferir e preparar distribuição | 155,6 ms |
| Exportar ZIP, incluindo nova conferência | 1.220,3 ms |
| Reabrir pelo leitor ZIP compartilhado | 47.624,1 ms |

O perfil atribui aproximadamente 95,9% do tempo à alimentação incremental do `Inflate` do fflate, principalmente cópias `slc`, concatenação e `set`. A demora não está no terreno ou na criação do ZIP. **Próximo passo imediato: corrigir essa leitura com prova de conteúdo/CRC/limites preservados**, antes de avançar ao GLB único e à interface. Não afirmar fluidez desse fluxo só porque o exemplo já caminha.

Depois permanecem GLB único, preparação de revisão/licenças no servidor, hosts equivalentes e interface Molda nos quatro layouts/temas. Raylib/Estúdio e publicação/perfil continuam em 8.4/8.5; lote 9 somente depois de fechar o lote 8 integralmente. Composição final, full review, CI e validação de implantação em staging permanecem no encerramento global.
