# Case Transfer and Doctor Forum Feature

This feature allows doctors to transfer a case to another doctor in their organization and securely discuss the case in a dedicated chat forum.

## Proposed Changes

### 1. Database & Models (`backend/app/db/models.py`)
- **[NEW]** `CaseForumMessage` model:
  - `id` (UUID)
  - `case_id` (FK to `cases.id`)
  - `sender_id` (FK to `users.id`)
  - `content` (Text)
  - `created_at` (DateTime)
  
### 2. Backend API (`backend/app/api/cases.py`)
- **[NEW]** `GET /cases/{case_id}/messages`: Fetch chat history for a case.
- **[NEW]** `POST /cases/{case_id}/messages`: Send a new message to the case forum.
- **[NEW]** `POST /cases/{case_id}/transfer`: 
  - Updates the `assigned_doctor_id` of the case.
  - Automatically posts a system message to the forum (e.g., "Dr. A transferred the case to Dr. B with message: ...").
  - Triggers a WebSocket broadcast to instantly update connected clients.

### 3. Frontend API Service (`frontend/src/services/caseApi.ts`)
- Add methods for `getForumMessages`, `sendForumMessage`, and `transferCase`.

### 4. Frontend UI (`frontend/src/pages/CaseDetailPage.tsx`)
- **[NEW]** **Doctor Forum Section**: A real-time chat interface added to the Case Details page. Doctors can see messages, type new notes, and discuss the patient.
- **[NEW]** **Transfer Case Button & Modal**: A button to reassign the case. It will open a popup allowing the current doctor to select another doctor from their clinic (fetched via the `/staff` API) and attach an optional handoff message.

## Verification Plan

### Automated Tests
- N/A - relying on manual verification as requested.

### Manual Verification
1. Open a Case as Doctor A.
2. Type a message in the new "Doctor Forum" section.
3. Click "Transfer Case", select Doctor B, and provide a handoff note.
4. Verify the case assignment updates, and the handoff note appears in the forum.
5. Log in as Doctor B and verify they can see the case and reply in the forum.

## Open Questions

> [!IMPORTANT]  
> Are you okay with the forum being a section right on the **Case Details Page**, so doctors can chat while viewing the patient's symptoms and remedies simultaneously? Or would you prefer it to be a separate pop-up/page?

> [!WARNING]  
> Since I am adding a new database table (`CaseForumMessage`), I will need to apply a database migration. This is safe, but please ensure you don't have any unsaved critical data in your local dev database before proceeding.
