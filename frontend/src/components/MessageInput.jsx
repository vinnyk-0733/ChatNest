import React, { useRef, useState, useEffect } from 'react'
import { useChatStore } from '../store/useChatStore'
import { X, Image, Send, Mic, MicOff } from 'lucide-react'
import toast from 'react-hot-toast'

const MessageInput = () => {
    const [text, setText] = useState("")
    const [imagePreview, setImagePreview] = useState(null)
    const [listening, setListening] = useState(false)
    const fileInputRef = useRef(null)
    const recognitionRef = useRef(null)
    const { sendMessage } = useChatStore()

    useEffect(() => {
        // Initialize SpeechRecognition
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
        if (!SpeechRecognition) {
            toast.error("Your browser does not support speech recognition")
            return
        }

        const recognition = new SpeechRecognition()
        recognition.continuous = true
        recognition.interimResults = true
        recognition.lang = "en-US"

        recognition.onresult = (event) => {
            let interimTranscript = ""
            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript
                if (event.results[i].isFinal) {
                    setText(prev => prev + transcript + " ")
                } else {
                    interimTranscript += transcript
                }
            }
            // Optionally show interim transcript if you want
        }

        recognition.onerror = (event) => {
            console.error("Speech recognition error:", event.error)
            toast.error("Speech recognition error: " + event.error)
            setListening(false)
        }

        recognitionRef.current = recognition
    }, [])

    const toggleListening = () => {
        if (!recognitionRef.current) return

        if (listening) {
            recognitionRef.current.stop()
            setListening(false)
        } else {
            try {
                recognitionRef.current.start()
                setListening(true)
            } catch (err) {
                console.error("Failed to start recognition:", err)
            }
        }
    }

    const handleImageChange = (e) => {
        const file = e.target.files[0]
        if (!file.type.startsWith("image/")) {
            toast.error("Please select an image file")
            return
        }
        const reader = new FileReader()
        reader.onloadend = () => {
            setImagePreview(reader.result)
        }
        reader.readAsDataURL(file)
    }

    const removeImage = () => {
        setImagePreview(null)
        if (fileInputRef.current) fileInputRef.current.value = ""
    }

    const handleSendMessage = async (e) => {
        e.preventDefault()
        if (!text.trim() && !imagePreview) return

        try {
            await sendMessage({
                text: text.trim(),
                image: imagePreview,
            })
            setText("")
            setImagePreview(null)
            if (fileInputRef.current) fileInputRef.current.value = ""
        } catch (error) {
            console.error("Failed to send message:", error)
        }
    }

    return (
        <div className='p-4 w-full'>
            {imagePreview && (
                <div className="mb-3 flex items-center gap-2">
                    <div className="relative">
                        <img src={imagePreview} alt="Preview" className='w-20 h-20 object-cover rounded-lg border border-zinc-700' />
                        <button
                            onClick={removeImage}
                            className='absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-base-300 flex items-center justify-center'
                            type='button'>
                            <X className="size-3" />
                        </button>
                    </div>
                </div>
            )}

            <form onSubmit={handleSendMessage} className='flex items-center gap-2'>
                <div className="flex-1 flex gap-2">
                    <textarea
                        className='w-full textarea textarea-bordered rounded-lg resize-none px-3 py-2 text-sm leading-5'
                        placeholder='Type a message...'
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        rows={1}
                        style={{
                            minHeight: "36px",
                            maxHeight: "150px",
                            overflowY: "auto",
                        }}
                        onInput={(e) => {
                            e.target.style.height = "auto";
                            e.target.style.height = e.target.scrollHeight + "px";
                        }}
                    />

                    <input type="file"
                        accept='image/*'
                        className='hidden'
                        ref={fileInputRef}
                        onChange={handleImageChange} />

                    <button type='button'
                        className={`hidden sm:flex btn btn-circle ${imagePreview ? "text-emerald-500" : "text-zinc-400"}`}
                        onClick={() => fileInputRef.current?.click()}>
                        <Image size={20} />
                    </button>

                    {/* Voice-to-text button */}
                    <button type='button'
                        className={`hidden sm:flex btn btn-circle ${listening ? "text-red-500" : "text-zinc-400"}`}
                        onClick={toggleListening}>
                        {listening ? <MicOff size={20} /> : <Mic size={20} />}
                    </button>
                </div>

                <button type='submit' className='btn btn-sm btn-circle'
                    disabled={!text.trim() && !imagePreview}>
                    <Send size={22} />
                </button>
            </form>
        </div>
    )
}

export default MessageInput