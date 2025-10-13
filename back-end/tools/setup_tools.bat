@echo off
echo Setting up Code Inspection Tools for Windows...

REM Add tools directory to PATH for current session
set PATH=%PATH%;%~dp0

echo.
echo Tools installed successfully!
echo.
echo Available tools:
echo - TruffleHog3: trufflehog3 --version
echo - GitLeaks: gitleaks version  
echo.
echo To make these tools permanently available, add this directory to your system PATH:
echo %~dp0
echo.
echo Testing tools...
echo.

echo Testing TruffleHog3:
trufflehog3 --version

echo.
echo Testing GitLeaks:
gitleaks version

echo.
echo All tools are ready to use!
pause
