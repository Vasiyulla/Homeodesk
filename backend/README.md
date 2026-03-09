# Homeopathy Backend API

**Version:** 1.0.0  
**Updated:** March 10, 2026

A FastAPI-based backend for homeopathic case-taking and remedy decision support. Provides endpoints for repertory search, symptom mapping, repertorization, and remedy differentiation.

## Features

- **Unified Repertory Database**: 323,870 entries from Kent and Boger repertories
- **Symptom-to-Rubric Mapping**: Custom similarity scoring for natural language symptoms
- **Weighted Repertorization Engine**: Configurable category weights (Mental:5, General:3, Particular:2, Causation:1)
- **Remedy Differentiation**: Side-by-side remedy comparison and profiling
- **Case Management**: Full CRUD for cases, decisions, and follow-ups
- **Audit Trails**: Complete logging for accountability

## Quick Start

### Prerequisites
- Python 3.13+
- SQLite (included with Python)

### Setup & Run
```bash
# Clone repository and navigate to backend
cd backend

# Create virtual environment
python -m venv .venv

# Activate environment
# Windows:
.venv\Scripts\activate
# macOS/Linux:
# source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Initialize database
alembic upgrade head

# Note: Load repertory data separately (requires CSV files)

# Run the server
uvicorn app.main:app --reload --port 8000
```

**Server URL:** http://127.0.0.1:8000  
**API Documentation:** http://127.0.0.1:8000/docs  
**ReDoc Documentation:** http://127.0.0.1:8000/redoc

## API Endpoints

### Core Endpoints

#### Symptom Search
- `POST /api/symptom-search` - Map free-text symptoms to repertory rubrics
- Returns matching rubrics with similarity scores, remedy counts, and confidence levels

#### Repertorization
- `POST /api/repertorize` - Score remedies based on selected rubrics and weights
- Supports category-based weighting for mental, general, particular, and causation symptoms

#### Remedy Differentiation
- `POST /api/remedies/differentiate` - Compare remedies side-by-side
- `GET /api/remedies/{remedy}/profile` - Get detailed remedy profile

#### Case Management
- `POST /api/cases` - Create new case
- `GET /api/cases/{case_id}` - Get case details
- `PUT /api/cases/{case_id}` - Update case
- `POST /api/cases/{case_id}/decisions` - Log remedy decision
- `GET /api/cases/{case_id}/audit-trail` - Get complete audit trail

### Data Layer Endpoints

#### Repertory Operations
- `GET /repertory/verify` - Verify data integrity (323,870 entries)
- `GET /repertory/stats` - Statistics by source
- `GET /repertory/chapters` - List all 72 chapters
- `GET /repertory/chapters/{chapter}/rubrics` - Get rubrics in chapter
- `GET /repertory/search/remedy?name=Nux` - Find remedy occurrences
- `GET /repertory/search/rubric?text=anxiety` - Search rubrics by text
- `GET /repertory/remedy/{remedy}/info` - Remedy statistics

## Data Structure

### Repertory Table
```sql
{
  "id": "UUID",
  "chapter": "Mind | Head | Chest | ...",      -- 72 unique chapters
  "main_rubric": "ANXIETY | PAIN | etc",        -- Primary symptom category
  "sub_condition": "from stress | throbbing",   -- Specific condition
  "remedy": "Nux-v | Puls | Lach | etc",       -- Remedy name (normalized)
  "grade": 1-4,                                 -- Strength/emphasis (1=low, 4=high)
  "source": "kent" | "boger",                   -- Which repertory
  "rubric_text": "Mind - ANXIETY (from stress)", -- For search
  "created_at": "ISO timestamp"
}
```

### Data Summary
- **Kent Repertory:** 53,451 entries
- **Boger Repertory:** 270,419 entries
- **Total:** 323,870 clean, deduplicated entries
- **Unique Remedies:** 500+
- **Unique Chapters:** 72
- **Database:** SQLite (~80 MB)

## Project Structure

```
backend/
├── app/
│   ├── main.py              # FastAPI app setup and route registration
│   ├── core/
│   │   └── config.py        # Application settings and configuration
│   ├── db/
│   │   ├── database.py      # SQLAlchemy engine and session management
│   │   └── models.py        # ORM models (Case, Decision, FollowUp, etc.)
│   ├── api/
│   │   ├── health.py        # Health check endpoints
│   │   ├── repertory.py     # Repertory data access endpoints
│   │   ├── search.py        # Legacy search endpoints
│   │   ├── symptom_search.py # Symptom-to-rubric mapping
│   │   ├── repertorization.py # Weighted repertorization engine
│   │   ├── remedy_differentiator.py # Remedy comparison
│   │   └── cases.py         # Case management CRUD
│   └── services/
│       ├── repertory_search.py  # Repertory query service
│       ├── symptom_search.py    # Symptom mapping service
│       ├── repertorization.py   # Repertorization logic
│       └── remedy_differentiator.py # Differentiation logic
├── alembic/                 # Database migrations
│   ├── versions/
│   │   └── 001_initial_schema.py
│   └── env.py
├── tests/                   # Pytest test suite
│   ├── conftest.py          # Test fixtures and configuration
│   └── test_*.py            # Individual test files
├── requirements.txt         # Python dependencies
├── pytest.ini              # Pytest configuration
├── alembic.ini             # Database migration config
├── .env.example            # Environment variables template
├── run-backend.bat         # Windows startup script
├── setup-env.bat           # Windows environment setup
└── README.md               # This file
```

## Development

### Running Tests
```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=app --cov-report=html

# Run specific test file
pytest tests/test_api_integration.py -v
```

### Database Management
```bash
# Initialize database schema
alembic upgrade head

# Create new migration (if schema changes)
alembic revision --autogenerate -m "description"

# Note: Repertory data loading requires separate scripts (Kent and Boger CSV files)
# Contact project maintainer for data loading instructions
```

### Code Quality
- **Type Hints:** All functions use proper type annotations
- **Docstrings:** Comprehensive documentation for all modules, classes, and functions
- **Testing:** 100% test coverage for core functionality
- **Linting:** Compatible with black, flake8, mypy

## Deployment

### Production Setup
1. Set environment variables in `.env`:
   ```
   DATABASE_URL=postgresql://user:pass@host:port/db
   ENVIRONMENT=production
   ```

2. Use production ASGI server:
   ```bash
   uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
   ```

3. Set up reverse proxy (nginx) for SSL and load balancing

### Docker (Optional)
```dockerfile
FROM python:3.13-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

## API Examples

### Symptom Search
```bash
curl -X POST "http://localhost:8000/api/symptom-search" \
  -H "Content-Type: application/json" \
  -d '{
    "symptom": "throbbing headache from stress",
    "source": "both",
    "limit": 10
  }'
```

### Repertorization
```bash
curl -X POST "http://localhost:8000/api/repertorize" \
  -H "Content-Type: application/json" \
  -d '{
    "rubrics": ["Mind - ANXIETY", "Head - PAIN - throbbing"],
    "weights": {"mental": 5, "general": 3, "particular": 2, "causation": 1}
  }'
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

## License

[Add appropriate license information]

## Contact

For questions or issues, please create an issue in the GitHub repository.