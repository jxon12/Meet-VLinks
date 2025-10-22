Here’s a clean, structured README version for **VLINKS**, written in a professional and polished format — concise, easy to read, and suitable for submission or public GitHub display:

---

# VLINKS

### Track 2: Student Lifestyle – Mental Health Support for Students

**VLINKS** is a mindfulness-oriented progressive web app (PWA) built with **React**, **Vite**, and **Supabase**.
It blends productivity and well-being tools into one calm digital space, helping students stay **calm, focused, and connected**.

---

## ✨ Core Features

### 📰 Mindful Feed

* Share short reflections, photos, and thoughts.
* Scroll through posts from other users in a minimalist, distraction-free interface.

### ✅ To-Do Tasks & AI Assistant

* Create, edit, and reset daily tasks with priority levels.
* Tag tasks with energy levels for better scheduling.
* Integrated **Pomodoro timer** for focused sessions.
* **Gemini-powered AI Assistant** generates subtasks, plans, and motivational tips.

  * Example: “Finish assignment” → AI provides a 3-step action plan.
* **Voice Activation**: say “Hey VLINKS” to add or ask via speech.

### 🎵 Music Player

* Play, pause, skip, and seek tracks.
* Responsive design with safe-area padding for mobile usability.

### 🔮 Tarot & Reflection

* Choose a category (Career, Relationship, Interpersonal, Self-growth).
* Input a personal question and pick 5 cards.
* **AI Reading (Gemini API)**: 3–6 sentence reflection + 2 practical suggestions + disclaimer.
* **Fallback Reading**: combines local card meanings if API quota is reached.

### 🛡️ Safety Net

* Detects self-harm or sensitive input.
* Displays safety notice and hotline (e.g. Befrienders KL: 03-7627 2929).
* User must acknowledge before continuing.

### 📅 Calendar & Gratitude Journal

* Mood tracker (😀🙂😐🙁😢) and gratitude entries per day.
* Data stored locally with Supabase sync option.

### 📊 Dashboard & Insights

* Simple visual summary of productivity, mood, and gratitude.
* Designed for reflection, not comparison.

### 📱 Progressive Web App (PWA)

* Installable on desktop and mobile.
* Works offline via service worker caching.
* Custom icon, splash screen, and standalone mode.

---

## 🛠️ Tech Stack

* **React 18 + TypeScript**
* **Vite** bundler
* **TailwindCSS** styling
* **Supabase** (Auth, Database, Storage)
* **Google Gemini API** (AI Tarot)
* **Vite Plugin PWA** (offline support)

---

## 📦 Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/jxon12/Meet-VLinks.git  
   cd Meet-VLinks
   ```

2. **Install dependencies**
   Requires Node.js v18+.

   ```bash
   npm install
   ```

3. **Set environment variables**
   Create a `.env` file in the root directory:

   ```
   VITE_SUPABASE_URL=your-supabase-url  
   VITE_SUPABASE_ANON_KEY=your-supabase-anon-key  
   VITE_GEMINI_API_KEY=your-gemini-api-key
   ```

   * Get Supabase keys from your project dashboard.
   * Enable Google Gemini API in Google Cloud and copy the key.

4. **Run in development**

   ```bash
   npm run dev
   ```

   Visit [http://localhost:5173](http://localhost:5173).

5. **Build for production**

   ```bash
   npm run build
   npm run preview
   ```

   Output will be generated in `/dist`.

---

## 🌐 Deployment

### GitHub Pages

* Set `vite.config.ts` → `base: '/Meet-VLinks/'`.
* Push to repo and enable GitHub Pages.

### Netlify (Recommended)

* **Build command**: `npm run build`
* **Publish directory**: `dist`
* Add `public/_redirects`:

  ```
  /* /index.html 200
  ```

### Vercel

* **Build command**: `npm run build`
* **Output directory**: `dist`

---

## 📖 User Guide

**Sign in / Sign up** – via Supabase Auth
**Mindful Feed** – post and browse reflections
**Tasks & Pomodoro** – organize and focus
**Music** – background tracks while studying
**Tarot Reflection** – personal AI readings
**Safety Net** – mental health safeguards
**Calendar & Gratitude** – track moods and moments
**PWA** – add to home screen and use offline

---

## 📌 Notes for Judges

* Best experience on Chrome or Edge.
* Gemini API required for AI Tarot; fallback still works.
* Supabase backend supports Feed, Tasks, and Posts.
* Local-only mode still supports Tarot, Music, and Gratitude features.

---

## 📄 License

Developed for the **2025 CodeNection Competition**.
For educational and non-commercial use only.

---

Would you like me to tailor this README visually for **GitHub (with emoji headings and spacing)** or for **formal PDF submission (academic-style layout, no emojis, APA-friendly text)**?
