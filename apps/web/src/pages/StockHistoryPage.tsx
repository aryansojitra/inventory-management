import React, { useState, useEffect } from 'react';
import { inventoryService } from '../services/inventoryService';
import { StockTransaction } from '../types';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { History, RefreshCw, ArrowUp, ArrowDown, Download, Filter } from 'lucide-react';
import { formatDateTime } from '../lib/utils';

export const StockHistoryPage: React.FC = () => {
  const [transactions, setTransactions] = useState<StockTransaction[]>([]);
  const [typeFilter, setTypeFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);

  const loadTransactions = async () => {
    setIsLoading(true);
    try {
      const res = await inventoryService.getStockTransactions({
        transactionType: typeFilter !== 'all' ? typeFilter : undefined,
        limit: 150,
      });
      setTransactions(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTransactions();
  }, [typeFilter]);

  const exportLedgerCSV = () => {
    const headers = ['Txn ID', 'Item Name', 'Item SKU', 'Movement Type', 'Quantity Delta', 'Previous State', 'New State', 'Reason', 'Performed By', 'Timestamp'];
    const rows = transactions.map((tx) => {
      const itemObj = typeof tx.itemId === 'object' ? tx.itemId : null;
      const userObj = typeof tx.performedBy === 'object' && tx.performedBy ? (tx.performedBy as any).fullName || (tx.performedBy as any).name : 'Staff';
      return [
        tx.transactionNumber || tx._id,
        itemObj?.name || 'Item',
        itemObj?.sku || '',
        tx.type,
        tx.quantityDelta,
        tx.previousBucket || String(tx.previousQuantity || 0),
        tx.newBucket || String(tx.newQuantity || 0),
        tx.reason || '',
        userObj,
        new Date(tx.createdAt).toISOString(),
      ];
    });

    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += headers.join(',') + '\n';
    rows.forEach((row) => {
      const sanitized = row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`);
      csvContent += sanitized.join(',') + '\n';
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `stock_movement_ledger_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

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
            Complete immutable transaction history of all stock additions, deductions, QC clearance, and bucket shifts
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={exportLedgerCSV}
            disabled={transactions.length === 0}
            leftIcon={<Download className="w-3.5 h-3.5" />}
          >
            Export CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={loadTransactions}
            leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />}
          >
            Refresh Ledger
          </Button>
        </div>
      </div>

      {/* Filter Bar */}
      <Card>
        <CardContent className="p-3.5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs">
            <Filter className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="font-semibold text-muted-foreground">Filter Movement Type:</span>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="rounded-lg border border-input bg-background px-3 py-1.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="all">All Movements</option>
              <option value="addition">Replenishment (+Stock)</option>
              <option value="damage_clearance">Damage Clearance (QC Restored)</option>
              <option value="return_good">Return: Good Condition</option>
              <option value="return_damaged">Return: Damaged Condition</option>
              <option value="maintenance_start">Sent to Maintenance</option>
              <option value="maintenance_end">Restored from Maintenance</option>
              <option value="loss_declaration">Declared Lost</option>
              <option value="retirement">Decommissioned / Retired</option>
            </select>
          </div>

          <div className="text-xs text-muted-foreground font-mono">
            Showing {transactions.length} recorded movements
          </div>
        </CardContent>
      </Card>

      {/* Ledger Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Txn ID</th>
                  <th>Item SKU & Name</th>
                  <th>Movement Type</th>
                  <th className="text-center">Quantity Delta</th>
                  <th>Stock Bucket Transition</th>
                  <th>Reason / Notes</th>
                  <th>Authorized By</th>
                  <th>Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="text-center py-10 text-muted-foreground">
                      Loading stock ledger...
                    </td>
                  </tr>
                ) : transactions.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-10 text-muted-foreground">
                      No stock transactions recorded for the selected filter.
                    </td>
                  </tr>
                ) : (
                  transactions.map((tx) => {
                    const itemObj = typeof tx.itemId === 'object' ? tx.itemId : null;
                    const isPositive = tx.quantityDelta > 0;
                    const userObj =
                      typeof tx.performedBy === 'object' && tx.performedBy
                        ? (tx.performedBy as any).fullName || (tx.performedBy as any).name || (tx.performedBy as any).email
                        : 'Coordinator';

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
                          <Badge variant="outline" className="capitalize text-[11px] font-mono">
                            {tx.type.replace(/_/g, ' ')}
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
                        <td className="text-xs font-medium text-foreground whitespace-nowrap">
                          {userObj}
                        </td>
                        <td className="text-xs text-muted-foreground whitespace-nowrap font-mono">
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
export default StockHistoryPage;
