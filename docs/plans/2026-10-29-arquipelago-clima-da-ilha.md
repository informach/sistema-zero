# Clima da sua ilha, fase4-08

**Objetivo:** o "Leva para casa" da Ilha das Nuvens (proposta: "controlar o clima da sua ilha";
na horta, "chuva rega sozinha, sol forte pede água"). A Iriê ensina, e a criança escolhe o tempo
da ilha central entre sol, nublado e chuva.
**Arquitetura:** regra pura em `sistemas/clima.ts`; a escolha na loja (`clima`, da sessão); a seção
do menu em `interface/clima.tsx`; o céu, as gotas e a chuva na horta em `mundo/clima-da-ilha.tsx`
(montado na cena, sempre); o `Ceu` lê `ambiente.luzDoClima` e `ambiente.cinzaDoClima`; a horta
pede água e dá o bônus em `mundo/horta.tsx`. Nenhum `.glb` nem gerador muda.

## Decisões

- **Onde se escolhe: no menu**, numa seção "Clima da sua ilha" com três botões (sol, nublado,
  chuva). A ilha central não tem cata-vento perto da horta, e o menu já guarda as escolhas do
  jogo. O relógio do topo mostra o clima (☀️, ☁️, 🌧️). Pedido de arte abaixo para levar a escolha a
  um objeto da ilha.
- **A Iriê ensina:** a apresentação dela ganha a terceira fala ("Com os fios eu também teço o tempo.
  No menu, escolha o clima da sua ilha: sol, nublado ou chuva."). A seção aparece com a Ilha das
  Nuvens aberta (`climaLiberado`, pelo posto), sem campo novo no salvamento. Antes disso, a horta é
  a de sempre. Numa visita a ilha é do irmão: o tempo e a horta dele não mudam.
- **O tempo é da sua ilha:** vale até 34 m do meio da ilha central e some aos poucos em mais 8 m.
  - Nublado: sol a 65%, céu 45% para o cinza.
  - Chuva: sol a 50%, céu 60% para o cinza, e o preenchimento cai junto (até 20% a menos).
- **Gotas:** riscos de 0,6 m caindo a 9 m/s num cilindro de 12 m em volta da criança e 12 m de
  altura.
  - Quantidade por qualidade: 700 no completo, 450 no médio, 250 no leve.
  - Nenhuma com menos movimento (do aparelho ou do menu); nenhuma dentro de casa.
  - A pausa congela.
- **Chuva rega sozinha:** a cada 1 s de jogo, a chuva rega o que está plantado e esperando água
  (`regar` de `sistemas/horta.ts`, que já existe).
- **Sol forte pede água mais cedo, sem castigo:** com o clima ligado, a planta regada pede água de
  novo no meio do crescimento.
  - Com sol pede aos 30%; nublado, aos 60%; na chuva não pede, porque a chuva rega e dá o mesmo
    bônus quando chega na janela do sol.
  - Ela pede por 15% do crescimento, com uma gota azul em cima e "Regar".
  - Regar nessa hora adianta 15% do crescimento: o `regadoEm` vai para trás, o mesmo campo de
    sempre.
  - Sem regar, ela cresce no mesmo tempo de antes. Nada estraga a planta nem castiga a criança.
- **Salvamento:** nada. O clima escolhido vale na sessão e o jogo abre com sol. Campo pedido para a
  versão nova do salvamento: `clima`, um de três valores, cerca de 15 bytes no pior caso
  (`,"clima":"nublado"`).

## Pedidos de arte

1. Um cata-vento perto da horta da ilha central (com uma âncora `cata-vento` no lugar), para a
   escolha do clima sair do menu e ir para um objeto da ilha, como a proposta sugere.

## Etapas

- [x] Regra pura (`sistemas/clima.ts`) e testes: liberação, pedido de água por clima, bônus,
  chuva que rega e dá o bônus, nunca tira crescimento, números e falas.
- [x] Loja (`clima`, `escolherClima`), a fala da Iriê, a seção do menu e o clima no relógio.
- [x] `mundo/clima-da-ilha.tsx`: luz, céu, gotas e a chuva na horta; o `Ceu` lê o `ambiente`.
- [x] Horta: "Regar" na janela, a gota azul e o bônus.
- [x] `playground/verificar-clima-browser.ts`, computador e celular emulado.
- [x] Regras, `CLAUDE.md`, revisão completa, testes, tsc e Biome, commit local.

## Resultado (29/10/2026)

- `tests/clima.test.ts` (8) e `tests/nuvens.test.ts` com a terceira fala da Iriê.
- Jogo inteiro: 995 aprovados, 1 pulado (Postgres local). tsc e Biome limpos.
- Navegador: `verificar-clima-browser.ts` aprovado no computador e no celular emulado:
  - plantar e regar;
  - a chuva que regou o canteiro só plantado;
  - a luz e as gotas (nenhuma com menos movimento no celular);
  - o nublado;
  - com sol, a alface pedindo água aos 30% (a gota azul) e o bônus ao regar.
- O `verificar-nuvens-browser.ts` (fase4-06) passa de novo, com a terceira fala da Iriê.
- Prints e limites em `docs/qa/2026-10-29-clima-da-ilha/`.
