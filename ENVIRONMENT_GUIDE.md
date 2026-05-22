# Conda Environment Setup & Reuse Guide

This guide describes how to restore, reuse, and manage the Anaconda environment (`compare_env`) set up for the **Trajectory Annotation Comparison Visualization**.

---

## 📂 Saved Files in Workspace

We have saved the environment configuration files cleanly in the project directory, removing all local absolute path configurations so that they are 100% portable for any machine:

1. **`environment.yml`**: Full Conda environment definition including exact Python version and default dependencies.
2. **`requirements.txt`**: Standard python package list with exact versions (freeze format), completely free of local path URIs, for standard `pip` installations.
3. **`setup_env.bat`**: A convenient double-click script to restore or update the `compare_env` environment.
4. **`run_server.bat`**: A convenient double-click script to run the visualization server using the correct environment.

---

## ⚡ How to Restore / Reuse the Environment

### Method A: One-Click Restore (Recommended)
Simply double-click the **`setup_env.bat`** file in this directory.
- It will verify if `conda` is installed in your system PATH.
- It offers menu options to:
  1. Create a new `compare_env` environment from scratch using `environment.yml`.
  2. Update the existing `compare_env` environment.
  3. Failback to standard `pip` install using `requirements.txt` if Conda is not found.

### Method B: Manual Command Line Restore

If you prefer to run commands manually, open your **Anaconda Prompt** or terminal and run:

#### 1. Create from Conda config:
```bash
conda env create -f environment.yml
```

#### 2. Or create manually and install packages:
```bash
# Create active 3.10 python environment
conda create -n compare_env python=3.10 -y

# Activate the environment
conda activate compare_env

# Install packages via pip
pip install -r requirements.txt
```

---

## 🚀 Running the Visualization Server

Once the environment is restored:

1. **Via double-click**: Double-click **`run_server.bat`**. It will automatically identify `conda` and launch the visualization page inside the correct environment (`compare_env`).
2. **Via Command Line**:
   ```bash
   conda run -n compare_env --no-capture-output python compare_visulization.py
   ```
   Open your browser to `http://localhost:5000` to interact with the dashboard.

---

## 📦 Installed Packages

- **Python Version**: `3.10.20`
- **Main Web Framework**: `Flask (v3.1.3)`
- **Key Dependencies**: `Werkzeug`, `Jinja2`, `MarkupSafe`, `click`, `blinker`, `colorama`, `itsdangerous`, `packaging`.
