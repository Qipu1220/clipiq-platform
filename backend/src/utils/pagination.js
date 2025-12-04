// Pagination helper

export class Pagination {
  static getPaginationData(total, page, limit) {
    const pages = Math.ceil(total / limit);
    return {
      total,
      page: parseInt(page),
      pages,
      hasMore: page < pages,
    };
  }
}
