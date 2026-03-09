# Homeopathy AI Decision Support System — MVP

**Modern, Evidence-Backed Homeopathic Case Management & Remedy Selection Platform**

> This is an MVP (Minimum Viable Product) for an AI-augmented classical homeopathy decision support system. It combines structured case-taking, intelligent symptom analysis, and side-by-side remedy differentiation to support evidence-based prescribing.

---

## 🎯 What This Is

A **single unified workspace** for homeopathic practitioners that:

- 📋 Captures structured case data (mental, general, particular, causation)
- 🔍 Maps symptoms to repertory rubrics automatically
- 💊 Suggests matched remedies with differentiation analysis
- ✅ Logs remedy decisions with full audit trail
- 📈 Tracks follow-up outcomes for continuous learning

**Not** an auto-prescriber. **Fully** maintains practitioner authority and judgment at every step.

---

## 🚀 Quick Start

### Local Development (Recommended)

**Terminal 1 - Backend:**
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

**Terminal 2 - Frontend:**
```bash
cd frontend
npm install
npm run dev  # Runs on http://localhost:3000
```

Access the app at **http://localhost:3000**

### Windows Users: Batch File Shortcut

If you're on Windows, you can use batch files for easier setup:

```bash
# One-time setup
backend\setup-env.bat

# Then run backend & frontend
backend\run-backend.bat      # Terminal 1
frontend\run-frontend.bat    # Terminal 2
```

See **[WINDOWS_SETUP.md](WINDOWS_SETUP.md)** for details.

---

See **[Docs/LOCAL_SETUP.md](Docs/LOCAL_SETUP.md)** for detailed setup instructions.

---

## 📚 Documentation

| Document | Purpose |
|----------|---------|
| [**WINDOWS_SETUP.md**](WINDOWS_SETUP.md) | Windows batch file quick setup |
| [**Docs/LOCAL_SETUP.md**](Docs/LOCAL_SETUP.md) | Local development setup guide |
| [**Docs/QUICKSTART.md**](Docs/QUICKSTART.md) | Get running quickly |
| [**PROGRESS.md**](PROGRESS.md) | Current implementation status & gaps |
| [**SESSION_UPDATE.md**](SESSION_UPDATE.md) | What changed in this session |
| [**Docs/mvp.md**](Docs/mvp.md) | MVP spec & design philosophy |
| [**Docs/project.md**](Docs/project.md) | Detailed architecture overview |
| [**backend/README.md**](backend/README.md) | Backend setup instructions |
| [**frontend/README.md**](frontend/README.md) | Frontend setup instructions |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    React Frontend (Vite)                    │
│  Dashboard | Search | Case-Taking | Decision Matrix   │
└──────────────────────────────┬──────────────────────────────┘
                               │ /api/*
                               ▼
┌─────────────────────────────────────────────────────────────┐
│              FastAPI Backend (Python 3.13)                  │
│  Search | Cases | Decisions | Follow-ups | Audit      │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│   SQLite (dev) / PostgreSQL (prod)                          │
│   Users | Cases | Decisions | FollowUps | AuditTrail        │
└─────────────────────────────────────────────────────────────┘
```

**Tech Stack:**
- **Frontend:** React 18 + Vite + Tailwind CSS + Zustand
- **Backend:** FastAPI + SQLAlchemy + Alembic
- **Database:** SQLite (local), PostgreSQL (production ready)
- **Testing:** pytest (backend), Playwright (E2E coming)

---

## ✨ Key Features

### 1. Structured Case Capture
- Patient demographics (name, age, gender)
- Chief complaint
- Organized symptoms (mental, general, particular, causation)
- Case notes and observations

### 2. Intelligent Symptom → Rubric Mapping
- Text-based fuzzy and semantic matching maps symptoms to rubrics
- Automatic rubric suggestions with confidence scores

### 3. Remedy Differentiation Matrix
- Side-by-side comparison of top 5 remedies
- Shows **supporting symptoms** (green) - where remedy is strong
- Shows **missing/weak symptoms** (yellow) - gaps in coverage
- Shows **contradictions** (red) - where remedy doesn't fit
- Expandable details for deep analysis

### 4. Decision Logging
- Manual remedy selection (not automated)
- Potency and dose recording
- Detailed reasoning capture (required field)
- Decision tracking with timestamp and audit trail

### 5. Follow-up Tracking
- Post-dose observations (aggravation, amelioration, new symptoms)
- Timeline tracking (days since dose)
- Practitioner notes
- Outcome patterns for learning

### 6. Audit Trail
- Complete case history with all changes
- Decision documentation
- Rejection reasoning (why other remedies weren't chosen)
- Full traceability for learning and review

---

## 📊 Data Models

### User (Practitioner)
```
id, email, full_name, license_number, created_at
```

### Case
```
id, practitioner_id, patient_name, patient_age, patient_gender,
chief_complaint, case_notes, symptoms (JSON), mode, rag_analysis,
created_at, updated_at
```

### Decision
```
id, case_id, remedy_name, potency, dose, reasoning,
rejected_remedies, supporting_rubrics, confidence, created_at
```

### FollowUp
```
id, case_id, decision_id, days_since_dose, reaction,
observations, new_symptoms, notes, created_at
```

---

## 🔌 API Endpoints

### Health & Status
- `GET /health/` — API health check
- `GET /` — Root status

### Repertory Search
- `GET /search/sections` — List all sections
- `GET /search/search?q=...&source=boger|kent` — Full-text search
- `GET /search/stats` — Repertory statistics

> **Note:** RAG endpoints were part of earlier prototypes but have been removed from the API. Symptom mapping now uses a text-based search service.


### Case Management
- `POST /api/cases?practitioner_id=<id>` — Create case
- `GET /api/cases/<case_id>` — Retrieve case
- `PUT /api/cases/<case_id>` — Update case
- `GET /api/users/<id>/cases` — List user's cases

### Decisions
- `POST /api/cases/<case_id>/decisions` — Log decision
- `GET /api/cases/<case_id>/decisions` — Get case decisions

### Follow-ups
- `POST /api/cases/<case_id>/follow-ups` — Log follow-up
- `GET /api/cases/<case_id>/follow-ups` — Get follow-ups

### Audit Trail
- `GET /api/cases/<case_id>/audit-trail` — Get full case history

**Full API Docs:** http://127.0.0.1:8000/docs (when running locally)

---

## 📈 Project Status

### ✅ Completed
- Core FastAPI backend with all CRUD endpoints
- React/Vite frontend with 5 main pages
- SQLAlchemy ORM with migrations
- Repertory search (Boger + Kent)
- Symptom-to-rubric mapping (text-based)
- Case intake & decision logging
- Follow-up tracking
- Audit trail framework
- Local development setup
- Frontend validation layer
- Remedy differentiation matrix UI
- 18 passing pytest tests

### ⚠️ In Progress
- E2E test coverage (Playwright)
- Production deployment documentation
- Enhanced backend differentiation analysis

### 🔮 Planned (Phase 2)
- Embeddings integration (semantic similarity)
- Voice input for rapid case capture
- Real contraindication checking
- Multi-user collaboration features
- PDF repertory import
- Advanced follow-up analytics
- Mobile app
- Cloud deployment templates

---

## 🧪 Testing

### Run Backend Tests
```bash
cd backend
pytest tests/ -v
```

**Current Test Count:** 18 passing  
**Coverage Areas:** Search, Cases, Decisions, Follow-ups

### E2E Tests (Coming Soon)
Playwright test suite will cover:
- User registration → Case creation → Decision → Follow-up
- Search functionality end-to-end
- RAG analysis pipeline
- Error handling

---

## 📦 Building for Production

### Backend Production Build
```bash
cd backend
# Install production dependencies
pip install -r requirements.txt
# Run with production server (e.g., Gunicorn)
gunicorn app.main:app -w 4 --bind 0.0.0.0:8000
```

### Frontend Production Build
```bash
cd frontend
npm run build
# Output in frontend/dist/
```

See **[Docs/LOCAL_SETUP.md](Docs/LOCAL_SETUP.md)** for development troubleshooting.

---

## 🔒 Security

- ✅ Input validation on all fields
- ✅ Error handling without stack trace exposure
- ✅ Environment variables for secrets
- ✅ Type checking prevents injection attacks
- ✅ SQLAlchemy ORM prevents SQL injection
- ⚠️ HTTPS/SSL ready (configure with Nginx)
- ⚠️ HIPAA-ready database structure

---

## 📋 Known Limitations (MVP)

- Text-based symptom matching (no semantic embeddings yet)
- No multi-user real-time collaboration
- No offline mode
- PDFs not auto-imported (JSON repertories only)
- No mobile app (responsive web only)
- Single-instance architecture (scales horizontally with load balancer)

See **[PROGRESS.md](PROGRESS.md)** for detailed issues and roadmap.

---

## 🤝 Contributing

### Code Style
- Python: Black formatter, type hints preferred
- JavaScript: ESLint + Prettier (configured in repo)
- Commits: Atomic and descriptive

### Adding a Feature
1. Create feature branch
2. Update tests
3. Document in code
4. Update PROGRESS.md with changes
5. Submit PR with detailed description

### Reporting Bugs
- Use GitHub Issues
- Include: steps to reproduce, expected behavior, actual behavior
- Attach logs if available

---

## 📞 Support

- **Technical Issues:** See [PROGRESS.md](PROGRESS.md) troubleshooting section or [Docs/LOCAL_SETUP.md](Docs/LOCAL_SETUP.md)
- **Feature Requests:** Open an issue with `[FEATURE]` tag
- **Bugs:** Open an issue with `[BUG]` tag

---

## 📜 License

[Add your license here - e.g., MIT, GPL v3, etc.]

---

## 🎓 Learning Resources

### For Understanding Homeopathy Integration
- See `Docs/mvp.md` — Philosophy and design principles
- See `Docs/Plan.md` — Technical implementation strategy
- See `Docs/stack.md` — Technology choices and rationale

### For Understanding the Code
- `backend/app/db/models.py` — Database schema explained
- `backend/app/api/rag.py` — Symptom → Remedy mapping logic
- `frontend/src/components/RemedyDifferentiationMatrix.jsx` — UI patterns
- `frontend/src/api/validation.js` — Form validation strategy

---

## 🚀 Next Steps

1. **Try It Out:** Follow [QUICKSTART.md](QUICKSTART.md)
2. **Explore Code:** Check out key files mentioned above
3. **Read Status:** Review [PROGRESS.md](PROGRESS.md) for current state
4. **Contribute:** Pick an open issue or suggest improvements

---

## 📞 Contact

**Project Lead:** [Your Name/Team]  
**Email:** [contact email]  
**Repository:** [GitHub URL]

---

**Version:** 0.1.0 (MVP Alpha)  
**Last Updated:** February 10, 2026  
**Status:** Active Development

---

**Build with care, prescribe with wisdom.** ⚕️
