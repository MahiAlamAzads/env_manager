export type ProjectSecretItem = {
  id: string;
  projectName: string;
  githubUrl: string;
  createdAt: string;
  updatedAt: string;
};

export type ProjectSecretListResponse = {
  items: ProjectSecretItem[];
  total: number;
};
