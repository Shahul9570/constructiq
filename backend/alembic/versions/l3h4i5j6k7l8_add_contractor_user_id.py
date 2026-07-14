"""add contractor user_id

Revision ID: l3h4i5j6k7l8
Revises: k2g3h4i5j6k7
Create Date: 2026-07-14 10:36:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'l3h4i5j6k7l8'
down_revision = 'k2g3h4i5j6k7'
branch_labels = None
depends_on = None

def upgrade() -> None:
    # Add user_id column to contractors table
    op.add_column('contractors', sa.Column('user_id', sa.Integer(), nullable=True))
    op.create_foreign_key('fk_contractors_user_id', 'contractors', 'users', ['user_id'], ['id'])

def downgrade() -> None:
    # Drop user_id column
    op.drop_constraint('fk_contractors_user_id', 'contractors', type_='foreignkey')
    op.drop_column('contractors', 'user_id')
