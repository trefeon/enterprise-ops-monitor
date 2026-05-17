const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 200;

const parsePagination = (query = {}) => {
  const rawPage = parseInt(query.page, 10);
  const rawPageSize = parseInt(query.pageSize, 10);
  const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : DEFAULT_PAGE;
  const pageSize =
    Number.isFinite(rawPageSize) && rawPageSize > 0
      ? Math.min(rawPageSize, MAX_PAGE_SIZE)
      : DEFAULT_PAGE_SIZE;

  const offset = (page - 1) * pageSize;
  return { page, pageSize, offset, limit: pageSize };
};

const getPagination = (query = {}, options = {}) => {
  const rawPage = parseInt(query.page, 10);
  const rawPageSize = parseInt(query.pageSize, 10);
  const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : options.page || DEFAULT_PAGE;
  const maxPageSize = options.maxPageSize || MAX_PAGE_SIZE;
  const pageSize =
    Number.isFinite(rawPageSize) && rawPageSize > 0
      ? Math.min(rawPageSize, maxPageSize)
      : options.pageSize || DEFAULT_PAGE_SIZE;

  const offset = (page - 1) * pageSize;
  return { page, pageSize, offset, limit: pageSize };
};

const buildPaginationMeta = (page, pageSize, total) => {
  if (typeof page === "object" && page !== null) {
    return { pagination: page };
  }
  return { pagination: { page, pageSize, total } };
};

module.exports = {
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  parsePagination,
  getPagination,
  buildPaginationMeta,
};
