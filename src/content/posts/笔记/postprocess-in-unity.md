---
title: Unity中的后处理技术
date: 2026-1-30
description: 介绍一些后处理技术.
tags:
  - Unity
  - CG
category: 笔记
cover: notes
image: /assets/SCqDbmwl5onRGxxYfrhcR6Pxn8e.png
---

# Unity中的后处理技术

> ⚠本节所有内容都在Unity的Built-in pipeline渲染管线下进行

# 前言-后处理技术的实现阶段

后处理（Post-Processing）在渲染管线最后阶段执行，当场景所有物体渲染完成后，对帧缓冲区图像进行二次修改和增强。

<img src="/assets/SCqDbmwl5onRGxxYfrhcR6Pxn8e.png" src-width="1447" src-height="790" align="center"/>

在Unity内置渲染管线（Built-in RP）中，这一技术通过绘制覆盖整个屏幕的面片（两个三角形组成的四边形）实现，并将帧缓冲区的图像作为纹理输入到特定的Shader中进行处理。

<img src="/assets/Ft7kbGh2fobhawx1SmAcRRpsnub.jpeg" src-width="1024" src-height="576" align="center"/>

# 颜色与矫正

## 渲染流水线

> 本段摘自 [游戏中的后处理（三）：渲染流水线、ACES、Tonemapping和 HDR](https://zhuanlan.zhihu.com/p/118272193)

### Gamma显示器

早期的CRT显示器,输入的电压和显示的亮度并不是线性关系，而是大概是 $I = V^{2.2}$ 的关系。现代的液晶显示器基本沿袭了CRT显示器的输入输出关系，由硬件来实现，在电视、显示器、电影等不同的场合亦有不同的标准。

实时渲染中的颜色计算都是在线性空间中进行的，因此要想让显示器输出正确的颜色值，需要在最后一步输出到FrameBuffer时进行伽马校正，来抵消EOTF的效果。

<img src="/assets/IlEGbxkT7oWEo8xEDZDceIoOnpb.jpeg" src-width="370" src-height="369"/>

伽马校正

### sRGB编码

人眼可以识别很大范围亮度的光照，这也导致了人眼对亮度的感受会随着亮度的增高而减弱。比如下面图中的线性编码的亮度，会明显觉得人眼对低亮度时的变化更加敏感。

<img src="/assets/SdEZbtifGoUe20xlgj1cfkienNh.jpeg" src-width="526" src-height="324"/>

线性编码和伽马编码

假设我们用8bit(0~255)来编码颜色，如果线性地按照亮度的关系进行编码，就会导致人眼在低亮度时感觉相邻颜色变化很大，而在高亮度时感觉相邻颜色变化很小，导致编码空间的浪费。

所以我们将线性的sRGB色域颜色值先应用一次伽马校正，组成 sRGB 伽马编码。这样既可以完美利用编码空间，又不需要在显示时再进行伽马校正，可谓是一举两得。

平常我们见到的大部分各种格式的图片，都是按照sRGB伽马来进行编码的。这样在浏览器显示图片时，直接将编码后的值进行显示即可，不需要任何额外的操作。

对于相机来说来说，相机把线性的场景颜色，转化成数字信号，这个过程称为OETF/opto-electronic transfer function 。

对于显示器来说，会把数字信号转换成线性的输出（尽管这个输出和原始的值并不相等，但仍然是线性的），这个过程叫做 EOTF/electronic-opto transfer function。

<img src="/assets/JQBwbxG92obX0Zxfwxdcx7B4nq4.png" src-width="919" src-height="503"/>

### 基于线性空间的渲染

我们知道，一般的图片都是以sRGB Gamma编码的形式来保存的，这样我们直接读取的话，读取到的也是sRGB编码的颜色值。如果我们直接将这个sRGB编码的颜色，在屏幕上进行显示，效果是正确的，这也是大部分浏览器，看软件的做法。

但是在游戏渲染中，这种方式就不行了。对于早期的游戏，计算光照都是直接在sRGB gamma空间中进行的，这样虽然省略了两次转换的过程，但是会导致画面明显偏亮，渲染结果错误。

现代游戏的做法，大多是在线性空间中进行光照的计算，在最后一步，再转换到Gamma空间并输出到屏幕上。整个的流程如下。

<img src="/assets/A80XbWiQBoia0mxjogwcLTjpnof.jpeg" src-width="959" src-height="503"/>

sRGB渲染

转换到Gamma空间这一步，也叫做 Gamma矫正，可以视为显示器EOTF的一个逆运算，或者是OETF。

### 色彩编码与色彩空间

一个色域加上一种编码，就形成了一个色彩空间。色彩编码，总是以线性编码为基础的。比如说 sRGB 色域下，如果使用线性编码，就构成 sRGB 线性色彩空间。如果使用 sRGB Gamma 编码，就形成了 sRGB Gamma 色彩空间。网络上的图片，绝大多数都是 sRGB Gamma 空间的。

## 传统意义的Tonemmaping

### HDR和LDR

因为我们使用的是RGBA8格式的buffer来进行渲染，所以颜色的值不能超过1，如果超过了1，就会变成白色。这样的话，很多光照效果表现就会受到很大限制。这种渲染模式就是我们所说的LDR/Low Dynamic Range。

因此，我们会使用HDR/ High dynamic range技术，将buffer进行扩展，使得颜色值可以超过1。现在手机上大多会使用 R11G11B10 格式的buffer，电脑上大多直接使用 RGBAHalf格式，来表示颜色值。

不过，我们显示器的显示的范围还是0~1的，因此我们还需要将这个超过1的数转化到0~1的范围，<b>这个过程就叫做Tonemapping</b>。Tonemapping算法应该能将光照值的范围进行压缩，且尽可能保留场景中的物体细节信息。

我们把渲染中计算的颜色值叫做 scene-referred 的。把经过 tonemapping 转换后的值叫做 display-refrerred。tonemapping 也叫做Display rendering Transform 或者 Output Transform。

scene-referred 和 display-referred 都是线性的，但是他们的范围不同，甚至也可以使用不同的色域。在游戏中，我们一般都是直接使用sRGB色域。

在Tonemapping之后，我们还是需要把颜色转到gamma空间才能输出到屏幕。

### Reinhard tone mapping

Reinhard tone mapping是最早出现的Tonemapping算法，其实现非常简单，就是通过这样的一个函数，来实现光照范围的转化：

<img src="/assets/KJjwbQIkRop6loxTk2ic5Y6bnNg.png" src-width="504" src-height="361"/>

<img src="/assets/STOEbRLhvo2k1txHI8IctOWwnre.png" src-width="355" src-height="535"/>

### Filmic tone mapping

Reinhard tone mapping实在是太过于简单，因此后面便有了各种调整和改进。后来一个比较成熟的做法是Filmic tone mapping，其计算方式如下：

```c
float3 F(float3 x)
{
    const float A = 0.22f;
    const float B = 0.30f;
    const float C = 0.10f;
    const float D = 0.20f;
    const float E = 0.01f;
    const float F = 0.30f;
    return ((x * (A * x + C * B) + D * E) / (x * (A * x + B) + D * F)) - E / F;
}
float3 Uncharted2ToneMapping(float3 color, float adapted_lum)
{
    const float WHITE = 11.2f;
    return F(1.6f * adapted_lum * color) / F(WHITE);
}
```

那些ABCDEF都是多项式的系数，而WHITE是个magic number，表示白色的位置。这个方法开启了tone mapping的新路径，让人们知道了曲线拟合的好处。并且，其他颜色空间的变换，比如gamma矫正，也可以一起合并到这个曲线里来，一次搞定，不会增加额外开销。缺点就是运算量有点大，两个多项式的计算，并且相除。

因为Filmic tone mapping的优异表现，大部分游戏都切换到了这个方法。

除此之外，现在的很多游戏引擎，大多支持自定义tonemapping曲线。

<img src="/assets/BkJZbeykZoEHamxGNGjcpKZinlZ.png" src-width="779" src-height="287"/>

Unity中自定义Tonemapping设置面板

## ACES流水线

### HDR 显示器的革命

与SDR/ standard dynamic range显示器相对应，HDR/high dynamic range显示器表示可以显示非常大范围亮度的显示器。普通显示器的亮度只能达到400~500nit，而HDR显示器的最大亮度可达1000nit，且比普通显示器显示的色彩色域空间更大。注意这里HDR的上面HDR是两个不同的含义。

前面我们讲过，Tonemmapping的作用是将超过1的亮度值，统一缩放到0~1。如果我们在HDR显示器下继续这么做，那么一种Tonemapping曲线就不能满足所有的需求了。

在影视领域，ACES已经成为主流，因此在游戏渲染方面，也逐渐向ACES靠拢。ACES是一套包括色域和工作流的东西：

### ACES 中定义的色域

ACES 标准定义了一些色域和色彩空间如下：

色域有：

- AP0，包含所有颜色的色域
- AP1，工作色域

色彩空间有：

- ACES2065-1/ACES 色彩空间，使用 AP0 色域，用于存储颜色，处理色彩转换
- ACEScg 色彩空间，使用 AP1 色域，一个线性的渲染计算工作空间
- ACEScc 色彩空间，AP1 色域，指数空间，用于调色
- ACEScct 色彩空间，使用 AP1 色域，和 ACEScc 类似，只是曲线略有不同，适用于不同的场景

<img src="/assets/Po7kbgV7Qo5mY2x2nbfchZjenre.png" src-width="536" src-height="595"/>

### ACES标准下的渲染流水线

简单来说，ACES工作流包括如下的内容：

<img src="/assets/HSzdbV4PFoOYywx3v4Pc9gdynYe.png" src-width="946" src-height="499"/>

<b>IDT/Input Device Transform</b>，表示将保存的纹理转化到ACEScg空间，这一步可以类似于我们在游戏中从 sRGB Gamma格式的图片中读取像素的颜色值；

<b>ACEScg </b>作为渲染计算的空间，因为 ACEScg 的颜色范围更大，因此比sRGB更加适合做各类色彩计算， 可以类比为我们在游戏中计算渲染用的 sRGB 线性空间；

<b>RRT（Reference Rendering Transform）</b>，将 scene-referenced 线性空间中的颜色，转换到 display-referenced 的线性空间中，类似于上面我们讲的Tonemapping。

<b>ODT (Output Display Transform)</b>，将 display-referenced 线性空间下的颜色，转换给显示器使用的空间中（对于普通的显示器，是 sRGB Gamma 空间），类似于上面的Gamma矫正输出到显示器。

<b>LMT（Look Modification Transforms）</b>，在 scene-referenced 空间下，进行调色。类似于 ColorGrading。一般是为了让画面更加鲜艳好看，或者实现某些特化需求。

可以看出，ACES 的流程和我们的游戏渲染流水线是非常相似的，只是 ACES 的设计更加严密，更加适用于影视领域。

## 游戏中ACES的应用

### 一个最小化的ACES Tonemapping曲线

在游戏中，我们想直接使用ACES的Tonemapping曲线，但是又不想去集成茫茫多的转换步骤到游戏中，就可以使用这个ACES的最小实现([6])，是将ACES的一系列Tonemapping过程，简化成这样一个曲线来进行拟合：

```c
float3 ACESFilm(float3 x)
{
    float a = 2.51f;
    float b = 0.03f;
    float c = 2.43f;
    float d = 0.59f;
    float e = 0.14f;
    return saturate((x * (a * x + b)) / (x * (c * x + d) + e));
}
```

### ColorGrading观念的革命

ACES带给我们的另外一个启发，是所有的 Color Grading 操作，都应该在 Tonemapping 之前进行，这和以前游戏渲染的理念大不相同。

以前的游戏渲染中，我们认为 ColorGrading 是对最终输出结果的调整，因此是发生在 Tonemmaping 之后的。而ACES告诉我们，ColorGrading应该是一个和Tonemmaping无关的操作，因此发生在 Tonemmaping 之前。下图显示了两种流程的对比：

<img src="/assets/J2YLbSLWooUnS8xE8NfcJSmMnPe.png" src-width="901" src-height="400"/>

HDR 显示器的出现，也推动了这一过程。因为我们需要支持不同亮度范围的显示器，就需要使用不同的 Tonemmaping 曲线，这样如果在 Tonemmaping 之后进行 ColorGrading，就会导致效果不一致。因此类似ACES方式的工作流，也是实现 HDR 显示器显示的必要条件。

# 具体案例实现

## 颜色调整

创建一个C#脚本来控制各种后处理效果：

<img src="/assets/QGiobgXxoooyZGxzkALclQO1n0e.png" src-width="1812" src-height="1036" align="center"/>

我们需要创建一个Shader并应用到材质，传递进后处理函数以对图像进行后处理。其中的 OnRenderImage() 函数在unity的Built-in渲染管线内有效，其具体作用如下：

<img src="/assets/HfSUb3mEUomuKKx7HbHcUaJLntf.png" src-width="927" src-height="222" align="center"/>

而 Blit() 函数将材质 mat 的 Shader 效果应用至 source 并输出 dest ：

<img src="/assets/TighbMG3UolZbOxWo7VcNbyJnXd.png" src-width="1548" src-height="683" align="center"/>

你也可以使用 Blit() 重载的第四个参数n来指定使用 Material 的 shader 的第n个pass。

创建Unity为我们准备好的Shader模板：

<div class="flex gap-3 columns-2" column-size="2">
<div class="w-[40%]" width-ratio="40">
<img src="/assets/Lpl2bs6yKoMWaKxLzPkcQmlAnPb.png" src-width="792" src-height="997"/>
</div>
<div class="w-[59%]" width-ratio="59">
<img src="/assets/YOZxb9NPAoQiZqxC0ghc32O5nbc.png" src-width="927" src-height="795" align="right"/>
</div>
</div>

> Tips: 在脚本类前添加 ExecuteInEditMode 修饰就可以在编辑器中实时预览你的更改而无需运行

调整图像颜色的代码很简单，完整的Shader代码如下：

```openglshadinglanguage
// ================================================
// Post-Processing Shader: Color Adjustment & Vignette
// ================================================
Shader "Lisii/postProcess/ColorAdjustment"
{
    Properties
    {
        // 主纹理 - 输入的后处理源纹理，由相机渲染得到
        _MainTex ("Texture", 2D) = "white" {}

        // 亮度控制 - 控制图像整体明暗度
        // 范围：0（全黑）~ 2（两倍亮度）
        _Brightness ("Brightness", Range(0, 2)) = 1

        // 饱和度控制 - 控制色彩鲜艳程度
        // 范围：0（完全灰度）~ 2（超饱和）
        _Saturation ("Saturation", Range(0, 2)) = 1

        // 对比度控制 - 控制明暗区域差异程度
        // 范围：0（完全灰色）~ 2（高对比）
        _Contrast ("Contrast", Range(0, 2)) = 1

        // 暗角强度 - 控制图像边缘变暗的程度
        // 范围：0（无暗角）~ 2（强暗角）
        _VignetteIntensity ("Vignette Intensity", Range(0, 2)) = 0.7

        // 暗角粗糙度 - 控制暗角从中心开始的扩散距离
        // 值越小暗角越靠边缘，值越大暗角越靠近中心
        _VignetteRoughness ("Vignette Roughness", Range(0, 1)) = 0.5

        // 暗角平滑度 - 控制暗角边缘的过渡平滑程度
        // 值越小边缘越锐利，值越大过渡越平滑
        _VignetteSmoothness ("Vignette Smoothness", Range(0, 2)) = 1

        // 色相偏移 - 控制整体色相旋转
        // 范围：0~1（对应0°~360°色相环）
        _HueShift ("Hue Shift", Range(0, 1)) = 0
    }

    SubShader
    {
        // 后处理设置：
        // Cull Off      - 禁用面片剔除（正反面都渲染）
        // ZWrite Off    - 不写入深度缓冲区
        // ZTest Always  - 总是通过深度测试（保证全屏绘制）
        Cull Off
        ZWrite Off
        ZTest Always

        Pass
        {
            CGPROGRAM
            #pragma vertex vert
            #pragma fragment frag
            #include "UnityCG.cginc"

            sampler2D _MainTex;
            float _Brightness;
            float _Saturation;
            float _Contrast;
            float _VignetteIntensity;
            float _VignetteRoughness;
            float _VignetteSmoothness;
            float _HueShift;

            struct appdata
            {
                float4 vertex : POSITION;
                float2 uv : TEXCOORD0;
            };

            struct v2f
            {
                float2 uv : TEXCOORD0;
                float4 vertex : SV_POSITION;
            };

            float3 HSV2RGB(float3 c)
            {
                float4 K = float4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
                float3 p = abs(frac(c.xxx + K.xyz) * 6.0 - K.www);
                return c.z * lerp(K.xxx, saturate(p - K.xxx), c.y);
            }

            float3 RGB2HSV(float3 c)
            {
                float4 K = float4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
                float4 p = lerp(float4(c.bg, K.wz), float4(c.gb, K.xy), step(c.b, c.g));
                float4 q = lerp(float4(p.xyw, c.r), float4(c.r, p.yzx), step(p.x, c.r));

                float d = q.x - min(q.w, q.y);
                float e = 1.0e-10;
                return float3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
            }

            v2f vert(appdata v)
            {
                v2f o;
                o.vertex = UnityObjectToClipPos(v.vertex);
                o.uv = v.uv;
                return o;
            }

            half4 frag(v2f i) : SV_Target
            {
                // 步骤1：从主纹理采样原始颜色
                // 采样当前像素对应的纹理颜色（RGBA格式）
                half4 col = tex2D(_MainTex, i.uv);

                // - 亮度调整
                // 将RGB各通道乘以亮度系数，线性改变整体亮度
                half3 final_color = col.rgb * _Brightness;

                // - 色相调整
                // 将RGB颜色转换为HSV空间，调整色相后再转换回RGB
                float3 hsv = RGB2HSV(final_color);
                // 提取色相分量
                hsv.r += _HueShift;
                final_color = HSV2RGB(hsv);

                // - 饱和度调整
                // 计算当前颜色亮度，在灰度值和原始颜色之间插值
                // 1. 计算亮度（伽马空间下的亮度公式）
                // 伽马空间下公式1：float lumin = dot(brightness_adjusted_color, float3(0.22, 0.707, 0.071));
                // 线性空间下公式2：float lumin = dot(brightness_adjusted_color, float3(0.0396,0.458,0,0061));
                float lumin = dot(final_color, float3(0.22, 0.707, 0.071));
                // 2.插值
                final_color = lerp(lumin.xxx, final_color, _Saturation);
                // 2. 根据饱和度参数在灰度和彩色之间插值
                // 当_Saturation=0时：完全灰度
                // 当_Saturation=1时：原始颜色
                // 当_Saturation>1时：超饱和（增强颜色差异）
                final_color = lerp(lumin.xxx, final_color, _Saturation);

                // - 对比度调整
                // 以中性灰(0.5,0.5,0.5)为基准进行插值
                // 定义中性灰色（对比度调整的基准点）
                float3 mid_color = float3(0.5, 0.5, 0.5);
                // 插值计算：对比度越高，颜色越偏离中性灰
                final_color = lerp(mid_color, final_color, _Contrast);

                // - 暗角效果（Vignette）
                // 基于到图像中心的距离，边缘应用透明度衰减
                // 1. 将UV从[0,1]范围转换到[-1,1]范围
                //    使坐标原点位于图像中心
                float2 uv = i.uv * 2.0 - 1.0;

                // 2. 计算当前像素到图像中心的距离（欧几里得距离）
                //    length()函数计算向量长度
                float dist = length(uv);

                // 3. 使用smoothstep创建平滑的暗角遮罩
                //    smoothstep产生一个在指定范围内平滑过渡的值
                //    参数解释：
                //    - 1.0 - _VignetteRoughness：暗角开始的位置
                //    - 1.0 - _VignetteRoughness + _VignetteSmoothness：暗角结束的位置
                //    - dist：当前像素到中心的距离
                float vignette = smoothstep(1.0 - _VignetteRoughness, 1.0 - _VignetteRoughness + _VignetteSmoothness, dist);

                // 4. 应用暗角效果到最终颜色
                //    lerp在1.0和(1.0 - 暗角强度)之间插值
                //    vignette值越大（越靠边缘），颜色越暗
                final_color *= lerp(1.0, 1.0 - _VignetteIntensity, vignette);

                return half4(final_color, col.a);
            }

            ENDCG
        }

    }
}
```

它的效果看起来就像这样：

[QQ20260128-204018-HD.mp4](/assets/GShGbSEKIoqCu3xWUs7cF1LBnRg.mp4)

不过，频繁更改材质球设置是一个很不优雅的过程，我们可以把参数从脚本动态传入材质，这样就可以在脚本上更改：

```csharp
using UnityEngine;

[ExecuteInEditMode]
public class PostProcessImage : MonoBehaviour
{
    public Material postProcessMaterial;
    [Range(0, 2)]
    public float brightness = 1f;
    [Range(0, 2)]
    public float saturation = 1f;
    [Range(0, 2)]
    public float contrast = 1f;
    [Range(0, 2)]
    public float vignetteIntensity = 0.7f;
    [Range(0, 1)]
    public float vignetteRoughness = 0.5f;
    [Range(0, 2)]
    public float vignetteSmoothness = 1f;
    [Range(0, 1)]
    public float hueShift = 0f;

    // Start is called once before the first execution of Update after the MonoBehaviour is created
    void Start()
    {

    }

    // Update is called once per frame
    void Update()
    {

    }

    void OnRenderImage(RenderTexture src, RenderTexture dest)
    {
        postProcessMaterial.SetFloat("_Brightness", brightness);
        postProcessMaterial.SetFloat("_Saturation", saturation);
        postProcessMaterial.SetFloat("_Contrast", contrast);
        postProcessMaterial.SetFloat("_VignetteIntensity", vignetteIntensity);
        postProcessMaterial.SetFloat("_VignetteRoughness", vignetteRoughness);
        postProcessMaterial.SetFloat("_VignetteSmoothness", vignetteSmoothness);
        postProcessMaterial.SetFloat("_HueShift", hueShift);

        Graphics.Blit(src, dest, postProcessMaterial);

    }
}
```

<img src="/assets/YzPFbZWzio244nx224kcEfd9nXc.png" src-width="2560" src-height="1540" align="center"/>

## 后处理效果-碎屏特效

碎屏特效也比较简单，不过为了模拟玻璃破碎的视觉效果，需要两张贴图：一张破碎遮罩图（控制裂纹形状和透明度）和一张法线贴图（模拟裂纹的凹凸感，产生扭曲效果）:

<div class="flex gap-3 columns-2" column-size="2">
<div class="w-[50%]" width-ratio="50">
<img src="/assets/RjTdbH457oboy7xyJ05cZKZjnqh.png" src-width="398" src-height="399" align="center"/>
</div>
<div class="w-[50%]" width-ratio="50">
<img src="/assets/M5CYbfkFAoNnOXxxgHfc4iANnKd.png" src-width="2048" src-height="2048" align="center"/>
</div>
</div>

其他步骤与上面的颜色调整没什么区别，Shader代码如下：

```openglshadinglanguage
Shader "Lisii/postProcess/BrokenGlass"
{
    Properties
    {
        _MainTex ("Texture", 2D) = "white" {}
        _GlassMask ("Glass Mask", 2D) = "white" {}
        _GlassCrack ("GlassCrack", Float) = 0.5
        _GlassNormal ("GlassNormal", 2D) = "bump" {}
        _Distort ("Distort", Range(0,1)) = 0.5
    }
    SubShader
    {
        // No culling or depth
        Cull Off
        ZWrite Off
        ZTest Always

        Pass
        {
            CGPROGRAM
            #pragma vertex vert
            #pragma fragment frag

            #include "UnityCG.cginc"

            sampler2D _MainTex;
            sampler2D _GlassMask;
            float4 _GlassMask_ST;
            float _GlassCrack;
            sampler2D _GlassNormal;
            float _Distort;

            struct appdata
            {
                float4 vertex : POSITION;
                float2 uv : TEXCOORD0;
            };

            struct v2f
            {
                float2 uv : TEXCOORD0;
                float4 vertex : SV_POSITION;
            };

            v2f vert(appdata v)
            {
                v2f o;
                o.vertex = UnityObjectToClipPos(v.vertex);
                o.uv = v.uv;
                return o;
            }

            fixed4 frag(v2f i) : SV_Target
            {
                // - 设置碎屏贴图的UV坐标
                // 计算屏幕宽高比
                float aspect = _ScreenParams.x / _ScreenParams.y;
                // 根据_ST参数调整UV坐标（缩放和平移）
                fixed2 glass_uv = i.uv * _GlassMask_ST.xy + _GlassMask_ST.zw;
                // 根据宽高比调整X轴坐标，防止拉伸
                glass_uv.x = (glass_uv.x - 0.5) * aspect + 0.5;

                // - 采样碎屏法线贴图，计算UV扰动
                fixed3 glass_normal = UnpackNormal(tex2D(_GlassNormal, glass_uv));
                fixed2 uv_distort = i.uv + glass_normal.xy * _Distort;
                // - 采样主贴图颜色，并应用碎屏效果
                fixed4 col = tex2D(_MainTex, uv_distort);
                fixed3 final_color = col.rgb;

                // - 根据碎屏遮罩贴图的灰度值，混合裂纹颜色
                half glass_opacity = tex2D(_GlassMask, glass_uv).r;
                final_color = lerp(final_color, _GlassCrack.xxx, glass_opacity);

                return fixed4(final_color, col.a);
            }
            ENDCG
        }
    }
}
```

注意纹理类型需要选择法线：

<img src="/assets/USEpbiXapovmEpxbAVgcvAktnlh.png" src-width="770" src-height="611" align="center"/>

设置两个Texture：

<img src="/assets/JCw0bbwzKoGPx1xGc4dcPZVnnSb.png" src-width="768" src-height="750" align="center"/>

如果一切顺利的话，你应该会看到这样的效果：

<div class="flex gap-3 columns-2" column-size="2">
<div class="w-[50%]" width-ratio="50">
<img src="/assets/SIIzbu4UyohspYxZJoHcSKUFngf.png" src-width="1179" src-height="1069" align="center"/>

<p>无法线贴图</p>
</div>
<div class="w-[50%]" width-ratio="50">
<img src="/assets/SB2bbBRMmo0KoUxxj64copWtnMh.png" src-width="1196" src-height="1032" align="center"/>

<p>有法线贴图</p>
</div>
</div>

可以看到差别还是十分明显的。

## 模糊

> 此段部分内容引用自 [高品质后处理：十种图像模糊算法的总结与实现-毛星云](https://zhuanlan.zhihu.com/p/125744132)

要评判一种模糊算法的好坏，主要有三个标准：

- 模糊品质（Quality） 。模糊品质的好坏是模糊算法是否优秀的主要指标。
- 模糊稳定性（Stability） 。模糊的稳定性决定了在画面变化过程中，模糊是否稳定，不会出现跳变或者闪烁。
- 性能（Performance） 。性能的好坏是模糊算法是否能被广泛使用的关键所在。

<img src="/assets/QbspbcFfTobxSRx3V7pcZaBtnOe.png" src-width="1335" src-height="979" align="center"/>

### 方框模糊（Box Blur）

方框模糊（Box Blur），又常被称为盒式模糊，其中所得到的图像中的每个像素具有的值等于其邻近的像素的输入图像中的平均值。在图像处理领域，Box Blur通常用于近似高斯模糊。因为根据中心极限定理，重复应用Box Blur可以得到和高斯模糊非常近似的模糊表现。

可以将3 x 3的box blur的kernel表示为如下矩阵

<img src="/assets/Qzc4bIykwoO3WuxWPIFcr7uQnwg.png" src-width="238" src-height="165" align="center"/>

Box Blur和高斯模糊的性质对比可见下图：

<img src="/assets/RgRFbAhJJoR9OuxkPYPcFvNYnFe.png" src-width="567" src-height="561"/>

Box Blur的渲染效果接近高斯模糊，但性价比并不高，需要较多的迭代次数才能达到高品质的模糊效果：

<img src="/assets/WNJLbAAyroqSZBxvVLrcoHWonrd.png" src-width="752" src-height="420"/>

Box Blur的代码见这一部分末尾。

### 高斯模糊（Gaussian Blur）

高斯模糊（Gaussian Blur），也叫高斯平滑（Gaussian smoothing），作为最经典的模糊算法，一度成为模糊算法的代名词。

<img src="/assets/JtW8bTzzZorD80xuVIQcqrV9n1b.jpeg" src-width="852" src-height="480"/>

高斯模糊在图像处理领域，通常用于减少图像噪声以及降低细节层次，以及对图像进行模糊，其视觉效果就像是经过一个半透明屏幕在观察图像。

从数字信号处理的角度看，图像模糊的本质一个过滤高频信号，保留低频信号的过程。过滤高频的信号的一个常见可选方法是卷积滤波。从这个角度来说，图像的高斯模糊过程即图像与正态分布做卷积。由于正态分布又叫作“高斯分布”，所以这项技术就叫作高斯模糊。而由于高斯函数的傅立叶变换是另外一个高斯函数，所以高斯模糊对于图像来说就是一个低通滤波器。

用于高斯模糊的高斯核（[Gaussian Kernel](https://zhida.zhihu.com/search?content_id=116073467&content_type=Article&match_order=1&q=Gaussian+Kernel&zd_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJ6aGlkYV9zZXJ2ZXIiLCJleHAiOjE3Njk4NDY1NzUsInEiOiJHYXVzc2lhbiBLZXJuZWwiLCJ6aGlkYV9zb3VyY2UiOiJlbnRpdHkiLCJjb250ZW50X2lkIjoxMTYwNzM0NjcsImNvbnRlbnRfdHlwZSI6IkFydGljbGUiLCJtYXRjaF9vcmRlciI6MSwiemRfdG9rZW4iOm51bGx9.31OuC2EHzJo__uIliszu8CvcF56Bj5AbWeKopK93Y7I&zhida_source=entity)）是一个正方形的像素阵列，其中像素值对应于2D高斯曲线的值。

<img src="/assets/RCTsb4cV9oiNWQx0D2VczdyznGd.png" src-width="397" src-height="254" align="center"/>

图像中的每个像素被乘以高斯核，然后将所有这些值相加，得到输出图像中此处的值。

<img src="/assets/Plivby8vNofg59xWF1ocJUKHnad.jpeg" src-width="331" src-height="273"/>

下图为高斯函数的3维图示：

<img src="/assets/PIcmbhJh8ondIwxKCqAcZrqwnPb.jpeg" src-width="352" src-height="261"/>

以下是开启高斯模糊后处理前后的对比图：

<img src="/assets/WEPWbFoNmoWu8Dxdn2kcWqsXnEc.png" src-width="1355" src-height="760"/>

<img src="/assets/TjcnbWKOGo4zfsxxLqkc2S4cnKb.png" src-width="1355" src-height="762"/>

以及BlurRadius为3，Iteration为6，RTDownScale为1的设置下，经过横纵线性分解的高斯模糊的渲染过程的动图：

[96c47f20-ec81-11ea-acfd-5ab503a75443.mp4](/assets/Z8YGbvEj4oZeTcxWEvdcT53Qnod.mp4)

对模糊半径（Blur Radius）参数的调节，可以控制高斯模糊的程度：

[13c70216-ec84-11ea-acfd-5ab503a75443.mp4](/assets/X8QXbvHN6orqGPxBViDcBUBvnWg.mp4)

不过，若要直接计算所有像素，计算复杂度会高的无法接受，幸运的是，我们可以借助其线性可分的特性，采用经过线性分解的高斯核的方案：

<img src="/assets/S0B3bOITRoYcRUxTXyUcjxp4nug.png" src-width="908" src-height="534" align="center"/>

具体实现见这一部分末尾。

### Kawase模糊（Kawase Blur）

Kawase Blur于Masaki Kawase 在GDC2003的分享《Frame Buffer Postprocessing Effects in DOUBLE-S.T.E.A.L (Wreckless)》中提出。Kawase Blur最初用于Bloom后处理特效，但其可以推广作为专门的模糊算法使用，且在模糊外观表现上与高斯模糊非常接近。 Kawase Blur的思路是对距离当前像素越来越远的地方对四个角进行采样，且在两个大小相等的纹理之间进行乒乓式的blit。创新点在于，采用了随迭代次数移动的blur kernel，而不是类似高斯模糊，或box blur一样从头到尾固定的blur kernel。

<img src="/assets/O9nybGttzox3TaxGZAMcXP3Enie.png" src-width="895" src-height="515"/>

<img src="/assets/J5aub5CgNoxLXNxooNucR7O3n2c.png" src-width="793" src-height="396"/>

具体思路是基于当前迭代次数，对每次模糊的半径进行设置。

Kawase Blur渲染效果接近高斯模糊，但具有更好的性能：实践数据表明，在相似的模糊表现下，Kawase Blur比经过优化的高斯模糊的性能约快1.5倍到3倍。

<img src="/assets/RPskbCAk2oTNdxxNLaxcRvWDngc.png" src-width="1299" src-height="729"/>

### 双重模糊（Dual Blur）

Dual Kawase Blur，简称Dual Blur，是SIGGRAPH 2015上ARM团队提出的一种衍生自Kawase Blur的模糊算法。其由两种不同的Blur Kernel构成，如下图所示。

<img src="/assets/JSxZblQwhoOrjIxzvZscNGU8nEf.png" src-width="1176" src-height="522"/>

相较于Kawase Blur在两个大小相等的纹理之间进行乒乓blit的的思路，Dual Kawase Blur的核心思路在于blit过程中进行降采样和升采样,即对RT进行了降采样以及升采样。如下图所示：

<img src="/assets/ZU6IbSV29oDYtzx2EHcc0G9unLW.png" src-width="770" src-height="434"/>

由于灵活的升降采样带来了blit RT所需计算量的减少等原因， Dual Kawase Blur相较于上文中提到的Gauusian Blur、Box Blur、Kawase Blur等Blur算法，有更好的性能，下图是相同条件下的性能对比。

<img src="/assets/SDsUbm3Xko0M0zxd9amc6vCZnWe.png" src-width="1059" src-height="594"/>

可以看到，Dual Kawase Blur具有最佳的性能表现。

也可以把双重模糊的思想应用于其他算法上，例如对BoxBlur做升降采样得到Dual Box Blur，可以在实现不错效果的同时拥有不错的性能表现。

Dual Kawase Blur的具体实现见这一部分末尾。

### 代码实现

Shader代码

```openglshadinglanguage
Shader "Lisii/postProcess/Blur"
{
    Properties
    {
        _MainTex ("Texture", 2D) = "white" {}
        _BlurRadius ("Blur Radius", Float) = 1 // Kawase 算法中这个值作为 Offset 乘数
    }

    SubShader
    {
        Cull Off
        ZWrite Off
        ZTest Always

        CGINCLUDE
        #include "UnityCG.cginc"

        sampler2D _MainTex;
        float4 _MainTex_TexelSize;
        int _BlurRadius;

        // 由 C# 传入的模糊方向向量 (1,0) 或 (0,1)，避免 Shader 内部 if 判断
        float2 _BlurOffset;

        struct v2f
        {
            float4 pos : SV_POSITION;
            float2 uv : TEXCOORD0;
        };

        v2f vert(appdata_img v)
        {
            v2f o;
            o.pos = UnityObjectToClipPos(v.vertex);
            o.uv = v.texcoord;
            return o;
        }

        // --- 算法实现区域 ---

        // 1. Box Blur 算法
        fixed4 FragBoxBlur(v2f i) : SV_Target
        {
            fixed4 col = 0;
            // 简单的优化：尽量避免除法在循环内，虽然编译器可能会优化
            float weight = 1.0 / ((_BlurRadius * 2 + 1) * (_BlurRadius * 2 + 1));

            for (int x = -_BlurRadius; x <= _BlurRadius; x++)
            {
                for (int y = -_BlurRadius; y <= _BlurRadius; y++)
                {
                    float2 offset = float2(x, y) * _MainTex_TexelSize.xy;
                    col += tex2D(_MainTex, i.uv + offset);
                }
            }
            return col * weight;
        }

        // 2. Gaussian Blur 算法 (单向，依赖 _BlurOffset)
        fixed4 FragGaussianBlur(v2f i) : SV_Target
        {
            fixed4 col = 0;
            float totalWeight = 0.0;

            // sigma 通常设为 radius / 3.0，或者直接关联
            float sigma = max(_BlurRadius / 3.0, 0.001);
            float twoSigmaSq = 2.0 * sigma * sigma;

            for (int k = -_BlurRadius; k <= _BlurRadius; k++)
            {
                // 计算高斯权重
                float weight = exp(-(k * k) / twoSigmaSq);

                // 利用 _BlurOffset 控制是横向还是纵向 (k * (1,0) 或 k * (0,1))
                float2 offset = _BlurOffset * (k * _MainTex_TexelSize.xy);

                col += tex2D(_MainTex, i.uv + offset) * weight;
                totalWeight += weight;
            }

            return col / totalWeight;
        }

        // 3. Dual Kawase 算法

        // Pass 2: Dual Kawase Downsample
        // 采样 4 个角，每个角偏移 1 个单位（根据 radius 调整）
        fixed4 FragKawaseDown(v2f i) : SV_Target
        {
            float2 halfPixel = _MainTex_TexelSize.xy * (_BlurRadius + 0.5);
            // 0.5 偏移能利用线性采样获得更好效果

            fixed4 sum = tex2D(_MainTex, i.uv + float2(-1, -1) * halfPixel);
            sum += tex2D(_MainTex, i.uv + float2(1, -1) * halfPixel);
            sum += tex2D(_MainTex, i.uv + float2(-1, 1) * halfPixel);
            sum += tex2D(_MainTex, i.uv + float2(1, 1) * halfPixel);

            return sum * 0.25;
        }

        // Pass 3: Dual Kawase Upsample
        // 采样 8 个点来平滑结果
        fixed4 FragKawaseUp(v2f i) : SV_Target
        {
            float2 halfPixel = _MainTex_TexelSize.xy * (_BlurRadius + 0.5);

            fixed4 sum = tex2D(_MainTex, i.uv + float2(-1, -1) * halfPixel);
            sum += tex2D(_MainTex, i.uv + float2(0, -1) * halfPixel) * 2.0;
            sum += tex2D(_MainTex, i.uv + float2(1, -1) * halfPixel);
            sum += tex2D(_MainTex, i.uv + float2(-1, 0) * halfPixel) * 2.0;
            sum += tex2D(_MainTex, i.uv + float2(1, 0) * halfPixel) * 2.0;
            sum += tex2D(_MainTex, i.uv + float2(-1, 1) * halfPixel);
            sum += tex2D(_MainTex, i.uv + float2(0, 1) * halfPixel) * 2.0;
            sum += tex2D(_MainTex, i.uv + float2(1, 1) * halfPixel);

            return sum / 12.0;
        }

        ENDCG

        // Pass 0: Box Blur
        Pass
        {
            Name "BoxBlur"
            CGPROGRAM
            #pragma vertex vert
            #pragma fragment FragBoxBlur
            ENDCG
        }

        // Pass 1: Gaussian Blur (Directional)
        // 这个 Pass 可以被调用两次（一次横向，一次纵向）
        Pass
        {
            Name "GaussianBlur"
            CGPROGRAM
            #pragma vertex vert
            #pragma fragment FragGaussianBlur
            ENDCG
        }

        // Pass 2: Kawase Down
        Pass
        {
            Name "KawaseDown"
        CGPROGRAM
        #pragma vertex vert
        #pragma fragment FragKawaseDown
        ENDCG
        }

        // Pass 3: Kawase Up
        Pass
        {
            Name "KawaseUp"
        CGPROGRAM
        #pragma vertex vert
        #pragma fragment FragKawaseUp
        ENDCG
        }
    }
}
```

C#脚本代码

```csharp
using UnityEngine;
using System.Collections.Generic;

[ExecuteInEditMode]
[RequireComponent(typeof(Camera))]
public class PostProcessBlur : MonoBehaviour
{
    public enum BlurMethod
    {
        BoxBlur = 0,
        GaussianBlur = 1,
        DualKawase = 2
    }

    [Header("Settings")]
    public Material postProcessMaterial;
    public BlurMethod blurMethod = BlurMethod.GaussianBlur;

    [Range(0, 10)]
    public int iterations = 4; // 迭代次数，对 Kawase 来说，这是金字塔层数

    [Range(0, 10)]
    public int blurRadius = 1; // 模糊半径/偏移量

    [Range(1, 8)]
    public int downSample = 2; // 降采样倍数

    // Shader Pass 索引常数，对应 Shader 中的顺序
    private const int PASS_BOX = 0;
    private const int PASS_GAUSSIAN = 1;
    private const int PASS_KAWASE_DOWN = 2;
    private const int PASS_KAWASE_UP = 3;

    // 参数 ID 缓存，微小的性能优化
    private static readonly int UniformBlurRadius = Shader.PropertyToID("_BlurRadius");
    private static readonly int UniformBlurOffset = Shader.PropertyToID("_BlurOffset");

    // Kawase 专用：缓存临时的 RT 数组
    struct Level
    {
        public int down;
        public int up;
    }

    void OnRenderImage(RenderTexture src, RenderTexture dest)
    {
        if (postProcessMaterial == null)
        {
            Graphics.Blit(src, dest);
            return;
        }

        // 设置通用参数
        postProcessMaterial.SetFloat(UniformBlurRadius, blurRadius);

        // 分支处理
        if (blurMethod == BlurMethod.DualKawase)
        {
            RenderDualKawase(src, dest);
        }
        else
        {
            RenderStandardBlur(src, dest);
        }
    }

    // Dual Kawase 核心逻辑 (金字塔结构) 
    void RenderDualKawase(RenderTexture src, RenderTexture dest)
    {
        // 1. 初始化
        int width = src.width / downSample;
        int height = src.height / downSample;

        // 这里的 iterations 代表金字塔的层数
        // 我们需要一个数组存下每一层的 RenderTexture
        RenderTexture[] pyramid = new RenderTexture[iterations];

        // 2. Downsample Loop (降采样阶段)
        RenderTexture lastRT = src;

        for (int i = 0; i < iterations; i++)
        {
            // 每次迭代分辨率减半
            // 注意：太小的分辨率(如 1x1)会导致渲染问题，加个 Mathf.Max 保护
            int w = Mathf.Max(1, width >> i); // 位运算右移等同于除以2
            int h = Mathf.Max(1, height >> i);

            pyramid[i] = RenderTexture.GetTemporary(w, h, 0, src.format);
            pyramid[i].filterMode = FilterMode.Bilinear;

            // 调用 Pass 2: Kawase Down
            Graphics.Blit(lastRT, pyramid[i], postProcessMaterial, PASS_KAWASE_DOWN);

            lastRT = pyramid[i];
        }

        // 3. Upsample Loop (升采样阶段)
        // 从最小的图开始往回叠
        for (int i = iterations - 2; i >= 0; i--)
        {
            RenderTexture currentRT = pyramid[i]; // 这一层是目标
            RenderTexture nextRT = pyramid[i + 1]; // 这一层是源 (更小的图)

            // 调用 Pass 3: Kawase Up
            // 将更小的图(nextRT) 混合回 较大的图(currentRT)
            // 注意：通常 Kawase Up 是叠加，但这里我们直接 Blit 覆盖，
            // 真正的混合是在 Shader 采样时完成的（采样了周围的像素）
            Graphics.Blit(nextRT, currentRT, postProcessMaterial, PASS_KAWASE_UP);
        }

        // 4. 输出最终结果
        // pyramid[0] 现在包含了经过一轮 "下潜" 和 "上浮" 后的结果
        Graphics.Blit(pyramid[0], dest);

        // 5. 清理内存
        for (int i = 0; i < iterations; i++)
        {
            RenderTexture.ReleaseTemporary(pyramid[i]);
        }
    }

    void RenderStandardBlur(RenderTexture src, RenderTexture dest)
    {
        // 1. 初始化
        // 使用降采样可以极大提升性能并增加模糊范围
        int width = src.width / downSample;
        int height = src.height / downSample;

        // 申请两个 Buffer 用于乒乓交替
        RenderTexture rt1 = RenderTexture.GetTemporary(width, height, 0, src.format);
        RenderTexture rt2 = RenderTexture.GetTemporary(width, height, 0, src.format);

        // 确保采样模式为 Bilinear，否则低分辨率下会有锯齿
        rt1.filterMode = FilterMode.Bilinear;
        rt2.filterMode = FilterMode.Bilinear;

        // 2. 将原图拷贝到第一个缓冲区 (Downsample pass)
        Graphics.Blit(src, rt1);

        // 3. 执行模糊迭代
        for (int i = 0; i < iterations; i++)
        {
            switch (blurMethod)
            {
                case BlurMethod.BoxBlur:
                    // Box Blur 只需要一次 Pass，但为了迭代效果，我们在两个 RT 间倒手
                    Graphics.Blit(rt1, rt2, postProcessMaterial, PASS_BOX);
                    Swap(ref rt1, ref rt2);
                    break;

                case BlurMethod.GaussianBlur:
                    // 高斯模糊需要两步：横向 + 纵向

                    // Pass 1: Horizontal -> 结果存入 rt2
                    postProcessMaterial.SetVector(UniformBlurOffset, new Vector2(1, 0));
                    Graphics.Blit(rt1, rt2, postProcessMaterial, PASS_GAUSSIAN);

                    // Pass 2: Vertical (从 rt2 读) -> 结果存回 rt1
                    postProcessMaterial.SetVector(UniformBlurOffset, new Vector2(0, 1));
                    Graphics.Blit(rt2, rt1, postProcessMaterial, PASS_GAUSSIAN);

                    // 注意：这里不需要 Swap，因为经过两步后，结果已经回到了 rt1
                    break;
            }
        }

        // 4. 将最终结果 (rt1) 输出到屏幕 (Upsample pass)
        Graphics.Blit(rt1, dest);

        // 5. 释放临时内存
        RenderTexture.ReleaseTemporary(rt1);
        RenderTexture.ReleaseTemporary(rt2);
    }

    // 辅助函数：交换引用
    private void Swap(ref RenderTexture a, ref RenderTexture b)
    {
        RenderTexture temp = a;
        a = b;
        b = temp;
    }
}
```

## <b>泛光 </b>

<b>泛光（Bloom）</b>是一种现实世界中的光现象，通过它能够以较为适度的渲染性能成本极大地增加渲染图像的真实感。用肉眼观察黑暗背景下非常明亮的物体时会看到泛光效果。亮度更高的物体还会造成其他效果（条纹、镜头光斑），但这些效果不在经典的泛光效果范畴内。不支持HDR（高动态范围）的显示器实际上无法渲染太亮的物体。不过我们可以模拟当光线射到胶片（胶片次表面散射）或摄像机前（乳白色玻璃滤光片）时眼睛中出现的效果（视网膜的次表面散射）。这种效果不一定符合实际情况，但它可以帮助表现对象的相对亮度，或者给屏幕上显示的LDR（低动态范围）图像添加真实感。

<img src="/assets/LseOb0NtCoiQo3xAfSecZnCXnjg.png" src-width="1174" src-height="523" align="center"/>

Bloom的实现方法非常简单，大致分为三步：

<div class="flex gap-3 columns-2" column-size="2">
<div class="w-[49%]" width-ratio="49">
<img src="/assets/LmbabxOojo3R68xH2mYcrqManje.png" src-width="942" src-height="528" align="center"/>

<p>原图像（HDR格式）</p>
</div>
<div class="w-[49%]" width-ratio="49">
<img src="/assets/Jix3bzrAHosIbBxbr0xcWojZnDh.png" src-width="934" src-height="526" align="center"/>

<p>经过亮度提取后的图像</p>
</div>
</div>

<div class="flex gap-3 columns-2" column-size="2">
<div class="w-[50%]" width-ratio="50">
<img src="/assets/ENZhbYXwGoeGxwxbN0xc4Wranzh.png" src-width="937" src-height="522" align="center"/>

<p>模糊处理后的图像</p>
</div>
<div class="w-[50%]" width-ratio="50">
<img src="/assets/DfoUbQjcQoO5XxxVsm9clsBUnqb.png" src-width="930" src-height="523" align="center"/>

<p>输出图像</p>
</div>
</div>

1. 对需要处理的图像经过亮度提取, 并且通过一个阈值来控制亮度 
2. 对经过亮度提取后的图像进行模糊处理
3. 最后再叠加原图和模糊处理后的图像,输出即可

<b>代码实现</b>

模糊代码可以直接借助我们之前写好的模糊算法

Shader代码

```openglshadinglanguage
Shader "Lisii/postProcess/Bloom"
{
    Properties
    {
        _MainTex ("Texture", 2D) = "white" {}
        _BloomIntensity ("Bloom Intensity", Float) = 1.0
        _Threshold ("Threshold", Range(0, 2)) = 0.5
        _BlurRadius ("Blur Radius", Float) = 1 // Kawase 算法中这个值作为 Offset 乘数
        _BlurTargetTex ("Blur Target Texture", 2D) = "white" {} // 用于混合的模糊结果纹理
    }
    SubShader
    {
        // No culling or depth
        Cull Off
        ZWrite Off
        ZTest Always

        CGINCLUDE
        #include "UnityCG.cginc"

        sampler2D _MainTex;
        sampler2D _BlurTargetTex;
        float _BloomIntensity;
        float _Threshold;
        float4 _MainTex_TexelSize;
        int _BlurRadius;

        struct v2f
        {
            float4 pos : SV_POSITION;
            float2 uv : TEXCOORD0;
        };

        v2f vert(appdata_img v)
        {
            v2f o;
            o.pos = UnityObjectToClipPos(v.vertex);
            o.uv = v.texcoord;
            return o;
        }

        fixed4 frag_prefilter(v2f i) : SV_Target
        {
            fixed4 col = tex2D(_MainTex, i.uv);
            // 提取高亮部分
            float brightest = max(max(col.r, col.g), col.b);
            brightest = max(brightest - _Threshold, 0.0) / (brightest + 0.000001);
            col.rgb *= brightest;

            return col;
        }

        // Dual Kawase 算法

        // Dual Kawase Downsample
        // 采样 4 个角，每个角偏移 1 个单位（根据 radius 调整）
        fixed4 frag_kawase_down(v2f i) : SV_Target
        {
            float2 halfPixel = _MainTex_TexelSize.xy * (_BlurRadius + 0.5);
            // 0.5 偏移能利用线性采样获得更好效果

            fixed4 sum = tex2D(_MainTex, i.uv + float2(-1, -1) * halfPixel);
            sum += tex2D(_MainTex, i.uv + float2(1, -1) * halfPixel);
            sum += tex2D(_MainTex, i.uv + float2(-1, 1) * halfPixel);
            sum += tex2D(_MainTex, i.uv + float2(1, 1) * halfPixel);

            return sum * 0.25;
        }

        // Dual Kawase Upsample
        // 采样 8 个点来平滑结果
        fixed4 frag_kawase_up(v2f i) : SV_Target
        {
            float2 halfPixel = _MainTex_TexelSize.xy * (_BlurRadius + 0.5);

            fixed4 sum = tex2D(_MainTex, i.uv + float2(-1, -1) * halfPixel);
            sum += tex2D(_MainTex, i.uv + float2(0, -1) * halfPixel) * 2.0;
            sum += tex2D(_MainTex, i.uv + float2(1, -1) * halfPixel);
            sum += tex2D(_MainTex, i.uv + float2(-1, 0) * halfPixel) * 2.0;
            sum += tex2D(_MainTex, i.uv + float2(1, 0) * halfPixel) * 2.0;
            sum += tex2D(_MainTex, i.uv + float2(-1, 1) * halfPixel);
            sum += tex2D(_MainTex, i.uv + float2(0, 1) * halfPixel) * 2.0;
            sum += tex2D(_MainTex, i.uv + float2(1, 1) * halfPixel);

            sum /= 12.0;
            // 叠加原图以实现 Bloom 效果
            fixed4 original = tex2D(_BlurTargetTex, i.uv);
            sum += original;

            return sum;
        }

        fixed4 frag_add(v2f i) : SV_Target
        {
            fixed4 col1 = tex2D(_MainTex, i.uv);
            fixed4 col2 = tex2D(_BlurTargetTex, i.uv);
            return col1 + col2 * _BloomIntensity;
        }

        ENDCG
        Pass
        {
            name "Prefilter"
            CGPROGRAM
            #pragma vertex vert
            #pragma fragment frag_prefilter
            ENDCG
        }
        Pass
        {
            Name "KawaseDown"
            CGPROGRAM
            #pragma vertex vert
            #pragma fragment frag_kawase_down
            ENDCG
        }
        Pass
        {
            Name "KawaseUp"
            CGPROGRAM
            #pragma vertex vert
            #pragma fragment frag_kawase_up
            ENDCG
        }
        Pass
        {
            Name "BlendBloom"
            CGPROGRAM
            #pragma vertex vert
            #pragma fragment frag_add
            ENDCG
        }
    }
}
```

C#脚本代码

```csharp
using Unity.VisualScripting;
using UnityEngine;

[ExecuteInEditMode]
public class PostProcessImage4 : MonoBehaviour
{
    public Material postProcessMaterial;
    [Header("Bloom Settings")]
    [Range(0.0f, 2.0f)]
    public float threshold = 0.5f;
    public float bloomIntensity = 1.0f;
    [Header("Kawase Blur Settings")]
    [Range(0, 10)]
    public int iterations = 4; // 金字塔层数
    [Range(1, 8)]
    public int downSample = 2; // 降采样倍数
    [Range(0, 10)]
    public int blurRadius = 1; // 模糊半径/偏移量

    // Shader Pass 索引常数，对应 Shader 中的顺序
    private const int PASS_PRE_FILTER = 0;
    private const int PASS_KAWASE_DOWN = 1;
    private const int PASS_KAWASE_UP = 2;
    private const int PASS_BLEND = 3;

    // 参数 ID 缓存，微小的性能优化
    private static readonly int UniformBloomIntensity = Shader.PropertyToID("_BloomIntensity");
    private static readonly int UniformThreshold = Shader.PropertyToID("_Threshold");
    private static readonly int UniformBlurRadius = Shader.PropertyToID("_BlurRadius");
    private static readonly int UniformBlurTargetTex = Shader.PropertyToID("_BlurTargetTex");

    struct Level
    {
        public int down;
        public int up;
    }

    void OnRenderImage(RenderTexture src, RenderTexture dest)
    {
        int width = src.width;
        int height = src.height;
        // 1. 预过滤，提取高亮部分
        RenderTexture preFiltered = RenderTexture.GetTemporary(width, height, 0, src.format);
        PreFilter(src, preFiltered);
        // 2. Dual Kawase 模糊
        RenderTexture blurred = RenderTexture.GetTemporary(width, height, 0, src.format);
        RenderDualKawase(preFiltered, blurred);

        // 3. 合成
        BlendBloom(src, blurred, dest);

        // 释放临时 RT
        RenderTexture.ReleaseTemporary(preFiltered);
        RenderTexture.ReleaseTemporary(blurred);
    }
    void PreFilter(RenderTexture src, RenderTexture dest)
    {
        postProcessMaterial.SetFloat(UniformThreshold, threshold);
        Graphics.Blit(src, dest, postProcessMaterial, PASS_PRE_FILTER);
    }
    // Dual Kawase 核心逻辑 (金字塔结构) 
    void RenderDualKawase(RenderTexture src, RenderTexture dest)
    {
        postProcessMaterial.SetInt(UniformBlurRadius, blurRadius);
        // 1. 初始化
        int width = src.width / downSample;
        int height = src.height / downSample;

        // 这里的 iterations 代表金字塔的层数
        // 我们需要一个数组存下每一层的 RenderTexture
        RenderTexture[] pyramid = new RenderTexture[iterations];

        // 2. Downsample Loop (降采样阶段)
        RenderTexture lastRT = src;

        for (int i = 0; i < iterations; i++)
        {
            // 每次迭代分辨率减半
            // 注意：太小的分辨率(如 1x1)会导致渲染问题，加个 Mathf.Max 保护
            int w = Mathf.Max(1, width >> i); // 位运算右移等同于除以2
            int h = Mathf.Max(1, height >> i);

            pyramid[i] = RenderTexture.GetTemporary(w, h, 0, src.format);
            pyramid[i].filterMode = FilterMode.Bilinear;

            // 调用 Pass 2: Kawase Down
            Graphics.Blit(lastRT, pyramid[i], postProcessMaterial, PASS_KAWASE_DOWN);

            lastRT = pyramid[i];
        }

        // 3. Upsample Loop (升采样阶段)
        // 从最小的图开始往回叠
        for (int i = iterations - 2; i >= 0; i--)
        {
            RenderTexture currentRT = pyramid[i]; // 这一层是目标
            RenderTexture nextRT = pyramid[i + 1]; // 这一层是源 (更小的图)

            // 调用 Pass 3: Kawase Up
            // 将更小的图(nextRT) 混合回 较大的图(currentRT)
            // 注意：Bloom 效果需要累加混合,这一步在Shader中处理,需要将目标RT传入
            RenderTexture bufferRT = RenderTexture.GetTemporary(currentRT.width, currentRT.height, 0, currentRT.format);
            Graphics.Blit(currentRT, bufferRT);
            postProcessMaterial.SetTexture(UniformBlurTargetTex, bufferRT);
            Graphics.Blit(nextRT, currentRT, postProcessMaterial, PASS_KAWASE_UP);

            // 释放临时 RT
            RenderTexture.ReleaseTemporary(bufferRT);
        }

        // 4. 输出最终结果
        // pyramid[0] 现在包含了经过一轮 "下潜" 和 "上浮" 后的结果
        Graphics.Blit(pyramid[0], dest);

        // 5. 清理内存
        for (int i = 0; i < iterations; i++)
        {
            RenderTexture.ReleaseTemporary(pyramid[i]);
        }
    }

    void BlendBloom(RenderTexture src, RenderTexture bloom, RenderTexture dest)
    {
        postProcessMaterial.SetTexture(UniformBlurTargetTex, bloom);
        postProcessMaterial.SetFloat(UniformBloomIntensity, bloomIntensity);
        Graphics.Blit(src, dest, postProcessMaterial, PASS_BLEND);
    }
}
```

## ACES-Tonemmapping

我们上面已经提到了ACES-Tonemmapping的经验公式，直接写一个简单的shader处理即可：

```openglshadinglanguage
Shader "Lisii/postProcess/ACESTonemmaping"
{
    Properties
    {
        _MainTex ("Texture", 2D) = "white" {}
    }
    SubShader
    {
        // No culling or depth
        Cull Off
        ZWrite Off
        ZTest Always

        Pass
        {
            CGPROGRAM
            #pragma vertex vert
            #pragma fragment frag

            #include "UnityCG.cginc"

            struct appdata
            {
                float4 vertex : POSITION;
                float2 uv : TEXCOORD0;
            };

            struct v2f
            {
                float2 uv : TEXCOORD0;
                float4 vertex : SV_POSITION;
            };

            v2f vert(appdata v)
            {
                v2f o;
                o.vertex = UnityObjectToClipPos(v.vertex);
                o.uv = v.uv;
                return o;
            }

            float3 ACESFilm(float3 x)
            {
                float a = 2.51f;
                float b = 0.03f;
                float c = 2.43f;
                float d = 0.59f;
                float e = 0.14f;
                return saturate((x * (a * x + b)) / (x * (c * x + d) + e));
            }

            sampler2D _MainTex;

            fixed4 frag(v2f i) : SV_Target
            {
                fixed4 col = tex2D(_MainTex, i.uv);
                // just invert the colors
                col.rgb = ACESFilm(col.rgb);
                return col;
            }
            ENDCG
        }
    }
}
```

可以看到效果还是很不错的： 

<div class="flex gap-3 columns-2" column-size="2">
<div class="w-[50%]" width-ratio="50">
<img src="/assets/PdyNbrYaMoc90hxnea8crZxrnhk.png" src-width="1901" src-height="1071" align="center"/>

<p>处理前</p>
</div>
<div class="w-[50%]" width-ratio="50">
<img src="/assets/EMywbmKkho1QF1xXBTMcdBUGn1c.png" src-width="1908" src-height="1071" align="center"/>

<p>处理后</p>
</div>
</div>


