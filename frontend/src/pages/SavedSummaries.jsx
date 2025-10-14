import { useEffect, useState } from 'react'
import { listSavedItems, getSavedItem, downloadSavedItem } from '../api'

export default function SavedSummaries() {
	const [items, setItems] = useState([])
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState('')
	const [activeId, setActiveId] = useState(null)
	const [activeContent, setActiveContent] = useState(null)

	useEffect(() => {
		setLoading(true)
		setError('')
		listSavedItems()
			.then(({ items }) => {
				const entries = Object.values(items || {})
					.sort((a, b) => String(a.savedAt).localeCompare(String(b.savedAt)))
					.reverse()
				setItems(entries)
			})
			.catch(e => setError(e.response?.data?.error || e.message || 'Failed to load saved items'))
			.finally(() => setLoading(false))
	}, [])

	async function onOpen(item) {
		setActiveId(item.id)
		setActiveContent(null)
		try {
			// Re-fetch single item to ensure we have latest
			const full = await getSavedItem(item.kind, item.filename)
			setActiveContent(full)
		} catch (e) {
			setActiveContent({ error: e.response?.data?.error || e.message })
		}
	}

	async function onDownload(item) {
		try {
			const blob = await downloadSavedItem(item.kind, item.filename)
			const url = window.URL.createObjectURL(blob)
			const a = document.createElement('a')
			a.href = url
			a.download = `${item.filename.replace(/[^a-zA-Z0-9_.-]/g,'_')}_${item.kind}.doc`
			document.body.appendChild(a)
			a.click()
			a.remove()
			window.URL.revokeObjectURL(url)
			window.dispatchEvent(new CustomEvent('toast', { detail: { type: 'success', message: 'Download started' } }))
		} catch (e) {
			window.dispatchEvent(new CustomEvent('toast', { detail: { type: 'error', message: e.response?.data?.error || e.message } }))
		}
	}

	function toPlainText(item, content) {
		if (!content || content.error) return ''
		if (item.kind === 'summary') return String(content.data?.summary || '')
		if (item.kind === 'quiz') {
			const qs = content.data?.questions || []
			return qs.map((q, i) => {
				const opts = Array.isArray(q.options) ? q.options.map((o, idx) => `${'ABCD'[idx]}. ${o}`).join('\n') : ''
				return `Q${i+1}. ${q.question}\n${opts}\nAnswer: ${q.answer || ''}\n${q.explanation ? 'Explanation: ' + q.explanation : ''}`
			}).join('\n\n')
		}
		if (item.kind === 'questionBank') {
			const qs = content.data?.questions || []
			return qs.map((q, i) => `Q${i+1}. ${typeof q === 'string' ? q : (q?.question || '')}`).join('\n')
		}
		try { return JSON.stringify(content.data || {}, null, 2) } catch { return '' }
	}

	async function onCopy(item) {
		const text = toPlainText(item, activeContent)
		if (!text) return
		try {
			await navigator.clipboard.writeText(text)
			window.dispatchEvent(new CustomEvent('toast', { detail: { type: 'success', message: 'Copied to clipboard' } }))
		} catch {}
	}

	function renderContent(item, content) {
		if (!content) return 'Loading...'
		if (content.error) return `❌ ${content.error}`
		if (item.kind === 'summary') {
			return <pre className="whitespace-pre-wrap text-sm">{content.data?.summary || ''}</pre>
		}
		if (item.kind === 'quiz') {
			const qs = content.data?.questions || []
			return (
				<div className="space-y-3 text-sm">
					{qs.map((q, i) => (
						<div key={i} className="border rounded p-2">
							<div className="font-medium">Q{i+1}. {q.question}</div>
							{Array.isArray(q.options) && (
								<ul className="list-disc ml-5">
									{q.options.map((opt, idx) => (
										<li key={idx}><span className="font-semibold">{'ABCD'[idx]}.</span> {opt}</li>
									))}
								</ul>
							)}
							{q.answer && <div className="mt-1">Answer: <span className="font-semibold">{q.answer}</span></div>}
							{q.explanation && <div className="text-xs text-gray-600">{q.explanation}</div>}
						</div>
					))}
				</div>
			)
		}
		if (item.kind === 'questionBank') {
			const qs = content.data?.questions || []
			return (
				<ol className="list-decimal ml-5 text-sm space-y-1">
					{qs.map((q, i) => (
						<li key={i}>{typeof q === 'string' ? q : (q?.question || '')}</li>
					))}
				</ol>
			)
		}
		return <pre className="whitespace-pre-wrap text-sm">{JSON.stringify(content.data || {}, null, 2)}</pre>
	}

	return (
		<div className="space-y-6">
			<h1 className="text-2xl font-bold text-slate-100">Saved Items</h1>
			{error && <div className="p-3 rounded border border-red-200 bg-red-50 text-red-700">{error}</div>}
			{loading ? (
				<div>Loading...</div>
			) : items.length === 0 ? (
				<div>No items saved yet.</div>
			) : (
				<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
					{items.map((item) => (
						<div key={item.id} className="border border-slate-800 rounded-xl p-4 bg-slate-900">
							<div className="flex items-start justify-between gap-3">
								<div>
									<div className="font-medium text-slate-100">{item.title || `${item.filename} (${item.kind})`}</div>
									<div className="text-xs text-slate-400">{new Date(item.savedAt).toLocaleString()}</div>
									<div className={`mt-1 inline-block text-xs px-2 py-0.5 rounded border ${
										item.kind === 'summary' ? 'text-emerald-300 bg-emerald-900/30 border-emerald-800' :
										item.kind === 'quiz' ? 'text-sky-300 bg-sky-900/30 border-sky-800' :
										' text-violet-300 bg-violet-900/30 border-violet-800'
									}`}>{item.kind}</div>
								</div>
								<div className="flex gap-3">
									<button className="px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-100" onClick={() => onOpen(item)}>Open</button>
									<button className="px-3 py-1 rounded bg-sky-600 hover:bg-sky-500 text-white" onClick={() => onDownload(item)}>Download .doc</button>
									{activeId === item.id && (
										<button className="px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-100" onClick={() => onCopy(item)}>Copy</button>
									)}
								</div>
							</div>
							{activeId === item.id && (
								<div className="mt-3 text-slate-200">
									{renderContent(item, activeContent)}
								</div>
							)}
						</div>
					))}
				</div>
			)}
		</div>
	)
}
