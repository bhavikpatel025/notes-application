# 📝 Notes Application - Clean Architecture & CQRS + MediatR

Welcome to the **Notes Application**! This project is a full-stack, production-ready clone of a modern note-taking application (inspired by Google Keep). It was built primarily to learn and demonstrate the power of **Clean Architecture** combined with the **CQRS (Command Query Responsibility Segregation) + MediatR** pattern in .NET Core.

---

## 🚀 Live Demo
- **Frontend:** [https://notes-application-frontend-lemon.vercel.app](https://notes-application-frontend-lemon.vercel.app)
- **Backend API:** [https://notes-api-backend-bth6.onrender.com](https://notes-api-backend-bth6.onrender.com)

---

## ✨ Features & Functionality

### 🔐 Authentication & Authorization
- **Google OAuth 2.0:** One-tap and button-based "Continue with Google" sign-in using OpenID Connect (OIDC).
- **JWT Based Auth:** Secure user registration and login with custom JSON Web Tokens.
- **Protected Routes:** Frontend route guards to prevent unauthorized access.

### 📓 Note Management
- **CRUD Operations:** Create, Read, Update, and Delete notes seamlessly.
- **Rich Organization:** 
  - 📌 **Pin Notes:** Keep important notes at the top.
  - 📦 **Archive:** Hide notes from the main dashboard without deleting them.
  - 🗑️ **Trash System:** Soft-delete functionality. Restore notes or empty the trash completely.
- **Drag & Drop Reordering:** Rearrange notes on your dashboard intuitively (persisted to the database).
- **Color Coding:** Assign vibrant colors to individual notes.

### 🏷️ Label System
- Create, Edit, and Delete custom labels.
- Attach multiple labels to any note for powerful categorization and filtering.

### 🖼️ Image Uploading
- **Cloudinary Integration:** Upload images directly to notes. Images are hosted securely on Cloudinary, reducing local storage dependencies and preparing the app for a fully serverless environment.

---

## 🏗️ Architecture & Coding Structure

This project rigidly follows **Clean Architecture** principles to ensure separation of concerns, testability, and maintainability. The backend is split into four distinct layers:

### 1. Domain Layer (`Notes.Domain`)
The core of the application. Contains enterprise logic and types.
- **Entities:** `AppUser`, `Note`, `Label`
- Has zero dependencies on any other layer or framework.

### 2. Application Layer (`Notes.Application`)
Contains the business logic and use cases. This is where **CQRS and MediatR** shine.
- **Commands:** Operations that mutate state (e.g., `CreateNoteCommand`, `UpdateLabelCommand`).
- **Queries:** Operations that return data without side effects (e.g., `GetNotesQuery`).
- **Interfaces:** Contracts for infrastructure implementations (e.g., `IImageUploadService`).
- Depends *only* on the Domain layer.

### 3. Infrastructure Layer (`Notes.Infrastructure`)
Contains implementations for external concerns.
- **Persistence:** Entity Framework Core DbContext, Migrations, and PostgreSQL setup.
- **Services:** JWT Token Generation, `CloudinaryImageUploadService`.
- **Identity:** ASP.NET Core Identity integration.
- Depends on the Application and Domain layers.

### 4. Presentation / API Layer (`Notes.Api`)
The entry point of the backend application.
- **Controllers:** Thin controllers that simply map HTTP requests to MediatR Queries/Commands.
- **Dependency Injection:** Wiring up all the services.
- **Middleware:** Global error handling, CORS policies.

---

## 💻 Tech Stack

### Backend
- **Framework:** .NET Core (C#)
- **Architecture:** Clean Architecture + CQRS
- **Libraries:** 
  - `MediatR` (for CQRS)
  - `Entity Framework Core` (ORM)
  - `CloudinaryDotNet` (Image Hosting)
- **Database:** PostgreSQL (Hosted on Neon.tech)

### Frontend
- **Framework:** Angular 19
- **Styling:** SCSS, Custom modern UI design
- **Key Modules:** 
  - `@angular/cdk/drag-drop` (for note reordering)
  - Interceptors for JWT attachment
  - Standalone Components

### Deployment
- **Frontend:** Vercel
- **Backend:** Render (Dockerized)
- **Database:** Neon DB

---

## 🛠️ Local Development Setup

### Prerequisites
- [.NET SDK](https://dotnet.microsoft.com/download)
- [Node.js & npm](https://nodejs.org/)
- PostgreSQL Server (or a Neon DB account)
- Cloudinary Account

### 1. Backend Setup
1. Navigate to the backend folder: `cd notes-backend/Notes.Api`
2. Update the `appsettings.Development.json` with your secrets (Database Connection String, JWT Secret, Cloudinary URL).
3. Apply migrations: `dotnet ef database update`
4. Run the API: `dotnet run` (Runs on `https://localhost:7273`)

### 2. Frontend Setup
1. Navigate to the frontend folder: `cd notes-frontend`
2. Install dependencies: `npm install`
3. Start the Angular dev server: `ng serve`
4. Open your browser to `http://localhost:4200`

---

## 🧠 Learning Journey: CQRS + MediatR
This project serves as a practical implementation of CQRS. By segregating Commands (writes) and Queries (reads), the application logic becomes incredibly predictable and scalable. 

Instead of bloated "Services" containing hundreds of lines of mixed logic, every single action in this app (e.g., `CreateNote`) is isolated into its own file (`CreateNoteCommandHandler.cs`). This makes the codebase extremely easy to navigate, test, and expand!

---
*Built with ❤️ to master Clean Architecture and .NET Core.*
