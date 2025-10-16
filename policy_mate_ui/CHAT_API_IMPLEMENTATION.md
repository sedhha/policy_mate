# Chat API Implementation Guide

## Overview

The chat system uses a unified API endpoint (`/chat`) with an extensible metadata tagging system for contextual information like file IDs.

## Metadata Tag System

### Format

Messages can be tagged with metadata in the format:

```
[META:key1=value1,key2=value2] actual message content
```

### Examples

```typescript
// With file context
'[META:file_id=doc123] What is this document about?';

// Multiple metadata
'[META:file_id=doc123,user_role=admin,priority=high] Analyze compliance';

// Without metadata
'Show me my documents';
```

### Why This Format?

- **Extensible**: Easy to add new metadata fields without breaking changes
- **Regex-friendly**: Simple pattern `\[META:[^\]]+\]\s*` for stripping
- **Backend-friendly**: Backend can parse metadata for context without polluting the user message
- **Frontend-friendly**: Easy to strip for display

## API Layer (`utils/apis/documents.ts`)

### Core Functions

#### `sendMessage<T>(prompt, sessionId?, metadata?)`

The primary function for all chat interactions.

```typescript
import { sendMessage } from '@/utils/apis/documents';

// Send a message with file context
const response = await sendMessage(
  'What is the compliance status?',
  sessionId,
  { file_id: 'doc123' }
);

// Send without context
const response = await sendMessage('List my documents', sessionId);
```

**Parameters:**

- `prompt`: The user's message
- `sessionId`: Optional session ID for conversation continuity
- `metadata`: Optional key-value pairs for context

**Returns:** `AgentResponse<T>` with typed payload

#### `stripMetadataTags(text)`

Remove metadata tags from text for display purposes.

```typescript
import { stripMetadataTags } from '@/utils/apis/documents';

const rawText = '[META:file_id=doc123] Hello world';
const displayText = stripMetadataTags(rawText);
// Result: 'Hello world'
```

#### `extractMetadata(text)`

Parse metadata from a tagged message.

```typescript
import { extractMetadata } from '@/utils/apis/documents';

const text = '[META:file_id=doc123,priority=high] Message';
const metadata = extractMetadata(text);
// Result: { file_id: 'doc123', priority: 'high' }
```

## Store Layer (`stores/agentStore.ts`)

### Chat Method

#### `sendChatMessage<T>(message, documentId?)`

High-level method exposed by the agent store.

```typescript
import { useAgentStore } from '@/stores/agentStore';

const { sendChatMessage, agentStates } = useAgentStore();

// Send message with document context
const response = await sendChatMessage(
  'Analyze this document',
  selectedDocument.document_id
);

// Check loading state
if (agentStates.chat.loading) {
  // Show spinner
}

// Check for errors
if (agentStates.chat.error) {
  console.error(agentStates.chat.error);
}
```

**Features:**

- Automatic metadata tagging with `file_id`
- Session management (auto-updates session ID)
- Loading state management
- Error handling
- Type-safe responses with generics

## Usage in Components

### Example: Chat Page

```typescript
'use client';
import { useState } from 'react';
import { useAgentStore } from '@/stores/agentStore';
import { stripMetadataTags } from '@/utils/apis';

export default function ChatPage() {
  const { selectedDocument, sendChatMessage, agentStates } = useAgentStore();
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!message.trim() || !selectedDocument) return;

    const userMessage = message.trim();

    // Add user message (no metadata tags in display)
    setMessages((prev) => [
      ...prev,
      {
        role: 'user',
        content: userMessage,
      },
    ]);
    setMessage('');

    // Send to agent with document context
    const response = await sendChatMessage(
      userMessage,
      selectedDocument.document_id
    );

    if (response) {
      // Strip metadata tags from response before display
      const assistantMessage = stripMetadataTags(
        response.summarised_markdown || 'No response'
      );

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: assistantMessage,
        },
      ]);
    }
  };

  return (
    <form onSubmit={handleSendMessage}>
      <input
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        disabled={agentStates.chat.loading}
      />
      <button
        type='submit'
        disabled={!message.trim() || agentStates.chat.loading}>
        {agentStates.chat.loading ? 'Sending...' : 'Send'}
      </button>
    </form>
  );
}
```

## Adding New Metadata Fields

To add a new metadata field:

1. **Update the interface** (optional, for type safety):

```typescript
// In utils/apis/documents.ts
export interface MessageMetadata {
  file_id?: string;
  user_role?: string; // NEW
  priority?: string; // NEW
  [key: string]: string | undefined;
}
```

2. **Pass it in the metadata object**:

```typescript
const response = await sendMessage('Urgent request', sessionId, {
  file_id: 'doc123',
  user_role: 'admin',
  priority: 'high',
});
```

3. **No changes needed** to:
   - `stripMetadataTags()` - automatically removes all metadata
   - `extractMetadata()` - automatically parses all key-value pairs
   - Backend parsing logic

## Backend Integration

The backend can parse metadata like this:

```python
import re

def extract_metadata(prompt: str) -> tuple[str, dict]:
    """Extract metadata and clean prompt"""
    match = re.search(r'\[META:([^\]]+)\]', prompt)

    if not match:
        return prompt, {}

    metadata_str = match.group(1)
    metadata = {}

    for pair in metadata_str.split(','):
        key, value = pair.split('=')
        metadata[key.strip()] = value.strip()

    # Remove metadata tag from prompt
    clean_prompt = re.sub(r'\[META:[^\]]+\]\s*', '', prompt)

    return clean_prompt, metadata

# Usage
clean_prompt, metadata = extract_metadata(
    "[META:file_id=doc123] What is this about?"
)
# clean_prompt: "What is this about?"
# metadata: {"file_id": "doc123"}
```

## Benefits

1. **Unified API**: Single endpoint for all chat operations
2. **Extensible**: Easy to add new metadata without breaking changes
3. **Clean Display**: Metadata automatically stripped from user-facing text
4. **Type Safe**: Full TypeScript support with generics
5. **State Management**: Integrated loading/error states
6. **Session Continuity**: Automatic session ID management
7. **Context Aware**: Backend receives rich context without polluting messages

## Migration from Old System

If you have existing code using the old system:

**Before:**

```typescript
const response = await fetch('/chat', {
  method: 'POST',
  body: JSON.stringify({ prompt, session_id }),
});
```

**After:**

```typescript
const response = await sendChatMessage(prompt, documentId);
```

The new system handles:

- Metadata tagging
- Session management
- Error handling
- Loading states
- Response parsing
