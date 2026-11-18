# Preparação dos ambientes de homologação

## CI isolado

A execução `44280842226`, no SHA `be0ef11c5`, encontrou duas falhas de preparação:

1. Os jobs de contratos Linux/Windows não instalavam o navegador que o teste real
   `projectStorageBrowser.test.ts` usa para conferir reload/CAS e conflitos entre abas.
   Ambos falharam com executável ausente. O workflow agora instala Chromium antes
   da suíte completa; o teste não foi pulado, mockado ou alterado.
2. O job de medição de isolamento atingiu seu deadline durante a instalação APT,
   antes de medir. Os logs mostraram downloads lentos de
   `http://us-east-2.ec2.archive.ubuntu.com/ubuntu`. A preparação existente só trocava
   o mirror Azure. Ela agora reconhece também os hosts regionais EC2 oficiais e
   troca seu URI pelo arquivo oficial HTTPS, preservando assinaturas, suites,
   componentes e demais fontes. Não foram ampliados timeouts dos testes ou do job.

Testes do configurador APT: dois casos novos falharam antes; depois, 11 passaram
(39 asserts), inclusive idempotência, CRLF, arquivos reais e URLs parecidas que não
podem ser reescritas. O deadline cancelado não é evidência de isolamento aprovado.
A rodada seguinte deve demonstrar a instalação e a medição completas.

Os uploads têm escopo explícito de relatórios e incluem arquivos ocultos necessários
de `.cache`, conforme o [contrato oficial da action](https://github.com/actions/upload-artifact#uploading-hidden-files).
O job Docker conserva somente os JSON de resultados/limpeza, não a distribuição
Python inteira nem os segredos da pilha local.

## Pilha local com serviços reais

Foi provisionada a pilha existente em `.cache/local-stack` desta worktree, com
Postgres portátil, segredos gerados localmente, portas loopback e sem arquivos dotenv.
Os outros serviços não foram interrompidos; todas as portas utilizadas foram
conferidas antes da preparação. A distribuição Python não foi implicitamente
substituída por outra: o primeiro setup foi solicitado com `--without-python`.

O gateway recusou boot: o launcher fixava `MAX_REQUEST_BODY_BYTES=3004096`, menor
que envelopes canônicos já exigidos pelas rotas de cenários e verificação Python.
Removida somente essa sobrescrita do launcher local, para usar o default que o
gateway já deriva dos contratos. Nenhum limite de editor, projeto ou rota foi elevado.

O novo teste de contrato falhou com 3.004.096 versus 8.454.144 bytes antes da mudança.
Depois, contrato do gateway, isolamento da pilha e distribuição Python somaram
14 testes aprovados (354 asserts). Na repetição, `/health` do gateway respondeu 200,
as contas de QA foram criadas e os currículos mínimos foram publicados localmente.
Os fluxos de host continuam sendo verificados; criar contas não homologa as aulas.

Os logs e credenciais gerados permanecem ignorados em `.cache/local-stack`; nenhuma
credencial foi adicionada ao Git nem usada contra serviços hospedados.
