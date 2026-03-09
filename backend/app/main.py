from fastapi import FastAPI
from .api import health, ingest, search, cases, repertory, symptom_search, repertorization, remedy_differentiator
# embeddings disabled for MVP due to torch/C++ dependencies
# from .api import embeddings

app = FastAPI(title="Homeopathy Backend")


app.include_router(health.router, prefix="/health")
app.include_router(ingest.router, prefix="/ingest")
app.include_router(search.router, prefix="/search")
app.include_router(repertory.router, prefix="/repertory")
app.include_router(symptom_search.router, prefix="/api")
app.include_router(repertorization.router, prefix="/api")
app.include_router(remedy_differentiator.router, prefix="/api")
app.include_router(cases.router, prefix="/api")
# app.include_router(embeddings.router, prefix="/embeddings")

@app.get("/")
def root():
    return {"service": "homeopathy-backend", "status": "running"}
