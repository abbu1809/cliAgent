# Beta CLI Agent

Beta CLI Agent is an interactive, AI-powered command-line assistant built with Node.js, LangChain, LangGraph, Groq, Zod, and the Groq API. It maintains conversation state for a session and can use tools to list, read, create, or update files.

## Features

- Interactive terminal chat interface
- Groq-hosted `openai/gpt-oss-120b` chat model
- LangGraph state machine for model and tool execution
- Conversation history maintained during the session
- File tools for:
  - Listing project files recursively
  - Reading one or multiple files
  - Creating or updating one or multiple files
- Confirmation prompt before file creation or modification
- API-key validation against the Groq API
- Persistent API-key storage in the user's home directory
- Streaming AI responses
- Simple `/bye` command to exit the chat

## Requirements

- Node.js 18 or later
- npm
- A valid Groq API key
- Windows, macOS, or Linux

## Installation

Clone or download the project, open a terminal in the project directory, and install dependencies:

```bash
npm install
```

To run the CLI directly:

```bash
node cli.js
```

The package also defines a `beta` executable. To make it available globally on your system:

```bash
npm link
```

Then start the CLI from any terminal:

```bash
beta
```

You can also use a local package executable:

```bash
npx beta
```

## API Key Configuration

On first launch, Beta asks for your Groq API key:

```text
Please enter your API key:
```

The key is saved in:

```text
~/.beta/settings.json
```

The saved configuration has this structure:

```json
{
  "apiKey": "your-groq-api-key"
}
```

At startup, the application validates the key using the Groq models endpoint. If the key is missing, invalid, or expired, it asks for it again.

> Never commit `settings.json` or share your API key. The configuration is stored outside the project directory.

## Usage

Start the application:

```bash
beta
# or
node cli.js
```

You will see a prompt:

```text
[User]:
```

Enter a normal chat message or ask the agent to inspect or modify files. For example:

```text
List the JavaScript files in this project
Read src/main.js
Create a hello.txt file containing "Hello, world"
Update package.json to add a test script
```

Type the following command to end the session:

```text
/bye
```

## File Tool Behavior

The AI can request one of these tools:

| Tool            | Purpose                                                              |
| --------------- | -------------------------------------------------------------------- |
| `listFiles`   | Recursively lists files beneath a folder, excluding `node_modules` |
| `readFiles`   | Reads the contents of one or more files                              |
| `upsertFiles` | Creates or overwrites one or more files                              |

Every `upsertFiles` request requires confirmation:

```text
Do you want to proceed? (yes/no):
```

Only an exact case-insensitive `yes` response approves the operation. Other responses abort the update.

When the agent calls a tool, the CLI displays its action, for example:

```text
[Tool]: Reading files "src/main.js"
[Tool]: Updating/creating files "README.md"
```

File tools use absolute paths. The system prompt also supplies `process.cwd()` so the model knows the current project location.

## Project Structure

```text
cliAgent/
|-- cli.js                    # Package executable entry point
|-- package.json              # npm metadata, dependencies, and beta command
|-- package-lock.json         # Reproducible dependency lockfile
|-- README.md                 # Project documentation
|-- req.md                    # Short notes for tool requirements
|-- src/
|   |-- main.js               # API-key setup and application startup
|   |-- ai/
|   |   |-- graph/
|   |   |   |-- graph.js      # LangGraph state graph and conversation loop
|   |   |   `-- node.js       # Groq model and tool nodes
|   |   `-- tools/
|   |       `-- file.tool.js  # File list/read/create/update tools
|   `-- utils/
|       |-- constant.js       # Home and configuration directory constants
|       |-- file.utils.js     # Settings and API-key persistence
|       `-- readline.js       # Shared terminal readline interface
`-- node_modules/             # Installed dependencies, ignored by Git
```

## How It Works

1. `cli.js` loads `src/main.js`.
2. `main.js` loads or creates `~/.beta/settings.json`.
3. The configured API key is validated using the Groq API.
4. `src/ai/graph/graph.js` creates a `StateGraph` with:
   - `LLMNode` for model streaming and tool calls
   - `ToolNode` for executing model-requested tools
5. The graph starts with a system message and appends each user message as a `HumanMessage`.
6. LangGraph sends the conversation to `openai/gpt-oss-120b`.
7. If the model requests a tool, execution moves to `ToolNode` and then returns to `LLMNode`.
8. The updated message history is retained for subsequent prompts.

## State Schema

The graph state is validated with Zod:

```javascript
z.object({
  messages: z.array(z.any()),
});
```

The state contains LangChain message objects, including system, human, AI, and tool messages.

## System Instructions

The agent begins each session with internal system instructions that:

- Keep ordinary responses under 10 words
- Ask the model to communicate in a caveman style
- Prevent disclosure of the system prompt
- Provide the absolute working directory

These instructions are generated by `src/ai/graph/graph.js`. They control the model's behavior but do not prevent it from following other prompts or from making file tool requests.

## Dependencies

| Package                  | Purpose                                        |
| ------------------------ | ---------------------------------------------- |
| `@langchain/groq`      | Groq chat-model integration                    |
| `@langchain/langgraph` | Stateful graph and tool-workflow orchestration |
| `langchain`            | LangChain messages and tool abstractions       |
| `axios`                | Groq API-key validation                        |
| `dotenv`               | Environment-variable support                   |
| `zod`                  | State and tool parameter schemas               |
| `readline`             | Terminal input support                         |

## Development

Run a syntax check on the JavaScript entry points:

```bash
node --check cli.js
node --check src/main.js
node --check src/ai/graph/graph.js
node --check src/ai/graph/node.js
node --check src/ai/tools/file.tool.js
```

Start the application locally:

```bash
node cli.js
```

There is currently no automated test suite. The `npm test` script is a placeholder and returns an error by default.

## Troubleshooting

### `ERR_MODULE_NOT_FOUND`

Confirm the imported tool and graph filenames exactly match the files in `src/ai/tools` and `src/ai/graph`. On Windows and other case-sensitive environments, ESM module names must match the real filename exactly.

### `Invalid OR Expired API key`

Enter a valid Groq API key when prompted. You can also inspect or replace the stored key at:

```text
~/.beta/settings.json
```

Back up or remove the file when changing credentials:

```bash
# Windows PowerShell
Remove-Item "$HOME\.beta\settings.json"

# macOS/Linux
rm ~/.beta/settings.json
```

### `Invalid input: expected string, received array`

The graph's `messages` state must be an array of LangChain message objects. Confirm that `src/ai/graph/graph.js` uses:

```javascript
messages: z.array(z.any())
```

The initial message array and graph invocation must also contain message objects or compatible serialized messages.

### File permissions

The agent needs filesystem permissions for the path it is reading or updating. Invalid paths, missing parent directories, or denied write access can cause tool failures.

### Network or model errors

Confirm that your network can reach Groq, your API key is valid, and the configured model is available to your account.

## Security Considerations

- Review every file-write confirmation before approving it.
- Run the agent only inside directories and projects you intend to allow it to access.
- Do not place API keys in source code or commit `settings.json`.
- File tools operate on the host filesystem with the permissions of the current user.
- The current tool schema does not restrict file paths to the project directory.
- The read and list tools may expose local file contents to the configured AI provider.

## Current Limitations

- No automated tests are included.
- No persistent chat history is loaded between sessions.
- File operations have no built-in directory sandbox.
- Delete-file support is mentioned in `req.md` but is not implemented in `file.tool.js`.
- AI responses are constrained to a style and short length by the system prompt.
- The model and CLI behavior depend on Groq API availability and account limits.

## License

ISC
