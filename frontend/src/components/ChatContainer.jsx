import React, { useEffect, useRef, useState } from 'react';
import { useChatStore } from '../store/useChatStore';
import ChatHeader from './ChatHeader';
import MessageInput from './MessageInput';
import MessageSkeleton from './skeletons/MessageSkeleton';
import { useAuthStore } from '../store/useAuthStore';
import { formatMessageTime } from '../lib/utils';
import { axiosInstance } from '../lib/axios.js';

const REACTIONS = ['👍', '❤️', '😊', '😆', '😮', '😢'];

const ChatContainer = () => {
  const {
    messages,
    filteredMessages,
    getMessages,
    isMessagesLoading,
    selectedUser,
    subscribeToMessages,
    unsubscribeFromMessages,
    clearMessages,
  } = useChatStore();

  const { authUser } = useAuthStore();
  const messageEndRef = useRef(null);
  const contextMenuRef = useRef(null);

  const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0, messageId: null, isOwn: false });
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editingText, setEditingText] = useState('');
  const [openReactionFor, setOpenReactionFor] = useState(null);

  useEffect(() => {
    if (selectedUser?._id) {
      clearMessages();
      getMessages(selectedUser._id);
      subscribeToMessages();
      return () => unsubscribeFromMessages();
    }
  }, [selectedUser?._id]);

  useEffect(() => {
    if (messageEndRef.current && (filteredMessages.length || messages.length)) {
      messageEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [filteredMessages, messages]);

  const handleRightClick = (e, messageId, isOwn) => {
    e.preventDefault();
    const bubble = e.currentTarget.getBoundingClientRect();
    setContextMenu({
      visible: true,
      x: bubble.left + (isOwn ? bubble.width - 130 : 0),
      y: bubble.top + window.scrollY - 60,
      messageId,
      isOwn,
    });
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target)) {
        setContextMenu(prev => ({ ...prev, visible: false }));
      }
      if (!e.target.closest('.reaction-popup') && !e.target.closest('.reaction-button')) {
        setOpenReactionFor(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const startEditing = (message) => {
    setEditingMessageId(message._id);
    setEditingText(message.text);
    setContextMenu(prev => ({ ...prev, visible: false }));
  };

  const handleSaveEdit = async (id) => {
    try {
      await axiosInstance.put(`/messages/${id}`, { text: editingText });
      setEditingMessageId(null);
      setEditingText('');
      getMessages(selectedUser._id);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id) => {
    try {
      await axiosInstance.delete(`/messages/${id}`, { data: { userId: authUser._id } });
      getMessages(selectedUser._id);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCopy = async (id) => {
    const msg = messages.find((m) => m._id === id);
    if (msg?.text) {
      try {
        await navigator.clipboard.writeText(msg.text);
      } catch (err) {
        console.error("Copy failed", err);
      }
    }
    setContextMenu(prev => ({ ...prev, visible: false }));
  };

  const displayMessages = filteredMessages.length > 0 ? filteredMessages : messages;

  // Reaction API
  const handleReact = async (messageId, emoji) => {
    try {
      await axiosInstance.post(`/messages/${messageId}/react`, { emoji });
      setOpenReactionFor(null); // close popup
    } catch (err) {
      console.error("React failed", err);
    }
  };

  const computeReactionInfo = (reactions = []) => {
    const counts = {};
    let userReaction = null;
    reactions.forEach((r) => {
      counts[r.emoji] = (counts[r.emoji] || 0) + 1;
      const uid = typeof r.userId === 'string' ? r.userId : r.userId?._id || r.userId.toString();
      if (uid === (authUser._id?.toString())) userReaction = r.emoji;
    });
    return { counts, userReaction };
  };

  const buildReactionTooltip = (reactions = [], emoji) => {
    const reactors = reactions
      .filter((r) => r.emoji === emoji)
      .map((r) => r.userId?.name || r.userId?._id || "Unknown");
    return reactors.join(", ");
  };

  if (isMessagesLoading) {
    return (
      <div className="flex-1 flex flex-col overflow-auto">
        <ChatHeader />
        <MessageSkeleton />
        <MessageInput />
      </div>
    );
  }

  return (
    <div className="relative flex-1 flex flex-col overflow-auto">
      <ChatHeader />
      <div className="flex-1 overflow-y-auto p-4 space-y-4 relative">
        {displayMessages.map((message, index) => {
          const isLast = index === displayMessages.length - 1;
          const isOwn = message.senderId === authUser._id;
          const isEditing = editingMessageId === message._id;
          const isDeletedForUser = message.deletedFor?.includes(authUser._id);
          const showEditedLabel = message.edited && !isDeletedForUser;
          const tooltipTime = message.editedAt || message.updatedAt || message.createdAt;

          const reactionsArray = message.reactions || [];
          const { counts, userReaction } = computeReactionInfo(reactionsArray);

          return (
            <div
              key={message._id}
              ref={isLast ? messageEndRef : null}
              onContextMenu={(e) => handleRightClick(e, message._id, isOwn)}
              className={`chat ${isOwn ? 'chat-end' : 'chat-start'}`}
            >
              <div className="chat-image avatar">
                <div className="size-10 rounded-full border">
                  <img
                    src={isOwn ? authUser.profilepic || '/avatar.png' : selectedUser.profilepic || '/avatar.png'}
                    alt="profile"
                  />
                </div>
              </div>

              <div className="chat-header mb-1">
                <time className="text-xs opacity-50 ml-1">{formatMessageTime(message.createdAt)}</time>
              </div>

              <div
                className={`chat-bubble flex flex-col relative group transition-all duration-200 ${isOwn ? "bg-primary text-primary-content" : "bg-base-200 text-base-content"}`}
              >
                {/* Reaction button */}
                {/* Small reaction button at bottom-right corner */}
                {/* Small reaction button at bottom-right, visible on hover */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setOpenReactionFor(openReactionFor === message._id ? null : message._id);
                  }}
                  className="reaction-button absolute -bottom-2 -right-3 hidden group-hover:inline-flex items-center justify-center w-6 h-6 rounded-full shadow-sm bg-white dark:bg-gray-800 border border-base-200 text-sm"
                  title="React"
                >
                  🙂
                </button>

                {/* Reaction popup, appears above bubble when button clicked */}
                {openReactionFor === message._id && (
                  <div
                    className="reaction-popup absolute bottom-0 left-full ml-2 z-50 p-2 rounded-full shadow-lg flex flex-row flex-wrap gap-2 items-center bg-white dark:bg-gray-800 border border-base-200"
                    style={{ maxWidth: '180px' }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {REACTIONS.map((emoji) => (
                      <button
                        key={emoji}
                        className="text-lg leading-none p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                        onClick={() => {
                          handleReact(message._id, emoji);
                          setOpenReactionFor(null);
                        }}
                        type="button"
                        title={`React ${emoji}`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                )}




                {/* Media messages */}
                {message.fileUrl && !isDeletedForUser && (
                  <>
                    {message.fileType === "image" && (
                      <img src={message.fileUrl} alt={message.fileName || "Image"} className="sm:max-w-[200px] rounded-lg mb-2 border border-base-300 shadow-sm transition-colors duration-200" />
                    )}
                    {message.fileType === "video" && (
                      <video src={message.fileUrl} controls className="sm:max-w-[250px] rounded-lg mb-2 border border-base-300 shadow-sm transition-colors duration-200" />
                    )}
                    {message.fileType === "pdf" && (
                      <div className="mt-2 flex items-center gap-2">
                        <a href={`${message.fileUrl}?fl_attachment=${encodeURIComponent(message.fileName)}`} target="_blank" rel="noopener noreferrer" className="flex items-center underline hover:no-underline text-info">
                          📄 {message.fileName || "Download PDF"}
                        </a>
                        <a href={`${message.fileUrl}?fl_attachment=${encodeURIComponent(message.fileName)}`} download={message.fileName} className="text-sm text-info/70 hover:text-info" title="Download file">⬇️</a>
                      </div>
                    )}
                  </>
                )}

                {isDeletedForUser ? (
                  <p className="italic text-base-content/50">You deleted this message</p>
                ) : (
                  <>
                    {!isEditing && message.text && (
                      <p className="whitespace-pre-wrap break-words" dangerouslySetInnerHTML={{ __html: message.highlightedText || message.text }} />
                    )}

                    {isEditing && (
                      <div className="flex flex-col gap-2">
                        <textarea
                          className="border rounded p-2 w-full text-base-content bg-base-100"
                          value={editingText}
                          onChange={(e) => setEditingText(e.target.value)}
                        />
                        <div className="flex gap-2">
                          <button className="btn btn-primary btn-sm" onClick={() => handleSaveEdit(message._id)}>Save</button>
                          <button className="btn btn-error btn-sm" onClick={() => setEditingMessageId(null)}>Cancel</button>
                        </div>
                      </div>
                    )}

                    {showEditedLabel && !isEditing && (
                      <span className="text-xs text-base-content/50 mt-1 self-end" title={`Last edited: ${formatMessageTime(tooltipTime)}`}>Edited</span>
                    )}

                    {/* Aggregated reactions row */}
                    {Object.keys(counts).length > 0 && (
                      <div className="mt-2">
                        <div className="flex flex-wrap gap-2">
                          {Object.keys(counts).map((emoji) => {
                            const count = counts[emoji];
                            const tooltip = buildReactionTooltip(reactionsArray, emoji);
                            const isUserReacted = userReaction === emoji;
                            return (
                              <button
                                key={emoji}
                                onClick={() => handleReact(message._id, emoji)}
                                className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-sm ${isUserReacted ? "bg-primary/10 border border-primary" : "bg-base-100 border border-base-200"}`}
                                title={tooltip || `${count} reaction${count > 1 ? "s" : ""}`}
                              >
                                <span>{emoji}</span>
                                <span className="text-xs opacity-70">{count}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          );
        })}

        {/* Context Menu */}
        {contextMenu.visible && (
          <div ref={contextMenuRef} className="fixed z-50 bg-white text-black dark:bg-gray-800 dark:text-white shadow-lg border border-gray-300 dark:border-gray-700 rounded-md w-32" style={{ top: `${contextMenu.y}px`, left: `${contextMenu.x}px` }}>
            <div className="px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer" onClick={() => handleCopy(contextMenu.messageId)}>📋 Copy</div>
            {contextMenu.isOwn && (
              <div className="px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer" onClick={() => { const msg = messages.find((m) => m._id === contextMenu.messageId); if (msg) startEditing(msg); }}>✏️ Edit</div>
            )}
            <div className="px-4 py-2 hover:bg-red-100 dark:hover:bg-red-600 cursor-pointer" onClick={() => { handleDelete(contextMenu.messageId); setContextMenu(prev => ({ ...prev, visible: false })); }}>🗑️ Delete</div>
          </div>
        )}
      </div>

      <MessageInput />
    </div>
  );
};

export default ChatContainer;
