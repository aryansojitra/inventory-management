import React, { useState, useEffect } from 'react';
import { inventoryService } from '../services/inventoryService';
import { IndividualAsset, AssetCondition } from '../types';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { Alert } from '../components/ui/Alert';
import { QrCode, Search, RefreshCw, Wrench } from 'lucide-react';
import { getErrorMessage } from '../services/api';

export const AssetsPage: React.FC = () => {
  const [assets, setAssets] = useState<IndividualAsset[]>([]);
  const [search, setSearch] = useState('');
  const [conditionFilter, setConditionFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedAsset, setSelectedAsset] = useState<IndividualAsset | null>(null);
  const [newCondition, setNewCondition] = useState<AssetCondition>('good');
  const [conditionNotes, setConditionNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadAssets = async () => {
    setIsLoading(true);
    try {
      const res = await inventoryService.getAssets({
        search: search || undefined,
        condition: conditionFilter !== 'all' ? conditionFilter : undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        limit: 100,
      });
      setAssets(res.data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAssets();
  }, [conditionFilter, statusFilter]);

  const handleUpdateCondition = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAsset) return;

    setIsSubmitting(true);
    try {
      await inventoryService.updateAssetCondition(selectedAsset._id, {
        condition: newCondition,
        notes: conditionNotes,
      });
      setSelectedAsset(null);
      loadAssets();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <QrCode className="w-5 h-5 text-blue-600" />
            Serialized Asset Registry
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Individual barcode tracking, serial numbers, and physical condition lifecycles
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={loadAssets}
          leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />}
        >
          Refresh
        </Button>
      </div>

      {error && <Alert variant="error" onClose={() => setError(null)}>{error}</Alert>}

      {/* Filter and Search */}
      <Card>
        <CardContent className="p-4 flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by asset tag barcode or serial number..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={conditionFilter}
              onChange={(e) => setConditionFilter(e.target.value)}
              className="rounded-lg border border-input bg-background px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="all">All Conditions</option>
              <option value="good">Good</option>
              <option value="damaged">Damaged</option>
              <option value="maintenance">In Maintenance</option>
              <option value="lost">Lost</option>
              <option value="retired">Retired</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-lg border border-input bg-background px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="all">All Statuses</option>
              <option value="available">Available</option>
              <option value="issued">Issued</option>
              <option value="maintenance">Maintenance</option>
              <option value="retired">Retired</option>
            </select>

            <Button variant="secondary" size="sm" onClick={loadAssets}>
              Filter
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Assets Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Asset Barcode Tag</th>
                  <th>Parent Item SKU</th>
                  <th>Serial Number</th>
                  <th>Condition</th>
                  <th>Operational Status</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="text-center py-10 text-muted-foreground">
                      Loading asset registry...
                    </td>
                  </tr>
                ) : assets.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-10 text-muted-foreground">
                      No serialized assets found.
                    </td>
                  </tr>
                ) : (
                  assets.map((ast) => {
                    const itemObj = typeof ast.itemId === 'object' ? ast.itemId : null;

                    return (
                      <tr key={ast._id}>
                        <td className="font-mono font-bold text-xs text-blue-600 flex items-center gap-1.5">
                          <QrCode className="w-3.5 h-3.5 text-blue-500" />
                          <span>{ast.assetTag}</span>
                        </td>
                        <td>
                          <div className="font-semibold text-foreground">{itemObj?.name || 'Item'}</div>
                          <div className="text-[11px] text-muted-foreground font-mono">{itemObj?.sku}</div>
                        </td>
                        <td className="font-mono text-xs text-muted-foreground">
                          {ast.serialNumber || '—'}
                        </td>
                        <td>
                          <Badge status={ast.condition}>{ast.condition}</Badge>
                        </td>
                        <td>
                          <Badge status={ast.status}>{ast.status}</Badge>
                        </td>
                        <td className="text-right">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => {
                              setSelectedAsset(ast);
                              setNewCondition(ast.condition);
                              setConditionNotes('');
                            }}
                            className="text-xs py-1 px-2.5 h-7"
                            leftIcon={<Wrench className="w-3 h-3" />}
                          >
                            Update Condition
                          </Button>
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

      {/* Modal: Update Condition */}
      <Modal
        isOpen={!!selectedAsset}
        onClose={() => setSelectedAsset(null)}
        title={`Update Asset Condition: ${selectedAsset?.assetTag}`}
        description="Transition condition state (Good, Damaged, Maintenance, Retired)"
        size="md"
      >
        <form onSubmit={handleUpdateCondition} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
              New Condition State
            </label>
            <select
              value={newCondition}
              onChange={(e) => setNewCondition(e.target.value as AssetCondition)}
              className="w-full rounded-lg border border-input bg-background p-2.5 text-xs font-medium"
            >
              <option value="good">Good (Fully Operational)</option>
              <option value="damaged">Damaged (Fault Observed)</option>
              <option value="maintenance">Maintenance (Under Repair)</option>
              <option value="retired">Retired (Decommissioned)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
              Inspection Notes / Repair Ticket
            </label>
            <textarea
              rows={3}
              placeholder="e.g. Sent to lab technician for capacitor replacement"
              value={conditionNotes}
              onChange={(e) => setConditionNotes(e.target.value)}
              className="w-full rounded-lg border border-input bg-background p-2.5 text-xs"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-border">
            <Button type="button" variant="outline" onClick={() => setSelectedAsset(null)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting}>
              Apply Condition Update
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
