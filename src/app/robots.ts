import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
    },
    sitemap: "https://biblia-el-oso-gggrpohb1-rod773s-projects.vercel.app/sitemap.xml",
  };
}
