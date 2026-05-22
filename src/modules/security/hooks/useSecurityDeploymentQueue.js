import { useCallback, useState } from 'react';

/**
 * In-memory queue for individual deployment logs (photos + metadata until single bulk save).
 */
export function useDeploymentQueue() {
  const [entries, setEntries] = useState([]);

  const addEntry = useCallback((entry) => {
    setEntries((prev) => [
      ...prev,
      {
        localId: `${Date.now()}-${prev.length}`,
        ...entry,
      },
    ]);
  }, []);

  const removeEntry = useCallback((localId) => {
    setEntries((prev) => prev.filter((e) => e.localId !== localId));
  }, []);

  const clearEntries = useCallback(() => {
    setEntries([]);
  }, []);

  return {
    entries,
    addEntry,
    removeEntry,
    clearEntries,
    count: entries.length,
  };
}

/** @deprecated Use useDeploymentQueue */
export const useSecurityDeploymentQueue = useDeploymentQueue;
