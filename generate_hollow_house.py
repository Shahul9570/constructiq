import trimesh
import numpy as np

# Create an empty scene
scene = trimesh.Scene()

# Helper function to create colored boxes
def add_element(name, extents, translation, color):
    mesh = trimesh.creation.box(extents=extents)
    mesh.apply_translation(translation)
    mesh.visual.face_colors = color
    scene.add_geometry(mesh, node_name=name)

# Floor (20x20)
add_element("Foundation", [20, 0.5, 20], [0, -0.25, 0], [100, 100, 100, 255])

# Roof (22x22, slight overhang)
add_element("Roof", [22, 0.5, 22], [0, 8.25, 0], [150, 50, 50, 255])

# Exterior Walls (height = 8)
# North Wall
add_element("North_Wall", [20, 8, 0.5], [0, 4, -9.75], [200, 200, 200, 255])
# South Wall
add_element("South_Wall", [20, 8, 0.5], [0, 4, 9.75], [200, 200, 200, 255])
# West Wall
add_element("West_Wall", [0.5, 8, 20], [-9.75, 4, 0], [200, 200, 200, 255])

# East Wall (with a 4-unit wide opening for a doorway in the middle)
add_element("East_Wall_Left", [0.5, 8, 8], [9.75, 4, -6], [200, 200, 200, 255])
add_element("East_Wall_Right", [0.5, 8, 8], [9.75, 4, 6], [200, 200, 200, 255])
add_element("East_Wall_Top", [0.5, 3, 4], [9.75, 6.5, 0], [200, 200, 200, 255])

# Interior Walls
# A hallway wall
add_element("Interior_Wall_1", [10, 8, 0.5], [-4.75, 4, 0], [180, 180, 220, 255])
# A cross wall creating a room
add_element("Interior_Wall_2", [0.5, 8, 9.75], [0, 4, -4.875], [180, 180, 220, 255])

# Center Pillar/Column
add_element("Center_Column", [1, 8, 1], [4, 4, 0], [50, 150, 200, 255])

scene.export('interactive_house.glb')
print("Generated interactive_house.glb")
