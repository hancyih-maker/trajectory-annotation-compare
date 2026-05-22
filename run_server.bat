@echo off
title Trajectory Annotation Comparison Server
echo =======================================================================
echo          Starting Trajectory Annotation Comparison Server
echo =======================================================================
echo.

:: Try running with the specific Anaconda environment path or name
where conda >nul 2>&1
if %errorlevel% equ 0 (
    echo [INFO] Conda detected. Launching Flask server via conda run...
    conda run -n compare_env --no-capture-output python compare_visulization.py
) else (
    echo [WARNING] Conda not found in PATH.
    echo Trying to launch using the local python environment...
    python compare_visulization.py
)

echo.
echo Server stopped.
pause
