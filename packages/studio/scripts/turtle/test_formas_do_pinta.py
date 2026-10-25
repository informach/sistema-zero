"""formas_do_pinta: a Pinta drawing (its own SVG markup) becomes a compound turtle shape.

Runs the module against the browser Turtle engine with a recording transport (no Tk), and,
when this Python has Tk, against the desktop turtle module too.
"""

import importlib.util
import json
import math
import os
from pathlib import Path
import sys
import tempfile
import types
import unittest


ROOT = Path(__file__).resolve().parents[2]
DIRECTORY = ROOT / "src/runtime/python/turtle"
FIXTURE = Path(__file__).resolve().parent / "fixtures/pinta-nave.svg"
package = types.ModuleType("_sz_turtle_runtime")
package.__path__ = [str(DIRECTORY)]
sys.modules[package.__name__] = package
from _sz_turtle_runtime import _sz_turtle_backend as backend

requests = []


def transport(raw):
    request = json.loads(raw)
    requests.append(request)
    query = request.get("query") or {}
    if query.get("type") == "viewport":
        return json.dumps({"events": [], "value": [800, 600]})
    return json.dumps({"events": [], "value": None})


backend.configure(transport, ROOT)


def load(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def fresh():
    """The browser turtle, then formas_do_pinta importing it as `turtle`."""
    browser = load("_formas_turtle", DIRECTORY / "turtle.py")
    sys.modules["turtle"] = browser
    return browser, load("_formas_do_pinta", DIRECTORY / "formas_do_pinta.py")


def svg(body, width=40, height=20):
    folder = tempfile.mkdtemp()
    path = os.path.join(folder, "desenho.svg")
    Path(path).write_text(
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" '
        f'viewBox="0 0 {width} {height}">{body}</svg>',
        encoding="utf-8",
    )
    return path


class FromPinta(unittest.TestCase):
    def setUp(self):
        self.saved_turtle = sys.modules.get("turtle")
        self.turtle, self.formas = fresh()
        requests.clear()

    def tearDown(self):
        screen = self.turtle.Turtle._screen
        if screen is not None and not screen._closed:
            screen.bye()
        if self.saved_turtle is None:
            sys.modules.pop("turtle", None)
        else:
            sys.modules["turtle"] = self.saved_turtle

    def components(self, shape):
        self.assertEqual(shape._type, "compound")
        return shape._data

    def test_every_kind_of_pinta_shape_becomes_one_part_with_its_color(self):
        parts = self.components(self.formas.forma(str(FIXTURE)))
        self.assertEqual(len(parts), 5)
        colors = [(fill, outline) for _, fill, outline in parts]
        # The gradient becomes the color between its two ends.
        self.assertEqual(colors[0], ("#6699ff", "#6699ff"))
        self.assertEqual(colors[1], ("#ff3333", "#ff3333"))
        self.assertEqual(colors[2], ("#ffffff", "#000000"))
        # A brush stroke and a line become bands of their own width and color.
        self.assertEqual(colors[3], ("#ff9900", "#ff9900"))
        self.assertEqual(colors[4], ("#222222", "#222222"))

    def test_the_drawing_faces_right_which_is_where_the_turtle_walks(self):
        parts = self.components(self.formas.forma(str(FIXTURE)))
        nose = parts[1][0]
        # The nose is on the right of the drawing: in a turtle shape that is +y (forward).
        self.assertTrue(all(y > 0 for _, y in nose))
        tip = max(nose, key=lambda point: point[1])
        self.assertEqual(tip, (0.0, 30.0))
        # Down in the drawing is +x of the shape: the antenna (top of the drawing) is -x.
        antenna = parts[4][0]
        self.assertTrue(all(x < 0 for x, _ in antenna))

    def test_the_rotation_pinta_writes_is_applied(self):
        upright = self.components(self.formas.forma(svg(
            '<ellipse cx="20" cy="10" rx="8" ry="2" fill="#000000"/>')))[0][0]
        turned = self.components(self.formas.forma(svg(
            '<ellipse cx="20" cy="10" rx="8" ry="2" fill="#000000" '
            'transform="rotate(90 20 10)"/>')))[0][0]
        width = lambda points, axis: max(p[axis] for p in points) - min(p[axis] for p in points)
        # Long along the drawing's x (shape y) before, along its y (shape x) after.
        self.assertGreater(width(upright, 1), width(upright, 0) * 3)
        self.assertGreater(width(turned, 0), width(turned, 1) * 3)

    def test_size_scales_the_longest_side(self):
        small = self.components(self.formas.forma(str(FIXTURE)))[1][0]
        big = self.components(self.formas.forma(str(FIXTURE), tamanho=128))[1][0]
        for (x1, y1), (x2, y2) in zip(small, big):
            self.assertAlmostEqual(x2, x1 * 2, places=1)
            self.assertAlmostEqual(y2, y1 * 2, places=1)

    def test_registrar_names_the_shape_after_the_file_and_the_turtle_wears_it(self):
        name = self.formas.registrar(str(FIXTURE))
        self.assertEqual(name, "pinta-nave")
        nave = self.turtle.Turtle()
        nave.screen.tracer(0)
        nave.shape(name)
        nave.screen.update()

        def nose():
            drawn = [
                operation for request in requests for operation in request.get("operations", [])
                if operation.get("fill") == "#ff3333" and operation.get("points")
            ]
            self.assertTrue(drawn)
            return drawn[-1]["points"]

        # Facing east (heading 0): the nose is drawn to the right of the turtle on the screen.
        self.assertTrue(all(x > 0 for x, _ in nose()), nose())
        # Facing north: the nose is above it (canvas y grows downwards).
        nave.setheading(90)
        nave.screen.update()
        self.assertTrue(all(y < 0 for _, y in nose()), nose())

    def test_what_is_not_a_shape_says_to_use_the_drawing_as_an_image(self):
        for body in ['<text x="1" y="10">oi</text>',
                     '<image x="0" y="0" width="4" height="4" href="data:image/png;base64,AA=="/>',
                     '<rect width="4" height="4" fill="#000" clip-path="url(#m)"/>']:
            with self.assertRaises(self.formas.DesenhoNaoServe) as error:
                self.formas.forma(svg(body))
            self.assertIn("como imagem", str(error.exception))
        with self.assertRaises(FileNotFoundError):
            self.formas.forma("images/nao-existe.svg")

    def test_a_drawing_with_too_many_points_is_simplified_into_the_budget(self):
        points = " ".join(
            f"{20 + 9 * math.cos(i / 300 * 2 * math.pi):.3f},"
            f"{10 + 9 * math.sin(i / 300 * 2 * math.pi):.3f}"
            for i in range(300)
        )
        body = "".join(f'<polygon points="{points}" fill="#000000"/>' for _ in range(4))
        parts = self.components(self.formas.forma(svg(body)))
        self.assertLessEqual(sum(len(points) for points, _, _ in parts),
                             self.formas.MAXIMO_DE_PONTOS)
        self.assertEqual(len(parts), 4)


class OnTheDesktop(unittest.TestCase):
    def test_the_same_module_builds_the_shape_with_the_desktop_turtle(self):
        try:
            import tkinter  # noqa: F401
        except ImportError:
            print("sem Tk neste Python: o teste com o turtle do computador não rodou")
            return
        saved = sys.modules.pop("turtle", None)
        try:
            import turtle as desktop
            formas = load("_formas_desktop", DIRECTORY / "formas_do_pinta.py")
            shape = formas.forma(str(FIXTURE))
            self.assertIsInstance(shape, desktop.Shape)
            self.assertEqual(len(shape._data), 5)
        finally:
            sys.modules.pop("turtle", None)
            if saved is not None:
                sys.modules["turtle"] = saved


if __name__ == "__main__":
    unittest.main()
