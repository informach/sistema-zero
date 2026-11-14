# CLAUDE.md — @sistemazero/avatar-quarto

## O avatar do pack Cute Characters (13/11/2026)

- `avatar/pack-rig.tsx` (`PackAvatarRig`, `PackRigBoundary`, `PACK_IDLE_POSE`) e
  `avatar/pack-instance.ts`: o esqueleto do pack (metros, em pé, frente +Z) com uma peça por
  encaixe, presas pelo NOME do osso, e a textura única aplicada pela anotação do GLB. A barreira de
  erro tira o boneco sem derrubar quem o mostra quando o esqueleto não baixa (bucket privado).
- `avatar/pack-catalog.ts`: repassa o catálogo do `@sistemazero/core/avatar` para o jogo (que não
  importa o core) e `avatarDoPack` (o avatar que chega da plataforma, só com peças conhecidas).
- `avatar/pack-clips.ts` (14/11): `semDeslocamento(clipe, nome, {vertical})` tira o andar do `Hips`
  numa cópia do clipe (o jogo anda pela física), com o vertical mantido, sem a tendência (escada) ou
  com teto (pulo); `alturaNoComeco` dá a altura do `Hips` em pé. A plataforma não usa.
- O `AvatarRig`, o `catalog.ts` e o resto do avatar antigo só sobram para os patins do jogo (até a
  arte mandar o par do pack); o fantasma já usa o pack. A plataforma não os usa mais.
- **Sem pisca-pisca (14/11/2026, relato dela no configurador):** cada encaixe tem uma camada
  (`CAMADA_DO_ENCAIXE`: corpo 0, o que veste a pele 1, o que cobre outra peça 2) e o
  `prepararPecaDoPack` põe `polygonOffset` na cópia do material: onde duas peças quase coincidem (a
  luva sem dedos sobre a mão, a barra da camiseta sobre a calça), a de cima ganha. Encaixe novo
  entra na tabela. A cena do configurador (member-shell, `avatar-scene.tsx`) tem a caixa de
  sombra do tamanho do pódio com `normalBias` (sem isso as peças se sombreavam e piscavam) e a
  câmera de 0,3 a 30 m (o retrato, 0,1 a 20): com "perto" pequeno, numa placa de 16 bits de
  profundidade a roupa e a pele brigavam. Prova: mapa de pixels que mudam entre quadros parados.
- **Poses da cabine:** `PACK_LOOP_POSES` (parado e olhando) seguem em laço; as outras fazem o
  movimento uma vez e congelam em `instanteDaFoto` (`pack-clips.ts`: o maior giro somado dos ossos
  desde o primeiro quadro, o auge do golpe). Com menos movimento, direto na pose final. `poseTake`
  (o configurador conta as escolhas) refaz o movimento quando a mesma pose é escolhida de novo.

## Várias montagens do avatar (30/10/2026)

`avatar/instance.ts` prepara ossos e texturas de esqueleto próprios por montagem. Nunca montar
o `rootBone` vindo diretamente do cache do GLTF em dois pais. Peças compartilham geometria,
mas têm materiais tintáveis e morphs próprios. A pele pertence ao rig, e o material opcional
`materialOverride` pertence ao chamador. O descarte respeita esses donos; não libera originais
do cache. `AvatarRig` repassa esse material às peças, sem alterar o visual das outras montagens.
As regressões reais de Three estão em `tests/avatar-instance.test.ts`. O teste de fronteira
normaliza separadores de caminho para também funcionar no Windows.

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

## Pausa compatível do quarto (30/10/2026)

`RoomPausedContext` (padrão `false`, no módulo `room-glb-model`) congela o mixer próprio sem
reiniciar as ações ao retomar. `RoomMotionContext` continua habilitando animação ou pose neutra.
`Pet3D.paused` é opcional e congela passeio, giro e fase do pássaro, cujo relógio é local.
O jogo fornece suas regras de pausa e conforto; nenhuma regra de sessão entra neste pacote.
Prova com mixer Three real e efeitos React em `arquipelago/tests/quarto-pausa.test.ts`,
isolada em processo próprio para não contaminar os outros testes.

## O passeio do bichinho com ponto a evitar (31/10/2026)

O passo do `Pet3D` mora em `quarto/pet-walk.ts` (`petWalkStep`, puro). Props opcionais, só do
jogo: `onPosition(x, z, rumo)` a cada quadro e `avoid` (ref de `PetAvoid`: a criança perto e à
frente faz parar e virar; `nudge` que muda dá um passinho para o lado livre; `lift` sobe o
passarinho; os dois últimos valem também com menos movimento). Sem elas o passeio é idêntico ao
de antes, sorteio por sorteio: `tests/pet-walk.test.ts` compara 4.000 passos com a cópia literal
do laço antigo. O "Meu quarto" não passa nada.
