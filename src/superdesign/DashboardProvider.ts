import * as vscode from 'vscode';

export class SuperDesignDashboardProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'superdesign.dashboard';
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
                case 'createCodespace':
                    vscode.commands.executeCommand('github.codespaces.addEnvironment');
                    break;
                case 'refreshDashboard':
                    vscode.commands.executeCommand('github.codespaces.refresh');
                    break;
                case 'exportLogs':
                    vscode.commands.executeCommand('github.codespaces.exportLogs');
                    break;
                case 'openCodespace':
                    vscode.commands.executeCommand('github.codespaces.connect');
                    break;
            }
        });
    }

    public refresh() {
        if (this._view) {
            this._view.webview.postMessage({ type: 'refresh' });
        }
    }

    private _getHtmlForWebview(webview: vscode.Webview) {
        const styleResetUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'reset.css'));
        const styleVSCodeUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'vscode.css'));
        const styleMainUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'main.css'));
        const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'main.js'));

        const nonce = getNonce();

        return `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource}; script-src 'nonce-${nonce}';">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <link href="${styleResetUri}" rel="stylesheet">
            <link href="${styleVSCodeUri}" rel="stylesheet">
            <link href="${styleMainUri}" rel="stylesheet">
            <title>SuperDesign Dashboard</title>
        </head>
        <body>
            <div class="dashboard-container">
                <header class="dashboard-header">
                    <h1 class="dashboard-title">
                        <span class="codicon codicon-dashboard"></span>
                        Codespaces Dashboard
                    </h1>
                    <div class="header-actions">
                        <button class="btn btn-primary" onclick="createCodespace()">
                            <span class="codicon codicon-add"></span>
                            New Codespace
                        </button>
                        <button class="btn btn-secondary" onclick="refreshDashboard()">
                            <span class="codicon codicon-refresh"></span>
                            Refresh
                        </button>
                    </div>
                </header>

                <main class="dashboard-main">
                    <section class="stats-section">
                        <div class="stats-grid">
                            <div class="stat-card running">
                                <div class="stat-icon">
                                    <span class="codicon codicon-circle-filled"></span>
                                </div>
                                <div class="stat-content">
                                    <div class="stat-number" id="runningCount">0</div>
                                    <div class="stat-label">Running</div>
                                </div>
                            </div>
                            
                            <div class="stat-card stopped">
                                <div class="stat-icon">
                                    <span class="codicon codicon-primitive-square"></span>
                                </div>
                                <div class="stat-content">
                                    <div class="stat-number" id="stoppedCount">0</div>
                                    <div class="stat-label">Stopped</div>
                                </div>
                            </div>
                            
                            <div class="stat-card total">
                                <div class="stat-icon">
                                    <span class="codicon codicon-server"></span>
                                </div>
                                <div class="stat-content">
                                    <div class="stat-number" id="totalCount">0</div>
                                    <div class="stat-label">Total</div>
                                </div>
                            </div>
                        </div>
                    </section>

                    <section class="codespaces-section">
                        <div class="section-header">
                            <h2>Your Codespaces</h2>
                            <div class="filter-tabs">
                                <button class="filter-tab active" data-filter="all">All</button>
                                <button class="filter-tab" data-filter="running">Running</button>
                                <button class="filter-tab" data-filter="stopped">Stopped</button>
                            </div>
                        </div>
                        
                        <div class="codespaces-list" id="codespacesList">
                            <!-- Codespaces will be populated here -->
                        </div>
                    </section>

                    <section class="quick-actions-section">
                        <h2>Quick Actions</h2>
                        <div class="actions-grid">
                            <button class="action-card" onclick="exportLogs()">
                                <span class="codicon codicon-file-text"></span>
                                <span>Export Logs</span>
                            </button>
                            
                            <button class="action-card" onclick="manageSecrets()">
                                <span class="codicon codicon-key"></span>
                                <span>Manage Secrets</span>
                            </button>
                            
                            <button class="action-card" onclick="viewDocs()">
                                <span class="codicon codicon-book"></span>
                                <span>Documentation</span>
                            </button>
                            
                            <button class="action-card" onclick="sendFeedback()">
                                <span class="codicon codicon-comment"></span>
                                <span>Send Feedback</span>
                            </button>
                        </div>
                    </section>
                </main>
            </div>
            
            <script nonce="${nonce}" src="${scriptUri}"></script>
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