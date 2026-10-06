import { defineCollection } from "astro:content";
import { z } from "astro/zod";
import { glob } from "astro/loaders";

const posts = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/posts" }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    date: z.coerce.date(),
    category: z.enum(["笔记", "碎碎念"]),
    tags: z.array(z.string()),
    cover: z.enum(["notes", "casual"]),
    featured: z.boolean().default(false),
    draft: z.boolean().default(false),
    image: z.string().optional(),
  }),
});
export const collections = { posts };