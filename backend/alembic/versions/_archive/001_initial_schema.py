"""Initial schema creation

Revision ID: 001
Revises: 
Create Date: 2026-02-01 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = '001'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'users',
        sa.Column('id', sa.String(36), nullable=False),
        sa.Column('email', sa.String(255), nullable=False, unique=True),
        sa.Column('full_name', sa.String(255)),
        sa.Column('license_number', sa.String(100)),
        sa.Column('created_at', sa.DateTime),
        sa.PrimaryKeyConstraint('id')
    )
    
    op.create_table(
        'cases',
        sa.Column('id', sa.String(36), nullable=False),
        sa.Column('practitioner_id', sa.String(36), nullable=False),
        sa.Column('patient_name', sa.String(255)),
        sa.Column('patient_age', sa.Integer),
        sa.Column('patient_gender', sa.String(10)),
        sa.Column('chief_complaint', sa.Text),
        sa.Column('case_notes', sa.Text),
        sa.Column('symptoms', sa.JSON),
        sa.Column('mode', sa.String(20), server_default='clinical'),
        sa.Column('rag_analysis', sa.JSON),
        sa.Column('created_at', sa.DateTime),
        sa.Column('updated_at', sa.DateTime),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['practitioner_id'], ['users.id'], )
    )
    
    op.create_table(
        'decisions',
        sa.Column('id', sa.String(36), nullable=False),
        sa.Column('case_id', sa.String(36), nullable=False),
        sa.Column('remedy_name', sa.String(255), nullable=False),
        sa.Column('potency', sa.String(50)),
        sa.Column('dose', sa.String(100)),
        sa.Column('reasoning', sa.Text),
        sa.Column('rejected_remedies', sa.JSON),
        sa.Column('supporting_rubrics', sa.JSON),
        sa.Column('confidence', sa.String(20), server_default='medium'),
        sa.Column('created_at', sa.DateTime),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['case_id'], ['cases.id'], )
    )
    
    op.create_table(
        'follow_ups',
        sa.Column('id', sa.String(36), nullable=False),
        sa.Column('case_id', sa.String(36), nullable=False),
        sa.Column('decision_id', sa.String(36)),
        sa.Column('days_since_dose', sa.Integer),
        sa.Column('reaction', sa.String(50)),
        sa.Column('observations', sa.Text),
        sa.Column('new_symptoms', sa.JSON),
        sa.Column('notes', sa.Text),
        sa.Column('created_at', sa.DateTime),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['case_id'], ['cases.id'], ),
        sa.ForeignKeyConstraint(['decision_id'], ['decisions.id'], )
    )


def downgrade() -> None:
    op.drop_table('follow_ups')
    op.drop_table('decisions')
    op.drop_table('cases')
    op.drop_table('users')
