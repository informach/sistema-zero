# Consolidação de staging em 16/10/2026

A integração reúne as entregas locais de Studio Pro, Helpdesk, funil, Instagram e marketing colaborativo, preservando o histórico remoto de staging.

## Banco

As migrações de marketing até `0016_bright_tempest` já estavam publicadas e permanecem intactas. Duas frentes locais haviam criado sequências concorrentes a partir de 0017. A sequência colaborativa 0017–0031 foi preservada; as cinco migrações locais do Instagram, ainda não publicadas, foram reunidas em `0032_integrate_instagram_engagement`, gerada pelo Drizzle a partir do schema final. As tabelas de conversas são novas no ambiente remoto; não há conversão nem exclusão de dados existentes nessa reconciliação. Os commits originais conservam as sequências anteriores para rastreabilidade.

Auth acrescenta as sessões opacas de navegador. Helpdesk e Members mantêm suas sequências próprias. O preDeploy aplica cada journal por serviço. A verificação após deploy compara hash e timestamp das migrações com o commit publicado. Rollback conserva o schema e os dados; não executar downgrade destrutivo.

## Configuração

Members recebe `STUDIO_BUILDER_EXECUTOR_URL` com o endpoint HTTPS `/api/internal/studio-builder/execute` do Kids. Members e Kids compartilham `STUDIO_BUILDER_EXECUTOR_SECRET`, exclusivo desta comunicação. O executor mantém a autenticação e o runtime já configurados no Kids.

Marketing recebe `MARKETING_ENGAGEMENT_IDENTITY_KEY` e `META_ENGAGEMENT_VERIFY_TOKEN`, distintos por ambiente. Preparar as chaves não habilita envio de mensagens nem substitui credenciais, aprovação e prova externa da Meta. O envio permanece desligado conforme o runbook de Instagram.

Os nomes foram incluídos na declaração Railway para preservar seus valores. As variáveis de produção são preparadas com `--skip-deploys`; a aplicação de produção continua na versão de main até sua promoção normal.
