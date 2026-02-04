# Frontend test coverage guidelines

## Coverage Targets by Category

### Components
- Target: 85%
- Focus on:
  - ProtectedRoute (auth logic)
  - ThemeManager (state management)
  - Navigation components
  - Modal components

### Pages
- Target: 70%
- Focus on:
  - HomePage
  - LoginPage
  - MatchDetailPage
  - EventDetailPage

### Utilities & Helpers
- Target: 90%
- Focus on:
  - API client calls
  - Data transformations
  - Format helpers

### Services
- Target: 80%
- Focus on:
  - API service layer
  - State management

## Excluded from Coverage
- `vite-env.d.ts`
- Type definitions
- CSS modules
- Test setup files

## Running Coverage

```bash
npm run test:coverage
```

This generates a coverage report in `coverage/` directory.
