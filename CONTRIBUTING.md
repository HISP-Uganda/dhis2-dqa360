# Contributing to DHIS2 DQA360

Thank you for your interest in contributing to DHIS2 DQA360! This document provides guidelines and information for contributors.

## 🚀 Getting Started

### Prerequisites
- Node.js 16+ and npm/yarn
- Git
- Access to a DHIS2 instance for testing
- Basic knowledge of React and DHIS2 platform

### Development Setup

1. **Fork and clone the repository:**
```bash
git clone https://github.com/your-username/dhis2-dqa360.git
cd dhis2-dqa360
```

2. **Install dependencies:**
```bash
npm install
```

3. **Start development server:**
```bash
./start-dev.sh
# or
npm start
```

## 🔧 Development Guidelines

### Code Style
- Use ES6+ features and modern React patterns
- Follow React Hooks best practices
- Use DHIS2 UI components when possible
- Maintain consistent indentation (2 spaces)
- Use meaningful variable and function names

### Component Structure
```jsx
// Good component structure
import React, { useState, useEffect } from 'react'
import { Button, NoticeBox } from '@dhis2/ui'
import i18n from '@dhis2/d2-i18n'

const MyComponent = ({ prop1, prop2 }) => {
    const [state, setState] = useState(null)
    
    useEffect(() => {
        // Effect logic
    }, [])
    
    const handleAction = () => {
        // Handler logic
    }
    
    return (
        <div>
            {/* Component JSX */}
        </div>
    )
}

export default MyComponent
```

### File Organization
- Components in `src/components/`
- Pages in `src/pages/`
- Services in `src/services/`
- Utilities in `src/utils/`
- Hooks in `src/hooks/`

### Naming Conventions
- **Components**: PascalCase (`MyComponent.jsx`)
- **Files**: camelCase (`myUtility.js`)
- **Constants**: UPPER_SNAKE_CASE (`API_ENDPOINTS`)
- **Functions**: camelCase (`handleSubmit`)

## 🧪 Testing

### Running Tests
```bash
npm test
```

### Writing Tests
- Write unit tests for utilities and services
- Write integration tests for complex workflows
- Use React Testing Library for component tests
- Mock DHIS2 API calls in tests

### Test Structure
```javascript
import { render, screen, fireEvent } from '@testing-library/react'
import MyComponent from './MyComponent'

describe('MyComponent', () => {
    it('should render correctly', () => {
        render(<MyComponent />)
        expect(screen.getByText('Expected Text')).toBeInTheDocument()
    })
    
    it('should handle user interaction', () => {
        render(<MyComponent />)
        fireEvent.click(screen.getByRole('button'))
        // Assert expected behavior
    })
})
```

## 🔄 Contribution Workflow

### 1. Issue Creation
- Check existing issues before creating new ones
- Use issue templates when available
- Provide clear description and reproduction steps
- Add appropriate labels

### 2. Branch Strategy
- Create feature branches from `main`
- Use descriptive branch names: `feature/assessment-wizard`, `fix/authentication-timing`
- Keep branches focused on single features/fixes

### 3. Commit Messages
Follow conventional commit format:
```
type(scope): description

[optional body]

[optional footer]
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes
- `refactor`: Code refactoring
- `test`: Test additions/changes
- `chore`: Build process or auxiliary tool changes

**Examples:**
```
feat(assessment): add multi-step assessment wizard
fix(auth): prevent authentication on credential save
docs(readme): update installation instructions
```

### 4. Pull Request Process

1. **Before submitting:**
   - Ensure all tests pass
   - Update documentation if needed
   - Test your changes thoroughly
   - Rebase on latest main branch

2. **PR Description:**
   - Clear title describing the change
   - Detailed description of what was changed and why
   - Link to related issues
   - Screenshots for UI changes
   - Testing instructions

3. **PR Template:**
```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Tests pass locally
- [ ] Manual testing completed
- [ ] Screenshots attached (for UI changes)

## Checklist
- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] No breaking changes (or clearly documented)
```

## 🐛 Bug Reports

### Before Reporting
- Check existing issues
- Test on latest version
- Verify it's not a configuration issue

### Bug Report Template
```markdown
**Describe the bug**
Clear description of the bug

**To Reproduce**
Steps to reproduce the behavior:
1. Go to '...'
2. Click on '....'
3. See error

**Expected behavior**
What you expected to happen

**Screenshots**
If applicable, add screenshots

**Environment:**
- DHIS2 version: [e.g. 2.41.4]
- Browser: [e.g. Chrome 120]
- DQA360 version: [e.g. 1.0.0]

**Additional context**
Any other context about the problem
```

## 💡 Feature Requests

### Feature Request Template
```markdown
**Is your feature request related to a problem?**
Clear description of the problem

**Describe the solution you'd like**
Clear description of what you want to happen

**Describe alternatives you've considered**
Alternative solutions or features considered

**Additional context**
Any other context, mockups, or examples
```

## 📋 Code Review Guidelines

### For Authors
- Keep PRs focused and reasonably sized
- Provide clear descriptions and context
- Respond to feedback promptly
- Test changes thoroughly

### For Reviewers
- Be constructive and respectful
- Focus on code quality and maintainability
- Check for security issues
- Verify functionality works as expected
- Approve when satisfied with changes

## 🔒 Security

### Reporting Security Issues
- **DO NOT** create public issues for security vulnerabilities
- Email security concerns to the maintainers
- Provide detailed information about the vulnerability
- Allow time for fixes before public disclosure

### Security Best Practices
- Validate all user inputs
- Use DHIS2 authentication mechanisms
- Sanitize data before display
- Follow OWASP guidelines
- Keep dependencies updated

## 📚 Resources

### DHIS2 Development
- [DHIS2 Developer Portal](https://developers.dhis2.org/)
- [DHIS2 App Platform](https://platform.dhis2.nu/)
- [DHIS2 UI Components](https://ui.dhis2.nu/)

### React Development
- [React Documentation](https://reactjs.org/)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [React Hooks](https://reactjs.org/docs/hooks-intro.html)

## 🤝 Community

### Communication
- GitHub Issues for bug reports and feature requests
- GitHub Discussions for questions and ideas
- Follow project updates and announcements

### Code of Conduct
- Be respectful and inclusive
- Focus on constructive feedback
- Help others learn and grow
- Maintain professional communication

## 📝 Documentation

### Documentation Standards
- Update README for significant changes
- Document new features and APIs
- Include code examples where helpful
- Keep documentation current with code changes

### Documentation Types
- **README**: Project overview and setup
- **API Documentation**: Service and utility documentation
- **User Guides**: Feature usage instructions
- **Developer Guides**: Technical implementation details

Thank you for contributing to DHIS2 DQA360! Your contributions help improve data quality assessment for health systems worldwide. 🌍