# Homeopathy Case Management System

**Professional Case Tracking and Remedy Reference Platform for Practitioners**

This is a case management system for classical homeopathy practitioners. It provides structured case capture, symptom-to-rubric mapping, remedy reference tools, and complete audit trails for evidence-based practice.

---

## Overview

This system provides practitioners with tools for:

- Structured case data entry (mental, general, particular symptoms, causation)
- Symptom mapping to repertory rubrics
- Remedy reference comparison
- Decision and outcome logging
- Complete case history and audit trails

The system maintains full practitioner control and judgment at every stage. All remedial decisions remain the responsibility of the practitioner.

---

## Getting Started

### Development Setup (Recommended)

**Backend Setup (Terminal 1):**
```bash
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1  # Windows (PowerShell)
# or: venv\Scripts\activate.bat  # Windows (Command Prompt)
# or: source venv/bin/activate  # Mac/Linux
pip install -r ../requirements.txt
python scripts/init_db.py
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

**Frontend Setup (Terminal 2):**
```bash
cd frontend
npm install
npm run dev  # Runs on http://localhost:3000
```

Access the application at **http://localhost:3000**

### Windows Quick Start

On Windows, you can use batch files for faster setup:

```bash
# One-time setup
backend\setup-env.bat

# Then run backend and frontend
backend\run-backend.bat      # Terminal 1
frontend\run-frontend.bat    # Terminal 2
```

For detailed setup instructions, see [Docs/LOCAL_SETUP.md](Docs/LOCAL_SETUP.md).

---

## Documentation

| Document | Purpose |
|----------|---------|
| [Docs/LOCAL_SETUP.md](Docs/LOCAL_SETUP.md) | Detailed setup and troubleshooting |
| [PROGRESS.md](PROGRESS.md) | Project status and implementation details |
| [Docs/mvp.md](Docs/mvp.md) | Design philosophy and specifications |
| [Docs/project.md](Docs/project.md) | Architecture and system overview |
| [backend/README.md](backend/README.md) | Backend documentation |
| [frontend/README.md](frontend/README.md) | Frontend documentation |

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    React Frontend (Vite)                    │
│  Dashboard | Search | Case-Taking | Remedy Matrix       │
└──────────────────────────────┬──────────────────────────────┘
                               │ REST API
                               ▼
┌─────────────────────────────────────────────────────────────┐
│              FastAPI Backend (Python 3.13)                  │
│  Search | Cases | Decisions | Follow-ups | Audit      │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│   SQLite (Development) / PostgreSQL (Production)            │
│   Users | Cases | Decisions | FollowUps | AuditTrail        │
└─────────────────────────────────────────────────────────────┘
```

**Technology Stack:**
- Frontend: React 18, Vite, Tailwind CSS, Zustand
- Backend: FastAPI, SQLAlchemy, Alembic
- Database: SQLite (development), PostgreSQL (production)
- Testing: pytest (backend), Playwright (end-to-end)

---

## Features

### Case Management
- Captures structured patient and case data
- Organizes symptoms by category (mental, general, particular, causation)
- Maintains comprehensive case notes

### Symptom-to-Rubric Mapping
- Text-based search maps symptoms to repertory rubrics
- Returns rubric matches with confidence scoring
- Supports fuzzy and semantic matching

### Remedy Reference
- Side-by-side remedy comparison
- Displays supporting symptoms (where remedy matches)
- Shows weak coverage (where remedy gaps exist)
- Identifies symptom contradictions
- Expandable details for deeper analysis

### Decision Logging
- Manual remedy selection and dose recording
- Practitioner reasoning capture
- Complete decision audit trail
- Option to record rejected remedies and reasoning

### Follow-up Tracking
- Records post-dose observations (aggravation, amelioration, new symptoms)
- Timeline tracking relative to dose date
- Practitioner observations and notes
- Outcome pattern documentation

### Audit Trail
- Complete case history with all changes
- Full traceability of decisions and modifications
- Decision documentation and reasoning
- Practitioner-complete notes on remedy selection

---

## Data Models

### User
- Practitioner account information and credentials

### Case
- Patient demographics and case presentation
- Chief complaint and case notes  
- Symptom data (JSON structure)
- Case metadata and timestamps

### Decision
- Remedy selection and dosage
- Practitioner reasoning and justification
- Supporting rubrics and remedies considered
- Decision timestamp and confidence level

### FollowUp
- Post-dose observations and timeline
- Patient reaction and new symptoms
- Practitioner notes and observations

### AuditTrail
- Complete history of all case changes
- User and timestamp for each modification

---

## API Endpoints

### Status and Health
```
GET /           — API status
GET /health/    — Service health check
```

### Search
```
GET /search/sections              — List repertory sections
GET /search/search?q=...&source=  — Keyword search
GET /search/stats                 — Repertory statistics
```

### Cases
```
POST   /api/cases                — Create case
GET    /api/cases/<case_id>      — Retrieve case
PUT    /api/cases/<case_id>      — Update case
GET    /api/users/<id>/cases     — List practitioner's cases
```

### Decisions
```
POST   /api/cases/<case_id>/decisions       — Log decision
GET    /api/cases/<case_id>/decisions       — Retrieve decisions
```

### Follow-ups
```
POST   /api/cases/<case_id>/follow-ups      — Log follow-up
GET    /api/cases/<case_id>/follow-ups      — Retrieve follow-ups
```

### Audit
```
GET    /api/cases/<case_id>/audit-trail     — Case history
```

Complete API documentation is available at `http://127.0.0.1:8000/docs` when running locally.

---

## Project Status

### Completed
- FastAPI backend with full CRUD endpoints
- React/Vite frontend with main application pages
- SQLAlchemy ORM with database migrations
- Repertory search (Boger and Kent)
- Symptom-to-rubric mapping
- Case intake and decision logging
- Follow-up tracking
- Audit trail generation
- Local development environment setup
- Frontend form validation
- Remedy reference matrix interface
- 18 passing unit tests

### In Progress
- End-to-end test coverage
- Production deployment documentation

### Planned
- Semantic similarity search
- Voice input for case capture
- Contraindication checking
- Multi-user features
- Advanced follow-up analytics

---

## Testing

### Backend Tests
```bash
cd backend
pytest tests/ -v
```

Test coverage includes:
- Repertory search functionality
- Case management CRUD operations
- Decision logging and retrieval
- Follow-up tracking
- Integration tests

Current: 18 passing tests

### End-to-End Tests

Playwright tests (in development) will cover:
- User registration and authentication
- Complete case workflow (creation through follow-up)
- Search functionality
- Error handling and validation

---

## Production Deployment

### Backend
```bash
cd backend
pip install -r requirements.txt
gunicorn app.main:app -w 4 --bind 0.0.0.0:8000
```

### Frontend
```bash
cd frontend
npm run build
# Output is in frontend/dist/
```

For detailed deployment instructions, see [Docs/LOCAL_SETUP.md](Docs/LOCAL_SETUP.md).

---

## Security

- Input validation on all endpoints
- Controlled error responses (no stack trace exposure)
- Type checking to prevent injection attacks
- SQLAlchemy ORM prevents SQL injection
- Environment variables for sensitive configuration
- HTTPS/SSL compatible (configure via web server)
- Database structure supports HIPAA requirements

## Limitations

- Text-based symptom matching (semantic search planned)
- Single-instance deployment (horizontal scaling with load balancer)
- No offline mode
- No automatic PDF import (JSON format required)
- Web-only interface (responsive design for tablets)

See **[PROGRESS.md](PROGRESS.md)** for detailed issues and roadmap.

---

## Contributing

### Code Standards
- Python: Black formatter with type hints
- JavaScript: ESLint and Prettier (configured)
- Commits should be atomic with descriptive messages

### Adding Features
1. Create a feature branch
2. Write tests for new functionality
3. Add documentation and code comments
4. Update PROGRESS.md
5. Submit PR with detailed description

### Reporting Issues
- Use GitHub Issues for bug reports
- Include steps to reproduce and expected vs. actual behavior
- Attach logs if available

## Support

For issues or questions:
- **Setup Help:** See [Docs/LOCAL_SETUP.md](Docs/LOCAL_SETUP.md)
- **Status & Roadmap:** See [PROGRESS.md](PROGRESS.md)
- **Technical Details:** See [Docs/project.md](Docs/project.md)

---

## License

[Add your license here]

## Documentation Resources

For deeper understanding of the system:
- [Docs/mvp.md](Docs/mvp.md) — Design philosophy and specifications
- [Docs/project.md](Docs/project.md) — System architecture and implementation
- [backend/app/db/models.py](backend/app/db/models.py) — Database schema
- [backend/app/api/](backend/app/api/) — API endpoint implementations
- [frontend/src/components/](frontend/src/components/) — UI components

---

**Current Version:** 0.1.0  
**Last Updated:** March 10, 2026  
**Status:** Active Development
