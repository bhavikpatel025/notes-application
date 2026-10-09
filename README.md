# Keep Notes - Enterprise Full-Stack Clean Architecture & CQRS Platform

[![Live Demo](https://img.shields.io/badge/Demo-Live%20Website-brightgreen?style=for-the-badge&logo=vercel)](https://notes-application-frontend-lemon.vercel.app)
[![Backend API](https://img.shields.io/badge/API-Render%20Live-blue?style=for-the-badge&logo=render)](https://notes-api-backend-bth6.onrender.com)
[![.NET 10](https://img.shields.io/badge/.NET-10.0%20%2F%20C%23-purple?style=for-the-badge&logo=dotnet)](https://dotnet.microsoft.com/)
[![Angular 19](https://img.shields.io/badge/Angular-19%20Standalone-red?style=for-the-badge&logo=angular)](https://angular.dev/)
[![SignalR](https://img.shields.io/badge/RealTime-SignalR%20WebSockets-blueviolet?style=for-the-badge)](https://learn.microsoft.com/aspnet/core/signalr)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Neon%20Serverless-336791?style=for-the-badge&logo=postgresql)](https://neon.tech/)
[![Cloudinary](https://img.shields.io/badge/Media-Cloudinary%20CDN-3448C5?style=for-the-badge&logo=cloudinary)](https://cloudinary.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge)](LICENSE)

A production-ready, feature-packed full-stack **Google Keep clone** engineered with **Clean Architecture**, **CQRS (Command Query Responsibility Segregation)** with **MediatR**, **SignalR WebSockets**, and **Angular 19 Standalone Components & Signals**.

---

## Live Deployments

| Component | Platform | URL |
|---|---|---|
| **Frontend Application** | Vercel | [https://notes-application-frontend-lemon.vercel.app](https://notes-application-frontend-lemon.vercel.app) |
| **Backend Web API** | Render (Docker) | [https://notes-api-backend-bth6.onrender.com](https://notes-api-backend-bth6.onrender.com) |
| **Database** | Neon.tech | PostgreSQL Serverless with SSL pooling |
| **Media & Canvas Storage** | Cloudinary | Global High-Speed CDN |

---

## Architectural Highlights & Engineering Feats

- **Strict 4-Layer Clean Architecture:** Domain (zero dependencies) -> Application (business logic & CQRS interfaces) -> Infrastructure (EF Core, Identity, SignalR, Cloudinary, MailKit) -> API (thin controllers & hosted background jobs).
- **CQRS + MediatR In-Process Messaging:** Complete segregation between read queries and write commands. Zero monolithic services. Every business flow is an isolated, testable, single-responsibility handler.
- **Bi-Directional Real-Time Synchronization:** ASP.NET Core SignalR full-duplex WebSocket communication pushes updates instantly to connected collaborators across cards, dialogs, reminders, and notifications.
- **Hosted Background Workers:** `ReminderBackgroundService` running on a 20-second cadence with automated recurring date calculation (`Daily`, `Weekly`, `Monthly`, `Yearly`) and instant notification dispatch.
- **Enterprise Security & Self-Service Lifecycle:** Google OAuth 2.0 (OpenID Connect), JWT authentication with security stamp session invalidation, cryptographic PIN vault, tokenized password reset via SMTP, NIST-compliant password change, and GDPR-compliant self-service account eradication.
- **Modern Angular 19 Client:** Standalone components, reactive Signals, Angular CDK drag-and-drop, HTTP interceptors (JWT & error toasts), custom CSS variables design system, and mobile viewport optimizations.

---

## Comprehensive Feature Matrix

### 1. Smart Note Taking & Dynamic Checklists
- **Dual Note Types:** Seamlessly toggle between freeform rich notes and interactive Todo Checklists.
- **Interactive Checklists:** 
  - Dynamic addition (`Enter` key on any item spawns a new line).
  - Smart deletion (`Backspace` on an empty item removes it seamlessly).
  - Check / uncheck with strike-through styling and immediate state persistence.
  - Bulk clean-up: 1-click removal of all completed items.
- **Multi-Level Undo / Redo:** Full client-side history stack allowing step-by-step undo and redo for text changes and checklist operations.
- **Curated Color Themes:** Google Keep-inspired vibrant palettes with dedicated high-contrast adaptations for dark mode.
- **Multi-Image Cloud Attachments:** Direct image uploads to Cloudinary CDN with lightbox full-screen modal previews, removal options, and file size validation (up to 10MB).
- **Drag & Drop Card Reordering:** Powered by `@angular/cdk/drag-drop` with instant visual feedback and persistent `OrderIndex` updates saved to PostgreSQL.
- **Organization Pipeline:**
  - **Pin / Unpin:** Pin vital notes to a dedicated top section.
  - **Archive System:** Archive inactive notes out of the main view with full unarchive capabilities.
  - **Trash & Soft-Delete:** Move unwanted notes to Trash with 1-click restore or permanent bulk "Empty Trash" purge.

---

### 2. Privacy Vault (PIN-Locked Notes)
- **Zero-Knowledge Note Shield:** Lock sensitive or confidential notes behind a 4+ digit numeric PIN.
- **Cryptographic Hashing:** PINs are secured with salted cryptographic hashing (`EncryptionService`).
- **Dashboard Concealment:** Locked notes mask titles and body text with a lock badge to protect user privacy from shoulder surfers.
- **Flexible Security Lifecycle:**
  - Enter PIN to temporarily unlock and edit the note in-session.
  - Permanent lock removal with PIN authentication.

---

### 3. Interactive Drawing Canvas Studio
- **Google Keep-Style Drawing Board:** Full-featured SVG/HTML5 canvas studio built right into the app.
- **Creative Tools:** Freehand brush, highlighter mode, precision eraser, stroke thickness slider, and RGB color picker.
- **Canvas Operations:** Stroke undo/redo, clear canvas, and touch/mouse stylus compatibility.
- **Direct Cloud Integration:** Automatically exports drawings as high-definition PNGs, uploads directly to Cloudinary, and attaches them to the active note.

---

### 4. Public Note Sharing via Secret Link
- **Unique Secret Slugs:** 1-click generation of unguessable random slug links (`GeneratePublicLinkCommand`).
- **Dedicated Public View (`/p/:slug`):** High-performance standalone read-only portal accessible to external visitors without requiring login.
- **Visitor Experience:** View note title, content, checklist items, image attachments, read-only status, copy-link button, and dark/light theme switch.
- **Analytics & Access Control:** Unique visitor view tracking counter and instant link revocation to terminate public access at any moment.

---

### 5. Real-Time Multi-User Collaboration (SignalR)
- **Collaborator Invitations:** Share notes with any registered user by email address.
- **Live WebSocket Synchronization:** All updates (typing, checklist toggling, color changes, pinning) sync in real time across collaborators' screens via SignalR `NotesHub`.
- **Invitation Acceptance Workflow:** Security prompt allowing invitees to accept or decline shared note requests.
- **Collaborator Chips:** Multi-user avatar badges with tooltips displaying collaborator emails and ownership status.

---

### 6. Smart Reminders & In-App Notification Center
- **Granular Scheduling:** Set one-time or recurring reminders with custom date & time selection.
- **Recurring Cadences:** Supports `Daily`, `Weekly`, `Monthly`, and `Yearly` recurrence cycles.
- **Automated Background Worker (`ReminderBackgroundService`):**
  - Runs in the background on the API server every 20 seconds.
  - Identifies due reminders and dispatches both in-app database notifications and real-time SignalR alerts.
  - Automatically calculates and advances the `ReminderDate` for recurring notes.
- **Notification Dropdown Hub:**
  - Header bell icon with animated unread counter badge.
  - Dropdown listing alerts with timestamps and direct navigation to the target note.
  - Quick action buttons: Mark as Read, Mark All as Read, Delete, and Clear All.

---

### 7. Custom Labels & Organizational Tagging
- Manage custom labels: Create, rename, and delete tags from an interactive modal.
- Tag notes with multiple labels using a searchable multi-select popup.
- Collapsible sidebar filters: 1-click navigation to view notes filtered by any label.

---

### 8. Version History & Snapshot Audit Trail
- **Automatic Version Snapshots:** Every note modification captures a historical snapshot storing title, content, checklist state, color, and timestamp (`NoteHistory`).
- **Interactive Version Viewer:** Visual modal displaying chronological revisions with author attribution.
- **1-Click Restore & Export:** Restore any previous revision with a single click or export any historical snapshot as a `.txt` file.

---

### 9. Enterprise Authentication & Security Suite
- **Dual Authentication Modes:**
  - **Google OAuth 2.0:** One-tap sign-in via Google Identity Services (GIS) / OpenID Connect.
  - **JWT Credentials:** Secure registration with password complexity enforcement and BCrypt hashing.
- **Forgot & Reset Password:**
  - Tokenized password reset with Base64 URL-safe encoding.
  - 3-hour expiration window (`DataProtectionTokenProviderOptions.TokenLifespan`).
  - Formatted responsive HTML email sent via SMTP (Gmail / SendGrid).
- **Self-Service Change Password:**
  - Validates current password against ASP.NET Identity.
  - Enforces NIST/OWASP complexity checks.
  - Prevents reusing the existing password as the new password (`sameAsCurrent`).
  - Calls `UpdateSecurityStampAsync` to revoke stale JWT sessions across other devices.
- **GDPR Self-Service Account Deletion:**
  - Complete permanent account eradication from the database.
  - Cascades through notes, checklists, labels, history, collaborators, notifications, and Identity `AppUser`.
  - Re-authentication safeguard: Password verification for credential users; `"DELETE"` keyword confirmation for Google OAuth users.
  - Auto sign-out and redirect upon completion.

---

### 10. Aesthetics & Mobile-First UX
- **Curated Dark & Light Mode:** Tailored contrast tokens, smooth transitions, and persistent storage in `localStorage`.
- **Integrated Settings Dropdown:** Seamless settings accordion nested directly inside the user profile avatar menu (Dark mode toggle, Change Password modal trigger, and Account Deletion danger zone).
- **Responsive Mobile Note Dialog:**
  - Top-right dedicated `X` close button on mobile viewports (`@media (max-width: 768px)`).
  - Space-optimized bottom toolbar eliminating button overflow on small phone screens.
  - Collapsible navigation drawer with backdrop blur.
- **Global Toast Notification Service:** Non-blocking feedback banners for all network and user events.

---

## Clean Architecture Breakdown

```
notes-application/
│
├── notes-backend/
│   ├── Notes.Domain/                 # [Core Enterprise Layer] - Zero External Dependencies
│   │   ├── Entities/                 # AppUser, Note, Label, TodoItem, NoteHistory, NoteCollaborator, Notification
│   │   └── Enums/                    # NoteType, NotificationType, ReminderRepeat
│   │
│   ├── Notes.Application/            # [Business Logic Layer] - CQRS Pipeline & MediatR
│   │   ├── Auth/                     # Register, Login, GoogleLogin, ResetPassword, ChangePassword, DeleteAccount
│   │   ├── Notes/                    # CRUD, Reorder, Trash, Pin, Archive, Lock, PublicShare, Collaborators
│   │   ├── Labels/                   # CreateLabel, UpdateLabel, DeleteLabel, GetLabels
│   │   ├── Notifications/            # GetNotifications, MarkRead, MarkAllRead, DeleteNotification, ClearAll
│   │   ├── Images/                   # UploadImageCommand
│   │   └── Interfaces/               # IApplicationDbContext, IJwtTokenGenerator, IImageUploadService, 
│   │                                 # INoteNotificationService, IEmailSender
│   │
│   ├── Notes.Infrastructure/         # [External Implementations Layer]
│   │   ├── Persistence/              # AppDbContext (EF Core), Model Configurations, Migrations
│   │   ├── Authentication/           # JwtTokenGenerator (Claims & HMAC-SHA256)
│   │   ├── Services/                 # CloudinaryImageUploadService, SmtpEmailService, EncryptionService, NoteNotificationService
│   │   └── Hubs/                     # NotesHub (SignalR WebSocket Hub with [Authorize])
│   │
│   └── Notes.Api/                    # [Presentation Layer] - Web API & Hosted Jobs
│       ├── Controllers/              # AuthController, NotesController, LabelsController, NotificationsController, ImagesController
│       ├── BackgroundJobs/           # ReminderBackgroundService (Cron Worker), OrphanedFileCleanupJob
│       ├── Program.cs                # DI Registration, CORS, Security Stamp, ASP.NET Identity, SignalR Route Mapping
│       └── Dockerfile                # Production Multi-Stage Container Definition
│
└── notes-frontend/                   # [Client Layer] - Angular 19 SPA
    └── src/app/
        ├── core/                     # AuthGuard, JwtInterceptor, ErrorInterceptor, Services (Note, Auth, SignalR, Toast)
        ├── shared/                   # Reusable Components (Toast, Lightbox), Pipes, Interfaces
        └── features/
            ├── auth/                 # Login, Register, Forgot Password, Reset Password
            ├── notes/                # Dashboard, NoteCard, NoteDialog, PinModal, DrawingCanvas,
            │                         # PublicShareModal, ChangePasswordModal, DeleteAccountModal,
            │                         # CollaboratorsModal, VersionHistoryModal, ReminderPopup, EditLabelsModal
            └── public-note-view/     # Public read-only share portal (/p/:slug)
```

---

## CQRS Command & Query Catalog

| Type | Name | Purpose |
|---|---|---|
| **Command** | `RegisterUserCommand` | Creates new user with hashed password |
| **Query** | `LoginUserQuery` | Validates credentials and issues JWT token |
| **Command** | `GoogleLoginCommand` | Validates Google OIDC ID token and provisions/logs in user |
| **Command** | `ForgotPasswordCommand` | Generates 3-hour reset token and emails secure reset link |
| **Command** | `ResetPasswordCommand` | Resets password using token and Base64-decoded token payload |
| **Command** | `ChangePasswordCommand` | Re-authenticates old password, checks OWASP rules, updates security stamp |
| **Query** | `HasPasswordQuery` | Checks if user has a local password or is pure OAuth |
| **Command** | `DeleteAccountCommand` | Permanently deletes user and cascades all related data |
| **Command** | `CreateNoteCommand` | Creates text note or checklist with color, images, labels |
| **Command** | `UpdateNoteCommand` | Modifies note, takes snapshot in `NoteHistory`, broadcasts via SignalR |
| **Command** | `DeleteNoteCommand` | Moves note to Trash or permanently removes it |
| **Command** | `EmptyTrashCommand` | Permanently removes all notes marked as trashed |
| **Command** | `ReorderNotesCommand` | Batch updates notes `OrderIndex` based on drag & drop ordering |
| **Command** | `LockNoteCommand` | Hashes custom PIN and locks note |
| **Command** | `UnlockNoteCommand` | Verifies PIN and returns unmasked note data |
| **Command** | `RemoveNoteLockCommand` | Verifies PIN and permanently clears lock status |
| **Command** | `GeneratePublicLinkCommand` | Generates unique slug and activates public access |
| **Command** | `RevokePublicLinkCommand` | Disables public link and clears slug |
| **Query** | `GetNotesQuery` | Retrieves active, pinned, archived, or trashed notes for user |
| **Query** | `GetNoteByIdQuery` | Fetches single note ensuring ownership or collaborator access |
| **Query** | `GetNoteHistoryQuery` | Retrieves snapshot history timeline of a note |
| **Query** | `GetPublicNoteBySlugQuery` | Fetches public note without authentication and increments views |
| **Command** | `AddCollaboratorCommand` | Invites collaborator by email and broadcasts SignalR event |
| **Command** | `RemoveCollaboratorCommand` | Revokes collaborator access |
| **Command** | `AcceptSharedNoteCommand` | Confirms recipient acceptance of shared note |
| **Command** | `CreateLabelCommand` / `Update` / `Delete` | Manages user-defined categorization labels |
| **Query** | `GetLabelsQuery` | Fetches all labels created by the authenticated user |
| **Command** | `UploadImageCommand` | Validates and streams image to Cloudinary CDN |
| **Query** | `GetNotificationsQuery` | Retrieves paginated notification feed |
| **Command** | `MarkNotificationReadCommand` | Marks single notification as read |
| **Command** | `MarkAllNotificationsReadCommand` | Marks all user notifications as read |
| **Command** | `DeleteNotificationCommand` / `ClearAll` | Deletes single or all notifications |

---

## REST API Reference

### Authentication (`/api/auth`)
| Method | Endpoint | Description | Auth Required |
|---|---|---|:---:|
| `POST` | `/api/auth/register` | Register new user account | No |
| `POST` | `/api/auth/login` | Authenticate with email & password | No |
| `POST` | `/api/auth/google-login` | Sign in / register via Google ID token | No |
| `POST` | `/api/auth/forgot-password` | Send password reset email | No |
| `POST` | `/api/auth/reset-password` | Reset password using email token | No |
| `GET` | `/api/auth/has-password` | Check if user has an Identity password | **Yes** |
| `POST` | `/api/auth/change-password` | Change user password | **Yes** |
| `POST` | `/api/auth/delete-account` | Permanently eradicate user account & data | **Yes** |

### Notes (`/api/notes`)
| Method | Endpoint | Description | Auth Required |
|---|---|---|:---:|
| `GET` | `/api/notes` | Get all notes for authenticated user | **Yes** |
| `GET` | `/api/notes/{id}` | Get note details by ID | **Yes** |
| `POST` | `/api/notes` | Create a new note | **Yes** |
| `PUT` | `/api/notes/{id}` | Update an existing note | **Yes** |
| `DELETE` | `/api/notes/{id}` | Delete or trash note | **Yes** |
| `PUT` | `/api/notes/reorder` | Save drag-and-drop ordering array | **Yes** |
| `DELETE` | `/api/notes/empty-trash` | Purge all notes currently in Trash | **Yes** |
| `GET` | `/api/notes/{id}/history` | Get revision history timeline | **Yes** |
| `POST` | `/api/notes/{id}/lock` | Set PIN and lock note | **Yes** |
| `POST` | `/api/notes/{id}/unlock` | Unlock note with PIN verification | **Yes** |
| `POST` | `/api/notes/{id}/remove-lock` | Permanently remove note PIN lock | **Yes** |
| `POST` | `/api/notes/{id}/public-link` | Generate public sharing slug | **Yes** |
| `DELETE` | `/api/notes/{id}/public-link` | Revoke public sharing link | **Yes** |
| `GET` | `/api/notes/public/{slug}` | View public note by slug (Visitor View) | **No** |
| `POST` | `/api/notes/{id}/collaborators` | Add collaborator by email | **Yes** |
| `DELETE` | `/api/notes/{id}/collaborators/{userId}` | Remove collaborator | **Yes** |
| `POST` | `/api/notes/{id}/accept-shared` | Accept shared note invitation | **Yes** |

### Labels (`/api/labels`)
| Method | Endpoint | Description | Auth Required |
|---|---|---|:---:|
| `GET` | `/api/labels` | List all user labels | **Yes** |
| `POST` | `/api/labels` | Create a new label | **Yes** |
| `PUT` | `/api/labels/{id}` | Rename existing label | **Yes** |
| `DELETE` | `/api/labels/{id}` | Delete label | **Yes** |

### Notifications (`/api/notifications`)
| Method | Endpoint | Description | Auth Required |
|---|---|---|:---:|
| `GET` | `/api/notifications` | Get recent notification list | **Yes** |
| `PUT` | `/api/notifications/{id}/read` | Mark notification as read | **Yes** |
| `PUT` | `/api/notifications/read-all` | Mark all notifications as read | **Yes** |
| `DELETE` | `/api/notifications/{id}` | Delete single notification | **Yes** |
| `DELETE` | `/api/notifications/clear-all` | Purge all user notifications | **Yes** |

### Images (`/api/images`)
| Method | Endpoint | Description | Auth Required |
|---|---|---|:---:|
| `POST` | `/api/images/upload` | Upload image file to Cloudinary CDN | **Yes** |

---

## Tech Stack & Tools

### Backend Architecture
- **Framework:** .NET 10.0 / C# 13
- **Patterns:** Clean Architecture, CQRS, MediatR, Repository/Unit-of-Work via EF Core
- **Database:** PostgreSQL on Neon Serverless with connection pooling & SSL
- **Real-Time WebSockets:** ASP.NET Core SignalR
- **Identity & Auth:** ASP.NET Core Identity, JWT Bearer Tokens, Google OIDC
- **Cloud Media:** CloudinaryDotNet SDK
- **Email Delivery:** MailKit & MimeKit (SMTP)
- **Containerization:** Docker (Multi-stage build)

### Frontend Architecture
- **Framework:** Angular 19 (Standalone Components, Signals, Reactive Forms)
- **State & UI Interaction:** Angular CDK (Drag-and-Drop, Layout, Overlay)
- **Real-Time Client:** `@microsoft/signalr`
- **Social Login:** `@abacritt/angularx-social-login` (Google Identity Services)
- **Styling:** Vanilla SCSS, CSS Custom Properties Design Tokens, Glassmorphism
- **HTTP Pipeline:** Functional Interceptors for JWT authorization and global error handling

---

## Local Development Setup

### Prerequisites
- [.NET SDK 10.0 or 9.0](https://dotnet.microsoft.com/download)
- [Node.js (v18+) & npm](https://nodejs.org/)
- [Angular CLI](https://angular.dev/tools/cli) (`npm install -g @angular/cli`)
- PostgreSQL instance (Local or free cloud database on [Neon.tech](https://neon.tech))
- Free [Cloudinary](https://cloudinary.com) account (for image attachments and drawings)
- Gmail account with an [App Password](https://myaccount.google.com/apppasswords) (for SMTP password reset emails)

---

### 1. Backend Configuration & Startup

1. Open your terminal and navigate to the API directory:
   ```bash
   cd notes-backend/Notes.Api
   ```

2. Create or verify `appsettings.Development.json`:
   ```json
   {
     "ConnectionStrings": {
       "DefaultConnection": "Host=your-neon-host;Database=notesdb;Username=your-user;Password=your-password;SSL Mode=Require;"
     },
     "JwtSettings": {
       "Secret": "YourSuperSecretKeyWithAtLeast32CharactersLength!",
       "Issuer": "KeepNotesApi",
       "Audience": "KeepNotesClient",
       "ExpirationInHours": "24"
     },
     "Cloudinary": {
       "Url": "cloudinary://<API_KEY>:<API_SECRET>@<CLOUD_NAME>"
     },
     "Google": {
       "ClientId": "<YOUR_GOOGLE_CLIENT_ID>.apps.googleusercontent.com"
     },
     "SmtpSettings": {
       "Host": "smtp.gmail.com",
       "Port": "587",
       "Username": "your_email@gmail.com",
       "Password": "your_gmail_app_password",
       "SenderEmail": "your_email@gmail.com",
       "SenderName": "Keep Notes"
     },
     "AllowedOrigins": [
       "http://localhost:4200"
     ]
   }
   ```

3. Apply Entity Framework Core database migrations:
   ```bash
   dotnet ef database update
   ```

4. Run the API:
   ```bash
   dotnet run
   ```
   *The API will start listening at `https://localhost:7273` (or `http://localhost:5253`).*

---

### 2. Frontend Configuration & Startup

1. Open a new terminal and navigate to the frontend directory:
   ```bash
   cd notes-frontend
   ```

2. Install client dependencies:
   ```bash
   npm install
   ```

3. Configure your local environment in `src/environments/environment.development.ts`:
   ```typescript
   export const environment = {
     production: false,
     apiUrl: 'https://localhost:7273/api',
     hubUrl: 'https://localhost:7273/hubs/notes',
     googleClientId: '<YOUR_GOOGLE_CLIENT_ID>.apps.googleusercontent.com'
   };
   ```

4. Launch the Angular development server:
   ```bash
   ng serve
   ```

5. Open your browser and navigate to:
   ```
   http://localhost:4200
   ```

---

## Docker Containerization (Render Production Build)

The API is deployed to Render using a multi-stage production Docker container:

```dockerfile
# Build image
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
COPY . .
RUN dotnet publish "Notes.Api/Notes.Api.csproj" -c Release -o /app/publish

# Runtime image
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final
WORKDIR /app
COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "Notes.Api.dll"]
```

---

## Contributing

Contributions, feedback, and suggestions are welcome! Feel free to open an issue or submit a pull request:
1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'feat: add some amazing feature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## License

Distributed under the **MIT License**. See `LICENSE` for more information.

---

<p align="center">
  Developed by <strong>Bhavik Patel</strong> to showcase enterprise Clean Architecture, CQRS, and full-stack engineering.
</p>
