import { useEffect, useState } from 'react'
import { Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import Upload from './pages/Upload'
import Quiz from './pages/Quiz'
import QuestionBank from './pages/QuestionBank'
import DocumentView from './pages/DocumentView'
import SummaryChat from './pages/SummaryChat'
import SavedSummaries from './pages/SavedSummaries'
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut } from 'firebase/auth'
import './firebase'

export default function App() {
	const auth = getAuth()
	const navigate = useNavigate()
	const location = useLocation()
	const [user, setUser] = useState(null)

	useEffect(() => {
		return onAuthStateChanged(auth, (u) => {
			setUser(u)
			if (!u && location.pathname !== '/login') {
				navigate('/login')
			}
			if (u && location.pathname === '/login') {
				navigate('/')
			}
		})
	}, [location.pathname])

	const login = async () => {
		const provider = new GoogleAuthProvider()
		const result = await signInWithPopup(auth, provider)
		const user = result.user
		if (user) {
			const idToken = await user.getIdToken()
			try {
				await fetch('http://localhost:5000/login', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ idToken })
				})
			} catch (err) {
				console.error('Failed to login to backend:', err)
			}
		}
		navigate('/')
	}

	const logout = async () => {
		await signOut(auth)
		navigate('/login')
	}

	const isActive = (path) => location.pathname === path

	const [toasts, setToasts] = useState([])

	// Lightweight global toast via window event
	useEffect(() => {
		function onToast(e) {
			const id = Math.random().toString(36).slice(2)
			const t = { id, ...(e.detail || {}), timeout: 2500 }
			setToasts((prev) => [...prev, t])
			setTimeout(() => {
				setToasts((prev) => prev.filter(x => x.id !== id))
			}, t.timeout)
		}
		window.addEventListener('toast', onToast)
		return () => window.removeEventListener('toast', onToast)
	}, [])

	return (
		<div className="min-h-screen relative">
			{/* Background layers */}
			<div className="app-bg"></div>
			<div className="app-grid"></div>

			{/* Modern Navigation */}
			<nav className="bg-slate-900/80 backdrop-blur-md border-b border-slate-800 shadow-sm sticky top-0 z-50 text-slate-200">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
					<div className="flex items-center justify-between h-16">
						{/* Logo */}
						<Link to="/" className="flex items-center space-x-2">
							<div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
								<svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
									<path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
								</svg>
							</div>
							<span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
								SmartDocs
							</span>
						</Link>

						{/* Navigation Links */}
						{user && (
							<div className="hidden md:flex items-center space-x-1">
								<NavLink to="/" isActive={isActive('/')} icon="📊">
									Dashboard
								</NavLink>
								<NavLink to="/upload" isActive={isActive('/upload')} icon="📤">
									Upload
								</NavLink>
								<NavLink to="/quiz" isActive={isActive('/quiz')} icon="❓">
									Quiz
								</NavLink>
								<NavLink to="/question-bank" isActive={isActive('/question-bank')} icon="📚">
									Question Bank
								</NavLink>
								<NavLink to="/summary" isActive={isActive('/summary')} icon="📝">
									Summary
								</NavLink>
								<NavLink to="/summaries" isActive={isActive('/summaries')} icon="📚">
									Saved Items
								</NavLink>
							</div>
						)}

						{/* User Menu */}
						<div className="flex items-center space-x-4">
							{user ? (
								<div className="flex items-center space-x-3">
									<div className="flex items-center space-x-2">
										<img 
											src={user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName || user.email}&background=6366f1&color=fff`} 
											alt="Profile" 
											className="w-8 h-8 rounded-full border-2 border-slate-700"
										/>
										<span className="hidden sm:block text-sm font-medium text-slate-200">
											{user.displayName || user.email}
										</span>
									</div>
									<button 
										onClick={logout} 
										className="bg-rose-600 hover:bg-rose-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 flex items-center space-x-2"
									>
										<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
										</svg>
										<span>Logout</span>
									</button>
								</div>
							) : (
								<button 
									onClick={login} 
									className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors duration-200 flex items-center space-x-2"
								>
									<svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
										<path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
									</svg>
									<span>Login with Google</span>
								</button>
							)}
						</div>
					</div>
				</div>
			</nav>

			{/* Main Content */}
			<main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
				   <Routes>
					   <Route path="/login" element={<LoginPage onLogin={login} />} />
					   <Route path="/" element={<Dashboard user={user} />} />
					   <Route path="/upload" element={<Upload user={user} />} />
					   <Route path="/quiz" element={<Quiz user={user} />} />
					   <Route path="/question-bank" element={<QuestionBank user={user} />} />
					   <Route path="/document/:filename" element={<DocumentView />} />
					   <Route path="/summary" element={<SummaryChat user={user} />} />
					   <Route path="/summaries" element={<SavedSummaries />} />
				   </Routes>
			</main>

			{/* Toasts */}
			<div className="fixed bottom-4 right-4 z-50 space-y-2">
				{toasts.map(t => (
					<div key={t.id} className={`px-4 py-2 rounded-lg border shadow text-sm ${
						t.type === 'error' ? 'bg-rose-900/70 border-rose-800 text-rose-100' :
						t.type === 'success' ? 'bg-emerald-900/70 border-emerald-800 text-emerald-100' :
						'bg-slate-900/80 border-slate-800 text-slate-100'
					}`}>
						{t.message || 'Action completed'}
					</div>
				))}
			</div>
		</div>
	)
}

function NavLink({ to, children, isActive, icon }) {
	return (
		<Link
			to={to}
			className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center space-x-2 ${
				isActive
					? 'bg-slate-800 text-sky-300 border border-slate-700'
					: 'text-slate-300 hover:text-slate-100 hover:bg-slate-800'
			}`}
		>
			<span className="text-lg">{icon}</span>
			<span>{children}</span>
		</Link>
	)
}

function LoginPage({ onLogin }) {
	return (
		<div className="min-h-[80vh] flex flex-col items-center justify-center">
			<div className="max-w-md w-full space-y-8">
				<div className="text-center">
					<div className="mx-auto w-20 h-20 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center mb-6">
						<svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 20 20">
							<path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
						</svg>
					</div>
					<h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome to SmartDocs</h1>
					<p className="text-gray-600">Your AI-powered document assistant</p>
				</div>
				
				<div className="bg-white p-8 rounded-2xl shadow-lg border border-gray-200">
					<button 
						onClick={onLogin} 
						className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg font-medium transition-colors duration-200 flex items-center justify-center space-x-3"
					>
						<svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
							<path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
						</svg>
						<span>Continue with Google</span>
					</button>
					
					<div className="mt-6 text-center">
						<p className="text-sm text-gray-500">
							By continuing, you agree to our Terms of Service and Privacy Policy
						</p>
					</div>
				</div>
			</div>
		</div>
	)
}
