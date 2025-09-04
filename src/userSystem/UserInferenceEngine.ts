import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export interface UserProfile {
    id: string;
    name: string;
    role: string;
    experience: 'junior' | 'mid' | 'senior' | 'lead' | 'principal';
    preferences: UserPreferences;
    context: UserContext;
    createdAt: Date;
    updatedAt: Date;
}

export interface UserPreferences {
    languages: string[];
    frameworks: string[];
    tools: string[];
    codingStyle: {
        indentStyle: 'tabs' | 'spaces';
        indentSize: number;
        lineLength: number;
        namingConvention: string;
    };
    workflow: {
        gitWorkflow: string;
        commitStyle: string;
        testingApproach: string;
        documentationLevel: string;
    };
    ui: {
        theme: string;
        notifications: boolean;
        focusMode: boolean;
    };
}

export interface UserContext {
    currentProject: {
        type: string;
        languages: string[];
        frameworks: string[];
        size: 'small' | 'medium' | 'large';
    };
    recentCommands: string[];
    workingHours: {
        start: string;
        end: string;
        timezone: string;
    };
    sessionData: {
        totalSessions: number;
        averageSessionLength: number;
        commonTasks: string[];
    };
}

export interface UserInferenceData {
    behaviorPatterns: {
        commandFrequency: Record<string, number>;
        timePatterns: Record<string, number>;
        problemSolvingApproach: string;
        preferredWorkflows: string[];
    };
    technicalProfile: {
        expertiseAreas: string[];
        learningAreas: string[];
        toolProficiency: Record<string, number>;
    };
    recommendations: {
        tools: string[];
        workflows: string[];
        learningResources: string[];
        optimizations: string[];
    };
}

export class UserInferenceEngine {
    private profilePath: string;
    private currentProfile: UserProfile | null = null;
    private inferenceData: UserInferenceData;

    constructor(private extensionPath: string) {
        this.profilePath = path.join(extensionPath, 'user-profiles');
        this.ensureProfileDirectory();
        this.inferenceData = this.initializeInferenceData();
    }

    private ensureProfileDirectory(): void {
        if (!fs.existsSync(this.profilePath)) {
            fs.mkdirSync(this.profilePath, { recursive: true });
        }
    }

    private initializeInferenceData(): UserInferenceData {
        return {
            behaviorPatterns: {
                commandFrequency: {},
                timePatterns: {},
                problemSolvingApproach: 'analytical',
                preferredWorkflows: []
            },
            technicalProfile: {
                expertiseAreas: [],
                learningAreas: [],
                toolProficiency: {}
            },
            recommendations: {
                tools: [],
                workflows: [],
                learningResources: [],
                optimizations: []
            }
        };
    }

    public async analyzeUserBehavior(): Promise<UserInferenceData> {
        try {
            // Analyze current workspace
            const workspaceAnalysis = await this.analyzeWorkspace();
            
            // Analyze command usage patterns
            const commandPatterns = await this.analyzeCommandPatterns();
            
            // Analyze time-based patterns
            const timePatterns = await this.analyzeTimePatterns();
            
            // Generate technical profile
            const technicalProfile = await this.generateTechnicalProfile();
            
            // Generate recommendations
            const recommendations = await this.generateRecommendations();

            this.inferenceData = {
                behaviorPatterns: {
                    ...commandPatterns,
                    timePatterns,
                    problemSolvingApproach: this.inferProblemSolvingApproach(),
                    preferredWorkflows: this.inferPreferredWorkflows()
                },
                technicalProfile,
                recommendations
            };

            return this.inferenceData;
        } catch (error) {
            console.error('Error analyzing user behavior:', error);
            return this.inferenceData;
        }
    }

    private async analyzeWorkspace(): Promise<any> {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
            return { type: 'unknown', languages: [], frameworks: [], size: 'small' };
        }

        const rootPath = workspaceFolder.uri.fsPath;
        
        // Analyze package.json, requirements.txt, etc.
        const packageJsonPath = path.join(rootPath, 'package.json');
        const requirementsPath = path.join(rootPath, 'requirements.txt');
        const cargoTomlPath = path.join(rootPath, 'Cargo.toml');
        
        const languages = new Set<string>();
        const frameworks = new Set<string>();
        let projectType = 'unknown';

        if (fs.existsSync(packageJsonPath)) {
            const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
            languages.add('javascript');
            if (packageJson.dependencies?.typescript || packageJson.devDependencies?.typescript) {
                languages.add('typescript');
            }
            if (packageJson.dependencies?.react) {
                frameworks.add('react');
                projectType = 'frontend';
            }
            if (packageJson.dependencies?.express) {
                frameworks.add('express');
                projectType = 'backend';
            }
        }

        if (fs.existsSync(requirementsPath)) {
            languages.add('python');
            const requirements = fs.readFileSync(requirementsPath, 'utf-8');
            if (requirements.includes('django')) {
                frameworks.add('django');
                projectType = 'web';
            }
            if (requirements.includes('fastapi')) {
                frameworks.add('fastapi');
                projectType = 'api';
            }
        }

        if (fs.existsSync(cargoTomlPath)) {
            languages.add('rust');
            projectType = 'systems';
        }

        return {
            type: projectType,
            languages: Array.from(languages),
            frameworks: Array.from(frameworks),
            size: this.estimateProjectSize(rootPath)
        };
    }

    private estimateProjectSize(rootPath: string): 'small' | 'medium' | 'large' {
        try {
            const stats = fs.statSync(rootPath);
            // Simple heuristic based on file count and directory structure
            const fileCount = this.countFiles(rootPath);
            
            if (fileCount < 50) return 'small';
            if (fileCount < 500) return 'medium';
            return 'large';
        } catch {
            return 'small';
        }
    }

    private countFiles(dir: string, count = 0): number {
        try {
            const files = fs.readdirSync(dir);
            for (const file of files) {
                if (file.startsWith('.') || file === 'node_modules') continue;
                const filePath = path.join(dir, file);
                const stat = fs.statSync(filePath);
                if (stat.isDirectory()) {
                    count = this.countFiles(filePath, count);
                } else {
                    count++;
                }
            }
        } catch (error) {
            // Ignore errors and continue counting
        }
        return count;
    }

    private async analyzeCommandPatterns(): Promise<any> {
        // This would typically read from logs or command history
        // For now, return mock data structure
        return {
            commandFrequency: {
                '/analyze': 15,
                '/implement': 10,
                '/test': 8,
                '/docs': 5,
                '/review': 7
            }
        };
    }

    private async analyzeTimePatterns(): Promise<Record<string, number>> {
        // Analyze when user is most active
        // This would read from session logs
        return {
            'morning': 30,
            'afternoon': 45,
            'evening': 20,
            'night': 5
        };
    }

    private async generateTechnicalProfile(): Promise<any> {
        const workspace = await this.analyzeWorkspace();
        
        return {
            expertiseAreas: workspace.languages,
            learningAreas: this.identifyLearningAreas(workspace),
            toolProficiency: this.assessToolProficiency()
        };
    }

    private identifyLearningAreas(workspace: any): string[] {
        const learningAreas = [];
        
        // Suggest learning areas based on current stack
        if (workspace.languages.includes('javascript') && !workspace.languages.includes('typescript')) {
            learningAreas.push('typescript');
        }
        
        if (workspace.frameworks.includes('react') && !workspace.frameworks.includes('next.js')) {
            learningAreas.push('next.js');
        }
        
        if (workspace.type === 'frontend' && !workspace.frameworks.some((f: string) => ['jest', 'cypress'].includes(f))) {
            learningAreas.push('testing');
        }
        
        return learningAreas;
    }

    private assessToolProficiency(): Record<string, number> {
        // This would be based on usage patterns and success rates
        return {
            'git': 8,
            'docker': 6,
            'kubernetes': 4,
            'aws': 5,
            'testing': 7
        };
    }

    private async generateRecommendations(): Promise<any> {
        const technicalProfile = await this.generateTechnicalProfile();
        
        return {
            tools: this.recommendTools(technicalProfile),
            workflows: this.recommendWorkflows(),
            learningResources: this.recommendLearning(technicalProfile),
            optimizations: this.recommendOptimizations()
        };
    }

    private recommendTools(profile: any): string[] {
        const recommendations = [];
        
        if (profile.expertiseAreas.includes('typescript')) {
            recommendations.push('eslint', 'prettier', 'ts-node');
        }
        
        if (profile.expertiseAreas.includes('python')) {
            recommendations.push('black', 'mypy', 'pytest');
        }
        
        if (profile.toolProficiency['testing'] < 7) {
            recommendations.push('testing-library', 'jest', 'cypress');
        }
        
        return recommendations;
    }

    private recommendWorkflows(): string[] {
        return [
            'git-flow',
            'continuous-integration',
            'test-driven-development',
            'code-review-process'
        ];
    }

    private recommendLearning(profile: any): string[] {
        const resources = [];
        
        profile.learningAreas.forEach((area: string) => {
            switch (area) {
                case 'typescript':
                    resources.push('TypeScript Handbook', 'TypeScript Deep Dive');
                    break;
                case 'testing':
                    resources.push('Testing JavaScript Applications', 'Test-Driven Development');
                    break;
                case 'docker':
                    resources.push('Docker Mastery', 'Container Orchestration');
                    break;
            }
        });
        
        return resources;
    }

    private recommendOptimizations(): string[] {
        return [
            'Set up automated testing',
            'Implement continuous integration',
            'Add pre-commit hooks',
            'Configure code formatting',
            'Set up performance monitoring'
        ];
    }

    private inferProblemSolvingApproach(): string {
        // This would analyze how user approaches problems
        // Based on command sequences, error handling patterns, etc.
        return 'analytical'; // or 'intuitive', 'systematic', etc.
    }

    private inferPreferredWorkflows(): string[] {
        // Based on command patterns and project structure
        return ['agile', 'continuous-integration', 'code-review'];
    }

    public async createProfile(profileData: Partial<UserProfile>): Promise<UserProfile> {
        const profile: UserProfile = {
            id: this.generateId(),
            name: profileData.name || 'Default',
            role: profileData.role || 'developer',
            experience: profileData.experience || 'mid',
            preferences: profileData.preferences || this.getDefaultPreferences(),
            context: profileData.context || this.getDefaultContext(),
            createdAt: new Date(),
            updatedAt: new Date()
        };

        await this.saveProfile(profile);
        return profile;
    }

    private generateId(): string {
        return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    }

    private getDefaultPreferences(): UserPreferences {
        return {
            languages: ['typescript', 'javascript'],
            frameworks: ['react', 'express'],
            tools: ['git', 'docker', 'vscode'],
            codingStyle: {
                indentStyle: 'spaces',
                indentSize: 2,
                lineLength: 100,
                namingConvention: 'camelCase'
            },
            workflow: {
                gitWorkflow: 'github-flow',
                commitStyle: 'conventional',
                testingApproach: 'unit-integration',
                documentationLevel: 'moderate'
            },
            ui: {
                theme: 'dark',
                notifications: true,
                focusMode: false
            }
        };
    }

    private getDefaultContext(): UserContext {
        return {
            currentProject: {
                type: 'web',
                languages: [],
                frameworks: [],
                size: 'medium'
            },
            recentCommands: [],
            workingHours: {
                start: '09:00',
                end: '17:00',
                timezone: 'UTC'
            },
            sessionData: {
                totalSessions: 0,
                averageSessionLength: 0,
                commonTasks: []
            }
        };
    }

    private async saveProfile(profile: UserProfile): Promise<void> {
        const filePath = path.join(this.profilePath, `${profile.id}.json`);
        fs.writeFileSync(filePath, JSON.stringify(profile, null, 2));
        this.currentProfile = profile;
    }

    public async loadProfile(profileId: string): Promise<UserProfile | null> {
        try {
            const filePath = path.join(this.profilePath, `${profileId}.json`);
            if (!fs.existsSync(filePath)) {
                return null;
            }
            
            const profileData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
            this.currentProfile = profileData;
            return profileData;
        } catch (error) {
            console.error('Error loading profile:', error);
            return null;
        }
    }

    public getCurrentProfile(): UserProfile | null {
        return this.currentProfile;
    }

    public getInferenceData(): UserInferenceData {
        return this.inferenceData;
    }

    public async updateProfile(updates: Partial<UserProfile>): Promise<UserProfile | null> {
        if (!this.currentProfile) {
            return null;
        }

        this.currentProfile = {
            ...this.currentProfile,
            ...updates,
            updatedAt: new Date()
        };

        await this.saveProfile(this.currentProfile);
        return this.currentProfile;
    }

    public async listProfiles(): Promise<string[]> {
        try {
            const files = fs.readdirSync(this.profilePath);
            return files
                .filter(file => file.endsWith('.json'))
                .map(file => file.replace('.json', ''));
        } catch (error) {
            console.error('Error listing profiles:', error);
            return [];
        }
    }

    public async deleteProfile(profileId: string): Promise<boolean> {
        try {
            const filePath = path.join(this.profilePath, `${profileId}.json`);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
                if (this.currentProfile?.id === profileId) {
                    this.currentProfile = null;
                }
                return true;
            }
            return false;
        } catch (error) {
            console.error('Error deleting profile:', error);
            return false;
        }
    }
}