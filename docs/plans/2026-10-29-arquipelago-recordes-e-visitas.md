# Recordes da família e visitas (fase3-12)

29/10/2026. Duas coisas entre as crianças da MESMA conta, sempre dentro do que o responsável
permitiu nas permissões de visita (fase1-18):

1. **Recordes da família:** no resultado de cada percurso com tempo (`PERCURSOS_DO_JOGO`: as copas
   do Bosque e os telhados da Vila), o melhor tempo e as estrelas de cada criança da conta, ao lado
   dos dela.
2. **Visitas:** ver a casa e o quintal de um irmão, só olhando, sem mexer em nada da obra nem do
   salvamento do outro.

O que precisa da dona está marcado com **Decisão**. Tudo o que está aqui pode ser trocado depois:
nenhuma das escolhas muda o formato do salvamento (continua na V10).

## 1. O que a permissão de visita libera

As permissões são da conta (`permissoes_da_familia`, padrão `PERMISSOES_PADRAO`) e valem para
todas as crianças dela.

| Permissão | Padrão | O que faz nesta fase |
|---|---|---|
| Visitas de irmãos (`visitasDeIrmaos`) | ligada | Liga as duas coisas: os recordes da família no resultado e as visitas à casa dos irmãos. Desligada, nenhuma das duas aparece. |
| Visitas de outras crianças (`visitasDeOutrasCriancas`) | desligada | Nada ainda. Só existe família nesta fase; visita de fora da conta fica para quando houver amigos no jogo. |
| Fotos no Clube (`fotosNoClube`) | desligada | Nada (o modo foto só baixa no aparelho, fase2-09). |

- **Decisão:** os recordes ficam sob a mesma permissão das visitas. Ver o tempo do irmão é uma
  forma de interação entre as crianças, e a área dos pais tem um interruptor só para isso. Se a
  dona preferir separar, é um campo novo nas permissões (contrato e cartão dos pais), não muda o
  resto.
- A permissão vale dos dois lados ao mesmo tempo: é a mesma conta.
- O jogo relê a permissão a cada vez que pede os irmãos. Os pais desligam, e na próxima leitura
  some (não fica guardado no aparelho).

## 2. Como o serviço lê os recordes e a casa do irmão

Duas rotas novas no `arquipelago-api`, só leitura, de quem joga (a criança). Ficam fora de
`/arquipelago/familia/`, porque o gateway reserva esse prefixo à área dos pais.

- **`GET /arquipelago/irmaos`**: os irmãos da criança que também veem o jogo, com o melhor de cada
  percurso e se já têm casa construída. Sem nomes.
- **`GET /arquipelago/irmaos/:perfilId/casa`**: a obra da casa (com o quintal), a horta e quais
  objetos têm aparência, de UM irmão. Sem nomes e sem o resto do salvamento.

**A posse:** a conta da criança vem do login dela (`x-auth-account-id`). Irmão é quem está em
`perfis_da_conta` com a MESMA conta (a ligação que o serviço grava na primeira gravação aceita do
salvamento, migração 0008), não é a própria criança e vê o jogo pela mesma decisão de acesso
(`decidirAcesso`). Pedir a casa de alguém que não é irmão dá 404 `IRMAO_NAO_ENCONTRADO`, sem dizer
se o perfil existe. Irmão que nunca jogou nesta conta não aparece (não há o que mostrar).

- Comunidade adulta: não há família; a lista vem vazia.
- Suporte somente leitura: pode ler (é só leitura).
- Até `PERFIS_DA_FAMILIA_MAXIMO` irmãos.
- O contrato tem versão (`VERSAO_DAS_VISITAS = 1`, campo `versao` nas duas respostas). O jogo trata
  versão que não conhece como "não carregou".

**Os nomes:** o serviço do jogo nunca sabe nomes. O BFF põe o nome de cada irmão, como na semana.
Só que, na sessão da criança, o gateway não deixa ler a grade de perfis (`/auth/profiles` é da
área dos pais), e a identidade pública de um perfil só existe para perfil público.

- **Decisão (aprovada pela dona em 29/10/2026):** uma rota própria no Auth,
  `GET /auth/profile-session/siblings`, só para a sessão de perfil. Ela devolve, dos perfis ativos e
  prontos da MESMA conta, menos a própria criança, só o id e o nome. Sem foto, nascimento,
  telefone ou qualquer dado da conta. Fora da sessão de perfil, 403.
- O BFF pede a lista ao serviço do jogo e, se houver alguém, os nomes ao Auth. Junta pelo id e
  descarta quem não estiver na lista do Auth (perfil arquivado no meio do caminho). Se o Auth não
  responder, o BFF responde 502: o jogo nunca mostra um irmão sem nome.

## 3. Por onde a visita começa e como volta

- **Começa pelo menu:** "🏡 Visitar um irmão" abre o painel das visitas, com os irmãos (o nome e se
  já construíram a casa) e "Ver a casa". O painel relê a lista a cada abertura.
- **Na visita:** o jogo pede a casa do irmão e troca o que desenha da casa, do quintal e da horta
  pelos dele. O personagem vai para a frente da casa. Uma faixa no alto diz "Você está na casa de
  Ana. Aqui você só olha." com "Voltar para a minha casa".
- **Só olhando:** durante a visita nada é gravado.
  - O `mudar` da loja não faz nada, então nem a horta, nem a obra, nem as necessidades mudam.
  - O Construir some.
  - Os canteiros e os objetos não oferecem ação.
  - Os painéis dos objetos não abrem.
  - O jogo dela continua guardado como estava.
- **O quarto de dentro:** o quarto real é da plataforma (o Members). Primeira decisão (29/10):
  vazio na visita. **Revista em 30/10/2026 (a dona aprovou):** o quarto é o do irmão; ver a seção 6.
- **Volta:** "Voltar para a minha casa" (ou o mesmo item no menu) devolve a casa, a horta e os
  objetos dela, e o personagem volta para a frente da casa. Recarregar a página também volta, porque
  a visita não é guardada.

## 4. Quando o serviço não responde ou a permissão está desligada

| Situação | No resultado da corrida | No painel das visitas |
|---|---|---|
| Permissão desligada | A parte dos recordes da família não aparece; o resultado dela fica como sempre. | "As visitas entre irmãos estão desligadas. Quem decide são os responsáveis." |
| Sem irmão que jogue | Não aparece. | "Ainda não há irmãos jogando o Arquipélago nesta conta." |
| Serviço, Auth ou rede fora | "Os recordes da família não carregaram agora." | "As visitas não carregaram agora. Tente de novo daqui a pouco." com "Tentar de novo". |
| A casa não abriu (404, rede) | Não se aplica. | "Não deu para abrir esta casa agora." e ela continua em casa. |
| Permissão desligada no meio (403 na casa) | Não se aplica. | O mesmo recado da permissão desligada. |

## 5. O que muda em cada pacote

- **`arquipelago-contracts`:** `familia.ts` ganha `IrmaosDoJogadorSchema`,
  `IrmaosParaOJogoSchema` (com o nome do BFF), `CasaDoIrmaoSchema` e `VERSAO_DAS_VISITAS`.
- **`arquipelago-api`:** `ServicoDasVisitas`, a porta da família com `irmaosDaConta`, as rotas e os
  testes (unitários, de integração e de banco, num Postgres local descartável `arquipelago_test`).
- **`auth`:** a rota dos irmãos, com os testes.
- **`api-gateway`:** as três rotas novas e a política do Kids (a criança alcança as duas do jogo e a
  dos irmãos no Auth; o responsável, não).
- **`member-shell`:** o BFF dos irmãos (com os nomes) e da casa, e os caminhos no host. Os atalhos
  (shims) nos dois apps.
- **`arquipelago` (o jogo):** a loja da família, os recordes no resultado, o painel das visitas, o
  modo visita (casa, horta e objetos do irmão, nada gravado). A plataforma de mentira tem as mesmas
  recusas (`?familia=irmaos|desligada|fora-do-ar|sozinha` no playground).
- **Docs:** `docs/arquipelago-regras.md` e os CLAUDE.md.

Nenhum Blender nem GLB. Nenhum formato de salvamento novo.

## 6. O quarto do irmão (30/10/2026, aprovado pela dona)

A proposta diz "Um quarto só: mudou na plataforma, muda no jogo" e "troféus e bichinhos aparecem
nele como sempre". Um quarto vazio na casa do irmão parecia defeito. Agora a visita mostra o quarto
dele, como o Meu quarto dele mostra.

- **De onde vem:** a casa do irmão (`GET /arquipelago/irmaos/:perfilId/casa`) passa a trazer
  `quarto`. O serviço do jogo pergunta ao Members (`GET /members/internal/arquipelago/quarto`, rota
  interna com o token de leitura do jogo) SÓ depois de todas as conferências da casa (mesma conta,
  permissão dos pais, acesso ao jogo). A conferência fica num lugar só e a `Plataforma` não muda.
  O Members devolve o quarto conferido contra o que o irmão tem (`canonicalizeRoomState`), sem
  catálogo nem saldo.
- **Quando o Members não responde:** a casa abre do mesmo jeito, com `quarto: null`. O quarto de
  dentro aparece vazio e o Zappy completa a fala da chegada: "O quarto de Ana não abriu agora.".
  Fechar a porta do quarto pediria peça nova (na casa construída o quarto não tem uma porta só),
  então ficou o aviso. Nunca aparece o quarto dela no lugar.
- **Só olhar, de verdade:** na visita, nada do mundo oferece ação (o personagem não escolhe alvo):
  nem a cama do irmão, nem a porta nova, nem a bancada, nem a largada de uma corrida.
- **Sair da ilha central termina a visita** (achado na revisão): sem isso, ela podia ir ao Bosque e
  jogar sem nada ser gravado. Passou da praia (`RAIO_DA_VISITA` = `RAIO_DA_PRAIA`, 29 m), a visita
  acaba sozinha e o Zappy diz "Você saiu da casa de Ana. O seu jogo volta a ser guardado.".
- **Contrato:** `CasaDoIrmaoSchema` ganha `quarto` (obrigatório, anulável) e `QuartoDosMembrosSchema`
  entra em `membros.ts`. `VERSAO_DAS_VISITAS` continua 1: a fase3-12 ainda não foi para produção, e o
  serviço publica o cliente do jogo junto. Salvamento continua na V10.
- **Ordem de subida:** qualquer uma. Sem a rota no Members (404) o serviço trata como "não abriu".
