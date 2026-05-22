@echo off
title Anaconda Environment Setup - Compare Visualization
echo =======================================================================
echo               Anaconda Environment Restore and Setup
echo =======================================================================
echo.
echo This script will help you restore/create the Conda environment
echo "compare_env" for the Trajectory Annotation Comparison visualization.
echo.

:: Check if conda is available
where conda >nul 2>&1
if %errorlevel% neq 0 (
    echo [WARNING] "conda" was not found in your system PATH.
    echo Please make sure Anaconda or Miniconda is installed and added to PATH.
    echo.
    echo If you want to use standard pip instead, press any key to install
    echo dependencies in your active Python environment using requirements.txt.
    echo Otherwise, close this window and run from an Anaconda Prompt.
    echo.
    pause
    echo Installing dependencies via pip...
    python -m pip install -r requirements.txt
    goto END
)

echo [INFO] "conda" is detected!
echo.
echo [1] Create a new Conda environment "compare_env" (Recommended)
echo [2] Update existing "compare_env" environment (if already created)
echo [3] Exit
echo.
set /p choice="Enter choice (1, 2, or 3): "

if "%choice%"=="1" (
    echo Creating Conda environment "compare_env"...
    conda env create -f environment.yml
    goto FINISH
)
if "%choice%"=="2" (
    echo Updating Conda environment "compare_env"...
    conda env update -f environment.yml
    goto FINISH
)
if "%choice%"=="3" (
    echo Exiting...
    goto END
)

:FINISH
echo.
echo =======================================================================
echo Setup complete! To start the server in the future, you can:
echo 1. Run the "run_server.bat" script in this directory.
echo 2. Or run: conda run -n compare_env python compare_visulization.py
echo =======================================================================
echo.

:END
pause
