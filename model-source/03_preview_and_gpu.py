import bpy
from pathlib import Path
root=Path(bpy.data.filepath).parent
scene=bpy.context.scene
result=bpy.data.images.get('Render Result')
if result: result.save_render(str(root/'cinematic-lighting-preview.png'), scene=scene)
prefs=bpy.context.preferences.addons['cycles'].preferences
prefs.compute_device_type='OPTIX'
prefs.get_devices()
devices=[]
for device in prefs.devices:
    device.use=device.type=='OPTIX'
    if device.use: devices.append(device.name)
if devices: scene.cycles.device='GPU'
print('Render devices:',devices)
scene.cycles.samples=64
scene.cycles.adaptive_threshold=.04
scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG'
scene.render.image_settings.color_mode='RGB'
scene.render.filepath=str(root/'frames'/'frame_')
scene.render.use_persistent_data=True
scene.frame_set(1)
for screen in bpy.data.screens:
    for area in screen.areas:
        for space in area.spaces:
            if space.type=='VIEW_3D':
                space.shading.type='MATERIAL'
                space.overlay.show_overlays=False
                space.region_3d.view_perspective='CAMERA'
bpy.ops.wm.save_as_mainfile(filepath=str(root/'light-sun-cinematic.blend'))
print('ETAPA 3: imagem de teste salva; animacao pronta para revisao.')
