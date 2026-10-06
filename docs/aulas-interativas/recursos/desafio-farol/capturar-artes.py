"""Captura o jogo real e o caderno para o funil, preservando suas proporções.

Antes: bun docs/aulas-interativas/qa/gerar-preview-farol.ts
       python docs/aulas-interativas/recursos/desafio-farol/gerar-materiais.py
"""
from pathlib import Path
import json
import time
from PIL import Image
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[4]
WORK = ROOT / "tmp/farol-artes"
OUTPUT = ROOT / "packages/funnel/public/img/desafio-primeiro-jogo"


def main():
    errors = []
    with sync_playwright() as runtime:
        browser = runtime.chromium.launch(channel="chrome", headless=True)
        page = browser.new_page(viewport={"width": 640, "height": 480}, device_scale_factor=2)
        # Observa os sprites reais; o percurso abaixo usa somente as teclas do jogo.
        page.add_init_script("""(() => {
          let api;
          Object.defineProperty(window, 'SZGame2D', {
            configurable: true, get: () => api, set(value) {
              api = value;
              window.farolSprites = [];
              const create = api.createSprite;
              api.createSprite = options => {
                const sprite = create(options);
                window.farolSprites.push(sprite);
                return sprite;
              };
            }
          });
        })()""")
        page.on("pageerror", lambda error: errors.append(str(error)))
        # evaluate usa o protocolo do navegador; não relaxa a CSP do preview.
        def wait(condition):
            deadline = time.monotonic() + 10
            while time.monotonic() < deadline:
                if page.evaluate(condition):
                    return
                page.wait_for_timeout(30)
            raise AssertionError(f"Condição não alcançada: {condition}; erros: {errors}")

        page.goto((WORK / "jogo.html").as_uri())
        wait("window.farolSprites?.length === 5 && farolSprites.slice(0, 4).every(s => s.image?.loaded)")
        page.evaluate("document.fonts.ready")
        canvas = page.locator("canvas").first
        canvas.screenshot(path=str(OUTPUT / "farol-jogo.png"))

        def walk(key, condition):
            page.keyboard.down(key)
            wait(condition)
            page.keyboard.up(key)

        walk("ArrowRight", "farolSprites[0].x >= 358")
        wait("document.body.textContent.includes('A porta não abriu')")
        assert page.evaluate("farolSprites[3].x === 492")
        canvas.screenshot(path=str(WORK / "porta-sem-chave.png"))
        walk("ArrowLeft", "farolSprites[0].x <= 198")
        walk("ArrowUp", "farolSprites[1].image === null")
        walk("ArrowDown", "farolSprites[0].y >= 137")
        walk("ArrowRight", "farolSprites[0].x >= 358")
        wait("farolSprites[3].x === 387")
        assert page.evaluate("document.body.textContent.includes('Você acendeu o farol!')")
        canvas.screenshot(path=str(WORK / "vitoria.png"))
        page.reload()
        wait("window.farolSprites?.length === 5 && farolSprites.slice(0, 4).every(s => s.image?.loaded)")
        assert page.evaluate("farolSprites[0].x === 21 && farolSprites[3].x === 492")
        assert not errors, errors

        # Preserva também o enquadramento 4:3 numa coluna estreita.
        page.set_viewport_size({"width": 360, "height": 270})
        canvas.screenshot(path=str(WORK / "jogo-360.png"))
        bounds = canvas.bounding_box()
        assert abs(bounds["width"] / bounds["height"] - 4 / 3) < 0.01
        page.set_viewport_size({"width": 1280, "height": 1200})
        page.goto((ROOT / "tmp/pdfs/desafio-farol/caderno.html").as_uri())
        page.evaluate("document.fonts.ready")
        page.locator('.page[data-id="p8"]').screenshot(path=str(OUTPUT / "farol-caderno.png"))
        page.locator(".blocks").filter(has_text="Duas respostas para a mesma pergunta").screenshot(path=str(OUTPUT / "farol-blocos.png"))
        browser.close()

    # Exporta a mesma captura em WebP, sem cortar nem esticar a composição.
    Image.open(OUTPUT / "farol-jogo.png").convert("RGB").save(OUTPUT / "farol-capa.webp", quality=90)
    sizes = {name: Image.open(OUTPUT / name).size for name in ["farol-jogo.png", "farol-capa.webp", "farol-caderno.png", "farol-blocos.png"]}
    (WORK / "capturas.json").write_text(json.dumps({"sizes": sizes, "errors": errors, "gameplay": "porta sem chave, coleta, vitória, barco, reinício e palco estreito"}, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(sizes))


if __name__ == "__main__":
    main()
