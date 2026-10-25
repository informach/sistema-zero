# Objetivos executáveis de Jogo 3D e three.js

## Contrato implementado

O executor protegido abre o jogo e observa o resultado das ações. No clássico, a extensão Jogo 3D usa os arquivos ESM da versão oficial do Three incluída na imagem. O teste não depende de uma conexão à CDN. A versão, os caminhos reais e os limites de leitura são conferidos; pedidos fora desse conjunto continuam bloqueados.

No Pro, o professor pode indicar um arquivo e o caminho de um valor exportado: `src/main.ts` e `jogador.position.z`, por exemplo. O aluno escreve `export const jogador`. O teste lê o namespace ES usado pelo próprio programa; não exporta variáveis automaticamente nem avalia uma expressão arbitrária. Arquivo inexistente, exportação ausente, caminho inválido e acesso a protótipos não aprovam o objetivo. Esse alvo é exclusivo de JavaScript Pro.

As comparações continuam no servidor. O professor pode exigir que a coordenada aumente ou diminua, preservando a liberdade de velocidade, aparência e modelo. Um erro não tratado do programa impede aprovação de qualquer tipo de objetivo executável, inclusive console, função e script. Isso corrige uma aprovação indevida encontrada durante a prova real.

## Prova real na imagem

- Log: `.cache/python-missions-20261024/three-real-final-r5.log`.
- Tentativa: `three-objectives/2b8a8757-8325-4314-8dd4-5a49303f06a4`, 17 cenários, todos com o resultado esperado.
- Janela do log: 25/10/2026, 00:39:43–00:42:09 UTC.
- Imagem fixada: `sha256:7e83c514e316df2b82e17cc0b554adc9dce148018bf758179219daf200b0cbb9`.
- Perfil: `efa3f3815bd46e70aa166e36ac63a9677498c391f09ccbdc567fc74ca351d9ad`.
- Recibo agregado: `three-proof-final-r1.json`, SHA-256 `137c97ddeeaa9169ac0992fe12f4412215636292a9e794f51c3fd8869bf7f8a0`.

| Cenários | Resultado observado |
|---|---|
| Exemplo oficial de cubo produzido dos blocos | Rotação Y real aprovada; captura da cena renderizada |
| Clássico e Pro, coordenada Z com velocidades 3 e 9 | Ambos os valores coerentes aprovados |
| Clássico e Pro, velocidade -3 e zero | Direção errada e ausência de movimento recusadas |
| Clássico e Pro, coordenadas X e Y | Movimento real aprovado nos quatro cenários |
| Pro sem exportar a variável | Leitura recusada, embora a cena continue desenhando |
| Pro com função retornando a resposta errada | Movimento aprovado e função recusada, separadamente |
| Pro com exceção na inicialização | Todos os objetivos recusados |
| Pro tentando acessar a rede externa | Tentativa bloqueada e tratada pela função; jogo local continua executando |

As cenas foram construídas pelo pipeline real do clássico e compiladas com Vite/Three no Pro. A prova verifica chamadas reais do renderer, coleta JPEG por objetivo e confirma saída/encerramento dos 17 contêineres. A captura do Pro e a do cubo em blocos foram inspecionadas visualmente. Rede desativada, UID 1000, 1 GiB, um núcleo, rootfs somente leitura e capacidades removidas permanecem exigidos. Isso qualifica os cenários descritos; não é prova de todos os jogos ou de desempenho hospedado.

## Negativos preservados e correções

1. A primeira rota usava um redirecionamento para o módulo oficial. A resolução offline não carregou a dependência relativa. O documento do teste passou a apontar diretamente para `build/three.module.js`; os bytes oficiais não são reescritos.
2. Em `three-real-final-r4.log`, o objetivo de console aprovou mesmo com `QA erro 3D` em `observation.errors`. A regressão RED/GREEN está em `uncaught-objective-{red,green}-r1.log`; a régua canônica agora recusa esses erros antes de comparar. A tentativa final repetiu todos os 17 cenários.
3. O CI anterior identificou que a rota Python de 4.500.000 bytes excedia o limite geral padrão do gateway. O padrão agora usa o mesmo contrato canônico. Limites explícitos menores continuam recusados no boot e os limites particulares das demais rotas permanecem menores. RED/GREEN preservados em `gateway-body-{red,green}-r1.log`.
4. Uma execução anterior do Chromium 148 encerrou antes dos testes com `SIGSEGV`. A dependência isolada da imagem foi atualizada de Playwright 1.60.0 para 1.64.1; a matriz 3D passou nessa imagem. Isso não demonstra, por si só, a causa do sinal anterior nem dispensa o CI Linux e as regressões Python.

## Verificações complementares e fronteiras abertas

- Core completo: 1.564 testes / 81.766 asserções, sem falhas (`core-full-three-r1.log`).
- Gateway completo: 291 testes / 1.218 asserções, sem falhas; dois testes Redis ignorados por pré-requisito (`gateway-full-body-r1.log`).
- Resolvedor oficial: cinco testes / 17 asserções, incluindo versão/origem/caminho, escape por link e arquivo excessivo (`three-module-security-r2.log`).
- Formulário Admin: seis testes / 37 asserções, incluindo o novo alvo Pro e preservação dos controles Python/Raylib (`admin-three-final-r2.log`).
- Tipagem completa do runtime, produção e testes: exit 0 (`three-runtime-types-final-r2.log`).
- Tipagem completa Members e Admin: exit 0 (`members-types-three-r1.log`, `admin-types-three-r1.log`).
- Runtime completo: 329 testes / 3.695 asserções, sem falhas, um teste nativo ignorado (`runtime-full-three-r2.log`). A primeira rodada teve um encerramento 9 sem diagnóstico no filho Node da prova de entrega HTTP. O teste passou isolado e com seus vizinhos; a suíte completa seguinte passou. O negativo original permanece e sua causa não foi determinada.
- Python na imagem final: 25 cenários de objetivos e quatro de saúde com os resultados esperados (`python-new-browser-final-r1.log`, `python-health-new-browser-r1.log`). A distribuição qualificada é `d0443c77ba985acf015b5591b63a7fe5d71ed16fa2bbc7674cf6f032a09c41d2`. Os quatro casos de saúde têm recibos individuais de limpeza. Os 25 nomes de contêiner dos objetivos foram conferidos após a matriz, sem remanescentes (`python-final-cleanup-postcheck-r1.json`); o harness passou a exigir recibos individuais nas próximas execuções.
- Contratos CI/release: 333 testes / 1.215 asserções, sem falhas (`ci-contracts-three-r2.log`). O controle que inicia vários processos Git/Bash ultrapassou o padrão de cinco segundos em Windows; recebeu um limite explícito e finito de 30 s. Isso não altera prazo de produto ou deploy.
- Biome completo: exit 0, 37 avisos e 169 informações preexistentes (`biome-three-final-r1.log`). Auditoria das dependências da imagem: nenhuma vulnerabilidade (`image-audit-three-r1.log`).
- Regressão JavaScript real na imagem final: image smoke não privilegiado aprovado e os seis kits aprovados, incluindo Three Exploration e Three Tactics (`image-js-three-r1.log`, `validation-js-three-r1.log`). Essa prova cobre boot, pausa, entrada, objetivo, reinício e captura dos kits; não é a totalidade da plataforma JavaScript.
- O CI `40148654543` confirmou as provas reais Python e Three, mas expôs duas expectativas antigas do Admin que ainda proibiam 3D e não mencionavam exportações Pro. Atualizadas as expectativas e mantidas as recusas de alvos de sprite 2D; Admin completo: 920 testes / 3.873 asserções, sem falhas (`admin-full-three-r1.log`).
- O build operacional revelou que o gerador do promotor não preservava `nodejs_compat`, já exigido pelo componente-base e pelo SHA-256 nativo. O commit `d3b156b2d` corrigiu o gerador; RED/GREEN preservados, 14 testes / 97 asserções aprovados (`promoter-native-flag-{red,green}-r1.log`). Nenhum catálogo foi ativado para contornar o achado.

O CI recebeu uma prova real independente de 3D e preserva resumo, captura e recibo de limpeza. CI remoto, publicação da imagem, promoção do catálogo Python e validação hospedada ainda precisam terminar. Raylib Python 3D pertence a outra integração e não está qualificado por estes testes Three JavaScript. Esta entrega não altera roteiros nem afirma deploy concluído.
