# CodeGraph

> AI-powered repository intelligence and developer workflow platform.

CodeGraph helps developers understand, explore, modify, validate, and ship changes to a software repository using AI.

Instead of treating a repository as a collection of files, CodeGraph builds an intelligent representation of the codebase using semantic search, AST analysis, code relationships, and architecture visualization.

It can then use that understanding to plan features, generate code changes, validate them, and turn approved changes into a GitHub Pull Request.

---

## ✨ Features

### 📦 Repository Ingestion

Import repositories into CodeGraph using:

- GitHub repository URLs
- ZIP uploads

CodeGraph analyzes the repository and stores its source files for further analysis.

---

### 🧠 Semantic Code Search

CodeGraph uses embeddings and vector search to retrieve relevant parts of a repository.

This allows AI features to work with relevant repository context instead of blindly sending the entire codebase to an LLM.

---

### 🕸️ AST-Based Code Graph

CodeGraph analyzes TypeScript/JavaScript source code using AST analysis and extracts:

- Classes
- Interfaces
- Functions
- Methods
- Variables
- Imports
- Exports
- Inheritance
- Implementations
- Dependency relationships
- Function calls
- Dependency injection relationships

The extracted information is stored as a code graph that can be queried and visualized.

---

### 🏗️ Architecture Visualization

CodeGraph automatically builds a high-level architecture view of the repository.

Depending on the detected project structure, it can identify architectural components such as:

- Controllers
- Services
- Repositories
- Modules
- Components
- Database layers
- External integrations

The architecture view provides a visual representation of how different parts of the codebase are connected.

---

### 📁 Intelligent File Explorer

Browse the analyzed repository through an interactive file explorer.

The system supports:

- Hierarchical file navigation
- File selection
- Source code viewing
- Architecture-to-file navigation
- Symbol-aware navigation

File contents are loaded when needed rather than unnecessarily transferring the entire repository.

---

### 💬 Repository-Aware AI Chat

Ask questions about the repository using natural language.

Examples:

```text
How does authentication work?

Where is user creation handled?

What calls the PaymentService?

Explain the architecture of this project.

Where should I add caching?

What happens when a user signs up?
```

Responses can reference relevant repository files and code context.

📝 AI Feature Planning

Describe a feature in natural language and CodeGraph creates a structured implementation plan.

Example:

Add caching to the agent repository.

The planner can identify:

Relevant files
Required changes
Affected components
Dependencies
Implementation steps
Potential considerations
🤖 AI Code Generation

After reviewing a feature plan, CodeGraph can generate concrete code changes.

Generated changes are represented as versioned changesets rather than directly modifying the repository.

Each changeset contains:

Changed files
Change type
Original content
Proposed content
Reason for the change
Affected symbols

This makes generated changes reviewable and reversible.

🔍 Diff Viewer

Review generated code changes before they are applied.

Supported views include:

Unified diff
Side-by-side diff
File-by-file changes
Changeset versions

Users can:

Review changes
Approve changes
Reject changes
Regenerate changes
Switch between changeset versions

The original repository content remains the source of truth.

🧪 Automated Validation

CodeGraph creates a temporary workspace from the repository and validates proposed changes against the target project's own tooling.

Depending on the repository, validation can include:

TypeScript type checking
Build validation
Tests

Validation is repository-aware.

If a validation tool is not applicable, it is skipped rather than incorrectly reported as a failure.

For example:

No tsconfig.json found.

TypeScript validation skipped because
TypeScript configuration is not applicable
to this repository.
🔐 GitHub OAuth Integration

CodeGraph supports connecting a GitHub account through OAuth.

GitHub authentication is handled through Supabase Auth.

GitHub access tokens remain server-side and are never exposed to the frontend.

🌿 Safe GitHub Branch Creation

Approved changesets can be applied to a dedicated GitHub feature branch.

CodeGraph:

Detects the repository's default branch.
Retrieves its current commit.
Creates a dedicated feature branch.
Verifies repository access.
Verifies changeset ownership.
Verifies approval and validation state.
Checks for repository drift.
Applies file changes using GitHub's Git Data APIs.

The default branch is never modified directly.

🧩 Repository Drift Protection

Before applying generated changes, CodeGraph verifies that the source files have not changed since the changeset was generated.

For modified or deleted files, CodeGraph compares the current GitHub content with the original content stored in the changeset.

If the repository has changed:

Repository changed since this changeset
was generated.

Regenerate the changeset before applying it.

The operation is aborted instead of overwriting newer developer changes.

📌 GitHub Commit & Push

Approved changes can be committed to the CodeGraph-created feature branch.

Multiple file changes are represented as a single Git commit.

The workflow protects against:

Default branch modification
Duplicate commits
Unexpected branch changes
Repository drift
🔀 Pull Request Creation

After the changes have been committed, CodeGraph can create a Pull Request on GitHub.

The generated PR includes:

Feature title
Feature summary
Changed files
Validation information
Changeset version
Source branch
Target branch

CodeGraph also prevents duplicate Pull Requests for the same changeset.

🔄 Complete Workflow

The complete CodeGraph developer workflow is:

                  GitHub / ZIP Repository
                           │
                           ▼
                  Repository Ingestion
                           │
                           ▼
              ┌────────────────────────┐
              │ Repository Intelligence│
              │                        │
              │ Semantic Search        │
              │ Embeddings             │
              │ AST Analysis           │
              │ Code Relationships     │
              │ Architecture           │
              └────────────┬───────────┘
                           │
                           ▼
                    AI Feature Plan
                           │
                           ▼
                    AI Code Changes
                           │
                           ▼
                       Diff Review
                           │
                           ▼
                       Validation
                           │
                           ▼
                        Approval
                           │
                           ▼
                   GitHub Feature Branch
                           │
                           ▼
                         Commit
                           │
                           ▼
                     Pull Request

The goal is to keep the developer in control while automating the repetitive parts of repository analysis and implementation.

🏛️ Architecture

CodeGraph is built around several major layers.

┌─────────────────────────────────────────────┐
│                  Frontend                   │
│                                             │
│ Next.js + React                             │
│ Repository UI                               │
│ Architecture Graph                          │
│ File Explorer                               │
│ AI Chat                                     │
│ Feature Planner                             │
│ Diff Viewer                                 │
└──────────────────────┬──────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────┐
│                  API Layer                  │
│                                             │
│ Next.js Route Handlers                      │
│ Authentication                             │
│ Repository APIs                             │
│ Planning APIs                               │
│ Changeset APIs                              │
│ GitHub APIs                                 │
└──────────────────────┬──────────────────────┘
                       │
          ┌────────────┼─────────────┐
          ▼            ▼             ▼
┌──────────────┐ ┌─────────────┐ ┌──────────────┐
│ Repository   │ │ AI / RAG    │ │ GitHub       │
│ Analysis     │ │ Pipeline    │ │ Integration  │
│              │ │             │ │              │
│ AST          │ │ Embeddings  │ │ OAuth        │
│ Symbols      │ │ Retrieval   │ │ Branches     │
│ Relationships│ │ Planning    │ │ Commits      │
│ Architecture │ │ Generation  │ │ Pull Requests│
└──────┬───────┘ └──────┬──────┘ └──────────────┘
       │                │
       └────────┬───────┘
                ▼
┌─────────────────────────────────────────────┐
│                Supabase                     │
│                                             │
│ PostgreSQL                                  │
│ pgvector                                    │
│ Supabase Auth                               │
│ Repository Data                             │
│ Code Graph                                  │
│ Changesets                                  │
│ Validation                                  │
└─────────────────────────────────────────────┘
🛠️ Tech Stack
Frontend
Next.js
React
TypeScript
Tailwind CSS
Backend
Next.js Route Handlers
TypeScript
Server-side services
Database
Supabase
PostgreSQL
pgvector
Authentication
Supabase Auth
Email/password authentication
Google OAuth
GitHub OAuth
Code Analysis
TypeScript AST
ts-morph
AI / RAG
Embeddings
Vector similarity search
Retrieval-Augmented Generation
LLM-based planning and code generation
GitHub
GitHub REST API
Git Data API
GitHub OAuth
Deployment
Render
📂 Project Structure

A simplified project structure:

CodeGraph/
│
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── repositories/
│   │   │   ├── feature-plans/
│   │   │   ├── changesets/
│   │   │   └── github/
│   │   │
│   │   ├── login/
│   │   ├── signup/
│   │   └── ...
│   │
│   ├── components/
│   │   ├── analysis/
│   │   ├── architecture/
│   │   ├── files/
│   │   ├── github/
│   │   ├── layout/
│   │   └── ...
│   │
│   ├── server/
│   │   ├── analyzer/
│   │   ├── github/
│   │   ├── planner/
│   │   ├── rag/
│   │   └── db/
│   │
│   ├── lib/
│   ├── types/
│   └── ...
│
├── public/
├── package.json
├── schema.sql
└── README.md
🗄️ Data Model

Some of the major entities used by CodeGraph include:

User
 │
 ├── Repositories
 │      │
 │      ├── Repository Files
 │      ├── Code Symbols
 │      ├── Code Relationships
 │      └── Architecture
 │
 ├── Feature Plans
 │      │
 │      └── Changesets
 │             │
 │             ├── File Changes
 │             ├── Validations
 │             ├── GitHub Branch
 │             └── Pull Request
 │
 └── GitHub Connection

Important entities include:

repositories
repository_files
code_symbols
code_relationships
generated_changesets
generated_file_changes
changeset_validations
changeset_branches
GitHub connection data
Pull Request metadata
🔐 Security

CodeGraph is designed so that generated code is never blindly pushed to a user's default branch.

Important safeguards include:

Authentication

Protected operations require an authenticated CodeGraph user.

Repository Ownership

Changesets are associated with the user and repository that created them.

Changeset Approval

Only approved changesets can enter the GitHub write workflow.

Validation

Explicit validation failures prevent changes from progressing.

Repository Drift Detection

Changes generated against outdated source code are rejected.

Feature Branches

Changes are never directly written to the default branch.

GitHub Tokens

GitHub OAuth credentials are kept server-side.

They are never intentionally exposed to:

browser state
API responses
URLs
frontend components
logs
🚀 Getting Started
Prerequisites

Make sure you have:

Node.js
npm
A Supabase project
PostgreSQL with pgvector enabled
GitHub OAuth application credentials
An LLM/embedding provider configuration
Installation

Clone the repository:

git clone <your-repository-url>
cd CodeGraph

Install dependencies:

npm install
Environment Variables

Create a .env.local file.

Example:

NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# AI provider
OPENAI_API_KEY=

# GitHub OAuth / integration
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=

Use the environment variables expected by the current implementation.

Never commit secrets to Git.

🗃️ Database Setup

Create/configure a Supabase project and apply the database schema.

The project uses PostgreSQL and pgvector for repository and semantic-search functionality.

Apply:

src/server/db/schema.sql

or use the project's current database migration workflow if migrations are configured.

▶️ Running Locally

Start the development server:

npm run dev

Then open:

http://localhost:3000
🧪 Testing

Run the TypeScript type check:

npx tsc --noEmit

Run the complete test suite:

npm test

Run a specific test:

node --import tsx --test <test-file>
📊 Current Project Status
Area	Status
Repository ingestion	✅
GitHub repository ingestion	✅
Semantic chunking	✅
Embeddings / vector search	✅
RAG chat	✅
Repository summaries	✅
AST symbol extraction	✅
Code relationships	✅
Architecture visualization	✅
File Explorer	✅
Authentication	✅
Google OAuth	✅
GitHub OAuth	✅
AI feature planning	✅
AI code generation	✅
Versioned changesets	✅
Diff viewer	✅
Code validation	✅
GitHub branch creation	✅
Repository drift protection	✅
GitHub commit / push	✅
Pull Request creation	✅
Navigation/data-fetch optimization	🚧
AI code review	Planned
🎯 Design Philosophy

CodeGraph is built around three principles.

1. Understand Before Modifying

The system should understand the repository before proposing changes.

Repository
   ↓
AST + Semantic Analysis
   ↓
Code Graph
   ↓
Context
   ↓
AI Planning
2. Review Before Applying

AI-generated code should not immediately modify the user's repository.

Generate
   ↓
Diff
   ↓
Validate
   ↓
Human Approval
   ↓
Apply

The developer remains in control.

3. Never Destroy Existing Work

Before applying changes, CodeGraph verifies that the repository still matches the state against which the changeset was generated.

If it does not:

STOP

rather than silently overwriting newer code.

🔮 Future Improvements

Potential future directions include:

AI-powered code review
GitHub PR review comments
Automated handling of CI failures
Test failure analysis
Improved repository-level agent workflows
GitHub issue integration
More language support
More framework-specific architecture detection
Advanced repository change impact analysis

These are intentionally separate from the core repository understanding and safe code-change workflow.

🤝 Contributing

Contributions are welcome.

A typical workflow is:

git checkout -b feature/my-feature

Make your changes, run:

npx tsc --noEmit
npm test

Then open a Pull Request.

📜 License

Add the project's chosen license here.

👨‍💻 Author

Kishore

Built as an AI-powered developer tooling project focused on repository understanding, intelligent code modification, and safe GitHub workflows.

⭐ Why CodeGraph?

Traditional AI coding tools often operate primarily on the code currently visible to the model.

CodeGraph attempts to build a deeper representation of the repository:

Files
  +
Semantic Context
  +
AST
  +
Symbols
  +
Relationships
  +
Architecture
  +
Git History / Changes
        ↓
Repository Intelligence
        ↓
AI-Assisted Development

The result is a workflow where AI doesn't just answer questions about code.
