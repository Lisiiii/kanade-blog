import { withBase } from "./lib/urls";
export const siteInfo = {
  title: "隔夜薯条",
  description: "一个互联网小角落。",
  keywords: ["Astro", "Kanade", "博客", "隔夜薯条"],
  // 发布到域名时设置 SITE_URL，例如 https://example.com。
  url: import.meta.env.SITE_URL || "http://lisii.cn",
};

export const headerConfig = {
  title: "隔夜薯条的博客",
  navLinks: [
    { name: "首页", icon: "icon-[bx--bxs-home-circle]", url: withBase("/") },
    { name: "文章", icon: "icon-[material-symbols--article]", url: withBase("/posts/") },
    // { name: "留言", icon: "icon-[basil--comment-solid]", url: withBase("/messages/") },
    { name: "友链", icon: "icon-[mingcute--link-3-line]", url: withBase("/friends/") },
    { name: "关于", icon: "icon-[mynaui--indifferent-ghost-solid]", url: withBase("/about/") },
  ],
};

export const welcomeConfig = {
  title: "欢迎来到我的小站",
  subTitle: "I write because I don't know what I think until I read what I say.",
  bgImage: withBase("/images/hero.png"),
};

export const personalInfo = {
  name: "隔夜薯条",
  englishName: "Lrinaus",
  avatar: withBase("/images/avatar.png"),
  role: "也许是个笨蛋",
  bio: "SJTU计算机研究生在读",
  chasing: "为了成为游戏开发者和TA而努力中...",
  github: "https://github.com/lisiiii",
  socialLinks: [
    { name: "GitHub", icon: "icon-[jam--github]", url: "https://github.com/lisiiii" },
    { name: "lisiyao20041017@outlook.com", icon: "icon-[lucide--mail]", url: "mailto:lisiyao20041017@outlook.com" },
  ],
  mail: "lisiyao20041017@outlook.com"
};