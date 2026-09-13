# Sprites de texto e números no Studio

Proposta aprovada em 13/09/2026. Implementar no Jogo 2D sprites cuja aparência é
texto editável, com criação individual e em grupos, valores vindos de expressões,
dados por instância e clique/toque em sprites ou integrantes de grupos.

## Comportamento

- Texto aceita palavras, frases, números, variáveis, contas e itens de listas.
- Cada criação produz um objeto independente, utilizável pelos blocos existentes
  de posição, velocidade, colisão, desenho, grupos e pelas listas da programação.
- Fonte do jogo, tamanho e cor configuráveis; medidas automáticas, largura opcional
  com quebra de linha, alinhamento, fundo e margem interna para cartões.
- Atualizar conteúdo ou estilo conserva identidade, posição, velocidade, dados e
  pertencimento. A fonte carregada invalida as medidas anteriores.
- Dados nomeados preservam o valor original, separados da apresentação.
- Clique/toque usa a caixa do sprite e transforma coordenadas do palco/câmera;
  no grupo seleciona o integrante desenhado por cima. Registro estável, limpeza
  no reinício e fronteira de callbacks seguem o motor existente.
- O bloco existente de escrever no HUD passa a aceitar expressões, preservando
  projetos e workspaces antigos.

## Integração

Runtime modular na extensão, mesmo modelo físico e caminho de desenho. Schemas e
codecs próprios para Blocos ⇄ IR ⇄ Código; seletores, escopos, catálogo, curadoria,
manual e conhecimento do tutor acompanham as novas operações. Os sprites são
recriados ao executar, sem criar arquivos na biblioteca de imagens.

## Plano e verificação

- [x] Runtime de texto, medidas, estilo, dados e interação.
- [x] Blocos, schemas, codecs, referências e ciclo de vida.
- [x] Compatibilidade do texto variável no HUD e workspaces antigos.
- [x] Exemplos completos: pares/ímpares e quiz por lista.
- [x] Testes de instâncias, texto/números, layout, dados, clique/câmera e reinício.
- [x] Auditoria dos blocos, round-trip, typecheck e lint.
- [x] Verificação em navegador: jogos, toque, tela redimensionada e reabertura.

## Entrega

Jogo 2D 0.80.0: dez blocos novos nas categorias Sprites, Muitos e Controles,
incluídos no perfil essencial. A galeria contém “Chuva de números” e “Quiz de
números”. O quiz foi jogado por duas partidas após abrir a Ponte e recarregar o
projeto; a seleção múltipla não soma pontos repetidos e o reinício limpa os eventos.

Os exemplos mantêm fontes didáticas em `__gen_textGames.ts`. Para regenerar sua IR,
execute `bun scripts/gen-text-games.ts` dentro de `packages/studio`, formate
`src/official-extensions/game-2d/examples/textGames.ts` e atualize o catálogo com
`bun run gen:server-examples`. Os testes comparam as fontes com a IR e verificam
o caminho completo entre código e blocos.

Verificações executadas:

- 541 testes de contratos, migração, exemplos e limites arquiteturais aprovados.
- Suíte ampliada: 3.782 aprovados; três casos de campanha excederam 5 segundos.
  Na execução isolada, os três aprovaram em 2,3 a 2,7 segundos, sem alteração dos testes.
- Sete cenários no Chromium aprovados, incluindo os dois cartões da galeria.
  Os cinco cenários específicos também passaram após ajustar a tipagem do teste.
- Biome nos 47 arquivos TypeScript alterados, sem correções pendentes.
- Regeneração dos exemplos produz os mesmos arquivos após formatação.
- Typecheck completo do Studio aprovado, com cache novo e saída sem erros.

## Correções após o full review

Os seis achados foram corrigidos: declarações mutáveis e IDs explícitos são
preservados pela Ponte e pelos blocos; callbacks compartilhados mantêm cada alvo;
animações retomam após texto; accessors dos grupos continuam protegidos. O quiz
agora aceita 1, 2 e 3 para responder e Enter para avançar ou reiniciar, com textos
publicados no HUD acessível. As opções numéricas também existem nos blocos de tecla.

Validação final: 3.536 testes aprovados, 11 cenários no Chromium aprovados,
typecheck completo aprovado e Biome limpo nos 51 arquivos TypeScript alterados.
As reproduções e evidências estão em
`.audits/architectural-analysis-2026-09-13-text-sprites.md`.
