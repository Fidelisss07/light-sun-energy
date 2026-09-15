import bpy
from pathlib import Path
scene=bpy.context.scene
root=Path(bpy.data.filepath).parent
scene.cycles.denoiser='OPTIX'
if hasattr(scene.cycles,'denoising_use_gpu'): scene.cycles.denoising_use_gpu=True
scene.render.image_settings.compression=10
scene.render.use_persistent_data=True
frames=sorted((root/'frames').glob('frame_*.png'))
resume=int(frames[-1].stem.split('_')[-1])+1 if frames else 1
scene.frame_start=resume
scene.frame_set(resume)
bpy.ops.wm.save_as_mainfile(filepath=str(root/'light-sun-cinematic.blend'))
print('Denoising OptiX na GPU. Retomar no quadro',resume)
