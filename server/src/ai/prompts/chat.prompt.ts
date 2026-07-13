import type { ChatMessage } from '@matchmind/shared';
import type { StoredChunk } from '../../db/chroma/collections.js';

export function buildChatPrompt(
  message: string,
  chunks: StoredChunk[],
  history: ChatMessage[],
  jobDescription?: string,
): string {
  const chunkBlocks = chunks
    .map(
      (chunk) =>
        `[Chunk ${chunk.id} | Section: ${chunk.metadata.section}]\n${chunk.text}`,
    )
    .join('\n\n');

  const historyBlock =
    history.length === 0
      ? '(none)'
      : history.map((entry) => `${entry.role.toUpperCase()}: ${entry.content}`).join('\n');

  const jobBlock = jobDescription?.trim()
    ? jobDescription.trim()
    : '(not provided for this chat turn)';

  return `You are MatchMind, a career coach helping a candidate prepare for a job using their CV.

The job description below is the same role the candidate already analyzed against in this session.
When the user says "this role", "this job", or similar, use that job description. Do not ask them to paste it again if it is provided.

IMPORTANT RULES:
- Use ONLY the retrieved CV chunks below for claims about the candidate. Do not invent experience.
- Use the job description to interpret what "this role" means.
- If the answer is not supported by the chunks, say what is missing instead of guessing.
- Keep the reply practical and concise.
- citedChunkIds must only include IDs from the retrieved chunks that you actually used.
- Return JSON only.

Job description for this session:
${jobBlock}

Conversation history (oldest first):
${historyBlock}

Current user message:
${message.trim()}

Retrieved CV Chunks:
${chunkBlocks}

Return a JSON object with this shape:
{
  "answer": "Your reply to the user",
  "citedChunkIds": ["chunk-id-1", "chunk-id-2"]
}`;
}
