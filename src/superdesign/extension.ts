import * as vscode from 'vscode';
import { SuperDesignDashboardProvider } from './DashboardProvider';

export function activate(context: vscode.ExtensionContext) {
    // Register the SuperDesign dashboard webview provider
    const provider = new SuperDesignDashboardProvider(context.extensionUri);
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(SuperDesignDashboardProvider.viewType, provider)
    );

    // Register SuperDesign commands
    const helloWorldCommand = vscode.commands.registerCommand('superdesign.helloWorld', () => {
        vscode.window.showInformationMessage('Hello from SuperDesign Dashboard!');
    });

    const openDashboardCommand = vscode.commands.registerCommand('superdesign.openDashboard', () => {
        vscode.commands.executeCommand('workbench.view.extension.superdesign');
    });

    context.subscriptions.push(helloWorldCommand, openDashboardCommand);

    // Show welcome message
    vscode.window.showInformationMessage('SuperDesign Dashboard is now active!');
}

export function deactivate() {}