"""consolidated manual migrations

Revision ID: e5f6a7b8c9d0
Revises: d4e5f6a7b8c9
Create Date: 2026-07-02 14:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.engine.reflection import Inspector


# revision identifiers, used by Alembic.
revision = 'e5f6a7b8c9d0'
down_revision = 'd4e5f6a7b8c9'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Run safe column migrations for any new columns added to existing tables
    # using raw SQL to ensure IF NOT EXISTS is respected for idempotency across environments.
    
    # Note: For Enum modifications, we must run them outside of a transaction block
    # or handle them separately. Since Alembic runs in a transaction by default,
    # we can use the op.get_bind().execute directly with raw commit if needed, or 
    # just execute it. PostgreSQL 12+ supports ALTER TYPE ... ADD VALUE IF NOT EXISTS.
    
    conn = op.get_bind()
    conn.execute(sa.text("COMMIT"))  # Commit the current transaction block
    
    try:
        conn.execute(sa.text("ALTER TYPE invoicestatus ADD VALUE IF NOT EXISTS 'pending_verification'"))
    except Exception:
        pass  # Type might already exist, though IF NOT EXISTS should handle it.
    
    conn.execute(sa.text("BEGIN"))  # Start a new transaction block for the rest

    migrations = [
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS company_code VARCHAR(20) UNIQUE",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS company_owner_id INTEGER REFERENCES users(id)",
        "ALTER TABLE projects ADD COLUMN IF NOT EXISTS company_id INTEGER REFERENCES users(id)",
        "ALTER TABLE projects ADD COLUMN IF NOT EXISTS members_count INTEGER DEFAULT 0",
        "ALTER TABLE project_tasks ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'pending'",
        "ALTER TABLE cost_records ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'approved'",
        "ALTER TABLE project_tasks ADD COLUMN IF NOT EXISTS assigned_to_id INTEGER REFERENCES users(id)",
        "ALTER TABLE project_tasks ADD COLUMN IF NOT EXISTS area VARCHAR(255)",
        "ALTER TABLE project_tasks ADD COLUMN IF NOT EXISTS quantity DOUBLE PRECISION",
        "ALTER TABLE project_tasks ADD COLUMN IF NOT EXISTS unit VARCHAR(50)",
        "ALTER TABLE project_tasks ADD COLUMN IF NOT EXISTS work_type VARCHAR(100)",
        "ALTER TABLE project_tasks ADD COLUMN IF NOT EXISTS start_date TIMESTAMP WITH TIME ZONE",
        "ALTER TABLE project_tasks ADD COLUMN IF NOT EXISTS end_date TIMESTAMP WITH TIME ZONE",
        "ALTER TABLE daily_work_logs ADD COLUMN IF NOT EXISTS verification_status VARCHAR(50) DEFAULT 'pending'",
        "ALTER TABLE daily_work_logs ADD COLUMN IF NOT EXISTS verified_by_id INTEGER REFERENCES users(id)",
        "ALTER TABLE daily_work_logs ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP WITH TIME ZONE",
        "ALTER TABLE equipment ADD COLUMN IF NOT EXISTS company_id INTEGER REFERENCES users(id)",
        "ALTER TABLE equipment ALTER COLUMN project_id DROP NOT NULL",
        "ALTER TABLE daily_work_logs ADD COLUMN IF NOT EXISTS verification_remarks TEXT",
        "ALTER TABLE daily_labour_summary ADD COLUMN IF NOT EXISTS verification_status VARCHAR(50) DEFAULT 'pending'",
        "ALTER TABLE daily_labour_summary ADD COLUMN IF NOT EXISTS verified_by_id INTEGER REFERENCES users(id)",
        "ALTER TABLE daily_labour_summary ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP WITH TIME ZONE",
        "ALTER TABLE daily_labour_summary ADD COLUMN IF NOT EXISTS verification_remarks TEXT",
        "ALTER TABLE daily_labour_summary ADD COLUMN IF NOT EXISTS paid_amount DOUBLE PRECISION DEFAULT 0.0",
        "ALTER TABLE material_arrivals ADD COLUMN IF NOT EXISTS paid_amount DOUBLE PRECISION DEFAULT 0.0",
    ]
    
    for sql in migrations:
        conn.execute(sa.text(sql))


def downgrade() -> None:
    pass
