# 🛡️ GRC Platform

### _Advanced Governance, Risk & Compliance Management System_

![GRC Platform Logo](front-end/public/logo.svg)  
_GRC Platform - Comprehensive Compliance & Risk Management Solution_

**License:** MIT | **Python** | **Django** | **React** | **TypeScript** | **TailwindCSS** | **Docker**

## 🚀 Quick Start

### Prerequisites
- Docker & Docker Compose
- Node.js 18+ (for local development)
- Python 3.9+ (for local development)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd GRC
   ```

2. **Start with Docker Compose (Recommended)**
   ```bash
   docker-compose up -d
   ```

3. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000
   - MobSF Security Scanner: http://localhost:8001

## Table of Contents

- [About](#about)
- [Core Mission](#core-mission)
- [Key Capabilities](#key-capabilities)
- [Architecture Overview](#architecture-overview)
- [Feature Overview](#feature-overview)
- [Compliance Frameworks](#compliance-frameworks)
- [Security Features](#security-features)
- [Tech Stack](#tech-stack)
- [API Documentation](#api-documentation)
- [Development Setup](#development-setup)
- [Deployment](#deployment)
- [Contributing](#contributing)
- [Support](#support)

---

## About

**GRC Platform** is a comprehensive Governance, Risk, and Compliance management system designed to help organizations streamline their compliance processes, manage risks effectively, and maintain governance standards across multiple frameworks. The platform integrates advanced privacy detection, automated auditing, and real-time compliance monitoring to provide a unified view of organizational risk and compliance posture.

---

## Core Mission

Empower organizations to achieve and maintain compliance across multiple frameworks while effectively managing risks through automated workflows, intelligent monitoring, and comprehensive reporting. The platform bridges the gap between governance requirements, risk management, and operational compliance, enabling secure and compliant digital operations.

---

## Key Capabilities

### 🏛️ **Governance Management**
- Multi-framework compliance support (ISO 27001, GDPR, PCI DSS, SOC2, NIST, HIPAA)
- Automated policy management and approval workflows
- Role-based access control with organization-level segregation
- Comprehensive audit trails and activity logging

### ⚠️ **Risk Management**
- Automated risk identification and assessment
- Risk scoring and prioritization algorithms
- Mitigation tracking and progress monitoring
- Risk reporting and dashboard analytics

### ✅ **Compliance Monitoring**
- Real-time compliance status tracking
- Automated evidence collection and validation
- Compliance gap analysis and remediation guidance
- Multi-framework compliance mapping

### 🔍 **Privacy Detection & Analysis**
- Automated Privacy Impact Assessment (PIA)
- Data Protection Impact Assessment (DPIA)
- Records of Processing Activities (RoPA) generation
- Code-level privacy vulnerability scanning
- Mobile application security analysis

### 🤖 **AI-Powered Chatbot**
- Intelligent compliance assistance
- Automated questionnaire responses
- Risk assessment guidance
- Policy interpretation support

---

## Architecture Overview

The GRC Platform follows a modern microservices architecture with the following components:

### Backend Services
- **Django REST API** - Core business logic and data management
- **PostgreSQL** - Primary database for structured data
- **Redis** - Caching and session management
- **MobSF Integration** - Mobile security framework integration

### Frontend Application
- **React 19** - Modern, responsive user interface
- **TailwindCSS** - Utility-first CSS framework
- **Chart.js** - Data visualization and analytics
- **JWT Authentication** - Secure user authentication

### Security & Privacy Tools
- **Privacy Detection Engine** - Automated privacy compliance scanning
- **Code Analysis Scanner** - Static application security testing
- **Cookie Analysis** - Web application privacy compliance
- **Security Headers Scanner** - HTTP security configuration analysis

---

## Feature Overview

### 1. **Compliance Framework Management**
- **Multi-Framework Support**: ISO 27001, GDPR, PCI DSS, SOC2, NIST, HIPAA
- **Clause Management**: Hierarchical clause and sub-clause organization
- **Project-Based Compliance**: Framework-specific compliance projects
- **Progress Tracking**: Real-time compliance progress monitoring

### 2. **Risk Management System**
- **Risk Identification**: Automated and manual risk registration
- **Risk Assessment**: Likelihood and impact scoring
- **Risk Mitigation**: Action item tracking and progress monitoring
- **Risk Reporting**: Comprehensive risk dashboards and reports

### 3. **Evidence Management**
- **File Upload**: Secure evidence file management
- **Approval Workflows**: Multi-level evidence approval processes
- **Version Control**: Evidence versioning and change tracking
- **Compliance Mapping**: Evidence-to-clause relationship management

### 4. **Privacy Detection Platform**
- **PIA Generation**: Automated Privacy Impact Assessments
- **DPIA Analysis**: Data Protection Impact Assessment automation
- **RoPA Creation**: Records of Processing Activities generation
- **Code Scanning**: Static analysis for privacy vulnerabilities
- **Mobile Security**: Mobile application privacy and security analysis

### 5. **Audit Management**
- **Auditor Assignment**: Automated auditor allocation
- **Review Workflows**: Structured audit review processes
- **Comment System**: Collaborative audit discussions
- **Action Items**: Task management and tracking

### 6. **User Management & Access Control**
- **Organization-Based Access**: Multi-tenant architecture
- **Role-Based Permissions**: Admin, Auditor, User roles
- **User Approval Workflows**: New user approval processes
- **Session Management**: Secure authentication and authorization

---

## Compliance Frameworks

| Framework | Status | Coverage | Key Features |
|-----------|--------|----------|--------------|
| **ISO 27001:2022** | ✅ Supported | Complete | Information Security Management |
| **GDPR** | ✅ Supported | Complete | Data Protection & Privacy |
| **PCI DSS** | ✅ Supported | Complete | Payment Card Industry Security |
| **SOC2** | ✅ Supported | Complete | Service Organization Controls |
| **NIST** | ✅ Supported | Complete | Cybersecurity Framework |
| **HIPAA** | ✅ Supported | Complete | Healthcare Data Protection |

### Compliance Mapping Features
- **Automated Control Mapping**: Framework controls to organizational processes
- **Gap Analysis**: Identification of compliance gaps and remediation steps
- **Evidence Linking**: Direct mapping of evidence to specific controls
- **Progress Tracking**: Real-time compliance status across all frameworks

---

## Security Features

### Application Security
- **JWT Authentication**: Secure token-based authentication
- **Role-Based Access Control**: Granular permission management
- **CORS Protection**: Cross-origin request security
- **Input Validation**: Comprehensive input sanitization
- **SQL Injection Protection**: Django ORM security

### Data Protection
- **Encrypted Storage**: Sensitive data encryption at rest
- **Secure File Upload**: Antivirus scanning and file validation
- **Data Retention Policies**: Automated data lifecycle management
- **Audit Logging**: Comprehensive activity tracking

### Privacy Compliance
- **Data Minimization**: Collection of only necessary data
- **Consent Management**: User consent tracking and management
- **Right to Erasure**: GDPR-compliant data deletion
- **Data Portability**: Export capabilities for user data

---

## Tech Stack

### Backend
- **Framework**: Django 5.2.5 with Django REST Framework
- **Database**: PostgreSQL 15 with SQLite for development
- **Authentication**: JWT with SimpleJWT
- **Caching**: Redis 7
- **Security**: CORS headers, input validation, file scanning

### Frontend
- **Framework**: React 19 with Vite
- **Styling**: TailwindCSS 4.1.11
- **Charts**: Chart.js with React integration
- **Routing**: React Router DOM
- **State Management**: Context API with custom hooks

### DevOps & Infrastructure
- **Containerization**: Docker & Docker Compose
- **Web Server**: Nginx reverse proxy
- **Security Scanning**: MobSF integration
- **Development**: Hot reload, ESLint, Prettier

### Privacy & Security Tools
- **Static Analysis**: Custom code scanners
- **Mobile Security**: MobSF integration
- **Cookie Analysis**: Web privacy compliance
- **Security Headers**: HTTP security validation

---

## API Documentation

### Authentication Endpoints
```http
POST /api/auth/login/          # User login
POST /api/auth/refresh/        # Token refresh
POST /api/auth/logout/         # User logout
```

### Compliance Endpoints
```http
GET  /api/frameworks/          # List compliance frameworks
GET  /api/projects/            # List compliance projects
POST /api/projects/            # Create new project
GET  /api/controls/            # List compliance controls
```

### Risk Management Endpoints
```http
GET  /api/risks/               # List risks
POST /api/risks/               # Create risk
PUT  /api/risks/{id}/          # Update risk
GET  /api/action-items/        # List action items
```

### Privacy Detection Endpoints
```http
POST /api/privacy/scan/        # Initiate privacy scan
GET  /api/privacy/results/     # Get scan results
POST /api/privacy/pia/         # Generate PIA report
POST /api/privacy/dpia/        # Generate DPIA report
```

### Evidence Management Endpoints
```http
POST /api/evidence/upload/     # Upload evidence
GET  /api/evidence/            # List evidence
PUT  /api/evidence/{id}/approve/ # Approve evidence
```

---

## Development Setup

### Local Development

1. **Backend Setup**
   ```bash
   cd back-end
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   python manage.py migrate
   python manage.py runserver
   ```

2. **Frontend Setup**
   ```bash
   cd front-end
   npm install
   npm run dev
   ```

3. **Database Setup**
   ```bash
   # Using PostgreSQL
   createdb grc_platform
   python manage.py migrate
   python manage.py createsuperuser
   ```

### Environment Variables

Create `.env` files in both `back-end/` and `front-end/` directories:

**Backend (.env)**
```env
DEBUG=True
SECRET_KEY=your-secret-key
DATABASE_URL=postgresql://user:password@localhost:5432/grc_platform
REDIS_URL=redis://localhost:6379/0
MOBSF_API_URL=http://localhost:8001
MOBSF_API_KEY=your-mobsf-key
```

**Frontend (.env)**
```env
VITE_API_BASE_URL=http://localhost:8000
VITE_APP_NAME=GRC Platform
```

---

## Deployment

### Docker Deployment

1. **Production Configuration**
   ```bash
   # Update docker-compose.yml for production
   docker-compose -f docker-compose.prod.yml up -d
   ```

2. **Environment Setup**
   ```bash
   # Set production environment variables
   export DEBUG=False
   export SECRET_KEY=your-production-secret-key
   export DATABASE_URL=postgresql://user:password@db:5432/grc_platform
   ```

### Cloud Deployment

The platform is designed to be cloud-ready with support for:
- **AWS**: ECS, RDS, ElastiCache
- **Azure**: Container Instances, SQL Database, Redis Cache
- **Google Cloud**: Cloud Run, Cloud SQL, Memorystore

---

## Contributing

We welcome contributions from the compliance and security community! Here's how you can get involved:

### 🚀 Getting Started
1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes and add tests
4. Commit your changes: `git commit -m 'Add amazing feature'`
5. Push to the branch: `git push origin feature/amazing-feature`
6. Open a Pull Request

### 🤝 Contribution Areas
- **New Compliance Frameworks**: Add support for additional compliance standards
- **Security Enhancements**: Improve security features and vulnerability scanning
- **UI/UX Improvements**: Enhance user experience and interface design
- **API Extensions**: Add new API endpoints and functionality
- **Documentation**: Improve documentation and add examples

### 🔗 Community
- **Issues**: Report bugs and request features
- **Discussions**: Join community discussions and share ideas
- **Security Research**: Contribute new compliance analysis techniques

---

## Support

### 📞 Contact Information
- **General Support**: [Your Support Email]
- **Technical Issues**: [Your Technical Support Email]
- **Security Concerns**: [Your Security Email]

### 📚 Documentation
- **API Documentation**: Available at `/api/docs/` when running locally
- **User Guide**: Comprehensive user documentation (coming soon)
- **Developer Guide**: Technical documentation for contributors

### 🆘 Getting Help
1. **Check the Issues**: Search existing GitHub issues
2. **Create an Issue**: For bugs or feature requests
3. **Join Discussions**: For questions and community support
4. **Contact Support**: For urgent or sensitive matters

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## Acknowledgments

- **Django Community** for the excellent web framework
- **React Team** for the powerful frontend library
- **MobSF** for mobile security framework integration
- **Open Source Community** for various tools and libraries used

---

> **Value Proposition:**  
> "GRC Platform transforms complex compliance and risk management challenges into streamlined, automated workflows—empowering organizations to achieve and maintain compliance with confidence while effectively managing risks across multiple frameworks."

---

**GRC Platform** - *Comprehensive Compliance & Risk Management for the Modern Enterprise*
