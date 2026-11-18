# Homologação: A Vila e a Floresta

Revisado em 18/11/2026, depois da revisão da entrega de 17/11/2026. Este registro separa o que
tem teste automático, o que é um script que se roda, o que é só uma captura de tela feita à mão
e o que não foi realizado. Nada aqui vale como ensaio em produção, em aparelho físico ou nos
programas de fora (Tiled e Godot).

O cenário é gerado por `packages/pinta/scripts/homologacao/fixture.ts`: 32 × 24 casas, 18
camadas (16 de peças, um grupo e uma de objetos), duas folhas, terreno Wang, água animada,
frente, opacidade, deslocamento, parallax, arte, propriedades tipadas, conjunto vinculado e
portas entre Vila e Cabana. Datas e identificações são fixas.

## O ciclo de dez passos

Cada passo tem uma comprovação principal, de um destes quatro tipos: teste automático, script,
captura de tela feita à mão, ou não realizado. A última coluna diz o que essa comprovação NÃO cobre.

| Passo | Comprovação | O que fica de fora |
|---|---|---|
| 1. Criar e abrir | teste automático: `packages/pinta/src/export/homologacao.test.ts` (passo 1) | Criar pela tela da galeria: feito à mão, sem registro |
| 2. Organizar camadas | teste automático: `packages/pinta/src/export/homologacao.test.ts` (passo 2) | Arrastar, renomear e trancar pela tela: só a captura `evidencias/editor-camadas-desktop.png` (feita à mão em 17/11/2026) |
| 3. Pintar e transformar | teste automático: `packages/pinta/src/export/homologacao.test.ts` (passo 3) | Pintar com o ponteiro num canvas de navegador: feito à mão, sem registro |
| 4. Terreno e detalhes | teste automático: `packages/pinta/src/export/homologacao.test.ts` (passo 4) | O pincel de terreno e o espalhar na tela: feito à mão, sem registro |
| 5. Objetos e conjuntos | teste automático: `packages/pinta/src/export/homologacao.test.ts` (passo 5) | Seleção múltipla, copiar e alinhar na tela: feito à mão, sem registro |
| 6. Salvar e restaurar | teste automático: `packages/pinta/src/export/homologacao.test.ts` (passo 6, o arquivo `.pinta.json`) | Recarregar a galeria no navegador: feito à mão, sem registro. A medição do IndexedDB está em `evidencias/indexeddb.json` (feita à mão em 17/11/2026) |
| 7. Testar no Pinta | captura de tela: `evidencias/teste-personagem-desktop.png` (feita à mão em 17/11/2026) | Andar com as setas e atravessar a porta não têm teste de navegador. O que é automático (início livre, paredes, portas nos dois sentidos, nos dados) está em `homologacao.test.ts`, passo 7 |
| 8. Programar no Studio | captura de tela: `evidencias/studio-cenario-desktop.png` (feita à mão em 17/11/2026) | Rodar o jogo no Studio não tem teste de navegador nesta homologação. O que é automático (a cena do envio passa no esquema, cabe no orçamento e é a do exemplo publicado) está em `homologacao.test.ts`, passo 8 |
| 9. Atualizar o desenho | teste automático: `packages/studio/src/projects/tilemapGame.test.ts` | Atualizar pela biblioteca pessoal no navegador: feito à mão, sem registro |
| 10. Levar para fora | script: `cd packages/pinta && bun run check:homologacao` | Abrir no Tiled, rodar no Godot e abrir o Phaser num navegador: não realizado (ver abaixo) |

## O que roda sozinho

Em `packages/pinta` (tudo isto também roda no CI, em `.github/workflows/ci.yml`):

```powershell
bun test src                    # inclui os testes de export e de homologação abaixo
bun run test:scripts            # os testes de scripts/ (a galeria Pygame), que `bun test src` não alcança
bun run check:pygame-gallery    # os PNG e os desenhos.pinta.json da galeria estão em dia
bun run check:phaser            # o Phaser embutido tem o SHA-256 e a licença fixados
bun run check:homologacao       # gera numa pasta temporária e confere; sai com erro se diferir
```

`check:homologacao` (`scripts/homologacao/check.ts`) gera os quatro pacotes numa pasta
temporária, nunca em `output/`, e confere: o pacote Tiled gravado em disco (cada `mapa.json` e
`mapa.tmx` volta pelo importador do Pinta e dá a mesma cena do `maps.json`), o hash do Phaser
e o `py_compile` do projeto Pygame. Quando o pygame-ce está instalado ele também roda
`packages/studio/scripts/python/test-pinta-scene-package.py`; sem ele, a linha sai escrita como
"não realizado". No CI esse passo roda com `--exigir-pygame`, no job que instala o pygame-ce.

Testes automáticos desta frente (todos dentro de `bun test src`):

| Arquivo | O que confere |
|---|---|
| `src/export/homologacao.test.ts` | os passos do ciclo que não precisam de navegador |
| `src/export/scenePackage.test.ts` | o conteúdo de cada ZIP; Phaser sem endereço de internet, com o hash fixado e a licença; cenas no esquema; `py_compile` de todo `.py` do projeto Pygame; textos do projeto Godot e peças dentro do atlas |
| `src/export/tiled/roundtrip.test.ts` | a cena INTEIRA igual na ida e volta, em JSON e TMX, com CSV, base64, zlib e gzip; grupos dentro de grupos; propriedade de várias linhas |
| `src/export/tiled/realTiled.test.ts` | quatro mapas escritos à mão no formato do Tiled 1.10 viram exatamente a cena esperada |
| `src/export/tiled/import.test.ts` | propriedades, relatório de perdas, recusas, limites e camadas compactadas |
| `src/export/tiled/package.test.ts` | caminhos do ZIP, tetos de 32 MiB e 128 MiB |

Resultado em 18/11/2026, nesta máquina (Linux, bun 1.4.4, Python 3.13.18, sem pygame):

| Comando | Resultado |
|---|---|
| `cd packages/pinta && bun test src/export scripts` | 340 testes passaram, nenhuma falha, em 30 arquivos |
| `cd packages/pinta && bun run check:homologacao` | terminou sem erro; a linha do pygame de verdade saiu como "não realizado" |
| `cd packages/studio && bun run check:pygame-games` | 9 jogos conferidos, sem diferença |
| `cd packages/studio && bun test src/examples/python/pygameGames.test.ts src/examples/qaContracts.test.ts` | 217 testes passaram, nenhuma falha, em 2 arquivos |
| `python3 -I packages/studio/scripts/python/test-pinta-module.py --sem-pygame` | 40 conferências de lógica pura passaram |

As suítes completas dos outros pacotes não foram rodadas nesta revisão. O registro anterior
citava um total de 22.581 testes; esse número não tem comando nem saída guardados e foi retirado.

## O que NÃO foi realizado

- **Tiled (o programa).** Não realizado. Não há executável do Tiled nem arquivo exportado por
  ele no repositório. O registro anterior dizia que o Tiled 1.12.2 tinha aberto e exportado o
  mapa; não existe artefato que comprove. O que existe: a ida e volta pelo importador do Pinta e
  quatro mapas escritos à mão no formato do Tiled 1.10
  (`packages/pinta/src/export/tiled/__fixtures__/tiled-real/`), que não saíram do programa.
- **Godot.** Não realizado. O registro anterior citava importação e execução sem janela no
  Godot 4.7.2; não há saída guardada. O que existe é uma conferência de texto escrita por nós
  (`src/export/godot/textFormat.ts`): seções, recursos citados e declarados, arquivos `res://`
  presentes e peças dentro do atlas. Ela não compila o GDScript nem abre a cena.
- **Phaser num navegador.** Sem teste automático. Há uma captura, `evidencias/phaser-pacote.png`
  (feita à mão em 17/11/2026). O teste automático confere o pacote, não a execução.
- **pygame-ce de verdade.** Não realizado nesta máquina (sem pygame). Os testes
  `test-pinta-module.py` e `test-pinta-scene-package.py` rodam no CI com pygame-ce 2.5.7; o
  segundo entrou no CI nesta revisão e ainda não tem uma execução registrada. As execuções do
  registro anterior (Python 3.13, pygame-ce 2.5.8) foram feitas à mão, sem registro.
- **Aparelhos físicos, staging e produção.** Não realizado.
- **Desempenho em máquina fraca.** Não realizado.

## Navegador e visual (feito à mão em 17/11/2026)

As sessões abaixo foram feitas à mão, no playground do Pinta e no Studio locais. O que restou
delas são as capturas de tela; os passos em si não têm registro e não se repetem sozinhos.

- [desktop claro](evidencias/editor-camadas-desktop.png),
  [desktop escuro](evidencias/editor-desktop-escuro.png),
  [notebook claro](evidencias/editor-notebook-claro.png),
  [notebook escuro](evidencias/editor-notebook-escuro.png)
- [celular claro](evidencias/editor-mobile-claro.png),
  [celular com toque, claro](evidencias/editor-mobile-toque-claro.png),
  [celular com toque, escuro](evidencias/editor-mobile-toque-escuro.png),
  [teste por toque](evidencias/teste-mobile-toque.png). É emulação de celular no Chromium,
  não um aparelho.
- [teste no Pinta](evidencias/teste-personagem-desktop.png)
- [Studio básico](evidencias/studio-cenario-desktop.png),
  [Studio avançado](evidencias/studio-avancado-cenario.png)
- [Phaser](evidencias/phaser-pacote.png)
- [importação do ZIP Tiled](evidencias/importacao-tiled-zip.png)

Medidas e observações que o registro anterior citava dessas sessões (largura do canvas no
celular, personagem andando de 32 para 37, larguras de 128 e 512 no Studio, duas imagens da
animação no Phaser): feitas à mão, sem registro.

## Persistência e limites

A medição do IndexedDB (256 × 256 × 32 = 2.097.152 casas, cinco gravações e uma leitura) foi
feita à mão em 17/11/2026; o registro é `evidencias/indexeddb.json`. O padrão de teste é
repetido (0 e -1); não equivale a um mapa com ruído, a um PNG ou a um aparelho lento.

O Studio aplica o orçamento de caracteres dele separadamente. O editor não promete que o mapa
máximo caiba no Studio ou numa imagem; a recusa do adaptador é explícita.

## Para repetir os ensaios à mão

Estes comandos existem, mas o resultado deles não é conferido por nenhum teste:

```powershell
# Gera os pacotes em output/pinta-cenarios/ (ignorado pelo Git) para abrir nos programas.
bun packages/pinta/scripts/homologacao/generate.ts
# Com pygame-ce instalado:
python -I packages/studio/scripts/python/test-pinta-module.py
python -I packages/studio/scripts/python/test-pinta-scene-package.py
# Com o Tiled instalado (não realizado nesta revisão):
tiled --export-map json output/pinta-cenarios/tiled/mapas/mapa-0/mapa.tmx output/pinta-cenarios/tiled/tiled-roundtrip.json
bun packages/pinta/scripts/homologacao/verify-tiled.ts output/pinta-cenarios/tiled/tiled-roundtrip.json
# Com o Godot 4.3 ou mais novo instalado (não realizado nesta revisão):
godot --headless --path output/pinta-cenarios/godot --editor --import
godot --headless --path output/pinta-cenarios/godot --quit-after 10
```

A [matriz de compatibilidade](compatibilidade-tiled.md) enumera o que o importador converte,
avisa e recusa.
