# P21 · Ver a atividade

Produção local em 14/10/2026. Sete slides em 1080 × 1350, 4:5, sRGB. Segundo post da semana 17; série Antes de escolher; dor D21.

## Copy

[Ficha vigente](../../../../postagens/03-p21-a-p30.md#p21), [direção visual](../../../../postagens/05-direcao-visual-e-producao.md), [texto preservado](copy.json), [legenda](../legenda.txt). Os sete slides e a legenda foram preservados integralmente. A nota interna Produção ainda pedia comparar versões de três e dois pontos, apesar de a direção atual excluir essa comparação; foi alinhada aos slides aprovados, sem mudar a copy pública.

## Fotografias e composição

Quatro imagens novas geradas pela ferramenta nativa image_gen.imagegen. [Prompts completos e referências](prompts.json), [origens e hashes](imagens-geradas.json). O pai é fictício; a capa foi referência de identidade para duas cenas novas, em outros ângulos. A imagem do papel também é nova. Nenhuma fotografia se repete entre slides. Os originais foram preservados e copiados para esta pasta.

Papéis e monitores vieram em branco. Textos manuscritos e telas foram aplicados em perspectiva durante a montagem. Fontes [Nunito](LICENSE-Nunito) e [Caveat](Caveat-OFL.txt). Na capa há uma representação editorial genérica de cinco abas, sem marcas ou palavras legíveis; ela não pretende ser uma captura de concorrente ou da nossa plataforma. No fim, uma moldura editorial de uma aba contém player nativo com gravação real. A origem está também nos [textos alternativos](../texto-alternativo.txt). A orientação de ativar o rótulo de IA consta em [publicação](../publicacao.txt).

## Duelo de Cartas

[Origem no código](origem.json), [IR original](duelo-original.json), [IR da cópia](duelo-dois-pontos.json), [código original](duelo-original.js), [código executado](duelo-dois-pontos.js). Única adaptação de regra: energia por turno de três para dois. Custo de cada carta um, ataque seis, escudo cinco, compra de três cartas e permanência das não usadas foram mantidos.

Captura local no runtime original, com semente aleatória fixa e observador somente de leitura. O navegador integrado não estava disponível (lista vazia), por isso foi usada captura local com Chromium headless. Não houve acesso a conta de aluno nem alteração no código da aplicação.

Slide 3: primeiro ataque, energia um, inimigo com 34 de vida, duas cartas. Slide 4: início, energia dois, inimigo com 40, duas cartas de ataque e uma de defesa. Slide 5: depois de dois ataques, energia zero, inimigo com 28 e uma carta de defesa. Um terceiro clique não muda mão, descarte, vidas ou energia. A resposta real é a carta permanecer; a anotação A carta continua na mão é editorial, sem inventar feedback do produto.

Slide 6: bloco configurado em dois e dois estados de um turno posterior. A carta de defesa restante é conservada e entram três cartas novas. Após usar uma, restam três cartas e energia um. Depois de outra, restam duas e energia zero; nova tentativa é bloqueada. A sequência não representa descarte automático da mão. [Estados e verificações](capturas-verificadas.json).

Blocos produzidos pelo Blockly original a partir do IR da cópia. [Identificação](blocos-capturados.json), [regra de dois pontos](06-regra-dois-pontos.png), [condição completa](05-condicao-energia.png). No slide 5 só o cabeçalho da condição e o gasto são ampliados; não se exige ler todo o programa.

Os recortes de energia e mão preservam os valores do mesmo instante. Os rótulos Atacar, Defender e os passos numerados são editoriais. Capturas distintas por slide. O jogo é exemplo das possibilidades da ferramenta, sem anunciar um curso de Duelo de Cartas ou atribuí-lo a uma criança.

## Vídeo e entrega

O [vídeo de apoio](demonstracao-duelo.webm) foi gravado diretamente do canvas nativo durante a partida por MediaRecorder. [Player e tempo conferidos](video-verificado.json), [captura do player](07-player-real.png). A cena final usa um instante posterior à demonstração das cartas; a aba Atividade em vídeo é uma moldura de apresentação local, não página de curso.

[Prévia](../index.html), [montagem editável](../montagem.html), [verificação de layout](verificacao.json), [verificação final](entrega-verificada.json). Scripts locais em output/instagram/p21-2026-10-14/: preparar.ts exporta original e cópia; capturar.mjs joga e registra os estados; blocos.mjs captura os blocos; video.mjs captura o player; montar.mjs exporta os sete PNGs.

Conferência de copy, fontes, cenas, dimensões, links e estados do jogo. Não é teste de conversão nem comprovação de ganho cognitivo. Não publicado ou agendado. Próximo carrossel: P15, primeiro post da semana 18.
