# Correções da importação e da execução Python

> Execução: skill `executing-plans`, com revisão do diff e provas novas antes do commit.

**Objetivo:** concluir a implantação solicitada, importando projetos que o Estúdio abre sem perda e conferindo Python dentro dos prazos já declarados.

**Arquitetura:** conservar as APIs e as barreiras de publicação. A preparação do sandbox usa o prazo da operação que a possui. Na análise Python, dois projetos independentes compartilham a janela da requisição, sem compartilhar sandbox ou vereditos. Dados incompatíveis viram problemas de autoria, sem aprovar o conteúdo.

**Tecnologias:** Bun, TypeScript, Elysia, Cloudflare Sandbox, Blockly e contratos Zod existentes.

**Evidências:** a prévia do Pico retornou `EXECUTOR_INDISPONIVEL` em 126,57 s e 127 s, enquanto o gabarito completo passou diretamente em 90,606 s. O diagnóstico registrou o descarte do sandbox durante `python-mission.mjs`. A preparação impunha 120 s a uma missão com orçamento de 140 s e runner de 125 s. A análise roda gabarito e inicial em sequência, mas o adaptador aguarda 160 s. O primeiro projeto das Nuvens falhou antes de executar porque o nome `botaoFlor` seria normalizado para `botaoflor`.

## Restrições

- Não alterar `.env`, workflows, migrações, Blender ou GLBs.
- Nenhum teste grava em bancos remotos. Só importação e configuração solicitadas podem escrever conteúdo real.
- Não desativar a proteção contra perda de conteúdo nem as regras de currículo/publicação.
- Não enviar novos commits para staging antes de terminar a onda em curso.
- Preservar os commits locais de outras sessões; a base desta correção é `b527218b048073748167b286f01fa4f473389b84`.

## 1. Prazos do sandbox por operação

Arquivos: `packages/studio-runtime/src/python-inspection.ts`, `src/python-mission.ts` e `tests/python-inspection.test.ts`.

- [x] Reproduzir o relógio de inspeção expirado interrompendo a preparação de uma missão.
- [x] Escolher explicitamente a operação ao materializar o projeto: inspeção mantém 120 s; missão usa `PYTHON_MISSION_LIMITS.jobMs`, 140 s. O sinal do proprietário continua podendo encerrar antes.
- [x] Provar cancelamento e destruição única do sandbox, incluindo a missão.
- [x] Regenerar o perfil, construir e conferir a imagem, sem mudar os limites externos.

## 2. Análise dos dois projetos Python

Arquivos: `packages/members/src/application/arquipelago/arquipelago-objectives.service.ts` e `tests/unit/arquipelago-objectives-c02.test.ts`.

- [x] Adicionar regressão que segura as duas avaliações e verifica que ambas começam antes de liberar os resultados.
- [x] Rodar gabarito e inicial Python em paralelo, aguardando ambos inclusive em falha inesperada. Conservar a ordem dos resultados e o isolamento de cada execução.
- [x] Informar indisponibilidade uma única vez; não transformar recusa ou falha em aprovação.
- [x] Manter o caminho JavaScript e seus controles de regressão.

## 3. Projetos canônicos e erros de autoria

Arquivos: `docs/desafios-do-jogo/nuvens/projetos.ts`, manifestos gerados, teste de portabilidade nos desafios e teste do serviço de objetivos do Members.

- [x] Abrir os projetos JavaScript clássicos dos 24 manifestos pelo `prepareClassicCheckDocument` real e registrar todas as recusas.
- [x] Corrigir nomes de imagens e respectivas referências no gerador; regenerar somente os arquivos derivados afetados e o inventário.
- [x] Converter `ValidationError` do preparo do projeto em problema da análise. Manter a publicação bloqueada, sem abortar a importação inteira por um erro de autoria.
- [x] Verificar o prazo de inatividade do servidor do jogo contra a conferência longa, seguindo o padrão já usado pelo Members.

## 4. Verificação e implantação

- [x] Executar testes focados, typechecks dos pacotes alterados, Biome e revisão completa do diff.
- [ ] Fazer commit isolado e CI do PR, sem interromper as ondas atuais.
- [ ] Publicar a nova imagem/Worker em staging, repetir a prévia real do Pico e as provas positivas e negativas necessárias.
- [ ] Integrar a correção em staging sem incluir trabalho local alheio; promover somente a árvore aprovada.
- [ ] Reconciliar os 20 desafios já importados em cada ambiente antes de continuar, preservando os recibos das recusas. Comparar a exportação final com os 130 itens e manter os rascunhos determinados pelo currículo.
- [ ] Conferir versões, migrações, canal, artefatos e páginas nos dois ambientes; relatar a limitação da conferência visual bloqueada pela revisão automática.


## Verificação antes do commit

- Regressões e manifestos: 56 testes, 2.406 asserções, sem falha.
- Runtime completo, no diretório canônico e com dependências próprias instaladas: 388 passaram, 42 condicionais ignorados, sem falha. A primeira tentativa local ficou registrada: faltavam dependências do runtime e foi usado o diretório errado. Nenhuma mudança de produto foi feita para contornar essas falhas.
- API: 284 passaram, 124 testes de integração ignorados sem Postgres de teste, sem falha. Nenhum banco remoto foi usado como banco de teste.
- Typechecks completos de Runtime, Members e API passaram. Biome passou nos 12 arquivos aplicáveis; revisão do diff sem erro.
- Nova imagem construída; isolamento e os seis jogos da prova de validação passaram.
- Conferência hospedada do desafio de água das Nuvens: gabarito passou nos três objetivos, inicial falhou nos três. Os dois manifestos mudaram somente no nome canônico da imagem e nas referências correspondentes.
- Os 20 desafios já aplicados em cada ambiente foram exportados e comparados: nenhum conteúdo diferente ou publicação não solicitada. A continuação da importação ainda está pendente.

As provas acima não substituem o CI deste commit, a implantação da imagem nova nem a prévia Python integrada no Admin. A conferência visual autenticada está indisponível porque a revisão automática bloqueou o Chrome por não conseguir confirmar a URL.
