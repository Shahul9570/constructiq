"""Drop DigitalTwinModel

Revision ID: i0e1f2a3b4c5
Revises: h9d0e1f2a3b4
Create Date: 2026-07-13 11:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'i0e1f2a3b4c5'
down_revision = 'h9d0e1f2a3b4'
branch_labels = None
depends_on = None


def upgrade():
    op.execute('DROP TABLE IF EXISTS digital_twin_models CASCADE')

def downgrade():
    pass
