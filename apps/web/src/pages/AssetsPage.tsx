import React, { useState, useEffect } from 'react';
import { inventoryService } from '../services/inventoryService';
import { IndividualAsset, AssetCondition, InventoryItem, StorageLocation } from '../types';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { Alert } from '../components/ui/Alert';
import {
  QrCode,
  Search,
  RefreshCw,
  Wrench,
  Plus,
  History,
  MapPin,
  Building2,
  Calendar,
  ShieldCheck,
} from 'lucide-react';
import { getErrorMessage } from '../services/api';
import { formatDateTime } from '../lib/utils';

export const AssetsPage: React.FC = () => {
  const [assets, setAssets] = useState<IndividualAsset[]>([]);
  const [individualItems, setIndividualItems] = useState<InventoryItem[]>([]);
  const [locations, setLocations] = useState<StorageLocation[]>([]);
  const [search, setSearch] = useState('');
  const [conditionFilter, setConditionFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);

  // Update Condition Modal
  const [selectedAsset, setSelectedAsset] = useState<IndividualAsset | null>(null);
  const [newCondition, setNewCondition] = useState<AssetCondition>('good');
  const [conditionNotes, setConditionNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Register Asset Modal Form
  const [isAddAssetModalOpen, setIsAddAssetModalOpen] = useState(false);
  const [newAssetItemId, setNewAssetItemId] = useState('');
  const [newAssetTag, setNewAssetTag] = useState('');
  const [newSerialNumber, setNewSerialNumber] = useState('');
  const [newAssetCondition, setNewAssetCondition] = useState<AssetCondition>('good');
  const [newAssetLocation, setNewAssetLocation] = useState('');
  const [newAssetNotes, setNewAssetNotes] = useState('');
  const [isCreatingAsset, setIsCreatingAsset] = useState(false);

  // Condition History Modal
  const [historyAsset, setHistoryAsset] = useState<IndividualAsset | null>(null);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

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

  const loadMetadata = async () => {
    try {
      const [itemsRes, locsRes] = await Promise.all([
        inventoryService.getInventory({ limit: 100 }),
        inventoryService.getLocations().catch(() => []),
      ]);
      const individualOnly = itemsRes.data.filter((i) => i.trackingMode === 'individual');
      setIndividualItems(individualOnly);
      if (individualOnly.length > 0 && !newAssetItemId) {
        setNewAssetItemId(individualOnly[0]._id);
      }
      setLocations(locsRes);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadAssets();
  }, [conditionFilter, statusFilter]);

  useEffect(() => {
    loadMetadata();
  }, []);

  const handleUpdateCondition = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAsset) return;

    setIsSubmitting(true);
    try {
      await inventoryService.updateAssetCondition(selectedAsset._id, {
        condition: newCondition,
        notes: conditionNotes,
      });
      setSuccessMsg(`Condition for ${selectedAsset.assetTag} updated to ${newCondition}`);
      setSelectedAsset(null);
      loadAssets();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAssetItemId || !newAssetTag) {
      setError('Please select parent item and provide asset tag barcode');
      return;
    }

    setIsCreatingAsset(true);
    try {
      await inventoryService.createAsset({
        itemId: newAssetItemId,
        assetTag: newAssetTag.toUpperCase().trim(),
        serialNumber: newSerialNumber.trim() || undefined,
        condition: newAssetCondition,
        locationId: newAssetLocation || undefined,
        notes: newAssetNotes.trim() || undefined,
      });
      setSuccessMsg(`Asset ${newAssetTag.toUpperCase().trim()} registered successfully!`);
      setIsAddAssetModalOpen(false);
      setNewAssetTag('');
      setNewSerialNumber('');
      setNewAssetNotes('');
      loadAssets();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsCreatingAsset(false);
    }
  };

  const handleOpenHistory = async (asset: IndividualAsset) => {
    setHistoryAsset(asset);
    setIsHistoryModalOpen(true);
    setIsLoadingHistory(true);
    try {
      const full = await inventoryService.getAssetById(asset._id);
      setHistoryAsset(full);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <QrCode className="w-5 h-5 text-blue-600" />
            Serialized Asset Registry & Barcode Tracking
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Individual barcode tracking, serial numbers, condition transitions, and physical location
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsAddAssetModalOpen(true)}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Register New Asset
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={loadAssets}
            leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />}
          >
            Refresh
          </Button>
        </div>
      </div>

      {error && <Alert variant="error" onClose={() => setError(null)}>{error}</Alert>}
      {successMsg && <Alert variant="success" onClose={() => setSuccessMsg(null)}>{successMsg}</Alert>}

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
                  <th>Storage Location</th>
                  <th>Serial Number</th>
                  <th>Condition</th>
                  <th>Operational Status</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="text-center py-10 text-muted-foreground">
                      Loading asset registry...
                    </td>
                  </tr>
                ) : assets.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-10 text-muted-foreground">
                      No serialized assets found.
                    </td>
                  </tr>
                ) : (
                  assets.map((ast) => {
                    const itemObj = typeof ast.itemId === 'object' ? ast.itemId : null;
                    const locObj =
                      typeof ast.locationId === 'object' && ast.locationId
                        ? ast.locationId
                        : locations.find((l) => l._id === ast.locationId || l._id === (ast as any).location);

                    return (
                      <tr key={ast._id}>
                        <td>
                          <div className="font-mono font-bold text-xs text-blue-600 flex items-center gap-1.5">
                            <QrCode className="w-3.5 h-3.5 text-blue-500" />
                            <span>{ast.assetTag}</span>
                          </div>
                          {ast.notes && (
                            <div className="text-[10px] text-muted-foreground max-w-xs truncate mt-0.5">
                              {ast.notes}
                            </div>
                          )}
                        </td>
                        <td>
                          <div className="font-semibold text-foreground">{itemObj?.name || 'Item'}</div>
                          <div className="text-[11px] text-muted-foreground font-mono">{itemObj?.sku}</div>
                        </td>
                        <td>
                          {locObj ? (
                            <span className="text-[11px] text-muted-foreground flex items-center gap-1 font-mono">
                              <MapPin className="w-3 h-3 text-blue-500" />
                              <span>{locObj.locationCode || locObj.room}</span>
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
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
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenHistory(ast)}
                              className="text-xs py-1 px-2 h-7"
                              title="View condition history timeline"
                              leftIcon={<History className="w-3 h-3" />}
                            >
                              History
                            </Button>
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
                          </div>
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

      {/* Modal: Register New Asset */}
      <Modal
        isOpen={isAddAssetModalOpen}
        onClose={() => setIsAddAssetModalOpen(false)}
        title="Register New Serialized Asset"
        description="Add a specific barcode unit to an existing Mode A individual item"
        size="md"
      >
        <form onSubmit={handleCreateAsset} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
              Parent Equipment Model *
            </label>
            <select
              value={newAssetItemId}
              onChange={(e) => setNewAssetItemId(e.target.value)}
              required
              className="w-full rounded-lg border border-input bg-background p-2.5 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-primary"
            >
              {individualItems.length === 0 ? (
                <option value="">No Mode A individual items found (create one in Inventory first)</option>
              ) : (
                individualItems.map((item) => (
                  <option key={item._id} value={item._id}>
                    {item.name} ({item.sku})
                  </option>
                ))
              )}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Asset ID / Barcode Tag *"
              placeholder="e.g. DB-011"
              value={newAssetTag}
              onChange={(e) => setNewAssetTag(e.target.value)}
              required
            />
            <Input
              label="Manufacturer Serial Number"
              placeholder="e.g. SN-8849201 (optional)"
              value={newSerialNumber}
              onChange={(e) => setNewSerialNumber(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                Initial Condition
              </label>
              <select
                value={newAssetCondition}
                onChange={(e) => setNewAssetCondition(e.target.value as AssetCondition)}
                className="w-full rounded-lg border border-input bg-background p-2 text-xs font-medium"
              >
                <option value="good">Good (Usable)</option>
                <option value="damaged">Damaged</option>
                <option value="maintenance">Under Maintenance</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                Storage Location
              </label>
              <select
                value={newAssetLocation}
                onChange={(e) => setNewAssetLocation(e.target.value)}
                className="w-full rounded-lg border border-input bg-background p-2 text-xs font-medium"
              >
                <option value="">— Default Location —</option>
                {locations.map((loc) => (
                  <option key={loc._id} value={loc._id}>
                    {loc.locationCode} • {loc.room}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
              Registration Notes
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Received from manufacturer consignment batch #4"
              value={newAssetNotes}
              onChange={(e) => setNewAssetNotes(e.target.value)}
              className="w-full rounded-lg border border-input bg-background p-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-border">
            <Button type="button" variant="outline" onClick={() => setIsAddAssetModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isCreatingAsset} leftIcon={<Plus className="w-3.5 h-3.5" />}>
              Register Asset
            </Button>
          </div>
        </form>
      </Modal>

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
              className="w-full rounded-lg border border-input bg-background p-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
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

      {/* Modal: View Asset Condition History */}
      <Modal
        isOpen={isHistoryModalOpen}
        onClose={() => {
          setIsHistoryModalOpen(false);
          setHistoryAsset(null);
        }}
        title={`Condition Audit History: ${historyAsset?.assetTag || ''}`}
        description="Immutable timeline of all condition changes, inspections, and coordinator remarks"
        size="md"
      >
        <div className="space-y-4">
          {isLoadingHistory ? (
            <p className="text-center py-6 text-xs text-muted-foreground">Loading condition timeline...</p>
          ) : !historyAsset?.conditionHistory || historyAsset.conditionHistory.length === 0 ? (
            <p className="text-center py-6 text-xs text-muted-foreground">
              No previous condition transition records found.
            </p>
          ) : (
            <div className="space-y-3 max-h-80 overflow-y-auto scrollbar-thin pr-1">
              {historyAsset.conditionHistory.map((h, idx) => {
                const changedByName =
                  typeof h.changedBy === 'object' && h.changedBy
                    ? h.changedBy.fullName || h.changedBy.name || h.changedBy.email
                    : 'Coordinator / Inspector';

                return (
                  <div key={idx} className="p-3 rounded-lg border border-border bg-muted/30 flex items-start justify-between gap-3 text-xs">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge status={h.condition as any}>{h.condition}</Badge>
                        <span className="font-semibold text-foreground text-xs">{changedByName}</span>
                      </div>
                      <p className="text-muted-foreground italic">"{h.reason}"</p>
                    </div>
                    <span className="text-[10px] text-muted-foreground whitespace-nowrap font-mono">
                      {formatDateTime(h.changedAt)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          <div className="flex justify-end pt-3 border-t border-border">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setIsHistoryModalOpen(false);
                setHistoryAsset(null);
              }}
            >
              Close
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
export default AssetsPage;
