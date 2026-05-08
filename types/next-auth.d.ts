import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      role: "customer" | "admin";
    };
  }

  interface User {
    role?: "customer" | "admin";
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: "customer" | "admin";
  }
}
