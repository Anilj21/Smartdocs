import axios from 'axios'
import { getAuth } from 'firebase/auth'

const api = axios.create({
	baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5001',
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

export async function listFiles() {
	try {
		const { data } = await api.get('/files')
		return data
	} catch (e) {
		const { data } = await api.get('/files-public')
		return data
	}
}

export async function uploadFile(file, onUploadProgress) {
	const form = new FormData()
	form.append('file', file)
	try {
		const { data } = await api.post('/upload', form, {
			onUploadProgress,
			headers: { 'Content-Type': 'multipart/form-data' },
		})
		return data
	} catch (e) {
		const { data } = await api.post('/upload-public', form, {
			onUploadProgress,
			headers: { 'Content-Type': 'multipart/form-data' },
		})
		return data
	}
}

export async function summarizeByUrl(fileUrl) {
	const { data } = await api.post('/summarize', { fileUrl })
	return data
}

export async function generateQuiz(fileName, numQuestions) {
	const { data } = await api.post('/quiz', { fileName, numQuestions })
	return data
}

export async function listSummaries() {
	try {
		const { data } = await api.get('/summaries')
		return data
	} catch (e) {
		const { data } = await api.get('/summaries-public')
		return data
	}
}

export async function getSummary(fileName) {
	try {
		const { data } = await api.get('/summary', { params: { fileName } })
		return data
	} catch (e) {
		const { data } = await api.get('/summary-public', { params: { fileName } })
		return data
	}
}

export default api

