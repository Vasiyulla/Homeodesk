import requests
import uuid
from pprint import pprint

BASE_URL = "http://127.0.0.1:8000"

def run_tests():
    print("--- 1. Health Check ---")
    r = requests.get(f"{BASE_URL}/health")
    print("Health:", r.status_code)
    
    unique_email = f"test_{uuid.uuid4().hex[:6]}@example.com"
    print(f"\n--- 2. Register Owner ({unique_email}) ---")
    r = requests.post(f"{BASE_URL}/api/auth/register", json={
        "email": unique_email,
        "password": "password123",
        "full_name": "Dr. Owner",
        "license_number": "MED-OWNER"
    })
    print("Register Status:", r.status_code)
    
    print("\n--- 3. Login ---")
    r = requests.post(f"{BASE_URL}/api/auth/login", data={
        "username": unique_email,
        "password": "password123"
    })
    print("Login Status:", r.status_code)
    token = r.json().get("access_token")
    headers = {"Authorization": f"Bearer {token}"}
    
    print("\n--- 4. Get Profile ---")
    r = requests.get(f"{BASE_URL}/api/auth/me", headers=headers)
    print("Profile Status:", r.status_code)
    print("Role:", r.json().get("role"))
    
    print("\n--- 5. Create Department ---")
    r = requests.post(f"{BASE_URL}/api/departments", headers=headers, json={
        "name": "Test Department",
        "description": "A department for testing"
    })
    print("Create Dept Status:", r.status_code)
    dept_id = None
    if r.status_code == 201:
        dept_id = r.json().get("id")
        
    print("\n--- 6. Get Departments ---")
    r = requests.get(f"{BASE_URL}/api/departments", headers=headers)
    print("Get Dept Status:", r.status_code, "Count:", len(r.json()))
    
    staff_email = f"staff_{uuid.uuid4().hex[:6]}@example.com"
    print(f"\n--- 7. Create Staff ({staff_email}) ---")
    r = requests.post(f"{BASE_URL}/api/staff", headers=headers, json={
        "email": staff_email,
        "password": "staffpassword",
        "full_name": "Nurse Nancy",
        "role": "NURSE",
        "department_id": dept_id
    })
    print("Create Staff Status:", r.status_code)
    if r.status_code != 201:
        print(r.text)
        
    print("\n--- 8. Get Staff ---")
    r = requests.get(f"{BASE_URL}/api/staff", headers=headers)
    print("Get Staff Status:", r.status_code, "Count:", len(r.json()))
    
    print("\n--- 9. Create Patient ---")
    r = requests.post(f"{BASE_URL}/api/cases", headers=headers, json={
        "patient_name": "Test Patient",
        "patient_age": 30,
        "patient_gender": "M",
        "chief_complaint": "Testing the system",
        "case_notes": "None",
        "mode": "clinical",
        "symptoms": []
    })
    print("Create Case (and Patient implicitly) Status:", r.status_code)
    patient_id = None
    case_id = None
    if r.status_code == 200:
        patient_id = r.json().get("patient_id")
        case_id = r.json().get("id")
    else:
        print(r.text)
        
    print("\n--- 10. Create Appointment ---")
    r = requests.post(f"{BASE_URL}/api/appointments", headers=headers, json={
        "patient_id": patient_id,
        "scheduled_time": "2026-10-10T10:00:00Z"
    })
    print("Create Appointment Status:", r.status_code)
    appt_id = None
    if r.status_code == 200:
        appt_id = r.json().get("id")
    else:
        print(r.text)
        
    print("\n--- 11. Get Appointments ---")
    r = requests.get(f"{BASE_URL}/api/appointments", headers=headers)
    print("Get Appointments Status:", r.status_code, "Count:", len(r.json()))
    
    print("\n--- 12. Check-In Appointment ---")
    r = requests.put(f"{BASE_URL}/api/appointments/{appt_id}/checkin", headers=headers)
    print("Check-In Status:", r.status_code)
    
    print("\n--- 13. Create Dose Log ---")
    r = requests.post(f"{BASE_URL}/api/doses", headers=headers, json={
        "case_id": case_id,
        "remedy_name": "Arnica",
        "dose": "2 pills",
        "potency": "30C",
        "immediate_reaction": "None"
    })
    print("Create Dose Log Status:", r.status_code)
    if r.status_code != 200:
        print(r.text)
        
    print("\n--- 14. Get Case Doses ---")
    r = requests.get(f"{BASE_URL}/api/cases/{case_id}/doses", headers=headers)
    print("Get Doses Status:", r.status_code, "Count:", len(r.json()) if r.status_code == 200 else 0)
    
    print("\n--- 15. Create Invoice ---")
    r = requests.post(f"{BASE_URL}/api/billing/invoices", headers=headers, json={
        "patient_id": patient_id,
        "case_id": case_id,
        "items": [
            {"description": "Consultation", "amount": 100.0},
            {"description": "Remedy", "amount": 15.5}
        ]
    })
    print("Create Invoice Status:", r.status_code)
    invoice_id = None
    if r.status_code == 201:
        invoice_id = r.json().get("id")
    else:
        print(r.text)
        
    print("\n--- 16. Get Invoices ---")
    r = requests.get(f"{BASE_URL}/api/billing/invoices", headers=headers)
    print("Get Invoices Status:", r.status_code, "Count:", len(r.json()) if r.status_code == 200 else 0)
    
    print("\n--- 17. Pay Invoice ---")
    if invoice_id:
        r = requests.put(f"{BASE_URL}/api/billing/invoices/{invoice_id}/pay", headers=headers)
        print("Pay Invoice Status:", r.status_code)
        
    print("\nAll tests completed.")

if __name__ == "__main__":
    run_tests()
