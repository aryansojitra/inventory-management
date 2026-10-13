import { apiClient } from './api';
import { InventoryItem, IndividualAsset, StorageLocation, StockTransaction, ApiResponse, PaginatedResponse } from '../types';

export const inventoryService = {
  async getInventory(params?: {
    search?: string;
    category?: string;
    lowStock?: boolean;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<InventoryItem>> {
    const res = await apiClient.get<PaginatedResponse<InventoryItem>>('/inventory', { params });
    return res.data;
  },

  async getItemById(id: string): Promise<InventoryItem> {
    const res = await apiClient.get<ApiResponse<InventoryItem>>(`/inventory/${id}`);
    return res.data.data;
  },

  async createItem(item: Partial<InventoryItem>): Promise<InventoryItem> {
    const res = await apiClient.post<ApiResponse<InventoryItem>>('/inventory', item);
    return res.data.data;
  },

  async updateItem(id: string, updates: Partial<InventoryItem>): Promise<InventoryItem> {
    const res = await apiClient.put<ApiResponse<InventoryItem>>(`/inventory/${id}`, updates);
    return res.data.data;
  },

  async addStock(id: string, payload: { quantity: number; reason: string }): Promise<InventoryItem> {
    const res = await apiClient.post<ApiResponse<InventoryItem>>(`/inventory/${id}/stock`, payload);
    return res.data.data;
  },

  // Locations
  async getLocations(): Promise<StorageLocation[]> {
    const res = await apiClient.get<PaginatedResponse<StorageLocation>>('/locations');
    return res.data.data;
  },

  async createLocation(location: Partial<StorageLocation>): Promise<StorageLocation> {
    const res = await apiClient.post<ApiResponse<StorageLocation>>('/locations', location);
    return res.data.data;
  },

  // Assets (individual tracking)
  async getAssets(params?: {
    itemId?: string;
    condition?: string;
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<IndividualAsset>> {
    const res = await apiClient.get<PaginatedResponse<IndividualAsset>>('/assets', { params });
    return res.data;
  },

  async createAsset(asset: {
    itemId: string;
    assetTag: string;
    serialNumber?: string;
    condition?: string;
  }): Promise<IndividualAsset> {
    const res = await apiClient.post<ApiResponse<IndividualAsset>>('/assets', asset);
    return res.data.data;
  },

  async updateAssetCondition(
    id: string,
    payload: { condition: string; notes?: string }
  ): Promise<IndividualAsset> {
    const res = await apiClient.patch<ApiResponse<IndividualAsset>>(`/assets/${id}/condition`, payload);
    return res.data.data;
  },

  // Stock transactions timeline
  async getStockTransactions(params?: { itemId?: string; page?: number; limit?: number }): Promise<PaginatedResponse<StockTransaction>> {
    const res = await apiClient.get<PaginatedResponse<StockTransaction>>('/stock-adjustments', { params });
    return res.data;
  },
};
