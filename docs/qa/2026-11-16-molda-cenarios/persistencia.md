# Revisão da persistência de cenários

16/11/2026. Componente do lote 2; o lote continua aberto até catálogo remoto, integração do host e fluxo completo estarem disponíveis.

Implementado: serviço de projetos, comandos idempotentes, revisão comparada, histórico imutável, repositório Drizzle transacional e rotas administrativas de criação/leitura/edição/aplicação. Tabelas próprias `cenario_projetos` e `cenario_revisoes`; migração gerada pelo script do pacote. A injeção do serviço no servidor é explícita e opcional durante a integração; nenhum endpoint novo é anunciado como disponível na plataforma neste marco.

Verificação: 327 testes aprovados, 146 pulados por ausência das respectivas integrações externas, zero falhas na suíte API. O teste novo de banco foi EXECUTADO em Postgres 17 local descartável, não pulado. Dois clientes reais confirmaram atomicidade, idempotência de criação/edição, preservação do histórico, conflito de revisão e aplicação apenas da revisão atual. A borda HTTP foi testada com autenticação interna, admin/staff, consulta inválida e conflito 409. Tipagem e Biome dos arquivos alterados aprovados.

A revisão encontrou divergência de representação de timestamps no retorno do Postgres. O repositório agora normaliza as datas para ISO antes de devolver dados ao serviço, mantendo respostas de retry iguais à resposta inicial. Nenhum cast ou relaxamento de teste foi usado.

Banco de ensaio: container `sz-molda-cenarios-qa`, bind somente em 127.0.0.1:55437, database `arquipelago_test_cenarios`. Nenhuma migração foi aplicada a banco da plataforma. O container será encerrado após a validação final.

Pendente neste lote: registro/versionamento e distribuição privada do catálogo, wiring na composição do serviço e integração administrativa. Editor visual, runtime editável e CLI/MCP permanecem no plano; esta revisão não representa entrega final.
