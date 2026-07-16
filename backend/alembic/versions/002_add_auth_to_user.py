"""Add auth to user model

Revision ID: 002_add_auth_to_user
Revises: 001_pg_baseline
Create Date: 2026-06-28 11:45:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = '002_add_auth_to_user'
down_revision = '001_pg_baseline'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add new columns to users table
    op.add_column('users', sa.Column('hashed_password', sa.String(length=255), nullable=False, server_default=''))
    op.add_column('users', sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'))


def downgrade() -> None:
    # Remove the columns if downgraded
    op.drop_column('users', 'is_active')
    op.drop_column('users', 'hashed_password')
