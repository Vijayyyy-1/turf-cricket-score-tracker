import { useState, useEffect, useRef, useCallback } from 'react';
import type { Match } from '../types/match';
import { api } from '../services/api';
import {
    getPendingForMatch,
    dequeue,
    isNetworkError,
    type QueuedAction,
} from '../services/offlineQueue';

interface UseOfflineQueueOptions {
    matchId: string;
    onDrainComplete: (updatedMatch: Match) => void;
    onDrainError?: (skippedCount: number) => void;
}

interface UseOfflineQueueResult {
    isOnline: boolean;
    isSyncing: boolean;
    pendingItems: QueuedAction[];
    refreshPending: () => void;
}

export function useOfflineQueue({
    matchId,
    onDrainComplete,
    onDrainError,
}: UseOfflineQueueOptions): UseOfflineQueueResult {
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [isSyncing, setIsSyncing] = useState(false);
    const [pendingItems, setPendingItems] = useState<QueuedAction[]>(() =>
        getPendingForMatch(matchId)
    );

    const drainingRef = useRef(false);
    const onDrainCompleteRef = useRef(onDrainComplete);
    const onDrainErrorRef = useRef(onDrainError);
    onDrainCompleteRef.current = onDrainComplete;
    onDrainErrorRef.current = onDrainError;

    const refreshPending = useCallback(() => {
        setPendingItems(getPendingForMatch(matchId));
    }, [matchId]);

    const drain = useCallback(async () => {
        if (drainingRef.current) return;
        const queue = getPendingForMatch(matchId);
        if (queue.length === 0) return;

        drainingRef.current = true;
        setIsSyncing(true);

        let lastMatch: Match | null = null;
        let skipped = 0;

        for (const action of queue) {
            try {
                let result: Match;
                if (action.type === 'recordBall') {
                    result = await api.recordBall(action.matchId, action.payload);
                } else {
                    result = await api.undoLastBall(action.matchId);
                }
                dequeue(action.id);
                lastMatch = result;
            } catch (err) {
                if (isNetworkError(err)) {
                    // Still no connection — stop, leave remaining queue intact
                    break;
                }
                // Server error: this item is corrupt / stale, drop it and continue
                dequeue(action.id);
                skipped++;
            }
        }

        setPendingItems(getPendingForMatch(matchId));
        setIsSyncing(false);
        drainingRef.current = false;

        if (lastMatch) onDrainCompleteRef.current(lastMatch);
        if (skipped > 0) onDrainErrorRef.current?.(skipped);
    }, [matchId]);

    // Drain on mount if we're already online with a stale queue (e.g. page reload)
    useEffect(() => {
        if (navigator.onLine && getPendingForMatch(matchId).length > 0) {
            drain();
        }
    }, [matchId, drain]);

    useEffect(() => {
        const handleOnline = () => {
            setIsOnline(true);
            drain();
        };
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, [drain]);

    return { isOnline, isSyncing, pendingItems, refreshPending };
}
