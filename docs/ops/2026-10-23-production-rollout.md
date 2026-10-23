# Implantação de produção — 23/10/2026

Registro atualizado após a implantação base e a correção de criação de perfis. Não contém credenciais, endereços assinados, dados de crianças ou dumps de banco.

## Código implantado

| Escopo | Origem | Resultado |
| --- | --- | --- |
| Base dos 18 serviços | PR204, `e8c58460805990f68ea7d4e3cdfbd9cbd6a86aa8` | Serviços saudáveis, zero deploys pendentes |
| Controlador de promoção | PR205, main `578daf0edd50d635be1389a19ef6f0b2f9301fc8` | Integrado; alteração operacional sem necessidade de reconstruir as aplicações |
| Cadastro de criança: Kids, comunidade adulta e Admin | PR206, main `9ce4c99ab6e4b2dd1e16a017a786fc9e55d7f930` | Três aplicações saudáveis; os demais 15 serviços preservam a base acima |
| Exclusão de projetos Python | PR207 | Correção testada localmente; validação completa e implantação ainda pendentes |

A conferência de 11:29 UTC confirmou os 18 serviços nas versões esperadas e nenhuma implantação pendente. A auditoria posterior confirmou as variáveis carregadas pelos 18 deployments e suas sete relações entre serviços, sem registrar valores nem hashes de segredos. Os seis endpoints públicos consultados novamente às 11:41 UTC responderam HTTP200. Liveness não substitui teste funcional.

## Infraestrutura e dados

- Implantação online, sem ativar modo de manutenção, conforme instrução da responsável.
- Backup consistente restaurado em banco isolado; a cópia cifrada no R2 foi baixada e autenticada integralmente.
- Jornada Kids publicada na versão 1 após preparação que preserva os perfis existentes. Uma interrupção do controlador foi recuperada retomando a mesma preparação; Members e Auth não foram implantados novamente por causa dela.
- Seed criou nove produtos e três ofertas adultas ausentes; leitura posterior confirmou o resultado. Edições administrativas existentes foram preservadas.
- Mural adulto e canal Parede criados e conferidos; espaços Kids preservados.
- Cron da reconciliação da IA implantado na Cloudflare, com rotas públicas desativadas. Execução natural observada às 10:05 UTC: zero trabalhos conciliados, pendentes ou expirados. A sessão temporária de observação foi removida.
- Infraestrutura do gravador implantada. `LIVE_MEDIA_READY` permanece falso até o ensaio real de mídia.

## Cadastro de criança

A primeira validação real encontrou HTTP400: o Auth exigia `requestId`, mas o formulário não o enviava e o schema do BFF removia esse campo. As solicitações observadas foram recusadas antes de criar perfis.

O PR206 preserva um UUID por tentativa de criação, inclusive na retentativa e no fluxo de reautorização de voz. Também mantém o campo no BFF e apresenta mensagens próprias de validação e conflito. A correção teve 61 testes/214 asserções locais; todos os dez jobs do CI do PR passaram. Depois da implantação, a responsável confirmou que conseguiu criar o perfil normalmente.

O dispatch GitHub dessa implantação falhou antes de registrar mutações. A recuperação usou o controlador canônico via CLI, com o mesmo código aprovado e as mesmas barreiras de configuração, origem, jornada publicada, saúde e aposentadoria dos deployments anteriores. A onda terminou `PRODUCTION_WAVE_PASSED`.

Um diagnóstico posterior, somente leitura, passou no GitHub: API, credenciais SSH, estado dos 18 serviços e jornada publicada foram conferidos. A causa exata da falha anterior não foi demonstrada; não houve rotação de chaves nem repetição de deploy apenas para testá-la.

## Validação autenticada do Estúdio

Realizada com a conta autorizada e o perfil recém-criado, pela interface de produção:

1. Criação oferece JavaScript como padrão; Python está disponível para a conta administrativa.
2. Exemplo JavaScript **Pegue a moeda** abriu com blocos, recebeu commit de nuvem HTTP200 e executou. Enter mudou a tela inicial para o estado de jogo. Parar, modo Ponte e reabertura também foram exercitados.
3. Exemplo Python **Cobrinha (Blocos)** abriu com blocos e recebeu commit de nuvem HTTP200. A negociação inicial de partes teve a resposta prevista `CREATION_PARTS_NEED_BYTES`, seguida de upload e commit bem-sucedidos.
4. A prévia Python carregou o Canvas Turtle e mostrou o jogo; Parar mudou o estado para **Parado**. O modo Ponte apresentou código Python, incluindo `import turtle`. O projeto reabriu com os blocos preservados.
5. Limpeza JavaScript confirmada por DELETE HTTP200. A limpeza Python revelou o problema descrito a seguir.

Não foram publicados projetos de teste no Mural, criadas cobranças, ativada captura de mídia ou alterados dados do perfil.

Uma publicação JavaScript já existente no Mural também foi aberta em contexto anônimo separado: a página pública `/jogar/[id]` carregou sem login, o iframe apresentou o jogo e o Canvas foi inspecionado visualmente, sem erros de console observados. Isso confirma a renderização inicial pública JavaScript; não qualifica partidas completas nem publicação Python.

## Correção adicional: exclusão Python

Excluir o projeto Python retornou `409 CREATION_CLIENT_OUTDATED`, exigindo formato 3. Os hosts Completo e Pro informavam como capacidade de leitura a versão padrão JavaScript (2), embora o editor leia projetos Python (3).

O PR207 centraliza o transporte do Estúdio e usa sua capacidade de leitura suportada. Preserva o formato de cada documento, a revisão-base, o isolamento por perfil e a recusa de versões futuras. Regressão causal reproduziu duas falhas com a capacidade antiga. Após o ajuste: 55 testes/218 asserções de transporte e BFF, 101 testes/413 asserções de fila e sincronização, Biome e diff-check passaram. A exclusão Python em produção ainda precisa ser repetida depois de implantar esse PR.

## Limites e próximos passos

- Concluir CI, implantação e confirmação real da exclusão Python do PR207.
- Ensaios completos de jogos, publicação/remix, Pro, desempenho prolongado e mídia continuam separados desta prova básica. Não há declaração de homologação universal.
- Jornada adulta: não havia cursos elegíveis para preencher as primeiras etapas. A configuração depende do conteúdo aprovado no Admin; nenhum curso foi inventado ou publicado automaticamente.
- Clube adulto: a definição completa dos espaços e canais ainda não consta no seed canônico. O Mural adulto está configurado.
- Staging recebeu mudanças posteriores de Molda e oficinas de outra frente. Elas não foram promovidas automaticamente junto ao hotfix: precisam de seu próprio review e implantação.

## Referências de CI e operação

- [PR204](https://github.com/informach/sistema-zero/pull/204), [PR205](https://github.com/informach/sistema-zero/pull/205), [PR206](https://github.com/informach/sistema-zero/pull/206), [PR207](https://github.com/informach/sistema-zero/pull/207).
- [CI aprovado do PR206](https://github.com/informach/sistema-zero/actions/runs/39937826988).
- [Dispatch preservado que falhou antes das mutações](https://github.com/informach/sistema-zero/actions/runs/39942877336).
- [Diagnóstico GitHub somente leitura aprovado](https://github.com/informach/sistema-zero/actions/runs/39944968460).
- [CI do PR207](https://github.com/informach/sistema-zero/actions/runs/39947833634).

Recibos privados do operador ficam em `.cache/python-reference-games/`: onda `production-online-wave-profile-hotfix-live-r1/receipt.json`, inventário `platform-production-hotfix-progress-r4.json`, auditoria `production-loaded-config-audit-hotfix-r1.json`, liveness `production-public-health-live-r3.json` e prova básica `production-authenticated-studio-smoke-live-r1.json`. Esses arquivos são referências locais, não dependências das imagens nem autorização reutilizável para novas mutações.
