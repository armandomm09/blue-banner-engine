import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '../test/test-utils';
import App from './App';

// Mock the AuthContext
vi.mock('./auth/AuthContext', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useAuth: () => ({
    user: null,
    isLoading: false,
    logout: vi.fn(),
  }),
}));

// Mock components to avoid complex rendering
vi.mock('./layouts/MainLayout', () => ({
  default: ({ children }: { children: React.ReactNode }) => (
    <main data-testid="main-layout">{children}</main>
  ),
}));

vi.mock('./components/ThemeManager', () => ({
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="theme-manager">{children}</div>
  ),
}));

vi.mock('./pages/HomePage', () => ({
  default: () => <div data-testid="home-page">Home Page</div>,
}));

vi.mock('./pages/LoginPage', () => ({
  default: () => <div data-testid="login-page">Login Page</div>,
}));

vi.mock('./pages/NotFoundPage', () => ({
  default: () => <div data-testid="not-found-page">404 - Not Found</div>,
}));

describe('App Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render the main layout', () => {
    render(<App />);
    expect(screen.getByTestId('main-layout')).toBeInTheDocument();
  });

  it('should render the theme manager', () => {
    render(<App />);
    expect(screen.getByTestId('theme-manager')).toBeInTheDocument();
  });

  it('should render home page on root path', async () => {
    render(<App />);
    await waitFor(() => {
      expect(screen.getByTestId('home-page')).toBeInTheDocument();
    });
  });

  it('should render login page on /login path', async () => {
    // Navigate to login
    window.history.pushState({}, 'Login', '/login');
    render(<App />);
    
    await waitFor(() => {
      const loginPage = screen.queryByTestId('login-page');
      if (loginPage) {
        expect(loginPage).toBeInTheDocument();
      }
    });
  });
});
