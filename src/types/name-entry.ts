export type NameEntry = {
  id: string;
  nameOne: string;
  nameTwo: string;
  createdAt: string;
  updatedAt: string;
};

export type NameListResponse = {
  items: NameEntry[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};
