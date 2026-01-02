# OpusOne Client

The frontend application for OpusOne, a sheet music management platform. Built with React, Vite, and Tailwind CSS.

## Features

- **Sheet Music Library:** Browse, filter, and organize your sheet music collection.
- **PDF Viewer & Annotation:** View PDF scores and add annotations (pen, highlighter, text) directly in the browser.
- **Practice Mode:** Auto-scrolling, metronome, and loop functionalities for effective practice.
- **OCR Upload:** Upload images or PDFs and automatically extract metadata using the backend's OCR service.
- **Responsive Design:** Optimized for desktop and tablet usage.
- **Dark Mode:** Fully supported dark theme.

## Tech Stack

- **Framework:** React 18+
- **Build Tool:** Vite
- **Styling:** Tailwind CSS, Lucide React (Icons)
- **PDF Handling:** React-PDF
- **State Management:** React Context API

## Local Setup

1.  **Install Dependencies:**
    ```bash
    npm install
    ```

2.  **Environment Variables:**
    Create a `.env` file in the root directory:
    ```env
    # URL of your backend API
    VITE_API_URL=http://localhost:5000
    ```

3.  **Start Development Server:**
    ```bash
    npm run dev
    ```
    The app runs on `http://localhost:5173`.

## Deployment

This project is optimized for deployment on **Render Static Sites**, **Vercel**, or **Netlify**.

### Deploying to Render (Static Site)

1.  Push code to GitHub.
2.  Create a **Static Site** on Render.
3.  Connect your repository.
4.  **Build Command:** `npm run build`
5.  **Publish Directory:** `dist`
6.  **Environment Variables:**
    - `VITE_API_URL`: Your production backend URL (e.g., `https://opusone-api.onrender.com`)

## Key Components

- `App.jsx`: Main application logic, routing, and state.
- `components/AnnotationCanvas.jsx`: Handling drawing and annotations on top of PDFs.
- `components/PracticeMode.jsx`: Logic for practice tools like auto-scroll and metronome.