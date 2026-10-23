import { randomUUID } from 'node:crypto';
import { Router, Request, Response, NextFunction } from 'express';
import { HttpError } from './errors/httpError';

export interface Item {
  id: string;
  name: string;
  quantity: number;
  description?: string;
}

export interface ItemInput {
  name: string;
  quantity: number;
  description?: string;
}

// Module-level in-memory store. A Map keeps insertion order, so GET /items is stable.
const items = new Map<string, Item>();

export function resetItems(): void {
  items.clear();
}

export function parseItemInput(body: unknown): ItemInput {
  if (typeof body !== 'object' || body === null) {
    throw new HttpError(400, 'Request body must be a JSON object');
  }

  const raw = body as Record<string, unknown>;
  const name = raw.name;
  const quantity = raw.quantity;
  const description = raw.description;

  if (typeof name !== 'string' || name.trim() === '') {
    throw new HttpError(400, 'name is required and must be a non-empty string');
  }

  if (typeof quantity !== 'number' || !Number.isInteger(quantity) || quantity < 0) {
    throw new HttpError(400, 'quantity is required and must be a non-negative integer');
  }

  const input: ItemInput = { name, quantity };

  if (description !== undefined && description !== null) {
    if (typeof description !== 'string') {
      throw new HttpError(400, 'description must be a string when provided');
    }
    if (description !== '') {
      input.description = description;
    }
  }

  return input;
}

function idParam(req: Request): string | undefined {
  const id = req.params.id;
  return typeof id === 'string' ? id : undefined;
}

function toItem(id: string, input: ItemInput): Item {
  const item: Item = { id, name: input.name, quantity: input.quantity };
  if (input.description !== undefined) {
    item.description = input.description;
  }
  return item;
}

export const itemsRouter = Router();

itemsRouter.post('/', (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = parseItemInput(req.body);
    const item = toItem(randomUUID(), input);
    items.set(item.id, item);
    res.status(201).json(item);
  } catch (err) {
    next(err);
  }
});

itemsRouter.get('/', (req: Request, res: Response) => {
  res.status(200).json(Array.from(items.values()));
});

itemsRouter.get('/:id', (req: Request, res: Response, next: NextFunction) => {
  const id = idParam(req);
  const item = id === undefined ? undefined : items.get(id);

  if (!item) {
    next(new HttpError(404, 'Item not found'));
    return;
  }

  res.status(200).json(item);
});

itemsRouter.put('/:id', (req: Request, res: Response, next: NextFunction) => {
  const id = idParam(req);
  const existing = id === undefined ? undefined : items.get(id);

  if (!existing) {
    next(new HttpError(404, 'Item not found'));
    return;
  }

  try {
    const input = parseItemInput(req.body);
    const updated = toItem(existing.id, input);
    items.set(updated.id, updated);
    res.status(200).json(updated);
  } catch (err) {
    next(err);
  }
});

itemsRouter.delete('/:id', (req: Request, res: Response, next: NextFunction) => {
  const id = idParam(req);

  if (id === undefined || !items.delete(id)) {
    next(new HttpError(404, 'Item not found'));
    return;
  }

  res.status(204).send();
});
