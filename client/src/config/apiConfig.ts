const FALLBACK_PORT = process.env.REACT_APP_API_PORT || '5002';

const resolveBaseUrl = (): string => {
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL;
  }

  if (typeof window !== 'undefined' && window.location) {
    const { protocol, hostname } = window.location;
    // If running on localhost, use the fallback port
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return `${protocol}//${hostname}:${FALLBACK_PORT}/api`;
    }
    // For production (Vercel), use relative path to avoid port issues
    return '/api';
  }

  return '/api';
};

export const API_BASE_URL = resolveBaseUrl();

