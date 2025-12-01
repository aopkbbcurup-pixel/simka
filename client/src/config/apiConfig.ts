const FALLBACK_PORT = process.env.REACT_APP_API_PORT || '5002';

const resolveBaseUrl = (): string => {
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL;
  }

  if (typeof window !== 'undefined' && window.location) {
    const { protocol, hostname } = window.location;
    return `${protocol}//${hostname}:${FALLBACK_PORT}/api`;
  }

  return `http://localhost:${FALLBACK_PORT}/api`;
};

export const API_BASE_URL = resolveBaseUrl();

