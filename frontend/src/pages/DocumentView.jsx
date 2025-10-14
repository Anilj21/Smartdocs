import { useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import axios from 'axios';

export default function DocumentView() {
  const { filename } = useParams();
  const [fileUrl, setFileUrl] = useState('');
  const [filetype, setFiletype] = useState('');

  useEffect(() => {
    if (filename) {
      setFileUrl(`http://localhost:5000/public/uploads/${filename}`);
      setFiletype(filename.split('.').pop().toLowerCase());
    }
  }, [filename]);

  return (
    <div className="flex h-screen">
      {/* Document Viewer */}
      <div className="flex-1 border-r border-slate-800 overflow-auto bg-slate-900">
        {filetype === 'pdf' ? (
          <iframe src={fileUrl} title="Document" className="w-full h-full" />
        ) : filetype === 'docx' || filetype === 'pptx' ? (
          <div className="flex flex-col items-center justify-center h-full">
            <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="text-sky-300 underline text-lg">Open Document in New Tab</a>
            <p className="mt-2 text-slate-400">Preview for this file type is not supported in-browser.</p>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full">
            <p className="text-slate-400">Unsupported file type.</p>
          </div>
        )}
      </div>
      {/* AI Actions */}
      <div className="flex-1 flex flex-col p-8 bg-slate-900">
        <h2 className="text-2xl font-bold mb-4 text-slate-100">AI Tools</h2>
        <button className="mb-4 px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-500 transition">Summarize Document</button>
        <div className="flex-1 border border-slate-800 rounded-lg p-4 bg-slate-900">
          <h3 className="font-semibold mb-2 text-slate-100">Chat with Document</h3>
          <div className="h-64 overflow-y-auto border border-slate-800 rounded p-2 mb-2 bg-slate-900 text-slate-200">{/* Chat UI placeholder */}</div>
          <div className="flex">
            <input className="flex-1 border border-slate-700 bg-slate-900 text-slate-100 placeholder:text-slate-500 rounded-l px-3 py-2" placeholder="Ask something..." />
            <button className="bg-sky-600 text-white px-4 py-2 rounded-r hover:bg-sky-500">Send</button>
          </div>
        </div>
      </div>
    </div>
  );
}
