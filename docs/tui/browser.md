# Browser e evidências

O supervisor inicia o Playwright sob um processo Node separado e com ownership da árvore Chromium. Node 22+ e a instalação de Chromium da versão fixada de playwright-core são pré-requisitos; não há fallback que desative o sandbox. No Windows observado, Bun 1.3.11 travou no handshake de lançamento mesmo fora do Job Object; Node 24.15.0 funcionou com Chromium sandbox ativo.

`browser_open` cria contexto de leitura (GET/HEAD, sem WebSockets). `browser_open_interactive` cria contexto Build, sujeito a aprovação porque scripts da página podem produzir efeitos. `browser_navigate_interactive` mantém a mesma regra. O proxy autentica o worker, fixa DNS público e só permite loopback de um serviço do supervisor que continue ativo. Não há conexão ao browser pessoal.

Observe antes de `browser_act`: a ação exige o hash da observação e exatamente um alvo. Upload exige arquivo do workspace e hash revisado; download vira ArtifactRef. Senhas e elementos data-private ficam fora de extração e ações; `browser_login` abre perfil separado por conta para entrada humana. Fechar, cancelar ou vencer o prazo encerra a árvore; reinício marca registros antigos como interrompidos, sem reaplicar ações.

Para preview: iniciar environment e service, abrir browser com serviceId, chamar `preview_revision` e depois `preview_verify` com sourceDigest e assertions includes. São no máximo três verificações por browser/revisão, com parada por repetição. O resultado diferencia verified, failed, stale e unverified.

Uma aplicação só pode fornecer prova de saúde pela sua própria instrumentação. O endpoint local indicado por reporterPath deve retornar `{sourceDigest, success, checks:[{name,success}]}`. O digest deve identificar o build efetivamente servido, calculado sobre os arquivos fonte antes do build; não copiar o digest solicitado sem vinculá-lo ao build. Ausência/erro do reporter nunca é tratada como sucesso. Console, HTTP e exceções são capturados independentemente. O hash de fonte exclui .git, dependências, saídas geradas, caches e segredos; inclui até 30 mil entradas e 128 MB.

`preview_candidate` verifica se a última evidência validada ainda corresponde ao conteúdo atual. Evidência é uma observação de um instante, não promessa sobre mudanças futuras. O viewer local recebe apenas ArtifactRefs explícitos, usa duas origens e token temporário em fragmento, não interpreta HTML de artefatos e não publica conteúdo na internet. Seu comando `viewer.open` é exclusivo do cliente autenticado; o token não entra no contexto do agente.

Limites: dois browsers ativos, 5 minutos ocioso/20 minutos total, 128 MB de tráfego por browser, screenshot de viewport até 1920×1080, 8 MB por upload/download/screenshot. A retenção total de artefatos, telas de controle e prova da distribuição instalada pertencem ao B12. Stagehand e browser remoto não são dependências do motor; o agente existente usa observação e ferramentas determinísticas.
