# CORS público do R2 como barreira de deploy

## Contexto

O player Rive do Community Kids baixa o `.riv` com `fetch`, enquanto o Admin visualiza o mesmo arquivo por uma rota proxy de mesma origem. O bucket público `testes` não tinha regra de CORS; por isso a prévia funcionava no Admin e o navegador ocultava a animação no Kids. O deploy anterior só esperava o `SUCCESS` do Railway e não exercitava o CDN.

## Decisão

O deploy de staging passa a garantir a configuração antes de publicar os serviços que a consomem. O executor do GitHub obtém as variáveis do serviço Admin por Railway CLI e executa um comando idempotente do repositório. As credenciais R2 continuam no Railway e não são duplicadas em secrets do GitHub.

O comando:

1. lê as regras atuais do bucket;
2. preserva regras que não pertencem ao Sistema Zero;
3. substitui ou inclui `public-direct-read` com as origens dos apps de aluno;
4. relê a configuração para provar o estado de controle;
5. cria um objeto temporário no bucket, consulta sua URL pública com o `Origin` do Kids de staging e exige `Access-Control-Allow-Origin` correto;
6. repete apenas enquanto a configuração ainda estiver propagando e sempre remove o objeto temporário.

O deploy falha antes de disparar os serviços se qualquer uma dessas provas falhar. Assim, um status verde significa que o cabeçalho realmente chegou pela mesma superfície pública usada pelo Rive, e não apenas que a API aceitou a configuração.

## Escopo

- Aplicar e automatizar o bucket público do ambiente de staging.
- Manter a configuração de produção intacta nesta mudança.
- Manter um modo somente de verificação para diagnóstico, mas retirar a dependência de uma execução manual para o deploy normal.

## Falhas e segurança

- Segredos não são impressos e não entram no repositório.
- O `PutBucketCors` só acontece quando a regra desejada diverge do estado atual.
- A prova usa uma chave exclusiva sob `admin/cors-probes/` e a apaga em `finally`.
- O teste valida status HTTP, `Access-Control-Allow-Origin` e o corpo esperado, evitando falso positivo de proxy/cache.
- Um timeout de propagação encerra com erro explícito e impede o deploy.

## Verificação

- Testes unitários para mescla, equivalência e validação dos cabeçalhos.
- Typecheck e suíte do Admin.
- Execução real pelo Railway CLI no staging.
- Requisição final a um `.riv` existente com o `Origin` do Community Kids.
