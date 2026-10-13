import React, { useState, useEffect } from 'react';
import { inventoryService } from '../services/inventoryService';
import { StockTransaction } from '../types';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { History, RefreshCw, ArrowUp, ArrowDown } from 'lucide-react';
import { formatDateTime } from '../lib/utils';

export const StockHistoryPage: React.FC = () => {
  const [transactions, setTransactions] = useState<StockTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadTransactions = async () => {
    setIsLoading(true);
    try {
      const res = await inventoryService.getStockTransactions({ limit: 100 });
      setTransactions(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTransactions();
  }, []);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <History className="w-5 h-5 text-blue-600" />
            Stock Ledger & Movement History
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Complete immutable transaction history of all stock additions, deductions, and condition bucket shifts
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={loadTransactions}
          leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />}
        >
          Refresh Ledger
        </Button>
      </div>

      {/* Ledger Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Txn ID</th>
                  <th>Item SKU</th>
                  <th>Movement Type</th>
                  <th className="text-center">Quantity Delta</th>
                  <th>Stock Bucket Transition</th>
                  <th>Reason / Notes</th>
                  <th>Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="text-center py-10 text-muted-foreground">
                      Loading stock ledger...
                    </td>
                  </tr>
                ) : transactions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-10 text-muted-foreground">
                      No stock transactions recorded yet.
                    </td>
                  </tr>
                ) : (
                  transactions.map((tx) => {
                    const itemObj = typeof tx.itemId === 'object' ? tx.itemId : null;
                    const isPositive = tx.quantityDelta > 0;

                    return (
                      <tr key={tx._id}>
                        <td className="font-mono text-xs font-semibold text-blue-600">
                          {tx.transactionNumber}
                        </td>
                        <td>
                          <div className="font-medium text-foreground">{itemObj?.name || 'Item'}</div>
                          <div className="text-[11px] text-muted-foreground font-mono">{itemObj?.sku}</div>
                        </td>
                        <td>
                          <Badge variant="outline" className="capitalize text-[11px]">
                            {tx.type.replace('_', ' ')}
                          </Badge>
                        </td>
                        <td className="text-center">
                          <span
                            className={`inline-flex items-center gap-0.5 font-bold text-xs ${
                              isPositive ? 'text-emerald-600' : 'text-rose-600'
                            }`}
                          >
                            {isPositive ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                            {isPositive ? `+${tx.quantityDelta}` : tx.quantityDelta}
                          </span>
                        </td>
                        <td className="font-mono text-xs text-muted-foreground">
                          <span className="text-foreground font-medium">{tx.previousBucket}</span> →{' '}
                          <span className="text-blue-600 font-bold">{tx.newBucket}</span>
                        </td>
                        <td className="text-xs text-muted-foreground max-w-xs truncate">
                          {tx.reason || '—'}
                        </td>
                        <td className="text-xs text-muted-foreground whitespace-nowrap">
                          {formatDateTime(tx.createdAt)}
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
