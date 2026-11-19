# Imagem Linux preparada para o leitor A

O Docker local não responde. A imagem foi construída e qualificada em um job
Linux isolado, sem reiniciar serviços desta máquina nem fornecer credenciais
de implantação ao GitHub. A primeira imagem, de `e193c8f8f`, permanece como prova
histórica; depois da integração do Estúdio, outra foi construída sobre a fonte
fixa **`d7249b956e8930c0da16b7fe18686c40056bd231`**.

O [run 44572560079](https://github.com/informach/sistema-zero/actions/runs/44572560079)
passou pelos contratos reais de imagem e validação, missão Python, playtest Python
com saúde do sandbox e objetivos Three, sem rede externa nos ensaios de execução.
Somente depois disso o workflow empacotou a imagem e seus recibos.

## Integridade e armazenamento

- Arquivo comprimido: SHA-256 `91a4d6c84fb4523ffa47f28fb4e46bd5abf9983087738c18f96eef6b6bab29d0`.
- Imagem Linux/amd64: ID `sha256:fbad399544e4c022d436ec6cb65cc0be3f353a80d5affd2c2907d0450184b1da`.
- Manifesto no registro privado: `sha256:c80ed34ad2b0cc8a38c5697a2c6963aa445a4cab1f97067757ad94eb9c10d7d4`.
- Perfil: `81c77517521421147a0d38276a43a069bae6eb866f8767463ebd454ecfbdc6d9`.

O arquivo foi conferido contra `SHA256SUMS`, o ID contra os bytes da configuração
no tar e a plataforma contra Linux/amd64. O envio usou Crane 0.22.1, com binário
conferido contra os checksums da release oficial. Manifesto e configuração foram
lidos novamente do registro e comparados. Não se afirma verificação de assinatura
ou atestação SLSA. [Recibo local](arquivo-verificado.json),
[recibo do registro](registro.json), [integridade do Crane](crane.json).

As credenciais de registro tinham validade de 15 minutos e foram fornecidas por
stdin. Configuração e log privados ficaram em diretório temporário exclusivo,
removido ao final; a conferência encontrou zero desses diretórios restantes.
Nenhuma imagem anterior foi removida.

## Preparação sem ativação

O `wrangler deploy --dry-run` compilou o leitor usando a fonte fixa e referências
de imagem por digest, exclusivamente para staging. O bundle contém o leitor
`pinta-scene-physics-v1` e o perfil qualificado. [Recibo](worker-preparado.json).
`--containers-rollout=none` foi usado somente nesse **dry-run**; não constitui
uma implantação com o container antigo.

A leitura posterior dos serviços confirma o Worker ativo ainda na versão
`d1d4f234-08c5-4059-b45d-f4772126000b`, seletor Python `f69814b…` e política
Members `022e5b54…`. [Estado conferido](estado-inalterado.txt).
**O Worker e os containers não foram implantados, o runtime 132 não foi ativado
e o gravador de nuvem continua em 4.**

O próximo passo é o rollout A dos leitores, condicionado aos gates de staging,
seguido do ensaio autenticado com a aba antiga mantida aberta. A ativação
coordenada do runtime/política e a liberação posterior do gravador são passos
distintos. A compatibilidade de formatos não pode ser inferida deste upload.

O uso de imagem pré-construída e credenciais temporárias segue os contratos
oficiais de [gerenciamento de imagens](https://developers.cloudflare.com/containers/guides/image-management/)
e [CLI de containers](https://developers.cloudflare.com/workers/wrangler/commands/containers/).
