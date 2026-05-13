import { z } from "zod";
import { router, publicProcedure } from "../trpc";

// ----------------------------------------------------------------------
// In-Memory Data Store (For template demo purposes)
// Once you connect a real TaylorDB, you can remove this and uncomment
// the actual query builder methods inside the procedures.
// ----------------------------------------------------------------------
let postsMemory = [
  { id: 1, title: "Hello World", content: "This is my first post!", published: true, createdAt: new Date().toISOString() },
  { id: 2, title: "Draft Post", content: "Still working on this...", published: false, createdAt: new Date().toISOString() }
];
let nextPostId = 3;

export const postsRouter = router({
  getAll: publicProcedure.query(async ({ ctx }) => {
    return [...postsMemory].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    // Actual implementation:
    // return await ctx.queryBuilder
    //   .selectFrom("posts")
    //   .select(["id", "title", "content", "published", "createdAt"])
    //   .orderBy("createdAt", "desc")
    //   .execute();
  }),

  getById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input, ctx }) => {
      return postsMemory.find(p => p.id === input.id);
      
      // Actual implementation:
      // return await ctx.queryBuilder.selectFrom("posts").where("id", "=", input.id).executeTakeFirst();
    }),

  create: publicProcedure
    .input(z.object({ title: z.string(), content: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const newPost = { 
        id: nextPostId++, 
        title: input.title || "", 
        content: input.content || "", 
        published: false,
        createdAt: new Date().toISOString() 
      };
      postsMemory.push(newPost);
      return newPost;
      
      // Actual implementation:
      // return await ctx.queryBuilder.insertInto("posts").values({ ...input, published: false }).executeTakeFirst();
    }),
    
  publish: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const index = postsMemory.findIndex(p => p.id === input.id);
      if (index !== -1) {
        postsMemory[index] = { ...postsMemory[index], published: true } as any;
      }
      return postsMemory[index];
      
      // Actual implementation:
      // return await ctx.queryBuilder.update("posts").set({ published: true }).where("id", "=", input.id).execute();
    }),

  delete: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      postsMemory = postsMemory.filter(p => p.id !== input.id);
      return true;
      
      // Actual implementation:
      // return await ctx.queryBuilder.deleteFrom("posts").where("id", "=", input.id).execute();
    }),
});
