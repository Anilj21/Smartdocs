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
      <h1 className="text-3xl font-bold mb-4">AI Document Chat</h1>
      <div className="mb-2 text-gray-600">File: <span className="font-mono">{fileName}</span></div>
      <div className="bg-white rounded-lg shadow p-4 h-96 overflow-y-auto mb-4 flex flex-col relative">
        {messages.map((msg, i) => (
          <div key={i} className={`mb-2 ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
            {msg.role === 'assistant' ? (
              <div className="inline-block px-3 py-2 rounded-lg bg-gray-100 text-gray-800 text-left whitespace-pre-line">
                {msg.content
                  // Split summary into lines by bullet, dash, or newline, fallback to sentences
                  .split(/\n|\r|•|- |\u2022|\d+\. /g)
                  .filter(line => line.trim() !== '')
                  .map((line, idx) => (
                    <div key={idx} className="mb-1">
                      <span className="font-semibold text-blue-700">• </span>
                      <span className="font-medium">{line.trim()}</span>
                    </div>
                  ))}
              </div>
            ) : (
              <span className="inline-block px-3 py-2 rounded-lg bg-blue-100 text-blue-900">{msg.content}</span>
            )}
          </div>
        ))}
        {(loading || finalTime !== null) && (
          <div className="flex items-center gap-3 text-xs mt-2">
            {loading && (
              <>
                <span className="text-gray-400">AI is typing...</span>
                <span className="text-blue-500 font-semibold animate-pulse">{processSteps[processStep]}</span>
                <span className="text-gray-500 font-mono bg-gray-100 px-2 py-1 rounded shadow">⏳ {timer}s</span>
              </>
            )}
            {!loading && finalTime !== null && (
              <span className="text-green-600 font-mono bg-gray-100 px-2 py-1 rounded shadow">✅ {finalTime}s</span>
            )}
          </div>
        )}
      </div>
      <div className="flex gap-2">
        <input
          className="flex-1 border rounded px-3 py-2"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') sendMessage(); }}
          placeholder="Ask about the document or request a summary..."
          disabled={loading}
        />
        <button
          className="bg-blue-600 text-white px-4 py-2 rounded disabled:bg-gray-400"
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
