import trimesh
import numpy as np

# Create a scene
scene = trimesh.Scene()

# 1. Foundation
foundation = trimesh.creation.box(extents=[12, 1, 12])
foundation.visual.vertex_colors = [100, 100, 100, 255] # Grey
foundation.apply_translation([0, 0.5, 0])
scene.add_geometry(foundation, node_name="Foundation", geom_name="Foundation_Geom")

# 2. Walls
walls = trimesh.creation.box(extents=[10, 4, 10])
walls.visual.vertex_colors = [200, 200, 200, 255] # Light grey
walls.apply_translation([0, 3, 0])
scene.add_geometry(walls, node_name="Walls", geom_name="Walls_Geom")

# 3. Roof
roof = trimesh.creation.cone(radius=7, height=3)
roof.visual.vertex_colors = [150, 50, 50, 255] # Red roof
roof.apply_translation([0, 6.5, 0])
scene.add_geometry(roof, node_name="Roof", geom_name="Roof_Geom")

# 4. Door
door = trimesh.creation.box(extents=[2, 2.5, 0.5])
door.visual.vertex_colors = [139, 69, 19, 255] # Brown
door.apply_translation([0, 2.25, 5])
scene.add_geometry(door, node_name="Door", geom_name="Door_Geom")

# Export to GLB
scene.export("sample_building.glb")
print("Successfully generated sample_building.glb in the current directory!")
