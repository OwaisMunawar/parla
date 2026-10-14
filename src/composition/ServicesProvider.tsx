import { createContext, use, useCallback, useEffect, useState, type ReactNode } from 'react';

import { useQuery, type QueryState } from '@/core/hooks/useQuery';

import { type AppServices, type ChangeTopic } from './AppServices';

const ServicesContext = createContext<AppServices | null>(null);

export function ServicesProvider({
  services,
  children,
}: {
  services: AppServices;
  children: ReactNode;
}) {
  return <ServicesContext value={services}>{children}</ServicesContext>;
}

/** Builds services once (opening the database, migrating, seeding) before rendering the app. */
export function ServicesBoundary({
  create,
  fallback,
  renderError,
  children,
}: {
  create: () => Promise<AppServices>;
  fallback: ReactNode;
  renderError: (error: Error) => ReactNode;
  children: ReactNode;
}) {
  const [state, setState] = useState<{ services?: AppServices; error?: Error }>({});
  useEffect(() => {
    let alive = true;
    create().then(
      (services) => alive && setState({ services }),
      (error: unknown) =>
        alive && setState({ error: error instanceof Error ? error : new Error(String(error)) }),
    );
    return () => {
      alive = false;
    };
  }, [create]);

  if (state.error) return renderError(state.error);
  if (!state.services) return fallback;
  return <ServicesProvider services={state.services}>{children}</ServicesProvider>;
}

export function useServices(): AppServices {
  const services = use(ServicesContext);
  if (!services) throw new Error('useServices must be used inside ServicesProvider');
  return services;
}

/**
 * A read that re-runs whenever one of `topics` changes anywhere in the app,
 * e.g. the home screen's due count after a review elsewhere.
 */
export function useLiveQuery<T>(
  key: string,
  topics: readonly ChangeTopic[],
  read: (services: AppServices) => Promise<T>,
): QueryState<T> {
  const services = useServices();
  const topicKey = topics.join(',');
  const subscribe = useCallback(
    (onChange: () => void) =>
      services.changes.on((topic) => {
        if (topicKey.split(',').includes(topic)) onChange();
      }),
    [services, topicKey],
  );
  return useQuery(key, () => read(services), subscribe);
}
