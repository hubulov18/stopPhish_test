export type AuthUser = {
  id: number;
  email: string;
  name: string;
};

export type BrokerMeta = {
  user?: AuthUser;
};
