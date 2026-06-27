const QUEUE_KEY = 'cricket_offline_queue';

export type BallActionType = 'recordBall' | 'undoLastBall';

export interface QueuedAction {
    id: string;
    matchId: string;
    type: BallActionType;
    payload?: any;
    queuedAt: number;
}

function saveQueue(queue: QueuedAction[]): void {
    try {
        localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    } catch {
        // localStorage unavailable (private browsing quota)
    }
}

export function readQueue(): QueuedAction[] {
    try {
        const raw = localStorage.getItem(QUEUE_KEY);
        return raw ? (JSON.parse(raw) as QueuedAction[]) : [];
    } catch {
        return [];
    }
}

export function enqueue(action: Omit<QueuedAction, 'id' | 'queuedAt'>): QueuedAction {
    const item: QueuedAction = {
        ...action,
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        queuedAt: Date.now(),
    };
    const queue = readQueue();
    queue.push(item);
    saveQueue(queue);
    return item;
}

export function dequeue(id: string): void {
    const queue = readQueue().filter(item => item.id !== id);
    saveQueue(queue);
}

export function getPendingForMatch(matchId: string): QueuedAction[] {
    return readQueue().filter(item => item.matchId === matchId);
}

// True for network-level failures (should queue) — TypeError when fetch itself throws,
// or AbortError when our 8s timeout fires. False for server errors (4xx/5xx).
export function isNetworkError(err: unknown): boolean {
    if (err instanceof TypeError) return true;
    if (err instanceof DOMException && err.name === 'AbortError') return true;
    return false;
}
