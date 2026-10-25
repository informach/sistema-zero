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
        self.assertEqual(len(parts), 6)
        colors = [(fill, outline) for _, fill, outline in parts]
        # The gradient becomes the color between its two ends.
        self.assertEqual(colors[0], ("#6699ff", "#6699ff"))
        self.assertEqual(colors[1], ("#ff3333", "#ff3333"))
        # A filled shape with an outline: the fill, then the outline as a band on top of it.
        self.assertEqual(colors[2], ("#ffffff", "#ffffff"))
        self.assertEqual(colors[3], ("#000000", "#000000"))
        # A brush stroke and a line become bands of their own width and color.
        self.assertEqual(colors[4], ("#ff9900", "#ff9900"))
        self.assertEqual(colors[5], ("#222222", "#222222"))

    def test_the_drawing_faces_right_which_is_where_the_turtle_walks(self):
        parts = self.components(self.formas.forma(str(FIXTURE)))
        nose = parts[1][0]
        # The nose is on the right of the drawing: in a turtle shape that is +y (forward).
        self.assertTrue(all(y > 0 for _, y in nose))
        tip = max(nose, key=lambda point: point[1])
        self.assertEqual(tip, (0.0, 30.0))
        # Down in the drawing is +x of the shape: the antenna (top of the drawing) is -x.
        antenna = parts[5][0]
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
            self.assertIn("imagem PNG", str(error.exception))
            self.assertIn("desenho novo", str(error.exception))
        with self.assertRaises(FileNotFoundError):
            self.formas.forma("images/nao-existe.svg")

    def test_a_hole_stays_a_hole_in_one_part(self):
        parts = self.components(self.formas.forma(svg(
            '<path d="M 0 0 L 100 0 L 100 100 L 0 100 Z M 25 25 L 25 75 L 75 75 L 75 25 Z" '
            'fill="#ff0000"/>', 100, 100)))
        self.assertEqual(len(parts), 1)
        polygon = parts[0][0]

        def even_odd(point):
            x, y = point
            inside = False
            for (x1, y1), (x2, y2) in zip(polygon, polygon[1:] + polygon[:1]):
                if (y1 > y) != (y2 > y) and x < x1 + (y - y1) * (x2 - x1) / (y2 - y1):
                    inside = not inside
            return inside

        def winding(point):
            x, y = point
            total = 0
            for (x1, y1), (x2, y2) in zip(polygon, polygon[1:] + polygon[:1]):
                if y1 <= y < y2 and (x2 - x1) * (y - y1) - (x - x1) * (y2 - y1) > 0:
                    total += 1
                elif y2 <= y < y1 and (x2 - x1) * (y - y1) - (x - x1) * (y2 - y1) < 0:
                    total -= 1
            return total

        # Shape coordinates are centred: the hole is around (0, 0), the ring around (-40, -40).
        self.assertFalse(even_odd((1, 2)))
        self.assertEqual(winding((1, 2)), 0)
        self.assertTrue(even_odd((-40, -38)))
        self.assertNotEqual(winding((-40, -38)), 0)

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


    def test_many_small_parts_never_vanish_to_fit_the_budget(self):
        # 140 little squares (eyes, buttons) and one big circle: every part stays.
        squares = "".join(
            f'<rect x="{(i % 14) * 7}" y="{(i // 14) * 7}" width="4" height="4" fill="#000000"/>'
            for i in range(140)
        )
        body = '<ellipse cx="50" cy="50" rx="45" ry="45" fill="#ff0000"/>' + squares
        parts = self.components(self.formas.forma(svg(body, 100, 100)))
        self.assertEqual(len(parts), 141)
        self.assertTrue(all(len(points) >= 3 for points, _, _ in parts))
        self.assertLessEqual(sum(len(points) for points, _, _ in parts),
                             self.formas.MAXIMO_DE_PONTOS)

    def test_too_many_parts_say_so_instead_of_dropping_some(self):
        squares = "".join(
            f'<rect x="{(i % 16) * 6}" y="{(i // 16) * 6}" width="4" height="4" fill="#000000"/>'
            for i in range(160)
        )
        with self.assertRaises(self.formas.DesenhoNaoServe) as error:
            self.formas.forma(svg(squares, 100, 100))
        self.assertIn("detalhes demais", str(error.exception))

    def test_a_thick_outline_keeps_its_corners_and_its_width(self):
        band = self.formas._faixa_fechada([(10, 10), (50, 10), (50, 40), (10, 40)], 10)

        def inside(point):
            x, y = point
            dentro = False
            for (x1, y1), (x2, y2) in zip(band, band[1:] + band[:1]):
                if (y1 > y) != (y2 > y) and x < x1 + (y - y1) * (x2 - x1) / (y2 - y1):
                    dentro = not dentro
            return dentro

        # The first corner (where the ring starts) and the others are full, not notched.
        for corner in [(6, 6), (54, 6), (54, 44), (6, 44)]:
            self.assertTrue(inside(corner), corner)
        # The band is 10 wide: 5 out and 5 in from the line; the middle stays empty.
        self.assertTrue(inside((7, 25)))
        self.assertTrue(inside((14, 25)))
        self.assertFalse(inside((16, 25)))
        self.assertFalse(inside((30, 25)))
        self.assertFalse(inside((4, 25)))

    def test_a_single_brush_tap_becomes_a_round_dot(self):
        dot = self.formas._faixa_aberta([(10, 10), (10.01, 10)], 6)
        self.assertEqual(len(dot), 12)
        for x, y in dot:
            self.assertAlmostEqual(math.dist((x, y), (10.005, 10)), 3, places=5)

    def test_a_filled_shape_with_an_outline_gets_the_outline_as_its_own_band(self):
        parts = self.components(self.formas.forma(svg(
            '<rect x="5" y="5" width="30" height="10" fill="#00ff00" stroke="#0000ff" '
            'stroke-width="2px"/>')))
        self.assertEqual([(fill, edge) for _, fill, edge in parts],
                         [("#00ff00", "#00ff00"), ("#0000ff", "#0000ff")])

    def test_what_the_module_cannot_draw_is_refused_with_a_clear_message(self):
        for body, reason in [
            ('<path d="M 10 10 A 5 5 0 0 1 30 10 Z" fill="#000"/>', "comando"),
            ('<rect width="9" height="9" fill="#000" opacity="0.5"/>', "transparente"),
            ('<g transform="translate(5 0)"><rect width="9" height="9" fill="#000"/></g>',
             "não entende"),
            ('<rect width="9" height="9" style="fill:red"/>', "não entende"),
        ]:
            with self.assertRaises(self.formas.DesenhoNaoServe, msg=body) as error:
                self.formas.forma(svg(body))
            self.assertIn(reason, str(error.exception))
        # A plain group (no transform, no color) is fine: its children are drawn.
        parts = self.components(self.formas.forma(svg(
            '<g><rect width="9" height="9" fill="#000"/></g>')))
        self.assertEqual(len(parts), 1)

    def test_a_drawing_named_like_a_turtle_shape_is_refused(self):
        with self.assertRaises(self.formas.DesenhoNaoServe) as error:
            self.formas.registrar(str(FIXTURE), nome="circle")
        self.assertIn("já é de uma forma da tartaruga", str(error.exception))


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
            self.assertEqual(len(shape._data), 6)
            # Tk really draws it: register the shape on a screen and let a turtle wear it.
            import tkinter
            try:
                root = tkinter.Tk()
            except tkinter.TclError:
                print("sem tela para o Tk: o desenho com o turtle do computador não rodou")
                return
            try:
                root.withdraw()
                canvas = tkinter.Canvas(root, width=200, height=200)
                screen = desktop.TurtleScreen(canvas)
                screen.register_shape("nave", shape)
                nave = desktop.RawTurtle(screen)
                nave.shape("nave")
                nave.setheading(90)
                screen.update()
                polygons = [item for item in canvas.find_all() if canvas.type(item) == "polygon"]
                self.assertGreaterEqual(len(polygons), 6)
            finally:
                root.destroy()
        finally:
            sys.modules.pop("turtle", None)
            if saved is not None:
                sys.modules["turtle"] = saved


if __name__ == "__main__":
    unittest.main()
