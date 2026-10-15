# P18 · Acompanhamento na rotina

Produção local em 14/10/2026. Oito slides de 1080 × 1350, 4:5, sRGB. Primeiro post da semana 16, série Antes de escolher, dor D18.

## Texto e fotografias

[Ficha aprovada](../../../../postagens/02-p11-a-p20.md#p18), [direção visual](../../../../postagens/05-direcao-visual-e-producao.md), [copy preservada](copy.json), [legenda](../legenda.txt), [verificação da montagem](verificacao.json). Os oito slides e a legenda foram preservados integralmente.

Seis fotografias novas geradas com a ferramenta nativa image_gen.imagegen. [Prompts completos e referências](prompts.json); [origens e hashes](imagens-geradas.json). A referência da capa conserva a identidade da mãe e do filho fictícios, com ações e enquadramentos distintos. Nenhuma fotografia principal se repete. Não se atribuem experiências ou resultados a alunos reais.

Páginas em branco receberam textos editoriais em perspectiva: compromissos de uma agenda, folheto fictício de oficina de desenho e perguntas para anotar antes de escolher uma atividade. Monitores receberam capturas em perspectiva com máscaras nos objetos sobrepostos. Fontes [Nunito](LICENSE-Nunito) e [Caveat](Caveat-OFL.txt). A instrução de ativar o rótulo de IA está em [publicação](../publicacao.txt), sem rodapé Cena ilustrativa nas artes.

## Demonstração da plataforma

O navegador integrado não estava disponível: a lista de navegadores retornou vazia. Por isso, a interface foi renderizada localmente com LessonSections, StudioBlockView, SectionProjectCheck, LessonVideo e o CSS originais. [Origem e hashes](interface-origem.json). Não é uma captura de conta de produção nem uma interface redesenhada. Perfil, progresso e serviço de persistência são de demonstração local; nenhuma ação foi enviada ao backend real.

Foi usado o manifesto atual da aula 1 de Corre, Dino!, seção Prepare a tela do jogo. O vídeo é a gravação local original Aula01-Seção02-AreaIniciar.mp4. Esta gravação explica a área Ao iniciar, compatível com a etapa demonstrada. A gravação antiga PrepararTela não foi usada porque mostra dimensões diferentes das atuais. Nenhuma tela de edição foi inventada pela IA.

Slide 3: vídeo aos 12 segundos e projeto vazio. Slide 4: aos 18 segundos, formulário nativo Preciso de ajuda aberto, sem envio. Slide 5: área Ao iniciar criada, sem o bloco de preparar a tela; o avaliador original evaluateSectionProject retorna um objetivo cumprido e outro pendente. O componente nativo exibe o feedback. Slide 6: vídeo aos 24 segundos, pausado com controles visíveis, ao lado de recorte dos blocos em montagem. A anotação Vídeo pausado → hora de montar é editorial. Slide 7: aos 30 segundos, projeto com a área e o bloco de tela 480 × 270; verificação original aprovada.

[Estados e textos das capturas](capturas-verificadas.json), [resultados da verificação dos projetos](checagem-executada.jsonl). Os recortes e ampliações preservam textos e valores da interface. O verificador confere critérios de blocos configurados, não toda a lógica arbitrária do jogo. A persistência local de demonstração não comprova salvamento na nuvem. O ensaio encontrou apenas falhas de decodificação dos efeitos sonoros do Blockly na captura sem áudio; elas não afetam as imagens ou o vídeo original.

## Entrega

[Prévia](../index.html), [montagem editável](../montagem.html), [textos alternativos](../texto-alternativo.txt), [verificação final](entrega-verificada.json). Scripts locais em output/instagram/p18-2026-10-14/: client.tsx e vite.config.mts montam os componentes; capturar.mjs registra os estados; montar.mjs exporta as artes. O código da aplicação não foi alterado para esta produção.

Conferência editorial, visual, de dimensões, links e demonstrações. Não é teste de conversão. Não publicado ou agendado. Próximo carrossel: P21, segundo post da semana 17.
