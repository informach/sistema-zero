# LG02 — aquecimento seguro: recibo de qualificação

Entregue em produção em 24/11/2026: sete serviços saudáveis em `0180e39fdc4717ed3becb42c899e8c837b9fa4fd`, runtime/imagem qualificados e conferências posteriores aprovadas. A matriz do executor hospedado, os CIs completos, a onda canônica dos 20 serviços de staging e o aceite autenticado passaram. [Recibo de produção](2026-11-24-lg02-evidence/production-release.json).

## Fonte e integração

- Base anterior de produção: LG01 `538ae843b7534239a715a1d0a6c2a9d32d54604d`. Fonte implantada da LG02: `0180e39fdc4717ed3becb42c899e8c837b9fa4fd`.
- Fonte qualificada do código de produção: `a365206598c9175e8f999801eba5a6fb74d613db`; árvore `e6b63426127831235dc98d34820fe1869a85b74c`. Candidata final `e1b5fcd17c594b47a4ffbc5757c08bdc13a61376`, árvore `d610b8646d64819a15d1e0ba7107866017c908ac`: muda apenas cenários tipados do core e o registro. [Comparação de proveniência](2026-11-24-lg02-evidence/candidate-provenance.json).
- [PR #286](https://github.com/informach/sistema-zero/pull/286), integrado normalmente após o aceite; árvore promovida idêntica à candidata aprovada. O controlador conferiu os nove jobs obrigatórios da mesma tentativa e o plano do mesmo PR antes de acessar provedores.
- Merge do SDK em staging: `6c538f77fd5881a4365f16ba2600fd5e33003c4b`; merge da correção tipada: `9ca0696aef5a536846525704b9d01261e2bd0da7`. Preservaram Jardim, voz do Zappy, o contrato de importação Jardim (`84112d04d`) e as entradas posteriores de apelido/quarto. O checkout original com trabalho concorrente permanece preservado.
- [CI da candidata final](https://github.com/informach/sistema-zero/actions/runs/45387995897): aprovado nos 13 jobs de validação. [CI/onda final de staging](https://github.com/informach/sistema-zero/actions/runs/45388063256): CI e implantação aprovados; 20 serviços saudáveis em `9ca0696ae`. [Recibos dos CIs](2026-11-24-lg02-evidence/final-ci.json) e [da onda](2026-11-24-lg02-evidence/staging-wave-final.json). A rodada anterior `45378554025` reprovou três cenários mal tipados do core; a reprodução local e a correção estão no plano, com typecheck e 16 testes/106 expectativas aprovados. A prova de dez mil blocos `45387995801` também passou na candidata final.
- [Plano Railway final](https://github.com/informach/sistema-zero/actions/runs/45387995836): aprovado, zero alterações, intent tree `0bec132654ae9d0b8630a2d10e62f5fbc9e4bf13`.
- [Imagem Linux de staging](https://github.com/informach/sistema-zero/actions/runs/45378574254): aprovada, incluindo Python e Three reais sem rede externa.

O [inventário incremental](../../.audits/review-7-dias-2026-11-23/inventory-lg02-followup.json) registra 19 commits sem merges e 75 arquivos entre a LG01 e a fonte implantada da LG02, além de 14 commits exclusivos da linhagem de staging e 53 arquivos no diff entre as fontes. Isso não representa 33 funcionalidades: há documentação, correções e patches equivalentes na linhagem concorrente.

A sincronização automática recusou avançar sobre o trabalho concorrente de staging. O merge normal de `main` gerou `e085f7456a0ca76e139c4420fd38a7698191e688`, sem mudar a árvore `88287b3f494fc38f1acffc32b8d220dae26e3c9b` já qualificada em `9ca0696ae`. `main` tornou-se ancestral de staging e a reexecução da sincronização passou. [Prova de linhagem](2026-11-24-lg02-evidence/branch-sync.json); [CI adicional da integração](https://github.com/informach/sistema-zero/actions/runs/45409232901). Os aplicativos qualificados de staging continuam identificados pela fonte `9ca0696ae`, de conteúdo idêntico.

## Correções

R12: duas verificações do mesmo perfil podiam compartilhar uma máquina; a falha de uma destruía o trabalho da outra. O coordenador SQLite agora entrega posse exclusiva, com token e nome por geração. Só uma máquina comprovadamente limpa pode ser reutilizada. Expiração, liberação atrasada e perda de confirmação não autorizam destruir o recurso de um sucessor.

O cache possui limite compartilhado por classe: 10 máquinas gerais e 2 para navegação 3D, dentro dos tetos existentes de 50/10. Com cache saudável cheio, outro aquecimento é dispensado e uma nova verificação usa máquina exclusiva descartável. Uma vaga expirada só é substituída após invalidar sua posse e confirmar o descarte; falha de destruição permanece contabilizada.

R16: o SDK 0.10.3 encerrava a conexão RPC ainda pendente durante provisionamento. A candidata usa a [correção oficial 0.12.12](https://github.com/cloudflare/sandbox-sdk/issues/928), alinhada ao binário Docker e à fixture Linux. A tentativa de capacidade que falhava com RPC encerrado passou no SDK corrigido, preservando os tetos. O serviço de linguagem conserva sua dependência anterior e transporte HTTP padrão.

O instrumento QA também foi corrigido: `.bind()` sobre método RPC nativo chamava um método remoto inexistente. A reprodução mínima falhou com bind e passou com Reflect.apply. Resultados de descarte anteriores a essa correção foram invalidados; continuam diagnósticos. As falhas posteriores do SDK anterior também não contam como aceite final.

## Verificação local e imagem

Runtime: **440 testes aprovados, 56 condicionais pulados, zero falhas**, 4.683 expectativas. Tipos de fonte/testes, Biome, perfil de validação e diff aprovados. Os condicionais pulados não equivalem a aceite dos seus percursos hospedados.

A prova nativa usa SQLite/workerd reais: 12 aquisições concorrentes, reinício do coordenador, limite entre perfis, expiração, retirada, liberação antiga e confirmação perdida. A regressão de encaminhamento RPC integra essa prova.

Imagem `sha256:2bff6dacad67f4890c9b69242bc5d83d6f02473489b346d5de390b24a295488a`, fingerprint `b0e3c675af3cad13d368c6a5dd39388b65f5fd63bacd2aa7ca2b406ab109a98c`: smoke com UID 1000, dependências protegidas, rede desabilitada, aquecimento e inicialização do binário `/sandbox` com TCP 3000 pronto. A [imagem exata implantada](2026-11-24-lg02-evidence/exact-image.json) passou 66 cenários: seis kits, seis modelos, 33 missões Python, quatro verificações de saúde Python e 17 casos Three, incluindo recusas esperadas. Os scripts terminaram com código zero e rede externa desabilitada. O CI também aprovou sua construção independente da mesma fonte/perfil; não se presume identidade dos bytes entre as duas construções.

O recibo explicita o digest extraído dos 33 comandos Docker originais de missões Python e dos 17 pares de recibos Three, com hashes dos arquivos locais. A prova antiga de saúde Python não guardava a seleção da imagem; seus quatro casos foram repetidos em 24/11 às 15:27 UTC, sobre a fonte de produção `0180e39fd`, com `STUDIO_PYTHON_TEST_IMAGE` fixado no digest acima, inspeção prévia da identidade e resultado aprovado. Esse novo comando, ambiente, fonte, horários e hash do log estão no recibo e fornecem a qualificação de saúde.

## Executor hospedado

[Evidências estruturadas](2026-11-24-lg02-evidence/runtime-qualified.json), todas da candidata `a36520659`. Worker privado `sz-runtime-staging-lg02-qa-4de18539`, versão `f561039e-c33c-41fa-a3d2-8f89b1901d12`, aplicações próprias com a mesma imagem e teto de duas instâncias por classe, cache reduzido a uma vaga. A imagem antiga foi encerrada antes da matriz final; a API confirmou versão 3/imagem nova. Identidades sintéticas; duas páginas Chrome reais via relay local sem token no navegador. As rotas de falha/barreira não são importadas pelo produto.

| Prova | Resultado |
| --- | --- |
| Aquecimento, primeira verificação e repetição | Mesmo recurso, respostas válidas; pedido inválido 400 sem máquina |
| Falha no aquecimento | 500 esperado; descarte e recuperação em outro recurso |
| Duas abas válidas do mesmo perfil | Ambas passaram, com recursos distintos |
| Aquecer durante as duas verificações | 200 dispensado, sem alocar outra máquina |
| Falha de execução na máquina reutilizável | 500 esperado; outra aba passou e recuperação posterior passou |
| Falha de limpeza na máquina reutilizável | Objetivos válidos preservados; outra aba e recuperação passaram |
| Cache ocioso cheio, outros perfis e concorrência | Aquecimentos dispensados; verificações e recuperação passaram |
| Compilação Pro | Válido, repetição e recuperação passaram; erro de sintaxe reprovou o objetivo na mesma máquina |
| Navegação 3D | Aquecimento e duas navegações válidas reutilizaram a classe 3D dedicada |
| Suspensão | API mostrou recurso inativo após 320.378 ms; após 330 s, verificação passou com outro recurso |
| Resposta de liberação perdida | Sucessor manteve sua máquina e marcador; resposta válida |

Latência de HTML pequeno: 10 amostras alternadas por caminho. Mediana de **7.682,5 ms** com máquina exclusiva nova e **3.497 ms** com reutilização; todas passaram e o grupo reutilizável manteve o recurso inicial. As esperas para a API indicar capacidade disponível foram registradas separadamente e excluídas das amostras. A soma de instâncias ativas e atribuídas foi considerada. Isso não mede carga, p95 ou duração de jogos grandes.

O descarte final confirmou a destruição dos recursos sintéticos. As duas aplicações e o Worker privado foram removidos depois das provas. Os buckets compartilhados de staging foram preservados.

## Staging e sessão infantil

Runtime normal de staging implantado: versão `382058b9-3175-4bb2-b6f0-d312b8fcaf46`, imagem/fingerprint acima. Compilação com `validate:true` e verificação real, chamadas pelo Members de staging, passaram. Nesse instante o Members ainda executava `9a8a1a9f2`; a onda canônica da fonte final era um requisito pendente, concluído na rodada descrita abaixo.

O perfil infantil autorizado abriu a primeira aula de A Ilha do Farol e percorreu vídeos, jogo e experiência pelas ações normais. O projeto inicial respondeu indisponibilidade na primeira tentativa (424, 75.135 ms); essa ocorrência permanece registrada sem causa confirmada. A repetição respondeu 200 em 36.539 ms, reprovando corretamente os cinco objetivos e sem prêmio.

Para preparar o projeto válido de homologação, foi inserido pelo Blockly o comando de movimento com velocidade 4, no início do laço, preservando o restante do projeto. A verificação pela interface passou os cinco objetivos em 30.843 ms e concedeu o prêmio normal: +30 XP/+15 moedas (960→990 XP; 505→520 moedas). Após mais de cinco minutos sem usar o executor, o descarte do recurso expirado apareceu no log; uma nova máquina aprovou novamente os cinco objetivos em 32.198 ms, sem repetir XP ou moedas. A indisponibilidade inicial não se repetiu nesse caso.

No curso 2D A Chave do Farol, foram percorridos vídeo e experiência da parte disponível. O projeto inicial reprovou os seis objetivos em 5.668 ms, sem prêmio. Após inserir pelo Blockly os controles direcionais e o movimento do personagem, a interface aprovou os seis objetivos em 10.152 ms e concedeu o prêmio normal de +30 XP/+15 moedas. O perfil ficou com 1.020 XP/535 moedas e recebeu a conquista automática `studio-master-3`. Nenhum prêmio foi atribuído manualmente. Esse percurso antecedeu a onda dos aplicativos finais. Nenhum recado, post ou envio ao professor foi feito.

Após a onda final, a [conferência dentro dos contêineres](2026-11-24-lg02-evidence/staging-app-source.json) confirmou Members, Auth, Gateway e Kids em `9ca0696ae`, com as instâncias antigas retiradas. A [compilação validada e a verificação real](2026-11-24-lg02-evidence/staging-runtime-smoke.json) passaram pelo Members novo, HTTP 200 e fingerprint esperado.

O [aceite infantil final](2026-11-24-lg02-evidence/child-final.json) observou o aquecimento automático na abertura, resposta 202 `warming:true` e aquecimento efetivamente concluído no Worker (5.488 ms). Pedidos sem sessão foram recusados com 401; perfil divergente com 409 `VIEWER_CHANGED`; revisão antiga com 409 `LEARNING_CONFLICT`; parte trancada com 423 `SECTION_LOCKED`. Pedidos autorizados e sua repetição retornaram 202. O 202 aceita a preparação assíncrona; não promete que a máquina já está pronta.

As verificações 2D e 3D foram iniciadas pela interface com 139 ms entre os cliques. O fingerprint do perfil observado foi igual nas abas e os pedidos se sobrepuseram. O 2D aprovou 6/6 objetivos em 6.359 ms; o 3D aprovou 5/5 em 36.398 ms. Ambos concederam zero XP e zero moedas, conservando 1.020 XP/535 moedas. Os [logs do runtime](2026-11-24-lg02-evidence/authenticated-runtime-final.json) confirmaram duas execuções e dois recursos distintos. As duas aulas usam movimento por teclas e a classe geral; navegação por `approachObject3d` usa a classe dedicada e foi provada separadamente na matriz hospedada. O aceite cobre aquecer e verificar; o envio ao professor permanece sem execução, por depender da autorização específica solicitada.

## Entradas concorrentes incluídas na revisão

Durante a qualificação entraram `3372f2498` (a criança edita o próprio apelido) e `53fc30329` (rolagem do quarto). Foram preservados no merge de staging `9ca0696ae`, junto da correção dos cenários tipados da LG02 (`e1b5fcd17`). A candidata de produção da LG02 não inclui essas duas funcionalidades concorrentes; sua promoção é independente.

A revisão conferiu ownership, restrições do nome completo/nascimento, preservação da identidade confirmada, atualização do token e os contêineres de rolagem. Passaram 125 testes Auth, quatro do BFF e dez da interface perfil/quarto, zero falhas. Os typechecks completos de Auth, member-shell e Kids também passaram localmente sobre `9ca0696ae`, com o lockfile congelado e heap de 6.144 MiB. O apelido aceita 2–40 caracteres, normaliza espaços e não exige unicidade. A troca não altera o nome do certificado. Se a renovação da sessão estiver indisponível, o menu pode conservar o apelido antigo até a próxima renovação (token de até 15 minutos); o valor salvo permanece atualizado. Os pais continuam podendo corrigir o apelido. O quarto preserva a rolagem interna de itens; o ajuste contém os elementos de acessibilidade para não esticar a página.

O [aceite visual após a implantação](2026-11-24-lg02-evidence/concurrent-ui-final.json) confirmou apelido editável, telefone disponível e nome completo/nascimento reservados aos responsáveis; nenhum dado foi salvo. Na mesma janela de 1.278×936, o excesso de rolagem externa do quarto caiu de 810 px para zero. A rolagem interna continuou disponível (670 px visíveis para 1.600 px de conteúdo). Nenhum item foi comprado, movido ou salvo. A página original do usuário foi preservada e voltou ao primeiro plano.

A linhagem concorrente também conserva a missão do Jardim, o caderno único ao fim da primeira aula, a correção do clique antes das setas, capas e cadastro de dez partes e o ajuste da geração de voz do Admin para quatro frases simultâneas. Esses materiais, registros e a correção de voz permanecem fora da fonte implantada da LG02; sua promoção acompanha a etapa própria de aulas. O ajuste de voz continua sujeito às cotas do provedor e não representa geração ilimitada.

## Proposta do Construtor recebida durante o fechamento

O [PR #287](https://github.com/informach/sistema-zero/pull/287), ainda em rascunho, acrescentou uma proposta curricular e seis projetos nativos: três aparências do 2D completo, um inicial 2D, um completo 3D e um inicial 3D. As 12 imagens 2D permitem 81 combinações exclusivamente visuais; o 3D usa três modelos provisórios da galeria. Para a criança, a proposta do Construtor prepara abertura, telas de resultado e reinício, concentrando a autoria nas regras; a construção integral do fluxo fica prevista para o Inventor. Isso ainda não representa aulas publicadas nem funcionalidade liberada a alunos.

R17 foi reproduzido e corrigido no próprio branch do protótipo: no Windows o exportador saía com código zero sem exportar, por comparar caminho de arquivo com pathname de URL; o gerador Python também escrevia fontes inválidas em UTF-8 quando o modo UTF-8 estava desligado. O commit `61de040eeb7bb21b7733418ae4d976261fd150ce` usa a comparação de URLs do Node e gravação UTF-8 explícita. A receita completa, o caminho com espaço e a importação do módulo sem efeito de exportação passaram.

O [recibo independente](2026-11-24-lg02-evidence/construtor-pr287-review.json) confirmou os seis projetos pelo sanitizador oficial, preservação na importação, geração de arquivos idêntica e as mesmas regras nas três aparências 2D. Três GLBs foram carregados pelo leitor real, com geometria válida. Os seis projetos permaneceram byte a byte iguais; o ZIP foi atualizado com os geradores corrigidos e conferido. Permanecem pendentes o aceite pela interface/WebGL real, artes 3D definitivas, avaliação de toque/aparelhos e a reautoria de roteiros, manifestos e materiais progressivos. O rascunho continua fora de staging e produção; a correção de ferramentas não publica o currículo.

## Produção

A [onda canônica 45409371184](https://github.com/informach/sistema-zero/actions/runs/45409371184) concluiu `PRODUCTION_WAVE_PASSED`, sem inicializar aplicações novas. Members, Auth, Hub, Gateway, Admin, Comunidade e Kids foram confirmados no commit `0180e39fd` dentro dos contêineres. O recibo guarda os IDs dos sete deployments e o hash do manifesto canônico. A configuração Railway teve zero alterações.

Worker `99386c58-3bca-4964-b11d-ae8ac5239bca`, deployment `5423d440-8a58-430c-8c5d-99e6473f0b6b`, 100% do tráfego, aquecimento ligado. O rollout gradual das duas aplicações foi aguardado até a API confirmar a imagem exata qualificada, com tetos 50/10 e CPU, memória, disco e rede preservados. Aplicação geral: versão 14; navegação 3D: versão 7. Não houve erro de saúde.

Compilação validada, aquecimento e verificação reais passaram antes e depois da onda dos aplicativos. Após a onda, retornaram HTTP 200 em 19.285 ms, 4.635 ms e 2.279 ms, respectivamente, em projeto sintético pequeno. A compilação confirmou o fingerprint `b0e3c675…`. Esses probes não medem o tempo total de uma aula infantil.

Gateway, Admin, Comunidade e Kids responderam 200 nas rotas públicas de saúde. Os quatro manifestos Python anteriores consultados continuaram acessíveis, e o catálogo de produção `2c53c74…` foi preservado. Os [16 registros de cursos antes](2026-11-24-lg02-evidence/production-course-status-before.json) e [depois](2026-11-24-lg02-evidence/production-course-status-after.json) permaneceram integralmente iguais, em consultas somente de leitura. A Ilha do Farol conserva 3/3 aulas publicadas nos dois públicos; Jardim, Pinta e Moedas permanecem em rascunho.

No Members, Cenários permanece `desligado`, Regiões permanece desabilitado e não há lista de contas configurada. Admin, Comunidade e Kids mantêm a prévia isolada e a origem da galeria de exemplos desabilitadas. A LG02 não amplia essas liberações nem estreia o Arquipélago V2.

## Efeito e limitações para a criança

Ao abrir ou editar uma parte JavaScript/Pro elegível, o Verificar pode encontrar a máquina preparada. Verificações sucessivas podem reutilizá-la; duas abas mantêm posse separada durante sobreposição. Aquecer não conclui parte nem concede XP. O jogo grande da sessão real levou cerca de 31 s para executar seus cinco objetivos; a mediana sintética de 3,50 s não se aplica a ele.

Cache cheio, falha de coordenação, primeira visita e retorno após expiração podem exigir máquina nova. A capacidade física e sua disponibilização continuam limitando a execução; a mudança não garante disponibilidade ou ganho em todo pedido. O aquecimento respeita aba visível e intervalo de três minutos nas edições; suspensão e cache ocioso têm prazo de cinco minutos. Python, catálogos, permissões do Estúdio e publicações das outras etapas não foram ampliados.

Interrupção: `STUDIO_CHECK_WARMING_ENABLED=0` conserva o caminho exclusivo da LG01 e a migração SQLite. Não reverter removendo a classe criada.

LG02 concluída em produção. As demais etapas do plano gradual, as novidades concorrentes exclusivas de staging e o envio do projeto ao professor mantêm seus escopos próprios.
