import axios from 'axios'
import { getAuth } from 'firebase/auth'

const api = axios.create({
	baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
})

// Attach Firebase ID token if available
api.interceptors.request.use(async (config) => {
	try {
		const auth = getAuth()
		const user = auth.currentUser
		if (user) {
			const token = await user.getIdToken()
			config.headers = config.headers || {}
			config.headers.Authorization = `Bearer ${token}`
		}
	} catch {}
	return config
})

export async function listFiles(userId) {
	const { data } = await api.get(`/files`, { params: { user_id: userId } })
	return data
}

export async function uploadFile(userId, file, onUploadProgress) {
	const form = new FormData()
	form.append('file', file)
	const { data } = await api.post(`/upload`, form, {
		params: { user_id: userId },
		onUploadProgress,
		headers: { 'Content-Type': 'multipart/form-data' },
	})
	return data
}

export async function generateQuiz(fileId, numQuestions) {
	const { data } = await api.post(`/quiz`, { file_id: fileId, num_questions: numQuestions })
	return data
}

export async function summarizeDocument(fileId, maxLength = 500) {
	const { data } = await api.post(`/summarize`, { file_id: fileId, max_length: maxLength })
	return data
}

export default api
