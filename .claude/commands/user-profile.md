# User Profile Management

Manage user profiles, preferences, and personalized settings for enhanced Claude Code experience.

## Functionality

This command handles:
- Creating and managing user profiles
- Storing and retrieving user preferences
- Customizing Claude Code behavior per user
- Managing multiple development personas
- Syncing settings across sessions

## Usage

```
/user-profile [create|update|view|switch|delete] [profile-name] [--options]
```

## Commands

### Create Profile
```bash
/user-profile create [profile-name]
```
Creates a new user profile with current settings as defaults.

### Update Profile  
```bash
/user-profile update [profile-name] [--preference=value]
```
Updates specific preferences in the profile.

### View Profile
```bash
/user-profile view [profile-name]
```
Displays profile settings and preferences.

### Switch Profile
```bash
/user-profile switch [profile-name]
```
Switches to a different user profile.

### Delete Profile
```bash
/user-profile delete [profile-name]
```
Removes a user profile and its settings.

## Profile Structure

Each profile contains:

### Personal Information
- Name and contact details
- Role and expertise level
- Preferred communication style
- Time zone and working hours

### Development Preferences
- Primary programming languages
- Preferred frameworks and tools
- Code style and formatting rules
- Testing and documentation preferences

### Workflow Settings
- Preferred development methodologies
- Code review preferences
- Deployment and CI/CD preferences
- Collaboration style and tools

### UI/UX Preferences
- Theme and color scheme
- Layout and panel arrangements
- Notification preferences
- Keyboard shortcuts and bindings

## Examples

### Create Developer Profile
```bash
/user-profile create john-frontend --lang=typescript --framework=react --style=airbnb
```

### Create Team Lead Profile
```bash
/user-profile create jane-lead --role=lead --focus=architecture --review=thorough
```

### Switch Between Profiles
```bash
/user-profile switch john-frontend
```

### View Current Profile
```bash
/user-profile view
```

## Configuration Options

### Language Preferences
- `primary-language`: Main programming language
- `secondary-languages`: Additional languages used
- `framework-preference`: Preferred frameworks
- `library-preferences`: Commonly used libraries

### Code Style
- `indent-style`: tabs or spaces
- `indent-size`: number of spaces/tab width
- `line-length`: maximum line length
- `naming-convention`: camelCase, snake_case, etc.

### Workflow Preferences
- `git-workflow`: gitflow, github-flow, etc.
- `commit-style`: conventional, angular, etc.
- `testing-approach`: TDD, BDD, etc.
- `documentation-level`: minimal, detailed, comprehensive

### Tool Preferences
- `editor-config`: VS Code, Neovim, etc.
- `terminal-preference`: bash, zsh, powershell
- `package-manager`: npm, yarn, pnpm
- `task-runner`: npm scripts, gulp, webpack

## Profile Templates

### Frontend Developer
```yaml
role: frontend-developer
languages: [typescript, javascript, html, css]
frameworks: [react, vue, angular]
tools: [webpack, vite, eslint, prettier]
testing: [jest, cypress, testing-library]
```

### Backend Developer
```yaml
role: backend-developer
languages: [python, javascript, go, rust]
frameworks: [express, fastapi, gin, actix]
tools: [docker, kubernetes, redis, postgresql]
testing: [pytest, mocha, testify]
```

### Full Stack Developer
```yaml
role: fullstack-developer
languages: [typescript, python, sql]
frameworks: [next.js, django, express]
tools: [docker, aws, vercel, github-actions]
testing: [jest, playwright, pytest]
```

### DevOps Engineer
```yaml
role: devops-engineer
languages: [yaml, bash, python, hcl]
frameworks: [terraform, ansible, kubernetes]
tools: [aws, docker, jenkins, prometheus]
testing: [terratest, ansible-lint, shellcheck]
```

## Integration Features

- **Command Customization**: Tailor slash commands based on profile
- **Tool Recommendations**: Suggest tools based on profile preferences
- **Context Awareness**: Use profile data for better assistance
- **Team Sync**: Share profile templates across team members

## Storage and Security

- Profiles stored in encrypted local files
- Sensitive information (API keys) handled securely
- Option to sync with cloud storage (encrypted)
- Privacy controls for shared/private settings

## Advanced Features

### Profile Inheritance
```bash
/user-profile create junior-dev --inherit=senior-dev --experience-level=junior
```

### Conditional Settings
```yaml
if_project_type: react
  then:
    eslint_config: react-app
    testing_framework: testing-library
```

### Time-based Profiles
```yaml
work_hours: 9-17
  preferences:
    notification_level: high
    focus_mode: false
after_hours:
  preferences:
    notification_level: low
    focus_mode: true
```