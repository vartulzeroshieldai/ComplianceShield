@echo off
echo ========================================
echo   New Compliance Framework Population
echo ========================================
echo.
echo This script will populate ALL new frameworks into your database.
echo.
echo The script will process the following frameworks:
echo.
echo PRIVACY LAWS:
echo - Australian Privacy Act 2023
echo - California Privacy Protection Act (CPPA)
echo - Singapore PDPA
echo - Thailand PDPA
echo - Saudi Arabia PDPL
echo - Vietnam PDPL
echo - South Africa POPIA
echo - US State Privacy Laws
echo.
echo SECURITY FRAMEWORKS:
echo - CIS Critical Security Controls
echo - NIST Cybersecurity Framework 2.0
echo - NIST AI Risk Management Framework
echo - NIST SP 800-39
echo - HITRUST CSF
echo - PCI DSS
echo - SOC 2
echo.
echo CLOUD & AI GOVERNANCE:
echo - CSA STAR
echo - FEAT Principles
echo - US State AI Laws
echo - WHO AI Governance
echo.
echo FINANCIAL REGULATIONS:
echo - GLBA
echo - RBI Cyber Security Framework
echo - SEBI CSCRF
echo.
echo The script will:
echo 1. Check if frameworks already exist
echo 2. Create them if they don't exist
echo 3. Clear existing data if they do exist (to avoid duplicates)
echo 4. Parse CSV files and populate clauses/sub-clauses
echo 5. Show you the final count of frameworks
echo.
echo Press any key to continue or Ctrl+C to cancel...
pause

echo.
echo Starting population process...
echo.

python populate_all_new_frameworks.py

echo.
echo ========================================
echo   Population Process Complete
echo ========================================
echo.
echo Check the output above for detailed results.
echo.
pause
