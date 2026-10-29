@echo off
rem Start MySQL 8.4 on port 3307 without installing it as a service.
rem Uses the ZIP build in %USERPROFILE%\mysql84, or the MSI install in Program Files.
rem Usage: mysql-local.cmd [folder]   (default: %USERPROFILE%\mysql84)
setlocal
set "BASE=%~1"
if "%BASE%"=="" set "BASE=%USERPROFILE%\mysql84"
set "DATA=%BASE%\data"
set "MYSQLD=%BASE%\bin\mysqld.exe"
if not exist "%MYSQLD%" set "MYSQLD=%ProgramFiles%\MySQL\MySQL Server 8.4\bin\mysqld.exe"

if not exist "%MYSQLD%" (
  echo mysqld.exe was not found in either of these places:
  echo   %BASE%\bin\mysqld.exe
  echo   %ProgramFiles%\MySQL\MySQL Server 8.4\bin\mysqld.exe
  echo Extract the MySQL 8.4 ZIP so that the first one exists, then run again.
  exit /b 1
)
echo Using %MYSQLD%

if not exist "%DATA%" (
  echo First run: creating the data folder %DATA% . The root password is empty.
  if not exist "%BASE%" mkdir "%BASE%"
  "%MYSQLD%" --initialize-insecure --datadir="%DATA%" --console
  if errorlevel 1 exit /b 1
)

echo Starting MySQL on port 3307. Keep this window open. Press Ctrl+C to stop.
"%MYSQLD%" --datadir="%DATA%" --port=3307 --mysqlx=OFF --console
