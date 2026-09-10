# Entrega: a evolução do Molda continuada, dos lotes 225 ao 237

Escrito em 10/09/2026. O plano completo é `2026-09-06-molda-evolution.md`, com um registro
por lote; este documento é o resumo de uma sessão e o que ela deixa para você.

## O que estava e o que ficou

O GPT-6 Astra implementou 224 lotes e parou sem créditos. O trabalho existia inteiro no
disco, **sem um único commit**: 394 arquivos, 354 deles em `packages/molda`. A oficina 3D
nova, 159 componentes, só abria em `bun run dev`. E nada tinha sido visto num navegador:
todos os lotes recentes registram que o browser não conectava.

Agora são **19 commits na `staging`**, a oficina nova é o editor de modelos do kids e a
suíte roda em Chromium de verdade.

| Lote | O que entrou |
| --- | --- |
| — | Os 224 lotes anteriores viraram cinco commits revisáveis, com todos os portões reconferidos antes |
| 225 | Contrato versionado da pintura animada dentro do GLB |
| 226 | O runtime do Estúdio toca a sequência |
| 227 | A oficina escolhe o destino da cópia |
| 228 | A oficina nova dentro do app, galeria das duas gerações, promoção ao abrir |
| 229 | A foto da criação para a galeria |
| 230 | A nuvem conhece as duas gerações: **o passo de leitores** |
| 231 | O "Trazer do Molda" enxerga a geração nova |
| 232 | Homologação em Chromium real: 14/14 e2e |
| 233 | A virada, reversível numa linha |
| 234 | A volta da ponte com o Estúdio e o backup da geração nova |
| 235 | A causa dos avisos `act`, aberta desde o lote 203 |
| 236 | A oficina sai do bundle de entrada |
| 237 | Chanfro em mais de uma quina |

## Os achados que mudaram decisões

**O plano estava errado sobre a virada.** Ele previa mudar
`MOLDA_DOCUMENT_WRITE_VERSION` para 2. Esse número é o carimbo do escritor v1, e mudá-lo
faria toda gravação v1 lançar. Documento v1 é v1 para sempre; quem escreve o formato novo
é a persistência de cena, que não passa por esse portão. A virada é a capacidade do host.

**Desligar a chave era destrutivo.** Na primeira versão ela escondia o que já tinha sido
promovido, o que prenderia o trabalho da criança num editor que não sabe lê-lo. Agora ela
governa só a promoção.

**Promover teria apagado o backup.** O espelho da nuvem só conhecia o inventário v1; uma
criação promovida sumiria da lista comparada com a nuvem, e sumir da lista é o mesmo que
ter sido apagada.

**O kids nem compilava com a oficina ligada.** O monorepo tem duas cópias do
`three-mesh-bvh` (o `drei` do kids fixa a 0.8) brigando pelo mesmo campo. Isso teria
explodido no deploy.

**O e2e do editor antigo estava vermelho** desde o lote grande, sem ninguém saber, porque
o navegador nunca conectou em 224 lotes.

**Eu mesmo introduzi uma regressão de peso** no lote 228 e a medição a encontrou: o bundle
de entrada saltou de 364 kB para 568 kB. Hoje são 351 kB.

## Estado dos portões

Molda **2.839/0** (381 arquivos, zero avisos act) · Estúdio **7.956/0** · members **983/0**
· member-shell **472/0** · kids **619/0** · **14/14 e2e em Chromium** · tipos dos cinco
pacotes, Biome e build do Kids. Árvore de trabalho limpa.

## O que é seu

1. **Implantar.** A ordem, a conferência pós-deploy e a volta atrás estão em
   `2026-09-10-molda-rollout.md`. Leitores antes do escritor. Eu não empurrei nem
   implantei nada.
2. **Tablet e celular físicos.** Emulação de tamanho não é toque.
3. **Uma criança de 9 a 11 anos na frente da oficina.** Nenhum teste prova compreensão.

## O que continua aberto no plano

Laço fechado nos caminhos de tubo; clipes, camadas e PBR do bbmodel; compatibilidade
glTF; latência e memória dos blobs. Todos estão registrados no plano com o motivo, e
nenhum deles bloqueia o que já está pronto.
