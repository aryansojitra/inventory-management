import { Response } from 'express';
import { inventoryService } from './inventory.service';
import { asyncHandler, sendSuccess, sendPaginated, parsePagination } from '../../utils/apiUtils';
import { AuthRequest } from '../../middleware/auth.middleware';

export const getAllInventory = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { page, limit, skip } = parsePagination(req.query);
  const { search, category, trackingMode, isRetired, lowStock } = req.query as any;
  const { items, total } = await inventoryService.getAll({
    page,
    limit,
    skip,
    search,
    category,
    trackingMode,
    isRetired,
    lowStock: lowStock === 'true',
  });
  sendPaginated(res, items, total, page, limit);
});

export const getInventoryById = asyncHandler(async (req: AuthRequest, res: Response) => {
  const item = await inventoryService.getById(req.params.id);
  sendSuccess(res, item);
});

export const createInventoryItem = asyncHandler(async (req: AuthRequest, res: Response) => {
  const item = await inventoryService.create(req.body, req.user!.userId, req.user!.role);
  sendSuccess(res, item, 'Inventory item created successfully', 201);
});

export const updateInventoryItem = asyncHandler(async (req: AuthRequest, res: Response) => {
  const item = await inventoryService.update(req.params.id, req.body, req.user!.userId, req.user!.role);
  sendSuccess(res, item, 'Inventory item updated successfully');
});

export const addStock = asyncHandler(async (req: AuthRequest, res: Response) => {
  const item = await inventoryService.addStock(req.params.id, req.body, req.user!.userId, req.user!.role);
  sendSuccess(res, item, 'Stock added successfully');
});

export const adjustStock = asyncHandler(async (req: AuthRequest, res: Response) => {
  const item = await inventoryService.adjustStock(req.params.id, req.body, req.user!.userId, req.user!.role);
  sendSuccess(res, item, 'Stock adjusted successfully');
});

export const retireInventory = asyncHandler(async (req: AuthRequest, res: Response) => {
  const item = await inventoryService.retire(req.params.id, req.body.reason, req.user!.userId, req.user!.role);
  sendSuccess(res, item, 'Item retired successfully');
});

export const getCategories = asyncHandler(async (req: AuthRequest, res: Response) => {
  const categories = await inventoryService.getCategories();
  sendSuccess(res, categories);
});
