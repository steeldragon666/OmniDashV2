import * as vscode from 'vscode';

export class SuperDesignChatViewProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'superdesign.chatView';
    private _view?: vscode.WebviewView;

    constructor(private readonly _extensionUri: vscode.Uri) {}

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken
    ) {
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri]
        };

        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

        webviewView.webview.onDidReceiveMessage(data => {
            switch (data.type) {
                case 'sendMessage':
                    this.handleChatMessage(data.message);
                    break;
                case 'clearChat':
                    this.clearChatHistory();
                    break;
                case 'executeCommand':
                    vscode.commands.executeCommand(data.command, ...(data.args || []));
                    break;
                case 'insertCode':
                    this.insertCodeSnippet(data.code, data.language);
                    break;
            }
        });
    }

    private async handleChatMessage(message: string) {
        if (this._view) {
            // Add user message to chat
            this._view.webview.postMessage({ 
                type: 'addMessage', 
                message: {
                    content: message,
                    sender: 'user',
                    timestamp: new Date().toISOString()
                }
            });

            // Simulate AI response (in real implementation, this would call an AI service)
            setTimeout(() => {
                const responses = [
                    "I can help you with Codespaces management. What would you like to do?",
                    "Here's a code snippet for creating a new development container:\n\n```json\n{\n  \"name\": \"Node.js\",\n  \"image\": \"mcr.microsoft.com/vscode/devcontainers/javascript-node:16\"\n}\n```",
                    "To optimize your Codespace, consider:\n1. Using prebuilt images\n2. Configuring port forwarding\n3. Setting up dotfiles",
                    "Would you like me to help you create a new Codespace or manage existing ones?"
                ];
                
                const randomResponse = responses[Math.floor(Math.random() * responses.length)];
                
                if (this._view) {
                    this._view.webview.postMessage({ 
                        type: 'addMessage', 
                        message: {
                            content: randomResponse,
                            sender: 'assistant',
                            timestamp: new Date().toISOString()
                        }
                    });
                }
            }, 1000);
        }
    }

    private clearChatHistory() {
        if (this._view) {
            this._view.webview.postMessage({ type: 'clearMessages' });
        }
    }

    private async insertCodeSnippet(code: string, language: string) {
        const activeEditor = vscode.window.activeTextEditor;
        if (activeEditor) {
            const selection = activeEditor.selection;
            await activeEditor.edit(editBuilder => {
                editBuilder.replace(selection, code);
            });
        }
    }

    public refresh() {
        if (this._view) {
            this._view.webview.postMessage({ type: 'refresh' });
        }
    }

    private _getHtmlForWebview(webview: vscode.Webview) {
        const styleResetUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'reset.css'));
        const styleVSCodeUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'vscode.css'));
        const styleChatUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'chat.css'));
        const scriptChatUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'chat.js'));

        const nonce = getNonce();

        return `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource}; script-src 'nonce-${nonce}';">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <link href="${styleResetUri}" rel="stylesheet">
            <link href="${styleVSCodeUri}" rel="stylesheet">
            <link href="${styleChatUri}" rel="stylesheet">
            <title>SuperDesign Chat Assistant</title>
        </head>
        <body>
            <div class="chat-container">
                <header class="chat-header">
                    <div class="chat-title">
                        <span class="codicon codicon-comment-discussion"></span>
                        Chat Assistant
                    </div>
                    <div class="chat-actions">
                        <button class="btn btn-icon" onclick="clearChat()" title="Clear chat">
                            <span class="codicon codicon-trash"></span>
                        </button>
                        <button class="btn btn-icon" onclick="refreshChat()" title="Refresh">
                            <span class="codicon codicon-refresh"></span>
                        </button>
                    </div>
                </header>

                <div class="chat-messages" id="chatMessages">
                    <div class="welcome-message">
                        <div class="welcome-icon">
                            <span class="codicon codicon-robot"></span>
                        </div>
                        <h3>Welcome to SuperDesign Chat!</h3>
                        <p>I'm your AI assistant for Codespaces management. Ask me about:</p>
                        <ul>
                            <li>Creating and managing Codespaces</li>
                            <li>Development container configuration</li>
                            <li>Code snippets and best practices</li>
                            <li>Troubleshooting issues</li>
                        </ul>
                        <div class="quick-questions">
                            <button class="quick-btn" onclick="askQuestion('How do I create a new Codespace?')">
                                How do I create a new Codespace?
                            </button>
                            <button class="quick-btn" onclick="askQuestion('Show me a devcontainer.json example')">
                                Show me a devcontainer.json example
                            </button>
                            <button class="quick-btn" onclick="askQuestion('How to optimize Codespace performance?')">
                                How to optimize performance?
                            </button>
                        </div>
                    </div>
                </div>

                <div class="chat-input-container">
                    <div class="chat-input-wrapper">
                        <textarea 
                            id="chatInput" 
                            class="chat-input" 
                            placeholder="Ask me anything about Codespaces..."
                            rows="1"
                        ></textarea>
                        <button class="btn btn-primary chat-send" onclick="sendMessage()">
                            <span class="codicon codicon-send"></span>
                        </button>
                    </div>
                    <div class="chat-suggestions">
                        <button class="suggestion-btn" onclick="insertSuggestion('Create a new Codespace')">
                            <span class="codicon codicon-add"></span>
                            Create Codespace
                        </button>
                        <button class="suggestion-btn" onclick="insertSuggestion('Show running Codespaces')">
                            <span class="codicon codicon-list-unordered"></span>
                            List Codespaces
                        </button>
                        <button class="suggestion-btn" onclick="insertSuggestion('Help with devcontainer setup')">
                            <span class="codicon codicon-gear"></span>
                            Setup Help
                        </button>
                    </div>
                </div>
            </div>
            
            <script nonce="${nonce}" src="${scriptChatUri}"></script>
        </body>
        </html>`;
    }
}

function getNonce() {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}