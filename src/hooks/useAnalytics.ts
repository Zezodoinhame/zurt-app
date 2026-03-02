import { useEffect, useCallback } from 'react';
import { trackEvent, trackScreenView } from '../services/analytics';

export function useAnalytics(screenName?: string) {
  useEffect(() => {
    if (screenName) {
      trackScreenView(screenName);
    }
  }, [screenName]);

  const track = useCallback(
    (name: string, properties?: Record<string, any>) => {
      trackEvent(name, properties);
    },
    [],
  );

  return { trackEvent: track, trackScreenView };
}
