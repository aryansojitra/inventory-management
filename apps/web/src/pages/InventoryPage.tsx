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
  Building2,
  MapPin,
  Wrench,
  Archive,
  ShieldCheck,
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

  // Condition Clearance & Maintenance QC Form
  const [isClearanceModalOpen, setIsClearanceModalOpen] = useState(false);
  const [clearanceAction, setClearanceAction] = useState<
    'damage_clearance' | 'maintenance_end' | 'maintenance_start' | 'loss_declaration'
  >('damage_clearance');
  const [clearanceQty, setClearanceQty] = useState('1');
  const [clearanceReason, setClearanceReason] = useState('Repairs completed and bench tested to factory specifications');
  const [isAdjusting, setIsAdjusting] = useState(false);

  // Retirement Form
  const [isRetireModalOpen, setIsRetireModalOpen] = useState(false);
  const [retireReason, setRetireReason] = useState('Decommissioned due to end-of-life cycle and obsolete architecture');
  const [isRetiring, setIsRetiring] = useState(false);

  // Status Filter
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'retired' | 'has_damaged' | 'has_maintenance'>('active');

  // Storage Locations Management
  const [isLocationsModalOpen, setIsLocationsModalOpen] = useState(false);
  const [newLocCode, setNewLocCode] = useState('');
  const [newLocDept, setNewLocDept] = useState('Computer Engineering');
  const [newLocBuilding, setNewLocBuilding] = useState('Academic Block A');
  const [newLocRoom, setNewLocRoom] = useState('Lab 101 - IoT Lab');
  const [newLocCupboard, setNewLocCupboard] = useState('');
  const [newLocDesc, setNewLocDesc] = useState('');
  const [isCreatingLoc, setIsCreatingLoc] = useState(false);

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

  const handleCreateLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLocCode || !newLocRoom) return;
    setIsCreatingLoc(true);
    try {
      await inventoryService.createLocation({
        locationCode: newLocCode.toUpperCase(),
        department: newLocDept,
        building: newLocBuilding,
        room: newLocRoom,
        cupboard: newLocCupboard,
        description: newLocDesc,
      });
      const locs = await inventoryService.getLocations();
      setLocations(locs);
      setNewLocCode('');
      setNewLocCupboard('');
      setNewLocDesc('');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsCreatingLoc(false);
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

  const handleClearanceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItemForAction) return;
    setIsAdjusting(true);
    try {
      let field: 'damagedQty' | 'maintenanceQty' | 'lostQty' = 'damagedQty';
      if (clearanceAction === 'damage_clearance') field = 'damagedQty';
      else if (clearanceAction === 'maintenance_end' || clearanceAction === 'maintenance_start') field = 'maintenanceQty';
      else if (clearanceAction === 'loss_declaration') field = 'lostQty';

      await inventoryService.adjustStock(selectedItemForAction._id, {
        field,
        quantity: parseInt(clearanceQty, 10) || 1,
        reason: clearanceReason,
        transactionType: clearanceAction,
      });
      setIsClearanceModalOpen(false);
      setSelectedItemForAction(null);
      loadInventory();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsAdjusting(false);
    }
  };

  const handleRetireSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItemForAction) return;
    setIsRetiring(true);
    try {
      await inventoryService.retireItem(selectedItemForAction._id, retireReason);
      setIsRetireModalOpen(false);
      setSelectedItemForAction(null);
      loadInventory();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsRetiring(false);
    }
  };

  const filteredItems = items.filter((item) => {
    if (statusFilter === 'active' && item.isRetired) return false;
    if (statusFilter === 'retired' && !item.isRetired) return false;
    if (statusFilter === 'has_damaged' && (item.damagedQuantity || 0) <= 0) return false;
    if (statusFilter === 'has_maintenance' && (item.maintenanceQuantity || 0) <= 0) return false;
    return true;
  });

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
            variant="outline"
            size="sm"
            onClick={() => setIsLocationsModalOpen(true)}
            leftIcon={<Building2 className="w-4 h-4 text-emerald-600" />}
          >
            Storage Locations ({locations.length})
          </Button>
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

            <div className="flex flex-wrap items-center gap-2">
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

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="rounded-lg border border-input bg-background px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="active">Active Items Only</option>
                <option value="all">All Items (Inc. Retired)</option>
                <option value="retired">Retired Items Only</option>
                <option value="has_damaged">Has Damaged Units</option>
                <option value="has_maintenance">Has In-Maintenance Units</option>
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
                ) : filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="text-center py-10 text-muted-foreground">
                      No inventory items match the current search filters.
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item) => {
                    const isLow = item.availableQuantity <= item.lowStockThreshold;
                    const isOut = item.availableQuantity === 0;
                    const locObj =
                      typeof item.locationId === 'object' && item.locationId
                        ? item.locationId
                        : locations.find(
                            (l) => l._id === item.locationId || l.locationCode === (item.locationId as any)
                          );

                    return (
                      <tr key={item._id} className={item.isRetired ? 'opacity-60 bg-muted/20' : ''}>
                        <td>
                          <div className="font-semibold text-foreground flex items-center gap-1.5">
                            <span>{item.name}</span>
                            {item.isRetired && (
                              <span className="text-[10px] bg-rose-500/10 text-rose-600 px-1.5 py-0.2 rounded font-bold">
                                Retired
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] font-mono text-muted-foreground flex flex-wrap items-center gap-2 mt-0.5">
                            <span>{item.sku}</span>
                            {locObj && (
                              <span className="text-[10px] text-muted-foreground flex items-center gap-0.5 font-sans bg-muted px-1.5 py-0.2 rounded">
                                <MapPin className="w-2.5 h-2.5 text-blue-500" />
                                {locObj.room || locObj.locationCode}
                              </span>
                            )}
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
                          {item.isRetired ? (
                            <Badge variant="overdue" title={item.retiredReason || 'Retired'}>
                              Retired
                            </Badge>
                          ) : isOut ? (
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
                            {!item.isRetired && (
                              <>
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
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedItemForAction(item);
                                    if ((item.damagedQuantity || 0) > 0) setClearanceAction('damage_clearance');
                                    else if ((item.maintenanceQuantity || 0) > 0) setClearanceAction('maintenance_end');
                                    else setClearanceAction('maintenance_start');
                                    setClearanceQty('1');
                                    setIsClearanceModalOpen(true);
                                  }}
                                  className="text-xs py-1 px-2 h-7 border-amber-500/40 text-amber-700 dark:text-amber-300 hover:bg-amber-500/10"
                                  title="Stock condition clearance & maintenance QC"
                                  leftIcon={<Wrench className="w-3 h-3" />}
                                >
                                  QC / Clear
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedItemForAction(item);
                                    setIsRetireModalOpen(true);
                                  }}
                                  className="text-xs py-1 px-2 h-7 text-rose-600 border-rose-500/30 hover:bg-rose-500/10"
                                  title="Retire inventory item"
                                  leftIcon={<Archive className="w-3 h-3" />}
                                >
                                  Retire
                                </Button>
                              </>
                            )}
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

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
              Default Storage Location / Laboratory
            </label>
            <select
              value={newItemLocation}
              onChange={(e) => setNewItemLocation(e.target.value)}
              className="w-full rounded-lg border border-input bg-background p-2 text-sm"
            >
              <option value="">— Select Storage Location (Optional) —</option>
              {locations.map((loc) => (
                <option key={loc._id} value={loc._id}>
                  {loc.locationCode} • {loc.room} ({loc.cupboard ? `Cupboard ${loc.cupboard}` : loc.building})
                </option>
              ))}
            </select>
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

      {/* Storage Locations Management Modal */}
      <Modal
        isOpen={isLocationsModalOpen}
        onClose={() => setIsLocationsModalOpen(false)}
        title="Department Storage Locations & Laboratories"
        description="Maintain departmental laboratories, storage rooms, cupboards, and shelves"
        size="lg"
      >
        <div className="space-y-5">
          {/* List of existing locations */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-emerald-600" />
              Registered Laboratory Storage Locations ({locations.length})
            </h4>
            <div className="overflow-x-auto max-h-56 scrollbar-thin border border-border rounded-lg">
              <table className="data-table text-xs">
                <thead>
                  <tr>
                    <th>Location Code</th>
                    <th>Laboratory / Room</th>
                    <th>Department</th>
                    <th>Building & Cupboard</th>
                  </tr>
                </thead>
                <tbody>
                  {locations.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="text-center py-6 text-muted-foreground">
                        No storage locations registered yet.
                      </td>
                    </tr>
                  ) : (
                    locations.map((loc) => (
                      <tr key={loc._id}>
                        <td className="font-mono font-bold text-blue-600">{loc.locationCode}</td>
                        <td className="font-semibold text-foreground">{loc.room}</td>
                        <td>{loc.department}</td>
                        <td className="text-muted-foreground">
                          {loc.building ? `${loc.building} ` : ''}{loc.cupboard ? `• Cupboard ${loc.cupboard}` : ''}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Form to Add New Location */}
          <form onSubmit={handleCreateLocation} className="p-4 rounded-xl border border-border bg-muted/30 space-y-3">
            <h5 className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-blue-600" />
              Add New Storage Location
            </h5>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-[10px] font-bold uppercase text-muted-foreground mb-1">
                  Location Code *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. LOC-LAB101-C1"
                  value={newLocCode}
                  onChange={(e) => setNewLocCode(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-input bg-background font-mono text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-muted-foreground mb-1">
                  Laboratory / Room Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Lab 101 - IoT Lab"
                  value={newLocRoom}
                  onChange={(e) => setNewLocRoom(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-input bg-background text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-muted-foreground mb-1">
                  Department
                </label>
                <input
                  type="text"
                  value={newLocDept}
                  onChange={(e) => setNewLocDept(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-input bg-background text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-muted-foreground mb-1">
                  Building
                </label>
                <input
                  type="text"
                  placeholder="e.g. Academic Block A"
                  value={newLocBuilding}
                  onChange={(e) => setNewLocBuilding(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-input bg-background text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-muted-foreground mb-1">
                  Cupboard / Shelf / Rack
                </label>
                <input
                  type="text"
                  placeholder="e.g. Cupboard C-2, Shelf 3"
                  value={newLocCupboard}
                  onChange={(e) => setNewLocCupboard(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-input bg-background text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-muted-foreground mb-1">
                  Description / Access Notes
                </label>
                <input
                  type="text"
                  placeholder="e.g. Development boards and sensor kits locker"
                  value={newLocDesc}
                  onChange={(e) => setNewLocDesc(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-input bg-background text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button
                type="submit"
                variant="primary"
                size="sm"
                isLoading={isCreatingLoc}
                leftIcon={<Plus className="w-3.5 h-3.5" />}
              >
                Register Location
              </Button>
            </div>
          </form>

          <div className="flex justify-end pt-2 border-t border-border">
            <Button variant="outline" size="sm" onClick={() => setIsLocationsModalOpen(false)}>
              Close
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal: QC & Condition Clearance */}
      <Modal
        isOpen={isClearanceModalOpen}
        onClose={() => {
          setIsClearanceModalOpen(false);
          setSelectedItemForAction(null);
        }}
        title={`Stock Condition Clearance & QC: ${selectedItemForAction?.name || ''}`}
        description="Manage physical condition buckets, repairs, and stock restoration"
        size="md"
      >
        <form onSubmit={handleClearanceSubmit} className="space-y-4">
          <div className="grid grid-cols-4 gap-2 text-center p-3 rounded-xl bg-muted/40 border border-border text-xs">
            <div>
              <div className="text-[10px] uppercase font-bold text-muted-foreground">Available</div>
              <div className="text-base font-bold text-emerald-600">{selectedItemForAction?.availableQuantity || 0}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold text-muted-foreground">Damaged</div>
              <div className="text-base font-bold text-amber-600">{selectedItemForAction?.damagedQuantity || 0}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold text-muted-foreground">Maintenance</div>
              <div className="text-base font-bold text-yellow-600">{selectedItemForAction?.maintenanceQuantity || 0}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold text-muted-foreground">Lost</div>
              <div className="text-base font-bold text-rose-600">{selectedItemForAction?.lostQuantity || 0}</div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
              Action / Clearance Type
            </label>
            <select
              value={clearanceAction}
              onChange={(e) => setClearanceAction(e.target.value as any)}
              className="w-full rounded-lg border border-input bg-background p-2.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="damage_clearance">
                Repair Completed: Clear Damaged Units → Restore to Available
              </option>
              <option value="maintenance_end">
                Maintenance Completed: Restore Maintenance Units → Available
              </option>
              <option value="maintenance_start">
                Send to Maintenance: Available Units → Under Maintenance
              </option>
              <option value="loss_declaration">
                Declare Lost: Mark Units as Lost
              </option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Quantity to Move"
              type="number"
              min="1"
              value={clearanceQty}
              onChange={(e) => setClearanceQty(e.target.value)}
              required
            />
            <div className="text-[11px] text-muted-foreground flex items-center pt-5">
              <span>
                {clearanceAction === 'damage_clearance' && `Max to clear: ${selectedItemForAction?.damagedQuantity || 0}`}
                {clearanceAction === 'maintenance_end' && `Max in maintenance: ${selectedItemForAction?.maintenanceQuantity || 0}`}
                {clearanceAction === 'maintenance_start' && `Max available: ${selectedItemForAction?.availableQuantity || 0}`}
                {clearanceAction === 'loss_declaration' && `Declares permanent loss`}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
              QC Inspection Notes / Reason *
            </label>
            <textarea
              rows={3}
              required
              placeholder="e.g. Capacitor replaced, tested on bench and passed all diagnostic checks"
              value={clearanceReason}
              onChange={(e) => setClearanceReason(e.target.value)}
              className="w-full rounded-lg border border-input bg-background p-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-border">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsClearanceModalOpen(false);
                setSelectedItemForAction(null);
              }}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isAdjusting} leftIcon={<Wrench className="w-3.5 h-3.5" />}>
              Apply Stock Clearance
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Retire Inventory Item */}
      <Modal
        isOpen={isRetireModalOpen}
        onClose={() => {
          setIsRetireModalOpen(false);
          setSelectedItemForAction(null);
        }}
        title={`Retire Item: ${selectedItemForAction?.name || ''}`}
        description="Permanently decommission this equipment model from active department issuance"
        size="md"
      >
        <form onSubmit={handleRetireSubmit} className="space-y-4">
          <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-800 dark:text-rose-300">
            <strong>Warning:</strong> Retiring an item will disable new borrowing and mark it permanently as retired in the department catalog and historical reports.
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
              Documented Decommissioning Reason *
            </label>
            <textarea
              rows={3}
              required
              placeholder="e.g. End of operational lifecycle; replaced by next-generation development boards"
              value={retireReason}
              onChange={(e) => setRetireReason(e.target.value)}
              className="w-full rounded-lg border border-input bg-background p-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-border">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsRetireModalOpen(false);
                setSelectedItemForAction(null);
              }}
            >
              Cancel
            </Button>
            <Button type="submit" variant="danger" isLoading={isRetiring} leftIcon={<Archive className="w-3.5 h-3.5" />}>
              Confirm Permanent Retirement
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
