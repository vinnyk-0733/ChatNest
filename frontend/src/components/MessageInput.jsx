import React, { useRef, useState, useEffect } from 'react';
import { useChatStore } from '../store/useChatStore';
import { X, Image, Video, FileText, Send, Mic, MicOff } from 'lucide-react';
import toast from 'react-hot-toast';

const MessageInput = () => {
  const [text, setText] = useState('');
  const [filePreview, setFilePreview] = useState(null);
  const [fileType, setFileType] = useState(null);
  const [listening, setListening] = useState(false);
  const fileInputRef = useRef(null);
  const recognitionRef = useRef(null);
  const { sendMessage } = useChatStore();

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.onresult = (e) => {
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const transcript = e.results[i][0].transcript;
        if (e.results[i].isFinal) setText((prev) => prev + transcript + ' ');
        else interim += transcript;
      }
    };
    recognition.onerror = (e) => {
      toast.error('Speech error: ' + e.error);
      setListening(false);
    };
    recognitionRef.current = recognition;
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) return;
    if (listening) recognitionRef.current.stop();
    else recognitionRef.current.start();
    setListening(!listening);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.type.startsWith('image/')) setFileType('image');
    else if (file.type.startsWith('video/')) setFileType('video');
    else if (file.type === 'application/pdf') setFileType('pdf');
    else {
      toast.error('Only image, video, or PDF allowed');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => setFilePreview(reader.result);
    reader.readAsDataURL(file);
  };

  const removeFile = () => {
    setFilePreview(null);
    setFileType(null);
    fileInputRef.current.value = '';
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!text.trim() && !filePreview) return;
    try {
      await sendMessage({ text: text.trim(), file: filePreview });
      setText('');
      removeFile();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="p-4 w-full">
      {filePreview && (
        <div className="mb-3 relative inline-block">
          {fileType === 'image' && (
            <img src={filePreview} alt="preview" className="w-32 h-32 object-cover rounded-lg" />
          )}
          {fileType === 'video' && (
            <video src={filePreview} controls className="w-40 h-28 rounded-lg" />
          )}
          {fileType === 'pdf' && (
            <div className="flex items-center gap-2 bg-gray-800 p-3 rounded-lg text-white">
              <FileText /> <span>PDF attached</span>
            </div>
          )}
          <button
            onClick={removeFile}
            className="absolute -top-2 -right-2 w-6 h-6 flex items-center justify-center rounded-full bg-gray-600 text-white"
          >
            <X size={16} />
          </button>
        </div>
      )}

      <form onSubmit={handleSendMessage} className="flex items-center gap-2">
        <textarea
          className="w-full textarea textarea-bordered rounded-lg resize-none px-3 py-2 text-sm leading-5"
          placeholder="Type a message..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={1}
          autoComplete="off"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault(); // prevent newline
              handleSendMessage(e); // send message
            }
          }}
        />
              < input
            type = "file"
            accept = "image/*,video/*,application/pdf"
            ref = { fileInputRef }
            className = "hidden"
            onChange = { handleFileChange }
              />
        <button type="button" onClick={() => fileInputRef.current?.click()} className="btn btn-circle">
          <Image size={20} />
        </button>
        <button type="button" onClick={toggleListening} className="btn btn-circle">
          {listening ? <MicOff size={20} /> : <Mic size={20} />}
        </button>
        <button type="submit" disabled={!text.trim() && !filePreview} className="btn btn-circle">
          <Send size={20} />
        </button>
      </form>
    </div>
  );
};

export default MessageInput;
