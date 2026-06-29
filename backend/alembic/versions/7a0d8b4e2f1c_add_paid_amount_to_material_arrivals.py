"""add paid_amount to material_arrivals

Revision ID: 7a0d8b4e2f1c
Revises: 32917632ac02
Create Date: 2026-06-29 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '7a0d8b4e2f1c'
down_revision = '32917632ac02'
branch_labels = None
depends_on = None

def upgrade():
    op.execute('ALTER TABLE material_arrivals ADD COLUMN IF NOT EXISTS paid_amount FLOAT')
    # Fill existing rows with 0.0 or invoice_amount (defaulting to 0.0 to be safe)
    op.execute("UPDATE material_arrivals SET paid_amount = 0.0 WHERE paid_amount IS NULL")

def downgrade():
    op.drop_column('material_arrivals', 'paid_amount')
