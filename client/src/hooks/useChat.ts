import type { ChatMessage } from '@matchmind/shared';
import { useCallback, useState } from 'react';
import { sendChatMessage } from '../services/api';

export interface ChatTurn extends ChatMessage {
  citedChunkIds?: string[];
}

const EXAMPLE_PROMPTS = [
  'Which projects on my CV best match this role?',
  'How should I rewrite my summary for this job?',
  'What skill gaps should I address first?',
];

export function useChat(sessionId: string, jobDescription?: string) {
  const [messages, setMessages] = useState<ChatTurn[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = useCallback(
    async (rawMessage: string) => {
      const message = rawMessage.trim();
      if (!message || isSending) {
        return;
      }

      const historyForRequest = messages.map(({ role, content }) => ({ role, content }));
      const userTurn: ChatTurn = { role: 'user', content: message };

      setMessages((current) => [...current, userTurn]);
      setIsSending(true);
      setError(null);

      try {
        const response = await sendChatMessage(
          sessionId,
          message,
          historyForRequest,
          jobDescription,
        );
        setMessages((current) => [
          ...current,
          {
            role: 'assistant',
            content: response.answer,
            citedChunkIds: response.citedChunkIds,
          },
        ]);
      } catch (err) {
        const messageText = err instanceof Error ? err.message : 'Chat request failed';
        setError(messageText);
        setMessages((current) => current.slice(0, -1));
      } finally {
        setIsSending(false);
      }
    },
    [isSending, jobDescription, messages, sessionId],
  );

  return {
    messages,
    isSending,
    error,
    examplePrompts: EXAMPLE_PROMPTS,
    sendMessage,
    clearError: () => setError(null),
  };
}
