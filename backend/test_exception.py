from fastapi.testclient import TestClient
from app.main import app
import uuid

client = TestClient(app)

def test():
    # 1. Register owner
    email = f"test_{uuid.uuid4().hex[:6]}@example.com"
    r = client.post("/api/auth/register", json={
        "email": email,
        "password": "password123",
        "full_name": "Dr. Owner"
    })
    
    # 2. Login
    r = client.post("/api/auth/login", data={"username": email, "password": "password123"})
    token = r.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # 3. Create Department
    r = client.post("/api/departments", headers=headers, json={
        "name": "Test Department",
        "description": "A department for testing"
    })
    dept_id = r.json()["id"]
    
    # 4. Create Staff
    try:
        r = client.post("/api/staff", headers=headers, json={
            "email": f"staff_{uuid.uuid4().hex[:6]}@example.com",
            "password": "staffpassword",
            "full_name": "Nurse Nancy",
            "role": "NURSE",
            "department_id": dept_id
        })
        print(r.status_code)
        print(r.text)
    except Exception as e:
        print("EXCEPTION RAISED:")
        import traceback
        traceback.print_exc()

    # 5. Get Staff
    try:
        r = client.get("/api/staff", headers=headers)
        print(r.status_code)
        print(r.text)
    except Exception as e:
        print("EXCEPTION IN GET:")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test()
