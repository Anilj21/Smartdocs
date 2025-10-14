import axios from 'axios'
import { getAuth } from 'firebase/auth'

const api = axios.create({
	baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000',
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

export async function listFiles(userId = null) {
	try {
		const { data } = await api.get('/files')
		// The Node.js server returns { files: [...] }, so extract the files array
		return data.files || []
	} catch (e) {
		console.error('Failed to fetch files:', e)
		// Return empty array as fallback
		return []
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

export async function generateQuiz(fileId, numQuestions) {
	const { data } = await api.post('/quiz', { file_id: fileId, num_questions: numQuestions })
	return data
}

export async function generateQuestionBank(fileId, numQuestions) {
	const { data } = await api.post('/question-bank', { file_id: fileId, num_questions: numQuestions })
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

// Saved items (summaries, quizzes, question banks)
export async function listSavedItems() {
  const { data } = await api.get('/saved-items')
  return data // { items: { [id]: { id, kind, filename, title, savedAt, data } } }
}

export async function getSavedItem(kind, fileName) {
  const { data } = await api.get('/saved-item', { params: { kind, fileName } })
  return data
}

export async function downloadSavedItem(kind, fileName) {
  const res = await api.get('/saved-item/download', { params: { kind, fileName }, responseType: 'blob' })
  return res.data // Blob
}

export default api

