"""add digital twin columns

Revision ID: a2b3c4d5e6f7
Revises: f7b8c9d0e1f2
Create Date: 2026-07-08 10:45:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'a2b3c4d5e6f7'
down_revision = 'f7b8c9d0e1f2'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add model_url to projects
    op.add_column('projects', sa.Column('model_url', sa.String(length=500), nullable=True))
    
    # Add mesh_node_id to project_structures
    op.add_column('project_structures', sa.Column('mesh_node_id', sa.String(length=255), nullable=True))


def downgrade() -> None:
    op.drop_column('project_structures', 'mesh_node_id')
    op.drop_column('projects', 'model_url')
