import { z } from "zod";
import { router, publicProcedure } from "../trpc";

// ----------------------------------------------------------------------
// In-Memory Data Store (For template demo purposes)
// Once you connect a real TaylorDB, you can remove this and uncomment
// the actual query builder methods inside the procedures.
// ----------------------------------------------------------------------
let usersMemory = [
  { id: 1, name: "Alice", email: "alice@example.com", createdAt: new Date().toISOString() },
  { id: 2, name: "Bob", email: "bob@example.com", createdAt: new Date().toISOString() }
];
let nextUserId = 3;

export const usersRouter = router({
  getAll: publicProcedure.query(async ({ ctx }) => {
    return [...usersMemory].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    // Actual implementation:
    // return await ctx.queryBuilder
    //   .selectFrom("users")
    //   .select(["id", "name", "email", "createdAt"])
    //   .orderBy("createdAt", "desc")
    //   .execute();
  }),

  getById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input, ctx }) => {
      return usersMemory.find(u => u.id === input.id);
      
      // Actual implementation:
      // return await ctx.queryBuilder.selectFrom("users").where("id", "=", input.id).executeTakeFirst();
    }),

  create: publicProcedure
    .input(z.object({ name: z.string(), email: z.string().email() }))
    .mutation(async ({ input, ctx }) => {
      const newUser = { 
        id: nextUserId++, 
        name: input.name || "", 
        email: input.email || "", 
        createdAt: new Date().toISOString() 
      };
      usersMemory.push(newUser);
      return newUser;
      
      // Actual implementation:
      // return await ctx.queryBuilder.insertInto("users").values(input).executeTakeFirst();
    }),

  update: publicProcedure
    .input(z.object({ id: z.number(), name: z.string(), email: z.string().email() }))
    .mutation(async ({ input, ctx }) => {
      const index = usersMemory.findIndex(u => u.id === input.id);
      if (index !== -1) {
        usersMemory[index] = { ...usersMemory[index], name: input.name, email: input.email } as any;
      }
      return usersMemory[index];
      
      // Actual implementation:
      // return await ctx.queryBuilder.update("users").set({ name: input.name, email: input.email }).where("id", "=", input.id).execute();
    }),

  delete: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      usersMemory = usersMemory.filter(u => u.id !== input.id);
      return true;
      
      // Actual implementation:
      // return await ctx.queryBuilder.deleteFrom("users").where("id", "=", input.id).execute();
    }),
});
