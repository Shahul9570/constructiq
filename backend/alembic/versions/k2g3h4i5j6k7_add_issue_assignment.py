"""Add issue assignment

Revision ID: k2g3h4i5j6k7
Revises: j1f2g3h4i5j6
Create Date: 2026-07-13 14:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'k2g3h4i5j6k7'
down_revision = 'j1f2g3h4i5j6'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('digital_twin_issues', sa.Column('assigned_to_id', sa.Integer(), nullable=True))
    op.create_foreign_key(
        'fk_digital_twin_issues_assigned_to_id',
        'digital_twin_issues',
        'users',
        ['assigned_to_id'],
        ['id']
    )


def downgrade():
    op.drop_constraint('fk_digital_twin_issues_assigned_to_id', 'digital_twin_issues', type_='foreignkey')
    op.drop_column('digital_twin_issues', 'assigned_to_id')
