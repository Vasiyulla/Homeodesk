"""PostgreSQL baseline schema

Revision ID: 001_pg_baseline
Revises: 
Create Date: 2026-05-24 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = '001_pg_baseline'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Use gen_random_uuid() for default UUID generation in PostgreSQL
    op.create_table(
        'users',
        sa.Column('id', postgresql.UUID(as_uuid=True), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('email', sa.String(255), nullable=False, unique=True),
        sa.Column('full_name', sa.String(255)),
        sa.Column('license_number', sa.String(100)),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
        sa.PrimaryKeyConstraint('id')
    )
    
    op.create_table(
        'cases',
        sa.Column('id', postgresql.UUID(as_uuid=True), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('practitioner_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('patient_name', sa.String(255)),
        sa.Column('patient_age', sa.Integer),
        sa.Column('patient_gender', sa.String(10)),
        sa.Column('chief_complaint', sa.Text),
        sa.Column('case_notes', sa.Text),
        sa.Column('symptoms', postgresql.JSONB(astext_type=sa.Text())),
        sa.Column('mode', sa.String(20), server_default='clinical'),
        sa.Column('rag_analysis', postgresql.JSONB(astext_type=sa.Text())),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['practitioner_id'], ['users.id'], )
    )
    
    op.create_table(
        'decisions',
        sa.Column('id', postgresql.UUID(as_uuid=True), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('case_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('remedy_name', sa.String(255), nullable=False),
        sa.Column('potency', sa.String(50)),
        sa.Column('dose', sa.String(100)),
        sa.Column('reasoning', sa.Text),
        sa.Column('rejected_remedies', postgresql.JSONB(astext_type=sa.Text())),
        sa.Column('supporting_rubrics', postgresql.JSONB(astext_type=sa.Text())),
        sa.Column('confidence', sa.String(20), server_default='medium'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['case_id'], ['cases.id'], )
    )
    
    op.create_table(
        'follow_ups',
        sa.Column('id', postgresql.UUID(as_uuid=True), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('case_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('decision_id', postgresql.UUID(as_uuid=True)),
        sa.Column('days_since_dose', sa.Integer),
        sa.Column('reaction', sa.String(50)),
        sa.Column('observations', sa.Text),
        sa.Column('new_symptoms', postgresql.JSONB(astext_type=sa.Text())),
        sa.Column('notes', sa.Text),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['case_id'], ['cases.id'], ),
        sa.ForeignKeyConstraint(['decision_id'], ['decisions.id'], )
    )

    op.create_table(
        'repertory',
        sa.Column('id', postgresql.UUID(as_uuid=True), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('chapter', sa.String(255), nullable=False),
        sa.Column('main_rubric', sa.String(500), nullable=False),
        sa.Column('sub_condition', sa.String(1000), nullable=False),
        sa.Column('remedy', sa.String(100), nullable=False),
        sa.Column('grade', sa.Integer, nullable=False),
        sa.Column('source', sa.String(20), nullable=False),
        sa.Column('rubric_text', sa.Text),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint(
            'chapter', 'main_rubric', 'sub_condition', 'remedy', 'source',
            name='uq_repertory_entry'
        )
    )

    # Indexes
    op.create_index('ix_repertory_chapter', 'repertory', ['chapter'])
    op.create_index('ix_repertory_main_rubric', 'repertory', ['main_rubric'])
    op.create_index('ix_repertory_remedy', 'repertory', ['remedy'])
    op.create_index('ix_repertory_source', 'repertory', ['source'])
    op.create_index(
        'ix_repertory_chapter_rubric_source',
        'repertory',
        ['chapter', 'main_rubric', 'source']
    )


def downgrade() -> None:
    op.drop_table('repertory')
    op.drop_table('follow_ups')
    op.drop_table('decisions')
    op.drop_table('cases')
    op.drop_table('users')
