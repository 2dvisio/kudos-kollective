const EDITOR_PREVIEW_SUFFIX = '.lovableproject.com';
const PUBLIC_PREVIEW_PREFIX = 'id-preview--';
const PUBLIC_PREVIEW_SUFFIX = '.lovable.app';

export const getPublicAppOrigin = () => {
  if (typeof window === 'undefined') return '';

  const { origin, hostname, protocol } = window.location;

  if (!hostname.endsWith(EDITOR_PREVIEW_SUFFIX)) {
    return origin;
  }

  const projectId = hostname.slice(0, -EDITOR_PREVIEW_SUFFIX.length);
  return `${protocol}//${PUBLIC_PREVIEW_PREFIX}${projectId}${PUBLIC_PREVIEW_SUFFIX}`;
};

export const buildPublicAppUrl = (path: string) => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${getPublicAppOrigin()}${normalizedPath}`;
};
