# Passo a passo do projeto

Material comum aos dois públicos, com instruções completas, exemplos e nomes de controles iguais aos da aula. Anexar uma vez na primeira aula; consulta e download opcionais.

```powershell
python docs/aulas-interativas-tecnico/recursos/corre-dino/gerar-materiais.py
```

O gerador usa as fontes editoriais e de projeto em `../../qa/`. Requer Bun, Python/Playwright e Chrome ou Edge. Não há versão adulta separada nem argumento `--adulto`.

Saída: [passo-a-passo-do-projeto.pdf](../../../aulas-interativas/corre-dino/passo-a-passo-do-projeto.pdf). Intermediários e relatórios ficam em `tmp/pdfs/corre-dino/`. O pipeline confere fontes, imagens, cores reais dos blocos e limites. Renderizar e revisar visualmente após mudar texto ou esquemas; testes não substituem a inspeção.
