import { useCallback, useEffect } from 'react';

import { useUserUnsafe } from 'src/api/hooks/session';

type OpenPopupOptions = {
  layout: 'modal';
  width: number;
  hiddenFields: Record<string, string | undefined>;
};

declare global {
  interface Window {
    Tally?: {
      openPopup: (formId: string, options: OpenPopupOptions) => void;
      closePopup: (formId: string) => void;
    };
  }
}

export function useTallyDialog(formId: string, onSubmitted?: () => void) {
  const user = useUserUnsafe();

  useEffect(() => {
    if (document.getElementById('tally-embed-script') !== null) {
      return;
    }

    const script = document.createElement('script');

    script.id = 'tally-embed-script';
    script.src = 'https://tally.so/widgets/embed.js';
    document.body.appendChild(script);
  });

  const openPopup = useCallback(() => {
    window.Tally?.openPopup(formId, {
      layout: 'modal',
      width: 768,
      hiddenFields: { email: user?.email },
    });
  }, [formId, user]);

  const closePopup = useCallback(() => {
    window.Tally?.closePopup(formId);
  }, [formId]);

  const addListener = useCallback((eventName: string, callback?: () => void) => {
    const listener = (event: MessageEvent) => {
      const data: unknown = event.data;

      if (typeof data === 'string' && data?.includes?.(eventName)) {
        callback?.();
      }
    };

    window.addEventListener('message', listener);

    return () => {
      window.removeEventListener('message', listener);
    };
  }, []);

  useEffect(() => {
    return addListener('Tally.FormSubmitted', onSubmitted);
  }, [addListener, onSubmitted]);

  return {
    openPopup,
    closePopup,
  };
}
