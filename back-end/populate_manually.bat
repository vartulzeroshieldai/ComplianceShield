@echo off
echo This script will populate the new frameworks into your database.
echo.
echo Make sure you have Python installed and Django dependencies available.
echo.
echo The script will:
echo 1. Add ISO 27799:2016 (Health Informatics)
echo 2. Add ISO 42001:2023 (AI Management System)
echo 3. Ensure no duplicate entries
echo.
pause

echo Starting population...
python populate_direct.py

echo.
echo Population complete! Check the output above for results.
pause
















