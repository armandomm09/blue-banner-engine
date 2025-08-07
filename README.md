<div align="center">


<p align="center">
<img height="250" alt="bbe_logo_no_name" src="https://github.com/user-attachments/assets/ddf7a9fc-b3ef-453f-b34a-bd677e8fd967" />
</p>

# `⚙️🔵 Blue Banner Engine (BBE)`

**An AI-driven scouting and strategy platform designed to provide FRC teams with a decisive competitive edge by transforming data into actionable intelligence.**

![Open Source](https://img.shields.io/badge/open%20source-8A2BE2)
![GitHub commit activity](https://img.shields.io/github/commit-activity/w/armandomm09/blue-banner-engine)
![GitHub Actions Workflow Status](https://img.shields.io/github/actions/workflow/status/armandomm09/blue-banner-engine/deploy.yml)
![Website](https://img.shields.io/website?url=https%3A%2F%2Fbbe-frc.com)
![Swagger Validator](https://img.shields.io/swagger/valid/3.0?specUrl=https%3A%2F%2Fbbe-frc.com%2Fswagger.json)
![GitHub go.mod Go version](https://img.shields.io/github/go-mod/go-version/armandomm09/blue-banner-engine)
![GitHub code size in bytes](https://img.shields.io/github/languages/code-size/armandomm09/blue-banner-engine)



</div>

## Table of Contents

- [Project Vision](#project-vision)
- [Core Features & Modules](#core-features--modules)
- [System Architecture](#system-architecture)
- [Tech Stack](#tech-stack)
- [Getting Started & Setup](#getting-started--setup)
  - [Prerequisites](#prerequisites)
  - [Configuration](#configuration)
  - [Running the Application](#running-the-application)
- [Contributing](#contributing)
- [License](#license)
- [Acknowledgments](#acknowledgments)

---

## Project Vision

In the competitive world of FIRST Robotics Competition, success is born from a blend of robust engineering and brilliant strategy. While most teams excel at the former, strategic decision-making often relies on intuition, incomplete data, and biased observations.

The **Blue Banner Engine (BBE)** aims to revolutionize FRC scouting by replacing guesswork with data science. Our mission is to build an open-source suite of intelligent tools that provide clear, actionable, and predictive insights. We empower teams to understand not just *what* happened, but *why* it happened and *what* is most likely to happen next, ultimately leading to more wins and more Blue Banners.

---

## Core Features & Modules

BBE is built on five interconnected pillars, each designed to solve a specific strategic challenge.

### 1. `Matchpoint` (MP) - The Oracle
- **What:** A machine learning model that predicts match outcomes, including the winning alliance and the final scores.
- **Why:** To provide an objective, data-driven forecast for upcoming matches, allowing teams to prioritize strategy and make informed decisions on offensive vs. defensive playstyles.
- **How:** By training a Gradient Boosting model (XGBoost) on thousands of historical match data points from The Blue Alliance and Statbotics.

### 2. `OPL` (Optimal Pick-Lister) - The Architect
- **What:** A simulation-based system that generates an **Optimal Pick List (OPL)** for alliance selection.
- **Why:** Alliance selection is the single most impactful moment of a competition. AOS moves beyond simple rankings to identify which available teams offer the greatest *synergistic advantage*, maximizing the probability of winning the elimination tournament.
- **How:** It uses a Monte Carlo simulation to run thousands of hypothetical tournament brackets, leveraging `Matchpoint` to predict performance and rank picks based on their marginal contribution to winning.

### 3. `The Playbook` (PBK) - The Coach
- **What:** An AI-powered engine that translates complex data into simple, actionable pre-match strategic advice.
- **Why:** A prediction is useless without a plan. `The Playbook` bridges the gap between data and on-field execution, giving the drive team clear, concise priorities.
- **How:** It uses SHAP (SHapley Additive exPlanations) to understand *why* `Matchpoint` made its prediction and generates a strategic brief with sections like "Our Key to Winning" and "Primary Threat."

### 4. `Heat Seeker` (HS) - The Cartographer
- **What:** A Computer Vision module that analyzes match videos to generate heatmaps and trajectory plots of robot movement.
- **Why:** API data doesn't capture spatial strategy. `Heat Seeker` reveals a team's field control, typical scoring paths, and defensive positioning.
- **How:** It uses a YOLOv8 object detection model to identify and track robots in match footage, aggregating positional data to visualize team behavior and patterns.

### 5. `Woodie` - The Omniscient
- **What:** A friendly conversational chatbot providing instant access to all FRC data and BBE insights.
- **Why:** To democratize data access for the entire team. Anyone can get immediate answers without needing complex dashboards, making data useful at the moment it's needed most.
- **How:** It integrates with The Blue Alliance API for live data and our internal BBE gRPC services for predictions, using modern NLP (RAG) to answer natural language questions.

---

## System Architecture

BBE is designed with a modern, decoupled, multi-container architecture, enabling scalability and maintainability. Communication between the Go API gateway and the Python ML service is handled efficiently via gRPC.

![image](visuals/flow.png)

---

## Tech Stack

| Category                   | Technology                                      |
| -------------------------- | ----------------------------------------------- |
| **Frontend**               | React, TypeScript, Vite, Tailwind CSS           |
| **Backend & API Gateway**  | Go, Gin Web Framework                           |
| **Machine Learning Service**| Python, gRPC                                    |
| **ML/Data Science**        | Scikit-learn, XGBoost, SHAP, Pandas, NumPy      |
| **Computer Vision**        | OpenCV, PyTorch, YOLOv8                         |
| **DevOps & Deployment**    | Docker, Docker Compose, GitHub Actions          |

---

## Getting Started & Setup

For detailed instructions on running Blue Banner Engine locally or contributing to the project, please see our [CONTRIBUTING.md](https://github.com/armandomm09/blue-banner-engine?tab=contributing-ov-file) guide.



## License

This project is licensed under the MIT License - see the `LICENSE` file for details.

---

## Acknowledgments

-   **Pablo Armando Mac Beath Milián**
-   **Rene Cumplido Feregrino**



