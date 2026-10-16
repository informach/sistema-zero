# L6C — autoria isolada de composições Remotion

## Entrega funcional

A bancada web e Electron oferece **Criar ou ajustar animação com IA**. A pessoa escolhe uma cena gráfica e descreve o resultado; Codex ou Claude oficial retorna o fonte TSX e a copy. O executor usa o mesmo pedido, contexto congelado, concessão, checkpoint, journal, transferência e aplicação por revisão dos demais trabalhos. Ajustes aplicam uma revisão com Desfazer; alternativas aguardam escolha. O pedido pode conservar o fonte e mudar somente título/corpo, ou ajustar a animação preservando o texto. Gravações, áudio e outras cenas ficam fora do escopo.

Remotion permanece uma biblioteca incorporada. O bundle é preparado no build. Somente o worker valida a AST e transpila o fonte; somente seu Chromium de render executa o módulo. Não há avaliação no main, preload, janela Electron ou Player web. Não há instalação de dependências/plugins durante a geração. O compilador está incorporado ao worker e entra na identidade do motor. Uma verificação de AST duplicada no main foi removida na revisão.

O fonte aceito tem até 32 KB, uma função, imports visuais permitidos, matemática determinística, estilos inline e listas limitadas. Não aceita ferramentas, ambiente, DOM/rede, imports externos, mutação, loops, protótipos, HTML ativo ou URLs inventadas. Imagens e fontes usam identidades confirmadas. O arquivo resultante é WebM VP9 com transparência; sua reprodução e a exportação final usam a timeline compartilhada. Fonte, parâmetros, origem, mídias, hashes de fonte/compilado/entrada/saída, motor e conferência de quadros permanecem no histórico sincronizado.

O servidor revalida a cena e o escopo, copy protegida, identidade da entrada, revisão de origem e manifesto confirmado com codec/dimensões/duração. Manifestos produzidos são passados separadamente à validação, sem alterar o contexto congelado. Todas as alternativas são verificadas antes de concluir. Edição comum de cortes não pode reescrever ou descartar a receita da prévia mantida. Referências preservam as dependências para futura edição; reprodução baixa apenas os arquivos necessários à montagem.

Um recibo local atômico permite retomar variantes já renderizadas, verificando fonte, parâmetros, motor e bytes. Retomar uma resposta preservada não chama novamente a assinatura. A negociação passou ao protocolo 3; clientes antigos bloqueiam a sincronização incompatível preservando a fila. O botão web informa a etapa desktop. A prévia vertical foi limitada a 65% da altura útil para manter os controles acessíveis.

## Provas

- Render real Electron/utilityProcess/Chromium: `packages/marketing-desktop/.cache/composition-proof/edaf386e-9dc7-435e-be40-e8e388fb11a5/evidence.json`, log `proof-composition-preflight`, exit 0. WebM VP9 320×240, 60 quadros/30 FPS/2 s, sem áudio, BT.709. Composição sobre fundo da timeline preservou alpha e imagem autorizada, conferidos por pixels. Texto conferido em todos os quadros e presente em 56. Código com acesso a ambiente, texto ausente, fora do quadro, transparente e de 1 px foi recusado, sem recibo de sucesso.
- Assinaturas oficiais: `.cache/composition-providers-proof/f71833c2-2890-4220-a30b-a051ddd2639e/`. Codex ChatGPT Pro criou a cena; Claude Max editou o efeito mantendo `Crie seu jogo`. Checkpoints originais e fonte preservados. Ambos passaram pela validação/render e pela retomada sem nova geração; recibo e IDs de saída não mudaram na retomada. As imagens extraídas foram inspecionadas. `proof-composition-providers3` passou; a repetição com o último preflight é registrada em `proof-composition-final`.
- Percurso conectado real: `.cache/composition-connected-proof/evidence.json`, log `proof-composition-connected`, exit 0. Pedido criado pelo formulário Electron, cliente Codex real, concessão do servidor, upload/confirmação no R2 de staging, aplicação e sincronização SQLite. Projeto `2a26570c-09d3-5f25-9e6f-c0ecb23eadf0`, pedido `e4607277-9edd-482b-98c0-166cd1d4ca1a`, mídia `1aa38f1d-f1b1-4d16-bef6-5c18de789a5e`. A mesma revisão reproduziu no web sem preload. A ação indicou `Requer app desktop`. Capturas de ambos foram inspecionadas.
- PostgreSQL nativo: suite `execution.postgres.test.ts`, 25 testes/131 assertions. Novo caso recusa saída não confirmada, recusa alteração fora da cena em qualquer alternativa, conserva contexto congelado, aplica escolha por outra conta, sincroniza fonte/receita e desfaz. Os manifestos dessa suite são fixtures; a prova R2 é a conectada acima.
- Domínio: `video-proposal.test.ts`, 7 testes/59 assertions, incluindo adulteração de fonte, hash, mídia, duração, geometria, revisão, escopo e proteção; retenção de dependências separada da reprodução. Regressão completa do backend: 385 testes/2.227 assertions, zero falhas (`.cache/tests-composition-full`).
- Desktop: 78 testes/1.823 assertions, zero falhas (`.cache/tests-composition-final`); check de 169 arquivos limpo. Workbench: 28 testes/112 assertions, zero falhas. TypeScript backend passou após o teste integrado. Builds desktop passaram; o aviso preexistente de chunks grandes do Studio permanece visível.

## Ajustes encontrados na revisão

1. A primeira resposta real usou `flexShrink`, mas a lista de estilos não cobria essa propriedade embora o prompt permitisse flexbox. A lista foi completada com propriedades de layout seguras e testada; a mesma resposta foi recuperada, sem nova chamada Codex. Falha inicial preservada em `proof-composition-providers` (exit 1).
2. O script de prova mantinha um ID novo ao reabrir uma execução anterior, antes da chamada Claude. Corrigida a retomada do fixture pelo ID da cena guardada. Falha de prova preservada em `proof-composition-providers2` (exit 1); não se atribuiu ao fluxo do produto.
3. O preflight foi reforçado para não contar texto transparente, minúsculo ou quase invisível como copy apresentada. Exige opacidade efetiva mínima durante a janela de leitura e tamanho mínimo proporcional à composição. Isso complementa limites e presença; não substitui revisão humana de contraste, estética, contexto ou fidelidade semântica.

## Limites e continuidade

Autoria de gráficos tem escopo de até 60 segundos por cena e dependências visuais incorporadas. Cenas com camadas protegidas continuam usando o editor de receita existente; não são achatadas para contornar a proteção. Texto/layout editáveis das artes comuns continuam disponíveis. O web não executa fonte gerado. Fontes originais e vídeos extensos permanecem nas outras cenas da timeline.

Esta entrega resolve a pendência funcional de autoria isolada de código de L6C. O lote 6 ainda exige os ensaios operacionais restantes: gravação real longa/celular, piloto físico em outro computador, provas remanescentes de preparação/captura/produção do acervo e exportação. Continuam também os critérios de instalação, recuperação, retenção, paridade e ciclo completo do plano. Sem afirmar piloto de duas máquinas a partir de duas contas no mesmo PC.

Docker não foi usado. Não houve push, deploy, publicação social, commit ou merge nesta revisão parcial. O full review e o commit/merge local em staging permanecem no objetivo autorizado.
