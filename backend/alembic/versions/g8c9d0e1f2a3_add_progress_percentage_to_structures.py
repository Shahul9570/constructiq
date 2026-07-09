"""add progress_percentage to project_structures

Revision ID: g8c9d0e1f2a3
Revises: f7b8c9d0e1f2
Create Date: 2026-07-09 09:22:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'g8c9d0e1f2a3'
down_revision = 'f7b8c9d0e1f2'
branch_labels = None
depends_on = None

def upgrade() -> None:
    op.add_column('project_structures', sa.Column('progress_percentage', sa.Float(), nullable=True, server_default='0.0'))

def downgrade() -> None:
    op.drop_column('project_structures', 'progress_percentage')
