import { useEffect, useState } from 'react'
import { listSummaries, getSummary } from '../api'

export default function SavedSummaries() {
	const [items, setItems] = useState([])
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState('')
	const [active, setActive] = useState(null)
	const [activeContent, setActiveContent] = useState('')

	useEffect(() => {
		setLoading(true)
		setError('')
		listSummaries()
			.then(({ summaries }) => {
				const entries = Object.entries(summaries || {})
					.sort((a, b) => (a[1]?.savedAt || '').localeCompare(b[1]?.savedAt || ''))
					.reverse()
				setItems(entries)
			})
			.catch(e => setError(e.response?.data?.error || e.message || 'Failed to load summaries'))
			.finally(() => setLoading(false))
	}, [])

	async function onOpen(fileName) {
		setActive(fileName)
		setActiveContent('')
		try {
			const { summary } = await getSummary(fileName)
			setActiveContent(summary || '')
		} catch (e) {
			setActiveContent('❌ ' + (e.response?.data?.error || e.message))
		}
	}

	return (
		<div className="space-y-6">
			<h1 className="text-2xl font-bold">Saved Summaries</h1>
			{error && <div className="p-3 rounded border border-red-200 bg-red-50 text-red-700">{error}</div>}
			{loading ? (
				<div>Loading...</div>
			) : items.length === 0 ? (
				<div>No summaries saved yet.</div>
			) : (
				<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
					{items.map(([fileName, meta]) => (
						<div key={fileName} className="border rounded p-4 bg-white">
							<div className="flex items-center justify-between">
								<div>
									<div className="font-medium">{fileName}</div>
									<div className="text-xs text-gray-500">{new Date(meta.savedAt).toLocaleString()}</div>
								</div>
								<button className="text-blue-600 underline" onClick={() => onOpen(fileName)}>Open</button>
							</div>
							{active === fileName && (
								<div className="mt-3 whitespace-pre-wrap text-sm text-gray-800">
									{activeContent || 'Loading...'}
								</div>
							)}
						</div>
					))}
				</div>
			)}
		</div>
	)
}
