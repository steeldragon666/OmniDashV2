(function() {
    const vscode = acquireVsCodeApi();
    let chatHistory = [];

    // Chat functionality
    window.sendMessage = function() {
        const input = document.getElementById('chatInput');
        const message = input.value.trim();
        
        if (message) {
            vscode.postMessage({ 
                type: 'sendMessage', 
                message: message 
            });
            input.value = '';
            adjustTextareaHeight(input);
        }
    };

    window.clearChat = function() {
        vscode.postMessage({ type: 'clearChat' });
    };

    window.refreshChat = function() {
        vscode.postMessage({ type: 'refresh' });
    };

    window.askQuestion = function(question) {
        const input = document.getElementById('chatInput');
        input.value = question;
        adjustTextareaHeight(input);
        sendMessage();
    };

    window.insertSuggestion = function(text) {
        const input = document.getElementById('chatInput');
        input.value = text;
        adjustTextareaHeight(input);
        input.focus();
    };

    // Initialize chat
    function initializeChat() {
        const chatInput = document.getElementById('chatInput');
        
        // Auto-resize textarea
        chatInput.addEventListener('input', function() {
            adjustTextareaHeight(this);
        });

        // Send message on Enter (but not Shift+Enter)
        chatInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });

        // Hide welcome message initially (will be shown if no messages)
        hideWelcomeMessage();
    }

    function adjustTextareaHeight(textarea) {
        textarea.style.height = 'auto';
        textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
    }

    function addMessage(message) {
        const messagesContainer = document.getElementById('chatMessages');
        hideWelcomeMessage();

        const messageElement = createMessageElement(message);
        messagesContainer.appendChild(messageElement);
        scrollToBottom();
        
        chatHistory.push(message);
    }

    function createMessageElement(message) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `chat-message ${message.sender}`;
        messageDiv.setAttribute('data-sender', message.sender);

        const avatar = document.createElement('div');
        avatar.className = `message-avatar ${message.sender}`;
        avatar.innerHTML = message.sender === 'user' ? 
            '<span class="codicon codicon-account"></span>' : 
            '<span class="codicon codicon-robot"></span>';

        const content = document.createElement('div');
        content.className = 'message-content';

        const bubble = document.createElement('div');
        bubble.className = 'message-bubble';
        
        // Process message content for code blocks and formatting
        bubble.innerHTML = processMessageContent(message.content);

        const time = document.createElement('div');
        time.className = 'message-time';
        time.textContent = formatTime(message.timestamp);

        // Add message actions for assistant messages
        if (message.sender === 'assistant') {
            const actions = createMessageActions(message);
            content.appendChild(actions);
        }

        content.appendChild(bubble);
        content.appendChild(time);

        messageDiv.appendChild(avatar);
        messageDiv.appendChild(content);

        return messageDiv;
    }

    function processMessageContent(content) {
        // Convert markdown-style code blocks to HTML
        content = content.replace(/```(\w+)?\n([\s\S]*?)\n```/g, function(match, language, code) {
            const lang = language || 'text';
            return `<pre><code class="language-${lang}">${escapeHtml(code.trim())}</code></pre>`;
        });

        // Convert inline code
        content = content.replace(/`([^`]+)`/g, '<code>$1</code>');

        // Convert line breaks
        content = content.replace(/\n/g, '<br>');

        return content;
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function createMessageActions(message) {
        const actions = document.createElement('div');
        actions.className = 'message-actions';

        // Copy button
        const copyBtn = document.createElement('button');
        copyBtn.className = 'message-action-btn';
        copyBtn.innerHTML = '<span class="codicon codicon-copy"></span>';
        copyBtn.title = 'Copy message';
        copyBtn.onclick = () => copyToClipboard(message.content);

        // Insert code button (if message contains code)
        if (message.content.includes('```')) {
            const insertBtn = document.createElement('button');
            insertBtn.className = 'message-action-btn';
            insertBtn.innerHTML = '<span class="codicon codicon-insert"></span>';
            insertBtn.title = 'Insert code';
            insertBtn.onclick = () => insertCode(message.content);
            actions.appendChild(insertBtn);
        }

        actions.appendChild(copyBtn);
        return actions;
    }

    function copyToClipboard(text) {
        navigator.clipboard.writeText(text).then(() => {
            showToast('Copied to clipboard');
        }).catch(() => {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = text;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            showToast('Copied to clipboard');
        });
    }

    function insertCode(messageContent) {
        // Extract code blocks from message
        const codeBlocks = messageContent.match(/```(\w+)?\n([\s\S]*?)\n```/g);
        if (codeBlocks && codeBlocks.length > 0) {
            const code = codeBlocks[0].replace(/```(\w+)?\n([\s\S]*?)\n```/, '$2');
            const language = codeBlocks[0].match(/```(\w+)/)?.[1] || 'text';
            
            vscode.postMessage({ 
                type: 'insertCode', 
                code: code.trim(),
                language: language
            });
        }
    }

    function showToast(message) {
        // Simple toast notification
        const toast = document.createElement('div');
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: var(--vscode-notifications-background);
            color: var(--vscode-notifications-foreground);
            padding: 8px 16px;
            border-radius: 4px;
            border: 1px solid var(--vscode-notifications-border);
            font-size: 12px;
            z-index: 1000;
            animation: slideInToast 0.3s ease;
        `;
        toast.textContent = message;
        document.body.appendChild(toast);

        setTimeout(() => {
            toast.style.animation = 'slideOutToast 0.3s ease forwards';
            setTimeout(() => document.body.removeChild(toast), 300);
        }, 2000);
    }

    function showTypingIndicator() {
        const messagesContainer = document.getElementById('chatMessages');
        
        const typingDiv = document.createElement('div');
        typingDiv.className = 'chat-message assistant typing-indicator';
        typingDiv.id = 'typingIndicator';
        
        const avatar = document.createElement('div');
        avatar.className = 'message-avatar assistant';
        avatar.innerHTML = '<span class="codicon codicon-robot"></span>';
        
        const content = document.createElement('div');
        content.className = 'message-content';
        
        const bubble = document.createElement('div');
        bubble.className = 'typing-indicator';
        bubble.innerHTML = `
            <span>Assistant is typing</span>
            <div class="typing-dots">
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
            </div>
        `;
        
        content.appendChild(bubble);
        typingDiv.appendChild(avatar);
        typingDiv.appendChild(content);
        
        messagesContainer.appendChild(typingDiv);
        scrollToBottom();
    }

    function hideTypingIndicator() {
        const typingIndicator = document.getElementById('typingIndicator');
        if (typingIndicator) {
            typingIndicator.remove();
        }
    }

    function hideWelcomeMessage() {
        const welcomeMessage = document.querySelector('.welcome-message');
        if (welcomeMessage) {
            welcomeMessage.style.display = 'none';
        }
    }

    function showWelcomeMessage() {
        const welcomeMessage = document.querySelector('.welcome-message');
        if (welcomeMessage) {
            welcomeMessage.style.display = 'block';
        }
    }

    function clearMessages() {
        const messagesContainer = document.getElementById('chatMessages');
        messagesContainer.innerHTML = `
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
        `;
        chatHistory = [];
    }

    function scrollToBottom() {
        const messagesContainer = document.getElementById('chatMessages');
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    function formatTime(timestamp) {
        const date = new Date(timestamp);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    // Listen for messages from the extension
    window.addEventListener('message', event => {
        const message = event.data;
        switch (message.type) {
            case 'addMessage':
                hideTypingIndicator();
                addMessage(message.message);
                break;
            case 'clearMessages':
                clearMessages();
                break;
            case 'refresh':
                location.reload();
                break;
        }
    });

    // Add CSS for toast animations
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideInToast {
            from {
                opacity: 0;
                transform: translateX(100%);
            }
            to {
                opacity: 1;
                transform: translateX(0);
            }
        }
        
        @keyframes slideOutToast {
            from {
                opacity: 1;
                transform: translateX(0);
            }
            to {
                opacity: 0;
                transform: translateX(100%);
            }
        }
    `;
    document.head.appendChild(style);

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeChat);
    } else {
        initializeChat();
    }

    // Intercept user message sending to show typing indicator
    const originalSendMessage = window.sendMessage;
    window.sendMessage = function() {
        const input = document.getElementById('chatInput');
        const message = input.value.trim();
        
        if (message) {
            // Add user message immediately
            addMessage({
                content: message,
                sender: 'user',
                timestamp: new Date().toISOString()
            });
            
            // Show typing indicator
            setTimeout(() => {
                showTypingIndicator();
            }, 500);
            
            // Send to extension
            vscode.postMessage({ 
                type: 'sendMessage', 
                message: message 
            });
            
            input.value = '';
            adjustTextareaHeight(input);
        }
    };
})();