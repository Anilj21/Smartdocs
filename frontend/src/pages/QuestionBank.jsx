import { useEffect, useState } from 'react'
import { listFiles, generateQuestionBank } from '../api'

export default function QuestionBank({ user }) {
	const [files, setFiles] = useState([])
	const [selected, setSelected] = useState('')
	const [num, setNum] = useState(10)
	const [questionBank, setQuestionBank] = useState(null)
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

	if (!user) return <p>Please login to generate question banks.</p>

	const onGenerate = async () => {
		if (!selected) return
		setLoading(true)
		setError('')
		try {
			console.log('Generating question bank for file:', selected, 'with', num, 'questions')
			console.log('Available files:', files)
			const res = await generateQuestionBank(selected, num)
			console.log('Question bank generated:', res)
			if (res && res.questions) {
				setQuestionBank(res)
				console.log('Question bank set successfully with', res.questions.length, 'questions')
			} else {
				console.error('Invalid question bank response:', res)
				setError('Invalid question bank response from server')
			}
		} catch (err) {
			console.error('Question bank generation failed:', err)
			setError(`Failed to generate question bank: ${err.message || 'Unknown error'}`)
		} finally {
			setLoading(false)
		}
	}

	return (
		<div className="max-w-4xl mx-auto p-6">
			<h1 className="text-3xl font-bold mb-6 text-slate-100">Question Bank Generator</h1>
			
			{/* File Selection and Configuration */}
			<div className="bg-slate-900 rounded-lg border border-slate-800 p-6 mb-6">
				<div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
					<div>
						<label className="block text-sm font-medium text-slate-300 mb-2">Select Document</label>
						<select 
							value={selected} 
							onChange={(e) => setSelected(e.target.value)} 
							className="w-full border border-slate-700 bg-slate-900 text-slate-100 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-500"
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
							min={5} 
							max={50} 
							value={num} 
							onChange={(e) => setNum(parseInt(e.target.value || '5'))} 
							className="w-full border border-slate-700 bg-slate-900 text-slate-100 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-500"
						/>
					</div>
					
					<div>
						<button 
							onClick={onGenerate} 
							disabled={!selected || loading}
							className="w-full bg-violet-600 text-white px-4 py-2 rounded-md hover:bg-violet-500 disabled:bg-slate-700 disabled:cursor-not-allowed transition-colors"
						>
							{loading ? 'Generating...' : 'Generate Question Bank'}
						</button>
					</div>
				</div>
				
				{error && (
					<div className="mt-4 p-3 bg-rose-900/40 border border-rose-800 text-rose-200 rounded">
						{error}
					</div>
				)}
			</div>

			{/* Question Bank Results */}
			{questionBank && (
				<div className="space-y-6">
					<div className="bg-violet-900/30 border border-violet-800 rounded-lg p-4">
						<h2 className="text-lg font-semibold text-violet-200 mb-2">
							Open-ended Question Bank Generated
						</h2>
						<p className="text-violet-200">
							Generated {questionBank.questions?.length || 0} open-ended questions from your document.
						</p>
					</div>
					
					<div className="space-y-4">
						{questionBank.questions?.map((q, idx) => (
							<div key={idx} className="bg-slate-900 border border-slate-800 rounded-lg p-6 shadow-sm">
								<div className="flex items-start justify-between mb-4">
									<h3 className="text-lg font-medium text-slate-100 flex-1">
										{idx + 1}. {typeof q === 'string' ? q : q.question}
									</h3>
								</div>
							</div>
						))}
					</div>
				</div>
			)}
		</div>
	)
}
