import { useState, useEffect } from 'react';
import axios from 'axios';

export default function Dashboard({ user }) {
	const [files, setFiles] = useState([]);
	const [loading, setLoading] = useState(false);

	useEffect(() => {
		if (!user) return;
		setLoading(true);
		user.getIdToken().then(token => {
			axios.get('http://localhost:5000/files', {
				headers: { Authorization: `Bearer ${token}` }
			}).then(res => {
				const files = (res.data.files || []).map(filename => ({
					filename,
					url: `http://localhost:5000/public/uploads/${filename}`,
					filetype: filename.split('.').pop().toLowerCase()
				}));
				setFiles(files);
			})
			.finally(() => setLoading(false));
		});
	}, [user]);

	const getFileIcon = (filetype) => {
		switch (filetype) {
			case 'pdf': return '📄';
			case 'docx': return '📝';
			default: return '📁';
		}
	};

	const getFileTypeColor = (filetype) => {
		switch (filetype) {
			case 'pdf': return 'bg-red-900/30 text-red-300 border border-red-800';
			case 'docx': return 'bg-sky-900/30 text-sky-300 border border-sky-800';
			default: return 'bg-slate-800 text-slate-200 border border-slate-700';
		}
	};


	if (!user) return <p>Please login to view your documents.</p>;



		return (
			<div className="space-y-8">
				{/* Header */}
				<div className="text-center">
					<h1 className="text-4xl font-bold text-slate-100 mb-2">Welcome back, {user.displayName?.split(' ')[0] || 'User'}! 👋</h1>
					<p className="text-lg text-slate-400">Manage your documents and generate AI-powered insights</p>
				</div>
				{/* Documents Section */}
				<div className="bg-slate-900 rounded-2xl shadow-sm border border-slate-800 overflow-hidden">
					<div className="px-6 py-4 border-b border-slate-800">
						<h2 className="text-xl font-semibold text-slate-100">Your Documents</h2>
						<p className="text-sm text-slate-400">Manage and analyze your uploaded files</p>
					</div>
						 <div className="p-6">
							{loading ? (
									<div className="flex items-center justify-center py-12">
											<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-500"></div>
									</div>
							) : files.length > 0 ? (
									<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
											{files.map((file, index) => (
												<div key={file.filename} className="group relative bg-slate-800 rounded-xl p-6 hover:bg-slate-700 transition-all duration-200 border border-slate-700 hover:border-slate-600">
													<div className="flex items-center space-x-3 mb-4">
														<span className="text-3xl">{getFileIcon(file.filetype)}</span>
														<span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getFileTypeColor(file.filetype)}`}>
															{file.filetype.toUpperCase()}
														</span>
														<a href={file.url} target="_blank" rel="noopener noreferrer" className="text-sky-300 underline block">Open/Download</a>
													</div>
													<h3 className="font-semibold text-slate-100 mb-2 line-clamp-2">
														{file.filename}
													</h3>
												</div>
											))}
									</div>
							) : (
									<div className="text-center py-12">
											<div className="mx-auto w-24 h-24 bg-slate-800 rounded-full flex items-center justify-center mb-4">
													<svg className="w-12 h-12 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
															<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
													</svg>
											</div>
											<h3 className="text-lg font-medium text-slate-100 mb-2">No documents yet</h3>
											<p className="text-slate-400 mb-6">Get started by uploading your first document to generate AI-powered insights</p>
											<a 
													href="/upload" 
													className="inline-flex items-center px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white font-medium rounded-lg transition-colors duration-200"
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
			);
}
