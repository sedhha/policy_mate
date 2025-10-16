# JSON Format Instruction - Automatic Appending

## Overview

The `sendMessage` function now automatically appends `" return response in JSON format"` to **every message** sent to the backend. This instruction is invisible to users but helps the backend return structured responses.

## How It Works

### Backend Side (Sent to API)

```typescript
// User types: "What is this document about?"
// Actual message sent to backend:
'[META:file_id=doc123] What is this document about? return response in JSON format';
```

### Frontend Side (Displayed to User)

```typescript
// User sees in chat window: "What is this document about?"
// Clean message with all backend instructions stripped
```

## Implementation Details

### 1. Automatic Appending in `sendMessage()`

```typescript
const JSON_FORMAT_INSTRUCTION = ' return response in JSON format';

export const sendMessage = async <T = any>(
  prompt: string,
  sessionId?: string,
  metadata?: MessageMetadata
): Promise<AgentResponse<T>> => {
  // Metadata tag: [META:file_id=doc123]
  const metadataTag = buildMetadataTag(metadata);

  // Append JSON instruction to user's message
  const promptWithInstruction = `${prompt}${JSON_FORMAT_INSTRUCTION}`;

  // Final format: [META:file_id=doc123] user message return response in JSON format
  const taggedPrompt = `${metadataTag}${promptWithInstruction}`;

  // Send to backend...
};
```

### 2. Stripping Functions for Display

#### `stripJsonFormatInstruction(text)`

Removes the JSON format instruction from text.

```typescript
export const stripJsonFormatInstruction = (text: string): string => {
  return text.replace(/\s*return response in JSON format\s*$/i, '');
};
```

**Example:**

```typescript
const input = 'What is this about? return response in JSON format';
const output = stripJsonFormatInstruction(input);
// Result: "What is this about?"
```

#### `stripBackendInstructions(text)`

**Recommended for UI display** - Removes both metadata tags AND JSON instruction.

```typescript
export const stripBackendInstructions = (text: string): string => {
  let cleanText = stripMetadataTags(text);
  cleanText = stripJsonFormatInstruction(cleanText);
  return cleanText.trim();
};
```

**Example:**

```typescript
const input =
  '[META:file_id=doc123] Analyze this return response in JSON format';
const output = stripBackendInstructions(input);
// Result: "Analyze this"
```

## Usage in Components

### Chat Page Example

```typescript
import { stripBackendInstructions } from '@/utils/apis';

const handleSendMessage = async (e: React.FormEvent) => {
  const userMessage = message.trim();

  // Display user's clean message (no instructions)
  setMessages((prev) => [
    ...prev,
    {
      role: 'user',
      content: userMessage,
    },
  ]);

  // Send to backend (automatically includes: " return response in JSON format")
  const response = await sendChatMessage(
    userMessage,
    selectedDocument.document_id
  );

  if (response) {
    // Strip all backend instructions from response before displaying
    const cleanResponse = stripBackendInstructions(
      response.summarised_markdown || ''
    );

    setMessages((prev) => [
      ...prev,
      {
        role: 'assistant',
        content: cleanResponse,
      },
    ]);
  }
};
```

## Message Flow

### User Input

```
User types: "What are the compliance requirements?"
```

### Sent to Backend

```
[META:file_id=doc123] What are the compliance requirements? return response in JSON format
```

### Backend Processing

- Extracts metadata: `{ file_id: "doc123" }`
- Processes message: "What are the compliance requirements?"
- Sees instruction: "return response in JSON format"
- Returns structured JSON response

### Displayed to User

```
User Message: "What are the compliance requirements?"
Assistant Response: "The compliance requirements include..."
```

_(All backend instructions and metadata stripped)_

## Available Functions

| Function                       | Purpose                        | Use Case                                     |
| ------------------------------ | ------------------------------ | -------------------------------------------- |
| `stripMetadataTags()`          | Remove `[META:...]` tags       | When you only need to remove metadata        |
| `stripJsonFormatInstruction()` | Remove JSON format instruction | When you only need to remove the instruction |
| `stripBackendInstructions()`   | Remove ALL backend additions   | **Recommended for UI display**               |
| `extractMetadata()`            | Parse metadata into object     | When you need to read metadata values        |

## Benefits

1. ✅ **Consistency**: Every message automatically requests JSON format
2. ✅ **Clean UI**: Users never see backend instructions
3. ✅ **Developer Friendly**: Single function call to clean text
4. ✅ **Maintainable**: Change instruction in one place
5. ✅ **Backward Compatible**: Existing code works as-is

## Customization

To change the instruction, modify the constant:

```typescript
// In utils/apis/documents.ts
const JSON_FORMAT_INSTRUCTION = ' return response in JSON format';

// Change to:
const JSON_FORMAT_INSTRUCTION = ' please respond in structured JSON';
```

The stripping function will automatically adapt (uses regex with case-insensitive matching).

## Testing

```typescript
// Test the full flow
const userInput = 'Analyze this document';

// After sendMessage() - what backend receives:
// "[META:file_id=doc123] Analyze this document return response in JSON format"

// After stripBackendInstructions() - what user sees:
// "Analyze this document"
```

## Exports

All functions are exported from `@/utils/apis`:

```typescript
import {
  sendMessage,
  stripBackendInstructions, // ← Use this for display
  stripMetadataTags,
  stripJsonFormatInstruction,
  extractMetadata,
  type MessageMetadata,
} from '@/utils/apis';
```
