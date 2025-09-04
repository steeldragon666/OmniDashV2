import * as vscode from 'vscode';
import { UserInferenceEngine, UserProfile, UserInferenceData } from './UserInferenceEngine';

export class UserContextProvider implements vscode.TreeDataProvider<UserContextItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<UserContextItem | undefined | null | void> = new vscode.EventEmitter<UserContextItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<UserContextItem | undefined | null | void> = this._onDidChangeTreeData.event;

    constructor(private inferenceEngine: UserInferenceEngine) {}

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: UserContextItem): vscode.TreeItem {
        return element;
    }

    async getChildren(element?: UserContextItem): Promise<UserContextItem[]> {
        if (!element) {
            return this.getRootItems();
        }

        switch (element.contextType) {
            case 'profiles':
                return this.getProfileItems();
            case 'inference':
                return this.getInferenceItems();
            case 'recommendations':
                return this.getRecommendationItems();
            case 'context':
                return this.getContextItems();
            default:
                return [];
        }
    }

    private getRootItems(): UserContextItem[] {
        return [
            new UserContextItem(
                'User Profiles',
                'profiles',
                vscode.TreeItemCollapsibleState.Expanded,
                {
                    command: 'userContext.showProfiles',
                    title: 'Show Profiles'
                }
            ),
            new UserContextItem(
                'Inference Data',
                'inference',
                vscode.TreeItemCollapsibleState.Collapsed,
                {
                    command: 'userContext.showInference',
                    title: 'Show Inference'
                }
            ),
            new UserContextItem(
                'Recommendations',
                'recommendations',
                vscode.TreeItemCollapsibleState.Collapsed,
                {
                    command: 'userContext.showRecommendations',
                    title: 'Show Recommendations'
                }
            ),
            new UserContextItem(
                'Current Context',
                'context',
                vscode.TreeItemCollapsibleState.Collapsed,
                {
                    command: 'userContext.showContext',
                    title: 'Show Context'
                }
            )
        ];
    }

    private async getProfileItems(): Promise<UserContextItem[]> {
        const profiles = await this.inferenceEngine.listProfiles();
        const currentProfile = this.inferenceEngine.getCurrentProfile();

        const items = profiles.map(profileId => {
            const isActive = currentProfile?.id === profileId;
            return new UserContextItem(
                isActive ? `${profileId} (active)` : profileId,
                'profile',
                vscode.TreeItemCollapsibleState.None,
                {
                    command: 'userContext.switchProfile',
                    title: 'Switch Profile',
                    arguments: [profileId]
                },
                isActive ? '$(account)' : '$(person)'
            );
        });

        items.push(new UserContextItem(
            'Create New Profile',
            'create-profile',
            vscode.TreeItemCollapsibleState.None,
            {
                command: 'userContext.createProfile',
                title: 'Create Profile'
            },
            '$(add)'
        ));

        return items;
    }

    private async getInferenceItems(): Promise<UserContextItem[]> {
        const inferenceData = this.inferenceEngine.getInferenceData();
        
        return [
            new UserContextItem(
                'Behavior Patterns',
                'behavior',
                vscode.TreeItemCollapsibleState.None,
                {
                    command: 'userContext.showBehaviorPatterns',
                    title: 'Show Behavior Patterns'
                },
                '$(graph)'
            ),
            new UserContextItem(
                'Technical Profile',
                'technical',
                vscode.TreeItemCollapsibleState.None,
                {
                    command: 'userContext.showTechnicalProfile',
                    title: 'Show Technical Profile'
                },
                '$(tools)'
            ),
            new UserContextItem(
                'Run Analysis',
                'analyze',
                vscode.TreeItemCollapsibleState.None,
                {
                    command: 'userContext.runAnalysis',
                    title: 'Run User Analysis'
                },
                '$(search)'
            )
        ];
    }

    private async getRecommendationItems(): Promise<UserContextItem[]> {
        const inferenceData = this.inferenceEngine.getInferenceData();
        
        return [
            new UserContextItem(
                `Tools (${inferenceData.recommendations.tools.length})`,
                'tool-recommendations',
                vscode.TreeItemCollapsibleState.None,
                {
                    command: 'userContext.showToolRecommendations',
                    title: 'Show Tool Recommendations'
                },
                '$(extensions)'
            ),
            new UserContextItem(
                `Workflows (${inferenceData.recommendations.workflows.length})`,
                'workflow-recommendations',
                vscode.TreeItemCollapsibleState.None,
                {
                    command: 'userContext.showWorkflowRecommendations',
                    title: 'Show Workflow Recommendations'
                },
                '$(workflow)'
            ),
            new UserContextItem(
                `Learning (${inferenceData.recommendations.learningResources.length})`,
                'learning-recommendations',
                vscode.TreeItemCollapsibleState.None,
                {
                    command: 'userContext.showLearningRecommendations',
                    title: 'Show Learning Recommendations'
                },
                '$(mortar-board)'
            ),
            new UserContextItem(
                `Optimizations (${inferenceData.recommendations.optimizations.length})`,
                'optimization-recommendations',
                vscode.TreeItemCollapsibleState.None,
                {
                    command: 'userContext.showOptimizationRecommendations',
                    title: 'Show Optimization Recommendations'
                },
                '$(rocket)'
            )
        ];
    }

    private async getContextItems(): Promise<UserContextItem[]> {
        const currentProfile = this.inferenceEngine.getCurrentProfile();
        if (!currentProfile) {
            return [
                new UserContextItem(
                    'No Active Profile',
                    'no-profile',
                    vscode.TreeItemCollapsibleState.None,
                    {
                        command: 'userContext.createProfile',
                        title: 'Create Profile'
                    },
                    '$(warning)'
                )
            ];
        }

        return [
            new UserContextItem(
                `Role: ${currentProfile.role}`,
                'role',
                vscode.TreeItemCollapsibleState.None,
                undefined,
                '$(organization)'
            ),
            new UserContextItem(
                `Experience: ${currentProfile.experience}`,
                'experience',
                vscode.TreeItemCollapsibleState.None,
                undefined,
                '$(star)'
            ),
            new UserContextItem(
                `Languages: ${currentProfile.preferences.languages.join(', ')}`,
                'languages',
                vscode.TreeItemCollapsibleState.None,
                undefined,
                '$(code)'
            ),
            new UserContextItem(
                `Project: ${currentProfile.context.currentProject.type}`,
                'project',
                vscode.TreeItemCollapsibleState.None,
                undefined,
                '$(folder)'
            )
        ];
    }
}

export class UserContextItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly contextType: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly command?: vscode.Command,
        public readonly iconPath?: string | vscode.ThemeIcon
    ) {
        super(label, collapsibleState);
        
        if (iconPath && typeof iconPath === 'string') {
            this.iconPath = new vscode.ThemeIcon(iconPath.replace('$(', '').replace(')', ''));
        } else if (iconPath) {
            this.iconPath = iconPath;
        }

        this.tooltip = `${this.label}`;
        this.contextValue = contextType;
    }
}

export class UserContextCommands {
    constructor(
        private context: vscode.ExtensionContext,
        private inferenceEngine: UserInferenceEngine,
        private treeProvider: UserContextProvider
    ) {
        this.registerCommands();
    }

    private registerCommands(): void {
        const commands = [
            vscode.commands.registerCommand('userContext.showProfiles', () => this.showProfiles()),
            vscode.commands.registerCommand('userContext.showInference', () => this.showInference()),
            vscode.commands.registerCommand('userContext.showRecommendations', () => this.showRecommendations()),
            vscode.commands.registerCommand('userContext.showContext', () => this.showContext()),
            vscode.commands.registerCommand('userContext.switchProfile', (profileId: string) => this.switchProfile(profileId)),
            vscode.commands.registerCommand('userContext.createProfile', () => this.createProfile()),
            vscode.commands.registerCommand('userContext.runAnalysis', () => this.runAnalysis()),
            vscode.commands.registerCommand('userContext.showBehaviorPatterns', () => this.showBehaviorPatterns()),
            vscode.commands.registerCommand('userContext.showTechnicalProfile', () => this.showTechnicalProfile()),
            vscode.commands.registerCommand('userContext.showToolRecommendations', () => this.showToolRecommendations()),
            vscode.commands.registerCommand('userContext.showWorkflowRecommendations', () => this.showWorkflowRecommendations()),
            vscode.commands.registerCommand('userContext.showLearningRecommendations', () => this.showLearningRecommendations()),
            vscode.commands.registerCommand('userContext.showOptimizationRecommendations', () => this.showOptimizationRecommendations())
        ];

        commands.forEach(command => this.context.subscriptions.push(command));
    }

    private async showProfiles(): Promise<void> {
        const profiles = await this.inferenceEngine.listProfiles();
        const currentProfile = this.inferenceEngine.getCurrentProfile();

        const profileList = profiles.map(id => {
            const isActive = currentProfile?.id === id;
            return `${isActive ? '→ ' : '  '}${id}${isActive ? ' (active)' : ''}`;
        }).join('\n');

        const content = `# User Profiles\n\n${profileList || 'No profiles found'}\n\n---\n\nUse the tree view to switch profiles or create new ones.`;
        
        this.showInformationPanel('User Profiles', content);
    }

    private async showInference(): Promise<void> {
        const inferenceData = this.inferenceEngine.getInferenceData();
        
        const content = `# User Inference Data

## Behavior Patterns
- **Problem Solving**: ${inferenceData.behaviorPatterns.problemSolvingApproach}
- **Preferred Workflows**: ${inferenceData.behaviorPatterns.preferredWorkflows.join(', ')}
- **Command Usage**: Top commands: ${Object.entries(inferenceData.behaviorPatterns.commandFrequency)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5)
    .map(([cmd, count]) => `${cmd}(${count})`)
    .join(', ')}

## Technical Profile
- **Expertise Areas**: ${inferenceData.technicalProfile.expertiseAreas.join(', ')}
- **Learning Areas**: ${inferenceData.technicalProfile.learningAreas.join(', ')}
- **Tool Proficiency**: ${Object.entries(inferenceData.technicalProfile.toolProficiency)
    .map(([tool, level]) => `${tool}: ${level}/10`)
    .join(', ')}

---
*Data is automatically updated based on your usage patterns*`;

        this.showInformationPanel('Inference Data', content);
    }

    private async showRecommendations(): Promise<void> {
        const inferenceData = this.inferenceEngine.getInferenceData();
        
        const content = `# Personalized Recommendations

## 🛠️ Recommended Tools
${inferenceData.recommendations.tools.map(tool => `- ${tool}`).join('\n')}

## 📋 Workflow Suggestions
${inferenceData.recommendations.workflows.map(workflow => `- ${workflow}`).join('\n')}

## 📚 Learning Resources
${inferenceData.recommendations.learningResources.map(resource => `- ${resource}`).join('\n')}

## 🚀 Optimizations
${inferenceData.recommendations.optimizations.map(opt => `- ${opt}`).join('\n')}

---
*Recommendations are based on your current skill level and project context*`;

        this.showInformationPanel('Recommendations', content);
    }

    private async showContext(): Promise<void> {
        const currentProfile = this.inferenceEngine.getCurrentProfile();
        
        if (!currentProfile) {
            vscode.window.showInformationMessage('No active profile. Create one first.');
            return;
        }

        const content = `# Current User Context

## Profile Information
- **Name**: ${currentProfile.name}
- **Role**: ${currentProfile.role}
- **Experience Level**: ${currentProfile.experience}

## Preferences
- **Languages**: ${currentProfile.preferences.languages.join(', ')}
- **Frameworks**: ${currentProfile.preferences.frameworks.join(', ')}
- **Tools**: ${currentProfile.preferences.tools.join(', ')}

## Coding Style
- **Indent**: ${currentProfile.preferences.codingStyle.indentSize} ${currentProfile.preferences.codingStyle.indentStyle}
- **Line Length**: ${currentProfile.preferences.codingStyle.lineLength}
- **Naming**: ${currentProfile.preferences.codingStyle.namingConvention}

## Current Project
- **Type**: ${currentProfile.context.currentProject.type}
- **Size**: ${currentProfile.context.currentProject.size}
- **Languages**: ${currentProfile.context.currentProject.languages.join(', ')}

## Session Data
- **Total Sessions**: ${currentProfile.context.sessionData.totalSessions}
- **Working Hours**: ${currentProfile.context.workingHours.start} - ${currentProfile.context.workingHours.end}

---
*Profile updated: ${new Date(currentProfile.updatedAt).toLocaleString()}*`;

        this.showInformationPanel('Current Context', content);
    }

    private async switchProfile(profileId: string): Promise<void> {
        const profile = await this.inferenceEngine.loadProfile(profileId);
        if (profile) {
            vscode.window.showInformationMessage(`Switched to profile: ${profile.name}`);
            this.treeProvider.refresh();
        } else {
            vscode.window.showErrorMessage('Failed to load profile');
        }
    }

    private async createProfile(): Promise<void> {
        const name = await vscode.window.showInputBox({
            prompt: 'Enter profile name',
            placeholder: 'e.g., john-frontend'
        });

        if (!name) return;

        const role = await vscode.window.showQuickPick([
            'frontend-developer',
            'backend-developer',
            'fullstack-developer',
            'devops-engineer',
            'data-scientist',
            'mobile-developer',
            'game-developer',
            'other'
        ], { placeHolder: 'Select your role' });

        if (!role) return;

        const experience = await vscode.window.showQuickPick([
            'junior',
            'mid',
            'senior',
            'lead',
            'principal'
        ], { placeHolder: 'Select experience level' });

        if (!experience) return;

        try {
            const profile = await this.inferenceEngine.createProfile({
                name,
                role,
                experience: experience as any
            });

            vscode.window.showInformationMessage(`Created profile: ${profile.name}`);
            this.treeProvider.refresh();
        } catch (error) {
            vscode.window.showErrorMessage('Failed to create profile');
        }
    }

    private async runAnalysis(): Promise<void> {
        vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: 'Analyzing user behavior...',
            cancellable: false
        }, async (progress) => {
            progress.report({ increment: 25, message: 'Analyzing workspace...' });
            
            await new Promise(resolve => setTimeout(resolve, 500));
            progress.report({ increment: 25, message: 'Analyzing command patterns...' });
            
            await new Promise(resolve => setTimeout(resolve, 500));
            progress.report({ increment: 25, message: 'Generating recommendations...' });
            
            const inferenceData = await this.inferenceEngine.analyzeUserBehavior();
            
            progress.report({ increment: 25, message: 'Complete!' });
            
            this.treeProvider.refresh();
            vscode.window.showInformationMessage('User analysis complete!');
        });
    }

    private async showBehaviorPatterns(): Promise<void> {
        const inferenceData = this.inferenceEngine.getInferenceData();
        
        const content = `# Behavior Patterns

## Command Frequency
${Object.entries(inferenceData.behaviorPatterns.commandFrequency)
    .sort(([,a], [,b]) => b - a)
    .map(([cmd, count]) => `- **${cmd}**: ${count} uses`)
    .join('\n')}

## Time Patterns
${Object.entries(inferenceData.behaviorPatterns.timePatterns)
    .map(([time, percentage]) => `- **${time}**: ${percentage}% activity`)
    .join('\n')}

## Problem Solving Approach
${inferenceData.behaviorPatterns.problemSolvingApproach}

## Preferred Workflows
${inferenceData.behaviorPatterns.preferredWorkflows.map(wf => `- ${wf}`).join('\n')}`;

        this.showInformationPanel('Behavior Patterns', content);
    }

    private async showTechnicalProfile(): Promise<void> {
        const inferenceData = this.inferenceEngine.getInferenceData();
        
        const content = `# Technical Profile

## Expertise Areas
${inferenceData.technicalProfile.expertiseAreas.map(area => `- ${area}`).join('\n')}

## Learning Areas
${inferenceData.technicalProfile.learningAreas.map(area => `- ${area}`).join('\n')}

## Tool Proficiency
${Object.entries(inferenceData.technicalProfile.toolProficiency)
    .sort(([,a], [,b]) => b - a)
    .map(([tool, level]) => `- **${tool}**: ${level}/10 ${'★'.repeat(Math.floor(level/2))}`)
    .join('\n')}`;

        this.showInformationPanel('Technical Profile', content);
    }

    private async showToolRecommendations(): Promise<void> {
        const inferenceData = this.inferenceEngine.getInferenceData();
        
        const content = `# Tool Recommendations

${inferenceData.recommendations.tools.map(tool => `## ${tool}
- Recommended based on your current stack
- Consider adding to your workflow`).join('\n\n')}

---
*Install recommended tools from the toolsd/ directory*`;

        this.showInformationPanel('Tool Recommendations', content);
    }

    private async showWorkflowRecommendations(): Promise<void> {
        const inferenceData = this.inferenceEngine.getInferenceData();
        
        const content = `# Workflow Recommendations

${inferenceData.recommendations.workflows.map(workflow => `## ${workflow}
- Suggested based on your development patterns
- Can improve productivity and code quality`).join('\n\n')}`;

        this.showInformationPanel('Workflow Recommendations', content);
    }

    private async showLearningRecommendations(): Promise<void> {
        const inferenceData = this.inferenceEngine.getInferenceData();
        
        const content = `# Learning Recommendations

${inferenceData.recommendations.learningResources.map(resource => `## ${resource}
- Recommended to fill knowledge gaps
- Aligned with your current skill level`).join('\n\n')}`;

        this.showInformationPanel('Learning Recommendations', content);
    }

    private async showOptimizationRecommendations(): Promise<void> {
        const inferenceData = this.inferenceEngine.getInferenceData();
        
        const content = `# Optimization Recommendations

${inferenceData.recommendations.optimizations.map((opt, i) => `${i + 1}. **${opt}**
   - Can improve development efficiency
   - Based on current project analysis`).join('\n\n')}`;

        this.showInformationPanel('Optimization Recommendations', content);
    }

    private showInformationPanel(title: string, content: string): void {
        const panel = vscode.window.createWebviewPanel(
            'userContext',
            title,
            vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true
            }
        );

        panel.webview.html = this.getWebviewContent(title, content);
    }

    private getWebviewContent(title: string, content: string): string {
        return `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${title}</title>
            <style>
                body {
                    font-family: var(--vscode-font-family);
                    font-size: var(--vscode-font-size);
                    color: var(--vscode-foreground);
                    background: var(--vscode-editor-background);
                    padding: 20px;
                    line-height: 1.6;
                }
                h1, h2, h3 { color: var(--vscode-textLink-foreground); }
                code {
                    background: var(--vscode-textBlockQuote-background);
                    padding: 2px 4px;
                    border-radius: 3px;
                    font-family: var(--vscode-editor-font-family);
                }
                pre {
                    background: var(--vscode-textBlockQuote-background);
                    padding: 10px;
                    border-radius: 5px;
                    overflow-x: auto;
                }
                hr {
                    border: none;
                    border-top: 1px solid var(--vscode-panel-border);
                    margin: 20px 0;
                }
                ul, ol {
                    padding-left: 20px;
                }
                li {
                    margin-bottom: 5px;
                }
            </style>
        </head>
        <body>
            ${this.markdownToHtml(content)}
        </body>
        </html>`;
    }

    private markdownToHtml(markdown: string): string {
        return markdown
            .replace(/^# (.+)$/gm, '<h1>$1</h1>')
            .replace(/^## (.+)$/gm, '<h2>$1</h2>')
            .replace(/^### (.+)$/gm, '<h3>$1</h3>')
            .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.+?)\*/g, '<em>$1</em>')
            .replace(/`(.+?)`/g, '<code>$1</code>')
            .replace(/^- (.+)$/gm, '<li>$1</li>')
            .replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>')
            .replace(/\n\n/g, '<br><br>')
            .replace(/\n/g, '<br>');
    }
}