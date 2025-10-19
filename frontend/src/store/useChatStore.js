import { create } from "zustand";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios";
import { useAuthStore } from "./useAuthStore";

export const useChatStore = create((set, get) => ({
  messages: [],
  filteredMessages: [],
  users: [],
  selectedUser: null,
  isUsersLoading: false,
  isMessagesLoading: false,

  getUsers: async () => {
    set({ isUsersLoading: true });
    try {
      const res = await axiosInstance.get("/messages/users");
      set({ users: res.data });
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load users");
    } finally {
      set({ isUsersLoading: false });
    }
  },

  getMessages: async (userId) => {
    set({ isMessagesLoading: true });
    try {
      const res = await axiosInstance.get(`/messages/${userId}`);
      set({ messages: res.data });
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load messages");
    } finally {
      set({ isMessagesLoading: false });
    }
  },

  setMessages: (msgs) => set({ messages: msgs }),
  setFilteredMessages: (msgs) => set({ filteredMessages: msgs }),

  sendMessage: async (messageData) => {
    const { selectedUser } = get();
    try {
      await axiosInstance.post(`/messages/send/${selectedUser._id}`, messageData);
      // optionally update messages here
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to send message");
    }
  },

  subscribeToMessages: () => {
    const { selectedUser } = get();
    if (!selectedUser) return;

    const socket = useAuthStore.getState().socket;

    socket.on("newMessage", (newMessage) => {
      const isRelevant = newMessage.senderId === selectedUser._id || newMessage.receiverId === selectedUser._id;
      if (!isRelevant) return;
      set({ messages: [...get().messages, newMessage] });
    });

    socket.on("messageEdited", (updatedMessage) => {
      const isRelevant = updatedMessage.senderId === selectedUser._id || updatedMessage.receiverId === selectedUser._id;
      if (!isRelevant) return;
      set({
        messages: get().messages.map((m) =>
          m._id === updatedMessage._id
            ? { ...m, text: updatedMessage.text, edited: updatedMessage.edited ?? true, editedAt: updatedMessage.editedAt || new Date().toISOString() }
            : m
        ),
      });
    });

    // ✅ handle reactions
    socket.on("messageReaction", (updatedMessage) => {
      const isRelevant = updatedMessage.senderId === selectedUser._id || updatedMessage.receiverId === selectedUser._id;
      if (!isRelevant) return;
      set({
        messages: get().messages.map((m) =>
          m._id === updatedMessage._id ? { ...m, reactions: updatedMessage.reactions || [] } : m
        ),
      });
    });
  },

  unsubscribeFromMessages: () => {
    const socket = useAuthStore.getState().socket;
    socket.off("newMessage");
    socket.off("messageEdited");
    socket.off("messageReaction");
  },

  setSelectedUser: (selectedUser) => set({ selectedUser }),

  clearMessages: () => set({ messages: [], filteredMessages: [] }),
}));
