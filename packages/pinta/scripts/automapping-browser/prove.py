"""Execute contra o playground privado em Chromium com IndexedDB em um perfil temporário."""
import argparse
import json
from pathlib import Path
from uuid import uuid4

from playwright.sync_api import expect, sync_playwright

parser = argparse.ArgumentParser()
parser.add_argument("--url", default="http://127.0.0.1:5569")
parser.add_argument("--channel", default="chrome")
parser.add_argument("--out", required=True, type=Path)
args = parser.parse_args()
args.out.mkdir(parents=True, exist_ok=True)
url = f"{args.url}/?profile={uuid4()}"
with sync_playwright() as api:
    browser = api.chromium.launch(channel=args.channel)
    context = browser.new_context(viewport={"width": 1440, "height": 980}, locale="pt-BR")
    first = context.new_page()
    errors = []
    first.on("pageerror", lambda exc: errors.append(str(exc)))
    first.goto(url)
    first.wait_for_function("!!window.automapQA", timeout=30000)
    def panel(page):
        page.get_by_label("Nível das ferramentas").select_option("advanced")
        box = page.locator("[data-pinta-automapping]")
        expect(box.get_by_role("button",name="Capturar entrada")).to_be_enabled()
        return box
    def state(page):
        return page.evaluate("automapQA.snapshot()")
    box = panel(first)
    box.get_by_label("Prévia ao pintar").check()
    stage=first.locator("canvas[tabindex='0']")
    stage.focus()
    stage.press("Control+Home")
    stage.press("Enter")
    expect(box.get_by_role("button",name="Cancelar prévia")).to_be_visible()
    assert not state(first)["dirty"]
    stage.press("Escape")
    expect(box.get_by_role("button",name="Aplicar prévia")).to_have_count(0)
    stage.click(position={"x":4,"y":4})
    expect(box.get_by_role("button",name="Aplicar prévia")).to_be_visible()
    assert state(first)["ground"] == -1
    box.get_by_role("button",name="Aplicar prévia").click()
    assert (state(first)["ground"],state(first)["front"])==(0,0)
    first.evaluate("automapQA.undo()")
    assert state(first)["front"]==-1 and not state(first)["canUndo"]
    first.evaluate("automapQA.redo()")
    assert first.evaluate("automapQA.flush()")["ok"]
    other=context.new_page()
    other.goto(url)
    other.wait_for_function("!!window.automapQA")
    parallel=panel(other)
    assert state(other)["front"] == 0
    box.get_by_label("Nome da regra").fill("Marca da trilha")
    box.get_by_role("button",name="Capturar entrada").click()
    box.get_by_label("Chão",exact=True).uncheck()
    box.get_by_label("Frente",exact=True).check()
    box.get_by_role("button",name="Guardar saída").click()
    assert state(first)["rules"]==2
    box.get_by_label("Semente",exact=True).fill("39")
    box.get_by_label("Semente",exact=True).blur()
    box.get_by_role("button",name="Adicionar variação de saída").click()
    assert first.evaluate("automapQA.flush()")["ok"]
    parallel.get_by_label("Semente",exact=True).fill("123")
    parallel.get_by_label("Semente",exact=True).blur()
    assert not other.evaluate("automapQA.flush()")["ok"]
    assert state(other)["dirty"]
    first.reload()
    first.wait_for_function("!!window.automapQA")
    box=panel(first)
    assert state(first)["seed"]==39 and state(first)["rules"]==2
    box.get_by_label("Ordem das regras").select_option(label="2. Marca da trilha")
    box.get_by_role("button",name="Subir",exact=True).click()
    assert first.evaluate("automapQA.flush()")["ok"]
    with first.expect_download() as pending:
        box.get_by_role("button",name="Exportar regras").click()
    path=args.out/"mapa.pinta-regras.json"
    pending.value.save_as(path)
    book=json.loads(path.read_text("utf-8"))
    assert book["rules"][0]["name"]=="Marca da trilha" and len(book["rules"][0]["outputs"])==2
    for rule in book["rules"]:
        for group in [rule["input"],*rule["outputs"]]:
            for plane in group:
                plane["layer"]={"chao":"externa-entrada","frente":"externa-saida"}[plane["layer"]]
    payload=json.dumps(book,ensure_ascii=False).encode()
    box.locator("input[type=file]").set_input_files({"name":"externa.pinta-regras.json","mimeType":"application/json","buffer":payload})
    confirms=box.get_by_role("button",name="Guardar as regras do arquivo")
    expect(confirms).to_be_disabled()
    box.get_by_label("Regra Marca da trilha, camada externa-entrada").select_option("chao")
    box.get_by_label("Regra Marca da trilha, camada externa-saida").select_option("frente")
    confirms.click()
    assert first.evaluate("automapQA.flush()")["ok"]
    native=first.evaluate("automapQA.file()")
    (args.out/"mundo.pinta.json").write_bytes(native.encode("utf-8"))
    box.evaluate("element=>element.closest('section').scrollIntoView({block:'start'})")
    first.screenshot(path=str(args.out/"oficina.png"))
    assert not errors, errors
    print(json.dumps({"browser":browser.version,"state":state(first),"book":len(book["rules"]),"nativeVersion":json.loads(native)["version"],"staleWindow":state(other)["saveState"],"pageErrors":errors},ensure_ascii=False))
    browser.close()
