import { neon, type NeonQueryFunction } from "@neondatabase/serverless";
import { getRequiredEnv } from "./config.js";

let sqlClient: NeonQueryFunction<false, false> | undefined;

export function sql() {
  if (!sqlClient) {
    sqlClient = neon<false, false>(getRequiredEnv("DATABASE_URL"));
  }
  return sqlClient;
}
