import React, { useEffect, useRef, useState } from 'react';
import { useChatStore } from '../store/useChatStore';
import ChatHeader from './ChatHeader';
import MessageInput from './MessageInput';
import MessageSkeleton from './skeletons/MessageSkeleton';
import { useAuthStore } from '../store/useAuthStore';
import { formatMessageTime } from '../lib/utils';
import { axiosInstance } from '../lib/axios.js';

const reactionEmojis = [
  "👍", "❤️", "😂", "🔥", "😮", "😢", "👏", "🎉",
  "💯", "🤔", "😡", "🙌", "💀", "🤩", "😎", "🥰"
];

const ChatContainer = () => {
  const {
    messages,
    getMessages,
    isMessageLoading,
    selectedUser,
    subscribeToMessages,
    unsubscribeFromMessages,
  } = useChatStore();

  const { authUser } = useAuthStore();
  const messageEndRef = useRef(null);
  const contextMenuRef = useRef(null);

  const [contextMenu, setContextMenu] = useState({
    visible: false,
    x: 0,
    y: 0,
    messageId: null,
    isOwn: false,
  });

  const [reactionMenu, setReactionMenu] = useState({
    visible: false,
    x: 0,
    y: 0,
    messageId: null,
  });

  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editingText, setEditingText] = useState('');

  useEffect(() => {
    if (selectedUser?._id) {
      getMessages(selectedUser._id);
      subscribeToMessages();
      return () => unsubscribeFromMessages();
    }
  }, [selectedUser?._id]);

  useEffect(() => {
    if (messageEndRef.current && messages.length > 0) {
      messageEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

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
      if (
        (contextMenuRef.current && !contextMenuRef.current.contains(e.target)) &&
        reactionMenu.visible
      ) {
        setReactionMenu({ visible: false, x: 0, y: 0, messageId: null });
      }
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target)) {
        setContextMenu((prev) => ({ ...prev, visible: false }));
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [reactionMenu]);

  const startEditing = (message) => {
    setEditingMessageId(message._id);
    setEditingText(message.text);
    setContextMenu((prev) => ({ ...prev, visible: false }));
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
      await axiosInstance.delete(`/messages/${id}`, {
        data: { userId: authUser._id },
      });
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
    setContextMenu((prev) => ({ ...prev, visible: false }));
  };

  const handleReact = async (messageId, emoji) => {
    try {
      await axiosInstance.post(`/messages/${messageId}/react`, { emoji });
      getMessages(selectedUser._id); // refresh to show updated reactions
      setReactionMenu({ visible: false, x: 0, y: 0, messageId: null });
    } catch (err) {
      console.error("Failed to react:", err);
    }
  };



  if (isMessageLoading) {
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
        {messages.map((message, index) => {
          const isLast = index === messages.length - 1;
          const isOwn = message.senderId === authUser._id;
          const isEditing = editingMessageId === message._id;

          const isDeletedForUser = message.deletedFor?.includes(authUser._id);
          const showEditedLabel = message.edited && !isDeletedForUser;

          const tooltipTime =
            message.editedAt || message.updatedAt || message.createdAt;

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
                    src={
                      isOwn
                        ? authUser.profilepic || '/avatar.png'
                        : selectedUser.profilepic || '/avatar.png'
                    }
                    alt="profile"
                  />
                </div>
              </div>

              <div className="chat-header mb-1">
                <time className="text-xs opacity-50 ml-1">
                  {formatMessageTime(message.createdAt)}
                </time>
              </div>

              <div className="chat-bubble flex flex-col relative group">
                {message.fileUrl && !isDeletedForUser && (
                  <>
                    {/* 🖼️ Image preview */}
                    {message.fileType === "image" && (
                      <img
                        src={message.fileUrl}
                        alt={message.fileName || "Image"}
                        className="sm:max-w-[200px] rounded-lg mb-2 border border-gray-300 dark:border-gray-600 shadow-sm"
                      />
                    )}

                    {/* 🎥 Video preview */}
                    {message.fileType === "video" && (
                      <video
                        src={message.fileUrl}
                        controls
                        className="sm:max-w-[250px] rounded-lg mb-2 border border-gray-300 dark:border-gray-600 shadow-sm"
                      />
                    )}

                    {/* 📄 PDF download link */}
                    {/* 📄 PDF download link */}
                    {message.fileType === "pdf" && (
                      <div className="mt-2 flex items-center gap-2">
                        <a
                          href={`${message.fileUrl}?fl_attachment=${encodeURIComponent(message.fileName)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          download={message.fileName}
                          className="flex items-center text-blue-500 underline hover:text-blue-600"
                        >
                          📄 {message.fileName || "Download PDF"}
                        </a>
                        <a
                          href={`${message.fileUrl}?fl_attachment=${encodeURIComponent(message.fileName)}`}
                          download={message.fileName}
                          className="text-sm text-gray-500 hover:text-gray-700"
                          title="Download file"
                        >
                          ⬇️
                        </a>
                      </div>
                    )}


                  </>
                )}



                {isDeletedForUser ? (
                  <p className="italic text-gray-500">You deleted this message</p>
                ) : (
                  <>
                    {!isEditing && message.text && (
                      <p className="whitespace-pre-wrap break break-words">
                        {message.text}
                      </p>
                    )}

                    {isEditing && (
                      <div className="flex flex-col gap-2">
                        <textarea
                          className="border rounded p-2 w-full"
                          value={editingText}
                          onChange={(e) => setEditingText(e.target.value)}
                        />
                        <div className="flex gap-2">
                          <button
                            className="bg-blue-500 text-white px-3 py-1 rounded"
                            onClick={() => handleSaveEdit(message._id)}
                          >
                            Save
                          </button>
                          <button
                            className="bg-red-600 px-3 py-1 rounded"
                            onClick={() => setEditingMessageId(null)}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}

                    {showEditedLabel && !isEditing && (
                      <span
                        className="text-xs text-gray-400 mt-1 self-end"
                        title={`Last edited: ${formatMessageTime(tooltipTime)}`}
                      >
                        Edited
                      </span>
                    )}

                    {/* 🟢 Reaction display */}
                    {message.reactions?.length > 0 && (
                      <div className="flex gap-1 mt-1 self-start flex-wrap">
                        {message.reactions.map((r, i) => (
                          <span
                            key={i}
                            className={`text-sm px-1 rounded cursor-default ${r.userId === authUser._id
                              ? 'bg-blue-200 dark:bg-blue-600'
                              : 'bg-gray-200 dark:bg-gray-700'
                              }`}
                          >
                            {r.emoji}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* 🟡 Hover reaction trigger */}
                    <button
                      onClick={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const menuWidth = Math.min(
                          window.innerWidth - 20,
                          reactionEmojis.length * 40
                        );
                        const leftPos =
                          rect.left + menuWidth > window.innerWidth
                            ? window.innerWidth - menuWidth - 10
                            : rect.left;
                        setReactionMenu({
                          visible: true,
                          x: leftPos,
                          y: rect.top + window.scrollY - 40,
                          messageId: message._id,
                        });
                      }}
                      className="absolute hidden group-hover:block bottom-0 right-0 text-xs text-gray-400 bg-white/30 rounded px-1 hover:bg-white/60"
                    >
                      🙂
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}

        {/* 📍 Reaction Menu */}
        {reactionMenu.visible && (
          <div
            className="fixed z-50 flex gap-2 bg-white dark:bg-gray-800 shadow-lg border border-gray-300 dark:border-gray-700 rounded-full p-2 overflow-x-auto max-w-[90vw]"
            style={{
              top: `${reactionMenu.y}px`,
              left: `${reactionMenu.x}px`,
            }}
          >
            {reactionEmojis.map((emoji) => (
              <span
                key={emoji}
                className="cursor-pointer text-xl hover:scale-125 transition-transform flex-shrink-0"
                onClick={() => handleReact(reactionMenu.messageId, emoji)}
              >
                {emoji}
              </span>
            ))}
          </div>
        )}

        {/* 📋 Context Menu */}
        {contextMenu.visible && (
          <div
            ref={contextMenuRef}
            className="fixed z-50 bg-white text-black dark:bg-gray-800 dark:text-white shadow-lg border border-gray-300 dark:border-gray-700 rounded-md w-32"
            style={{
              top: `${contextMenu.y}px`,
              left: `${contextMenu.x}px`,
            }}
          >
            <div
              className="px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
              onClick={() => handleCopy(contextMenu.messageId)}
            >
              📋 Copy
            </div>

            {contextMenu.isOwn && (
              <div
                className="px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                onClick={() => {
                  const msg = messages.find(
                    (m) => m._id === contextMenu.messageId
                  );
                  if (msg) startEditing(msg);
                }}
              >
                ✏️ Edit
              </div>
            )}

            <div
              className="px-4 py-2 hover:bg-red-100 dark:hover:bg-red-600 cursor-pointer"
              onClick={() => {
                handleDelete(contextMenu.messageId);
                setContextMenu((prev) => ({ ...prev, visible: false }));
              }}
            >
              🗑️ Delete
            </div>
          </div>
        )}
      </div>

      <MessageInput />
    </div>
  );
};

export default ChatContainer;
