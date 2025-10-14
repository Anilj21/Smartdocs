import { useEffect, useState } from 'react'
import { listFiles, generateQuiz } from '../api'

export default function Quiz({ user }) {
	const [files, setFiles] = useState([])
	const [selected, setSelected] = useState('')
	const [num, setNum] = useState(5)
	const [quiz, setQuiz] = useState(null)
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState('')

	useEffect(() => {
		if (!user) return
		console.log('Loading files for user:', user.uid)
		setError('')
		setFiles([])
		
		listFiles(user.uid).then(files => {
			console.log('Files loaded:', files)
			console.log('Files type:', typeof files, 'Is array:', Array.isArray(files))
			if (Array.isArray(files)) {
				setFiles(files)
				console.log('Files set successfully:', files.length, 'files')
			} else {
				console.error('Invalid files response:', files)
				setError('Invalid response from server')
			}
		}).catch(err => {
			console.error('Failed to load files:', err)
			setError(`Failed to load files: ${err.message || 'Unknown error'}`)
		})
	}, [user])

	if (!user) return <p>Please login to generate quizzes.</p>

	const onGenerate = async () => {
		if (!selected) return
		setLoading(true)
		setError('')
		try {
			console.log('Generating quiz for file:', selected, 'with', num, 'questions')
			console.log('Available files:', files)
			// Use the filename as file_id for the quiz generation
			const res = await generateQuiz(selected, num)
			console.log('Quiz generated:', res)
			if (res && res.questions) {
				setQuiz(res)
				console.log('Quiz set successfully with', res.questions.length, 'questions')
			} else {
				console.error('Invalid quiz response:', res)
				setError('Invalid quiz response from server')
			}
		} catch (err) {
			console.error('Quiz generation failed:', err)
			setError(`Failed to generate quiz: ${err.message || 'Unknown error'}`)
		} finally {
			setLoading(false)
		}
	}

	return (
		<div className="max-w-4xl mx-auto p-6">
			<h1 className="text-3xl font-bold mb-6 text-slate-100">Quiz Generator</h1>
			
			{/* File Selection and Configuration */}
			<div className="bg-slate-900 rounded-lg border border-slate-800 p-6 mb-6">
				<div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
					<div>
						<label className="block text-sm font-medium text-slate-300 mb-2">Select Document</label>
						<select 
							value={selected} 
							onChange={(e) => setSelected(e.target.value)} 
							className="w-full border border-slate-700 bg-slate-900 text-slate-100 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-500"
						>
							<option value="">Choose a document...</option>
							{files.map((f, index) => (
								<option key={index} value={typeof f === 'string' ? f : (f.file_id || f._id || f.filename)}>
									{typeof f === 'string' ? f : f.filename}
								</option>
							))}
						</select>
					</div>
					
					<div>
						<label className="block text-sm font-medium text-slate-300 mb-2">Number of Questions</label>
						<input 
							type="number" 
							min={1} 
							max={20} 
							value={num} 
							onChange={(e) => setNum(parseInt(e.target.value || '1'))} 
							className="w-full border border-slate-700 bg-slate-900 text-slate-100 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-500"
						/>
					</div>
					
					<div>
						<button 
							onClick={onGenerate} 
							disabled={!selected || loading}
							className="w-full bg-sky-600 text-white px-4 py-2 rounded-md hover:bg-sky-500 disabled:bg-slate-700 disabled:cursor-not-allowed transition-colors"
						>
							{loading ? 'Generating...' : 'Generate Quiz'}
						</button>
					</div>
				</div>
				
				{error && (
					<div className="mt-4 p-3 bg-rose-900/40 border border-rose-800 text-rose-200 rounded">
						{error}
					</div>
				)}
			</div>

			{/* Quiz Results */}
			{quiz && (
				<div className="space-y-6">
					<div className="bg-emerald-900/30 border border-emerald-800 rounded-lg p-4">
						<h2 className="text-lg font-semibold text-emerald-200 mb-2">
							Quiz Generated Successfully!
						</h2>
						<p className="text-emerald-200">
							Generated {quiz.questions?.length || 0} questions from your document.
						</p>
					</div>
					
					<div className="space-y-4">
						{quiz.questions?.map((q, idx) => (
							<div key={idx} className="bg-slate-900 border border-slate-800 rounded-lg p-6 shadow-sm">
								<div className="flex items-start justify-between mb-4">
									<h3 className="text-lg font-medium text-slate-100 flex-1">
										{idx + 1}. {q.question}
									</h3>
								</div>
								
								<div className="space-y-2 mb-4">
									{q.options?.map((opt, i) => (
										<div key={i} className="flex items-center p-3 bg-slate-800 rounded-md">
											<span className="font-medium text-slate-300 mr-3">
												{String.fromCharCode(65 + i)}.
											</span>
											<span className="text-slate-100">{opt}</span>
										</div>
									))}
								</div>
								
								<div className="bg-emerald-900/30 border border-emerald-800 rounded-md p-3">
									<div className="text-sm font-medium text-emerald-200 mb-1">
										Correct Answer: {q.answer}
									</div>
									{q.explanation && (
										<div className="text-sm text-emerald-200">
											<strong>Explanation:</strong> {q.explanation}
										</div>
									)}
								</div>
							</div>
						))}
					</div>
				</div>
			)}
		</div>
	)
}
