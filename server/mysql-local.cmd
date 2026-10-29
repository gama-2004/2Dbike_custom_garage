@echo off
rem Start MySQL 8.4 (ZIP version) on port 3307 without installing it as a service.
rem Usage: mysql-local.cmd [folder]   (default: %USERPROFILE%\mysql84)
setlocal
set "BASE=%~1"
if "%BASE%"=="" set "BASE=%USERPROFILE%\mysql84"
set "MYSQLD=%BASE%\bin\mysqld.exe"
set "DATA=%BASE%\data"

if not exist "%MYSQLD%" (
  echo mysqld.exe was not found: %MYSQLD%
  echo Extract the MySQL 8.4 ZIP so that this file exists, then run again.
  exit /b 1
)

if not exist "%DATA%" (
  echo First run: creating the data folder. The root password is empty.
  "%MYSQLD%" --initialize-insecure --datadir="%DATA%" --console
  if errorlevel 1 exit /b 1
)

echo Starting MySQL on port 3307. Keep this window open. Press Ctrl+C to stop.
"%MYSQLD%" --datadir="%DATA%" --port=3307 --mysqlx=OFF --console
