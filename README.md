# Social Wave 🌊

A modern, full-stack social media application built with React, Express, and Firebase, featuring AI integration via Google Gemini.

## 🚀 Features

- **Real-time Social Feed**: Post updates and interact with others instantly.
- **Smart @Mentions**: Tag other users in posts and comments with efficient search.
- **AI Integration**: Powered by Google Gemini for enhanced content experiences.
- **Secure Authentication**: Google Login integration via Firebase Auth.
- **Responsive Design**: Beautifully crafted UI using Tailwind CSS and Motion.
- **Full-Stack Architecture**: Express backend with Vite frontend integration.

## 🛠️ Tech Stack

- **Frontend**: React 19, Vite, Tailwind CSS, Motion (Framer Motion), Lucide Icons.
- **Backend**: Node.js, Express.
- **Database & Auth**: Firebase Firestore, Firebase Authentication.
- **AI**: Google Gemini API (@google/genai).

## ⚙️ Local Setup

1. **Clone the repository**:
   ```bash
   git clone <your-repo-url>
   cd social-wave
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Create a `.env` file in the root directory and add the following:
   ```env
   GEMINI_API_KEY="your_gemini_api_key"
   APP_URL="http://localhost:3000"
   FIREBASE_CONFIG='{"projectId":"...","appId":"...","apiKey":"...","authDomain":"...","firestoreDatabaseId":"..."}'
   ```
   *Note: You can find your Firebase config in `firebase-applet-config.json`.*

4. **Run the development server**:
   ```bash
   npm run dev
   ```
   The app will be available at `http://localhost:3000`.

## 🌐 Deployment (Render)

This app is optimized for deployment on [Render](https://render.com/)

1. **Create a New Web Service** on Render and connect your GitHub repository.
2. **Build Settings**:
   - **Runtime**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
3. **Environment Variables**:
   Add the following in the Render dashboard:
   - `NODE_ENV`: `production`
   - `GEMINI_API_KEY`: Your Google AI API Key.
   - `APP_URL`: Your Render app URL (e.g., `https://social-wave.onrender.com`).
   - `FIREBASE_CONFIG`: The JSON string of your Firebase configuration.
   - The site is currently hosted at https://social-wave-nvbn.onrender.com

## 📄 License

This project is licensed under the MIT License.
