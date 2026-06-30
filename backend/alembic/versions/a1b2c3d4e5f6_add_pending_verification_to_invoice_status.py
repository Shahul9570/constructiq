"""add_pending_verification_to_invoice_status

Revision ID: a1b2c3d4e5f6
Revises: 32917632ac02
Create Date: 2026-06-30 04:40:00.000000
"""
from typing import Sequence, Union
from alembic import op


revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, None] = '8b1e4c5f3d2a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add 'pending_verification' to the invoicestatus enum in PostgreSQL
    op.execute("ALTER TYPE invoicestatus ADD VALUE IF NOT EXISTS 'pending_verification'")


def downgrade() -> None:
    # PostgreSQL does not support removing enum values; downgrade is a no-op
    pass
