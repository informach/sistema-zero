# P57 · Ajudar a entender a dúvida

Produzido em 14/10/2026. Oito slides, 1080 × 1350, sRGB. Primeiro post da semana 20, série Antes de escolher, desejo W27. A peça orienta o adulto a ouvir a dúvida e procurar a orientação disponível.

## Copy e artes

[Ficha vigente](../../../../postagens/11-p51-a-p60.md#p57), [direção visual](../../../../postagens/05-direcao-visual-e-producao.md), [copy preservada](copy.json) e [legenda integral](../legenda.txt). Nenhuma alteração nos oito textos ou na legenda. As perguntas citadas no slide 2 fazem parte da orientação ao adulto; o gancho da capa é afirmativo.

Quatro fotos novas pela ferramenta nativa image_gen.imagegen, com mãe e menino fictícios. [Prompts](prompts.json) e [origens com hashes](imagens-geradas.json). A primeira estabelece as pessoas; as outras preservam a identidade com novas poses e enquadramentos. Não há depoimento ou rosto de pessoa real recriado. Monitores inicialmente vazios receberam capturas nativas; o dedo no slide 2 permanece na frente da tela. O caderno do slide 5 recebeu texto editorial aplicado em perspectiva. Nenhuma foto ou captura se repete entre slides.

[Nunito](LICENSE-Nunito), [Caveat](Caveat-OFL.txt), [textos alternativos](../texto-alternativo.txt) e [instruções de publicação](../publicacao.txt). Origem das cenas e Rótulo de IA ficam documentados sem rodapé sobreposto.

## Jogo e blocos

Exemplo arenaGoblinsExample, extensão Jogo 2D Avançado. [Fonte e hash](origem.json), [IR original](arena-original.json), [código original](arena-original.js), [registro da execução](jogo-verificado.json). Regras e aparência preservadas: herói azul, goblin geométrico vermelho, vida vinte e dano dez. A barra desenhada sobre o herói mostra a vida do herói, não a do goblin. Os rótulos editoriais identificam ambos no slide 3.

Entradas reais WASD aproximam o herói do primeiro goblin; J ataca. Semente e relógio controlados para reprodução. Um observador somente lê posição, vida, contato e identificador dos goblins. [Início](01-arena-inicial.png), [primeiro golpe](03-primeiro-golpe.png), [goblin ainda ativo depois do empurrão](02-goblin-resistiu.png) e [segundo golpe](03-segundo-golpe.png). O primeiro goblin tem vinte de vida antes e dez depois do primeiro ataque; deixa a lista ativa no segundo. Outros goblins podem nascer durante o teste. A captura do segundo golpe é evidência, fora das artes.

[Molde nativo](04-molde-vida.png), [golpe nativo](04-golpe-dano.png) e [identificação dos blocos](blocos-capturados.json). Renderização com Blockly da plataforma a partir do IR original. O slide 4 recorta o molde até vida vinte e conserva o comando do dano. A conta vinte menos dez menos dez é explicação editorial, não controle do produto.

## Recursos da aula

[Fontes e hashes](interface-origem.json), [capturas verificadas](interface-verificada.json) e [resposta do avaliador](checagem-executada.jsonl). Componentes originais do Kids renderizados localmente com o manifesto do Corre, Dino!; perfil e persistência demonstrativos, sem conta de aluno ou gravação no backend real.

O player mostra a gravação original Aula01-Seção02-AreaIniciar.mp4, pausada aos dezoito segundos. A interface dentro do vídeo é a gravada, sem alteração. Abaixo, a arte reúne um recorte da instrução da experiência Escolha o tamanho da tela, incluindo Ouvir. São recortes de partes distintas do mesmo curso, montados verticalmente, e não uma captura integral de uma só seção.

O botão Ouvir surgiu pelo caminho nativo de voz do navegador, sem áudio fictício ou botão desenhado. A presença do botão e a API foram conferidas; não houve avaliação auditiva da pronúncia. A instrução usa os controles reais da experiência, e Uma pista foi aberta por clique real. A primeira pista orienta a ligar a borda. A pista e a checagem do Estúdio aparecem em painéis distintos, com suas origens identificadas.

Ao iniciar foi colocado no projeto, sem Preparar a tela. Verificar esta parte chamou o avaliador original evaluateSectionProject com os critérios reais do manifesto: primeiro item cumprido, segundo faltando. Para seguir usa o componente original e a mensagem do serviço para pendência project-check: Confira o objetivo desta parte no seu projeto. Esse item de progresso é demonstrativo; o resultado da checagem é calculado, não texto desenhado.

Os componentes do slide 7 foram recapturados com largura de 210 pixels CSS, permitindo quebra nativa do texto e leitura na arte. Não houve edição das palavras. As capturas integrais permanecem em apoio. O ambiente isolado não implementa a sincronização da experiência com a conta; a tela integral registra o aviso de persistência local. O aviso fica fora dos recortes usados e a entrega não afirma sincronização verificada. Os erros conhecidos de decodificação de efeitos sonoros do Blockly foram excluídos do registro de erros visuais; esta entrega é estática.

## Conferência e arquivos

[Prévia](../index.html), [montagem editável](../montagem.html), [copy e layout](verificacao.json), [linter editorial](copy-linter.json), [verificação final](entrega-verificada.json). Oito slides inspecionados individualmente; enquadramento do jogo, sobreposição do dedo, acentos, legibilidade e faixa Para seguir inteira conferidos. Prévia móvel em 360 pixels.

Scripts em output/instagram/p57-2026-10-14. Capturas com Chromium local e servidores encerrados ao terminar. Nenhum código da aplicação alterado. Revisão editorial, visual e teste da demonstração; não é teste de conversão ou prova de aprendizagem. Não publicado ou agendado. Próximo: P60, terceiro post da semana 20.
