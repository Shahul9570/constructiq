"""fix_pending_verification_case_in_data

Revision ID: b2c3d4e5f6a7
Revises: a1b2c3d4e5f6
Create Date: 2026-06-30 05:05:00.000000
"""
from typing import Sequence, Union
from alembic import op
from sqlalchemy import text


revision: str = 'b2c3d4e5f6a7'
down_revision: Union[str, None] = 'a1b2c3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()

    # Step 1: Add the uppercase PENDING_VERIFICATION to the DB enum (if not already there)
    # Must commit the current transaction first because ALTER TYPE ADD VALUE
    # is non-transactional in older PostgreSQL versions
    conn.execute(text("COMMIT"))
    conn.execute(text("ALTER TYPE invoicestatus ADD VALUE IF NOT EXISTS 'PENDING_VERIFICATION'"))

    # Step 2: Fix the bad rows - update any lowercase 'pending_verification'
    # to the correct uppercase 'PENDING_VERIFICATION'
    conn.execute(
        text("UPDATE invoices SET status = 'PENDING_VERIFICATION' WHERE status::text = 'pending_verification'")
    )
    conn.execute(text("COMMIT"))


def downgrade() -> None:
    # Cannot remove enum values from PostgreSQL, no-op
    pass
