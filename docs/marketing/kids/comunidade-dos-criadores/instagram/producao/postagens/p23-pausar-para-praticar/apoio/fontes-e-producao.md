# P23 · Pausar para praticar

Produção local em 14/10/2026. Oito slides em 1080 × 1350, 4:5, sRGB. Terceiro post da semana 19, série Antes de escolher, dor D23. Pausa tratada como oportunidade de prática, sem presumir que toda pausa é produtiva.

## Copy e direção

[Ficha vigente](../../../../postagens/03-p21-a-p30.md#p23), [direção visual](../../../../postagens/05-direcao-visual-e-producao.md), [copy preservada](copy.json), [legenda](../legenda.txt). Textos dos oito slides e legenda integral mantidos. A situação imaginada da nave é apresentada como exemplo; as telas de aula são do Corre, Dino!, e não de um suposto curso da Patrulha Espacial.

## Imagens e montagem

Seis imagens novas criadas com a ferramenta nativa image_gen.imagegen: cinco cenas com pessoas fictícias e um esboço no caderno. [Prompts finais e referências](prompts.json), [origens e hashes](imagens-geradas.json). As cenas usam referência gerada para manter o menino, o pai e a ambientação. As imagens dos slides 1 e 5 passaram por uma edição nativa para retirar plantas que encobriam a área do monitor, preservando pessoas e enquadramento. A geração original e a edição ficam registradas nos prompts.

Telas inicialmente vazias receberam capturas nativas por composição em perspectiva. O cartão do slide 7 recebeu texto editorial em Caveat. As fotos e os instantes do vídeo variam entre slides. O slide 4 reúne condição, jogo e instrução nativos em sequência vertical, para manter legibilidade e mostrar a nave inteira. O botão de ajuda do slide 5 foi ampliado a partir da mesma captura daquele slide. O player do slide 6 aparece uma única vez, com seus controles reais.

Fontes [Nunito](LICENSE-Nunito) e [Caveat](Caveat-OFL.txt). [Textos alternativos](../texto-alternativo.txt) registram a origem e a descrição de cada cena. [Instruções de publicação](../publicacao.txt) incluem Rótulo de IA, sem aviso sobreposto na arte.

## Aula e recurso de ajuda

[Fontes e hashes da interface](interface-origem.json), [verificações das capturas](aula-verificada.json). Componentes originais LessonSections, StudioBlockView, LessonVideo e verificações de projeto renderizados localmente com o manifesto do Corre, Dino!, seção Prepare a tela do jogo. Perfil, progresso e persistência demonstrativos; não se trata de conta de aluno nem captura de produção autenticada.

A gravação local original Aula01-Seção02-AreaIniciar.mp4 foi usada sem modificar seu conteúdo. O vídeo tem 56,766667 segundos; capturas pausadas em 28, 32, 14, 38, 20 e 42 segundos. Dentro do vídeo aparece a interface da gravação, que pode diferir dos componentes atuais ao redor. A nave não foi inserida nesse vídeo. O retorno de 38 para 33 segundos foi conferido, mantendo o player pausado.

No slide 2, Ao iniciar foi acrescentado ao projeto. No slide 8, Preparar o jogo em tela cheia foi encaixado, com 480 por 270. No slide 5, foi aberto o formulário original de dúvida e capturado o botão Preciso de ajuda. Nenhuma dúvida foi enviada. As APIs apontaram para o serviço local de demonstração; nenhum dado foi gravado no backend real. Erros conhecidos de decodificação dos efeitos sonoros do Blockly foram excluídos do registro de erros de captura; esta entrega é estática e não utiliza áudio.

## Patrulha Espacial

Exemplo original da extensão Jogo 3D, exportação patrulhaEspacialExample. [Origem e hash](origem.json), [IR](patrulha-original.json), [código](patrulha-original.js), [registro da execução](jogo-verificado.json). Motor original, regras e aparência preservados. Relógio e semente controlados permitem reproduzir o teste; observador somente lê os estados. Entradas reais de teclado acionam a nave.

[Disparo em ação](04-disparo-em-acao.png): laser verde próximo do meteoro laranja, nave azul e cinza, zero ponto. [Depois do acerto](04-depois-do-acerto.png): dois pontos; laser e meteoro atingido removidos. Um novo meteoro laranja nasce longe da nave no mesmo quadro, por isso a verificação compara os identificadores, não apenas a quantidade de meteoros. O segundo estado fica como evidência de funcionamento, fora da arte.

[Regra completa](04-regra-completa.png), [condição da tecla](04-tecla-espaco.png) e [identificação dos blocos](blocos-capturados.json) renderizados pelo Blockly original a partir do mesmo IR. O rótulo nativo espaço (pular) é genérico; neste projeto a tecla aciona o laser, como mostra a instrução original no jogo. Nenhum rótulo de bloco foi reescrito na imagem. O recorte aproxima nave, disparo e meteoro sem modificar posições ou inventar uma tela de aula.

## Entrega e verificação

[Prévia](../index.html), [montagem editável](../montagem.html), [conferência de copy e layout](verificacao.json), [verificação final](entrega-verificada.json). Oito slides conferidos individualmente, com ajustes no enquadramento da nave, legibilidade do botão de ajuda e remoção da duplicação do player. Prévia conferida em 360 pixels. Scripts em output/instagram/p23-2026-10-14: preparar.ts, capturar-aula.mjs, capturar-jogo.mjs, blocos.mjs, adaptar.mjs, montar.mjs, documentar.mjs e verificar-entrega.mjs.

Chromium headless local, com servidores temporários encerrados após as capturas. Nenhum código da aplicação alterado. Verificação de fidelidade visual e funcional da demonstração, sem teste de conversão ou comprovação de resultado pedagógico. Não publicado ou agendado. Próximo carrossel: P57, primeiro post da semana 20.
