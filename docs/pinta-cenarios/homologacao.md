# Homologação: A Vila e a Floresta

Data: 17/11/2026. O cenário é gerado por `packages/pinta/scripts/homologacao/fixture.ts`:
32 × 24 células, 18 camadas (16 de peças, um grupo e uma de objetos), duas folhas, terreno
Wang, água animada, frente, opacidade, deslocamento, parallax, arte, propriedades tipadas,
conjunto vinculado e portas entre Vila e Cabana. Datas e IDs são fixos.

## Resultado das verificações

| Pacote | Testes aprovados | Arquivos | Tipagem |
|---|---:|---:|---|
| Pinta | 1.728 | 149 | aprovada |
| Studio | 11.335 | 840, em 160 processos isolados | aprovada |
| Core | 3.092 | 186 | aprovada |
| member-shell | 2.467 | 283 | aprovada |
| community-kids | 1.667 | 211 | aprovada |
| Members | 2.292 | 359 | aprovada |

Total de 22.581 testes aprovados, nenhuma falha. O Members pulou 679 casos condicionais,
conforme os requisitos de banco/plataforma das suítes; não são apresentados como executados.
As verificações pesadas foram sequenciais. Os consumidores foram verificados no worktree
isolado da entrega; a fonte do Studio foi conferida com a mesma implementação da entrega.

O Biome dos 160 arquivos alterados verificáveis passou sem avisos. `bun run check` do Pinta
também terminou com código 0: 445 arquivos e cinco avisos preexistentes em
`python-monsters/terrain.ts` e `PintaApp.test.tsx`, fora das mudanças. O Phaser gerado tem
verificação separada de hash e licença, em vez de formatação do código de terceiros.

## O ciclo de dez passos

| Passo | Comprovação |
|---|---|
| 1. Criar/abrir | Gerador nativo e importação real do backup na galeria |
| 2. Organizar camadas | Árvore, grupos, pais, renomear, ordem, bloqueio, alpha; testes puros e edição no navegador |
| 3. Pintar e transformar | Oito flags, carimbos, seleção, linha/retângulo/balde/borracha; testes de operação e canvas real |
| 4. Terreno e detalhes | Wang com vizinhos e semente, espalhamento determinístico, prévia e recusa atômica |
| 5. Objetos e conjuntos | Formas/rotação, seleção/copiar/alinhar, referências, biblioteca e conjuntos; wire/arquivo/cena de ida e volta |
| 6. Salvar e restaurar | Persistência capturada em transação, fechamento de dependências, envelope v3; galeria recarregada em navegador |
| 7. Testar no Pinta | Movimento real por setas, colisão, porta para Cabana e retorno à Vila |
| 8. Programar no Studio | Exemplos dos dois motores, 12 blocos, objetos e propriedade `chave=1`; execução em iframe real |
| 9. Atualizar desenho | Casos de biblioteca pessoal preservam `libId`, revisão, frente, cena e programação; inclui PNG igual com metadados alterados |
| 10. Levar para fora | Tiled real, Phaser em Chromium, Python real e Godot headless; comandos abaixo |

As linhas com testes de contrato não são apresentadas como ensaio humano em produção. A nuvem
real/staging e aparelhos físicos não foram acessados. A implementação é local, sem deploy.

## Navegador e visual

Playground do Pinta em `127.0.0.1:5199`, Studio em `127.0.0.1:5173` e Phaser em
`127.0.0.1:5299`. Namespaces de QA separados dos desenhos existentes.

- Desktop 1366 × 768 e notebook 1024 × 768, claro/escuro. Painéis e barra usam o estilo existente.
- Celular 390 × 844: contexto Chromium com `isMobile`, `hasTouch`, `maxTouchPoints=1` e CPU
  emulada em 4×. Canvas medido em 374 px; sem overflow horizontal da página. Botão de mover
  levou o personagem de 32,32 para 37,32 por toque.
- A porta foi atravessada pelos controles reais do teste do Pinta, com retorno.
- No Studio básico, o evento do jogo em execução foi observado com seu personagem real:
  entrada na porta levou a 128 px de largura (Cabana), retorno a 512 px (Vila). No avançado,
  os mesmos métodos confirmaram a transição nos dois sentidos e os objetos/propriedades.
- Phaser 3.90.0 carregou JSON do Tiled e duas imagens distintas da animação; portas em ambos
  os sentidos. Nenhuma requisição a CDN é necessária no pacote exportado.
- A importação do ZIP Tiled pela galeria trouxe cinco desenhos, sem avisos. A escolha é por
  mapa; a restauração do `.pinta.json` do pacote traz todos os mapas juntos.
- O motor básico emitiu um aviso de atraso de quadros durante as suítes pesadas na mesma
  máquina. Isso não é uma medição de desempenho em hardware fraco.

Evidências: [desktop claro](evidencias/editor-camadas-desktop.png),
[desktop escuro](evidencias/editor-desktop-escuro.png),
[notebook claro](evidencias/editor-notebook-claro.png),
[notebook escuro](evidencias/editor-notebook-escuro.png),
[celular claro](evidencias/editor-mobile-toque-claro.png),
[celular escuro](evidencias/editor-mobile-toque-escuro.png),
[teste por toque](evidencias/teste-mobile-toque.png),
[teste no Pinta](evidencias/teste-personagem-desktop.png),
[Studio básico](evidencias/studio-cenario-desktop.png),
[Studio avançado](evidencias/studio-avancado-cenario.png),
[Phaser](evidencias/phaser-pacote.png),
[importação do ZIP Tiled](evidencias/importacao-tiled-zip.png).

A regressão de conjuntos compara pixels antes/depois de soltar nos quatro giros e quatro
combinações de espelho (16 casos). Outra regressão prova que portas dentro de conjuntos
incluem o mapa de destino no pacote. O envio ao Studio usa a mesma expansão de objetos.

Na frota mista, a cena completa declara versão de nuvem 3. O cliente intermediário da base
declara/lê até 2; a trava o impede de baixar o item e a comparação de versão do Members
impede reserva/remoção com declaração inferior. A verificação local usa o contrato do core
e as rotas/serviço do Members; não é prova contra uma instalação em produção.

## Persistência e limites

Antes de elevar os tetos, o IndexedDB guardou 256 × 256 × 32 = 2.097.152 células,
4 MiB de buffers. Cinco gravações: 117,5 / 85,6 / 108,2 / 82,7 / 81,7 ms. Leitura:
64,4 ms, com as 32 camadas intactas. O padrão de teste é repetido (0/-1); não equivale a
PNG, exportação, cena JS com ruído ou aparelho lento. [Registro da medição](evidencias/indexeddb.json).

O Studio aplica seu orçamento de caracteres separadamente. O editor não promete que o mapa
máximo caiba no Studio ou numa imagem; a recusa do adaptador é explícita. O formato mantém
o empacotamento de células acima de 128 × 128 e a codificação anterior para mapas menores.

## Execuções reproduzíveis

```powershell
# Executar separadamente, uma verificação pesada por vez.
cd packages/pinta
bun test src
bun run typecheck
bun run check
cd ../studio
bun run test
bunx --no-install tsc --noEmit --pretty false
```

Os testes do Studio usam o isolamento definido em `scripts/test-isolated.mjs`; os testes
Blockly não compartilham estado global entre arquivos sensíveis.

Python 3.13.17, pygame-ce 2.5.8, SDL 2.32.10:

```powershell
python -I packages/studio/scripts/python/test-pinta-module.py
python -I packages/studio/scripts/python/test-pinta-scene-package.py
```

Ambos passaram. O segundo compara os pixels do PNG v2 com o pacote Pygame no mesmo instante
de animação e verifica as portas nos dois sentidos. As 18 camadas, duas folhas, arte, conjunto
e propriedades são conservados.

Tiled 1.12.2, executável oficial extraído localmente:

```powershell
tiled.exe --export-map json output/pinta-cenarios/tiled/mapas/mapa-0/mapa.tmx output/pinta-cenarios/tiled/tiled-roundtrip.json
```

O resultado do Tiled voltou ao importador e à conversão nativa: 18 camadas, seis objetos,
terreno `grama`, um conjunto e cinco desenhos, sem avisos. Repetir com
`bun packages/pinta/scripts/homologacao/verify-tiled.ts`.

Godot 4.7.2 oficial:

```powershell
godot --headless --path output/pinta-cenarios/godot --editor --import
godot --headless --path output/pinta-cenarios/godot --quit-after 10
```

Importação e execução terminaram com código 0, sem erros de script/importação. O runtime
informou `vila-e-floresta / 18 camadas`. O executável Pygame também completou dez quadros,
além dos dois testes do módulo Python.

A [matriz de compatibilidade](compatibilidade-tiled.md) enumera recusas
de formatos externos. Não há mapa infinito, projeção isométrica/hexagonal ou conjuntos recursivos
nesta entrega; são limites expressos do domínio, sem conversão silenciosa.
