export type AdminCredentialItem = {
  id: string;
  softwareName: string;
  adminUrl: string;
  createdAt: string;
  updatedAt: string;
};

export type AdminCredentialListResponse = {
  items: AdminCredentialItem[];
  total: number;
};
