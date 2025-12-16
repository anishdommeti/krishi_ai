# Smart Agriculture Assistant - Project Walkthrough

This project is a Smart Agriculture Assistant that uses Machine Learning to predict crop yields, recommend suitable crops, and provide weather-based advisories. It consists of a Flask backend and a React (Vite) frontend.

## Project Structure

- **Backend**:
  - `app.py`: The main Flask application providing API endpoints (`/predict`, `/recommend`, etc.).
  - `agriculture_model_improved.pkl`: The trained ML model for crop yield prediction.
  - `label_encoders_improved.pkl`: Encoders for processing categorical data (District, Season, Crop).
  - `rainfall_monthly_averages.csv`: Data for rainfall forecasting.
  - `demo_model.py`: A script to quickly demonstrate the model's capabilities in the terminal.

- **Frontend** (`/frontend`):
  - A React application built with Vite.
  - Provides a UI for users to interact with the model.

## Prerequisites

- **Python**: Version 3.8 or higher.
- **Node.js**: Version 16 or higher (for the frontend).

## Setup Instructions

### 1. Backend Setup

1.  Navigate to the project root directory.
2.  Install the required Python packages:
    ```bash
    pip install -r requirements.txt
    ```

### 2. Frontend Setup

1.  Navigate to the frontend directory:
    ```bash
    cd frontend
    ```
2.  Install the Node.js dependencies:
    ```bash
    npm install
    ```

## How to Run

### Run the Backend

From the project root directory:

```bash
python app.py
```

The backend server will start at `http://localhost:5000`.

### Run the Frontend

Open a new terminal, navigate to the `frontend` directory, and run:

```bash
npm run dev
```

The frontend will usually start at `http://localhost:5173`. Open this URL in your browser to use the application.

### Run the Model Demo

To quickly verify the model works without starting the full web app, run:

```bash
python demo_model.py
```

This will print sample predictions to your terminal.

## API Endpoints

-   **GET /**: Health check.
-   **GET /info**: Returns available districts, seasons, and crops.
-   **POST /predict**: Predicts yield based on inputs.
-   **POST /recommend**: Recommends crops based on district, area, and budget.
-   **POST /forecast**: Forecasts rainfall.
-   **POST /advisory**: Provides weather-based advisories using Open-Meteo API.
