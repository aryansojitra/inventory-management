import React, { useState, useEffect } from 'react';
import { inventoryService } from '../services/inventoryService';
import { InventoryItem } from '../types';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Boxes, Search, Layers, QrCode, RefreshCw } from 'lucide-react';

export const StudentCatalogPage: React.FC = () => {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [isLoading, setIsLoading] = useState(true);

  const categories = ['Electronics', 'Laboratory', 'Robotics', 'Computing', 'Sensors', 'Mechanical', 'General'];

  const loadItems = async () => {
    setIsLoading(true);
    try {
      const res = await inventoryService.getInventory({
        search: search || undefined,
        category: selectedCategory !== 'all' ? selectedCategory : undefined,
        limit: 100,
      });
      setItems(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadItems();
  }, [selectedCategory]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <Boxes className="w-5 h-5 text-blue-600" />
          Department Equipment Catalog
        </h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Browse laboratory equipment, development boards, sensors, and computing components available for issue
        </p>
      </div>

      {/* Search and Category Filter */}
      <Card>
        <CardContent className="p-4 flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search equipment by name or SKU..."
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
            <Button variant="secondary" size="sm" onClick={loadItems}>
              Search
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Catalog Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          <p className="col-span-full text-center py-10 text-xs text-muted-foreground">
            Loading catalog items...
          </p>
        ) : items.length === 0 ? (
          <p className="col-span-full text-center py-10 text-xs text-muted-foreground">
            No equipment found matching criteria.
          </p>
        ) : (
          items.map((item) => {
            const isAvailable = item.availableQuantity > 0;
            return (
              <Card key={item._id} hover className="border-border flex flex-col justify-between">
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-[11px] font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded">
                      {item.sku}
                    </span>
                    <Badge variant={isAvailable ? 'available' : 'overdue'}>
                      {isAvailable ? `${item.availableQuantity} in stock` : 'Out of Stock'}
                    </Badge>
                  </div>

                  <div>
                    <h4 className="font-bold text-base text-foreground">{item.name}</h4>
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                      {item.description || 'Department laboratory equipment model.'}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-border/50 flex items-center justify-between text-xs text-muted-foreground">
                    <span className="font-medium capitalize">{item.category}</span>
                    <span className="flex items-center gap-1 font-mono text-[11px]">
                      {item.trackingMode === 'individual' ? (
                        <>
                          <QrCode className="w-3 h-3 text-blue-500" /> Serialized
                        </>
                      ) : (
                        <>
                          <Layers className="w-3 h-3 text-slate-500" /> Bulk Units
                        </>
                      )}
                    </span>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
};
