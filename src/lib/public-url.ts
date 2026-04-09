const EDITOR_PREVIEW_SUFFIX = '.lovableproject.com';
const PUBLIC_PREVIEW_PREFIX = 'id-preview--';
const PUBLIC_PREVIEW_SUFFIX = '.lovable.app';
const PUBLISHED_APP_ORIGIN = 'https://kudos-kollective.lovable.app';

export const getPublicAppOrigin = () => {
  if (typeof window === 'undefined') return PUBLISHED_APP_ORIGIN;

  const { origin, hostname, protocol } = window.location;
  const isEditorPreview = hostname.endsWith(EDITOR_PREVIEW_SUFFIX);
  const isStaticPreview = hostname.startsWith(PUBLIC_PREVIEW_PREFIX) && hostname.endsWith(PUBLIC_PREVIEW_SUFFIX);

  if (!isEditorPreview && !isStaticPreview) {
    return origin;
  }

  if (PUBLISHED_APP_ORIGIN) {
    return PUBLISHED_APP_ORIGIN;
  }

  const projectId = hostname.slice(0, -EDITOR_PREVIEW_SUFFIX.length);
  return `${protocol}//${PUBLIC_PREVIEW_PREFIX}${projectId}${PUBLIC_PREVIEW_SUFFIX}`;
};

export const buildPublicAppUrl = (path: string) => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${getPublicAppOrigin()}${normalizedPath}`;
};
