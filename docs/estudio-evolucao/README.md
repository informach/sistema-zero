# Evolução do Estúdio (Clássico e Pro)

Registro vivo da missão. Branch `estudio-evolucao`, criada da `staging` em `bf6e895f` (17/11/2026).
Nada aqui foi mesclado na `staging` nem implantado.

## Regra que bloqueia qualquer entrega

Os cursos **Cadê Todo Mundo?** e **Desafio do Primeiro Jogo — A Chave do Farol** foram gravados por
inteiro (confirmado pela dona em 17/11/2026). O que eles ensinam no Estúdio clássico não pode mudar:
blocos, textos, cores, campos, opções, padrões, caminho na paleta, áreas, prévia e projetos salvos.

> Divergência anotada: documentos antigos do repositório dizem "gravação não confirmada" para o
> Farol. Vale a palavra dela; a proteção é integral nos dois.

## Diagnóstico de partida (código de 17/11/2026)

1. A prévia do Clássico roda na mesma thread do editor (`PreviewIframe`, iframe `srcdoc`). Trabalho
   síncrono que não é laço congela a IDE; o vigia detecta, mas o Parar fica preso.
2. Nada é incremental no Clássico JS: cada edição serializa o espaço inteiro, refaz a IR, os
   diagnósticos e os três arquivos; cada salvamento regrava a partição de blocos inteira.
3. Os cursos protegidos não tinham teste que reproduzisse o gesto da criança.
4. Pro: o editor aceita 5.000 arquivos e o compilador remoto 80; o WebContainer chega a 2,4 a 2,7 GiB.
5. Não existem depurador, medidor de desempenho, testes do usuário nem carregamento por regiões.

O documento da prévia tem 57 bytes de folga no teto de 790.000 (Reino Zero): nenhuma solução de
isolamento pode acrescentar bytes a ele.

## Pacotes e estado

| Pacote | O que é | Estado |
|---|---|---|
| A1 | Matriz de compatibilidade e travas estáticas dos dois cursos | **feito** |
| A2 | Aula montada no playground (`/aula?aula=`) | **feito** |
| A3 | Reprodução dos gestos das aulas no navegador (Playwright) | **feito** |
| A4 | Uma prova por curso com o verificador do servidor | pendente |
| A5 | Âncora morta "Atualizar o preview" na documentação | **feito** |
| B | Isolamento da prévia (medição, marca de execução, casca em outra origem, programas hostis) | pendente |
| C | Clássico em escala (perfil, IR incremental, montagem sob demanda) | pendente |
| D a K | Pro em escala, depuração, desempenho, motores, testes do usuário, Pinta e Molda, persistência, homologação | pendente |

## A1: o que existe e como rodar

- `docs/aulas-interativas-tecnico/qa/matriz-compatibilidade.ts`: gera a matriz a partir dos
  manifestos, dos gestos entre colchetes dos roteiros e do catálogo de blocos.
- `matriz-compatibilidade.md` (para ler) e `.json` (retrato completo): arquivos gerados. Regravar com
  `bun docs/aulas-interativas-tecnico/qa/matriz-compatibilidade.ts --gravar`. **Regravar é admitir
  uma mudança no que foi ensinado**: só com decisão dela.
- `matriz-compatibilidade.test.ts` (43 testes): o retrato inteiro; cada gesto de paleta dos roteiros
  achado na paleta real da aula; e uma tabela escrita à mão, que não se regrava, com 19 blocos
  (texto, caminho, padrões, opções).
- `packages/studio/src/blockly/__tests__/protectedCourses.test.ts` (15 testes): os sete projetos
  das aulas (o inicial de cada aula e os dois jogos finais) carregados num Blockly sem tela. Os
  blocos gravam de volta iguais e o código gerado é o guardado no projeto.

```bash
bun test docs/aulas-interativas-tecnico/qa/matriz-compatibilidade.test.ts
```

```bash
cd packages/studio && bun test src/blockly/__tests__/protectedCourses.test.ts
```

### Achados de A1

- 35 tipos de bloco ensinados (23 no Cadê, 28 no Farol). A paleta de toda aula tem as mesmas
  quatro categorias, nesta ordem: Áreas do projeto, Blocos deste jogo, Programação, Jogo 2D.
- Nenhuma divergência hoje entre os roteiros e a paleta real.
- Os sete projetos declaram `game-2d@1.2.0`; o manifesto da extensão está em 2.1.0. Fica registrado,
  sem conserto: os projetos abrem e geram o mesmo código.
- O `script.js` guardado nos projetos difere do gerado pelos blocos só na chave interna de cada
  evento (nome escrito à mão no arquivo, id do bloco na geração). O programa é o mesmo; o teste
  compara ignorando essa chave e também confere que a IR guardada gera o arquivo guardado, byte a byte.

## A2 e A3: as aulas refeitas no navegador

- **A aula no playground** (`packages/studio/playground/lessonHarness.tsx`):
  `/aula?aula=<curso>/<aula>&bloco=<chave>` monta o `StudioLesson` com o projeto inicial, o nível,
  os blocos liberados e os modos do manifesto, com os mesmos cortes da página da aula, sem gravar.
- **O robô de gravação dirigido pelo Playwright** (`packages/studio/e2e/helpers/palco.ts`): a
  biblioteca que gravou as aulas (`packages/palco-gravacao/src/lib/{verbos,pagina}.ts`) entra na
  página e o Playwright faz a mão. Nada foi reescrito: é o mesmo código que achou cada bloco na
  gravação.
- **O teste** (`packages/studio/e2e/protected-lessons.spec.ts`), uma aula por caso, cinco casos:
  refaz na ordem todos os gestos de Estúdio do roteiro e, ao fim de cada parte, confere
  1. os objetivos de **estrutura** da parte, com a régua do servidor
     (`scripts/check-lesson-objectives.ts`);
  2. o `script.js` que a parte deixa pronto contra a referência guardada em
     `e2e/fixtures/protected-lessons/<aula>/<parte>.script.js` (13 arquivos);
  3. nas partes de chegada (Cadê aula 2 "contar-achados" e Farol dia 3 "decisao"), que o jogo
     montado é o **projeto final do curso**, linha por linha.

```bash
cd packages/studio && bunx playwright test e2e/protected-lessons.spec.ts --project=chromium --trace off
```

Neste ambiente o Chromium instalado é de outra revisão que a do pacote: acrescente
`PW_CHROMIUM=/opt/pw-browsers/chromium` (a variável é nova e opcional; sem ela nada muda).
Regravar as referências: `PROTECTED_LESSONS_UPDATE=1`, só com decisão dela.

### Resultado em 17/11/2026 (staging `bf6e895f`, antes de qualquer mudança funcional)

| Aula | Partes de Estúdio | Gestos refeitos | Objetivos de estrutura | Tempo |
|---|---|---|---|---|
| Cadê, aula 1 | 1 | 22 | 0 (os 2 da parte rodam o jogo) | 21 s |
| Cadê, aula 2 | 2 | 35 | 0 (os 4 rodam o jogo) | 42 s |
| Farol, dia 1 | 2 | 55 | 5 de 5 | 1,2 min |
| Farol, dia 2 | 3 | 99 | 19 de 19 | 1,7 min |
| Farol, dia 3 | 5 | 188 | 25 de 25 | 3,3 min |

- **Prova de que o teste morde:** com o texto de "Deixar o sprite … com … % de visibilidade"
  trocado para "Tornar o sprite…", a aula 1 do Cadê reprova no gesto 14 com a frase do robô
  ("Não achei o bloco "Deixar o sprite" na paleta"). A mudança foi desfeita.
- **O jogo montado pelos gestos é o projeto final**, nos dois cursos. As partes seguintes
  (personalização) mudam só as imagens e as frases que o roteiro manda mudar.
- Capturas de tela de cada parte: `docs/estudio-evolucao/evidencias/a3-antes/`. São o "antes" de
  toda mudança funcional daqui em diante.

### O que A3 não cobre

- Gestos da **página da aula**: expandir e reduzir o Estúdio, Verificar projeto, Enviar meu
  projeto, Próxima parte, Concluir aula e o Compartilhar (ficam para A4, com o app de verdade).
- Objetivos que **rodam o jogo** (17 dos 66): quem responde é o executor do servidor.
- As partes sem Estúdio (jogo pronto, caderno, experiências).
- Só Chromium, tela de 1440 por 900, o Estúdio no tamanho "expandido" da gravação.

### Falha que já existia antes desta frente

`e2e/smoke.spec.ts` › "Pensa: recolher e abrir preserva editor e histórico" reprova na `staging`
intocada (`bf6e895f`) neste ambiente, sempre no mesmo ponto: o botão Desfazer da barra não tira o
texto digitado no código da Ponte. Conferido com os arquivos da `staging` no lugar dos desta
branch. Não foi investigado ainda (pode ser a revisão do Chromium daqui, 1243, diferente da que o
pacote pede, ou um defeito real); fica na lista do pacote J. Os outros 16 casos do smoke passam.

### O que máquina nenhuma confere

O PDF de passo a passo e os vídeos gravados. A matriz afirma o que está nos roteiros e nos manifestos.
