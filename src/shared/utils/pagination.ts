export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface PaginationResult<T> {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;

export const paginate = <T>(
  params: PaginationParams,
  total: number,
  items: T[],
): PaginationResult<T> => {
  const page = params.page ?? DEFAULT_PAGE;
  const limit = params.limit ?? DEFAULT_LIMIT;

  return {
    items,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  };
};

export const getPaginationParams = (
  page?: string,
  limit?: string,
): { page: number; limit: number } => {
  const parsedPage = Number.parseInt(page ?? String(DEFAULT_PAGE), 10);
  const parsedLimit = Number.parseInt(limit ?? String(DEFAULT_LIMIT), 10);

  const safePage = Number.isNaN(parsedPage) ? DEFAULT_PAGE : Math.max(1, parsedPage);
  const safeLimit = Number.isNaN(parsedLimit)
    ? DEFAULT_LIMIT
    : Math.min(MAX_LIMIT, Math.max(1, parsedLimit));

  return { page: safePage, limit: safeLimit };
};
