// Kept as its own module so every tab's import path stayed the same when
// storage moved from localStorage to Supabase. The implementation now lives
// in DataProvider, which loads everything once and writes through both.
export { useStored } from "./DataProvider";
