import { Button } from 'primereact/button';
import { Message } from 'primereact/message';
import { ProgressSpinner } from 'primereact/progressspinner';
import { useEffect, useRef, useState } from 'react';
import { useChat } from '../hooks/useChat';

interface ChatPanelProps {
  sessionId: string;
  jobDescription?: string;
}

export function ChatPanel({ sessionId, jobDescription }: ChatPanelProps) {
  const { messages, isSending, error, examplePrompts, sendMessage } = useChat(
    sessionId,
    jobDescription,
  );
  const [draft, setDraft] = useState('');
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = listRef.current;
    if (node) {
      node.scrollTop = node.scrollHeight;
    }
  }, [messages, isSending]);

  return (
    <section id="chat" className="result-panel chat-panel">
      <div className="result-panel__header">
        <h2 className="section-title m-0">Ask about your CV</h2>
        <p className="section-subtitle m-0">
          Ask follow-up questions using the same CV sections and job description from this analysis.
          No re-upload needed.
        </p>
      </div>

      {messages.length === 0 && (
        <div className="chat-examples">
          <p className="question-item__label m-0">Try asking</p>
          <div className="chat-examples__list">
            {examplePrompts.map((prompt) => (
              <button
                key={prompt}
                type="button"
                className="chat-example"
                disabled={isSending}
                onClick={() => {
                  void sendMessage(prompt);
                }}
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
      )}

      <div ref={listRef} className="chat-messages" aria-live="polite">
        {messages.map((message, index) => (
          <article
            key={`${message.role}-${index}-${message.content.slice(0, 24)}`}
            className={`chat-bubble chat-bubble--${message.role}`}
          >
            <p className="chat-bubble__role m-0">
              {message.role === 'user' ? 'You' : 'MatchMind'}
            </p>
            <p className="chat-bubble__text m-0">{message.content}</p>
            {message.role === 'assistant' &&
              message.citedChunkIds &&
              message.citedChunkIds.length > 0 && (
                <p className="chat-bubble__citations m-0">
                  Based on {message.citedChunkIds.length} CV section
                  {message.citedChunkIds.length === 1 ? '' : 's'}
                </p>
              )}
          </article>
        ))}

        {isSending && (
          <div className="chat-pending">
            <ProgressSpinner style={{ width: '28px', height: '28px' }} strokeWidth="5" />
            <span>Finding relevant CV sections...</span>
          </div>
        )}
      </div>

      {error && <Message severity="error" text={error} className="w-full mt-3" />}

      <form
        className="chat-composer"
        onSubmit={(event) => {
          event.preventDefault();
          const next = draft;
          setDraft('');
          void sendMessage(next);
        }}
      >
        <textarea
          className="chat-input"
          rows={3}
          value={draft}
          disabled={isSending}
          placeholder="Ask about projects, rewrites, skill gaps, or interview prep..."
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              const next = draft;
              setDraft('');
              void sendMessage(next);
            }
          }}
        />
        <Button
          type="submit"
          label={isSending ? 'Sending...' : 'Send'}
          icon={isSending ? 'pi pi-spin pi-spinner' : 'pi pi-send'}
          disabled={isSending || !draft.trim()}
        />
      </form>
    </section>
  );
}
