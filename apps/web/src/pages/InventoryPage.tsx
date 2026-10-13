import React, { useState, useEffect } from 'react';
import { inventoryService } from '../services/inventoryService';
import { InventoryItem, IndividualAsset, StorageLocation } from '../types';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { Alert } from '../components/ui/Alert';
import {
  Boxes,
  Plus,
  Search,
  Filter,
  AlertTriangle,
  QrCode,
  PackagePlus,
  RefreshCw,
  ExternalLink,
  Layers,
} from 'lucide-react';
import { getErrorMessage } from '../services/api';

export const InventoryPage: React.FC = () => {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [locations, setLocations] = useState<StorageLocation[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  const [isAssetViewModalOpen, setIsAssetViewModalOpen] = useState(false);
  const [selectedItemForAction, setSelectedItemForAction] = useState<InventoryItem | null>(null);
  const [itemAssets, setItemAssets] = useState<IndividualAsset[]>([]);

  // Add Item Form
  const [newItemSku, setNewItemSku] = useState('');
  const [newItemName, setNewItemName] = useState('');
  const [newItemCategory, setNewItemCategory] = useState('Electronics');
  const [newItemTrackingMode, setNewItemTrackingMode] = useState<'individual' | 'quantity'>('quantity');
  const [newItemThreshold, setNewItemThreshold] = useState('5');
  const [newItemInitialQty, setNewItemInitialQty] = useState('10');
  const [newItemUnit, setNewItemUnit] = useState('pieces');
  const [newItemLocation, setNewItemLocation] = useState('');

  // Add Stock Form
  const [addQty, setAddQty] = useState('5');
  const [addReason, setAddReason] = useState('Regular replenishment');

  const categories = ['Electronics', 'Laboratory', 'Robotics', 'Computing', 'Sensors', 'Mechanical', 'General'];

  const loadInventory = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [invRes, locs] = await Promise.all([
        inventoryService.getInventory({
          search: search || undefined,
          category: selectedCategory !== 'all' ? selectedCategory : undefined,
          lowStock: lowStockOnly ? true : undefined,
          limit: 100,
        }),
        inventoryService.getLocations().catch(() => []),
      ]);
      setItems(invRes.data);
      setLocations(locs);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadInventory();
  }, [selectedCategory, lowStockOnly]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadInventory();
  };

  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await inventoryService.createItem({
        sku: newItemSku.toUpperCase(),
        name: newItemName,
        category: newItemCategory,
        trackingMode: newItemTrackingMode,
        lowStockThreshold: parseInt(newItemThreshold, 10) || 5,
        totalQuantity: parseInt(newItemInitialQty, 10) || 0,
        availableQuantity: parseInt(newItemInitialQty, 10) || 0,
        unit: newItemUnit,
        locationId: newItemLocation || undefined,
      });
      setIsAddModalOpen(false);
      // Reset form
      setNewItemSku('');
      setNewItemName('');
      loadInventory();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const handleAddStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItemForAction) return;
    try {
      await inventoryService.addStock(selectedItemForAction._id, {
        quantity: parseInt(addQty, 10) || 1,
        reason: addReason,
      });
      setIsStockModalOpen(false);
      setSelectedItemForAction(null);
      loadInventory();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const handleOpenAssetView = async (item: InventoryItem) => {
    setSelectedItemForAction(item);
    setIsAssetViewModalOpen(true);
    try {
      const res = await inventoryService.getAssets({ itemId: item._id, limit: 100 });
      setItemAssets(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Boxes className="w-5 h-5 text-blue-600" />
            Inventory & Stock Workbench
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Real-time multi-bucket stock allocation, serial tracking, and replenishment
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsAddModalOpen(true)}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Add New Item
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={loadInventory}
            leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />}
          >
            Refresh
          </Button>
        </div>
      </div>

      {error && <Alert variant="error" onClose={() => setError(null)}>{error}</Alert>}

      {/* Filter and Search Bar */}
      <Card>
        <CardContent className="p-4">
          <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search by SKU code, name, or description..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="rounded-lg border border-input bg-background px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="all">All Categories</option>
                {categories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => setLowStockOnly(!lowStockOnly)}
                className={`px-3 py-2 rounded-lg text-xs font-semibold border flex items-center gap-1.5 transition-colors ${
                  lowStockOnly
                    ? 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950 dark:text-amber-200'
                    : 'border-input hover:bg-muted text-muted-foreground'
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                <span>Low Stock</span>
              </button>

              <Button type="submit" variant="secondary" size="sm">
                Apply
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Inventory Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>SKU / Item</th>
                  <th>Category</th>
                  <th>Tracking</th>
                  <th className="text-center">Available</th>
                  <th className="text-center">Issued</th>
                  <th className="text-center">Damaged</th>
                  <th className="text-center">Maint.</th>
                  <th className="text-center">Total</th>
                  <th>Status</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={10} className="text-center py-10 text-muted-foreground">
                      Loading inventory records...
                    </td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="text-center py-10 text-muted-foreground">
                      No inventory items match the current search filters.
                    </td>
                  </tr>
                ) : (
                  items.map((item) => {
                    const isLow = item.availableQuantity <= item.lowStockThreshold;
                    const isOut = item.availableQuantity === 0;

                    return (
                      <tr key={item._id}>
                        <td>
                          <div className="font-semibold text-foreground">{item.name}</div>
                          <div className="text-[11px] font-mono text-muted-foreground flex items-center gap-1">
                            <span>{item.sku}</span>
                            {item.isConsumable && (
                              <span className="text-[10px] bg-muted px-1.5 py-0.2 rounded text-muted-foreground">
                                Consumable
                              </span>
                            )}
                          </div>
                        </td>
                        <td>
                          <span className="text-xs font-medium text-muted-foreground">{item.category}</span>
                        </td>
                        <td>
                          <span className="capitalize text-xs font-medium flex items-center gap-1">
                            {item.trackingMode === 'individual' ? (
                              <>
                                <QrCode className="w-3 h-3 text-blue-500" />
                                <span>Serialized</span>
                              </>
                            ) : (
                              <>
                                <Layers className="w-3 h-3 text-slate-500" />
                                <span>Quantity</span>
                              </>
                            )}
                          </span>
                        </td>
                        <td className="text-center font-bold text-emerald-600 dark:text-emerald-400">
                          {item.availableQuantity}
                        </td>
                        <td className="text-center font-semibold text-blue-600 dark:text-blue-400">
                          {item.issuedQuantity}
                        </td>
                        <td className="text-center font-semibold text-amber-600 dark:text-amber-400">
                          {item.damagedQuantity}
                        </td>
                        <td className="text-center font-semibold text-yellow-600 dark:text-yellow-400">
                          {item.maintenanceQuantity}
                        </td>
                        <td className="text-center font-bold text-foreground">
                          {item.totalQuantity} {item.unit}
                        </td>
                        <td>
                          {isOut ? (
                            <Badge variant="overdue">Out of Stock</Badge>
                          ) : isLow ? (
                            <Badge variant="damaged">Low Stock (≤{item.lowStockThreshold})</Badge>
                          ) : (
                            <Badge variant="available">In Stock</Badge>
                          )}
                        </td>
                        <td className="text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {item.trackingMode === 'individual' && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleOpenAssetView(item)}
                                className="text-xs py-1 px-2 h-7"
                                title="View individual barcodes"
                              >
                                Assets ({item.totalQuantity})
                              </Button>
                            )}
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => {
                                setSelectedItemForAction(item);
                                setIsStockModalOpen(true);
                              }}
                              className="text-xs py-1 px-2 h-7"
                              title="Add stock"
                            >
                              + Stock
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

      {/* Modal: Create Item */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add New Inventory Item"
        description="Register a new equipment model or laboratory consumable"
        size="md"
      >
        <form onSubmit={handleCreateItem} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="SKU Code"
              placeholder="e.g. ARD-UNO-01"
              value={newItemSku}
              onChange={(e) => setNewItemSku(e.target.value)}
              required
            />
            <Input
              label="Item Name"
              placeholder="e.g. Arduino Uno R3"
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                Category
              </label>
              <select
                value={newItemCategory}
                onChange={(e) => setNewItemCategory(e.target.value)}
                className="w-full rounded-lg border border-input bg-background p-2 text-sm"
              >
                {categories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                Tracking Mode
              </label>
              <select
                value={newItemTrackingMode}
                onChange={(e) => setNewItemTrackingMode(e.target.value as any)}
                className="w-full rounded-lg border border-input bg-background p-2 text-sm"
              >
                <option value="quantity">Quantity Based (Bulk Units)</option>
                <option value="individual">Individual Tracking (Serial / Barcode)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Input
              label="Initial Units"
              type="number"
              min="0"
              value={newItemInitialQty}
              onChange={(e) => setNewItemInitialQty(e.target.value)}
            />
            <Input
              label="Low Stock Warning"
              type="number"
              min="1"
              value={newItemThreshold}
              onChange={(e) => setNewItemThreshold(e.target.value)}
            />
            <Input
              label="Unit of Measure"
              placeholder="pieces / sets"
              value={newItemUnit}
              onChange={(e) => setNewItemUnit(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-border">
            <Button type="button" variant="outline" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Create Item
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Add Stock */}
      <Modal
        isOpen={isStockModalOpen}
        onClose={() => setIsStockModalOpen(false)}
        title={`Add Stock: ${selectedItemForAction?.name || ''}`}
        description={`Current available: ${selectedItemForAction?.availableQuantity || 0} ${selectedItemForAction?.unit || 'units'}`}
        size="sm"
      >
        <form onSubmit={handleAddStock} className="space-y-4">
          <Input
            label="Quantity to Add"
            type="number"
            min="1"
            value={addQty}
            onChange={(e) => setAddQty(e.target.value)}
            required
          />
          <Input
            label="Replenishment Reason / Reference"
            placeholder="e.g. Purchase order PO-2026-081"
            value={addReason}
            onChange={(e) => setAddReason(e.target.value)}
            required
          />

          <div className="flex justify-end gap-2 pt-4 border-t border-border">
            <Button type="button" variant="outline" onClick={() => setIsStockModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Confirm Stock In
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: View Assets for Item */}
      <Modal
        isOpen={isAssetViewModalOpen}
        onClose={() => setIsAssetViewModalOpen(false)}
        title={`Serialized Assets: ${selectedItemForAction?.name || ''}`}
        description="Individual serial barcodes and current physical conditions"
        size="lg"
      >
        <div className="space-y-4">
          {itemAssets.length === 0 ? (
            <p className="text-center py-6 text-xs text-muted-foreground">
              No individual assets registered yet for this SKU.
            </p>
          ) : (
            <div className="overflow-x-auto max-h-96 scrollbar-thin">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Asset Barcode</th>
                    <th>Serial Number</th>
                    <th>Condition</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {itemAssets.map((asset) => (
                    <tr key={asset._id}>
                      <td className="font-mono font-semibold text-blue-600">{asset.assetTag}</td>
                      <td className="font-mono text-xs text-muted-foreground">
                        {asset.serialNumber || '—'}
                      </td>
                      <td>
                        <Badge status={asset.condition}>{asset.condition}</Badge>
                      </td>
                      <td>
                        <Badge status={asset.status}>{asset.status}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex justify-end pt-3 border-t border-border">
            <Button variant="outline" onClick={() => setIsAssetViewModalOpen(false)}>
              Close
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
