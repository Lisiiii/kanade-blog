import fs from 'node:fs/promises'
import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const YAML = require('js-yaml')

/**
 * ============================
 * 路径配置
 * ============================
 *
 * 下面两个路径是你需要重点修改的地方。
 *
 * 文章会复制到：
 * /workspaces/website/Kanade-Astro/src/content/posts
 *
 * 图片会复制到：
 * /workspaces/website/Kanade-Astro/public/assets
 *
 * Astro 中引用图片时使用：
 * /assets/图片文件名
 */

const ARTICLE_DEST_DIR = path.resolve(
    process.env.ARTICLE_DEST_DIR ||
    path.join(process.cwd(), 'src/content/posts'),
)

const IMAGE_DEST_DIR = path.resolve(
    process.env.IMAGE_DEST_DIR ||
    path.join(process.cwd(), 'public/assets'),
)

/**
 * Feishu 导出的目录。
 *
 * 如果你是在 /workspaces/website/feishublog 目录下执行脚本，
 * 默认会读取：
 *
 * /workspaces/website/feishublog/dist
 */
const FEISHU_OUTPUT_DIR = path.resolve(
    process.env.FEISHU_OUTPUT_DIR ||
    path.join(process.cwd(), 'feishu_pages/dist'),
)

const DOCS_DIR = path.join(FEISHU_OUTPUT_DIR, 'docs')
const DOCS_JSON_PATH = path.join(FEISHU_OUTPUT_DIR, 'docs.json')
const FEISHU_ASSETS_DIR = path.join(DOCS_DIR, 'assets')

/**
 * 清空目录内容，但保留目录本身。
 *
 * 注意：
 * 这个函数会删除目录下的所有文件和子目录。
 */
async function clearDirectory(directory) {
    await fs.mkdir(directory, {
        recursive: true,
    })

    const entries = await fs.readdir(directory, {
        withFileTypes: true,
    })

    for (const entry of entries) {
        const target = path.join(
            directory,
            entry.name,
        )

        await fs.rm(target, {
            recursive: true,
            force: true,
        })
    }

    console.log(`已清空目录：${directory}`)
}

function isPathInside(parent, child) {
    const relative = path.relative(
        path.resolve(parent),
        path.resolve(child),
    )

    return (
        relative === '' ||
        (
            !relative.startsWith('..') &&
            !path.isAbsolute(relative)
        )
    )
}

function assertSafeDestination(directory) {
    const resolved = path.resolve(directory)

    const dangerousPaths = [
        path.parse(resolved).root,
        '/workspaces',
        '/workspaces/website',
        process.cwd(),
    ]

    if (
        dangerousPaths.some(
            (dangerousPath) =>
                path.resolve(dangerousPath) === resolved,
        )
    ) {
        throw new Error(
            `拒绝清空危险目录：${resolved}`,
        )
    }
}

/**
 * 获取 docs.json 中的根节点。
 *
 * 不同版本的 feishu-pages 生成的 docs.json 结构可能略有差异，
 * 所以这里兼容数组、children、docs、nodes、data 等格式。
 */
function getRootNodes(data) {
    if (Array.isArray(data)) {
        return data
    }

    if (Array.isArray(data.children)) {
        return data.children
    }

    if (Array.isArray(data.docs)) {
        return data.docs
    }

    if (Array.isArray(data.nodes)) {
        return data.nodes
    }

    if (Array.isArray(data.items)) {
        return data.items
    }

    if (Array.isArray(data.data)) {
        return data.data
    }

    if (data.data && Array.isArray(data.data.children)) {
        return data.data.children
    }

    throw new Error(
        '无法识别 docs.json 的结构，请检查 docs.json 内容。',
    )
}

/**
 * 递归获取所有 Markdown 文件。
 */
async function walkMarkdownFiles(directory) {
    const result = []

    async function walk(currentDirectory) {
        const entries = await fs.readdir(currentDirectory, {
            withFileTypes: true,
        })

        for (const entry of entries) {
            const fullPath = path.join(currentDirectory, entry.name)

            if (entry.isDirectory()) {
                // assets 目录中一般是图片，不需要扫描 Markdown
                if (entry.name === 'assets') {
                    continue
                }

                await walk(fullPath)
                continue
            }

            if (
                entry.isFile() &&
                entry.name.toLowerCase().endsWith('.md')
            ) {
                result.push(fullPath)
            }
        }
    }

    await walk(directory)
    return result
}

/**
 * 统一处理相对路径。
 */
function normalizeRelativePath(value) {
    if (!value) {
        return undefined
    }

    let normalized = String(value)
        .replaceAll('\\', '/')
        .replace(/^\/+/, '')

    // 有些版本可能把 docs/ 也写进 filename
    if (normalized.startsWith('docs/')) {
        normalized = normalized.slice('docs/'.length)
    }

    return normalized
}

/**
 * 根据相对路径生成 dist/docs 下的绝对路径。
 */
function sourceFilePath(relativePath) {
    return path.join(
        DOCS_DIR,
        ...relativePath.split('/'),
    )
}

/**
 * 从 Markdown 文件中提取现有 frontmatter。
 *
 * 这样即使 docs.json 中没有 meta 字段，
 * 也可以从 feishu-pages 已经生成的 Markdown 中读取 YAML。
 */
function parseFrontmatter(source) {
    const match = source.match(
        /^---\s*\r?\n([\s\S]*?)\r?\n---\s*\r?\n?/,
    )

    if (!match) {
        return {
            meta: {},
            body: source,
        }
    }

    let meta = {}

    try {
        meta = YAML.load(match[1]) || {}
    } catch (error) {
        console.warn('解析 Markdown frontmatter 失败：')
        console.warn(error.message)
    }

    return {
        meta,
        body: source.slice(match[0].length),
    }
}

/**
 * 将日期统一转换成 YYYY-MM-DD。
 */
function normalizeDate(value) {
    if (!value) {
        return undefined
    }

    // js-yaml 可能会把未加引号的日期解析成 Date 对象
    if (value instanceof Date) {
        return value.toISOString().slice(0, 10)
    }

    const stringValue = String(value).trim()

    // 兼容 Unix 时间戳
    if (/^\d+$/.test(stringValue)) {
        const timestamp = Number(stringValue)

        // 秒级时间戳
        if (timestamp > 1000000000) {
            return new Date(timestamp * 1000)
                .toISOString()
                .slice(0, 10)
        }
    }

    return stringValue
}

/**
 * 使用 Feishu 节点创建时间作为日期兜底。
 */
function dateFromFeishuNode(node) {
    const value =
        node.obj_create_time ||
        node.create_time ||
        node.created_at

    if (!value) {
        return undefined
    }

    return normalizeDate(value)
}

/**
 * 从正文中获取第一段普通文本。
 */
function getFirstParagraph(body) {
    const lines = body
        .replace(/\r\n/g, '\n')
        .split('\n')
        .map((line) => line.trim())

    for (const line of lines) {
        if (!line) {
            continue
        }

        // 跳过 Markdown 标题
        if (/^#{1,6}\s+/.test(line)) {
            continue
        }

        // 跳过代码块标记
        if (line.startsWith('```')) {
            continue
        }

        // 跳过图片
        if (
            /^!\[[^\]]*]\([^)]*\)/.test(line) ||
            /^<img\b/i.test(line)
        ) {
            continue
        }

        // 去除简单 HTML 标签
        const text = line
            .replace(/<[^>]+>/g, '')
            .trim()

        if (text) {
            return text
        }
    }

    return undefined
}

/**
 * 从 Markdown 或 HTML 中读取正文第一张图片。
 */
function getFirstImage(body) {
    // 匹配 HTML 图片：
    // <img src="/assets/example.png">
    const htmlImage = body.match(
        /<img\b[^>]*\bsrc=["']([^"']+)["']/i,
    )

    if (htmlImage?.[1]) {
        return normalizeImageUrl(htmlImage[1])
    }

    // 匹配 Markdown 图片：
    // ![alt](/assets/example.png)
    const markdownImage = body.match(
        /!\[[^\]]*]\(\s*<?([^>\s)]+)>?(?:\s+["'][^)]*["'])?\s*\)/i,
    )

    if (markdownImage?.[1]) {
        return normalizeImageUrl(markdownImage[1])
    }

    return undefined
}

/**
 * 统一图片 URL。
 *
 * 不管原正文中是：
 *
 * assets/example.png
 * ./assets/example.png
 * /docs/assets/example.png
 * /assets/example.png
 *
 * 最终都转换成：
 *
 * /assets/example.png
 */
function normalizeImageUrl(value) {
    if (!value) {
        return undefined
    }

    const imageUrl = String(value).trim()

    // 外部图片和 data URL 不修改
    if (
        imageUrl.startsWith('http://') ||
        imageUrl.startsWith('https://') ||
        imageUrl.startsWith('data:')
    ) {
        return imageUrl
    }

    const assetsIndex = imageUrl.indexOf('assets/')

    if (assetsIndex >= 0) {
        return `/${imageUrl.slice(assetsIndex)}`
    }

    if (imageUrl.startsWith('/')) {
        return imageUrl
    }

    return `/${imageUrl}`
}

/**
 * 生成安全的文件名。
 */
function safeFileName(title) {
    return String(title)
        .trim()
        .replace(/[\\/:*?"<>|]/g, '-')
        .replace(/\s+/g, ' ')
        .concat('.md')
}

/**
 * 将节点的 filename 转换成 dist/docs 下的相对路径。
 */
function getNodeRelativeFilename(node, categoryTitle) {
    const filename =
        node.filename ||
        node.file_name ||
        node.filepath ||
        node.relative_path

    if (filename) {
        return normalizeRelativePath(filename)
    }

    // 如果 docs.json 没有提供 filename，
    // 使用分类目录 + 文章标题作为备用路径。
    return [
        categoryTitle,
        safeFileName(node.title),
    ]
        .map((item) => item.replaceAll('\\', '/'))
        .join('/')
}

/**
 * 判断两个路径是否相同。
 */
function isSamePath(first, second) {
    return path.resolve(first) === path.resolve(second)
}

/**
 * 收集一级分类下的直接子文章。
 */
function collectArticles(rootNodes) {
    const articles = []

    for (const categoryNode of rootNodes) {
        const categoryTitle = String(
            categoryNode.title || '',
        ).trim()

        // 首页完全排除
        if (!categoryTitle || categoryTitle === '首页') {
            continue
        }

        const children = Array.isArray(
            categoryNode.children,
        )
            ? categoryNode.children
            : []

        for (const articleNode of children) {
            const articleTitle = String(
                articleNode.title || '',
            ).trim()

            if (!articleTitle) {
                continue
            }

            // 如果分类下有“封面”文档，不把它当成文章
            if (articleTitle === '封面') {
                continue
            }

            // hide: true 的节点不复制
            if (articleNode.meta?.hide === true) {
                continue
            }

            // 按你的规则，只处理一级分类下的直接子节点。
            // 如果这个子节点还有 children，说明它可能是二级目录，
            // 这里跳过并打印提示。
            if (
                Array.isArray(articleNode.children) &&
                articleNode.children.length > 0
            ) {
                console.warn(
                    `跳过包含子节点的目录：${categoryTitle}/${articleTitle}`,
                )
                continue
            }

            articles.push({
                categoryTitle,
                categoryNode,
                articleNode,
            })
        }
    }

    return articles
}

/**
 * 读取 docs.json。
 */
const docsJson = JSON.parse(
    await fs.readFile(DOCS_JSON_PATH, 'utf8'),
)

const rootNodes = getRootNodes(docsJson)

const allMarkdownFiles = await walkMarkdownFiles(DOCS_DIR)

/**
 * 建立“文章标题 -> 文件路径”索引。
 *
 * 正常情况下会直接使用 docs.json 中的 filename。
 * 如果某个版本的 docs.json 没有 filename，
 * 就通过 Markdown frontmatter 中的 title 找文件。
 */
const markdownTitleIndex = new Map()

for (const filePath of allMarkdownFiles) {
    try {
        const source = await fs.readFile(filePath, 'utf8')
        const { meta } = parseFrontmatter(source)

        if (meta.title) {
            markdownTitleIndex.set(
                String(meta.title).trim(),
                filePath,
            )
        }
    } catch {
        // 单个文件读取失败时继续处理其他文件
    }
}

/**
 * 清空 Astro 目标目录。
 *
 * 之后脚本会重新复制当前 Feishu 中存在的文章和图片。
 */
assertSafeDestination(ARTICLE_DEST_DIR)
assertSafeDestination(IMAGE_DEST_DIR)


await clearDirectory(ARTICLE_DEST_DIR)
await clearDirectory(IMAGE_DEST_DIR)

const articleEntries = collectArticles(rootNodes)
const generatedArticles = []
const keptSourceFiles = new Set()

for (const entry of articleEntries) {
    const {
        categoryTitle,
        articleNode,
    } = entry

    const nodeRelativeFilename =
        getNodeRelativeFilename(
            articleNode,
            categoryTitle,
        )

    let sourceFile = sourceFilePath(
        nodeRelativeFilename,
    )

    /**
     * 如果 docs.json 的 filename 不存在，
     * 尝试按照标题索引寻找真实文件。
     */
    try {
        await fs.access(sourceFile)
    } catch {
        const indexedFile =
            markdownTitleIndex.get(
                String(articleNode.title).trim(),
            )

        if (indexedFile) {
            sourceFile = indexedFile
        }
    }

    let source

    try {
        source = await fs.readFile(sourceFile, 'utf8')
    } catch {
        console.warn(
            `找不到文章文件，跳过：${sourceFile}`,
        )
        continue
    }

    const {
        meta: existingMeta,
        body,
    } = parseFrontmatter(source)

    /**
     * 优先使用 docs.json 中的 meta，
     * 如果 docs.json 没有 meta，就使用 Markdown 原有 frontmatter。
     */
    const articleMeta = {
        ...existingMeta,
        ...(articleNode.meta || {}),
    }

    const date =
        normalizeDate(articleMeta.date) ||
        dateFromFeishuNode(articleNode)

    const description =
        articleMeta.description ||
        getFirstParagraph(body)

    const image =
        getFirstImage(body)

    /**
     * 明确控制 frontmatter 字段顺序。
     */
    const frontmatter = {
        title: String(
            articleNode.title || articleMeta.title || '',
        ).trim(),
    }

    if (date) {
        frontmatter.date = date
    }

    if (description) {
        frontmatter.description = description
    }

    if (articleMeta.tags !== undefined) {
        frontmatter.tags = articleMeta.tags
    }

    frontmatter.category = categoryTitle

    if (articleMeta.cover !== undefined) {
        frontmatter.cover = articleMeta.cover
    }

    // 有图片才写 image，没有图片就完全不写 image
    if (image) {
        frontmatter.image = image
    }

    /**
     * 删除不希望继续输出的 feishu-pages 字段。
     *
     * slug 和 sidebar_position 是 feishu-pages 的字段，
     * 不是 Astro 文章必须字段。
     */
    const outputYaml = YAML.dump(frontmatter, {
        noRefs: true,
        lineWidth: -1,
    })

    const outputMarkdown = [
        '---',
        outputYaml.trimEnd(),
        '---',
        '',
        body.trimStart(),
    ].join('\n') + '\n'

    const actualSourceRelativePath =
        normalizeRelativePath(
            path.relative(DOCS_DIR, sourceFile),
        )

    /**
     * 文章复制到 Astro 目录时，保留原来的分类目录结构。
     *
     * 例如：
     *
     * dist/docs/笔记/Delegate.md
     *
     * 会复制成：
     *
     * Kanade-Astro/src/content/posts/笔记/Delegate.md
     */
    let articleRelativePath =
        normalizeRelativePath(
            articleNode.filename,
        ) || actualSourceRelativePath

    if (!articleRelativePath) {
        articleRelativePath = [
            categoryTitle,
            safeFileName(articleNode.title),
        ].join('/')
    }

    // 确保文章位于分类目录下
    if (
        !articleRelativePath.startsWith(
            `${categoryTitle}/`,
        )
    ) {
        articleRelativePath = [
            categoryTitle,
            path.basename(articleRelativePath),
        ].join('/')
    }

    const destinationArticlePath = path.join(
        ARTICLE_DEST_DIR,
        ...articleRelativePath.split('/'),
    )

    await fs.mkdir(
        path.dirname(destinationArticlePath),
        {
            recursive: true,
        },
    )

    await fs.writeFile(
        destinationArticlePath,
        outputMarkdown,
        'utf8',
    )

    keptSourceFiles.add(
        path.resolve(sourceFile),
    )

    generatedArticles.push({
        title: String(articleNode.title).trim(),
        category: categoryTitle,
        sourceFile,
        sourceRelativePath: actualSourceRelativePath,
        articleRelativePath,
    })

    console.log(
        `文章已复制：${articleRelativePath}`,
    )
}

/**
 * 复制图片。
 *
 * dist/docs/assets
 *        ↓
 * Kanade-Astro/public/assets
 */
try {
    await fs.access(FEISHU_ASSETS_DIR)

    await fs.mkdir(IMAGE_DEST_DIR, {
        recursive: true,
    })

    await fs.cp(
        FEISHU_ASSETS_DIR,
        IMAGE_DEST_DIR,
        {
            recursive: true,
            force: true,
        },
    )

    console.log(
        `图片已复制到：${IMAGE_DEST_DIR}`,
    )
} catch {
    console.warn(
        `没有找到图片目录：${FEISHU_ASSETS_DIR}`,
    )
}

/**
 * 删除 dist/docs 中所有没有被保留的 Markdown。
 *
 * 这样会删除：
 *
 * 首页.md
 * 笔记.md
 * 碎碎念.md
 * SUMMARY.md
 * 其他不属于一级分类直接子文章的 Markdown
 *
 * 文章本身会保留在 dist/docs，同时已经复制到 Astro 目录。
 */
for (const filePath of allMarkdownFiles) {
    if (
        !keptSourceFiles.has(path.resolve(filePath))
    ) {
        await fs.rm(filePath, {
            force: true,
        })

        console.log(
            `已删除非文章文件：${path.relative(DOCS_DIR, filePath)}`,
        )
    }
}

/**
 * 重新生成 SUMMARY.md。
 *
 * 分类只作为目录文字，不生成分类 Markdown 页面。
 */
const summaryLines = [
    '# Summary',
    '',
]

for (const categoryNode of rootNodes) {
    const categoryTitle = String(
        categoryNode.title || '',
    ).trim()

    if (
        !categoryTitle ||
        categoryTitle === '首页'
    ) {
        continue
    }

    const categoryArticles =
        generatedArticles.filter(
            (article) =>
                article.category === categoryTitle,
        )

    if (categoryArticles.length === 0) {
        continue
    }

    summaryLines.push(`- ${categoryTitle}`)

    for (const article of categoryArticles) {
        summaryLines.push(
            `  - [${article.title}](${article.articleRelativePath})`,
        )
    }

    summaryLines.push('')
}

await fs.writeFile(
    path.join(DOCS_DIR, 'SUMMARY.md'),
    `${summaryLines.join('\n')}\n`,
    'utf8',
)

console.log('')
console.log(
    `处理完成，共生成 ${generatedArticles.length} 篇文章。`,
)
console.log(
    `文章目标目录：${ARTICLE_DEST_DIR}`,
)
console.log(
    `图片目标目录：${IMAGE_DEST_DIR}`,
)