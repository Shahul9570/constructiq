"""Add DigitalTwinIssue

Revision ID: j1f2g3h4i5j6
Revises: i0e1f2a3b4c5
Create Date: 2026-07-13 13:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'j1f2g3h4i5j6'
down_revision = 'i0e1f2a3b4c5'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table('digital_twin_issues',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('project_id', sa.Integer(), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('status', sa.String(length=50), nullable=True),
        sa.Column('priority', sa.String(length=50), nullable=True),
        sa.Column('mesh_node_id', sa.String(length=255), nullable=True),
        sa.Column('position_x', sa.Float(), nullable=False),
        sa.Column('position_y', sa.Float(), nullable=False),
        sa.Column('position_z', sa.Float(), nullable=False),
        sa.Column('created_by_id', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['created_by_id'], ['users.id'], ),
        sa.ForeignKeyConstraint(['project_id'], ['projects.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_digital_twin_issues_id'), 'digital_twin_issues', ['id'], unique=False)


def downgrade():
    op.drop_index(op.f('ix_digital_twin_issues_id'), table_name='digital_twin_issues')
    op.drop_table('digital_twin_issues')
