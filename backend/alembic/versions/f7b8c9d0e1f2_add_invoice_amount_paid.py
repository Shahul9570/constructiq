"""add invoice amount paid and partially_paid status

Revision ID: f7b8c9d0e1f2
Revises: f6a7b8c9d0e1
Create Date: 2026-07-07 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'f7b8c9d0e1f2'
down_revision = 'f6a7b8c9d0e1'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add amount_paid column with default 0.0
    op.add_column('invoices', sa.Column('amount_paid', sa.Float(), server_default='0.0', nullable=True))
    
    # We need to modify the ENUM to include PARTIALLY_PAID. This depends on the DB (Postgres)
    # Using a safe approach for postgres
    op.execute("ALTER TYPE invoicestatus ADD VALUE IF NOT EXISTS 'PARTIALLY_PAID'")


def downgrade() -> None:
    op.drop_column('invoices', 'amount_paid')
    # Dropping enum values is not supported easily in Postgres, so we leave it.
