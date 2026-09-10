# Entrega: a evolução do Molda continuada, dos lotes 225 ao 238

Escrito em 10/09/2026. O plano completo é `2026-09-06-molda-evolution.md`, com um registro
por lote; este documento é o resumo de uma sessão e o que ela deixa para você.

## O que estava e o que ficou

O GPT-6 Astra implementou 224 lotes e parou sem créditos. O trabalho existia inteiro no
disco, **sem um único commit**: 394 arquivos, 354 deles em `packages/molda`. A oficina 3D
nova, 159 componentes, só abria em `bun run dev`. E nada tinha sido visto num navegador:
todos os lotes recentes registram que o browser não conectava.

Agora são **25 commits na `staging`**, a oficina nova é o editor de
modelos do kids, a suíte roda em Chromium de verdade e tudo isso passou por um full review.

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
| 238 | **Full review de tudo isso: 14 defeitos corrigidos, 12 registrados em aberto** |

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

**E o full review achou catorze defeitos meus, quatro deles graves.** Os dois piores tinham
a mesma raiz: a galeria e a oficina falam DIRETO com o armazenamento da geração seguinte,
então nada do que a criança fazia na oficina nova passava pelo espelho da nuvem. Apagar uma
criação promovida nunca virava lápide — ela voltava inteira no outro aparelho — e salvar
nunca enfileirava subida, então o backup da conta ficava até vinte minutos velho. O terceiro:
a ponte com o Estúdio relia o perfil CORRENTE depois de esperar na fila, e num tablet
compartilhado mandava a criação de uma criança para o Estúdio da outra (a sonda devolveu
`nave-do-bento.glb` para um pedido da Ana). O quarto: a recusa de fotografar apagava a foto
do cartão, ao contrário do que o próprio contrato dizia.

Nenhum dos quatro apareceria num teste da geração v1, e nenhum deles existia antes desta
sessão — são meus, dos lotes 228 a 234.

## O que o review deixou aberto

Doze achados ficaram registrados em vez de corrigidos, ranqueados e com o motivo em
`.audits/molda-evolution/full-review-l238.md`. Os dois primeiros orientam o próximo lote:
o **download cruzado entre gerações**, que trava em silêncio quando um aparelho já promoveu
e o outro ainda não, e a **perda silenciosa na ponte do Estúdio** — peça escondida some da
cópia sem aviso, enquanto o "Exportar GLB" da própria oficina exige aceite para a mesma
perda. Esse segundo é decisão sua: recusar, avisar ou manter como está.

## Estado dos portões

Molda **2.850/0** (381 arquivos, zero avisos act) · Estúdio, kit Jogo 3D Avançado **481/0**
(a suíte inteira dele deu **7.956/0** no lote 226) · members **983/0** · member-shell
**472/0** · kids **623/0** · **14/14 e2e em Chromium** · tipos dos cinco pacotes, Biome e
build do Kids.

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
