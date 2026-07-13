"""Add DigitalTwinModel

Revision ID: h9d0e1f2a3b4
Revises: g8c9d0e1f2a3
Create Date: 2026-07-13 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'h9d0e1f2a3b4'
down_revision = 'g8c9d0e1f2a3'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table('digital_twin_models',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('project_id', sa.Integer(), nullable=False),
        sa.Column('file_data', sa.LargeBinary(), nullable=False),
        sa.Column('content_type', sa.String(length=50), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['project_id'], ['projects.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('project_id')
    )
    op.create_index(op.f('ix_digital_twin_models_id'), 'digital_twin_models', ['id'], unique=False)


def downgrade():
    op.drop_index(op.f('ix_digital_twin_models_id'), table_name='digital_twin_models')
    op.drop_table('digital_twin_models')
