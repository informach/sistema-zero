# Validação no ambiente Python com CSP estrita

O gate complementar de encerramento do Pac-Man chegou a completed, retornou após3,003s e liberou os dois WAVs/frame, mas encontrou uma violação TrustedScript no console. O negativo Chrome foi preservado em pacman-lifecycle-r1/chrome-victory-near-end-r1. Os dois cenários nativos passaram com fechamento autoral real; isso não aprova o navegador.

Um diagnóstico por etapas mostrou que a violação já existe depois de prepare, antes de executar Python ou tirar screenshot. A hipótese de captura Playwright foi refutada. Esse diagnóstico usou uma fixture sem Turtle e terminou por timeout ao esperar canvas inexistente; o negativo QA permanece em diagnostic-r1 e não representa timeout do programa Python, que chegou a completed.

O frame19de real foi conferido por SHA336cc65728270276a91b8a4ee572b430314505bfd59698a7307e077501401aee. Contém o probe Zod new Function, capturado internamente pela biblioteca; a CSP o bloqueia e o navegador reporta a violação mesmo assim. A biblioteca continua pela implementação interpretada. Há duas versões locais legítimas, Core4.3.6 e Studio4.5.4, com estados de configuração próprios.

Microgate causal em python-csp-zod-r1: dois bundles usam os mesmos schemas reais Core/Studio e a mesma CSP do frame. O controle registra o bloqueio; o candidato configura jitless antes de construir schemas nas duas versões, não registra erros, e preserva quatro decisões de validação válidas/inválidas. Chrome e Edge passaram uma vez, sem retry. Nenhuma dependência ou diretiva CSP foi modificada.

## Implementação

1. Core expõe uma função pequena para configurar seu próprio Zod no realm protegido. Importar esse módulo não altera os hosts comuns; a função é chamada somente pelo bootstrap Python dedicado.
2. Um prelude no Studio chama essa função e configura o Zod do Studio. A importação desse prelude vem antes das dependências que constroem schemas.
3. Aplicar somente aos cinco entrypoints que contêm o probe: frame, worker, standalone, inspectStandalone e playtestStandalone. Analysis-frame/worker, boot-reader e renderer não o contêm; não acrescentar Zod a esses bundles leves.
4. Não importar o prelude pelo provider/session do Estúdio nem pelos hosts JavaScript. A configuração é local ao realm que carrega o entrypoint, não uma configuração global da aplicação.
5. Repetir o microgate com o prelude de produto real. Acrescentar regressão de prepare/execute no navegador, coletando erros antes da preparação. A distribuição19de antiga continua com o diagnóstico; não filtrar o console para declará-la aprovada.
6. A mudança participa do fingerprint canônico. Não atualizar perfil ou reutilizar selo de distribuição/imagem antiga. Uma distribuição imutável de QA pode antecipar os testes de navegador; a imagem composta final e seus gates continuam dependendo do congelamento de Pinta C2/C3 e deste ajuste.

Este ajuste impede uma tentativa já proibida pela CSP; não concede eval, altera schemas, reduz validação ou muda a linguagem do projeto. A evidência do candidato mínimo não substitui os cinco bundles finais, os jogos ou o SDK composto.

## Evidência integrada de navegador

A distribuição de QA `43fa3d2a253f50364075655cb3aa3473ab37246d9d3a5528b36fe01d1cec5048` foi construída pelo gerador canônico, com 195 fontes conferidas antes/depois e 41 arquivos. Recibo `python-strict-csp-runtime-r1/build-receipt.json`, SHA `176ed5bc567c1731c4a133e17c373ee8013ea77df4e241412da5845d4747b97d`. O host separado usa controle 5307 e origem interna 61030; os hosts e os negativos anteriores permanecem preservados. Foram conferidos os 41 arquivos locais e 29 respostas HTTP, incluindo a release `bb6029704f10c89c336bcbad2bf36960d27a6e1d662752790af0aee6ebc04459`.

As regressões reais de preparação/execução de Python simples e Turtle passaram uma vez em Chrome e Edge, coletando erros antes de preparar a sessão: quatro testes, sem erro de página ou console. Os quatro cenários instrumentados de encerramento do Pac-Man também passaram nessa distribuição: vitória e derrota em cada canal, retorno autoral após 3,0029–3,0196 segundos, WAVs esperados, mídia liberada e frame removido após dispose. Recibo `pacman-lifecycle-r2/verification-r2.json`, SHA `9da78b1ef27cb5af5292fcf57e81b22efcf9281b839d8833778d88279ada4352`.

O primeiro verificador agregado supôs dois WAVs na derrota. A fonte e os eventos reais mostram que o laço autoral coleta uma pastilha no tick seguinte à perda da última vida; o oráculo foi corrigido para exigir essa coleta e os três hashes exatos. O verificador anterior e os resultados dos testes foram preservados; nenhum jogo ou teste foi alterado para aceitar o resultado.

Esta evidência qualifica frame/worker e os cenários descritos. Não constitui aprovação dos fluxos standalone/inspect/playtest, Mural, partida completa, desempenho ou SDK final. O perfil e a imagem composta anteriores não foram regenerados nem promovidos, e a distribuição de QA não ativa Python nos aplicativos remotos.

Também passaram quatro testes reais de captura apresentada: Clássico e Pro em Chrome/Edge, PNG400×300 com pixel vermelho esperado, identidade da revisão, recusa de captura após Stop e execução posterior sem imagem. Zero retries; seis fontes/recibos estáveis antes/depois. Agregado `python-strict-csp-runtime-r1/capture-verification.json`, SHA `98340886c9aaddf2bf9a6b8813805e5671038604ab57df0323c3f9454988f800`. Este recorte verifica o caminho de captura após o delta compartilhado do limite de imagens, sem transferir o resultado ao fluxo Pinta ainda em implementação.

## Política do documento externo

A execução do inspetor completo identificou outra causa, independente do probe Zod. Na fixture antiga, `connect-src 'self'` bloqueava a consulta a `/v1/runtime-deployments/<manifestSha256>` na origem separada do runtime. Dez casos terminaram `Failed to fetch`; o caso de conteúdo corrompido foi recusado antes dessa fase e passou sua expectativa negativa. Os traces e essa rodada permanecem em `python-strict-csp-runtime-r1/chrome-inspection-r1/`.

O player publicado tinha a mesma omissão: autorizava a pasta do preview e a pasta dos artefatos, mas não o caminho irmão dos metadados. Fixture e player agora permitem o deployment exato da release já verificada, além dos caminhos anteriores. Não foram acrescentados curingas de origem/release ou permissões de avaliação de código. O teste de contrato do player reproduziu a ausência do caminho e passou depois da correção, junto com os dez casos/72 asserções da suíte.

O novo host de QA carregou a fixture corrigida, preservando os bytes imutáveis da distribuição43fa. Os 22 casos reais do inspetor passaram em Chrome/Edge sem retries, incluindo estrutura, sintaxe, codificação e integridade, com console/página sem erros e iframe retirado. Agregado `python-outer-csp-r1/inspection-verification.json`, SHA40b2a8f1. Os dois tsconfigs completos de Studio Runtime passaram com Node24.22/TypeScript5.9.3; Biome conferiu os quatro arquivos. Recibo do lote `python-outer-csp-r1/receipt.json`, SHA137ce3af. A prova de publicação do preview e o SDK composto final continuam pendentes.
