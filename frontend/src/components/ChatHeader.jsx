import React, { useState, useEffect } from "react";
import { X, Search } from "lucide-react";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import { axiosInstance } from "../lib/axios.js";
import debounce from "lodash.debounce";

const ChatHeader = () => {
  const { selectedUser, setSelectedUser, setFilteredMessages } = useChatStore();
  const { onlineUsers } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);

  // 🔹 Debounced search logic (same as before)
  const debouncedSearch = debounce(async (query) => {
    if (!selectedUser?._id) return;
    try {
      const res = await axiosInstance.get(
        `/messages/search/${selectedUser._id}?query=${query}`
      );
      setFilteredMessages(res.data);
    } catch (err) {
      console.error("Search failed:", err);
    }
  }, 500);

  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredMessages([]);
    } else {
      debouncedSearch(searchQuery);
    }
  }, [searchQuery]);

  return (
    <div className="p-2.5 border-b border-base-300">
      <div className="flex items-center justify-between gap-2">
        {/* Left section - User info */}
        <div className="flex items-center gap-3 flex-1">
          <div className="avatar">
            <div className="size-10 rounded-full relative overflow-hidden">
              <img
                src={selectedUser?.profilepic || "/avatar.png"}
                alt={selectedUser?.fullname}
              />
            </div>
          </div>
          <div className="flex flex-col">
            <h3 className="font-medium">{selectedUser?.fullname}</h3>
            <p className="text-sm text-base-content/70">
              {selectedUser && onlineUsers.includes(selectedUser._id)
                ? "Online"
                : "Offline"}
            </p>
          </div>
        </div>

        {/* Search button + input */}
        <div className="relative flex items-center gap-2">
          {!showSearch && (
            <button
              onClick={() => setShowSearch(true)}
              className="flex items-center gap-1 bg-blue-500 text-white px-3 py-1.5 rounded-full hover:bg-blue-600 transition-all duration-300"
            >
              <Search size={16} />
              <span className="text-sm font-medium">Search</span>
            </button>
          )}

          {/* Smooth transition input box */}
          <div
            className={`transition-all duration-300 ease-in-out ${
              showSearch
                ? "opacity-100 w-48 translate-x-0"
                : "opacity-0 w-0 -translate-x-3 pointer-events-none"
            }`}
          >
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search messages..."
              className="border border-gray-300 rounded-full px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 w-full shadow-sm"
              autoComplete="off"
            />
          </div>

          {/* Close search input (X) */}
          {showSearch && (
            <button
              onClick={() => {
                setShowSearch(false);
                setSearchQuery("");
                setFilteredMessages([]);
              }}
              className="text-gray-500 hover:text-red-500 transition-colors"
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* Close chat */}
        <button
          onClick={() => setSelectedUser(null)}
          className="text-gray-600 hover:text-red-500 transition-colors"
        >
          <X />
        </button>
      </div>
    </div>
  );
};

export default ChatHeader;
