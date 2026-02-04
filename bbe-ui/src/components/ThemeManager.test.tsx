import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '../test/test-utils';
import ThemeManager from './ThemeManager';
import { useAuth } from '../auth/AuthContext';

vi.mock('../auth/AuthContext');

describe('ThemeManager Component', () => {
  const mockUseAuth = useAuth as ReturnType<typeof vi.fn>;
  const originalSetProperty = document.documentElement.style.setProperty;

  beforeEach(() => {
    vi.clearAllMocks();
    document.documentElement.style.setProperty = vi.fn();
  });

  afterEach(() => {
    document.documentElement.style.setProperty = originalSetProperty;
  });

  it('should set default accent color when no team is provided', () => {
    mockUseAuth.mockReturnValue({
      team: null,
    });

    render(
      <ThemeManager>
        <div>Content</div>
      </ThemeManager>,
    );

    expect(document.documentElement.style.setProperty).toHaveBeenCalledWith(
      '--color-accent',
      '#00eee4',
    );
  });

  it('should set team accent color when team is provided', () => {
    mockUseAuth.mockReturnValue({
      team: {
        id: '1',
        accent_color: '#ff0000',
      },
    });

    render(
      <ThemeManager>
        <div>Content</div>
      </ThemeManager>,
    );

    expect(document.documentElement.style.setProperty).toHaveBeenCalledWith(
      '--color-accent',
      '#ff0000',
    );
  });

  it('should render children', () => {
    mockUseAuth.mockReturnValue({
      team: null,
    });

    const { getByText } = render(
      <ThemeManager>
        <div>Test Content</div>
      </ThemeManager>,
    );

    expect(getByText('Test Content')).toBeInTheDocument();
  });
});
