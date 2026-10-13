import React, { useState, useEffect } from 'react';
import { auditService } from '../services/auditService';
import { AuditLog } from '../types';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { ShieldAlert, RefreshCw, Key, ShieldCheck, Activity } from 'lucide-react';
import { formatDateTime } from '../lib/utils';

export const AuditLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadAuditLogs = async () => {
    setIsLoading(true);
    try {
      const res = await auditService.getAuditLogs({ limit: 100 });
      setLogs(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAuditLogs();
  }, []);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-blue-600" />
            Compliance & System Audit Trail
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Immutable, append-only security log of all transactional events, condition changes, and user activities
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={loadAuditLogs}
          leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />}
        >
          Refresh Log
        </Button>
      </div>

      {/* Audit Logs Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Action</th>
                  <th>Target Entity</th>
                  <th>Entity ID</th>
                  <th>Performed By</th>
                  <th>Changes & Context</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="text-center py-10 text-muted-foreground">
                      Loading audit events...
                    </td>
                  </tr>
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-10 text-muted-foreground">
                      No audit events recorded yet.
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => {
                    const userObj = typeof log.userId === 'object' ? log.userId : null;

                    return (
                      <tr key={log._id}>
                        <td className="text-xs font-mono text-muted-foreground whitespace-nowrap">
                          {formatDateTime(log.createdAt)}
                        </td>
                        <td>
                          <Badge variant="outline" className="font-mono text-[10px] uppercase font-bold">
                            {log.action}
                          </Badge>
                        </td>
                        <td className="text-xs font-medium capitalize text-foreground">
                          {log.entityType}
                        </td>
                        <td className="font-mono text-[11px] text-muted-foreground">
                          {log.entityId ? log.entityId.slice(-8) : '—'}
                        </td>
                        <td>
                          <div className="text-xs font-semibold text-foreground">
                            {userObj?.name || 'System / Coordinator'}
                          </div>
                          <div className="text-[10px] text-muted-foreground capitalize">
                            {userObj?.role || 'authorized user'}
                          </div>
                        </td>
                        <td className="text-xs text-muted-foreground max-w-sm truncate">
                          {log.metadata
                            ? JSON.stringify(log.metadata)
                            : log.newValues
                            ? JSON.stringify(log.newValues)
                            : 'Standard transaction verified'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
