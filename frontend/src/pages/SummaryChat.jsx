import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useLocation } from 'react-router-dom';


function SummaryChat({ user }) {
  const location = useLocation();
  // Only get file info from navigation state
  const fileUrl = location.state?.fileUrl;
  const fileName = location.state?.fileName;
  // If still missing, don't proceed
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useState(0);
  const [finalTime, setFinalTime] = useState(null);
  const timerRef = useRef(null);
  const [processStep, setProcessStep] = useState(0);
  const processSteps = [
    'Analyzing document...',
    'Extracting key points...',
    'Generating summary...'
  ];

  // No localStorage persistence for messages

  // Fetch initial summary on mount if no messages
  useEffect(() => {
    let cancelled = false;
    async function fetchSummary() {
      if (!fileUrl || !user) return;
      // Always fetch summary if no assistant message (so summary updates after file switch/refresh)
      const hasAssistant = messages.some(m => m.role === 'assistant');
      if (hasAssistant) return;
      startTimer();
      setLoading(true);
      try {
        const token = await user.getIdToken();
        const res = await axios.post('http://localhost:5000/summarize', { fileUrl }, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!cancelled) {
          setMessages([
            { role: 'assistant', content: res.data.summary || 'No summary available.' }
          ]);
        }
      } catch (e) {
        if (!cancelled) {
          setMessages([
            { role: 'assistant', content: '❌ Error: ' + (e.response?.data?.error || e.message) }
          ]);
        }
      } finally {
        stopTimer(cancelled);
        if (!cancelled) setLoading(false);
      }
    }
    fetchSummary();
    return () => {
      cancelled = true;
      clearInterval(timerRef.current);
    };
    // eslint-disable-next-line
  }, [fileUrl, user]);

  // Helper to start timer and process animation
  const stepIntervalRef = useRef(null);
  function startTimer() {
    setTimer(0);
    setProcessStep(0);
    clearInterval(timerRef.current);
    clearInterval(stepIntervalRef.current);
    timerRef.current = setInterval(() => {
      setTimer(prev => prev + 1);
    }, 1000);
    stepIntervalRef.current = setInterval(() => {
      setProcessStep(s => (s + 1) % processSteps.length);
    }, 1200);
  }
  // Helper to stop timer and set final time
  function stopTimer(cancelled) {
    clearInterval(timerRef.current);
    clearInterval(stepIntervalRef.current);
    if (!cancelled) setFinalTime(timer);
  }

  const sendMessage = async () => {
    if (!input.trim()) return;
    const newMessages = [...messages, { role: 'user', content: input }];
    setMessages(newMessages);
    setInput('');
  setLoading(true);
  startTimer();
    try {
      const token = user && (await user.getIdToken());
      const res = await axios.post('http://localhost:5000/summarize', {
        fileUrl,
        userMessage: input
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessages([...newMessages, { role: 'assistant', content: res.data.summary || 'No response.' }]);
    } catch (e) {
      setMessages([...newMessages, { role: 'assistant', content: '❌ Error: ' + (e.response?.data?.error || e.message) }]);
    } finally {
      stopTimer(false);
      setLoading(false);
    }
  };

  // If file info is missing, show error
  if (!fileUrl || !fileName) {
    return (
      <div className="max-w-2xl mx-auto py-8">
        <h1 className="text-3xl font-bold mb-4">AI Document Chat</h1>
        <div className="mb-2 text-red-600">No file selected. Please upload and summarize a document first.</div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-8">
      <h1 className="text-3xl font-bold mb-4 text-slate-100">AI Document Chat</h1>
      <div className="mb-2 text-slate-400">File: <span className="font-mono text-slate-300">{fileName}</span></div>
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 h-96 overflow-y-auto mb-4 flex flex-col relative text-slate-200">
        {messages.map((msg, i) => (
          <div key={i} className={`mb-2 ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
            {msg.role === 'assistant' ? (
              <div className="inline-block px-3 py-2 rounded-lg bg-slate-800 text-slate-100 border border-slate-700 text-left whitespace-pre-line">
                {msg.content
                  // Split summary into lines by bullet, dash, or newline, fallback to sentences
                  .split(/\n|\r|•|- |\u2022|\d+\. /g)
                  .filter(line => line.trim() !== '')
                  .map((line, idx) => (
                    <div key={idx} className="mb-1">
                      <span className="font-semibold text-sky-300">• </span>
                      <span className="font-medium text-slate-100">{line.trim()}</span>
                    </div>
                  ))}
              </div>
            ) : (
              <span className="inline-block px-3 py-2 rounded-lg bg-sky-900/40 text-sky-200 border border-sky-800">{msg.content}</span>
            )}
          </div>
        ))}
        {(loading || finalTime !== null) && (
          <div className="flex items-center gap-3 text-xs mt-2">
            {loading && (
              <>
                <span className="text-slate-400">AI is typing...</span>
                <span className="text-sky-400 font-semibold animate-pulse">{processSteps[processStep]}</span>
                <span className="text-slate-300 font-mono bg-slate-800 px-2 py-1 rounded border border-slate-700">⏳ {timer}s</span>
              </>
            )}
            {!loading && finalTime !== null && (
              <span className="text-emerald-300 font-mono bg-slate-800 px-2 py-1 rounded border border-slate-700">✅ {finalTime}s</span>
            )}
          </div>
        )}
      </div>
      <div className="flex gap-2">
        <input
          className="flex-1 border border-slate-700 bg-slate-900 text-slate-100 placeholder:text-slate-500 rounded px-3 py-2"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') sendMessage(); }}
          placeholder="Ask about the document or request a summary..."
          disabled={loading}
        />
        <button
          className="bg-sky-600 hover:bg-sky-500 text-white px-4 py-2 rounded disabled:bg-slate-700"
          onClick={sendMessage}
          disabled={loading || !input.trim()}
        >
          Send
        </button>
      </div>
    </div>
  );
}

export default SummaryChat;
