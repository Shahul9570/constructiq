"""add file_blobs table

Revision ID: m4i5j6k7l8m9
Revises: l3h4i5j6k7l8
Create Date: 2026-07-14 11:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'm4i5j6k7l8m9'
down_revision = 'l3h4i5j6k7l8'
branch_labels = None
depends_on = None

def upgrade() -> None:
    # Create file_blobs table
    op.create_table('file_blobs',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('filename', sa.String(), nullable=True),
        sa.Column('content_type', sa.String(), nullable=True),
        sa.Column('data', sa.LargeBinary(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_file_blobs_id'), 'file_blobs', ['id'], unique=False)

def downgrade() -> None:
    # Drop file_blobs table
    op.drop_index(op.f('ix_file_blobs_id'), table_name='file_blobs')
    op.drop_table('file_blobs')
