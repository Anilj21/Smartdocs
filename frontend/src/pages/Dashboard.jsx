import { useEffect, useState } from 'react'
import { listFiles } from '../api'

export default function Dashboard({ user }) {
	const [files, setFiles] = useState([])
	const [loading, setLoading] = useState(false)

	useEffect(() => {
		if (!user) return
		setLoading(true)
		listFiles(user.uid).then(setFiles).finally(() => setLoading(false))
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

			{/* Stats Cards */}
			<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
				<div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
					<div className="flex items-center">
						<div className="p-3 bg-blue-100 rounded-xl">
							<svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
							</svg>
						</div>
						<div className="ml-4">
							<p className="text-sm font-medium text-gray-600">Total Documents</p>
							<p className="text-2xl font-bold text-gray-900">{files.length}</p>
						</div>
					</div>
				</div>

				<div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
					<div className="flex items-center">
						<div className="p-3 bg-green-100 rounded-xl">
							<svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
							</svg>
						</div>
						<div className="ml-4">
							<p className="text-sm font-medium text-gray-600">Recent Activity</p>
							<p className="text-2xl font-bold text-gray-900">
								{files.length > 0 ? new Date(files[0].upload_date).toLocaleDateString() : 'None'}
							</p>
						</div>
					</div>
				</div>

				<div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
					<div className="flex items-center">
						<div className="p-3 bg-purple-100 rounded-xl">
							<svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
							</svg>
						</div>
						<div className="ml-4">
							<p className="text-sm font-medium text-gray-600">AI Ready</p>
							<p className="text-2xl font-bold text-gray-900">{files.length > 0 ? 'Yes' : 'No'}</p>
						</div>
					</div>
				</div>
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
								<div key={file.file_id || file._id || index} className="group relative bg-gray-50 rounded-xl p-6 hover:bg-gray-100 transition-all duration-200 border border-gray-200 hover:border-gray-300">
									<div className="flex items-start justify-between mb-4">
										<div className="flex items-center space-x-3">
											<span className="text-3xl">{getFileIcon(file.filetype)}</span>
											<div>
												<span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getFileTypeColor(file.filetype)}`}>
													{file.filetype.toUpperCase()}
												</span>
											</div>
										</div>
										<div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
											<button className="text-gray-400 hover:text-gray-600">
												<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
												</svg>
											</button>
										</div>
									</div>
									
									<h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">
										{file.filename}
									</h3>
									
									<div className="flex items-center text-sm text-gray-500 mb-4">
										<svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a4 4 0 118 0v4m-4 6v6m8-10v4m-4 4v6" />
										</svg>
										{new Date(file.upload_date).toLocaleDateString()}
									</div>

									<div className="flex space-x-2">
										<button className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 px-3 rounded-lg transition-colors duration-200">
											Generate Quiz
										</button>
										<button className="flex-1 bg-gray-600 hover:bg-gray-700 text-white text-sm font-medium py-2 px-3 rounded-lg transition-colors duration-200">
											Summarize
										</button>
									</div>
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
					)}
				</div>
			</div>
		</div>
	)
}
