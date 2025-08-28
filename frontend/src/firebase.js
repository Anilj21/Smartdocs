import { initializeApp } from 'firebase/app'

// Replace with your Firebase project config (env-based)
const firebaseConfig = {
	apiKey: import.meta.env.VITE_FB_API_KEY,
	authDomain: import.meta.env.VITE_FB_AUTH_DOMAIN,
	projectId: import.meta.env.VITE_FB_PROJECT_ID,
	storageBucket: import.meta.env.VITE_FB_STORAGE_BUCKET,
	messagingSenderId: import.meta.env.VITE_FB_MSG_SENDER,
	appId: import.meta.env.VITE_FB_APP_ID,
}

initializeApp(firebaseConfig)


