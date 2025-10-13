@echo off
cd /d "%~dp0"
venv\Scripts\python.exe manage.py populate_new_frameworks --verbosity=2
pause
















