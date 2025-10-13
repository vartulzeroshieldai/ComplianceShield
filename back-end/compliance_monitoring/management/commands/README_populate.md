# Framework Population Commands

This directory contains Django management commands for populating compliance frameworks from CSV files.

## Available Commands

### 1. `populate_data.py` (Original)
- Processes a single CSV file
- Hardcoded for specific framework
- Good for testing individual frameworks

### 2. `populate_all_frameworks.py` (Enhanced)
- Processes multiple CSV files with different formats
- Configurable framework selection
- Handles various CSV structures automatically

## Usage

### Populate All Frameworks
```bash
python manage.py populate_all_frameworks
```

### Populate Specific Framework
```bash
python manage.py populate_all_frameworks --framework GDPR
```

### Clear Existing Data and Repopulate
```bash
python manage.py populate_all_frameworks --framework ISO27001 --clear-existing
```

## Supported Frameworks

The enhanced script supports the following frameworks:

- **APPI** - Act on the Protection of Personal Information (Japan)
- **China_AI** - China Generative AI Measures
- **COBIT** - COBIT 2019
- **DORA** - Digital Operational Resilience Act
- **DPDPA** - Digital Personal Data Protection Act (India)
- **ePrivacy** - ePrivacy Directive
- **EU_AI_Act** - EU AI Act
- **DPF** - Data Privacy Framework
- **GDPR** - General Data Protection Regulation
- **HIPAA** - HIPAA Privacy Rule
- **IEEE_EAD** - IEEE Ethical AI Design
- **ISO27001** - ISO 27001:2022
- **ISO27002** - ISO 27002:2022
- **ISO27017** - ISO 27017:2015
- **ISO27018** - ISO 27018:2019
- **LGPD** - Brazilian Data Protection Law
- **OECD_AI** - OECD AI Principles
- **PIPEDA** - PIPEDA (Canada)
- **PIPL** - China Personal Information Protection Law

## CSV File Requirements

Each CSV file should contain at least these columns (column names may vary):
- **Reference** - Unique identifier for the clause (e.g., "A.5.1", "Art. 17")
- **Title/Clause** - Title or name of the clause
- **Description** - Detailed description of the requirement

## Data Structure

The script creates a hierarchical structure:
- **Framework** (top-level, e.g., "GDPR")
- **Clause** (main clauses, e.g., "Art. 17")
- **SubClause** (sub-clauses, e.g., "Art. 17.1")

## Troubleshooting

### Missing Columns Error
If you get a "Missing columns" error, check that your CSV file has the expected column names. The script will show available columns.

### File Not Found Error
Ensure CSV files are in the `compliance_monitoring/` directory.

### Parent Clause Not Found
This happens when a sub-clause references a parent that doesn't exist. The script will create it as a main clause instead.

## Customization

To add a new framework:

1. Add the framework configuration to `framework_configs` in `populate_all_frameworks.py`
2. Ensure the CSV file is in the correct location
3. Test with a single framework first: `--framework YourFramework`




