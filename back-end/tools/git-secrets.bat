@echo off
REM Git Secrets wrapper for Windows
REM Calls the actual git-secrets bash script using Git Bash

REM Path to the actual git-secrets script
set GIT_SECRETS_PATH=E:\compliances\GRC\git-secrets

REM Path to Git Bash
set BASH_PATH=C:\Program Files\Git\bin\bash.exe

REM Check if git-secrets exists
if not exist "%GIT_SECRETS_PATH%" (
    echo Error: git-secrets not found at %GIT_SECRETS_PATH%
    exit /b 1
)

REM Check if bash exists
if not exist "%BASH_PATH%" (
    echo Error: Git Bash not found at %BASH_PATH%
    exit /b 1
)

REM Call git-secrets with all arguments using Git Bash
"%BASH_PATH%" "%GIT_SECRETS_PATH%" %*
exit /b %ERRORLEVEL%
