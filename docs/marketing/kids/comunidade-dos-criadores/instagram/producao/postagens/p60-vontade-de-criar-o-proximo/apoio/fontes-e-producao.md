# P60 · Vontade de criar o próximo

Produzido em 14/10/2026. Sete slides, 1080 × 1350, 4:5, sRGB. Terceiro post da semana 20. Série Diário de criador, desejo W30. A peça parte da fala do André, mostra uma escolha concreta e convida o responsável a conversar sobre o que a criança fez.

## Copy e relato

[Ficha vigente](../../../../postagens/11-p51-a-p60.md#p60), [direção visual](../../../../postagens/05-direcao-visual-e-producao.md), [copy preservada](copy.json), [legenda](../legenda.txt) e [revisão mecânica](copy-linter.json). Os sete textos e a legenda foram preservados. A fala literal foi conferida no arquivo histórico da oferta: [fonte do relato](fonte-do-relato.json).

[Retratos reais e hashes](retratos-reais.json). A capa usa um recorte do André da foto fornecida pela Helena. O slide 2 usa o retrato já associado ao depoimento na oferta. A direção previa um segundo quadro de vídeo ou detalhe de gravação, mas esse registro não está disponível localmente. A adaptação usa um segundo retrato real autorizado, sem inventar a gravação. A foto de oferta tem 160 × 160 pixels, exibida num círculo de 300 pixels, sem aumento por IA. Nenhum rosto real foi gerado ou alterado.

Não atribuir ao André o tabuleiro da demonstração nem os esboços. Não generalizar a vontade dele para todas as crianças. A peça não faz promessas de nota, certificado, carreira ou curso futuro.

## Imagens e composição

Quatro imagens novas pela ferramenta nativa image_gen.imagegen. [Prompts](prompts.json) e [origens com hashes](imagens-geradas.json). Adulto e avó fictícios. Papel quadriculado e caderno foram gerados vazios; números, estrela e palavras foram aplicados na montagem com a fonte Caveat. As quatro fotos e as duas capturas de jogo são distintas.

O celular horizontal recebeu a captura inicial, desfocada, em perspectiva e com máscara dos polegares. A tela da avó usa uma composição editorial genérica: Família, ícone de link e Abrir jogo. Não há interface de aplicativo reproduzida, conversa inventada, mensagem de testemunho nem dado pessoal. Os cadernos representam possibilidades, não registros do André. [Textos alternativos](../texto-alternativo.txt) descrevem as origens.

Paleta azul, creme e amarela; [Nunito](LICENSE-Nunito) e [Caveat](Caveat-OFL.txt). Aspas da capa com a mesma tipografia e tratamento. [Instruções de publicação](../publicacao.txt), incluindo Rótulo de IA.

## Demonstração do tabuleiro

Exemplo corridaTabuleiroExample, extensão Jogo 2D Avançado: [origem](origem.json), [IR original](tabuleiro-original.json), [código original](tabuleiro-original.js), [cópia executada](tabuleiro-demonstracao.js) e [adaptação visual](adaptacao-visual.json).

O original tem o caminho lógico e os peões, mas não desenha a trilha, não numera as casas nem exibe placar. A cópia adiciona apenas linhas e casas ao callback de desenho, nas mesmas oito coordenadas. Regras, peões, sorteio, turnos e pontuação não mudaram. O rótulo Casa 7 foi aplicado na montagem e aponta para a posição efetiva do peão azul. As casas usam índices de zero a sete; zero é a posição inicial no esboço.

[Execução verificada](jogo-verificado.json): cliques reais no canvas, semente e relógio controlados. Azul foi da casa zero para a quatro; vermelho, de zero para cinco; no terceiro clique, azul chegou à sete, ganhou dez pontos e a vez passou ao vermelho. A captura não apresenta um placar fabricado. Um observador somente lê posição, casa, pontos e jogador da vez.

[Captura inicial](03-tabuleiro-inicio.png), [casa premiada](04-casa-premiada.png), [bloco nativo](04-regra-casa-sete.png) e [identificação do bloco](blocos-capturados.json). O Blockly foi renderizado pelo código original da plataforma com o IR original. O recorte conserva integralmente a condição e a soma; controles opcionais de senão ficaram fora para ampliar a leitura.

## Entrega e conferência

[Prévia](../index.html), [montagem editável](../montagem.html), [verificação de layout](verificacao.json) e [verificação final](entrega-verificada.json). Os scripts reproduzíveis estão em output/instagram/p60-2026-10-14. Foram conferidos copy literal, legenda, dimensões, carregamento de fontes e imagens, margens, leitura a 360 pixels, links e demonstração. A conferência visual abrangeu os sete slides.

P60 completa os 30 carrosséis previstos no calendário, totalizando 220 PNGs. Isso não conclui as outras mídias. Nenhuma publicação ou agendamento foi realizado.
