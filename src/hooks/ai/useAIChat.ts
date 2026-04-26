import { useState, useCallback, useRef, useEffect } from 'react';
import type { AIMessage } from '@/types';
import { generateSecureId } from '@/utils/crypto';

/**
 * Hook for managing AI chat messages
 * Handles message state, adding messages, resetting chat, and auto-scrolling
 */
export function useAIChat() {
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  /**
   * Add a message to the chat
   * @param role - The role of the message sender ('user' or 'assistant')
   * @param content - The message content
   * @returns The created message object
   */
  const addMessage = useCallback((role: AIMessage['role'], content: string): AIMessage => {
    const msg: AIMessage = {
      id: generateSecureId('msg'),
      role,
      content,
      timestamp: new Date().toISOString()
    };
    setMessages(prev => [...prev, msg]);
    return msg;
  }, []);

  /**
   * Reset the chat by clearing all messages
   */
  const resetChat = useCallback(() => {
    setMessages([]);
  }, []);

  return {
    messages,
    addMessage,
    resetChat,
    bottomRef,
  };
}
