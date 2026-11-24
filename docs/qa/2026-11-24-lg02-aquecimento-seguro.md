# LG02 — aquecimento seguro: recibo de qualificação

Em qualificação em 24/11/2026. Produção conserva a LG01. A matriz do executor hospedado passou; CI completo, atualização dos aplicativos de staging e aceite autenticado da fonte final ainda estão em andamento.

## Fonte e integração

- Produção: `538ae843b7534239a715a1d0a6c2a9d32d54604d`.
- Fonte qualificada do código de produção: `a365206598c9175e8f999801eba5a6fb74d613db`; árvore `e6b63426127831235dc98d34820fe1869a85b74c`. Candidata final `e1b5fcd17c594b47a4ffbc5757c08bdc13a61376`, árvore `d610b8646d64819a15d1e0ba7107866017c908ac`: muda apenas cenários tipados do core e o registro. [Comparação de proveniência](2026-11-24-lg02-evidence/candidate-provenance.json).
- [PR #286](https://github.com/informach/sistema-zero/pull/286), em rascunho até o aceite.
- Merge do SDK em staging: `6c538f77fd5881a4365f16ba2600fd5e33003c4b`; merge da correção tipada: `9ca0696aef5a536846525704b9d01261e2bd0da7`. Preservaram Jardim, voz do Zappy, o contrato de importação Jardim (`84112d04d`) e as entradas posteriores de apelido/quarto. O checkout original com trabalho concorrente permanece preservado.
- [CI da candidata final](https://github.com/informach/sistema-zero/actions/runs/45387995897) e [CI/onda final de staging](https://github.com/informach/sistema-zero/actions/runs/45388063256): pendentes neste registro. A rodada anterior `45378554025` reprovou três cenários mal tipados do core; a reprodução local e a correção estão no plano, com typecheck e 16 testes/106 expectativas aprovados.
- [Plano Railway final](https://github.com/informach/sistema-zero/actions/runs/45387995836): aprovado, zero alterações, intent tree `0bec132654ae9d0b8630a2d10e62f5fbc9e4bf13`.
- [Imagem Linux de staging](https://github.com/informach/sistema-zero/actions/runs/45378574254): aprovada, incluindo Python e Three reais sem rede externa.

## Correções

R12: duas verificações do mesmo perfil podiam compartilhar uma máquina; a falha de uma destruía o trabalho da outra. O coordenador SQLite agora entrega posse exclusiva, com token e nome por geração. Só uma máquina comprovadamente limpa pode ser reutilizada. Expiração, liberação atrasada e perda de confirmação não autorizam destruir o recurso de um sucessor.

O cache possui limite compartilhado por classe: 10 máquinas gerais e 2 para navegação 3D, dentro dos tetos existentes de 50/10. Com cache saudável cheio, outro aquecimento é dispensado e uma nova verificação usa máquina exclusiva descartável. Uma vaga expirada só é substituída após invalidar sua posse e confirmar o descarte; falha de destruição permanece contabilizada.

R16: o SDK 0.10.3 encerrava a conexão RPC ainda pendente durante provisionamento. A candidata usa a [correção oficial 0.12.12](https://github.com/cloudflare/sandbox-sdk/issues/928), alinhada ao binário Docker e à fixture Linux. A tentativa de capacidade que falhava com RPC encerrado passou no SDK corrigido, preservando os tetos. O serviço de linguagem conserva sua dependência anterior e transporte HTTP padrão.

O instrumento QA também foi corrigido: `.bind()` sobre método RPC nativo chamava um método remoto inexistente. A reprodução mínima falhou com bind e passou com Reflect.apply. Resultados de descarte anteriores a essa correção foram invalidados; continuam diagnósticos. As falhas posteriores do SDK anterior também não contam como aceite final.

## Verificação local e imagem

Runtime: **440 testes aprovados, 56 condicionais pulados, zero falhas**, 4.683 expectativas. Tipos de fonte/testes, Biome, perfil de validação e diff aprovados. Os condicionais pulados não equivalem a aceite dos seus percursos hospedados.

A prova nativa usa SQLite/workerd reais: 12 aquisições concorrentes, reinício do coordenador, limite entre perfis, expiração, retirada, liberação antiga e confirmação perdida. A regressão de encaminhamento RPC integra essa prova.

Imagem `sha256:2bff6dacad67f4890c9b69242bc5d83d6f02473489b346d5de390b24a295488a`, fingerprint `b0e3c675af3cad13d368c6a5dd39388b65f5fd63bacd2aa7ca2b406ab109a98c`: smoke com UID 1000, dependências protegidas, rede desabilitada, aquecimento e inicialização do binário `/sandbox` com TCP 3000 pronto. A [imagem exata implantada](2026-11-24-lg02-evidence/exact-image.json) passou 66 cenários: seis kits, seis modelos, 33 missões Python, quatro verificações de saúde Python e 17 casos Three, incluindo recusas esperadas. Os scripts terminaram com código zero e rede externa desabilitada. O CI também aprovou sua construção independente da mesma fonte/perfil; não se presume identidade dos bytes entre as duas construções.

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

Runtime normal de staging implantado: versão `382058b9-3175-4bb2-b6f0-d312b8fcaf46`, imagem/fingerprint acima. Compilação com `validate:true` e verificação real, chamadas pelo Members de staging, passaram. Nesse instante o Members ainda executava `9a8a1a9f2`; a onda canônica da fonte final é requisito pendente.

O perfil infantil autorizado abriu a primeira aula de A Ilha do Farol e percorreu vídeos, jogo e experiência pelas ações normais. O projeto inicial respondeu indisponibilidade na primeira tentativa (424, 75.135 ms); essa ocorrência permanece registrada sem causa confirmada. A repetição respondeu 200 em 36.539 ms, reprovando corretamente os cinco objetivos e sem prêmio.

Para preparar o projeto válido de homologação, foi inserido pelo Blockly o comando de movimento com velocidade 4, no início do laço, preservando o restante do projeto. A verificação pela interface passou os cinco objetivos em 30.843 ms e concedeu o prêmio normal: +30 XP/+15 moedas (960→990 XP; 505→520 moedas). Após mais de cinco minutos sem usar o executor, o descarte do recurso expirado apareceu no log; uma nova máquina aprovou novamente os cinco objetivos em 32.198 ms, sem repetir XP ou moedas. A indisponibilidade inicial não se repetiu nesse caso.

No curso 2D A Chave do Farol, foram percorridos vídeo e experiência da parte disponível. O projeto inicial reprovou os seis objetivos em 5.668 ms, sem prêmio. Após inserir pelo Blockly os controles direcionais e o movimento do personagem, a interface aprovou os seis objetivos em 10.152 ms e concedeu o prêmio normal de +30 XP/+15 moedas. O perfil ficou com 1.020 XP/535 moedas e recebeu a conquista automática `studio-master-3`. Nenhum prêmio foi atribuído manualmente. Ainda falta repetir aquecimento e verificações após atualizar os aplicativos para a fonte final, incluindo recusas de sessão/acesso/revisão. Nenhum recado, post ou envio ao professor foi feito.

## Entradas concorrentes incluídas na revisão

Durante a qualificação entraram `3372f2498` (a criança edita o próprio apelido) e `53fc30329` (rolagem do quarto). Foram preservados no merge de staging `9ca0696ae`, junto da correção dos cenários tipados da LG02 (`e1b5fcd17`). A candidata de produção da LG02 não inclui essas duas funcionalidades concorrentes; sua promoção é independente.

A revisão conferiu ownership, restrições do nome completo/nascimento, preservação da identidade confirmada, atualização do token e os contêineres de rolagem. Passaram 125 testes Auth, quatro do BFF e dez da interface perfil/quarto, zero falhas. Os typechecks completos de Auth, member-shell e Kids também passaram localmente sobre `9ca0696ae`, com o lockfile congelado e heap de 6.144 MiB. O apelido aceita 2–40 caracteres, normaliza espaços e não exige unicidade. A troca não altera o nome do certificado. Se a renovação da sessão estiver indisponível, o menu pode conservar o apelido antigo até a próxima renovação (token de até 15 minutos); o valor salvo permanece atualizado. Os pais continuam podendo corrigir o apelido. O quarto preserva a rolagem interna de itens; o ajuste contém os elementos de acessibilidade para não esticar a página.

## Efeito e limitações para a criança

Ao abrir ou editar uma parte JavaScript/Pro elegível, o Verificar pode encontrar a máquina preparada. Verificações sucessivas podem reutilizá-la; duas abas mantêm posse separada durante sobreposição. Aquecer não conclui parte nem concede XP. O jogo grande da sessão real levou cerca de 31 s para executar seus cinco objetivos; a mediana sintética de 3,50 s não se aplica a ele.

Cache cheio, falha de coordenação, primeira visita e retorno após expiração podem exigir máquina nova. A capacidade física e sua disponibilização continuam limitando a execução; a mudança não garante disponibilidade ou ganho em todo pedido. O aquecimento respeita aba visível e intervalo de três minutos nas edições; suspensão e cache ocioso têm prazo de cinco minutos. Python, catálogos, permissões do Estúdio e publicações das outras etapas não foram ampliados.

Interrupção: `STUDIO_CHECK_WARMING_ENABLED=0` conserva o caminho exclusivo da LG01 e a migração SQLite. Não reverter removendo a classe criada.

Pendentes: CI final, onda dos aplicativos em staging, aceite integrado da fonte final, promoção e conferências posteriores em produção. A LG02 não está em produção neste registro.
