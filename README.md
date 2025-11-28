# SIMKA - Sistem Informasi Manajemen Kredit & Agunan

## Overview
SIMKA is a comprehensive web-based Credit and Collateral Management System designed specifically for Indonesian banking and financial institutions. It transforms manual, paper-based processes into a digital, structured, and proactive system.

## Key Features

### 🎯 Interactive Monitoring Dashboard
- Real-time alerts for insurance expiration (30, 60, 90 days)
- Tax payment reminders for properties and vehicles
- Credit maturity notifications
- Incomplete document tracking
- Quick statistics and visual charts

### 📋 Digital Filing Cabinet
- Complete debtor profiles with KTP, contact, and employment data
- Detailed credit facility information
- Payment history and restructuring records
- Color-coded credit status (Green-Current, Yellow-Watch, Red-NPL, Blue-Paid)

### 🏠 Collateral Management
- Structured data entry for properties (SHM/SHGB) and vehicles (BPKB)
- Digital document storage with OCR capabilities
- Physical document location tracking
- Document borrowing history

### 🔔 Automated Notification System
- Email and in-app notifications
- Automated task creation
- Proactive monitoring alerts

### 🔍 Smart Search & Reporting
- Universal search across all data
- Flexible report generation
- Excel/PDF export capabilities

### 👥 User Management
- Role-based access control
- Activity logging for audit trails
- Multi-level permissions

## Technology Stack
- **Frontend**: React.js with modern UI components
- **Backend**: Node.js with Express.js
- **Database**: PostgreSQL
- **File Storage**: Cloud storage integration
- **Authentication**: JWT-based security

## Getting Started

### Prerequisites
- Node.js (v16 or higher)
- PostgreSQL (v12 or higher)
- npm or yarn

### Installation
```bash
# Clone and setup
git clone <repository-url>
cd SIMKA

# Install all dependencies
npm run setup

# Start development server
npm run dev
```

### Environment Setup
Create `.env` files in both server and client directories with required configuration.

## Project Structure
```
SIMKA/
├── client/          # React frontend
├── server/          # Node.js backend
├── docs/           # Documentation
└── database/       # Database scripts
```

## Contributing
Please read our contributing guidelines and code of conduct before submitting pull requests.

## License
MIT License - see LICENSE file for details.
