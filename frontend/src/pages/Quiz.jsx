import { useEffect, useState } from 'react'
import { listFiles, generateQuiz } from '../api'

export default function Quiz({ user }) {
	const [files, setFiles] = useState([])
	const [selected, setSelected] = useState('')
	const [num, setNum] = useState(5)
	const [quiz, setQuiz] = useState(null)
	const [loading, setLoading] = useState(false)

	useEffect(() => {
		if (!user) return
		listFiles(user.uid).then(setFiles)
	}, [user])

	if (!user) return <p>Please login to generate quizzes.</p>

	const onGenerate = async () => {
		if (!selected) return
		setLoading(true)
		try {
			const res = await generateQuiz(selected, num)
			setQuiz(res)
		} finally {
			setLoading(false)
		}
	}

	return (
		<div>
			<h1 className="text-xl font-semibold mb-4">Quiz Generator</h1>
			<div className="flex gap-2 items-center mb-4">
				<select value={selected} onChange={(e) => setSelected(e.target.value)} className="border rounded px-2 py-1">
					<option value="">Select a file</option>
					{files.map(f => (
						<option key={f._id} value={f._id}>{f.filename}</option>
					))}
				</select>
				<input type="number" min={1} max={20} value={num} onChange={(e) => setNum(parseInt(e.target.value || '1'))} className="border rounded px-2 py-1 w-24" />
				<button onClick={onGenerate} className="bg-gray-900 text-white px-4 py-2 rounded" disabled={!selected || loading}>{loading ? 'Generating...' : 'Generate'}</button>
			</div>
			{quiz && (
				<div className="space-y-4">
					{quiz.questions.map((q, idx) => (
						<div key={idx} className="bg-white border rounded p-4">
							<div className="font-medium mb-2">{q.question}</div>
							<ol className="list-decimal pl-6 space-y-1">
								{q.options.map((opt, i) => (
									<li key={i}>{opt}</li>
								))}
							</ol>
							<div className="text-sm text-green-700 mt-2">Answer: {q.answer}</div>
							{q.explanation && <div className="text-sm text-gray-600">{q.explanation}</div>}
						</div>
					))}
				</div>
			)}
		</div>
	)
}




