# Renovação do certificado A1 do Fiscal — 28/09/2026

Certificado renovado em staging e produção por solicitação da responsável.
Atualização via Railway CLI, seguida de deploy isolado do serviço `fiscal` a
partir das branches dos respectivos ambientes. Nenhuma nota artificial foi
emitida para testar produção.

## Certificado

- Titular: INFORMACH NUCLEO DE APRENDIZAGEM LTDA, CNPJ 43.588.758/0001-03.
- Validade: 28/09/2026 11:56:13 UTC até 28/09/2027 11:56:13 UTC.
- Impressão SHA-256: `2F:19:28:F5:00:17:31:D4:27:D9:22:83:1D:7C:2E:06:69:B6:D2:4A:27:3E:13:C5:81:83:F0:66:D6:04:51:D2`.
- Arquivo lido com o carregador A1 da aplicação. A chave privada foi validada
  contra o certificado por assinatura e verificação em memória.
- O certificado anterior venceu em 23/09/2026 às 19:30 UTC. Os logs de produção
  registravam `fiscal.cert_expired_emission_halted` desde 24/09 às 00:03 UTC.

Somente `NFSE_CERT_PFX_BASE64` e `NFSE_CERT_PASSWORD` foram alteradas em cada
ambiente. Os valores foram enviados pela entrada padrão do CLI, com deploy
automático desabilitado durante a troca do par. A leitura posterior confirmou
a impressão do certificado e que nenhuma outra variável mudou. PFX, senha e
chave privada não foram adicionados ao repositório.

## Deploys

Projeto Railway: `415d5a1c-5f75-432c-8445-b395d0977ce3`.
Serviço Fiscal: `2ea11afd-bdfd-4736-b400-c3db13fd8a0e`.
Commit dos dois deploys: `090996fcb79a70720d17d06dccf309c2f7d53e67`.

| Ambiente | Branch | Ambiente NFS-e | Série | Deployment |
| --- | --- | --- | --- | --- |
| staging | staging | producao-restrita | 902 | `e243e74a-66ad-4f3a-b26b-bd819defb47c` |
| production | main | producao | 2 | `85da7dae-dc4a-4405-a639-961ccdffcdc3` |

Ambos chegaram a `SUCCESS`, com migrações concluídas e healthcheck `/readyz`.
Os logs confirmaram o certificado novo e a inicialização dos três workers:
emissão, cancelamento e entrega. Staging iniciou às 18:32:45 UTC; produção,
às 18:35:56 UTC.

## Verificações

- O validador de ambiente da aplicação aceitou as configurações dos dois
  ambientes, preservando a separação entre homologação e emissão real.
- Tokens Fiscal/Payments, Fiscal/Gateway e HMAC de mensageria foram comparados
  em memória e estavam consistentes em cada ambiente.
- Consultas GET com mTLS à parametrização municipal de Belo Horizonte no ADN
  retornaram HTTP 200 tanto em produção restrita quanto em produção.
- Consulta GET a uma NFS-e de produção já emitida retornou HTTP 200 e o XML
  compactado usando o certificado novo. O conteúdo da nota não foi impresso
  nem salvo como artefato desta manutenção.
- Na conferência final, por volta de 18:37 UTC, os dois deployments permaneciam
  em `SUCCESS`. O `/readyz` autenticado do gateway retornou HTTP 200 e marcou o
  upstream Fiscal como saudável nos dois ambientes.
- A consulta aos logs do deployment anterior desde 23/09 não retornou eventos
  de emissão, entrega ou cancelamento nos filtros examinados. A interrupção
  por vencimento estava explicitamente registrada.

## Limite da verificação

Não houve consulta direta às contagens da fila no banco: os dois ambientes
não possuem endpoint público de PostgreSQL configurado. Nenhuma abertura de
rede, exclusão de dados, mudança de numeração ou reprocessamento manual de
notas foi realizado. A ausência de erros nos logs não comprova fila vazia nem
resolve, por si só, notas antigas que já estejam em `FAILED`.

A renovação removeu o bloqueio do certificado e reativou os workers; a auditoria
individual de notas antigas permanece separada desta evidência operacional.
