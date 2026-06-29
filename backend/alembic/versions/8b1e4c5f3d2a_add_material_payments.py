"""add material payments

Revision ID: 8b1e4c5f3d2a
Revises: 7a0d8b4e2f1c
Create Date: 2026-06-29 12:50:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '8b1e4c5f3d2a'
down_revision = '7a0d8b4e2f1c'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'material_payments',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('arrival_id', sa.Integer(), nullable=False),
        sa.Column('amount', sa.Float(), nullable=False),
        sa.Column('payment_date', sa.Date(), nullable=False),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_by', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['arrival_id'], ['material_arrivals.id'], ),
        sa.ForeignKeyConstraint(['created_by'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_material_payments_id'), 'material_payments', ['id'], unique=False)


def downgrade():
    op.drop_index(op.f('ix_material_payments_id'), table_name='material_payments')
    op.drop_table('material_payments')
