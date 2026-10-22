export type LoginResponse = {
  token: string;
  user: {
    id: string;
    email: string;
    name: string;
    role: "BENDAHARA" | "KETUA_DKM";
  };
};

export type LoginCredentials = {
  email: string;
  password: string;
};

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  role: "BENDAHARA" | "KETUA_DKM";
};