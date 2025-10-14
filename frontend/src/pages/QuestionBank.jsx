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
			<h1 className="text-3xl font-bold mb-6 text-gray-800">Question Bank Generator</h1>
			
			{/* File Selection and Configuration */}
			<div className="bg-white rounded-lg shadow-md p-6 mb-6">
				<div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">Select Document</label>
						<select 
							value={selected} 
							onChange={(e) => setSelected(e.target.value)} 
							className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
						<label className="block text-sm font-medium text-gray-700 mb-2">Number of Questions</label>
						<input 
							type="number" 
							min={5} 
							max={50} 
							value={num} 
							onChange={(e) => setNum(parseInt(e.target.value || '5'))} 
							className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
						/>
					</div>
					
					<div>
						<button 
							onClick={onGenerate} 
							disabled={!selected || loading}
							className="w-full bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
						>
							{loading ? 'Generating...' : 'Generate Question Bank'}
						</button>
					</div>
				</div>
				
				{error && (
					<div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
						{error}
					</div>
				)}
			</div>

			{/* Question Bank Results */}
			{questionBank && (
				<div className="space-y-6">
					<div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
						<h2 className="text-lg font-semibold text-purple-800 mb-2">
							Question Bank Generated Successfully!
						</h2>
						<p className="text-purple-700">
							Generated {questionBank.questions?.length || 0} questions from your document.
						</p>
					</div>
					
					<div className="space-y-4">
						{questionBank.questions?.map((q, idx) => (
							<div key={idx} className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
								<div className="flex items-start justify-between mb-4">
									<h3 className="text-lg font-medium text-gray-800 flex-1">
										{idx + 1}. {q.question}
									</h3>
								</div>
								
								<div className="space-y-2 mb-4">
									{q.options?.map((opt, i) => (
										<div key={i} className="flex items-center p-3 bg-gray-50 rounded-md">
											<span className="font-medium text-gray-600 mr-3">
												{String.fromCharCode(65 + i)}.
											</span>
											<span className="text-gray-800">{opt}</span>
										</div>
									))}
								</div>
								
								<div className="bg-purple-50 border border-purple-200 rounded-md p-3">
									<div className="text-sm font-medium text-purple-800 mb-1">
										Correct Answer: {q.answer}
									</div>
									{q.explanation && (
										<div className="text-sm text-purple-700">
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
