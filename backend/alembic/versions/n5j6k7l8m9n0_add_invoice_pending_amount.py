"""add invoice pending amount

Revision ID: n5j6k7l8m9n0
Revises: m4i5j6k7l8m9
Create Date: 2026-07-15 00:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'n5j6k7l8m9n0'
down_revision: Union[str, None] = 'm4i5j6k7l8m9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('invoices', sa.Column('pending_amount', sa.Float(), server_default='0.0', nullable=False))


def downgrade() -> None:
    op.drop_column('invoices', 'pending_amount')
