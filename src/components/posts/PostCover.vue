<script setup lang="ts">
import { withBase } from "../../lib/urls";

defineProps<{
  kind: string;
  featured?: boolean;
  image?: string;
}>();

function resolveImageUrl(image?: string) {
  if (!image) return "";
  return withBase(image);
}

const labels: Record<string, { icon: string; title: string; sub: string }> = {
  notes: {
    icon: "icon-[lucide--notebook-pen]",
    title: "笔记",
    sub: "A LITTLE NOTE",
  },
  casual: {
    icon: "icon-[lucide--message-circle-more]",
    title: "碎碎念",
    sub: "A LITTLE SENTENCE",
  },
};
</script>

<template>
  <div class="post-cover" :class="[kind, { featured, 'has-image': !!image }]" aria-hidden="true">
    <!-- 有图：图片封面 -->
    <template v-if="image">
      <img
        class="cover-image"
        :src="resolveImageUrl(image)"
        alt=""
        loading="lazy"
        decoding="async"
      />
      <div class="cover-shade"></div>
    </template>

    <!-- 无图：原来的装饰图标版 -->
    <template v-else>
      <div class="cover-grid"></div>
      <span class="cover-orbit"></span>
      <span class="cover-dot"></span>
      <span class="cover-corner">K / JOURNAL</span>
      <span class="cover-icon" :class="labels[kind]?.icon"></span>
      <strong>{{ featured ? "Hello, Kanade." : labels[kind]?.title }}</strong>
      <small>{{ featured ? "A NEW STORY BEGINS HERE" : labels[kind]?.sub }}</small>
    </template>
  </div>
</template>

<style scoped>
.post-cover {
  min-height: 180px;
  height: 100%;
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #79539c;
  background: #eee6f7;
  padding: 28px 12px;
  isolation: isolate;
}

/* ---------- 装饰版（原样式） ---------- */
.cover-grid {
  position: absolute; inset: 0;
  background-image: linear-gradient(#ffffff42 1px, transparent 1px),
                    linear-gradient(90deg, #ffffff42 1px, transparent 1px);
  background-size: 23px 23px;
  z-index: -1;
  mask-image: linear-gradient(30deg, black, transparent 80%);
}
.cover-orbit {
  position: absolute; height: 190px; width: 190px;
  border: 1px solid #ffffff70; border-radius: 50%;
  right: -75px; top: -80px;
  box-shadow: 0 0 0 20px #ffffff15, 0 0 0 40px #ffffff15;
  z-index: -1;
}
.cover-dot {
  position: absolute; bottom: -35px; left: -40px;
  border-radius: 50%; width: 120px; height: 120px;
  background: #ffffff25;
}
.cover-icon {
  display: block; font-size: 43px; margin: 4px 0 7px; opacity: .86;
}

/* ---------- 图片版 ---------- */
.cover-image {
  position: absolute; inset: 0;
  width: 100%; height: 100%;
  object-fit: cover;
  z-index: 0;
}
.cover-shade {
  position: absolute; inset: 0;
  background: linear-gradient(180deg, rgba(0,0,0,.15) 0%, rgba(0,0,0,.55) 100%);
  z-index: 1;
}
.post-cover.has-image {
  color: #fff;
  text-shadow: 0 1px 8px rgba(0,0,0,.35);
}
.post-cover.has-image > *:not(.cover-image):not(.cover-shade) {
  position: relative;
  z-index: 2;
}

/* ---------- 通用文字 ---------- */
.cover-corner {
  position: absolute; top: 13px; left: 15px;
  font: 7px "Oxanium-Medium", sans-serif;
  letter-spacing: .14em;
  opacity: .6;
}
strong {
  font: 600 25px "Oxanium-Medium", sans-serif;
  letter-spacing: -.6px;
  white-space: nowrap;
}
small {
  font: 6px "Oxanium-Medium", sans-serif;
  letter-spacing: .12em;
  margin-top: 9px;
  opacity: .75;
  white-space: nowrap;
}
.cover-star {
  position: absolute; font-size: 30px; bottom: 16px; right: 18px; opacity: .5;
}

/* ---------- 按 kind 的背景色（仅装饰版用得到） ---------- */
.css                { background: #fbe4e5; color: #b76f85; }
.vue, .life         { background: #e2efe7; color: #588f7a; }
.notes              { background: #f1e5d9; color: #a88969; }
.typescript         { background: #dfebf7; color: #648db2; }
.git                { background: #fae7df; color: #bc7e68; }
.design             { background: #e5e6fa; color: #8283b5; }
.featured           { background: #e9e1f4; }

/* 图片版让 kind 背景色失效，避免盖住图 */
.post-cover.has-image { background: #000; }

.dark .post-cover { filter: brightness(.75) saturate(.8); }
.dark .post-cover.has-image { filter: brightness(.85) saturate(.9); }
</style>