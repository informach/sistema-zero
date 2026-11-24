# Verificação das correções da Aula 7

## Retomada de 20/11/2026

O usuário autorizou concluir correções, entrega e validação nos dois ambientes, preservando para ele a geração e edição dos vídeos. A aula original deve permanecer em rascunho.

- Produção: novo head `06ffbe3ecef88e1277a6fece0d4140f4b68cca13`, PR #275; CI completa [44705588479](https://github.com/informach/sistema-zero/actions/runs/44705588479) e plano [44705588768](https://github.com/informach/sistema-zero/actions/runs/44705588768).
- O CI anterior falhava em `PreviewIframe.test.tsx:46`: esperado `running`, recebido `preparing`. A leitura do DOM pelo `waitFor` podia terminar antes de o efeito React publicar a fase no `proRun`. Os dois cenários agora aguardam explicitamente essa publicação, sem mudar expectativas ou prazos. Arquivo: 27 aprovados; grupo completo: 547 aprovados, zero falhas. Biome e `git diff --check` aprovados.
- Verificação fresca da produção isolada: 31 testes editoriais/identidade/oficinas/checkout e 26 de certificado aprovados, zero falhas.
- Staging: fonte curada `c7e9c70a4de5ea889c1af4819283887a33add461`, CI anterior concluída com sucesso, deploy pulado. Recuperação Git dos onze serviços em andamento com registro de cada ACK e conferência do hash real, sem falsificar metadados.
- Auth e Members de staging já substituídos; barreira canônica readonly aprovada (`published`, versão 3). Nenhuma nova migração ou alteração da jornada foi necessária. Oferta real: sete dias, `maxProfiles=1`; integração de identidades respondeu 200.
- Leitura dos cursos reais nos dois ambientes confirmou sete aulas, Aula 7 não publicada, três vídeos planejados, campanha `vilao-em-aliado-cade`, certificado presente e presente fora dos requisitos de conclusão.
- Plano de configuração de produção do novo head: zero mudanças. Nenhum `config apply` executado.
- Evidências novas isoladas em `.cache/aula7-pendencias-20261119/retomada-20261120/`. Contas novas usam domínio `.invalid`; cursos temporários têm prefixo `qa-aula7-20261120`. Devem ser arquivados e as contas bloqueadas ao encerrar.

### Staging encerrado nesta retomada

- Onze implantações Git `SUCCESS`, predecessoras `REMOVED`, todas com o commit `c7e9c70a4de5ea889c1af4819283887a33add461`. O SHA, deployment, serviço e ambiente também foram conferidos por SSH dentro dos onze processos. Prova: `recovery-process-sources-staging.json` e `staging-wave-20261120.log`.
- Nova jornada pelo Chrome: responsável com somente curso para pais; presente ativado na conta; resgate repetido manteve o vencimento; nome completo e apelido distintos; segundo perfil recusado com `409 PROFILE_LIMIT_REACHED`; código de aparelho resgatado; entrada real no Cadê. Captura mostra `Farol Azul QA` inteiro na navegação infantil.
- Voz real com áudio sintético: recusada antes da autorização, texto correto depois, recusa imediata após revogar; comércio recusado na sessão infantil.
- Certificado real: sem identidade confirmada retornou `409 PROFILE_IDENTITY_REQUIRED`; após confirmar emitiu PDF; nova mudança privada não alterou o PDF reemitido. Os dois PDFs foram extraídos e contêm o nome completo esperado, não o apelido; textos idênticos.
- Dois cursos sintéticos arquivados e conta `.invalid` bloqueada. A Aula 7 original foi relida e segue em rascunho, três vídeos planejados, presente opcional e certificado presente.
- O fixture reaproveitado precisou usar `extend` para reativar sua matrícula manual de certificado, selecionar a aula pelo slug depois da reordenação e enviar o ator admin na limpeza. Foram ajustes apenas dos instrumentos locais de QA; nenhum contrato da aplicação foi enfraquecido.
- Na produção, a suíte completa do Studio passou no novo CI, assim como os onze jobs auxiliares. A suíte geral continua rodando as provas de banco e os gates finais; nenhuma promoção ocorreu até aqui.

### Promoção e integração das branches

- CI completa de produção [44705588479](https://github.com/informach/sistema-zero/actions/runs/44705588479) concluída com sucesso, todos os doze jobs de verificação aprovados. O PR #275 foi integrado em `5440aa0ddf9180476eb59a006b375e9b394879fc`. Árvore idêntica ao head aprovado `06ffbe3ecef88e1277a6fece0d4140f4b68cca13`: `dd9ec0ec3dba3c6a54bf2b7b6c12be237096c84b`.
- Configuração de produção pós-merge [44711462083](https://github.com/informach/sistema-zero/actions/runs/44711462083): aprovada. A recuperação continua exigindo prova do PR, árvore, nove jobs obrigatórios da mesma tentativa e plano do head exato antes de cada mutação.
- Produção: Members e Auth atualizados, predecessores retirados e barreira readonly aprovada (`published`, versão 4). Catalog e Payments atualizados; Referrals também verificado. Aplicações em implantação. Prova em `production-wave-20261120.log`.
- A sincronização automática de main recusou corretamente reescrever staging divergente. A integração foi feita na worktree `sistema-zero-aula7-sync-20261120`, sem alterar o checkout compartilhado.
- Os conflitos preservaram as regras editoriais mais recentes, os testes de privacidade mais fortes, as documentações das frentes paralelas, os 164 registros de migration de main e a nova migration `0164_cenarios_publicacoes` de staging. A espera de publicação do proRun foi combinada com a captura atual do iframe, e o teste de mídia usa a galeria suportada. O objeto duplicado que o merge automático criou no teste de repositório foi corrigido.
- Regressões da integração: Biome dos arquivos alterados aprovado; 44 casos de Aula 7/identidade/oficinas/checkout aprovados; grupo completo do Studio com 584 testes em 67 arquivos aprovado; sete roteiros/23 clipes com zero erros; journal JSON completo e sem índices/timestamps duplicados.
- Os novos commits de documentação concorrentes também foram preservados. Merge final `9a422832de47977450d0078639a5309e1317c903` enviado para staging por push comum, sem força. Main e o antigo head de staging são ancestrais do resultado. Nova CI completa [44712728471](https://github.com/informach/sistema-zero/actions/runs/44712728471) em andamento.

### Fechamento da entrega da Aula 7

Os cinco achados foram corrigidos e publicados. A consulta final ao Railway retornou onze serviços `SUCCESS` com o SHA esperado em cada ambiente, zero divergências. Os 22 processos também foram conferidos por SSH, incluindo deployment, serviço e ambiente; as instâncias predecessoras foram retiradas. Fontes: staging `c7e9c70a4de5ea889c1af4819283887a33add461`, produção `5440aa0ddf9180476eb59a006b375e9b394879fc`. Cada fonte passou pela sua CI completa: [44654026267](https://github.com/informach/sistema-zero/actions/runs/44654026267) e [44705588479](https://github.com/informach/sistema-zero/actions/runs/44705588479).

Em produção, a nova jornada real pelo Chrome confirmou ativação gratuita, resgate repetido com o mesmo vencimento, identidade privada/pública distinta, limite de um perfil (`409 PROFILE_LIMIT_REACHED`), código do aparelho e entrada no Cadê. Voz: bloqueada sem autorização, áudio sintético transcrito depois de autorizar, nova recusa imediata depois de revogar e comércio recusado à sessão infantil. Certificado: recusa sem identidade confirmada, PDF com nome completo após confirmar, nova emissão idêntica após alteração privada posterior; ambos os PDFs foram extraídos e não contêm o apelido. O checkout adulto reutilizou nome/e-mail e o mesmo checkout, estado `READY`, sem pagamento ou cobrança criados. Foram arquivados os dois cursos temporários e bloqueada a conta `.invalid`. Em ambos os ambientes, a leitura final da Aula 7 original confirmou rascunho, três vídeos planejados, campanha correta, presente opcional e certificado presente.

A CI da integração `9a422832d` revelou uma corrida no teste E2E do Pinta: o trace inicia `reload` 44 ms após clicar Voltar, antes do `flush` assíncrono terminar e a galeria reaparecer. O teste agora aguarda o heading real da galeria, preservando as verificações de células reabertas. A reprodução exata passou localmente e a suíte completa teve 19 aprovados, incluindo CPU 4x, sem retries. Commit `00e4fbede8b7f307223bac5c9a8db3423476a612` enviado sem força.

O novo commit concorrente `c831c0c5a7f19e86c955a2d2656c4b18a688abca` de Molda Cenários preservou main e a integração como ancestrais, mas cancelou a CI de `00e4fbede`. A nova CI [44714649731](https://github.com/informach/sistema-zero/actions/runs/44714649731) está em andamento. Ela contém 44 arquivos adicionais de outra frente e não é apresentada como uma verificação concluída neste relatório. Não foram sobrescritos ou revertidos esses commits. A comparação final comprovou os oito arquivos de runtime das correções idênticos em produção, staging publicada e staging integrada; o validador editorial da staging integrada conserva a regra adicional de travessão e passou nas sete aulas/23 clipes. Prova: `retomada-20261120/final-source-parity.json`.

Pedido adicional do usuário: os oito depoimentos dos slides de 13/11 foram extraídos integralmente para `C:/Users/tocha/Downloads/Depoimentos - Transformando o vilão em aliado`, com aula, parte e ordem nos nomes e um LEIA-ME com duração e ponto de entrada. Os hashes são idênticos aos bytes do PPTX e todos os vídeos/áudios passaram pela decodificação completa do FFmpeg. Nenhum vídeo de aula foi gerado ou editado. Inventário privado: `retomada-20261120/depoimentos-organizados.json`.

Estado final: entrega técnica da Aula 7 publicada e validada nos dois ambientes; geração e edição dos três vídeos com o usuário; CI mais recente da staging concorrente ainda em execução.

## Histórico das verificações anteriores ao fechamento

As quatro reproduções ficaram vermelhas antes da correção e verdes depois. O caso adicional de lista de inscrições também falhou antes e passou depois.

## Código versionado

- Staging padrão: d45c12776 (entrega), 59132f456 (caderno), 1d13512a7 (listas de oficinas). As alterações paralelas foram preservadas e continuaram sendo integradas por outra sessão.
- Produção: PR #275, cabeça 540cf5ded4168402f7264451c4c7b29c4314d1ac, ainda aguardando promoção pelo CI.
- Fonte preparada para staging: branch curada fix/aula7-review-staging-20261119, c7e9c70a4de5ea889c1af4819283887a33add461, baseada na mesma base f44648d9b usada na versão enviada antes por upload. A CI separada evita cancelamentos causados por novos commits paralelos.

## Evidência local

| Verificação | Resultado |
| --- | --- |
| Members, unitários/integração na árvore principal | 2.244 aprovados; 2 ignorados; 0 falhas |
| Hub completo | 188 aprovados; 53 ignorados; 0 falhas |
| Member-shell completo | 2.544 aprovados; 0 falhas |
| Community completo | 118 aprovados; 0 falhas |
| Produção isolada, cenários das correções | 44 aprovados; 0 falhas |
| Staging isolado, cenários das correções | 44 aprovados; 0 falhas |
| Aulas ao vivo na produção isolada | 198 aprovados em 23 arquivos; 0 falhas |
| Área dos pais Kids, depois de corrigir o mock | 28 aprovados; 0 falhas |
| Editorial na árvore principal | 32 aprovados; 0 falhas |
| Editorial da produção isolada | 19 aprovados; 0 falhas |
| Editorial da base isolada de staging | 19 aprovados; 0 falhas |
| Roteiros globais, produção e staging isolados | 58 aulas; 315 clipes; 0 erros |
| Validador de roteiros, controles negativos | Rejeita tag inválida, direção ausente e TXT desatualizado |
| PostgreSQL real descartável, Auth | 75 aprovados; 0 falhas |
| PostgreSQL real descartável, Referrals | 43 aprovados; 0 falhas |
| Biome completo na produção isolada | 14.761 arquivos; exit 0 |
| Tipos globais da produção isolada | 47 pacotes; exit 0 |
| Fixture SQL de autoria e publicação, PostgreSQL descartável | 5 aprovados; 0 falhas; colunas atuais learner/modality |
| Builds de produção de Kids e Community | exit 0, sem desligar tipos/checagens |

## Limites da árvore compartilhada

O typecheck local de Members encontrou erros do SymbolNames/ReadonlySet no trabalho paralelo do Studio; as duas ocorrências de inferência de UUID no teste novo foram corrigidas. A checagem do Members isolado passou. Na suíte completa local do Kids houve 1.691 casos aprovados e oito falhas nas experiências interativas (moldura/pergunta/som), fora dos arquivos alterados para os cinco achados; as verificações do CI das versões isoladas são a prova necessária para a publicação. O mock antigo da consulta de ofertas no teste parent-courses foi corrigido; seus 28 cenários passaram juntos com parent-surfaces.

## Republicação

O inventário confirmou 22 deployments saudáveis sem commitHash. A barreira canônica recusa esse estado antes do SSH. A recuperação deve usar a operação Git serviceInstanceDeployV2 com commit explícito, após os checks de fonte, e comprovar o hash real no deployment e no processo. Não se deve fabricar metadados, desativar a barreira ou alterar contratos da jornada V1. Baselines, script de recuperação e logs ficam no cache ignorado.

## Correções e regressões canônicas

- R02: Hub consulta identidade atual inclusive para UUID legado igual ao da conta. Members só retorna primeiro nome de equipe depois de consultar o diretório ativo do Auth. Ausência/erro não recupera nomes privados históricos. Testes: `packages/hub/tests/unit/public-author-identities.test.ts` e `packages/members/tests/integration/public-author-identities.test.ts`.
- R03: sessão de perfil é determinada na fronteira HTTP por contexto confiável, não pela desigualdade dos UUIDs. A emissão nova exige nome completo confirmado no Auth; replay de certificado já emitido permanece imutável. Testes de `issue-certificate` incluem as duas condições do legado e indisponibilidade do Auth.
- R04: oficinas projetam apelidos completos atuais nos participantes, mensagens antigas, listas de inscrição e autorização de mídia. Consulta ao Auth ocorre depois de liberar a transação, inclusive em pool de uma conexão; IDs das mensagens são ocultados depois da resolução. `live-public-identities.test.ts` comprova atualização, lote, falha segura, adultos e ausência de chamada dentro do lock.
- R05: checkout apresenta mês, ano ou intervalo de N meses conforme a oferta. `commerce-purchase-form.test.tsx` renderiza React real para 1, 3, 6, 12 meses e pagamento único.
- Fonte editorial: o validador Python ainda tratava todas as aulas de pais como gravação humana sem TXT. Essa exceção obsoleta foi retirada para aplicar o contrato ElevenLabs completo aos roteiros atuais, preservando as validações de direção de voz e exportação.

CI das fontes atuais: produção [44646481805](https://github.com/informach/sistema-zero/actions/runs/44646481805); staging [44646481607](https://github.com/informach/sistema-zero/actions/runs/44646481607). Em andamento; publicação ainda não executada. A primeira tentativa de produção teve 11 jobs aprovados e uma falha no cenário de erro de runtime de PreviewIframe (fase esperada error, recebida running). O arquivo exato passou localmente com 27 testes; o grupo completo de 65 arquivos passou com 547 testes. Uma nova tentativa COMPLETA do workflow foi solicitada, sem mudar fonte, asserções ou limites. O primeiro resultado permanece registrado como falha e não autoriza promoção.

A conferência SQL completa local também identificou fixtures esparsas sem as colunas atuais de courses. content-readiness-fixture e test-database agora fornecem modality/learner com os mesmos defaults do schema. Os cinco cenários de autoria/publicação passaram em banco novo. No Windows, o teste de seed atingiu seu limite de 5 segundos sob carga; no diagnóstico isolado os seis cenários passaram, primeiro em 4.812 ms. A manutenção do Pensa precisa de pg_dump, ausente no PATH local. A rodada Linux do CI mantém seus deadlines e ferramentas canônicos.

Infraestrutura: o plano de staging inicialmente propunha excluir a variável existente members.CENARIOS_MODO. A lista de preservação agora a declara apenas em staging, sem ler ou trocar seu valor. O plano e a checagem remota passaram com zero alterações após o commit; todos os 22 triggers nativos dos serviços selecionados estão desativados. Nenhum apply foi executado.

Resultado da conferência DB local ampla: 423 pass, 93 skip, 9 fail e 3 errors. As falhas conhecidas se dividem na fixture learner já corrigida/retestada, timeout do seed (diagnóstico isolado verde), pg_dump ausente no Windows e duas recusas do guard por uso de 127.0.0.1 onde o contrato exige localhost. Essa execução não é apresentada como suíte completa verde; o CI Linux permanece o gate da publicação. O contêiner descartável foi encerrado automaticamente.

## Bloqueio adicional na galeria do Studio

A contagem inicial do monitor não incluía jobs cancelados. A conferência completa mostrou que os shards Chromium 1/2 das duas versões tinham repetidas falhas de galeria e atingiram o limite do job. A reprodução mínima local confirmou requestfailed para https://blockly-demo.appspot.com/static/media/sprites.png com net::ERR_BLOCKED_BY_ORB. Esses runs anteriores NÃO estão aprovados.

Foi reaproveitada a correção versionada 0b169f837, que aponta Blockly para mídia local e inclui os bytes exatos do pacote instalado e sua licença nos quatro hosts. O novo teste de imagem foi ajustado para abrir a galeria existente, já que sua rota original de aula não existe nesta base. A reprodução vermelha passou após a correção; oito cenários reais repetidos (imagem local, Canvas e 3D estreito) passaram sem retries nem filtros de console. Checagem dos arquivos e Biome passaram nas duas versões. A galeria completa local e as novas rodadas de CI continuam em andamento.

A galeria completa com a correção de mídia passou: **206 testes, zero falhas, sem retries**, em 17,4 minutos. Foram usados os specs originais commitados e o mesmo build recém-gerado, servido pelo Vite no Node. Duas tentativas anteriores de iniciar o preview pelo Bun no Windows atingiram o limite do webServer; uma execução avançou 25 casos e apresentou carregamento da galeria. O caso foi repetido três vezes com o servidor Node e a suíte inteira depois passou. Nenhum timeout ou expectativa foi alterado. O servidor de verificação próprio foi encerrado; o Node PID foi validado pelo comando antes de encerrá-lo. Novos builds completos de Kids/Community e typecheck de Studio foram iniciados para conferir o ajuste compartilhado.

## Conferência final em andamento

- Os dez arquivos centrais de correção, incluindo `purchase-form.tsx`, têm bytes idênticos nos dois heads atuais; hashes em `corrected-source-parity.json` no cache.
- Studio, typecheck após a correção de mídia: exit 0.
- O grupo canônico de componentes (65 arquivos, excluindo os testes Blockly isolados pelo próprio runner) passou cinco vezes: 547 testes em cada execução, zero falhas. Logs `preview-components-repeat-1.log` a `preview-components-repeat-5.log`. A falha anterior de CI não foi reproduzida e não foi removida nem teve asserção/timeout alterado.
- Dois builds Next simultâneos esgotaram o disco ao gravar caches. Foram removidos apenas os diretórios `.next/cache` das duas aplicações na worktree isolada de produção, com validação dos caminhos resolvidos. Código e arquivos dos usuários foram preservados. Nenhum resultado dessa tentativa incompleta é usado como aprovação.
- Kids e área adulta foram reconstruídos um por vez depois da limpeza: ambos exit 0, TypeScript e geração de rotas concluídos (`kids-build-serial.log`, `community-build-serial.log`). Os dois diretórios `.next` próprios foram removidos após confirmar a ausência de processos Next nessas worktrees; logs preservados.
- A consulta Railway falhou uma vez ao autenticar; o acesso foi confirmado pelo conector e novamente pela API. O inventário atualizado continua com as onze versões anteriores de staging saudáveis; nenhum deploy de recuperação foi tentado.

## Qualificação adicional da base de staging

O run 44646481607 terminou com 11 jobs aprovados, mas o typecheck global falhou. A linha `avatar.test.ts:633` comparava `string | null` com um acesso indexado que ainda podia ser `undefined`. A correção já existente `23660deb5` foi reaproveitada como `ca7622012`: exige a variante do catálogo antes de comparar, sem asserção forçada ou enfraquecimento do teste. Typecheck Core e os 38 testes de avatar passaram (35.163 asserções).

O mesmo log confirmou `FATAL ERROR ... heap out of memory` do Admin no teto V8 de aproximadamente 4 GB. O script do pacote agora declara `NODE_OPTIONS=--max-old-space-size=8192`, como o Studio já fazia, sem excluir arquivos ou desabilitar checagens. O typecheck local completo passou com esse limite; Biome dos dois arquivos passou. Commit `c7e9c70a4` e nova CI completa [44654026267](https://github.com/informach/sistema-zero/actions/runs/44654026267). A rodada anterior continua registrada como falha.
