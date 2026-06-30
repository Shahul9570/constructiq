"""add equipment ownership

Revision ID: d4e5f6a7b8c9
Revises: c3d4e5f6a7b8
Create Date: 2026-06-30 09:15:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import ENUM

# revision identifiers, used by Alembic.
revision = 'd4e5f6a7b8c9'
down_revision = 'c3d4e5f6a7b8'
branch_labels = None
depends_on = None

def upgrade():
    # Create the Enum type
    ownership_type_enum = ENUM('owned', 'rented', name='ownershiptype', create_type=False)
    ownership_type_enum.create(op.get_bind(), checkfirst=True)

    # Add columns to equipment table
    op.add_column('equipment', sa.Column('ownership_type', ownership_type_enum, server_default='owned', nullable=False))
    op.add_column('equipment', sa.Column('vendor_name', sa.String(length=255), nullable=True))


def downgrade():
    op.drop_column('equipment', 'vendor_name')
    op.drop_column('equipment', 'ownership_type')
    
    # Drop the Enum type
    op.execute("DROP TYPE ownershiptype")
