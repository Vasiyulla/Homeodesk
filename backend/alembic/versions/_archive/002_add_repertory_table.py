"""Add repertory table

Revision ID: 002
Revises: 001
Create Date: 2026-05-24 09:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = '002'
down_revision = '001'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'repertory',
        sa.Column('id', sa.String(36), nullable=False),
        sa.Column('chapter', sa.String(255), nullable=False),
        sa.Column('main_rubric', sa.String(500), nullable=False),
        sa.Column('sub_condition', sa.String(1000), nullable=False),
        sa.Column('remedy', sa.String(100), nullable=False),
        sa.Column('grade', sa.Integer, nullable=False),
        sa.Column('source', sa.String(20), nullable=False),
        sa.Column('rubric_text', sa.Text, nullable=True),
        sa.Column('created_at', sa.DateTime),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint(
            'chapter', 'main_rubric', 'sub_condition', 'remedy', 'source',
            name='uq_repertory_entry'
        ),
    )

    # Performance indexes for high-frequency query patterns
    op.create_index('ix_repertory_chapter', 'repertory', ['chapter'])
    op.create_index('ix_repertory_main_rubric', 'repertory', ['main_rubric'])
    op.create_index('ix_repertory_remedy', 'repertory', ['remedy'])
    op.create_index('ix_repertory_source', 'repertory', ['source'])

    # Composite index for the most common query: chapter + main_rubric + source
    op.create_index(
        'ix_repertory_chapter_rubric_source',
        'repertory',
        ['chapter', 'main_rubric', 'source']
    )


def downgrade() -> None:
    op.drop_index('ix_repertory_chapter_rubric_source')
    op.drop_index('ix_repertory_source')
    op.drop_index('ix_repertory_remedy')
    op.drop_index('ix_repertory_main_rubric')
    op.drop_index('ix_repertory_chapter')
    op.drop_table('repertory')
