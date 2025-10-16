export const analyticsTheme = {
  colors: {
    primary: '#3B82F6',
    success: '#10B981',
    warning: '#F59E0B',
    danger: '#EF4444',
    neutral: '#6B7280',
    info: '#06B6D4',
    purple: '#8B5CF6',
  },
  gradients: {
    background: 'linear-gradient(180deg, hsl(var(--muted)/0.3) 0%, hsl(var(--background)) 100%)',
    success: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
    primary: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)',
    warning: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
    danger: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
    info: 'linear-gradient(135deg, #06B6D4 0%, #0891B2 100%)',
  },
  shadows: {
    sm: '0 1px 2px hsla(var(--foreground), 0.05)',
    md: '0 4px 6px hsla(var(--foreground), 0.07)',
    lg: '0 10px 15px hsla(var(--foreground), 0.1)',
    xl: '0 20px 25px hsla(var(--foreground), 0.12)',
  },
  borderRadius: {
    sm: '0.375rem', // 6px
    md: '0.5rem',   // 8px
    lg: '0.75rem',  // 12px
    xl: '1rem',     // 16px
  },
  spacing: {
    xs: '0.5rem',   // 8px
    sm: '0.75rem',  // 12px
    md: '1rem',     // 16px
    lg: '1.5rem',   // 24px
    xl: '2rem',     // 32px
  },
};
