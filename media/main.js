(function() {
    const vscode = acquireVsCodeApi();

    // Dashboard functionality
    window.createCodespace = function() {
        vscode.postMessage({ type: 'createCodespace' });
    };

    window.refreshDashboard = function() {
        vscode.postMessage({ type: 'refreshDashboard' });
        showRefreshAnimation();
    };

    window.exportLogs = function() {
        vscode.postMessage({ type: 'exportLogs' });
    };

    window.manageSecrets = function() {
        vscode.postMessage({ type: 'manageSecrets' });
    };

    window.viewDocs = function() {
        vscode.postMessage({ type: 'viewDocs' });
    };

    window.sendFeedback = function() {
        vscode.postMessage({ type: 'sendFeedback' });
    };

    // Initialize dashboard
    function initializeDashboard() {
        setupFilterTabs();
        loadCodespaces();
        updateStats();
        addAnimations();
    }

    // Filter tabs functionality
    function setupFilterTabs() {
        const filterTabs = document.querySelectorAll('.filter-tab');
        filterTabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                // Remove active class from all tabs
                filterTabs.forEach(t => t.classList.remove('active'));
                // Add active class to clicked tab
                e.target.classList.add('active');
                
                const filter = e.target.dataset.filter;
                filterCodespaces(filter);
            });
        });
    }

    // Filter codespaces based on status
    function filterCodespaces(filter) {
        const codespaceItems = document.querySelectorAll('.codespace-item');
        codespaceItems.forEach(item => {
            const status = item.dataset.status;
            if (filter === 'all' || status === filter) {
                item.style.display = 'flex';
                item.classList.add('slide-in');
            } else {
                item.style.display = 'none';
                item.classList.remove('slide-in');
            }
        });
    }

    // Load and display codespaces
    function loadCodespaces() {
        // Mock data - in real implementation, this would come from VS Code API
        const mockCodespaces = [
            {
                id: '1',
                name: 'my-awesome-project',
                repository: 'user/my-awesome-project',
                status: 'running',
                machineType: '4-core',
                createdAt: '2024-01-15T10:30:00Z',
                lastUsed: '2024-01-15T14:20:00Z'
            },
            {
                id: '2',
                name: 'react-dashboard',
                repository: 'company/react-dashboard',
                status: 'stopped',
                machineType: '2-core',
                createdAt: '2024-01-14T09:15:00Z',
                lastUsed: '2024-01-14T18:45:00Z'
            },
            {
                id: '3',
                name: 'backend-api',
                repository: 'team/backend-api',
                status: 'running',
                machineType: '8-core',
                createdAt: '2024-01-13T16:00:00Z',
                lastUsed: '2024-01-15T12:10:00Z'
            }
        ];

        displayCodespaces(mockCodespaces);
    }

    // Display codespaces in the list
    function displayCodespaces(codespaces) {
        const container = document.getElementById('codespacesList');
        if (!container) return;

        if (codespaces.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <span class="codicon codicon-server" style="font-size: 48px; color: var(--vscode-descriptionForeground); margin-bottom: 16px;"></span>
                    <h3>No codespaces found</h3>
                    <p>Create your first codespace to get started with cloud development.</p>
                    <button class="btn btn-primary" onclick="createCodespace()">
                        <span class="codicon codicon-add"></span>
                        Create Codespace
                    </button>
                </div>
            `;
            return;
        }

        container.innerHTML = codespaces.map(codespace => `
            <div class="codespace-item slide-in" data-status="${codespace.status}">
                <div class="codespace-info">
                    <div class="codespace-header">
                        <h3 class="codespace-name">${codespace.name}</h3>
                        <span class="codespace-status status-${codespace.status}">
                            <span class="codicon ${getStatusIcon(codespace.status)}"></span>
                            ${codespace.status.charAt(0).toUpperCase() + codespace.status.slice(1)}
                        </span>
                    </div>
                    <div class="codespace-details">
                        <span class="codespace-repo">
                            <span class="codicon codicon-repo"></span>
                            ${codespace.repository}
                        </span>
                        <span class="codespace-machine">
                            <span class="codicon codicon-server"></span>
                            ${codespace.machineType}
                        </span>
                        <span class="codespace-time">
                            <span class="codicon codicon-clock"></span>
                            ${formatRelativeTime(codespace.lastUsed)}
                        </span>
                    </div>
                </div>
                <div class="codespace-actions">
                    <button class="btn btn-primary" onclick="openCodespace('${codespace.id}')">
                        <span class="codicon ${codespace.status === 'running' ? 'codicon-plug' : 'codicon-play'}"></span>
                        ${codespace.status === 'running' ? 'Connect' : 'Start'}
                    </button>
                    <button class="btn btn-secondary" onclick="showCodespaceMenu('${codespace.id}')">
                        <span class="codicon codicon-kebab-vertical"></span>
                    </button>
                </div>
            </div>
        `).join('');

        // Add CSS for codespace items
        if (!document.getElementById('codespace-styles')) {
            const styles = document.createElement('style');
            styles.id = 'codespace-styles';
            styles.textContent = `
                .codespace-item {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 16px;
                    border-bottom: 1px solid var(--sd-border);
                }
                
                .codespace-item:last-child {
                    border-bottom: none;
                }
                
                .codespace-info {
                    flex: 1;
                }
                
                .codespace-header {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    margin-bottom: 8px;
                }
                
                .codespace-name {
                    font-size: 16px;
                    font-weight: 600;
                    margin: 0;
                }
                
                .codespace-status {
                    display: flex;
                    align-items: center;
                    gap: 4px;
                    padding: 4px 8px;
                    border-radius: 12px;
                    font-size: 11px;
                    font-weight: 500;
                    text-transform: uppercase;
                }
                
                .status-running {
                    background: rgba(76, 175, 80, 0.2);
                    color: var(--sd-success);
                }
                
                .status-stopped {
                    background: rgba(158, 158, 158, 0.2);
                    color: var(--vscode-descriptionForeground);
                }
                
                .codespace-details {
                    display: flex;
                    gap: 16px;
                    font-size: 12px;
                    color: var(--sd-text-secondary);
                }
                
                .codespace-details span {
                    display: flex;
                    align-items: center;
                    gap: 4px;
                }
                
                .codespace-actions {
                    display: flex;
                    gap: 8px;
                }
                
                .empty-state {
                    text-align: center;
                    padding: 48px 24px;
                }
                
                .empty-state h3 {
                    margin: 0 0 8px 0;
                    font-size: 18px;
                    font-weight: 600;
                }
                
                .empty-state p {
                    margin: 0 0 24px 0;
                    color: var(--sd-text-secondary);
                }
            `;
            document.head.appendChild(styles);
        }
    }

    // Helper functions
    function getStatusIcon(status) {
        switch (status) {
            case 'running': return 'codicon-circle-filled';
            case 'stopped': return 'codicon-primitive-square';
            default: return 'codicon-circle-outline';
        }
    }

    function formatRelativeTime(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        return `${diffDays}d ago`;
    }

    function updateStats() {
        // Mock stats - in real implementation, this would come from VS Code API
        document.getElementById('runningCount').textContent = '2';
        document.getElementById('stoppedCount').textContent = '1';
        document.getElementById('totalCount').textContent = '3';
    }

    function showRefreshAnimation() {
        const refreshBtn = document.querySelector('[onclick="refreshDashboard()"]');
        if (refreshBtn) {
            refreshBtn.classList.add('loading');
            setTimeout(() => {
                refreshBtn.classList.remove('loading');
            }, 1000);
        }
    }

    function addAnimations() {
        // Add stagger animation to stat cards
        const statCards = document.querySelectorAll('.stat-card');
        statCards.forEach((card, index) => {
            card.style.animationDelay = `${index * 0.1}s`;
            card.classList.add('slide-in');
        });

        // Add stagger animation to action cards
        const actionCards = document.querySelectorAll('.action-card');
        actionCards.forEach((card, index) => {
            card.style.animationDelay = `${(statCards.length + index) * 0.1}s`;
            card.classList.add('slide-in');
        });
    }

    // Global functions for codespace actions
    window.openCodespace = function(id) {
        vscode.postMessage({ type: 'openCodespace', id });
    };

    window.showCodespaceMenu = function(id) {
        // In a real implementation, this would show a context menu
        vscode.postMessage({ type: 'showCodespaceMenu', id });
    };

    // Listen for messages from the extension
    window.addEventListener('message', event => {
        const message = event.data;
        switch (message.type) {
            case 'refresh':
                loadCodespaces();
                updateStats();
                break;
        }
    });

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeDashboard);
    } else {
        initializeDashboard();
    }
})();