# P25 · Depois da primeira aula

Produção local em 14/10/2026. Oito slides de 1080 × 1350, 4:5, sRGB. Primeiro post da semana 15, série Antes de escolher, dor D25. A orientação é conhecer a continuação das atividades e os caminhos de ajuda antes de contratar.

## Copy e imagens

[Ficha vigente](../../../../postagens/03-p21-a-p30.md#p25), [direção visual](../../../../postagens/05-direcao-visual-e-producao.md), [copy preservada](copy.json), [legenda](../legenda.txt), [verificação da montagem](verificacao.json). O texto integral dos oito slides e a legenda foram preservados.

Quatro imagens geradas com a ferramenta nativa image_gen.imagegen: [prompts e referências](prompts.json), [origens e hashes](imagens-geradas.json). As referências são usadas para conservar a identidade da família fictícia em cenas distintas. As fotografias não se repetem entre slides e não são registros de alunos reais. Os originais continuam na pasta de geração e as versões selecionadas estão nesta pasta de apoio.

Telas originalmente em branco receberam capturas reais em perspectiva, com máscaras para respeitar rostos e objetos à frente do monitor. O calendário recebeu o texto editorial Primeira aula e um 1 circulado, sem data real. Fontes [Nunito](LICENSE-Nunito) e [Caveat](Caveat-OFL.txt). Descrições completas em [texto alternativo](../texto-alternativo.txt).

## Cursos e orientação reais

Slide 1: [IR da primeira fase](nave-primeira-fase.json) e [código gerado](nave-primeira-fase.js), provenientes de projetoNave(1), em docs/aulas-interativas-tecnico/qa/nave-contra-asteroides-etapas.ts. Renderização pelo runtime nativo Jogo 2D. Não foi desenhada uma interface falsa sobre a tela.

Slide 3: componente CourseTrail original de packages/community-kids/src/components/kids/course-trail.tsx, renderizado localmente com CSS da aplicação e conteúdo do curso. [Origem e dados](interface-origem.json), [captura integral](03-trilha.png), [texto verificado](trilha-verificada.json). Estado inicial de demonstração: zero fases concluídas; primeira disponível e seguintes bloqueadas. O título e os dois primeiros nós foram recortados e ampliados; Primeiro, Depois e a seta são editoriais. Não é captura de uma conta real nem verificação de publicação no servidor.

Slides 2 e 7: páginas 2 e 6 do PDF real docs/aulas-interativas/kids/nave-contra-asteroides/mapa-da-aventura.pdf, conferidas visualmente com a skill de PDF. [Origem, hash e páginas](mapa-origem.json). Página 2: percurso completo do curso. Página 6: título Faça a nave aparecer e encaixes dos blocos. O material foi renderizado com PyMuPDF e inserido em perspectiva; não houve edição de seu conteúdo.

## Base da Lua em funcionamento

Fonte: luaExample em packages/studio/src/official-extensions/world-3d/examples.ts, gerada pelo runtime nativo Mundo 3D. [IR original](lua-original.json), [código original](lua-original.js) e [estados das capturas](capturas-verificadas.json).

O exemplo tem 12 moedas em torno da cratera, missão Pegue 12 moedas na cratera e, ao concluir, fireworks e conquista Astronauta. Código do projeto e regras preservados. A captura usa o horário nativo manhã para clarear a cena, posicionamento nativo do personagem para iniciar o enquadramento e teclado para caminhar e recolher. Não foram atribuídos pontos nem acionados artificialmente a conclusão ou os fogos.

Um observador somente de leitura registra moedas, posições, missão e partículas. Frames intermediários deixam de ser desenhados para reduzir a fila de GPU, mas a lógica continua; o renderizador nativo desenha o estado final de cada captura. A câmera superior é nativa. No enquadramento dos fogos, a câmera foi afastada e apontada para cima para incluir a explosão. Estas são adaptações de apresentação da captura, não mudanças nas regras do jogo.

Slide 4: coleta aos cinco pontos e fogos após 12, com partículas ativas e missão concluída. Slide 5: momentos distintos com zero, uma e três moedas, mostrando caminhada, coleta e contagem. Slide 6: vista superior aos oito pontos, com quatro moedas restantes, e recorte da conquista no instante da conclusão. Slide 8: vista inicial junto ao foguete e à bandeira. Nenhuma captura principal se repete entre slides. Placar e conquista são recortes ampliados do HUD original, sem números ou mensagens reescritos.

Base da Lua é uma possibilidade do Estúdio, não um curso anunciado nesta peça nem trabalho atribuído ao menino. Não extrapolar a demonstração para garantia de interesse prolongado ou resultado pedagógico. A gravidade do estilo Lua é uma configuração de jogo, não uma afirmação científica sobre a gravidade lunar.

## Entrega e reprodução

[Prévia](../index.html), [montagem editável](../montagem.html), [publicação](../publicacao.txt), [verificação final](entrega-verificada.json). Scripts em output/instagram/p25-2026-10-14/: preparar.ts e capturar.mjs exportam e executam a Base da Lua; interface.tsx e interface-capturar.mjs capturam a trilha; nave.ts exporta a primeira fase; montar.mjs produz os oito PNGs. Captura local com Playwright headless, sem conta real e sem alteração do código da aplicação.

Conferência editorial, visual e funcional das demonstrações. Não é teste de conversão. Não publicado ou agendado. Próximo carrossel: P18, primeiro post da semana 16.
