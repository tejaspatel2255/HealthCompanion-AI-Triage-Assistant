# HealthCompanion Frontend Setup Guide

This document outlines the step-by-step commands to scaffold the React application and configure Tailwind CSS.

---

## 1. Clean Up / Prepare Directory

Because `create-react-app` requires the target directory to be completely empty or non-existent, you must first delete the existing `health-frontend` directory. 

From the workspace root (`d:\Projects\health-companion`), run:
* **PowerShell**: `Remove-Item -Recurse -Force health-frontend`
* **Command Prompt**: `rmdir /s /q health-frontend`
* **macOS/Linux**: `rm -rf health-frontend`

---

## 2. Scaffold the React App

Run the following command from the **workspace root** to scaffold the project:

```bash
npx create-react-app health-frontend
```

This will create a clean `health-frontend` directory containing the standard React template files.

---

## 3. Set Up Tailwind CSS

Navigate into the newly created folder:

```bash
cd health-frontend
```

### Step 3.1: Install Tailwind CSS & Dependencies
Install Tailwind CSS, PostCSS, and Autoprefixer as developer dependencies:

```bash
npm install -D tailwindcss postcss autoprefixer
```

### Step 3.2: Initialize Configuration
Generate `tailwind.config.js` and `postcss.config.js` files:

```bash
npx tailwindcss init -p
```

### Step 3.3: Configure Template Paths
Open the newly generated `health-frontend/tailwind.config.js` file and replace its contents with:

```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
```

### Step 3.4: Add Tailwind Directives to CSS
Replace the contents of `health-frontend/src/index.css` with the following Tailwind directives:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

---

## 4. Run the Development Server

Start the React local development server:

```bash
npm start
```

Your React app will now be running on [http://localhost:3000](http://localhost:3000) with Tailwind CSS support fully enabled.
