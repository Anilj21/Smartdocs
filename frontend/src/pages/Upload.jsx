
import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom';
import axios from 'axios'

export default function Upload({ user }) {
	const navigate = useNavigate();
	const [file, setFile] = useState(null)
	const [progress, setProgress] = useState(0)
	const [message, setMessage] = useState('')
	const [isDragOver, setIsDragOver] = useState(false)
	const [isUploading, setIsUploading] = useState(false)

	if (!user) return <p>Please login to upload documents.</p>

	const onDragOver = useCallback((e) => {
		e.preventDefault()
		setIsDragOver(true)
	}, [])

	const onDragLeave = useCallback((e) => {
		e.preventDefault()
		setIsDragOver(false)
	}, [])

	const onDrop = useCallback((e) => {
		e.preventDefault()
		setIsDragOver(false)
		const droppedFile = e.dataTransfer.files[0]
		if (droppedFile) {
			handleFileSelect(droppedFile)
		}
	}, [])

	const handleFileSelect = (selectedFile) => {
		const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
		const maxSize = 25 * 1024 * 1024 // 25MB

		if (!allowedTypes.includes(selectedFile.type)) {
			setMessage('❌ Please select a valid file type (PDF or DOCX)')
			return
		}

		if (selectedFile.size > maxSize) {
			setMessage('❌ File size must be less than 25MB')
			return
		}

		setFile(selectedFile)
		setMessage('✅ File selected successfully!')
	}

	const [uploadedUrl, setUploadedUrl] = useState('');
	const onSubmit = async (e) => {
		e.preventDefault()
		if (!file) return
		setIsUploading(true)
		setMessage('')
		setProgress(0)
		setUploadedUrl('')
		try {
			const form = new FormData();
			form.append('file', file);
			// Get Firebase ID token for auth header
			const token = user && (await user.getIdToken());
			const res = await axios.post(
				`http://localhost:5000/upload?user_id=${user.uid}`,
				form,
				{
					headers: {
						'Content-Type': 'multipart/form-data',
						Authorization: `Bearer ${token}`
					},
					onUploadProgress: (evt) => {
						if (evt.total) setProgress(Math.round((evt.loaded * 100) / evt.total));
					}
				}
			);
				setMessage(`🎉 Successfully uploaded: ${res.data.filename}`);
				// Create a URL for the uploaded file
				const url = `http://localhost:5000/uploads/${res.data.filename}`;
				setUploadedUrl(url);
				// Save file info for summary chat
				if (url && res.data.filename) {
					localStorage.setItem('summaryChat_lastFile', JSON.stringify({ fileUrl: url, fileName: res.data.filename }));
				}
			setFile(null);
			setProgress(0);
		} catch (e) {
			let errorMsg = '❌ Upload failed.';
			if (e.response && e.response.data && (e.response.data.error || e.response.data.details)) {
				errorMsg += ' ' + (e.response.data.error || '');
				if (e.response.data.details) errorMsg += ': ' + e.response.data.details;
			} else if (e.message) {
				errorMsg += ' ' + e.message;
			}
			setMessage(errorMsg);
		} finally {
			setIsUploading(false);
		}
	}

	const getFileIcon = (file) => {
		if (!file) return '📁'
		switch (file.type) {
			case 'application/pdf': return '📄'
			case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': return '📝'
			default: return ''
		}
	}

	const formatFileSize = (bytes) => {
		if (bytes === 0) return '0 Bytes'
		const k = 1024
		const sizes = ['Bytes', 'KB', 'MB', 'GB']
		const i = Math.floor(Math.log(bytes) / Math.log(k))
		return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
	}

	return (
		<div className="max-w-4xl mx-auto space-y-8">
			{/* Header */}
			<div className="text-center">
				<h1 className="text-4xl font-bold text-gray-900 mb-2">Upload Document</h1>
				<p className="text-lg text-gray-600">Upload your documents to generate AI-powered insights and quizzes</p>
			</div>

			{/* Upload Area */}
			<div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
				<div className="p-8">
					{/* Drag & Drop Zone */}
					<div
						className={`border-2 border-dashed rounded-xl p-12 text-center transition-all duration-200 ${
							isDragOver
								? 'border-blue-400 bg-blue-50'
								: 'border-gray-300 hover:border-gray-400'
						}`}
						onDragOver={onDragOver}
						onDragLeave={onDragLeave}
						onDrop={onDrop}
					>
						<div className="space-y-4">
							<div className="mx-auto w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center">
								<svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
								</svg>
							</div>
							<div>
								<h3 className="text-lg font-medium text-gray-900 mb-2">
									{isDragOver ? 'Drop your file here' : 'Drag and drop your file here'}
								</h3>
								<p className="text-gray-600 mb-4">or</p>
								<label className="inline-flex items-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg cursor-pointer transition-colors duration-200">
									<svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
									</svg>
									Browse Files
									<input
										type="file"
										accept=".pdf,.docx"
										onChange={(e) => handleFileSelect(e.target.files?.[0] || null)}
										className="hidden"
									/>
								</label>
							</div>
							<p className="text-sm text-gray-500">
								Supported formats: PDF, DOCX (Max size: 25MB)
							</p>
						</div>
					</div>

					{/* File Preview */}
					{file && (
						<div className="mt-6 bg-gray-50 rounded-xl p-6">
							<div className="flex items-center space-x-4">
								<span className="text-4xl">{getFileIcon(file)}</span>
								<div className="flex-1">
									<h4 className="font-medium text-gray-900">{file.name}</h4>
									<p className="text-sm text-gray-500">
										{formatFileSize(file.size)} • {file.type}
									</p>
								</div>
								<button
									onClick={() => setFile(null)}
									className="text-gray-400 hover:text-gray-600"
								>
									<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
									</svg>
								</button>
							</div>
						</div>
					)}

					{/* Upload Button */}
					{file && (
						<div className="mt-6">
							<button
								onClick={onSubmit}
								disabled={isUploading}
								className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-3 px-6 rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2"
							>
								{isUploading ? (
									<>
										<div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
										<span>Uploading...</span>
									</>
								) : (
									<>
										<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
										</svg>
										<span>Upload Document</span>
									</>
								)}
							</button>
						</div>
					)}

					{/* Progress Bar */}
					{progress > 0 && progress < 100 && (
						<div className="mt-6">
							<div className="flex items-center justify-between text-sm text-gray-600 mb-2">
								<span>Uploading...</span>
								<span>{progress}%</span>
							</div>
							<div className="w-full bg-gray-200 rounded-full h-2">
								<div
									className="bg-blue-600 h-2 rounded-full transition-all duration-300"
									style={{ width: `${progress}%` }}
								></div>
							</div>
						</div>
					)}

						{/* Message */}
						{message && (
							<div className={`mt-6 p-4 rounded-lg ${
								message.includes('❌') 
									? 'bg-red-50 text-red-800 border border-red-200' 
									: message.includes('🎉')
									? 'bg-green-50 text-green-800 border border-green-200'
									: 'bg-blue-50 text-blue-800 border border-blue-200'
							}`}>
								{message}
								{uploadedUrl && (
									<div className="mt-2">
										<a href={uploadedUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">View Uploaded File</a>
									</div>
								)}
							</div>
						)}
				</div>
			</div>

			{/* Features */}
			<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
				<div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 text-center">
					<div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-4">
						<svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
						</svg>
					</div>
					<h3 className="font-semibold text-gray-900 mb-2">AI Summarization</h3>
					<p className="text-sm text-gray-600">Get intelligent summaries and key points from your documents</p>
								<button
									className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
													onClick={() => {
														if (!uploadedUrl) {
															setMessage('❌ Please upload a document first.');
															return;
														}
														// Use the file name from the upload response (stored in localStorage)
														let fileName = '';
														try {
															const lastFile = localStorage.getItem('summaryChat_lastFile');
															if (lastFile) fileName = JSON.parse(lastFile).fileName;
														} catch {}
														if (uploadedUrl && fileName) {
															localStorage.setItem('summaryChat_lastFile', JSON.stringify({ fileUrl: uploadedUrl, fileName }));
														}
														navigate('/summary', { state: { fileUrl: uploadedUrl, fileName } });
													}}
													disabled={!uploadedUrl}
												>
													Summarize with AI
												</button>
				</div>

				<div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 text-center">
					<div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mx-auto mb-4">
						<svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
						</svg>
					</div>
					<h3 className="font-semibold text-gray-900 mb-2">Quiz Generation</h3>
					<p className="text-sm text-gray-600">Create interactive quizzes based on your document content</p>
					<button
						className="mt-4 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
						onClick={() => navigate('/quiz')}
					>
						Generate Quiz
					</button>
				</div>

				<div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 text-center">
					<div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mx-auto mb-4">
						<svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
						</svg>
					</div>
					<h3 className="font-semibold text-gray-900 mb-2">Question Bank</h3>
					<p className="text-sm text-gray-600">Generate comprehensive question banks from your documents</p>
					<button
						className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
						onClick={() => navigate('/question-bank')}
					>
						Generate Question Bank
					</button>
				</div>

				<div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 text-center">
					<div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mx-auto mb-4">
						<svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
						</svg>
					</div>
					<h3 className="font-semibold text-gray-900 mb-2">Secure Storage</h3>
					<p className="text-sm text-gray-600">Your documents are stored securely with local backup</p>
				</div>
			</div>
		</div>
	)
}
