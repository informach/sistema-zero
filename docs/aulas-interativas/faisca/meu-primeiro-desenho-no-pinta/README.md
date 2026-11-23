# Meu primeiro desenho no Pinta

**Extra do Faísca. Autoria implementada localmente em 29/10/2026.** A criança desenha a chave do
seu jogo da Chave do Farol no bloco de Pinta da aula e a coloca no jogo, no bloco de Estúdio da
parte seguinte. O desenho chega sozinho aos materiais do jogo pela vaga de arte `minha-chave`
([design](../../../plans/2026-10-29-desenho-da-crianca-no-jogo-design.md)). Uma aula, duas
entregas (o desenho e o jogo). Manifesto, jogo, roteiro, derivados de voz e caderno disponíveis.
Gravação, escuta de voz e publicação ainda são etapas de produção.

- [Proposta completa](proposta.md): aula, ferramentas, critérios e decisões.

Sem experiência e sem quiz: é exploração de ferramenta, não lógica nova. Extra opcional, não conta
para subir de posto.

## Arquivos de produção

- [Aula 1: A minha chave no Farol](meu-desenho-aula-1.md) · [manifesto](meu-desenho-aula-1.manifesto.json) · [roteiro](meu-desenho-aula-1.roteiro.md).
- [Passo a passo em PDF](passo-a-passo-do-projeto.pdf) · [versão textual](passo-a-passo.md).
- Projetos portáteis: [entrada](meu-desenho-inicio.szproject.json) (a Chave do Farol pronta) e [referência](meu-desenho.szproject.json) (com uma chave de exemplo como `minha-chave`).
- [Organização do curso](modulos.md) · [blocos usados](blocos.json).

Os nomes dos arquivos têm o prefixo `meu-desenho-` porque os validadores acham cada aula pelo
prefixo (`qa/caminhos.ts`); o identificador da aula no manifesto continua `aula-1`.

## Importação e publicação

Curso do seed: `jornada-faisca-extra-2` (adulto: `-adulto`), com a `aula-1` reservada. Importe no
modo preservar. Para a oferta adulta, projete o vínculo com `manifestoParaDestino` (o curso está em
`COMMON_COURSE_SLUGS`); a fonte, a ajuda e a gravação são comuns.

⚠️ Ordem dos serviços: a vaga de arte (`artSlot` no bloco de Pinta e `artSlots` no de Estúdio)
precisa do members, do gateway, do kids, do community e do admin já com esta versão antes de
importar. O members sobe primeiro.

Os vídeos estão como `plannedVideo`: grave e anexe a mídia real antes de publicar. Na gravação,
envie o desenho de verdade antes de gravar a parte do Estúdio (é o envio que põe `minha-chave` nos
materiais). Anexe o PDF ao bloco de materiais da parte 2. O bloco de materiais leva o livro do PDF e os links do Como fazer, sem os passos em texto (desde 22/11/2026: a criança assiste ao vídeo, não lê).
Gere a voz do Zappy no Admin depois de importar.

## Revisão de 23/11/2026: no padrão do Cadê, da Chave do Farol e da Ilha

Com as mesmas regras da Ilha do Farol (o teste `qa/faisca-padrao.test.ts` confere este curso):

- **Estrutura:** Continua a de antes, que já segue a régua da plataforma: o desenho é entregue numa parte de entrega e o jogo no fechamento.
- **Falas:** uma ideia por parágrafo, o porquê antes do como, o teste no jogo com "Tá vendo?" e a causa, "É este bloco que…" e cada clique na sua frase. As frases de conferir, verificar e enviar são as comuns (`faisca-comum.ts`). Nenhuma fala espera o "Salvo".
- **Desenho gravado à mão:** o palco não desenha no Pinta. A parte do desenho tem as deixas da fala no Na tela, sem gestos entre colchetes; a abertura, o material e a troca da imagem seguem os verbos do palco.
- **Na tela:** cada gesto na sua palavra, nos verbos do palco (ESPEC-ROTEIRO, seção 9). Os tempos das setas são estimativas e se acertam no Verificar plano.
- **Recados na página:** cada parte tem o seu, no formato da referência.
- **Debinha e Dedé:** a Debinha (três perguntas), com a tabela de substituições no roteiro, o `.edicao.json` e o arquivo de voz de cada personagem.

**Pendências de produção:** gerar a voz nova da professora (`.elevenlabs.txt`) e a de cada personagem (`.debinha.elevenlabs.txt`, `.dede.elevenlabs.txt`); gravar com o palco e acertar os tempos das setas no Verificar plano; reimportar a aula, com o Jogo 3D 0.33.0 já no ambiente (os projetos 3D saem com essa versão); se a importação recusar um exemplo salvo do Estúdio por ter mudado, dar a ele um id novo; anexar o PDF novo no Admin.

## Regenerar e conferir

Na raiz do repositório:

```bash
bun docs/aulas-interativas-tecnico/qa/gerar-meu-desenho.ts
bun docs/aulas-interativas-tecnico/recursos/meu-primeiro-desenho/gerar-caderno.ts
node docs/aulas-interativas-tecnico/recursos/meu-primeiro-desenho/renderizar-caderno.mjs
bun test docs/aulas-interativas-tecnico/qa/meu-desenho.test.ts
bun test packages/members/tests/integration/meu-desenho-extra-import.test.ts
bun docs/aulas-interativas-tecnico/qa/validar-manifestos.ts
python3 docs/aulas-interativas-tecnico/validar-roteiros.py
```

O render do caderno usa Chrome local (`SZ_CHECK_CHROMIUM` permite outro caminho).
`qa/meu-desenho-browser.ts` roda o objetivo de execução no executor real (cenários `correto` e
`sem-troca`).

[Posto Faísca](../README.md) · [Regras da jornada](../../../jornada-do-criador.md)
