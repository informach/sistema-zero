"""Empacota os materiais de produção e as 45 etapas para conferência/importação.

Execute depois da geração, dos gates de autoria e da revisão visual dos PDFs.
Os ZIPs são entregas documentais; a regeneração usa o checkout completo.
"""
from __future__ import annotations

import hashlib
import json
from pathlib import Path
import zipfile

ROOT = Path(__file__).resolve().parents[4]
BASE = ROOT / "docs/aulas-interativas/construtor"
TECH = ROOT / "docs/aulas-interativas-tecnico"
DEST = BASE / "entregas"
COURSES = {"nave-contra-asteroides": "2d", "patrulha-espacial": "3d"}


def sha(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def archive(path: Path, files: dict[str, bytes]) -> dict:
    checksums = "".join(f"{sha(data)}  {name}\n" for name, data in sorted(files.items()))
    files["SHA256SUMS.txt"] = checksums.encode()
    with zipfile.ZipFile(path, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=9) as output:
        for name, data in sorted(files.items()):
            entry = zipfile.ZipInfo(name, (2026, 11, 24, 0, 0, 0))
            entry.compress_type = zipfile.ZIP_DEFLATED
            entry.external_attr = 0o100644 << 16
            output.writestr(entry, data, compresslevel=9)
    with zipfile.ZipFile(path) as checked:
        damaged = checked.testzip()
        if damaged:
            raise RuntimeError(f"Arquivo corrompido: {damaged}")
        for name in checked.namelist():
            data = checked.read(name)
            if name.endswith(".json"):
                json.loads(data)
            if name.endswith(".pdf") and not data.startswith(b"%PDF-"):
                raise RuntimeError(f"PDF inválido: {name}")
    return {"file": path.name, "bytes": path.stat().st_size, "sha256": sha(path.read_bytes()), "entries": len(files)}


def main():
    DEST.mkdir(exist_ok=True)
    materials: dict[str, bytes] = {}
    projects: dict[str, bytes] = {}

    def add(path: Path):
        if path.is_file() and not path.is_symlink():
            materials[path.relative_to(ROOT).as_posix()] = path.read_bytes()

    course_counts = []
    for course, dimension in COURSES.items():
        folder = BASE / course
        authored = json.loads((folder / "curso-autoria.json").read_text())
        for path in folder.rglob("*"):
            add(path)
        for index, stage in enumerate(authored["etapas"]):
            projects[f"{dimension}/{index:02d}-{stage}.szproject.json"] = (folder / "projetos" / f"{stage}.szproject.json").read_bytes()
        course_counts.append({"course": course, "lessons": len(authored["aulas"]), "parts": sum(len(lesson["trechos"]) for lesson in authored["aulas"]), "stages": len(authored["etapas"])})

    for path in (BASE / "README.md", BASE / "proposta-cursos-base-2026-11-24.md", BASE / "producao-cursos-base-2026-11-24.md", TECH / "modulos-nave-contra-asteroides.md", TECH / "modulos-patrulha-espacial.md"):
        add(path)
    for pattern in ("construtor-*", "patrulha-espacial-*", "gerar-construtor-bases.ts", "gerar-patrulha-espacial.ts", "gerar-nave-contra-asteroides.ts"):
        for path in (TECH / "qa").glob(pattern):
            add(path)
    for path in (TECH / "qa/relatorios").glob("construtor-*.json"):
        add(path)
    for resource in ("construtor-base", "construtor-nave", "construtor-patrulha"):
        for path in (TECH / "recursos" / resource).rglob("*"):
            if "__pycache__" not in path.parts:
                add(path)

    materials["LEIA-PRIMEIRO.md"] = """# Cursos base do Construtor

Este pacote contém a autoria completa de Nave Contra Asteroides (9 aulas) e Patrulha Espacial (5 aulas), com roteiros, textos ElevenLabs, índices de edição, cadastro, manifestos, projetos, capas e cadernos visuais.

## Por onde começar

1. Abra `docs/aulas-interativas/construtor/producao-cursos-base-2026-11-24.md` para conferir a entrega, os testes e a relação com a proposta pedagógica aprovada, incluída em `proposta-cursos-base-2026-11-24.md`.
2. Em cada diretório de curso, leia `modulos.md` e `mapa-de-aulas.md` para consultar a progressão consolidada.
3. Consulte `passo-a-passo-do-projeto.pdf` e importe os `.szproject.json` quando quiser conferir uma etapa.
4. Use os `.roteiro.md`, masters `.elevenlabs.txt`, falas de personagem e `.edicao.json` para produzir as mídias.

Os textos estão completos; não são áudios sintetizados nem vídeos gravados. O cadastro e a publicação na plataforma ainda são etapas de produção. Os três modelos 3D são os provisórios aprovados; as artes e variações do Blender serão fornecidas por Helena.

Os caminhos originais do repositório foram mantidos. A pasta técnica inclui as fontes específicas desta autoria para consulta. Para regenerar ou executar os testes, use o checkout completo do repositório, com seus pacotes, fontes comuns, assets e dependências; este ZIP não é uma cópia autônoma do monorepo.

Repositório e alterações: https://github.com/informach/sistema-zero/pull/287

`SHA256SUMS.txt` permite conferir a integridade dos arquivos.
""".encode()
    projects["LEIA-PRIMEIRO.md"] = """# Etapas dos jogos do Construtor

Há 26 projetos 2D e 19 projetos 3D, em ordem de construção. O primeiro de cada pasta é o inicial; o último é o completo. Cada arquivo já inclui seus assets.

Importe um arquivo `.szproject.json` de cada vez no Estúdio. As versões intermediárias têm somente as regras construídas até aquela parte: um laser parado ou a ausência de pontos pode ser intencional. O mapa detalhado de aulas e partes está no pacote dos cursos.

No jogo completo 2D: Enter começa; setas movem; cada toque em Espaço dispara. Após o resultado, Enter volta à abertura e outro Enter começa novamente.

No jogo completo 3D: Enter começa; setas movem; cada toque em Espaço dispara. Após o resultado, use o botão Voltar ao início e pressione Enter para jogar novamente.

A meta é acertar vinte asteroides antes de perder três vidas. Asteroides que passam sem bater na nave não tiram vida. As escolhas de aparência não mudam essas regras.

`SHA256SUMS.txt` permite conferir a integridade dos arquivos.
""".encode()

    reports = [archive(DEST / "cursos-base-construtor-2026-11-24.zip", materials), archive(DEST / "projetos-progressivos-construtor-2026-11-24.zip", projects)]
    report = {"version": 1, "date": "2026-11-24", "courses": course_counts, "archives": reports, "zipIntegrity": "passed", "allJsonParsed": True}
    (DEST / "arquivos.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps(report, ensure_ascii=False))


if __name__ == "__main__":
    main()
