import React from 'react';

interface OfflineBannerProps {
    isOnline: boolean;
    isSyncing: boolean;
    pendingCount: number;
}

const OfflineBanner: React.FC<OfflineBannerProps> = ({ isOnline, isSyncing, pendingCount }) => {
    if (isOnline && !isSyncing && pendingCount === 0) return null;

    if (isSyncing) {
        return (
            <div className="offline-banner offline-banner-syncing">
                <span className="btn-spinner" />
                Syncing {pendingCount} ball{pendingCount !== 1 ? 's' : ''}...
            </div>
        );
    }

    return (
        <div className="offline-banner offline-banner-warning">
            ⚡ {pendingCount > 0
                ? `No connection — ${pendingCount} ball${pendingCount !== 1 ? 's' : ''} pending sync`
                : 'No connection'}
        </div>
    );
};

export default OfflineBanner;
