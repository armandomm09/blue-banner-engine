# Contributing to the Blue Banner Engine (BBE)

First off, thank you for considering contributing to the Blue Banner Engine! We're thrilled you're interested in helping us build the next generation of FRC scouting tools. This project is a community effort, and we welcome all forms of contribution, from code and documentation to ideas and bug reports.

This document provides guidelines for setting up your development environment and contributing to the project.

## Table of Contents
- [How to Contribute](#how-to-contribute)
- [Development Setup](#development-setup)
  - [Prerequisites](#prerequisites)
  - [Step-by-Step Instructions](#step-by-step-instructions)
- [Running the Project for Development](#running-the-project-for-development)
  - [A. For Backend (Python/Go) Development](#a-for-backend-pythongo-development)
  - [B. For Frontend (React UI) Development](#b-for-frontend-react-ui-development)
  - [C. Running the Full Stack](#c-running-the-full-stack)
- [Code of Conduct](#code-of-conduct)

## How to Contribute
We use a standard GitHub workflow for contributions:

1.  **Open an Issue:** If you have an idea for a new feature or have found a bug, please [open an issue](https://github.com/armandomm09/blue-banner-engine/issues) first to discuss it. This allows us to coordinate efforts and prevent duplicate work.
2.  **Fork the Repository:** Create your own copy of the project to work on.
3.  **Create a New Branch:** Make a new branch in your fork for your changes (`git checkout -b feature/your-awesome-feature`).
4.  **Make Your Changes:** Implement your feature or fix the bug.
5.  **Submit a Pull Request (PR):** Push your changes to your fork and open a Pull Request against our `main` branch. Please provide a clear description of your changes in the PR.

## Development Setup

This guide will walk you through setting up a complete local development environment for BBE.

### Prerequisites
Before you begin, ensure you have the following tools installed on your system with the specified versions:
- **Python:** `3.13.3`
- **Go:** `1.24.4`
- **Node.js:** `v22.17.0`
- **npm:** `10.2.3`
- **Docker & Docker Compose:** Latest stable versions.
- **Git:** Latest stable version.
- **Tmux:** Required for the `devmode.sh` script. (e.g., `sudo apt-get install tmux` or `brew install tmux`)

### Step-by-Step Instructions

#### 1. Clone the Repository
Clone the project to your local machine:
```bash
git clone https://github.com/armandomm09/blue-banner-engine.git
cd blue-banner-engine
```

#### 2. Create the Environment File
Copy the example environment file. You will need to edit this file to add your personal API key from The Blue Alliance.
```bash
cp .env.example .env
```
Now, open the `.env` file and add your key:
```dotenv
TBA_API_KEY="YOUR_TBA_API_KEY_HERE"
SWAGGER_HOST=localhost:8080
VITE_TESTING=true
```

#### 3. Manually Download Project Assets (Models & Data)
This project requires pre-trained models and a data file to function correctly. You must download these assets manually.

**a) Download the Models:**
1.  Click this link to download the models zip file: [BBE Models on Google Drive](https://drive.google.com/file/d/1r5QSnRhgwjnC6baB74pGByVYoR3r-QcP/view?usp=sharing).
2.  Create a `models` folder in the root directory of the project.
3.  Unzip the downloaded file and place all model files (`.json`, `.pt`, etc.) directly inside the `models/` folder.

**b) Download the Statbotics Data:**
1.  Click this link to download the data CSV file: [Statbotics Data on Google Drive](https://drive.google.com/file/d/1usXa_2buqVIkvcDJHktXaiK_HrY8ECMW/view?usp=sharing).
2.  Create a `data` folder inside the `matchpoint/` directory.
3.  Rename the downloaded file to `data.csv` and place it inside the `matchpoint/data/` folder.

After this step, your directory structure should look like this:
```
blue-banner-engine/
├── models/
│   ├── classification.json
│   ├── red_model.json
│   └── ... (other model files)
├── matchpoint/
│   ├── data/
│   │   └── data.csv
│   └── ...
└── ... (other project files)
```

#### 4. Set Up the Python Backend
Create a virtual environment and install the required Python dependencies.
```bash
# Create the virtual environment in the root directory
python3 -m venv .venv

# Activate the virtual environment
# On macOS/Linux:
source .venv/bin/activate
# On Windows:
# .\.venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

#### 5. Set Up the React Frontend
Navigate to the UI directory and install the npm dependencies.
```bash
cd bbe-ui
npm install
cd ..
```

Your setup is now complete!

## Running the Project for Development

We offer several ways to run the project depending on what you're working on.

### A. For Backend (Python/Go) Development
This mode is ideal if you are making changes to the Python or Go backend services. It uses `tmux` to run all services in a single terminal window. **This method does not provide hot-reloading.** After making a code change, you must stop the script (`Ctrl+C`) and run it again to apply your changes.

**Prerequisite:** You must have `tmux` installed.

To start all backend services, run the development script from the root of the project:
```bash
./devmode.sh
```

### B. For Frontend (React UI) Development
This mode is best if you are only working on the React user interface. It runs the backend services in Docker and the UI with Vite's development server for an excellent hot-reloading experience.

1.  **Start the backend services using Docker Compose:**
    ```bash
    docker-compose up --build -d
    ```
    This command will build and run the `go-api` and `python-predictor` services in the background.

2.  **Start the UI development server:**
    ```bash
    cd bbe-ui
    npm run dev
    ```
    You can now access the UI at `http://localhost:5173` and any changes you make to the React code will be reflected instantly in your browser.

### C. Running the Full Stack (Production-like)
This method runs the entire application stack, including the UI, within Docker containers. This is useful for testing the final build but does not offer hot-reloading for development.

1.  **Build and run all services:**
    *(Note: This requires you to have a complete `docker-compose.yml` that includes the `bbe-ui` service.)*
    ```bash
    docker-compose up --build -d
    ```

2.  **Access the application:**
    - The Go API will be available at `http://localhost:8080`.
    - The React UI will be available at the port configured for its service (e.g., `http://localhost:5173`).

3.  **To stop all application services:**
    ```bash
    docker-compose down
    ```

## Code of Conduct
Please note that this project is released with a Contributor Code of Conduct. By participating in this project, you agree to abide by its terms.
