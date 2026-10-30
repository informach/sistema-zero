# Visitas de outras crianças (N08a, levantamento de 30/10)

**Pedido:** a dona decidiu implementar o interruptor "Visitas de outras crianças" do cartão dos
pais, que só gravava. Proposta: "No Kids, só família, a menos que os pais liberem"; ECA Digital
art. 21: restrito por padrão, os pais liberam.

## Desenho

Reaproveita as visitas adultas (convite por código revogável, guardado só como SHA-256) e a
projeção da casa do irmão (obra, horta, objetos completos e quarto, só leitura). Diferenças:

- Quem gera o código é o **responsável** da criança anfitriã, na área dos pais, um por criança.
  Só com "Visitas de outras crianças" ligado na conta dela.
- Quem aceita é o **responsável** da outra família, na área dos pais dela, com o interruptor
  ligado e um apelido para a casa (de 1 a 24 letras). O aceite vale para as crianças daquela
  conta. A criança nunca digita código; não há diretório nem busca.
- Na hora da visita o serviço confere de novo: as duas contas com o interruptor ligado, o convite
  ainda ativo, a criança anfitriã ainda vendo o jogo. Desligar o interruptor, apagar o convite ou
  remover o aceite fecha a visita.
- Nomes não atravessam: o apelido é escrito pela família que visita e fica na conta dela.

## Rotas

- Responsável (`/arquipelago/familia/amigos*`, gateway já reserva `familia/` à área dos pais):
  `GET /familia/amigos?perfis=` (convites ativos por criança e casas aceitas),
  `POST /familia/amigos/convite` `{perfilId}` (devolve o código uma vez),
  `DELETE /familia/amigos/convite/:perfilId`, `POST /familia/amigos/aceitar` `{codigo, apelido}`,
  `DELETE /familia/amigos/:id`.
- Criança (`/arquipelago/amigos*`): `GET /amigos` (as casas aceitas pela família dela) e
  `GET /amigos/:id/casa` (a projeção só de leitura).

## Banco

Migração `convites_de_amigos` (perfil anfitrião, conta, hash único) e `casas_de_amigos` (id,
conta visitante, perfil anfitrião, apelido, único por par). Sem mudança no salvamento V19.

## Verificação

Contrato estrito, serviço e HTTP no Postgres descartável (padrão desligado, código próprio,
revogação, apelido inválido, suporte só leitura), gateway e BFF (`member-shell`), cartão dos
pais (`community-kids`) e painel de visitas do jogo no navegador com a plataforma falsa.
