@echo off
title Flask Scheduling Server

echo Setting up database connection...
set DATABASE_URL=postgresql://postgres:soosan2025!@localhost:5432/mydatabase

echo Changing to project directory...
cd /d C:\Users\Administrator\Downloads\Flask_Scheduling

echo Activating virtual environment...
call venv\Scripts\activate.bat

echo Starting Flask Server...
waitress-serve --host 0.0.0.0 --port 80 app:app