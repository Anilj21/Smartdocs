import { useEffect, useState } from 'react'
import axios from 'axios'
import { Link } from 'react-router-dom'

export default function Dashboard({ user }) {
	const [files, setFiles] = useState([])
	const [loading, setLoading] = useState(false)

	useEffect(() => {
		if (!user) return
		setLoading(true)
		user.getIdToken().then(token => {
			axios.get('http://localhost:5000/files', {
				headers: { Authorization: `Bearer ${token}` }
			}).then(res => {
				const files = (res.data.files || []).map(filename => ({
					filename,
					url: `http://localhost:5000/public/uploads/${filename}`,
					filetype: filename.split('.').pop().toLowerCase()
				}))
				setFiles(files)
			})
			.finally(() => setLoading(false))
		})
	}, [user])

	if (!user) return <p>Please login to view your documents.</p>

	const getFileIcon = (filetype) => {
		switch (filetype) {
			case 'pdf': return '📄'
			case 'docx': return '📝'
			case 'pptx': return '📊'
			default: return '📁'
		}
	}

	const getFileTypeColor = (filetype) => {
		switch (filetype) {
			case 'pdf': return 'bg-red-100 text-red-800'
			case 'docx': return 'bg-blue-100 text-blue-800'
			case 'pptx': return 'bg-orange-100 text-orange-800'
			default: return 'bg-gray-100 text-gray-800'
		}
	}
		return (
			<div className="space-y-8">
				{/* Header */}
				<div className="text-center">
					<h1 className="text-4xl font-bold text-gray-900 mb-2">Welcome back, {user.displayName?.split(' ')[0] || 'User'}! 👋</h1>
					<p className="text-lg text-gray-600">Manage your documents and generate AI-powered insights</p>
				</div>
				{/* Documents Section */}
				<div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
					<div className="px-6 py-4 border-b border-gray-200">
						<h2 className="text-xl font-semibold text-gray-900">Your Documents</h2>
						<p className="text-sm text-gray-600">Manage and analyze your uploaded files</p>
					</div>

					<div className="p-6">
						{loading ? (
							<div className="flex items-center justify-center py-12">
								<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
							</div>
						) : files.length > 0 ? (
							<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
								{files.map((file, index) => (
									<div key={file.filename} className="group relative bg-gray-50 rounded-xl p-6 hover:bg-gray-100 transition-all duration-200 border border-gray-200 hover:border-gray-300">
										<div className="flex items-start justify-between mb-4">
											<div className="flex items-center space-x-3">
												<span className="text-3xl">{getFileIcon(file.filetype)}</span>
												<div>
													<span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getFileTypeColor(file.filetype)}`}>
														{file.filetype.toUpperCase()}
													</span>
												</div>
											</div>
											<Link to={`/document/${encodeURIComponent(file.filename)}`} className="text-blue-600 underline block mt-2">Open</Link>
										</div>
										<h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">
											{file.filename}
										</h3>
									</div>
								))}
							</div>
						) : (
							<div className="text-center py-12">
								<div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
									<svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
									</svg>
								</div>
								<h3 className="text-lg font-medium text-gray-900 mb-2">No documents yet</h3>
								<p className="text-gray-600 mb-6">Get started by uploading your first document to generate AI-powered insights</p>
								<a 
									href="/upload" 
									className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors duration-200"
									>
									<svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
									</svg>
									Upload Document
								</a>
							</div>
						)
					}
					</div>
				</div>
			</div>
		)
}
