import trimesh
import numpy as np

scene = trimesh.Scene()

def add_element(name, extents, translation, color):
    mesh = trimesh.creation.box(extents=extents)
    mesh.apply_translation(translation)
    mesh.visual.face_colors = color
    scene.add_geometry(mesh, node_name=name)

# --- Floor & Roof ---
add_element("Foundation", [40, 0.5, 30], [0, -0.25, 0], [80, 80, 85, 255])
add_element("Roof", [42, 0.5, 32], [0, 10.25, 0], [100, 40, 40, 255])

# --- Exterior Walls (Height 10) ---
add_element("North_Wall_Solid", [40, 10, 0.5], [0, 5, -14.75], [200, 200, 190, 255])
add_element("South_Wall_Solid", [40, 10, 0.5], [0, 5, 14.75], [200, 200, 190, 255])

# West Wall (with front door gap in middle)
add_element("West_Wall_Left", [0.5, 10, 12], [-19.75, 5, -9], [200, 200, 190, 255])
add_element("West_Wall_Right", [0.5, 10, 12], [-19.75, 5, 9], [200, 200, 190, 255])
add_element("West_Wall_Top", [0.5, 3, 6], [-19.75, 8.5, 0], [200, 200, 190, 255]) # Over door

# East Wall (Solid)
add_element("East_Wall_Solid", [0.5, 10, 30], [19.75, 5, 0], [200, 200, 190, 255])

# --- Interior Walls ---
# Main horizontal hallway divider
add_element("Hallway_Wall_North", [30, 10, 0.5], [-4.5, 5, -5], [230, 230, 225, 255])
add_element("Hallway_Wall_South", [20, 10, 0.5], [-9.5, 5, 5], [230, 230, 225, 255])

# Room Dividers (creating rooms off the hallway)
# Bedroom 1 Divider
add_element("Bedroom1_Wall", [0.5, 10, 9.75], [10, 5, -9.875], [230, 230, 225, 255])
# Bathroom Divider
add_element("Bathroom_Wall", [0.5, 10, 9.75], [0, 5, -9.875], [230, 230, 225, 255])
# Living Room / Kitchen Divider
add_element("Kitchen_Wall", [0.5, 10, 9.75], [5, 5, 9.875], [230, 230, 225, 255])

# --- Interior Furniture (to test teleportation inside rooms) ---

# Bedroom 1 (Bed)
add_element("Master_Bed_Frame", [4, 1, 6], [14, 0.5, -10], [120, 90, 60, 255])
add_element("Master_Bed_Mattress", [3.8, 0.5, 5.8], [14, 1.25, -10], [250, 250, 250, 255])

# Bedroom 2 (Bed)
add_element("Guest_Bed", [3, 1.5, 5], [-5, 0.75, -10], [100, 120, 160, 255])

# Bathroom (Bathtub block)
add_element("Bathtub", [3, 2, 6], [8, 1, -11], [240, 240, 245, 255])

# Living Room (Sofa and TV Unit)
add_element("Living_Sofa_Base", [8, 1, 3], [-10, 0.5, 10], [60, 60, 60, 255])
add_element("Living_Sofa_Back", [8, 2, 0.5], [-10, 1.5, 11.25], [60, 60, 60, 255])
add_element("TV_Stand", [6, 1.5, 1], [-10, 0.75, 14], [150, 110, 80, 255])

# Kitchen (Island / Counter)
add_element("Kitchen_Island", [6, 3, 3], [12, 1.5, 10], [210, 210, 215, 255])

# Export the scene
output_file = 'complex_furnished_house.glb'
scene.export(output_file)
print(f"Generated {output_file} successfully.")
