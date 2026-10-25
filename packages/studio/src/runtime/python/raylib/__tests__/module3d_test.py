"""Raylib 3D do Estúdio em CPython puro: o modo 3D, as formas, a câmera automática e o estado.

    python -I -B module3d_test.py <pasta py do módulo>

Os valores de referência foram medidos no raylib 6.0.1.0 do computador (pip install raylib); as
contas de colisão e câmera têm o diferencial próprio (scripts/raylib/tests/diff_3d.py).
"""
import json
import os
import shutil
import sys
import tempfile
import unittest
from array import array

sys.path.insert(0, sys.argv.pop(1))

import _szraylib  # noqa: E402
from _szraylib import _rt  # noqa: E402

FRAMES = []
CLOCK = [0.0]
EVENTS = []


def transport(header, payload):
    FRAMES.append((json.loads(header), bytes(payload)))
    CLOCK[0] += 1000 / 60
    events = EVENTS.pop(0) if EVENTS else []
    return json.dumps({'now': CLOCK[0], 'events': events}), None


ROOT = tempfile.mkdtemp()
# O personagem com esqueleto gravado pelo Molda (o mesmo da cena-gabarito models3d).
MOLDA = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..', '..', '..',
                     'scripts', 'raylib', 'scenes', 'assets', 'models', 'molda-pesos.glb')
os.makedirs(os.path.join(ROOT, 'models'))
shutil.copyfile(MOLDA, os.path.join(ROOT, 'models', 'molda-pesos.glb'))
os.chdir(ROOT)
_szraylib.configure(transport, None, ROOT, '3d')

import pyray as P  # noqa: E402

P.init_window(320, 200, '3d')


def records():
    header, payload = FRAMES[-1]
    values = array('d')
    values.frombytes(payload[:header['list']])
    return list(values)


def draw(function):
    P.begin_drawing()
    function()
    P.end_drawing()
    return records()


class Mode3D(unittest.TestCase):
    def test_begin_mode_3d_sends_the_camera(self):
        camera = P.Camera3D(P.Vector3(1, 2, 3), P.Vector3(0, 0, 0), P.Vector3(0, 1, 0), 45, 0)
        ops = draw(lambda: (P.begin_mode_3d(camera), P.end_mode_3d()))
        self.assertEqual(ops, [_rt.OP_BEGIN_3D, 1, 2, 3, 0, 0, 0, 0, 1, 0, 45, 0, _rt.OP_END_3D])

    def test_shapes_record_raylib_parameters(self):
        ops = draw(lambda: P.draw_cube(P.Vector3(1, 2, 3), 4, 5, 6, P.RED))
        self.assertEqual(ops[:7], [_rt.OP_CUBE, 1, 2, 3, 4, 5, 6])
        # Cilindro com menos de 3 lados vira 3, como no raylib.
        ops = draw(lambda: P.draw_cylinder((0, 0, 0), 1, 1, 2, 1, P.RED))
        self.assertEqual(ops[7], 3)
        # A caixa vira o arame do cubo no meio dela.
        box = P.BoundingBox(P.Vector3(-1, 0, -2), P.Vector3(3, 2, 2))
        ops = draw(lambda: P.draw_bounding_box(box, P.RED))
        self.assertEqual(ops[:7], [_rt.OP_CUBE_WIRES, 1, 1, 0, 4, 2, 4])

    def test_capsule_keeps_pyray_rings_then_slices(self):
        ops = draw(lambda: P.draw_capsule((0, 0, 0), (0, 1, 0), 0.5, 3, 7, P.RED))
        # Registro: início, fim, raio, fatias, anéis, cor.
        self.assertEqual(ops[7:10], [0.5, 7, 3])

    def test_triangle_strip_alternates_winding(self):
        points = [P.Vector3(0, 0, 0), P.Vector3(0, 1, 0), P.Vector3(1, 0, 0), P.Vector3(1, 1, 0)]
        ops = draw(lambda: P.draw_triangle_strip_3d(points, 4, P.RED))
        self.assertEqual(ops[0:10], [_rt.OP_TRIANGLE_3D, 1, 0, 0, 0, 0, 0, 0, 1, 0] + [])
        self.assertEqual(ops[11:21], [_rt.OP_TRIANGLE_3D, 1, 1, 0, 1, 0, 0, 0, 1, 0])

    def test_rlgl_state_survives_as_a_record(self):
        ops = draw(P.rl_disable_backface_culling)
        self.assertEqual(ops, [_rt.OP_RL_STATE, 3, 0])

    def test_wire_mode_says_it_does_not_work_yet(self):
        with self.assertRaises(NotImplementedError):
            P.rl_enable_wire_mode()


class AutomaticCamera(unittest.TestCase):
    def test_first_person_walks_on_the_floor(self):
        camera = P.Camera3D(P.Vector3(0, 2, 4), P.Vector3(0, 2, 0), P.Vector3(0, 1, 0), 60, 0)
        EVENTS.append([['kd', P.KEY_W]])
        P.begin_drawing()
        P.end_drawing()
        P.update_camera(camera, P.CAMERA_FIRST_PERSON)
        # 5,4 unidades por segundo durante um quadro; o y não muda (anda no chão).
        self.assertAlmostEqual(camera.position.z, 4 - 5.4 / 60, places=4)
        self.assertAlmostEqual(camera.position.y, 2, places=6)
        EVENTS.append([['ku', P.KEY_W]])
        P.begin_drawing()
        P.end_drawing()

    def test_orbital_turns_around_the_target(self):
        camera = P.Camera3D(P.Vector3(0, 0, 10), P.Vector3(0, 0, 0), P.Vector3(0, 1, 0), 45, 0)
        for _ in range(60):
            P.begin_drawing()
            P.end_drawing()
            P.update_camera(camera, P.CAMERA_ORBITAL)
        distance = P.vector3_length(camera.position)
        self.assertAlmostEqual(distance, 10, places=3)
        self.assertGreater(abs(camera.position.x), 4)


def header():
    return FRAMES[-1][0]


class Models(unittest.TestCase):
    def test_generated_mesh_goes_to_the_host_once(self):
        mesh = P.gen_mesh_cube(2, 1, 0.5)
        self.assertEqual((mesh.vertexCount, mesh.triangleCount), (24, 12))
        P.begin_drawing()
        P.end_drawing()
        sent = [entry for entry in header()['models'] if entry[1] == mesh.vaoId]
        # 24 vértices com coordenadas, normais e índices: 24*12 + 24*8 + 24*12 + 36*2 bytes.
        self.assertEqual(sent, [['mesh', mesh.vaoId, 24, 36, 11, 24 * 12 + 24 * 8 + 24 * 12 + 72]])
        P.begin_drawing()
        P.end_drawing()
        self.assertEqual([e for e in header()['models'] if e[1] == mesh.vaoId], [])

    def test_draw_model_records_the_mesh_with_its_matrix(self):
        model = P.load_model_from_mesh(P.gen_mesh_cube(1, 1, 1))
        ops = draw(lambda: P.draw_model(model, P.Vector3(1, 2, 3), 2, P.RED))
        self.assertEqual(ops[0], _rt.OP_MESH)
        self.assertEqual(ops[1], model.meshes[0].vaoId)
        self.assertEqual(ops[5], 0)
        # A matriz: escala 2 e translação (1, 2, 3), e a cor do material tingida de vermelho.
        self.assertEqual(ops[6:22], [2, 0, 0, 0, 0, 2, 0, 0, 0, 0, 2, 0, 1, 2, 3, 1])
        self.assertEqual(ops[3], 0xE62937FF)
        self.assertEqual(ops[22:25], [1, 0, 1])  # um mapa (albedo → textura 1) e nenhum osso
        self.assertEqual(len(ops), 26)
        wires = draw(lambda: P.draw_model_wires(model, P.Vector3(0, 0, 0), 1, P.RED))
        self.assertEqual(wires[5], 1)

    def test_unloaded_mesh_is_freed_on_the_host(self):
        mesh = P.gen_mesh_plane(1, 1, 1, 1)
        P.begin_drawing()
        P.end_drawing()
        mesh_id = mesh.vaoId
        P.unload_mesh(mesh)
        P.begin_drawing()
        P.end_drawing()
        self.assertIn(mesh_id, header()['free'])
        self.assertEqual(mesh.vaoId, 0)

    def test_molda_skeleton_like_the_desktop_raylib(self):
        # Valores medidos no raylib 6.0.1.0 do computador com o mesmo arquivo.
        model = P.load_model('models/molda-pesos.glb')
        self.assertTrue(P.is_model_valid(model))
        self.assertEqual((model.meshCount, model.materialCount), (3, 2))
        self.assertEqual(model.skeleton.boneCount, 2)
        # O pai do antebraço é o braço, mesmo com um nó "[base 1]" do Molda entre os dois.
        self.assertEqual(model.skeleton.bones[1].parent, 0)
        count = P.ffi.new('int *', 0)
        animations = P.load_model_animations('models/molda-pesos.glb', count)
        self.assertEqual(count[0], 2)
        self.assertEqual([animations[0].keyframeCount, animations[1].keyframeCount], [61, 1])
        pose = animations[0].keyframePoses[20][1]
        self.assertAlmostEqual(pose.translation.x, 2.8493, places=4)
        self.assertAlmostEqual(pose.rotation.w, -0.1191, places=4)
        P.update_model_animation(model, animations[0], 20)
        ops = draw(lambda: P.draw_model(model, P.Vector3(0, 0, 0), 1, P.WHITE))
        self.assertEqual(ops[0], _rt.OP_MESH)
        bones_at = 22 + 1 + int(ops[22]) * 2
        self.assertEqual(ops[bones_at], 2)


if __name__ == '__main__':
    unittest.main()
