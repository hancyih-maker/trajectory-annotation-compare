# Trajectory Annotation Comparison & Alignment Platform

An elegant, high-fidelity visual dashboard designed for comparing and analyzing multi-agent LLM failure attribution annotations between researchers.

This platform aligns step-level traces (coordinator decisions, expert reasoning cycles, tool actions, and final answers) and computes fine-grained annotator agreement rates to enhance dataset consistency.

---

## ✨ Features

- 🌓 **Premium Light Theme Design**: Modern, responsive slate design featuring clean card hierarchies, color-coded left timeline indicators, and smooth glassmorphic stats blocks.
- 📊 **Granular Metrics Dashboard**: Computes real-time head-to-head researcher alignment on four distinct dimensions:
  - **Overall Label Agreement Rate**: Based on all mutually annotated steps.
  - **Coordinator Thinking Agreement Rate**: Focuses exclusively on high-level macro planning steps.
  - **Expert Response Agreement Rate**: Analyzes internal expert reasoning cycles.
  - **Final Answer Agreement Rate**: Measures alignment on final diagnostic verdicts.
- 🔄 **Dual Interactive Modes**:
  - **Preloaded Mode**: Automatically loads, merges, and presents the latest local annotation datasets found in the directory dynamically based on modification times.
  - **Upload Mode**: Allows users to drop two customized researcher annotation JSON files directly into the browser to align, merge, and visualize them on-the-fly.
- 🔬 **Union & Chronological Alignment**: Supports union step display and fallback reconstruction to visualize 100% of annotated trajectories, even if they are not in the baseline preloaded datasets.
- 🔍 **Interactive Filtering**: Easily search through trajectory questions or filter exclusively for annotations with active mismatches/disagreements to accelerate dataset cleanup.
- ⚙️ **One-Click Local Environment Setup**: Includes Windows batch scripts to set up, update, and launch the Anaconda environment effortlessly.

---

## 📂 Repository Structure

```text
├── frontend/
│   ├── compare.html        # HTML structure of the visualization dashboard
│   ├── styles.css          # Modern light mode theme and timeline styling
│   └── app.js              # Frontend logic, alignment calculations, and DOM rendering
├── compare_visulization.py  # Python Flask backend (merging, alignment engine, API)
├── environment.yml         # Conda environment definition (portable, prefix-free)
├── requirements.txt        # Exact versions of Python dependencies
├── setup_env.bat           # Automated environment setup script
├── run_server.bat          # One-click script to run the Flask server
├── ENVIRONMENT_GUIDE.md    # Detailed guide on Conda environment management
├── annotation_handbook.md  # Taxonomy guidelines for annotating LLM traces
└── README.md               # This project documentation
```

---

## ⚡ Quick Start (Local Run)

### Prerequisites
* [Anaconda](https://www.anaconda.com/) or [Miniconda](https://docs.conda.io/en/latest/miniconda.html) installed.

### 1. Set Up the Environment
Double-click **`setup_env.bat`** in the project root directory. This interactive script will:
- Check if Conda is in your PATH.
- Create a dedicated Conda environment (`compare_env`) and install all required packages.
- Fallback to standard pip requirements if Conda is not present.

*Alternatively, run manually in Anaconda Prompt:*
```bash
conda env create -f environment.yml
```

### 2. Run the Visualization Server
Double-click **`run_server.bat`** or run:
```bash
conda run -n compare_env --no-capture-output python compare_visulization.py
```

Open your browser and navigate to **`http://localhost:5000`** to access the dashboard.

---

## 📦 What Files Should I Upload to GitHub?

### Files to Commit (Highly Recommended)
- `frontend/` (contains `compare.html`, `styles.css`, `app.js`)
- `compare_visulization.py`
- `environment.yml` & `requirements.txt`
- `setup_env.bat` & `run_server.bat`
- `ENVIRONMENT_GUIDE.md` & `annotation_handbook.md`
- `README.md` & `.gitignore`

### Files to Keep Local (Optional/Ignored)
- Large datasets or sensitive research annotations (e.g. `subset_40_stratified.jsonl`, `Arun-*.json`, `chenyi-*.json`).
- If you decide to share your codebase cleanly, you can exclude these files via `.gitignore`. The dashboard's **"Upload Annotations"** tab allows any other user to upload their own annotation files directly from their browser, making the codebase highly portable and reusable for other research teams!
