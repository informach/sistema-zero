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
| A2 | Aula montada no playground (`?aula=`) | pendente |
| A3 | Reprodução dos gestos das aulas no navegador (Playwright) | pendente |
| A4 | Uma prova por curso com o verificador do servidor | pendente |
| A5 | Âncora morta "Atualizar o preview" na documentação | pendente |
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

### O que máquina nenhuma confere

O PDF de passo a passo e os vídeos gravados. A matriz afirma o que está nos roteiros e nos manifestos.
