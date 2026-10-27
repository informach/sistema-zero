# CLAUDE.md — @sistemazero/avatar-quarto

O avatar 3D e o quarto 3D, divididos de propósito pela plataforma e pelo jogo **Arquipélago
Vagalume** (27/10/2026). É o ÚNICO código 3D que os dois lados compartilham (decisão da dona):
mudar aqui muda o avatar e o quarto na plataforma E no jogo.

- **De onde veio:** os arquivos saíram do `member-shell` sem mudar comportamento. Nos caminhos
  antigos ficaram repasses de uma linha (`export * from '@sistemazero/avatar-quarto/...'`), então
  nenhum import da plataforma mudou. Código novo deve importar daqui.
- **O que tem:** `avatar/` (catálogo, `AvatarRig`, peças, medição, peças visíveis), `quarto/`
  (catálogo, coordenadas, chão, paredes, luzes, móveis por GLB com reserva em primitivas,
  bichinhos) e `use-reduced-motion`.
- **O que NÃO entra aqui:** telas, Tailwind, sessão, rotas, regras de compra. O configurador do
  avatar, o editor do quarto e as bandejas continuam no member-shell; a regra de jogo continua no
  `packages/arquipelago`.
- **Fronteira (teste):** `tests/fronteira.test.ts` reprova import que não seja react, three ou
  React Three Fiber, e arquivo de `src` sem entrada no `exports`.
- Os arquivos (`/avatar3d/*`, `/room3d/*`) continuam servidos pelo `public/` de cada app; as URLs
  saem dos catálogos (`baseGlbUrl`, `partGlbUrl`, `roomGlbUrl`, `roomThumbUrl`).
- Consumido como TS source: os apps Next listam `@sistemazero/avatar-quarto` no
  `transpilePackages`, os `.railway/services` de admin, community e community-kids observam a
  pasta e o CI de staging redeploya os três quando ela muda.
