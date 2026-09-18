"""
Piano de cola (Printables #1287354, CC-BY 4.0): STL → public/models/piano.glb.

    /Applications/Blender.app/Contents/MacOS/Blender -b -P scripts/models/piano.py -- raw/extract/piano/<archivo>.stl

El STL ya viene casi en metros (teclado ≈ 1.20 de ancho, teclas a 0.76 del suelo), en Y-up de impresión:
se gira a Z-up de Blender (el exportador lo pasa a Y-up de glTF), se apoya en el suelo y se centra en x.
En glTF el teclado mira a +z. Las medidas del teclado y el atril van a Act4Lighthouse/layout.ts.
"""

import math
import sys
from pathlib import Path

import bpy

ROOT = Path(__file__).resolve().parents[2]
src = Path(sys.argv[sys.argv.index("--") + 1])
out = ROOT / "public/models/piano.glb"

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.wm.stl_import(filepath=str(src))
obj = bpy.context.selected_objects[0]
obj.name = "piano"
obj.rotation_euler = (math.radians(90), 0, 0)
bpy.ops.object.transform_apply(rotation=True)

xs = [v.co.x for v in obj.data.vertices]
zs = [v.co.z for v in obj.data.vertices]
ys = [v.co.y for v in obj.data.vertices]
obj.location = (-(min(xs) + max(xs)) / 2, -(min(ys) + max(ys)) / 2, -min(zs))
bpy.ops.object.transform_apply(location=True)

bpy.ops.object.mode_set(mode="EDIT")
bpy.ops.mesh.select_all(action="SELECT")
bpy.ops.mesh.remove_doubles(threshold=0.0005)
bpy.ops.object.mode_set(mode="OBJECT")
bpy.ops.object.shade_auto_smooth(angle=math.radians(35))

out.parent.mkdir(parents=True, exist_ok=True)
bpy.ops.export_scene.gltf(
    filepath=str(out),
    export_format="GLB",
    use_selection=False,
    export_apply=True,
    export_normals=True,
    export_texcoords=False,
    export_materials="NONE",
    export_draco_mesh_compression_enable=True,
    export_draco_mesh_compression_level=7,
    export_draco_position_quantization=14,
    export_draco_normal_quantization=10,
)
print("tris", len(obj.data.polygons), "bbox", tuple(round(d, 3) for d in obj.dimensions))
