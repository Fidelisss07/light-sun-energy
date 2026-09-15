import bpy
from mathutils import Vector
from pathlib import Path

# ETAPA 1 — câmera próxima, materiais e luz de recorte.
root = Path(bpy.data.filepath).parent
scene = bpy.context.scene
camera = scene.camera
camera.location = (-10.2, 9.2, 6.9)
target = Vector((-3.7, 1.75, 3.35))
camera.rotation_euler = (target-camera.location).to_track_quat('-Z','Y').to_euler()
camera.data.lens = 55
camera.data.dof.use_dof = True
camera.data.dof.focus_distance = (target-camera.location).length
camera.data.dof.aperture_fstop = 5.6
scene.render.resolution_x = 1920
scene.render.resolution_y = 1080
scene.render.resolution_percentage = 70
scene.cycles.samples = 96
scene.cycles.preview_samples = 32
scene.cycles.use_denoising = True
scene.cycles.use_preview_denoising = True
scene.view_settings.view_transform = 'AgX'
scene.view_settings.exposure = 0.25

for obj in scene.objects:
    if obj.type == 'LIGHT' and obj.data.type == 'SUN':
        obj.data.energy = 1.5
        obj.data.angle = 0.12
scene.world.node_tree.nodes.get('Background').inputs['Strength'].default_value = 0.35

def softbox(name, pos, energy, color, size, width):
    light = bpy.data.lights.new(name, 'AREA')
    light.energy, light.color = energy, color
    light.shape = 'RECTANGLE'
    light.size, light.size_y = size, width
    obj = bpy.data.objects.new(name, light)
    scene.collection.objects.link(obj)
    obj.location = pos
    obj.rotation_euler = (target-obj.location).to_track_quat('-Z','Y').to_euler()

softbox('01 | Reflexo longo no vidro', (-3, -3, 10), 1800, (0.79,0.88,1), 9, 2)
softbox('02 | Recorte quente do aluminio', (-9, 0, 7), 1100, (1,0.80,0.52), 6, 3)
glass = bpy.data.materials.get('Photovoltaic glass')
if glass:
    bsdf=glass.node_tree.nodes.get('Principled BSDF')
    bsdf.inputs['Roughness'].default_value = 0.19
    bsdf.inputs['Coat Weight'].default_value = 0.65
    bsdf.inputs['Coat Roughness'].default_value = 0.10

for screen in bpy.data.screens:
    for area in screen.areas:
        if area.type == 'VIEW_3D':
            area.spaces.active.overlay.show_overlays = False
            area.spaces.active.region_3d.view_perspective = 'CAMERA'
            area.spaces.active.shading.type = 'RENDERED'

scene.render.filepath = str(root/'cinematic-lighting-preview.png')
bpy.ops.wm.save_as_mainfile(filepath=str(root/'light-sun-cinematic.blend'))
print('ETAPA 1 pronta: camera, materiais e iluminacao cinematografica.')
